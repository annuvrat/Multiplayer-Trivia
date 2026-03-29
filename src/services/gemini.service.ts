import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Get API Key from environment
const apiKey = process.env.GEMINI_API_KEY || "";

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is missing in .env");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.3,
    topP: 0.8,
    maxOutputTokens: 2048,
  }
});

export const generateQuestions = async (
  topic: string,
  difficulty: string,
  count: number
) => {
  const prompt = `Generate exactly ${count} ${difficulty} level multiple-choice questions about "${topic}".
  
  Return ONLY a valid JSON array matching this structure (no markdown, no backticks, no text before or after):
  [
    {
      "id": 1,
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0
    }
  ]
  where 'answer' is the index of the correct option (0-3).`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text().trim();

    if (!textResponse) {
      throw new Error("Empty response from AI");
    }

    // Try to extract JSON if the model included markdown backticks
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : textResponse;

    const parsed = JSON.parse(jsonString);

    // Ensure it's an array
    if (!Array.isArray(parsed)) {
      return parsed.questions || Object.values(parsed)[0];
    }

    return parsed;
  } catch (error: any) {
    console.error("Error in generateQuestions:", error.message);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
};
