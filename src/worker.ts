import { GoogleGenAI } from "@google/genai";

export interface Env {
  GEMINI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only allow POST requests to /api/gemini
    if (request.method !== "POST" || url.pathname !== "/api/gemini") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const { action, payload } = await request.json() as any;
      const genAI = new GoogleGenAI(env.GEMINI_API_KEY);

      if (action === "analyzeImage") {
        const model = genAI.getGenerativeModel({ 
          model: "gemini-3-flash-preview",
          generationConfig: { responseMimeType: "application/json" }
        });
        
        const result = await model.generateContent([
          {
            inlineData: {
              data: payload.base64Data,
              mimeType: payload.mimeType,
            },
          },
          { text: payload.prompt },
        ]);
        
        return new Response(result.response.text(), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (action === "generatePrompt") {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(payload.prompt);
        return new Response(JSON.stringify({ text: result.response.text() }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (action === "generateImage") {
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });
        const result = await model.generateContent(payload.prompt);
        // Handle image response...
        return new Response(JSON.stringify({ text: result.response.text() }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Invalid Action", { status: 400 });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
