export const IMAGE_MODELS = [
  {
    id: "gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image",
    hint: "Latest stable image model (fast + strong instruction following).",
  },
  {
    id: "gemini-3-pro-image-preview",
    label: "Gemini 3 Pro Image (Preview)",
    hint: "Preview model — higher fidelity, may be rate-limited.",
  },
] as const;

export type ImageModelId = (typeof IMAGE_MODELS)[number]["id"];

export const IMAGE_MODEL_IDS = IMAGE_MODELS.map((model) => model.id);
