import { cookies, headers } from "next/headers";

import {
  parseTodayDecisionState,
  serializeTodayDecisionState,
  type TodayDecisionState,
} from "@/lib/today/today-decision-state";
import type { TodayDecisionStateStore } from "@/lib/today/today-decision-state-store";
import { shouldUseSecureTodayCookie } from "@/lib/today/today-decision-cookie-options";

export const todayDecisionCookieName = "atlas-today-decisions";

const todayDecisionCookieOptions = {
  httpOnly: true,
  path: "/today",
  sameSite: "lax" as const,
};

export const cookieTodayDecisionStateStore: TodayDecisionStateStore = {
  async read(): Promise<TodayDecisionState> {
    const cookieStore = await cookies();

    return parseTodayDecisionState(cookieStore.get(todayDecisionCookieName)?.value);
  },

  async write(state: TodayDecisionState): Promise<void> {
    const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
    const secure = shouldUseSecureTodayCookie(requestHeaders.get("x-forwarded-proto"));

    cookieStore.delete({ name: todayDecisionCookieName, path: "/" });
    cookieStore.set(
      todayDecisionCookieName,
      serializeTodayDecisionState(state),
      { ...todayDecisionCookieOptions, secure },
    );
  },
};
