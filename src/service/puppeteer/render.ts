import { h } from "koishi";
import type { Context } from "koishi";
import type {} from "@koishijs/plugin-puppeteer";
import { SimResult } from "../simulator";

export const renderMinecraft = async (
  ctx: Context,
  baseUrl: string,
  result: SimResult,
): Promise<h> => {
  const page = await ctx.puppeteer.page();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(
      `${baseUrl}/minecraft-text-render/?w=1920&type=${result.type}&text=${encodeURIComponent(Buffer.from(result.text).toString("base64"))}`,
      { waitUntil: "networkidle0" },
    );
    await page
      .waitForFunction(
        () =>
          (document.querySelector(".minecraft-text") as HTMLElement)?.dataset
            .fitted === "1",
        { polling: 50, timeout: 5000 },
      )
      .catch(() => {});
    const height = await page.evaluate(() =>
      Math.ceil(document.querySelector(".app").getBoundingClientRect().height),
    );
    await page.setViewport({ width: 1920, height });
    return h.image(await page.screenshot({ type: "png" }), "image/png");
  } finally {
    await page.close();
  }
};
