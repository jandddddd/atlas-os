import { DecisionOverviewList } from "@/components/today/DecisionOverviewList";
import { ApprovalCard } from "@/components/today/ApprovalCard";
import { TodayCompletionNotice } from "@/components/today/TodayCompletionNotice";
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
  decisionType: "Angebot",
  title: "Angebot für Familie Müller freigeben und senden",
  context: [
    { label: "Kunde", value: "Familie Müller" },
    { label: "Vorgang", value: "Angebotsentwurf" },
    { label: "Status", value: "bereit zur Prüfung" },
  ],
  summary:
    "Atlas hat einen Angebotsentwurf aus der Anfrage vorbereitet. Vor dem Versand braucht der Entwurf die bewusste Freigabe durch den Betrieb.",
  recommendation:
    "Atlas empfiehlt, das Angebot nach kurzer Prüfung freizugeben und an Familie Müller zu senden.",
  rationale: [
    "Der Entwurf folgt den bekannten Kundenangaben aus der Anfrage.",
    "Die Leistung ist als Angebot vorbereitet und noch nicht verbindlich versendet.",
    "Die Freigabe hält den Vorgang im Fluss, ohne die menschliche Prüfung zu ersetzen.",
  ],
  uncertainty: {
    title: "Bitte kurz prüfen",
    description:
      "Die genaue Bearbeitungsfläche wurde in der Anfrage nicht als eigenes Aufmaß bestätigt.",
    nextStep:
      "Wenn die Fläche nicht sicher ist, kann vor dem Versand eine Rückfrage vorbereitet werden.",
  },
  consequence:
    "Mit der Freigabe wird das vorbereitete Angebot an Familie Müller gesendet.",
  primaryAction: { label: "Angebot senden", href: "/today?offerApproved=true" },
  secondaryActions: [
    { label: "Ändern", href: "/today/tasks/offer-mueller" },
    { label: "Details ansehen", href: "/today/tasks/offer-mueller" },
  ],
};

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type TodayPageProps = {
  searchParams: Promise<{
    offerApproved?: string;
    changeRequested?: string;
  }>;
};

function getCompletionStatus({
  offerApproved,
  changeRequested,
}: Awaited<TodayPageProps["searchParams"]>) {
  if (offerApproved === "true") {
    return "offer-approved" as const;
  }

  if (changeRequested === "true") {
    return "change-requested" as const;
  }

  return null;
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const params = await searchParams;
  const completionStatus = getCompletionStatus(params);
  const showPriorityDecision = completionStatus === null;
  const overviewDecisions = decisions.filter((decision) => decision.id !== "offer-mueller");
  const visibleDecisionCount = overviewDecisions.length + (showPriorityDecision ? 1 : 0);
  const hasDecisions = visibleDecisionCount > 0;
  const todayLabel = dateFormatter.format(new Date());

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-10 sm:gap-16 sm:px-8 sm:py-14 lg:py-18">
        <TodayHeader dateLabel={todayLabel} decisionCount={visibleDecisionCount} />
        <TodayCompletionNotice status={completionStatus} />

        {hasDecisions ? (
          <>
            {showPriorityDecision ? <ApprovalCard {...priorityDecision} /> : null}
            <DecisionOverviewList decisions={overviewDecisions} />
          </>
        ) : (
          <TodayEmptyState isVisible />
        )}
      </div>
    </main>
  );
}
