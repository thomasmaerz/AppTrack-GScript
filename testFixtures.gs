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
  malformedTitle: { subject: 'Application received', from: 'jobs@example.com', body: 'application for https://example.com is match', title: 'Unlisted' }
};

function assertTrackerEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(label + ': expected ' + expected + ', got ' + actual);
}

function runTrackerTests() {
  const f = TestFixtures;
  assertTrackerEqual(shouldSkipMessage(f.linkedInDigest.subject, f.linkedInDigest.from, f.linkedInDigest.body), true, 'LinkedIn digest skipped');
  assertTrackerEqual(shouldSkipMessage(f.linkedInConfirmation.subject, f.linkedInConfirmation.from, f.linkedInConfirmation.body), false, 'LinkedIn confirmation retained');
  assertTrackerEqual(shouldSkipMessage(f.atsConfirmationWithUnsubscribe.subject, f.atsConfirmationWithUnsubscribe.from, f.atsConfirmationWithUnsubscribe.body), false, 'ATS confirmation with unsubscribe retained');
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
  assertTrackerEqual(historicalQuery.indexOf('greenhouse.io') !== -1, true, 'query includes Greenhouse ATS domain');
  assertTrackerEqual(buildBroadGmailSearchQuery(historicalWindow).indexOf('"your application"') !== -1, true, 'broad query includes generic application phrase');
  assertTrackerEqual(getGmailSearchStart('recent', historicalQuery), 0, 'recent scans always start at first Gmail page');
  assertTrackerEqual(shouldStopHistoricalImport({ completed: false, interrupted: false }, 0), false, 'historical import continues full pages');
  assertTrackerEqual(shouldStopHistoricalImport({ completed: true, interrupted: false }, 0), false, 'historical import continues to next window when page complete');
  assertTrackerEqual(shouldStopHistoricalImport({ completed: false, interrupted: true }, 0), true, 'historical import stops after interruption');
  return 'All tracker tests passed';
}
