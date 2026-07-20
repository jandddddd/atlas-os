import { stringifyCookie } from "next/dist/server/web/spec-extension/cookies.js";

import type { AnalysisResult } from "@/components/inbox/types";

export const inboxTodayDecisionCookieName = "atlas-inbox-today-decision";

const maximumInboxTodayDecisionCookieBytes = 3_800;

export const inboxTodayDecisionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function serializeInboxTodayDecisionCookie(
  analysis: AnalysisResult,
): string {
  return stringifyCookie({
    name: inboxTodayDecisionCookieName,
    value: JSON.stringify(analysis),
    ...inboxTodayDecisionCookieOptions,
  });
}

export function canStoreInboxTodayDecision(analysis: AnalysisResult): boolean {
  return (
    new TextEncoder().encode(serializeInboxTodayDecisionCookie(analysis))
      .byteLength <= maximumInboxTodayDecisionCookieBytes
  );
}
