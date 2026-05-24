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
  recruiterOutreachWithDigestPhrase: {
    subject: 'Acme is hiring for Senior Project Manager',
    from: 'Recruiter <recruiter@staffing.example.com>',
    body: 'Hi Thomas, I came across your profile and have a contract opportunity for a Senior Project Manager with my client. Please send your resume if interested.',
    skip: false,
    status: 'Recruiter Outreach'
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
  universityApplicationConfirmationNoise: {
    subject: 'Your application to Missouri S&T has been received',
    from: 'Admissions <admissions@mst.edu>',
    body: 'Thank you for applying to Missouri S&T. Your application has been received by the admissions team.',
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
  },
  mastercardCareerAdviceNoise: {
    subject: 'Learn about the Mastercard hiring process & culture',
    from: 'Mastercard <talent@careers.mastercard.com>',
    body: 'Whether you are planning to apply, preparing for an interview, or browsing jobs, our careers site has resources about our hiring process and culture.',
    skip: true
  },
  indeedApplicationConfirmation: {
    subject: 'Indeed Application: Technical Project Manager',
    from: 'Indeed Apply <indeedapply@indeed.com>',
    body: 'Your application has been submitted. Good luck! If you notice an error in your application, please Contact Indeed.',
    skip: false
  },
  applicationConfirmationWithDigestFooter: {
    subject: 'Application submitted',
    from: 'Greenhouse <no-reply@greenhouse.io>',
    body: 'Your application has been submitted. Apply now to similar jobs and explore more jobs below.',
    skip: false
  },
  rejectionWithDigestFooter: {
    subject: 'Update on your application',
    from: 'Careers <careers@acme.com>',
    body: 'We are not moving forward with your application at this time. Explore more jobs below.',
    status: 'Rejected',
    skip: false
  },
  interviewWithDigestFooter: {
    subject: 'Interview scheduling request',
    from: 'Talent <talent@acme.com>',
    body: 'We would like to schedule an interview for your application. Explore more jobs below.',
    status: 'Interview Request',
    skip: false
  },
  nextRoundHiringProcessUpdate: {
    subject: 'Next round of our hiring process',
    from: 'Talent <talent@acme.com>',
    body: 'You have been selected for the next round of our hiring process. We will share scheduling details shortly.',
    status: 'Status Update',
    skip: false
  },
  admissionsJobApplication: {
    subject: 'Your application to Director of Admissions at Acme University',
    from: 'Acme University Careers <careers@acme.edu>',
    body: 'Your application to Director of Admissions at Acme University has been received by the hiring team.',
    skip: false
  },
  universityEmployerApplicationFromAdmissionsSender: {
    subject: 'Your application to Director of Admissions at Acme University has been received',
    from: 'Acme Admissions <admissions@acme.edu>',
    body: 'Your application to Director of Admissions at Acme University has been received by the hiring team for review.',
    skip: false
  },
  indeedInviteDigestNoise: {
    subject: 'IT Applications Manager at Durabuilt Windows and Doors in Edmonton, AB and 8 more new jobs',
    from: 'Indeed <invitetoapply@match.indeed.com>',
    body: 'It looks like your background could be a match. Please submit a quick application if you have interest or explore more jobs below. Jobs are based on your preferences, profile, and activity on Indeed.',
    skip: true
  },
  cgiNjoynConfirmation: {
    subject: 'Job Application Acknowledgement - Senior Project Manager, J0925-0822',
    from: 'CGI <help.candidate@njoyn.com>',
    body: 'Dear Thomas Maerz, thank you for your interest in a career with CGI. We are pleased to confirm the receipt of your resume in response to the job opportunity J0925-0822 - Senior Project Manager.',
    skip: false
  },
  cgiIndeedDigestNoise: {
    subject: 'CGI is hiring for Infrastructure/IT Project Manager + 6 new jobs',
    from: 'Indeed <jobalert@indeed.com>',
    body: 'New jobs matching your profile. Apply now to CGI and explore more jobs below.',
    skip: true
  },
  genericStartApplicationDigestNoise: {
    subject: 'Project Manager at Acme and 4 more new jobs',
    from: 'Indeed <jobalert@indeed.com>',
    body: 'Start your application for Project Manager at Acme and explore more jobs below. Jobs are based on your profile and preferences.',
    skip: true
  },
  incomeSupportApplicationNoise: {
    subject: 'Confirmation: Income Support Application Submitted',
    from: 'ALSS-Notification <alssnotification@gov.ab.ca>',
    body: 'This email confirms that your application for Income Support was successfully submitted. A support worker will review your eligibility for benefits.',
    skip: true
  },
  pmpProfileJobApplication: {
    subject: 'Your application to Technical Project Manager at Acme',
    from: 'LinkedIn <jobs-noreply@linkedin.com>',
    body: 'Your application to Technical Project Manager at Acme has an update. Profile: Thomas Maerz, PMP.',
    skip: false
  },
  linkedInRecruiterDigest: {
    subject: 'Evan just messaged you',
    from: 'LinkedIn <messaging-digest-noreply@linkedin.com>',
    body: 'Evan from TEKsystems sent you a message about a Senior Project Manager contract opportunity with a client. Please send your resume if interested.',
    skip: false
  },
  candidateProfileBeforeInterview: {
    subject: 'Complete Your Konica Minolta Candidate Profile',
    from: 'Konica Minolta Careers <careers@konicaminolta.com>',
    body: 'Please complete your candidate profile before your interview next steps for the Solutions Architect position.',
    skip: false
  },
  applicationOtpResubmit: {
    subject: 'Security code for your application to NetBrain',
    from: 'Greenhouse <no-reply@us.greenhouse-mail.io>',
    body: 'Copy and paste this code into the security code field on your application. After you enter the code, resubmit your application.',
    skip: false
  },
  userSentResumeToRecruiter: {
    subject: 'Resume & Call Tomorrow – Infrastructure Project Manager @ Gibson',
    from: 'Thomas Maerz <maerz.thomas@gmail.com>',
    body: 'Hi Jenn, thanks for setting up time to connect tomorrow. I have attached my resume ahead of our call for the Infrastructure Project Manager role.',
    skip: false
  },
  userSentResumeFeedbackNoise: {
    subject: 'Zeiss Position',
    from: 'Thomas Maerz <maerz.thomas@gmail.com>',
    body: 'Would you please review my resume and cover letter to provide feedback for the position I am applying for?',
    skip: true
  },
  userSentResumeAliasAddress: {
    subject: 'Resume follow-up for Senior Project Manager role',
    from: 'Thomas Maerz <thomas.maerz+jobs@gmail.com>',
    body: 'Hi Jenn, following up and sharing my resume for the Senior Project Manager role with your client.',
    skip: false
  },
  telusHealthConsumerMarketingNoise: {
    subject: '🩺 Quick Access to Doctor Appointments through TELUS Health MyCare',
    from: 'TELUS <telus@email.telus.com>',
    body: 'TELUS Health MyCare doctors may be unable to prescribe medications that require an in-person assessment by a physician.',
    skip: true
  },
  creditKarmaLoanMarketingNoise: {
    subject: 'A $10,000 vacation could be yours, Thomas adam',
    from: 'Credit Karma <notifications@creditkarma.ca>',
    body: 'Your loan amount and APR depends on the assessment of your credit profile. You do not need to obtain a loan to qualify.',
    skip: true
  },
  deloitteCareerDigestNoise: {
    subject: 'New career opportunities with Deloitte',
    from: 'deloitte-jobnotification@noreply.jobs2web.com',
    body: 'Technical Cyber Risk Assessment Manager, Deloitte Global Technology - Toronto. Feel free to forward these jobs to your family or friends. Getting these notifications too often?',
    skip: true
  },
  randstadCareerAdviceNewsletterNoise: {
    subject: 'Conquer your job interview: tough questions, AI tools, and chatbot prep 📂',
    from: 'Randstad Canada <noreply@randstad.ca>',
    body: 'Stop fearing the interview. Get expert answers for curveball questions and learn how to practice with AI.',
    skip: true
  },
  mastercardTalentCommunityProfileNoise: {
    subject: 'Update your profile for 2026',
    from: 'Mastercard <talent@careers.mastercard.com>',
    body: 'Update your talent community profile and upload your latest resume/CV so we can match you with the right roles.',
    skip: true
  },
  walmartRewardsCardApplicationNoise: {
    subject: 'Thomas Adam Maerz, a message about your Walmart Rewards Mastercard application.',
    from: 'Walmart Rewards Mastercard <info@walmart-rewards.ca>',
    body: 'Thank you for applying for a Walmart Rewards Mastercard. We are sorry, a Walmart Rewards Mastercard cannot be issued to you at this time.',
    skip: true
  },
  ctoCraftCommunityApplicationNoise: {
    subject: 'Your membership application for CTO Craft',
    from: 'Andy at CTO Craft <no-reply.otgsqa@zapiermail.com>',
    body: 'Thank you for requesting to join the CTO Craft Community. We will be reviewing your full application shortly for access to our private community Slack group.',
    skip: true
  },
  workbcWorkshopAppointmentNoise: {
    subject: 'WorkBC Appointment and Workshop Reminder',
    from: 'Rebecca Burdo Steen <rebecca.burdosteen@ethoscmg.com>',
    body: 'Appointment with Senik. Interview Skills Workshop. If you need to change this appointment, please call the WorkBC office.',
    skip: true
  },
  mcgCareerWorkshopNoise: {
    subject: '(Virtual) Job Club Workshop October 29, 2025',
    from: 'Tawa Awojobi <jp@mcgcareers.com>',
    body: 'Please find the workshop link below. Virtual Job Club Workshop. Career, Employment and Training Specialists.',
    skip: true
  },
  roadTestAppointmentNoise: {
    subject: 'Alberta Road Test Confirmation For 1:00pm on Monday September 15, 2025',
    from: 'Alberta Road Tests <noreply@albertadriverexaminer.ca>',
    body: 'You must arrive 30 minutes prior to your road test appointment. Failure to arrive ahead of your scheduled appointment may result in cancellation.',
    skip: true
  },
  missouriAdmissionsActionNeededNoise: {
    subject: 'Your Missouri S&T Application Status - Action Needed',
    from: 'Missouri University of Science and Technology <admissions@mst.edu>',
    body: 'Thank you for your application to Missouri University of Science and Technology. College Transcript is required for admissions review.',
    skip: true
  },
  genericCandidateAccountCreatedNoise: {
    subject: 'Deloitte Canada career site account created',
    from: 'Deloitte Canada Careers <noreply@deloitte.ca>',
    body: 'Your candidate account has been created. You can login to the Deloitte Canada career site after you have activated your account.',
    skip: true
  },
  linkedInApplicationViewedSignal: {
    subject: 'Your application was viewed by Intelica Solutions Inc.',
    from: 'LinkedIn <jobs-noreply@linkedin.com>',
    body: 'Your application was viewed by Intelica Solutions Inc. This email was intended for Thomas Maerz.',
    skip: false,
    status: 'Status Update',
    company: 'Intelica Solutions Inc.'
  },
  cityOfCalgarySpecificRejectionSignal: {
    subject: 'City of Calgary Job Posting 312587, Project Manager - AMENDMENT has closed',
    from: '<donotreply@calgary.ca>',
    body: 'We have reviewed your application for the position of Project Manager - AMENDMENT. After careful consideration, we will not be considering you for this position at this time.',
    skip: false,
    status: 'Rejected',
    title: 'Project Manager - AMENDMENT'
  },
  teksystemsApplicationFollowUpSignal: {
    subject: 'TEKsystems Position',
    from: '"Zeitzmann, Evan" <ezeitzma@teksystems.com>',
    body: 'Thanks for reaching back out. Here is the position that you applied to. City of Calgary Google Workspace and AWS infrastructure Lead Architect.',
    skip: false,
    status: 'Status Update',
    title: 'Lead Architect'
  },
  amazonKeepTrackApplicationSignal: {
    subject: 'Keep track of your application',
    from: 'noreply@mail.amazon.jobs',
    body: 'Hi Thomas, Thank you for your interest in Delivery Consultant - Connect and Lex, Amazon Connect Center of Excellence.',
    skip: false,
    status: 'Applied',
    title: 'Delivery Consultant - Connect and Lex, Amazon Connect Center of Excellence'
  },
  userSentDirectApplicationSignal: {
    subject: 'Workday Project Manager (#250804) Application',
    from: 'Thomas Maerz <maerz.thomas@gmail.com>',
    body: 'When reading your posted job listing for a PM for Workday, I had to reach out as I have skills and experience which closely match your requirements.',
    skip: false,
    status: 'Response'
  },
  realTechnicalInterviewPrepSignal: {
    subject: 'Preparing for a technical interview with us',
    from: 'Talent <talent@acme.com>',
    body: 'We would like to schedule an interview for your application and share details about preparing for a technical interview with us.',
    skip: false,
    status: 'Interview Request'
  },
  careerServicesSpecificApplicationSignal: {
    subject: 'Application update from WorkBC partner employer',
    from: 'Senik Shahcheraghi <senik.shahcheraghi@ethoscmg.com>',
    body: 'WorkBC follow-up: we received your application for the Cafe Manager role and the employer is reviewing it.',
    skip: false,
    status: 'Applied'
  },
  candidateProfileTiedToNamedRoleSignal: {
    subject: 'Complete your candidate profile for Project Manager application',
    from: 'Recruiting <recruiting@acme.com>',
    body: 'Please complete your candidate profile for your Project Manager application before your interview next step.',
    skip: false
  },
  genericViewedByEmployersNoise: {
    subject: 'Your application was viewed by employers',
    from: 'Job Platform <jobs@example.com>',
    body: 'Your application was viewed by employers and recruiters. Upgrade your profile to get more views.',
    skip: true
  },
  medicalDeviceRecruiterOutreachSignal: {
    subject: 'Medical device client needs a Senior Project Manager',
    from: 'Hays Recruiter <recruiter@hays.ca>',
    body: 'Hi Thomas, we are recruiting for a medical device client that is hiring a Senior Project Manager. Your profile looks aligned with this role.',
    skip: false
  },
  careerServicesMentionAppliedJobNoise: {
    subject: 'Job Club Workshop follow-up',
    from: 'WorkBC <advisor@workbc.example.com>',
    body: 'In tomorrow\'s workshop we will discuss how to follow up on the job that you applied to and improve your resume.',
    skip: true
  },
  genericViewedByHiringTeamNoise: {
    subject: 'Your application was viewed by the hiring team',
    from: 'Job Platform <jobs@example.com>',
    body: 'Your application was viewed by the hiring team. Upgrade your profile to get more views.',
    skip: true
  },
  assessmentInvitationSignal: {
    subject: 'Assessment invitation',
    from: 'Talent <talent@acme.com>',
    body: 'Please complete your assessment for your active application.',
    skip: false,
    status: 'Assessment'
  },
  softFinancialApplicationNoise: {
    subject: 'Thank you for your application',
    from: 'Credit Provider <offers@credit.example.com>',
    body: 'Thank you for your application. Your annual percentage rate depends on your credit profile.',
    skip: true
  },
  aprilRecruiterOutreachSignal: {
    subject: 'Senior Project Manager role - April start',
    from: 'Hays Recruiter <recruiter@hays.ca>',
    body: 'We are hiring for a Senior Project Manager position with an April start date.',
    skip: false
  },
  genericViewedByEmployerNoise: {
    subject: 'Your application was viewed by an employer',
    from: 'Job Platform <jobs@example.com>',
    body: 'Your application was viewed by an employer. Upgrade your profile to get more views.',
    skip: true
  },
  specificFinancialApplicationNoise: {
    subject: 'Your application to Walmart Rewards Mastercard has been received',
    from: 'Walmart Rewards Mastercard <info@walmart-rewards.ca>',
    body: 'Your application to Walmart Rewards Mastercard has been received. Your annual percentage rate depends on your credit profile.',
    skip: true
  },
  genericViewedByTheRecruiterNoise: {
    subject: 'Your application was viewed by the recruiter',
    from: 'Job Platform <jobs@example.com>',
    body: 'Your application was viewed by the recruiter. Upgrade your profile to get more views.',
    skip: true
  },
  financialRejectionNoise: {
    subject: 'Your Walmart Rewards Mastercard application will not be moving forward',
    from: 'Walmart Rewards Mastercard <info@walmart-rewards.ca>',
    body: 'Your Walmart Rewards Mastercard application will not be moving forward at this time.',
    skip: true
  },
  financialAssessmentNoise: {
    subject: 'Complete your assessment for your credit profile',
    from: 'Credit Provider <offers@credit.example.com>',
    body: 'Complete your assessment for your credit profile and card application.',
    skip: true
  },
  genericViewedByThreeEmployersNoise: {
    subject: 'Your application was viewed by 3 employers',
    from: 'Job Platform <jobs@example.com>',
    body: 'Your application was viewed by 3 employers. Upgrade your profile to get more views.',
    skip: true
  },
  mortgageApplicationRejectionNoise: {
    subject: 'Your mortgage application will not be moving forward',
    from: 'Bank <mortgages@bank.example.com>',
    body: 'Your mortgage application will not be moving forward at this time.',
    skip: true
  },
  creditApplicationAssessmentNoise: {
    subject: 'Your credit application requires an assessment',
    from: 'Credit Provider <offers@credit.example.com>',
    body: 'Your credit application requires an assessment before we can continue.',
    skip: true
  },
  visaApplicationReceivedNoise: {
    subject: 'Your visa application has been received',
    from: 'Consulate <noreply@consulate.example.com>',
    body: 'Your visa application has been received.',
    skip: true
  },
  linkedInViewedWithGenericFooterSignal: {
    subject: 'Your application was viewed by Intelica Solutions Inc.',
    from: 'LinkedIn <jobs-noreply@linkedin.com>',
    body: 'Your application was viewed by Intelica Solutions Inc. Job platform summary: your application was viewed by employers and recruiters.',
    skip: false
  },
  genericViewedByCommaActorListNoise: {
    subject: 'Your application was viewed by employers, recruiters, and hiring managers.',
    from: 'Job Platform <jobs@example.com>',
    body: 'Your application was viewed by employers, recruiters, and hiring managers. Upgrade your profile to get more views.',
    skip: true
  },
  basicFirstAidAssessmentNoise: {
    subject: 'Complete your assessment for Basic First Aid',
    from: 'Training Centre <info@training.example.com>',
    body: 'Complete your assessment for Basic First Aid at the training centre.',
    skip: true
  },
  ebookApplicationNoise: {
    subject: 'Thank you for your application for the ebook',
    from: 'Training Centre <info@training.example.com>',
    body: 'Thank you for your application for the ebook.',
    skip: true
  },
  physicianAssessmentNoise: {
    subject: 'Complete your assessment for your physician assessment',
    from: 'Health Provider <care@health.example.com>',
    body: 'Complete your assessment for your physician assessment.',
    skip: true
  },
  facebookApplicationLifecycleSignal: {
    subject: 'Your application to Product Manager at Facebook has been received',
    from: 'Meta Careers <careers@meta.com>',
    body: 'Thank you for applying. Your application to Product Manager at Facebook has been received.',
    skip: false
  }
};

function assertTrackerEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(label + ': expected ' + expected + ', got ' + actual);
}

function createBroadGapTestRange_(sheet, row, col, numRows, numCols) {
  return {
    getValues: function() {
      const values = [];
      for (let r = 0; r < numRows; r++) {
        const outputRow = [];
        for (let c = 0; c < numCols; c++) {
          outputRow.push((sheet.rows[row - 1 + r] || [])[col - 1 + c] || '');
        }
        values.push(outputRow);
      }
      return values;
    },
    setValues: function(values) {
      for (let r = 0; r < values.length; r++) {
        const targetRow = row - 1 + r;
        if (!sheet.rows[targetRow]) sheet.rows[targetRow] = [];
        for (let c = 0; c < values[r].length; c++) {
          sheet.rows[targetRow][col - 1 + c] = values[r][c];
        }
      }
      return this;
    },
    setBackground: function() { return this; },
    setFontColor: function() { return this; },
    setFontWeight: function() { return this; },
    setHorizontalAlignment: function() { return this; },
    setVerticalAlignment: function() { return this; },
    setBackgrounds: function() { return this; },
    setFontColors: function() { return this; },
    setBorder: function() { return this; },
    createFilter: function() { return this; }
  };
}

function createBroadGapTestSheet_(rows) {
  return {
    rows: rows || [],
    getLastRow: function() { return this.rows.length; },
    getLastColumn: function() {
      let max = 0;
      for (let i = 0; i < this.rows.length; i++) max = Math.max(max, this.rows[i].length);
      return max || 1;
    },
    getRange: function(row, col, numRows, numCols) { return createBroadGapTestRange_(this, row, col, numRows, numCols); },
    clear: function() { this.rows = []; return this; },
    autoResizeColumns: function() { return this; },
    hideColumn: function() { return this; },
    setRowHeights: function() { return this; },
    setFrozenRows: function() { return this; }
  };
}

