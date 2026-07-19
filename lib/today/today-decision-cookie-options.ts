function protocolFromForwardedHeader(forwardedProto: string | null): boolean | null {
  const protocol = forwardedProto?.split(",", 1)[0]?.trim().toLowerCase();

  if (protocol === "https") {
    return true;
  }

  if (protocol === "http") {
    return false;
  }

  return null;
}

function protocolFromOrigin(origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).protocol === "https:";
  } catch {
    return false;
  }
}

export function shouldUseSecureTodayCookie(
  forwardedProto: string | null,
  origin: string | null,
): boolean {
  return protocolFromForwardedHeader(forwardedProto) ?? protocolFromOrigin(origin);
}
