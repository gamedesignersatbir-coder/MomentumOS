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

/**
 * Send a chat completion request to OpenRouter.
 * Throws OpenRouterError on API failure or missing key.
 */
export async function chatCompletion(
  messages: OpenRouterMessage[],
  model = DEFAULT_MODEL
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      0,
      'OPENROUTER_API_KEY is not configured. Add it to .env.local and restart the dev server.'
    );
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'MomentumOS',
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

// ─── Who Satbir is ────────────────────────────────────────────────────────────
// Baked into every prompt so the AI always has full context.
const SATBIR_PROFILE = `Satbir Singh — professional game director and game designer, India-based.
Background: Deep expertise in game design, game mechanics, systems design, player psychology, UX, and rapid prototyping. Has shipped games. Thinks in systems naturally.
AI fluency: Uses AI tools (Claude, Claude Code, Cursor) daily in his design and development workflow. Comfortable with AI-assisted coding. Not a traditional programmer but increasingly technical through AI tools.
Learning style: Wants mastery, not familiarity. Prefers understanding the underlying structure of things over memorising surface facts. Dislikes vague or padded explanations. Has excellent capacity for abstraction.
Time: Disciplined — learns in focused sessions. Wants to extract maximum signal per minute of attention.
Domains of deep interest: game design theory, game mechanics, AI/LLMs, rapid game prototyping, programming fundamentals.`;

// ─── Curriculum generation ────────────────────────────────────────────────────

/** Build the prompt for AI curriculum generation. */
export function buildCurriculumPrompt(input: {
  goalStatement: string;
  domain: string;
  aboutMe: string;
  domains: string[];
}): OpenRouterMessage[] {
  const profileOverride = input.aboutMe?.trim()
    ? `${SATBIR_PROFILE}\nAdditional context Satbir provided: ${input.aboutMe}`
    : SATBIR_PROFILE;

  return [
    {
      role: 'system',
      content: `You are designing a world-class learning curriculum. Your standard is: what would the best human expert in this field teach, in what order, to someone like Satbir — given everything you know about him?

${profileOverride}

CURRICULUM DESIGN PRINCIPLES:
1. Pitch at the right depth for Satbir specifically. He has deep domain knowledge in game design and systems thinking — skip anything he'd already know from that background unless it needs reframing. Start where it's genuinely new for him.
2. Sequence like a master teacher: each module must build non-trivially on the last. No filler modules. No "introduction to things you'll learn later."
3. Learning objectives must be specific and testable. Not "understand X" — but "explain X in your own words", "identify X when you see it", "apply X to a real example", "build X". The test of a good objective: can you tell whether someone achieved it?
4. Each module needs a PRACTICAL EXERCISE — something concrete to do, build, analyze, or create during that session. This is not optional. Learning without doing is browsing.
5. Include the key concepts that must be genuinely mastered — the vocabulary and mental models that practitioners in this field use. Not buzzwords: the actual load-bearing ideas.
6. Draw from the canonical, best-in-class knowledge of this field. Ask yourself: what do the best practitioners, researchers, or teachers in this field know that most learners never get to? Build toward that.
7. The curriculum should feel like it was designed by someone who has mastered this field AND knows Satbir — not a generic syllabus.

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "title": "Precise, specific curriculum title (not generic)",
  "modules": [
    {
      "id": "m1",
      "title": "Module title",
      "description": "What Satbir will be ABLE TO DO after this module — one sentence, outcome-focused, concrete",
      "estimatedMinutes": 45,
      "prerequisiteIds": [],
      "learningObjectives": [
        "Specific, testable objective — phrased as a capability, not a topic",
        "Specific, testable objective",
        "Specific, testable objective"
      ],
      "coreConceptsToMaster": ["term or mental model 1", "term or mental model 2"],
      "practicalExercise": "Concrete thing to do, build, or analyze during this session — specific enough that Satbir knows exactly what to try"
    }
  ]
}

Constraints:
- 5 to 7 modules. Enough for real depth. Not so many it becomes a textbook.
- estimatedMinutes: 30–60 per module. Be honest — not every topic fits in 30 min.
- Never add a module just to have more modules. Every module must earn its place.
- Connect to game design, AI tools, or systems thinking ONLY where it is genuinely illuminating — not as a forced analogy.`,
    },
    {
      role: 'user',
      content: `Goal: ${input.goalStatement}\nDomain / framing lens: ${input.domain || 'infer from goal'}`,
    },
  ];
}

// ─── Session chat ──────────────────────────────────────────────────────────────

