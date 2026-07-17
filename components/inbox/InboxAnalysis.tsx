"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  ScanSearch,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

type AnalysisResult = {
  customer: {
    name: string;
  };

  project: {
    trade: string;
    service: string;
    estimatedArea: number | null;
  };

  workflow: {
    priority: "low" | "normal" | "high";
    confidence: number;
    nextAction: string;
  };

  nextSteps: string[];
  missingInformation: string[];

  recommendedTask: {
    type: "offer" | "visit" | "supplier";
    title: string;
  };
};

type OfferPosition = {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  notes: string;
};

type OfferDraft = {
  customerName: string;
  title: string;
  projectSummary: string;
  positions: OfferPosition[];
  assumptions: string[];
  missingInformation: string[];
  recommendedNextStep: string;
  status: "draft";
};

const inquiry = `
Guten Tag, wir möchten unser Wohnzimmer, Esszimmer und den Flur
streichen lassen. Die Räume sind zusammen ungefähr 75 Quadratmeter
groß. Könnten Sie uns bitte ein Angebot erstellen?
Bilder können wir gerne nachreichen.
`.trim();

export function InboxAnalysis() {
  const [status, setStatus] = useState<
    "idle" | "analyzing" | "completed" | "error"
  >("idle");

  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

  const [analysisError, setAnalysisError] = useState("");

  const [offerStatus, setOfferStatus] = useState<
    "idle" | "generating" | "completed" | "error"
  >("idle");

  const [offer, setOffer] = useState<OfferDraft | null>(null);
  const [offerError, setOfferError] = useState("");

  async function startAnalysis() {
    try {
      setStatus("analyzing");
      setAnalysisError("");
      setOffer(null);
      setOfferStatus("idle");

      const response = await fetch("/api/analyze-inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inquiry }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Die Anfrage konnte nicht analysiert werden.",
        );
      }

      setAnalysis(data.analysis);
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
    if (!analysis) {
      return;
    }

    try {
      setOfferStatus("generating");
      setOfferError("");

      const response = await fetch("/api/generate-offer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inquiry,
          analysis,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Der Angebotsentwurf konnte nicht erstellt werden.",
        );
      }

      setOffer(data.offer);
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
            <p className="font-semibold">
              Atlas analysiert die Anfrage mit Claude
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              Leistung, Dringlichkeit und nächste Schritte werden
              geprüft.
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

            <p className="mt-1 text-sm text-red-700">
              {analysisError}
            </p>

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

  if (!analysis) {
    return null;
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-700" />

          <div>
            <h2 className="text-lg font-semibold text-emerald-950">
              Analyse abgeschlossen
            </h2>

            <p className="mt-1 text-sm text-emerald-800">
              Atlas hat die Kundenanfrage mit Claude ausgewertet.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/70 p-5">
            <FileText className="h-5 w-5 text-neutral-700" />

            <p className="mt-3 text-sm text-neutral-500">
              Erkannte Leistung
            </p>

            <p className="mt-1 font-medium">
              {analysis.project.service}
            </p>
          </div>

          <div className="rounded-xl bg-white/70 p-5">
            <Clock3 className="h-5 w-5 text-neutral-700" />

            <p className="mt-3 text-sm text-neutral-500">
              Priorität
            </p>

            <p className="mt-1 font-medium">
              {analysis.workflow.priority}
            </p>
          </div>

          <div className="rounded-xl bg-white/70 p-5">
            <Sparkles className="h-5 w-5 text-neutral-700" />

            <p className="mt-3 text-sm text-neutral-500">
              Sicherheit
            </p>

            <p className="mt-1 font-medium">
              {Math.round(
                analysis.workflow.confidence * 100,
              )}{" "}
              %
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/70 p-5">
            <p className="text-sm text-neutral-500">
              Kunde
            </p>

            <p className="mt-1 font-medium">
              {analysis.customer.name}
            </p>
          </div>

          <div className="rounded-xl bg-white/70 p-5">
            <p className="text-sm text-neutral-500">
              Gewerk
            </p>

            <p className="mt-1 font-medium">
              {analysis.project.trade}
            </p>
          </div>

          <div className="rounded-xl bg-white/70 p-5">
            <p className="text-sm text-neutral-500">
              Geschätzte Fläche
            </p>

            <p className="mt-1 font-medium">
              {analysis.project.estimatedArea !== null
                ? `${analysis.project.estimatedArea} m²`
                : "Noch nicht bekannt"}
            </p>
          </div>

          <div className="rounded-xl bg-white/70 p-5">
            <p className="text-sm text-neutral-500">
              Nächste Aktion
            </p>

            <p className="mt-1 font-medium">
              {analysis.workflow.nextAction}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-white/70 p-5">
          <p className="text-sm font-medium text-neutral-500">
            Empfohlene nächste Schritte
          </p>

          <ul className="mt-3 space-y-2 text-neutral-800">
            {analysis.nextSteps.map((step) => (
              <li key={step}>• {step}</li>
            ))}
          </ul>
        </div>

        {analysis.missingInformation.length > 0 && (
          <div className="mt-4 rounded-xl bg-white/70 p-5">
            <p className="text-sm font-medium text-neutral-500">
              Fehlende Informationen
            </p>

            <ul className="mt-3 space-y-2 text-neutral-800">
              {analysis.missingInformation.map(
                (information) => (
                  <li key={information}>
                    • {information}
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generateOffer}
            disabled={offerStatus === "generating"}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-5 w-5" />

            {offerStatus === "generating"
              ? "Angebot wird erstellt ..."
              : "Angebotsentwurf erstellen"}
          </button>

          <button
            type="button"
            onClick={startAnalysis}
            className="rounded-xl border border-emerald-300 bg-white px-6 py-3 font-medium transition hover:bg-emerald-100"
          >
            Analyse erneut starten
          </button>
        </div>
      </section>

      {offerStatus === "error" && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-900">
            Angebotserstellung fehlgeschlagen
          </p>

          <p className="mt-1 text-sm text-red-700">
            {offerError}
          </p>

          <button
            type="button"
            onClick={generateOffer}
            className="mt-4 rounded-xl bg-red-900 px-5 py-2.5 text-sm font-medium text-white"
          >
            Erneut versuchen
          </button>
        </section>
      )}

      {offerStatus === "completed" && offer && (
        <section className="rounded-2xl border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                Entwurf
              </span>

              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                {offer.title}
              </h2>

              <p className="mt-2 text-neutral-600">
                {offer.projectSummary}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-neutral-500">
                Kunde
              </p>

              <p className="mt-1 font-medium">
                {offer.customerName}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border">
            <div
  className="grid gap-4 bg-neutral-50 px-5 py-3 text-sm font-medium text-neutral-500"
  style={{
    gridTemplateColumns: "minmax(0, 1fr) 110px 150px",
  }}
>
              <span>Leistung</span>
              <span>Menge</span>
              <span>Einheit</span>
            </div>

            {offer.positions.map((position) => (
              <div
  key={position.id}
  className="grid gap-4 border-t px-5 py-4"
  style={{
    gridTemplateColumns: "minmax(0, 1fr) 110px 150px",
  }}
>
                <div>
                  <p className="font-medium">
                    {position.description}
                  </p>

                  {position.notes && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {position.notes}
                    </p>
                  )}
                </div>

                <span className="text-neutral-700">
                  {position.quantity === 0 ? "-" : position.quantity}
                </span>

                <span className="text-neutral-700">
                  {position.unit}
                </span>
              </div>
            ))}
          </div>

          {offer.assumptions.length > 0 && (
            <div className="mt-6 rounded-xl bg-neutral-50 p-5">
              <p className="font-semibold">
                Annahmen
              </p>

              <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                {offer.assumptions.map((assumption) => (
                  <li key={assumption}>
                    • {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {offer.missingInformation.length > 0 && (
            <div className="mt-4 rounded-xl bg-sky-100 p-5">
              <p className="font-semibold text-sky-900">
                Vor Freigabe noch klären
              </p>

              <ul className="mt-3 space-y-2 text-sm text-sky-800">
                {offer.missingInformation.map(
                  (information) => (
                    <li key={information}>
                      • {information}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          <div className="mt-6 rounded-xl border p-5">
            <p className="text-sm text-neutral-500">
              Empfohlener nächster Schritt
            </p>

            <p className="mt-1 font-medium">
              {offer.recommendedNextStep}
            </p>
          </div>

          <p className="mt-5 text-sm text-neutral-500">
            Dieser Entwurf enthält bewusst noch keine Preise.
            Preise werden später aus dem betriebseigenen
            Leistungskatalog ergänzt.
          </p>
        </section>
      )}
    </div>
  );
}