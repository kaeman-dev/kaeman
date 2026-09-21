import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const trace = new AsyncLocalStorage<string>();

export const withTrace = <T>(task: () => T): T => trace.run(randomUUID(), task);

export const getTraceId = (): string => trace.getStore() ?? randomUUID();
