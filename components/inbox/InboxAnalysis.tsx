"use client";

import { useEffect, useState } from "react";
import { ScanSearch, Sparkles, TriangleAlert } from "lucide-react";

import { AnalysisResultView } from "./AnalysisResultView";
import { OfferDraftView } from "./OfferDraftView";
import type { AnalysisResult, OfferDraft, OfferStatus } from "./types";

const inquiry = `
Guten Tag, wir möchten unser Wohnzimmer, Esszimmer und den Flur
streichen lassen. Die Räume sind zusammen ungefähr 75 Quadratmeter
groß. Könnten Sie uns bitte ein Angebot erstellen?
Bilder können wir gerne nachreichen.
`.trim();

export function InboxAnalysis() {
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

  useEffect(() => {
    let cancelled = false;

    try {
      const savedAnalysis = window.localStorage.getItem(
        "atlas-inquiry-analysis",
      );
      const savedOffer = window.localStorage.getItem("atlas-editable-offer");
      const parsedAnalysis = savedAnalysis
        ? (JSON.parse(savedAnalysis) as AnalysisResult)
        : null;
      const parsedOffer = savedOffer
        ? (JSON.parse(savedOffer) as OfferDraft)
        : null;

      queueMicrotask(() => {
        if (cancelled) return;

        if (parsedAnalysis) {
          setAnalysis(parsedAnalysis);
          setStatus("completed");
        }

        if (parsedOffer) {
          setOffer(parsedOffer);
          setEditableOffer(parsedOffer);
          setOfferStatus("completed");
        }
      });
    } catch (error) {
      console.error(
        "Gespeicherte Atlas-Daten konnten nicht geladen werden:",
        error,
      );
    }

    return () => {
      cancelled = true;
    };
  }, []);

  async function startAnalysis() {
    try {
      setStatus("analyzing");
      setAnalysisError("");
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

      setAnalysis(data.analysis);
      window.localStorage.setItem(
        "atlas-inquiry-analysis",
        JSON.stringify(data.analysis),
      );
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

    try {
      setOfferStatus("generating");
      setOfferError("");

      const response = await fetch("/api/generate-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry, analysis }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Der Angebotsentwurf konnte nicht erstellt werden.",
        );
      }

      setOffer(data.offer);
      setEditableOffer(data.offer);
      window.localStorage.setItem(
        "atlas-editable-offer",
        JSON.stringify(data.offer),
      );
      setOfferStatus("completed");
    } catch (error) {
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
      window.localStorage.setItem(
        "atlas-editable-offer",
        JSON.stringify(savedOffer),
      );
      setLastSavedAt(
        new Date().toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }
    setIsEditingOffer(false);
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
      <div className="mt-8">
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
    </div>
  );
}
