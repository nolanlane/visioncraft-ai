import { GoogleGenAI } from "@google/genai";
import { IMAGE_MODEL_IDS } from "./constants/models";

export interface Env {
  GEMINI_API_KEY: string;
}

type AnalyzeImagePayload = {
  base64Data: string;
  mimeType: string;
  prompt: string;
};

type GeneratePromptPayload = {
  prompt: string;
};

type GenerateImagePayload = {
  prompt: string;
  base64Data?: string;
  mimeType?: string;
  model?: string;
};

const IMAGE_MODELS = new Set(IMAGE_MODEL_IDS);

type RequestBody =
  | { action: "analyzeImage"; payload: AnalyzeImagePayload }
  | { action: "generatePrompt"; payload: GeneratePromptPayload }
  | { action: "generateImage"; payload: GenerateImagePayload };

const MAX_BASE64_LENGTH = 8 * 1024 * 1024; // 8MB base64 string length guard

const analyzeResponseSchema = {
  type: "object",
  properties: {
    imageDescription: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          reasoning: { type: "string" },
        },
        required: ["id", "title", "description", "reasoning"],
      },
    },
  },
  required: ["imageDescription", "suggestions"],
} as const;

function ensureApiKey(env: Env) {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateBase64Field(value: unknown): value is string {
  return isNonEmptyString(value) && value.length <= MAX_BASE64_LENGTH;
}

function validateAnalyzeImagePayload(payload: any): asserts payload is AnalyzeImagePayload {
  if (!validateBase64Field(payload?.base64Data)) {
    throw new Error("Invalid or missing base64Data for analyzeImage");
  }
  if (!isNonEmptyString(payload?.mimeType)) {
    throw new Error("Invalid or missing mimeType for analyzeImage");
  }
  if (!isNonEmptyString(payload?.prompt)) {
    throw new Error("Invalid or missing prompt for analyzeImage");
  }
}

function validateGeneratePromptPayload(payload: any): asserts payload is GeneratePromptPayload {
  if (!isNonEmptyString(payload?.prompt)) {
    throw new Error("Invalid or missing prompt for generatePrompt");
  }
}

function validateGenerateImagePayload(payload: any): asserts payload is GenerateImagePayload {
  if (!isNonEmptyString(payload?.prompt)) {
    throw new Error("Invalid or missing prompt for generateImage");
  }

  const hasImage = payload?.base64Data !== undefined || payload?.mimeType !== undefined;
  if (hasImage) {
    if (!validateBase64Field(payload.base64Data)) {
      throw new Error("Invalid base64Data for generateImage");
    }
    if (!isNonEmptyString(payload.mimeType)) {
      throw new Error("Invalid mimeType for generateImage");
    }
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeoutMs)
    ),
  ]);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only allow POST requests to /api/gemini
    if (request.method !== "POST" || url.pathname !== "/api/gemini") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      ensureApiKey(env);
      const body = (await request.json()) as Partial<RequestBody>;
      const { action, payload } = body;
      const genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

      if (action === "analyzeImage") {
        validateAnalyzeImagePayload(payload);

        const result = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: payload.base64Data,
                    mimeType: payload.mimeType,
                  },
                },
                { text: payload.prompt },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: analyzeResponseSchema as unknown as object,
          },
        });

        return new Response(result.text, {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (action === "generatePrompt") {
        validateGeneratePromptPayload(payload);

        const result = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: payload.prompt }] }],
        });
        return new Response(JSON.stringify({ text: result.text }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (action === "generateImage") {
        validateGenerateImagePayload(payload);

        const parts: Array<any> = [{ text: payload.prompt }];
        if (payload.base64Data && payload.mimeType) {
          parts.unshift({ inlineData: { data: payload.base64Data, mimeType: payload.mimeType } });
        }

        const modelId = payload.model && IMAGE_MODELS.has(payload.model)
          ? payload.model
          : "gemini-2.5-flash-image";

        const imageSize = modelId === "gemini-3-pro-image-preview" ? "768" : "1024";

        const timeoutMs = modelId === "gemini-3-pro-image-preview" ? 25_000 : 45_000;
        const result = await withTimeout(
          genAI.models.generateContent({
          model: modelId,
          contents: [{ role: "user", parts }],
          config: {
            imageConfig: { aspectRatio: "1:1", imageSize } as unknown as object,
          },
          }),
          timeoutMs,
          "Image generation exceeded the runtime limit. This model is too slow for the current Cloudflare Worker timeout."
        );

        for (const candidate of result.candidates ?? []) {
          for (const part of candidate.content?.parts ?? []) {
            if ("inlineData" in part && part.inlineData) {
              return new Response(
                JSON.stringify({ text: `data:image/png;base64,${part.inlineData.data}` }),
                { headers: { "Content-Type": "application/json" } }
              );
            }
          }
        }
        throw new Error("No image generated by Gemini");
      }

      return new Response(JSON.stringify({ error: "Invalid Action" }), { status: 400 });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error?.message ?? "Unexpected error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
