import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export const generateQuestions = async (topic: string, difficulty: string, count: number) => {
    const prompt = `
    Generate ${count} multiple-choice questions about "${topic}" at a ${difficulty} difficulty level.
    Return the response ONLY as a JSON array of objects.
    Each object must have the following structure:
    {
      "id": number,
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": number (index of the correct option, 0-3)
    }
    Ensure the questions are accurate and the options are plausible.
  `;

    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
        throw new Error("Failed to generate questions from AI");
    }

    const parsed = JSON.parse(responseContent);
    // Groq often wraps the array in an object like { "questions": [...] } even if told to return array
    return Array.isArray(parsed) ? parsed : (parsed.questions || Object.values(parsed)[0]);
};
