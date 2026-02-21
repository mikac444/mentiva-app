export type GoalWithSteps = {
  goal: string;
  area?: string;
  steps: string[];
  emotionalWhy?: string;  // why this goal matters to THIS person
};

export type AnalysisResult = {
  summary: string;
  themes: string[];
  goals?: string[];            // deprecated: use goalsWithSteps instead (kept for old boards)
  patterns: string[];
  actionSteps?: { step: number; title: string; description: string }[];  // deprecated: use goalsWithSteps instead (kept for old boards)
  goalsWithSteps: GoalWithSteps[];
  insight: string;
  blindSpots?: string[];     // what's missing from their vision
  connections?: string[];     // how their goals connect
  visionType?: string;        // 'board_upload' | 'guided_discovery' | 'hybrid'
  _lang?: string;             // language the analysis was generated in ('en' | 'es')
};
