import {
  findOfferWorkspaceEntry,
  loadOfferWorkspace,
  type OfferWorkspaceEntry,
} from "../storage/inbox-storage.ts";

const PROJECT_WORKSPACE_KEY = "atlas-project-workspace";
const PROJECT_WORKSPACE_VERSION = 1;

export type ProjectWorkspaceEntry = {
  id: string;
  sourceOfferWorkflowId: string;
  customerName: string;
  title: string;
  summary: string;
  openPoints: string[];
  status: "preparation";
  createdAt: string;
  updatedAt: string;
};

type StoredProjectWorkspace = {
  version: typeof PROJECT_WORKSPACE_VERSION;
  projects: ProjectWorkspaceEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isProjectWorkspaceEntry(value: unknown): value is ProjectWorkspaceEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.sourceOfferWorkflowId === "string" &&
    value.id === value.sourceOfferWorkflowId &&
    typeof value.customerName === "string" &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    isStringArray(value.openPoints) &&
    value.status === "preparation" &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function isStoredProjectWorkspace(value: unknown): value is StoredProjectWorkspace {
  return (
    isRecord(value) &&
    value.version === PROJECT_WORKSPACE_VERSION &&
    Array.isArray(value.projects) &&
    value.projects.every(isProjectWorkspaceEntry)
  );
}

export function findProjectBySourceOffer(
  projects: ProjectWorkspaceEntry[],
  sourceOfferWorkflowId: string,
): ProjectWorkspaceEntry | null {
  return projects.find(
    (project) => project.sourceOfferWorkflowId === sourceOfferWorkflowId,
  ) ?? null;
}

export function prepareProjectFromReviewedOffer(
  projects: ProjectWorkspaceEntry[],
  offerEntry: OfferWorkspaceEntry,
  preparedAt: string,
): ProjectWorkspaceEntry[] {
  if (offerEntry.status !== "reviewed") return projects;
  if (findProjectBySourceOffer(projects, offerEntry.workflowId)) return projects;

  const project: ProjectWorkspaceEntry = {
    id: offerEntry.workflowId,
    sourceOfferWorkflowId: offerEntry.workflowId,
    customerName: offerEntry.offer.customerName,
    title: offerEntry.offer.title,
    summary: offerEntry.offer.projectSummary,
    openPoints: [...offerEntry.offer.missingInformation],
    status: "preparation",
    createdAt: preparedAt,
    updatedAt: preparedAt,
  };

  return [project, ...projects];
}

export function loadProjectWorkspace(): ProjectWorkspaceEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const storedValue = window.localStorage.getItem(PROJECT_WORKSPACE_KEY);
    if (!storedValue) return [];

    const parsedValue: unknown = JSON.parse(storedValue);
    if (!isStoredProjectWorkspace(parsedValue)) {
      console.error(`Ungültige gespeicherte Atlas-Daten für "${PROJECT_WORKSPACE_KEY}".`);
      return [];
    }

    return parsedValue.projects;
  } catch (error) {
    console.error(
      `Atlas-Daten für "${PROJECT_WORKSPACE_KEY}" konnten nicht geladen werden:`,
      error,
    );
    return [];
  }
}

function saveProjectWorkspace(projects: ProjectWorkspaceEntry[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      PROJECT_WORKSPACE_KEY,
      JSON.stringify({
        version: PROJECT_WORKSPACE_VERSION,
        projects,
      } satisfies StoredProjectWorkspace),
    );
  } catch (error) {
    console.error(
      `Atlas-Daten für "${PROJECT_WORKSPACE_KEY}" konnten nicht gespeichert werden:`,
      error,
    );
  }
}

export function createProjectDraftFromOffer(
  offerEntry: OfferWorkspaceEntry,
): ProjectWorkspaceEntry | null {
  const currentOfferEntry = findOfferWorkspaceEntry(
    loadOfferWorkspace(),
    offerEntry.workflowId,
  );
  if (!currentOfferEntry || currentOfferEntry.status !== "reviewed") return null;

  const projects = loadProjectWorkspace();
  const preparedProjects = prepareProjectFromReviewedOffer(
    projects,
    currentOfferEntry,
    new Date().toISOString(),
  );

  if (preparedProjects === projects) {
    return findProjectBySourceOffer(projects, currentOfferEntry.workflowId);
  }

  saveProjectWorkspace(preparedProjects);
  return preparedProjects[0];
}
