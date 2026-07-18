"use server";

import { fixtureTodayDecisionRepository } from "@/lib/today/fixture-decision-repository";

const todayDecisionActions = ["approve", "later"] as const;

type TodayDecisionAction = (typeof todayDecisionActions)[number];

type TodayDecisionCommand = {
  decisionId: string;
  action: TodayDecisionAction;
};

type TodayDecisionResult =
  | { success: true }
  | {
      success: false;
      error: "invalid-decision-id" | "invalid-action" | "decision-not-found";
    };

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

export type { TodayDecisionAction, TodayDecisionCommand, TodayDecisionResult };
