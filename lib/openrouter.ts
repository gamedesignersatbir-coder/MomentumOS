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

/** Build the system prompt for curriculum generation. */
export function buildCurriculumPrompt(input: {
  goalStatement: string;
  domain: string;
  aboutMe: string;
  domains: string[];
}): OpenRouterMessage[] {
  const domainsStr = input.domains.join(', ') || 'AI, game design, gaming, tech';
  return [
    {
      role: 'system',
      content: `You are a learning curriculum designer. Generate a focused, structured curriculum.

User: Satbir — ${input.aboutMe || 'game designer and AI enthusiast, India-based, experienced in game design, new to programming'}.
User's domains of interest: ${domainsStr}.

Return ONLY a valid JSON object — no markdown fences, no explanation, just the JSON:
{
  "title": "Concise curriculum title",
  "modules": [
    {
      "id": "m1",
      "title": "Module title",
      "description": "What this module covers in one sentence",
      "estimatedMinutes": 45,
      "prerequisiteIds": [],
      "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"]
    }
  ]
}

Rules:
- 4 to 7 modules
- Each module completable in 30–60 minutes
- Start simple, build progressively
- Connect to Satbir's domains where possible (game design examples, AI tools)
- No prerequisites for the first module`,
    },
    {
      role: 'user',
      content: `Goal: ${input.goalStatement}\nDomain: ${input.domain}`,
    },
  ];
}

/** Build the system prompt for a learning session chat. */
export function buildSessionPrompt(input: {
  curriculumTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  learningObjectives: string[];
  priorFuzzy: string | null;
  aboutMe: string;
}): OpenRouterMessage {
  const objectives = input.learningObjectives.map((o) => `- ${o}`).join('\n');
  const priorContext = input.priorFuzzy
    ? `\nLast session note: "${input.priorFuzzy}" — keep this in mind.`
    : '';
  return {
    role: 'system',
    content: `You are a knowledgeable learning coach for Satbir — ${input.aboutMe || 'a game designer curious about AI and technology'}.

Curriculum: ${input.curriculumTitle}
Module: ${input.moduleTitle}
What this covers: ${input.moduleDescription}
Learning objectives:
${objectives}
${priorContext}

Guidelines:
- Answer clearly and concisely (2–3 paragraphs maximum unless more is genuinely needed)
- Connect concepts to game design or AI when it helps understanding
- If a question is vague, ask one clarifying question before answering
- Don't pad responses or add unnecessary caveats
- When the user seems to understand a concept, suggest they try the next objective`,
  };
}
