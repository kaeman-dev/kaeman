import type { Context } from "koishi";
import type { Config } from "../../../index";
import { InputError } from "../../../error/handle";
import { center, compact, randInt, rollWeighted } from "../../../utils";
import { getPrices } from "../../prices";
import { SimResult } from "..";
import edLoot from "../../../assets/ender-dragon-loot.json";

interface EDPlayer {
  placement: number;
  summoning_eyes_placed: number;
  damage_dealt: number;
  magic_find: number;
  pet_luck: number;
}

interface EDRequest {
  dragon_type?: string;
  players: EDPlayer[];
}

interface EDResult {
  dragon_type: string;
  players: { quality: number; rewards: Map<Item, number> }[];
}

interface SimPlayer extends EDPlayer {
  rewards: Map<Item, number>;
  quality: number;
}

const dragonWeights: Record<string, number> = edLoot.dragonWeights;
const bonuses: Record<string, { dyeChance: number; essenceQuantity: number }> =
  edLoot.bonuses;
const { placementTable, quality, presentation } = edLoot;

type Item = {
  id: string;
  name: string;
};

type DragonItem = Item & {
  quality: number;
  baseChance: number;
  perEye?: boolean; // 如果 true 就放置眼数相乘 baseChance 倍率
  petLuck?: boolean;
  major?: boolean;
};

const itemTable: (DragonItem & {
  dragons?: string[];
  excludeDragons?: string[];
})[] = edLoot.items;

const dragonItems = (dragon: string): DragonItem[] => {
  const name = dragon.toUpperCase();
  const display = dragon[0].toUpperCase() + dragon.slice(1);

  return itemTable
    .filter((item) =>
      (!item.dragons || item.dragons.includes(dragon)) &&
      !item.excludeDragons?.includes(dragon),
    )
    .map(({ dragons, excludeDragons, ...item }) => ({
      ...item,
      id: item.id.replaceAll("{dragon}", name),
      name: item.name.replaceAll("{display}", display),
    }));
};

const createSimPlayer = (req: EDRequest): SimPlayer[] => {
  var firstPlaceDamge = 0;

  req.players.map((player) => {
    if (player.damage_dealt > firstPlaceDamge) {
      firstPlaceDamge = player.damage_dealt;
    }
  });

  return req.players.map((player) => {
    const placement = placementTable.find(
      ([start, end]) => player.placement >= start && player.placement <= end,
    );

    return {
      ...player,
      rewards: new Map(),
      quality:
        (placement ? placement[2] : 0) +
        (player.damage_dealt > quality.damageThreshold
          ? quality.damageBonus
          : quality.minimumDamageBonus) +
        (quality.perEye * player.summoning_eyes_placed +
          (quality.relativeDamage * player.damage_dealt) / (firstPlaceDamge || 1)),
    };
  });
};

const simulateDragon = (dragon: string, players: SimPlayer[]): EDResult => {
  const items = dragonItems(dragon);
  const bonus = Object.hasOwn(bonuses, dragon) ? bonuses[dragon] : bonuses.default;
  const qualityOf = (item: Item) =>
    items.find((entry) => entry.id === item.id)?.quality ?? 0;

  const ranked = [...players].sort((a, b) => b.quality - a.quality);
  for (const item of items.filter((item) => item.major)) {
    const eligible = ranked.filter(
      (p) => p.quality >= item.quality && !p.rewards.has(item),
    );
    const winners = eligible.filter(
      (p) =>
        Math.random() <
        (item.perEye
          ? item.baseChance * p.summoning_eyes_placed
          : item.baseChance) *
          (item.petLuck
            ? 1 + (p.magic_find + p.pet_luck) / 100
            : 1 + p.magic_find / 100),
    );

    const chosen = winners[Math.floor(Math.random() * winners.length)];
    if (chosen) {
      chosen.rewards.set(item, (chosen.rewards.get(item) ?? 0) + 1);
      chosen.quality -= item.quality;
    }
  }

  for (const player of players) {
    let remaining = player.quality;
    for (const item of items
      .filter((item) => !item.major)
      .sort((a, b) => b.quality - a.quality)) {
      while (remaining >= item.quality) {
        player.rewards.set(item, (player.rewards.get(item) ?? 0) + 1);
        remaining -= item.quality;
      }
    }
    player.quality = remaining;
  }

  for (const player of players) {
    if (Math.random() < bonus.dyeChance)
      player.rewards.set(edLoot.dye, 1);
  }
  for (const player of players) {
    for (let i = 0; i < bonus.essenceQuantity; i++)
      player.rewards.set(
        edLoot.essence,
        (player.rewards.get(edLoot.essence) ?? 0) + 1,
      );
  }
  for (const player of players) {
    player.rewards = new Map(
      [...player.rewards.entries()].sort(
        ([a], [b]) => qualityOf(b) - qualityOf(a),
      ),
    );
  }

  return {
    dragon_type: dragon,
    players: players.map((player) => ({
      quality: Math.round(player.quality * 100) / 100,
      rewards: new Map(player.rewards),
    })),
  };
};

