export interface ResurfacedReflection {
  id: number;
  energy_win: string;
  learning_edge: string;
  family_note: string;
  suggestion: string;
  created_at: string;
  resurfaced_at: string | null;
  days_ago: number;
}

export type DashboardData = {
  priorities: Array<{
    id: number;
    title: string;
    detail: string;
    status: string;
    rank: number;
    intensity?: string | null;
    updated_at?: string;
  }>;
  focusBlocks: Array<{
    id: number;
    label: string;
    startTime: string;
    endTime: string;
    intensity: string;
    status: string;
  }>;
  quickTasks: Array<{
    id: number;
    title: string;
    status: string;
  }>;
  learningEntries: Array<{
    id: number;
    topic: string;
    minutes: number;
    notes: string;
    confidence: number;
    nextAction: string;
  }>;
  prompts: Array<{
    id: number;
    title: string;
    content: string;
    tags: string[];
  }>;
  tags: string[];
  weeklyTrend: Array<{
    date: string;
    label: string;
    completionRate: number;
  }>;
  summary: {
    completedPriorities: number;
    completedToday: number;
    learningMinutesWeek: number;
    streakDays: number;
    momentumScore: number;
    nextReviewCue: string;
    learningConfidenceAverage: number;
  };
  resurfacedReflection: ResurfacedReflection | null;
};

export interface UserProfile {
  id: number;
  display_name: string;
  timezone: string;
  sadhana_morning_end: number;
  sadhana_afternoon_start: number;
  sadhana_afternoon_end: number;
  work_start: number;
  work_end: number;
  domains_json: string;
  about_me: string;
  created_at: string;
  updated_at: string;
}
