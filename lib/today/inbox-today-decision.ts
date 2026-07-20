import type { AnalysisResult } from "@/components/inbox/types";
import type { TodayApprovalDecisionInput } from "@/components/today/TodayApprovalCenter";

export const inboxTodayDecisionId = "inbox-recommended-task";

const priorityByWorkflowPriority = {
  low: "low",
  normal: "medium",
  high: "high",
} as const;

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
      { label: "Status", value: "aus der Inbox vorbereitet" },
    ],
    summary:
      "Atlas hat diesen nächsten Schritt aus der Kundenanfrage vorbereitet. Bitte prüfe ihn, bevor du ihn freigibst.",
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
      "Mit der Freigabe wird der vorbereitete nächste Schritt als geprüft vorgemerkt.",
    primaryActionLabel: "Schritt freigeben",
    completionMessage: "Der vorbereitete nächste Schritt wurde freigegeben.",
    details: {
      title: "Grundlage aus der Inbox",
      items: [
        `Empfohlener Schritt: ${analysis.workflow.nextAction}`,
        ...analysis.nextSteps,
      ],
    },
  };
}
