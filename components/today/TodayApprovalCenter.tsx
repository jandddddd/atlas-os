"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { submitTodayDecision } from "@/app/today/actions";
import { ApprovalCard, type ApprovalCardProps } from "@/components/today/ApprovalCard";
import { DecisionOverviewList } from "@/components/today/DecisionOverviewList";
import { TodayCompletionNotice } from "@/components/today/TodayCompletionNotice";
import { TodayEmptyState } from "@/components/today/TodayEmptyState";
import { TodayHeader } from "@/components/today/TodayHeader";
import {
  loadClarificationDraftForWorkflowId,
  loadInquiryAnalysis,
  loadOfferDraftForAnalysis,
  markOfferWorkspaceReviewed,
} from "@/lib/storage/inbox-storage";
import type {
  TodayDecisionPriorityExplanation,
  TodayDecisionPriorityFactors,
} from "@/lib/today/decision-priority";
import { inboxTodayDecisionId } from "@/lib/today/inbox-today-decision";

type CompletionStatus = "offer-approved" | "change-requested" | null;
type FeedbackStatus = "completed" | "deferred" | null;
type SubmissionErrorStatus = "generic" | "stale" | null;
type CompletionAction = {
  label: string;
  href: string;
  requiresSavedOfferDraft?: boolean;
  workflowId?: string;
};

const CLARIFICATION_PREPARED_NOTE =
  "Für diese Anfrage ist bereits eine Rückfrage vorbereitet.";

type TodayApprovalDecision = Omit<ApprovalCardProps, "primaryAction" | "secondaryActions" | "details" | "notice" | "clarificationNote"> & TodayDecisionPriorityFactors & {
  id: string;
  /**
   * Fingerprint of the decision's underlying data snapshot. Only decisions
   * whose underlying data can be silently replaced (currently the inbox
   * decision) set this; static fixture decisions leave it undefined and
   * behave exactly as before.
   */
  decisionRevision?: string;
  /**
   * The workflow this decision is derived from, if any. Only the dynamic
   * inbox decision sets this; static fixture decisions leave it undefined.
   */
  workflowId?: string;
  overviewTitle: string;
  overviewContext: string;
  overviewMeta: string;
  primaryActionLabel: string;
  primaryActionPendingLabel?: string;
  editHref?: string;
  completionMessage: string;
  completionAction?: CompletionAction;
  details: {
    title: string;
    items: string[];
  };
};

type TodayApprovalDecisionInput = Omit<TodayApprovalDecision, "priority">;

