import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { PgBoss } from "pg-boss";
import { PrismaClient, type Prisma } from "@prisma/client";
import { AgentRegistry, AgentRuntime, AssetAgent, BrowserAgent, Builder, BusinessAnalystAgent, CommerceAgent, ContentAgent, Designer, HttpWebSearchTool, Planner, RepairAgent, ResearcherAgent, SupervisorAgent, TaskRunner, Verifier, VisualCriticAgent } from "@seltra/agents";
import { CloudflareAIProvider } from "@seltra/ai";
import { HttpSandboxProvider } from "@seltra/sandbox";

config({ path: "../../.env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for seltra-worker");

const boss = new PgBoss({ connectionString, supervise: true });
function describeQueueError(cause: unknown): unknown {
  if (cause instanceof Error) {
    const error = cause as Error & { code?: string; errors?: unknown[]; cause?: unknown };
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack,
      ...(error.cause === undefined ? {} : { cause: describeQueueError(error.cause) }),
      ...(error.errors === undefined ? {} : { errors: error.errors.map(describeQueueError) }),
    };
  }
  if (cause && typeof cause === "object") {
    const error = cause as { name?: unknown; code?: unknown; message?: unknown; stack?: unknown; cause?: unknown; errors?: unknown };
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack,
      ...(error.cause === undefined ? {} : { cause: describeQueueError(error.cause) }),
      ...(Array.isArray(error.errors) ? { errors: error.errors.map(describeQueueError) } : {}),
    };
  }
  return { message: String(cause) };
}
// PgBoss emits transient database/polling failures on its `error` event. Without a
// listener Node treats that EventEmitter event as fatal and kills the worker, leaving
// the UI polling a task that can no longer be completed.
boss.on("error", (cause: unknown) => {
  console.error(JSON.stringify({ event: "worker.queue.error", error: describeQueueError(cause) }));
});
const prisma = new PrismaClient();
const ai = new CloudflareAIProvider();
function failureMessage(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  try {
    const details = JSON.parse(message) as { phase?: string; exitCode?: number; stdout?: string; stderr?: string };
    if (details.phase === "install") {
      const output = [details.stderr, details.stdout].filter((part) => typeof part === "string" && part.trim()).join("\n").trim();
      return [
        `Dependency installation failed${typeof details.exitCode === "number" ? ` (exit ${details.exitCode})` : ""}.`,
        output || "The package manager returned no diagnostic output.",
      ].join("\n");
    }
  } catch { /* Keep non-JSON task errors as-is. */ }

  const nested = cause instanceof Error ? cause.cause : undefined;
  if (nested instanceof Error && !message.includes(nested.message)) return `${message}: ${nested.message}`;
  return message;
}

