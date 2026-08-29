import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";

type LogContext = {
  requestId?: string;
  organizationId?: string;
  userId?: string;
};

const storage = new AsyncLocalStorage<LogContext>();

export function withLogContext<T>(ctx: LogContext, fn: () => T) {
  return storage.run({ ...storage.getStore(), ...ctx }, fn);
}

export function getRequestId() {
  return storage.getStore()?.requestId ?? randomUUID();
}

function write(level: string, message: string, extra?: Record<string, unknown>) {
  const store = storage.getStore() ?? {};
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    requestId: store.requestId,
    organizationId: store.organizationId,
    userId: store.userId,
    ...extra,
  };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const log = {
  info: (message: string, extra?: Record<string, unknown>) => write("info", message, extra),
  warn: (message: string, extra?: Record<string, unknown>) => write("warn", message, extra),
  error: (message: string, extra?: Record<string, unknown>) => write("error", message, extra),
};
