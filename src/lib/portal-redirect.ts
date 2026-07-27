export function portalPublicUrl(request: Request, path: string): URL {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const origin = forwardedHost && (forwardedProto === "http" || forwardedProto === "https")
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;
  return new URL(path, origin);
}
