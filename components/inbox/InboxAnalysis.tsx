"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ScanSearch, Sparkles, TriangleAlert } from "lucide-react";

import {
  persistInboxTodayDecision,
  resetInboxTodayDecision,
} from "@/app/inbox/actions";

import { AnalysisResultView } from "./AnalysisResultView";
import { ClarificationDraftView } from "./ClarificationDraftView";
import { CustomerReplyPanel } from "./CustomerReplyPanel";
import { OfferDraftView } from "./OfferDraftView";
import type {
  AnalysisResult,
  ClarificationDraft,
  OfferDraft,
  OfferStatus,
} from "./types";
import {
  clearClarificationDraft,
  clearOfferDraft,
  clearInboxWorkflow,
  flagOfferDraftForReReview,
  loadClarificationDraftForAnalysis,
  loadInquiryAnalysis,
  loadInquiryContextForAnalysis,
  loadOfferDraft,
  loadOfferDraftNeedsReview,
  markOfferWorkspaceReviewed,
  saveClarificationDraft,
  saveInquiryAnalysis,
  saveInquiryContext,
  saveOfferDraft,
} from "@/lib/storage/inbox-storage";
import { createClarificationDraft } from "@/lib/inbox/clarification-draft";
import { composeInquiryWithCustomerReply } from "@/lib/inbox/customer-reply";
import {
  composeInquiry,
  validateInquiryIntake,
  type InquiryIntake,
  type InquiryIntakeErrors,
} from "@/lib/inbox/inquiry-intake";

