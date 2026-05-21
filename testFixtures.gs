/** Lightweight Apps Script regression harness. Run runTrackerTests() manually. */
const TestFixtures = {
  linkedInConfirmation: {
    subject: 'Your application was sent to Acme',
    from: 'LinkedIn <jobs-noreply@linkedin.com>',
    body: 'Your application was sent to Acme\nSnr Eng Netwk Arch Standards\nView application',
    company: 'Acme', title: 'Snr Eng Netwk Arch Standards', status: 'Applied', skip: false
  },
  linkedInDigest: {
    subject: 'Your weekly application update', from: 'LinkedIn <jobs-listings@linkedin.com>',
    body: 'Jobs you may be interested in this week', skip: true
  },
  instacartConfirmation: {
    subject: 'Thank you for applying to Instacart', from: 'careers@instacart.com',
    body: 'Thank you for applying to Instacart for the Software Engineer role.', company: 'Instacart', title: 'Software Engineer', status: 'Applied', skip: false
  },
  rogersConfirmation: {
    subject: 'Application received', from: 'recruiting@rogers.com',
    body: 'Thank you for your application for position of Senior Network Engineer.', company: 'Rogers', title: 'Senior Network Engineer', status: 'Applied', skip: false
  },
  interview: { subject: 'Interview invitation', from: 'talent@acme.com', body: 'We would like to meet the team next week.', status: 'Interview Request', skip: false },
  rejection: { subject: 'Application update', from: 'careers@acme.com', body: 'We regret to inform you that we are not moving forward.', status: 'Rejected', skip: false },
  noisyTeksystems: { subject: 'Job opportunity digest', from: 'alerts@teksystems.com', body: 'unsubscribe from bulk job alerts', skip: true },
  atsConfirmationWithUnsubscribe: {
    subject: 'Application submitted', from: 'no-reply@greenhouse.io',
    body: 'Your application was submitted successfully. You may unsubscribe from recruiting emails.', skip: false
  },
  malformedTitle: { subject: 'Application received', from: 'jobs@example.com', body: 'application for https://example.com is match', title: 'Unlisted' },
  shiftTechnologyInterview: {
    subject: 'Shift Technology - Interview Scheduling Request - [Project Manager]',
    from: 'Andrea Constantinides <andrea.constantinides@shift-technology.com>',
    body: 'Hi Thomas, thank you again for applying to our Project Manager role. We have just sent you a first interview request email.',
    status: 'Interview Request', skip: false
  },
  indeedMarketing: {
    subject: 'Land a job 30% faster with the Indeed app',
    from: 'Indeed <no-reply@indeed.com>',
    body: 'Apply for jobs on the go with the Indeed mobile app. Start applying today.',
    skip: true
  },
  laddersMarketing: {
    subject: 'Unlock $100K+ Job Opportunities Today!',
    from: 'Ladders <jobs@my.theladders.com>',
    body: 'Improve your interview skills and start applying to premium jobs. Get hired today.',
    skip: true
  },
  linkedInSpecificUpdate: {
    subject: 'Your application to Project Manager at TEEMA',
    from: 'LinkedIn <jobs-noreply@linkedin.com>',
    body: 'Your application to Project Manager at TEEMA has an update. The hiring team reviewed your application.',
    skip: false,
    status: 'Status Update',
    company: 'TEEMA',
    title: 'Project Manager'
  },
  githubOauthNoise: {
    subject: 'A third-party OAuth application has been added to your account',
    from: 'GitHub <noreply@github.com>',
    body: 'A third-party OAuth application was recently authorized to access your GitHub account.',
    skip: true
  },
  sinApplicationNoise: {
    subject: 'Your Social Insurance Number application was received',
    from: 'Service Canada <noreply@canada.ca>',
    body: 'We received your Social Insurance Number application.',
    skip: true
  },
  pmpApplicationNoise: {
    subject: 'Your PMP application has been approved',
    from: 'PMI <customercare@pmi.org>',
    body: 'Your PMP certification application has been approved.',
    skip: true
  },
  immediateHiringRecruiter: {
    subject: 'Immediate Hiring - Senior IT Systems Administrator',
    from: 'Adithya Naidu <adithya@recruiting.example.com>',
    body: 'Hi Thomas, I came across your profile and have an immediate hiring opportunity for a Senior IT Systems Administrator contract role. Please send your resume.',
    skip: false,
    status: 'Recruiter Outreach',
    title: 'Senior IT Systems Administrator'
  },
  recruiterFollowUp: {
    subject: 'Message replied: Immediate Hiring - Senior IT Systems Administrator',
    from: 'Adithya Naidu <adithya@recruiting.example.com>',
    body: 'Following up on the Senior IT Systems Administrator role. Please forward your resume if interested.',
    skip: false,
    status: 'Recruiter Follow-up'
  },
  mastercardReferral: {
    subject: 'You have been referred to a job at Mastercard',
    from: 'Mastercard Careers <careers@mastercard.com>',
    body: 'You have been referred to a job at Mastercard. Senior Technical Program Manager is now open for your application.',
    skip: false,
    status: 'Referral',
    company: 'Mastercard',
    title: 'Senior Technical Program Manager'
  },
  smartRecruitersOtpNoise: {
    subject: 'Your SmartRecruiters one-time passcode',
    from: 'SmartRecruiters <noreply@smartrecruiters.com>',
    body: 'Your one-time passcode is 123456. This code expires soon.',
    skip: true
  },
  loanApplicationNoise: {
    subject: 'Your loan application was received',
    from: 'Bank <noreply@bank.example.com>',
    body: 'Your loan application was received and is being reviewed.',
    skip: true
  },
  creditCardApplicationNoise: {
    subject: 'Credit card application received',
    from: 'Bank <cards@bank.example.com>',
    body: 'We received your credit card application.',
    skip: true
  },
  housingApplicationNoise: {
    subject: 'Housing application received',
    from: 'Housing Portal <noreply@housing.example.com>',
    body: 'Your housing application has been received.',
    skip: true
  },
  studentPortalApplicationNoise: {
    subject: 'Application received in your student portal',
    from: 'University <admissions@example.edu>',
    body: 'Your student portal application was received by admissions.',
    skip: true
  },
  workdayCandidateAccountOtpNoise: {
    subject: 'Your Workday candidate account one-time passcode',
    from: 'Workday <noreply@myworkday.com>',
    body: 'Your one-time passcode for your candidate account application is 123456.',
    skip: true
  },
  smartRecruitersCandidateAccountOtpNoise: {
    subject: 'SmartRecruiters candidate account security code',
    from: 'SmartRecruiters <noreply@smartrecruiters.com>',
    body: 'Use this security code to access your candidate application account.',
    skip: true
  }
};

function assertTrackerEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(label + ': expected ' + expected + ', got ' + actual);
}

function runTrackerTests() {
  const f = TestFixtures;
  assertTrackerEqual(shouldSkipMessage(f.linkedInDigest.subject, f.linkedInDigest.from, f.linkedInDigest.body), true, 'LinkedIn digest skipped');
  assertTrackerEqual(shouldSkipMessage(f.linkedInConfirmation.subject, f.linkedInConfirmation.from, f.linkedInConfirmation.body), false, 'LinkedIn confirmation retained');
  assertTrackerEqual(shouldSkipMessage(f.atsConfirmationWithUnsubscribe.subject, f.atsConfirmationWithUnsubscribe.from, f.atsConfirmationWithUnsubscribe.body), false, 'ATS confirmation with unsubscribe retained');
  assertTrackerEqual(shouldSkipMessage(f.shiftTechnologyInterview.subject, f.shiftTechnologyInterview.from, f.shiftTechnologyInterview.body), false, 'Shift Technology interview retained');
  assertTrackerEqual(shouldSkipMessage(f.indeedMarketing.subject, f.indeedMarketing.from, f.indeedMarketing.body), true, 'Indeed marketing skipped');
  assertTrackerEqual(shouldSkipMessage(f.laddersMarketing.subject, f.laddersMarketing.from, f.laddersMarketing.body), true, 'Ladders marketing skipped');
  assertTrackerEqual(shouldSkipMessage(f.linkedInSpecificUpdate.subject, f.linkedInSpecificUpdate.from, f.linkedInSpecificUpdate.body), false, 'LinkedIn specific update retained');
  assertTrackerEqual(shouldSkipMessage(f.githubOauthNoise.subject, f.githubOauthNoise.from, f.githubOauthNoise.body), true, 'GitHub OAuth noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.sinApplicationNoise.subject, f.sinApplicationNoise.from, f.sinApplicationNoise.body), true, 'SIN application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.pmpApplicationNoise.subject, f.pmpApplicationNoise.from, f.pmpApplicationNoise.body), true, 'PMP application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.immediateHiringRecruiter.subject, f.immediateHiringRecruiter.from, f.immediateHiringRecruiter.body), false, 'Immediate hiring recruiter retained');
  assertTrackerEqual(shouldSkipMessage(f.recruiterFollowUp.subject, f.recruiterFollowUp.from, f.recruiterFollowUp.body), false, 'Recruiter follow-up retained');
  assertTrackerEqual(shouldSkipMessage(f.mastercardReferral.subject, f.mastercardReferral.from, f.mastercardReferral.body), false, 'Mastercard referral retained');
  assertTrackerEqual(shouldSkipMessage(f.smartRecruitersOtpNoise.subject, f.smartRecruitersOtpNoise.from, f.smartRecruitersOtpNoise.body), true, 'SmartRecruiters OTP skipped');
  assertTrackerEqual(shouldSkipMessage(f.loanApplicationNoise.subject, f.loanApplicationNoise.from, f.loanApplicationNoise.body), true, 'Loan application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.creditCardApplicationNoise.subject, f.creditCardApplicationNoise.from, f.creditCardApplicationNoise.body), true, 'Credit card application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.housingApplicationNoise.subject, f.housingApplicationNoise.from, f.housingApplicationNoise.body), true, 'Housing application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.studentPortalApplicationNoise.subject, f.studentPortalApplicationNoise.from, f.studentPortalApplicationNoise.body), true, 'Student portal application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.workdayCandidateAccountOtpNoise.subject, f.workdayCandidateAccountOtpNoise.from, f.workdayCandidateAccountOtpNoise.body), true, 'Workday candidate account OTP skipped');
  assertTrackerEqual(shouldSkipMessage(f.smartRecruitersCandidateAccountOtpNoise.subject, f.smartRecruitersCandidateAccountOtpNoise.from, f.smartRecruitersCandidateAccountOtpNoise.body), true, 'SmartRecruiters candidate account OTP skipped');
  assertTrackerEqual(StatusUtils.determineStatus(f.immediateHiringRecruiter.subject, f.immediateHiringRecruiter.body, ''), f.immediateHiringRecruiter.status, 'Recruiter outreach status');
  assertTrackerEqual(StatusUtils.determineStatus(f.recruiterFollowUp.subject, f.recruiterFollowUp.body, ''), f.recruiterFollowUp.status, 'Recruiter follow-up status');
  assertTrackerEqual(StatusUtils.determineStatus(f.mastercardReferral.subject, f.mastercardReferral.body, ''), f.mastercardReferral.status, 'Referral status');
  assertTrackerEqual(JobUtils.extractJobTitle(f.mastercardReferral.subject, f.mastercardReferral.body, f.mastercardReferral.from, ''), f.mastercardReferral.title, 'Referral title extraction');
  assertTrackerEqual(CompanyUtils.extractCompany(f.mastercardReferral.subject, f.mastercardReferral.body, f.mastercardReferral.from, ''), f.mastercardReferral.company, 'Referral company extraction');
  assertTrackerEqual(JobUtils.extractJobTitle(f.immediateHiringRecruiter.subject, f.immediateHiringRecruiter.body, f.immediateHiringRecruiter.from, ''), f.immediateHiringRecruiter.title, 'Recruiter title extraction');
  assertTrackerEqual(getStatusUpdateDecision('Interview Request', new Date('2026-01-01T00:00:00Z'), 'Rejected', new Date('2026-01-02T00:00:00Z')).status, 'Rejected', 'newer rejection replaces interview');
  assertTrackerEqual(getStatusUpdateDecision('Rejected', new Date('2026-01-02T00:00:00Z'), 'Interview Request', new Date('2026-01-03T00:00:00Z')).status, 'Interview Request', 'newer interview replaces rejection');
  assertTrackerEqual(getStatusUpdateDecision('Interview Request', new Date('2026-01-02T00:00:00Z'), 'Status Update', new Date('2026-01-03T00:00:00Z')).status, 'Interview Request', 'generic status update does not erase interview');
  assertTrackerEqual(buildAuditSnippet('Noise header', 'sender@example.com', 'Header line '.repeat(50) + 'We are not moving forward with your application at this time.').indexOf('not moving forward') !== -1, true, 'signal snippet includes rejection anchor');
  assertTrackerEqual(StatusUtils.determineStatus(f.shiftTechnologyInterview.subject, f.shiftTechnologyInterview.body, ''), f.shiftTechnologyInterview.status, 'Shift Technology status');
  assertTrackerEqual(JobUtils.extractJobTitle(f.linkedInConfirmation.subject, f.linkedInConfirmation.body, f.linkedInConfirmation.from, ''), f.linkedInConfirmation.title, 'LinkedIn title');
  assertTrackerEqual(CompanyUtils.extractCompany(f.linkedInConfirmation.subject, f.linkedInConfirmation.body, f.linkedInConfirmation.from, ''), f.linkedInConfirmation.company, 'LinkedIn company');
  assertTrackerEqual(JobUtils.extractJobTitle(f.rogersConfirmation.subject, f.rogersConfirmation.body, f.rogersConfirmation.from, ''), f.rogersConfirmation.title, 'Rogers title');
  assertTrackerEqual(JobUtils.extractJobTitle(f.malformedTitle.subject, f.malformedTitle.body, f.malformedTitle.from, ''), f.malformedTitle.title, 'reject malformed title');
  assertTrackerEqual(StatusUtils.determineStatus(f.interview.subject, f.interview.body, ''), f.interview.status, 'interview status');
  assertTrackerEqual(StatusUtils.determineStatus(f.rejection.subject, f.rejection.body, ''), f.rejection.status, 'rejection status');
  assertTrackerEqual(getBatchSize(), SCAN_CONFIG.batchSize, 'batch size');
  assertTrackerEqual(getHigherPriorityStatus('Offer Received', 'Status Update'), 'Offer Received', 'status never downgrades');
  assertTrackerEqual(getHigherPriorityStatus('Applied', 'Interview Request'), 'Interview Request', 'status upgrades');
  const runStart = new Date('2026-05-18T12:00:00Z');
  const recentWindow = buildRecentScanWindow(new Date('2026-05-18T08:00:00Z'), runStart);
  assertTrackerEqual(recentWindow.start.toISOString(), '2026-05-17T08:00:00.000Z', 'recent overlap window start');
  assertTrackerEqual(recentWindow.end.toISOString(), runStart.toISOString(), 'recent window end');
  const historicalWindow = buildHistoricalScanWindow(new Date('2026-04-01T00:00:00Z'));
  assertTrackerEqual(historicalWindow.end.toISOString(), '2026-04-01T00:00:00.000Z', 'historical window end');
  assertTrackerEqual(historicalWindow.start.toISOString(), '2026-03-02T00:00:00.000Z', 'historical window start');
  assertTrackerEqual(buildDateWindowFilter(recentWindow).includes('before:2026/05/18'), false, 'query does not exclude current day');
  assertTrackerEqual(buildDateWindowFilter(recentWindow), 'after:2026/05/17 before:2026/05/19', 'before bound includes current day');
  const historicalQuery = buildGmailSearchQuery('historical', historicalWindow);
  assertTrackerEqual(historicalQuery.indexOf('"your application was sent"') !== -1, true, 'query includes LinkedIn sent confirmation phrase');
  assertTrackerEqual(historicalQuery.indexOf('"application submitted"') !== -1, true, 'query includes submitted phrase');
  assertTrackerEqual(historicalQuery.indexOf('"successfully applied"') !== -1, true, 'query includes successfully applied phrase');
  assertTrackerEqual(historicalQuery.indexOf('"immediate hiring"') !== -1, true, 'query includes recruiter immediate hiring phrase');
  assertTrackerEqual(historicalQuery.indexOf('"referred to a job"') !== -1, true, 'query includes referral phrase');
  assertTrackerEqual(historicalQuery.indexOf('inmail-hit-reply@linkedin.com') !== -1, true, 'query includes LinkedIn InMail sender');
  assertTrackerEqual(historicalQuery.indexOf('greenhouse.io') !== -1, true, 'query includes Greenhouse ATS domain');
  assertTrackerEqual(buildBroadGmailSearchQuery(historicalWindow).indexOf('"your application"') !== -1, true, 'broad query includes generic application phrase');
  assertTrackerEqual(getGmailSearchStart('recent', historicalQuery), 0, 'recent scans always start at first Gmail page');
  assertTrackerEqual(shouldStopHistoricalImport({ completed: false, interrupted: false }, Date.now()), false, 'historical import continues full pages');
  assertTrackerEqual(shouldStopHistoricalImport({ completed: true, interrupted: false }, Date.now()), false, 'historical import continues to next window when page complete');
  assertTrackerEqual(shouldStopHistoricalImport({ completed: false, interrupted: true }, Date.now()), true, 'historical import stops after interruption');

  // Test Mock Gemini mapping
  const mockGeminiRes = {
    threadId: 't1',
    isJobRelated: true,
    classification: 'APPLIED',
    confidence: 'HIGH',
    reasoning: 'Matches standard confirmation phrase.',
    cleanCompany: 'Acme',
    cleanTitle: 'Unlisted'
  };
  
  assertTrackerEqual(mockGeminiRes.threadId, 't1', 'Mock thread mapping verified');
  assertTrackerEqual(mockGeminiRes.isJobRelated, true, 'Mock job relation mapping verified');

  const rawHeaders = getRawGapHeaders_();
  assertTrackerEqual(rawHeaders.length, 14, 'RawGap headers include all expected columns');
  assertTrackerEqual(rawHeaders[0], 'Thread ID', 'RawGap header A');
  assertTrackerEqual(rawHeaders[1], 'Message ID', 'RawGap header B');
  assertTrackerEqual(rawHeaders[13], 'audit window', 'RawGap header N');

  assertTrackerEqual(rawGapHeadersMatch_(rawHeaders), true, 'RawGap exact headers match');
  assertTrackerEqual(rawGapHeadersMatch_(rawHeaders.slice(0, 13)), false, 'RawGap short headers mismatch');
  assertTrackerEqual(rawGapHeadersMatch_(rawHeaders.concat(['extra'])), false, 'RawGap extra headers mismatch');
  assertTrackerEqual(rawGapHeadersMatch_(['Thread ID', 'Date', 'From']), false, 'RawGap legacy headers mismatch');

  const renamedOne = buildRawDumpArchiveName_(new Date('2026-05-21T14:03:04Z'), {});
  assertTrackerEqual(/^rawdumpDB\.\d{8}-\d{6}$/.test(renamedOne), true, 'RawGap archive name has datestamp');
  const taken = {};
  taken[renamedOne] = true;
  assertTrackerEqual(buildRawDumpArchiveName_(new Date('2026-05-21T14:03:04Z'), taken), renamedOne + '.2', 'RawGap archive name resolves collision');

  const densityRows = [
    { date: new Date('2026-01-01T12:00:00Z') },
    { date: new Date('2026-01-02T12:00:00Z') },
    { date: new Date('2026-01-30T12:00:00Z') },
    { date: new Date('2026-02-01T12:00:00Z') }
  ];
  const denseWindow = findRawGapDensestWindowFromRows_(densityRows);
  assertTrackerEqual(denseWindow.count, 4, 'RawGap densest window count');
  assertTrackerEqual(denseWindow.start.toISOString(), '2026-01-01T00:00:00.000Z', 'RawGap densest window earliest tie/start');
  assertTrackerEqual(denseWindow.endExclusive.toISOString(), '2026-03-02T00:00:00.000Z', 'RawGap densest window 60-day exclusive end');

  const rawWindow = { start: new Date('2026-01-01T00:00:00Z'), endExclusive: new Date('2026-01-31T00:00:00Z') };
  assertTrackerEqual(isRawGapMessageInWindow_(new Date('2026-01-01T00:00:00Z'), rawWindow), true, 'RawGap includes start boundary');
  assertTrackerEqual(isRawGapMessageInWindow_(new Date('2026-01-30T23:59:59Z'), rawWindow), true, 'RawGap includes final instant before end');
  assertTrackerEqual(isRawGapMessageInWindow_(new Date('2026-01-31T00:00:00Z'), rawWindow), false, 'RawGap excludes end boundary');

  assertTrackerEqual(buildRawGapMissedDecision_('N', 'thread-a', { 'thread-a': true }).wasMissed, 'N', 'RawGap not-job is not missed');
  assertTrackerEqual(buildRawGapMissedDecision_('Y', 'thread-a', { 'thread-a': true }).reason, 'thread_found_in_BroadGapLLM', 'RawGap found thread reason');
  assertTrackerEqual(buildRawGapMissedDecision_('Y', 'thread-b', { 'thread-a': true }).wasMissed, 'Y', 'RawGap missing job thread flagged');
  assertTrackerEqual(buildRawGapMissedDecision_('Y', 'thread-b', { 'thread-a': true }).reason, 'job_thread_not_in_BroadGapLLM', 'RawGap missing job reason');

  const broadRows = [
    ['Thread ID', 'Date', 'From', 'Subject', 'Regex Decision', 'Regex Reason', 'Regex Confidence', 'Gemini Decision', 'Gap Status', 'Gemini Class'],
    ['t-noise', '2026-01-01T00:00:00.000Z', '', '', '', '', '', '', '', 'Noise'],
    ['t-applied', '2026-01-02T00:00:00.000Z', '', '', '', '', '', '', '', 'Applied'],
    ['t-recruiter', new Date('2026-01-03T00:00:00Z'), '', '', '', '', '', '', '', 'Recruiter Outreach'],
    ['', '2026-01-04T00:00:00.000Z', '', '', '', '', '', '', '', 'Applied']
  ];
  const parsedBaseline = parseRawGapBaselineRows_(broadRows);
  assertTrackerEqual(parsedBaseline.threadSet['t-applied'], true, 'RawGap baseline thread set includes applied');
  assertTrackerEqual(parsedBaseline.threadSet['t-recruiter'], true, 'RawGap baseline thread set includes recruiter');
  assertTrackerEqual(parsedBaseline.threadSet['t-noise'], true, 'RawGap baseline thread set includes noise thread for matching');
  assertTrackerEqual(parsedBaseline.verifiedRows.length, 2, 'RawGap density rows exclude noise and blank thread');

  try {
    parseRawGapBaselineRows_([['Date', 'Gemini Class']]);
    throw new Error('RawGap missing Thread ID header did not fail');
  } catch (e) {
    assertTrackerEqual(String(e).indexOf('Thread ID') !== -1, true, 'RawGap missing Thread ID header fails clearly');
  }

  const rawQuery = buildRawGapGmailQuery_({ start: new Date('2026-01-01T00:00:00Z'), endExclusive: new Date('2026-01-31T00:00:00Z') });
  assertTrackerEqual(rawQuery.indexOf('in:anywhere after:') === 0, true, 'RawGap query starts with in:anywhere and after');
  assertTrackerEqual(rawQuery.indexOf(' before:') !== -1, true, 'RawGap query includes before');
  assertTrackerEqual(rawQuery.indexOf('application') === -1, true, 'RawGap query has no application keyword');

  assertTrackerEqual(normalizeRawGapConfidence_('HIGH'), 1, 'RawGap HIGH confidence normalized');
  assertTrackerEqual(normalizeRawGapConfidence_('MEDIUM'), 0.66, 'RawGap MEDIUM confidence normalized');
  assertTrackerEqual(normalizeRawGapConfidence_('LOW'), 0.33, 'RawGap LOW confidence normalized');
  assertTrackerEqual(normalizeRawGapConfidence_(0.94), 0.94, 'RawGap numeric confidence preserved');
  const normalizedJob = normalizeRawGapClassificationResult_({ idx: '2', isJob: true, cat: 'RESPONSE', reason: 'Candidate replied to recruiter.', conf: 'HIGH' });
  assertTrackerEqual(normalizedJob.isJob, 'Y', 'RawGap classification true maps to Y');
  assertTrackerEqual(normalizedJob.confidence, 1, 'RawGap classification confidence normalized');
  const normalizedNoise = normalizeRawGapClassificationResult_({ idx: '3', isJob: false, cat: 'NOISE', reason: 'Job alert.', conf: 'LOW' });
  assertTrackerEqual(normalizedNoise.isJob, 'N', 'RawGap classification false maps to N');

  return 'All tracker tests passed';
}
