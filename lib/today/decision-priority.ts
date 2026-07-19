export type TodayDecisionUrgency = "low" | "medium" | "high";
export type TodayDecisionEconomicImpact = "low" | "medium" | "high";

export type TodayDecisionPriorityFactors = {
  urgency: TodayDecisionUrgency;
  economicImpact: TodayDecisionEconomicImpact;
};

export type TodayDecisionPriorityReason = {
  code: "urgency" | "economic-impact" | "manual-priority";
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
  factors: TodayDecisionPriorityFactors,
): number {
  return urgencyScores[factors.urgency] + economicImpactScores[factors.economicImpact];
}

function createTodayDecisionPriorityExplanation(
  factors: TodayDecisionPriorityFactors,
): TodayDecisionPriorityExplanation {
  return {
    score: calculateTodayDecisionPriority(factors),
    reasons: [
      {
        code: "urgency",
        description: `Dringlichkeit: ${urgencyLabels[factors.urgency]}.`,
      },
      {
        code: "economic-impact",
        description: `Wirtschaftliche Auswirkung: ${economicImpactLabels[factors.economicImpact]}.`,
      },
    ],
  };
}

const urgencyScores: Record<TodayDecisionUrgency, number> = {
  low: 0,
  medium: 30,
  high: 60,
};

const economicImpactScores: Record<TodayDecisionEconomicImpact, number> = {
  low: 0,
  medium: 10,
  high: 20,
};

const urgencyLabels: Record<TodayDecisionUrgency, string> = {
  low: "niedrig",
  medium: "mittel",
  high: "hoch",
};

const economicImpactLabels: Record<TodayDecisionEconomicImpact, string> = {
  low: "niedrig",
  medium: "mittel",
  high: "hoch",
};

/**
 * Describes a manual Today reordering without changing the base score that
 * the Decision Engine calculated from the priority factors.
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
 * Returns the current Today priority order. Decisions with the same score keep
 * their supplied order through the source-index tie-breaker.
 */
export function prioritizeTodayDecisions<TDecision extends TodayDecisionPriorityFactors>(
  decisions: TDecision[],
): PrioritizedTodayDecision<TDecision>[] {
  return decisions
    .map((decision, sourceIndex): PrioritizedTodayDecision<TDecision> => ({
      decision,
      priority: createTodayDecisionPriorityExplanation(decision),
      sourceIndex,
    }))
    .sort(
      (left, right) =>
        right.priority.score - left.priority.score || left.sourceIndex - right.sourceIndex,
    );
}
