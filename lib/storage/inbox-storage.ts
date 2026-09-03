import type {
  AnalysisResult,
  ClarificationDraft,
  OfferDraft,
  OfferPosition,
} from "@/components/inbox/types";

const INQUIRY_ANALYSIS_KEY = "atlas-inquiry-analysis";
const OFFER_DRAFT_KEY = "atlas-editable-offer";
const OFFER_DRAFT_BINDING_KEY = "atlas-editable-offer-analysis-binding";
const OFFER_DRAFT_BINDING_VERSION = 1;
const OFFER_WORKSPACE_KEY = "atlas-offer-workspace";
const OFFER_WORKSPACE_VERSION = 1;
const CLARIFICATION_DRAFT_KEY = "atlas-clarification-draft";
const CLARIFICATION_DRAFT_BINDING_KEY = "atlas-clarification-draft-analysis-binding";
const CLARIFICATION_DRAFT_BINDING_VERSION = 1;
const INQUIRY_CONTEXT_KEY = "atlas-inquiry-context";
const INQUIRY_CONTEXT_VERSION = 1;

export type OfferWorkspaceStatus = "review-pending" | "reviewed";
export type OfferWorkspaceStatusFilter = "all" | OfferWorkspaceStatus;
export type OfferWorkspaceInformationFilter = "all" | "missing" | "complete";
export type OfferWorkspaceSort = "newest" | "oldest" | "customer";

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

export type StoredOfferDraftBinding = {
  version: typeof OFFER_DRAFT_BINDING_VERSION;
  workflowId: string;
  needsReview?: boolean;
};

type StoredClarificationDraftBinding = {
  version: typeof CLARIFICATION_DRAFT_BINDING_VERSION;
  workflowId: string;
};

export type StoredInquiryContext = {
  version: typeof INQUIRY_CONTEXT_VERSION;
  workflowId: string;
  text: string;
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

export function isInquiryAnalysis(value: unknown): value is AnalysisResult {
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

export function isOfferDraft(value: unknown): value is OfferDraft {
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

export function isStoredOfferDraftBinding(
  value: unknown,
): value is StoredOfferDraftBinding {
  return (
    isRecord(value) &&
    value.version === OFFER_DRAFT_BINDING_VERSION &&
    typeof value.workflowId === "string" &&
    (value.needsReview === undefined || typeof value.needsReview === "boolean")
  );
}

export function isClarificationDraft(value: unknown): value is ClarificationDraft {
  return (
    isRecord(value) &&
    typeof value.customerName === "string" &&
    typeof value.subject === "string" &&
    typeof value.message === "string" &&
    isStringArray(value.missingInformation) &&
    value.status === "draft"
  );
}

function isStoredClarificationDraftBinding(
  value: unknown,
): value is StoredClarificationDraftBinding {
  return (
    isRecord(value) &&
    value.version === CLARIFICATION_DRAFT_BINDING_VERSION &&
    typeof value.workflowId === "string"
  );
}

export function isStoredInquiryContext(
  value: unknown,
): value is StoredInquiryContext {
  return (
    isRecord(value) &&
    value.version === INQUIRY_CONTEXT_VERSION &&
    typeof value.workflowId === "string" &&
    typeof value.text === "string"
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

function loadClarificationDraft(): ClarificationDraft | null {
  return loadStoredValue(CLARIFICATION_DRAFT_KEY, isClarificationDraft);
}

export function loadClarificationDraftForWorkflowId(
  workflowId: string | undefined,
): ClarificationDraft | null {
  if (!workflowId) return null;

  const draft = loadClarificationDraft();
  const binding = loadStoredValue(
    CLARIFICATION_DRAFT_BINDING_KEY,
    isStoredClarificationDraftBinding,
  );
  if (!draft || !binding) return null;

  return binding.workflowId === workflowId ? draft : null;
}

export function loadClarificationDraftForAnalysis(
  analysis: AnalysisResult,
): ClarificationDraft | null {
  return loadClarificationDraftForWorkflowId(analysis.workflowId);
}

export function saveClarificationDraft(
  draft: ClarificationDraft,
  analysis: AnalysisResult,
) {
  saveStoredValue(CLARIFICATION_DRAFT_KEY, draft);

  if (analysis.workflowId) {
    saveStoredValue(CLARIFICATION_DRAFT_BINDING_KEY, {
      version: CLARIFICATION_DRAFT_BINDING_VERSION,
      workflowId: analysis.workflowId,
    } satisfies StoredClarificationDraftBinding);
  } else {
    clearStoredValue(CLARIFICATION_DRAFT_BINDING_KEY);
  }
}

export function clearClarificationDraft() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CLARIFICATION_DRAFT_KEY);
    window.localStorage.removeItem(CLARIFICATION_DRAFT_BINDING_KEY);
  } catch (error) {
    console.error(
      "Gespeicherter Atlas-Rückfrageentwurf konnte nicht gelöscht werden:",
      error,
    );
  }
}

export function loadInquiryContextForAnalysis(
  analysis: AnalysisResult,
): string | null {
  if (!analysis.workflowId) return null;

  const context = loadStoredValue(INQUIRY_CONTEXT_KEY, isStoredInquiryContext);
  if (!context) return null;

  return context.workflowId === analysis.workflowId ? context.text : null;
}

export function saveInquiryContext(text: string, analysis: AnalysisResult) {
  if (!analysis.workflowId) return;

  saveStoredValue(INQUIRY_CONTEXT_KEY, {
    version: INQUIRY_CONTEXT_VERSION,
    workflowId: analysis.workflowId,
    text,
  } satisfies StoredInquiryContext);
}

export function clearInquiryContext() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(INQUIRY_CONTEXT_KEY);
}

export function loadOfferDraftNeedsReview(analysis: AnalysisResult): boolean {
  if (!analysis.workflowId) return false;

  const binding = loadStoredValue(OFFER_DRAFT_BINDING_KEY, isStoredOfferDraftBinding);
  return binding?.workflowId === analysis.workflowId && binding.needsReview === true;
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
  information: OfferWorkspaceInformationFilter = "all",
): OfferWorkspaceEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");

  return entries.filter((entry) => {
    if (status !== "all" && entry.status !== status) return false;
    const hasMissingInformation = entry.offer.missingInformation.length > 0;
    if (information === "missing" && !hasMissingInformation) return false;
    if (information === "complete" && hasMissingInformation) return false;
    if (!normalizedQuery) return true;

    return [
      entry.offer.customerName,
      entry.offer.title,
      entry.offer.projectSummary,
    ].some((value) => value.toLocaleLowerCase("de-DE").includes(normalizedQuery));
  });
}

