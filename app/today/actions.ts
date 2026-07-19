"use server";

import { fixtureTodayDecisionRepository } from "@/lib/today/fixture-decision-repository";
import {
  applyTodayDecisionState,
  recordTodayDecisionAction,
  restrictTodayDecisionStateToKnownDecisions,
} from "@/lib/today/today-decision-state";
import { todayDecisionStateStore } from "@/lib/today/today-decision-state-store";
import type {
  TodayDecisionAction,
  TodayDecisionCommand,
  TodayDecisionResult,
} from "@/app/today/decision-types";

const todayDecisionActions = ["approve", "later"] as const;

function isTodayDecisionAction(action: unknown): action is TodayDecisionAction {
  return todayDecisionActions.some((todayDecisionAction) => todayDecisionAction === action);
}

export async function submitTodayDecision(
  command: TodayDecisionCommand,
): Promise<TodayDecisionResult> {
  if (
    typeof command !== "object" ||
    command === null ||
    !("decisionId" in command) ||
    typeof command.decisionId !== "string" ||
    command.decisionId.trim().length === 0
  ) {
    return { success: false, error: "invalid-decision-id" };
  }

  if (!("action" in command) || !isTodayDecisionAction(command.action)) {
    return { success: false, error: "invalid-action" };
  }

  const [decisions, persistedState] = await Promise.all([
    fixtureTodayDecisionRepository.getTodayDecisions(),
    todayDecisionStateStore.read(),
  ]);
  const decisionExists = decisions.some((decision) => decision.id === command.decisionId);

  if (!decisionExists) {
    return { success: false, error: "decision-not-found" };
  }

  const state = restrictTodayDecisionStateToKnownDecisions(persistedState, decisions);
  const [currentDecision] = applyTodayDecisionState(decisions, state);

  if (currentDecision?.id !== command.decisionId) {
    return { success: false, error: "decision-not-current" };
  }

  await todayDecisionStateStore.write(
    recordTodayDecisionAction(state, {
      decisionId: command.decisionId,
      action: command.action,
    }),
  );

  return { success: true };
}
