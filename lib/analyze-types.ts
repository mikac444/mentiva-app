export type AnalysisResult = {
  themes: string[];
  goals: string[];
  patterns: string[];
  actionSteps: { step: number; title: string; description: string }[];
};