export function sortOfferWorkspaceEntries(
  entries: OfferWorkspaceEntry[],
  sort: OfferWorkspaceSort,
): OfferWorkspaceEntry[] {
  return [...entries].sort((left, right) => {
    if (sort === "customer") {
      return left.offer.customerName.localeCompare(
        right.offer.customerName,
        "de",
        { sensitivity: "base" },
      );
    }

    const direction = sort === "newest" ? -1 : 1;
    return direction * (Date.parse(left.updatedAt) - Date.parse(right.updatedAt));
  });
}

export function reviseOfferWorkspaceEntry(
  entries: OfferWorkspaceEntry[],
  id: string,
  offer: OfferDraft,
  updatedAt: string,
): OfferWorkspaceEntry[] {
  const matchingEntry = findOfferWorkspaceEntry(entries, id);
  if (!matchingEntry) return entries;

  return [
    {
      ...matchingEntry,
      offer,
      status: "review-pending",
      updatedAt,
    },
    ...entries.filter((entry) => entry.id !== id),
  ];
}

export function saveArchivedOfferDraft(
  id: string,
  offer: OfferDraft,
): OfferWorkspaceEntry | null {
  const activeAnalysis = loadInquiryAnalysis();
  if (activeAnalysis?.workflowId === id) {
    saveOfferDraft(offer, activeAnalysis);
    return findOfferWorkspaceEntry(loadOfferWorkspace(), id);
  }

  const entries = loadOfferWorkspace();
  const revisedEntries = reviseOfferWorkspaceEntry(
    entries,
    id,
    offer,
    new Date().toISOString(),
  );
  if (revisedEntries === entries) return null;

  saveOfferWorkspace(revisedEntries);
  return findOfferWorkspaceEntry(revisedEntries, id);
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

/**
 * True when the given offer draft binding is the one currently flagged for
 * re-review after new customer information arrived for this exact workflow.
 */
export function isOfferBindingFlaggedForReview(
  binding: StoredOfferDraftBinding | null,
  workflowId: string,
): boolean {
  return binding?.workflowId === workflowId && binding.needsReview === true;
}

/**
 * Marks the offer workflow as reviewed, unless its currently bound offer
 * draft was flagged for re-review by new customer information. In that case
 * this is a no-op: the workspace entry stays review-pending and the offer
 * content is left untouched, so a Today approval based on the outdated
 * analysis cannot silently clear the pending re-review.
 */
export function markOfferWorkspaceReviewed(workflowId: string) {
  const binding = loadStoredValue(OFFER_DRAFT_BINDING_KEY, isStoredOfferDraftBinding);
  if (isOfferBindingFlaggedForReview(binding, workflowId)) {
    return;
  }

  const entries = loadOfferWorkspace();
  const reviewedEntries = reviewOfferWorkspaceEntry(
    entries,
    workflowId,
    new Date().toISOString(),
  );
  if (reviewedEntries === entries) return;
  saveOfferWorkspace(reviewedEntries);
}

/**
 * Moves a previously reviewed offer workflow back to review-pending without
 * touching its stored offer content. Used when new customer information
 * arrives for a case that already has a reviewed offer draft.
 */
export function requestOfferWorkspaceReview(
  entries: OfferWorkspaceEntry[],
  workflowId: string,
  updatedAt: string,
): OfferWorkspaceEntry[] {
  const matchingEntry = entries.find((entry) => entry.workflowId === workflowId);
  if (!matchingEntry) return entries;

  return [
    {
      ...matchingEntry,
      status: "review-pending",
      updatedAt,
    },
    ...entries.filter((entry) => entry.workflowId !== workflowId),
  ];
}

/**
 * Flags an existing offer draft (if any) as needing re-review after new
 * customer information arrived, without changing the draft content itself.
 * A no-op when no offer draft is bound to this workflow.
 */
export function flagOfferDraftForReReview(workflowId: string) {
  const binding = loadStoredValue(OFFER_DRAFT_BINDING_KEY, isStoredOfferDraftBinding);
  if (binding && binding.workflowId === workflowId) {
    saveStoredValue(OFFER_DRAFT_BINDING_KEY, {
      ...binding,
      needsReview: true,
    } satisfies StoredOfferDraftBinding);
  }

  const entries = loadOfferWorkspace();
  const revisedEntries = requestOfferWorkspaceReview(
    entries,
    workflowId,
    new Date().toISOString(),
  );
  if (revisedEntries !== entries) {
    saveOfferWorkspace(revisedEntries);
  }
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
    window.localStorage.removeItem(CLARIFICATION_DRAFT_KEY);
    window.localStorage.removeItem(CLARIFICATION_DRAFT_BINDING_KEY);
    window.localStorage.removeItem(INQUIRY_CONTEXT_KEY);
  } catch (error) {
    console.error("Gespeicherter Atlas-Vorgang konnte nicht gelöscht werden:", error);
  }
}
