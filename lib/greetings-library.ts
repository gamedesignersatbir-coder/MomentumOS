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

  // ── quiet-morning additions ──────────────────────────────────
  {
    id: 'quiet-morning-3',
    text: 'Morning practice. The rest of the day can wait.',
    mode: 'quiet-morning',
  },
  {
    id: 'quiet-morning-4',
    text: 'This hour belongs to you. Not the inbox.',
    mode: 'quiet-morning',
  },
  {
    id: 'quiet-morning-5',
    text: 'Before the day begins, a moment of stillness. Good.',
    mode: 'quiet-morning',
  },

  // ── quiet-afternoon additions ─────────────────────────────────
  {
    id: 'quiet-afternoon-3',
    text: "The afternoon pause. Let the morning's work settle.",
    mode: 'quiet-afternoon',
  },
  {
    id: 'quiet-afternoon-4',
    text: 'Sadhana time. The screen can wait.',
    mode: 'quiet-afternoon',
  },
  {
    id: 'quiet-afternoon-5',
    text: 'A second stillness. The day is better for it.',
    mode: 'quiet-afternoon',
  },

  // ── morning-brief additions ───────────────────────────────────
  {
    id: 'morning-brief-6',
    text: "The day's shape is still soft. Good time to set it.",
    mode: 'morning-brief',
  },
  {
    id: 'morning-brief-7',
    text: "Eight hours is enough — if you don't spend them deciding what to do.",
    mode: 'morning-brief',
  },
  {
    id: 'morning-brief-8',
    text: 'Good morning. The calendar has opinions. You have priorities. Let the better argument win.',
    mode: 'morning-brief',
  },
  {
    id: 'morning-brief-9',
    text: "Start before you're ready. You never will be.",
    mode: 'morning-brief',
  },
  {
    id: 'morning-brief-10',
    text: 'The best mornings begin with one clear decision.',
    mode: 'morning-brief',
  },
  {
    id: 'morning-brief-11',
    text: 'Morning. The cursor is ready. Are you?',
    mode: 'morning-brief',
  },

  // ── focus additions ───────────────────────────────────────────
  {
    id: 'focus-4',
    text: "The work doesn't need you to feel ready. Just to begin.",
    mode: 'focus',
  },
  {
    id: 'focus-5',
    text: "You've cleared the morning. Now it's just you and the work.",
    mode: 'focus',
  },
  {
    id: 'focus-6',
    text: 'Somewhere between starting and finishing, momentum finds you.',
    mode: 'focus',
  },
  {
    id: 'focus-7',
    text: 'Nothing complicated. Just this next thing, done well.',
    mode: 'focus',
  },
  {
    id: 'focus-8',
    text: "The best work doesn't announce itself. It gets done.",
    mode: 'focus',
  },
  {
    id: 'focus-9',
    text: 'Two hours of real work outweighs a day of half-attention.',
    mode: 'focus',
  },

  // ── lunch additions ───────────────────────────────────────────
  {
    id: 'lunch-3',
    text: 'Lunch is not a desk activity.',
    mode: 'lunch',
  },
  {
    id: 'lunch-4',
    text: 'Feed yourself properly. The afternoon will thank you.',
    mode: 'lunch',
  },
  {
    id: 'lunch-5',
    text: 'The meal deserves your full attention.',
    mode: 'lunch',
  },

  // ── afternoon additions ───────────────────────────────────────
  {
    id: 'afternoon-4',
    text: 'The morning built it. The afternoon can finish it.',
    mode: 'afternoon',
  },
  {
    id: 'afternoon-5',
    text: 'Mid-afternoon clarity: rare, useful, worth catching.',
    mode: 'afternoon',
  },
  {
    id: 'afternoon-6',
    text: 'The afternoon shift is underrated. Quieter. More honest.',
    mode: 'afternoon',
  },
  {
    id: 'afternoon-7',
    text: "You've made it past lunch. That's worth something.",
    mode: 'afternoon',
  },
  {
    id: 'afternoon-8',
    text: "A few good hours remain. They don't expire if you use them.",
    mode: 'afternoon',
  },

  // ── transition mode (new) ─────────────────────────────────────
  {
    id: 'transition-1',
    text: 'The work day is wrapping up. Let it.',
    mode: 'transition',
  },
  {
    id: 'transition-2',
    text: 'Time to close the loops. Or consciously leave them open.',
    mode: 'transition',
  },
  {
    id: 'transition-3',
    text: 'The next version of this problem can wait until tomorrow.',
    mode: 'transition',
  },

  // ── evening additions ─────────────────────────────────────────
  {
    id: 'evening-4',
    text: "The day's work is mostly done. Let it settle.",
    mode: 'evening',
  },
  {
    id: 'evening-5',
    text: 'Evening. The pressure drops. What was worth it?',
    mode: 'evening',
  },
  {
    id: 'evening-6',
    text: 'Dinner deserves your full attention.',
    mode: 'evening',
  },
  {
    id: 'evening-7',
    text: "The work will still be there tomorrow. Tonight needn't be.",
    mode: 'evening',
  },
  {
    id: 'evening-8',
    text: 'Good evenings are quiet ones.',
    mode: 'evening',
  },
  {
    id: 'evening-9',
    text: 'Evening mode. The urgent things are, mostly, done.',
    mode: 'evening',
  },

  // ── reflection additions ──────────────────────────────────────
  {
    id: 'reflection-4',
    text: 'Not every day needs a lesson. But they all offer one.',
    mode: 'reflection',
  },
  {
    id: 'reflection-5',
    text: 'What happened today that surprised you?',
    mode: 'reflection',
  },
  {
    id: 'reflection-6',
    text: 'The day is requesting a summary. Keep it honest.',
    mode: 'reflection',
  },
  {
    id: 'reflection-7',
    text: 'Write it down before sleep rewrites it.',
    mode: 'reflection',
  },
  {
    id: 'reflection-8',
    text: 'A few minutes of reflection is worth an hour of regret.',
    mode: 'reflection',
  },

  // ── absent additions ──────────────────────────────────────────
  {
    id: 'absent-3',
    text: "You've been away. Things waited patiently.",
    isAbsent: true,
  },
  {
    id: 'absent-4',
    text: 'A few days off. The work survived.',
    isAbsent: true,
  },
  {
    id: 'absent-5',
    text: "You're back. Everything held together without you, as it should.",
    isAbsent: true,
  },
  {
    id: 'absent-6',
    text: 'Welcome back. Pick up where you left off — or start fresh. Either works.',
    isAbsent: true,
  },

  // ── load-level additions ──────────────────────────────────────
  {
    id: 'load-empty-3',
    text: 'The board is clear. A rare condition. Protect it.',
    loadLevel: 'empty',
  },
  {
    id: 'load-empty-4',
    text: "Nothing urgent. Use it or enjoy it — both are valid.",
    loadLevel: 'empty',
  },
  {
    id: 'load-overloaded-3',
    text: "That's a lot. Worth deciding what gets today and what gets later.",
    loadLevel: 'overloaded',
  },
  {
    id: 'load-overloaded-4',
    text: 'The pile has gotten ambitious. Time for a reckoning.',
    loadLevel: 'overloaded',
  },

  // ── day-of-week specific ──────────────────────────────────────
  {
    id: 'monday-1',
    text: 'Monday. Full of potential and mild dread, in roughly equal measure.',
    dayOfWeek: 1,
  },
  {
    id: 'tuesday-1',
    text: 'Tuesday. The week is in full motion now.',
    dayOfWeek: 2,
  },
  {
    id: 'wednesday-1',
    text: "Wednesday. Worth a quick check on whether you're still going the right direction.",
    dayOfWeek: 3,
  },
  {
    id: 'thursday-1',
    text: 'Thursday. Close enough to Friday to be optimistic about it.',
    dayOfWeek: 4,
  },
  {
    id: 'friday-1',
    text: 'Friday. The week wants to know what it earned.',
    dayOfWeek: 5,
  },
  {
    id: 'saturday-1',
    text: 'Saturday. The calendar is politely quiet.',
    dayOfWeek: 6,
  },
  {
    id: 'sunday-1',
    text: 'Sunday. The week is approaching. It can wait a few more hours.',
    dayOfWeek: 0,
  },

  // ── generic additions ─────────────────────────────────────────
  {
    id: 'generic-10',
    text: 'Hello, Satbir.',
  },
  {
    id: 'generic-11',
    text: 'Here you are.',
  },
  {
    id: 'generic-12',
    text: 'Ready when you are.',
  },
  {
    id: 'generic-13',
    text: 'The day is waiting for instructions.',
  },
  {
    id: 'generic-14',
    text: "What needs doing? Let's find out.",
  },
];
