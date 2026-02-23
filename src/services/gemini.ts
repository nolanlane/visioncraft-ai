import { AnalysisResult, Suggestion } from "../types";

async function callWorker(action: string, payload: any) {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to call Gemini Worker");
  }

  return response.json();
}

export async function analyzeImage(base64Data: string, mimeType: string, userGuidance?: string): Promise<AnalysisResult> {
  const prompt = `Analyze this image and provide 5 diverse, actionable suggestions for modifying or transforming it. 
  ${userGuidance ? `The user has provided the following guidance: "${userGuidance}". Prioritize suggestions that align with this guidance.` : ""}
  Ensure at least 2 suggestions are constructive enhancements (e.g., lighting, restoration, removing distracting objects, color correction).
  The other suggestions can be wildly creative transformations (e.g., surrealism, sci-fi elements, changing the environment).
  Use web search to find current trends or artistic styles that might fit.
  Return the result as a JSON object with 'imageDescription' and an array of 'suggestions'.
  Each suggestion should have 'id', 'title', 'description', and 'reasoning'.`;

  return callWorker("analyzeImage", { base64Data, mimeType, prompt });
}

export async function generatePrompt(
  suggestion: Suggestion,
  imageDescription: string
): Promise<string> {
  const prompt = `Based on the original image description: "${imageDescription}" and the selected modification: "${suggestion.title} - ${suggestion.description}", 
  create a concise, highly optimized text-to-image prompt for a high-end image generation model. 
  Focus on visual details, lighting, style, and composition. 
  The prompt should be a single paragraph of descriptive text.`;

  const result = await callWorker("generatePrompt", { prompt });
  return result.text;
}

export async function generateImage(prompt: string, base64Data?: string, mimeType?: string): Promise<string> {
  const result = await callWorker("generateImage", { prompt, base64Data, mimeType });
  return result.text;
}
