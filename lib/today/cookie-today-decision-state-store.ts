import { cookies } from "next/headers";

import {
  parseTodayDecisionState,
  serializeTodayDecisionState,
  type TodayDecisionState,
} from "@/lib/today/today-decision-state";
import type { TodayDecisionStateStore } from "@/lib/today/today-decision-state-store";

export const todayDecisionCookieName = "atlas-today-decisions";

const todayDecisionCookieOptions = {
  httpOnly: true,
  path: "/today",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

const legacyTodayDecisionCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: false,
  maxAge: 0,
};

export const cookieTodayDecisionStateStore: TodayDecisionStateStore = {
  async read(): Promise<TodayDecisionState> {
    const cookieStore = await cookies();

    return parseTodayDecisionState(cookieStore.get(todayDecisionCookieName)?.value);
  },

  async write(state: TodayDecisionState): Promise<void> {
    const cookieStore = await cookies();

    // Expire the legacy root-scoped cookie in the same server response that
    // writes the canonical Today cookie. Keeping both mutations together
    // avoids races where a client-side cleanup request removes or hides the
    // newly written state.
    cookieStore.set(todayDecisionCookieName, "", legacyTodayDecisionCookieOptions);
    cookieStore.set(
      todayDecisionCookieName,
      serializeTodayDecisionState(state),
      todayDecisionCookieOptions,
    );
  },
};