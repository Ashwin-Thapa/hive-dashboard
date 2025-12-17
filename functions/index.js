const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenAI } = require("@google/genai");

// Define the secret parameter
// In the Emulator, this looks for GEMINI_SECRET_KEY in functions/.secret.local
const GEMINI_SECRET_KEY = defineSecret("GEMINI_SECRET_KEY");

exports.generateContent = onCall({
  secrets: [GEMINI_SECRET_KEY],
  region: "asia-southeast1",
}, async (request) => {
  // 1. Get the prompt from the request
  const promptText = request.data.prompt;
  
  if (!promptText) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'prompt' string.");
  }

  try {
    // 2. Initialize the client using the secret value
    // Note: Use 'apiKey' property in the constructor
    const ai = new GoogleGenAI({ 
      apiKey: GEMINI_SECRET_KEY.value() 
    });

    // 3. Generate content using a valid model (gemini-2.0-flash is the 2025 standard)
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: promptText,
    });

    // 4. Return the text directly
    return { 
      text: response.text || "I'm sorry, I couldn't generate a response." 
    };

  } catch (error) {
    console.error("Gemini API Error Detail:", error);
    
    // Throw a formatted Firebase error to the frontend
    throw new HttpsError("internal", "Failed to communicate with Gemini API.", error.message);
  }
});