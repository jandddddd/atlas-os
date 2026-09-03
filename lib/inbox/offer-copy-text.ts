import type { OfferDraft, OfferPosition } from "@/components/inbox/types";

function formatPosition(position: OfferPosition): string {
  const lines = [
    `- ${position.description} — Menge: ${position.quantity} ${position.unit}`,
  ];

  if (position.notes.trim()) {
    lines.push(`  Hinweis: ${position.notes.trim()}`);
  }

  return lines.join("\n");
}

/**
 * Formats only the already human-reviewed OfferDraft fields meant for the
 * customer. Deliberately excludes internal fields (recommendedNextStep,
 * missingInformation, status) and never adds prices, quantities or facts
 * beyond what the draft already contains.
 */
export function formatOfferDraftForCopy(offer: OfferDraft): string {
  const sections = [
    offer.title,
    "",
    `Kunde: ${offer.customerName}`,
    "",
    offer.projectSummary,
  ];

  if (offer.positions.length > 0) {
    sections.push(
      "",
      "Leistungen:",
      offer.positions.map(formatPosition).join("\n"),
    );
  }

  if (offer.assumptions.length > 0) {
    sections.push(
      "",
      "Annahmen:",
      offer.assumptions.map((assumption) => `- ${assumption}`).join("\n"),
    );
  }

  return sections.join("\n");
}
