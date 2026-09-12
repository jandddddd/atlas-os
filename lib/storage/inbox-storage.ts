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
// Version 2 adds `revision`, a fresh identity for the currently persisted
// message text, and drops the draft-embedded communicationStatus in favor
// of a separate, revision-bound sent attestation (see
// StoredClarificationSentMarker below) — a status write must never itself
// rewrite the draft content, which a shared field would have required.
const CLARIFICATION_DRAFT_VERSION = 2;
// Legacy-only: before CLARIFICATION_DRAFT_VERSION, the draft's workflow
// identity lived in this separate key instead of inside the draft record
// itself, and it carried no revision at all. Still read for backward
// compatibility, but never trusted by any status mutation — see
// resolveClarificationDraftForWorkflowId and the legacy sent marker below.
const CLARIFICATION_DRAFT_BINDING_KEY = "atlas-clarification-draft-analysis-binding";
const CLARIFICATION_DRAFT_BINDING_VERSION = 1;
// Keyed per workflowId+revision, so a stale action bound to an old revision
// can only ever read or write its own marker, never one belonging to a
// newer revision of the same workflow.
const CLARIFICATION_SENT_MARKER_KEY_PREFIX = "atlas-clarification-sent";
const CLARIFICATION_SENT_MARKER_VERSION = 1;
// Legacy drafts have no revision to key a marker by; this marker instead
// pins the exact subject+message text it was granted for, so it can never
// be (mis)read as covering different content later saved under the same
// workflowId.
const CLARIFICATION_LEGACY_SENT_MARKER_KEY_PREFIX = "atlas-clarification-legacy-sent";
const CLARIFICATION_LEGACY_SENT_MARKER_VERSION = 1;
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
 * one the identity was originally checked against. `revision` is a fresh
 * opaque identity minted on every genuine content save; it identifies
 * exactly which persisted message text a sent attestation applies to,
 * without the status mutation ever having to rewrite this record itself.
 */
type StoredClarificationDraft = {
  version: typeof CLARIFICATION_DRAFT_VERSION;
  workflowId: string;
  revision: string;
  draft: ClarificationDraft;
};

/**
 * A human's explicit confirmation that the exact message text identified by
 * workflowId+revision was sent outside ATLAS. Stored separately from the
 * draft record itself (keyed by both fields, see
 * clarificationSentMarkerKey), so marking or unmarking "sent" never writes
 * to CLARIFICATION_DRAFT_KEY and can never race with a concurrent content
 * save the way a shared read-modify-write record would.
 */
type StoredClarificationSentMarker = {
  version: typeof CLARIFICATION_SENT_MARKER_VERSION;
  workflowId: string;
  revision: string;
};

/**
 * The legacy equivalent of StoredClarificationSentMarker for a pre-revision
 * draft: since the legacy shape has no revision, the exact subject+message
 * text stands in for one. A legacy marker only ever matches the legacy
 * draft it was granted for, and is superseded the moment that workflow
 * migrates to the canonical (revisioned) shape.
 */
type StoredClarificationLegacySentMarker = {
  version: typeof CLARIFICATION_LEGACY_SENT_MARKER_VERSION;
  workflowId: string;
  subject: string;
  message: string;
};

/**
 * An opaque handle on "the clarification draft currently visible for this
 * workflow", covering both the canonical (revisioned) and legacy shapes.
 * Callers (Inbox) hold this rather than composing storage keys themselves,
 * and pass it back unchanged to mark/unmark a sent attestation for exactly
 * the version of the draft it was obtained from.
 */
export type ClarificationDraftIdentity =
  | { kind: "canonical"; workflowId: string; revision: string }
  | { kind: "legacy"; workflowId: string; subject: string; message: string };

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

function isStoredClarificationDraft(
  value: unknown,
): value is StoredClarificationDraft {
  return (
    isRecord(value) &&
    value.version === CLARIFICATION_DRAFT_VERSION &&
    typeof value.workflowId === "string" &&
    typeof value.revision === "string" &&
    isClarificationDraft(value.draft)
  );
}

function isStoredClarificationSentMarker(
  value: unknown,
): value is StoredClarificationSentMarker {
  return (
    isRecord(value) &&
    value.version === CLARIFICATION_SENT_MARKER_VERSION &&
    typeof value.workflowId === "string" &&
    typeof value.revision === "string"
  );
}

