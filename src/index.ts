import { Context, Schema } from "koishi";
import { registerCn } from "./commands/cn";
import { registerEd } from "./commands/ed";
import { registerPurse } from "./commands/purse";
import { registerVg } from "./commands/vg";
import { fetchPrices } from "./service/prices";

export const name = "kaeman";

export const inject = ["database", "puppeteer"];

export interface Config {
  textRenderUrl: string;
  priceApiUrl: string;
  priceInterval: number;
}

export const Config: Schema<Config> = Schema.object({
  textRenderUrl: Schema.string()
    .required()
    .description("MinecraftTextRender 部署根地址"),
  priceApiUrl: Schema.string()
    .default(
      "https://raw.githubusercontent.com/SkyHelperBot/Prices/main/pricesV2.json",
    )
    .description("SkyHelperBot 价格 API JSON"),
  priceInterval: Schema.number()
    .min(1)
    .default(5)
    .description("价格刷新间隔(分钟)"),
});

export const apply = (ctx: Context, config: Config) => {
  ctx.model.extend(
    "kaeman_user",
    {
      id: "string(63)",
      purse: "integer(20)",
    },
    { primary: "id" },
  );

  ctx.setInterval(
    () => fetchPrices(ctx, config),
    config.priceInterval * 60_000,
  );

  registerVg(ctx, config);
  registerCn(ctx, config);
  registerEd(ctx, config);
  registerPurse(ctx);
};
