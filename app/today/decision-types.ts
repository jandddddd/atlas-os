import type { TodayDecisionPriorityExplanation } from "@/lib/today/decision-priority";

export type TodayDecisionAction = "approve" | "later" | "prioritize";

export type TodayDecisionCommand = {
  decisionId: string;
  action: TodayDecisionAction;
};

export type TodayDecisionResult =
  | {
      success: true;
      decisionIds: string[];
      priorityByDecisionId: Record<string, TodayDecisionPriorityExplanation>;
    }
  | {
      success: false;
      error: "invalid-decision-id" | "invalid-action" | "decision-not-found" | "decision-not-current";
    };
