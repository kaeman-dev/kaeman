import type { Context } from "koishi";
import type { Config } from "../index";
import { h } from "koishi";
import { renderMinecraft } from "../service/skia/minecrafttext";
import type { Purse } from "../service/purse";
import { simulateCn } from "../service/simulator/cn";

export const registerCn = (ctx: Context, config: Config, purse: Purse) =>
  ctx
    .command("cn", "SkyBlock Crystal Nucleus Loot Simulator")
    .alias("crystal", "ch")
    .userFields(["id"])
    .action(async ({ session }) => {
      const result = await simulateCn(ctx, config);
      await purse.add(session.user.id, result.profit, "cn");
      await session.send(h.image(await renderMinecraft(result), "image/png"));
    });
