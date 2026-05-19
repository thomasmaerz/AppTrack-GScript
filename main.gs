/**
 * Job Application Tracker - Main Script
 * 
 * This Google Apps Script automatically tracks job applications by:
 * 1. Creating a spreadsheet if it doesn't exist
 * 2. Scanning emails for job application confirmations
 * 3. Updating the spreadsheet with new applications
 * 4. Updating application status when follow-up emails are received
 * 5. Generating visualizations for job application data
 */

// Configuration
const SPREADSHEET_NAME = "Application Tracker";
const DEBUG_SPREADSHEET_ID = "1FnCwtwAxCEp9mK-aNtaJnM-iAXbCsGzNIOOK3f7nEr4";
const TARGET_SPREADSHEET_ID = null; // Dynamically binds to active spreadsheet


/**
 * Creates menu items when the spreadsheet is opened
 */
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
    .addItem('Run Diagnostic Mailbox Audit', 'runDiagnosticMailboxAudit')
    .addItem('Run Broad Search Gap Audit', 'runBroadSearchGapAudit')
    .addItem('Run Gemini Broad Gap Audit', 'runGeminiBroadGapAudit')
    .addItem('Run Tracker Tests', 'runTrackerTests')
    .addItem('Set up daily scanning', 'setupTriggers')
    .addItem('Refresh Visualizations', 'refreshVisualizations')
    .addItem('Create Rejection Follow-up Drafts', 'createRejectionFollowupDrafts')
    .addItem('Open Feedback Form', 'openFeedbackForm')
    .addSeparator()
    .addItem('Migrate Spreadsheet (Hide Thread ID)', 'migrateSpreadsheet')
    .addToUi();
}

/**
 * Sets up time-based triggers to run scans automatically
 */
function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create daily trigger for scanning emails (combined function)
  ScriptApp.newTrigger('scanEmails')
    .timeBased()
    .everyDays(1)
    .create();
    
  SpreadsheetApp.getActive().toast('Automatic daily scanning has been set up!');
}

/**
 * Gets or creates the tracking spreadsheet
 */
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

function logTrackerDebugState() {
  return logTrackerDebugStateForSpreadsheet();
}

function logTargetSpreadsheetDebugState() {
  return logTrackerDebugStateForSpreadsheet(DEBUG_SPREADSHEET_ID);
}

function importHistoricalEmailsForTargetSpreadsheet() {
  return importHistoricalEmails(DEBUG_SPREADSHEET_ID);
}

function scanEmailsForTargetSpreadsheet() {
  return scanEmails('recent', DEBUG_SPREADSHEET_ID);
}

function compareGmailQueryCountsForTargetSpreadsheet() {
  return compareGmailQueryCountsForSpreadsheet(DEBUG_SPREADSHEET_ID);
}

function logTrackerDebugStateForSpreadsheet(spreadsheetId) {
  const spreadsheet = getOrCreateSpreadsheet(spreadsheetId);
  const sheet = spreadsheet.getSheetByName("Applications");
  const runStart = new Date();
  const recentWindow = getScanWindow('recent', runStart);
  const historicalWindow = getScanWindow('historical', runStart);
  Logger.log('Tracker spreadsheet: name=' + spreadsheet.getName() + ', url=' + spreadsheet.getUrl());
  Logger.log('Applications sheet: rows=' + (sheet ? sheet.getLastRow() : 'missing') + ', columns=' + (sheet ? sheet.getLastColumn() : 'missing'));
  Logger.log('Recent query: ' + buildGmailSearchQuery('recent', recentWindow));
  Logger.log('Historical query: ' + buildGmailSearchQuery('historical', historicalWindow));
  return { spreadsheetName: spreadsheet.getName(), spreadsheetUrl: spreadsheet.getUrl(), rows: sheet ? sheet.getLastRow() : null, columns: sheet ? sheet.getLastColumn() : null, recentQuery: buildGmailSearchQuery('recent', recentWindow), historicalQuery: buildGmailSearchQuery('historical', historicalWindow) };
}

function compareGmailQueryCountsForSpreadsheet(spreadsheetId) {
  const spreadsheet = getOrCreateSpreadsheet(spreadsheetId);
  const runStart = new Date();
  const historicalWindow = getScanWindow('historical', runStart);
  const strictQuery = buildGmailSearchQuery('historical', historicalWindow);
  const broadQuery = buildBroadGmailSearchQuery(historicalWindow);
  const atsQuery = buildAtsGmailSearchQuery(historicalWindow);
  const dateOnlyQuery = buildDateWindowFilter(historicalWindow);
  const strictCount = countGmailQueryUpToCap(strictQuery, SCAN_CONFIG.queryCountCap);
  const broadCount = countGmailQueryUpToCap(broadQuery, SCAN_CONFIG.queryCountCap);
  const atsCount = countGmailQueryUpToCap(atsQuery, SCAN_CONFIG.queryCountCap);
  const dateOnlyCount = countGmailQueryUpToCap(dateOnlyQuery, SCAN_CONFIG.queryCountCap);
  Logger.log('Query comparison spreadsheet=' + spreadsheet.getUrl());
  Logger.log('Query comparison window=' + formatScanDate_(historicalWindow.start) + '..' + formatScanDate_(historicalWindow.end));
  Logger.log('Strict tracker count=' + strictCount.count + (strictCount.capped ? '+' : ''));
  Logger.log('Broad application count=' + broadCount.count + (broadCount.capped ? '+' : ''));
  Logger.log('ATS/domain count=' + atsCount.count + (atsCount.capped ? '+' : ''));
  Logger.log('Date-only sanity count=' + dateOnlyCount.count + (dateOnlyCount.capped ? '+' : ''));
  Logger.log('Strict query: ' + strictQuery);
  Logger.log('Broad query: ' + broadQuery);
  Logger.log('ATS query: ' + atsQuery);
  return { windowStart: formatScanDate_(historicalWindow.start), windowEnd: formatScanDate_(historicalWindow.end), strict: strictCount, broad: broadCount, ats: atsCount, dateOnly: dateOnlyCount };
}

