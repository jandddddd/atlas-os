import type { AnalysisResult } from "@/components/inbox/types";
import { inboxTodayDecisionId } from "./inbox-today-decision.ts";
import {
  clearTodayDecisionStateForDecision,
  type TodayDecisionState,
} from "./today-decision-state.ts";

type InboxTodayDecisionReplacementDependencies = {
  readInboxDecision: () => Promise<AnalysisResult | null>;
  writeInboxDecision: (analysis: AnalysisResult) => Promise<boolean>;
  clearInboxDecision: () => Promise<void>;
  readTodayState: () => Promise<TodayDecisionState>;
  writeTodayState: (state: TodayDecisionState) => Promise<void>;
};

async function restoreInboxDecision(
  previousInboxDecision: AnalysisResult | null,
  dependencies: InboxTodayDecisionReplacementDependencies,
): Promise<void> {
  if (previousInboxDecision === null) {
    await dependencies.clearInboxDecision();
    return;
  }

  if (!(await dependencies.writeInboxDecision(previousInboxDecision))) {
    throw new Error(
      "Die vorherige Inbox-Entscheidung konnte nicht wiederhergestellt werden.",
    );
  }
}

/**
 * Replaces the Inbox decision only after its cookie can be written. If the
 * subsequent Today-state write fails, the previous Inbox cookie is restored.
 */
export async function replaceInboxTodayDecision(
  analysis: AnalysisResult,
  dependencies: InboxTodayDecisionReplacementDependencies,
): Promise<boolean> {
  const previousInboxDecision = await dependencies.readInboxDecision();
  const todayState = await dependencies.readTodayState();

  let wasWritten: boolean;
  try {
    wasWritten = await dependencies.writeInboxDecision(analysis);
  } catch {
    return false;
  }

  if (!wasWritten) {
    return false;
  }

  try {
    await dependencies.writeTodayState(
      clearTodayDecisionStateForDecision(todayState, inboxTodayDecisionId),
    );
    return true;
  } catch {
    await restoreInboxDecision(previousInboxDecision, dependencies);
    return false;
  }
}

export async function resetInboxTodayDecisionState(
  dependencies: InboxTodayDecisionReplacementDependencies,
): Promise<void> {
  const previousInboxDecision = await dependencies.readInboxDecision();
  const todayState = await dependencies.readTodayState();

  await dependencies.clearInboxDecision();

  try {
    await dependencies.writeTodayState(
      clearTodayDecisionStateForDecision(todayState, inboxTodayDecisionId),
    );
  } catch (error) {
    await restoreInboxDecision(previousInboxDecision, dependencies);
    throw error;
  }
}
