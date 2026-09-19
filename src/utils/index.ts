import type { Context, Session } from "koishi";
import { Item } from "../service/simulator";

export type Prices = Record<string, number>;

export class InputError extends Error {}

export const handleError = async (
  ctx: Context,
  session: Session,
  err: unknown,
  command: string,
) => {
  if (err instanceof InputError)
    return session.send(err.message).catch(() => {});
  ctx.logger("kaeman").error("[%s] 执行失败", command, err);
  await session.send("操作失败，请稍后再试。").catch(() => {});
};

export const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const randInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

export const rollWeighted = <T>(
  items: readonly T[],
  weight: (item: T) => number,
): T => {
  let roll = Math.random() * items.reduce((sum, item) => sum + weight(item), 0);
  for (const item of items) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
};

export const mergeItems = (items: Item[]): Item[] =>
  [...Map.groupBy(items, ({ id }) => id).values()].map((group) =>
    group.reduce((sum, item) => ({
      ...sum,
      quantity: sum.quantity + item.quantity,
    })),
  );

export const formatProfit = (
  prices: Prices | null,
  items: Item[],
  costIds: string[],
) => {
  if (!prices) return { text: "&4unknown", profit: 0 };
  const profit = items.reduce(
    (sum, { id, quantity }) => sum + (prices[id] ?? 0) * quantity,
    -costIds.reduce((sum, id) => sum + (prices[id] ?? 0), 0),
  );
  return { text: (profit <= 0 ? "&c" : "&6") + compact.format(profit), profit };
};

export const center = (text: string, width: number) =>
  text.length >= width ? text : " ".repeat(Math.floor((width - text.length) / 2)) + text;
