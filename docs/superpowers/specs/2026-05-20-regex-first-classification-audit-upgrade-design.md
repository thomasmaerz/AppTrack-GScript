# Specification: Regex-First Classification and Gemini Audit Upgrade

## Goal

Upgrade Apptrack-GScript so production job tracking remains deterministic and regex/rule-based, while Gemini remains audit-only for discovering missed categories and improving regex logic. The tracker will include direct recruiter outreach and referrals as valid CRM entries, allow `Unlisted` company/title when the message is clearly relevant, and update statuses based on message chronology rather than static milestone priority alone.

## Decisions

- Production scans use deterministic rules only; Gemini is not used in normal scans.
- Gemini remains available only in `BroadGapLLM` audit tooling.
- Direct recruiter outreach and referrals are tracked in the main `Applications` sheet.
- Recruiter outreach may be inserted even if company/title extraction returns `Unlisted`, when relevance is clear.
- Statuses update chronologically:
  - newer rejection can replace interview/assessment,
  - newer interview/assessment/application after rejection can replace rejection,
  - `Offer Received` remains sticky unless explicit offer-withdrawn handling is added later,
  - generic `Status Update` must not erase more specific statuses.

## Architecture

Production flow:

```text
Gmail query
→ first message/full body
→ normalization/signal handling
→ classifyRegexDecision(subject, from, body)
→ shouldSkipMessage compatibility wrapper
→ company/title/status extraction
→ date-aware status update
→ Applications sheet
```

Audit flow:

```text
Broad Gmail query
→ BroadSearchDB cache using signal-window snippets
→ classifyRegexDecision with reason/confidence
→ deterministic company/title hints
→ Gemini audit classification
→ BroadGapLLM comparison sheet
```

## Regex Classifier

Add an object-returning classifier and keep the existing boolean API as a wrapper:

```javascript
function classifyRegexDecision(subject, from, bodyOrSnippet) {
  return {
    skip: false,
    reason: "linkedin_application_sent",
    confidence: "high"
  };
}

function shouldSkipMessage(subject, from, bodyOrSnippet) {
  return classifyRegexDecision(subject, from, bodyOrSnippet).skip;
}
```

Rule order:

1. Normalize subject/from/body/domain.
2. Strong PASS rescues before broad exclusions:
   - `your application was sent to`
   - `your application to <title> at <company>`
   - `your application for <title> at <company>`
   - `thank you for applying`
   - `we received your application`
   - `application received`
   - `successfully applied`
   - `regarding your application`
   - `update on your application`
   - `not moving forward`
   - `pursue other candidates`
   - `position has been filled`
   - `interview scheduling`
   - `assessment`
   - `you have been referred`
   - `referred to a job`
   - recruiter phrases: `immediate hiring`, `contract opportunity`, `came across your profile`, `saw your profile`, `send your resume`, `forward your resume`, `presenting your profile`, `profile to our client`
   - LinkedIn InMail/message senders when subject/body has opportunity/recruiter/client/role/resume signal.
3. Hard SKIP non-job:
   - OAuth/security/account-app notifications,
   - SIN/NAS/passport/consulate/income support,
   - university admissions/graduation,
   - PMP/certification/course/program brochure,
   - billing/statements/rewards/tax/insurance/road test,
   - generic OTP/passcode unless paired with job/application/candidate context.
4. Job-board/digest SKIP:
   - weekly application update,
   - generic job alert,
   - recommendations,
   - `jobs you may be interested in`,
   - generic `apply now`,
   - `viewed by`,
   - newsletter/digest/premium/upgrade.
5. Medium-confidence PASS after noise removal:
   - recruiting/careers/talent senders plus candidacy phrases,
   - human recruiter wording with role/resume/client/opportunity language,
   - ATS domains with application/interview/rejection language.
6. Default SKIP.

## Signal-Window Snippet

Replace audit cache's first-350-characters snippet with:

```javascript
function buildAuditSnippet(subject, from, body)
```

Behavior:

- normalize whitespace,
- find the earliest strong anchor,
- return about `120` chars before and `500` chars after,
- for specific LinkedIn application/update subjects use up to `700`,
- fallback to first `350–500` chars if no anchor exists.

Anchors:

