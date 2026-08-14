import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL_FALLBACKS = ["gemini-flash-latest", "gemini-3-flash-preview"];

async function generateWithAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const anthropic = new Anthropic({ apiKey });
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }]
      });

      const block = message.content[0];
      if (block.type !== "text") {
        throw new Error(`Unexpected Anthropic response block type: ${block.type}`);
      }
      return block.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
  }

  throw lastError;
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;

  for (const modelName of GEMINI_MODEL_FALLBACKS) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" }
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        return response.response.text();
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    }
  }

  throw lastError;
}

export async function generateJson(prompt: string): Promise<string> {
  try {
    return await generateWithAnthropic(prompt);
  } catch (anthropicError) {
    try {
      return await generateWithGemini(prompt);
    } catch {
      throw anthropicError;
    }
  }
}
