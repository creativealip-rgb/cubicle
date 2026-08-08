type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  [key: string]: unknown;
}

export function logEvent(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const output = JSON.stringify(payload);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export function logRequest(method: string, path: string, status: number, durationMs: number) {
  logEvent(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "HTTP Request", {
    method,
    path,
    status,
    durationMs,
  });
}
