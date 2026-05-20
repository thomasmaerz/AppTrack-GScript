# Regex-First Classification and Gemini Audit Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make production classification deterministic and explainable while improving audit recall/diagnostics and adding recruiter/referral tracking.

**Architecture:** Add an object-returning regex classifier behind the existing `shouldSkipMessage()` wrapper, use signal-window snippets for audit cache, pass regex reason/confidence and deterministic extraction hints into `BroadGapLLM`, and update statuses with date-aware logic. Gemini remains audit-only.

**Tech Stack:** Google Apps Script V8, GmailApp, SpreadsheetApp, existing `.gs` utility files, manual `runTrackerTests()` regression harness.

---

## File Structure

- Modify `scanUtils.gs`: add normalization helpers, `classifyRegexDecision()`, `buildAuditSnippet()`, date-aware status update helper, and keep existing wrappers/query functions compatible.
- Modify `statusUtils.gs`: add `Recruiter Outreach`, `Recruiter Follow-up`, and `Referral` detection without changing existing status names.
- Modify `extractionUtils.gs`: add deterministic LinkedIn/referral/application company/title patterns and stronger cleanup.
- Modify `main.gs`: use date-aware status updates, signal-window snippets in `BroadSearchDB`, regex reason/confidence in `BroadGapLLM`, and deterministic extraction hints.
- Modify `geminiUtils.gs`: update audit-only prompt/categories/schema for recruiter/referral and LinkedIn application confirmations.
- Modify `spreadsheetUtils.gs`: format new statuses and new `BroadGapLLM` column positions.
- Modify `testFixtures.gs`: add golden corpus tests before implementation work and keep `runTrackerTests()` as the acceptance command.

---

### Task 1: Add Golden Corpus Tests

**Files:**
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/testFixtures.gs`

- [ ] **Step 1: Add failing fixtures**

Edit `TestFixtures` to include these objects before the closing `};`:

```javascript
  linkedInSpecificUpdate: {
    subject: 'Your application to Project Manager at TEEMA',
    from: 'LinkedIn <jobs-noreply@linkedin.com>',
    body: 'Your application to Project Manager at TEEMA has an update. The hiring team reviewed your application.',
    skip: false,
    status: 'Status Update',
    company: 'TEEMA',
    title: 'Project Manager'
  },
  githubOauthNoise: {
    subject: 'A third-party OAuth application has been added to your account',
    from: 'GitHub <noreply@github.com>',
    body: 'A third-party OAuth application was recently authorized to access your GitHub account.',
    skip: true
  },
  sinApplicationNoise: {
    subject: 'Your Social Insurance Number application was received',
    from: 'Service Canada <noreply@canada.ca>',
    body: 'We received your Social Insurance Number application.',
    skip: true
  },
  pmpApplicationNoise: {
    subject: 'Your PMP application has been approved',
    from: 'PMI <customercare@pmi.org>',
    body: 'Your PMP certification application has been approved.',
    skip: true
  },
  immediateHiringRecruiter: {
    subject: 'Immediate Hiring - Senior IT Systems Administrator',
    from: 'Adithya Naidu <adithya@recruiting.example.com>',
    body: 'Hi Thomas, I came across your profile and have an immediate hiring opportunity for a Senior IT Systems Administrator contract role. Please send your resume.',
    skip: false,
    status: 'Recruiter Outreach',
    title: 'Senior IT Systems Administrator'
  },
  recruiterFollowUp: {
    subject: 'Message replied: Immediate Hiring - Senior IT Systems Administrator',
    from: 'Adithya Naidu <adithya@recruiting.example.com>',
    body: 'Following up on the Senior IT Systems Administrator role. Please forward your resume if interested.',
    skip: false,
    status: 'Recruiter Follow-up'
  },
  mastercardReferral: {
    subject: 'You have been referred to a job at Mastercard',
    from: 'Mastercard Careers <careers@mastercard.com>',
    body: 'You have been referred to a job at Mastercard. Senior Technical Program Manager is now open for your application.',
    skip: false,
    status: 'Referral',
    company: 'Mastercard',
    title: 'Senior Technical Program Manager'
  },
  smartRecruitersOtpNoise: {
    subject: 'Your SmartRecruiters one-time passcode',
    from: 'SmartRecruiters <noreply@smartrecruiters.com>',
    body: 'Your one-time passcode is 123456. This code expires soon.',
    skip: true
  }
