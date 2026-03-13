import test from "node:test";
import assert from "node:assert/strict";

import { buildNextDaySuggestion } from "../lib/reflection.ts";

test("buildNextDaySuggestion prioritizes unfinished work, AI study, and family protection", () => {
  const suggestion = buildNextDaySuggestion({
    energyWin: "Morning deep work on combat tuning felt sharp.",
    learningEdge: "Still fuzzy on agent loops for AI prototyping.",
    familyNote: "Family dinner stayed smooth when the evening was protected.",
    outstandingPriorities: 2,
    learningConfidenceAverage: 3
  });

  assert.match(suggestion, /unfinished priority/i);
  assert.match(suggestion, /AI learning block/i);
  assert.match(suggestion, /family window/i);
  assert.match(suggestion, /early deep-work/i);
});
