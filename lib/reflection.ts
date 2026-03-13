type SuggestionInput = {
  energyWin: string;
  learningEdge: string;
  familyNote: string;
  outstandingPriorities: number;
  learningConfidenceAverage: number;
};

function contains(text: string, patterns: string[]) {
  const lower = text.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern));
}

export function buildNextDaySuggestion(input: SuggestionInput) {
  const prioritiesCue =
    input.outstandingPriorities > 1
      ? "Start with the unfinished priority that removes the most drag."
      : "Begin with one decisive win before checking messages.";
  const learningCue =
    input.learningConfidenceAverage < 3.5 || contains(input.learningEdge, ["ai", "agent", "prompt"])
      ? "Reserve a 30-minute AI learning block with one concrete experiment."
      : "Use a short review block to lock in today's learning.";
  const familyCue = contains(input.familyNote, ["dinner", "school", "family", "home"])
    ? "Protect the family window on the calendar before adding extra work."
    : "Set one visible boundary that keeps the evening recoverable.";
  const energyCue = contains(input.energyWin, ["morning", "deep", "focus", "early"])
    ? "Repeat the same early deep-work setup that worked today."
    : "Create a lighter ramp into the day with a single focused block.";

  return `${prioritiesCue} ${learningCue} ${familyCue} ${energyCue}`;
}
