import type { ClarificationDraft } from "@/components/inbox/types";

// customerName is free text (e.g. "Familie Müller", "Malerbetrieb Weber", an
// incomplete name) and must never be interpolated into a greeting, since
// there is no reliable way to derive a genuinely personal salutation from it.
const NEUTRAL_GREETING = "Guten Tag,";
const UNKNOWN_CUSTOMER_NAME = "Unbekannt";

export type ClarificationDraftInput = {
  customerName: string;
  service: string;
  missingInformation: string[];
};

function buildSubject(service: string): string {
  const trimmedService = service.trim();

  return trimmedService
    ? `Rückfrage zu Ihrer Anfrage: ${trimmedService}`
    : "Rückfrage zu Ihrer Anfrage";
}

function buildQuestionList(missingInformation: string[]): string {
  return missingInformation.map((information) => `- ${information}`).join("\n");
}

export function createClarificationDraft({
  customerName,
  service,
  missingInformation,
}: ClarificationDraftInput): ClarificationDraft {
  const resolvedCustomerName = customerName.trim() || UNKNOWN_CUSTOMER_NAME;
  const resolvedMissingInformation = [...missingInformation];

  const message = [
    NEUTRAL_GREETING,
    "",
    "vielen Dank für Ihre Anfrage. Damit wir Ihnen ein passendes Angebot erstellen können, benötigen wir noch folgende Angaben von Ihnen:",
    "",
    buildQuestionList(resolvedMissingInformation),
    "",
    "Über eine kurze Rückmeldung würden wir uns sehr freuen.",
    "",
    "Mit freundlichen Grüßen",
  ].join("\n");

  return {
    customerName: resolvedCustomerName,
    subject: buildSubject(service),
    message,
    missingInformation: resolvedMissingInformation,
    status: "draft",
  };
}
