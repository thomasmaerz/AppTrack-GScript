# Mailbox Import and Dedupe Redesign Spec

## Goal

Resolve mailbox backfill/import limitations, prevent the merging of distinct job applications (especially when fallback to "Unlisted Position" occurs), clean up hardcoded target spreadsheet IDs in favor of the active bound sheet, and implement a robust diagnostic audit tool to eliminate false negatives.

## Architecture & Structural Changes

### 1. Dynamic Spreadsheet Binding

We will modify `getOrCreateSpreadsheet` in `main.gs` to always prefer the bound active spreadsheet when no spreadsheet ID is provided or when the fallback occurs, instead of hardcoding a target spreadsheet ID that may mismatch the active sheet.

### 2. Thread-ID Only Deduplication

We will completely remove the map-based `jobTitle|company` duplicate lookup check.
- Duplicate detection will run **strictly** on the unique `ThreadId` column.
- If a thread has already been processed (exists in `existingThreadIds`), the tracker will check if its status has changed (e.g., if a new message in the thread is a rejection or interview request) and update the `Date Updated` and `Status` columns.
- If a thread does not exist, it will **always** be appended as a new row. This ensures that multiple distinct applications to the same company/job title (or fallback "Unlisted" rows) represent separate rows.

### 3. State Reset & Menu Additions

To support clean backfills from the beginning of the mailbox, we will add the following menu options to the "Job Tracker" menu:
- **`Reset Historical Scan State`**: Deletes script properties `historicalWindowEnd` and `historicalSearchStart` so a historical backfill starts cleanly from today.
- **`Reset All State`**: Deletes all script properties (recent scan dates and historical scan cursors).

### 4. Query Overhaul: No Promotions/Social Exclusions

In `scanUtils.gs`, we will remove `-category:promotions` and `-label:social` from the default query exclusions. Because Gmail categorizes many legitimate confirmation receipts as promotions, retaining this exclusion was causing false negatives.

### 5. Uncapped Paging Diagnostic Audit Tool

We will implement paging inside `runDiagnosticMailboxAudit()` using a paging loop in blocks of 500 threads until the Gmail API returns 0 results. This allows counting the true, uncapped size of the mailbox.

### 6. Opt-In Noise Filtering

We will transition the noise filter to an **opt-in / allowlist model**:
- An email is only kept if it contains a **high-confidence job application signal** (representing a confirmation, interview invitation, assessment, offer, or rejection) OR is sent from a **known ATS domain** (Lever, Greenhouse, Workday, etc.).
- If it is just a generic email matching the broad search (like a newsletter talking about Claude Code or Grab's AI agents), and contains no confirmation/interview/rejection keywords, it will be **skipped by default**.

## Success Criteria

1. Historical backlog backfill runs backwards from today without getting stuck or missing recent dates.
2. Separate application threads do not merge into a single row.
3. Diagnostic audit counts matching emails accurately, pages through the entire mailbox, and filters out newsletters/alerts.
