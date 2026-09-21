import type { Context } from "koishi";
import type { Config } from "#index.js";
import type { Prices } from "#utils/index.js";
import { logError } from "#error/handle.js";

let cache: Prices | null = null;

export const fetchPrices = async (ctx: Context, config: Config): Promise<Prices | null> => {
  const logger = ctx.logger("kaeman");
  logger.debug("fetching prices from %s", config.priceApiUrl);
  try {
    const data = await ctx.http.get<unknown>(config.priceApiUrl, {
      responseType: "json",
    });
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error("Price data must be an object of finite numbers");
    const prices = Object.fromEntries(
      Object.entries(data).map(([id, price]) => {
        if (typeof price !== "number" || !Number.isFinite(price))
          throw new Error(`Invalid price for ${id}`);
        return [id, price] as const;
      }),
    );
    cache = prices;
    logger.info("prices updated (%d items)", Object.keys(cache).length);
  } catch (err) {
    logError(ctx, err, "Failed to fetch prices; using cached data if available", "warn");
  }
  return cache;
};

export const getPrices = (ctx: Context, config: Config): Promise<Prices | null> =>
  cache ? Promise.resolve(cache) : fetchPrices(ctx, config);
