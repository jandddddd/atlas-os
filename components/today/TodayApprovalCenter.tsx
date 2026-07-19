"use client";

import { useMemo, useRef, useState } from "react";

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
  const [submissionError, setSubmissionError] = useState(false);
  const [isSubmittingPriorityDecision, setIsSubmittingPriorityDecision] = useState(false);
  const priorityDecisionSubmissionInProgress = useRef(false);

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
    if (!priorityDecision || priorityDecisionSubmissionInProgress.current) {
      return;
    }

    priorityDecisionSubmissionInProgress.current = true;
    setIsSubmittingPriorityDecision(true);
    setSubmissionError(false);

    try {
      const result = await submitTodayDecision({
        decisionId: priorityDecision.id,
        action: "approve",
      });

      if (!result.success) {
        setSubmissionError(true);
        return;
      }

      setSubmissionError(false);
      setCompletionMessage(priorityDecision.completionMessage);
      setExpandedDetailsId(null);
      setEditHintDecisionId(null);
      setVisibleDecisionIds(result.decisionIds);
    } finally {
      priorityDecisionSubmissionInProgress.current = false;
      setIsSubmittingPriorityDecision(false);
    }
  }

  async function postponePriorityDecision() {
    if (!priorityDecision || priorityDecisionSubmissionInProgress.current) {
      return;
    }

    priorityDecisionSubmissionInProgress.current = true;
    setIsSubmittingPriorityDecision(true);
    setSubmissionError(false);

    try {
      const result = await submitTodayDecision({
        decisionId: priorityDecision.id,
        action: "later",
      });

      if (!result.success) {
        setSubmissionError(true);
        return;
      }

      setSubmissionError(false);
      setCompletionMessage(null);
      setExpandedDetailsId(null);
      setEditHintDecisionId(null);
      setVisibleDecisionIds(result.decisionIds);
    } finally {
      priorityDecisionSubmissionInProgress.current = false;
      setIsSubmittingPriorityDecision(false);
    }
  }

  function toggleDetails(decisionId: string) {
    setExpandedDetailsId((currentDecisionId) => (
      currentDecisionId === decisionId ? null : decisionId
    ));
  }

  function showEditHint(decisionId: string) {
    setEditHintDecisionId(decisionId);
  }

  async function prioritizeDecision(decisionId: string) {
    if (isSubmittingPriorityDecision) {
      return;
    }

    setIsSubmittingPriorityDecision(true);
    setSubmissionError(false);

    try {
      const result = await submitTodayDecision({
        decisionId,
        action: "prioritize",
      });

      if (!result.success) {
        setSubmissionError(true);
        return;
      }

      setCompletionMessage(null);
      setExpandedDetailsId(null);
      setEditHintDecisionId(null);
      setVisibleDecisionIds(result.decisionIds);
    } finally {
      setIsSubmittingPriorityDecision(false);
    }
  }

  return (
    <>
      <TodayHeader dateLabel={dateLabel} decisionCount={visibleDecisionIds.length} />
      <TodayCompletionNotice status={initialCompletionStatus} />

      {submissionError ? (
        <p
          aria-label="Entscheidungsfehler"
          role="alert"
          className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm leading-6 text-amber-900"
        >
          Die Entscheidung konnte gerade nicht verarbeitet werden. Bitte versuche es erneut.
        </p>
      ) : null}

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
              pendingLabel: "Wird freigegeben …",
              onSelect: approvePriorityDecision,
              isDisabled: isSubmittingPriorityDecision,
            }}
            secondaryActions={[
              priorityDecision.editHref
                ? {
                    label: "Ändern",
                    href: priorityDecision.editHref,
                    isDisabled: isSubmittingPriorityDecision,
                  }
                : {
                    label: "Ändern",
                    onSelect: () => showEditHint(priorityDecision.id),
                    isDisabled: isSubmittingPriorityDecision,
                  },
              {
                label: "Später entscheiden",
                onSelect: postponePriorityDecision,
                isDisabled: isSubmittingPriorityDecision,
              },
              {
                label: expandedDetailsId === priorityDecision.id ? "Details ausblenden" : "Details ansehen",
                onSelect: () => toggleDetails(priorityDecision.id),
                controls: `details-${priorityDecision.id}`,
                expanded: expandedDetailsId === priorityDecision.id,
                isDisabled: isSubmittingPriorityDecision,
              },
            ]}
          />
          <DecisionOverviewList
            decisions={overviewDecisions}
            onSelect={prioritizeDecision}
            isDisabled={isSubmittingPriorityDecision}
          />
        </>
      ) : (
        <TodayEmptyState isVisible />
      )}
    </>
  );
}

export type { TodayApprovalDecision };
