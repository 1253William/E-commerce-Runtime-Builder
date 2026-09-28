import { readFile } from "node:fs/promises";
import { Builder } from "./src/builder.js";
import { CloudflareAIProvider } from "@seltra/ai";
import { HttpSandboxProvider } from "@seltra/sandbox";
async function main() {
  for (const line of (await readFile("../../.env", "utf8")).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]!]) process.env[match[1]!] = match[2]!.trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  const builder = new Builder(new HttpSandboxProvider(process.env.SANDBOX_WORKER_URL ?? "", process.env.SANDBOX_WORKER_TOKEN ?? ""), new CloudflareAIProvider());
  const result = await builder.execute({ modelType: "build", objective: "Build a modern mobile-first online bakery store for a Ghanaian bakery called Cozy Oven. Customers should browse cakes and pastries, view product details, add items to cart, choose pickup or delivery, and submit an order. The brand should feel warm, premium and trustworthy. Include a home page, product browsing, cart/order flow, and contact information." }, { storeId: `cozy-oven-e2e-${Date.now()}` });
  console.log(JSON.stringify({ status: result.status, ...(result.output as object) }, null, 2));
  if (result.status !== "success") process.exitCode = 1;
}
void main().catch((e) => { console.error(e instanceof Error ? e.message : "E2E failed"); process.exitCode = 1; });
