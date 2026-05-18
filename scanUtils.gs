const SCAN_CONFIG = {
  batchSize: 50,
  maxRuntimeMs: 5 * 60 * 1000,
  stopBufferMs: 15 * 1000,
  defaultRecentDays: 7,
  overlapDays: 1,
  historicalWindowDays: 30
};
const SCAN_KEYS = { lastSuccess: 'lastSuccessfulScanAt', historicalWindowEnd: 'historicalWindowEnd' };

function getScanStartTime() { return Date.now(); }
function isNearExecutionLimit(startTime) { return Date.now() - startTime >= SCAN_CONFIG.maxRuntimeMs - SCAN_CONFIG.stopBufferMs; }
function getBatchSize() { return SCAN_CONFIG.batchSize; }
function scanProperties_() { return PropertiesService.getScriptProperties(); }
function getLastSuccessfulScanAt() { const value = scanProperties_().getProperty(SCAN_KEYS.lastSuccess); return value ? new Date(value) : null; }
function setLastSuccessfulScanAt(date) { scanProperties_().setProperty(SCAN_KEYS.lastSuccess, date.toISOString()); }
function clearHistoricalScanState() { scanProperties_().deleteProperty(SCAN_KEYS.historicalWindowEnd); }
function daysBefore_(date, days) { const copy = new Date(date); copy.setDate(copy.getDate() - days); return copy; }
function buildRecentScanWindow(lastSuccess, runStart) { return { start: daysBefore_(lastSuccess || daysBefore_(runStart, SCAN_CONFIG.defaultRecentDays - SCAN_CONFIG.overlapDays), SCAN_CONFIG.overlapDays), end: runStart }; }
function buildHistoricalScanWindow(windowEnd) { return { start: daysBefore_(windowEnd, SCAN_CONFIG.historicalWindowDays), end: windowEnd }; }
function getHistoricalWindowEnd(runStart) { const value = scanProperties_().getProperty(SCAN_KEYS.historicalWindowEnd); return value ? new Date(value) : runStart; }
function getScanWindow(mode, runStart) { return mode === 'historical' ? buildHistoricalScanWindow(getHistoricalWindowEnd(runStart)) : buildRecentScanWindow(getLastSuccessfulScanAt(), runStart); }
function completeScanWindow(mode, window) { if (mode === 'historical') scanProperties_().setProperty(SCAN_KEYS.historicalWindowEnd, window.start.toISOString()); else setLastSuccessfulScanAt(window.end); }
function buildDateWindowFilter(window) { return 'after:' + Utilities.formatDate(window.start, Session.getScriptTimeZone(), 'yyyy/MM/dd') + ' before:' + Utilities.formatDate(window.end, Session.getScriptTimeZone(), 'yyyy/MM/dd'); }
function getHigherPriorityStatus(currentStatus, candidateStatus) {
  const priority = { 'Applied': 1, 'Status Update': 2, 'Rejected': 3, 'Assessment': 4, 'Interview Request': 5, 'Offer Received': 6 };
  return (priority[candidateStatus] || 0) > (priority[currentStatus] || 0) ? candidateStatus : currentStatus;
}

function buildGmailSearchQuery(mode, window) {
  const signalGroup = '(subject:("thank you for applying" OR "thank you for your application" OR "application received" OR "we received your application" OR "confirmation of your application" OR "interview invitation" OR "job offer" OR "status update" OR "regarding your application") OR body:"thank you for your interest" OR from:(@talent OR @careers OR @jobs OR @hr OR @recruiting OR @hire OR candidates.workablemail.com OR @inbound.workablemail.com))';
  const exclusions = '-from:jobs-listings@linkedin.com -from:@glassdoor.com -label:social -category:promotions -subject:"password reset" -subject:"weekly application update" -subject:digest -unsubscribe';
  return signalGroup + ' ' + exclusions + ' ' + buildDateWindowFilter(window);
}

function senderDomain_(from) { const match = String(from || '').match(/@([^>\s]+)/); return match ? match[1].toLowerCase() : ''; }
function shouldSkipMessage(subject, from, body) {
  const haystack = (String(subject || '') + ' ' + String(body || '')).toLowerCase();
  const domain = senderDomain_(from);
  if (domain === 'jobs-listings.linkedin.com') return true;
  if (haystack.includes('weekly application update') || haystack.includes('jobs you may be interested in')) return true;
  if ((haystack.includes('digest') || haystack.includes('unsubscribe')) && !haystack.includes('your application was sent')) return true;
  if (haystack.includes('password reset')) return true;
  if (haystack.includes('calendar notification') && !haystack.includes('interview')) return true;
  return false;
}
function shouldSkipThread(thread) { const messages = thread.getMessages(); const message = messages[0]; return shouldSkipMessage(message.getSubject(), message.getFrom(), message.getPlainBody()); }
