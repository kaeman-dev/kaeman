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
  const perk = Math.random() < 0.2;
  const drops: Item[] = [];
  for (let i = 0, rolls = randInt(5, 8) + (perk ? 1 : 0); i < rolls; i++) {
    drops.push(
      Math.random() < 0.0003
        ? {
            id: "DYE_FROSTBITTEN",
            name: "&3Frostbitten Dye",
            weight: 0,
            quantity: 1,
          }
        : rollWeighted(vgLoot.items, (item) => item.weight),
    );
  }
  const merged = mergeItems(drops);
  const { text: profitText, profit } = formatProfit(
    await getPrices(ctx, config),
    merged,
    ["SKELETON_KEY"],
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
${lines}    &bGlacite Powder &8x${Math.floor(randInt(25000, 50000) * 1.5)}


&e[ATRI-BOT] Profit for &fVanguard Corpse: ${profitText}
&a&l------------------------------`,
  };
};
