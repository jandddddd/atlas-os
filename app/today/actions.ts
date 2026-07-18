"use server";

import { fixtureTodayDecisionRepository } from "@/lib/today/fixture-decision-repository";
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

  const decisions = await fixtureTodayDecisionRepository.getTodayDecisions();
  const decisionExists = decisions.some((decision) => decision.id === command.decisionId);

  if (!decisionExists) {
    return { success: false, error: "decision-not-found" };
  }

  return { success: true };
}
