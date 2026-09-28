import type { AIProvider } from "@seltra/ai";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";

export class AssetAgent implements Agent {
  readonly id = "asset";
  constructor(private readonly ai?: AIProvider) {}
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.ai) return { status: "failed", output: { error: "Asset AI provider is not configured" } };
    try {
      const plan = await this.ai.generateStructured<Record<string, unknown>>({ task: `Prepare a visual asset plan from merchant facts and design direction. Identify required assets, intended placement, subject/composition, aspect ratio, accessibility text, provenance, and whether the merchant must supply or approve the asset. Never invent an existing URL or claim an asset was generated or licensed when it was not. Prefer CSS/text when no real image asset is available. Do not write UI code.\n\n${task.objective}`, context: context.context }, { type: "object", required: ["assets", "missingInputs", "usageConstraints"], properties: { assets: { type: "array", items: { type: "object", required: ["purpose", "placement", "source", "prompt", "altText", "approvalRequired"], properties: { purpose: { type: "string" }, placement: { type: "string" }, source: { type: "string" }, prompt: { type: "string" }, altText: { type: "string" }, approvalRequired: { type: "boolean" } } } }, missingInputs: { type: "array", items: { type: "string" } }, usageConstraints: { type: "array", items: { type: "string" } } } });
      return { status: "success", output: plan };
    } catch (cause) { return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Asset planning failed" } }; }
  }
}
