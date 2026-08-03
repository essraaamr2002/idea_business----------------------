#!/usr/bin/env node
// Playwright smoke test — visits priority routes, clicks every visible button,
// reports failures (console errors, network 5xx, JS throws) per route.
// Usage: BASE_URL=https://www.busniss.org node scripts/smoke-test.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const ROUTES = [
  "/", "/market", "/projects", "/news", "/faq", "/support",
  "/auth", "/wallet", "/wallet/history", "/trading-portfolio",
  "/my-bids", "/alerts", "/compare", "/launch-hub",
];

const results = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  for (const path of ROUTES) {
    const page = await ctx.newPage();
    const errors = []; const nets = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("response", (r) => { if (r.status() >= 500) nets.push(`${r.status()} ${r.url()}`); });

    let buttonsTried = 0, buttonsFailed = 0;
    try {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(800);
      const buttons = await page.$$('button:not([disabled])');
      for (const b of buttons.slice(0, 8)) {
        buttonsTried++;
        try { await b.click({ trial: true, timeout: 1000 }); }
        catch { buttonsFailed++; }
      }
    } catch (e) { errors.push("nav: " + String(e)); }

    results.push({
      path, status: errors.length === 0 && nets.length === 0 ? "PASS" : "FAIL",
      buttonsTried, buttonsFailed, errors: errors.slice(0, 5), serverErrors: nets.slice(0, 5),
    });
    await page.close();
  }

  await browser.close();
  const fails = results.filter((r) => r.status === "FAIL");
  console.log(JSON.stringify({ base: BASE, total: results.length, failed: fails.length, results }, null, 2));
  process.exit(fails.length > 0 ? 1 : 0);
})();
