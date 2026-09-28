import type { AIProvider } from "@seltra/ai";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";
import { AgentRuntime } from "./core/runtime.js";

export class Orchestrator implements Agent {
  readonly id = "orchestrator";
  constructor(private readonly runtime: AgentRuntime, private readonly provider?: AIProvider, private readonly flowId = "build") {}
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    try {
      const observations = await this.runtime.runFlow(this.flowId, { ...context, context: context.context }, task.objective);
      const succeeded = observations.length > 0 && observations.every((observation) => observation.status === "success");
      return { status: succeeded ? "success" : "failed", output: {
        providerSelection: this.provider ? { provider: this.provider.providerName, model: task.modelType } : undefined,
        task, observations, result: observations.at(-1)?.output,
      } };
    } catch (cause) {
      return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Agent flow failed" } };
    }
  }
}
