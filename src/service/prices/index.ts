import type { Context } from "koishi";
import type { Config } from "../../index";
import type { Prices } from "../../utils";

let cache: Prices | null = null;

export const fetchPrices = async (
  ctx: Context,
  config: Config,
): Promise<Prices | null> => {
  try {
    cache = await ctx.http.get<Prices>(config.priceApiUrl, {
      responseType: "json",
    });
  } catch (err) {
    ctx.logger("kaeman").warn("价格获取失败，沿用上次缓存", err);
  }
  return cache;
};

export const getPrices = (
  ctx: Context,
  config: Config,
): Promise<Prices | null> =>
  cache ? Promise.resolve(cache) : fetchPrices(ctx, config);
