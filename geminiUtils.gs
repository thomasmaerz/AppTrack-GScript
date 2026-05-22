const GEMINI_CONFIG = {
  model: 'models/gemini-3.1-flash-lite',
  apiKeyProperty: 'gemini_api_key',
  batchSize: 150
};

function buildGeminiClassificationPayload_(threadLogs) {
  const systemInstruction =
    "You are a strict recruitment classification assistant. " +
    "Analyze email sender (f), subject (s), snippet (sn), preparsed company hint (pc), and preparsed title hint (pt) to classify email. " +
    "Set rel=true for all categories except NOISE. Set rel=false only for NOISE.\n\n" +
    "Category Definitions:\n" +
    "- APPLIED: Direct, individual confirmations that a specific job application was successfully submitted.\n" +
    "- INTERVIEW_REQUEST: Direct requests from recruiter, employer, or ATS to schedule or attend an interview.\n" +
    "- INTERVIEW_SCHEDULED: Confirmation details for locked-in interview date/time.\n" +
    "- ASSESSMENT: Direct invitations for coding tests, technical evaluations, or behavioral screenings linked to active application.\n" +
    "- REJECTED: Clear notifications that you are not moving forward, position is closed, or another candidate was selected.\n" +
    "- OFFER: Selected for role, employment contracts, or formal job offer letters.\n" +
    "- RECRUITER_OUTREACH: Personalized, 1-on-1 sourcing outreach for active opening, client submission, role discussion, or resume request, even if sent through recruiter tooling.\n" +
    "- RECRUITER_FOLLOW_UP: Direct follow-up tracking prior 1-on-1 recruiter conversation.\n" +
    "- REFERRAL: Confirmation that you have been formally referred to a specific job or company.\n" +
    "- APPLICATION_UPDATE: Direct, specific status change or update regarding user's own active candidacy workflow.\n" +
    "- CANDIDATE_ACCOUNT_DRAFT: Candidate portal, profile, account, draft, or verification step tied to a specific employer recruiting process, referral, application, named role, or interview next step.\n" +
    "- RESPONSE: Direct emails or calendar actions by the user (candidate) to a company, recruiter, staffing agency, or hiring team as a reply, follow-up, resume submission, application response, accepted interview, or proposed new interview time.\n" +
    "- NOISE: All out-of-scope emails including automated job alerts, search-agent digests, public job fair invites, newsletters, career advice, account security notices, and consumer/financial/non-employment application workflows.\n\n" +
    "Classification Rules:\n" +
    "1. Automated Digests vs. Pipeline: Any email containing a list of multiple jobs, phrases like 'matched your search agent', 'new jobs posted from', 'and N more jobs', 'explore more jobs below', or periodic subscription footers such as 'every 7 days' is strictly NOISE unless it also contains a specific material event for user's own candidacy such as application sent/received, rejection, interview, assessment, offer, referral, or recruiter 1-on-1 message.\n" +
    "2. Events & Job Fairs: Public career fairs, workshops, multi-company hiring events, webinars, and bulk promotional invitations are out of scope and must be classified as NOISE.\n" +
    "3. Sourcing Validation: RECRUITER_OUTREACH requires personalized, direct 1-on-1 sourcing. Role seniority/relevance filters apply only to unsolicited RECRUITER_OUTREACH; if the user already applied or the email is an application receipt, rejection, interview, assessment, referral, candidate portal step, or specific application status update, classify it as job-related regardless of whether the title seems junior or imperfectly matched.\n" +
    "4. LinkedIn Sent Confirmations: Precise LinkedIn subject matching 'your application was sent to COMPANY' must be classified as APPLIED.\n" +
    "5. Specific Application Subjects: Subjects like 'your application to TITLE at COMPANY' or 'your application for TITLE at COMPANY' are about user's own candidacy. Classify as APPLIED, APPLICATION_UPDATE, REJECTED, INTERVIEW_REQUEST, or ASSESSMENT based on snippet content; do not classify as NOISE solely because sender is LinkedIn or a job platform.\n" +
    "6. Candidate Portals: Candidate portal/profile/account/draft/verification emails are job-related only when tied to a specific employer recruiting process, referral, application, named role, or interview next step. Generic account creation, talent-community marketing, profile updates, password resets, and security notices with no specific candidacy are NOISE.\n" +
    "7. Company/title extraction: If pc or pt are provided and not 'Unlisted', use them unless clearly contradicted. If company/title are visible in subject patterns like 'sent to COMPANY' or 'TITLE at COMPANY', extract them. Use 'Unlisted' only when not visible.\n\n" +
    "CRITICAL Guardrails:\n" +
    "1. Hard NOISE overrides: Classify as NOISE when the email is primarily about non-employment applications or non-candidacy workflows, including Income Support, SIN/passport/government benefits, financial aid, university/college admissions, graduation, road tests, PMP/PMI/certification, community memberships, Slack/community invites, career coaching, job-placement services, resume feedback, resume keyword tools, or job-search assistance. Do not apply these exclusions merely because a resume/profile/signature mentions PMP, services, tools, platforms, cloud, AI, or similar terms.\n" +
    "2. Job Platform Metrics: LinkedIn/Indeed/job-platform emails are NOISE when they are generic job alerts, recommendations, digests, profile/application views, 'apply to X and more', 'and N more jobs', or lists of jobs. Specific application sent/received/submitted messages, 'your application to/for TITLE at COMPANY', rejection, under-review, interview, assessment, or next-step messages are job-related.\n" +
    "3. RESPONSE Boundary: RESPONSE requires direct candidate action in an active employment pipeline. Do not classify emails to friends, career coaches, government support programs, resume reviewers, job-search tools, schools, or generic job-search assistance as RESPONSE.\n" +
    "4. Direct Rejection Override: Prioritize explicit rejection phrases such as 'not moving forward', 'pursue other candidates', 'decided to proceed with others', 'position has been filled', 'will not be proceeding', or 'no longer being considered' found in snippet. If email signals end of user's individual candidacy, classify as REJECTED.\n\n" +
    "Return a JSON object containing results array of exact same size as input. " +
    "You MUST preserve and output exact input 'idx' index anchor per result.";

  const promptText = systemInstruction + "\n\nInput JSON:\n" + JSON.stringify(threadLogs || []);

  return {
    contents: [{
      parts: [{ text: promptText }]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 16384,
      temperature: 0.0,
      responseSchema: {
        type: "OBJECT",
        properties: {
          results: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                idx: { type: "STRING" },
                rel: { type: "BOOLEAN" },
                cat: { 
                  type: "STRING", 
                  enum: ["APPLIED", "INTERVIEW_REQUEST", "INTERVIEW_SCHEDULED", "ASSESSMENT", "REJECTED", "OFFER", "RECRUITER_OUTREACH", "RECRUITER_FOLLOW_UP", "REFERRAL", "APPLICATION_UPDATE", "CANDIDATE_ACCOUNT_DRAFT", "NOISE", "RESPONSE"]
                },
                conf: { type: "STRING", enum: ["HIGH", "MEDIUM", "LOW"] },
                rea: { type: "STRING" },
                co: { type: "STRING" },
                ti: { type: "STRING" }
              },
              required: ["idx", "rel", "cat", "rea"]
            }
          }
        }
      }
    }
  };
}

