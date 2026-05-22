# clasp / GCP setup for CLI test runs

This project can run Apps Script functions from the terminal with `clasp run`, for example:

```bash
clasp run runTrackerTests --user apptrack
```

`clasp run` calls the Apps Script API `scripts.run` endpoint. For this project, CLI execution requires a project-owned OAuth Desktop client with the Apps Script project's scopes, not clasp's default Google-provided OAuth client.

## Project identity

- Apps Script ID: `172m5F9MzN_4it1MtOBEWKyLfw8JAz4cgIKriRU7OvJwrQLYkUdILFi4P`
- GCP project ID: `gen-lang-client-0843415856`
- GCP project number: `663621054218`
- Named clasp user for project-scoped auth: `apptrack`

## Required GCP APIs

The Apps Script, Gmail, Sheets, and Drive APIs must be enabled on the shared GCP project:

```bash
gcloud config set project gen-lang-client-0843415856
gcloud services enable \
  script.googleapis.com \
  gmail.googleapis.com \
  sheets.googleapis.com \
  drive.googleapis.com \
  --project gen-lang-client-0843415856
```

Verify:

```bash
gcloud services list --enabled --project gen-lang-client-0843415856
```

## Apps Script manifest

`appsscript.json` must allow API execution and declare the scopes used by the project:

```json
{
  "executionApi": {
    "access": "ANYONE"
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

Push manifest changes after editing:

```bash
clasp push --force
```

## OAuth Desktop client

Create an OAuth client in the same GCP project:

```bash
clasp open-credentials-setup
```

In Cloud Console:

1. Use project `gen-lang-client-0843415856`.
2. Configure the OAuth consent screen if prompted.
3. Create credentials → OAuth client ID.
4. Application type: **Desktop app**.
5. Download the client JSON.
6. Save it in the local project root as `client_secret.json`.

Never commit `client_secret.json`; it is ignored by `.gitignore`.

## Login with project scopes

Use a named clasp user so this project-scoped login does not replace the default clasp login:

```bash
clasp login \
  --user apptrack \
  --use-project-scopes \
  --include-clasp-scopes \
  --creds client_secret.json
```

During login, approve with the Google account that owns or can edit the Apps Script project.

Verify the credential uses the project-owned OAuth client:

```bash
clasp show-authorized-user --user apptrack
```

Expected shape:

```text
You are logged in as maerz.thomas@gmail.com.
OAuth client ID: 663621054218-...apps.googleusercontent.com (user-provided).
```

## Run tests from CLI

Use the named project-scoped clasp user:

```bash
clasp push --user apptrack
clasp run runTrackerTests --user apptrack
```

Expected result:

```text
All tracker tests passed
```

## Non-dev execution fallback

Normal `clasp run` uses development mode. If non-dev execution is required, deploy an API executable first:

```bash
clasp deploy --description "API executable for clasp run" --user apptrack
clasp run runTrackerTests --nondev --user apptrack
```

## Why this setup is needed

Apps Script `scripts.run` requires a properly scoped OAuth token and a standard GCP project shared by the script and calling client. This project uses Gmail, Sheets, Drive, triggers, and external requests, so the OAuth token used by `clasp run` must include the project's Apps Script scopes. The project-owned Desktop OAuth client plus `--use-project-scopes --include-clasp-scopes` provides that token.

## References

- Apps Script API execute guide: https://developers.google.com/apps-script/api/how-tos/execute
- Apps Script `scripts.run` reference: https://developers.google.com/apps-script/api/reference/rest/v1/scripts/run
- clasp run docs: https://github.com/google/clasp/blob/master/docs/run.md