function isStoredClarificationLegacySentMarker(
  value: unknown,
): value is StoredClarificationLegacySentMarker {
  return (
    isRecord(value) &&
    value.version === CLARIFICATION_LEGACY_SENT_MARKER_VERSION &&
    typeof value.workflowId === "string" &&
    typeof value.subject === "string" &&
    typeof value.message === "string"
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

function clarificationSentMarkerKey(workflowId: string, revision: string): string {
  return `${CLARIFICATION_SENT_MARKER_KEY_PREFIX}:${workflowId}:${revision}`;
}

function clarificationLegacySentMarkerKey(workflowId: string): string {
  return `${CLARIFICATION_LEGACY_SENT_MARKER_KEY_PREFIX}:${workflowId}`;
}

type ResolvedClarificationDraft =
  | { kind: "canonical"; workflowId: string; revision: string; draft: ClarificationDraft }
  | { kind: "legacy"; workflowId: string; draft: ClarificationDraft };

/**
 * The single place that decides which stored shape (canonical or legacy) is
 * currently authoritative for a workflow, for read purposes. Never used by
 * a status mutation on its own — see the mark/unmark functions below, which
 * re-validate their own expected identity independently.
 */
function resolveClarificationDraftForWorkflowId(
  workflowId: string,
): ResolvedClarificationDraft | null {
  const storedDraft = loadStoredClarificationDraft();
  if (storedDraft) {
    return storedDraft.workflowId === workflowId
      ? { kind: "canonical", workflowId, revision: storedDraft.revision, draft: storedDraft.draft }
      : null;
  }

  const legacyDraft = loadLegacyClarificationDraft();
  const legacyBinding = loadStoredValue(
    CLARIFICATION_DRAFT_BINDING_KEY,
    isStoredClarificationDraftBinding,
  );
  if (!legacyDraft || !legacyBinding || legacyBinding.workflowId !== workflowId) return null;

  return { kind: "legacy", workflowId, draft: legacyDraft };
}

/**
 * Read-only lookup, safe for display purposes (Inbox restore, Today).
 * Prefers the canonical record, where workflow identity and draft content
 * come from the exact same atomic read. Falls back to the legacy split
 * shape (a raw draft plus a separately keyed binding) for backward
 * compatibility only.
 */
export function loadClarificationDraftForWorkflowId(
  workflowId: string | undefined,
): ClarificationDraft | null {
  if (!workflowId) return null;
  return resolveClarificationDraftForWorkflowId(workflowId)?.draft ?? null;
}

export function loadClarificationDraftForAnalysis(
  analysis: AnalysisResult,
): ClarificationDraft | null {
  return loadClarificationDraftForWorkflowId(analysis.workflowId);
}

/**
 * The opaque identity of the clarification draft currently visible for a
 * workflow (canonical revision or legacy content snapshot), or null if none
 * exists. Callers hold this alongside the draft they loaded it with and
 * pass it back to mark/unmark a sent attestation for exactly that version —
 * never composing a storage key themselves.
 */
export function loadClarificationDraftIdentityForWorkflowId(
  workflowId: string | undefined,
): ClarificationDraftIdentity | null {
  if (!workflowId) return null;

  const resolved = resolveClarificationDraftForWorkflowId(workflowId);
  if (!resolved) return null;

  return resolved.kind === "canonical"
    ? { kind: "canonical", workflowId: resolved.workflowId, revision: resolved.revision }
    : {
        kind: "legacy",
        workflowId: resolved.workflowId,
        subject: resolved.draft.subject,
        message: resolved.draft.message,
      };
}

/**
 * Read-only convenience for callers (Today) that only need the normalized
 * communication status, never the draft's message content, and must never
 * mutate it. The canonical record is "sent" only while a marker exists for
 * its exact current revision; a legacy record is "sent" only while a legacy
 * marker exists whose pinned subject+message still matches it exactly.
 */
export function loadClarificationCommunicationStatusForWorkflowId(
  workflowId: string | undefined,
): ClarificationCommunicationStatus | null {
  if (!workflowId) return null;

  const resolved = resolveClarificationDraftForWorkflowId(workflowId);
  if (!resolved) return null;

  if (resolved.kind === "canonical") {
    const marker = loadStoredValue(
      clarificationSentMarkerKey(resolved.workflowId, resolved.revision),
      isStoredClarificationSentMarker,
    );
    const isSent =
      marker !== null &&
      marker.workflowId === resolved.workflowId &&
      marker.revision === resolved.revision;
    return isSent ? "sent" : "prepared";
  }

  const legacyMarker = loadStoredValue(
    clarificationLegacySentMarkerKey(resolved.workflowId),
    isStoredClarificationLegacySentMarker,
  );
  const isLegacySent =
    legacyMarker !== null &&
    legacyMarker.workflowId === resolved.workflowId &&
    legacyMarker.subject === resolved.draft.subject &&
    legacyMarker.message === resolved.draft.message;
  return isLegacySent ? "sent" : "prepared";
}

/**
 * Persists the draft as the canonical record under a fresh revision,
 * migrating away from the legacy split shape the moment this succeeds. A
 * status mutation never calls this — only a genuine, caller-authored save
 * (a new draft, or a real content edit) mints a new revision. Returns the
 * resulting identity only once the write has actually been confirmed
 * persisted; on failure, returns a null identity and leaves any existing
 * legacy binding fully intact, since a failed migration must never strand
 * the still-valid legacy draft without the identity it needs to remain
 * readable and actionable. When the analysis has no workflowId, keeps the
 * existing plain, unbound draft shape instead of inventing an identity.
 */
export function saveClarificationDraft(
  draft: ClarificationDraft,
  analysis: AnalysisResult,
): { didSave: boolean; identity: ClarificationDraftIdentity | null } {
  if (!analysis.workflowId) {
    return { didSave: saveStoredValue(CLARIFICATION_DRAFT_KEY, draft), identity: null };
  }

  const workflowId = analysis.workflowId;
  const revision = crypto.randomUUID();
  const didSave = saveStoredValue(CLARIFICATION_DRAFT_KEY, {
    version: CLARIFICATION_DRAFT_VERSION,
    workflowId,
    revision,
    draft,
  } satisfies StoredClarificationDraft);

  if (!didSave) return { didSave: false, identity: null };

  // Only remove the legacy binding once the new canonical record is
  // confirmed persisted.
  clearStoredValue(CLARIFICATION_DRAFT_BINDING_KEY);
  return { didSave: true, identity: { kind: "canonical", workflowId, revision } };
}

/**
 * Grants a sent attestation for exactly the canonical revision identified.
 * Reads the current canonical record, requires its workflowId and revision
 * to match exactly, writes only the separate marker record (never the draft
 * itself), and re-reads the canonical record once more afterward to confirm
 * a newer revision was not persisted in the meantime. Returns false — no
 * marker considered valid — if the identity does not match before or after
 * the write, or if the write itself failed.
 */
function markClarificationSentForRevision(
  workflowId: string,
  revision: string,
): boolean {
  const matchesRevision = () => {
    const current = loadStoredClarificationDraft();
    return current !== null && current.workflowId === workflowId && current.revision === revision;
  };

  if (!matchesRevision()) return false;

  const didSave = saveStoredValue(clarificationSentMarkerKey(workflowId, revision), {
    version: CLARIFICATION_SENT_MARKER_VERSION,
    workflowId,
    revision,
  } satisfies StoredClarificationSentMarker);
  if (!didSave) return false;

  return matchesRevision();
}

/**
 * Removes the sent attestation for exactly the canonical revision
 * identified. The key itself already scopes the removal to that exact
 * workflowId+revision, so a stale caller can never remove a marker
 * belonging to a newer revision; the current-record check only prevents
 * reporting false success once the visible revision itself is stale.
 */
function unmarkClarificationSentForRevision(
  workflowId: string,
  revision: string,
): boolean {
  const current = loadStoredClarificationDraft();
  if (!current || current.workflowId !== workflowId || current.revision !== revision) {
    return false;
  }

  clearStoredValue(clarificationSentMarkerKey(workflowId, revision));
  return true;
}

function matchesExpectedLegacyState(
  workflowId: string,
  subject: string,
  message: string,
): boolean {
  // A canonical record now existing means this workflow has already moved
  // on from the legacy shape; a legacy action must never act on stale data.
  if (loadStoredClarificationDraft()) return false;

  const legacyDraft = loadLegacyClarificationDraft();
  const legacyBinding = loadStoredValue(
    CLARIFICATION_DRAFT_BINDING_KEY,
    isStoredClarificationDraftBinding,
  );
  return (
    legacyDraft !== null &&
    legacyBinding !== null &&
    legacyBinding.workflowId === workflowId &&
    legacyDraft.subject === subject &&
    legacyDraft.message === message
  );
}

/**
 * Grants a sent attestation for a legacy draft, without migrating it and
 * without touching the raw draft or its binding. Requires the exact visible
 * subject+message to still match before and after the write, so a legacy
 * marker can never be (mis)applied to content that has since changed.
 */
function markClarificationSentForLegacy(
  workflowId: string,
  subject: string,
  message: string,
): boolean {
  if (!matchesExpectedLegacyState(workflowId, subject, message)) return false;

  const didSave = saveStoredValue(clarificationLegacySentMarkerKey(workflowId), {
    version: CLARIFICATION_LEGACY_SENT_MARKER_VERSION,
    workflowId,
    subject,
    message,
  } satisfies StoredClarificationLegacySentMarker);
  if (!didSave) return false;

  return matchesExpectedLegacyState(workflowId, subject, message);
}

function unmarkClarificationSentForLegacy(
  workflowId: string,
  subject: string,
  message: string,
): boolean {
  if (!matchesExpectedLegacyState(workflowId, subject, message)) return false;

  clearStoredValue(clarificationLegacySentMarkerKey(workflowId));
  return true;
}

/**
 * Grants a sent attestation for exactly the draft identity given — the only
 * way a "sent" marking may ever be created. Never writes CLARIFICATION_DRAFT_KEY.
 */
export function markClarificationSentForIdentity(
  identity: ClarificationDraftIdentity,
): boolean {
  return identity.kind === "canonical"
    ? markClarificationSentForRevision(identity.workflowId, identity.revision)
    : markClarificationSentForLegacy(identity.workflowId, identity.subject, identity.message);
}

/** Corrects an ATLAS-side sent marking for exactly the identity given. */
export function unmarkClarificationSentForIdentity(
  identity: ClarificationDraftIdentity,
): boolean {
  return identity.kind === "canonical"
    ? unmarkClarificationSentForRevision(identity.workflowId, identity.revision)
    : unmarkClarificationSentForLegacy(identity.workflowId, identity.subject, identity.message);
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
