// Runs the stock Next.js CLI for the Vercel target (npm run build:vercel | start:vercel | dev:vercel).
import { fileURLToPath } from "node:url";
process.env.CQL_TARGET = "vercel";
process.env.NEXT_TELEMETRY_DISABLED ??= "1";
const cli = new URL("../node_modules/next/dist/bin/next", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), ...process.argv.slice(2)];
await import(cli.href);
