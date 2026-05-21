const RAW_GAP_CONFIG = {
  rawDumpSheetName: 'rawdumpDB',
  baselineSheetName: 'BroadGapLLM',
  extractionPageSize: 250,
  classificationBatchSize: 75,
  maxRuntimeMs: 5.5 * 60 * 1000,
  stopBufferMs: 30 * 1000,
  resumeDelayMs: 60 * 1000,
  windowDays: 30
};

const RAW_GAP_STAGE = {
  init: 'INIT',
  extract: 'EXTRACT',
  classify: 'CLASSIFY',
  markMissed: 'MARK_MISSED',
  done: 'DONE'
};

const RAW_GAP_KEYS = {
  stage: 'raw_gap_stage',
  windowStart: 'raw_gap_window_start',
  windowEndExclusive: 'raw_gap_window_end_exclusive',
  extractionStart: 'raw_gap_extraction_start',
  classificationNextRow: 'raw_gap_classification_next_row',
  missedNextRow: 'raw_gap_missed_next_row',
  running: 'raw_gap_running'
};

function getRawGapHeaders_() {
  return [
    'Thread ID', 'Message ID', 'Date', 'From', 'To', 'Subject', 'Snippet',
    'is job?', 'raw class', 'raw reasoning', 'raw confidence',
    'was missed?', 'missed reason', 'audit window'
  ];
}

function rawGapHeadersMatch_(headers) {
  const expected = getRawGapHeaders_();
  if (!headers || headers.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (String(headers[i] || '').trim() !== expected[i]) return false;
  }
  return true;
}

function buildRawDumpArchiveName_(date, existingNames) {
  const stamp = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const base = RAW_GAP_CONFIG.rawDumpSheetName + '.' + stamp;
  let candidate = base;
  let suffix = 2;
  while (existingNames && existingNames[candidate]) {
    candidate = base + '.' + suffix;
    suffix++;
  }
  return candidate;
}

function normalizeRawGapDay_(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addRawGapDays_(date, days) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + (days * DAY_MS));
}

function findRawGapDensestWindowFromRows_(rows) {
  const dates = (rows || [])
    .map(row => row.date instanceof Date ? normalizeRawGapDay_(row.date) : null)
    .filter(date => date && !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) throw new Error('No qualifying verified job rows exist for density calculation.');

  let bestStart = dates[0];
  let bestEndExclusive = addRawGapDays_(bestStart, RAW_GAP_CONFIG.windowDays);
  let bestCount = 0;
  let right = 0;

  for (let left = 0; left < dates.length; left++) {
    const start = dates[left];
    const endExclusive = addRawGapDays_(start, RAW_GAP_CONFIG.windowDays);
    while (right < dates.length && dates[right].getTime() < endExclusive.getTime()) right++;
    const count = right - left;
    if (count > bestCount) {
      bestStart = start;
      bestEndExclusive = endExclusive;
      bestCount = count;
    }
  }

  return { start: bestStart, endExclusive: bestEndExclusive, count: bestCount };
}

function isRawGapMessageInWindow_(date, window) {
  const value = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return !isNaN(value) && value >= window.start.getTime() && value < window.endExclusive.getTime();
}

function buildRawGapMissedDecision_(isJob, threadId, baselineThreadSet) {
  if (String(isJob || '').toUpperCase() !== 'Y') return { wasMissed: 'N', reason: 'not_job' };
  if (threadId && baselineThreadSet && baselineThreadSet[String(threadId)]) {
    return { wasMissed: 'N', reason: 'thread_found_in_BroadGapLLM' };
  }
  return { wasMissed: 'Y', reason: 'job_thread_not_in_BroadGapLLM' };
}

function getRawGapProperties_() { return PropertiesService.getScriptProperties(); }

function getRawGapHeaderIndex_(headers, name) {
  const target = String(name || '').toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i] || '').trim().toLowerCase() === target) return i;
  }
  return -1;
}

