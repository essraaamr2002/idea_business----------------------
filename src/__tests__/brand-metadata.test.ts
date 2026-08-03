import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BRAND = "IDEA BUSINESS";
const FORBIDDEN = ["Fekra Business", "Idea Business"]; // old brand names must not appear in user-facing strings
const ROOT = join(process.cwd(), "src/routes/__root.tsx");

const rootSrc = readFileSync(ROOT, "utf8");

describe("Brand metadata — IDEA BUSINESS", () => {
  it("root <title> contains the new brand name", () => {
    const m = rootSrc.match(/title:\s*"([^"]+)"/);
    expect(m, "title meta entry not found").toBeTruthy();
    expect(m![1]).toContain(BRAND);
  });

  it("root description, og:site_name, og:title, twitter:title all carry the new brand", () => {
    for (const key of ["description", "og:site_name", "og:title", "twitter:title"]) {
      const re = new RegExp(`(?:name|property):\\s*"${key}"[^}]*content:\\s*"([^"]+)"`);
      const m = rootSrc.match(re);
      expect(m, `missing meta ${key}`).toBeTruthy();
      expect(m![1]).toContain(BRAND);
    }
  });

  it("root declares OG image, Twitter card, and keywords", () => {
    expect(rootSrc).toMatch(/property:\s*"og:image"[^}]*content:\s*"https:\/\/busniss\.org\/og-image\.jpg"/);
    expect(rootSrc).toMatch(/name:\s*"twitter:card"[^}]*content:\s*"summary_large_image"/);
    expect(rootSrc).toMatch(/name:\s*"keywords"[^}]*content:\s*"[^"]*IDEA BUSINESS/);
  });

  it("root links favicon, apple-touch-icon and manifest to existing public files", () => {
    for (const href of ["/favicon.ico", "/apple-touch-icon.png", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"]) {
      expect(rootSrc, `missing link href ${href}`).toContain(`href: "${href}"`);
    }
  });

  it("manifest.webmanifest uses the new brand and points to the new icons", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "public/manifest.webmanifest"), "utf8"));
    expect(manifest.name).toContain(BRAND);
    expect(manifest.short_name).toContain(BRAND);
    const srcs = (manifest.icons as Array<{ src: string }>).map((i) => i.src);
    expect(srcs).toEqual(expect.arrayContaining(["/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"]));
  });

  it("no public/* or src/* file contains the old brand names in metadata or UI strings", () => {
    // Tests run in node, so use a quick file walk via fs.
    const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
    const offenders: string[] = [];
    const exts = /\.(tsx?|jsx?|json|webmanifest|xml|yaml|yml|md|txt|html|css)$/i;
    const skip = /(node_modules|\.git|routeTree\.gen|dist|build|\.lovable|__tests__\/brand-metadata)/;
    function walk(dir: string) {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (skip.test(p)) continue;
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else if (exts.test(f)) {
          const txt = readFileSync(p, "utf8");
          for (const banned of FORBIDDEN) {
            if (txt.includes(banned)) offenders.push(`${p} :: ${banned}`);
          }
        }
      }
    }
    walk(join(process.cwd(), "src"));
    walk(join(process.cwd(), "public"));
    expect(offenders, `Old brand references found:\n${offenders.join("\n")}`).toEqual([]);
  });
});
