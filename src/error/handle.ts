import type { Context } from "koishi";
import { inspect } from "node:util";
import { getTraceId } from "./trace";

export class InputError extends Error {
  constructor(
    message: string,
    public readonly path?: string,
    public readonly params: object = {},
  ) {
    super(message);
  }
}

export const logError = (
  ctx: Context,
  err: unknown,
  operation: string,
  level: "warn" | "error" = "error",
  traceId = getTraceId(),
): string => {
  const error = err instanceof Error ? err : new Error(inspect(err));
  ctx.logger("kaeman")[level](
    "[trace-id=%s] %s\n%s",
    traceId,
    operation,
    error.stack ?? error.message,
  );
  return traceId;
};

export const registerErrorHandling = (ctx: Context): void => {
  ctx.on("command-error", async (argv, error) => {
    if (error instanceof InputError) {
      ctx.logger("kaeman").info(
        "input error in [%s]: %s",
        argv.command?.name,
        error.message,
      );
      return argv.session
        .send(
          error.path
            ? argv.session.text(error.path, error.params)
            : error.message,
        )
        .catch(() => {});
    }
    const traceId = logError(
      ctx,
      error,
      `[${argv.command?.name}] Command failed`,
    );
    await argv.session.send(traceId).catch((sendError) => {
      logError(ctx, sendError, "Failed to send trace ID", "error", traceId);
    });
  });
};
