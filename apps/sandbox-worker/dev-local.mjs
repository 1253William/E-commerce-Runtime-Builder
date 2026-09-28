import { spawn } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workerDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(workerDir, "../../.env");
const devVarsPath = path.join(workerDir, ".dev.vars");

function parseEnv(source) {
  const parsed = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "").trim();
    parsed[match[1]] = value;
  }
  return parsed;
}

const env = parseEnv(await readFile(rootEnvPath, "utf8"));
const required = [
  "CLOUDFLARE_ACCOUNT_ID-1",
  "CLOUDFLARE_API_TOKEN-1",
  "CLOUDFLARE_ACCOUNT_ID-2",
  "CLOUDFLARE_API_TOKEN-2",
  "SANDBOX_WORKER_TOKEN",
];
for (const name of required) {
  if (!env[name] || /your-subdomain|replace-with|placeholder|change-me|example/i.test(env[name])) {
    throw new Error(`Set a real value for ${name} in the root .env before starting local sandbox development`);
  }
}
if (env["CLOUDFLARE_ACCOUNT_ID-1"] === env["CLOUDFLARE_ACCOUNT_ID-2"]) {
  throw new Error("Account 1 and account 2 IDs must be distinct");
}
let originalDevVars;
try {
  originalDevVars = await readFile(devVarsPath, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const managedVars = {
  INTERNAL_API_TOKEN: env.SANDBOX_WORKER_TOKEN,
  AI_ACCOUNT_ID: env["CLOUDFLARE_ACCOUNT_ID-2"],
  AI_API_TOKEN: env["CLOUDFLARE_API_TOKEN-2"],
};
const existingVars = parseEnv(originalDevVars ?? "");
for (const [name, value] of Object.entries(managedVars)) {
  if (existingVars[name] && existingVars[name] !== value) {
    throw new Error(`apps/sandbox-worker/.dev.vars has a different ${name}; align it with the root .env before starting local sandbox development`);
  }
}
const missingVars = Object.entries(managedVars).filter(([name]) => !existingVars[name]);
if (missingVars.length) {
  const separator = originalDevVars && !originalDevVars.endsWith("\n") ? "\n" : "";
  await writeFile(devVarsPath, `${originalDevVars ?? ""}${separator}${missingVars.map(([name, value]) => `${name}=${value}`).join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const devArgs = process.argv.slice(2).filter((argument) => argument !== "--");
console.log("Starting local Wrangler + Docker sandbox; account 1 authenticates remote bindings and account 2 serves Workers AI.");
console.log(devArgs.includes("--local")
  ? "Worker, Container, R2, and Browser Run bindings all use local simulations for this run."
  : "Worker and Containers run locally. Remote R2 and Browser Run bindings use account 1.");
const child = spawn(command, ["exec", "wrangler", "dev", "--config", "wrangler.toml", ...devArgs], {
  cwd: workerDir,
  env: {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: env["CLOUDFLARE_ACCOUNT_ID-1"],
    CLOUDFLARE_API_TOKEN: env["CLOUDFLARE_API_TOKEN-1"],
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  if (missingVars.length) {
    if (originalDevVars === undefined) await unlink(devVarsPath).catch(() => {});
    else await writeFile(devVarsPath, originalDevVars, { encoding: "utf8", mode: 0o600 });
  }
}
process.once("SIGINT", () => child.kill("SIGINT"));
process.once("SIGTERM", () => child.kill("SIGTERM"));
child.once("error", async (error) => {
  await cleanup();
  console.error(`Unable to start Wrangler: ${error.message}`);
  process.exitCode = 1;
});
child.once("close", async (code, signal) => {
  await cleanup();
  process.exitCode = code ?? (signal ? 1 : 0);
});
