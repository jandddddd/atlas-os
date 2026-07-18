"use client";

import { useMemo, useState } from "react";

import { submitTodayDecision } from "@/app/today/actions";
import { ApprovalCard, type ApprovalCardProps } from "@/components/today/ApprovalCard";
import { DecisionOverviewList } from "@/components/today/DecisionOverviewList";
import { TodayCompletionNotice } from "@/components/today/TodayCompletionNotice";
import { TodayEmptyState } from "@/components/today/TodayEmptyState";
import { TodayHeader } from "@/components/today/TodayHeader";

type CompletionStatus = "offer-approved" | "change-requested" | null;

type TodayApprovalDecision = Omit<ApprovalCardProps, "primaryAction" | "secondaryActions" | "details" | "notice"> & {
  id: string;
  overviewTitle: string;
  overviewContext: string;
  overviewMeta: string;
  primaryActionLabel: string;
  editHref?: string;
  completionMessage: string;
  details: {
    title: string;
    items: string[];
  };
};

type TodayApprovalCenterProps = {
  dateLabel: string;
  initialCompletionStatus: CompletionStatus;
  decisions: TodayApprovalDecision[];
};

function moveFirstDecisionToEnd(decisionIds: string[]) {
  const [currentDecisionId, ...remainingDecisionIds] = decisionIds;

  if (!currentDecisionId) {
    return decisionIds;
  }

  return [...remainingDecisionIds, currentDecisionId];
}

export function TodayApprovalCenter({
  dateLabel,
  initialCompletionStatus,
  decisions,
}: TodayApprovalCenterProps) {
  const decisionById = useMemo(
    () => new Map(decisions.map((decision) => [decision.id, decision])),
    [decisions],
  );
  const [visibleDecisionIds, setVisibleDecisionIds] = useState(() => {
    if (initialCompletionStatus === null) {
      return decisions.map((decision) => decision.id);
    }

    return decisions
      .filter((decision) => decision.id !== "offer-mueller")
      .map((decision) => decision.id);
  });
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
  const [editHintDecisionId, setEditHintDecisionId] = useState<string | null>(null);

  const [priorityDecisionId, ...overviewDecisionIds] = visibleDecisionIds;
  const priorityDecision = priorityDecisionId
    ? decisionById.get(priorityDecisionId) ?? null
    : null;
  const overviewDecisions = overviewDecisionIds
    .map((decisionId) => decisionById.get(decisionId))
    .filter((decision): decision is TodayApprovalDecision => Boolean(decision))
    .map((decision) => ({
      id: decision.id,
      title: decision.overviewTitle,
      context: decision.overviewContext,
      meta: decision.overviewMeta,
    }));
  const hasDecisions = visibleDecisionIds.length > 0;

  async function approvePriorityDecision() {
    if (!priorityDecision) {
      return;
    }

    const result = await submitTodayDecision({
      decisionId: priorityDecision.id,
      action: "approve",
    });

    if (!result.success) {
      return;
    }

    setCompletionMessage(priorityDecision.completionMessage);
    setExpandedDetailsId(null);
    setEditHintDecisionId(null);
    setVisibleDecisionIds((currentDecisionIds) => currentDecisionIds.slice(1));
  }

  async function postponePriorityDecision() {
    if (!priorityDecision) {
      return;
    }

    const result = await submitTodayDecision({
      decisionId: priorityDecision.id,
      action: "later",
    });

    if (!result.success) {
      return;
    }

    setCompletionMessage(null);
    setExpandedDetailsId(null);
    setEditHintDecisionId(null);
    setVisibleDecisionIds(moveFirstDecisionToEnd);
  }

  function toggleDetails(decisionId: string) {
    setExpandedDetailsId((currentDecisionId) => (
      currentDecisionId === decisionId ? null : decisionId
    ));
  }

  function showEditHint(decisionId: string) {
    setEditHintDecisionId(decisionId);
  }

  return (
    <>
      <TodayHeader dateLabel={dateLabel} decisionCount={visibleDecisionIds.length} />
      <TodayCompletionNotice status={initialCompletionStatus} />

      {completionMessage ? (
        <section
          aria-label="Aktueller Abschluss"
          className="rounded-[2rem] border border-emerald-100 bg-white px-7 py-6 text-neutral-700 shadow-sm sm:px-10"
        >
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Erledigt
          </p>
          <p className="mt-3 text-lg leading-8">{completionMessage}</p>
        </section>
      ) : null}

      {hasDecisions && priorityDecision ? (
        <>
          <ApprovalCard
            {...priorityDecision}
            details={{
              ...priorityDecision.details,
              id: `details-${priorityDecision.id}`,
              isVisible: expandedDetailsId === priorityDecision.id,
            }}
            notice={
              editHintDecisionId === priorityDecision.id
                ? { text: "Bearbeitungsansicht folgt." }
                : undefined
            }
            primaryAction={{
              label: priorityDecision.primaryActionLabel,
              onSelect: approvePriorityDecision,
            }}
            secondaryActions={[
              priorityDecision.editHref
                ? { label: "Ändern", href: priorityDecision.editHref }
                : { label: "Ändern", onSelect: () => showEditHint(priorityDecision.id) },
              { label: "Später entscheiden", onSelect: postponePriorityDecision },
              {
                label: expandedDetailsId === priorityDecision.id ? "Details ausblenden" : "Details ansehen",
                onSelect: () => toggleDetails(priorityDecision.id),
                controls: `details-${priorityDecision.id}`,
                expanded: expandedDetailsId === priorityDecision.id,
              },
            ]}
          />
          <DecisionOverviewList decisions={overviewDecisions} />
        </>
      ) : (
        <TodayEmptyState isVisible />
      )}
    </>
  );
}

export type { TodayApprovalDecision };