function parseRawGapBaselineRows_(values) {
  if (!values || values.length < 1) throw new Error('BroadGapLLM is empty.');
  const headers = values[0];
  const threadIdx = getRawGapHeaderIndex_(headers, 'Thread ID');
  const dateIdx = getRawGapHeaderIndex_(headers, 'Date');
  const classIdx = getRawGapHeaderIndex_(headers, 'Gemini Class');
  if (threadIdx === -1) throw new Error('BroadGapLLM missing required Thread ID header.');
  if (dateIdx === -1) throw new Error('BroadGapLLM missing required Date header.');
  if (classIdx === -1) throw new Error('BroadGapLLM missing required Gemini Class header.');

  const threadSet = {};
  const verifiedRows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const threadId = String(row[threadIdx] || '').trim();
    const geminiClass = String(row[classIdx] || '').trim();
    const date = coerceDateValue_(row[dateIdx]);
    if (threadId) threadSet[threadId] = true;
    if (threadId && date && geminiClass && geminiClass.toLowerCase() !== 'noise') {
      verifiedRows.push({ threadId: threadId, date: date, geminiClass: geminiClass });
    }
  }
  return { threadSet: threadSet, verifiedRows: verifiedRows };
}

function getRawGapExistingSheetNames_(spreadsheet) {
  const names = {};
  spreadsheet.getSheets().forEach(sheet => { names[sheet.getName()] = true; });
  return names;
}

function prepareRawDumpSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(RAW_GAP_CONFIG.rawDumpSheetName);
  const headers = getRawGapHeaders_();
  if (!sheet) {
    sheet = spreadsheet.insertSheet(RAW_GAP_CONFIG.rawDumpSheetName);
  } else {
    const existingHeaders = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0] : [];
    if (!rawGapHeadersMatch_(existingHeaders)) {
      const archiveName = buildRawDumpArchiveName_(new Date(), getRawGapExistingSheetNames_(spreadsheet));
      sheet.setName(archiveName);
      sheet = spreadsheet.insertSheet(RAW_GAP_CONFIG.rawDumpSheetName);
      Logger.log('Renamed schema-mismatched rawdumpDB to ' + archiveName + '.');
    } else {
      sheet.clear();
    }
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function loadRawGapBaseline_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(RAW_GAP_CONFIG.baselineSheetName);
  if (!sheet) throw new Error('BroadGapLLM is missing.');
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) throw new Error('BroadGapLLM has no usable baseline data.');
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const parsed = parseRawGapBaselineRows_(values);
  if (Object.keys(parsed.threadSet).length === 0) throw new Error('BroadGapLLM has zero non-empty thread IDs.');
  if (parsed.verifiedRows.length === 0) throw new Error('No qualifying verified job rows exist for density calculation.');
  return parsed;
}

function findRawGapDensestWindow_(spreadsheet) {
  const baseline = loadRawGapBaseline_(spreadsheet);
  const window = findRawGapDensestWindowFromRows_(baseline.verifiedRows);
  return {
    start: window.start,
    endExclusive: window.endExclusive,
    count: window.count,
    baselineThreadSet: baseline.threadSet
  };
}

function preflightRawGapAudit_(spreadsheet) {
  const window = findRawGapDensestWindow_(spreadsheet);
  return { window: window, sheet: prepareRawDumpSheet_(spreadsheet) };
}

function isRawGapNearExecutionLimit_(startTime) {
  return Date.now() - startTime >= RAW_GAP_CONFIG.maxRuntimeMs - RAW_GAP_CONFIG.stopBufferMs;
}

function clearRawGapProgress_() {
  const properties = getRawGapProperties_();
  Object.keys(RAW_GAP_KEYS).forEach(key => properties.deleteProperty(RAW_GAP_KEYS[key]));
}

function deleteRawGapTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'resumeRawGapAudit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function scheduleRawGapResume_() {
  deleteRawGapTriggers_();
  ScriptApp.newTrigger('resumeRawGapAudit').timeBased().after(RAW_GAP_CONFIG.resumeDelayMs).create();
}

function setRawGapWindowProperties_(window) {
  const properties = getRawGapProperties_();
  properties.setProperty(RAW_GAP_KEYS.windowStart, window.start.toISOString());
  properties.setProperty(RAW_GAP_KEYS.windowEndExclusive, window.endExclusive.toISOString());
}

