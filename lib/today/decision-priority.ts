export type TodayDecisionUrgency = "low" | "medium" | "high";
export type TodayDecisionEconomicImpact = "low" | "medium" | "high";

export type TodayDecisionPriorityFactors = {
  urgency: TodayDecisionUrgency;
  economicImpact: TodayDecisionEconomicImpact;
  /**
   * IDs of decisions that must no longer be open before this decision can be
   * worked on. Dependencies outside the current open decision set are treated
   * as fulfilled.
   */
  dependsOn?: string[];
};

export type TodayDecisionPriorityReason = {
  code:
    | "urgency"
    | "economic-impact"
    | "blocks-follow-up-work"
    | "waiting-for-prerequisite"
    | "manual-priority";
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
  dependencyEffects: TodayDecisionDependencyEffects,
): TodayDecisionPriorityExplanation {
  return {
    score:
      calculateTodayDecisionPriority(factors) +
      (dependencyEffects.blocksFollowUpWork ? dependencyUnblockingScore : 0) -
      (dependencyEffects.hasUnfulfilledDependency ? unfulfilledDependencyPenalty : 0),
    reasons: [
      {
        code: "urgency",
        description: `Dringlichkeit: ${urgencyLabels[factors.urgency]}.`,
      },
      {
        code: "economic-impact",
        description: `Wirtschaftliche Auswirkung: ${economicImpactLabels[factors.economicImpact]}.`,
      },
      ...(dependencyEffects.blocksFollowUpWork
        ? [
            {
              code: "blocks-follow-up-work" as const,
              description: "Blockiert weitere Arbeiten: Voraussetzung für Folgeentscheidung.",
            },
          ]
        : []),
      ...(dependencyEffects.hasUnfulfilledDependency
        ? [
            {
              code: "waiting-for-prerequisite" as const,
              description: "Wartet auf vorherige Entscheidung.",
            },
          ]
        : []),
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

const dependencyUnblockingScore = 25;
const unfulfilledDependencyPenalty = 105;

type TodayDecisionDependencyEffects = {
  blocksFollowUpWork: boolean;
  hasUnfulfilledDependency: boolean;
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
  decisions: (TDecision & { id: string })[],
): PrioritizedTodayDecision<TDecision>[] {
  const openDecisionIds = new Set(decisions.map((decision) => decision.id));

  return decisions
    .map((decision, sourceIndex): PrioritizedTodayDecision<TDecision> => ({
      decision,
      priority: createTodayDecisionPriorityExplanation(
        decision,
        getTodayDecisionDependencyEffects(decision, decisions, openDecisionIds),
      ),
      sourceIndex,
    }))
    .sort(
      (left, right) =>
        right.priority.score - left.priority.score || left.sourceIndex - right.sourceIndex,
    );
}

function getTodayDecisionDependencyEffects<TDecision extends TodayDecisionPriorityFactors>(
  decision: TDecision & { id: string },
  decisions: (TDecision & { id: string })[],
  openDecisionIds: Set<string>,
): TodayDecisionDependencyEffects {
  const dependsOn = new Set(decision.dependsOn);

  return {
    blocksFollowUpWork: decisions.some(
      (candidate) => candidate.id !== decision.id && candidate.dependsOn?.includes(decision.id),
    ),
    hasUnfulfilledDependency: [...dependsOn].some(
      (dependencyId) => dependencyId !== decision.id && openDecisionIds.has(dependencyId),
    ),
  };
}
