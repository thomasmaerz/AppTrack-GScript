# BroadGap Resume Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the intentional Gemini BroadGap audit resume changes so deployed Apps Script behavior is reliable, non-overlapping, and committed to Git.

**Architecture:** Keep the BroadGap audit in `main.gs`, centralize runtime constants in a `GEMINI_BROAD_GAP_CONFIG` object, and guard menu/trigger execution with `LockService.getScriptLock()`. Preserve the formatting corrections in `spreadsheetUtils.gs` so resumed appends format the whole `BroadGapLLM` sheet.

**Tech Stack:** Google Apps Script JavaScript, `ScriptApp` time-based triggers, `LockService`, `PropertiesService`, local Node-based Apps Script test shim.

---

## File Structure

- Modify `main.gs`: add `GEMINI_BROAD_GAP_CONFIG`, use config values, add script-lock guarded wrapper, move existing body into internal function, keep resume trigger cleanup behavior, and use full sheet row count when formatting resumed output.
- Modify `spreadsheetUtils.gs`: keep defensive `rowCount` default in `formatGapLLMSheet()`.
- Modify `testFixtures.gs`: add focused local tests for BroadGap config values and formatting default if feasible without heavy spreadsheet mocks; otherwise keep existing tracker regression suite and add pure helper tests only if helpers are introduced.

## Task 1: Centralize BroadGap Timing and Formatting Fix

**Files:**
- Modify: `main.gs:914-1240`
- Modify: `spreadsheetUtils.gs:845-883`
- Test: `testFixtures.gs`

- [x] **Step 1: Write failing config/formatting tests**

Add tests to `testFixtures.gs` that assert the intended constants and formatting fallback are available. If adding tests to the existing harness, append helper tests near the other assertion-based tests and call them from `runTrackerTests()`.

Expected test intent:

```javascript
assertTrackerEqual(GEMINI_BROAD_GAP_CONFIG.maxRuntimeMs, 6 * 60 * 1000, 'BroadGap max runtime uses Apps Script execution budget');
assertTrackerEqual(GEMINI_BROAD_GAP_CONFIG.stopBufferMs, 30 * 1000, 'BroadGap stop buffer');
assertTrackerEqual(GEMINI_BROAD_GAP_CONFIG.classificationSafetyMs, 90 * 1000, 'BroadGap classification safety window');
assertTrackerEqual(GEMINI_BROAD_GAP_CONFIG.resumeDelayMs, 60 * 1000, 'BroadGap resume trigger delay');
```

- [x] **Step 2: Run tests to verify failure**

Run from the worktree root:

```bash
node - <<'NODE'
const fs = require('fs');
const files = ['applicationUtils.gs','extractionUtils.gs','geminiUtils.gs','jobTitleVisualization.gs','main.gs','rawGapAudit.gs','scanUtils.gs','spreadsheetUtils.gs','statusUtils.gs','testFixtures.gs'];
let code = '';
for (const f of files) code += fs.readFileSync(f, 'utf8') + '\n';
function pad(n, width=2){ return String(n).padStart(width,'0'); }
const Logger = { log(){} };
const Utilities = { formatDate(d, tz, fmt) { return fmt.replace('yyyy', String(d.getFullYear())).replace('MM', pad(d.getMonth()+1)).replace('dd', pad(d.getDate())).replace('HH', pad(d.getHours())).replace('mm', pad(d.getMinutes())).replace('ss', pad(d.getSeconds())); }, sleep(){} };
const Session = { getScriptTimeZone(){ return 'UTC'; } };
const PropertiesService = { getScriptProperties(){ return { getProperty(){ return null; }, setProperty(){}, deleteProperty(){} }; } };
const GmailApp = { search(){ return []; } };
const SpreadsheetApp = { getActive(){ return { toast(){} }; } };
const ScriptApp = { getOAuthToken(){ return ''; }, newTrigger(){ return { timeBased(){ return this; }, after(){ return this; }, create(){} }; }, getProjectTriggers(){ return []; }, deleteTrigger(){} };
const UrlFetchApp = { fetch(){ throw new Error('UrlFetchApp not available in local tests'); } };
global.Logger = Logger; global.Utilities = Utilities; global.Session = Session; global.PropertiesService = PropertiesService; global.GmailApp = GmailApp; global.SpreadsheetApp = SpreadsheetApp; global.ScriptApp = ScriptApp; global.UrlFetchApp = UrlFetchApp;
code += '\nconsole.log(runTrackerTests());\n';
(0, eval)(code);
NODE
```

Expected: FAIL because `GEMINI_BROAD_GAP_CONFIG` does not exist yet.

- [x] **Step 3: Implement central config and formatting corrections**

In `main.gs`, add near the BroadGap functions:

```javascript
const GEMINI_BROAD_GAP_CONFIG = {
  maxRuntimeMs: 6 * 60 * 1000,
  stopBufferMs: 30 * 1000,
  classificationSafetyMs: 90 * 1000,
  resumeDelayMs: 60 * 1000
};
```

Update `runGeminiBroadGapAudit()` to read values from config instead of inline literals.

Update `runGeminiBroadGapClassification()` defaults to use config values:

```javascript
maxRuntimeMs = maxRuntimeMs || GEMINI_BROAD_GAP_CONFIG.maxRuntimeMs;
stopBufferMs = stopBufferMs || GEMINI_BROAD_GAP_CONFIG.stopBufferMs;
classificationSafetyMs = classificationSafetyMs || GEMINI_BROAD_GAP_CONFIG.classificationSafetyMs;
const resumeDelayMs = GEMINI_BROAD_GAP_CONFIG.resumeDelayMs;
```

