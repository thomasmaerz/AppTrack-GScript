# Timestamp Window Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Gmail offset pagination with bounded timestamp windows that remain stable while the inbox changes.

**Architecture:** Keep scan orchestration in `main.gs`, but move all window-state calculations into `scanUtils.gs`. Recent scans use a one-day overlap around the last successful timestamp; historical imports use fixed thirty-day windows. Existing dedupe absorbs intentional overlap.

**Tech Stack:** Google Apps Script, JavaScript, GmailApp, PropertiesService, existing callable Apps Script test harness.

---

### Task 1: Add failing window-state tests

**Files:**
- Modify: `testFixtures.gs`

- [ ] Add assertions for recent-window overlap, historical-window construction, bounded date filters, interrupted-window retry, and completed-window advancement.
- [ ] Run `runTrackerTests()` in Apps Script and confirm the new assertions fail because the window helpers do not yet exist.

### Task 2: Implement timestamp-window helpers

**Files:**
- Modify: `scanUtils.gs`

- [ ] Replace offset keys with recent/historical window keys.
- [ ] Add helpers for recent overlap windows, historical slices, query date formatting, retry behavior, and completion behavior.
- [ ] Update query construction to always include explicit `after:` and `before:` clauses.
- [ ] Re-run `runTrackerTests()` and confirm the window tests pass.

### Task 3: Use windows in scan orchestration

**Files:**
- Modify: `main.gs`

- [ ] Replace `getScanOffset()` usage with `getScanWindow()`.
- [ ] Search Gmail from index zero within the bounded window.
- [ ] Retry unchanged window state after interruption.
- [ ] Advance recent/historical window state only after successful completion.
- [ ] Run `runTrackerTests()` and perform syntax verification.

### Task 4: Refresh documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/account-testing-plan.md`

- [ ] Replace offset wording with timestamp-window wording.
- [ ] Explain one-day overlap and expected safe reprocessing.
- [ ] Keep large-inbox rollout steps concise and accurate.

### Task 5: Verify, merge, and publish privately

**Files:**
- Review all touched files

- [ ] Run syntax verification for all `.gs` files.
- [ ] Review diff for requirements coverage.
- [ ] Merge `reliability-improvements` into `main`.
- [ ] Commit the completed change set.
- [ ] Create a private GitHub repository with `gh repo create --private` and push `main`.
