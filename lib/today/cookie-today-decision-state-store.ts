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

    // Version 2 cookies were scoped to the root path. Expire that legacy
    // variant before writing the canonical /today cookie.
    cookieStore.set(
      todayDecisionCookieName,
      "",
      legacyTodayDecisionCookieOptions,
    );
    cookieStore.set(
      todayDecisionCookieName,
      serializeTodayDecisionState(state),
      todayDecisionCookieOptions,
    );
  },
};
