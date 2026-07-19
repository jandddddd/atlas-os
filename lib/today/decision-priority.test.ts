import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTodayDecisionPriority,
  createTodayDecisionManualPriorityExplanation,
  prioritizeTodayDecisions,
} from "./decision-priority.ts";

test("assigns higher scores to decisions earlier in the current Today order", () => {
  assert.equal(calculateTodayDecisionPriority(0, 5), 5);
  assert.equal(calculateTodayDecisionPriority(1, 5), 4);
  assert.equal(calculateTodayDecisionPriority(4, 5), 1);
});

test("preserves the supplied decision order", () => {
  const decisions = [
    { id: "offer-mueller" },
    { id: "visit-weber" },
    { id: "supplier-selection" },
    { id: "customer-reply" },
    { id: "measurement-gap" },
  ];

  assert.deepEqual(
    prioritizeTodayDecisions(decisions).map(({ decision }) => decision.id),
    decisions.map((decision) => decision.id),
  );
});

test("returns explainability for the unchanged source-order priority", () => {
  const decisions = [{ id: "first" }, { id: "second" }];

  assert.deepEqual(prioritizeTodayDecisions(decisions), [
    {
      decision: { id: "first" },
      priority: {
        score: 2,
        reasons: [
          {
            code: "source-order",
            description:
              "Diese Entscheidung steht in der bestehenden Today-Reihenfolge an erster Stelle.",
          },
        ],
      },
      sourceIndex: 0,
    },
    {
      decision: { id: "second" },
      priority: {
        score: 1,
        reasons: [
          {
            code: "source-order",
            description: "Diese Entscheidung folgt der bestehenden Today-Reihenfolge.",
          },
        ],
      },
      sourceIndex: 1,
    },
  ]);
});

test("returns a manual-priority explanation while preserving the base score", () => {
  const [{ priority }] = prioritizeTodayDecisions([{ id: "first" }]);

  assert.deepEqual(createTodayDecisionManualPriorityExplanation(priority), {
    score: 1,
    reasons: [
      {
        code: "manual-priority",
        description: "Diese Entscheidung wurde manuell für Heute zuerst priorisiert.",
      },
    ],
  });
});

test("keeps an empty decision list empty", () => {
  assert.deepEqual(prioritizeTodayDecisions([]), []);
});
