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
function daysBefore_(date, days) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return new Date(date.getTime() - (days * DAY_MS));
}
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

function coerceDateValue_(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) {
      const month = Number(mmddyyyy[1]) - 1;
      const day = Number(mmddyyyy[2]);
      const year = Number(mmddyyyy[3]);
      const parsed = new Date(year, month, day);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function getStatusUpdateDecision(currentStatus, currentDateUpdated, candidateStatus, candidateDate) {
  const current = currentStatus || '';
  const candidate = candidateStatus || '';
  const currentDate = coerceDateValue_(currentDateUpdated);
  const nextDate = coerceDateValue_(candidateDate);
  const shouldTouch = !currentDate || !nextDate || nextDate > currentDate;

  if (!candidate) return { status: current, shouldUpdate: false, shouldTouch: false, reason: 'empty_candidate' };
  if (current === 'Offer Received' && candidate !== 'Offer Received') return { status: current, shouldUpdate: false, shouldTouch: false, reason: 'offer_sticky' };
  if (currentDate && nextDate && nextDate < currentDate) return { status: current, shouldUpdate: false, shouldTouch: false, reason: 'older_candidate' };
  if (candidate === 'Status Update' && current && current !== 'Applied' && current !== 'Recruiter Outreach') return { status: current, shouldUpdate: false, shouldTouch: shouldTouch, reason: 'weak_status_update' };
  if (candidate === 'Recruiter Outreach' && current && current !== 'Status Update') return { status: current, shouldUpdate: false, shouldTouch: shouldTouch, reason: 'weak_recruiter_outreach' };
  if (candidate === current) return { status: current, shouldUpdate: false, shouldTouch: shouldTouch, reason: 'same_status' };
  return { status: candidate, shouldUpdate: true, shouldTouch: true, reason: 'newer_meaningful_status' };
}

function normalizeAuditText_(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAny_(text, phrases) {
  const value = String(text || '').toLowerCase();
  return phrases.some(phrase => value.indexOf(String(phrase).toLowerCase()) !== -1);
}

function isSpecificLinkedInApplicationSubject_(subjectLower) {
  return subjectLower.indexOf('your application was sent to') !== -1 ||
    /^\s*your application (?:to|for) .+ at .+/i.test(subjectLower);
}

function containsPattern_(text, pattern) { return pattern.test(String(text || '').toLowerCase()); }

function hasBulkJobDigestSignal_(subjectLower, combinedLower) {
  return containsPattern_(subjectLower, /\b\d+\s+more\s+(?:new\s+)?jobs\b/) ||
    containsPattern_(subjectLower, /\+\s*\d+\s+(?:new\s+)?jobs\b/) ||
    containsPattern_(subjectLower, /\bapply to .+ and more\b/) ||
    containsAny_(combinedLower, [
      'job alert', 'jobs you may be interested', 'jobs similar to', 'explore more jobs below',
      'jobs are based on your preferences', 'based on your profile and preferences',
      'matched your search', 'search agent', 'every 7 days', 'is hiring for',
      'this job is a match', 'new job opportunities', 'new jobs posted from', 'weekly application update',
      'new application updates', 'profile viewed'
    ]);
}

function hasCareerMarketingSignal_(combinedLower) {
  return containsAny_(combinedLower, [
    'career advice', 'interview prep', 'interview preparation', 'interview questions',
    'hiring process & culture', 'learn about the mastercard hiring process', 'learn about the hiring process',
    'exploring your next move', 'career chatbot', 'ai chatbot', 'browse jobs', 'browsing jobs',
    'job matches', 'resources about our hiring process', 'never applying to jobs manually',
    'free plan', 'daily market scanning', 'resume keyword', 'keywords in resume suggestion',
    'rate your experience', 'share your recent experience', 'survey', 'feedback request'
  ]);
}

function hasNonEmploymentApplicationObject_(combinedLower) {
  return containsAny_(combinedLower, [
    'social insurance number', ' sin ', ' nas ', 'passport', 'reisepass', 'consulate',
    'income support', 'financial aid', 'loan application', 'credit card application',
    'housing application', 'student portal', 'student application', 'admission decision', 'admissions application',
    'office of admissions', 'graduation application', 'pmp application', 'certification application',
    'road test', 'driver examiner', 'oauth application', 'third-party oauth', 'third-party github application'
  ]);
}

function hasTransactionalApplicationSignal_(combinedLower) {
  return containsAny_(combinedLower, [
    'your application has been submitted', 'your application was submitted', 'your application was sent',
    'application has been submitted', 'application submitted', 'application was sent',
    'we received your application', 'we have received your application', 'application received',
    'application has been received', 'thank you for applying', 'thank you for your application',
    'thank you for submitting your application', 'confirmation of your application',
    'successfully applied', 'successfully submitted', 'confirm the receipt of your resume',
    'receipt of your resume in response to the job opportunity', 'thank you for your application to the position',
    'we value your application', 'our talent acquisition team is currently reviewing it',
    'we have received your application for our', 'thank you for your interest in the'
  ]);
}

function hasSpecificApplicationPipelineSignal_(subjectLower, combinedLower) {
  return isSpecificLinkedInApplicationSubject_(subjectLower) ||
    containsPattern_(combinedLower, /your application (?:to|for) .+ (?:has been received|has been submitted|was submitted|was sent|has an update|is under review|is being reviewed)/i);
}

function hasRoleAtEmployerPattern_(subjectLower, combinedLower) {
  return containsPattern_(subjectLower, /your application (?:to|for) .+ at .+/i) ||
    containsPattern_(combinedLower, /your application (?:to|for) .+ at .+/i);
}

function hasRejectionSignal_(combinedLower) {
  return containsAny_(combinedLower, [
    'not moving forward', 'not be moving forward', 'will not be moving forward',
    'will not be proceeding', 'not be proceeding', 'pursue other candidates',
    'proceed with other candidates', 'move forward with other candidates',
    'position has been filled', 'regret to inform', 'no longer being considered',
    'not successful', 'selected another candidate', 'more closely aligned',
    'going in a different direction'
  ]);
}

function hasInterviewOrAssessmentSignal_(combinedLower) {
  return containsAny_(combinedLower, [
    'interview scheduling', 'interview request', 'schedule your interview', 'schedule an interview',
    'invitation to interview', 'phone interview invitation', 'discuss your application further',
    'schedule a brief introductory meeting', 'moved to the next step of our hiring',
    'selected for the next round of our hiring process', 'next round of our hiring process',
    'moving forward with', 'previous hiring step', 'coding challenge', 'technical challenge',
    'skills assessment', 'assessment', 'take-home', 'take home'
  ]);
}

function hasApplicationOtpWorkflow_(combinedLower) {
  if (containsAny_(combinedLower, ['access your candidate application account', 'candidate account one-time passcode', 'candidate account security code'])) return false;
  return containsAny_(combinedLower, ['security code', 'verification code', 'one-time passcode', 'one-time-passcode', 'one-time password', 'one-time code']) &&
    containsAny_(combinedLower, ['your application', 'resubmit your application', 'complete your job application', 'job application']) &&
    !hasNonEmploymentApplicationObject_(combinedLower);
}

function isLikelySelfSent_(fromLower) {
  if (fromLower.indexOf('thomas maerz') !== -1 || fromLower.indexOf('maerz.thomas@gmail.com') !== -1) return true;
  const emailMatch = String(fromLower || '').match(/<([^>]+)>/);
  const senderEmail = (emailMatch ? emailMatch[1] : String(fromLower || '')).trim();
  const localPart = senderEmail.split('@')[0] || '';
  return localPart.indexOf('thomas.maerz') !== -1 || localPart.indexOf('maerz.thomas') !== -1;
}

function hasSelfSentRecruitingResponse_(combinedLower, fromLower) {
  if (!isLikelySelfSent_(fromLower)) return false;
  if (containsAny_(combinedLower, ['resume feedback', 'cover letter feedback', 'provide feedback', 'job prospects', 'alberta supports', 'graduation application'])) return false;
  return containsAny_(combinedLower, [
    'attached my resume', 'resume ahead of our call', 'resume for the', 'i have applied for',
    'i am writing to express', 'thank you for reaching out', 'application follow-up',
    'position at', 'role at', 'interview invitation', 'accepted:', 'new time proposed:'
  ]);
}

function hasDirectRecruiterOutreachSignal_(combinedLower) {
  return containsAny_(combinedLower, ['immediate hiring', 'contract opportunity', 'came across your profile', 'saw your profile', 'send your resume', 'forward your resume', 'presenting your profile', 'profile to our client']);
}

function hasLinkedInRecruiterMessageSignal_(combinedLower, fromLower) {
  return (fromLower.indexOf('inmail-hit-reply@linkedin.com') !== -1 || fromLower.indexOf('hit-reply@linkedin.com') !== -1 || fromLower.indexOf('messaging-digest-noreply@linkedin.com') !== -1) && containsAny_(combinedLower, ['opportunity', 'recruiter', 'role', 'position', 'resume', 'client', 'hiring']);
}

function hasUniversityAdmissionsNoiseSignal_(combinedLower, fromLower) {
  const educationSender = containsAny_(fromLower, ['admissions@', 'registrar']) ||
    containsAny_(fromLower + ' ' + combinedLower, ['university admissions', 'college admissions']);
  return educationSender && containsAny_(combinedLower, ['thank you for applying to', 'your application to', 'your application has been received', 'application has been received', 'application was received', 'admissions team']);
}

function hasCandidatePortalWorkflow_(combinedLower) {
  return containsAny_(combinedLower, ['candidate profile', 'candidate account', 'career site account', 'complete your application', 'complete your job application', 'saved a draft of your job application']) &&
    containsAny_(combinedLower, ['interview', 'next steps', 'application', 'referral', 'position', 'role', 'recruiting', 'hiring']);
}

function buildGmailSearchQuery(mode, window) {
  const signalGroup = '(subject:("thank you for applying" OR "thanks for applying" OR "thank you for your application" OR "thanks for your application" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for" OR "application received" OR "we received your application" OR "confirmation of your application" OR "interview invitation" OR "schedule interview" OR "interview scheduling" OR "scheduling request" OR "interview request" OR "candidacy update" OR "application status" OR assessment OR "coding challenge" OR "job offer" OR "status update" OR "regarding your application" OR "thank you for your interest" OR "thank you in your interest" OR "update on your candidacy" OR "you have been referred" OR "referred to a job" OR "immediate hiring" OR "contract opportunity" OR "came across your profile" OR "send your resume" OR "forward your resume" OR "profile to our client" OR "presenting your profile") OR body:("thank you for your interest" OR "thank you for applying" OR "thanks for applying" OR "thank you for your application" OR "thanks for your application" OR "received your application" OR "application has been received" OR "your application was sent" OR "application submitted" OR "successfully applied" OR "your application to" OR "your application for" OR "interview scheduling" OR "interview request" OR "scheduling request" OR "schedule your interview" OR "you have been referred" OR "referred to a job" OR "immediate hiring" OR "contract opportunity" OR "came across your profile" OR "send your resume" OR "forward your resume" OR "profile to our client" OR "presenting your profile") OR from:(@talent OR @careers OR @jobs OR @hr OR @recruiting OR @hire OR jobs-noreply@linkedin.com OR inmail-hit-reply@linkedin.com OR hit-reply@linkedin.com OR messaging-digest-noreply@linkedin.com OR candidates.workablemail.com OR @inbound.workablemail.com OR greenhouse.io OR greenhouse-mail.io OR lever.co OR myworkdayjobs.com OR myworkday.com OR workday.com OR icims.com OR smartrecruiters.com OR indeed.com OR successfactors.com))';
  const exclusions = '-from:jobs-listings@linkedin.com -from:@glassdoor.com -subject:"password reset" -subject:"weekly application update" -subject:digest';
  return signalGroup + ' ' + exclusions + ' ' + buildDateWindowFilter(window);
}

function buildBroadGmailSearchQuery(window) {
  return '(application OR applied OR interview OR recruiter OR careers OR hiring OR "for applying" OR "application submitted" OR "your application") ' + buildDateWindowFilter(window);
}

function buildAtsGmailSearchQuery(window) {
  return 'from:(greenhouse.io OR greenhouse-mail.io OR lever.co OR workday.com OR myworkdayjobs.com OR myworkday.com OR icims.com OR smartrecruiters.com OR workablemail.com OR successfactors.com OR ashbyhq.com OR recruitee.com OR breezy.hr OR jazzhr.com OR bamboohr.com OR workable.com OR jobvite.com OR oracle.com OR ukg.com OR paycor.com OR paylocity.com OR adp.com OR rippling.com OR darwinbox.com OR phenom.com OR avature.net) ' + buildDateWindowFilter(window);
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
function classifyRegexDecision(subject, from, bodyOrSnippet) {
  const lowerSubject = normalizeAuditText_(subject).toLowerCase();
  const lowerBody = normalizeAuditText_(bodyOrSnippet).toLowerCase();
  const fromLower = String(from || '').toLowerCase();
  const domain = senderDomain_(from);
  const combined = lowerSubject + ' ' + lowerBody + ' ' + fromLower;
  const hasSpecificLinkedInApplicationSubject = isSpecificLinkedInApplicationSubject_(lowerSubject);
  const hasReferralSignal = containsAny_(combined, ['you have been referred', 'referred to a job']);
  const hasApplicationSignal = hasTransactionalApplicationSignal_(combined);
  const hasSpecificApplicationPipelineSignal = hasSpecificApplicationPipelineSignal_(lowerSubject, combined);
  const hasDirectRecruiterOutreachSignal = hasDirectRecruiterOutreachSignal_(combined);
  const hasLinkedInRecruiterMessageSignal = hasLinkedInRecruiterMessageSignal_(combined, fromLower);
  const hasRoleAtEmployerPattern = hasRoleAtEmployerPattern_(lowerSubject, combined);
  const hasRejectionSignal = hasRejectionSignal_(combined);
  const hasInterviewOrAssessmentSignal = hasInterviewOrAssessmentSignal_(combined);
  const hasCandidatePortalSignal = hasCandidatePortalWorkflow_(combined);
  const hasApplicationOtpSignal = hasApplicationOtpWorkflow_(combined);
  const hasActivePipelineSignal = hasApplicationSignal || hasSpecificApplicationPipelineSignal || hasReferralSignal || hasRejectionSignal_(combined) || hasInterviewOrAssessmentSignal_(combined) || hasCandidatePortalWorkflow_(combined) || hasDirectRecruiterOutreachSignal || hasLinkedInRecruiterMessageSignal;
  const hasOtpSignal = containsAny_(combined, ['security code', 'verification code', 'one-time passcode', 'one-time-passcode', 'one-time password', 'one-time code']);
  const isSecurityAccountNoise = containsAny_(combined, ['oauth application', 'third-party oauth', 'third-party github application', 'security alert', 'authorized to access your github account', 'apps connected to your account']);
  const isGovernmentNonJobApplication = containsAny_(combined, ['social insurance number', ' sin ', ' nas ', 'passport', 'reisepass', 'consulate', 'income support']);
  const isEducationCertificationNoise = containsAny_(combined, ['pmp application', 'certification application', 'course brochure', 'program advisor', 'graduate programs', 'admissions application', 'graduation application', 'office of admissions', 'admission decision']);
  const isUniversityAdmissionsNoise = hasUniversityAdmissionsNoiseSignal_(combined, fromLower);
  const isConsumerAccountNoise = containsAny_(combined, ['billing statement', 'statement is now available', 'tax slip', 'insurance quote', 'road test', 'triangle rewards', 'bonus ct money']);
  const isFinanceHousingStudentApplicationNoise = containsAny_(combined, ['financial aid', 'loan application', 'credit card application', 'housing application', 'student portal', 'student application']);
  const isNewsletterNoise = domain.indexOf('substack') !== -1 ||
    domain.indexOf('beehiiv') !== -1 ||
    domain.indexOf('medium.com') !== -1 ||
    fromLower.indexOf('substack') !== -1 ||
    fromLower.indexOf('beehiiv') !== -1 ||
    fromLower.indexOf('medium.com') !== -1 ||
    containsAny_(combined, ['newsletter', 'read the full post', 'read the full story', 'new post on', 'published a new', 'stories for you', 'weekly newsletter']);

  const recruitmentDomains = [
    'greenhouse.io', 'greenhouse-mail.io', 'lever.co', 'myworkdayjobs.com', 'workday.com', 'myworkday.com', 'workdayjobs.com',
    'icims.com', 'smartrecruiters.com', 'successfactors.com', 'workablemail.com',
    'ashbyhq.com', 'recruitee.com', 'breezy.hr', 'jazzhr.com', 'bamboohr.com',
    'workable.com', 'jobvite.com', 'oracle.com', 'ukg.com', 'paycor.com',
    'paylocity.com', 'adp.com', 'rippling.com', 'darwinbox.com', 'phenom.com',
    'avature.net', 'randstad.ca', 'randstad.com', 'procom.ca', 'procomservices.com',
    'roberthalf.com', 'roberthalf.ca', 'hays.ca', 'hays.com', 'teema.com',
    'agilus.ca', 'insight.com', 'appointz.com', 'servus.ca', 'atco.com', 'mastercard.com'
  ];
  const isRecruitmentDomain = recruitmentDomains.some(d => domain === d || domain.endsWith('.' + d));

  if (isSecurityAccountNoise) return { skip: true, reason: 'security_account_noise', confidence: 'high' };
  if (isFinanceHousingStudentApplicationNoise) return { skip: true, reason: 'finance_housing_student_application_noise', confidence: 'high' };
  if (isGovernmentNonJobApplication) return { skip: true, reason: 'government_non_job_application', confidence: 'high' };
  if (isEducationCertificationNoise || (isUniversityAdmissionsNoise && (!hasRoleAtEmployerPattern || (!hasApplicationSignal && !hasSpecificApplicationPipelineSignal && !hasReferralSignal && !hasRejectionSignal && !hasInterviewOrAssessmentSignal && !hasCandidatePortalSignal && !hasApplicationOtpSignal)))) return { skip: true, reason: 'education_certification_noise', confidence: 'high' };
  if (isConsumerAccountNoise) return { skip: true, reason: 'consumer_account_noise', confidence: 'high' };

  if (lowerSubject.indexOf('your application was sent to') !== -1) return { skip: false, reason: 'linkedin_application_sent', confidence: 'high' };
  if (hasSpecificLinkedInApplicationSubject) return { skip: false, reason: 'specific_application_update', confidence: 'high' };
  if (hasReferralSignal) return { skip: false, reason: 'referral', confidence: 'high' };

  if (hasBulkJobDigestSignal_(lowerSubject, combined) && !hasActivePipelineSignal) return { skip: true, reason: 'job_board_digest_noise', confidence: 'high' };
  if ((isNewsletterNoise || hasCareerMarketingSignal_(combined)) && !hasActivePipelineSignal) return { skip: true, reason: 'career_marketing_noise', confidence: 'high' };
  if (containsAny_(combined, ['community membership', 'ctocraft', 'ctocraft community', 'slack invitation']) && !hasActivePipelineSignal) return { skip: true, reason: 'professional_community_noise', confidence: 'high' };
  if (containsAny_(combined, ['job placement coach', 'employment counsellor', 'workbc', 'mcg careers', 'hidden job market workshop']) && !hasActivePipelineSignal) return { skip: true, reason: 'career_services_noise', confidence: 'high' };

  if (hasApplicationOtpSignal) return { skip: false, reason: 'application_verification_workflow', confidence: 'medium' };
  if (hasOtpSignal && !hasApplicationOtpSignal) return { skip: true, reason: 'otp_noise', confidence: 'high' };
  if (hasRejectionSignal) return { skip: false, reason: 'rejection_signal', confidence: 'high' };
  if (hasInterviewOrAssessmentSignal) return { skip: false, reason: 'interview_or_assessment_signal', confidence: 'high' };
  if (hasSpecificApplicationPipelineSignal) return { skip: false, reason: 'specific_application_update', confidence: 'high' };
  if (hasApplicationSignal) return { skip: false, reason: 'application_transactional_signal', confidence: 'high' };
  if (hasCandidatePortalSignal) return { skip: false, reason: 'candidate_portal_workflow', confidence: 'medium' };
  if (hasSelfSentRecruitingResponse_(combined, fromLower)) return { skip: false, reason: 'candidate_response', confidence: 'medium' };
  if (hasDirectRecruiterOutreachSignal) return { skip: false, reason: 'direct_recruiter_outreach', confidence: 'high' };
  if (hasLinkedInRecruiterMessageSignal) return { skip: false, reason: 'linkedin_recruiter_message', confidence: 'medium' };

  if (fromLower.indexOf('jobs-listings') !== -1 || fromLower.indexOf('jobalerts-noreply') !== -1 || (fromLower.indexOf('jobs-noreply') !== -1 && !isSpecificLinkedInApplicationSubject_(lowerSubject))) return { skip: true, reason: 'job_board_digest_noise', confidence: 'high' };
  if (isRecruitmentDomain && containsAny_(combined, ['application', 'interview', 'assessment', 'candidacy', 'candidate', 'recruiting', 'hiring'])) return { skip: false, reason: 'trusted_recruiting_domain', confidence: 'medium' };
  if (isHighConfidenceSubject_(lowerSubject)) return { skip: false, reason: 'high_confidence_subject', confidence: 'medium' };

  return { skip: true, reason: 'no_job_signal', confidence: 'medium' };
}

function shouldSkipMessage(subject, from, body) {
  return classifyRegexDecision(subject, from, body).skip;
}

function buildAuditSnippet(subject, from, body) {
  const normalized = normalizeAuditText_(body);
  if (!normalized) return '';
  const lower = normalized.toLowerCase();
  const anchors = [
    'your application was sent', 'your application to', 'your application for',
    'thank you for applying', 'we received your application', 'application received',
    'regarding your application', 'update on your application', 'not moving forward',
    'pursue other candidates', 'position has been filled', 'interview', 'assessment',
    'you have been referred', 'referred to a job', 'immediate hiring',
    'contract opportunity', 'came across your profile', 'send your resume', 'profile to our client'
  ];
  let firstIndex = -1;
  anchors.forEach(anchor => {
    const idx = lower.indexOf(anchor);
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) firstIndex = idx;
  });
  const subjectLower = String(subject || '').toLowerCase();
  const maxAfter = isSpecificLinkedInApplicationSubject_(subjectLower) ? 700 : 500;
  if (firstIndex === -1) return normalized.substring(0, 500).trim();
  const start = Math.max(0, firstIndex - 120);
  const end = Math.min(normalized.length, firstIndex + maxAfter);
  return normalized.substring(start, end).trim();
}

function shouldSkipThread(thread) {
  const messages = thread.getMessages();
  if (messages.length === 0) return true;
  const message = messages[0];
  return shouldSkipMessage(message.getSubject(), message.getFrom(), message.getPlainBody());
}
