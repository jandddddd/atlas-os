import { cookies } from "next/headers";
import type { AnalysisResult } from "@/components/inbox/types";
import {
  canStoreInboxTodayDecision,
  inboxTodayDecisionCookieName,
  inboxTodayDecisionCookieOptions,
} from "@/lib/today/inbox-today-decision-cookie";

export { inboxTodayDecisionCookieName };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

export function isAnalysisResult(value: unknown): value is AnalysisResult {
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

export async function readInboxTodayDecision(): Promise<AnalysisResult | null> {
  const value = (await cookies()).get(inboxTodayDecisionCookieName)?.value;
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    return isAnalysisResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeInboxTodayDecision(
  analysis: AnalysisResult,
): Promise<boolean> {
  if (!canStoreInboxTodayDecision(analysis)) {
    return false;
  }

  (await cookies()).set(
    inboxTodayDecisionCookieName,
    JSON.stringify(analysis),
    inboxTodayDecisionCookieOptions,
  );

  return true;
}

export async function clearInboxTodayDecision(): Promise<void> {
  (await cookies()).delete(inboxTodayDecisionCookieName);
}