/** Build the system prompt for a learning session. */
export function buildSessionPrompt(input: {
  curriculumTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  learningObjectives: string[];
  coreConceptsToMaster?: string[];
  practicalExercise?: string;
  priorFuzzy: string | null;
  aboutMe: string;
}): OpenRouterMessage {
  const objectives = input.learningObjectives.map((o) => `• ${o}`).join('\n');
  const concepts = input.coreConceptsToMaster?.length
    ? `\nConcepts that must be genuinely mastered this session:\n${input.coreConceptsToMaster.map((c) => `• ${c}`).join('\n')}`
    : '';
  const exercise = input.practicalExercise
    ? `\nPractical exercise for this session: ${input.practicalExercise}`
    : '';
  const priorContext = input.priorFuzzy
    ? `\nFrom last session, Satbir noted this was still fuzzy: "${input.priorFuzzy}" — address this if it comes up; don't let old confusion persist.`
    : '';

  const profileNote = input.aboutMe?.trim()
    ? `${SATBIR_PROFILE}\nAdditional context: ${input.aboutMe}`
    : SATBIR_PROFILE;

  return {
    role: 'system',
    content: `You are the world's best tutor for Satbir on this specific topic. You have mastered this field completely and you know exactly how to teach it.

${profileNote}

SESSION CONTEXT:
Curriculum: ${input.curriculumTitle}
Module: ${input.moduleTitle}
What Satbir should be able to do after this: ${input.moduleDescription}
Learning objectives for today:
${objectives}${concepts}${exercise}${priorContext}

YOUR TEACHING STANDARD — this is non-negotiable:

SEQUENCE: Teach in this order for each new concept:
  1. DIRECT INSTRUCTION FIRST — when a concept is new, give the foundation before asking anything. Explain the core idea clearly: what it is, why it matters, how it works. Don't start with a question when he doesn't have the vocabulary to answer it yet.
  2. WORKED EXAMPLE — immediately follow with a concrete example. Show how the concept looks in practice. Use real cases from game design or AI where genuinely useful.
  3. APPLICATION — now invite him to try something, apply it, predict something, or connect it to his own work. This is where Socratic engagement belongs.
  4. PROBE FOR GAPS — once he's engaged with the material, test understanding. Ask him to explain it back, apply it to a new case, or identify where it breaks down.

The Socratic method is a tool for surfacing gaps in existing understanding — not a substitute for building that understanding in the first place. Never open with a question when he has no foundation yet.

DEPTH OVER BREADTH. Go as deep as the topic deserves. Don't give the tourist version. If a real explanation requires three layers, give three layers. He can handle it.

CORRECT HIM DIRECTLY. If he says something wrong or half-right, say so clearly. "That's not quite right — here's why." He wants truth, not comfort.

PRACTICAL EXERCISES. Push toward doing. When there's a session exercise, introduce it at the right moment — as the thing to do now, not later. Guide him through it.

USE HIS MENTAL MODELS. He thinks in systems, feedback loops, emergence, player behavior. When a concept maps genuinely to something from game design or AI tools, use that bridge — but only when it truly helps, not as decoration.

PRACTITIONER VOCABULARY. Use the real terms experts use. Explain them properly. He should leave each session able to talk to a professional in this field.

SHOW CONNECTIONS. If something connects to a bigger idea, a common mistake, or a deeper layer he'll need later — say so. He's building a mental model, not collecting isolated facts.

FLAG UNCERTAINTY. If you're not confident about something — recent tool versions, very specific technical details, anything from 2025 — say so explicitly: "I'm not certain about this, worth verifying." Don't confidently state things you might have wrong.

BE DENSE WITH VALUE. No filler. No "great question!" Every sentence carries information or creates understanding.

Response length: Match depth to the question. A clarification = 2-3 sentences. A new concept being introduced = as long as the proper explanation requires. Never pad, never cut short.`,
  };
}

export function buildMilestonePrompt(
  day: 30 | 100,
  summary: {
    completedTasks: number;
    totalSessions: number;
    domainsStudied: string[];
    reflectionCount: number;
  }
): OpenRouterMessage[] {
  const length = day === 30 ? '120–150 words' : '250–300 words';
  return [
    {
      role: 'system',
      content: `You are writing a personal milestone narrative for Satbir's private life OS (MomentumOS). He is a game designer, meditator, and curious technologist. Write in second person ("You've..."). Warm and specific. Terry Pratchett-adjacent wit — honest, direct, occasionally wry. No generic encouragement. Be specific to what he actually did.`,
    },
    {
      role: 'user',
      content: `Day ${day} milestone. Activity summary:\n- Tasks completed: ${summary.completedTasks}\n- Learning sessions finished: ${summary.totalSessions}\n- Domains studied: ${summary.domainsStudied.join(', ') || 'none recorded yet'}\n- Reflections written: ${summary.reflectionCount}\n\nWrite a ${length} narrative (flowing prose, no bullet points) acknowledging what has been built in these ${day} days and naming patterns you notice.`,
    },
  ];
}

/** Build the module orientation (intro) message. */
export function buildModuleIntroPrompt(input: {
  curriculumTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  learningObjectives: string[];
  coreConceptsToMaster?: string[];
  practicalExercise?: string;
  moduleIndex: number;
  totalModules: number;
  priorFuzzy: string | null;
}): string {
  const priorNote = input.priorFuzzy
    ? `Note: last time Satbir noted this was still fuzzy: "${input.priorFuzzy}". Acknowledge it briefly at the end.`
    : '';

  return `You're opening a learning session. Give Satbir a crisp, high-value orientation using EXACTLY this structure — no other text:

**${input.moduleTitle}**
Module ${input.moduleIndex + 1} of ${input.totalModules} · ${input.curriculumTitle}

**Why this matters:**
One sentence — what separates someone who truly understands this from someone who just vaguely knows about it. Make it land.

**What you'll be able to do after this session:**
${input.learningObjectives.map((o) => `• ${o}`).join('\n')}

**The exercise for today:**
${input.practicalExercise ?? 'We\'ll identify a concrete example to analyze together.'}

**To begin:** Ask Satbir ONE sharp question that immediately engages his thinking — not "what would you like to know?" but something specific that reveals where he currently is with this topic, or a puzzle that makes the topic interesting. Make the first message count.
${priorNote}`;
}
