# Account Testing Plan for a Large Inbox

Use this rollout when your initial Gmail query returns roughly 500 matching threads.

1. **Copy all updated `.gs` files** into Apps Script, including `scanUtils.gs` and `testFixtures.gs`.
2. **Run `runTrackerTests()` first.** Do not scan mail until it returns `All tracker tests passed`.
3. **Preview the search query.** Run `buildGmailSearchQuery('historical')`, paste the returned query into Gmail, and spot-check that real confirmations remain while LinkedIn digests and bulk noise are reduced.
4. **Lower the first batch temporarily.** Set `SCAN_CONFIG.batchSize` to `10` for a controlled first run.
5. **Run `importHistoricalEmails()` once.** Confirm the execution log contains one compact `Scan summary` line, no raw email bodies, and `moreWork=true` if more matches remain in the current timestamp window.
6. **Inspect the sheet.** Confirm added rows have sensible title/company values, clickable date links, hidden thread IDs, and no obvious duplicates.
7. **Run `importHistoricalEmails()` again.** Confirm it resumes, adds the next slice, and does not duplicate the first batch.
8. **Repeat until `moreWork=false`.** At 10 emails per run, ~500 matches may need about 50 short runs; after two or three clean batches, increase to `25`, then the default `50`.
9. **Run a normal scan.** Execute `scanEmails()` and verify it uses the recent window rather than reprocessing the historical mailbox.
10. **Refresh presentation manually.** Use **Job Tracker → Refresh Visualizations** only after ingestion is complete, and confirm charts still render.

## What success looks like

- Every scan finishes well before Apps Script timeout.
- Logs show counts only: found, processed, added, updated, skipped, parse failures, and whether more work remains.
- Obvious digests are skipped; genuine confirmations, interviews, and rejections remain.
- A second run safely reuses or advances the timestamp window without creating duplicate rows.
- Daily triggers call only `scanEmails()` and do not rebuild the dashboard.

## If the inbox is still overwhelming

- Keep batch size low until the historical backlog is exhausted.
- Tighten the query phrases in `scanUtils.gs` rather than adding broad words such as `application` or `position`.
- Add new noise examples to `shouldSkipMessage()` and `TestFixtures` together, then rerun `runTrackerTests()`.
