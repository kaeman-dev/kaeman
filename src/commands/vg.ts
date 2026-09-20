import type { Context } from "koishi";
import type { Config } from "../index";
import { h } from "koishi";
import { renderMinecraft } from "../service/skia/minecrafttext";
import type { Purse } from "../service/purse";
import { simulateVg } from "../service/simulator/vg";

export const registerVg = (ctx: Context, config: Config, purse: Purse) =>
  ctx
    .command("vg", "SkyBlock Vanguard Loot Simulator")
    .userFields(["id"])
    .action(async ({ session }) => {
      const result = await simulateVg(ctx, config);
      await purse.add(session.user.id, result.profit, "vg");
      await session.send(h.image(await renderMinecraft(result), "image/png"));
    });
