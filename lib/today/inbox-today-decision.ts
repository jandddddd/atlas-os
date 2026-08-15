import type { AnalysisResult } from "@/components/inbox/types";
import type { TodayApprovalDecisionInput } from "@/components/today/TodayApprovalCenter";
import { createInboxAnalysisKey } from "@/lib/storage/inbox-storage";

export const inboxTodayDecisionId = "inbox-recommended-task";

const priorityByWorkflowPriority = {
  low: "low",
  normal: "medium",
  high: "high",
} as const;

function describeAnalyzedProject(analysis: AnalysisResult): string {
  const areaDescription = analysis.project.estimatedArea === null
    ? "Keine Flächenangabe ist bekannt; Maße bleiben offen."
    : `Genannte Flächenangabe laut Analyse: ${analysis.project.estimatedArea} m². Sie ist keine automatisch abgeleitete Wand- oder Deckenfläche.`;

  return `${analysis.project.trade}. ${areaDescription}`;
}

export function createInboxTodayDecision(
  analysis: AnalysisResult,
): TodayApprovalDecisionInput {
  const isOffer = analysis.recommendedTask.type === "offer";
  const missingInformation = analysis.missingInformation;

  return {
    id: inboxTodayDecisionId,
    urgency: priorityByWorkflowPriority[analysis.workflow.priority],
    economicImpact: isOffer ? "high" : "medium",
    decisionType: isOffer ? "Angebot" : "Nächster Schritt",
    title: analysis.recommendedTask.title,
    overviewTitle: analysis.recommendedTask.title,
    overviewContext: analysis.workflow.nextAction,
    overviewMeta: `${isOffer ? "Angebot" : "Vorgang"} · Prüfung offen`,
    context: [
      { label: "Kunde", value: analysis.customer.name },
      { label: "Leistung", value: analysis.project.service },
      { label: "Status", value: "menschliche Prüfung offen" },
    ],
    summary:
      "Atlas hat diesen nächsten Schritt aus der Kundenanfrage vorbereitet. Bitte prüfe, ob er als geprüft vorgemerkt werden soll.",
    reviewContext: {
      source: "Inbox · ungeprüfte KI-Analyse",
      inquiry: `${analysis.customer.name}: ${analysis.project.service}`,
      analysis: describeAnalyzedProject(analysis),
      nextStep: analysis.workflow.nextAction,
    },
    uncertainty:
      missingInformation.length > 0
        ? {
            title: "Angaben noch offen",
            description: missingInformation.join(", "),
            nextStep:
              "Bitte prüfe, ob diese Angaben vor der Freigabe benötigt werden.",
          }
        : undefined,
    consequence:
      "Mit dieser Vormerkung wird nichts versendet oder final freigegeben.",
    primaryActionLabel: "Als geprüft vormerken",
    primaryActionPendingLabel: "Wird vorgemerkt …",
    editHref: "/inbox",
    completionMessage: "Der vorbereitete nächste Schritt wurde als geprüft vorgemerkt.",
    completionAction: isOffer
      ? {
          label: "Angebotsentwurf weiterbearbeiten",
          href: "/inbox#offer-draft",
          requiresSavedOfferDraft: true,
          analysisKey: createInboxAnalysisKey(analysis),
        }
      : undefined,
    details: {
      title: "Weitere Schritte aus der Analyse",
      items: analysis.nextSteps.length > 0
        ? analysis.nextSteps
        : ["Keine weiteren Schritte aus der Analyse vorhanden."],
    },
  };
}
