import type { Context } from "koishi";
import type { Prices } from "../../utils";
import { logError } from "../../error/handle";

let cache: Prices | null = null;

export const fetchPrices = async (
  ctx: Context,
): Promise<Prices | null> => {
  const logger = ctx.logger("kaeman");
  logger.debug("fetching prices from %s", ctx.config.priceApiUrl);
  try {
    cache = await ctx.http.get<Prices>(ctx.config.priceApiUrl, {
      responseType: "json",
    });
    logger.info("prices updated (%d items)", Object.keys(cache).length);
  } catch (err) {
    logError(ctx, err, "Failed to fetch prices; using cached data if available", "warn");
  }
  return cache;
};

export const getPrices = (
  ctx: Context,
): Promise<Prices | null> =>
  cache ? Promise.resolve(cache) : fetchPrices(ctx);
