# Job Tracker Reliability Design

## Goal

Improve the Gmail-based Job Application Tracker so scans finish reliably within Google Apps Script limits, expose less sensitive data in logs, process fewer irrelevant messages, and remain maintainable as real-world email formats vary.

The design keeps the existing Apps Script project and spreadsheet workflow, while separating fast ingestion from expensive presentation work.

## Current State

The current implementation already tracks applications, status updates, and dashboards, but `scanEmails()` does too much in one run:

- searches as many as 300 threads at once
- updates rows cell-by-cell and appends rows one at a time
- logs raw email bodies and regex captures during parsing
- rebuilds dashboards at the end of every scan
- uses a broad Gmail query that still admits digest and noise mail
- has no automated parser fixture harness

These traits make an inbox with hundreds of matching emails vulnerable to timeout, noisy sheet contents, and privacy leakage through Apps Script logs.

## Chosen Approach

Use a bounded two-mode scanner with a dedicated `scanUtils.gs` helper module.

### Why this approach

- It directly protects normal daily runs from the historical backlog.
- It gives large first-time imports an explicit, resumable workflow.
- It improves modularity without requiring a broad rewrite of the existing project.
- It preserves current duplicate-detection behavior while making progress state explicit.

### Alternatives considered

1. **Minimal patch to the existing single scanner**: smaller change, but weaker large-import behavior and leaves `main.gs` overloaded.
2. **Full pipeline refactor**: cleanest long-term architecture, but unnecessarily risky for the current project scope.

## Architecture

### Entry points

- `scanEmails()` handles routine recent ingestion only.
- `importHistoricalEmails()` handles explicit bounded backfill batches.
- `refreshVisualizations()` remains the manual dashboard/formatting path.
- Daily triggers call only `scanEmails()`.

### Module boundaries

- `main.gs`: orchestrates scans, duplicate matching, writes, and user-facing menu actions.
- `scanUtils.gs`: scan configuration, query building, progress state, runtime guard, skip rules, and metrics helpers.
- `extractionUtils.gs`: company/title extraction and validation.
- `statusUtils.gs`: application-status classification.
- `spreadsheetUtils.gs`: formatting and dashboard work that should stay off the scan hot path.
- `testFixtures.gs`: callable fixtures and lightweight test harness for parser and skip-rule behavior.

## Scan Modes and Data Flow

### Normal recent scan

1. Determine the recent lower bound from `lastSuccessfulScanAt`.
2. If no successful scan exists, fall back to a conservative recent window such as `newer_than:7d`.
3. Build a globally grouped Gmail query so exclusions apply across all inclusion terms.
4. Fetch at most the configured batch size.
5. Skip obvious noise before extraction.
6. Parse relevant threads, collect new rows and row updates, then write them in batches.
7. Record a compact metrics summary and update `lastSuccessfulScanAt` only after successful completion.

### Historical import

1. User selects **Import Historical Emails** from the menu.
2. The same selective query runs without the strict recent filter.
3. The scanner processes a fixed-size batch, defaulting to about 50 threads.
4. A stored date-based cursor advances only after completed work.
5. Before each thread, the scanner checks the runtime guard and stops cleanly when nearing the execution limit.
6. Boundary dates may be revisited; duplicate protection makes this safe.
7. The completion message indicates whether more historical work remains.

### Duplicate protection

Duplicate detection remains layered:

1. exact Gmail thread ID
2. normalized `jobTitle|company`

This preserves current behavior while making date-cursor boundary reprocessing harmless.

## Querying and Filtering

The Gmail query will use grouped inclusion clauses plus global exclusions for common noise, including:

- LinkedIn digest/update mail
- promotions and social categories
- password-reset messages
- irrelevant bulk notifications already observed in logs

Additional skip helpers will run before expensive parsing:

- `shouldSkipThread(...)`
- `shouldSkipMessage(...)`

They will reject obvious digest-style traffic while retaining valid LinkedIn application confirmations and interview-related messages tied to useful application activity.

## Runtime, State, and Metrics

`scanUtils.gs` will define bounded defaults and state helpers, including:

