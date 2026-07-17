import type {
  AnalysisResult,
  OfferDraft,
  OfferPosition,
} from "@/components/inbox/types";

const INQUIRY_ANALYSIS_KEY = "atlas-inquiry-analysis";
const OFFER_DRAFT_KEY = "atlas-editable-offer";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOfferPosition(value: unknown): value is OfferPosition {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.description === "string" &&
    typeof value.quantity === "number" &&
    typeof value.unit === "string" &&
    typeof value.notes === "string"
  );
}

function isInquiryAnalysis(value: unknown): value is AnalysisResult {
  if (!isRecord(value)) return false;

  const { customer, project, workflow, recommendedTask } = value;

  return (
    isRecord(customer) &&
    typeof customer.name === "string" &&
    isRecord(project) &&
    typeof project.trade === "string" &&
    typeof project.service === "string" &&
    (typeof project.estimatedArea === "number" ||
      project.estimatedArea === null) &&
    isRecord(workflow) &&
    (workflow.priority === "low" ||
      workflow.priority === "normal" ||
      workflow.priority === "high") &&
    typeof workflow.confidence === "number" &&
    typeof workflow.nextAction === "string" &&
    isStringArray(value.nextSteps) &&
    isStringArray(value.missingInformation) &&
    isRecord(recommendedTask) &&
    (recommendedTask.type === "offer" ||
      recommendedTask.type === "visit" ||
      recommendedTask.type === "supplier") &&
    typeof recommendedTask.title === "string"
  );
}

function isOfferDraft(value: unknown): value is OfferDraft {
  return (
    isRecord(value) &&
    typeof value.customerName === "string" &&
    typeof value.title === "string" &&
    typeof value.projectSummary === "string" &&
    Array.isArray(value.positions) &&
    value.positions.every(isOfferPosition) &&
    isStringArray(value.assumptions) &&
    isStringArray(value.missingInformation) &&
    typeof value.recommendedNextStep === "string" &&
    value.status === "draft"
  );
}

function loadStoredValue<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | null {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) return null;

    const parsedValue: unknown = JSON.parse(storedValue);
    if (!isValid(parsedValue)) {
      console.error(`Ungültige gespeicherte Atlas-Daten für "${key}".`);
      return null;
    }

    return parsedValue;
  } catch (error) {
    console.error(`Atlas-Daten für "${key}" konnten nicht geladen werden:`, error);
    return null;
  }
}

function saveStoredValue(key: string, value: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Atlas-Daten für "${key}" konnten nicht gespeichert werden:`, error);
  }
}

export function loadInquiryAnalysis(): AnalysisResult | null {
  return loadStoredValue(INQUIRY_ANALYSIS_KEY, isInquiryAnalysis);
}

export function saveInquiryAnalysis(analysis: AnalysisResult) {
  saveStoredValue(INQUIRY_ANALYSIS_KEY, analysis);
}

export function loadOfferDraft(): OfferDraft | null {
  return loadStoredValue(OFFER_DRAFT_KEY, isOfferDraft);
}

export function saveOfferDraft(offer: OfferDraft) {
  saveStoredValue(OFFER_DRAFT_KEY, offer);
}

export function clearInboxWorkflow() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(INQUIRY_ANALYSIS_KEY);
    window.localStorage.removeItem(OFFER_DRAFT_KEY);
  } catch (error) {
    console.error("Gespeicherter Atlas-Vorgang konnte nicht gelöscht werden:", error);
  }
}
