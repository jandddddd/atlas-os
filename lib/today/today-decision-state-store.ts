import { cookieTodayDecisionStateStore } from "@/lib/today/cookie-today-decision-state-store";

import type { TodayDecisionState } from "@/lib/today/today-decision-state";

export interface TodayDecisionStateStore {
  read(): Promise<TodayDecisionState>;
  write(state: TodayDecisionState): Promise<void>;
}

export const todayDecisionStateStore: TodayDecisionStateStore = cookieTodayDecisionStateStore;
