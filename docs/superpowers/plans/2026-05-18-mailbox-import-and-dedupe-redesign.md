# Mailbox Import and Dedupe Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve mailbox backlog backfill limitations, stop merging distinct job applications (relying strictly on Thread ID), bind dynamic spreadsheet access to the active sheet, overhaul the search query exclusions to avoid false negatives in "promotions", page through all mailbox matches, and implement an opt-in noise filter to exclude newsletters.

**Architecture:** 
- Dynamically access the active spreadsheet containing the script project by default.
- Refactor the duplicate matching map to use unique Gmail Thread IDs instead of the cleaned `jobTitle|company` string.
- Remove `-category:promotions` and `-label:social` from Gmail search exclusions.
- Implement an explicit mailbox diagnostic audit script that pages through all matching threads.
- Refactor noise filtering to use an opt-in model that skips generic emails unless a high-confidence positive keyword or ATS domain matches.

**Tech Stack:** Google Apps Script (V8 Engine), Clasp CLI.

---

### Task 1: Dynamic Spreadsheet Resolution

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Verify the dynamic spreadsheet binding**
Ensure `getOrCreateSpreadsheet` and the spreadsheet helper constants in `main.gs` are updated to dynamically bind to the active spreadsheet. (Completed)

---

### Task 2: Thread-ID Only Deduplication

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Verify thread-ID deduplication logic**
Confirm that duplicate checking uses `existingThreadIds` and appends all unique threads to new rows. (Completed)

---

### Task 3: State Reset & Menu Additions

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/scanUtils.gs`

- [ ] **Step 1: Verify state reset features**
Confirm `resetHistoricalScanState` and `resetAllTrackerState` are exposed in the menu and operational. (Completed)

---

### Task 4: Opt-In Noise Filter Conversion

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/scanUtils.gs`

- [ ] **Step 1: Convert noise filter to Opt-In model**
Instead of allowing everything by default, we will only keep messages that have high-confidence signal phrases OR are from trusted ATS/hiring domains. Newsletters and generic updates will be skipped by default.

In `scanUtils.gs`, update `shouldSkipMessage(subject, from, body)`:
```javascript
function shouldSkipMessage(subject, from, body) {
  const haystack = (String(subject || '') + ' ' + String(body || '')).toLowerCase();
  const domain = senderDomain_(from);
  
  // High-confidence noise skips
  if (domain === 'jobs-listings.linkedin.com' || domain === 'jobs-listings@linkedin.com') return true;
  if (haystack.includes('weekly application update') || haystack.includes('jobs you may be interested in')) return true;
  if (haystack.includes('password reset')) return true;
  if (haystack.includes('calendar notification') && !haystack.includes('interview')) return true;
  
  // If it's a positive application signal (Applied, Interview, Assessment, Offer, Rejection)
  if (isPositiveApplicationSignal_(haystack, domain)) {
    return false; // Do not skip! Keep this email.
  }
  
  // If it doesn't match any positive signal, skip it by default (to filter out newsletters/security alerts)
  return true; 
}
```

- [ ] **Step 2: Update positive application signal check**
Refine `isPositiveApplicationSignal_` to include more robust keywords, including rejections, and to match specific ATS domains.

In `scanUtils.gs`, replace `isPositiveApplicationSignal_` with:
```javascript
function isPositiveApplicationSignal_(haystack, domain) {
  if (haystack.includes('your application was sent')) return true;
  if (haystack.includes('application submitted')) return true;
  if (haystack.includes('successfully applied')) return true;
  if (haystack.includes('application received')) return true;
  if (haystack.includes('we received your application')) return true;
  if (haystack.includes('thank you for applying')) return true;
  if (haystack.includes('thank you for your application')) return true;
  if (haystack.includes('thank you for your interest')) return true;
  if (haystack.includes('thank you for taking the time to apply')) return true;
  if (haystack.includes('interview')) return true;
  if (haystack.includes('assessment')) return true;
  if (haystack.includes('coding challenge')) return true;
  if (haystack.includes('not moving forward')) return true;
  if (haystack.includes('regret to inform')) return true;
  if (haystack.includes('other candidates')) return true;
  if (haystack.includes('unable to offer')) return true;
  if (haystack.includes('congratulations')) return true;
  if (haystack.includes('offer letter')) return true;
  
  // Match standard job ATS/candidate platform domains
  return /(^|\.)(greenhouse\.io|lever\.co|myworkdayjobs\.com|workday\.com|icims\.com|smartrecruiters\.com|indeed\.com|successfactors\.com|workablemail\.com|linkedin\.com)$/.test(domain);
}
```