function getRawGapWindowFromProperties_() {
  const properties = getRawGapProperties_();
  const start = properties.getProperty(RAW_GAP_KEYS.windowStart);
  const endExclusive = properties.getProperty(RAW_GAP_KEYS.windowEndExclusive);
  if (!start || !endExclusive) throw new Error('RawGapAudit window properties are missing. Start a fresh run with runRawGapAudit().');
  return { start: new Date(start), endExclusive: new Date(endExclusive) };
}

function getRawGapSheetOrThrow_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(RAW_GAP_CONFIG.rawDumpSheetName);
  if (!sheet) throw new Error('rawdumpDB is missing. Start a fresh run with runRawGapAudit().');
  return sheet;
}

function runRawGapAudit() {
  const properties = getRawGapProperties_();
  if (properties.getProperty(RAW_GAP_KEYS.running) === 'true') {
    throw new Error('RawGapAudit is already running. Wait for the current run to finish or resume.');
  }

  const startTime = Date.now();
  const spreadsheet = getOrCreateSpreadsheet();
  clearRawGapProgress_();
  deleteRawGapTriggers_();
  properties.setProperty(RAW_GAP_KEYS.running, 'true');

  const preflight = preflightRawGapAudit_(spreadsheet);
  setRawGapWindowProperties_(preflight.window);
  properties.setProperty(RAW_GAP_KEYS.stage, RAW_GAP_STAGE.extract);
  properties.setProperty(RAW_GAP_KEYS.extractionStart, '0');
  properties.setProperty(RAW_GAP_KEYS.classificationNextRow, '2');
  properties.setProperty(RAW_GAP_KEYS.missedNextRow, '2');

  Logger.log('RawGapAudit selected window ' + preflight.window.start.toISOString() + ' to ' + preflight.window.endExclusive.toISOString() + ' with ' + preflight.window.count + ' verified baseline rows.');
  runRawGapAuditStage_(spreadsheet, startTime);
}

function resumeRawGapAudit() {
  const startTime = Date.now();
  const spreadsheet = getOrCreateSpreadsheet();
  runRawGapAuditStage_(spreadsheet, startTime);
}

function runRawGapAuditStage_(spreadsheet, startTime) {
  const properties = getRawGapProperties_();
  let stage = properties.getProperty(RAW_GAP_KEYS.stage);
  if (!stage) throw new Error('RawGapAudit has no saved stage. Start a fresh run with runRawGapAudit().');

  while (stage && stage !== RAW_GAP_STAGE.done) {
    if (isRawGapNearExecutionLimit_(startTime)) {
      scheduleRawGapResume_();
      return;
    }
    if (stage === RAW_GAP_STAGE.extract) {
      const completed = extractRawGapMessages_(spreadsheet, startTime);
      if (!completed) return;
      properties.setProperty(RAW_GAP_KEYS.stage, RAW_GAP_STAGE.classify);
      stage = RAW_GAP_STAGE.classify;
      continue;
    }
    if (stage === RAW_GAP_STAGE.classify) {
      const completed = classifyRawGapRows_(spreadsheet, startTime);
      if (!completed) return;
      properties.setProperty(RAW_GAP_KEYS.stage, RAW_GAP_STAGE.markMissed);
      stage = RAW_GAP_STAGE.markMissed;
      continue;
    }
    if (stage === RAW_GAP_STAGE.markMissed) {
      const completed = markRawGapMisses_(spreadsheet, startTime);
      if (!completed) return;
      properties.setProperty(RAW_GAP_KEYS.stage, RAW_GAP_STAGE.done);
      stage = RAW_GAP_STAGE.done;
      continue;
    }
    throw new Error('Unknown RawGapAudit stage: ' + stage);
  }

  deleteRawGapTriggers_();
  clearRawGapProgress_();
}

function buildRawGapGmailQuery_(window) {
  return 'in:anywhere after:' + formatScanDate_(window.start) + ' before:' + formatScanDate_(window.endExclusive);
}