- batch size, initially about 50
- stop threshold, initially around five minutes
- default recent-scan window
- `getScanStartTime()`
- `isNearExecutionLimit(startTime)`
- `getBatchSize()`
- `getLastSuccessfulScanAt()`
- `setLastSuccessfulScanAt(date)`
- `clearHistoricalScanState()`

Normal logs will report safe aggregate counters only:

- threads found
- processed
- added
- updated
- skipped
- parse failures
- whether more work remains

`DEBUG_PARSING` will default to `false`. When intentionally enabled, logs may include only safe compact fields such as subject, sender domain, parser decision, and skip reason. Full bodies, raw URLs, unrelated captures, and failed-regex traces will not be logged.

## Parsing and Status Classification

### Extraction improvements

Targeted parser additions will cover known email shapes:

- LinkedIn confirmations containing `Your application was sent to <Company>`, using the next meaningful line as title
- SuccessFactors/Rogers-style text containing `application for position of <Job Title>`

Validation will improve by:

- stopping greedy matches at punctuation, role/position markers, and sentence boundaries
- rejecting URLs, `https`, generic values such as `application`, `is match`, and long prose sentences
- accepting legitimate abbreviated titles such as `Snr Eng Netwk Arch Standards`

### Status fixes

`statusUtils.gs` changes stay targeted:

- remove the malformed double comma in rejection indicators
- fix the broken positive-indicator boolean expression
- make intended priority explicit: `offer > interview > assessment > rejection > applied/status update`

Existing behavior should remain unchanged except where the current code is clearly defective.

## Spreadsheet Writes and Presentation

The scan path will minimize Apps Script I/O:

- collect new rows in memory and write them with one `setValues()` operation
- collect row updates before writing where practical
- avoid repeated `appendRow()` and repeated inner-loop `setValue()` calls
- preserve hidden thread IDs
- keep date hyperlinks compatible with the current columns

Dashboard regeneration and broad formatting will no longer be part of the critical scan path. Users can still refresh visualizations manually from the existing menu option.

The existing `Raw Body` column remains compatible with current behavior and will continue to store the existing 100-character excerpt for new rows, per user preference.

## Testing Strategy

Because the project has no current automated harness, start with lightweight Apps Script-callable fixtures.

### Fixtures

- LinkedIn application confirmation
- LinkedIn digest
- Instacart confirmation
- Rogers confirmation
- interview notification
- rejection email
- noisy TEKsystems message
- malformed low-confidence example

### Assertions

- extracted company
- extracted title
- derived status
- include/skip decision

### Behavioral verification

- configured batch size is enforced
- progress state persists between runs
- duplicate prevention remains correct
- a second historical run resumes without duplicate rows
- manual dashboard refresh still renders charts

Run the test harness after parser-related changes and use controlled low-batch scans before raising production batch size.

## Documentation Update

Refresh `README.md` to be concise, polished, and easier to scan. It should:

- credit Adam Rangwala for the original project and original work
- explain the new recent-scan versus historical-import workflow
- summarize why reliability, privacy, and filtering changes were needed
- note the key challenges: Apps Script execution limits, broad Gmail matches, varying employer email formats, and safe resume behavior
- include a practical account-testing plan for inboxes with roughly 500 initial matching emails

## Risks and Mitigations

- **Date cursor boundaries can revisit threads.** Mitigate with deterministic ordering and duplicate protection.
- **Over-aggressive filters could hide valid messages.** Mitigate with fixtures and explicit LinkedIn/interview retention cases.
- **Batch writes can complicate hyperlinks.** Keep hyperlink formatting behavior covered by manual verification.
- **Parser tightening can reject uncommon real titles.** Include abbreviation fixtures and keep validation targeted rather than overly strict.

## Success Criteria

- Routine scans complete under Apps Script runtime limits.
- Historical imports make bounded progress across repeated runs without duplicate rows.
- Normal logs contain compact safe counts rather than sensitive message content.
- Obvious digest/noise mail is skipped while real application mail remains included.
- Targeted LinkedIn and Rogers-style examples parse correctly.
- Dashboard refresh remains available but no longer jeopardizes ingestion.
- Documentation explains the improved workflow and how to test it safely on a large inbox.
