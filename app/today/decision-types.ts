export type TodayDecisionAction = "approve" | "later";

export type TodayDecisionCommand = {
  decisionId: string;
  action: TodayDecisionAction;
};

export type TodayDecisionResult =
  | { success: true }
  | {
      success: false;
      error: "invalid-decision-id" | "invalid-action" | "decision-not-found";
    };
