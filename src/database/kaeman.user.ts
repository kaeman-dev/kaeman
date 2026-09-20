import type { Context } from "koishi";

export interface KaemanUser {
  aid: number;
  purseCents: number;
}

declare module "koishi" {
  interface Tables {
    "kaeman.user": KaemanUser;
  }
}

export const apply = (ctx: Context) => {
  ctx.model.extend(
    "kaeman.user",
    {
      aid: { type: "unsigned", length: 8, nullable: false },
      purseCents: { type: "integer", length: 8, nullable: false, initial: 0 },
    },
    { primary: "aid" },
  );
};
