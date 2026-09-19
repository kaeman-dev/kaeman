import type { Context } from "koishi";
import type { Config } from "../../../index";
import {
  center,
  compact,
  InputError,
  randInt,
  rollWeighted,
} from "../../../utils";
import { getPrices } from "../../prices";
import { SimResult } from "..";

interface EdPlayer {
  placement: number;
  summoning_eyes_placed: number;
  damage_dealt: number;
  first_place_damage: number;
  magic_find: number;
  pet_luck: number;
}

interface EdRequest {
  dragon_type?: string;
  players: EdPlayer[];
}

interface EdResult {
  dragon_type: string;
  players: { quality: number; rewards: Record<string, number> }[];
}

interface LootItem {
  name: string;
  quality: number;
  isUnique: boolean;
  baseChance: number;
  perEye?: boolean;
}

interface SimPlayer extends EdPlayer {
  rewards: string[];
  quality: number;
}

const dragonWeights: Record<string, number> = {
  superior: 4,
  strong: 16,
  unstable: 16,
  young: 16,
  wise: 16,
  old: 16,
  protector: 16,
};

const placementTable: [number, number, number, number, number][] = [
  [1, 1, 200, 30, 7],
  [2, 2, 175, 25, 6],
  [3, 3, 150, 22, 5],
  [4, 4, 125, 20, 4],
  [5, 5, 110, 18, 3],
  [6, 8, 100, 15, 2],
  [9, 10, 90, 15, 2],
  [11, 12, 80, 15, 2],
  [13, 18, 70, 12, 1],
  [19, 25, 10, 0, 0],
];

const dragonItems = (dragon: string): LootItem[] => {
  const name = dragon.toUpperCase();
  const display = dragon[0].toUpperCase() + dragon.slice(1);
  return [
    ...(dragon === "superior"
      ? [
          {
            name: "DRAGON_HORN:&5Dragon Horn",
            quality: 452,
            isUnique: true,
            baseChance: 0.3,
          },
        ]
      : []),
    {
      name: "DRAGON_CLAW:&9Dragon Claw",
      quality: 451,
      isUnique: true,
      baseChance: 0.02,
      perEye: true,
    },
    {
      name: "LVL_1_EPIC_ENDER_DRAGON:&7[Lvl 1] &5Ender Dragon",
      quality: 450,
      isUnique: true,
      baseChance: 0.0005,
      perEye: true,
    },
    {
      name: "LVL_1_LEGENDARY_ENDER_DRAGON:&7[Lvl 1] &6Ender Dragon",
      quality: 450,
      isUnique: true,
      baseChance: 0.0001,
      perEye: true,
    },
    ...(dragon === "superior"
      ? []
      : [
          {
            name: "ASPECT_OF_THE_DRAGON:&6Aspect of the Dragons",
            quality: 450,
            isUnique: true,
            baseChance: 0.03,
            perEye: true,
          },
        ]),
    {
      name: `${name}_DRAGON_CHESTPLATE:&6${display} Dragon Chestplate`,
      quality: 410,
      isUnique: true,
      baseChance: 0.3,
    },
    {
      name: `${name}_DRAGON_LEGGINGS:&6${display} Dragon Leggings`,
      quality: 360,
      isUnique: true,
      baseChance: 0.3,
    },
    {
      name: `${name}_DRAGON_HELMET:&6${display} Dragon Helmet`,
      quality: 295,
      isUnique: true,
      baseChance: 0.3,
    },
    {
      name: `${name}_DRAGON_BOOTS:&6${display} Dragon Boots`,
      quality: 290,
      isUnique: true,
      baseChance: 0.3,
    },
    {
      name: `${name}_FRAGMENT:&5${display} Dragon Fragment`,
      quality: 22,
      isUnique: false,
      baseChance: 1,
    },
    {
      name: "ENCHANTED_ENDER_PEARL:&aEnchanted Ender Pearl",
      quality: 15,
      isUnique: false,
      baseChance: 1,
    },
    {
      name: "ENDER_PEARL:&fEnder Pearl",
      quality: 5,
      isUnique: false,
      baseChance: 1,
    },
  ];
};

const dropChance = (item: LootItem, player: SimPlayer): number =>
  (item.perEye
    ? item.baseChance * player.summoning_eyes_placed
    : item.baseChance) *
  (item.name.includes("_ENDER_DRAGON")
    ? 1 + (player.magic_find + player.pet_luck) / 100
    : 1 + player.magic_find / 100);

const createSimPlayer = (player: EdPlayer): SimPlayer => {
  const placement = placementTable.find(
    ([start, end]) => player.placement >= start && player.placement <= end,
  );
  const rewards: string[] = [];
  const fallback = player.damage_dealt > 1 ? 8 : 10;
  const bonus =
    100 * player.summoning_eyes_placed +
    (100 * player.damage_dealt) / (player.first_place_damage || 1);
  if (!placement) return { ...player, rewards, quality: fallback + bonus };
  const [, , quality, pearls, enchanted] = placement;
  for (let i = 0; i < pearls; i++) rewards.push("ENDER_PEARL");
  for (let i = 0; i < enchanted; i++) rewards.push("ENCHANTED_ENDER_PEARL");
  return { ...player, rewards, quality: quality + bonus };
};

