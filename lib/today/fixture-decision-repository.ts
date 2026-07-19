import type { TodayDecisionRepository } from "@/lib/today/decision-repository";
import { todayDecisionFixtures } from "@/lib/today/decision-fixtures";
import { prioritizeTodayDecisions } from "@/lib/today/decision-priority";

export const fixtureTodayDecisionRepository: TodayDecisionRepository = {
  async getTodayDecisions() {
    return prioritizeTodayDecisions(structuredClone(todayDecisionFixtures));
  },
};
