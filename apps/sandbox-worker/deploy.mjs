import { spawn } from "node:child_process";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workerDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(workerDir, "../../.env");
const baseConfigPath = path.join(workerDir, "wrangler.toml");
const deployConfigPath = path.join(workerDir, "wrangler.deploy.toml");

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

function runWrangler(args, { env, input } = {}) {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const child = spawn(command, ["exec", "wrangler", ...args], { cwd: workerDir, env, stdio: ["pipe", "pipe", "pipe"], shell: process.platform === "win32" });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(`wrangler ${args[0]} failed (${code}): ${(stderr || stdout).slice(-600)}`)));
    if (input !== undefined) child.stdin.end(`${input}\n`);
    else child.stdin.end();
  });
}

async function cloudflareRequest(accountId, token, route, init = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}${route}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const details = Array.isArray(payload.errors) ? payload.errors.map((item) => item.message).filter(Boolean).join("; ") : "";
    throw new Error(`Cloudflare account 1 API request failed (${response.status})${details ? `: ${details}` : ""}`);
  }
  return payload.result;
}

async function ensureBucket(accountId, token, name) {
  const page = await cloudflareRequest(accountId, token, "/r2/buckets?per_page=1000");
  const buckets = Array.isArray(page) ? page : page?.buckets ?? [];
  if (buckets.some((bucket) => bucket.name === name)) return;
  await cloudflareRequest(accountId, token, "/r2/buckets", { method: "POST", body: JSON.stringify({ name }) });
  console.log(`Created account 1 R2 bucket: ${name}`);
}

async function setSecret(env, name, value) {
  await runWrangler(["secret", "put", name], { env, input: value });
  console.log(`Configured Worker secret: ${name}`);
}

function replaceEnv(source, name, value) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const line = new RegExp(`^\\s*(?:export\\s+)?${escaped}\\s*=.*$`, "m");
  return line.test(source) ? source.replace(line, `${name}=${value}`) : `${source.replace(/\s*$/, "") }\n${name}=${value}\n`;
}

const source = await readFile(envPath, "utf8");
const config = parseEnv(source);
const account1Id = config["CLOUDFLARE_ACCOUNT_ID-1"];
const account1Token = config["CLOUDFLARE_API_TOKEN-1"];
const account2Id = config["CLOUDFLARE_ACCOUNT_ID-2"];
const account2Token = config["CLOUDFLARE_API_TOKEN-2"];
const internalToken = config.SANDBOX_WORKER_TOKEN;
const bucketName = config.R2_BUCKET_NAME;
for (const [key, value] of Object.entries({ "CLOUDFLARE_ACCOUNT_ID-1": account1Id, "CLOUDFLARE_API_TOKEN-1": account1Token, "CLOUDFLARE_ACCOUNT_ID-2": account2Id, "CLOUDFLARE_API_TOKEN-2": account2Token, SANDBOX_WORKER_TOKEN: internalToken, R2_BUCKET_NAME: bucketName })) {
  if (!value || /your-subdomain|replace-with|placeholder|change-me|example/i.test(value)) throw new Error(`Set a real value for ${key} in the root .env before deploying`);
}
if (account1Id === account2Id) throw new Error("Account 1 and account 2 IDs must be distinct");

