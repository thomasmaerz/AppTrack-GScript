const SCAN_CONFIG = {
  batchSize: 50,
  maxRuntimeMs: 5 * 60 * 1000,
  stopBufferMs: 15 * 1000,
  defaultRecentDays: 7,
  overlapDays: 1,
  historicalWindowDays: 30,
  maxHistoricalWindowsPerRun: 120,
  queryCountPageSize: 100,
  queryCountCap: 500
};
const SCAN_KEYS = { lastSuccess: 'lastSuccessfulScanAt', historicalWindowEnd: 'historicalWindowEnd', historicalSearchStart: 'historicalSearchStart', historicalSearchQuery: 'historicalSearchQuery' };

function getScanStartTime() { return Date.now(); }
function isNearExecutionLimit(startTime) { return Date.now() - startTime >= SCAN_CONFIG.maxRuntimeMs - SCAN_CONFIG.stopBufferMs; }
function getBatchSize() { return SCAN_CONFIG.batchSize; }
function scanProperties_() { return PropertiesService.getScriptProperties(); }
function getLastSuccessfulScanAt() { const value = scanProperties_().getProperty(SCAN_KEYS.lastSuccess); return value ? new Date(value) : null; }
function setLastSuccessfulScanAt(date) { scanProperties_().setProperty(SCAN_KEYS.lastSuccess, date.toISOString()); }
function clearHistoricalScanState() { scanProperties_().deleteProperty(SCAN_KEYS.historicalWindowEnd); clearHistoricalSearchPageState(); }
function clearAllTrackerState() {
  const properties = scanProperties_();
  properties.deleteProperty(SCAN_KEYS.lastSuccess);
  properties.deleteProperty(SCAN_KEYS.historicalWindowEnd);
  properties.deleteProperty(SCAN_KEYS.historicalSearchStart);
  properties.deleteProperty(SCAN_KEYS.historicalSearchQuery);
}
function daysBefore_(date, days) { const copy = new Date(date); copy.setDate(copy.getDate() - days); return copy; }
function buildRecentScanWindow(lastSuccess, runStart) { return { start: daysBefore_(lastSuccess || daysBefore_(runStart, SCAN_CONFIG.defaultRecentDays - SCAN_CONFIG.overlapDays), SCAN_CONFIG.overlapDays), end: runStart }; }
function buildHistoricalScanWindow(windowEnd) { return { start: daysBefore_(windowEnd, SCAN_CONFIG.historicalWindowDays), end: windowEnd }; }
function getHistoricalWindowEnd(runStart) { const value = scanProperties_().getProperty(SCAN_KEYS.historicalWindowEnd); return value ? new Date(value) : runStart; }
function getScanWindow(mode, runStart) { return mode === 'historical' ? buildHistoricalScanWindow(getHistoricalWindowEnd(runStart)) : buildRecentScanWindow(getLastSuccessfulScanAt(), runStart); }
function completeScanWindow(mode, window) { if (mode === 'historical') { scanProperties_().setProperty(SCAN_KEYS.historicalWindowEnd, window.start.toISOString()); clearHistoricalSearchPageState(); } else setLastSuccessfulScanAt(window.end); }
function getHistoricalSearchStart(query) { const properties = scanProperties_(); const storedQuery = properties.getProperty(SCAN_KEYS.historicalSearchQuery); const storedStart = properties.getProperty(SCAN_KEYS.historicalSearchStart); return storedQuery === query && storedStart ? Number(storedStart) : 0; }
function setHistoricalSearchStart(query, start) { const properties = scanProperties_(); properties.setProperty(SCAN_KEYS.historicalSearchQuery, query); properties.setProperty(SCAN_KEYS.historicalSearchStart, String(start)); }
function clearHistoricalSearchPageState() { const properties = scanProperties_(); properties.deleteProperty(SCAN_KEYS.historicalSearchStart); properties.deleteProperty(SCAN_KEYS.historicalSearchQuery); }
function getGmailSearchStart(mode, query) { return mode === 'historical' ? getHistoricalSearchStart(query) : 0; }
function completeGmailSearchPage(mode, query, start, threadsFound) { if (mode === 'historical' && threadsFound >= getBatchSize()) setHistoricalSearchStart(query, start + threadsFound); }
function formatScanDate_(date) { return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd'); }
function buildDateWindowFilter(window) {
  // Gmail's `before:` operator is exclusive at the start of the named day.
  // Add one day so a window ending during May 18 includes May 18 mail.
  const inclusiveEndDate = daysBefore_(window.end, -1);
  return 'after:' + formatScanDate_(window.start) + ' before:' + formatScanDate_(inclusiveEndDate);
}
function getHigherPriorityStatus(currentStatus, candidateStatus) {
  const priority = { 'Applied': 1, 'Status Update': 2, 'Rejected': 3, 'Assessment': 4, 'Interview Request': 5, 'Offer Received': 6 };
  return (priority[candidateStatus] || 0) > (priority[currentStatus] || 0) ? candidateStatus : currentStatus;
}

function buildGmailSearchQuery(mode, window) {
  const signalGroup = '(subject:("thank you for applying" OR "thank you for your application" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for" OR "application received" OR "we received your application" OR "confirmation of your application" OR "interview invitation" OR "schedule interview" OR assessment OR "coding challenge" OR "job offer" OR "status update" OR "regarding your application") OR body:("thank you for your interest" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for") OR from:(@talent OR @careers OR @jobs OR @hr OR @recruiting OR @hire OR jobs-noreply@linkedin.com OR candidates.workablemail.com OR @inbound.workablemail.com OR greenhouse.io OR lever.co OR myworkdayjobs.com OR workday.com OR icims.com OR smartrecruiters.com OR indeed.com OR successfactors.com))';
  const exclusions = '-from:jobs-listings@linkedin.com -from:@glassdoor.com -subject:"password reset" -subject:"weekly application update" -subject:digest';
  return signalGroup + ' ' + exclusions + ' ' + buildDateWindowFilter(window);
}

function buildBroadGmailSearchQuery(window) {
  return '(application OR applied OR interview OR recruiter OR careers OR hiring OR "for applying" OR "application submitted" OR "your application") ' + buildDateWindowFilter(window);
}

function buildAtsGmailSearchQuery(window) {
  return 'from:(linkedin.com OR indeed.com OR greenhouse.io OR lever.co OR workday.com OR myworkdayjobs.com OR icims.com OR smartrecruiters.com OR workablemail.com OR successfactors.com) ' + buildDateWindowFilter(window);
}

function isPositiveApplicationSignal_(haystack, domain) {
  if (haystack.includes('your application was sent')) return true;
  if (haystack.includes('application submitted')) return true;
  if (haystack.includes('successfully applied')) return true;
  if (haystack.includes('application received')) return true;
  if (haystack.includes('we received your application')) return true;
  if (haystack.includes('thank you for applying')) return true;
  if (haystack.includes('thank you for your application')) return true;
  if (haystack.includes('thank you for your interest')) return true;
  if (haystack.includes('thank you for taking the time to apply')) return true;
  if (haystack.includes('interview')) return true;
  if (haystack.includes('assessment')) return true;
  if (haystack.includes('coding challenge')) return true;
  if (haystack.includes('not moving forward')) return true;
  if (haystack.includes('regret to inform')) return true;
  if (haystack.includes('other candidates')) return true;
  if (haystack.includes('unable to offer')) return true;
  if (haystack.includes('congratulations')) return true;
  if (haystack.includes('offer letter')) return true;
  
  // Match standard job ATS/candidate platform domains
  return /(^|\.)(greenhouse\.io|lever\.co|myworkdayjobs\.com|workday\.com|icims\.com|smartrecruiters\.com|indeed\.com|successfactors\.com|workablemail\.com|linkedin\.com)$/.test(domain);
}

function shouldStopHistoricalImport(result, importStartTime) {
  // Keep advancing across historical windows in a single run.
  // Stop only if runtime is near limit or a scan was interrupted.
  return result.interrupted || isNearExecutionLimit(importStartTime);
}

function countGmailQueryUpToCap(query, cap) {
  cap = cap || SCAN_CONFIG.queryCountCap;
  let count = 0;
  for (let start = 0; start < cap; start += SCAN_CONFIG.queryCountPageSize) {
    const pageSize = Math.min(SCAN_CONFIG.queryCountPageSize, cap - start);
    const threads = GmailApp.search(query, start, pageSize);
    count += threads.length;
    if (threads.length < pageSize) break;
  }
  return { count: count, capped: count >= cap };
}

function senderDomain_(from) { const match = String(from || '').match(/@([^>\s]+)/); return match ? match[1].toLowerCase() : ''; }
function shouldSkipMessage(subject, from, body) {
  const haystack = (String(subject || '') + ' ' + String(body || '')).toLowerCase();
  const domain = senderDomain_(from);
  
  // High-confidence noise skips
  if (domain === 'jobs-listings.linkedin.com' || domain === 'jobs-listings@linkedin.com') return true;
  if (haystack.includes('weekly application update') || haystack.includes('jobs you may be interested in')) return true;
  if (haystack.includes('password reset')) return true;
  if (haystack.includes('calendar notification') && !haystack.includes('interview')) return true;
  
  // If it's a positive application signal (Applied, Interview, Assessment, Offer, Rejection)
  if (isPositiveApplicationSignal_(haystack, domain)) {
    return false; // Do not skip! Keep this email.
  }
  
  // If it doesn't match any positive signal, skip it by default (to filter out newsletters/security alerts)
  return true; 
}
function shouldSkipThread(thread) { const messages = thread.getMessages(); const message = messages[0]; return shouldSkipMessage(message.getSubject(), message.getFrom(), message.getPlainBody()); }
