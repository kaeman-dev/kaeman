import type { Context } from "koishi";
import type { Config } from "#index.js";
import { formatProfit, mergeItems, rollWeighted } from "#utils/index.js";
import type { Item, SimResult } from "#service/simulator/index.js";
import cnLoot from "#assets/crystal-hollows-loot.json";

export const simulateCn = async (ctx: Context, config: Config): Promise<SimResult> => {
  const logger = ctx.logger("kaeman");
  const drops: Item[] = [...cnLoot.fineGems];
  const [rollMin, rollMax] = cnLoot.rolls as [number, number];
  const rolls = rollMin + Math.floor(Math.random() * (rollMax - rollMin + 1));
  logger.debug("cn rolls=%d", rolls);
  for (let i = 0; i < rolls; i++) {
    if (Math.random() < cnLoot.rareDrop.chance) {
      logger.info("rare drop: Jade Dye (cn)");
      drops.push(cnLoot.rareDrop.item);
    } else {
      drops.push(rollWeighted(cnLoot.items, (item) => item.weight));
    }
  }
  const merged = mergeItems(drops).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const { text: profitText, profit } = await formatProfit(ctx, config, merged, cnLoot.costItems);
  const lines = merged
    .map(({ name, quantity }) => `    ${name}${quantity > 1 ? ` &7x${quantity}` : ""}\n`)
    .join("");
  const [powderMin, powderMax] = cnLoot.powder.quantity as [number, number];
  return {
    type: "ch.png",
    profit,
    text: `&3&l------------------------------
&5&l  CRYSTAL NUCLEUS LOOT BUNDLE
&a&l  REWARDS
${lines}${rollWeighted(cnLoot.powder.items, (item) => item.weight).name} &7x${powderMin + Math.floor(Math.random() * (powderMax - powderMin + 1))}

&e[ATRI-BOT] Profit for Crystal Nucleus Run: ${profitText}
&3&l------------------------------`,
  };
};