const simulateDragon = (dragon: string, players: SimPlayer[]): EdResult => {
  const items = dragonItems(dragon);
  const qualityOf = (name: string) =>
    items.find((item) => item.name === name)?.quality ?? 0;

  const ranked = [...players].sort((a, b) => b.quality - a.quality);
  for (const item of items.filter((item) => item.isUnique)) {
    const eligible = ranked.filter(
      (p) => p.quality >= item.quality && !p.rewards.includes(item.name),
    );
    const winners = eligible.filter((p) => Math.random() < dropChance(item, p));
    const chosen = winners[Math.floor(Math.random() * winners.length)];
    if (chosen) {
      chosen.rewards.push(item.name);
      chosen.quality -= item.quality;
    }
  }

  for (const player of players) {
    let remaining = player.quality;
    for (const item of items
      .filter((item) => !item.isUnique)
      .sort((a, b) => b.quality - a.quality)) {
      while (remaining >= item.quality) {
        player.rewards.push(item.name);
        remaining -= item.quality;
      }
    }
    player.quality = remaining;
  }

  for (const player of players) {
    if (Math.random() < (dragon === "superior" ? 0.00001 : 0.00002))
      player.rewards.push("DYE_PEARLESCENT");
  }
  for (const player of players) {
    for (let i = 0; i < (dragon === "superior" ? 10 : 5); i++)
      player.rewards.push("DRAGON_ESSENCE");
  }
  for (const player of players) {
    player.rewards.sort((a, b) => qualityOf(b) - qualityOf(a));
  }

  return {
    dragon_type: dragon,
    players: players.map((player) => ({
      quality: Math.round(player.quality * 100) / 100,
      rewards: player.rewards.reduce<Record<string, number>>((acc, name) => {
        acc[name] = (acc[name] ?? 0) + 1;
        return acc;
      }, {}),
    })),
  };
};

const damagerLabels = [
  "&e&l1st Damager &7&l- &cYou",
  "&6&l2nd Damager &7&l- &6Player1",
  "&c&l3rd Damager &7&l- &bPlayer2",
];
const rewardLabels = ["&cYou", "&6Player1", "&bPlayer2"];

export const simulateEd = async (
  ctx: Context,
  config: Config,
  args: string,
): Promise<SimResult> => {
  let request: EdRequest;
  if (args) {
    try {
      request = JSON.parse(args);
    } catch {
      throw new InputError("参数格式不正确，发送 /ed help 查看示例");
    }
  } else {
    const first = randInt(5000000, 6999999);
    request = {
      dragon_type: "random",
      players: [
        {
          placement: 1,
          summoning_eyes_placed: 4,
          damage_dealt: first,
          first_place_damage: first,
          magic_find: randInt(100, 149),
          pet_luck: randInt(100, 199),
        },
        {
          placement: 2,
          summoning_eyes_placed: 4,
          damage_dealt: randInt(3000000, 3999999),
          first_place_damage: first,
          magic_find: randInt(100, 199),
          pet_luck: randInt(100, 139),
        },
        {
          placement: 3,
          summoning_eyes_placed: 0,
          damage_dealt: randInt(1000000, 1999999),
          first_place_damage: first,
          magic_find: randInt(100, 199),
          pet_luck: randInt(100, 139),
        },
      ],
    };
  }
  if (!request || !Array.isArray(request.players) || !request.players.length)
    throw new InputError("players 不能为空");

  let dragon = (request.dragon_type ?? "random").toLowerCase();
  if (!dragon || dragon === "random") {
    dragon = rollWeighted(
      Object.keys(dragonWeights),
      (name) => dragonWeights[name],
    );
  }

  const ranked = [...request.players].sort(
    (a, b) => b.damage_dealt - a.damage_dealt,
  );
  const result = simulateDragon(dragon, request.players.map(createSimPlayer));

  let text =
    center("&a&l------------------------------\n", 65) +
    center(`&6&l${dragon.toUpperCase()} DRAGON DOWN!\n`, 75) +
    "\n\n" +
    ranked
      .slice(0, 3)
      .map(
        (player, i) =>
          center(
            `${damagerLabels[i]} &7&l- &e${new Intl.NumberFormat("en-US").format(player.damage_dealt)}\n`,
            75,
          ),
      )
      .join("") +
    "\n\n" +
    center(
      `&eYour Damage: &a${new Intl.NumberFormat("en-US").format(ranked[0].damage_dealt)} &7(Position #1)\n`,
      75,
    ) +
    center(`&eRunecrafting Experience: &d${randInt(400, 499)}\n`, 75) +
    "\n\n" +
    center("&a&l------------------------------\n", 65);

  const prices = await getPrices(ctx, config);
  if (!prices) throw new Error("价格数据获取失败");
  let profit = -(
    ranked[0].summoning_eyes_placed * (prices["SUMMONING_EYE"] ?? 0)
  );
  result.players.slice(0, 3).forEach((player, i) => {
    const first = Object.entries(player.rewards)[0];
    if (!first) return;
    const [key, value] = first;
    const parts = key.split(":");
    if (i === 0) profit += prices[parts[0]] ?? 0;
    text += `${rewardLabels[i]} &ehas Obtained &6${parts[1] ?? parts[0]}${value > 1 ? ` &7x${value}` : ""}\n`;
  });
  text += `&e[ATRI-BOT] Profit for &f${dragon[0].toUpperCase() + dragon.slice(1)} Dragon: ${profit <= 0 ? "&c" : "&6"}${compact.format(profit)}`;

  return { type: "dragon.png", profit, text };
};
