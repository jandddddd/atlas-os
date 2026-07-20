import { stringifyCookie } from "next/dist/server/web/spec-extension/cookies.js";

import type { AnalysisResult } from "@/components/inbox/types";

export const inboxTodayDecisionCookieName = "atlas-inbox-today-decision";

const maximumInboxTodayDecisionCookieBytes = 3_800;

export function createInboxTodayDecisionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
  };
}

export function serializeInboxTodayDecisionCookie(
  analysis: AnalysisResult,
  secure = false,
): string {
  return stringifyCookie({
    name: inboxTodayDecisionCookieName,
    value: JSON.stringify(analysis),
    ...createInboxTodayDecisionCookieOptions(secure),
  });
}

export function canStoreInboxTodayDecision(
  analysis: AnalysisResult,
  secure: boolean,
): boolean {
  return (
    new TextEncoder().encode(
      serializeInboxTodayDecisionCookie(analysis, secure),
    ).byteLength <= maximumInboxTodayDecisionCookieBytes
  );
}