export const simulateEd = async (
  ctx: Context,
  config: Config,
  args: string,
): Promise<SimResult> => {
  const logger = ctx.logger("kaeman");
  let request: EDRequest;
  if (args) {
    try {
      request = JSON.parse(args);
    } catch {
      throw new InputError("Invalid arguments; send /ed help for examples");
    }
  } else {
    request = {
      dragon_type: "random",
      players: edLoot.defaultPlayers.map((player) => ({
        ...player,
        damage_dealt: randInt(player.damage_dealt[0], player.damage_dealt[1]),
        magic_find: randInt(player.magic_find[0], player.magic_find[1]),
        pet_luck: randInt(player.pet_luck[0], player.pet_luck[1]),
      })),
    };
  }

  if (!request || !Array.isArray(request.players) || !request.players.length)
    throw new InputError("players must not be empty");

  let dragon = (request.dragon_type ?? "random").toLowerCase();
  if (!dragon || dragon === "random") {
    dragon = rollWeighted(
      Object.keys(dragonWeights),
      (name) => dragonWeights[name],
    );
  }
  logger.debug("ed dragon=%s players=%d", dragon, request.players.length);

  const ranked = [...request.players].sort(
    (a, b) => b.damage_dealt - a.damage_dealt,
  );

  let text =
    center("&a&l------------------------------\n", 65) +
    center(`&6&l${dragon.toUpperCase()} DRAGON DOWN!\n`, 75) +
    "\n\n" +
    ranked
      .slice(0, presentation.damagerLabels.length)
      .map((player, i) =>
        center(
          `${presentation.damagerLabels[i]} &7&l- &e${new Intl.NumberFormat("en-US").format(player.damage_dealt)}\n`,
          75,
        ),
      )
      .join("") +
    "\n\n" +
    center(
      `&eYour Damage: &a${new Intl.NumberFormat("en-US").format(ranked[0].damage_dealt)} &7(Position #1)\n`,
      75,
    ) +
    center(
      `&eRunecrafting Experience: &d${randInt(presentation.runecraftingExperience[0], presentation.runecraftingExperience[1])}\n`,
      75,
    ) +
    "\n\n" +
    center("&a&l------------------------------\n", 65);

  const prices = await getPrices(ctx);
  if (!prices) throw new Error("Failed to fetch price data");

  let profit = -(
    ranked[0].summoning_eyes_placed * (prices[edLoot.costItem] ?? 0)
  );

  const simResult = simulateDragon(dragon, createSimPlayer(request));
  if (
    simResult.players.some((player) =>
      [...player.rewards.keys()].some((item) => item.id === edLoot.dye.id),
    )
  )
    logger.info("rare drop: Pearlescent Dye (ed)");
  simResult.players
    .slice(0, presentation.playerLabels.length)
    .forEach((player, i) => {
      const first = [...player.rewards.entries()][0];
      if (!first) return;
      const [item, count] = first;
      if (i === 0) profit += prices[item.id] ?? 0;
      text += `${presentation.playerLabels[i]} &ehas Obtained &6${item.name}${count > 1 ? ` &7x${count}` : ""}\n`;
    });
  text += `&e[ATRI-BOT] Profit for &f${dragon[0].toUpperCase() + dragon.slice(1)} Dragon: ${profit <= 0 ? "&c" : "&6"}${compact.format(profit)}`;

  return { type: "dragon.png", profit, text };
};
