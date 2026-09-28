import { getSandbox, proxyToSandbox, type Sandbox as CloudflareSandbox } from "@cloudflare/sandbox";
import puppeteer from "@cloudflare/puppeteer";

export { Sandbox } from "@cloudflare/sandbox";

interface Env {
  Sandbox: DurableObjectNamespace<CloudflareSandbox>;
  BROWSER: Fetcher;
  ARTIFACTS: R2Bucket;
  AI_ACCOUNT_ID: string;
  AI_API_TOKEN: string;
  VISION_MODEL?: string;
  SANDBOX_TRANSPORT?: "http" | "websocket" | "rpc";
  INTERNAL_API_TOKEN: string;
  PREVIEW_DOMAIN?: string;
}

const json = (data: unknown, status = 200) => Response.json({ data }, { status });
const error = (message: string, status: number) => Response.json({ error: message }, { status });
const idPattern = /^[a-z0-9_-]{1,96}$/;
const workspacePath = (raw: string) => {
  const path = raw.replace(/\\/g, "/");
  if (!path || path.startsWith("/") || path.split("/").some((part) => part === ".." || part === ".") || path.includes("\0")) throw new Error("Invalid workspace path");
  return `/workspace/${path}`;
};
const quote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;
async function critiqueScreenshot(env: Env, screenshot: Uint8Array, prompt: string): Promise<string> {
  if (!env.AI_ACCOUNT_ID || !env.AI_API_TOKEN) throw new Error("Account 2 Workers AI credentials are not configured on the sandbox Worker");
  const model = env.VISION_MODEL ?? "@cf/qwen/qwen3.8-27b";
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.AI_ACCOUNT_ID)}/ai/run/${model.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.AI_API_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ prompt, image: Array.from(screenshot), max_tokens: 500 }),
  });
  if (!response.ok) throw new Error(`Account 2 Workers AI vision request failed (${response.status})`);
  const payload = await response.json() as { result?: { response?: string }; response?: string };
  const feedback = payload.result?.response ?? payload.response;
  if (!feedback) throw new Error("Workers AI vision model returned no critique");
  return feedback;
}
function parseId(pathname: string) {
  const match = pathname.match(/^\/workspaces\/([^/]+)(\/.*)?$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  return idPattern.test(id) ? { id, route: match[2] ?? "" } : null;
}
function getBoundSandbox(env: Env, id: string) {
  return getSandbox(env.Sandbox, `seltra-workspace-${id}`, { normalizeId: true });
}
function shellCommand(argv: unknown, cwd: unknown): string {
  if (!Array.isArray(argv) || argv.length < 1 || argv.length > 64 || !argv.every((part) => typeof part === "string" && part.length <= 4096)) throw new Error("Invalid argv");
  const [program, ...args] = argv as string[];
  const allowedPrograms = new Set(["npm", "pnpm", "node", "npx", "find", "mkdir", "rm", "env"]);
  if (!allowedPrograms.has(program)) throw new Error("Command is not allowed");
  if (program === "env" && !(args.length === 4 && args[0] === "SELTRA_REPAIR_BUILD=1" && args[1] === "npm" && args[2] === "run" && args[3] === "build")) {
    throw new Error("Only isolated repair builds may use env");
  }
  const workingDirectory = typeof cwd === "string" ? cwd : "/workspace";
  if (workingDirectory !== "/workspace" && !workingDirectory.startsWith("/workspace/")) throw new Error("Command cwd must stay inside /workspace");
  if (workingDirectory.split("/").includes("..")) throw new Error("Invalid command cwd");
  return `cd ${quote(workingDirectory)} && ${[program, ...args].map(quote).join(" ")}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const preview = await proxyToSandbox(request, env);
    if (preview) return preview;
    if (!env.INTERNAL_API_TOKEN || request.headers.get("authorization") !== `Bearer ${env.INTERNAL_API_TOKEN}`) return error("Unauthorized", 401);
    const target = parseId(new URL(request.url).pathname);
    if (!target) return error("Invalid workspace id", 400);
    const sandbox = getBoundSandbox(env, target.id);
    try {
      if (target.route === "" && request.method === "PUT") {
        await sandbox.mkdir("/workspace", { recursive: true });
        return json({ workspaceId: target.id, root: "/workspace" }, 201);
      }
      if (target.route === "/files" && request.method === "GET") {
        const result = await sandbox.exec("find /workspace -type f -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/.git/*' -not -path '*/.turbo/*' -print");
        if (!result.success) throw new Error(result.stderr || "Unable to list workspace files");
        return json(result.stdout.split("\n").filter(Boolean).map((path: string) => path.slice("/workspace/".length)));
      }
      if (target.route === "/files" && request.method === "PUT") {
        const body = await request.json() as { path?: string; content?: string };
        if (typeof body.path !== "string" || typeof body.content !== "string") return error("path and content are required", 400);
        if (body.content.length > 1_000_000) return error("File content exceeds the 1 MB limit", 413);
        const path = workspacePath(body.path);
        await sandbox.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
        await sandbox.writeFile(path, body.content);
        return json({ path: body.path }, 201);
      }
      if (target.route === "/directories" && request.method === "PUT") {
        const body = await request.json() as { path?: string };
        if (typeof body.path !== "string") return error("path is required", 400);
        await sandbox.mkdir(workspacePath(body.path), { recursive: true });
        return json({ path: body.path }, 201);
      }
      if (target.route === "/files/move" && request.method === "POST") {
        const body = await request.json() as { source?: string; destination?: string };
        if (!body.source || !body.destination) return error("source and destination are required", 400);
        await sandbox.moveFile(workspacePath(body.source), workspacePath(body.destination));
        return json({ moved: body.source, destination: body.destination });
      }
      if (target.route === "/files/copy" && request.method === "POST") {
        const body = await request.json() as { source?: string; destination?: string };
        if (!body.source || !body.destination) return error("source and destination are required", 400);
        const source = await sandbox.readFile(workspacePath(body.source));
        const destination = workspacePath(body.destination);
        await sandbox.mkdir(destination.slice(0, destination.lastIndexOf("/")), { recursive: true });
        await sandbox.writeFile(destination, source.content);
        return json({ copied: body.source, destination: body.destination });
      }
      if (target.route === "/files/content" && request.method === "GET") {
        const path = new URL(request.url).searchParams.get("path");
        if (!path) return error("path is required", 400);
        const file = await sandbox.readFile(workspacePath(path));
        return json(file.content);
      }
      if (target.route === "/files" && request.method === "DELETE") {
        const path = new URL(request.url).searchParams.get("path");
        if (!path) return error("path is required", 400);
        const result = await sandbox.exec(`rm -f -- ${quote(workspacePath(path))}`);
        if (!result.success) throw new Error(result.stderr || "Unable to delete file");
        return json({ deleted: path });
      }
      if (target.route === "/commands" && request.method === "POST") {
        const body = await request.json() as { argv?: unknown; cwd?: unknown };
        const result = await sandbox.exec(shellCommand(body.argv, body.cwd));
        return json({ success: result.success, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr });
      }
      if (target.route === "/processes" && request.method === "GET") return json(await sandbox.listProcesses());
      if (target.route === "/processes" && request.method === "POST") {
        const body = await request.json() as { argv?: unknown; cwd?: unknown };
        const process = await sandbox.startProcess(shellCommand(body.argv, body.cwd));
        return json({ processId: process.id }, 201);
      }
      if (target.route === "/processes" && request.method === "DELETE") {
        const processId = new URL(request.url).searchParams.get("id");
        if (!processId || !/^[a-zA-Z0-9_-]{1,128}$/.test(processId)) return error("Valid process id is required", 400);
        await sandbox.killProcess(processId);
        return json({ stopped: processId });
      }
      if (target.route === "/preview" && request.method === "POST") {
        const body = await request.json() as { port?: number; argv?: unknown };
        if (!Number.isInteger(body.port) || (body.port ?? 0) < 1024 || (body.port ?? 0) > 65535 || body.port === 3000) return error("Preview port is invalid", 400);
        const argv = body.argv ?? ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", String(body.port)];
        const command = shellCommand(argv, "/workspace");
        const running = await sandbox.listProcesses();
        for (const process of running) if (/npm run dev/.test(process.command)) await sandbox.killProcess(process.id);
        const process = await sandbox.startProcess(command);
        const tunnel = await sandbox.tunnels.get(body.port!);
        const url = tunnel.url;
        let ready = false;
        for (let attempt = 0; attempt < 20 && !ready; attempt++) {
          try { const response = await fetch(url, { signal: AbortSignal.timeout(2_000) }); ready = response.status < 500; } catch { await new Promise((resolve) => setTimeout(resolve, 1_000)); }
        }
        if (!ready) { await sandbox.killProcess(process.id); throw new Error("Preview process did not become healthy within 20 seconds"); }
        return json({ url, processId: process.id });
      }
      if (target.route === "/browser" && request.method === "POST") {
        const body = await request.json() as { url?: string; width?: number; height?: number; routes?: string[]; critiqueContext?: string };
        if (typeof body.url !== "string") return error("url is required", 400);
        const destination = new URL(body.url);
        if (destination.protocol !== "https:" || !destination.hostname.endsWith(".trycloudflare.com")) return error("Browser can only inspect a Cloudflare preview tunnel", 400);
        const browser = await puppeteer.launch(env.BROWSER);
        try {
          const page = await browser.newPage();
          await page.setViewport({ width: Math.min(Math.max(body.width ?? 1440, 320), 1920), height: Math.min(Math.max(body.height ?? 1000, 480), 1600) });
          const consoleErrors: string[] = [];
          const failedRequests: string[] = [];
          const badResponses: string[] = [];
          page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
          page.on("pageerror", (cause) => consoleErrors.push(cause.message));
          page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "failed"}`));
          page.on("response", (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
          const routes = ["", ...(body.routes ?? []).filter((route) => typeof route === "string" && route.startsWith("/") && !route.startsWith("//"))];
          const observations = [];
          let visualCritique: { status: string; feedback?: string; error?: string } = { status: "captured" };
          for (const [index, route] of [...new Set(routes)].entries()) {
            const url = new URL(route, destination).toString();
            const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
            const dom = await page.evaluate(() => ({ title: document.title, text: document.body.innerText.slice(0, 8000), links: [...document.querySelectorAll("a")].map((a) => ({ text: a.innerText.trim(), href: a.getAttribute("href") })), buttons: [...document.querySelectorAll("button")].map((button) => button.innerText.trim()).filter(Boolean), forms: document.querySelectorAll("form").length, images: [...document.images].map((image) => ({ src: image.currentSrc, loaded: image.complete && image.naturalWidth > 0 })) }));
            const screenshot = await page.screenshot({ type: "jpeg", quality: 75, fullPage: true });
            const screenshotKey = `workspaces/${target.id}/screenshots/${Date.now()}-${index}.jpg`;
            await env.ARTIFACTS.put(screenshotKey, screenshot, { httpMetadata: { contentType: "image/jpeg" } });
            observations.push({ url, httpStatus: response?.status() ?? null, dom, screenshotKey, viewport: page.viewport() });
            const feedback = await critiqueScreenshot(env, screenshot, `Critique this real rendered commerce application screenshot against the merchant intent and design direction. Name concrete visual hierarchy, readability, spacing, contrast, layout, content or responsive issues; return actionable CSS/component changes. Do not praise generically.\n\nContext:\n${body.critiqueContext ?? "No additional design context"}`);
            visualCritique = { status: "evaluated", feedback };
          }
          return json({ routes: observations, consoleErrors, failedRequests, badResponses, visualCritique, capturedAt: new Date().toISOString() });
        } finally { await browser.close(); }
      }
      return error("Not found", 404);
    } catch (cause) {
      return error(cause instanceof Error ? cause.message : "Sandbox operation failed", 502);
    }
  },
};