function createRuntime(sandbox: HttpSandboxProvider) {
  const researcher = new ResearcherAgent(ai, new HttpWebSearchTool());
  const observeCommerceRead = async <T>(toolName: string, storeId: string, runId: string | undefined, query: () => Promise<T>): Promise<T> => {
    const startedAt = new Date();
    try {
      const value = await query();
      if (runId) await prisma.toolExecution.create({ data: { id: randomUUID(), runId, toolName, status: "success", input: { storeId }, output: { resultCount: Array.isArray(value) ? value.length : 1 }, startedAt, finishedAt: new Date() } });
      return value;
    } catch (cause) {
      if (runId) await prisma.toolExecution.create({ data: { id: randomUUID(), runId, toolName, status: "failed", input: { storeId }, error: cause instanceof Error ? cause.message : "Commerce read failed", startedAt, finishedAt: new Date() } });
      throw cause;
    }
  };
  const agents = new AgentRegistry().register(new BusinessAnalystAgent(ai)).register(new SupervisorAgent(ai)).register(new Planner(ai)).register(researcher).register(new CommerceAgent(ai, {
    listProducts: async (storeId, merchantId, runId) => observeCommerceRead("commerce.products.list", storeId, runId, async () => {
      const rows = await prisma.product.findMany({ where: { storeId, store: { merchantId } }, select: { name: true, description: true, price: true, currency: true, inventory: true, status: true } });
      return rows.map((row) => ({ ...row, status: row.status.toLowerCase() }));
    }),
    listCollections: async (storeId, merchantId, runId) => observeCommerceRead("commerce.collections.list", storeId, runId, () => prisma.collection.findMany({ where: { storeId, store: { merchantId } }, select: { name: true, description: true } })),
    listRecords: async (storeId, merchantId, runId) => observeCommerceRead("commerce.records.list", storeId, runId, () => prisma.commerceRecord.findMany({ where: { storeId, merchantId }, select: { type: true, status: true, data: true }, take: 50, orderBy: { createdAt: "desc" } })),
  })).register(new ContentAgent(ai)).register(new AssetAgent(ai)).register(new Designer(ai)).register(new Builder(sandbox, ai, researcher)).register(new BrowserAgent(sandbox)).register(new Verifier()).register(new RepairAgent(sandbox, ai)).register(new VisualCriticAgent(ai));
  return new AgentRuntime(agents, new TaskRunner())
  .registerTask({ id: "intent", agentId: "business-analyst", objective: "Understand the merchant and model its business workflows", modelType: "intent" })
  .registerTask({ id: "supervisor", agentId: "supervisor", objective: "Choose the application flow and specialist crew", modelType: "planning" })
  .registerTask({ id: "research", agentId: "researcher", objective: "Resolve only necessary business knowledge gaps", modelType: "summarization" })
  .registerTask({ id: "plan", agentId: "planner", objective: "Understand the business and plan its application", modelType: "planning" })
  .registerTask({ id: "commerce", agentId: "commerce", objective: "Model commerce entities, capabilities, integrations, and workflows", modelType: "planning" })
  .registerTask({ id: "content", agentId: "content", objective: "Create business-specific application content", modelType: "design" })
  .registerTask({ id: "assets", agentId: "asset", objective: "Plan required visual assets and merchant inputs", modelType: "design" })
  .registerTask({ id: "design", agentId: "designer", objective: "Define an intentional design direction", modelType: "design" })
  .registerTask({ id: "build", agentId: "builder", objective: "Write and run the generated application", modelType: "build" })
  .registerTask({ id: "browser", agentId: "browser", objective: "Inspect the real application in a browser", modelType: "runtime" })
  .registerTask({ id: "critic", agentId: "visual-critic", objective: "Critique the real desktop and mobile screenshots", modelType: "vision" })
  .registerTask({ id: "verify", agentId: "verifier", objective: "Verify observed runtime behavior", modelType: "runtime" })
  .registerTask({ id: "repair-research-1", agentId: "researcher", objective: "Diagnose the first failed verification from its logs and observed evidence before repair", modelType: "summarization" })
  .registerTask({ id: "repair-1", agentId: "repair", objective: "Selectively repair the failed application", modelType: "code" })
  .registerTask({ id: "browser-1", agentId: "browser", objective: "Reinspect the repaired application", modelType: "runtime" })
  .registerTask({ id: "critic-1", agentId: "visual-critic", objective: "Critique the repaired screenshots", modelType: "vision" })
  .registerTask({ id: "verify-1", agentId: "verifier", objective: "Verify the first repair", modelType: "runtime" })
  .registerTask({ id: "repair-research-2", agentId: "researcher", objective: "Diagnose the second failed verification from its logs and observed evidence before repair", modelType: "summarization" })
  .registerTask({ id: "repair-2", agentId: "repair", objective: "Selectively repair the application", modelType: "code" })
  .registerTask({ id: "browser-2", agentId: "browser", objective: "Reinspect the application", modelType: "runtime" })
  .registerTask({ id: "critic-2", agentId: "visual-critic", objective: "Critique the second repair screenshots", modelType: "vision" })
  .registerTask({ id: "verify-2", agentId: "verifier", objective: "Verify the second repair", modelType: "runtime" })
  .registerTask({ id: "repair-research-3", agentId: "researcher", objective: "Diagnose the final failed verification from its logs and observed evidence before repair", modelType: "summarization" })
  .registerTask({ id: "repair-3", agentId: "repair", objective: "Selectively repair the application", modelType: "code" })
  .registerTask({ id: "browser-3", agentId: "browser", objective: "Capture the final application state", modelType: "runtime" })
  .registerTask({ id: "critic-3", agentId: "visual-critic", objective: "Critique the final application screenshots", modelType: "vision" })
  .registerTask({ id: "verify-3", agentId: "verifier", objective: "Perform final application verification", modelType: "runtime" })
  .registerTask({ id: "route-intent", agentId: "business-analyst", objective: "Understand the merchant and model its business workflows", modelType: "intent" })
  .registerTask({ id: "route-supervisor", agentId: "supervisor", objective: "Choose the application flow and specialist crew", modelType: "planning" })
  .registerCrew({ id: "BuildCrew", taskIds: ["plan", "commerce", "content", "assets", "design", "build", "browser", "critic", "verify"] })
  .registerCrew({ id: "RepairCrew", taskIds: ["repair-research-1", "repair-1", "browser-1", "critic-1", "verify-1", "repair-research-2", "repair-2", "browser-2", "critic-2", "verify-2", "repair-research-3", "repair-3", "browser-3", "critic-3", "verify-3"] })
  .registerFlow({ id: "routing", steps: [{ taskId: "route-intent" }, { taskId: "route-supervisor", dependsOn: ["route-intent"] }] })
  .registerFlow({ id: "application-build", steps: [
    { taskId: "research", when: { taskId: "route-supervisor", path: "researchRequired", equals: true } },
    { taskId: "plan", dependsOn: ["route-intent", "route-supervisor"] }, { taskId: "commerce", dependsOn: ["plan"] }, { taskId: "content", dependsOn: ["plan"] }, { taskId: "design", dependsOn: ["plan", "commerce", "content"] }, { taskId: "assets", dependsOn: ["design"] }, { taskId: "build", dependsOn: ["design", "assets", "commerce", "content"] }, { taskId: "browser", dependsOn: ["build"] }, { taskId: "critic", dependsOn: ["browser"] }, { taskId: "verify", dependsOn: ["critic"] },
    { taskId: "repair-research-1", dependsOn: ["verify"], when: { taskId: "verify", path: "passed", equals: false }, continueOnFailure: true },
    { taskId: "repair-1", dependsOn: ["repair-research-1"], when: { taskId: "verify", path: "passed", equals: false } },
    { taskId: "browser-1", dependsOn: ["repair-1"], when: { taskId: "verify", path: "passed", equals: false } },
    { taskId: "critic-1", dependsOn: ["browser-1"], when: { taskId: "verify", path: "passed", equals: false } },
    { taskId: "verify-1", dependsOn: ["critic-1"], when: { taskId: "verify", path: "passed", equals: false } },
    { taskId: "repair-research-2", dependsOn: ["verify-1"], when: { taskId: "verify-1", path: "passed", equals: false }, continueOnFailure: true },
    { taskId: "repair-2", dependsOn: ["repair-research-2"], when: { taskId: "verify-1", path: "passed", equals: false } },
    { taskId: "browser-2", dependsOn: ["repair-2"], when: { taskId: "verify-1", path: "passed", equals: false } },
    { taskId: "critic-2", dependsOn: ["browser-2"], when: { taskId: "verify-1", path: "passed", equals: false } },
    { taskId: "verify-2", dependsOn: ["critic-2"], when: { taskId: "verify-1", path: "passed", equals: false } },
    { taskId: "repair-research-3", dependsOn: ["verify-2"], when: { taskId: "verify-2", path: "passed", equals: false }, continueOnFailure: true },
    { taskId: "repair-3", dependsOn: ["repair-research-3"], when: { taskId: "verify-2", path: "passed", equals: false } },
    { taskId: "browser-3", dependsOn: ["repair-3"], when: { taskId: "verify-2", path: "passed", equals: false } },
    { taskId: "critic-3", dependsOn: ["browser-3"], when: { taskId: "verify-2", path: "passed", equals: false } },
    { taskId: "verify-3", dependsOn: ["critic-3"], when: { taskId: "verify-2", path: "passed", equals: false } },
  ] })
  .registerFlow({ id: "iterative-change", steps: [
    { taskId: "research", when: { taskId: "route-supervisor", path: "researchRequired", equals: true } },
    { taskId: "plan", dependsOn: ["route-intent", "route-supervisor"] }, { taskId: "commerce", dependsOn: ["plan"] }, { taskId: "content", dependsOn: ["plan"] }, { taskId: "design", dependsOn: ["plan", "commerce", "content"] }, { taskId: "assets", dependsOn: ["design"] }, { taskId: "build", dependsOn: ["design", "assets", "commerce", "content"] }, { taskId: "browser", dependsOn: ["build"] }, { taskId: "critic", dependsOn: ["browser"] }, { taskId: "verify", dependsOn: ["critic"] },
    { taskId: "repair-research-1", dependsOn: ["verify"], when: { taskId: "verify", path: "passed", equals: false }, continueOnFailure: true }, { taskId: "repair-1", dependsOn: ["repair-research-1"], when: { taskId: "verify", path: "passed", equals: false } }, { taskId: "browser-1", dependsOn: ["repair-1"], when: { taskId: "verify", path: "passed", equals: false } }, { taskId: "critic-1", dependsOn: ["browser-1"], when: { taskId: "verify", path: "passed", equals: false } }, { taskId: "verify-1", dependsOn: ["critic-1"], when: { taskId: "verify", path: "passed", equals: false } },
    { taskId: "repair-research-2", dependsOn: ["verify-1"], when: { taskId: "verify-1", path: "passed", equals: false }, continueOnFailure: true }, { taskId: "repair-2", dependsOn: ["repair-research-2"], when: { taskId: "verify-1", path: "passed", equals: false } }, { taskId: "browser-2", dependsOn: ["repair-2"], when: { taskId: "verify-1", path: "passed", equals: false } }, { taskId: "critic-2", dependsOn: ["browser-2"], when: { taskId: "verify-1", path: "passed", equals: false } }, { taskId: "verify-2", dependsOn: ["critic-2"], when: { taskId: "verify-1", path: "passed", equals: false } },
    { taskId: "repair-research-3", dependsOn: ["verify-2"], when: { taskId: "verify-2", path: "passed", equals: false }, continueOnFailure: true }, { taskId: "repair-3", dependsOn: ["repair-research-3"], when: { taskId: "verify-2", path: "passed", equals: false } }, { taskId: "browser-3", dependsOn: ["repair-3"], when: { taskId: "verify-2", path: "passed", equals: false } }, { taskId: "critic-3", dependsOn: ["browser-3"], when: { taskId: "verify-2", path: "passed", equals: false } }, { taskId: "verify-3", dependsOn: ["critic-3"], when: { taskId: "verify-2", path: "passed", equals: false } },
  ] });
}