function createBroadGapTestSpreadsheet_(sheets) {
  return {
    id: 'test-spreadsheet-id',
    name: 'Application Tracker',
    url: 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id/edit',
    sheets: sheets || {},
    getId: function() { return this.id; },
    getName: function() { return this.name; },
    getUrl: function() { return this.url; },
    getSheetByName: function(name) { return this.sheets[name] || null; },
    insertSheet: function(name) {
      this.sheets[name] = createBroadGapTestSheet_([]);
      return this.sheets[name];
    },
    deleteSheet: function(sheet) {
      for (const name in this.sheets) {
        if (this.sheets[name] === sheet) delete this.sheets[name];
      }
    }
  };
}

function testGeminiBroadGapResumeUsesStoredTargetSpreadsheet_() {
  const propertyStore = { broad_gap_target_spreadsheet_id: 'sheet-primary' };
  const selectedSpreadsheet = createBroadGapTestSpreadsheet_({});
  selectedSpreadsheet.id = 'sheet-primary';
  selectedSpreadsheet.url = 'https://docs.google.com/spreadsheets/d/sheet-primary/edit';
  let openedId = null;

  withBroadGapClassificationStubs_(propertyStore, function() {
    const originalOpenById = SpreadsheetApp.openById;
    SpreadsheetApp.openById = function(spreadsheetId) {
      openedId = spreadsheetId;
      return selectedSpreadsheet;
    };

    try {
      const spreadsheet = resolveBroadGapSpreadsheet_(true, PropertiesService.getScriptProperties());
      assertTrackerEqual(spreadsheet.getId(), 'sheet-primary', 'BroadGap resume returns stored target spreadsheet');
    } finally {
      SpreadsheetApp.openById = originalOpenById;
    }
  });

  assertTrackerEqual(openedId, 'sheet-primary', 'BroadGap resume opens stored target spreadsheet ID instead of active/fallback context');
  assertTrackerEqual(propertyStore.broad_gap_target_spreadsheet_id, 'sheet-primary', 'BroadGap resume keeps target spreadsheet binding while work may continue');
}

