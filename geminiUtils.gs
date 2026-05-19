const GEMINI_CONFIG = {
  model: 'models/gemini-3.1-flash-lite',
  apiKeyProperty: 'gemini_api_key',
  batchSize: 20
};

const GeminiClient = {
  /**
   * Classifies a batch of Gmail thread logs using Gemini 3.1 Flash Lite
   * @param {Array<Object>} threadLogs - [{ threadId, subject, from, snippet }]
   * @return {Array<Object>} List of classification results mapping threadId -> classification details
   */
  classifyBatch: function(threadLogs) {
    if (!threadLogs || threadLogs.length === 0) return [];
    
    // Construct the structured prompt
    const systemInstruction = 
      "You are a strict, highly accurate recruitment classification assistant. " +
      "Your goal is to audit raw email logs to identify valid job application confirmations or transactional status updates " +
      "versus generic marketing, job recommendations, digest alerts, or password resets. " +
      "Below is a JSON array of email thread logs. For each log, analyze the subject, from sender, and body snippet, " +
      "and determine if it is job-related (isJobRelated) and classify it. " +
      "Exhaustive definitions:\n" +
      "- APPLIED: Direct, valid confirmations of a submitted application (e.g. Indeed Apply, greenhouse, lever, workday transactional, specific employer confirmations).\n" +
      "- INTERVIEW: Reaching out to schedule an interview, interview invites, or scheduling requests.\n" +
      "- ASSESSMENT: Coding tests, skills evaluations, homework, or online screenings.\n" +
      "- REJECTED: Regret to inform, no longer considering, not moving forward notices.\n" +
      "- OFFER: Employment contract, offer letter, selected for the position alerts.\n" +
      "- NOISE: Substack/Medium newsletters, Zillow rentals, password resets, verification codes, or general job recommendations/match alerts from LinkedIn or Indeed.\n\n" +
      "You MUST return a JSON object containing a results array of the exact same size and matching input threadIds.";

    const promptText = systemInstruction + "\n\nInput JSON:\n" + JSON.stringify(threadLogs);
    
    const payload = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            results: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  threadId: { type: "STRING" },
                  isJobRelated: { type: "BOOLEAN" },
                  classification: { 
                    type: "STRING", 
                    enum: ["APPLIED", "INTERVIEW", "ASSESSMENT", "REJECTED", "OFFER", "NOISE"] 
                  },
                  confidence: { type: "STRING", enum: ["HIGH", "MEDIUM", "LOW"] },
                  reasoning: { type: "STRING" },
                  cleanCompany: { type: "STRING" },
                  cleanTitle: { type: "STRING" }
                },
                required: ["threadId", "isJobRelated", "classification", "reasoning"]
              }
            }
          }
        }
      }
    };

    // Dual Authentication Handshake
    let responseText;
    let success = false;
    
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
      
      const res = UrlFetchApp.fetch(url, options);
      const code = res.getResponseCode();
      if (code === 200) {
        responseText = res.getContentText();
        success = true;
      } else {
        Logger.log(`OAuth attempt returned code ${code}: ${res.getContentText()}`);
      }
    } catch (e) {
      Logger.log("OAuth generative REST call failed, attempting API key fallback. Error: " + e.toString());
    }

    // Method 2: Fallback to stored API key
    if (!success) {
      const apiKey = PropertiesService.getScriptProperties().getProperty(GEMINI_CONFIG.apiKeyProperty);
      if (!apiKey) {
        throw new Error("Generative Language API call failed: OAuth was rejected and no gemini_api_key script property is configured.");
      }
      
      const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_CONFIG.model}:generateContent?key=${apiKey}`;
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const res = UrlFetchApp.fetch(url, options);
      const code = res.getResponseCode();
      if (code !== 200) {
        throw new Error(`Generative Language REST call failed with code ${code}: ${res.getContentText()}`);
      }
      responseText = res.getContentText();
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
