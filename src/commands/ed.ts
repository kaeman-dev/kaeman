import type { Context } from "koishi";
import type { Config } from "../index";
import { renderMinecraft } from "../service/puppeteer/render";
import { addPurse } from "../service/purse";
import { simulateEd } from "../service/simulator/ed";
import { handleError } from "../utils";

const help = `提交参数示例(Player允许多个, Placement第一默认为你):
{
  "dragon_type": "random",
  "players": [
    {
      "placement": 1,
      "summoning_eyes_placed": 4,
      "damage_dealt": 5000000,
      "first_place_damage": 5000000,
      "magic_find": 200,
      "pet_luck": 150
    },
    {
      "placement": 2,
      "summoning_eyes_placed": 4,
      "damage_dealt": 3000000,
      "first_place_damage": 5000000,
      "magic_find": 150,
      "pet_luck": 150
    }
  ]
}`;

export const registerEd = (ctx: Context, config: Config) =>
  ctx
    .command("ed [args:text]", "SkyBlock Ender Dragon Loot Simulator")
    .alias("edragsim", "eg")
    .action(async ({ session }, args) => {
      try {
        if (args?.trim().toLowerCase() === "help")
          return await session.send(help);
        const result = await simulateEd(ctx, config, args ?? "");
        await addPurse(ctx, session.uid, result.profit);
        await session.send(
          await renderMinecraft(ctx, config.textRenderUrl, result),
        );
      } catch (err) {
        await handleError(ctx, session, err, "ed");
      }
    });