type TodayApprovalCenterProps = {
  dateLabel: string;
  initialCompletionStatus: CompletionStatus;
  decisions: TodayApprovalDecision[];
  /**
   * A pure navigation/focus hint carried over from an Inbox handoff. Never
   * used to prioritize, approve, or otherwise mutate any decision state —
   * only to scroll to and visually highlight the matching decision, once
   * its identity has been confirmed against decision.workflowId.
   */
  focusWorkflowId?: string;
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

function availableCompletionAction(
  action: CompletionAction | undefined,
): CompletionAction | null {
  if (!action) return null;
  if (!action.requiresSavedOfferDraft) return action;
  if (!action.workflowId) return null;

  const savedAnalysis = loadInquiryAnalysis();
  if (!savedAnalysis || savedAnalysis.workflowId !== action.workflowId) return null;
  if (!loadOfferDraftForAnalysis(savedAnalysis)) return null;

  return action;
}

/**
 * A decision's editHref may only be used to navigate to the live Inbox when
 * that Inbox's single persisted analysis slot still holds the same workflow
 * this decision was derived from. Static fixture decisions are identified by
 * id (never inboxTodayDecisionId) and keep their editHref unconditionally,
 * exactly as before. A legacy dynamic Inbox decision from before workflowId
 * existed has no workflowId to match against the live slot at all, so it
 * cannot be safely confirmed either and falls back the same way a stale
 * match would.
 */
function availableEditHref(
  decision: { id: string; editHref?: string; workflowId?: string },
  liveInboxWorkflowId: string | null,
): string | undefined {
  if (!decision.editHref) return undefined;
  if (decision.id !== inboxTodayDecisionId) return decision.editHref;

  return decision.workflowId !== undefined && decision.workflowId === liveInboxWorkflowId
    ? decision.editHref
    : undefined;
}

export function TodayApprovalCenter({
  dateLabel,
  initialCompletionStatus,
  decisions,
  focusWorkflowId,
}: TodayApprovalCenterProps) {
  const [priorityByDecisionId, setPriorityByDecisionId] = useState<
    Record<string, TodayDecisionPriorityExplanation>
  >(() => Object.fromEntries(decisions.map((decision) => [decision.id, decision.priority])));
  const decisionById = useMemo(
    () => new Map(decisions.map((decision) => [
      decision.id,
      {
        ...decision,
        priority: priorityByDecisionId[decision.id] ?? decision.priority,
      },
    ])),
    [decisions, priorityByDecisionId],
  );
  const [visibleDecisionIds, setVisibleDecisionIds] = useState(() =>
    filterCompletedDecisionIds(
      decisions.map((decision) => decision.id),
      initialCompletionStatus,
    ),
  );
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [completionAction, setCompletionAction] = useState<CompletionAction | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>(null);
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
  const [editHintDecisionId, setEditHintDecisionId] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<SubmissionErrorStatus>(null);
  const [isSubmittingPriorityDecision, setIsSubmittingPriorityDecision] = useState(false);
  const priorityDecisionSubmissionInProgress = useRef(false);
  const [clarificationDraftWorkflowId, setClarificationDraftWorkflowId] = useState<
    string | null
  >(null);
  const [liveInboxWorkflowId, setLiveInboxWorkflowId] = useState<string | null>(null);
  const [overviewClarificationDraftWorkflowId, setOverviewClarificationDraftWorkflowId] =
    useState<string | null>(null);

  const [priorityDecisionId, ...overviewDecisionIds] = visibleDecisionIds;
  const priorityDecision = priorityDecisionId
    ? decisionById.get(priorityDecisionId) ?? null
    : null;
  // The dynamic inbox decision is never both the priority decision and an
  // overview decision at once, so at most one of these is ever defined.
  const overviewInboxDecision = overviewDecisionIds
    .map((decisionId) => decisionById.get(decisionId))
    .find(
      (decision): decision is TodayApprovalDecision =>
        decision?.id === inboxTodayDecisionId,
    );
  // Gate the note on the workflow ID actually being rendered right now, not
  // just on the last localStorage read: the read only resolves in a later
  // animation frame, but the priority decision itself can already change to
  // an unrelated one within the same render (e.g. after an approve/postpone).
  const hasClarificationDraftForPriorityDecision =
    priorityDecision?.workflowId !== undefined &&
    priorityDecision.workflowId === clarificationDraftWorkflowId;
  // Scoped to the overview decision's own workflowId, deliberately never to
  // liveInboxWorkflowId: a prepared clarification stays valid for its own
  // workflow regardless of which workflow currently occupies the single
  // live Inbox slot.
  const hasClarificationDraftForOverviewInboxDecision =
    overviewInboxDecision?.workflowId !== undefined &&
    overviewInboxDecision.workflowId === overviewClarificationDraftWorkflowId;
  // A pure navigation/focus match, never a priority decision: inboxTodayDecisionId
  // alone is not enough, since it is a fixed constant reused across any
  // dynamic Inbox decision snapshot, not a per-analysis identity. workflowId
  // is the only safe identity to confirm this is genuinely the same case the
  // Inbox handoff came from.
  const isPriorityDecisionFocused =
    priorityDecision?.id === inboxTodayDecisionId &&
    priorityDecision.workflowId !== undefined &&
    priorityDecision.workflowId === focusWorkflowId;
  const isOverviewInboxDecisionFocused =
    overviewInboxDecision !== undefined &&
    overviewInboxDecision.workflowId !== undefined &&
    overviewInboxDecision.workflowId === focusWorkflowId;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const workflowId = priorityDecision?.workflowId;
      setClarificationDraftWorkflowId(
        workflowId && loadClarificationDraftForWorkflowId(workflowId) ? workflowId : null,
      );
      const overviewWorkflowId = overviewInboxDecision?.workflowId;
      setOverviewClarificationDraftWorkflowId(
        overviewWorkflowId && loadClarificationDraftForWorkflowId(overviewWorkflowId)
          ? overviewWorkflowId
          : null,
      );
      setLiveInboxWorkflowId(loadInquiryAnalysis()?.workflowId ?? null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [priorityDecision?.workflowId, overviewInboxDecision?.workflowId]);

  // The above effect only re-reads storage when the rendered priority or
  // overview inbox decision itself changes, so it never notices another tab
  // writing to the single-slot Inbox analysis or the clarification draft
  // while this page stays mounted. The native "storage" event only fires in
  // other tabs/windows of the same origin, which is exactly the cross-tab
  // case to cover here; a same-tab write already goes through the effect
  // above via navigation.
  useEffect(() => {
    function handleStorageChange() {
      setLiveInboxWorkflowId(loadInquiryAnalysis()?.workflowId ?? null);
      setOverviewClarificationDraftWorkflowId(
        overviewInboxDecision?.workflowId &&
          loadClarificationDraftForWorkflowId(overviewInboxDecision.workflowId)
          ? overviewInboxDecision.workflowId
          : null,
      );
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [overviewInboxDecision?.workflowId]);

  // Pure navigation focus, not a state change: scrolls to whichever element
  // (if any) was securely matched and marked with data-handoff-focused above.
  // Does nothing when focusWorkflowId is absent, unmatched, or stale.
  useEffect(() => {
    if (!focusWorkflowId) return;

    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector('[data-handoff-focused="true"]')
        ?.scrollIntoView({ block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusWorkflowId, isPriorityDecisionFocused, isOverviewInboxDecisionFocused]);
  const focusedOverviewDecisionId = isOverviewInboxDecisionFocused
    ? overviewInboxDecision?.id
    : undefined;
  const overviewDecisions = overviewDecisionIds
    .map((decisionId) => decisionById.get(decisionId))
    .filter((decision): decision is TodayApprovalDecision => Boolean(decision))
    .map((decision) => ({
      id: decision.id,
      title: decision.overviewTitle,
      context: decision.overviewContext,
      meta:
        decision.id === inboxTodayDecisionId && hasClarificationDraftForOverviewInboxDecision
          ? `${decision.overviewMeta} · Rückfrage vorbereitet`
          : decision.overviewMeta,
    }));
  const hasDecisions = visibleDecisionIds.length > 0;

  function applyDecisionResult({
    decisionIds,
    priorityByDecisionId: nextPriorityByDecisionId,
  }: {
    decisionIds: string[];
    priorityByDecisionId: Record<string, TodayDecisionPriorityExplanation>;
  }) {
    setPriorityByDecisionId(nextPriorityByDecisionId);
    setVisibleDecisionIds(filterCompletedDecisionIds(decisionIds, initialCompletionStatus));
  }

  async function approvePriorityDecision() {
    if (!priorityDecision || priorityDecisionSubmissionInProgress.current) {
      return;
    }

    priorityDecisionSubmissionInProgress.current = true;
    setIsSubmittingPriorityDecision(true);
    setSubmissionError(null);

    try {
      const result = await submitTodayDecision({
        decisionId: priorityDecision.id,
        action: "approve",
        decisionRevision: priorityDecision.decisionRevision,
      });

      if (!result.success) {
        setSubmissionError(result.error === "decision-replaced" ? "stale" : "generic");
        return;
      }

      setSubmissionError(null);
      setCompletionMessage(priorityDecision.completionMessage);
      const nextCompletionAction = availableCompletionAction(
        priorityDecision.completionAction,
      );
      setCompletionAction(nextCompletionAction);
      if (nextCompletionAction?.workflowId) {
        markOfferWorkspaceReviewed(nextCompletionAction.workflowId);
      }
      setFeedbackStatus("completed");
      setExpandedDetailsId(null);
      setEditHintDecisionId(null);
      applyDecisionResult(result);
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
    setSubmissionError(null);

    try {
      const result = await submitTodayDecision({
        decisionId: priorityDecision.id,
        action: "later",
        decisionRevision: priorityDecision.decisionRevision,
      });

      if (!result.success) {
        setSubmissionError(result.error === "decision-replaced" ? "stale" : "generic");
        return;
      }

      setSubmissionError(null);
      setCompletionMessage(
        "Die Entscheidung wurde für später eingeordnet. Atlas zeigt dir jetzt den nächsten Punkt.",
      );
      setCompletionAction(null);
      setFeedbackStatus("deferred");
      setExpandedDetailsId(null);
      setEditHintDecisionId(null);
      applyDecisionResult(result);
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
    setSubmissionError(null);

    try {
      const result = await submitTodayDecision({
        decisionId,
        action: "prioritize",
        decisionRevision: decisionById.get(decisionId)?.decisionRevision,
      });

      if (!result.success) {
        setSubmissionError(result.error === "decision-replaced" ? "stale" : "generic");
        return;
      }

      setSubmissionError(null);
      setCompletionMessage(null);
      setCompletionAction(null);
      setFeedbackStatus(null);
      setExpandedDetailsId(null);
      setEditHintDecisionId(null);
      applyDecisionResult(result);
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
          {submissionError === "stale"
            ? "Diese Entscheidung wurde inzwischen durch eine neuere Version ersetzt. Bitte lade Heute neu, um die aktuelle Entscheidung zu sehen."
            : "Die Entscheidung konnte gerade nicht verarbeitet werden. Bitte versuche es erneut."}
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
              {completionAction ? (
                <Link
                  href={completionAction.href}
                  onClick={(event) => {
                    if (!availableCompletionAction(completionAction)) {
                      event.preventDefault();
                      setCompletionAction(null);
                    }
                  }}
                  className="mt-4 inline-flex rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                >
                  {completionAction.label}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {hasDecisions && priorityDecision ? (
        <>
          <div
            data-handoff-focused={isPriorityDecisionFocused ? "true" : undefined}
            className={
              isPriorityDecisionFocused
                ? "rounded-[2rem] ring-2 ring-emerald-400 ring-offset-2 ring-offset-neutral-50"
                : undefined
            }
          >
          <ApprovalCard
            {...priorityDecision}
            details={{
              ...priorityDecision.details,
              id: `details-${priorityDecision.id}`,
              isVisible: expandedDetailsId === priorityDecision.id,
            }}
            clarificationNote={
              hasClarificationDraftForPriorityDecision
                ? CLARIFICATION_PREPARED_NOTE
                : undefined
            }
            notice={
              editHintDecisionId === priorityDecision.id
                ? { text: "Bearbeitungsansicht folgt." }
                : undefined
            }
            primaryAction={{
              label: priorityDecision.primaryActionLabel,
              pendingLabel:
                priorityDecision.primaryActionPendingLabel ?? "Wird freigegeben …",
              onSelect: approvePriorityDecision,
              isDisabled: isSubmittingPriorityDecision,
            }}
            secondaryActions={[
              availableEditHref(priorityDecision, liveInboxWorkflowId)
                ? {
                    label: "Ändern",
                    href: availableEditHref(priorityDecision, liveInboxWorkflowId),
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
          </div>
          <DecisionOverviewList
            decisions={overviewDecisions}
            onSelect={prioritizeDecision}
            isDisabled={isSubmittingPriorityDecision}
            focusedDecisionId={focusedOverviewDecisionId}
          />
        </>
      ) : (
        <TodayEmptyState isVisible />
      )}
    </div>
  );
}

export type { TodayApprovalDecision, TodayApprovalDecisionInput };
