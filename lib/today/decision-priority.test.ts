import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTodayDecisionPriority,
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
    prioritizeTodayDecisions(decisions).map((decision) => decision.id),
    decisions.map((decision) => decision.id),
  );
});

test("keeps an empty decision list empty", () => {
  assert.deepEqual(prioritizeTodayDecisions([]), []);
});
