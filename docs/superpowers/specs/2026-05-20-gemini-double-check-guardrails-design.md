# Spec: Gemini Double-Check Guardrails Upgrade

## Context
During the audit of the `BroadGapLLM` Google Sheet tab containing job application-related email data, Gemini 3.1 Flash Lite double-checks were compared against the initial Regex classifications. The audit revealed **67 classification errors** out of the 124 `FALSE_PASS` and `FALSE_SKIP` rows. 

The errors stemmed from systematic semantic hallucinations in Gemini's logic. This specification describes those findings and documents the optimized prompt updates applied to `/geminiUtils.gs` to address them without bloating the prompt.

## Findings & Error Categories

### 1. "Application" Keyword Ambiguity
Gemini incorrectly passed emails containing the word "application" but entirely unrelated to candidate recruitment:
* **Academic Admissions**: Missouri University of Science and Technology (S&T) admissions reminders and account setup emails.
* **Academic Graduation**: Inboxes containing graduation application approvals.
* **Driver Road Tests**: Alberta road test confirmations and booking status.
* **Professional Certifications**: Project Management Institute (PMI) PMP application submissions and approvals.

### 2. Career Coaching & Guidance Programs
Gemini confused employment assistance/coaching reminders with actual job submissions:
* Senders like **WorkBC**, **McBride Career Group (MCG Careers)**, and **Prospect Human Services** are coaching programs designed to assist the candidate, not direct employer job pipelines.

### 3. Professional Community Signups
Slack invitations and membership confirmations (e.g. **CTO Craft** community approvals) were incorrectly classified as active job applications.

### 4. Candidate Self-Correspondence
Sent emails from the candidate checking in or sending resumes (which are configured to be skipped in this tracker in favor of incoming mail) were passed.

### 5. Irrelevant Technical Roles
Generic outreach scrapes for junior/irrelevant technical roles (such as Desktop Support or Cisco Network Architect) that mismatched the candidate's senior profile (Senior Technical PM, PMP) were incorrectly classified as valid outreaches.

---

## Applied Solutions & Heuristic Integrations

The prompt in `geminiUtils.gs` was updated with compact parentheticals to prevent these errors while keeping token footprints minimal.

### A. Critical Guardrail Update (`Strict Application Focus`)
Modified Guardrail 1 to explicitly call out certification, university, government welfare (e.g., eSIN/Income Support), coaching services (WorkBC, MCG), and professional community Slack sign-ups:
```javascript
"1. Strict Application Focus: Only classify active incoming job/employment pipeline workflows (self-sent emails are strictly NOISE). Career coaching/guidance programs (e.g. WorkBC, MCG Careers), professional communities (e.g. CTO Craft Slack invites), university admissions (e.g. Missouri S&T), certification/graduation/driving applications (e.g. PMP, road tests), financial aid (e.g. Income Support), government welfare/SIN applications, or consumer marketing are strictly NOISE.\n"
```

### B. Recruiter Outreach Constraint (`Sourcing Validation`)
Optimized Classification Rule 3 to ensure outreaches match the candidate's senior profile and directly ignore automated junior scrapers:
```javascript
"3. Sourcing Validation: RECRUITER_OUTREACH requires personalized, direct 1-on-1 sourcing matching the candidate's senior profile (e.g. PM, PMP). Outreaches for completely irrelevant junior technical roles (e.g. Desktop Support, Field Technician) or generic automated talent blasts are strictly NOISE.\n"
```