```

- [ ] **Step 2: Add failing assertions**

Append these assertions in `runTrackerTests()` after the existing skip assertions:

```javascript
  assertTrackerEqual(shouldSkipMessage(f.linkedInSpecificUpdate.subject, f.linkedInSpecificUpdate.from, f.linkedInSpecificUpdate.body), false, 'LinkedIn specific update retained');
  assertTrackerEqual(shouldSkipMessage(f.githubOauthNoise.subject, f.githubOauthNoise.from, f.githubOauthNoise.body), true, 'GitHub OAuth noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.sinApplicationNoise.subject, f.sinApplicationNoise.from, f.sinApplicationNoise.body), true, 'SIN application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.pmpApplicationNoise.subject, f.pmpApplicationNoise.from, f.pmpApplicationNoise.body), true, 'PMP application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.immediateHiringRecruiter.subject, f.immediateHiringRecruiter.from, f.immediateHiringRecruiter.body), false, 'Immediate hiring recruiter retained');
  assertTrackerEqual(shouldSkipMessage(f.recruiterFollowUp.subject, f.recruiterFollowUp.from, f.recruiterFollowUp.body), false, 'Recruiter follow-up retained');
  assertTrackerEqual(shouldSkipMessage(f.mastercardReferral.subject, f.mastercardReferral.from, f.mastercardReferral.body), false, 'Mastercard referral retained');
  assertTrackerEqual(shouldSkipMessage(f.smartRecruitersOtpNoise.subject, f.smartRecruitersOtpNoise.from, f.smartRecruitersOtpNoise.body), true, 'SmartRecruiters OTP skipped');
  assertTrackerEqual(StatusUtils.determineStatus(f.immediateHiringRecruiter.subject, f.immediateHiringRecruiter.body, ''), f.immediateHiringRecruiter.status, 'Recruiter outreach status');
  assertTrackerEqual(StatusUtils.determineStatus(f.recruiterFollowUp.subject, f.recruiterFollowUp.body, ''), f.recruiterFollowUp.status, 'Recruiter follow-up status');
  assertTrackerEqual(StatusUtils.determineStatus(f.mastercardReferral.subject, f.mastercardReferral.body, ''), f.mastercardReferral.status, 'Referral status');
  assertTrackerEqual(JobUtils.extractJobTitle(f.mastercardReferral.subject, f.mastercardReferral.body, f.mastercardReferral.from, ''), f.mastercardReferral.title, 'Referral title extraction');
  assertTrackerEqual(CompanyUtils.extractCompany(f.mastercardReferral.subject, f.mastercardReferral.body, f.mastercardReferral.from, ''), f.mastercardReferral.company, 'Referral company extraction');
  assertTrackerEqual(JobUtils.extractJobTitle(f.immediateHiringRecruiter.subject, f.immediateHiringRecruiter.body, f.immediateHiringRecruiter.from, ''), f.immediateHiringRecruiter.title, 'Recruiter title extraction');
  assertTrackerEqual(getStatusUpdateDecision('Interview Request', new Date('2026-01-01T00:00:00Z'), 'Rejected', new Date('2026-01-02T00:00:00Z')).status, 'Rejected', 'newer rejection replaces interview');
  assertTrackerEqual(getStatusUpdateDecision('Rejected', new Date('2026-01-02T00:00:00Z'), 'Interview Request', new Date('2026-01-03T00:00:00Z')).status, 'Interview Request', 'newer interview replaces rejection');
  assertTrackerEqual(getStatusUpdateDecision('Interview Request', new Date('2026-01-02T00:00:00Z'), 'Status Update', new Date('2026-01-03T00:00:00Z')).status, 'Interview Request', 'generic status update does not erase interview');
  assertTrackerEqual(buildAuditSnippet('Noise header', 'sender@example.com', 'Header line '.repeat(50) + 'We are not moving forward with your application at this time.').indexOf('not moving forward') !== -1, true, 'signal snippet includes rejection anchor');
```

- [ ] **Step 3: Run tests and verify failure**

Run `runTrackerTests()` in Apps Script after `clasp push` or in the Apps Script editor.

Expected: failure referencing missing `getStatusUpdateDecision` or missed new fixture behavior.

- [ ] **Step 4: Commit tests**

```bash
git add testFixtures.gs
git commit -m "test: add regex classification golden corpus"
```

---

### Task 2: Implement Explainable Regex Classifier and Signal Snippets

**Files:**
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/scanUtils.gs`

