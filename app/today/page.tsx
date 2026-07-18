import {
  TodayApprovalCenter,
  type TodayApprovalDecision,
} from "@/components/today/TodayApprovalCenter";

export const dynamic = "force-dynamic";

const decisions: TodayApprovalDecision[] = [
  {
    id: "offer-mueller",
    decisionType: "Angebot",
    title: "Angebot für Familie Müller freigeben und senden",
    overviewTitle: "Angebotsentwurf Müller prüfen",
    overviewContext:
      "Atlas hat die Anfrage zusammengefasst und einen Prüfpunkt für die Angebotsfreigabe vorbereitet.",
    overviewMeta: "Angebot · Prüfung offen",
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
    primaryActionLabel: "Angebot senden",
    editHref: "/today/tasks/offer-mueller",
    completionMessage:
      "Angebot für Familie Müller wurde freigegeben. Atlas zeigt dir direkt die nächste Entscheidung.",
    details: {
      title: "Details zum Angebotsentwurf",
      items: [
        "Grundlage ist die vorliegende Kundenanfrage; ein verbindliches Aufmaß liegt noch nicht vor.",
        "Vor dem Versand bleibt die fachliche Prüfung der Fläche beim Betrieb.",
        "Der Angebotsentwurf kann im bestehenden Angebotsflow weiter bearbeitet werden.",
      ],
    },
  },
  {
    id: "visit-weber",
    decisionType: "Termin",
    title: "Besichtigung Weber als nächsten Schritt einplanen",
    overviewTitle: "Besichtigung Weber einordnen",
    overviewContext:
      "Ein Terminvorschlag liegt bereit. Die fachliche Freigabe wird in der Approval Card entschieden.",
    overviewMeta: "Termin · Rückmeldung heute",
    context: [
      { label: "Kunde", value: "Weber" },
      { label: "Vorgang", value: "Besichtigung" },
      { label: "Status", value: "Termin prüfen" },
    ],
    summary:
      "Atlas hat die Besichtigung als nächsten sinnvollen Schritt vorbereitet. Die Terminabstimmung soll geprüft werden, bevor sie bestätigt wird.",
    recommendation:
      "Atlas empfiehlt, die Besichtigung als nächste Entscheidung zu prüfen.",
    rationale: [
      "Für eine belastbare Einschätzung fehlen noch Eindrücke vor Ort.",
      "Die Entscheidung hält den Vorgang sichtbar, ohne bereits eine Terminbestätigung zu senden.",
    ],
    uncertainty: {
      title: "Termin noch prüfen",
      description: "Die Rückmeldung zum genauen Zeitfenster ist noch nicht verbindlich bestätigt.",
      nextStep: "Bei Unsicherheit kann die Entscheidung später erneut vorgelegt werden.",
    },
    consequence:
      "Mit der Freigabe wird dieser Termin als nächster Schritt für die Abstimmung vorgemerkt.",
    primaryActionLabel: "Besichtigung vormerken",
    completionMessage:
      "Besichtigung Weber wurde vorgemerkt. Atlas rückt die nächste Entscheidung nach.",
    details: {
      title: "Details zur Besichtigung",
      items: [
        "Die Besichtigung dient der fachlichen Klärung vor einem belastbaren Angebot.",
        "Der genaue Termin bleibt vor einer externen Bestätigung zu prüfen.",
      ],
    },
  },
  {
    id: "supplier-selection",
    decisionType: "Material",
    title: "Materialrückfrage für den nächsten Einkauf vormerken",
    overviewTitle: "Materialrückfrage vormerken",
    overviewContext:
      "Mehrere Optionen sind als Platzhalter sichtbar. Es findet noch kein Vergleich und keine Auswahl statt.",
    overviewMeta: "Material · Entscheidung vorbereitet",
    context: [
      { label: "Bereich", value: "Material" },
      { label: "Vorgang", value: "Rückfrage" },
      { label: "Status", value: "offen" },
    ],
    summary:
      "Atlas hat eine Materialrückfrage als offene Entscheidung erkannt. Eine Auswahl wird noch nicht automatisch getroffen.",
    recommendation:
      "Atlas empfiehlt, die Rückfrage zunächst sichtbar zu halten und nicht ohne Prüfung auszulösen.",
    rationale: [
      "Für die Auswahl fehlen noch belastbare Vergleichsinformationen.",
      "Die Entscheidung kann nach der nächsten Prüfung erneut priorisiert werden.",
    ],
    consequence:
      "Mit der Freigabe bleibt die Materialrückfrage als geprüfter nächster Schritt vorgemerkt.",
    primaryActionLabel: "Rückfrage vormerken",
    completionMessage:
      "Materialrückfrage wurde vorgemerkt. Atlas zeigt dir die nächste offene Entscheidung.",
    details: {
      title: "Details zur Materialrückfrage",
      items: [
        "Es wird noch keine Bestellung ausgelöst.",
        "Die Entscheidung dient nur der sichtbaren Vormerkung für die spätere Klärung.",
      ],
    },
  },
  {
    id: "customer-reply",
    decisionType: "Kommunikation",
    title: "Kundenantwort als Entwurf prüfen",
    overviewTitle: "Kundenantwort prüfen",
    overviewContext:
      "Eine Antwort wird später als Entwurf bereitgestellt. In Phase 1 bleibt dieser Bereich nicht interaktiv.",
    overviewMeta: "Kommunikation · Entwurf folgt",
    context: [
      { label: "Bereich", value: "Kommunikation" },
      { label: "Vorgang", value: "Antwortentwurf" },
      { label: "Status", value: "prüfen" },
    ],
    summary:
      "Atlas hat eine Kundenantwort als prüfpflichtigen Punkt markiert. Der Entwurf soll vor einer externen Nachricht bewusst geprüft werden.",
    recommendation:
      "Atlas empfiehlt, die Antwort erst nach kurzer Prüfung freizugeben.",
    rationale: [
      "Externe Kommunikation bleibt vor dem Versand unter menschlicher Kontrolle.",
      "Der Entwurf ist sichtbar, ohne schon eine Nachricht zu senden.",
    ],
    consequence:
      "Mit der Freigabe wird der Antwortentwurf als geprüft vorgemerkt.",
    primaryActionLabel: "Antwort vormerken",
    completionMessage:
      "Kundenantwort wurde vorgemerkt. Atlas fährt mit der nächsten Entscheidung fort.",
    details: {
      title: "Details zur Kundenantwort",
      items: [
        "Die Antwort wird in dieser Version nicht extern versendet.",
        "Vor einem echten Versand bleibt eine gesonderte Freigabe erforderlich.",
      ],
    },
  },
  {
    id: "measurement-gap",
    decisionType: "Unsicherheit",
    title: "Fehlendes Maß vor der nächsten Einschätzung kennzeichnen",
    overviewTitle: "Fehlendes Maß kennzeichnen",
    overviewContext:
      "Atlas würde hier auf eine fehlende Angabe hinweisen, ohne daraus bereits belastbare Werte abzuleiten.",
    overviewMeta: "Unsicherheit · Angabe fehlt",
    context: [
      { label: "Bereich", value: "Aufmaß" },
      { label: "Vorgang", value: "fehlende Angabe" },
      { label: "Status", value: "klären" },
    ],
    summary:
      "Atlas hat erkannt, dass ein Maß fehlt. Ohne diese Angabe soll keine scheinbar genaue Einschätzung entstehen.",
    recommendation:
      "Atlas empfiehlt, die fehlende Angabe sichtbar zu kennzeichnen.",
    rationale: [
      "Fehlende Maße können Preise, Mengen und Aufwand beeinflussen.",
      "Die Kennzeichnung verhindert, dass die Raumfläche automatisch als Bearbeitungsfläche verstanden wird.",
    ],
    uncertainty: {
      title: "Angabe fehlt",
      description: "Das benötigte Maß liegt noch nicht belastbar vor.",
      nextStep: "Vor einer verbindlichen Einschätzung sollte das Maß ergänzt oder fachlich geprüft werden.",
    },
    consequence:
      "Mit der Freigabe bleibt die fehlende Angabe als Prüfpunkt sichtbar.",
    primaryActionLabel: "Prüfpunkt markieren",
    completionMessage:
      "Fehlendes Maß wurde als Prüfpunkt markiert. Für diese statische Ansicht sind keine weiteren Entscheidungen offen.",
    details: {
      title: "Details zum fehlenden Maß",
      items: [
        "Die fehlende Angabe wird nicht durch eine Annahme ersetzt.",
        "Eine fachliche Prüfung bleibt vor belastbaren Werten erforderlich.",
      ],
    },
  },
];

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
  const todayLabel = dateFormatter.format(new Date());

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-10 sm:gap-16 sm:px-8 sm:py-14 lg:py-18">
        <TodayApprovalCenter
          dateLabel={todayLabel}
          initialCompletionStatus={completionStatus}
          decisions={decisions}
        />
      </div>
    </main>
  );
}