function getRawGapExistingMessageIds_(sheet) {
  const ids = {};
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return ids;
  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  values.forEach(row => {
    const id = String(row[0] || '').trim();
    if (id) ids[id] = true;
  });
  return ids;
}

function buildRawGapAuditWindowLabel_(window) {
  return formatScanDate_(window.start) + ' to ' + formatScanDate_(addRawGapDays_(window.endExclusive, -1));
}

function extractRawGapMessages_(spreadsheet, startTime) {
  const properties = getRawGapProperties_();
  const sheet = getRawGapSheetOrThrow_(spreadsheet);
  const window = getRawGapWindowFromProperties_();
  const query = buildRawGapGmailQuery_(window);
  let extractionStart = Number(properties.getProperty(RAW_GAP_KEYS.extractionStart) || '0');
  const existingMessageIds = getRawGapExistingMessageIds_(sheet);
  const auditWindow = buildRawGapAuditWindowLabel_(window);

  Logger.log('RawGapAudit extraction START. Query: ' + query);
  let totalRowsWritten = 0;
  let totalPages = 0;

  while (true) {
    if (isRawGapNearExecutionLimit_(startTime)) {
      Logger.log('RawGapAudit extraction PAUSED at page ' + totalPages + ', offset ' + extractionStart + ', rows written ' + totalRowsWritten + '.');
      properties.setProperty(RAW_GAP_KEYS.extractionStart, String(extractionStart));
      scheduleRawGapResume_();
      return false;
    }

    Logger.log('RawGapAudit extraction page ' + (totalPages + 1) + ' at offset ' + extractionStart + '...');
    const threads = GmailApp.search(query, extractionStart, RAW_GAP_CONFIG.extractionPageSize);
    if (!threads || threads.length === 0) {
      Logger.log('RawGapAudit extraction COMPLETE. Total pages: ' + totalPages + ', total rows written: ' + totalRowsWritten + '.');
      return true;
    }

    const messages2D = GmailApp.getMessagesForThreads(threads);
    const rows = [];
    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const messages = messages2D[i] || [];
      for (let j = 0; j < messages.length; j++) {
        const msg = messages[j];
        const msgDate = msg.getDate();
        if (!isRawGapMessageInWindow_(msgDate, window)) continue;
        const messageId = msg.getId();
        if (existingMessageIds[messageId]) continue;

        const subject = msg.getSubject() || '';
        const from = msg.getFrom() || '';
        const body = msg.getPlainBody() || '';
        const snippet = buildAuditSnippet(subject, from, body);
        rows.push([
          thread.getId(), messageId, msgDate.toISOString(), from, msg.getTo() || '', subject, snippet,
          '', '', '', '', '', '', auditWindow
        ]);
        existingMessageIds[messageId] = true;
      }
    }

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      totalRowsWritten += rows.length;
      Logger.log('RawGapAudit page ' + (totalPages + 1) + ': ' + threads.length + ' threads, ' + rows.length + ' in-window message rows written.');
    } else {
      Logger.log('RawGapAudit page ' + (totalPages + 1) + ': ' + threads.length + ' threads, 0 new in-window rows.');
    }

    totalPages++;
    extractionStart += threads.length;
    properties.setProperty(RAW_GAP_KEYS.extractionStart, String(extractionStart));
    if (threads.length < RAW_GAP_CONFIG.extractionPageSize) {
      Logger.log('RawGapAudit extraction COMPLETE. Total pages: ' + totalPages + ', total rows written: ' + totalRowsWritten + '.');
      return true;
    }
  }
}

function normalizeRawGapConfidence_(confidence) {
  if (typeof confidence === 'number' && !isNaN(confidence)) return Math.max(0, Math.min(1, confidence));
  const value = String(confidence || '').trim().toUpperCase();
  if (value === 'HIGH') return 1;
  if (value === 'MEDIUM') return 0.66;
  if (value === 'LOW') return 0.33;
  const parsed = Number(value);
  if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
  return '';
}