- `your application was sent`
- `your application to`
- `your application for`
- `thank you for applying`
- `we received your application`
- `application received`
- `regarding your application`
- `update on your application`
- `not moving forward`
- `pursue other candidates`
- `position has been filled`
- `interview`
- `assessment`
- `you have been referred`
- `referred to a job`
- `immediate hiring`
- `contract opportunity`
- `came across your profile`
- `send your resume`
- `profile to our client`

Avoid brittle header stripping, fixed-line removal, greeting-based slicing, or per-template hacks.

## BroadGapLLM Audit Output

Add columns:

- `Regex Decision`
- `Regex Reason`
- `Regex Confidence`
- `Gemini Decision`
- `Gap Status`
- `Gemini Class`
- `Gemini Company`
- `Gemini Title`
- `Gemini Reasoning`
- `Preparsed Company`
- `Preparsed Title`
- `Snippet`

Gemini prompt/schema should:

- classify LinkedIn `your application was sent to COMPANY` as `APPLIED`, never noise,
- classify specific `Your application to TITLE at COMPANY` as PASS unless clearly a digest,
- classify direct recruiter outreach as PASS if role/client/resume/opportunity/profile submission is mentioned,
- skip generic alerts/recommendations/digests,
- separate `RECRUITER_OUTREACH`, `RECRUITER_FOLLOW_UP`, and `REFERRAL` from `INTERVIEW_REQUEST`,
- prefer deterministic company/title hints.

## Extraction

Add deterministic extraction patterns before sender-domain fallback.

Company:

```regex
your application was sent to (?<company>.+)
your application to (?<title>.+?) at (?<company>.+)
your application for (?<title>.+?) at (?<company>.+)
thank you for applying to (?<company>.+)
for applying to (?<company>.+)
you have been referred to a job at (?<company>.+)
```

Title:

```regex
your application to (?<title>.+?) at (?<company>.+)
your application for (?<title>.+?) at (?<company>.+)
position of (?<title>.+?)(?: with| at|$)
role of (?<title>.+?)(?: with| at|$)
job title:\s*(?<title>.+?)
for the (?<title>.+?) (?:position|role)
```

Clean extracted values by removing suffix junk like `View application`, `Job ID`, `Reference`, URLs, and unsubscribe text. Reject URLs, long sentences, or marketing copy as titles.

## Status Model

Add statuses:

- `Recruiter Outreach`
- `Recruiter Follow-up`
- `Referral`

Update `StatusUtils.determineStatus()`:

- referral phrases → `Referral`,
- reply/follow-up recruiter phrases → `Recruiter Follow-up`,
- initial recruiter/opportunity phrases → `Recruiter Outreach`,
- keep existing:
  - `Applied`
  - `Assessment`
  - `Interview Request`
  - `Offer Received`
  - `Rejected`
  - `Status Update`

Replace static-only priority with date-aware update logic:

```javascript
function getStatusUpdateDecision(currentStatus, currentDateUpdated, candidateStatus, candidateDate) {
  // older candidate status does not change current row
  // newer specific status usually replaces current status
  // Offer Received remains sticky
  // Status Update does not erase specific statuses
  // Recruiter Outreach does not replace Applied or later
  // Rejected can replace Interview/Assessment if newer
  // Interview/Assessment can replace Rejected if newer
}
```

## Tests

Expand `testFixtures.gs` with golden cases:

- LinkedIn application sent → PASS.
- LinkedIn weekly digest → SKIP.
- LinkedIn specific application update → PASS.
- GitHub OAuth application → SKIP.
- SIN/passport/income support application → SKIP.
- PMP/certification/course application → SKIP.
- Immediate Hiring recruiter outreach → PASS, `Recruiter Outreach`.
- Message replied recruiter follow-up → PASS, `Recruiter Follow-up`.
- Mastercard referral → PASS, `Referral`.
- generic Indeed/LinkedIn recommendations → SKIP.
- SmartRecruiters OTP → SKIP unless paired with job/application/candidate context.
- later rejection after interview updates to `Rejected`.
- later interview/assessment after rejection updates away from `Rejected`.
- generic `Status Update` does not wipe specific status.

## Success Criteria

- Production scan remains regex/rule-only.
- Gemini is audit-only.
- Known false passes are skipped by deterministic rules.
- Known false skips are retained by deterministic rules.
- Audit sheet explains regex decisions with reason/confidence.
- Signal-window snippets improve LinkedIn/ATS/recruiter audit accuracy.
- Recruiter outreach/referrals enter main tracker.
- Status updates reflect latest meaningful chronological state.
