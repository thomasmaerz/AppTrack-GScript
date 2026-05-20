# Local Setup, GCP Linkage & Gemini Execution Guide

This guide details how to configure `clasp` (Google Apps Script CLI), link your script to a standard GCP Project, enable GCP Logging and generative APIs, set up the required OAuth scopes, and run the Gemini broad gap audit locally from the command line.

---

## 1. Apps Script Global API Enablement
Before using `clasp` to manage or execute Apps Script projects, you must enable the Google Apps Script API on your Google account:
1. Navigate to [script.google.com/home/settings](https://script.google.com/home/settings).
2. Toggle the **Google Apps Script API** setting to **ON**.

---

## 2. GCP Project Setup via `gcloud` CLI
To enable Cloud Logging, the Apps Script Execution API, and the Generative Language API (Gemini), install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and run these terminal commands:

```bash
# 1. Login to your Google Cloud account
gcloud auth login

# 2. Set your active GCP project ID
gcloud config set project YOUR_GCP_PROJECT_ID

# 3. Enable the Apps Script Execution API (for clasp run)
gcloud services enable script.googleapis.com

# 4. Enable Cloud Logging API (for clasp logs)
gcloud services enable logging.googleapis.com

# 5. Enable the Generative Language API (for keyless Gemini access)
gcloud services enable generativelanguage.googleapis.com
```

---

## 3. Local Clasp Configuration
`clasp` reads its linkage credentials from the local `.clasp.json` file in the root of the project directory.

1. Ensure your `.clasp.json` contains both the standard Google Apps Script **`scriptId`** and your GCP **`projectId`**:
   ```json
   {
     "scriptId": "YOUR_APPS_SCRIPT_ID",
     "rootDir": ".",
     "projectId": "YOUR_GCP_PROJECT_ID"
   }
   ```
2. Log in locally to `clasp`:
   ```bash
   npx clasp login
   ```
3. Push your latest code changes to the remote container:
   ```bash
   npx clasp push
   ```

---

## 4. OAuth Scopes for Keyless Gemini Integration
To bypass traditional API key limitations and securely call the Gemini model under your Google Account identity, the project utilizes keyless OAuth.

### Required Scopes in `appsscript.json`
Your `appsscript.json` must declare the specific REST retriever scope under `"oauthScopes"`. This authorizes the Google Generative Language API to authenticate your script:
```json
{
  "timeZone": "America/Toronto",
  "exceptionLogging": "CLOUD",
  "runtimeVersion": "V8",
  "executionApi": {
    "access": "MYSELF"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/generative-language.retriever"
  ]
}
```

### The Keyless Dual-Handshake Authentication
In `geminiUtils.gs`, the API Client tries to authenticate using keyless OAuth credentials first. If this fails, it falls back to the static `gemini_api_key` stored in your script properties:
1. **OAuth REST Handshake**: Reads the execution identity token using `ScriptApp.getOAuthToken()`.
2. **Quota Tracking Header**: Attaches the user project context using the `'x-goog-user-project': gcpProjectId` header to direct Gemini's request limits to your specific GCP project billing/quota footprint.

---

## 5. Execution & Log Tailing from Terminal

### Executing the Audit Function
Run the resilient 2-stage Gemini Broad Gap Audit directly from your command line:
```bash
npx clasp run runGeminiBroadGapAudit
```
*Note: Stage 1 (snippet extraction and caching) will start immediately. If the Gmail processing exceeds 5 minutes, it will automatically schedule background triggers on Apps Script to resume and complete Stage 2 (Gemini Batch Classification) in the cloud.*

### Accessing & Tailing Logs
Keep a live window open on your terminal to watch the execution logs stream in:
```bash
# Fetch recent logs
npx clasp logs

# Tail logs in real-time (hot reload)
npx clasp logs --watch
```
*Alternatively, you can open the Cloud Logging Console in your browser directly with:*
```bash
npx clasp open-logs
```
