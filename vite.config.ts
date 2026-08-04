// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually:
//   tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro, componentTagger, VITE_* env, @ alias, dedupe, sandbox detection.
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Load server-only env (no VITE_ prefix) so server routes can read SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY, etc.
const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";

export default defineConfig({
  nitro: isVercel ? { preset: "vercel" } : undefined,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // Force hoisted entities@4.5.0 so React Email's htmlparser2 doesn't pick a nested v5+.
        "entities/lib/decode.js": path.resolve(process.cwd(), "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(process.cwd(), "node_modules/entities/lib/encode.js"),
        entities: path.resolve(process.cwd(), "node_modules/entities"),
      },
    },
  },
});
