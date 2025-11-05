import { GoogleGenAI, Chat } from "@google/genai";

const apiKey = import.meta.env.VITE_API_KEY;
if (!apiKey) {
    throw new Error("VITE_API_KEY is not set in the environment variables. Please create a .env file.");
}

const ai = new GoogleGenAI({ apiKey });

const AI_SYSTEM_INSTRUCTION = `You are a seasoned and friendly apiculturist named Bwise. You are an expert at analyzing data and reports from smart beehive monitors. Provide concise, easy-to-understand analysis. Highlight important indicators and offer simple, actionable advice. Keep your tone encouraging and helpful. Respond in under 75 words unless the user asks for more detail.`;

export const createChatSession = (): Chat => {
    return ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION,
      },
    });
};
