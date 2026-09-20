import type { Context } from "koishi";

export interface PurseHistory {
  id: number;
  aid: number;
  deltaCents: number;
  source: string;
  createdAt: Date;
}

declare module "koishi" {
  interface Tables {
    "kaeman.user.purse.history": PurseHistory;
  }
}

export const apply = (ctx: Context) => {
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
