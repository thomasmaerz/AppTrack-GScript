# Mailbox Import and Dedupe Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve mailbox backlog backfill limitations, stop merging distinct job applications (relying strictly on Thread ID), bind dynamic spreadsheet access to the active sheet, overhaul the search query exclusions to avoid false negatives in "promotions", and add a diagnostic mailbox audit tool.

**Architecture:** 
- Dynamically access the active spreadsheet containing the script project by default.
- Refactor the duplicate matching map to use unique Gmail Thread IDs instead of the cleaned `jobTitle|company` string.
- Remove `-category:promotions` and `-label:social` from Gmail search exclusions.
- Implement an explicit mailbox diagnostic audit script to count broad matches, identify skipped emails, and detect false negatives.

**Tech Stack:** Google Apps Script (V8 Engine), Clasp CLI.

---

### Task 1: Dynamic Spreadsheet Resolution

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Check existing `getOrCreateSpreadsheet` and configurations**
Inspect the top of `main.gs` to ensure we modify the SPREADSHEET_NAME and spreadsheet fetch fallback. We will remove the hardcoded sheet ID dependence unless explicitly passed.

- [ ] **Step 2: Modify `getOrCreateSpreadsheet`**
Rewrite the spreadsheet retrieval logic to use the active bound spreadsheet by default.

Replace lines 58-109 in `/Users/tmaerz/projects/AppTrack-GScript/main.gs` with:
```javascript
function getOrCreateSpreadsheet(spreadsheetId) {
  let spreadsheet;

  if (spreadsheetId) {
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      Logger.log("Failed to open spreadsheet by ID: " + e.toString());
    }
  }

  if (!spreadsheet) {
    try {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      spreadsheet = null;
    }
  }

  if (!spreadsheet) {
    const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
    if (files.hasNext()) {
      const file = files.next();
      spreadsheet = SpreadsheetApp.open(file);
    } else {
      spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
    }
  }
  
  const sheet = spreadsheet.getSheetByName("Applications");

  if (!sheet) {
    const newSheet = spreadsheet.insertSheet("Applications");
    SpreadsheetUtils.setupSheet(newSheet);
    return spreadsheet;
  }

  const firstCell = sheet.getRange(1, 1).getValue();

  if (firstCell !== "Job Title") {
    SpreadsheetUtils.setupSheet(sheet);
  }

  return spreadsheet;
}
```

- [ ] **Step 3: Modify hardcoded sheet ID usages in helper entry points**
In `main.gs`, replace references to `TARGET_SPREADSHEET_ID` with `null` so they default to the active spreadsheet.

In `main.gs`, update configuration variables:
```javascript
// Configuration
const SPREADSHEET_NAME = "Application Tracker";
const DEBUG_SPREADSHEET_ID = "1FnCwtwAxCEp9mK-aNtaJnM-iAXbCsGzNIOOK3f7nEr4";
```
And replace functions:
```javascript
function refreshVisualizations() {
  const spreadsheet = getOrCreateSpreadsheet();
  const sheet = spreadsheet.getSheetByName("Applications");

  SpreadsheetUtils.enhanceSpreadsheetFormatting(sheet);
  
  try {
    SpreadsheetUtils.createSummaryDashboard(sheet);
    SpreadsheetApp.getActive().toast('Visualizations refreshed successfully!');
  } catch (e) {
    Logger.log("Error refreshing visualizations: " + e.toString());
    SpreadsheetApp.getActive().toast('Error refreshing visualizations: ' + e.toString());
  }
}

function migrateSpreadsheet() {
  const spreadsheet = getOrCreateSpreadsheet();
  const sheet = spreadsheet.getSheetByName("Applications");
  ...
}

function createRejectionFollowupDrafts() {
  const spreadsheet = getOrCreateSpreadsheet();
  const sheet = spreadsheet.getSheetByName("Applications");
  ...
}
```

- [ ] **Step 4: Commit changes**
```bash
git add main.gs
git commit -m "refactor: use dynamic active spreadsheet binding by default"
```

---

### Task 2: Thread-ID Only Deduplication

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Refactor scanEmails scanning duplicates logic**
In `main.gs`, completely remove the `existingJobApplications` map. Rely solely on the unique `existingThreadIds` map to match existing threads. Any thread ID that is not tracked yet will get a brand new row appended, even if the job title and company are duplicates.

