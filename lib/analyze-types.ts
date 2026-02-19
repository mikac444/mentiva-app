export type GoalWithSteps = {
  goal: string;
  area?: string;
  steps: string[];
};

export type AnalysisResult = {
  summary: string;
  themes: string[];
  goals: string[];
  patterns: string[];
  actionSteps: { step: number; title: string; description: string }[];
  goalsWithSteps: GoalWithSteps[];
  insight: string;
};
