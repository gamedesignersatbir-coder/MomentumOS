// lib/greetings-library.ts

export interface GreetingMessage {
  id: string;
  text: string;
  // All context flags are optional — message matches if ALL provided flags match
  mode?: string;          // TimeMode value
  loadLevel?: string;     // 'empty' | 'normal' | 'full' | 'overloaded'
  dayOfWeek?: number;     // 0=Sun, 1=Mon ... 6=Sat
  isAbsent?: boolean;     // true = user hasn't opened in 3+ days
  milestone?: number;     // day number (30, 100, etc.)
}

export const GREETINGS: GreetingMessage[] = [
  // --- QUIET / SADHANA ---
  {
    id: 'quiet-1',
    text: "This is your reflection time. Everything here will wait.",
    mode: 'quiet-morning',
  },
  {
    id: 'quiet-2',
    text: "Morning practice. The tasks are patient.",
    mode: 'quiet-morning',
  },
  {
    id: 'quiet-3',
    text: "Your afternoon session. The world can wait fifteen more minutes.",
    mode: 'quiet-afternoon',
  },
  {
    id: 'quiet-4',
    text: "Second session. The to-do list has not run away.",
    mode: 'quiet-afternoon',
  },

  // --- MORNING BRIEF ---
  {
    id: 'morning-1',
    text: "Morning. Three things. One direction. Let's see what today is made of.",
    mode: 'morning-brief',
  },
  {
    id: 'morning-2',
    text: "The day has begun. It has opinions. So do you. Shall we negotiate?",
    mode: 'morning-brief',
  },
  {
    id: 'morning-3',
    text: "Good morning. The universe is prepared. Are you?",
    mode: 'morning-brief',
  },
  {
    id: 'morning-monday',
    text: "It's Monday. The universe is aware. So are you. Advantage: you.",
    mode: 'morning-brief',
    dayOfWeek: 1,
  },
  {
    id: 'morning-friday',
    text: "Friday morning. The finish line is visible. Don't look at it too long.",
    mode: 'morning-brief',
    dayOfWeek: 5,
  },

  // --- FOCUS MODE ---
  {
    id: 'focus-1',
    text: "Deep work window. The internet will still be there later. Probably.",
    mode: 'focus',
  },
  {
    id: 'focus-2',
    text: "This is your best time. Use it on the thing that deserves it.",
    mode: 'focus',
  },
  {
    id: 'focus-3',
    text: "Two hours of undivided attention is worth a day of half-attention. Begin.",
    mode: 'focus',
  },

  // --- LUNCH ---
  {
    id: 'lunch-1',
    text: "Lunch. The rare moment when being unproductive is, in fact, the most productive thing you can do.",
    mode: 'lunch',
  },
  {
    id: 'lunch-2',
    text: "Midday pause. Rest is not the opposite of work — it's the fuel.",
    mode: 'lunch',
  },

  // --- AFTERNOON ---
  {
    id: 'afternoon-1',
    text: "Afternoon session. Lighter work suits this hour. The brain knows.",
    mode: 'afternoon',
  },
  {
    id: 'afternoon-2',
    text: "Second wind. Use it wisely — it's more reliable than the first.",
    mode: 'afternoon',
  },
  {
    id: 'afternoon-3',
    text: "The day is gathering itself. What needs wrapping up?",
    mode: 'afternoon',
  },

  // --- EVENING ---
  {
    id: 'evening-1',
    text: "Home time. The work can wait. The people cannot.",
    mode: 'evening',
  },
  {
    id: 'evening-2',
    text: "Evening. The news is in. The family is better.",
    mode: 'evening',
  },
  {
    id: 'evening-3',
    text: "This hour belongs to you, not the job. Don't let it steal it.",
    mode: 'evening',
  },

  // --- REFLECTION ---
  {
    id: 'reflection-1',
    text: "End of day. What actually happened? Let's find out.",
    mode: 'reflection',
  },
  {
    id: 'reflection-2',
    text: "Night comes with questions. Tonight: what moved?",
    mode: 'reflection',
  },
  {
    id: 'reflection-3',
    text: "The day is closing its accounts. A few minutes to settle them.",
    mode: 'reflection',
  },

  // --- LOAD LEVEL: EMPTY ---
  {
    id: 'empty-1',
    text: "The to-do list is suspiciously empty. Either you've conquered everything, or you haven't started yet.",
    loadLevel: 'empty',
  },
  {
    id: 'empty-2',
    text: "Nothing here yet. The canvas is yours.",
    loadLevel: 'empty',
  },

  // --- LOAD LEVEL: OVERLOADED ---
  {
    id: 'full-1',
    text: "The to-do list has been training. It is in excellent shape. You, meanwhile, might want a triage.",
    loadLevel: 'overloaded',
  },
  {
    id: 'full-2',
    text: "There are more things here than hours. One of them is not the problem.",
    loadLevel: 'overloaded',
  },

  // --- ABSENT (3+ days away) ---
  {
    id: 'absent-1',
    text: "You're back. The app kept everything warm.",
    isAbsent: true,
  },
  {
    id: 'absent-2',
    text: "A few days away. Nothing burned down. Welcome back.",
    isAbsent: true,
  },

  // --- MILESTONE: DAY 30 ---
  {
    id: 'milestone-30',
    text: "Thirty days. The Stoics would be impressed. So would your future self.",
    milestone: 30,
  },

  // --- MILESTONE: DAY 100 ---
  {
    id: 'milestone-100',
    text: "One hundred days. That's not a habit — that's a life.",
    milestone: 100,
  },

  // --- GENERIC FALLBACKS (no context required) ---
  {
    id: 'generic-1',
    text: "Every good day starts with knowing what it's for.",
  },
  {
    id: 'generic-2',
    text: "One clear priority is worth three vague ones. Always.",
  },
  {
    id: 'generic-3',
    text: "The work is here when you're ready.",
  },
  {
    id: 'generic-4',
    text: "Progress, not perfection. The list will still be here tomorrow.",
  },
  {
    id: 'generic-5',
    text: "You know more than you think you do. Begin.",
  },
  {
    id: 'generic-6',
    text: "A day well-used is better than a day well-planned.",
  },
  {
    id: 'generic-7',
    text: "Curiosity is not distraction. It's just enthusiasm without direction yet.",
  },
  {
    id: 'generic-8',
    text: "Today is, technically, a new day. All evidence suggests it will cooperate.",
  },
  {
    id: 'generic-9',
    text: "The sadhana is done. The mind is clear. Now — what deserves that clarity?",
  },
];
