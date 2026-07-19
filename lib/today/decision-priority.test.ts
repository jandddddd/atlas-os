import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTodayDecisionPriority,
  createTodayDecisionManualPriorityExplanation,
  prioritizeTodayDecisions,
} from "./decision-priority.ts";

test("assigns a higher score to higher urgency", () => {
  assert.ok(
    calculateTodayDecisionPriority({ urgency: "high", economicImpact: "low" }) >
      calculateTodayDecisionPriority({ urgency: "medium", economicImpact: "low" }),
  );
});

test("assigns a higher score to higher economic impact", () => {
  assert.ok(
    calculateTodayDecisionPriority({ urgency: "low", economicImpact: "high" }) >
      calculateTodayDecisionPriority({ urgency: "low", economicImpact: "medium" }),
  );
});

test("orders decisions by their combined priority factors", () => {
  const decisions = [
    { id: "economic-impact", urgency: "medium" as const, economicImpact: "high" as const },
    { id: "urgent", urgency: "high" as const, economicImpact: "low" as const },
    { id: "low", urgency: "low" as const, economicImpact: "low" as const },
  ];

  assert.deepEqual(
    prioritizeTodayDecisions(decisions).map(({ decision }) => decision.id),
    ["urgent", "economic-impact", "low"],
  );
});

test("keeps supplied order as a stable tie-breaker for equal scores", () => {
  const decisions = [
    { id: "first", urgency: "medium" as const, economicImpact: "medium" as const },
    { id: "second", urgency: "medium" as const, economicImpact: "medium" as const },
  ];

  assert.deepEqual(
    prioritizeTodayDecisions(decisions).map(({ decision }) => decision.id),
    ["first", "second"],
  );
});

test("returns explainability for every priority factor used in the score", () => {
  const [decision] = prioritizeTodayDecisions([
    { id: "urgent-and-economic", urgency: "high" as const, economicImpact: "medium" as const },
  ]);

  assert.deepEqual(decision.priority, {
    score: 70,
    reasons: [
      { code: "urgency", description: "Dringlichkeit: hoch." },
      {
        code: "economic-impact",
        description: "Wirtschaftliche Auswirkung: mittel.",
      },
    ],
  });
});

test("keeps manual prioritization dominant without automatic factor reasons", () => {
  const [sourcePriorityDecision, manuallyPrioritizedDecision] = prioritizeTodayDecisions([
    { id: "first", urgency: "high" as const, economicImpact: "high" as const },
    { id: "manually-prioritized", urgency: "low" as const, economicImpact: "low" as const },
  ]);
  const manuallyOrderedDecisions = [
    {
      ...manuallyPrioritizedDecision,
      priority: createTodayDecisionManualPriorityExplanation(manuallyPrioritizedDecision.priority),
    },
    sourcePriorityDecision,
  ];

  assert.equal(manuallyOrderedDecisions[0]?.decision.id, "manually-prioritized");
  assert.deepEqual(manuallyOrderedDecisions[0]?.priority, {
    score: 0,
    reasons: [
      {
        code: "manual-priority",
        description: "Diese Entscheidung wurde manuell für Heute zuerst priorisiert.",
      },
    ],
  });
  assert.deepEqual(sourcePriorityDecision.priority.reasons, [
    { code: "urgency", description: "Dringlichkeit: hoch." },
    { code: "economic-impact", description: "Wirtschaftliche Auswirkung: hoch." },
  ]);
});

test("keeps an empty decision list empty", () => {
  assert.deepEqual(prioritizeTodayDecisions([]), []);
});
