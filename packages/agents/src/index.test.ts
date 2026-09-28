import assert from "node:assert/strict";
import test from "node:test";
import { AgentRegistry, AgentRuntime, Builder, CommerceAgent } from "./index.js";
import type { AIProvider } from "@seltra/ai";
import type { SandboxProvider } from "@seltra/sandbox";

test("flow runtime executes registered tasks in declared order and records observations", async () => {
  const order: string[] = [];
  const registry = new AgentRegistry().register({ id: "one", async execute() { order.push("one"); return { status: "success", output: { ready: true } }; } })
    .register({ id: "two", async execute() { order.push("two"); return { status: "success", output: { built: true } }; } });
  const runtime = new AgentRuntime(registry)
    .registerTask({ id: "understand", agentId: "one", objective: "understand", modelType: "intent" })
    .registerTask({ id: "build", agentId: "two", objective: "build", modelType: "build" })
    .registerFlow({ id: "build-flow", steps: [{ taskId: "understand" }, { taskId: "build", dependsOn: ["understand"] }] });
  const observations = await runtime.runFlow("build-flow", {});
  assert.deepEqual(order, ["one", "two"]);
  assert.equal(observations.length, 2);
  assert.equal(observations[1].status, "success");
});

test("builder writes model-produced files, runs a real build and starts preview", async () => {
  const actions: string[] = [];
  const previousBuilderModel = process.env.AI_MODEL_BUILDER;
  delete process.env.AI_MODEL_BUILDER;
  const contents = new Map<string, string>([["package.json", JSON.stringify({ dependencies: { next: "^15.5.4", react: "^19.1.1", "react-dom": "^19.1.1" }, scripts: { dev: "next dev", build: "next build", start: "next start" } })], ["app/page.tsx", "export default function Page() { return <main/> }"], ["app/globals.css", "body { margin: 0 }"]]);
  const sandbox: SandboxProvider = {
    async ensureWorkspace() { actions.push("ensure"); }, async listFiles() { return [...contents.keys()]; },
    async createDirectory() {}, async readFile(_id, path) { return contents.get(path) ?? ""; }, async writeFile(_id, path, content) { actions.push(`write:${path}`); contents.set(path, content); }, async deleteFile() {}, async moveFile() {}, async copyFile() {}, async startProcess() { return { processId: "" }; }, async listProcesses() { return []; }, async stopProcess() {},
    async execute(_id, argv) { actions.push(argv.join(" ")); return { success: true, exitCode: 0, stdout: "ok", stderr: "" }; },
    async startPreview() { actions.push("preview"); return { url: "https://preview.example", processId: "proc-1" }; }, async observe() { throw new Error("unused"); }, async snapshot() { return []; },
  };
  let call = 0;
  const generated = [
    { path: "package.json", content: JSON.stringify({ name: "ordering-app", scripts: { dev: "next dev", build: "next build", start: "next start" } }) },
    { path: "app/layout.tsx", content: 'import "./globals.css"; import { Inter } from "next/font/google"; const inter = Inter({ subsets: ["latin"] }); export default function Layout({ children }) { return <html><body className={inter.className}>{children}</body></html> }' },
    { path: "app/page.tsx", content: 'import type { FieldValues } from "react-hook-form"; export default function Page() { const form: FieldValues = {}; return <main>{Object.keys(form).length}</main> }' },
    { path: "app/globals.css", content: "body { margin: 0 }" },
  ];
  let selectedModel = "";
  const ai = { async generateStructured(input: { model?: string }) { selectedModel = input.model ?? ""; call++; return call === 1 ? { router: "app", routes: ["/"], files: generated.map(({ path }) => ({ path, purpose: path, language: path.endsWith("tsx") ? "tsx" : path.endsWith("css") ? "css" : "json", imports: [] })), dependencies: [], requirements: [] } : { files: generated, routes: ["/"] }; } } as unknown as AIProvider;
  const result = await new Builder(sandbox, ai).execute({ objective: "Build an ordering app", modelType: "build" }, { storeId: "workspace-1" });
  if (previousBuilderModel === undefined) delete process.env.AI_MODEL_BUILDER; else process.env.AI_MODEL_BUILDER = previousBuilderModel;
  assert.equal(result.status, "success", JSON.stringify(result.output));
  assert.equal(selectedModel, "@cf/openai/gpt-oss-120b");
  assert.deepEqual(actions, ["ensure", "write:package.json", "write:app/layout.tsx", "write:app/page.tsx", "write:app/globals.css", "write:next.config.js", "npm install --no-audit --no-fund", "npm run build", "preview"]);
  assert.equal((result.output as { previewUrl: string }).previewUrl, "https://preview.example");
  assert.match(contents.get("next.config.js")!, /SELTRA_REPAIR_BUILD/);
  assert.match(contents.get("next.config.js")!, /\.next-repair/);
  assert.doesNotMatch(contents.get("app/layout.tsx")!, /next\/font\/google/);
  assert.match(JSON.parse(contents.get("package.json")!).dependencies["react-hook-form"], /latest/);
});

test("builder never reports success when no execution providers are configured", async () => {
  const result = await new Builder().execute({ objective: "Build a storefront", modelType: "build" }, { storeId: "workspace-1" });
  assert.equal(result.status, "failed");
});

test("flow skips unneeded research while keeping downstream dependencies valid", async () => {
  const called: string[] = [];
  const registry = new AgentRegistry()
    .register({ id: "researcher", async execute() { called.push("research"); return { status: "success", output: {} }; } })
    .register({ id: "planner", async execute() { called.push("plan"); return { status: "success", output: { ready: true } }; } });
  const runtime = new AgentRuntime(registry)
    .registerTask({ id: "research", agentId: "researcher", objective: "research", modelType: "summarization" })
    .registerTask({ id: "plan", agentId: "planner", objective: "plan", modelType: "planning" })
    .registerFlow({ id: "conditional", steps: [{ taskId: "research", when: { taskId: "route", path: "researchRequired", equals: true } }, { taskId: "plan", dependsOn: ["research"] }] });
  const observations = await runtime.runFlow("conditional", {}, undefined, undefined, { route: { researchRequired: false } });
  assert.deepEqual(called, ["plan"]);
  assert.equal(observations.length, 1);
});

test("commerce specialist reads scoped catalog records and returns a typed blueprint", async () => {
  const calls: string[] = [];
  let aiContext = "";
  const ai = { async generateStructured(input: { context?: string }) { aiContext = input.context ?? ""; return { capabilities: ["services", "appointments"] }; } } as unknown as AIProvider;
  const tools = {
    async listProducts(storeId: string, merchantId: string) { calls.push(`products:${storeId}:${merchantId}`); return []; },
    async listCollections(storeId: string, merchantId: string) { calls.push(`collections:${storeId}:${merchantId}`); return []; },
    async listRecords(storeId: string, merchantId: string) { calls.push(`records:${storeId}:${merchantId}`); return [{ type: "SERVICE", status: "active", data: { name: "Alterations" } }]; },
  };
  const result = await new CommerceAgent(ai, tools).execute({ objective: "Add appointment bookings", modelType: "planning" }, { storeId: "store-a", merchantId: "merchant-a", runId: "run-a" });
  assert.equal(result.status, "success");
  assert.deepEqual(calls, ["products:store-a:merchant-a", "collections:store-a:merchant-a", "records:store-a:merchant-a"]);
  assert.match(aiContext, /Alterations/);
});
