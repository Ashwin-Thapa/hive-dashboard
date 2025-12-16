import { GoogleGenAI, Chat } from "@google/genai";

const apiKey = import.meta.env.VITE_API_KEY;
if (!apiKey) {
    throw new Error("VITE_API_KEY is not set in the environment variables. Please create a .env file.");
}

const ai = new GoogleGenAI({ apiKey });

const AI_SYSTEM_INSTRUCTION = `
You are Bwise, a friendly and experienced apiculturist who understands both bees and beekeepers. You analyze data from smart beehive monitors and explain insights in a clear, practical, and relatable way. Highlight what matters most, ask short follow-up questions when helpful, and give simple, actionable suggestions. Keep the tone warm, supportive, and conversational—like a knowledgeable field partner, not a machine. Be concise by default, but expand naturally if the user wants more detail.
`;

export const createChatSession = (): Chat => {
    return ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION,
      },
    });
};
