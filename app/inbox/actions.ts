"use server";

import type { AnalysisResult } from "@/components/inbox/types";
import {
  clearInboxTodayDecision,
  isAnalysisResult,
  readInboxTodayDecision,
  writeInboxTodayDecision,
} from "@/lib/today/inbox-today-decision-store";
import {
  replaceInboxTodayDecision,
  resetInboxTodayDecisionState,
} from "@/lib/today/inbox-today-decision-replacement";
import { todayDecisionStateStore } from "@/lib/today/today-decision-state-store";

const inboxTodayDecisionDependencies = {
  readInboxDecision: readInboxTodayDecision,
  writeInboxDecision: writeInboxTodayDecision,
  clearInboxDecision: clearInboxTodayDecision,
  readTodayState: () => todayDecisionStateStore.read(),
  writeTodayState: (
    state: Awaited<ReturnType<typeof todayDecisionStateStore.read>>,
  ) => todayDecisionStateStore.write(state),
};

export async function persistInboxTodayDecision(
  analysis: AnalysisResult,
): Promise<boolean> {
  if (!isAnalysisResult(analysis)) {
    return false;
  }

  return replaceInboxTodayDecision(analysis, inboxTodayDecisionDependencies);
}

export async function resetInboxTodayDecision(): Promise<void> {
  await resetInboxTodayDecisionState(inboxTodayDecisionDependencies);
}
