import type { AIProvider } from "@seltra/ai";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";

export class SupervisorAgent implements Agent {
  readonly id = "supervisor";
  constructor(private readonly ai?: AIProvider) {}
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.ai) return { status: "failed", output: { error: "Supervisor AI provider is not configured" } };
    try {
      const schema = {
        type: "object",
        required: ["flow", "researchRequired", "rationale", "requiredSpecialists"],
        properties: {
          flow: { type: "string", enum: ["application-build", "iterative-change"] },
          researchRequired: { type: "boolean" },
          rationale: { type: "string" },
          requiredSpecialists: { type: "array", items: { type: "string" } },
        },
      };
      const route = await this.ai.generateStructured<{ flow: string; researchRequired: boolean; rationale: string; requiredSpecialists: string[] }>({ task: `Route this task to a supported deterministic flow. Choose application-build for an initial application or major new surface; choose iterative-change when workspace context says an application already exists and the request modifies it. Research only when an explicitly requested, material knowledge gap exists. The specialist set available is business analyst, planner, researcher, designer, commerce, content, asset, builder, browser, verifier, visual critic, and repair. Never publish or perform financial/production mutations.\n\n${task.objective}`, context: context.context, model: process.env.AI_MODEL_REASONING }, schema);
      return { status: "success", output: route };
    } catch (cause) { return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Task routing failed" } }; }
  }
}