Use `GEMINI_BROAD_GAP_CONFIG.resumeDelayMs` for all `ScriptApp.newTrigger('resumeGeminiBroadGapAudit').timeBased().after(...)` calls.

Keep this output formatting call:

```javascript
SpreadsheetUtils.formatGapLLMSheet(gapSheet, gapSheet.getLastRow());
```

In `spreadsheetUtils.gs`, keep:

```javascript
formatGapLLMSheet: function(sheet, rowCount) {
  rowCount = rowCount || sheet.getLastRow();
  if (rowCount <= 1) return;
```

- [x] **Step 4: Run tests to verify pass**

Run the same Node shim command from Step 2.

Expected: `All tracker tests passed`.

- [x] **Step 5: Commit task**

Status: completed without commit per controller instruction.

Do not commit unless explicitly permitted by the controller. If permitted:

```bash
git add main.gs spreadsheetUtils.gs testFixtures.gs
git commit -m "fix: centralize BroadGap resume timing"
```

## Task 2: Add Script Lock Guard for Gemini BroadGap Audit

**Files:**
- Modify: `main.gs:914-1040`
- Test: `testFixtures.gs`

- [x] **Step 1: Write failing tests for lock helper behavior**

Add small pure helpers if needed so locking behavior can be tested without full Apps Script execution. The desired helper behavior:

```javascript
function getGeminiBroadGapLock_() {
  return LockService.getScriptLock();
}

function scheduleGeminiBroadGapResume_() {
  deleteGapAuditTriggers();
  ScriptApp.newTrigger('resumeGeminiBroadGapAudit')
    .timeBased()
    .after(GEMINI_BROAD_GAP_CONFIG.resumeDelayMs)
    .create();
}
```

Test that `scheduleGeminiBroadGapResume_()` uses `GEMINI_BROAD_GAP_CONFIG.resumeDelayMs` by stubbing `ScriptApp.newTrigger().timeBased().after(ms).create()` and capturing `ms`.

- [x] **Step 2: Run tests to verify failure**

Run the Node shim from Task 1 Step 2, adding `LockService` to the shim if tests reference it:

```javascript
const LockService = { getScriptLock(){ return { tryLock(){ return true; }, releaseLock(){} }; } };
global.LockService = LockService;
```

Expected: FAIL because helper functions do not exist yet.

- [x] **Step 3: Implement lock guard and schedule helper**

In `main.gs`, rename existing `runGeminiBroadGapAudit()` body to an internal function:

```javascript
function runGeminiBroadGapAudit() {
  return runGeminiBroadGapAuditWithLock_();
}

function resumeGeminiBroadGapAudit() {
  Logger.log("Resuming Gemini Broad Gap Audit from trigger execution...");
  return runGeminiBroadGapAuditWithLock_();
}

function runGeminiBroadGapAuditWithLock_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Gemini BroadGap audit is already running. Scheduling another resume.');
    scheduleGeminiBroadGapResume_();
    return;
  }

  try {
    return runGeminiBroadGapAuditInternal_();
  } finally {
    lock.releaseLock();
  }
}

function runGeminiBroadGapAuditInternal_() {
  // Existing runGeminiBroadGapAudit body goes here.
}
```

Add helper:

```javascript
function scheduleGeminiBroadGapResume_() {
  deleteGapAuditTriggers();
  ScriptApp.newTrigger('resumeGeminiBroadGapAudit')
    .timeBased()
    .after(GEMINI_BROAD_GAP_CONFIG.resumeDelayMs)
    .create();
}
```

Replace repeated trigger creation blocks with `scheduleGeminiBroadGapResume_();`.

Ensure there is only one `resumeGeminiBroadGapAudit()` definition after refactor.

- [x] **Step 4: Run tests to verify pass**

Run the Node shim from Task 1 Step 2, with `LockService` included.

Expected: `All tracker tests passed`.

- [x] **Step 5: Manual code checks**

Run:

```bash
git diff --check
git diff -- main.gs spreadsheetUtils.gs testFixtures.gs
```

Expected: no whitespace errors; diff shows config, lock guard, schedule helper, formatting default, and tests only.

- [x] **Step 6: Commit task**

Status: completed without commit per controller instruction.

Do not commit unless explicitly permitted by the controller. If permitted:

```bash
git add main.gs spreadsheetUtils.gs testFixtures.gs
git commit -m "fix: guard BroadGap resume with script lock"
```

## Task 3: Final Verification and Deployment Prep

**Files:**
- Verify: all changed files

- [x] **Step 1: Run full local tracker test shim**

Run the Node shim from Task 1 Step 2 with `LockService` included.

Expected: `All tracker tests passed`.

- [x] **Step 2: Check worktree status and diff**

Run:

```bash
git status --short --branch
git diff --check
git diff --stat HEAD
```

Expected: clean if commits were made; otherwise only intentional files modified and no whitespace errors.

- [x] **Step 3: Confirm deployment command but do not push unless controller requests**

Status: final review fixes completed. Classification now writes each successful Gemini batch to `BroadGapLLM` before advancing `gap_classification_next_index`; resume restarts from index 0 when output is missing or empty; `clearBroadSearchDB()` clears classification progress; local tests and `git diff --check` pass. No commit or push performed.

Deployment command, when approved:

```bash
clasp push
```

Expected: Apps Script receives committed source matching Git branch contents.

## Self-Review

- Spec coverage: The plan covers timing constants, safer resume delay, classification safety, script lock, formatting fixes, tests, and deployment prep.
- Placeholder scan: No `TBD` or vague implementation-only steps remain.
- Type consistency: Config object, helper names, and trigger handler names match existing Apps Script naming.