await boss.start();
await boss.createQueue("seltra-agent-tasks");
await boss.updateQueue("seltra-agent-tasks", { retryLimit: 0 });
await boss.work("seltra-agent-tasks", async (jobs: Array<{ id: string; name: string; data: { taskId: string; merchantId: string } }>) => {
  const [job] = jobs;
  const task = await prisma.task.findUnique({ where: { id: job.data.taskId } });
  if (!task) return;
  const events = Array.isArray(task.events) ? [...task.events] : [];
  const record = async (status: "EXECUTING" | "COMPLETED" | "NEEDS_REVIEW" | "FAILED", event: string, plan?: unknown) => {
    events.push(event);
    await prisma.task.update({ where: { id: task.id }, data: { status, events, ...(plan === undefined ? {} : { plan: plan as Prisma.InputJsonValue }) } });
  };
  try {
    if (!task.storeId) throw new Error("Task has no workspace store");
    if (task.merchantId !== job.data.merchantId) throw new Error("Task merchant does not match queue ownership");
    const ownedStore = await prisma.store.findFirst({ where: { id: task.storeId, merchantId: task.merchantId } });
    if (!ownedStore) throw new Error("Task store is not owned by its merchant");
    await record("EXECUTING", "workspace.provisioning");
    const workspace = await prisma.workspace.upsert({
      where: { storeId: task.storeId },
      create: { id: randomUUID(), storeId: task.storeId, merchantId: job.data.merchantId, sandboxId: `seltra-workspace-${task.storeId.toLowerCase()}`, status: "PROVISIONING" },
      update: { status: "PROVISIONING" },
    });
    if (workspace.merchantId !== task.merchantId || workspace.sandboxId !== `seltra-workspace-${task.storeId.toLowerCase()}`) throw new Error("Workspace identity or merchant ownership does not match the store");
    const agentRunId = randomUUID();
    await prisma.agentRun.create({ data: { id: agentRunId, taskId: task.id, flowId: "supervised", status: "running", state: {} } });
    const sandbox = new HttpSandboxProvider(process.env.SANDBOX_WORKER_URL ?? "", process.env.SANDBOX_WORKER_TOKEN ?? "", fetch, async (tool) => {
      await prisma.toolExecution.create({ data: {
        id: randomUUID(), runId: agentRunId, toolName: tool.toolName, status: tool.status, input: tool.input as Prisma.InputJsonValue,
        output: tool.output === undefined ? undefined : tool.output as Prisma.InputJsonValue, error: tool.error,
        startedAt: new Date(tool.startedAt), finishedAt: new Date(tool.finishedAt),
      } });
    });
    await sandbox.ensureWorkspace(task.storeId);
    await prisma.workspace.update({ where: { id: workspace.id }, data: { status: "READY" } });
    await record("EXECUTING", "workspace.ready");
    const workspaceFiles = await sandbox.listFiles(task.storeId);
    const runtime = createRuntime(sandbox);
    const runContext = { runId: agentRunId, merchantId: job.data.merchantId, storeId: task.storeId, workspaceId: workspace.id, context: JSON.stringify({ workspaceFiles, hasExistingApplication: workspaceFiles.some((path) => path.startsWith("app/") || path.startsWith("src/") || path.startsWith("pages/")) }) };
    const persistObservation = async (observation: import("@seltra/agents").AgentObservation) => {
      const stepId = randomUUID();
      await prisma.agentStep.create({ data: { id: stepId, runId: agentRunId, taskKey: observation.taskId, agentId: observation.agentId, status: observation.status, input: { objective: task.objective }, output: observation.output as Prisma.InputJsonValue, startedAt: new Date(observation.startedAt), finishedAt: new Date(observation.finishedAt) } });
      await prisma.observation.create({ data: { id: randomUUID(), runId: agentRunId, stepId, kind: `agent.${observation.agentId}`, payload: observation as unknown as Prisma.InputJsonValue } });
      if (observation.agentId === "visual-critic" || observation.agentId === "verifier") {
        const evaluation = observation.output as { passed?: boolean; score?: number; issues?: unknown };
        await prisma.evaluation.create({ data: { id: randomUUID(), runId: agentRunId, kind: observation.agentId, passed: evaluation.passed === true, score: evaluation.score, findings: (evaluation.issues ?? observation.output) as Prisma.InputJsonValue } });
      }
      if (observation.taskId === "build" && observation.status === "success") {
        const built = observation.output as { previewUrl?: string };
        if (built.previewUrl) await prisma.workspace.update({ where: { id: workspace.id }, data: { previewUrl: built.previewUrl } });
      }
      await record("EXECUTING", `agent.${observation.agentId}.${observation.status}`, { taskId: observation.taskId, output: observation.output });
    };
    const routing = await runtime.runFlow("routing", runContext, task.objective, persistObservation);
    const selected = routing.find((observation) => observation.taskId === "route-supervisor");
    if (selected?.status !== "success") {
      const failed = routing.find((observation) => observation.status === "failed");
      const output = failed?.output;
      const detail = output && typeof output === "object" && "error" in output
        ? String((output as { error: unknown }).error)
        : output === undefined ? undefined : JSON.stringify(output);
      throw new Error(failed
        ? `${failed.agentId} failed during routing${detail ? `: ${detail}` : ""}`
        : "Supervisor did not select an application flow");
    }
    const route = selected.output as { flow?: string };
    const flowId = route.flow === "iterative-change" ? "iterative-change" : "application-build";
    await prisma.agentRun.update({ where: { id: agentRunId }, data: { flowId } });
    const initialOutputs = Object.fromEntries(routing.map((observation) => [observation.taskId, observation.output]));
    const observations = [...routing, ...await runtime.runFlow(flowId, runContext, task.objective, persistObservation, initialOutputs)];
    const result = observations.at(-1);
    if (!result || result.status !== "success") throw new Error(JSON.stringify(result?.output ?? { message: "Builder returned no result" }));
    const output = result.output as { previewUrl?: string };
    const buildOutput = observations.find((observation) => observation.taskId === "build")?.output as { previewUrl?: string } | undefined;
    const previewUrl = output.previewUrl ?? buildOutput?.previewUrl;
    const latest = await prisma.workspaceSnapshot.findFirst({ where: { workspaceId: workspace.id }, orderBy: { revision: "desc" } });
    const files = await sandbox.snapshot(task.storeId);
    await prisma.workspaceSnapshot.create({ data: { id: randomUUID(), workspaceId: workspace.id, taskId: task.id, revision: (latest?.revision ?? 0) + 1, files: files as never } });
    await prisma.workspace.update({ where: { id: workspace.id }, data: { previewUrl } });
    if ((result.output as { passed?: boolean }).passed !== true) {
      await prisma.agentRun.update({ where: { id: agentRunId }, data: { status: "needs_review", finishedAt: new Date(), state: { observations } as unknown as Prisma.InputJsonValue } });
      await record("NEEDS_REVIEW", "application.needs_review", { observations, previewUrl, workspaceId: workspace.id });
      console.log(JSON.stringify({ event: "worker.job.needs_review", jobId: job.id, taskId: task.id, workspaceId: workspace.id }));
      return;
    }
    await prisma.agentRun.update({ where: { id: agentRunId }, data: { status: "completed", finishedAt: new Date(), state: { observations } as unknown as Prisma.InputJsonValue } });
    await record("COMPLETED", "application.verified", { observations, previewUrl, workspaceId: workspace.id });
    console.log(JSON.stringify({ event: "worker.job.completed", jobId: job.id, taskId: task.id, workspaceId: workspace.id }));
  } catch (cause) {
    const message = failureMessage(cause);
    const running = await prisma.agentRun.findFirst({ where: { taskId: task.id, status: "running" }, orderBy: { startedAt: "desc" } });
    if (running) await prisma.agentRun.update({ where: { id: running.id }, data: { status: "failed", finishedAt: new Date(), state: { error: message } } });
    await record("FAILED", "execution.failed", { error: message });
    console.error(JSON.stringify({ event: "worker.job.failed", jobId: job.id, taskId: task.id, error: message }));
    throw cause;
  }
});

console.log(JSON.stringify({ event: "worker.started", queue: "seltra-agent-tasks", mode: "polling" }));