function testGeminiBroadGapResumeRejectsStoredTargetFallback_() {
  const propertyStore = { broad_gap_target_spreadsheet_id: 'sheet-primary' };

  withBroadGapClassificationStubs_(propertyStore, function() {
    const originalOpenById = SpreadsheetApp.openById;
    const originalGetOrCreateSpreadsheet = getOrCreateSpreadsheet;
    SpreadsheetApp.openById = function() { throw new Error('stored spreadsheet unavailable'); };
    getOrCreateSpreadsheet = function() {
      const fallbackSpreadsheet = createBroadGapTestSpreadsheet_({});
      fallbackSpreadsheet.id = 'fallback-sheet';
      return fallbackSpreadsheet;
    };

    try {
      try {
        resolveBroadGapSpreadsheet_(true, PropertiesService.getScriptProperties());
        throw new Error('BroadGap resume unexpectedly accepted fallback spreadsheet');
      } catch (e) {
        assertTrackerEqual(String(e).indexOf('stored spreadsheet unavailable') !== -1, true, 'BroadGap resume fails instead of falling back when stored target cannot open');
      }
    } finally {
      SpreadsheetApp.openById = originalOpenById;
      getOrCreateSpreadsheet = originalGetOrCreateSpreadsheet;
    }
  });
}

function testGeminiBroadGapManualTargetChangeClearsOldResumeState_() {
  const propertyStore = {
    broad_gap_target_spreadsheet_id: 'sheet-old',
    gap_extraction_start: '250',
    gap_classification_next_index: '450'
  };
  const selectedSpreadsheet = createBroadGapTestSpreadsheet_({});
  selectedSpreadsheet.id = 'sheet-new';

  withBroadGapClassificationStubs_(propertyStore, function() {
    const originalGetOrCreateSpreadsheet = getOrCreateSpreadsheet;
    getOrCreateSpreadsheet = function() { return selectedSpreadsheet; };

    try {
      resolveBroadGapSpreadsheet_(false, PropertiesService.getScriptProperties());
    } finally {
      getOrCreateSpreadsheet = originalGetOrCreateSpreadsheet;
    }
  });

  assertTrackerEqual(propertyStore.broad_gap_target_spreadsheet_id, 'sheet-new', 'BroadGap manual start refreshes target binding');
  assertTrackerEqual(propertyStore.gap_extraction_start, undefined, 'BroadGap manual target change clears stale extraction state');
  assertTrackerEqual(propertyStore.gap_classification_next_index, undefined, 'BroadGap manual target change clears stale classification state');
}

function testGeminiBroadGapLockUnavailableBindsManualTargetBeforeResume_() {
  const propertyStore = {};
  const selectedSpreadsheet = createBroadGapTestSpreadsheet_({});
  selectedSpreadsheet.id = 'sheet-primary';
  const triggerCalls = [];

  withBroadGapClassificationStubs_(propertyStore, function() {
    const originalGetScriptLock = LockService.getScriptLock;
    const originalGetOrCreateSpreadsheet = getOrCreateSpreadsheet;
    const originalNewTrigger = ScriptApp.newTrigger;
    LockService.getScriptLock = function() {
      return { tryLock: function() { return false; }, releaseLock: function() { throw new Error('releaseLock should not run when lock is unavailable'); } };
    };
    getOrCreateSpreadsheet = function() { return selectedSpreadsheet; };
    ScriptApp.newTrigger = function(handler) {
      const call = { handler: handler };
      triggerCalls.push(call);
      return {
        timeBased: function() { return this; },
        after: function() { return this; },
        create: function() { call.created = true; return this; }
      };
    };

    try {
      runGeminiBroadGapAuditWithLock_(false);
    } finally {
      LockService.getScriptLock = originalGetScriptLock;
      getOrCreateSpreadsheet = originalGetOrCreateSpreadsheet;
      ScriptApp.newTrigger = originalNewTrigger;
    }
  });

  assertTrackerEqual(propertyStore.broad_gap_target_spreadsheet_id, 'sheet-primary', 'BroadGap lock-unavailable manual start binds target before scheduling resume');
  assertTrackerEqual(triggerCalls.length, 1, 'BroadGap lock-unavailable manual start schedules one resume');
  assertTrackerEqual(triggerCalls[0].handler, 'resumeGeminiBroadGapAudit', 'BroadGap lock-unavailable manual start schedules resume handler');
}

function testBroadGapClassificationNoCacheClearsTargetBinding_() {
  const propertyStore = {
    broad_gap_target_spreadsheet_id: 'sheet-primary',
    gap_extraction_start: '250',
    gap_classification_next_index: '450'
  };
  const spreadsheet = createBroadGapTestSpreadsheet_({});

  withBroadGapClassificationStubs_(propertyStore, function() {
    runGeminiBroadGapClassification(spreadsheet, Date.now(), GEMINI_BROAD_GAP_CONFIG.maxRuntimeMs, GEMINI_BROAD_GAP_CONFIG.stopBufferMs, 0);
  });

  assertTrackerEqual(propertyStore.broad_gap_target_spreadsheet_id, undefined, 'BroadGap no-cache classification clears target binding when no resume is pending');
  assertTrackerEqual(propertyStore.gap_extraction_start, undefined, 'BroadGap no-cache classification clears stale extraction state');
  assertTrackerEqual(propertyStore.gap_classification_next_index, undefined, 'BroadGap no-cache classification clears stale classification state');
}

function testBroadGapClassificationCompletionClearsStaleExtractionState_() {
  const propertyStore = { gap_extraction_start: '250' };
  const spreadsheet = createBroadGapTestSpreadsheet_({
    BroadSearchDB: createBroadGapTestSheet_(createBroadGapCacheRows_())
  });

  withBroadGapClassificationStubs_(propertyStore, function() {
    GeminiClient.classifyBatch = function(batch) {
      return batch.map(function(item) {
        return { idx: item.idx, rel: true, cat: 'APPLIED', rea: 'Application confirmation.', co: 'Acme', ti: 'Engineer' };
      });
    };

    runGeminiBroadGapClassification(spreadsheet, Date.now(), GEMINI_BROAD_GAP_CONFIG.maxRuntimeMs, GEMINI_BROAD_GAP_CONFIG.stopBufferMs, 0);
  });

  assertTrackerEqual(propertyStore.gap_extraction_start, undefined, 'BroadGap full classification completion clears stale extraction state');
}

function withBroadGapClassificationStubs_(propertyStore, callback) {
  const originalGetScriptProperties = PropertiesService.getScriptProperties;
  const originalGetProjectTriggers = ScriptApp.getProjectTriggers;
  const originalDeleteTrigger = ScriptApp.deleteTrigger;
  const originalNewTrigger = ScriptApp.newTrigger;
  const originalClassifyBatch = GeminiClient.classifyBatch;
  const originalBatchSize = GEMINI_CONFIG.batchSize;

  const scriptProperties = {
    getProperty: function(key) {
      return Object.prototype.hasOwnProperty.call(propertyStore, key) ? propertyStore[key] : null;
    },
    setProperty: function(key, value) { propertyStore[key] = String(value); },
    deleteProperty: function(key) { delete propertyStore[key]; }
  };

  PropertiesService.getScriptProperties = function() { return scriptProperties; };
  ScriptApp.getProjectTriggers = function() { return []; };
  ScriptApp.deleteTrigger = function() {};
  ScriptApp.newTrigger = function() {
    return {
      timeBased: function() { return this; },
      after: function() { return this; },
      create: function() { return this; }
    };
  };

  try {
    callback();
  } finally {
    PropertiesService.getScriptProperties = originalGetScriptProperties;
    ScriptApp.getProjectTriggers = originalGetProjectTriggers;
    ScriptApp.deleteTrigger = originalDeleteTrigger;
    ScriptApp.newTrigger = originalNewTrigger;
    GeminiClient.classifyBatch = originalClassifyBatch;
    GEMINI_CONFIG.batchSize = originalBatchSize;
  }
}

