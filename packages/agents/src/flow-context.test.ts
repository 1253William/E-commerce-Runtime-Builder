import assert from "node:assert/strict";
import test from "node:test";
import { AgentRegistry, AgentRuntime } from "./core/runtime.js";
import { BrowserAgent } from "./browser.js";
import { Verifier } from "./verifier.js";
import type { SandboxProvider } from "@seltra/sandbox";

const view = { routes: [{ url: "https://x.trycloudflare.com/", httpStatus: 200, dom: { title: "Shop", text: "hi", images: [] }, screenshotKey: "k" }], consoleErrors: [], failedRequests: [], badResponses: [] };

test("browser and verifier receive prior task outputs through the real runtime", async () => {
  const observed: string[] = [];
  const sandbox = { async observe(_id: string, url: string) { observed.push(url); return view; } } as unknown as SandboxProvider;
  const registry = new AgentRegistry()
    .register({ id: "builder", async execute() { return { status: "success", output: { status: "built", routes: ["/"], build: { success: true }, previewUrl: "https://x.trycloudflare.com", previewProcessId: "p1" } }; } })
    .register(new BrowserAgent(sandbox))
    .register({ id: "critic", async execute() { return { status: "success", output: { passed: true, score: 90, issues: [], summary: "ok" } }; } })
    .register(new Verifier());
  const runtime = new AgentRuntime(registry)
    .registerTask({ id: "build", agentId: "builder", objective: "b", modelType: "build" })
    .registerTask({ id: "browser", agentId: "browser", objective: "o", modelType: "runtime" })
    .registerTask({ id: "critic", agentId: "critic", objective: "c", modelType: "vision" })
    .registerTask({ id: "verify", agentId: "verifier", objective: "v", modelType: "runtime" })
    .registerFlow({ id: "f", steps: [{ taskId: "build" }, { taskId: "browser", dependsOn: ["build"] }, { taskId: "critic", dependsOn: ["browser"] }, { taskId: "verify", dependsOn: ["critic"] }] });
  const results = await runtime.runFlow("f", { storeId: "s1", context: JSON.stringify({ workspaceFiles: [] }) }, "obj");
  assert.deepEqual(results.map((r) => r.status), ["success", "success", "success", "success"], JSON.stringify(results.map((r) => r.output)));
  assert.deepEqual(observed, ["https://x.trycloudflare.com", "https://x.trycloudflare.com"]);
  assert.equal((results[3].output as { passed: boolean }).passed, true);
});

test("browser still fails clearly when the build produced no preview URL", async () => {
  const result = await new BrowserAgent({} as SandboxProvider).execute({ objective: "o", modelType: "runtime", context: JSON.stringify({ build: { status: "built" } }) }, { storeId: "s1" });
  assert.equal(result.status, "failed");
});
