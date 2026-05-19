# Mailbox Import and Dedupe Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve mailbox backlog backfill limitations, stop merging distinct job applications (relying strictly on Thread ID), bind dynamic spreadsheet access to the active sheet, overhaul the search query exclusions to avoid false negatives in "promotions", page through all mailbox matches safely without timeouts, and implement an opt-in noise filter to exclude newsletters.

**Architecture:** 
- Dynamically access the active spreadsheet containing the script project by default.
- Refactor the duplicate matching map to use unique Gmail Thread IDs instead of the cleaned `jobTitle|company` string.
- Remove `-category:promotions` and `-label:social` from Gmail search exclusions.
- Implement an explicit mailbox diagnostic audit script that pages through all matching threads using the Strict query.
- Refactor noise filtering to use an opt-in model that skips generic emails unless a high-confidence positive keyword or trusted ATS domain matches.

**Tech Stack:** Google Apps Script (V8 Engine), Clasp CLI.

---

### Task 1: Dynamic Spreadsheet Resolution

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Verify dynamic spreadsheet binding**
Ensure spreadsheet resolving defaults to standard active sheet. (Completed)

---

### Task 2: Thread-ID Only Deduplication

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Verify thread-ID deduplication**
Confirm that duplication checking uses Thread ID and appends new rows correctly. (Completed)

---

### Task 3: State Reset & Menu Additions

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/scanUtils.gs`

- [ ] **Step 1: Verify menu features**
Confirm state reset handlers are available. (Completed)

---

### Task 4: Precise Noise Filter & Extended ATS Domains

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/scanUtils.gs`

- [ ] **Step 1: Add helper `isHighConfidenceSubject_` and update `isAtsDomain`**
Add the helper to scanUtils.gs to immediately allow high-confidence subjects (e.g. including rejections, assessments, and confirmation phrases combined with connector prepositions) and expand the list of trusted ATS domains.

In `scanUtils.gs`, replace `shouldSkipMessage` and `isPositiveApplicationSignal_` with:
```javascript
function isHighConfidenceSubject_(lowerSubject) {
  const hasAppPattern = lowerSubject.includes('application') || 
                        lowerSubject.includes('applied') || 
                        lowerSubject.includes('applying');
                        
  if (hasAppPattern) {
    const hasConnector = lowerSubject.includes('received') ||
                         lowerSubject.includes('submitted') ||
                         lowerSubject.includes('sent') ||
                         lowerSubject.includes('confirm') ||
                         lowerSubject.includes('thanks') ||
                         lowerSubject.includes('thank you') ||
                         lowerSubject.includes('interest') ||
                         lowerSubject.includes('status') ||
                         lowerSubject.includes('update') ||
                         lowerSubject.includes('at ') ||
                         lowerSubject.includes('to ') ||
                         lowerSubject.includes('for ') ||
                         lowerSubject.includes('with ');
    if (hasConnector) return true;
  }
  
  // Specific absolute keywords
  const absoluteKeywords = [
    'interview',
    'schedule a time',
    'coding challenge',
    'assessment',
    'regret to inform',
    'not moving forward',
    'congratulations',
    'offer letter'
  ];
  
  return absoluteKeywords.some(keyword => lowerSubject.includes(keyword));
}

function shouldSkipMessage(subject, from, body) {
  const lowerSubject = String(subject || '').toLowerCase();
  const lowerBody = String(body || '').toLowerCase();
  const domain = senderDomain_(from);
  
  // 1. High-confidence subject check (never skip real confirmation subjects)
  if (isHighConfidenceSubject_(lowerSubject)) {
    return false; // Keep it immediately!
  }
  
  // 2. High-confidence subject noise skips
  if (domain === 'jobs-listings.linkedin.com' || domain === 'jobs-listings@linkedin.com') return true;
  if (lowerSubject.includes('weekly application update') || 
      lowerSubject.includes('jobs you may be interested in') ||
      lowerSubject.includes('job alert') ||
      lowerSubject.includes('weekly') ||
      lowerSubject.includes('digest') ||
      lowerSubject.includes('password reset') ||
      lowerSubject.includes('security alert') ||
      (lowerSubject.includes('calendar notification') && !lowerSubject.includes('interview'))) {
    return true; 
  }
  
  // 3. Trusted ATS domains are automatically kept (unless subject was noise above)
  const isAtsDomain = /(^|\.)(greenhouse\.io|lever\.co|myworkdayjobs\.com|workday\.com|icims\.com|smartrecruiters\.com|successfactors\.com|workablemail\.com|ashbyhq\.com|recruitee\.com|breezy\.hr|jazzhr\.com|bamboohr\.com|workable\.com|jobvite\.com|oracle\.com|ukg\.com|paycor\.com|paylocity\.com|adp\.com|rippling\.com|darwinbox\.com|phenom\.com|avature\.net)$/i.test(domain);
  if (isAtsDomain) {
    return false; 
  }
  
  // 4. Check body positive keywords with robust noise exclusion
  const positiveKeywords = [
    'your application was sent',
    'application submitted',
    'successfully applied',
    'application received',
    'we received your application',
    'thank you for applying',
    'thank you for your application',
    'thank you for your interest',
    'thanks for applying',
    'thanks for your application',
    'thanks for your interest',
    'interview',
    'assessment',
    'coding challenge',
    'not moving forward',
    'regret to inform',
    'congratulations',
    'offer letter'
  ];
  
  const bodyHasPositive = positiveKeywords.some(keyword => lowerBody.includes(keyword));
  if (bodyHasPositive) {
    const bodyHasNoise = (lowerBody.includes('weekly application update') || 
                          lowerBody.includes('jobs you may be interested in') || 
                          lowerBody.includes('job alert') ||
                          lowerBody.includes('password reset')) &&
                         !lowerBody.includes('your application was sent') &&
                         !lowerBody.includes('thank you for applying') &&
                         !lowerBody.includes('thanks for applying') &&
                         !lowerBody.includes('interview');
                         
    if (!bodyHasNoise) {
      return false; // Keep valid body confirmation
    }
  }
  
  // 5. Default: skip to prevent newsletter leakage
  return true;
}
```

- [ ] **Step 2: Commit changes**
```bash
git add scanUtils.gs
git commit -m "fix: convert noise filter to robust tiered opt-in filter with expanded ATS domains"
```

---

### Task 5: Strict Query Mailbox Diagnostic Audit Tool

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Verify the uncapped diagnostic audit**
Ensure `runDiagnosticMailboxAudit` loops uncapped and runs completely. (Completed)

---

### Task 6: Push changes using clasp & Run tests

**Files:**
- Execution: clasp push

- [ ] **Step 1: Push code**
Run `clasp push` to deploy code to Google Apps Script.

- [ ] **Step 2: Run verification**
Advise the user to run `Run Diagnostic Mailbox Audit` to observe the true count and see the precision of the new opt-in filters.
