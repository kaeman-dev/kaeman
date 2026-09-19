import type { Context } from "koishi";
import type { Config } from "../index";
import { renderMinecraft } from "../service/puppeteer/render";
import { addPurse } from "../service/purse";
import { simulateVg } from "../service/simulator/vg";
import { handleError } from "../utils";

export const registerVg = (ctx: Context, config: Config) =>
  ctx
    .command("vg", "SkyBlock Vanguard Loot Simulator")
    .action(async ({ session }) => {
      try {
        const result = await simulateVg(ctx, config);
        await addPurse(ctx, session.uid, result.profit);
        await session.send(
          await renderMinecraft(ctx, config.textRenderUrl, result),
        );
      } catch (err) {
        await handleError(ctx, session, err, "vg");
      }
    });
