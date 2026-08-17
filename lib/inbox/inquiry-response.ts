import type { AnalysisResult, OfferDraft } from "@/components/inbox/types";
import { isInquiryAnalysis, isOfferDraft } from "../storage/inbox-storage.ts";

export function parseAnalysisResponse(rawText: string): AnalysisResult {
  const cleanedText = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "");

  const analysis: unknown = JSON.parse(cleanedText);

  if (!isInquiryAnalysis(analysis)) {
    throw new Error("Claude hat keine gültige Analyse geliefert.");
  }

  return analysis;
}

export function parseOfferResponse(rawText: string): OfferDraft {
  const offer: unknown = JSON.parse(rawText);

  if (!isOfferDraft(offer)) {
    throw new Error("Claude hat keinen gültigen Angebotsentwurf geliefert.");
  }

  return offer;
}