function normalizeRawGapClassificationResult_(result) {
  return {
    idx: String(result.idx || ''),
    isJob: result.isJob === true || result.rel === true ? 'Y' : 'N',
    category: String(result.cat || 'NOISE'),
    reason: String(result.reason || result.rea || ''),
    confidence: normalizeRawGapConfidence_(result.conf)
  };
}

function callRawGapGemini_(payload) {
  let responseText;
  let success = false;
  let lastErrorDetails = '';
  const urlBase = 'https://generativelanguage.googleapis.com/v1beta/' + GEMINI_CONFIG.model + ':generateContent';

  try {
    const oauthToken = ScriptApp.getOAuthToken();
    const gcpProjectId = PropertiesService.getScriptProperties().getProperty('gcp_project_id') || 'gen-lang-client-0843415856';
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + oauthToken, 'x-goog-user-project': gcpProjectId },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    const fetchResult = GeminiClient.fetchWithRetry(urlBase, options);
    if (fetchResult.success) {
      responseText = fetchResult.text;
      success = true;
    } else {
      lastErrorDetails = 'OAuth attempt returned code ' + fetchResult.code + ': ' + fetchResult.text;
    }
  } catch (e) {
    lastErrorDetails = 'OAuth generative REST call failed. Error: ' + e.toString();
  }

  if (!success) {
    const apiKey = PropertiesService.getScriptProperties().getProperty(GEMINI_CONFIG.apiKeyProperty);
    if (apiKey) {
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      const fetchResult = GeminiClient.fetchWithRetry(urlBase + '?key=' + apiKey, options);
      if (fetchResult.success) {
        responseText = fetchResult.text;
        success = true;
      } else {
        lastErrorDetails = 'API Key attempt returned code ' + fetchResult.code + ': ' + fetchResult.text;
      }
    }
  }

  if (!success) throw new Error('RawGapAudit Gemini call failed. ' + lastErrorDetails);
  return responseText;
}

function classifyRawJobBatch_(messageLogs) {
  if (!messageLogs || messageLogs.length === 0) return [];

  const systemInstruction =
    'You are a strict recruitment email classifier. Classify each individual email message using sender (f), recipients (t), subject (s), and snippet (sn). ' +
    'Return isJob=true only for messages that are meaningfully part of a specific job-search, recruiting, application, interview, assessment, offer, referral, candidate-account, or application-status workflow. ' +
    'User outbound replies are job-related when they are part of an application, recruiter, interview, assessment, offer, referral, or candidate-account flow. ' +
    'Messages suggesting the user apply to jobs are NOISE unless tied to a specific existing application/recruiter/interview process. ' +
    'Job alerts, job-board recommendations, newsletters, feed notifications, generic hiring content, and generic “you may be interested” messages are NOISE. ' +
    'Professional email is not job-related unless it clearly belongs to the job-search/recruiting/application process. ' +
    'Allowed cat values: APPLIED, INTERVIEW_REQUEST, INTERVIEW_SCHEDULED, ASSESSMENT, REJECTED, OFFER, RECRUITER_OUTREACH, RECRUITER_FOLLOW_UP, REFERRAL, APPLICATION_UPDATE, CANDIDATE_ACCOUNT_DRAFT, RESPONSE, NOISE. ' +
    'Return a JSON object with results array of exactly the same size as input and preserve each exact idx.';

  const payload = {
    contents: [{ parts: [{ text: systemInstruction + '\n\nInput JSON:\n' + JSON.stringify(messageLogs) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 16384,
      temperature: 0.0,
      responseSchema: {
        type: 'OBJECT',
        properties: {
          results: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                idx: { type: 'STRING' },
                isJob: { type: 'BOOLEAN' },
                cat: { type: 'STRING', enum: ['APPLIED', 'INTERVIEW_REQUEST', 'INTERVIEW_SCHEDULED', 'ASSESSMENT', 'REJECTED', 'OFFER', 'RECRUITER_OUTREACH', 'RECRUITER_FOLLOW_UP', 'REFERRAL', 'APPLICATION_UPDATE', 'CANDIDATE_ACCOUNT_DRAFT', 'RESPONSE', 'NOISE'] },
                reason: { type: 'STRING' },
                conf: { type: 'STRING', enum: ['HIGH', 'MEDIUM', 'LOW'] }
              },
              required: ['idx', 'isJob', 'cat', 'reason']
            }
          }
        },
        required: ['results']
      }
    }
  };

  const responseText = callRawGapGemini_(payload);
  const jsonRes = JSON.parse(responseText);
  if (!jsonRes.candidates || !jsonRes.candidates[0] || !jsonRes.candidates[0].content || !jsonRes.candidates[0].content.parts[0].text) {
    throw new Error('RawGapAudit Gemini response was empty or malformed: ' + responseText);
  }
  const modelOutput = JSON.parse(jsonRes.candidates[0].content.parts[0].text);
  if (!modelOutput.results || modelOutput.results.length !== messageLogs.length) {
    throw new Error('RawGapAudit Gemini result count mismatch. Expected ' + messageLogs.length + ', got ' + (modelOutput.results || []).length);
  }
  return modelOutput.results.map(normalizeRawGapClassificationResult_);
}