function createBroadGapCacheRows_() {
  return [
    ['Thread ID', 'Date', 'From', 'Subject', 'Snippet'],
    ['thread-1', '2026-01-01T00:00:00.000Z', 'Careers <careers@acme.com>', 'Application submitted', 'Your application was submitted successfully.'],
    ['thread-2', '2026-01-02T00:00:00.000Z', 'Careers <careers@example.com>', 'Interview invitation', 'We would like to schedule an interview.']
  ];
}

function testBroadGapClassificationPersistsBatchBeforeError_() {
  const propertyStore = {};
  const spreadsheet = createBroadGapTestSpreadsheet_({
    BroadSearchDB: createBroadGapTestSheet_(createBroadGapCacheRows_())
  });

  withBroadGapClassificationStubs_(propertyStore, function() {
    GEMINI_CONFIG.batchSize = 1;
    let calls = 0;
    GeminiClient.classifyBatch = function(batch) {
      calls++;
      if (calls === 2) throw new Error('forced Gemini failure');
      return [{ idx: batch[0].idx, rel: true, cat: 'APPLIED', rea: 'Application confirmation.', co: 'Acme', ti: 'Engineer' }];
    };

    runGeminiBroadGapClassification(spreadsheet, Date.now(), GEMINI_BROAD_GAP_CONFIG.maxRuntimeMs, GEMINI_BROAD_GAP_CONFIG.stopBufferMs, 0);
  });

  const outputSheet = spreadsheet.getSheetByName('BroadGapLLM');
  assertTrackerEqual(!!outputSheet, true, 'BroadGap classification creates output before later Gemini failure');
  assertTrackerEqual(outputSheet.rows.length, 2, 'BroadGap classification persists successful batch before later Gemini failure');
  assertTrackerEqual(outputSheet.rows[0][0], 'Thread ID', 'BroadGap persisted output includes header');
  assertTrackerEqual(outputSheet.rows[1][0], 'thread-1', 'BroadGap persisted output includes successful thread');
  assertTrackerEqual(outputSheet.rows[1][7], 'PASS', 'BroadGap persisted output keeps Gemini decision mapping');
  assertTrackerEqual(outputSheet.rows[1][9], 'Applied', 'BroadGap persisted output keeps Gemini class mapping');
  assertTrackerEqual(propertyStore.gap_classification_next_index, '1', 'BroadGap classification resumes after last persisted batch');
}

function testBroadGapClassificationResumeMissingOutputStartsFresh_() {
  const propertyStore = { gap_classification_next_index: '1' };
  const spreadsheet = createBroadGapTestSpreadsheet_({
    BroadSearchDB: createBroadGapTestSheet_(createBroadGapCacheRows_())
  });

  withBroadGapClassificationStubs_(propertyStore, function() {
    GeminiClient.classifyBatch = function(batch) {
      return batch.map(function(item) {
        return { idx: item.idx, rel: true, cat: 'APPLIED', rea: 'Application confirmation.', co: 'Acme', ti: 'Engineer' };
      });
    };

    runGeminiBroadGapClassification(spreadsheet, Date.now(), GEMINI_BROAD_GAP_CONFIG.maxRuntimeMs, GEMINI_BROAD_GAP_CONFIG.stopBufferMs, 0);
  });

  const outputSheet = spreadsheet.getSheetByName('BroadGapLLM');
  assertTrackerEqual(outputSheet.rows[0][0], 'Thread ID', 'BroadGap missing resume output restarts with headers');
  assertTrackerEqual(outputSheet.rows.length, 3, 'BroadGap missing resume output restarts from first cached row');
  assertTrackerEqual(outputSheet.rows[1][0], 'thread-1', 'BroadGap missing resume output includes first cached row');
  assertTrackerEqual(outputSheet.rows[2][0], 'thread-2', 'BroadGap missing resume output includes second cached row');
  assertTrackerEqual(propertyStore.gap_classification_next_index, undefined, 'BroadGap complete classification clears resume index');
}

function testGeminiBroadGapLockUnavailableSchedulesResume_() {
  const originalGetScriptLock = LockService.getScriptLock;
  const originalGetProjectTriggers = ScriptApp.getProjectTriggers;
  const originalDeleteTrigger = ScriptApp.deleteTrigger;
  const originalNewTrigger = ScriptApp.newTrigger;
  const triggerCalls = [];

  LockService.getScriptLock = function() {
    return { tryLock: function() { return false; }, releaseLock: function() { throw new Error('releaseLock should not run when lock is unavailable'); } };
  };
  ScriptApp.getProjectTriggers = function() { return []; };
  ScriptApp.deleteTrigger = function() {};
  ScriptApp.newTrigger = function(handler) {
    const call = { handler: handler, afterMs: null, created: false };
    triggerCalls.push(call);
    return {
      timeBased: function() { return this; },
      after: function(ms) { call.afterMs = ms; return this; },
      create: function() { call.created = true; return this; }
    };
  };

  try {
    runGeminiBroadGapAuditWithLock_(true);
  } finally {
    LockService.getScriptLock = originalGetScriptLock;
    ScriptApp.getProjectTriggers = originalGetProjectTriggers;
    ScriptApp.deleteTrigger = originalDeleteTrigger;
    ScriptApp.newTrigger = originalNewTrigger;
  }

  assertTrackerEqual(triggerCalls.length, 1, 'Gemini Broad Gap lock unavailable schedules one resume');
  assertTrackerEqual(triggerCalls[0].handler, 'resumeGeminiBroadGapAudit', 'Gemini Broad Gap lock unavailable schedules resume handler');
  assertTrackerEqual(triggerCalls[0].afterMs, GEMINI_BROAD_GAP_CONFIG.resumeDelayMs, 'Gemini Broad Gap lock unavailable uses configured resume delay');
  assertTrackerEqual(triggerCalls[0].created, true, 'Gemini Broad Gap lock unavailable creates resume trigger');
}

