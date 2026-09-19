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
import cnLoot from "../../../assets/crystal-hollows-loot.json";

export const simulateCn = async (
  ctx: Context,
  config: Config,
): Promise<SimResult> => {
  const drops: Item[] = [...cnLoot.fineGems];
  for (let i = 0, rolls = randInt(17, 21); i < rolls; i++) {
    drops.push(
      Math.random() < 0.0006
        ? { id: "DYE_JADE", name: "&2Jade Dye", weight: 0, quantity: 1 }
        : rollWeighted(cnLoot.items, (item) => item.weight),
    );
  }
  const merged = mergeItems(drops).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  const { text: profitText, profit } = formatProfit(
    await getPrices(ctx, config),
    merged,
    ["GOBLIN_EGG", "JUNGLE_KEY", "PRECURSOR_APPARATUS"],
  );
  const lines = merged
    .map(
      ({ name, quantity }) =>
        `    ${name}${quantity > 1 ? ` &7x${quantity}` : ""}\n`,
    )
    .join("");
  return {
    type: "ch.png",
    profit,
    text: `&3&l------------------------------
&5&l  CRYSTAL NUCLEUS LOOT BUNDLE
&a&l  REWARDS
${lines}${Math.random() < 0.5 ? `&2    Mithril Powder &7x${randInt(2000, 7000)}\n` : `&d    Gemstone Powder &7x${randInt(2000, 7000)}\n`}
&e[ATRI-BOT] Profit for Crystal Nucleus Run: ${profitText}
&3&l------------------------------`,
  };
};
