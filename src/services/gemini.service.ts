// Vertex AI service using the official library
import { VertexAI } from "@google-cloud/vertexai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ensure GCP_PROJECT_ID is set (can come from key file or env)
const keyPath = path.join(process.cwd(), "gcp-key.json");
let serviceAccountKey: any = {};
try {
  const keyFileContent = fs.readFileSync(keyPath, "utf-8");
  serviceAccountKey = JSON.parse(keyFileContent);
} catch (e) {
  console.warn(`Could not read gcp-key.json at ${keyPath}, falling back to environment credentials`);
}

const projectId =
  process.env.GCP_PROJECT_ID || serviceAccountKey.project_id;
const location = process.env.GCP_LOCATION || "us-central1";
const modelId = process.env.GEMINI_MODEL || "gemini-2.0-flash"; // switched to faster model

if (!projectId) {
  console.error("❌ GCP_PROJECT_ID is required for VertexAI");
}

// set GOOGLE_APPLICATION_CREDENTIALS if not already
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && keyPath) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
}

const vertexAI = new VertexAI({
  project: projectId,
  location,
});

const model = vertexAI.preview.getGenerativeModel({
  model: modelId,
  generationConfig: {
    temperature: 0.3,
    topP: 0.8,
    maxOutputTokens: 4096,
  },
});

export const generateQuestions = async (
  topic: string,
  difficulty: string,
  count: number
) => {
  const prompt = `Generate ${count} ${difficulty} multiple-choice questions about "${topic}".
Return ONLY a JSON array (no markdown, no extra text):
[{"id":1,"question":"Q1","options":["A","B","C","D"],"answer":0}...]`;

  const request = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  const result = await model.generateContent(request);
  const textResponse =
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!textResponse) {
    throw new Error("Failed to generate questions from AI");
  }

  const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
  const jsonString = jsonMatch ? jsonMatch[0] : textResponse;

  const parsed = JSON.parse(jsonString);
  return Array.isArray(parsed) ? parsed : parsed.questions || Object.values(parsed)[0];
};