function findNextRawGapClassificationRow_(sheet, startRow) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return lastRow + 1;
  const row = Math.max(2, Number(startRow || 2));
  if (row > lastRow) return lastRow + 1;
  const values = sheet.getRange(row, 8, lastRow - row + 1, 4).getValues();
  for (let i = 0; i < values.length; i++) {
    const current = values[i];
    if (!current[0] || !current[1] || !current[2] || current[3] === '') return row + i;
  }
  return lastRow + 1;
}

function classifyRawGapRows_(spreadsheet, startTime) {
  const properties = getRawGapProperties_();
  const sheet = getRawGapSheetOrThrow_(spreadsheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('RawGapAudit classification SKIPPED: no data rows.');
    return true;
  }

  Logger.log('RawGapAudit classification START. ' + lastRow + ' data rows to classify.');
  let nextRow = findNextRawGapClassificationRow_(sheet, properties.getProperty(RAW_GAP_KEYS.classificationNextRow));
  let totalClassified = 0;
  let batchCount = 0;

  while (nextRow <= lastRow) {
    if (isRawGapNearExecutionLimit_(startTime)) {
      Logger.log('RawGapAudit classification PAUSED at row ' + nextRow + ', classified ' + totalClassified + ' rows in ' + batchCount + ' batches.');
      properties.setProperty(RAW_GAP_KEYS.classificationNextRow, String(nextRow));
      scheduleRawGapResume_();
      return false;
    }

    const batchSize = Math.min(RAW_GAP_CONFIG.classificationBatchSize, lastRow - nextRow + 1);
    const rows = sheet.getRange(nextRow, 1, batchSize, 14).getValues();
    const promptRows = [];
    const rowNumbers = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[7] && row[8] && row[9] && row[10] !== '') continue;
      const rowNumber = nextRow + i;
      rowNumbers.push(rowNumber);
      promptRows.push({ idx: String(rowNumber), f: row[3] || '', t: row[4] || '', s: row[5] || '', sn: row[6] || '' });
    }

    if (promptRows.length === 0) {
      nextRow += batchSize;
      properties.setProperty(RAW_GAP_KEYS.classificationNextRow, String(nextRow));
      continue;
    }

    batchCount++;
    Logger.log('RawGapAudit classification batch ' + batchCount + ': ' + promptRows.length + ' rows (rows ' + rowNumbers[0] + '-' + rowNumbers[rowNumbers.length - 1] + ').');

    let results;
    try {
      results = classifyRawJobBatch_(promptRows);
    } catch (e) {
      Logger.log('RawGapAudit classification FAILED at batch ' + batchCount + ': ' + e.toString());
      properties.setProperty(RAW_GAP_KEYS.classificationNextRow, String(nextRow));
      scheduleRawGapResume_();
      return false;
    }

    const byIdx = {};
    results.forEach(result => { byIdx[result.idx] = result; });
    for (let i = 0; i < rowNumbers.length; i++) {
      const rowNumber = rowNumbers[i];
      const result = byIdx[String(rowNumber)];
      if (!result) throw new Error('RawGapAudit classification missing idx ' + rowNumber + '.');
      sheet.getRange(rowNumber, 8, 1, 4).setValues([[result.isJob, result.category, result.reason, result.confidence]]);
    }

    totalClassified += rowNumbers.length;
    nextRow = findNextRawGapClassificationRow_(sheet, nextRow + batchSize);
    properties.setProperty(RAW_GAP_KEYS.classificationNextRow, String(nextRow));
    if (nextRow <= lastRow) Utilities.sleep(1000);
  }
  Logger.log('RawGapAudit classification COMPLETE. ' + totalClassified + ' rows classified in ' + batchCount + ' batches.');
  return true;
}