function testGeminiBroadGapLockReleasesInFinally_() {
  const originalGetScriptLock = LockService.getScriptLock;
  const originalRunInternal = runGeminiBroadGapAuditInternal_;
  let released = false;

  LockService.getScriptLock = function() {
    return { tryLock: function() { return true; }, releaseLock: function() { released = true; } };
  };
  runGeminiBroadGapAuditInternal_ = function() { throw new Error('forced audit failure'); };

  try {
    try {
      runGeminiBroadGapAuditWithLock_();
      throw new Error('Gemini Broad Gap lock test did not propagate audit failure');
    } catch (e) {
      assertTrackerEqual(String(e).indexOf('forced audit failure') !== -1, true, 'Gemini Broad Gap lock propagates audit failure');
    }
  } finally {
    LockService.getScriptLock = originalGetScriptLock;
    runGeminiBroadGapAuditInternal_ = originalRunInternal;
  }

  assertTrackerEqual(released, true, 'Gemini Broad Gap lock releases in finally');
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
  assertTrackerEqual(shouldSkipMessage(f.recruiterOutreachWithDigestPhrase.subject, f.recruiterOutreachWithDigestPhrase.from, f.recruiterOutreachWithDigestPhrase.body), false, 'Recruiter outreach with digest phrase retained');
  assertTrackerEqual(shouldSkipMessage(f.recruiterFollowUp.subject, f.recruiterFollowUp.from, f.recruiterFollowUp.body), false, 'Recruiter follow-up retained');
  assertTrackerEqual(shouldSkipMessage(f.mastercardReferral.subject, f.mastercardReferral.from, f.mastercardReferral.body), false, 'Mastercard referral retained');
  assertTrackerEqual(shouldSkipMessage(f.smartRecruitersOtpNoise.subject, f.smartRecruitersOtpNoise.from, f.smartRecruitersOtpNoise.body), true, 'SmartRecruiters OTP skipped');
  assertTrackerEqual(shouldSkipMessage(f.loanApplicationNoise.subject, f.loanApplicationNoise.from, f.loanApplicationNoise.body), true, 'Loan application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.creditCardApplicationNoise.subject, f.creditCardApplicationNoise.from, f.creditCardApplicationNoise.body), true, 'Credit card application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.housingApplicationNoise.subject, f.housingApplicationNoise.from, f.housingApplicationNoise.body), true, 'Housing application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.studentPortalApplicationNoise.subject, f.studentPortalApplicationNoise.from, f.studentPortalApplicationNoise.body), true, 'Student portal application noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.universityApplicationConfirmationNoise.subject, f.universityApplicationConfirmationNoise.from, f.universityApplicationConfirmationNoise.body), true, 'University admissions application confirmation skipped');
  assertTrackerEqual(shouldSkipMessage(f.workdayCandidateAccountOtpNoise.subject, f.workdayCandidateAccountOtpNoise.from, f.workdayCandidateAccountOtpNoise.body), true, 'Workday candidate account OTP skipped');
  assertTrackerEqual(shouldSkipMessage(f.smartRecruitersCandidateAccountOtpNoise.subject, f.smartRecruitersCandidateAccountOtpNoise.from, f.smartRecruitersCandidateAccountOtpNoise.body), true, 'SmartRecruiters candidate account OTP skipped');
  assertTrackerEqual(shouldSkipMessage(f.mastercardCareerAdviceNoise.subject, f.mastercardCareerAdviceNoise.from, f.mastercardCareerAdviceNoise.body), true, 'Mastercard career advice skipped');
  assertTrackerEqual(shouldSkipMessage(f.indeedApplicationConfirmation.subject, f.indeedApplicationConfirmation.from, f.indeedApplicationConfirmation.body), false, 'Indeed application confirmation retained');
  assertTrackerEqual(shouldSkipMessage(f.applicationConfirmationWithDigestFooter.subject, f.applicationConfirmationWithDigestFooter.from, f.applicationConfirmationWithDigestFooter.body), false, 'Application confirmation with digest footer retained');
  assertTrackerEqual(shouldSkipMessage(f.rejectionWithDigestFooter.subject, f.rejectionWithDigestFooter.from, f.rejectionWithDigestFooter.body), false, 'Rejection with digest footer retained');
  assertTrackerEqual(shouldSkipMessage(f.interviewWithDigestFooter.subject, f.interviewWithDigestFooter.from, f.interviewWithDigestFooter.body), false, 'Interview with digest footer retained');
  assertTrackerEqual(shouldSkipMessage(f.nextRoundHiringProcessUpdate.subject, f.nextRoundHiringProcessUpdate.from, f.nextRoundHiringProcessUpdate.body), false, 'Next-round hiring-process update retained');
  assertTrackerEqual(shouldSkipMessage(f.admissionsJobApplication.subject, f.admissionsJobApplication.from, f.admissionsJobApplication.body), false, 'Admissions job application retained');
  assertTrackerEqual(shouldSkipMessage(f.universityEmployerApplicationFromAdmissionsSender.subject, f.universityEmployerApplicationFromAdmissionsSender.from, f.universityEmployerApplicationFromAdmissionsSender.body), false, 'University employer application from admissions sender retained');
  assertTrackerEqual(shouldSkipMessage(f.indeedInviteDigestNoise.subject, f.indeedInviteDigestNoise.from, f.indeedInviteDigestNoise.body), true, 'Indeed invite digest skipped');
  assertTrackerEqual(shouldSkipMessage(f.cgiNjoynConfirmation.subject, f.cgiNjoynConfirmation.from, f.cgiNjoynConfirmation.body), false, 'CGI Njoyn confirmation retained');
  assertTrackerEqual(shouldSkipMessage(f.cgiIndeedDigestNoise.subject, f.cgiIndeedDigestNoise.from, f.cgiIndeedDigestNoise.body), true, 'CGI Indeed digest skipped');
  assertTrackerEqual(shouldSkipMessage(f.genericStartApplicationDigestNoise.subject, f.genericStartApplicationDigestNoise.from, f.genericStartApplicationDigestNoise.body), true, 'Generic start application digest skipped');
  assertTrackerEqual(shouldSkipMessage(f.incomeSupportApplicationNoise.subject, f.incomeSupportApplicationNoise.from, f.incomeSupportApplicationNoise.body), true, 'Income Support application skipped');
  assertTrackerEqual(shouldSkipMessage(f.pmpProfileJobApplication.subject, f.pmpProfileJobApplication.from, f.pmpProfileJobApplication.body), false, 'PMP profile job application retained');
  assertTrackerEqual(shouldSkipMessage(f.linkedInRecruiterDigest.subject, f.linkedInRecruiterDigest.from, f.linkedInRecruiterDigest.body), false, 'LinkedIn recruiter digest retained');
  assertTrackerEqual(shouldSkipMessage(f.candidateProfileBeforeInterview.subject, f.candidateProfileBeforeInterview.from, f.candidateProfileBeforeInterview.body), false, 'Candidate profile before interview retained');
  assertTrackerEqual(shouldSkipMessage(f.applicationOtpResubmit.subject, f.applicationOtpResubmit.from, f.applicationOtpResubmit.body), false, 'Application OTP resubmit retained');
  assertTrackerEqual(shouldSkipMessage(f.userSentResumeToRecruiter.subject, f.userSentResumeToRecruiter.from, f.userSentResumeToRecruiter.body), false, 'User sent recruiter resume retained');
  assertTrackerEqual(shouldSkipMessage(f.userSentResumeAliasAddress.subject, f.userSentResumeAliasAddress.from, f.userSentResumeAliasAddress.body), false, 'User sent recruiter resume from alias retained');
  assertTrackerEqual(shouldSkipMessage(f.userSentResumeFeedbackNoise.subject, f.userSentResumeFeedbackNoise.from, f.userSentResumeFeedbackNoise.body), true, 'User sent resume feedback skipped');
  assertTrackerEqual(shouldSkipMessage(f.telusHealthConsumerMarketingNoise.subject, f.telusHealthConsumerMarketingNoise.from, f.telusHealthConsumerMarketingNoise.body), true, 'TELUS Health consumer marketing skipped');
  assertTrackerEqual(shouldSkipMessage(f.creditKarmaLoanMarketingNoise.subject, f.creditKarmaLoanMarketingNoise.from, f.creditKarmaLoanMarketingNoise.body), true, 'Credit Karma loan marketing skipped');
  assertTrackerEqual(shouldSkipMessage(f.deloitteCareerDigestNoise.subject, f.deloitteCareerDigestNoise.from, f.deloitteCareerDigestNoise.body), true, 'Deloitte career digest skipped');
  assertTrackerEqual(shouldSkipMessage(f.randstadCareerAdviceNewsletterNoise.subject, f.randstadCareerAdviceNewsletterNoise.from, f.randstadCareerAdviceNewsletterNoise.body), true, 'Randstad career advice newsletter skipped');
  assertTrackerEqual(shouldSkipMessage(f.mastercardTalentCommunityProfileNoise.subject, f.mastercardTalentCommunityProfileNoise.from, f.mastercardTalentCommunityProfileNoise.body), true, 'Mastercard talent community profile noise skipped');
  assertTrackerEqual(shouldSkipMessage(f.walmartRewardsCardApplicationNoise.subject, f.walmartRewardsCardApplicationNoise.from, f.walmartRewardsCardApplicationNoise.body), true, 'Walmart Rewards card application skipped');
  assertTrackerEqual(shouldSkipMessage(f.ctoCraftCommunityApplicationNoise.subject, f.ctoCraftCommunityApplicationNoise.from, f.ctoCraftCommunityApplicationNoise.body), true, 'CTO Craft community application skipped');
  assertTrackerEqual(shouldSkipMessage(f.workbcWorkshopAppointmentNoise.subject, f.workbcWorkshopAppointmentNoise.from, f.workbcWorkshopAppointmentNoise.body), true, 'WorkBC workshop appointment skipped');
  assertTrackerEqual(shouldSkipMessage(f.mcgCareerWorkshopNoise.subject, f.mcgCareerWorkshopNoise.from, f.mcgCareerWorkshopNoise.body), true, 'MCG career workshop skipped');
  assertTrackerEqual(shouldSkipMessage(f.roadTestAppointmentNoise.subject, f.roadTestAppointmentNoise.from, f.roadTestAppointmentNoise.body), true, 'Road test appointment skipped');
  assertTrackerEqual(shouldSkipMessage(f.missouriAdmissionsActionNeededNoise.subject, f.missouriAdmissionsActionNeededNoise.from, f.missouriAdmissionsActionNeededNoise.body), true, 'Missouri admissions application skipped');
  assertTrackerEqual(shouldSkipMessage(f.genericCandidateAccountCreatedNoise.subject, f.genericCandidateAccountCreatedNoise.from, f.genericCandidateAccountCreatedNoise.body), true, 'Generic candidate account creation skipped');

  assertTrackerEqual(shouldSkipMessage(f.linkedInApplicationViewedSignal.subject, f.linkedInApplicationViewedSignal.from, f.linkedInApplicationViewedSignal.body), false, 'LinkedIn application viewed retained');
  assertTrackerEqual(shouldSkipMessage(f.cityOfCalgarySpecificRejectionSignal.subject, f.cityOfCalgarySpecificRejectionSignal.from, f.cityOfCalgarySpecificRejectionSignal.body), false, 'City of Calgary specific rejection retained');
  assertTrackerEqual(shouldSkipMessage(f.teksystemsApplicationFollowUpSignal.subject, f.teksystemsApplicationFollowUpSignal.from, f.teksystemsApplicationFollowUpSignal.body), false, 'TEKsystems application follow-up retained');
  assertTrackerEqual(shouldSkipMessage(f.amazonKeepTrackApplicationSignal.subject, f.amazonKeepTrackApplicationSignal.from, f.amazonKeepTrackApplicationSignal.body), false, 'Amazon keep-track application retained');
  assertTrackerEqual(shouldSkipMessage(f.userSentDirectApplicationSignal.subject, f.userSentDirectApplicationSignal.from, f.userSentDirectApplicationSignal.body), false, 'User-sent direct application retained');
  assertTrackerEqual(StatusUtils.determineStatus(f.linkedInApplicationViewedSignal.subject, f.linkedInApplicationViewedSignal.body, ''), f.linkedInApplicationViewedSignal.status, 'LinkedIn application viewed status');
  assertTrackerEqual(StatusUtils.determineStatus(f.cityOfCalgarySpecificRejectionSignal.subject, f.cityOfCalgarySpecificRejectionSignal.body, ''), f.cityOfCalgarySpecificRejectionSignal.status, 'City of Calgary rejection status');
  assertTrackerEqual(CompanyUtils.extractCompany(f.linkedInApplicationViewedSignal.subject, f.linkedInApplicationViewedSignal.body, f.linkedInApplicationViewedSignal.from, ''), f.linkedInApplicationViewedSignal.company, 'LinkedIn application viewed company extraction');
  assertTrackerEqual(shouldSkipMessage(f.realTechnicalInterviewPrepSignal.subject, f.realTechnicalInterviewPrepSignal.from, f.realTechnicalInterviewPrepSignal.body), false, 'Real technical interview prep retained');
  assertTrackerEqual(shouldSkipMessage(f.careerServicesSpecificApplicationSignal.subject, f.careerServicesSpecificApplicationSignal.from, f.careerServicesSpecificApplicationSignal.body), false, 'Career-services specific application retained');
  assertTrackerEqual(shouldSkipMessage(f.candidateProfileTiedToNamedRoleSignal.subject, f.candidateProfileTiedToNamedRoleSignal.from, f.candidateProfileTiedToNamedRoleSignal.body), false, 'Candidate profile tied to named role retained');
  assertTrackerEqual(shouldSkipMessage(f.genericViewedByEmployersNoise.subject, f.genericViewedByEmployersNoise.from, f.genericViewedByEmployersNoise.body), true, 'Generic viewed-by-employers metric skipped');
  assertTrackerEqual(shouldSkipMessage(f.medicalDeviceRecruiterOutreachSignal.subject, f.medicalDeviceRecruiterOutreachSignal.from, f.medicalDeviceRecruiterOutreachSignal.body), false, 'Medical-device recruiter outreach retained');
  assertTrackerEqual(shouldSkipMessage(f.careerServicesMentionAppliedJobNoise.subject, f.careerServicesMentionAppliedJobNoise.from, f.careerServicesMentionAppliedJobNoise.body), true, 'Career-services applied-job workshop skipped');
  assertTrackerEqual(shouldSkipMessage(f.genericViewedByHiringTeamNoise.subject, f.genericViewedByHiringTeamNoise.from, f.genericViewedByHiringTeamNoise.body), true, 'Generic viewed-by-hiring-team metric skipped');
  assertTrackerEqual(shouldSkipMessage(f.assessmentInvitationSignal.subject, f.assessmentInvitationSignal.from, f.assessmentInvitationSignal.body), false, 'Assessment invitation retained');
  assertTrackerEqual(shouldSkipMessage(f.softFinancialApplicationNoise.subject, f.softFinancialApplicationNoise.from, f.softFinancialApplicationNoise.body), true, 'Soft financial application skipped');
  assertTrackerEqual(shouldSkipMessage(f.aprilRecruiterOutreachSignal.subject, f.aprilRecruiterOutreachSignal.from, f.aprilRecruiterOutreachSignal.body), false, 'April recruiter outreach retained');
  assertTrackerEqual(shouldSkipMessage(f.genericViewedByEmployerNoise.subject, f.genericViewedByEmployerNoise.from, f.genericViewedByEmployerNoise.body), true, 'Generic viewed-by-employer metric skipped');
  assertTrackerEqual(shouldSkipMessage(f.specificFinancialApplicationNoise.subject, f.specificFinancialApplicationNoise.from, f.specificFinancialApplicationNoise.body), true, 'Specific financial application skipped');
  assertTrackerEqual(shouldSkipMessage(f.genericViewedByTheRecruiterNoise.subject, f.genericViewedByTheRecruiterNoise.from, f.genericViewedByTheRecruiterNoise.body), true, 'Generic viewed-by-the-recruiter metric skipped');
  assertTrackerEqual(shouldSkipMessage(f.financialRejectionNoise.subject, f.financialRejectionNoise.from, f.financialRejectionNoise.body), true, 'Financial rejection skipped');
  assertTrackerEqual(shouldSkipMessage(f.financialAssessmentNoise.subject, f.financialAssessmentNoise.from, f.financialAssessmentNoise.body), true, 'Financial assessment skipped');
  assertTrackerEqual(shouldSkipMessage(f.genericViewedByThreeEmployersNoise.subject, f.genericViewedByThreeEmployersNoise.from, f.genericViewedByThreeEmployersNoise.body), true, 'Generic viewed-by-three-employers metric skipped');
  assertTrackerEqual(shouldSkipMessage(f.mortgageApplicationRejectionNoise.subject, f.mortgageApplicationRejectionNoise.from, f.mortgageApplicationRejectionNoise.body), true, 'Mortgage application rejection skipped');
  assertTrackerEqual(shouldSkipMessage(f.creditApplicationAssessmentNoise.subject, f.creditApplicationAssessmentNoise.from, f.creditApplicationAssessmentNoise.body), true, 'Credit application assessment skipped');
  assertTrackerEqual(shouldSkipMessage(f.visaApplicationReceivedNoise.subject, f.visaApplicationReceivedNoise.from, f.visaApplicationReceivedNoise.body), true, 'Visa application received skipped');
  assertTrackerEqual(shouldSkipMessage(f.linkedInViewedWithGenericFooterSignal.subject, f.linkedInViewedWithGenericFooterSignal.from, f.linkedInViewedWithGenericFooterSignal.body), false, 'LinkedIn viewed with generic footer retained');
  assertTrackerEqual(shouldSkipMessage(f.genericViewedByCommaActorListNoise.subject, f.genericViewedByCommaActorListNoise.from, f.genericViewedByCommaActorListNoise.body), true, 'Generic viewed-by-comma-actor-list metric skipped');
  assertTrackerEqual(shouldSkipMessage(f.basicFirstAidAssessmentNoise.subject, f.basicFirstAidAssessmentNoise.from, f.basicFirstAidAssessmentNoise.body), true, 'Basic first aid assessment skipped');
  assertTrackerEqual(shouldSkipMessage(f.ebookApplicationNoise.subject, f.ebookApplicationNoise.from, f.ebookApplicationNoise.body), true, 'Ebook application skipped');
  assertTrackerEqual(shouldSkipMessage(f.physicianAssessmentNoise.subject, f.physicianAssessmentNoise.from, f.physicianAssessmentNoise.body), true, 'Physician assessment skipped');
  assertTrackerEqual(shouldSkipMessage(f.facebookApplicationLifecycleSignal.subject, f.facebookApplicationLifecycleSignal.from, f.facebookApplicationLifecycleSignal.body), false, 'Facebook application lifecycle retained');
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
  assertTrackerEqual(StatusUtils.determineStatus(f.rejectionWithDigestFooter.subject, f.rejectionWithDigestFooter.body, ''), f.rejectionWithDigestFooter.status, 'rejection with digest footer status');
  assertTrackerEqual(StatusUtils.determineStatus(f.interviewWithDigestFooter.subject, f.interviewWithDigestFooter.body, ''), f.interviewWithDigestFooter.status, 'interview with digest footer status');
  assertTrackerEqual(StatusUtils.determineStatus(f.nextRoundHiringProcessUpdate.subject, f.nextRoundHiringProcessUpdate.body, ''), f.nextRoundHiringProcessUpdate.status, 'next round hiring process is not rejection');
  assertTrackerEqual(getBatchSize(), SCAN_CONFIG.batchSize, 'batch size');
  assertTrackerEqual(GEMINI_BROAD_GAP_CONFIG.maxRuntimeMs, 6 * 60 * 1000, 'Gemini Broad Gap max runtime');
  assertTrackerEqual(GEMINI_BROAD_GAP_CONFIG.stopBufferMs, 30 * 1000, 'Gemini Broad Gap stop buffer');
  assertTrackerEqual(GEMINI_BROAD_GAP_CONFIG.classificationSafetyMs, 90 * 1000, 'Gemini Broad Gap classification safety');
  assertTrackerEqual(GEMINI_BROAD_GAP_CONFIG.resumeDelayMs, 60 * 1000, 'Gemini Broad Gap resume delay');
  const originalGetProjectTriggers = ScriptApp.getProjectTriggers;
  const originalDeleteTrigger = ScriptApp.deleteTrigger;
  const originalNewTrigger = ScriptApp.newTrigger;
  const triggerCalls = [];
  ScriptApp.getProjectTriggers = function() { return []; };
  ScriptApp.deleteTrigger = function() {};
  ScriptApp.newTrigger = function(handler) {
    const call = { handler: handler, afterMs: null, created: false };
    triggerCalls.push(call);
    return {
      timeBased: function() { return this; },
      after: function(ms) { call.afterMs = ms; return this; },
      create: function() { call.created = true; return this; }
    };
  };
  try {
    scheduleGeminiBroadGapResume_();
  } finally {
    ScriptApp.getProjectTriggers = originalGetProjectTriggers;
    ScriptApp.deleteTrigger = originalDeleteTrigger;
    ScriptApp.newTrigger = originalNewTrigger;
  }
  assertTrackerEqual(triggerCalls.length, 1, 'Gemini Broad Gap resume schedule creates one trigger');
  assertTrackerEqual(triggerCalls[0].handler, 'resumeGeminiBroadGapAudit', 'Gemini Broad Gap resume schedule uses resume handler');
  assertTrackerEqual(triggerCalls[0].afterMs, GEMINI_BROAD_GAP_CONFIG.resumeDelayMs, 'Gemini Broad Gap resume schedule uses configured delay');
  assertTrackerEqual(triggerCalls[0].created, true, 'Gemini Broad Gap resume schedule creates trigger');
  testBroadGapClassificationPersistsBatchBeforeError_();
  testBroadGapClassificationResumeMissingOutputStartsFresh_();
  testGeminiBroadGapResumeUsesStoredTargetSpreadsheet_();
  testGeminiBroadGapResumeRejectsStoredTargetFallback_();
  testGeminiBroadGapManualTargetChangeClearsOldResumeState_();
  testGeminiBroadGapLockUnavailableBindsManualTargetBeforeResume_();
  testBroadGapClassificationNoCacheClearsTargetBinding_();
  testBroadGapClassificationCompletionClearsStaleExtractionState_();
  testGeminiBroadGapLockUnavailableSchedulesResume_();
  testGeminiBroadGapLockReleasesInFinally_();
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
  assertTrackerEqual(mapGeminiCategoryToTrackerStatus_('RESPONSE'), 'Response', 'Gemini RESPONSE maps to tracker Response');
  const geminiPayload = buildGeminiClassificationPayload_([{ idx: '001', f: 'Thomas Maerz <maerz.thomas@gmail.com>', s: 'Accepted: Interview', sn: 'Accepted interview invitation.', pc: 'Acme', pt: 'Project Manager' }]);
  const geminiInstruction = geminiPayload.contents[0].parts[0].text;
  assertTrackerEqual(geminiInstruction.indexOf('- RESPONSE:') !== -1, true, 'Gemini prompt defines RESPONSE');
  assertTrackerEqual(geminiInstruction.indexOf('RESPONSE Boundary') !== -1, true, 'Gemini prompt guards RESPONSE boundary');
  assertTrackerEqual(geminiPayload.generationConfig.responseSchema.properties.results.items.properties.cat.enum.indexOf('RESPONSE') !== -1, true, 'Gemini schema permits RESPONSE');
  assertTrackerEqual(geminiInstruction.indexOf('your application was viewed by COMPANY') !== -1, true, 'Gemini prompt handles application viewed');
  assertTrackerEqual(geminiInstruction.indexOf('Non-Employment Application Boundary') !== -1, true, 'Gemini prompt defines non-employment boundary');
  assertTrackerEqual(geminiInstruction.indexOf('Generic account creation') !== -1 || geminiInstruction.indexOf('generic account creation') !== -1, true, 'Gemini prompt treats generic account creation as noise');

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
