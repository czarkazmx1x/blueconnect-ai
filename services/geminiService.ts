import { GoogleGenerativeAI } from "@google/generative-ai";
import { VehicleStatus } from "../types";

// Note: In a production environment, API calls should be proxied through a backend
// to keep the API KEY secure.
const getAIClient = () => {
  // Vite requires env variables to start with VITE_ and uses import.meta.env
  const apiKey = (import.meta as any).env.VITE_GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn("Gemini API Key not found (VITE_GOOGLE_API_KEY). AI features will use mock responses.");
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

export const analyzeVehicleHealth = async (status: VehicleStatus, modelName: string): Promise<string> => {
  const client = getAIClient();
  
  if (!client) {
    // Fallback mock response if no key is present
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`(Simulation) Based on the telemetry for your ${modelName}, your vehicle appears to be in good condition. Battery levels are optimal at ${status.battery?.percentage}%. No door or engine alerts detected.`);
      }, 2000);
    });
  }

  try {
    const prompt = `
      You are an intelligent vehicle assistant for a connected car app.
      Analyze the following JSON vehicle status for a ${modelName} and provide a friendly, concise summary (max 3 sentences).
      Highlight any issues (unlocked doors, low battery/fuel) or confirm all systems are nominal.

      Vehicle Status:
      ${JSON.stringify(status)}
    `;

    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text || "Unable to generate analysis at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Service is currently unavailable.";
  }
};