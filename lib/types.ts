export interface Settings {
  display_name: string;
  timezone: string;
  first_used_at: string;
}

export interface Task {
  id: number;
  title: string;
  url: string | null;
  status: 'active' | 'done' | 'dropped';
  day: string; // YYYY-MM-DD in the user's timezone
  created_at: string;
  done_at: string | null;
}

export interface Reflection {
  id: number;
  day: string;
  text: string;
  created_at: string;
}

export interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  learningObjectives: string[];
  coreConceptsToMaster?: string[];
  practicalExercise?: string;
}

export interface Curriculum {
  id: number;
  title: string;
  goal: string;
  modules: CurriculumModule[];
  created_at: string;
  archived: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Session {
  id: number;
  curriculum_id: number;
  module_index: number;
  messages: ChatMessage[];
  fuzzy: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Review {
  curriculum_id: number;
  module_index: number;
  stage: number;
  due: string;
  dismissed: boolean;
}

export interface BriefingItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO
}

export interface Briefing {
  window_key: string;
  items: BriefingItem[];
  created_at: string;
}

export interface SavedItem {
  id: number;
  title: string;
  url: string;
  source: string | null;
  saved_at: string;
}

export interface Source {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
}
