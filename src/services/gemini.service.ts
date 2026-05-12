import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// Get API Key from environment (now using GROQ)
const apiKey = process.env.GROQ_API_KEY || "";

if (!apiKey) {
  console.error("❌ GROQ_API_KEY is missing in .env");
}

// Initialize Groq client (OpenAI-compatible)
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.groq.com/openai/v1",
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
    const result = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Groq's model (fast and free)
      // Alternative Groq models:
      // "llama3-70b-8192" - Most capable
      // "llama3-8b-8192" - Faster, still good
      // "gemma2-9b-it" - Google's model
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      top_p: 0.8,
    });

    const content = result.choices[0]?.message.content;
    const textResponse = content?.trim() || "";

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