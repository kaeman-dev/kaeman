import type { Context } from "koishi";
import type { Config } from "../../../index";
import {
  formatProfit,
  mergeItems,
  randInt,
  rollWeighted,
} from "../../../utils";
import { getPrices } from "../../prices";
import { Item, SimResult } from "..";
import vgLoot from "../../../assets/vanguard-loot.json";

export const simulateVg = async (
  ctx: Context,
  config: Config,
): Promise<SimResult> => {
  const logger = ctx.logger("kaeman");
  const perk = Math.random() < vgLoot.perk.chance;
  if (perk) logger.debug("vg HOTM perk triggered");
  const drops: Item[] = [];
  const rolls = randInt(vgLoot.rolls[0], vgLoot.rolls[1]) +
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
  const { text: profitText, profit } = await formatProfit(
    ctx,
    merged,
    vgLoot.costItems,
  );
  const lines = merged
    .map(
      ({ name, quantity }) =>
        `    ${name}${quantity > 1 ? ` &7x${quantity}` : ""}\n`,
    )
    .join("");
  return {
    type: "vg.jpg",
    profit,
    text: `&a&l------------------------------
&d&l&f&l  VANGUARD &b&lCORPSE LOOT!${perk ? "\n&7  +1 bonus drop from &5HOTM&7! &8(Gifts from the Departed)" : ""}
 
&a&l  REWARDS
${lines}    ${vgLoot.powder.name} &8x${Math.floor(randInt(vgLoot.powder.quantity[0], vgLoot.powder.quantity[1]) * vgLoot.powder.multiplier)}


&e[ATRI-BOT] Profit for &fVanguard Corpse: ${profitText}
&a&l------------------------------`,
  };
};