const GeminiClient = {
  /**
   * Helper to fetch REST request with exponential backoff on 429/503/500 errors
   */
  fetchWithRetry: function(url, options, maxRetries = 4) {
    let delay = 2000; // start with 2 seconds
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = UrlFetchApp.fetch(url, options);
        const code = res.getResponseCode();
        
        if (code === 200) {
          return { success: true, code: code, text: res.getContentText() };
        }
        
        const retryable = (code === 429 || code === 503 || code === 500);
        if (retryable && attempt < maxRetries) {
          Logger.log(`API returned code ${code}. Retrying in ${delay}ms (Attempt ${attempt + 1}/${maxRetries})...`);
          Utilities.sleep(delay);
          delay *= 2; // double the delay
          continue;
        }
        
        return { success: false, code: code, text: res.getContentText() };
      } catch (e) {
        if (attempt < maxRetries) {
          Logger.log(`Fetch exception: ${e.toString()}. Retrying in ${delay}ms...`);
          Utilities.sleep(delay);
          delay *= 2;
          continue;
        }
        throw e;
      }
    }
  },

  classifyBatch: function(threadLogs) {
    if (!threadLogs || threadLogs.length === 0) return [];
    
    const payload = buildGeminiClassificationPayload_(threadLogs);

    // Dual Authentication Handshake
    let responseText;
    let success = false;
    let lastErrorDetails = "";
    
    // Method 1: Try keyless OAuth first
    try {
      const oauthToken = ScriptApp.getOAuthToken();
      const gcpProjectId = PropertiesService.getScriptProperties().getProperty('gcp_project_id') || 'gen-lang-client-0843415856';
      const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_CONFIG.model}:generateContent`;
      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: { 
          'Authorization': 'Bearer ' + oauthToken,
          'x-goog-user-project': gcpProjectId
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const fetchResult = this.fetchWithRetry(url, options);
      if (fetchResult.success) {
        responseText = fetchResult.text;
        success = true;
      } else {
        lastErrorDetails = `OAuth attempt returned code ${fetchResult.code}: ${fetchResult.text}`;
        Logger.log(lastErrorDetails);
      }
    } catch (e) {
      lastErrorDetails = "OAuth generative REST call failed. Error: " + e.toString();
      Logger.log(lastErrorDetails);
    }

    // Method 2: Fallback to stored API key
    if (!success) {
      const apiKey = PropertiesService.getScriptProperties().getProperty(GEMINI_CONFIG.apiKeyProperty);
      if (apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_CONFIG.model}:generateContent?key=${apiKey}`;
        const options = {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };
        
        try {
          const fetchResult = this.fetchWithRetry(url, options);
          if (fetchResult.success) {
            responseText = fetchResult.text;
            success = true;
          } else {
            lastErrorDetails = `API Key attempt returned code ${fetchResult.code}: ${fetchResult.text}`;
            Logger.log(lastErrorDetails);
          }
        } catch (e) {
          lastErrorDetails = "API Key generative REST call failed. Error: " + e.toString();
          Logger.log(lastErrorDetails);
        }
      }
    }

    if (!success) {
      throw new Error(`Generative Language API call failed after trying OAuth and API Key fallbacks. Details:\n${lastErrorDetails}`);
    }

    // Parse the structured model response
    const jsonRes = JSON.parse(responseText);
    if (!jsonRes.candidates || jsonRes.candidates.length === 0 || !jsonRes.candidates[0].content.parts[0].text) {
      throw new Error("Generative Language API response was empty or malformed: " + responseText);
    }
    
    const parsedText = jsonRes.candidates[0].content.parts[0].text;
    const modelOutput = JSON.parse(parsedText);
    return modelOutput.results || [];
  }
};
