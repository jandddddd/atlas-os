import type { TodayApprovalDecision } from "@/components/today/TodayApprovalCenter";

export interface TodayDecisionRepository {
  getTodayDecisions(): Promise<TodayApprovalDecision[]>;
}
