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

### Task 4: Opt-In Noise Filter Conversion

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/scanUtils.gs`

- [ ] **Step 1: Convert noise filter to Opt-In model**
In `scanUtils.gs`, refine the keyword checks in `isPositiveApplicationSignal_` and default skip rules in `shouldSkipMessage`. (Completed)

- [ ] **Step 2: Restrict Indeed/LinkedIn domain matching in `isPositiveApplicationSignal_`**
Emails from general domains like `linkedin.com` or `indeed.com` must have high-confidence subject/body keywords to pass, to prevent marketing updates and billing notices from passing.

Replace lines 58-79 in `scanUtils.gs` with:
```javascript
function buildBroadGmailSearchQuery(window) {
  return '(application OR applied OR interview OR recruiter OR careers OR hiring OR "for applying" OR "application submitted" OR "your application") ' + buildDateWindowFilter(window);
}

function buildAtsGmailSearchQuery(window) {
  return 'from:(greenhouse.io OR lever.co OR workday.com OR myworkdayjobs.com OR icims.com OR smartrecruiters.com OR workablemail.com OR successfactors.com) ' + buildDateWindowFilter(window);
}

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
  
  // Greenhouse, Lever, Workday, workable, smartrecruiters, icims, successfactors, etc.
  return /(^|\.)(greenhouse\.io|lever\.co|myworkdayjobs\.com|workday\.com|icims\.com|smartrecruiters\.com|successfactors\.com|workablemail\.com)$/.test(domain);
}
```

- [ ] **Step 3: Commit changes**
```bash
git add scanUtils.gs
git commit -m "fix: restrict isPositiveApplicationSignal to trusted ATS platforms"
```

---

### Task 5: Strict Query Mailbox Diagnostic Audit Tool

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Refactor `runDiagnosticMailboxAudit` to execute over strict query**
Modify the diagnostic audit tool in `main.gs` to page over the Strict query across the entire mailbox and safely limit detailed analysis to 100 threads to prevent execution limit issues.

In `main.gs`, replace `runDiagnosticMailboxAudit()` with:
```javascript
function runDiagnosticMailboxAudit() {
  const signalGroup = '(subject:("thank you for applying" OR "thank you for your application" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for" OR "application received" OR "we received your application" OR "confirmation of your application" OR "interview invitation" OR "schedule interview" OR assessment OR "coding challenge" OR "job offer" OR "status update" OR "regarding your application") OR body:("thank you for your interest" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for") OR from:(@talent OR @careers OR @jobs OR @hr OR @recruiting OR @hire OR jobs-noreply@linkedin.com OR candidates.workablemail.com OR @inbound.workablemail.com OR greenhouse.io OR lever.co OR myworkdayjobs.com OR workday.com OR icims.com OR smartrecruiters.com OR indeed.com OR successfactors.com))';
  const exclusions = '-from:jobs-listings@linkedin.com -from:@glassdoor.com -subject:"password reset" -subject:"weekly application update" -subject:digest';
  const fullStrictQuery = signalGroup + ' ' + exclusions;
  
  Logger.log('Starting Diagnostic Mailbox Audit (Strict Query, Uncapped)...');
  Logger.log('Strict query: ' + fullStrictQuery);
  
  let allThreads = [];
  let page = 0;
  const pageSize = 500;
  
  while (true) {
    let threadsPage;
    try {
      threadsPage = GmailApp.search(fullStrictQuery, page * pageSize, pageSize);
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
  
  Logger.log('Total threads matching strict query: ' + allThreads.length);
  
  let skippedCount = 0;
  let parsedCount = 0;
  
  // Cap detailed sample analysis at 100 to prevent execution timeout
  const sampleLimit = Math.min(allThreads.length, 100);
  Logger.log(`Analyzing details for a sample of the first ${sampleLimit} threads...`);
  
  for (let i = 0; i < sampleLimit; i++) {
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
  Logger.log(`Total matching threads: ${allThreads.length}`);
  Logger.log(`Sample analyzed: ${sampleLimit}`);
  Logger.log(`Sample matched (parsed): ${parsedCount}`);
  Logger.log(`Sample skipped (noise filter): ${skippedCount}`);
  
  SpreadsheetApp.getActive().toast(`Diagnostic Complete: Found ${allThreads.length} total strict matches! (Sample analyzed: ${sampleLimit})`);
}
```

- [ ] **Step 2: Commit changes**
```bash
git add main.gs
git commit -m "feat: run mailbox diagnostic audit over the strict query"
```

---

### Task 6: Push changes using clasp & Run tests

**Files:**
- Execution: clasp push

- [ ] **Step 1: Push code**
Run `clasp push` to deploy code to Google Apps Script.

- [ ] **Step 2: Run verification**
Advise the user to run `Run Diagnostic Mailbox Audit` to observe the true count and see the precision of the new opt-in filters.
