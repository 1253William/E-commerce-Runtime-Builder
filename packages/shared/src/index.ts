export type Role = "owner" | "admin" | "member";

export interface User {
  id: string;
  email: string;
  name: string;
  merchantId: string;
  role: Role;
  createdAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  status: "active" | "draft";
}

export interface Store {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "archived";
  brand: {
    name: string;
    palette: string[];
    tone: string;
  };
  theme: {
    mode: "editorial" | "minimal" | "luxury";
    accent: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  inventory: number;
  status: "draft" | "active";
  createdAt: string;
}

export interface Collection {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  merchantId: string;
  storeId?: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentTask {
  id: string;
  merchantId: string;
  storeId?: string;
  status: "created" | "queued" | "thinking" | "planning" | "executing" | "rendering" | "inspecting" | "repairing" | "verifying" | "awaiting_approval" | "completed" | "needs_review" | "failed" | "blocked" | "cancelled";
  objective: string;
  plan?: Plan;
  events: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StorePreview {
  id: string;
  storeId: string;
  previewUrl: string;
  status: "draft" | "ready";
  updatedAt: string;
}

export interface BusinessIntent {
  businessType: string;
  vertical?: string;
  applicationTypes: string[];
  products?: string[];
  services?: string[];
  workflows: BusinessWorkflow[];
  capabilities: BusinessCapability[];
  customers: CustomerModel;
  fulfillment?: FulfillmentModel;
  payment?: PaymentModel;
  locations?: BusinessLocation[];
  requirements: string[];
  constraints: string[];
}

export type BusinessCapability = string;

export interface BusinessWorkflow {
  name: string;
  steps: string[];
}

export interface CustomerModel {
  type: string;
  segments: string[];
}

export interface FulfillmentModel {
  type: string;
  methods: string[];
}

export interface PaymentModel {
  strategy: string;
  methods: string[];
}

export interface BusinessLocation {
  city?: string;
  region?: string;
  country?: string;
}

export interface Plan {
  objective: string;
  businessType?: string;
  applicationTypes?: string[];
  capabilities?: string[];
  workflows?: string[];
  routes?: string[];
  surfaces?: string[];
  assumptions: string[];
  steps: string[];
  dependencies: string[];
  risks: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const demoMerchant: Merchant = {
  id: "merchant_1",
  name: "Glow Luxe",
  slug: "glow-luxe",
  createdAt: new Date().toISOString(),
  status: "active"
};

export const demoUser: User = {
  id: "user_1",
  email: "merchant@seltra.dev",
  name: "Demo Merchant",
  merchantId: demoMerchant.id,
  role: "owner",
  createdAt: new Date().toISOString()
};

export const demoStore: Store = {
  id: "store_1",
  merchantId: demoMerchant.id,
  name: "Glow Luxe Store",
  slug: "glow-luxe-store",
  status: "active",
  brand: {
    name: "Glow Luxe",
    palette: ["#f8f3ec", "#1a1a1a", "#c9a76a"],
    tone: "editorial luxury"
  },
  theme: {
    mode: "luxury",
    accent: "#c9a76a"
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}