Replace lines 283-302 in `/Users/tmaerz/projects/AppTrack-GScript/main.gs`:
```javascript
  // Create maps to store existing data for lookup
  const existingThreadIds = new Map(); // threadId -> row number
  
  // Reload the data after potentially adding the ThreadId column
  const updatedData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < updatedData.length; i++) {
    const row = updatedData[i];
    // Store threadId -> row number mapping if ThreadId column exists
    if (threadIdIndex < row.length && row[threadIdIndex]) { 
      existingThreadIds.set(row[threadIdIndex], i + 1); // Store thread ID and row number (1-indexed)
    }
  }
```

- [ ] **Step 2: Refactor deduplication branch inside email loop**
Remove the check for `existingJobApplications.has(lookupKey)` so that we only look at `existingThreadIds.has(threadId)`. If the Thread ID is not present, always create a new row.

Replace lines 402-438 in `/Users/tmaerz/projects/AppTrack-GScript/main.gs`:
```javascript
    // Check if we already have an entry for this thread ID
    if (existingThreadIds.has(threadId)) {
      const existingRowNum = existingThreadIds.get(threadId);
      
      // Get the current status from the sheet
      const currentStatus = sheet.getRange(existingRowNum, statusIndex + 1).getValue();
      
      const nextStatus = getHigherPriorityStatus(currentStatus, initialStatus);
      const shouldUpdateStatus = nextStatus !== currentStatus;
      
      pendingCellUpdates.push({ row: existingRowNum, threadId: threadId, status: shouldUpdateStatus ? nextStatus : null, updatedDate: lastDate, threadLink: threadLink });
      
      updatedApplicationsCount++;
    } else {
      // This is a new application thread - add a new row
      const rowData = new Array(sheet.getLastColumn()).fill('');
      rowData[jobTitleIndex] = jobTitle;
      rowData[companyIndex] = company;
      rowData[dateSubmittedIndex] = date;
      rowData[dateUpdatedIndex] = lastDate;
      rowData[statusIndex] = initialStatus;
      rowData[headers.indexOf('Raw Body')] = body.slice(0, 100);
      rowData[threadIdIndex] = threadId;
      const newRow = sheet.getLastRow() + newRows.length + 1;
      newRows.push(rowData);
      newRowLinks.push({ row: newRow, threadLink: threadLink, submittedDate: date, updatedDate: lastDate });
      
      // Add this to our map so we can detect duplicates in the same batch
      existingThreadIds.set(threadId, newRow);
      
      newApplicationsCount++;
    }
```

- [ ] **Step 3: Commit changes**
```bash
git add main.gs
git commit -m "feat: use strict thread-ID only deduplication to prevent job merging"
```

---

### Task 3: State Reset & Menu Additions

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/scanUtils.gs`

- [ ] **Step 1: Add new menu items in `onOpen()`**
Expose resetting state directly in the menu.

In `main.gs`, replace `onOpen()` with:
```javascript
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Job Tracker')
    .addItem('Scan Emails', 'scanEmails')
    .addItem('Import Historical Emails', 'importHistoricalEmails')
    .addSeparator()
    .addItem('Reset Historical Scan State', 'resetHistoricalScanState')
    .addItem('Reset All Tracker State', 'resetAllTrackerState')
    .addSeparator()
    .addItem('Show Debug State', 'logTrackerDebugState')
    .addItem('Compare Gmail Query Counts', 'compareGmailQueryCountsForTargetSpreadsheet')
    .addItem('Run Tracker Tests', 'runTrackerTests')
    .addItem('Set up daily scanning', 'setupTriggers')
    .addItem('Refresh Visualizations', 'refreshVisualizations')
    .addItem('Create Rejection Follow-up Drafts', 'createRejectionFollowupDrafts')
    .addItem('Open Feedback Form', 'openFeedbackForm')
    .addSeparator()
    .addItem('Migrate Spreadsheet (Hide Thread ID)', 'migrateSpreadsheet')
    .addToUi();
}
```

- [ ] **Step 2: Add script properties reset helpers in `scanUtils.gs`**
Add helper to delete all properties so the user can easily reset state.

In `scanUtils.gs`, add:
```javascript
function clearAllTrackerState() {
  const properties = scanProperties_();
  properties.deleteProperty(SCAN_KEYS.lastSuccess);
  properties.deleteProperty(SCAN_KEYS.historicalWindowEnd);
  properties.deleteProperty(SCAN_KEYS.historicalSearchStart);
  properties.deleteProperty(SCAN_KEYS.historicalSearchQuery);
}
```

- [ ] **Step 3: Add menu callback handlers in `main.gs`**
Add the functions callable by the menu items.

In `main.gs`, append:
```javascript
function resetHistoricalScanState() {
  clearHistoricalScanState();
  SpreadsheetApp.getActive().toast('Historical scan state has been reset! Backfill will start cleanly from today.');
  Logger.log('Historical scan state has been explicitly reset by the user.');
}

