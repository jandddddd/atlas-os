"use client";

import { useEffect, useRef, useState } from "react";
import { ScanSearch, Sparkles, TriangleAlert } from "lucide-react";

import {
  persistInboxTodayDecision,
  resetInboxTodayDecision,
} from "@/app/inbox/actions";

import { AnalysisResultView } from "./AnalysisResultView";
import { OfferDraftView } from "./OfferDraftView";
import type { AnalysisResult, OfferDraft, OfferStatus } from "./types";
import {
  clearInboxWorkflow,
  loadInquiryAnalysis,
  loadOfferDraft,
  saveInquiryAnalysis,
  saveOfferDraft,
} from "@/lib/storage/inbox-storage";

const inquiry = `
Guten Tag, wir möchten unser Wohnzimmer, Esszimmer und den Flur
streichen lassen. Die Räume sind zusammen ungefähr 75 Quadratmeter
groß. Könnten Sie uns bitte ein Angebot erstellen?
Bilder können wir gerne nachreichen.
`.trim();

export function InboxAnalysis() {
  const workflowVersion = useRef(0);
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

  async function startAnalysis() {
    try {
      setStatus("analyzing");
      setAnalysisError("");
      setResetError("");
      setOffer(null);
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

      if (!(await persistInboxTodayDecision(data.analysis))) {
        throw new Error(
          "Die vorbereitete Entscheidung konnte nicht gespeichert werden.",
        );
      }

      setAnalysis(data.analysis);
      saveInquiryAnalysis(data.analysis);
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
    if (!analysis) return;
    const currentWorkflowVersion = workflowVersion.current;

    try {
      setOfferStatus("generating");
      setOfferError("");

      const response = await fetch("/api/generate-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry, analysis }),
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
      saveOfferDraft(data.offer);
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
    if (editableOffer) {
      const savedOffer = {
        ...editableOffer,
        positions: editableOffer.positions.map((position) => ({ ...position })),
      };
      setOffer(savedOffer);
      saveOfferDraft(savedOffer);
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

  if (status === "idle") {
    return (
      <div className="mt-8 space-y-4">
        {resetError ? (
          <p
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {resetError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={startAnalysis}
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700"
        >
          <Sparkles className="h-5 w-5" />
          Anfrage analysieren
        </button>
      </div>
    );
  }

  if (status === "analyzing") {
    return (
      <div className="mt-8 rounded-xl border bg-neutral-50 p-6">
        <div className="flex items-center gap-3">
          <ScanSearch className="h-5 w-5 animate-pulse text-neutral-700" />
          <div>
            <p className="font-semibold">Atlas analysiert die Anfrage mit Claude</p>
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
            <p className="font-semibold text-red-900">Analyse fehlgeschlagen</p>
            <p className="mt-1 text-sm text-red-700">{analysisError}</p>
            <button
              type="button"
              onClick={startAnalysis}
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
        offerStatus={offerStatus}
        onGenerateOffer={generateOffer}
        onRestartAnalysis={startAnalysis}
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
