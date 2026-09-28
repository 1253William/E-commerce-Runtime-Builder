import type { AIProvider } from "@seltra/ai";
import type { BusinessIntent } from "@seltra/shared";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";

export class BusinessAnalystAgent implements Agent {
  readonly id = "business-analyst";
  constructor(private readonly ai?: AIProvider) {}
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.ai) return { status: "failed", output: { error: "Business analyst AI provider is not configured" } };
    try {
      const intent = await this.ai.generateStructured<BusinessIntent>({
        task: `Convert this merchant request into business intent. Identify business type, optional vertical context, requested application types, products/services, domain workflows, composable capabilities, customer model, fulfillment, payments, locations, requirements and constraints. Preserve ambiguity as assumptions. Do not propose a UI template or component list.\n\nMerchant request:\n${task.objective}`,
        context: context.context,
        model: process.env.AI_MODEL_DEFAULT,
      }, { type: "object", required: ["businessType", "applicationTypes", "workflows", "capabilities", "customers", "requirements", "constraints"], properties: {
        businessType: { type: "string" }, vertical: { type: "string" }, applicationTypes: { type: "array", items: { type: "string" } }, products: { type: "array", items: { type: "string" } }, services: { type: "array", items: { type: "string" } },
        workflows: { type: "array", items: { type: "object", required: ["name", "steps"], properties: { name: { type: "string" }, steps: { type: "array", items: { type: "string" } } } }, capabilities: { type: "array", items: { type: "string" } }, customers: { type: "object", required: ["type", "segments"], properties: { type: { type: "string" }, segments: { type: "array", items: { type: "string" } } } }, fulfillment: { type: "object", properties: { type: { type: "string" }, methods: { type: "array", items: { type: "string" } } } }, payment: { type: "object", properties: { strategy: { type: "string" }, methods: { type: "array", items: { type: "string" } } } }, locations: { type: "array", items: { type: "object", properties: { city: { type: "string" }, region: { type: "string" }, country: { type: "string" } } } }, requirements: { type: "array", items: { type: "string" } }, constraints: { type: "array", items: { type: "string" } },
      } } });
      return { status: "success", output: intent };
    } catch (cause) { return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Business understanding failed" } }; }
  }
}
