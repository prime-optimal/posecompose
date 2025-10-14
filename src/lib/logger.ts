type LogPayload = Record<string, unknown>;

interface LogEntry extends LogPayload {
  event: string;
  level: "info" | "error";
  timestamp: string;
}

const resolveLogEndpoint = () => {
  const normalizeToLogPath = (candidate: string) => {
    try {
      const base = typeof window !== "undefined" ? window.location.origin : undefined;
      const url = base ? new URL(candidate, base) : new URL(candidate);
      if (!url.pathname || url.pathname === "/") {
        url.pathname = "/api/logs";
      }
      return url.toString();
    } catch {
      if (candidate.endsWith("/api/logs")) {
        return candidate;
      }
      return `${candidate.replace(/\/$/, "")}/api/logs`;
    }
  };

  const configured = import.meta.env.VITE_LOG_ENDPOINT?.trim();
  if (configured) {
    return normalizeToLogPath(configured);
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (apiBase) {
    return normalizeToLogPath(apiBase);
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/logs`;
  }

  return undefined;
};

const LOG_ENDPOINT = resolveLogEndpoint();

const isSameOrigin = (endpoint: string) => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const url = new URL(endpoint, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
};

const deliverLog = (entry: LogEntry) => {
  if (!LOG_ENDPOINT) {
    return;
  }

  const body = JSON.stringify(entry);

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function" &&
    LOG_ENDPOINT &&
    isSameOrigin(LOG_ENDPOINT)
  ) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(LOG_ENDPOINT, blob);
    return;
  }

  void fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
    mode: "cors",
    credentials: "omit",
  }).catch(() => {
    // swallow transport errors
  });
};

export const logEvent = (event: string, payload: LogPayload = {}) => {
  const entry: LogEntry = {
    event,
    level: "info",
    timestamp: new Date().toISOString(),
    ...payload,
  };

  console.info("[PoseCompose]", entry);
  deliverLog(entry);
};

export const logError = (event: string, error: unknown, payload: LogPayload = {}) => {
  const normalizedError =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: typeof error === "string" ? error : JSON.stringify(error) };

  const entry: LogEntry = {
    event,
    level: "error",
    timestamp: new Date().toISOString(),
    ...payload,
    ...normalizedError,
  };

  console.error("[PoseCompose]", entry);
  deliverLog(entry);
};