- [ ] **Step 1: Add helper functions above `buildGmailSearchQuery()`**

Add this code after `getHigherPriorityStatus()`:

```javascript
function normalizeAuditText_(text) {
  return String(text || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function containsAny_(text, phrases) {
  const value = String(text || '').toLowerCase();
  return phrases.some(phrase => value.indexOf(String(phrase).toLowerCase()) !== -1);
}

function isSpecificLinkedInApplicationSubject_(subjectLower) {
  return subjectLower.indexOf('your application was sent to') !== -1 ||
    /^\s*your application (?:to|for) .+ at .+/i.test(subjectLower);
}

function isJobContextOtp_(combinedLower) {
  return containsAny_(combinedLower, ['application', 'candidate', 'job', 'career', 'hiring team', 'smartrecruiters', 'workday', 'greenhouse']);
}
```

- [ ] **Step 2: Add `classifyRegexDecision()`**

Add this code above `shouldSkipMessage()`:

```javascript
function classifyRegexDecision(subject, from, bodyOrSnippet) {
  const lowerSubject = normalizeAuditText_(subject).toLowerCase();
  const lowerBody = normalizeAuditText_(bodyOrSnippet).toLowerCase();
  const fromLower = String(from || '').toLowerCase();
  const domain = senderDomain_(from);
  const combined = lowerSubject + ' ' + lowerBody + ' ' + fromLower;

  const recruitmentDomains = [
    'greenhouse.io', 'greenhouse-mail.io', 'lever.co', 'myworkdayjobs.com', 'workday.com', 'myworkday.com', 'workdayjobs.com',
    'icims.com', 'smartrecruiters.com', 'successfactors.com', 'workablemail.com',
    'ashbyhq.com', 'recruitee.com', 'breezy.hr', 'jazzhr.com', 'bamboohr.com',
    'workable.com', 'jobvite.com', 'oracle.com', 'ukg.com', 'paycor.com',
    'paylocity.com', 'adp.com', 'rippling.com', 'darwinbox.com', 'phenom.com',
    'avature.net', 'randstad.ca', 'randstad.com', 'procom.ca', 'procomservices.com',
    'roberthalf.com', 'roberthalf.ca', 'hays.ca', 'hays.com', 'teema.com',
    'agilus.ca', 'insight.com', 'appointz.com', 'servus.ca', 'atco.com', 'mastercard.com'
  ];
  const isRecruitmentDomain = recruitmentDomains.some(d => domain === d || domain.endsWith('.' + d));

  if (lowerSubject.indexOf('your application was sent to') !== -1) return { skip: false, reason: 'linkedin_application_sent', confidence: 'high' };
  if (/^\s*your application (?:to|for) .+ at .+/i.test(lowerSubject)) return { skip: false, reason: 'specific_application_update', confidence: 'high' };
  if (containsAny_(combined, ['you have been referred', 'referred to a job'])) return { skip: false, reason: 'referral', confidence: 'high' };
  if (containsAny_(combined, ['not moving forward', 'pursue other candidates', 'position has been filled', 'regret to inform', 'no longer being considered'])) return { skip: false, reason: 'rejection_signal', confidence: 'high' };
  if (containsAny_(combined, ['interview scheduling', 'interview request', 'schedule your interview', 'invitation to interview'])) return { skip: false, reason: 'interview_signal', confidence: 'high' };
  if (containsAny_(combined, ['thank you for applying', 'we received your application', 'application received', 'successfully applied', 'regarding your application', 'update on your application'])) return { skip: false, reason: 'application_transactional_signal', confidence: 'high' };
  if (containsAny_(combined, ['immediate hiring', 'contract opportunity', 'came across your profile', 'saw your profile', 'send your resume', 'forward your resume', 'presenting your profile', 'profile to our client'])) return { skip: false, reason: 'direct_recruiter_outreach', confidence: 'high' };
  if ((fromLower.indexOf('inmail-hit-reply@linkedin.com') !== -1 || fromLower.indexOf('hit-reply@linkedin.com') !== -1 || fromLower.indexOf('messaging-digest-noreply@linkedin.com') !== -1) && containsAny_(combined, ['opportunity', 'recruiter', 'role', 'position', 'resume', 'client', 'hiring'])) return { skip: false, reason: 'linkedin_recruiter_message', confidence: 'medium' };

  if (containsAny_(combined, ['oauth application', 'third-party oauth', 'third-party github application', 'security alert', 'authorized to access your github account', 'apps connected to your account'])) return { skip: true, reason: 'security_account_noise', confidence: 'high' };
  if (containsAny_(combined, ['social insurance number', ' nas ', 'passport', 'reisepass', 'consulate', 'income support'])) return { skip: true, reason: 'government_non_job_application', confidence: 'high' };
  if (containsAny_(combined, ['pmp application', 'certification application', 'course brochure', 'program advisor', 'graduate programs', 'admissions', 'graduation application'])) return { skip: true, reason: 'education_certification_noise', confidence: 'high' };
  if (containsAny_(combined, ['billing statement', 'statement is now available', 'tax slip', 'insurance quote', 'road test', 'triangle rewards', 'bonus ct money'])) return { skip: true, reason: 'consumer_account_noise', confidence: 'high' };
  if (containsAny_(lowerSubject, ['security code', 'verification code', 'one-time passcode', 'one-time-passcode', 'one-time']) && !isJobContextOtp_(combined)) return { skip: true, reason: 'otp_noise', confidence: 'high' };

  if (fromLower.indexOf('jobs-listings') !== -1 || fromLower.indexOf('jobalerts-noreply') !== -1 || (fromLower.indexOf('jobs-noreply') !== -1 && !isSpecificLinkedInApplicationSubject_(lowerSubject))) {
    if (containsAny_(combined, ['weekly application update', 'new application updates', 'job alert', 'jobs you may be interested', 'jobs similar to', 'apply now', 'viewed by', 'premium', 'upgrade', 'digest'])) return { skip: true, reason: 'job_board_digest_noise', confidence: 'high' };
  }
  if (containsAny_(combined, ['newsletter', 'read the full post', 'read the full story', 'new post on', 'published a new', 'stories for you'])) return { skip: true, reason: 'newsletter_noise', confidence: 'high' };

  if (isRecruitmentDomain && containsAny_(combined, ['application', 'interview', 'assessment', 'candidacy', 'candidate', 'recruiting', 'hiring'])) return { skip: false, reason: 'trusted_recruiting_domain', confidence: 'medium' };
  if (isHighConfidenceSubject_(lowerSubject)) return { skip: false, reason: 'high_confidence_subject', confidence: 'medium' };

  return { skip: true, reason: 'no_job_signal', confidence: 'medium' };
}
```

