import { cookies } from "next/headers";

import {
  parseTodayDecisionState,
  serializeTodayDecisionState,
  type TodayDecisionState,
} from "@/lib/today/today-decision-state";

export const todayDecisionCookieName = "atlas-today-decisions";

const todayDecisionCookieOptions = {
  httpOnly: true,
  path: "/today",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function getTodayDecisionStateFromCookie(): Promise<TodayDecisionState> {
  const cookieStore = await cookies();

  return parseTodayDecisionState(cookieStore.get(todayDecisionCookieName)?.value);
}

export async function saveTodayDecisionStateToCookie(state: TodayDecisionState): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(todayDecisionCookieName, serializeTodayDecisionState(state), todayDecisionCookieOptions);
}
