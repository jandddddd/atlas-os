import type {
  AnalysisResult,
  ClarificationCommunicationStatus,
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
const CLARIFICATION_DRAFT_VERSION = 1;
// Legacy-only: before CLARIFICATION_DRAFT_VERSION, the draft's workflow
// identity lived in this separate key instead of inside the draft record
// itself. Still read for backward compatibility, but a workflow-bound
// status mutation never trusts this split shape — see
// setClarificationCommunicationStatusForWorkflowId.
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

/**
 * The canonical clarification record: workflow identity and draft content
 * live together in one record under CLARIFICATION_DRAFT_KEY, so a caller
 * reading it back always gets both from the exact same atomic read — no
 * separate identity lookup that could observe a different draft than the
 * one the identity was originally checked against.
 */
type StoredClarificationDraft = {
  version: typeof CLARIFICATION_DRAFT_VERSION;
  workflowId: string;
  draft: ClarificationDraft;
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
    value.status === "draft" &&
    (value.communicationStatus === undefined ||
      value.communicationStatus === "prepared" ||
      value.communicationStatus === "sent")
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

function isStoredClarificationDraft(
  value: unknown,
): value is StoredClarificationDraft {
  return (
    isRecord(value) &&
    value.version === CLARIFICATION_DRAFT_VERSION &&
    typeof value.workflowId === "string" &&
    isClarificationDraft(value.draft)
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

/**
 * Returns whether the write actually succeeded, so a caller that must not
 * report success on a failed persist (e.g. a workflow-bound status mutation)
 * can tell the difference from a silent no-op. Existing callers that already
 * treated a write as fire-and-forget may keep ignoring the return value.
 */
function saveStoredValue(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Atlas-Daten für "${key}" konnten nicht gespeichert werden:`, error);
    return false;
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

/** Legacy-shape-only: a raw draft with no workflow identity of its own. */
function loadLegacyClarificationDraft(): ClarificationDraft | null {
  return loadStoredValue(CLARIFICATION_DRAFT_KEY, isClarificationDraft);
}

function loadStoredClarificationDraft(): StoredClarificationDraft | null {
  return loadStoredValue(CLARIFICATION_DRAFT_KEY, isStoredClarificationDraft);
}

/**
 * The single normalization point for a draft's communication status. A
 * missing field (legacy drafts persisted before this field existed) always
 * means "prepared", never "sent" — a draft can only ever become "sent"
 * through an explicit human action that writes the field.
 */
export function getClarificationCommunicationStatus(
  draft: ClarificationDraft,
): ClarificationCommunicationStatus {
  return draft.communicationStatus === "sent" ? "sent" : "prepared";
}

/**
 * Read-only lookup, safe for display purposes (Inbox restore, Today).
 * Prefers the canonical record, where workflow identity and draft content
 * come from the exact same atomic read. Falls back to the legacy split
 * shape (a raw draft plus a separately keyed binding) for backward
 * compatibility only; this fallback is intentionally never used by the
 * workflow-bound status mutation below, since combining two separate reads
 * is exactly the unsafe pattern that mutation must not repeat.
 */
export function loadClarificationDraftForWorkflowId(
  workflowId: string | undefined,
): ClarificationDraft | null {
  if (!workflowId) return null;

  const storedDraft = loadStoredClarificationDraft();
  if (storedDraft) {
    return storedDraft.workflowId === workflowId ? storedDraft.draft : null;
  }

  const legacyDraft = loadLegacyClarificationDraft();
  const legacyBinding = loadStoredValue(
    CLARIFICATION_DRAFT_BINDING_KEY,
    isStoredClarificationDraftBinding,
  );
  if (!legacyDraft || !legacyBinding) return null;

  return legacyBinding.workflowId === workflowId ? legacyDraft : null;
}

export function loadClarificationDraftForAnalysis(
  analysis: AnalysisResult,
): ClarificationDraft | null {
  return loadClarificationDraftForWorkflowId(analysis.workflowId);
}

/**
 * Read-only convenience for callers (Today) that only need the normalized
 * communication status, never the draft's message content, and must never
 * mutate it.
 */
export function loadClarificationCommunicationStatusForWorkflowId(
  workflowId: string | undefined,
): ClarificationCommunicationStatus | null {
  const draft = loadClarificationDraftForWorkflowId(workflowId);
  return draft ? getClarificationCommunicationStatus(draft) : null;
}

/**
 * Persists the draft as the canonical record (workflow identity and content
 * together in one write), migrating away from the legacy split shape the
 * moment this succeeds. Returns whether the write actually happened, so a
 * caller that must not claim a successful save on a failed write (e.g.
 * after a real content edit) can tell the difference. Existing callers that
 * already treated this as fire-and-forget may keep ignoring the return
 * value. When the analysis has no workflowId, keeps the existing plain,
 * unbound draft shape instead of inventing an identity-less envelope.
 */
export function saveClarificationDraft(
  draft: ClarificationDraft,
  analysis: AnalysisResult,
): boolean {
  const didSave = analysis.workflowId
    ? saveStoredValue(CLARIFICATION_DRAFT_KEY, {
        version: CLARIFICATION_DRAFT_VERSION,
        workflowId: analysis.workflowId,
        draft,
      } satisfies StoredClarificationDraft)
    : saveStoredValue(CLARIFICATION_DRAFT_KEY, draft);

  // A successful save always leaves the canonical (or, without a workflowId,
  // the plain unbound) shape behind, so no leftover legacy binding can ever
  // again be paired with a draft that has already moved on.
  clearStoredValue(CLARIFICATION_DRAFT_BINDING_KEY);
  return didSave;
}

/**
 * Sets only the communication status of the currently persisted clarification
 * draft. Reads and writes the canonical record as a single atomic unit —
 * workflow identity and draft content always come from and go back to the
 * exact same record — so there is no window in which another tab's write
 * could replace the draft between an identity check and a content mutation.
 * Returns the updated draft only once the write has actually been confirmed
 * persisted, or null if there is no canonical record, its workflowId does
 * not match, or the write itself failed. A record still in the legacy split
 * shape is deliberately never accepted here: it cannot be identified and
 * mutated in one atomic step, so fail-closed is the correct behavior rather
 * than combining two separate reads to guess at it.
 */
export function setClarificationCommunicationStatusForWorkflowId(
  workflowId: string,
  communicationStatus: ClarificationCommunicationStatus,
): ClarificationDraft | null {
  const storedDraft = loadStoredClarificationDraft();
  if (!storedDraft || storedDraft.workflowId !== workflowId) return null;

  const nextDraft: ClarificationDraft = { ...storedDraft.draft, communicationStatus };
  const didSave = saveStoredValue(CLARIFICATION_DRAFT_KEY, {
    version: CLARIFICATION_DRAFT_VERSION,
    workflowId,
    draft: nextDraft,
  } satisfies StoredClarificationDraft);
  return didSave ? nextDraft : null;
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