- [ ] **Step 3: Replace `shouldSkipMessage()` body**

Replace the entire existing `shouldSkipMessage(subject, from, body)` function with:

```javascript
function shouldSkipMessage(subject, from, body) {
  return classifyRegexDecision(subject, from, body).skip;
}
```

- [ ] **Step 4: Add `buildAuditSnippet()`**

Add this function above `shouldSkipThread()`:

```javascript
function buildAuditSnippet(subject, from, body) {
  const normalized = normalizeAuditText_(body);
  if (!normalized) return '';
  const lower = normalized.toLowerCase();
  const anchors = [
    'your application was sent', 'your application to', 'your application for',
    'thank you for applying', 'we received your application', 'application received',
    'regarding your application', 'update on your application', 'not moving forward',
    'pursue other candidates', 'position has been filled', 'interview', 'assessment',
    'you have been referred', 'referred to a job', 'immediate hiring',
    'contract opportunity', 'came across your profile', 'send your resume', 'profile to our client'
  ];
  let firstIndex = -1;
  anchors.forEach(anchor => {
    const idx = lower.indexOf(anchor);
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) firstIndex = idx;
  });
  const subjectLower = String(subject || '').toLowerCase();
  const maxAfter = isSpecificLinkedInApplicationSubject_(subjectLower) ? 700 : 500;
  if (firstIndex === -1) return normalized.substring(0, 500).trim();
  const start = Math.max(0, firstIndex - 120);
  const end = Math.min(normalized.length, firstIndex + maxAfter);
  return normalized.substring(start, end).trim();
}
```

- [ ] **Step 5: Run tests**

Run `runTrackerTests()`.

Expected: classifier/snippet tests pass; status/extraction tests may still fail until later tasks.

- [ ] **Step 6: Commit classifier**

```bash
git add scanUtils.gs
git commit -m "feat: add explainable regex classifier"
```

---

### Task 3: Add Recruiter and Referral Status Detection

**Files:**
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/statusUtils.gs`
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/spreadsheetUtils.gs`

- [ ] **Step 1: Update `determineStatus()` priority**

