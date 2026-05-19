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
  const existingJobApplications = new Map(); // "jobtitle|company" -> row number
  
  // Reload the data after potentially adding the ThreadId column
  const updatedData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < updatedData.length; i++) {
    const row = updatedData[i];
    // Store threadId -> row number mapping if ThreadId column exists
    if (threadIdIndex < row.length && row[threadIdIndex]) { 
      existingThreadIds.set(row[threadIdIndex], i + 1); // Store thread ID and row number (1-indexed)
    }
    
    // Store "jobtitle|company" -> row number mapping
    if (row[jobTitleIndex] && row[companyIndex]) {
      const key = (row[jobTitleIndex] + '|' + row[companyIndex]).toLowerCase();
      existingJobApplications.set(key, i + 1);
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

    // Create lookup key for checking if this is a duplicate application
    const lookupKey = (jobTitle + '|' + company).toLowerCase();
    
    // Check if we already have an entry for this job title and company combination
    if (existingJobApplications.has(lookupKey)) {
      // This is a duplicate - update the existing entry
      const existingRowNum = existingJobApplications.get(lookupKey);
      
      // Get the current status from the sheet
      const currentStatus = sheet.getRange(existingRowNum, statusIndex + 1).getValue();
      
      const nextStatus = getHigherPriorityStatus(currentStatus, initialStatus);
      const shouldUpdateStatus = nextStatus !== currentStatus;
      
      pendingCellUpdates.push({ row: existingRowNum, threadId: threadId, status: shouldUpdateStatus ? nextStatus : null, updatedDate: lastDate, threadLink: threadLink });
      
      updatedApplicationsCount++;
    } else {
      // This is a new application - add a new row
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
      
      // Add this to our maps so we can detect duplicates in the same batch
      existingThreadIds.set(threadId, newRow);
      existingJobApplications.set(lookupKey, newRow);
      
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
