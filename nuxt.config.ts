import { defineNuxtConfig } from "nuxt/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const contentDir = path.resolve(__dirname, "content");

const slugify = (segment: string) =>
  segment
    .trim()
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/\s+/g, "-");

const collectContentRoutes = (dir: string, base: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes: string[] = [];
  for (const entry of entries) {
    const nextPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...collectContentRoutes(nextPath, [...base, entry.name]));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const parts = [...base, entry.name]
        .filter((p) => slugify(p) !== "index")
        .map((p) => slugify(p));
      if (parts.length) {
        routes.push("/" + parts.join("/"));
      }
    }
  }
  return routes;
};

const contentRoutes = collectContentRoutes(contentDir);

export default defineNuxtConfig({
  // Preserve the established Nuxt 3 root-level app structure after upgrading to Nuxt 4.
  srcDir: ".",
  dir: {
    app: "app",
  },
  // Lock behavior of presets/modules (Nitro, etc.) to avoid unexpected changes.
  compatibilityDate: "2026-01-28",
  modules: ["@nuxt/content"],
  css: ["~/assets/css/tokens.css", "~/assets/css/base.css", "~/assets/css/loading.css"],
  vite: {
    // Group browser requests only: SSR style chunks must keep Nuxt's own layout.
    $client: {
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  // Cache the Vue runtime independently from application updates.
                  name: "framework",
                  test: /[\\/]node_modules[\\/](?:vue|@vue|vue-router)[\\/]/,
                  priority: 30,
                },
                {
                  name: "index",
                  tags: ["$initial"],
                },
              ],
            },
          },
        },
      },
    },
  },
  app: {
    head: {
      title: "Ruina.team",
      // Prevent white flash before CSS loads / hydration.
      htmlAttrs: { style: "background:#000" },
      bodyAttrs: { style: "background:#000" },
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0",
        },
      ],
      meta: [
        { name: "theme-color", content: "#09090b" },
        { name: "og:type", content: "website" },
        { name: "og:title", content: "Ruina.team" },
        {
          name: "og:description",
          content: "Guides, modpacks, chat tiers — единый хаб",
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "",
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
  },
  components: {
    dirs: ["~/components"],
  },
  content: {
    build: {
      markdown: {
        remarkPlugins: {
          [pathToFileURL(path.resolve(__dirname, "lib/remark-heading-ids.mjs")).href]: {},
        },
      },
    },
  },
  experimental: {
    // The native watcher avoids slow recursive scans on Windows.
    watcher: "parcel",
  },
  routeRules: {
    "/guides/**": { prerender: true },
  },
  nitro: {
    preset: "github-pages",
    // Use a stable, repo-friendly static output directory.
    // This also avoids Windows occasionally locking `.output` between runs.
    output: {
      dir: "dist",
    },
    rollupConfig: {
      plugins: [
        {
          name: "windows-file-url-normalizer",
          resolveId(id) {
            if (process.platform !== "win32" || !id.startsWith("file:///")) {
              return null;
            }

            try {
              return fileURLToPath(id);
            } catch {
              return null;
            }
          },
        },
      ],
    },
    prerender: {
      routes: Array.from(new Set(["/", "/guides", ...contentRoutes])),
      crawlLinks: true,
    },
  },
});
