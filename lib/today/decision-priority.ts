/**
 * Orders the decisions supplied for Today without changing the existing
 * product priority. The source order is the current priority contract: an
 * earlier decision receives a higher score.
 *
 * Future factors such as risk or due dates can be added here as additional
 * score components while preserving this single entry point for ordering.
 */
export function calculateTodayDecisionPriority(
  sourceIndex: number,
  decisionCount: number,
): number {
  return Math.max(decisionCount - sourceIndex, 0);
}

type PrioritizedDecision<TDecision> = {
  decision: TDecision;
  priorityScore: number;
  sourceIndex: number;
};

/**
 * Returns the current Today priority order. A numeric score is calculated for
 * every decision so future prioritization inputs can be added centrally.
 */
export function prioritizeTodayDecisions<TDecision>(
  decisions: TDecision[],
): TDecision[] {
  return decisions
    .map((decision, sourceIndex): PrioritizedDecision<TDecision> => ({
      decision,
      priorityScore: calculateTodayDecisionPriority(sourceIndex, decisions.length),
      sourceIndex,
    }))
    .sort(
      (left, right) =>
        right.priorityScore - left.priorityScore || left.sourceIndex - right.sourceIndex,
    )
    .map(({ decision }) => decision);
}
