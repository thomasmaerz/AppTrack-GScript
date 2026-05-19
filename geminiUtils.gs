const GEMINI_CONFIG = {
  model: 'models/gemini-3.1-flash-lite',
  apiKeyProperty: 'gemini_api_key',
  batchSize: 150
};

const GeminiClient = {
  classifyBatch: function(threadLogs) {
    if (!threadLogs || threadLogs.length === 0) return [];
    
    const systemInstruction = 
      "You are a strict recruitment classification assistant. " +
      "Analyze the email sender (f), subject (s), and snippet (sn) to classify the email. " +
      "Definitions:\n" +
      "- APPLIED: Direct application confirmations.\n" +
      "- INTERVIEW: Invites or scheduling outreach.\n" +
      "- ASSESSMENT: Coding tests, evaluations, or screenings.\n" +
      "- REJECTED: Rejections or no longer considering updates.\n" +
      "- OFFER: Selected for role alerts, contracts, or offer letters.\n" +
      "- NOISE: Substack/Medium digests, Zillow rentals, bank marketing, password resets, general LinkedIn/Indeed recommendations.\n\n" +
      "Return a JSON object containing a results array of the exact same size. " +
      "You MUST output the exact input 'id' anchor for every result.";

    const promptText = systemInstruction + "\n\nInput JSON:\n" + JSON.stringify(threadLogs);
    
    const payload = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
        responseSchema: {
          type: "OBJECT",
          properties: {
            results: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING" },
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
                required: ["id", "rel", "cat", "rea"]
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