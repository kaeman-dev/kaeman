import type { Context } from "koishi";
import type { Config } from "#index.js";
import { formatProfit, mergeItems, rollWeighted } from "#utils/index.js";
import type { Item, SimResult } from "#service/simulator/index.js";
import vgLoot from "#assets/vanguard-loot.json";

export const simulateVg = async (ctx: Context, config: Config): Promise<SimResult> => {
  const logger = ctx.logger("kaeman");
  const perk = Math.random() < vgLoot.perk.chance;
  if (perk) logger.debug("vg HOTM perk triggered");
  const drops: Item[] = [];
  const [rollMin, rollMax] = vgLoot.rolls as [number, number];
  const rolls =
    rollMin +
    Math.floor(Math.random() * (rollMax - rollMin + 1)) +
    (perk ? vgLoot.perk.bonusRolls : 0);
  logger.debug("vg rolls=%d", rolls);
  for (let i = 0; i < rolls; i++) {
    if (Math.random() < vgLoot.rareDrop.chance) {
      logger.info("rare drop: Frostbitten Dye (vg)");
      drops.push(vgLoot.rareDrop.item);
    } else {
      drops.push(rollWeighted(vgLoot.items, (item) => item.weight));
    }
  }
  const merged = mergeItems(drops);
  const { text: profitText, profit } = await formatProfit(ctx, config, merged, vgLoot.costItems);
  const lines = merged
    .map(({ name, quantity }) => `    ${name}${quantity > 1 ? ` &7x${quantity}` : ""}\n`)
    .join("");
  const [powderMin, powderMax] = vgLoot.powder.quantity as [number, number];
  return {
    type: "vg.jpg",
    profit,
    text: `&a&l------------------------------
&d&l&f&l  VANGUARD &b&lCORPSE LOOT!${perk ? "\n&7  +1 bonus drop from &5HOTM&7! &8(Gifts from the Departed)" : ""}
 
&a&l  REWARDS
${lines}    ${vgLoot.powder.name} &8x${Math.floor((powderMin + Math.floor(Math.random() * (powderMax - powderMin + 1))) * vgLoot.powder.multiplier)}


&e[ATRI-BOT] Profit for &fVanguard Corpse: ${profitText}
&a&l------------------------------`,
  };
};
