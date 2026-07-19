export function shouldUseSecureTodayCookie(forwardedProto: string | null): boolean {
  return forwardedProto?.split(",", 1)[0]?.trim().toLowerCase() === "https";
}
