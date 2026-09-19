import type { Context } from "koishi";
import type { Config } from "../index";
import { renderMinecraft } from "../service/puppeteer/render";
import { addPurse } from "../service/purse";
import { simulateCn } from "../service/simulator/cn";
import { handleError } from "../utils";

export const registerCn = (ctx: Context, config: Config) =>
  ctx
    .command("cn", "SkyBlock Crystal Nucleus Loot Simulator")
    .alias("crystal", "ch")
    .action(async ({ session }) => {
      try {
        const result = await simulateCn(ctx, config);
        await addPurse(ctx, session.uid, result.profit);
        await session.send(
          await renderMinecraft(ctx, config.textRenderUrl, result),
        );
      } catch (err) {
        await handleError(ctx, session, err, "cn");
      }
    });
