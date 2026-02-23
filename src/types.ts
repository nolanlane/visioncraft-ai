export interface Suggestion {
  id: string;
  title: string;
  description: string;
  reasoning: string;
}

export interface AnalysisResult {
  suggestions: Suggestion[];
  imageDescription: string;
  userGuidance?: string;
}

export type AppState = 'idle' | 'analyzing' | 'suggesting' | 'generating' | 'result';
