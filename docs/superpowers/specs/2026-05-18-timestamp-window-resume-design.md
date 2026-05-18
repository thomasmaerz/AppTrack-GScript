# Timestamp Window Resume Design

## Goal

Replace offset-based Gmail resume state with timestamp windows so active inboxes cannot shift search results underneath the scanner between runs.

## Architecture

`scanUtils.gs` owns all scan-window state and query construction. Normal scans use an overlap window from the last successful scan timestamp through the current run start time; historical imports use fixed-duration slices. `main.gs` requests the active window, searches only inside it, and either retries the same window after interruption or advances window state after successful completion.

## Components

- **Window state:** stores recent and historical window bounds in `PropertiesService`.
- **Query builder:** adds explicit `after:` and `before:` filters to every mode.
- **Window advancement:** recent scans move `lastSuccessfulScanAt` forward only when a whole window completes; historical scans advance to the next older slice.
- **Dedupe:** existing thread-ID and normalized `jobTitle|company` checks absorb intentional overlap.

## Data flow

1. Scan starts and captures a run timestamp.
2. `scanUtils.gs` returns a window:
   - recent: `lastSuccessfulScanAt - overlap` through `runStart`
   - historical: current historical slice
3. Gmail query is built with `after:` and `before:` filters.
4. Scanner processes up to one batch from that stable time window.
5. If interrupted, the same window is retried next run.
6. If completed, state advances and future runs move to a new window.

## Error handling

- Interrupted windows are never advanced.
- Missing recent history falls back to a seven-day first window.
- Historical state can be cleared explicitly.
- Overlap intentionally causes some reprocessing; dedupe prevents duplicate rows.

## Testing

Add regression assertions for:

- recent window creation with overlap
- historical window creation
- query construction with bounded dates
- interrupted windows remaining unchanged
- completed windows advancing correctly

## Documentation

Update rollout docs to explain timestamp windows, overlap, and why a small amount of reprocessing is expected.