- [ ] **Step 3: Commit changes**
```bash
git add scanUtils.gs
git commit -m "fix: convert noise filter to opt-in allowlist model to exclude newsletters"
```

---

### Task 5: Uncapped Paging Diagnostic Audit Tool

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Update `runDiagnosticMailboxAudit` with paging loop**
Rewrite the diagnostic script in `main.gs` to fetch matching threads in blocks of 500 in a `while` loop until 0 threads are returned, computing the absolute count.

In `main.gs`, replace `runDiagnosticMailboxAudit()` with:
```javascript
function runDiagnosticMailboxAudit() {
  const broadQuery = '(application OR applied OR interview OR recruiter OR careers OR hiring OR "for applying" OR "application submitted" OR "your application")';
  const exclusions = '-from:jobs-listings@linkedin.com -from:@glassdoor.com -subject:"password reset" -subject:"weekly application update" -subject:digest';
  const fullBroadQuery = broadQuery + ' ' + exclusions;
  
  Logger.log('Starting Diagnostic Mailbox Audit (Uncapped)...');
  Logger.log('Broad query: ' + fullBroadQuery);
  
  let allThreads = [];
  let page = 0;
  const pageSize = 500;
  
  while (true) {
    let threadsPage;
    try {
      threadsPage = GmailApp.search(fullBroadQuery, page * pageSize, pageSize);
    } catch (e) {
      Logger.log(`Failed to execute search at page ${page}: ` + e.toString());
      break;
    }
    
    if (!threadsPage || threadsPage.length === 0) {
      break;
    }
    
    allThreads = allThreads.concat(threadsPage);
    Logger.log(`Fetched page ${page + 1}: found ${threadsPage.length} threads (Cumulative: ${allThreads.length})`);
    
    if (threadsPage.length < pageSize) {
      break; // Last page reached
    }
    
    page++;
    Utilities.sleep(100); // Avoid rate limiting
  }
  
  Logger.log('Total threads matching broad query: ' + allThreads.length);
  
  let skippedCount = 0;
  let parsedCount = 0;
  
  for (let i = 0; i < allThreads.length; i++) {
    const thread = allThreads[i];
    const messages = thread.getMessages();
    if (messages.length === 0) continue;
    
    const firstMsg = messages[0];
    const subject = firstMsg.getSubject();
    const from = firstMsg.getFrom();
    const body = firstMsg.getPlainBody();
    
    const skip = shouldSkipMessage(subject, from, body);
    
    if (skip) {
      skippedCount++;
      if (skippedCount <= 20) {
        Logger.log(`[SKIP] From: ${from} | Subject: ${subject}`);
      }
    } else {
      parsedCount++;
      if (parsedCount <= 20) {
        const company = CompanyUtils.extractCompany(subject, body, from, firstMsg.getBody());
        const rawJobTitle = JobUtils.extractJobTitle(subject, body, from, firstMsg.getBody());
        const jobTitle = JobUtils.cleanJobTitle(rawJobTitle);
        Logger.log(`[PASS] From: ${from} | Subject: ${subject} => Co: ${company} | Title: ${jobTitle}`);
      }
    }
  }
  
  Logger.log(`Diagnostic Complete!`);
  Logger.log(`Total threads analyzed: ${allThreads.length}`);
  Logger.log(`Threads matched (parsed): ${parsedCount}`);
  Logger.log(`Threads skipped (noise filter): ${skippedCount}`);
  
  SpreadsheetApp.getActive().toast(`Diagnostic Complete: Found ${allThreads.length} total, Parsed ${parsedCount}, Skipped ${skippedCount}`);
}
```

- [ ] **Step 2: Commit changes**
```bash
git add main.gs
git commit -m "feat: add uncapped paging diagnostic mailbox audit tool"
```

---

### Task 6: Push changes using clasp & Run tests

**Files:**
- Execution: clasp push

- [ ] **Step 1: Push code**
Run `clasp push` to deploy code to Google Apps Script.

- [ ] **Step 2: Run verification**
Advise the user to run `Run Diagnostic Mailbox Audit` to observe the true count and see the precision of the new opt-in filters.
