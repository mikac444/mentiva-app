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

export type NorthStar = {
  id: string;
  user_id: string;
  goal_text: string;
  source_board_id?: string | null;
  is_active: boolean;
  created_at: string;
};

export type Enfoque = {
  id: string;
  user_id: string;
  name: string;
  north_star_id: string;
  week_start: string;
  created_at: string;
};

export type MissionTask = {
  id: string;
  user_id: string;
  task_text: string;
  goal_name: string;
  task_type: "non_negotiable" | "secondary" | "micro";
  enfoque_name: string;
  estimated_minutes: number;
  completed: boolean;
  date: string;
  lang: string;
  sort_order: number;
};

export type StreakDay = {
  id: string;
  user_id: string;
  date: string;
  non_negotiable_completed: boolean;
};
