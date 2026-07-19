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

test("rewrites an approved version 2 override as a compact version 3 state", () => {
  const migratedState = parseTodayDecisionState(JSON.stringify({
    version: 2,
    decisions: [],
    decisionOrder: ["supplier-selection", "offer-mueller", "visit-weber"],
  }));
  const approvedState = recordTodayDecisionAction(migratedState, {
    decisionId: "supplier-selection",
    action: "approve",
  });

  assert.deepEqual(JSON.parse(serializeTodayDecisionState(approvedState)), {
    version: 3,
    decisions: [{ decisionId: "supplier-selection", action: "approve" }],
    manualPriorityDecisionId: null,
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
