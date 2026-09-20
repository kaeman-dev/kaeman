import { Context, Schema } from "koishi";
import type { Command } from "koishi";
import { registerCn } from "./commands/cn";
import { registerEd } from "./commands/ed";
import { registerPurse } from "./commands/purse";
import { registerVg } from "./commands/vg";
import * as userDatabase from "./database/kaeman.user";
import * as purseHistoryDatabase from "./database/kaeman.user.price.history";
import { withTrace } from "./error/trace";
import { registerErrorHandling } from "./error/handle";
import { fetchPrices } from "./service/prices";
import { createPurse } from "./service/purse";
import { createFF1 } from "./utils/ff1";
import enUS from "./locales/en-US.json";
import zhCN from "./locales/zh-CN.json";

export const name = "kaeman";

export const inject = ["database"];

export interface Config {
  priceApiUrl: string;
  priceInterval: number;
  ff1Key: string;
}

export const Config: Schema<Config> = Schema.object({
  priceApiUrl: Schema.string()
    .default(
      "https://raw.githubusercontent.com/SkyHelperBot/Prices/main/pricesV2.json",
    )
    .description("SkyHelperBot price API JSON"),
  priceInterval: Schema.number()
    .min(1)
    .default(5)
    .description("Price refresh interval (minutes)"),
  ff1Key: Schema.string()
    .role("secret")
    .required()
    .description("FF1 public UID encryption key, 64 hex characters (generate with openssl rand -hex 32)"),
});

export const apply = (ctx: Context, config: Config) => {
  const logger = ctx.logger("kaeman");
  ctx.i18n.define("en-US", enUS);
  ctx.i18n.define("zh-CN", zhCN);
  logger.info(
    "kaeman starting (priceApiUrl=%s, refresh=%d min)",
    config.priceApiUrl,
    config.priceInterval,
  );

  const commands = new Set<Command>();
  const isKaeman = (command?: Command | null): boolean => {
    for (let cmd = command; cmd; cmd = cmd.parent)
      if (commands.has(cmd)) return true;
    return false;
  };

  ctx.middleware((session, next) =>
    withTrace(async () => {
      const start = Date.now();
      try {
        return await next();
      } finally {
        const { argv } = session;
        if (argv?.command && isKaeman(argv.command))
          logger.debug(
            "cmd /%s finished in %dms",
            argv.command.name,
            Date.now() - start,
          );
      }
    }),
    true,
  );

  registerErrorHandling(ctx);
  ctx.plugin(userDatabase);
  ctx.plugin(purseHistoryDatabase);
  const purse = createPurse(ctx);
  const userIds = createFF1({
    key: config.ff1Key,
    length: 10,
    tweak: "kaeman:user:v1",
  });

  ctx.on("ready", () => {
    logger.info("kaeman ready: commands vg/cn/ed/purse registered");
  });

  ctx.on("dispose", () => {
    logger.info("kaeman disposed");
  });

  ctx.on("command/before-execute", (argv) => {
    if (!isKaeman(argv.command)) return;
    logger.info(
      "cmd /%s by %s (%s) in %s",
      argv.command.name,
      argv.session.username,
      argv.session.uid,
      argv.session.cid,
    );
  });

  ctx.setInterval(
    () => withTrace(() => fetchPrices(ctx)),
    config.priceInterval * 60_000,
  );

  commands.add(registerVg(ctx, config, purse));
  commands.add(registerCn(ctx, config, purse));
  commands.add(registerEd(ctx, config, purse));
  commands.add(registerPurse(ctx, purse, userIds, createFF1({
    key: config.ff1Key,
    length: 10,
    tweak: "kaeman:purse:v1",
  })));
};
