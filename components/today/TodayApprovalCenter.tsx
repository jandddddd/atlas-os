"use client";

import { useMemo, useRef, useState } from "react";

import { submitTodayDecision } from "@/app/today/actions";
import { ApprovalCard, type ApprovalCardProps } from "@/components/today/ApprovalCard";
import { DecisionOverviewList } from "@/components/today/DecisionOverviewList";
import { TodayCompletionNotice } from "@/components/today/TodayCompletionNotice";
import { TodayEmptyState } from "@/components/today/TodayEmptyState";
import { TodayHeader } from "@/components/today/TodayHeader";

type CompletionStatus = "offer-approved" | "change-requested" | null;
type FeedbackStatus = "completed" | "deferred" | null;

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

function filterCompletedDecisionIds(
  decisionIds: string[],
  completionStatus: CompletionStatus,
): string[] {
  if (completionStatus === null) {
    return decisionIds;
  }

  return decisionIds.filter((decisionId) => decisionId !== "offer-mueller");
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
  const [visibleDecisionIds, setVisibleDecisionIds] = useState(() =>
    filterCompletedDecisionIds(
      decisions.map((decision) => decision.id),
      initialCompletionStatus,
    ),
  );
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>(null);
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
      setFeedbackStatus("completed");
      setExpandedDetailsId(null);
      setEditHintDecisionId(null);
      setVisibleDecisionIds(
        filterCompletedDecisionIds(result.decisionIds, initialCompletionStatus),
      );
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
      setCompletionMessage(
        "Die Entscheidung wurde für später eingeordnet. Atlas zeigt dir jetzt den nächsten Punkt.",
      );
      setFeedbackStatus("deferred");
      setExpandedDetailsId(null);
      setEditHintDecisionId(null);
      setVisibleDecisionIds(
        filterCompletedDecisionIds(result.decisionIds, initialCompletionStatus),
      );
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
      setFeedbackStatus(null);
      setExpandedDetailsId(null);
      setEditHintDecisionId(null);
      setVisibleDecisionIds(
        filterCompletedDecisionIds(result.decisionIds, initialCompletionStatus),
      );
    } finally {
      setIsSubmittingPriorityDecision(false);
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
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
          aria-live="polite"
          className="rounded-[2rem] border border-neutral-200 bg-white px-6 py-5 text-neutral-700 shadow-sm sm:px-8"
        >
          <div className="flex gap-4">
            <span
              aria-hidden="true"
              className={
                feedbackStatus === "deferred"
                  ? "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700"
                  : "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white"
              }
            >
              {feedbackStatus === "deferred" ? "◷" : "✓"}
            </span>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
                {feedbackStatus === "deferred" ? "Zurückgestellt" : "Erledigt"}
              </p>
              <p className="mt-1.5 text-base leading-7 text-neutral-700">{completionMessage}</p>
            </div>
          </div>
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
    </div>
  );
}

export type { TodayApprovalDecision };
