import type { TodayDecisionAction } from "@/app/today/decision-types";
import type { TodayApprovalDecision } from "@/components/today/TodayApprovalCenter";

const persistedActions = ["approve", "later"] as const;
const maximumPersistedDecisions = 20;

export type PersistedTodayDecision = {
  decisionId: string;
  action: TodayDecisionAction;
};

export type TodayDecisionState = {
  version: 1;
  decisions: PersistedTodayDecision[];
};

export const emptyTodayDecisionState: TodayDecisionState = {
  version: 1,
  decisions: [],
};

function isPersistedAction(action: unknown): action is TodayDecisionAction {
  return persistedActions.some((persistedAction) => persistedAction === action);
}

function isPersistedDecision(value: unknown): value is PersistedTodayDecision {
  return (
    typeof value === "object" &&
    value !== null &&
    "decisionId" in value &&
    typeof value.decisionId === "string" &&
    value.decisionId.trim().length > 0 &&
    "action" in value &&
    isPersistedAction(value.action)
  );
}

export function parseTodayDecisionState(value: string | undefined): TodayDecisionState {
  if (!value) {
    return emptyTodayDecisionState;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("decisions" in parsed) ||
      !Array.isArray(parsed.decisions)
    ) {
      return emptyTodayDecisionState;
    }

    return {
      version: 1,
      decisions: parsed.decisions.filter(isPersistedDecision).slice(-maximumPersistedDecisions),
    };
  } catch {
    return emptyTodayDecisionState;
  }
}

export function serializeTodayDecisionState(state: TodayDecisionState): string {
  return JSON.stringify(state);
}

export function restrictTodayDecisionStateToKnownDecisions(
  state: TodayDecisionState,
  decisions: TodayApprovalDecision[],
): TodayDecisionState {
  const knownDecisionIds = new Set(decisions.map((decision) => decision.id));

  return {
    version: 1,
    decisions: state.decisions.filter((decision) => knownDecisionIds.has(decision.decisionId)),
  };
}

export function recordTodayDecisionAction(
  state: TodayDecisionState,
  decision: PersistedTodayDecision,
): TodayDecisionState {
  return {
    version: 1,
    decisions: [
      ...state.decisions.filter((entry) => entry.decisionId !== decision.decisionId),
      decision,
    ].slice(-maximumPersistedDecisions),
  };
}

export function applyTodayDecisionState(
  decisions: TodayApprovalDecision[],
  state: TodayDecisionState,
): TodayApprovalDecision[] {
  const actionByDecisionId = new Map(
    state.decisions.map((decision) => [decision.decisionId, decision.action]),
  );
  const postponedDecisionIds = state.decisions
    .filter((decision) => decision.action === "later")
    .map((decision) => decision.decisionId);
  const availableDecisions = decisions.filter(
    (decision) => actionByDecisionId.get(decision.id) !== "approve",
  );
  const postponedDecisionIdSet = new Set(postponedDecisionIds);

  return [
    ...availableDecisions.filter((decision) => !postponedDecisionIdSet.has(decision.id)),
    ...postponedDecisionIds
      .map((decisionId) => availableDecisions.find((decision) => decision.id === decisionId))
      .filter((decision): decision is TodayApprovalDecision => Boolean(decision)),
  ];
}
