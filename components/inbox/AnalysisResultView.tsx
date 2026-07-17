import { CheckCircle2, Clock3, FileText, Sparkles } from "lucide-react";

import type { AnalysisResult, OfferStatus } from "./types";

type AnalysisResultViewProps = {
  analysis: AnalysisResult;
  offerStatus: OfferStatus;
  onGenerateOffer: () => void;
  onRestartAnalysis: () => void;
};

export function AnalysisResultView({
  analysis,
  offerStatus,
  onGenerateOffer,
  onRestartAnalysis,
}: AnalysisResultViewProps) {
  return (
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
          <p className="mt-3 text-sm text-neutral-500">Erkannte Leistung</p>
          <p className="mt-1 font-medium">{analysis.project.service}</p>
        </div>

        <div className="rounded-xl bg-white/70 p-5">
          <Clock3 className="h-5 w-5 text-neutral-700" />
          <p className="mt-3 text-sm text-neutral-500">Priorität</p>
          <p className="mt-1 font-medium">{analysis.workflow.priority}</p>
        </div>

        <div className="rounded-xl bg-white/70 p-5">
          <Sparkles className="h-5 w-5 text-neutral-700" />
          <p className="mt-3 text-sm text-neutral-500">Sicherheit</p>
          <p className="mt-1 font-medium">
            {Math.round(analysis.workflow.confidence * 100)} %
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white/70 p-5">
          <p className="text-sm text-neutral-500">Kunde</p>
          <p className="mt-1 font-medium">{analysis.customer.name}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-5">
          <p className="text-sm text-neutral-500">Gewerk</p>
          <p className="mt-1 font-medium">{analysis.project.trade}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-5">
          <p className="text-sm text-neutral-500">Geschätzte Fläche</p>
          <p className="mt-1 font-medium">
            {analysis.project.estimatedArea !== null
              ? `${analysis.project.estimatedArea} m²`
              : "Noch nicht bekannt"}
          </p>
        </div>
        <div className="rounded-xl bg-white/70 p-5">
          <p className="text-sm text-neutral-500">Nächste Aktion</p>
          <p className="mt-1 font-medium">{analysis.workflow.nextAction}</p>
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
            {analysis.missingInformation.map((information) => (
              <li key={information}>• {information}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onGenerateOffer}
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
          onClick={onRestartAnalysis}
          className="rounded-xl border border-emerald-300 bg-white px-6 py-3 font-medium transition hover:bg-emerald-100"
        >
          Analyse erneut starten
        </button>
      </div>
    </section>
  );
}
