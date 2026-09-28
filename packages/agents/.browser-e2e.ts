import { readFile } from "node:fs/promises";
import { HttpSandboxProvider } from "@seltra/sandbox";
async function main() {
  for (const line of (await readFile("../../.env", "utf8")).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]!]) process.env[match[1]!] = match[2]!.trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  const sandbox = new HttpSandboxProvider(process.env.SANDBOX_WORKER_URL ?? "", process.env.SANDBOX_WORKER_TOKEN ?? "");
  const result = await sandbox.observe("cozy-oven-e2e-1790527489162", "https://starring-all-coming-miniature.trycloudflare.com", { routes: ["/", "/products", "/products/[id]", "/cart", "/checkout", "/contact"] });
  console.log(JSON.stringify(result, null, 2));
}
void main().catch((e) => { console.error(e instanceof Error ? e.message : "Browser observation failed"); process.exitCode = 1; });