export function InboxAnalysis() {
  const workflowVersion = useRef(0);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [analysisSource, setAnalysisSource] = useState<
    "none" | "restored" | "current"
  >("none");
  const [analysisInquiry, setAnalysisInquiry] = useState<string | null>(null);
  const [intake, setIntake] = useState<InquiryIntake>({
    customer: "",
    location: "",
    message: "",
  });
  const [intakeErrors, setIntakeErrors] = useState<InquiryIntakeErrors>({});
  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "analyzing" | "completed" | "error"
  >("idle");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [offerStatus, setOfferStatus] = useState<OfferStatus>("idle");
  const [offer, setOffer] = useState<OfferDraft | null>(null);
  const [offerError, setOfferError] = useState("");
  const [editableOffer, setEditableOffer] = useState<OfferDraft | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [resetError, setResetError] = useState("");
  const [isEditingClarification, setIsEditingClarification] = useState(false);
  const [clarification, setClarification] = useState<ClarificationDraft | null>(
    null,
  );
  const [editableClarification, setEditableClarification] =
    useState<ClarificationDraft | null>(null);
  const [clarificationLastSavedAt, setClarificationLastSavedAt] = useState<
    string | null
  >(null);
  const [inquiryContext, setInquiryContext] = useState<string | null>(null);
  const [offerNeedsReview, setOfferNeedsReview] = useState(false);
  const [isCustomerReplyPanelOpen, setIsCustomerReplyPanelOpen] = useState(false);
  const [isSubmittingCustomerReply, setIsSubmittingCustomerReply] = useState(false);
  const [customerReplySubmitError, setCustomerReplySubmitError] = useState("");
  const [isReanalyzingPersistedContext, setIsReanalyzingPersistedContext] =
    useState(false);
  const [reanalysisError, setReanalysisError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const savedAnalysis = loadInquiryAnalysis();
    const savedOffer = loadOfferDraft();
    const savedClarification = savedAnalysis
      ? loadClarificationDraftForAnalysis(savedAnalysis)
      : null;
    const savedInquiryContext = savedAnalysis
      ? loadInquiryContextForAnalysis(savedAnalysis)
      : null;
    const savedOfferNeedsReview = savedAnalysis
      ? loadOfferDraftNeedsReview(savedAnalysis)
      : false;

    queueMicrotask(() => {
      if (cancelled) return;

      if (savedAnalysis) {
        setAnalysis(savedAnalysis);
        setAnalysisSource("restored");
        setStatus("completed");
      }

      if (savedOffer) {
        setOffer(savedOffer);
        setEditableOffer(savedOffer);
        setOfferStatus("completed");
      }

      if (savedClarification) {
        setClarification(savedClarification);
        setEditableClarification(savedClarification);
      }

      if (savedInquiryContext) {
        setInquiryContext(savedInquiryContext);
      }

      setOfferNeedsReview(savedOfferNeedsReview);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateIntake(field: keyof InquiryIntake, value: string) {
    setIntake((current) => ({ ...current, [field]: value }));
    setIntakeErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function startAnalysis(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isSubmittingCustomerReply || isReanalyzingPersistedContext) return;

    const errors = validateInquiryIntake(intake);

    if (Object.keys(errors).length > 0) {
      setIntakeErrors(errors);
      if (errors.customer) {
        customerInputRef.current?.focus();
      } else {
        messageInputRef.current?.focus();
      }
      return;
    }

    const inquiry = composeInquiry(intake);
    workflowVersion.current += 1;
    setIsSubmittingCustomerReply(false);
    setIsCustomerReplyPanelOpen(false);
    setCustomerReplySubmitError("");
    setReanalysisError("");

    try {
      setStatus("analyzing");
      setAnalysisSource("none");
      setAnalysisInquiry(null);
      setAnalysisError("");
      setResetError("");
      setOfferStatus("idle");

      const response = await fetch("/api/analyze-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Die Anfrage konnte nicht analysiert werden.",
        );
      }

      const analyzedWorkflow: AnalysisResult = {
        ...data.analysis,
        workflowId: crypto.randomUUID(),
      };

      if (!(await persistInboxTodayDecision(analyzedWorkflow))) {
        throw new Error(
          "Die vorbereitete Entscheidung konnte nicht gespeichert werden.",
        );
      }

      setAnalysis(analyzedWorkflow);
      setAnalysisSource("current");
      setAnalysisInquiry(inquiry);
      setIsEditingOffer(false);
      setOffer(null);
      setOfferStatus("idle");
      setOfferError("");
      setEditableOffer(null);
      setLastSavedAt(null);
      clearOfferDraft();
      setIsEditingClarification(false);
      setClarification(null);
      setEditableClarification(null);
      setClarificationLastSavedAt(null);
      clearClarificationDraft();
      setOfferNeedsReview(false);
      setInquiryContext(inquiry);
      setIsCustomerReplyPanelOpen(false);
      setCustomerReplySubmitError("");
      saveInquiryAnalysis(analyzedWorkflow);
      saveInquiryContext(inquiry, analyzedWorkflow);
      setStatus("completed");
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Ein unbekannter Fehler ist aufgetreten.",
      );
      setStatus("error");
    }
  }

  async function generateOffer() {
    if (!analysis || analysisSource !== "current" || !analysisInquiry) return;
    if (isSubmittingCustomerReply || isReanalyzingPersistedContext) return;

    const currentWorkflowVersion = workflowVersion.current;
    const offerAnalysis = {
      customer: analysis.customer,
      project: analysis.project,
      workflow: analysis.workflow,
      nextSteps: analysis.nextSteps,
      missingInformation: analysis.missingInformation,
      recommendedTask: analysis.recommendedTask,
    };

    try {
      setOfferStatus("generating");
      setOfferError("");

      const response = await fetch("/api/generate-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry: analysisInquiry, analysis: offerAnalysis }),
      });
      const data = await response.json();

      if (currentWorkflowVersion !== workflowVersion.current) return;

      if (!response.ok) {
        throw new Error(
          data.error ?? "Der Angebotsentwurf konnte nicht erstellt werden.",
        );
      }

      setOffer(data.offer);
      setEditableOffer(data.offer);
      setOfferNeedsReview(false);
      saveOfferDraft(data.offer, analysis);
      setOfferStatus("completed");
    } catch (error) {
      if (currentWorkflowVersion !== workflowVersion.current) return;

      setOfferError(
        error instanceof Error
          ? error.message
          : "Ein unbekannter Fehler ist aufgetreten.",
      );
      setOfferStatus("error");
    }
  }

  function saveOffer() {
    if (editableOffer && analysis) {
      const wasFlaggedForReview = offerNeedsReview;
      const savedOffer = {
        ...editableOffer,
        positions: editableOffer.positions.map((position) => ({ ...position })),
      };
      setOffer(savedOffer);
      setOfferNeedsReview(false);
      saveOfferDraft(savedOffer, analysis);
      // A manual save of an offer that was flagged for renewed review (after
      // new customer information arrived) represents the deliberate human
      // re-review Today approval was not allowed to grant on its own.
      if (wasFlaggedForReview && analysis.workflowId) {
        markOfferWorkspaceReviewed(analysis.workflowId);
      }
      setLastSavedAt(
        new Date().toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }
    setIsEditingOffer(false);
  }

  async function resetInboxWorkflow() {
    if (isSubmittingCustomerReply || isReanalyzingPersistedContext) return;

    workflowVersion.current += 1;

    try {
      await resetInboxTodayDecision();
      setResetError("");
    } catch {
      setResetError(
        "Der Vorgang wurde lokal zurückgesetzt. Die vorbereitete Today-Entscheidung konnte nicht vollständig entfernt werden.",
      );
    } finally {
      clearInboxWorkflow();
      setIsEditingOffer(false);
      setStatus("idle");
      setAnalysis(null);
      setAnalysisError("");
      setOfferStatus("idle");
      setOffer(null);
      setOfferError("");
      setEditableOffer(null);
      setLastSavedAt(null);
      setAnalysisSource("none");
      setAnalysisInquiry(null);
      setIsEditingClarification(false);
      setClarification(null);
      setEditableClarification(null);
      setClarificationLastSavedAt(null);
      setInquiryContext(null);
      setOfferNeedsReview(false);
      setIsCustomerReplyPanelOpen(false);
      setIsSubmittingCustomerReply(false);
      setCustomerReplySubmitError("");
      setIsReanalyzingPersistedContext(false);
      setReanalysisError("");
    }
  }

  function discardOfferChanges() {
    if (offer) {
      setEditableOffer({
        ...offer,
        positions: offer.positions.map((position) => ({ ...position })),
      });
    }
    setIsEditingOffer(false);
  }

  function prepareClarification() {
    if (!analysis || analysisSource !== "current") return;

    const draft = createClarificationDraft({
      customerName: analysis.customer.name,
      service: analysis.project.service,
      missingInformation: analysis.missingInformation,
    });

    setClarification(draft);
    setEditableClarification(draft);
    setClarificationLastSavedAt(null);
    setIsEditingClarification(false);
    saveClarificationDraft(draft, analysis);
  }

  function handleClarificationCta() {
    if (clarification) {
      const section = document.getElementById("clarification-draft");
      section?.scrollIntoView({ block: "start" });
      section?.focus({ preventScroll: true });
      return;
    }

    prepareClarification();
  }

  function saveClarification() {
    if (editableClarification && analysis) {
      setClarification(editableClarification);
      saveClarificationDraft(editableClarification, analysis);
      setClarificationLastSavedAt(
        new Date().toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }
    setIsEditingClarification(false);
  }

  function discardClarificationChanges() {
    if (clarification) {
      setEditableClarification({ ...clarification });
    }
    setIsEditingClarification(false);
  }

  function toggleCustomerReplyPanel() {
    setCustomerReplySubmitError("");
    setIsCustomerReplyPanelOpen((open) => !open);
  }

  function cancelCustomerReply() {
    setIsCustomerReplyPanelOpen(false);
    setCustomerReplySubmitError("");
  }

  async function mergeCustomerReply(customerReply: string) {
    if (isReanalyzingPersistedContext) return;
    if (!analysis || !analysis.workflowId || !inquiryContext) return;

    const workflowId = analysis.workflowId;
    const composedContext = composeInquiryWithCustomerReply(
      inquiryContext,
      customerReply,
    );

    workflowVersion.current += 1;
    const currentWorkflowVersion = workflowVersion.current;

    if (offerStatus === "generating") {
      setOfferStatus(offer ? "completed" : "idle");
    }

    try {
      setIsSubmittingCustomerReply(true);
      setCustomerReplySubmitError("");

      const response = await fetch("/api/analyze-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry: composedContext }),
      });
      const data = await response.json();

      if (currentWorkflowVersion !== workflowVersion.current) return;

      if (!response.ok) {
        throw new Error(
          data.error ?? "Die Kundenantwort konnte nicht ausgewertet werden.",
        );
      }

      const updatedAnalysis: AnalysisResult = {
        ...data.analysis,
        workflowId,
      };

      const todayPersisted = await persistInboxTodayDecision(updatedAnalysis);

      // Defense in depth: even though startAnalysis()/resetInboxWorkflow()
      // now refuse to run while a reply is submitting, re-check after this
      // await too, so a replaced workflow can never be overwritten by a
      // reply that started against the previous one.
      if (currentWorkflowVersion !== workflowVersion.current) return;

      if (!todayPersisted) {
        throw new Error(
          "Die aktualisierte Entscheidung konnte nicht gespeichert werden.",
        );
      }

      saveInquiryAnalysis(updatedAnalysis);
      saveInquiryContext(composedContext, updatedAnalysis);
      flagOfferDraftForReReview(workflowId);

      setAnalysis(updatedAnalysis);
      setAnalysisSource("current");
      setAnalysisInquiry(composedContext);
      setInquiryContext(composedContext);
      setOfferNeedsReview(loadOfferDraftNeedsReview(updatedAnalysis));
      setIsEditingClarification(false);
      setClarification(null);
      setEditableClarification(null);
      setClarificationLastSavedAt(null);
      clearClarificationDraft();
      setIsCustomerReplyPanelOpen(false);
      setCustomerReplySubmitError("");
      setReanalysisError("");
    } catch (error) {
      if (currentWorkflowVersion !== workflowVersion.current) return;

      setCustomerReplySubmitError(
        error instanceof Error
          ? error.message
          : "Ein unbekannter Fehler ist aufgetreten.",
      );
    } finally {
      if (currentWorkflowVersion === workflowVersion.current) {
        setIsSubmittingCustomerReply(false);
      }
    }
  }

  /**
   * Safely re-runs the already persisted, cumulative inquiry context for a
   * restored analysis (e.g. original inquiry plus a merged customer reply)
   * against the same workflow, instead of requiring the user to retype the
   * inquiry into the now-empty intake form. Only applies to a restored
   * analysis; a "current" analysis keeps using startAnalysis() unchanged.
   */
  async function reanalyzePersistedInquiryContext() {
    if (isSubmittingCustomerReply || isReanalyzingPersistedContext) return;

    if (
      analysisSource !== "restored" ||
      !analysis ||
      !analysis.workflowId ||
      inquiryContext === null
    ) {
      setReanalysisError(
        "Der gespeicherte Anfragekontext fehlt. Diese Analyse kann nicht sicher erneut ausgewertet werden.",
      );
      return;
    }

    const workflowId = analysis.workflowId;
    const persistedInquiry = inquiryContext;

    workflowVersion.current += 1;
    const currentWorkflowVersion = workflowVersion.current;

    try {
      setIsReanalyzingPersistedContext(true);
      setReanalysisError("");

      const response = await fetch("/api/analyze-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry: persistedInquiry }),
      });

      // A proxy/gateway failure (e.g. 502/504) can return an empty or HTML
      // body instead of JSON; never let that raw parser error reach the
      // user, always fall back to the controlled message below.
      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (currentWorkflowVersion !== workflowVersion.current) return;

      if (!response.ok || !data) {
        throw new Error(
          data?.error ?? "Die Analyse konnte nicht erneut ausgewertet werden.",
        );
      }

      const updatedAnalysis: AnalysisResult = {
        ...data.analysis,
        workflowId,
      };

      const todayPersisted = await persistInboxTodayDecision(updatedAnalysis);

      if (currentWorkflowVersion !== workflowVersion.current) return;

      if (!todayPersisted) {
        throw new Error(
          "Die aktualisierte Entscheidung konnte nicht gespeichert werden.",
        );
      }

      saveInquiryAnalysis(updatedAnalysis);
      setAnalysis(updatedAnalysis);
      setAnalysisSource("current");
      setAnalysisInquiry(persistedInquiry);
      // The previous clarification draft (if any) was prepared for the
      // now-superseded analysis and must not keep asking about information
      // the fresh analysis may no longer consider missing.
      setIsEditingClarification(false);
      setClarification(null);
      setEditableClarification(null);
      setClarificationLastSavedAt(null);
      clearClarificationDraft();
      setReanalysisError("");
    } catch (error) {
      if (currentWorkflowVersion !== workflowVersion.current) return;

      setReanalysisError(
        error instanceof Error
          ? error.message
          : "Ein unbekannter Fehler ist aufgetreten.",
      );
    } finally {
      if (currentWorkflowVersion === workflowVersion.current) {
        setIsReanalyzingPersistedContext(false);
      }
    }
  }

  function handleRestartAnalysis() {
    if (analysisSource === "restored") {
      void reanalyzePersistedInquiryContext();
      return;
    }
    void startAnalysis();
  }

  function renderWorkflow() {
    if (status === "idle") {
      return (
        <div className="mt-6 space-y-4">
          {resetError ? (
            <p
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {resetError}
            </p>
          ) : null}
        </div>
      );
    }

    if (status === "analyzing") {
      return (
        <div className="mt-8 rounded-xl border bg-neutral-50 p-6">
          <div className="flex items-center gap-3">
            <ScanSearch className="h-5 w-5 animate-pulse text-neutral-700" />
            <div>
              <p className="font-semibold">
                Atlas analysiert die Anfrage mit Claude
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Leistung, Dringlichkeit und nächste Schritte werden geprüft.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 text-red-700" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">
                Analyse fehlgeschlagen
              </p>
              <p className="mt-1 text-sm text-red-700">{analysisError}</p>
              <button
                type="button"
                onClick={() => void startAnalysis()}
                className="mt-4 rounded-xl bg-red-900 px-5 py-2.5 text-sm font-medium text-white"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!analysis) return null;

    return (
      <div className="mt-8 space-y-6">
        <AnalysisResultView
          analysis={analysis}
          isOfferGenerationBlocked={analysisSource !== "current"}
          isClarificationBlocked={analysisSource !== "current"}
          hasClarificationDraft={clarification !== null}
          isCustomerReplyBlocked={!analysis.workflowId || inquiryContext === null}
          isCustomerReplyPanelOpen={isCustomerReplyPanelOpen}
          isCustomerReplySubmitting={isSubmittingCustomerReply}
          isReanalyzingPersistedContext={isReanalyzingPersistedContext}
          reanalysisError={reanalysisError}
          isTodayHandoffAvailable={
            analysisSource === "current" &&
            !isEditingOffer &&
            !isSubmittingCustomerReply &&
            !isReanalyzingPersistedContext
          }
          offerStatus={offerStatus}
          onGenerateOffer={generateOffer}
          onPrepareClarification={handleClarificationCta}
          onToggleCustomerReply={toggleCustomerReplyPanel}
          onRestartAnalysis={handleRestartAnalysis}
        />

        {isCustomerReplyPanelOpen && (
          <CustomerReplyPanel
            isSubmitting={isSubmittingCustomerReply}
            disabled={isReanalyzingPersistedContext}
            submitError={customerReplySubmitError}
            onCancel={cancelCustomerReply}
            onSubmit={(customerReply) => void mergeCustomerReply(customerReply)}
          />
        )}

        {clarification && editableClarification && (
          <ClarificationDraftView
            editableDraft={editableClarification}
            isEditing={isEditingClarification}
            lastSavedAt={clarificationLastSavedAt}
            onChange={setEditableClarification}
            onStartEditing={() => setIsEditingClarification(true)}
            onSave={saveClarification}
            onDiscard={discardClarificationChanges}
          />
        )}

        {offerStatus === "error" && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="font-semibold text-red-900">
              Angebotserstellung fehlgeschlagen
            </p>
            <p className="mt-1 text-sm text-red-700">{offerError}</p>
            <button
              type="button"
              onClick={generateOffer}
              disabled={isSubmittingCustomerReply}
              className="mt-4 rounded-xl bg-red-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Erneut versuchen
            </button>
          </section>
        )}

        {offerStatus === "completed" && editableOffer && (
          <OfferDraftView
            editableOffer={editableOffer}
            isEditing={isEditingOffer}
            lastSavedAt={lastSavedAt}
            needsReview={offerNeedsReview}
            onChange={setEditableOffer}
            onStartEditing={() => setIsEditingOffer(true)}
            onSave={saveOffer}
            onDiscard={discardOfferChanges}
          />
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={resetInboxWorkflow}
            disabled={isSubmittingCustomerReply || isReanalyzingPersistedContext}
            className="text-sm text-neutral-500 transition hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Gespeicherten Vorgang zurücksetzen
          </button>
        </div>
      </div>
    );
  }

  const isAnalyzing = status === "analyzing";
  const isIntakeDisabled =
    isAnalyzing || isSubmittingCustomerReply || isReanalyzingPersistedContext;

  return (
    <>
      <form noValidate onSubmit={startAnalysis}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="inquiry-customer"
              className="text-sm font-medium text-neutral-700"
            >
              Kunde oder Kontakt
            </label>
            <input
              ref={customerInputRef}
              id="inquiry-customer"
              name="customer"
              value={intake.customer}
              onChange={(event) => updateIntake("customer", event.target.value)}
              aria-describedby={
                intakeErrors.customer ? "inquiry-customer-error" : undefined
              }
              aria-invalid={Boolean(intakeErrors.customer)}
              disabled={isIntakeDisabled}
              className="mt-2 w-full rounded-xl border bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:cursor-wait disabled:opacity-60"
            />
            {intakeErrors.customer ? (
              <p
                id="inquiry-customer-error"
                role="alert"
                className="mt-2 text-sm text-red-700"
              >
                {intakeErrors.customer}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="inquiry-location"
              className="text-sm font-medium text-neutral-700"
            >
              Ort{" "}
              <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="inquiry-location"
              name="location"
              value={intake.location}
              onChange={(event) => updateIntake("location", event.target.value)}
              disabled={isIntakeDisabled}
              className="mt-2 w-full rounded-xl border bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:cursor-wait disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="inquiry-message"
            className="text-sm font-medium text-neutral-700"
          >
            Kundenanfrage
          </label>
          <textarea
            ref={messageInputRef}
            id="inquiry-message"
            name="message"
            rows={7}
            value={intake.message}
            onChange={(event) => updateIntake("message", event.target.value)}
            aria-describedby={
              intakeErrors.message
                ? "inquiry-message-error"
                : "inquiry-message-help"
            }
            aria-invalid={Boolean(intakeErrors.message)}
            disabled={isIntakeDisabled}
            className="mt-2 w-full resize-y rounded-xl border bg-neutral-50 px-4 py-3 leading-7 text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:cursor-wait disabled:opacity-60"
          />
          {intakeErrors.message ? (
            <p
              id="inquiry-message-error"
              role="alert"
              className="mt-2 text-sm text-red-700"
            >
              {intakeErrors.message}
            </p>
          ) : (
            <p id="inquiry-message-help" className="mt-2 text-sm text-neutral-500">
              Übernimm die Anfrage so, wie sie eingegangen ist. Fehlende
              Angaben bleiben offen.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isIntakeDisabled}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60"
        >
          <Sparkles className="h-5 w-5" />
          {isAnalyzing ? "Anfrage wird analysiert ..." : "Anfrage analysieren"}
        </button>
      </form>

      {renderWorkflow()}
    </>
  );
}