function resetAllTrackerState() {
  clearAllTrackerState();
  SpreadsheetApp.getActive().toast('All tracker scan state has been reset! Scanning will re-import all historical and recent emails.');
  Logger.log('All tracker scan state has been explicitly reset by the user.');
}
```

- [ ] **Step 4: Commit changes**
```bash
git add main.gs scanUtils.gs
git commit -m "feat: add explicit state reset options to spreadsheet menu"
```

---

### Task 4: Query Exclusion Overhaul

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/scanUtils.gs`

- [ ] **Step 1: Remove `-category:promotions` and `-label:social`**
Gmail automatically categorizes some job updates/confirmations as promotions. Removing this exclusion will prevent false negatives.

In `scanUtils.gs`, replace `buildGmailSearchQuery(mode, window)` with:
```javascript
function buildGmailSearchQuery(mode, window) {
  const signalGroup = '(subject:("thank you for applying" OR "thank you for your application" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for" OR "application received" OR "we received your application" OR "confirmation of your application" OR "interview invitation" OR "schedule interview" OR assessment OR "coding challenge" OR "job offer" OR "status update" OR "regarding your application") OR body:("thank you for your interest" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for") OR from:(@talent OR @careers OR @jobs OR @hr OR @recruiting OR @hire OR jobs-noreply@linkedin.com OR candidates.workablemail.com OR @inbound.workablemail.com OR greenhouse.io OR lever.co OR myworkdayjobs.com OR workday.com OR icims.com OR smartrecruiters.com OR indeed.com OR successfactors.com))';
  const exclusions = '-from:jobs-listings@linkedin.com -from:@glassdoor.com -subject:"password reset" -subject:"weekly application update" -subject:digest';
  return signalGroup + ' ' + exclusions + ' ' + buildDateWindowFilter(window);
}
```

- [ ] **Step 2: Commit changes**
```bash
git add scanUtils.gs
git commit -m "fix: remove category:promotions and label:social exclusions from search query"
```

---

### Task 5: Diagnostic Mailbox Audit Tool

**Files:**
- Modify: `/Users/tmaerz/projects/AppTrack-GScript/main.gs`

- [ ] **Step 1: Add diagnostic audit menu option**
In `main.gs`, add a diagnostic menu item inside `onOpen()`:
```javascript
    .addItem('Run Diagnostic Mailbox Audit', 'runDiagnosticMailboxAudit')
```

- [ ] **Step 2: Write `runDiagnosticMailboxAudit` in `main.gs`**
Add a diagnostic script that searches the entire mailbox (no date limits) using the broad query, matches it against skip rules, and counts results to pinpoint exactly which emails are being filtered out.

Add the following function in `main.gs`:
```javascript
function runDiagnosticMailboxAudit() {
  const broadQuery = '(application OR applied OR interview OR recruiter OR careers OR hiring OR "for applying" OR "application submitted" OR "your application")';
  const exclusions = '-from:jobs-listings@linkedin.com -from:@glassdoor.com -subject:"password reset" -subject:"weekly application update" -subject:digest';
  const fullBroadQuery = broadQuery + ' ' + exclusions;
  
  Logger.log('Starting Diagnostic Mailbox Audit...');
  Logger.log('Broad query: ' + fullBroadQuery);
  
  let threads;
  try {
    threads = GmailApp.search(fullBroadQuery, 0, 500);
  } catch (e) {
    Logger.log('Failed to execute search: ' + e.toString());
    SpreadsheetApp.getActive().toast('Diagnostic failed: ' + e.toString());
    return;
  }
  
  Logger.log('Total threads matching broad query: ' + threads.length);
  
  let skippedCount = 0;
  let parsedCount = 0;
  
  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
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
  Logger.log(`Total threads analyzed: ${threads.length}`);
  Logger.log(`Threads matched (parsed): ${parsedCount}`);
  Logger.log(`Threads skipped (noise filter): ${skippedCount}`);
  
  SpreadsheetApp.getActive().toast(`Diagnostic Complete: Found ${threads.length} total, Parsed ${parsedCount}, Skipped ${skippedCount}`);
}
```

- [ ] **Step 3: Commit changes**
```bash
git add main.gs
git commit -m "feat: add diagnostic mailbox audit tool to identify false negatives"
```
