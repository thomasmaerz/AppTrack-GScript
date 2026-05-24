const GEMINI_CONFIG = {
  model: 'models/gemini-3.1-flash-lite',
  apiKeyProperty: 'gemini_api_key',
  batchSize: 150,
  thinkingBudget: 0
};

function buildGeminiSystemInstruction_() {
  return (
    "You are strict recruitment classification assistant. " +
    "Analyze email sender (f), subject (s), snippet (sn), preparsed company hint (pc), and preparsed title hint (pt). " +
    "Classify whether email is evidence of explicit employment job application or active hiring process for user.\n\n" +
    "Decision Order:\n" +
    "1. First apply hard NOISE gates. Classify as NOISE if email is primarily about education, admissions, graduation, certification, course, training, benefits, Income Support, government aid, community membership, Slack/community access, newsletter signup, event registration, account setup, generic candidate profile creation, password reset, OTP, passcode, verification, portal login, career services administration, workshops, job clubs, employment-service intake, career coaching, resume advice, job fairs, employer spotlights, job-board digests, job alerts, weekly updates, jobs-for-you, this-job-is-a-match messages, broad lists of openings, career marketing, generic interview advice, or personal prep material.\n" +
    "2. Then apply PASS gates. Classify as job-related only if there is clear evidence of submitted application for specific employment role, application status update for specific employment role, interview, screening, assessment, offer, rejection, hiring next step, direct one-to-one recruiter/employer thread about specific role, or user-sent message explicitly applying for, following up on, or preparing materials for specific job role.\n" +
    "LinkedIn lifecycle examples like 'your application was viewed by COMPANY' are PASS when tied to concrete candidacy events.\n" +
    "3. Do not classify PASS based on keywords alone. Words like application, apply, interview, resume, career, job, recruiter, candidate, status, appointment, and assessment are insufficient unless tied to employment role, employer, application, or active hiring process.\n" +
    "4. If email is job-search-adjacent but not itself evidence of specific application or hiring process, classify NOISE.\n\n" +
    "Category Definitions:\n" +
    "- APPLIED: Direct, individual confirmations that specific employment job application was successfully submitted.\n" +
    "- INTERVIEW_REQUEST: Direct requests from recruiter, employer, or ATS to schedule or attend interview for employment role.\n" +
    "- INTERVIEW_SCHEDULED: Confirmation details for locked-in interview date/time.\n" +
    "- ASSESSMENT: Direct invitations for coding tests, technical evaluations, or behavioral screenings linked to active employment application.\n" +
    "- REJECTED: Clear notifications that user's individual employment candidacy is not moving forward, position is closed, or another candidate was selected.\n" +
    "- OFFER: Selected for role, employment contracts, or formal job offer letters.\n" +
    "- RECRUITER_OUTREACH: Personalized one-to-one sourcing outreach for concrete active opening, client submission, role discussion, or resume request.\n" +
    "- RECRUITER_FOLLOW_UP: Direct follow-up tracking prior one-to-one recruiter conversation or active role discussion.\n" +
    "- REFERRAL: Confirmation that user has been formally referred to specific job or company.\n" +
    "- APPLICATION_UPDATE: Direct, specific status change or update regarding user's own active employment candidacy workflow.\n" +
    "- CANDIDATE_ACCOUNT_DRAFT: Candidate portal, profile, account, draft, or verification step only when tied to specific employer recruiting process, referral, submitted application, named role, or interview next step. Generic candidate account creation or talent-community profile updates are NOISE.\n" +
    "- Generic account creation without specific role or candidacy event is NOISE.\n" +
    "- RESPONSE: Direct emails or calendar actions by user to company, recruiter, staffing agency, or hiring team as reply, follow-up, resume submission, application response, accepted interview, or proposed interview time for specific employment role.\n" +
    "- NOISE: All out-of-scope emails, including automated job alerts, search-agent digests, public job fair invites, newsletters, career advice, account security notices, generic candidate profile/account setup, consumer/financial/education/government/community/non-employment application workflows, career services administration, workshops, and personal interview-prep advice.\n\n" +
    "Critical Tie Breakers:\n" +
    "- Non-Employment Application Boundary: treat financial/education/government/community/non-employment applications as NOISE regardless of application language.\n" +
    "- Non-employment applications are always NOISE even when they include application, interview, assessment, or status wording.\n" +
    "- OTP/security/account/profile emails are NOISE unless they explicitly reference concrete submitted job application, named employment role, employer hiring process, or interview next step.\n" +
    "- Career services, WorkBC, MCG Careers, employment counsellors, job clubs, workshops, job fairs, and resume coaching are NOISE unless message itself says specific employer received/reviewed user's application or is advancing user in hiring.\n" +
    "- Job-board digests, weekly application summaries, jobs-for-you, job matches, and lists of multiple roles are NOISE unless they contain individual material event for user's own candidacy.\n" +
    "- RESPONSE Boundary: classify RESPONSE only for direct user action in a specific employment pipeline, not generic coaching, school, or non-employment communication.\n" +
    "- Do not require pc or pt to be populated. Use subject/snippet evidence when company or title hints are Unlisted.\n\n" +
    "Return a JSON object containing results array of exact same size as input. " +
    "You MUST preserve and output exact input 'idx' index anchor per result."
  );
}

function applyGeminiThinkingConfig_(generationConfig, thinkingBudget) {
  const budget = Number(thinkingBudget || 0);
  if (budget > 0) {
    generationConfig.thinkingConfig = {
      thinkingBudget: budget
    };
  }
  return generationConfig;
}

function buildGeminiClassificationPayload_(threadLogs) {
  const systemInstruction = buildGeminiSystemInstruction_();

  const promptText = systemInstruction + "\n\nInput JSON:\n" + JSON.stringify(threadLogs || []);

  const generationConfig = applyGeminiThinkingConfig_({
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
  }, GEMINI_CONFIG.thinkingBudget);

  return {
    contents: [{
      parts: [{ text: promptText }]
    }],
    generationConfig: generationConfig
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
