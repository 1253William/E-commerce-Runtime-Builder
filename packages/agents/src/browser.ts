import type { SandboxProvider } from "@seltra/sandbox";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";
import { priorOutputs } from "./prior-outputs.js";

interface BuildOutput { previewUrl?: string; routes?: string[]; }

export class BrowserAgent implements Agent {
  readonly id = "browser";
  constructor(private readonly sandbox?: SandboxProvider) {}
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.sandbox || !context.storeId) return { status: "failed", output: { error: "Browser provider or workspace is not configured" } };
    const prior = priorOutputs(task, context);
    const build = prior?.build as BuildOutput | undefined;
    if (!build?.previewUrl) return { status: "failed", output: { error: "No real application preview URL was produced by the build" } };
    try {
      const intentAndDesign = { objective: task.objective, plan: prior?.plan, design: prior?.design };
      const critiqueContext = JSON.stringify(intentAndDesign);
      const routes = build.routes?.filter((route) => !/[:*{}]/.test(route));
      const desktop = await this.sandbox.observe(context.storeId, build.previewUrl, { width: 1440, height: 1000, routes, critiqueContext });
      const mobile = await this.sandbox.observe(context.storeId, build.previewUrl, { width: 390, height: 844, routes, critiqueContext });
      return { status: "success", output: { previewUrl: build.previewUrl, desktop, mobile } };
    } catch (cause) {
      return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Browser observation failed" } };
    }
  }
}
