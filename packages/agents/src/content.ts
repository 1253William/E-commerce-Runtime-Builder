import type { AIProvider } from "@seltra/ai";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";

export class ContentAgent implements Agent {
  readonly id = "content";
  constructor(private readonly ai?: AIProvider) {}
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.ai) return { status: "failed", output: { error: "Content AI provider is not configured" } };
    try {
      const content = await this.ai.generateStructured<Record<string, unknown>>({ task: `Create application-specific content, labels, empty states, helper text, product/service descriptions, and customer-facing process instructions based on the actual business. Avoid filler, unsupported claims, fabricated testimonials, fake product facts, and promising unconfigured payment or fulfillment. Use merchant-provided facts verbatim where possible; place missing business facts in openQuestions. Do not write UI code.\n\n${task.objective}`, context: context.context }, { type: "object", required: ["voice", "content", "openQuestions", "claimsToAvoid"], properties: { voice: { type: "string" }, content: { type: "array", items: { type: "object", required: ["purpose", "text"], properties: { purpose: { type: "string" }, text: { type: "string" } } } }, openQuestions: { type: "array", items: { type: "string" } }, claimsToAvoid: { type: "array", items: { type: "string" } } } });
      return { status: "success", output: content };
    } catch (cause) { return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Content generation failed" } }; }
  }
}
