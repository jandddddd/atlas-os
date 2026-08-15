"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ScanSearch, Sparkles, TriangleAlert } from "lucide-react";

import {
  persistInboxTodayDecision,
  resetInboxTodayDecision,
} from "@/app/inbox/actions";

import { AnalysisResultView } from "./AnalysisResultView";
import { OfferDraftView } from "./OfferDraftView";
import type { AnalysisResult, OfferDraft, OfferStatus } from "./types";
import {
  clearOfferDraft,
  clearInboxWorkflow,
  loadInquiryAnalysis,
  loadOfferDraft,
  saveInquiryAnalysis,
  saveOfferDraft,
} from "@/lib/storage/inbox-storage";
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

  useEffect(() => {
    let cancelled = false;

    const savedAnalysis = loadInquiryAnalysis();
    const savedOffer = loadOfferDraft();

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
      saveInquiryAnalysis(analyzedWorkflow);
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

    const currentWorkflowVersion = workflowVersion.current;

    try {
      setOfferStatus("generating");
      setOfferError("");

      const response = await fetch("/api/generate-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry: analysisInquiry, analysis }),
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
      const savedOffer = {
        ...editableOffer,
        positions: editableOffer.positions.map((position) => ({ ...position })),
      };
      setOffer(savedOffer);
      saveOfferDraft(savedOffer, analysis);
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
          isTodayHandoffAvailable={analysisSource === "current" && !isEditingOffer}
          offerStatus={offerStatus}
          onGenerateOffer={generateOffer}
          onRestartAnalysis={() => void startAnalysis()}
        />

        {offerStatus === "error" && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="font-semibold text-red-900">
              Angebotserstellung fehlgeschlagen
            </p>
            <p className="mt-1 text-sm text-red-700">{offerError}</p>
            <button
              type="button"
              onClick={generateOffer}
              className="mt-4 rounded-xl bg-red-900 px-5 py-2.5 text-sm font-medium text-white"
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
            className="text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            Gespeicherten Vorgang zurücksetzen
          </button>
        </div>
      </div>
    );
  }

  const isAnalyzing = status === "analyzing";

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
              disabled={isAnalyzing}
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
              disabled={isAnalyzing}
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
            disabled={isAnalyzing}
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
          disabled={isAnalyzing}
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
