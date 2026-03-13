export type DashboardData = {
  priorities: Array<{
    id: number;
    title: string;
    detail: string;
    status: string;
    rank: number;
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
};
