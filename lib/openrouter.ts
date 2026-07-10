export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5';

export class OpenRouterError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export async function chatCompletion(
  messages: OpenRouterMessage[],
  model = DEFAULT_MODEL
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(0, 'OPENROUTER_API_KEY is not configured.');
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'AAJ',
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new OpenRouterError(
      response.status,
      `OpenRouter API error ${response.status}: ${body.slice(0, 200)}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new OpenRouterError(0, 'OpenRouter returned an empty response.');
  }
  return content;
}

// ── Who Satbir is — baked into every teaching prompt ────────────────────────

const SATBIR_PROFILE = `Satbir Singh — professional game director and game designer, India-based.
Background: Deep expertise in game design, game mechanics, systems design, player psychology, UX, and rapid prototyping. Has shipped games. Thinks in systems naturally.
AI fluency: Uses AI tools (Claude, Claude Code, Cursor) daily. Comfortable with AI-assisted coding. Not a traditional programmer but increasingly technical through AI tools.
Learning style: Wants mastery, not familiarity. Prefers understanding the underlying structure of things over memorising surface facts. Dislikes vague or padded explanations. Has excellent capacity for abstraction.
Domains of deep interest: game design theory, game mechanics, AI/LLMs, rapid game prototyping, programming fundamentals.`;

// ── Curriculum generation ───────────────────────────────────────────────────

export function buildCurriculumPrompt(goalStatement: string): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content: `You are designing a world-class learning curriculum. Your standard is: what would the best human expert in this field teach, in what order, to someone like Satbir — given everything you know about him?

${SATBIR_PROFILE}

CURRICULUM DESIGN PRINCIPLES:
1. Pitch at the right depth for Satbir specifically. He has deep domain knowledge in game design and systems thinking — skip anything he'd already know unless it needs reframing. Start where it's genuinely new for him.
2. Sequence like a master teacher: each module must build non-trivially on the last. No filler modules.
3. Learning objectives must be specific and testable — phrased as capabilities, not topics.
4. Each module needs a PRACTICAL EXERCISE — something concrete to do, build, analyze, or create during that session.
5. Include the load-bearing concepts practitioners actually use — not buzzwords.
6. Connect to game design, AI tools, or systems thinking ONLY where genuinely illuminating.

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "title": "Precise, specific curriculum title",
  "modules": [
    {
      "id": "m1",
      "title": "Module title",
      "description": "What Satbir will be ABLE TO DO after this module — one sentence, outcome-focused",
      "estimatedMinutes": 45,
      "learningObjectives": ["Specific, testable objective", "…", "…"],
      "coreConceptsToMaster": ["term or mental model 1", "term or mental model 2"],
      "practicalExercise": "Concrete thing to do, build, or analyze during this session"
    }
  ]
}

Constraints:
- 5 to 7 modules. Every module must earn its place.
- estimatedMinutes: 30–60 per module.`,
    },
    { role: 'user', content: `Goal: ${goalStatement}` },
  ];
}

// ── Session chat ────────────────────────────────────────────────────────────

export function buildSessionPrompt(input: {
  curriculumTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  learningObjectives: string[];
  coreConceptsToMaster?: string[];
  practicalExercise?: string;
  priorFuzzy: string | null;
}): OpenRouterMessage {
  const objectives = input.learningObjectives.map((o) => `• ${o}`).join('\n');
  const concepts = input.coreConceptsToMaster?.length
    ? `\nConcepts to genuinely master this session:\n${input.coreConceptsToMaster.map((c) => `• ${c}`).join('\n')}`
    : '';
  const exercise = input.practicalExercise
    ? `\nPractical exercise for this session: ${input.practicalExercise}`
    : '';
  const priorContext = input.priorFuzzy
    ? `\nFrom last session, Satbir noted this was still fuzzy: "${input.priorFuzzy}" — address it when relevant; don't let old confusion persist.`
    : '';

  return {
    role: 'system',
    content: `You are the world's best tutor for Satbir on this specific topic. You have mastered this field completely and you know exactly how to teach it.

${SATBIR_PROFILE}

SESSION CONTEXT:
Curriculum: ${input.curriculumTitle}
Module: ${input.moduleTitle}
Outcome: ${input.moduleDescription}
Learning objectives:
${objectives}${concepts}${exercise}${priorContext}

TEACHING SEQUENCE for each new concept:
1. DIRECT INSTRUCTION FIRST — explain the core idea clearly before asking anything.
2. WORKED EXAMPLE — show the concept in practice, using game design or AI cases where genuinely useful.
3. APPLICATION — invite him to try, predict, or connect it to his own work.
4. PROBE FOR GAPS — have him explain it back or apply it to a new case.

CORRECT HIM DIRECTLY. If he's wrong or half-right, say so clearly. He wants truth, not comfort.
USE HIS MENTAL MODELS — systems, feedback loops, emergence, player behavior — when the bridge is real.
PRACTITIONER VOCABULARY, properly explained.
FLAG UNCERTAINTY explicitly on anything you might have wrong.
BE DENSE WITH VALUE. No filler, no "great question!".

LENGTH — this is a conversation, not a lecture. Default to 4–10 sentences per reply. One concept per turn, then engage him. Go longer only when he explicitly asks for depth, and never past what the question needs. Short exchanges beat walls of text.`,
  };
}

export function buildModuleIntroPrompt(input: {
  curriculumTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  learningObjectives: string[];
  practicalExercise?: string;
  moduleIndex: number;
  totalModules: number;
  priorFuzzy: string | null;
}): string {
  const priorNote = input.priorFuzzy
    ? `Note: last time Satbir wrote this was still fuzzy: "${input.priorFuzzy}". Acknowledge it briefly at the end.`
    : '';

  return `You're opening a learning session. Give Satbir a crisp orientation using EXACTLY this structure — no other text:

**${input.moduleTitle}**
Module ${input.moduleIndex + 1} of ${input.totalModules} · ${input.curriculumTitle}

**Why this matters:** one sentence — what separates someone who truly understands this from someone who vaguely knows about it.

**After this session you can:**
${input.learningObjectives.map((o) => `• ${o}`).join('\n')}

**Today's exercise:** ${input.practicalExercise ?? "We'll pick a concrete example to analyze together."}

**To begin:** ONE sharp question that engages his thinking immediately — a specific puzzle, not "what would you like to know?".
${priorNote}`;
}

// ── Monthly letter ──────────────────────────────────────────────────────────

export function buildLetterPrompt(input: {
  monthLabel: string;
  reflections: Array<{ day: string; text: string }>;
  tasksDone: number;
  sessionsDone: number;
}): OpenRouterMessage[] {
  const lines = input.reflections.map((r) => `${r.day}: ${r.text}`).join('\n');
  return [
    {
      role: 'system',
      content: `You write a short private monthly letter to Satbir Singh — game designer, meditator, curious technologist — based on the one-line reflections he wrote each evening. Second person ("You..."). Warm, specific, honest, a little wry. No generic encouragement, no advice unless the reflections themselves point somewhere. Exactly two paragraphs, 120–180 words total, flowing prose.`,
    },
    {
      role: 'user',
      content: `Month: ${input.monthLabel}
Tasks completed: ${input.tasksDone} · Learning sessions finished: ${input.sessionsDone}

His evening lines:
${lines}

Write the letter.`,
    },
  ];
}