function loadRawGapBaselineThreadSet_(spreadsheet) { return loadRawGapBaseline_(spreadsheet).threadSet; }

function findNextRawGapMissedRow_(sheet, startRow) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return lastRow + 1;
  const row = Math.max(2, Number(startRow || 2));
  if (row > lastRow) return lastRow + 1;
  const values = sheet.getRange(row, 12, lastRow - row + 1, 2).getValues();
  for (let i = 0; i < values.length; i++) {
    if (!values[i][0] || !values[i][1]) return row + i;
  }
  return lastRow + 1;
}

function markRawGapMisses_(spreadsheet, startTime) {
  const properties = getRawGapProperties_();
  const sheet = getRawGapSheetOrThrow_(spreadsheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('RawGapAudit missed-marking SKIPPED: no data rows.');
    return true;
  }

  Logger.log('RawGapAudit missed-marking START. ' + lastRow + ' data rows, ' + Object.keys(loadRawGapBaselineThreadSet_(spreadsheet)).length + ' baseline threads.');
  const baselineThreadSet = loadRawGapBaselineThreadSet_(spreadsheet);
  let nextRow = findNextRawGapMissedRow_(sheet, properties.getProperty(RAW_GAP_KEYS.missedNextRow));
  const batchSize = 500;
  let totalMarked = 0;
  let batchCount = 0;

  while (nextRow <= lastRow) {
    if (isRawGapNearExecutionLimit_(startTime)) {
      Logger.log('RawGapAudit missed-marking PAUSED at row ' + nextRow + ', marked ' + totalMarked + ' rows in ' + batchCount + ' batches.');
      properties.setProperty(RAW_GAP_KEYS.missedNextRow, String(nextRow));
      scheduleRawGapResume_();
      return false;
    }

    const count = Math.min(batchSize, lastRow - nextRow + 1);
    const rows = sheet.getRange(nextRow, 1, count, 14).getValues();
    const output = rows.map(row => {
      const decision = buildRawGapMissedDecision_(row[7], row[0], baselineThreadSet);
      return [decision.wasMissed, decision.reason];
    });
    sheet.getRange(nextRow, 12, output.length, 2).setValues(output);

    totalMarked += count;
    batchCount++;
    nextRow += count;
    properties.setProperty(RAW_GAP_KEYS.missedNextRow, String(nextRow));
  }

  Logger.log('RawGapAudit missed-marking COMPLETE. ' + totalMarked + ' rows marked in ' + batchCount + ' batches.');
  formatRawGapAuditSheet_(sheet);
  return true;
}

function formatRawGapAuditSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const headers = getRawGapHeaders_();
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
  if (lastRow > 1) {
    sheet.getRange(2, 8, lastRow - 1, 1).setBackground('#fef3c7');
    sheet.getRange(2, 12, lastRow - 1, 1).setBackground('#fee2e2');
  }
  sheet.autoResizeColumns(1, headers.length);
}

function smokeRawGapPreflightOnly_() {
  const spreadsheet = getOrCreateSpreadsheet();
  const window = findRawGapDensestWindow_(spreadsheet);
  Logger.log(JSON.stringify({
    start: window.start.toISOString(),
    endExclusive: window.endExclusive.toISOString(),
    count: window.count,
    baselineThreadCount: Object.keys(window.baselineThreadSet).length
  }));
}

function smokeRawGapPreflightOnly() {
  return smokeRawGapPreflightOnly_();
}
