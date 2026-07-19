import assert from "node:assert/strict";
import test from "node:test";

import {
  emptyTodayDecisionState,
  parseTodayDecisionState,
  recordTodayDecisionAction,
  serializeTodayDecisionState,
  setTodayDecisionManualPriority,
} from "./today-decision-state.ts";

test("migrates a version 2 order to only its manual override", () => {
  assert.deepEqual(
    parseTodayDecisionState(JSON.stringify({
      version: 2,
      decisions: [],
      decisionOrder: ["supplier-selection", "offer-mueller", "visit-weber"],
    })),
    {
      version: 3,
      decisions: [],
      manualPriorityDecisionId: "supplier-selection",
    },
  );
});

test("serializes version 3 state without the legacy queue order", () => {
  const state = setTodayDecisionManualPriority(emptyTodayDecisionState, "supplier-selection");

  assert.deepEqual(JSON.parse(serializeTodayDecisionState(state)), {
    version: 3,
    decisions: [],
    manualPriorityDecisionId: "supplier-selection",
  });
});

test("clears the manual override when its decision is completed or deferred", () => {
  const manuallyPrioritizedState = setTodayDecisionManualPriority(
    emptyTodayDecisionState,
    "supplier-selection",
  );

  assert.equal(
    recordTodayDecisionAction(manuallyPrioritizedState, {
      decisionId: "supplier-selection",
      action: "approve",
    }).manualPriorityDecisionId,
    null,
  );
  assert.equal(
    recordTodayDecisionAction(manuallyPrioritizedState, {
      decisionId: "supplier-selection",
      action: "later",
    }).manualPriorityDecisionId,
    null,
  );
});
