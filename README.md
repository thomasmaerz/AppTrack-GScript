# Job Application Tracker

<p align="center">
  <a href="https://docs.google.com/spreadsheets/d/1Ua5ceM5PYgIgHTctTdV5-S3uwWB0pzG1_yHwgBhyfVA/edit?usp=sharing">Google Sheets Tracker Template</a>
</p>
<p align="center">
  <img src= "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHExMjQ1Mmp1ejcxazdidzBzdm0xbG1tZmx2amttNmhkZjE4OTNiYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/haJ5ii4ALvt2zIOdKB/giphy.gif" alt="Tracker Demo GIF"/>
</p>

An automated Google Apps Script tool that helps you track and manage your job applications by scanning your Gmail inbox. Originally created by **Adam Rangwala**; this fork keeps the original idea and adds reliability-focused improvements for larger inboxes.

## Overview

The Job Application Tracker is a powerful Google Apps Script application that automatically scans your Gmail inbox for job application-related emails and organizes them into a structured Google Sheets dashboard. It detects different application statuses, extracts company and job title information, automatically generates draft replies to rejections and provides insightful visualizations of your job search progress.

## Features

- **Automatic Email Scanning**: Detects job application emails, interview invitations, assessments, and offer/rejection notices
- **Smart Data Extraction**: Extracts job titles, company names, and status updates from email content
- **Status Tracking**: Automatically categorizes applications into statuses like "Applied," "Assessment," "Interview Request," "Offer Received," or "Rejected"
- **Dynamic Dashboard**: Visualizes your application data with charts and graphs
- **Follow-up Tools**: Creates draft emails to follow up on rejections to maintain professional connections
- **Application Insights**: Analyzes job titles, application timing, and success rates
- **Fully Automated**: Runs daily to keep your application tracking up-to-date
- **Bounded Scans**: Processes Gmail in resumable batches so a large inbox does not exhaust Apps Script runtime
- **Privacy-Conscious Logs**: Reports compact counters instead of raw email bodies or sensitive URLs

## Getting Started

### Prerequisites

- A Google account
- A Gmail account used for submitting job applications

### Installation

**Option 1:** [Use the Template](https://docs.google.com/spreadsheets/d/1Ua5ceM5PYgIgHTctTdV5-S3uwWB0pzG1_yHwgBhyfVA/edit?usp=sharing)and follow the instructions

**Option 2:** Set up the the Extension yourself using the JS files in this repository 
1. Create a new Google Sheet
2. Name the first sheet "Instructions" and the second sheet "Applications"
3. Click on "Extensions" > "Apps Script" to open the script editor
4. Copy and paste each of the script files from this repository into separate script files in the Apps Script editor:
   - `main.gs` (Main script)
   - `extractionUtils.gs` (Company and job title extraction)
   - `statusUtils.gs` (Application status detection)
   - `spreadsheetUtils.gs` (Spreadsheet formatting)
   - `scanUtils.gs` (batching, query construction, resume state, skip rules)
   - `testFixtures.gs` (callable regression tests)
   - `applicationInsights.gs` (Analytics tools)
   - `jobTitleVisualization.gs` (Job title analysis)
5. Save all files
6. Return to your spreadsheet and refresh the page

### Setup

1. After refreshing, you should see a new menu item called "Job Tracker"
2. Click on "Job Tracker" > "Scan Emails" to run a normal recent scan
3. Click on "Job Tracker" > "Import Historical Emails" to process older backfill batches
4. Allow the necessary permissions when prompted
5. The script will automatically set up your spreadsheet with the correct headers and formatting
6. To enable daily automatic scanning, click "Job Tracker" > "Set up daily scanning"

## Advanced Features

### Rejection Follow-up Drafts

The tool can automatically create draft emails for rejected applications to help you maintain professional relationships. To use this feature:

1. Click "Job Tracker" > "Create Rejection Follow-up Drafts"
2. Review the created drafts in your Gmail drafts folder
3. Personalize and send as appropriate

## How It Works

1. **Email Detection**: The script uses a grouped Gmail search query with exclusions for common noise
2. **Information Extraction**: For each relevant email, it extracts:
   - Job title from the subject and body
   - Company name from the sender and content
   - Current application status based on email content
3. **Status Updates**: When follow-up emails arrive, it updates the status of existing applications
4. **Visualization**: Refreshes charts on demand so expensive presentation work does not slow ingestion

## Reliability Improvements

The scanner now separates fast ingestion from dashboard refreshes, processes a fixed batch at a time, and saves progress between runs. Normal scans use timestamp windows with a one-day overlap so newly arriving mail cannot shift the resume point; historical imports move through older thirty-day windows. Intentional overlap may re-read a few emails, but thread/application dedupe prevents duplicate rows. The changes were made because Apps Script has strict execution limits and Gmail searches can easily return hundreds of matching emails.

### What changed

- Bounded batches (50 threads by default) with resumable timestamp windows in `PropertiesService`
- A global, grouped query with exclusions for digests, promotions, password resets, and obvious bulk noise
- Skip rules before expensive parsing
- Batched insertion of new rows and reduced hot-path formatting work
- Targeted parsing for LinkedIn and Rogers/SuccessFactors-style confirmations
- Corrected status priority: offer → interview → assessment → rejection → applied/status update

### Challenges addressed

- Gmail result sets can be noisy and broad terms create false positives
- Large initial backfills can exceed runtime limits
- Some application emails use abbreviated titles or atypical body layouts
- Raw parser logging can leak private email content into cloud logs

## Status Categories

The tracker categorizes applications into the following statuses:

- **Applied**: Initial application confirmation
- **Status Update**: General updates without a specific status change
- **Assessment**: Technical assessments or skills tests
- **Interview Request**: Invitations for interviews
- **Offer Received**: Job offers
- **Rejected**: Application rejections

### Application Insights

The summary dashboard provides insights into your job search:

- Application activity timeline
- Applications by company
- Job title analysis
- Seniority level distribution
- Application funnel analysis
- Day-of-week application patterns

## Customization

You can customize the script by modifying:

- **Email Search Query**: Adjust the query builder in `scanUtils.gs` to refine which emails are detected
- **Status Detection Keywords**: Modify the status detection patterns in `statusUtils.gs`
- **Company/Job Title Extraction**: Update extraction patterns in `extractionUtils.gs`

## Troubleshooting

### No Applications Showing Up

If the script runs but no applications appear:
1. Ensure you've granted the script permission to access Gmail and Google Sheets
2. Check that your sheet is named "Applications" (case-sensitive)
3. Manually test the Gmail search query from `buildGmailSearchQuery('recent')` to make sure it finds job application emails
4. Check the logs in the Apps Script editor for any errors

### Script Authorization Issues

If you're having trouble with permissions:
1. Go to your Google Account's security settings
2. Remove the script's access
3. Run the script again and reauthorize

## Contributing / Feeback

Contributions to improve the Job Application Tracker are welcome! Please feel free to submit a pull request or open an issue to suggest improvements.
Feedback: Please [use the feedback form](https://docs.google.com/forms/d/e/1FAIpQLSfz4PxUTe7wPaL4At_qpSuxAMa3rP4GUGMmTYASDKkST71XtA/viewform?usp=dialog) to provide quick 2 minutes of feedback for me to help improve the app.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Original project and core tracker concept by [Adam Rangwala](https://github.com/adamrangwala)
- Built using Google Apps Script
- Inspired by the challenges of managing a modern job search process

## Testing

Run `runTrackerTests()` in the Apps Script editor after copying files. It covers representative LinkedIn confirmations and digests, Rogers-style confirmations, low-confidence titles, skip behavior, and status classification.
