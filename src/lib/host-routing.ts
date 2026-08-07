const AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email/success",
];

function withQuery(origin: string, pathname: string, search: string) {
  return `${origin}${pathname}${search}`;
}

export function getCanonicalRedirect(
  host: string,
  pathname: string,
  search: string,
  _hasSession: boolean,
): string | null {
  const normalizedHost = host.split(":", 1)[0].toLowerCase();

  if (normalizedHost === "www.cubiqlo.com") {
    return withQuery("https://cubiqlo.com", pathname, search);
  }

  if (normalizedHost === "app.cubiqlo.com" && pathname === "/") {
    return "https://app.cubiqlo.com/app/dashboard";
  }

  if (normalizedHost === "cubiqlo.com") {
    const belongsToApp =
      pathname.startsWith("/app") ||
      pathname.startsWith("/onboarding") ||
      AUTH_PATHS.some((path) => pathname === path);

    if (belongsToApp) {
      return withQuery("https://app.cubiqlo.com", pathname, search);
    }
  }

  return null;
}
