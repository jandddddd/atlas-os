import type {
  AnalysisResult,
  OfferDraft,
  OfferPosition,
} from "@/components/inbox/types";

const INQUIRY_ANALYSIS_KEY = "atlas-inquiry-analysis";
const OFFER_DRAFT_KEY = "atlas-editable-offer";
const OFFER_DRAFT_BINDING_KEY = "atlas-editable-offer-analysis-binding";
const OFFER_DRAFT_BINDING_VERSION = 1;
const OFFER_WORKSPACE_KEY = "atlas-offer-workspace";
const OFFER_WORKSPACE_VERSION = 1;

export type OfferWorkspaceStatus = "review-pending" | "reviewed";
export type OfferWorkspaceStatusFilter = "all" | OfferWorkspaceStatus;

export type OfferWorkspaceEntry = {
  id: string;
  workflowId: string;
  offer: OfferDraft;
  status: OfferWorkspaceStatus;
  updatedAt: string;
};

type StoredOfferWorkspace = {
  version: typeof OFFER_WORKSPACE_VERSION;
  offers: OfferWorkspaceEntry[];
};

type StoredOfferDraftBinding = {
  version: typeof OFFER_DRAFT_BINDING_VERSION;
  workflowId: string;
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
    (value.workflowId === undefined || typeof value.workflowId === "string") &&
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

function isStoredOfferDraftBinding(value: unknown): value is StoredOfferDraftBinding {
  return (
    isRecord(value) &&
    value.version === OFFER_DRAFT_BINDING_VERSION &&
    typeof value.workflowId === "string"
  );
}

function isOfferWorkspaceStatus(value: unknown): value is OfferWorkspaceStatus {
  return value === "review-pending" || value === "reviewed";
}

function isOfferWorkspaceEntry(value: unknown): value is OfferWorkspaceEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.workflowId === "string" &&
    value.id === value.workflowId &&
    isOfferDraft(value.offer) &&
    isOfferWorkspaceStatus(value.status) &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function isStoredOfferWorkspace(value: unknown): value is StoredOfferWorkspace {
  return (
    isRecord(value) &&
    value.version === OFFER_WORKSPACE_VERSION &&
    Array.isArray(value.offers) &&
    value.offers.every(isOfferWorkspaceEntry)
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

function clearStoredValue(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
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

export function loadOfferDraftForAnalysis(
  analysis: AnalysisResult,
): OfferDraft | null {
  if (!analysis.workflowId) return null;

  const offer = loadOfferDraft();
  const binding = loadStoredValue(
    OFFER_DRAFT_BINDING_KEY,
    isStoredOfferDraftBinding,
  );
  if (!offer || !binding) return null;

  return binding.workflowId === analysis.workflowId ? offer : null;
}

export function loadOfferWorkspace(): OfferWorkspaceEntry[] {
  const storedWorkspace = loadRawStoredValue(OFFER_WORKSPACE_KEY);
  if (storedWorkspace !== null) {
    if (!isStoredOfferWorkspace(storedWorkspace)) {
      console.error(`Ungültige gespeicherte Atlas-Daten für "${OFFER_WORKSPACE_KEY}".`);
      return [];
    }

    return storedWorkspace.offers;
  }

  const savedAnalysis = loadInquiryAnalysis();
  const savedOffer = savedAnalysis
    ? loadOfferDraftForAnalysis(savedAnalysis)
    : null;
  if (!savedAnalysis?.workflowId || !savedOffer) return [];

  const migratedEntries = upsertOfferWorkspaceEntry(
    [],
    savedOffer,
    savedAnalysis.workflowId,
    new Date().toISOString(),
  );
  saveOfferWorkspace(migratedEntries);
  return migratedEntries;
}

export function findOfferWorkspaceEntry(
  entries: OfferWorkspaceEntry[],
  id: string,
): OfferWorkspaceEntry | null {
  return entries.find((entry) => entry.id === id) ?? null;
}

export function filterOfferWorkspaceEntries(
  entries: OfferWorkspaceEntry[],
  query: string,
  status: OfferWorkspaceStatusFilter,
): OfferWorkspaceEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");

  return entries.filter((entry) => {
    if (status !== "all" && entry.status !== status) return false;
    if (!normalizedQuery) return true;

    return [
      entry.offer.customerName,
      entry.offer.title,
      entry.offer.projectSummary,
    ].some((value) => value.toLocaleLowerCase("de-DE").includes(normalizedQuery));
  });
}

export function upsertOfferWorkspaceEntry(
  entries: OfferWorkspaceEntry[],
  offer: OfferDraft,
  workflowId: string,
  updatedAt: string,
): OfferWorkspaceEntry[] {
  const nextEntry: OfferWorkspaceEntry = {
    id: workflowId,
    workflowId,
    offer,
    status: "review-pending",
    updatedAt,
  };

  return [
    nextEntry,
    ...entries.filter((entry) => entry.workflowId !== workflowId),
  ];
}

function saveOfferWorkspace(entries: OfferWorkspaceEntry[]) {
  saveStoredValue(OFFER_WORKSPACE_KEY, {
    version: OFFER_WORKSPACE_VERSION,
    offers: entries,
  } satisfies StoredOfferWorkspace);
}

export function reviewOfferWorkspaceEntry(
  entries: OfferWorkspaceEntry[],
  workflowId: string,
  updatedAt: string,
): OfferWorkspaceEntry[] {
  const matchingEntry = entries.find((entry) => entry.workflowId === workflowId);
  if (!matchingEntry) return entries;

  return [
    {
      ...matchingEntry,
      status: "reviewed",
      updatedAt,
    },
    ...entries.filter((entry) => entry.workflowId !== workflowId),
  ];
}

export function markOfferWorkspaceReviewed(workflowId: string) {
  const entries = loadOfferWorkspace();
  const reviewedEntries = reviewOfferWorkspaceEntry(
    entries,
    workflowId,
    new Date().toISOString(),
  );
  if (reviewedEntries === entries) return;
  saveOfferWorkspace(reviewedEntries);
}

export function saveOfferDraft(offer: OfferDraft, analysis: AnalysisResult) {
  saveStoredValue(OFFER_DRAFT_KEY, offer);

  if (analysis.workflowId) {
    saveStoredValue(OFFER_DRAFT_BINDING_KEY, {
      version: OFFER_DRAFT_BINDING_VERSION,
      workflowId: analysis.workflowId,
    } satisfies StoredOfferDraftBinding);
    saveOfferWorkspace(
      upsertOfferWorkspaceEntry(
        loadOfferWorkspace(),
        offer,
        analysis.workflowId,
        new Date().toISOString(),
      ),
    );
  } else {
    clearStoredValue(OFFER_DRAFT_BINDING_KEY);
  }
}

export function clearOfferDraft() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(OFFER_DRAFT_KEY);
    window.localStorage.removeItem(OFFER_DRAFT_BINDING_KEY);
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
    window.localStorage.removeItem(OFFER_DRAFT_BINDING_KEY);
  } catch (error) {
    console.error("Gespeicherter Atlas-Vorgang konnte nicht gelöscht werden:", error);
  }
}
