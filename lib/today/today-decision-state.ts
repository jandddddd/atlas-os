import type { TodayApprovalDecision } from "@/components/today/TodayApprovalCenter";
import {
  createTodayDecisionManualPriorityExplanation,
  prioritizeTodayDecisions,
} from "./decision-priority.ts";

const persistedActions = ["approve", "later"] as const;
const maximumPersistedDecisions = 20;
const currentStateVersion = 3;

type PersistedTodayDecisionAction = (typeof persistedActions)[number];

export type PersistedTodayDecision = {
  decisionId: string;
  action: PersistedTodayDecisionAction;
};

export type TodayDecisionState = {
  version: 3;
  decisions: PersistedTodayDecision[];
  manualPriorityDecisionId: string | null;
};

export const emptyTodayDecisionState: TodayDecisionState = {
  version: currentStateVersion,
  decisions: [],
  manualPriorityDecisionId: null,
};

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

function normalizeDecisionId(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
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
        manualPriorityDecisionId: null,
      };
    }

    if (
      parsed.version === 2 &&
      "decisions" in parsed &&
      Array.isArray(parsed.decisions) &&
      "decisionOrder" in parsed &&
      Array.isArray(parsed.decisionOrder)
    ) {
      return {
        version: currentStateVersion,
        decisions: normalizePersistedDecisions(parsed.decisions),
        manualPriorityDecisionId: normalizeDecisionId(parsed.decisionOrder[0]),
      };
    }

    if (
      parsed.version !== currentStateVersion ||
      !("decisions" in parsed) ||
      !Array.isArray(parsed.decisions) ||
      !("manualPriorityDecisionId" in parsed)
    ) {
      return emptyTodayDecisionState;
    }

    return {
      version: currentStateVersion,
      decisions: normalizePersistedDecisions(parsed.decisions),
      manualPriorityDecisionId: normalizeDecisionId(parsed.manualPriorityDecisionId),
    };
  } catch {
    return emptyTodayDecisionState;
  }
}

export function serializeTodayDecisionState(state: TodayDecisionState): string {
  return JSON.stringify({
    version: currentStateVersion,
    decisions: normalizePersistedDecisions(state.decisions),
    manualPriorityDecisionId: normalizeDecisionId(state.manualPriorityDecisionId),
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
    manualPriorityDecisionId:
      state.manualPriorityDecisionId !== null && knownDecisionIds.has(state.manualPriorityDecisionId)
        ? state.manualPriorityDecisionId
        : null,
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
    manualPriorityDecisionId:
      decision.decisionId === state.manualPriorityDecisionId
        ? null
        : state.manualPriorityDecisionId,
  };
}

export function setTodayDecisionManualPriority(
  state: TodayDecisionState,
  priorityDecisionId: string,
): TodayDecisionState {
  return {
    ...state,
    decisions: state.decisions.filter(
      (decision) =>
        decision.decisionId !== priorityDecisionId || decision.action !== "later",
    ),
    manualPriorityDecisionId: priorityDecisionId,
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
  const prioritizedAvailableDecisions = prioritizeTodayDecisions(availableDecisions).map(
    ({ decision, priority }) => ({ ...decision, priority }),
  );
  const postponedDecisionIdSet = new Set(postponedDecisionIds);
  const visibleDecisions = [
    ...prioritizedAvailableDecisions.filter(
      (decision) => !postponedDecisionIdSet.has(decision.id),
    ),
    ...postponedDecisionIds
      .map((decisionId) => prioritizedAvailableDecisions.find((decision) => decision.id === decisionId))
      .filter((decision): decision is TodayApprovalDecision => Boolean(decision)),
  ];
  const [sourcePriorityDecision] = prioritizedAvailableDecisions;
  const manuallyPrioritizedDecisionId = state.manualPriorityDecisionId;
  const hasManualPriorityOverride =
    manuallyPrioritizedDecisionId !== null &&
    manuallyPrioritizedDecisionId !== sourcePriorityDecision?.id;

  if (!hasManualPriorityOverride) {
    return visibleDecisions;
  }

  const manuallyPrioritizedDecision = visibleDecisions.find(
    (decision) => decision.id === manuallyPrioritizedDecisionId,
  );

  if (!manuallyPrioritizedDecision || postponedDecisionIdSet.has(manuallyPrioritizedDecision.id)) {
    return visibleDecisions;
  }

  return [
    {
      ...manuallyPrioritizedDecision,
      priority: createTodayDecisionManualPriorityExplanation(manuallyPrioritizedDecision.priority),
    },
    ...visibleDecisions.filter((decision) => decision.id !== manuallyPrioritizedDecision.id),
  ];
}