if (process.argv.includes("--verify-roles")) {
  const [buckets, databases, scripts] = await Promise.all([
    cloudflareRequest(account1Id, account1Token, "/r2/buckets?per_page=1000"),
    cloudflareRequest(account1Id, account1Token, "/d1/database"),
    cloudflareRequest(account1Id, account1Token, "/workers/scripts"),
  ]);
  const bucketList = Array.isArray(buckets) ? buckets : buckets?.buckets ?? [];
  const dbList = Array.isArray(databases) ? databases : databases?.databases ?? [];
  const workerList = Array.isArray(scripts) ? scripts : scripts?.scripts ?? [];
  const model = config.AI_MODEL_DEFAULT ?? "@cf/meta/llama-3.1-8b-instruct";
  const modelResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account2Id)}/ai/run/${model.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { authorization: `Bearer ${account2Token}`, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Reply with OK." }] }),
  });
  console.log(`Account 1 R2 access: ${bucketList.some((item) => item.name === bucketName) ? "verified" : "bucket missing"}`);
  console.log(`Account 1 D1 access: ${dbList.some((item) => item.name === "seltra-db") ? "seltra-db verified" : "seltra-db not found"}`);
  console.log(`Account 1 Worker access: ${workerList.some((item) => item.id === "seltra-sandbox-worker" || item.script === "seltra-sandbox-worker") ? "sandbox Worker found" : "sandbox Worker not yet deployed"}`);
  console.log(`Account 2 Workers AI inference: ${modelResponse.ok ? "verified" : `request failed (${modelResponse.status})`}`);
  if (!modelResponse.ok) process.exitCode = 1;
  process.exit();
}

if (process.argv.includes("--ensure-r2")) {
  await ensureBucket(account1Id, account1Token, bucketName);
  await ensureBucket(account1Id, account1Token, `${bucketName}-preview`);
  console.log("Account 1 main and local-preview R2 buckets are ready.");
  process.exit(0);
}

if (process.argv.includes("--check")) {
  console.log("Cloudflare account roles are configured and distinct: account 1=execution/R2, account 2=Workers AI");
  console.log(`R2 bucket configured: ${bucketName}`);
  console.log("Sandbox shared token is configured; secret values were not displayed");
  process.exit(0);
}

const cloudflareEnv = { ...process.env, CLOUDFLARE_ACCOUNT_ID: account1Id, CLOUDFLARE_API_TOKEN: account1Token };
const originalConfig = await readFile(baseConfigPath, "utf8");
const r2Config = originalConfig
  .replace(/(bucket_name\s*=\s*)"[^"]+"/, `$1"${bucketName}"`)
  .replace(/(preview_bucket_name\s*=\s*)"[^"]+"/, `$1"${bucketName}-preview"`);
if (r2Config === originalConfig && !originalConfig.includes(`bucket_name = "${bucketName}"`)) throw new Error("Could not bind the account 1 R2 bucket from R2_BUCKET_NAME");
await writeFile(deployConfigPath, r2Config, "utf8");

try {
  await ensureBucket(account1Id, account1Token, bucketName);
  await ensureBucket(account1Id, account1Token, `${bucketName}-preview`);
  const deployed = await runWrangler(["deploy", "--config", path.basename(deployConfigPath)], { env: cloudflareEnv });
  const urlMatch = deployed.match(/https:\/\/[a-z0-9][a-z0-9.-]*\.workers\.dev/i);
  let workerUrl = urlMatch?.[0];
  if (!workerUrl) {
    const subdomainResult = await cloudflareRequest(account1Id, account1Token, "/workers/subdomain");
    if (typeof subdomainResult?.subdomain === "string" && subdomainResult.subdomain) workerUrl = `https://seltra-sandbox-worker.${subdomainResult.subdomain}.workers.dev`;
  }
  if (!workerUrl) throw new Error("Worker deployed, but Cloudflare returned no workers.dev URL; set SANDBOX_WORKER_URL to the deployment URL");

  await setSecret(cloudflareEnv, "INTERNAL_API_TOKEN", internalToken);
  await setSecret(cloudflareEnv, "AI_ACCOUNT_ID", account2Id);
  await setSecret(cloudflareEnv, "AI_API_TOKEN", account2Token);

  await writeFile(envPath, replaceEnv(source, "SANDBOX_WORKER_URL", workerUrl), "utf8");
  console.log(`Sandbox Worker deployed to account 1 and configured with account 2 Workers AI: ${workerUrl}`);
} finally {
  await unlink(deployConfigPath).catch(() => {});
}
