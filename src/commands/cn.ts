import type { Context } from "koishi";
import type { Config } from "#index.js";
import { h } from "koishi";
import { renderMinecraft } from "#service/skia/minecrafttext.js";
import type { Purse } from "#service/purse/index.js";
import { simulateCn } from "#service/simulator/cn/index.js";

export const registerCn = (ctx: Context, config: Config, purse: Purse) =>
  ctx
    .command("cn", "SkyBlock Crystal Nucleus Loot Simulator")
    .alias("crystal", "ch")
    .userFields(["id"])
    .action(async ({ session }) => {
      if (!session?.user) throw new Error("A Koishi user session is required");
      const result = await simulateCn(ctx, config);
      await purse.add(session.user.id, result.profit, "cn");
      await session.send(h.image(await renderMinecraft(result), "image/png"));
    });
