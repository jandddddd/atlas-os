"use server";

import type { AnalysisResult } from "@/components/inbox/types";
import { inboxTodayDecisionId } from "@/lib/today/inbox-today-decision";
import {
  isAnalysisResult,
  writeInboxTodayDecision,
} from "@/lib/today/inbox-today-decision-store";
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
    todayDecisionStateStore.write({
      ...state,
      decisions: state.decisions.filter(
        (decision) => decision.decisionId !== inboxTodayDecisionId,
      ),
    }),
  ]);

  return wasStored;
}
