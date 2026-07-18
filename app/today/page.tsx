import { DecisionOverviewList } from "@/components/today/DecisionOverviewList";
import { PriorityApprovalPlaceholder } from "@/components/today/PriorityApprovalPlaceholder";
import { TodayEmptyState } from "@/components/today/TodayEmptyState";
import { TodayHeader } from "@/components/today/TodayHeader";

export const dynamic = "force-dynamic";

const decisions = [
  {
    id: "offer-mueller",
    title: "Angebotsentwurf Müller prüfen",
    context: "Atlas hat die Anfrage zusammengefasst und einen Prüfpunkt für die Angebotsfreigabe vorbereitet.",
    meta: "Angebot · Prüfung offen",
  },
  {
    id: "visit-weber",
    title: "Besichtigung Weber einordnen",
    context: "Ein Terminvorschlag liegt bereit. Die fachliche Freigabe wird später in der Approval Card entschieden.",
    meta: "Termin · Rückmeldung heute",
  },
  {
    id: "supplier-selection",
    title: "Materialrückfrage vormerken",
    context: "Mehrere Optionen sind als Platzhalter sichtbar. Es findet noch kein Vergleich und keine Auswahl statt.",
    meta: "Material · Entscheidung vorbereitet",
  },
  {
    id: "customer-reply",
    title: "Kundenantwort prüfen",
    context: "Eine Antwort wird später als Entwurf bereitgestellt. In Phase 1 bleibt dieser Bereich nicht interaktiv.",
    meta: "Kommunikation · Entwurf folgt",
  },
  {
    id: "measurement-gap",
    title: "Fehlendes Maß kennzeichnen",
    context: "Atlas würde hier auf eine fehlende Angabe hinweisen, ohne daraus bereits belastbare Werte abzuleiten.",
    meta: "Unsicherheit · Angabe fehlt",
  },
];

const priorityDecision = {
  title: "Wichtigste Entscheidung des Tages",
  context:
    "Hier erscheint später genau eine Approval Card mit Kontext, Vorschlag, Unsicherheit und Freigabeoptionen.",
  note:
    "Phase 1 bildet nur die Layout-Grundlage ab. Es gibt noch keine echte Decision Engine, keine Backend-Daten und keine Freigabelogik.",
};

const decisionCount = decisions.length + 1;
const hasDecisions = decisionCount > 0;

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function TodayPage() {
  const todayLabel = dateFormatter.format(new Date());

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-10 sm:gap-16 sm:px-8 sm:py-14 lg:py-18">
        <TodayHeader dateLabel={todayLabel} decisionCount={decisionCount} />

        {hasDecisions ? (
          <>
            <PriorityApprovalPlaceholder {...priorityDecision} />
            <DecisionOverviewList decisions={decisions} />
          </>
        ) : (
          <TodayEmptyState isVisible />
        )}
      </div>
    </main>
  );
}
