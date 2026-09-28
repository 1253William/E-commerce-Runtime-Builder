import type { AIProvider } from "@seltra/ai";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";

export const COMMERCE_CAPABILITIES = ["catalog", "product-management", "service-management", "inventory", "customers", "orders", "cart", "checkout", "payments", "appointments", "bookings", "quotes", "deposits", "subscriptions", "pos", "tables", "kitchen-workflow", "production", "fulfillment", "delivery", "shipping", "tracking", "file-uploads", "measurements", "customer-accounts", "notifications", "reviews", "promotions", "discounts", "analytics", "campaigns", "after-sales-service"] as const;
export interface CommerceReadTools {
  listProducts(storeId: string, merchantId: string, runId?: string): Promise<Array<{ name: string; description: string; price: number; currency: string; inventory: number; status: string }>>;
  listCollections(storeId: string, merchantId: string, runId?: string): Promise<Array<{ name: string; description: string }>>;
  listRecords(storeId: string, merchantId: string, runId?: string): Promise<Array<{ type: string; status: string; data: unknown }>>;
}

export class CommerceAgent implements Agent {
  readonly id = "commerce";
  constructor(private readonly ai?: AIProvider, private readonly tools?: CommerceReadTools) {}
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.ai) return { status: "failed", output: { error: "Commerce AI provider is not configured" } };
    try {
      const [products, collections, records] = this.tools && context.storeId && context.merchantId
        ? await Promise.all([this.tools.listProducts(context.storeId, context.merchantId, context.runId), this.tools.listCollections(context.storeId, context.merchantId, context.runId), this.tools.listRecords(context.storeId, context.merchantId, context.runId)])
        : [[], [], []];
      const schema = {
        type: "object",
        required: ["applicationTypes", "surfaces", "capabilities", "entities", "workflows", "stateTransitions", "integrations", "safetyConstraints"],
        properties: {
          applicationTypes: { type: "array", items: { type: "string" } },
          surfaces: { type: "array", items: { type: "string" } },
          capabilities: { type: "array", items: { type: "string" } },
          entities: { type: "array", items: { type: "object", required: ["name", "fields"], properties: { name: { type: "string" }, fields: { type: "array", items: { type: "string" } } } } },
          workflows: { type: "array", items: { type: "object", required: ["name", "steps"], properties: { name: { type: "string" }, steps: { type: "array", items: { type: "string" } } } } },
          stateTransitions: { type: "array", items: { type: "string" } },
          integrations: { type: "array", items: { type: "object", required: ["name", "status", "requiredFor"], properties: { name: { type: "string" }, status: { type: "string" }, requiredFor: { type: "array", items: { type: "string" } } } } },
          safetyConstraints: { type: "array", items: { type: "string" } },
        },
      };
      const blueprint = await this.ai.generateStructured<Record<string, unknown>>({
        task: `Design a typed commerce operating blueprint from business intent. Select only relevant composable capabilities; separate application surfaces from capabilities; model the end-to-end lifecycle, entities, state transitions, data ownership, and which actions require merchant/customer confirmation. Existing catalog and collections are read-only context. Never claim payment processing, inventory mutation, booking, notification, shipping, or publishing is live unless a configured integration is explicitly provided. Describe unavailable integrations as requirements.\n\nRequest: ${task.objective}`,
        context: JSON.stringify({ priorContext: context.context, existingCatalog: products, existingCollections: collections, existingCommerceRecords: records, availableCapabilityVocabulary: COMMERCE_CAPABILITIES }),
      }, schema);
      return { status: "success", output: blueprint };
    } catch (cause) { return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Commerce planning failed" } }; }
  }
}
