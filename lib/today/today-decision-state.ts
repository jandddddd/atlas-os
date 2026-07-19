import type { TodayApprovalDecision } from "@/components/today/TodayApprovalCenter";

const persistedActions = ["approve", "later"] as const;
const maximumPersistedDecisions = 20;
const currentStateVersion = 2;

type PersistedTodayDecisionAction = (typeof persistedActions)[number];

export type PersistedTodayDecision = {
  decisionId: string;
  action: PersistedTodayDecisionAction;
};

export type TodayDecisionState = {
  version: 2;
  decisions: PersistedTodayDecision[];
  decisionOrder: string[];
};

export const emptyTodayDecisionState: TodayDecisionState = {
  version: currentStateVersion,
  decisions: [],
  decisionOrder: [],
};

export function prioritizeTodayDecision(
  decisionIds: string[],
  priorityDecisionId: string,
): string[] {
  const priorityDecisionIndex = decisionIds.indexOf(priorityDecisionId);

  if (priorityDecisionIndex <= 0) {
    return decisionIds;
  }

  const [currentPriorityDecisionId] = decisionIds;

  if (!currentPriorityDecisionId) {
    return decisionIds;
  }

  return decisionIds.map((decisionId, index) => {
    if (index === 0) {
      return priorityDecisionId;
    }

    if (index === priorityDecisionIndex) {
      return currentPriorityDecisionId;
    }

    return decisionId;
  });
}

function isPersistedAction(action: unknown): action is PersistedTodayDecisionAction {
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

function normalizePersistedDecisions(values: unknown[]): PersistedTodayDecision[] {
  const decisionIds = new Set<string>();
  const decisions: PersistedTodayDecision[] = [];

  for (const value of values) {
    // First valid entry wins so later cookie duplicates cannot override it.
    if (!isPersistedDecision(value) || decisionIds.has(value.decisionId)) {
      continue;
    }

    decisionIds.add(value.decisionId);
    decisions.push(value);

    if (decisions.length === maximumPersistedDecisions) {
      break;
    }
  }

  return decisions;
}

function normalizeDecisionIds(values: unknown[]): string[] {
  const decisionIds = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }

    decisionIds.add(value);
  }

  return [...decisionIds];
}

export function parseTodayDecisionState(value: string | undefined): TodayDecisionState {
  if (!value) {
    return emptyTodayDecisionState;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed !== "object" || parsed === null || !("version" in parsed)) {
      return emptyTodayDecisionState;
    }

    if (
      parsed.version === 1 &&
      "decisions" in parsed &&
      Array.isArray(parsed.decisions)
    ) {
      return {
        version: currentStateVersion,
        decisions: normalizePersistedDecisions(parsed.decisions),
        decisionOrder: [],
      };
    }

    if (
      parsed.version !== currentStateVersion ||
      !("decisions" in parsed) ||
      !Array.isArray(parsed.decisions) ||
      !("decisionOrder" in parsed) ||
      !Array.isArray(parsed.decisionOrder)
    ) {
      return emptyTodayDecisionState;
    }

    return {
      version: currentStateVersion,
      decisions: normalizePersistedDecisions(parsed.decisions),
      decisionOrder: normalizeDecisionIds(parsed.decisionOrder),
    };
  } catch {
    return emptyTodayDecisionState;
  }
}

export function serializeTodayDecisionState(state: TodayDecisionState): string {
  return JSON.stringify({
    version: currentStateVersion,
    decisions: normalizePersistedDecisions(state.decisions),
    decisionOrder: normalizeDecisionIds(state.decisionOrder),
  });
}

export function restrictTodayDecisionStateToKnownDecisions(
  state: TodayDecisionState,
  decisions: TodayApprovalDecision[],
): TodayDecisionState {
  const knownDecisionIds = new Set(decisions.map((decision) => decision.id));

  return {
    version: currentStateVersion,
    decisions: state.decisions.filter((decision) => knownDecisionIds.has(decision.decisionId)),
    decisionOrder: state.decisionOrder.filter((decisionId) => knownDecisionIds.has(decisionId)),
  };
}

export function recordTodayDecisionAction(
  state: TodayDecisionState,
  decision: PersistedTodayDecision,
): TodayDecisionState {
  return {
    version: currentStateVersion,
    decisions: [
      ...state.decisions.filter((entry) => entry.decisionId !== decision.decisionId),
      decision,
    ].slice(-maximumPersistedDecisions),
    decisionOrder: state.decisionOrder,
  };
}

export function setTodayDecisionOrder(
  state: TodayDecisionState,
  decisionOrder: string[],
  priorityDecisionId: string,
): TodayDecisionState {
  return {
    ...state,
    decisions: state.decisions.filter(
      (decision) =>
        decision.decisionId !== priorityDecisionId || decision.action !== "later",
    ),
    decisionOrder: normalizeDecisionIds(decisionOrder),
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
  const orderedDecisionIds = state.decisionOrder.filter((decisionId) =>
    availableDecisions.some((decision) => decision.id === decisionId),
  );
  const orderedDecisionIdSet = new Set(orderedDecisionIds);
  const queue = [
    ...orderedDecisionIds,
    ...availableDecisions
      .map((decision) => decision.id)
      .filter((decisionId) => !orderedDecisionIdSet.has(decisionId)),
  ];

  return [
    ...queue
      .filter((decisionId) => !postponedDecisionIdSet.has(decisionId))
      .map((decisionId) => availableDecisions.find((decision) => decision.id === decisionId))
      .filter((decision): decision is TodayApprovalDecision => Boolean(decision)),
    ...postponedDecisionIds
      .map((decisionId) => queue.find((queueDecisionId) => queueDecisionId === decisionId))
      .map((decisionId) => availableDecisions.find((decision) => decision.id === decisionId))
      .filter((decision): decision is TodayApprovalDecision => Boolean(decision)),
  ];
}