Replace the decision chain in `StatusUtils.determineStatus()` with:

```javascript
    if (this.containsOffer(combinedContent)) {
      return "Offer Received";
    } else if (this.containsInterview(combinedContent)) {
      return "Interview Request";
    } else if (this.containsAssessment(combinedContent)) {
      return "Assessment";
    } else if (this.containsRejection(combinedContent)) {
      return "Rejected";
    } else if (this.containsReferral(combinedContent)) {
      return "Referral";
    } else if (this.containsRecruiterFollowUp(combinedContent)) {
      return "Recruiter Follow-up";
    } else if (this.containsApplication(combinedContent)) {
      return "Applied";
    } else if (this.containsRecruiterOutreach(combinedContent)) {
      return "Recruiter Outreach";
    } else {
      return "Status Update";
    }
```

- [ ] **Step 2: Add status helper methods before `containsApplication`**

```javascript
  containsReferral: function(content) {
    const indicators = ["you have been referred", "referred to a job", "referral to", "referred you to"];
    return indicators.some(indicator => content.includes(indicator));
  },

  containsRecruiterFollowUp: function(content) {
    const indicators = ["message replied:", "following up", "follow up", "checking in", "resume & call tomorrow"];
    const recruiterContext = ["recruiter", "hiring", "opportunity", "role", "position", "resume", "client"];
    return indicators.some(indicator => content.includes(indicator)) && recruiterContext.some(indicator => content.includes(indicator));
  },

  containsRecruiterOutreach: function(content) {
    const indicators = ["immediate hiring", "contract opportunity", "came across your profile", "saw your profile", "send your resume", "forward your resume", "submit your resume", "presenting your profile", "profile to our client"];
    return indicators.some(indicator => content.includes(indicator));
  },
```

- [ ] **Step 3: Add formatting colors for new statuses**

In each `switch(status)` in `spreadsheetUtils.gs`, add cases before `Status Update`:

```javascript
        case "Recruiter Outreach":
        case "Recruiter Follow-up":
        case "Referral":
          bgColor = isRecentUpdate ? "#d1c4e9" : "#ede7f6";
          textColor = "#4527a0";
          fontWeight = isRecentUpdate ? "bold" : "normal";
          break;
```

For switches without `isRecentUpdate`, add:

```javascript
        case "Recruiter Outreach":
        case "Recruiter Follow-up":
        case "Referral":
          cell.setBackground("#ede7f6");
          cell.setFontColor("#4527a0");
          break;
```

- [ ] **Step 4: Add dashboard counts/colors**

Add these keys to the `counts` object in `createSummaryDashboard()`:

```javascript
      "Recruiter Outreach": 0,
      "Recruiter Follow-up": 0,
      "Referral": 0,
```

Add these keys to `statusColors`:

```javascript
      "Recruiter Outreach": {bg: "#ede7f6", text: "#4527a0"},
      "Recruiter Follow-up": {bg: "#ede7f6", text: "#4527a0"},
      "Referral": {bg: "#ede7f6", text: "#4527a0"},
```

- [ ] **Step 5: Run tests**

Run `runTrackerTests()`.

Expected: recruiter/referral status assertions pass.

- [ ] **Step 6: Commit status work**

```bash
git add statusUtils.gs spreadsheetUtils.gs
git commit -m "feat: add recruiter and referral statuses"
```

---

### Task 4: Implement Date-Aware Status Update Logic

**Files:**
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/scanUtils.gs`
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/main.gs`

- [ ] **Step 1: Add `getStatusUpdateDecision()` below `getHigherPriorityStatus()`**

```javascript
function getStatusUpdateDecision(currentStatus, currentDateUpdated, candidateStatus, candidateDate) {
  const current = currentStatus || '';
  const candidate = candidateStatus || '';
  const currentDate = currentDateUpdated instanceof Date ? currentDateUpdated : null;
  const nextDate = candidateDate instanceof Date ? candidateDate : null;

  if (!candidate) return { status: current, shouldUpdate: false, reason: 'empty_candidate' };
  if (current === 'Offer Received' && candidate !== 'Offer Received') return { status: current, shouldUpdate: false, reason: 'offer_sticky' };
  if (currentDate && nextDate && nextDate < currentDate) return { status: current, shouldUpdate: false, reason: 'older_candidate' };
  if (candidate === 'Status Update' && current && current !== 'Applied' && current !== 'Recruiter Outreach') return { status: current, shouldUpdate: false, reason: 'weak_status_update' };
  if (candidate === 'Recruiter Outreach' && current && current !== 'Status Update') return { status: current, shouldUpdate: false, reason: 'weak_recruiter_outreach' };
  if (candidate === current) return { status: current, shouldUpdate: false, reason: 'same_status' };
  return { status: candidate, shouldUpdate: true, reason: 'newer_meaningful_status' };
}
```

