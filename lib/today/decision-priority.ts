/**
 * Orders the decisions supplied for Today without changing the existing
 * product priority. The source order is the current priority contract: an
 * earlier decision receives a higher score.
 *
 * Future factors such as risk or due dates can be added here as additional
 * score components while preserving this single entry point for ordering.
 */
export type TodayDecisionPriorityReason = {
  code: "source-order" | "manual-priority";
  description: string;
};

export type TodayDecisionPriorityExplanation = {
  score: number;
  reasons: TodayDecisionPriorityReason[];
};

export type PrioritizedTodayDecision<TDecision> = {
  decision: TDecision;
  priority: TodayDecisionPriorityExplanation;
  sourceIndex: number;
};

export function calculateTodayDecisionPriority(
  sourceIndex: number,
  decisionCount: number,
): number {
  return Math.max(decisionCount - sourceIndex, 0);
}

function createTodayDecisionPriorityExplanation(
  sourceIndex: number,
  decisionCount: number,
): TodayDecisionPriorityExplanation {
  return {
    score: calculateTodayDecisionPriority(sourceIndex, decisionCount),
    reasons: [
      {
        code: "source-order",
        description:
          sourceIndex === 0
            ? "Diese Entscheidung steht in der bestehenden Today-Reihenfolge an erster Stelle."
            : "Diese Entscheidung folgt der bestehenden Today-Reihenfolge.",
      },
    ],
  };
}

/**
 * Describes a manual Today reordering without changing the base score that
 * the Decision Engine calculated from the source order.
 */
export function createTodayDecisionManualPriorityExplanation(
  priority: TodayDecisionPriorityExplanation,
): TodayDecisionPriorityExplanation {
  return {
    score: priority.score,
    reasons: [
      {
        code: "manual-priority",
        description: "Diese Entscheidung wurde manuell für Heute zuerst priorisiert.",
      },
    ],
  };
}

/**
 * Returns the current Today priority order. A numeric score is calculated for
 * every decision so future prioritization inputs can be added centrally.
 */
export function prioritizeTodayDecisions<TDecision>(
  decisions: TDecision[],
): PrioritizedTodayDecision<TDecision>[] {
  return decisions
    .map((decision, sourceIndex): PrioritizedTodayDecision<TDecision> => ({
      decision,
      priority: createTodayDecisionPriorityExplanation(sourceIndex, decisions.length),
      sourceIndex,
    }))
    .sort(
      (left, right) =>
        right.priority.score - left.priority.score || left.sourceIndex - right.sourceIndex,
    );
}
