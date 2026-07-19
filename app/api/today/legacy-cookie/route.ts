import { NextResponse } from "next/server";

import { todayDecisionCookieName } from "@/lib/today/cookie-today-decision-state-store";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });

  response.cookies.set(todayDecisionCookieName, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 0,
  });

  return response;
}
