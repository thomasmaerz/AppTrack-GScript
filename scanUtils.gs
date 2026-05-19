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
  return 'from:(greenhouse.io OR lever.co OR workday.com OR myworkdayjobs.com OR icims.com OR smartrecruiters.com OR workablemail.com OR successfactors.com OR ashbyhq.com OR recruitee.com OR breezy.hr OR jazzhr.com OR bamboohr.com OR workable.com OR jobvite.com OR oracle.com OR ukg.com OR paycor.com OR paylocity.com OR adp.com OR rippling.com OR darwinbox.com OR phenom.com OR avature.net) ' + buildDateWindowFilter(window);
}

function isHighConfidenceSubject_(lowerSubject) {
  const hasAppPattern = lowerSubject.includes('application') || 
                        lowerSubject.includes('applied') || 
                        lowerSubject.includes('applying');
                        
  if (hasAppPattern) {
    const hasConnector = lowerSubject.includes('received') ||
                         lowerSubject.includes('submitted') ||
                         lowerSubject.includes('sent') ||
                         lowerSubject.includes('confirm') ||
                         lowerSubject.includes('thanks') ||
                         lowerSubject.includes('thank you') ||
                         lowerSubject.includes('interest') ||
                         lowerSubject.includes('status') ||
                         lowerSubject.includes('update') ||
                         lowerSubject.includes('at ') ||
                         lowerSubject.includes('to ') ||
                         lowerSubject.includes('for ') ||
                         lowerSubject.includes('with ');
    if (hasConnector) return true;
  }
  
  // Specific absolute keywords
  const absoluteKeywords = [
    'interview',
    'schedule a time',
    'coding challenge',
    'assessment',
    'regret to inform',
    'not moving forward',
    'congratulations',
    'offer letter'
  ];
  
  return absoluteKeywords.some(keyword => lowerSubject.includes(keyword));
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
  const lowerSubject = String(subject || '').toLowerCase();
  const lowerBody = String(body || '').toLowerCase();
  const domain = senderDomain_(from);
  const fromLower = String(from || '').toLowerCase();

  // A. Indeed Apply Direct Confirmation Rescue
  if (domain === 'indeedapply.indeed.com' || fromLower.includes('indeedapply@indeed.com') || lowerSubject.startsWith('indeed application:')) {
    return false;
  }

  // B. Workday & Greenhouse Transactional Subject Rescue
  const isAtsDomain = /(^|\.)(greenhouse\.io|lever\.co|myworkdayjobs\.com|workday\.com|icims\.com|smartrecruiters\.com|successfactors\.com|workablemail\.com|ashbyhq\.com|recruitee\.com|breezy\.hr|jazzhr\.com|bamboohr\.com|workable\.com|jobvite\.com|oracle\.com|ukg\.com|paycor\.com|paylocity\.com|adp\.com|rippling\.com|darwinbox\.com|phenom\.com|avature\.net)$/i.test(domain);
  if (isAtsDomain && (lowerSubject === 'regarding your application' || lowerSubject === 'your application' || lowerSubject === 'thank you for your interest')) {
    return false;
  }

  // C. Passcode/Verification/Account Registration Absolute Exclusions
  if (lowerSubject.includes('security code') ||
      lowerSubject.includes('verification code') ||
      lowerSubject.includes('one-time') ||
      lowerSubject.includes('verify your') ||
      lowerSubject.includes('password reset') ||
      lowerSubject.includes('reset your password') ||
      lowerSubject.includes('account created') ||
      lowerSubject.includes('registering with') ||
      lowerSubject.includes('welcome to') ||
      lowerSubject.includes('candidate account') ||
      lowerSubject.includes('complete your candidate profile') ||
      lowerSubject.includes('one-time-passcode') ||
      lowerSubject.includes('discover the next steps for your')) {
    return true;
  }

  // D. General Marketing & Non-Job Exclusions
  if (domain.includes('zillow.com') || domain.includes('mst.edu')) {
    return true;
  }

  // E. LinkedIn Alert & Suggestion Absolute Exclusions
  if (domain === 'jobs-listings.linkedin.com' || domain === 'jobs-listings@linkedin.com' || fromLower.includes('jobs-noreply@linkedin.com')) {
    if (lowerSubject.includes('apply now to') ||
        lowerSubject.includes('apply to') ||
        lowerSubject.includes('looking for a new job') ||
        lowerSubject.includes('new application updates') ||
        lowerSubject.includes('jobs similar to') ||
        lowerSubject.includes('similar to') ||
        lowerSubject.includes('expiring on') ||
        lowerSubject.includes('viewed by') ||
        lowerSubject.includes('updates this week') ||
        lowerSubject.includes('weekly application update') ||
        lowerSubject.includes('jobs you may be')) {
      return true;
    }
  }

  // F. Indeed Alert & Match Absolute Exclusions
  if (domain.includes('indeed.com') || fromLower.includes('indeed')) {
    if (domain === 'match.indeed.com' ||
        fromLower.includes('@match.indeed.com') ||
        lowerSubject.includes('+') ||
        lowerSubject.includes('jobs in') ||
        lowerSubject.includes('job alert') ||
        lowerSubject.includes('new job') ||
        lowerSubject.includes('opportunity in') ||
        lowerSubject.includes('is hiring for') ||
        lowerSubject.includes('jobs for you') ||
        lowerSubject.includes('opportunities in') ||
        lowerSubject.includes('jobs similar to') ||
        lowerSubject.includes('more new jobs')) {
      return true;
    }
  }

  // G. Mastercard Talent Network Newsletter Exclusions
  if (domain.includes('mastercard.com') || fromLower.includes('mastercard')) {
    if (!lowerSubject.includes('your application') && !lowerSubject.includes('thank you') && !lowerSubject.includes('interview')) {
      return true;
    }
  }

  // H. High-confidence subject check
  if (isHighConfidenceSubject_(lowerSubject)) {
    return false; // Keep it immediately!
  }

  // I. Trusted ATS domains are automatically kept
  if (isAtsDomain) {
    return false; 
  }

  // J. Body positive keywords check
  const positiveKeywords = [
    'your application was sent',
    'application submitted',
    'successfully applied',
    'application received',
    'we received your application',
    'thank you for applying',
    'thank you for your application',
    'thank you for your interest',
    'thanks for applying',
    'thanks for your application',
    'thanks for your interest',
    'interview',
    'assessment',
    'coding challenge',
    'not moving forward',
    'regret to inform',
    'congratulations',
    'offer letter'
  ];

  const bodyHasPositive = positiveKeywords.some(keyword => lowerBody.includes(keyword));
  if (bodyHasPositive) {
    const bodyHasNoise = (
      domain.includes('substack') || 
      domain.includes('beehiiv') || 
      domain.includes('medium.com') ||
      lowerSubject.includes('newsletter') ||
      lowerSubject.includes('digest') ||
      lowerSubject.includes('security alert') ||
      lowerBody.includes('read the full post') ||
      lowerBody.includes('read the full story') ||
      lowerBody.includes('new post on') ||
      lowerBody.includes('published a new') ||
      lowerBody.includes('stories for you') ||
      lowerBody.includes('weekly newsletter')
    );
                         
    if (!bodyHasNoise) {
      return false;
    }
  }

  return true;
}
