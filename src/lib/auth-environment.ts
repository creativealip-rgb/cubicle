export interface AuthEnvironmentOptions {
  cookiePrefix: string;
  crossSubDomainCookies:
    | { enabled: true; domain: string }
    | { enabled: false };
}

export function getAuthEnvironmentOptions(
  baseUrl: string | undefined,
  nodeEnv: string | undefined,
): AuthEnvironmentOptions {
  const isProductionApp =
    nodeEnv === "production" && baseUrl === "https://app.cubiqlo.com";

  if (isProductionApp) {
    return {
      cookiePrefix: "better-auth",
      crossSubDomainCookies: {
        enabled: true,
        domain: ".cubiqlo.com",
      },
    };
  }

  return {
    cookiePrefix: "cubiqlo_dev",
    crossSubDomainCookies: { enabled: false },
  };
}
