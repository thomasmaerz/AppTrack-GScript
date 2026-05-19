const GEMINI_CONFIG = {
  model: 'models/gemini-3.1-flash-lite',
  apiKeyProperty: 'gemini_api_key',
  batchSize: 150
};

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
    
    const systemInstruction = 
      "You are a strict recruitment classification assistant. " +
      "Analyze the email sender (f), subject (s), and snippet (sn) to classify the email. " +
      "Definitions:\n" +
      "- APPLIED: Direct application confirmations.\n" +
      "- INTERVIEW: Invites, scheduling outreach, or direct recruiter contact.\n" +
      "- ASSESSMENT: Coding tests, evaluations, or screenings.\n" +
      "- REJECTED: Rejections, not moving forward updates, or position closed notifications.\n" +
      "- OFFER: Selected for role alerts, contracts, or offer letters.\n" +
      "- NOISE: Substack/Medium digests, Zillow rentals, bank marketing, password resets, general LinkedIn/Indeed recommendations.\n\n" +
      "CRITICAL Guardrails:\n" +
      "1. Only classify actual employment/job applications. Applications for financial aid, loans, credit cards, income support, housing, or student portals are NOT job-related and must be classified as NOISE.\n" +
      "2. LinkedIn or Indeed notifications saying 'your application was viewed', 'viewed by', or 'new application updates' are NOISE. They are not direct job applications, interviews, or rejections.\n" +
      "3. Look for rejection phrases like 'not moving forward', 'pursue other candidates', 'decided to proceed with others', or 'position has been filled' in the snippet, even if they follow standard greetings. If present, classification MUST be REJECTED.\n\n" +
      "Return a JSON object containing a results array of the exact same size. " +
      "You MUST output the exact input 'idx' index anchor for every result.";

    const promptText = systemInstruction + "\n\nInput JSON:\n" + JSON.stringify(threadLogs);
    
    const payload = {
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
                    enum: ["APPLIED", "INTERVIEW", "ASSESSMENT", "REJECTED", "OFFER", "NOISE"] 
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
