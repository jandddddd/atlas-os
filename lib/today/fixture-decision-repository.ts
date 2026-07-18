import type { TodayDecisionRepository } from "@/lib/today/decision-repository";
import { todayDecisionFixtures } from "@/lib/today/decision-fixtures";

export const fixtureTodayDecisionRepository: TodayDecisionRepository = {
  async getTodayDecisions() {
    return structuredClone(todayDecisionFixtures);
  },
};