- [ ] **Step 2: Replace first-pass existing-thread update in `main.gs`**

Replace lines equivalent to:

```javascript
      const currentStatus = updatedData[rowNumber - 1][statusIndex];
      pendingCellUpdates.push({ row: rowNumber, status: getHigherPriorityStatus(currentStatus, status), updatedDate: date, threadLink: threadLink });
```

with:

```javascript
      const currentStatus = updatedData[rowNumber - 1][statusIndex];
      const currentUpdatedDate = updatedData[rowNumber - 1][dateUpdatedIndex];
      const decision = getStatusUpdateDecision(currentStatus, currentUpdatedDate, status, date);
      pendingCellUpdates.push({ row: rowNumber, status: decision.shouldUpdate ? decision.status : null, updatedDate: date, threadLink: threadLink });
```

- [ ] **Step 3: Replace duplicate-thread update in `main.gs`**

Replace the duplicate block that computes `nextStatus` with:

```javascript
      const currentStatus = sheet.getRange(existingRowNum, statusIndex + 1).getValue();
      const currentUpdatedDate = sheet.getRange(existingRowNum, dateUpdatedIndex + 1).getValue();
      const decision = getStatusUpdateDecision(currentStatus, currentUpdatedDate, initialStatus, lastDate);
      pendingCellUpdates.push({ row: existingRowNum, threadId: threadId, status: decision.shouldUpdate ? decision.status : null, updatedDate: lastDate, threadLink: threadLink });
```

- [ ] **Step 4: Simplify multi-message initial status fold**

In the loop over messages in `main.gs`, replace the static priority if-block with:

```javascript
        const msgDate = msg.getDate();
        const decision = getStatusUpdateDecision(initialStatus, date, msgStatus, msgDate);
        if (decision.shouldUpdate) {
          initialStatus = decision.status;
        }
```

- [ ] **Step 5: Run tests**

Run `runTrackerTests()`.

Expected: date-aware status assertions pass.

- [ ] **Step 6: Commit update logic**

```bash
git add scanUtils.gs main.gs
git commit -m "feat: make status updates date aware"
```

---

### Task 5: Improve Company and Title Extraction

**Files:**
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/extractionUtils.gs`

- [ ] **Step 1: Add deterministic company patterns at top of `CompanyUtils.extractCompany()`**

After subject/body normalization, add:

```javascript
    const combinedText = normalizeParserText_(subject + ' ' + body);
    const deterministicCompanyPatterns = [
      /your application was sent to\s+([^\n.]+)/i,
      /your application (?:to|for)\s+.+?\s+at\s+([^\n.]+)/i,
      /thank you for applying to\s+([^\n.]+)/i,
      /for applying to\s+([^\n.]+)/i,
      /you have been referred to a job at\s+([^\n.]+)/i
    ];
    for (const pattern of deterministicCompanyPatterns) {
      const deterministicMatch = combinedText.match(pattern);
      if (deterministicMatch && deterministicMatch[1]) {
        const candidate = deterministicMatch[1].replace(/\b(View application|Job ID|Reference|Unsubscribe).*$/i, '').trim();
        if (candidate && candidate.length <= 80 && !this.isLikelyNotCompany(candidate)) return candidate;
      }
    }
```

- [ ] **Step 2: Add deterministic title patterns at top of `JobUtils.extractJobTitle()` after body normalization**

```javascript
    const combinedText = normalizeParserText_(subject + ' ' + body);
    const deterministicTitlePatterns = [
      /your application (?:to|for)\s+(.+?)\s+at\s+[^\n.]+/i,
      /position of\s+(.+?)(?:\s+with|\s+at|[.\n]|$)/i,
      /role of\s+(.+?)(?:\s+with|\s+at|[.\n]|$)/i,
      /job title:\s*(.+?)(?:[.\n]|$)/i,
      /for the\s+(.+?)\s+(?:position|role)/i,
      /immediate hiring\s*-\s*(.+?)(?:[.\n]|$)/i,
      /referred to a job at\s+[^.]+\.\s*(.+?)\s+is now open/i
    ];
    for (const pattern of deterministicTitlePatterns) {
      const deterministicMatch = combinedText.match(pattern);
      if (deterministicMatch && deterministicMatch[1]) {
        const candidate = JobUtils.cleanJobTitle(deterministicMatch[1]);
        if (this.isAcceptableTitleCandidate(candidate)) return candidate;
      }
    }
