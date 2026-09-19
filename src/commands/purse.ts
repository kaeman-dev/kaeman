import type { Context } from "koishi";
import { getPurse } from "../service/purse";
import { compact, handleError } from "../utils";

export const registerPurse = (ctx: Context) =>
  ctx.command("purse", "查询钱包余额").action(async ({ session }) => {
    try {
      await session.send(
        `当前钱包余额: ${compact.format(await getPurse(ctx, session.uid))}`,
      );
    } catch (err) {
      await handleError(ctx, session, err, "purse");
    }
  });
