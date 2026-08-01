const SAFE_DATABASE_NAME = /^cubicle_.*(?:test|qa)$/;

export function assertDisposableDatabaseUrl(value: string | undefined): URL {
  if (!value) throw new Error("DATABASE_URL is required");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Refusing unsafe DATABASE_URL: invalid URL");
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!SAFE_DATABASE_NAME.test(databaseName)) {
    throw new Error(
      `Refusing unsafe DATABASE_URL database ${JSON.stringify(databaseName)}; ` +
      "expected a name matching cubicle_*test or cubicle_*qa",
    );
  }
  return url;
}