```

- [ ] **Step 3: Strengthen title cleanup**

Inside `cleanJobTitle`, before excessive space cleanup, add:

```javascript
  cleaned = cleaned
    .replace(/\b(View application|Job ID|Reference|Apply now|Unsubscribe|Privacy Policy).*$/i, '')
    .replace(/https?:\/\/\S+/gi, '')
    .trim();
```

- [ ] **Step 4: Run tests**

Run `runTrackerTests()`.

Expected: extraction assertions pass.

- [ ] **Step 5: Commit extraction**

```bash
git add extractionUtils.gs
git commit -m "feat: improve deterministic company and title extraction"
```

---

### Task 6: Update BroadGapLLM Audit Pipeline

**Files:**
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/main.gs`
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/geminiUtils.gs`
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/spreadsheetUtils.gs`

- [ ] **Step 1: Use signal-window snippets in extraction phase**

In `runGeminiBroadGapAudit()`, replace:

```javascript
      const snippet = body.substring(0, 350).replace(/\s+/g, ' ').trim();
```

with:

```javascript
      const snippet = buildAuditSnippet(firstMsg.getSubject(), firstMsg.getFrom(), body);
```

- [ ] **Step 2: Capture regex reason/confidence and extraction hints**

In `runGeminiBroadGapClassification()`, replace:

```javascript
    const regexSkip = shouldSkipMessage(subject, from, snippet);
    const regexDecision = regexSkip ? 'SKIP' : 'PASS';
```

with:

```javascript
    const regexResult = classifyRegexDecision(subject, from, snippet);
    const regexDecision = regexResult.skip ? 'SKIP' : 'PASS';
    const preparsedCompany = CompanyUtils.extractCompany(subject, snippet, from, '');
    const preparsedTitle = JobUtils.cleanJobTitle(JobUtils.extractJobTitle(subject, snippet, from, ''));
```

Add `regexReason`, `regexConfidence`, `preparsedCompany`, and `preparsedTitle` to `threadLogs` and add `pc`/`pt` to `promptLogs`:

```javascript
      regexReason: regexResult.reason,
      regexConfidence: regexResult.confidence,
      preparsedCompany: preparsedCompany,
      preparsedTitle: preparsedTitle
```

```javascript
      pc: preparsedCompany,
      pt: preparsedTitle
```

- [ ] **Step 3: Update audit headers and rows**

Replace audit headers with:

```javascript
  const auditData = [[
    "Thread ID", "Date", "From", "Subject", "Regex Decision", "Regex Reason", "Regex Confidence",
    "Gemini Decision", "Gap Status", "Gemini Class", "Gemini Company", "Gemini Title",
    "Gemini Reasoning", "Preparsed Company", "Preparsed Title", "Snippet"
  ]];
```

Update row push order to match:

```javascript
      logItem.threadId,
      logItem.date,
      logItem.from,
      logItem.subject,
      logItem.regexDecision,
      logItem.regexReason,
      logItem.regexConfidence,
      geminiDecision,
      gapStatus,
      geminiClass,
      cleanCompany,
      cleanTitle,
      reasoning,
      logItem.preparsedCompany,
      logItem.preparsedTitle,
      logItem.snippet
```

- [ ] **Step 4: Adjust `formatGapLLMSheet()` gap status column**

In `spreadsheetUtils.gs`, change:

```javascript
    const gapStatusRange = sheet.getRange(2, 7, rowCount - 1, 1);
```

to:

```javascript
    const gapStatusRange = sheet.getRange(2, 9, rowCount - 1, 1);
```

- [ ] **Step 5: Update Gemini prompt and schema categories**

In `geminiUtils.gs`, replace classification definitions with text that includes:

