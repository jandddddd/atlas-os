"use server";

import type { AnalysisResult } from "@/components/inbox/types";
import { inboxTodayDecisionId } from "@/lib/today/inbox-today-decision";
import {
  clearInboxTodayDecision,
  isAnalysisResult,
  writeInboxTodayDecision,
} from "@/lib/today/inbox-today-decision-store";
import { clearTodayDecisionStateForDecision } from "@/lib/today/today-decision-state";
import { todayDecisionStateStore } from "@/lib/today/today-decision-state-store";

export async function persistInboxTodayDecision(
  analysis: AnalysisResult,
): Promise<boolean> {
  if (!isAnalysisResult(analysis)) {
    return false;
  }

  const state = await todayDecisionStateStore.read();

  const [wasStored] = await Promise.all([
    writeInboxTodayDecision(analysis),
    todayDecisionStateStore.write(
      clearTodayDecisionStateForDecision(state, inboxTodayDecisionId),
    ),
  ]);

  return wasStored;
}

export async function resetInboxTodayDecision(): Promise<void> {
  const state = await todayDecisionStateStore.read();

  await Promise.all([
    clearInboxTodayDecision(),
    todayDecisionStateStore.write(
      clearTodayDecisionStateForDecision(state, inboxTodayDecisionId),
    ),
  ]);
}
