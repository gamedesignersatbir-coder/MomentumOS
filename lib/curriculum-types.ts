/** A single module within a curriculum */
export interface CurriculumModule {
  id: string;                    // e.g. "m1", "m2"
  title: string;
  description: string;
  estimatedMinutes: number;
  prerequisiteIds: string[];
  learningObjectives: string[];
  coreConceptsToMaster?: string[];   // key terms/ideas that must be understood
  practicalExercise?: string;        // concrete thing to do/build during session
}

/** Raw row shape returned by getCurriculumById / getCurricula */
export interface CurriculumRow {
  id: number;
  title: string;
  goalStatement: string;
  domain: string;
  modulesJson: string;           // JSON-serialised CurriculumModule[]
  createdAt: string;
}

/** Curriculum with modules parsed from JSON */
export interface Curriculum extends Omit<CurriculumRow, 'modulesJson'> {
  modules: CurriculumModule[];
}

/** Chat message stored in learning_sessions.chat_history_json */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;             // ISO timestamp
}

/** Raw row from learning_sessions */
export interface LearningSessionRow {
  id: number;
  curriculumId: number;
  moduleIndex: number;
  chatHistoryJson: string;       // JSON-serialised ChatMessage[]
  whatLanded: string;
  whatsFuzzy: string;
  confidence: number;
  nextAction: string;
  completedAt: string | null;
  createdAt: string;
}

/** Parsed domain options */
export const DOMAINS = [
  'AI',
  'game design',
  'gaming',
  'tech',
  'programming',
] as const;
export type Domain = (typeof DOMAINS)[number];

/** Parse CurriculumRow.modulesJson safely */
export function parseModules(modulesJson: string): CurriculumModule[] {
  try {
    const parsed = JSON.parse(modulesJson);
    return Array.isArray(parsed) ? (parsed as CurriculumModule[]) : [];
  } catch {
    return [];
  }
}

/** Parse LearningSessionRow.chatHistoryJson safely */
export function parseChatHistory(chatHistoryJson: string): ChatMessage[] {
  try {
    const parsed = JSON.parse(chatHistoryJson);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/** Convert minutes-since-midnight integer to HH:MM string */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Convert HH:MM string to minutes-since-midnight integer */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