```javascript
      "Definitions:\n" +
      "- APPLIED: Direct application confirmations, including LinkedIn 'your application was sent to COMPANY'.\n" +
      "- INTERVIEW_REQUEST: Requests to schedule or attend an interview.\n" +
      "- INTERVIEW_SCHEDULED: Confirmed interview time/date.\n" +
      "- ASSESSMENT: Coding tests, evaluations, or screenings.\n" +
      "- REJECTED: Rejections, not moving forward updates, or position closed notifications.\n" +
      "- OFFER: Selected for role alerts, contracts, or offer letters.\n" +
      "- RECRUITER_OUTREACH: Direct recruiter/human outreach for role, client, contract, opportunity, or resume request.\n" +
      "- RECRUITER_FOLLOW_UP: Follow-up to prior recruiter outreach.\n" +
      "- REFERRAL: Referral to a job or company.\n" +
      "- APPLICATION_UPDATE: Specific update about user's own application.\n" +
      "- CANDIDATE_ACCOUNT_DRAFT: Candidate account, draft, or complete-application reminder.\n" +
      "- NOISE: Digests, newsletters, generic recommendations, security/account notices, and non-job applications.\n\n" +
      "Rules:\n" +
      "1. LinkedIn subject 'your application was sent to COMPANY' is APPLIED, never NOISE.\n" +
      "2. Direct recruiter outreach is PASS if role/client/resume/opportunity/profile submission is mentioned.\n" +
      "3. Generic job alerts/recommendations/digests are NOISE unless about user's own candidacy.\n" +
      "4. Prefer pc/pt fields as company/title hints when visible.\n\n" +
```

Update schema enum to:

```javascript
enum: ["APPLIED", "INTERVIEW_REQUEST", "INTERVIEW_SCHEDULED", "ASSESSMENT", "REJECTED", "OFFER", "RECRUITER_OUTREACH", "RECRUITER_FOLLOW_UP", "REFERRAL", "APPLICATION_UPDATE", "CANDIDATE_ACCOUNT_DRAFT", "NOISE"]
```

Update `classMap` in `main.gs` to map the new categories to sheet labels.

- [ ] **Step 6: Run tests**

Run `runTrackerTests()`.

Expected: all tracker tests pass. Gemini live API does not need to run for this task.

- [ ] **Step 7: Commit audit pipeline**

```bash
git add main.gs geminiUtils.gs spreadsheetUtils.gs
git commit -m "feat: enrich broad gap audit diagnostics"
```

---

### Task 7: Final Verification and Documentation

**Files:**
- Modify: `/Users/tmaerz/projects/Apptrack-GScript/README.md`

- [ ] **Step 1: Update README customization/testing notes**

Add this under `## Testing`:

```markdown

The regression harness includes a golden corpus for LinkedIn application confirmations, recruiter outreach, referrals, non-job application noise, OTP/security noise, extraction, and date-aware status updates. Production scans use deterministic regex/rule classification; Gemini is only used by the BroadGapLLM audit tool.
```

- [ ] **Step 2: Run full manual regression**

Run `runTrackerTests()` in Apps Script.

Expected return value:

```text
All tracker tests passed
```

- [ ] **Step 3: Check git diff**

```bash
git diff --stat
git diff -- docs/superpowers/specs/2026-05-20-regex-first-classification-audit-upgrade-design.md docs/superpowers/plans/2026-05-20-regex-first-classification-audit-upgrade.md README.md scanUtils.gs statusUtils.gs extractionUtils.gs main.gs geminiUtils.gs spreadsheetUtils.gs testFixtures.gs
```

Expected: only the planned files changed, with no secrets or spreadsheet IDs added.

- [ ] **Step 4: Commit docs/final verification**

```bash
git add README.md docs/superpowers/specs/2026-05-20-regex-first-classification-audit-upgrade-design.md docs/superpowers/plans/2026-05-20-regex-first-classification-audit-upgrade.md
git commit -m "docs: document regex-first classification upgrade"
```

---

## Self-Review Notes

- Spec coverage: deterministic production classification, Gemini audit-only, signal-window snippets, reason/confidence audit columns, extraction hints, recruiter/referral statuses, date-aware updates, and golden corpus tests are covered by Tasks 1-7.
- Placeholder scan: plan contains no `TBD`, no unspecified validation steps, and no open-ended implementation steps without code.
- Type/signature consistency: `classifyRegexDecision(subject, from, bodyOrSnippet)`, `shouldSkipMessage(subject, from, bodyOrSnippet)`, `buildAuditSnippet(subject, from, body)`, and `getStatusUpdateDecision(currentStatus, currentDateUpdated, candidateStatus, candidateDate)` are consistently named across tasks.
