import type { Context } from "koishi";

export interface KaemanUser {
  id: string;
  purse: number;
}

declare module "koishi" {
  interface Tables {
    kaeman_user: KaemanUser;
  }
}

export const getPurse = async (ctx: Context, uid: string): Promise<number> => {
  const [row] = await ctx.database.get("kaeman_user", { id: uid });
  return row?.purse ?? 0;
};

export const addPurse = async (
  ctx: Context,
  uid: string,
  delta: number,
): Promise<void> => {
  const purse = (await getPurse(ctx, uid)) + delta;
  await ctx.database.upsert("kaeman_user", [{ id: uid, purse }]);
};
