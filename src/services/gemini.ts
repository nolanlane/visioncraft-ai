import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, Suggestion } from "./types";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not defined. Please check your .env file or Cloudflare Build Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function analyzeImage(base64Data: string, mimeType: string, userGuidance?: string): Promise<AnalysisResult> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this image and provide 5 diverse, actionable suggestions for modifying or transforming it. 
            ${userGuidance ? `The user has provided the following guidance: "${userGuidance}". Prioritize suggestions that align with this guidance.` : ""}
            Ensure at least 2 suggestions are constructive enhancements (e.g., lighting, restoration, removing distracting objects, color correction).
            The other suggestions can be wildly creative transformations (e.g., surrealism, sci-fi elements, changing the environment).
            Use web search to find current trends or artistic styles that might fit.
            Return the result as a JSON object with 'imageDescription' and an array of 'suggestions'.
            Each suggestion should have 'id', 'title', 'description', and 'reasoning'.`,
          },
        ],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          imageDescription: { type: Type.STRING },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                reasoning: { type: Type.STRING },
              },
              required: ["id", "title", "description", "reasoning"],
            },
          },
        },
        required: ["imageDescription", "suggestions"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generatePrompt(
  suggestion: Suggestion,
  imageDescription: string
): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on the original image description: "${imageDescription}" and the selected modification: "${suggestion.title} - ${suggestion.description}", 
    create a concise, highly optimized text-to-image prompt for a high-end image generation model. 
    Focus on visual details, lighting, style, and composition. 
    The prompt should be a single paragraph of descriptive text.`,
  });

  return response.text || "";
}

export async function generateImage(prompt: string, base64Data?: string, mimeType?: string): Promise<string> {
  // Use the user's selected API key for image generation
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not defined.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const contents: any = {
    parts: [{ text: prompt }]
  };

  if (base64Data && mimeType) {
    contents.parts.unshift({
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: contents,
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated");
}