/**
 * Manually refreshes visualizations without scanning emails
 */
function refreshVisualizations() {
  const spreadsheet = getOrCreateSpreadsheet(TARGET_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("Applications");

  // Apply formatting first
  SpreadsheetUtils.enhanceSpreadsheetFormatting(sheet);
  
  try {
    SpreadsheetUtils.createSummaryDashboard(sheet);
    SpreadsheetApp.getActive().toast('Visualizations refreshed successfully!');
  } catch (e) {
    Logger.log("Error refreshing visualizations: " + e.toString());
    SpreadsheetApp.getActive().toast('Error refreshing visualizations: ' + e.toString());
  }
}

/**
 * Migrates an existing spreadsheet to hide the Email Thread ID column
 * and ensures thread IDs are preserved in a hidden column
 */
function migrateSpreadsheet() {
  const spreadsheet = getOrCreateSpreadsheet(TARGET_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("Applications");
  
  // Get existing data
  const existingData = sheet.getDataRange().getValues();
  const headers = existingData[0];
  
  // Check if the Email Thread ID column exists
  const threadIdColumnIndex = headers.indexOf('Email Thread ID');
  
  if (threadIdColumnIndex !== -1) {
    // Create a new hidden ThreadId column if it doesn't exist
    const hiddenThreadIdColumnName = "ThreadId";
    let hiddenThreadIdColumnIndex = headers.indexOf(hiddenThreadIdColumnName);
    
    if (hiddenThreadIdColumnIndex === -1) {
      // Add the hidden ThreadId column at the end
      const lastColumn = sheet.getLastColumn();
      sheet.insertColumnAfter(lastColumn);
      sheet.getRange(1, lastColumn + 1).setValue(hiddenThreadIdColumnName);
      hiddenThreadIdColumnIndex = lastColumn;
      
      // Copy data from visible Email Thread ID column to hidden ThreadId column
      // Skip the header row (row 1)
      for (let i = 2; i <= sheet.getLastRow(); i++) {
        const threadId = sheet.getRange(i, threadIdColumnIndex + 1).getValue();
        sheet.getRange(i, lastColumn + 1).setValue(threadId);
      }
      
      // Hide the new ThreadId column
      sheet.hideColumn(sheet.getRange(1, lastColumn + 1, 1, 1));
    }
    
    // Remove the visible Email Thread ID column
    sheet.deleteColumn(threadIdColumnIndex + 1);
    
    // Update column formatting and auto-resize
    sheet.autoResizeColumns(1, sheet.getLastColumn());
    
    // Show confirmation message
    SpreadsheetApp.getActive().toast('Email Thread ID column has been migrated to a hidden column');
  } else {
    SpreadsheetApp.getActive().toast('No Email Thread ID column found to migrate');
  }
}

function scanEmails(mode, spreadsheetId) {
  mode = mode === 'historical' ? 'historical' : 'recent';
  const startTime = getScanStartTime();
  const spreadsheet = getOrCreateSpreadsheet(spreadsheetId || TARGET_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("Applications");

  // Get all existing data from the spreadsheet
  const existingData = sheet.getDataRange().getValues();
  const headers = existingData[0];
  
  const metrics = { threadsFound: 0, processed: 0, added: 0, updated: 0, skipped: 0, parseFailures: 0 };

  // Get column indices - all 0-based
  const jobTitleIndex = headers.indexOf('Job Title');
  const companyIndex = headers.indexOf('Company');
  const dateSubmittedIndex = headers.indexOf('Date Submitted');
  const dateUpdatedIndex = headers.indexOf('Date Updated');
  const statusIndex = headers.indexOf('Status');
  
  // Validate column indices
  if (jobTitleIndex === -1 || companyIndex === -1 || 
      dateSubmittedIndex === -1 || dateUpdatedIndex === -1 || 
      statusIndex === -1) {
    SpreadsheetApp.getActive().toast('Error: Required columns are missing in the spreadsheet. Please check your column headers.');
    return;
  }
  
  // Create a hidden column for thread IDs if it doesn't exist
  const threadIdColumnName = "ThreadId";
  let threadIdIndex;
  
  // Check if the ThreadId column exists
  if (headers.indexOf(threadIdColumnName) === -1) {
    // Add ThreadId column at the end (hidden)
    const lastColumn = sheet.getLastColumn();
    sheet.insertColumnAfter(lastColumn);
    sheet.getRange(1, lastColumn + 1).setValue(threadIdColumnName);
    threadIdIndex = lastColumn;
    
    // Hide the Thread ID column
    sheet.hideColumn(sheet.getRange(1, threadIdIndex + 1, 1, 1));
  } else {
    threadIdIndex = headers.indexOf(threadIdColumnName);
  }

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
  
  const scanWindow = getScanWindow(mode, new Date(startTime));
  const query = buildGmailSearchQuery(mode, scanWindow);
  const searchStart = getGmailSearchStart(mode, query);
  const threads = GmailApp.search(query, searchStart, getBatchSize());
  metrics.threadsFound = threads.length;
  let updatesCount = 0;
  const pendingCellUpdates = [];
  const newRows = [];
  const newRowLinks = [];
  let interrupted = false;

  
  // First pass: Process existing thread IDs for status updates
  for (const thread of threads) {
    if (isNearExecutionLimit(startTime)) { interrupted = true; break; }
    const threadId = thread.getId();
    const threadLink = "https://mail.google.com/mail/u/0/#inbox/" + threadId;
    
    // Check if this is a thread we're already tracking
    if (existingThreadIds.has(threadId)) {
      const rowNumber = existingThreadIds.get(threadId);
      const messages = thread.getMessages();
      const lastMessage = messages[messages.length - 1]; // Get the latest message
      
      const subject = lastMessage.getSubject();
      const body = lastMessage.getPlainBody();
      const htmlBody = lastMessage.getBody();
      const date = lastMessage.getDate();
      
      // Determine new status
      const status = StatusUtils.determineStatus(subject, body, htmlBody);
      
      // Update the spreadsheet with status and date - add 1 to index for getRange
      const currentStatus = updatedData[rowNumber - 1][statusIndex];
      pendingCellUpdates.push({ row: rowNumber, status: getHigherPriorityStatus(currentStatus, status), updatedDate: date, threadLink: threadLink });
      
      updatesCount++;
    }
  }
  
  // -- PART 2: SCAN FOR NEW APPLICATIONS --
  let newApplicationsCount = 0;
  let updatedApplicationsCount = 0;
  
  for (const thread of threads) {
    if (isNearExecutionLimit(startTime)) { interrupted = true; break; }
    const threadId = thread.getId();
    const threadLink = "https://mail.google.com/mail/u/0/#inbox/" + threadId;
    
    // Skip if already processed by thread ID
    if (existingThreadIds.has(threadId)) continue;
    if (shouldSkipThread(thread)) { metrics.skipped++; continue; }
    
    const messages = thread.getMessages();
    const message = messages[0]; // Get the first message in the thread
    const lastMessage = messages[messages.length - 1]; // Get the latest message
    
    const subject = message.getSubject();
    const from = message.getFrom();
    const body = message.getPlainBody();
    const htmlBody = message.getBody(); // Get HTML content
    const date = message.getDate();
    const lastDate = lastMessage.getDate();

    // Extract data using utility functions
    const company = CompanyUtils.extractCompany(subject, body, from, htmlBody);
    const rawJobTitle = JobUtils.extractJobTitle(subject, body, from, htmlBody);
    const jobTitle = JobUtils.cleanJobTitle(JobUtils.cleanJobTitle(rawJobTitle));
    if (jobTitle === 'Unlisted' || jobTitle === 'Unlisted Position') metrics.parseFailures++;

    // Determine the initial status
    let initialStatus = StatusUtils.determineStatus(subject, body, htmlBody);
    
    // If there are multiple messages, check all messages for status clues
    if (messages.length > 1) {
      // Iterate through all messages in reverse (newest first)
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const msgSubject = msg.getSubject();
        const msgBody = msg.getPlainBody();
        const msgHtmlBody = msg.getBody();
        
        // Determine status from this message
        const msgStatus = StatusUtils.determineStatus(msgSubject, msgBody, msgHtmlBody);
        
        // Priority order: Offer > Interview > Assessment > Rejected > Status Update > Applied
        if (msgStatus === "Offer Received" || 
            (initialStatus !== "Offer Received" && msgStatus === "Interview Request") ||
            (initialStatus !== "Offer Received" && initialStatus !== "Interview Request" && 
             msgStatus === "Assessment") ||
            (initialStatus !== "Offer Received" && initialStatus !== "Interview Request" && 
             initialStatus !== "Assessment" && msgStatus === "Rejected") ||
            (initialStatus === "Applied" && msgStatus === "Status Update")) {
          initialStatus = msgStatus;
        }
      }
    }

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
  }

  Logger.log(
    "About to write rows: spreadsheet=" + spreadsheet.getUrl() +
    ", sheet=" + sheet.getName() +
    ", currentRows=" + sheet.getLastRow() +
    ", newRows=" + newRows.length +
    ", newRowColumns=" + (newRows[0] ? newRows[0].length : 0) +
    ", sheetColumns=" + sheet.getLastColumn()
  );

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    SpreadsheetApp.flush();
    Logger.log("After write: rows=" + sheet.getLastRow());
  }
  pendingCellUpdates.forEach(update => {
    if (update.threadId) sheet.getRange(update.row, threadIdIndex + 1).setValue(update.threadId);
    if (update.status) sheet.getRange(update.row, statusIndex + 1).setValue(update.status);
    SpreadsheetUtils.formatDateAsLink(sheet, update.row, dateUpdatedIndex + 1, update.threadLink, update.updatedDate);
  });
  newRowLinks.forEach(link => {
    SpreadsheetUtils.formatDateAsLink(sheet, link.row, dateSubmittedIndex + 1, link.threadLink, link.submittedDate);
    SpreadsheetUtils.formatDateAsLink(sheet, link.row, dateUpdatedIndex + 1, link.threadLink, link.updatedDate);
  });
  metrics.processed = updatesCount + newApplicationsCount + updatedApplicationsCount;
  metrics.added = newApplicationsCount;
  metrics.updated = updatesCount + updatedApplicationsCount;
  
  // Apply color formatting to status cells
  // Show confirmation
  let message = '';
  if (newApplicationsCount > 0) {
    message += `Added ${newApplicationsCount} new job applications. `;
  }
  if (updatedApplicationsCount > 0) {
    message += `Updated ${updatedApplicationsCount} duplicate applications. `;
  }
  if (updatesCount > 0) {
    message += `Updated status for ${updatesCount} existing applications.`;
  }
  if (message === '') {
    message = 'No new applications or status updates found.';
  }
  
  SpreadsheetApp.getActive().toast(message);
  
  const completedBatch = threads.length < getBatchSize() && !interrupted;
  if (completedBatch) {
    completeScanWindow(mode, scanWindow);
  } else if (!interrupted) {
    completeGmailSearchPage(mode, query, searchStart, threads.length);
  }
  Logger.log('Scan summary: mode=' + mode + ', spreadsheet=' + spreadsheet.getUrl() + ', rows=' + sheet.getLastRow() + ', window=' + formatScanDate_(scanWindow.start) + '..' + formatScanDate_(scanWindow.end) + ', searchStart=' + searchStart + ', nextSearchStart=' + (completedBatch ? 0 : searchStart + threads.length) + ', threads=' + metrics.threadsFound + ', processed=' + metrics.processed + ', added=' + metrics.added + ', updated=' + metrics.updated + ', skipped=' + metrics.skipped + ', parseFailures=' + metrics.parseFailures + ', moreWork=' + !completedBatch);
  return { mode: mode, completed: completedBatch, interrupted: interrupted, threads: metrics.threadsFound, searchStart: searchStart, nextSearchStart: completedBatch ? 0 : searchStart + threads.length, added: metrics.added, updated: metrics.updated, skipped: metrics.skipped, parseFailures: metrics.parseFailures, rows: sheet.getLastRow(), query: query };
}

function importHistoricalEmails(spreadsheetId) {
  const importStartTime = getScanStartTime();
  const totals = { windows: 0, threads: 0, added: 0, updated: 0, skipped: 0, parseFailures: 0 };
  for (let i = 0; i < SCAN_CONFIG.maxHistoricalWindowsPerRun; i++) {
    const result = scanEmails('historical', spreadsheetId);
    totals.windows++;
    totals.threads += result.threads;
    totals.added += result.added;
    totals.updated += result.updated;
    totals.skipped += result.skipped;
    totals.parseFailures += result.parseFailures;
    if (shouldStopHistoricalImport(result, importStartTime)) break;
  }
  Logger.log('Historical import summary: windows=' + totals.windows + ', maxWindowsPerRun=' + SCAN_CONFIG.maxHistoricalWindowsPerRun + ', threads=' + totals.threads + ', added=' + totals.added + ', updated=' + totals.updated + ', skipped=' + totals.skipped + ', parseFailures=' + totals.parseFailures);
  SpreadsheetApp.getActive().toast('Historical import checked ' + totals.windows + ' windows. Added ' + totals.added + ', updated ' + totals.updated + '.');
}

/**
 * Creates draft email responses for rejected job applications
 * to help maintain professional relationships
 */
function createRejectionFollowupDrafts() {
  const spreadsheet = getOrCreateSpreadsheet(TARGET_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("Applications");
  
  // Get all data from the spreadsheet
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find relevant column indices
  const jobTitleIndex = headers.indexOf('Job Title');
  const companyIndex = headers.indexOf('Company');
  const statusIndex = headers.indexOf('Status');
  const dateUpdatedIndex = headers.indexOf('Date Updated');
  const threadIdColumnName = "ThreadId";
  const threadIdIndex = headers.indexOf(threadIdColumnName);
  
  if (jobTitleIndex === -1 || companyIndex === -1 || statusIndex === -1 || threadIdIndex === -1) {
    SpreadsheetApp.getActive().toast('Error: Required columns are missing. Please check your column headers.');
    return;
  }
  
  // Track rejected applications that haven't had follow-up emails yet
  let draftCount = 0;
  const followupStatus = "Rejection Follow-up Sent";
  
  // Create a new column for tracking follow-up status if it doesn't exist
  let followupStatusIndex = headers.indexOf('Follow-up Status');
  if (followupStatusIndex === -1) {
    // Add the column at the end
    sheet.insertColumnAfter(sheet.getLastColumn());
    sheet.getRange(1, sheet.getLastColumn()).setValue('Follow-up Status');
    followupStatusIndex = sheet.getLastColumn() - 1; // 0-based index
    
    // Initialize all cells in the new column to empty
    for (let i = 2; i <= sheet.getLastRow(); i++) {
      sheet.getRange(i, followupStatusIndex + 1).setValue('');
    }
  }
  
  // Process each row (skipping header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusIndex];
    const followupSent = row[followupStatusIndex];
    
    // Only process rejected applications that haven't had follow-ups
    if (status === "Rejected" && followupSent !== followupStatus) {
      const jobTitle = row[jobTitleIndex];
      const company = row[companyIndex];
      const threadId = row[threadIdIndex];
      
      // Skip if missing essential data
      if (!jobTitle || !company || !threadId) continue;
      
      try {
        // Retrieve the original email thread
        const thread = GmailApp.getThreadById(threadId);
        if (!thread) continue;
        
        // Get the messages in the thread
        const messages = thread.getMessages();
        if (messages.length === 0) continue;
        
        // Typically, the rejection message would be the last message in the thread
        const rejectionMessage = messages[messages.length - 1];
        
        // Create a draft response
        const draftEmail = createRejectionFollowupEmail(company, jobTitle);
        
        // Create a draft that's a reply to the thread
        // This will automatically address it to the sender of the rejection email
        rejectionMessage.createDraftReply(draftEmail, {
          htmlBody: draftEmail.replace(/\n/g, '<br>')
        });
        
        // Update the follow-up status in the spreadsheet
        sheet.getRange(i + 1, followupStatusIndex + 1).setValue(followupStatus);
        draftCount++;
        
      } catch (e) {
        Logger.log(`Error creating draft for ${company} - ${jobTitle}: ${e.toString()}`);
        continue;
      }
    }
  }
  
  // Show confirmation toast
  if (draftCount > 0) {
    SpreadsheetApp.getActive().toast(`Created ${draftCount} rejection follow-up email drafts. Check your Gmail drafts folder.`);
  } else {
    SpreadsheetApp.getActive().toast('No new rejected applications found that need follow-up emails.');
  }
}

/**
 * Creates the email body for a rejection follow-up email
 * @param {string} company - Company name
 * @param {string} jobTitle - Job title
 * @return {string} Email body text
 */
function createRejectionFollowupEmail(company, jobTitle) {
  // Create an array of several different templates to choose from randomly
  const templates = [
    `Dear Hiring Team at ${company},

Thank you for considering my application for the ${jobTitle} position and for taking the time to review my qualifications. I appreciate the opportunity to have been considered for this role.

While I'm disappointed that I wasn't selected, I remain very interested in ${company} and would welcome the opportunity to be considered for other positions that match my skills and experience in the future.

I would greatly appreciate any feedback you might be able to provide regarding my application or interview that could help me improve.

Thank you again for your time and consideration. I wish you and the team continued success.

Best regards,
[YOUR NAME]`,

    `Dear ${company} Recruiting Team,

Thank you for informing me of your decision regarding the ${jobTitle} position. I appreciate your consideration and the time your team invested in reviewing my application.

Although I'm disappointed that we won't be working together at this time, I remain enthusiastic about ${company}'s work and mission. I would be grateful to be kept in mind for future opportunities that might be a better match for my skills in [relevant skill areas].

If you're able to share any feedback about my application that could help me grow professionally, I would greatly value that insight.

Thank you again for this opportunity, and I wish you and your team all the best.

Sincerely,
[YOUR NAME]`,

    `Dear Hiring Manager,

Thank you for letting me know about your decision regarding the ${jobTitle} role at ${company}. While I'm disappointed not to move forward, I appreciate the opportunity to have been considered.

I continue to be impressed by ${company}'s [mention something specific about the company you admire] and would be interested in future opportunities that align with my background in [your key skills].

If you have a moment, any constructive feedback would be invaluable to my professional development.

Thank you again for your time and consideration.

Best regards,
[YOUR NAME]`
  ];
  
  // Choose a random template
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
}

function openFeedbackForm() {
  // Opens feedback form as a sidebar
  var htmlOutput = HtmlService
      .createHtmlOutput('<iframe src="https://docs.google.com/forms/d/e/1FAIpQLSfz4PxUTe7wPaL4At_qpSuxAMa3rP4GUGMmTYASDKkST71XtA/viewform?usp=dialog" width="100%" height="500px"></iframe>')
      .setTitle('Feedback Form');
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

/**
 * Legacy function for backward compatibility - delegates to scanEmails
 */
function scanForNewApplications() {
  scanEmails();
}

/**
 * Legacy function for backward compatibility - delegates to scanEmails
 */
function scanForStatusUpdates() {
  scanEmails();
}

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

function runDiagnosticMailboxAudit() {
  const signalGroup = '(subject:("thank you for applying" OR "thanks for applying" OR "thank you for your application" OR "thanks for your application" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for" OR "application received" OR "we received your application" OR "confirmation of your application" OR "interview invitation" OR "schedule interview" OR "interview scheduling" OR "scheduling request" OR "interview request" OR "candidacy update" OR "application status" OR assessment OR "coding challenge" OR "job offer" OR "status update" OR "regarding your application" OR "thank you for your interest" OR "thank you in your interest" OR "update on your candidacy") OR body:("thank you for your interest" OR "thank you for applying" OR "thanks for applying" OR "thank you for your application" OR "thanks for your application" OR "received your application" OR "application has been received" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for" OR "interview scheduling" OR "interview request" OR "scheduling request" OR "schedule your interview") OR from:(@talent OR @careers OR @jobs OR @hr OR @recruiting OR @hire OR jobs-noreply@linkedin.com OR candidates.workablemail.com OR @inbound.workablemail.com OR greenhouse.io OR greenhouse-mail.io OR lever.co OR myworkdayjobs.com OR myworkday.com OR workday.com OR icims.com OR smartrecruiters.com OR indeed.com OR successfactors.com))';
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
  Logger.log(`Analyzing details for all ${allThreads.length} threads...`);
  
  const positiveKeywords = [
    'your application was sent', 'application submitted', 'successfully applied',
    'application received', 'we received your application', 'thank you for applying',
    'thank you for your application', 'thank you for your interest', 'thanks for applying',
    'thanks for your application', 'thanks for your interest', 'interview',
    'assessment', 'coding challenge', 'not moving forward', 'regret to inform',
    'congratulations', 'offer letter'
  ];
  
  let skippedCount = 0;
  let parsedCount = 0;
  const auditData = [["Status", "From", "Subject", "Reason", "Clean Company", "Clean Title"]];
  
  for (let i = 0; i < allThreads.length; i++) {
    const thread = allThreads[i];
    const messages = thread.getMessages();
    if (messages.length === 0) continue;
    
    const firstMsg = messages[0];
    const subject = firstMsg.getSubject();
    const from = firstMsg.getFrom();
    const body = firstMsg.getPlainBody();
    
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();
    const domain = senderDomain_(from);
    
    const skip = shouldSkipMessage(subject, from, body);
    
    if (skip) {
      skippedCount++;
      let reason = "No positive signal keywords found";
      
      if (domain === 'jobs-listings.linkedin.com' || domain === 'jobs-listings@linkedin.com') {
        reason = "Domain is LinkedIn job listings";
      } else if (lowerSubject.includes('weekly') || lowerSubject.includes('digest') || lowerSubject.includes('job alert') || lowerSubject.includes('security alert')) {
        reason = "Subject contains newsletter keywords (weekly/digest/alert)";
      } else {
        const bodyHasPositive = positiveKeywords.some(keyword => lowerBody.includes(keyword));
        if (bodyHasPositive) {
          reason = "Body contains positive keyword but sender/content matched newsletter noise platform patterns";
        }
      }
      auditData.push(["SKIP", from, subject, reason, "", ""]);
      Logger.log(`[SKIP - ${reason}] From: ${from} | Subject: ${subject}`);
    } else {
      parsedCount++;
      const company = CompanyUtils.extractCompany(subject, body, from, firstMsg.getBody());
      const rawJobTitle = JobUtils.extractJobTitle(subject, body, from, firstMsg.getBody());
      const jobTitle = JobUtils.cleanJobTitle(rawJobTitle);
      auditData.push(["PASS", from, subject, "Valid application", company, jobTitle]);
      Logger.log(`[PASS] From: ${from} | Subject: ${subject} => Co: ${company} | Title: ${jobTitle}`);
    }
  }
  
  // Write to datestamped temporary sheet named "Audit Logs - YYYY-MM-DD HH:mm"
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  const tabName = `Audit Logs - ${timestamp}`;
  
  const spreadsheet = getOrCreateSpreadsheet();
  let auditSheet = spreadsheet.getSheetByName(tabName);
  if (auditSheet) {
    auditSheet.clear();
  } else {
    auditSheet = spreadsheet.insertSheet(tabName);
  }
  
  auditSheet.getRange(1, 1, auditData.length, auditData[0].length).setValues(auditData);
  auditSheet.autoResizeColumns(1, auditData[0].length);
  
  // Write to unfiltered "Broad Search Dump" tab if not already present
  let broadSheet = spreadsheet.getSheetByName("Broad Search Dump");
  if (!broadSheet) {
    broadSheet = spreadsheet.insertSheet("Broad Search Dump");
    const broadData = [["Thread ID", "Date", "From", "Subject"]];
    for (let i = 0; i < allThreads.length; i++) {
      const thread = allThreads[i];
      const messages = thread.getMessages();
      if (messages.length === 0) continue;
      const firstMsg = messages[0];
      broadData.push([
        thread.getId(),
        firstMsg.getDate().toISOString(),
        firstMsg.getFrom(),
        firstMsg.getSubject()
      ]);
    }
    broadSheet.getRange(1, 1, broadData.length, broadData[0].length).setValues(broadData);
    broadSheet.autoResizeColumns(1, broadData[0].length);
    Logger.log("Created 'Broad Search Dump' tab with raw unfiltered search results.");
  } else {
    Logger.log("'Broad Search Dump' tab already exists, skipping creation.");
  }
  
  Logger.log(`Diagnostic Complete!`);
  Logger.log(`Total matching threads: ${allThreads.length}`);
  Logger.log(`Threads matched (parsed): ${parsedCount}`);
  Logger.log(`Threads skipped (noise filter): ${skippedCount}`);
  
  SpreadsheetApp.getActive().toast(`Diagnostic Complete: Found ${allThreads.length} total strict matches! Open the "${tabName}" sheet tab to view all entries!`);
}


function runBroadSearchGapAudit() {
  const runStart = new Date();
  
  // Define strict and broad queries over a 90-day window to evaluate the gap
  const dateWindow = 'after:' + formatScanDate_(daysBefore_(runStart, 90));
  
  const signalGroup = '(subject:("thank you for applying" OR "thanks for applying" OR "thank you for your application" OR "thanks for your application" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for" OR "application received" OR "we received your application" OR "confirmation of your application" OR "interview invitation" OR "schedule interview" OR "interview scheduling" OR "scheduling request" OR "interview request" OR "candidacy update" OR "application status" OR assessment OR "coding challenge" OR "job offer" OR "status update" OR "regarding your application" OR "thank you for your interest" OR "thank you in your interest" OR "update on your candidacy") OR body:("thank you for your interest" OR "thank you for applying" OR "thanks for applying" OR "thank you for your application" OR "thanks for your application" OR "received your application" OR "application has been received" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for" OR "interview scheduling" OR "interview request" OR "scheduling request" OR "schedule your interview") OR from:(@talent OR @careers OR @jobs OR @hr OR @recruiting OR @hire OR jobs-noreply@linkedin.com OR candidates.workablemail.com OR @inbound.workablemail.com OR greenhouse.io OR greenhouse-mail.io OR lever.co OR myworkdayjobs.com OR myworkday.com OR workday.com OR icims.com OR smartrecruiters.com OR indeed.com OR successfactors.com))';
  const exclusions = '-from:jobs-listings@linkedin.com -from:@glassdoor.com -subject:"password reset" -subject:"weekly application update" -subject:digest';
  const strictQuery = signalGroup + ' ' + exclusions + ' ' + dateWindow;
  
  const broadQuery = '(application OR applied OR interview OR recruiter OR careers OR hiring OR "for applying" OR "application submitted" OR "your application") ' + dateWindow;
  
  Logger.log('Starting Broad Search Gap Audit (90-day window)...');
  Logger.log('Strict query: ' + strictQuery);
  Logger.log('Broad query: ' + broadQuery);
  
  // 1. Fetch strict query thread IDs
  const strictThreadIds = new Set();
  let page = 0;
  const pageSize = 500;
  while (true) {
    let threadsPage = GmailApp.search(strictQuery, page * pageSize, pageSize);
    if (!threadsPage || threadsPage.length === 0) break;
    threadsPage.forEach(t => strictThreadIds.add(t.getId()));
    if (threadsPage.length < pageSize) break;
    page++;
  }
  Logger.log(`Found ${strictThreadIds.size} threads matching strict query in past 90 days.`);
  
  // 2. Fetch broad query threads
  const broadThreads = [];
  page = 0;
  while (true) {
    let threadsPage = GmailApp.search(broadQuery, page * pageSize, pageSize);
    if (!threadsPage || threadsPage.length === 0) break;
    threadsPage.forEach(t => broadThreads.push(t));
    if (threadsPage.length < pageSize || broadThreads.length >= 1500) break; // Cap at 1500 to prevent execution limit
    page++;
  }
  Logger.log(`Found ${broadThreads.length} threads matching broad query in past 90 days.`);
  
  // 3. Find the gaps
  const gapData = [["Date", "From", "Subject", "Snippet", "Thread ID"]];
  let gapCount = 0;
  
  for (let i = 0; i < broadThreads.length; i++) {
    const thread = broadThreads[i];
    if (strictThreadIds.has(thread.getId())) continue; // Not a gap
    
    const messages = thread.getMessages();
    if (messages.length === 0) continue;
    const firstMsg = messages[0];
    
    const bodyText = firstMsg.getPlainBody() || '';
    const snippet = bodyText.substring(0, 150).replace(/\s+/g, ' ').trim();
    
    gapCount++;
    gapData.push([
      firstMsg.getDate().toISOString(),
      firstMsg.getFrom(),
      firstMsg.getSubject(),
      snippet,
      thread.getId()
    ]);
  }
  
  Logger.log(`Found ${gapCount} threads that matched the broad query but NOT the strict query (the Gap).`);
  
  // Write to temporary sheet named "Broad Search Gap Audit"
  const spreadsheet = getOrCreateSpreadsheet();
  let gapSheet = spreadsheet.getSheetByName("Broad Search Gap Audit");
  if (gapSheet) {
    gapSheet.clear();
  } else {
    gapSheet = spreadsheet.insertSheet("Broad Search Gap Audit");
  }
  
  gapSheet.getRange(1, 1, gapData.length, gapData[0].length).setValues(gapData);
  gapSheet.autoResizeColumns(1, gapData[0].length);
  
  SpreadsheetApp.getActive().toast(`Gap audit complete! Found ${gapCount} potential missed emails in "Broad Search Gap Audit" tab!`);
}

function runGeminiBroadGapAudit() {
  const dateWindow = 'after:2025/06/15';
  const broadQuery = '(application OR applied OR interview OR recruiter OR careers OR hiring OR "for applying" OR "application submitted" OR "your application") ' + dateWindow;
  
  Logger.log('Starting Uncapped Gemini LLM Broad Search Gap Audit (since 2025/06/15)...');
  
  // 1. Fetch ALL broad query threads (no arbitrary cap)
  const threads = [];
  let page = 0;
  const pageSize = 500; // Boost page size for speed
  while (true) {
    let threadsPage = GmailApp.search(broadQuery, page * pageSize, pageSize);
    if (!threadsPage || threadsPage.length === 0) break;
    threadsPage.forEach(t => threads.push(t));
    if (threadsPage.length < pageSize) break;
    page++;
  }
  
  Logger.log(`Found ${threads.length} broad threads to audit.`);
  
  // Batch fetch all message arrays in a single network round-trip!
  Logger.log('Batch fetching message lists for all threads...');
  const messages2D = GmailApp.getMessagesForThreads(threads);
  
  // 2. Map thread metadata & extract regex decisions
  const threadLogs = [];
  const promptLogs = []; // Ultra-compressed input schema for Gemini
  const idxMap = new Map(); // "001" -> threadId
  
  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const messages = messages2D[i];
    if (!messages || messages.length === 0) continue;
    const firstMsg = messages[0];
    const subject = firstMsg.getSubject();
    const from = firstMsg.getFrom();
    const body = firstMsg.getPlainBody() || '';
    const snippet = body.substring(0, 350).replace(/\s+/g, ' ').trim();
    
    // Evaluate Regex classification (PASS vs SKIP) using snippet instead of full body
    const regexSkip = shouldSkipMessage(subject, from, snippet);
    const regexDecision = regexSkip ? 'SKIP' : 'PASS';
    
    const idx = String(i + 1).padStart(3, '0');
    idxMap.set(idx, thread.getId());
    
    threadLogs.push({
      threadId: thread.getId(),
      date: firstMsg.getDate().toISOString(),
      from: from,
      subject: subject,
      snippet: snippet,
      regexDecision: regexDecision
    });
    
    promptLogs.push({
      idx: idx,
      f: from,
      s: subject,
      sn: snippet
    });
  }

  // 3. Batch threads and call Gemini
  const geminiMap = new Map(); // threadId -> classification result
  for (let i = 0; i < promptLogs.length; i += GEMINI_CONFIG.batchSize) {
    const batch = promptLogs.slice(i, i + GEMINI_CONFIG.batchSize);
    Logger.log(`Sending batch ${Math.floor(i / GEMINI_CONFIG.batchSize) + 1} to Gemini (${batch.length} threads)...`);
    try {
      const results = GeminiClient.classifyBatch(batch);
      results.forEach(res => {
        const threadId = idxMap.get(res.idx);
        if (threadId) {
          geminiMap.set(threadId, res);
        }
      });
    } catch (e) {
      Logger.log("Error classifying batch: " + e.toString());
    }
    
    // Pacing delay to stabilize connection and respect limits
    if (i + GEMINI_CONFIG.batchSize < promptLogs.length) {
      Logger.log("Applying pacing delay (1000ms) before next batch...");
      Utilities.sleep(1000);
    }
  }

  // 4. Align regex and Gemini decisions into audit rows
  const auditData = [[
    "Thread ID", "Date", "From", "Subject", "Regex Decision", 
    "Gemini Decision", "Gap Status", "Gemini Class", 
    "Gemini Company", "Gemini Title", "Gemini Reasoning", "Snippet"
  ]];

  for (const logItem of threadLogs) {
    const geminiRes = geminiMap.get(logItem.threadId);
    
    let geminiDecision = 'SKIP';
    let isJobRelated = false;
    let geminiClass = 'Noise';
    let reasoning = 'No classification returned by model.';
    let cleanCompany = 'Unlisted';
    let cleanTitle = 'Unlisted';
    
    if (geminiRes) {
      isJobRelated = geminiRes.rel;
      geminiDecision = isJobRelated ? 'PASS' : 'SKIP';
      reasoning = geminiRes.rea;
      cleanCompany = geminiRes.co || 'Unlisted';
      cleanTitle = geminiRes.ti || 'Unlisted';
      
      const classMap = {
        'APPLIED': 'Applied', 'INTERVIEW': 'Interview Request', 
        'ASSESSMENT': 'Assessment', 'REJECTED': 'Rejected', 
        'OFFER': 'Offer Received', 'NOISE': 'Noise'
      };
      geminiClass = classMap[geminiRes.cat] || 'Noise';
    }

    // Determine Gap Status
    let gapStatus = 'MATCH';
    if (logItem.regexDecision === 'SKIP' && geminiDecision === 'PASS') {
      gapStatus = 'FALSE_SKIP';
    } else if (logItem.regexDecision === 'PASS' && geminiDecision === 'SKIP') {
      gapStatus = 'FALSE_PASS';
    }

    auditData.push([
      logItem.threadId,
      logItem.date,
      logItem.from,
      logItem.subject,
      logItem.regexDecision,
      geminiDecision,
      gapStatus,
      geminiClass,
      cleanCompany,
      cleanTitle,
      reasoning,
      logItem.snippet
    ]);
  }

  // 5. Output comparative data to tab "BroadGapLLM"
  const spreadsheet = getOrCreateSpreadsheet();
  let gapSheet = spreadsheet.getSheetByName("BroadGapLLM");
  if (gapSheet) {
    gapSheet.clear();
  } else {
    gapSheet = spreadsheet.insertSheet("BroadGapLLM");
  }
  
  gapSheet.getRange(1, 1, auditData.length, auditData[0].length).setValues(auditData);
  
  // Format tab nicely (auto-resize and hide Thread ID column)
  gapSheet.autoResizeColumns(1, auditData[0].length);
  gapSheet.hideColumn(gapSheet.getRange(1, 1, 1, 1));
  
  // Apply a clean alternate row color schema and formatting
  SpreadsheetUtils.formatGapLLMSheet(gapSheet, auditData.length);
  
  SpreadsheetApp.getActive().toast(`Gemini Broad Search Gap Audit complete! Open the "BroadGapLLM" sheet tab to inspect results!`);
}