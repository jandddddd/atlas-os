import type {
  AnalysisResult,
  OfferDraft,
  OfferPosition,
} from "@/components/inbox/types";

const INQUIRY_ANALYSIS_KEY = "atlas-inquiry-analysis";
const OFFER_DRAFT_KEY = "atlas-editable-offer";
const OFFER_DRAFT_STORAGE_VERSION = 2;

type StoredOfferDraft = {
  version: typeof OFFER_DRAFT_STORAGE_VERSION;
  analysisKey: string;
  offer: OfferDraft;
};

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

function isStoredOfferDraft(value: unknown): value is StoredOfferDraft {
  return (
    isRecord(value) &&
    value.version === OFFER_DRAFT_STORAGE_VERSION &&
    typeof value.analysisKey === "string" &&
    isOfferDraft(value.offer)
  );
}

function loadRawStoredValue(key: string): unknown | null {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) return null;
    return JSON.parse(storedValue) as unknown;
  } catch (error) {
    console.error(`Atlas-Daten für "${key}" konnten nicht geladen werden:`, error);
    return null;
  }
}

function loadStoredValue<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | null {
  const parsedValue = loadRawStoredValue(key);
  if (parsedValue === null) return null;

  if (!isValid(parsedValue)) {
    console.error(`Ungültige gespeicherte Atlas-Daten für "${key}".`);
    return null;
  }

  return parsedValue;
}

function saveStoredValue(key: string, value: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Atlas-Daten für "${key}" konnten nicht gespeichert werden:`, error);
  }
}

export function createInboxAnalysisKey(analysis: AnalysisResult): string {
  return JSON.stringify({
    version: 1,
    customer: analysis.customer,
    project: analysis.project,
    workflow: analysis.workflow,
    nextSteps: analysis.nextSteps,
    missingInformation: analysis.missingInformation,
    recommendedTask: analysis.recommendedTask,
  });
}

export function loadInquiryAnalysis(): AnalysisResult | null {
  return loadStoredValue(INQUIRY_ANALYSIS_KEY, isInquiryAnalysis);
}

export function saveInquiryAnalysis(analysis: AnalysisResult) {
  saveStoredValue(INQUIRY_ANALYSIS_KEY, analysis);
}

export function loadOfferDraft(): OfferDraft | null {
  const storedValue = loadRawStoredValue(OFFER_DRAFT_KEY);
  if (storedValue === null) return null;

  if (isStoredOfferDraft(storedValue)) return storedValue.offer;
  if (isOfferDraft(storedValue)) return storedValue;

  console.error(`Ungültige gespeicherte Atlas-Daten für "${OFFER_DRAFT_KEY}".`);
  return null;
}

export function loadOfferDraftForAnalysis(
  analysis: AnalysisResult,
): OfferDraft | null {
  const storedValue = loadRawStoredValue(OFFER_DRAFT_KEY);
  if (!isStoredOfferDraft(storedValue)) return null;

  return storedValue.analysisKey === createInboxAnalysisKey(analysis)
    ? storedValue.offer
    : null;
}

export function saveOfferDraft(offer: OfferDraft, analysis: AnalysisResult) {
  saveStoredValue(OFFER_DRAFT_KEY, {
    version: OFFER_DRAFT_STORAGE_VERSION,
    analysisKey: createInboxAnalysisKey(analysis),
    offer,
  } satisfies StoredOfferDraft);
}

export function clearOfferDraft() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(OFFER_DRAFT_KEY);
  } catch (error) {
    console.error(
      "Gespeicherter Atlas-Angebotsentwurf konnte nicht gelöscht werden:",
      error,
    );
  }
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
