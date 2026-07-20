import assert from "node:assert/strict";
import test from "node:test";

import {
  replaceInboxTodayDecision,
  resetInboxTodayDecisionState,
} from "./inbox-today-decision-replacement.ts";
import type { TodayDecisionState } from "./today-decision-state.ts";

const previousAnalysis = {
  customer: { name: "Familie Alt" },
  project: { trade: "Malerarbeiten", service: "Alt", estimatedArea: null },
  workflow: {
    priority: "normal" as const,
    confidence: 0.8,
    nextAction: "Prüfen",
  },
  nextSteps: [],
  missingInformation: [],
  recommendedTask: { type: "offer" as const, title: "Alte Entscheidung" },
};

const replacementAnalysis = {
  ...previousAnalysis,
  customer: { name: "Familie Neu" },
  recommendedTask: { type: "offer" as const, title: "Neue Entscheidung" },
};

function stateWithInboxPriority(): TodayDecisionState {
  return {
    version: 3,
    decisions: [
      { decisionId: "inbox-recommended-task", action: "later" },
      { decisionId: "visit-weber", action: "approve" },
    ],
    manualPriorityDecisionId: "inbox-recommended-task",
  };
}

test("replaces the inbox decision before clearing its stale Today state", async () => {
  const writes: string[] = [];
  const writtenStates: TodayDecisionState[] = [];

  const result = await replaceInboxTodayDecision(replacementAnalysis, {
    readInboxDecision: async () => previousAnalysis,
    writeInboxDecision: async (analysis) => {
      writes.push(analysis.recommendedTask.title);
      return true;
    },
    clearInboxDecision: async () => {
      writes.push("clear");
    },
    readTodayState: async () => stateWithInboxPriority(),
    writeTodayState: async (state) => {
      writtenStates.push(state);
    },
  });

  assert.equal(result, true);
  assert.deepEqual(writes, ["Neue Entscheidung"]);
  assert.deepEqual(writtenStates, [
    {
      version: 3,
      decisions: [{ decisionId: "visit-weber", action: "approve" }],
      manualPriorityDecisionId: null,
    },
  ]);
});

test("preserves the Inbox decision and Today state when its cookie is too large", async () => {
  const originalState = stateWithInboxPriority();
  let wroteTodayState = false;

  const result = await replaceInboxTodayDecision(replacementAnalysis, {
    readInboxDecision: async () => previousAnalysis,
    writeInboxDecision: async () => false,
    clearInboxDecision: async () =>
      assert.fail("must not clear the current Inbox decision"),
    readTodayState: async () => originalState,
    writeTodayState: async () => {
      wroteTodayState = true;
    },
  });

  assert.equal(result, false);
  assert.equal(wroteTodayState, false);
  assert.equal(
    originalState.manualPriorityDecisionId,
    "inbox-recommended-task",
  );
});

test("rolls back the Inbox cookie when the Today state write fails", async () => {
  const writes: string[] = [];
  const originalState = stateWithInboxPriority();

  const result = await replaceInboxTodayDecision(replacementAnalysis, {
    readInboxDecision: async () => previousAnalysis,
    writeInboxDecision: async (analysis) => {
      writes.push(analysis.recommendedTask.title);
      return true;
    },
    clearInboxDecision: async () =>
      assert.fail("must restore the previous Inbox decision"),
    readTodayState: async () => originalState,
    writeTodayState: async () => {
      throw new Error("Today state unavailable");
    },
  });

  assert.equal(result, false);
  assert.deepEqual(writes, ["Neue Entscheidung", "Alte Entscheidung"]);
  assert.equal(
    originalState.manualPriorityDecisionId,
    "inbox-recommended-task",
  );
});

test("restores the Inbox decision when reset cannot clear Today state", async () => {
  const writes: string[] = [];

  await assert.rejects(
    resetInboxTodayDecisionState({
      readInboxDecision: async () => previousAnalysis,
      writeInboxDecision: async (analysis) => {
        writes.push(analysis.recommendedTask.title);
        return true;
      },
      clearInboxDecision: async () => {
        writes.push("clear");
      },
      readTodayState: async () => stateWithInboxPriority(),
      writeTodayState: async () => {
        throw new Error("Today state unavailable");
      },
    }),
    /Today state unavailable/,
  );

  assert.deepEqual(writes, ["clear", "Alte Entscheidung"]);
});

test("clears the Inbox decision and Today state during a successful reset", async () => {
  const writes: string[] = [];
  const writtenStates: TodayDecisionState[] = [];

  await resetInboxTodayDecisionState({
    readInboxDecision: async () => previousAnalysis,
    writeInboxDecision: async () => {
      assert.fail(
        "must not rewrite an Inbox decision during a successful reset",
      );
    },
    clearInboxDecision: async () => {
      writes.push("clear");
    },
    readTodayState: async () => stateWithInboxPriority(),
    writeTodayState: async (state) => {
      writtenStates.push(state);
    },
  });

  assert.deepEqual(writes, ["clear"]);
  assert.deepEqual(writtenStates, [
    {
      version: 3,
      decisions: [{ decisionId: "visit-weber", action: "approve" }],
      manualPriorityDecisionId: null,
    },
  ]);
});
