import type { Plan } from "@seltra/shared";
import type { AIProvider, ModelType } from "@seltra/ai";

function parseContext<T>(context?: string): T | undefined {
  if (!context) return undefined;

  try {
    return JSON.parse(context) as T;
  } catch {
    return undefined;
  }
}

export interface AgentContext {
  runId?: string;
  merchantId?: string;
  storeId?: string;
  task?: string;
  context?: string;
}

export interface AgentTask {
  objective: string;
  context?: string;
  modelType: ModelType;
}

export interface AgentResult {
  status: "success" | "failed";
  output: unknown;
}

export interface Agent {
  id: string;
  execute(task: AgentTask, context: AgentContext): Promise<AgentResult>;
}

export class Planner implements Agent {
  id = "planner";

  constructor(private readonly ai?: AIProvider) {}

  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.ai) return { status: "failed", output: { error: "Planner AI provider is not configured" } };
    try {
      const plan = await this.ai.generateStructured<Plan>({ task: `Understand the merchant and produce a business intent and application plan. Determine business type, application types, domain-specific workflows, capabilities, routes, and customer/operations surfaces from the request. Do not select a template.\n\nMerchant request:\n${task.objective}`, context: context.context, model: process.env.AI_MODEL_REASONING }, {
        type: "object", required: ["objective", "businessType", "applicationTypes", "capabilities", "workflows", "routes", "surfaces", "assumptions", "steps", "dependencies", "risks"], properties: {
          objective: { type: "string" }, businessType: { type: "string" }, applicationTypes: { type: "array", items: { type: "string" } }, capabilities: { type: "array", items: { type: "string" } },
          workflows: { type: "array", items: { type: "string" } }, routes: { type: "array", items: { type: "string" } }, surfaces: { type: "array", items: { type: "string" } },
          assumptions: { type: "array", items: { type: "string" } }, steps: { type: "array", items: { type: "string" } }, dependencies: { type: "array", items: { type: "string" } }, risks: { type: "array", items: { type: "string" } },
        },
      });
      return { status: "success", output: plan };
    } catch (cause) { return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Planning failed" } }; }
  }
}

export class Designer implements Agent {
  id = "designer";

  constructor(private readonly ai?: AIProvider) {}

  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.ai) return { status: "failed", output: { error: "Designer AI provider is not configured" } };
    try {
      const direction = await this.ai.generateStructured<Record<string, unknown>>({ task: `Create a DesignDirection for this application. Work from the business intent and application plan in context. Decide brand impression, customer priorities, information hierarchy, typography, layout, color, imagery, responsive behavior and content voice. Do not write code or prescribe reusable template sections.\n\nMerchant request:\n${task.objective}`, context: context.context, model: process.env.AI_MODEL_REASONING }, {
        type: "object", required: ["brandImpression", "customer", "primaryAction", "informationHierarchy", "typography", "color", "layout", "imagery", "responsiveBehavior", "contentVoice"], properties: {
          brandImpression: { type: "string" }, customer: { type: "string" }, primaryAction: { type: "string" }, informationHierarchy: { type: "array", items: { type: "string" } },
          typography: { type: "object" }, color: { type: "object" }, layout: { type: "object" }, imagery: { type: "object" }, responsiveBehavior: { type: "array", items: { type: "string" } }, contentVoice: { type: "string" },
        },
      });
      return { status: "success", output: direction };
    } catch (cause) { return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Design reasoning failed" } }; }
  }
}

export { Builder } from "./builder.js";
export { Orchestrator } from "./orchestrator.js";
export { BrowserAgent } from "./browser.js";
export { Verifier } from "./verifier.js";
export { RepairAgent } from "./repair.js";
export { VisualCriticAgent } from "./visual-critic.js";
export { BusinessAnalystAgent } from "./business-analyst.js";
export { SupervisorAgent } from "./supervisor.js";
export { ResearcherAgent } from "./researcher.js";
export { HttpWebSearchTool } from "./web-search.js";
export type { WebSearchTool, WebSearchResult } from "./web-search.js";
export { CommerceAgent, COMMERCE_CAPABILITIES } from "./commerce.js";
export { ContentAgent } from "./content.js";
export { AssetAgent } from "./asset.js";
export * from "./core/runtime.js";

export class StoreEngine implements Agent {
  id = "store-engine";
  async execute(_task: AgentTask, context: AgentContext): Promise<AgentResult> {
    const build = parseContext<{ previewUrl?: string; routes?: string[] }>(context.context);
    if (!build?.previewUrl) return { status: "failed", output: { error: "A real preview URL is required" } };
    return { status: "success", output: { previewUrl: build.previewUrl, routes: build.routes ?? [], status: "ready" } };
  }
}

