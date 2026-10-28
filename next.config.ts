import type { NextConfig } from "next";

// `cloudflare:workers` only exists inside a Cloudflare Worker. The Vercel build (`next build`, which sets
// VERCEL=1 or CQL_TARGET=vercel) swaps it for an empty stand-in so lib/platform.ts falls back to
// DATABASE_URL / process.env. The Cloudflare build (vinext) must keep the real module, so no alias there.
const vercel = process.env.VERCEL === "1" || process.env.CQL_TARGET === "vercel";
const stub = "./lib/cloudflare-stub.ts";

const nextConfig: NextConfig = vercel
  ? {
      turbopack: { resolveAlias: { "cloudflare:workers": stub } },
      serverExternalPackages: ["@libsql/client"],
      webpack(config) {
        config.resolve.alias = {
          ...config.resolve.alias,
          "cloudflare:workers": new URL(stub, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
        };
        return config;
      },
    }
  : {};

export default nextConfig;
