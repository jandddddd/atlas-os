import type { TodayDecisionRepository } from "@/lib/today/decision-repository";
import { createInboxTodayDecision } from "@/lib/today/inbox-today-decision";
import { readInboxTodayDecision } from "@/lib/today/inbox-today-decision-store";
import { todayDecisionFixtures } from "@/lib/today/decision-fixtures";
import { prioritizeTodayDecisions } from "@/lib/today/decision-priority";

export const fixtureTodayDecisionRepository: TodayDecisionRepository = {
  async getTodayDecisions() {
    const inboxAnalysis = await readInboxTodayDecision();
    const decisions = inboxAnalysis
      ? [
          ...structuredClone(todayDecisionFixtures),
          createInboxTodayDecision(inboxAnalysis),
        ]
      : structuredClone(todayDecisionFixtures);

    return prioritizeTodayDecisions(decisions).map(
      ({ decision, priority }) => ({
        ...decision,
        priority,
      }),
    );
  },
};
