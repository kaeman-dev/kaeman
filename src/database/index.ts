import type { Context } from "koishi";

declare module "koishi" {
  interface Tables {
    "kaeman.user": { aid: number; purseCents: number };
    "kaeman.user.purse.history": {
      id: number;
      aid: number;
      deltaCents: number;
      source: string;
      createdAt: Date;
    };
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
  ctx.model.extend(
    "kaeman.user.purse.history",
    {
      id: { type: "unsigned", length: 8, nullable: false },
      aid: { type: "unsigned", length: 8, nullable: false },
      deltaCents: { type: "integer", length: 8, nullable: false },
      source: { type: "string", length: 32, nullable: false },
      createdAt: { type: "timestamp", nullable: false },
    },
    { primary: "id", autoInc: true },
  );
};
