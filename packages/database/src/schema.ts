import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  merchantId: text("merchant_id").notNull(),
  role: text("role", { enum: ["owner", "admin", "member"] }).notNull().default("member"),
  createdAt: text("created_at").notNull().default(""),
});

export const merchants = sqliteTable("merchants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: text("created_at").notNull().default(""),
  status: text("status", { enum: ["active", "draft"] }).notNull().default("draft"),
});

export const stores = sqliteTable("stores", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] }).notNull().default("draft"),
  brandName: text("brand_name").notNull().default(""),
  brandPalette: text("brand_palette").notNull().default("[]"),
  brandTone: text("brand_tone").notNull().default(""),
  themeMode: text("theme_mode").notNull().default("minimal"),
  themeAccent: text("theme_accent").notNull().default("#000000"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  storeId: text("store_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  inventory: integer("inventory").notNull().default(0),
  status: text("status", { enum: ["draft", "active"] }).notNull().default("draft"),
  createdAt: text("created_at").notNull().default(""),
});

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  storeId: text("store_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull(),
  storeId: text("store_id"),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull(),
  storeId: text("store_id"),
  status: text("status", {
    enum: ["created", "queued", "thinking", "planning", "executing", "rendering", "inspecting", "repairing", "verifying", "awaiting_approval", "completed", "failed", "blocked", "cancelled"]
  }).notNull().default("created"),
  objective: text("objective").notNull(),
  events: text("events").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull(),
  storeId: text("store_id"),
  type: text("type", { enum: ["preference", "decision", "constraint", "fact", "feedback"] }).notNull(),
  value: text("value").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export const modelUsage = sqliteTable("model_usage", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  task: text("task").notNull(),
  agent: text("agent").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  estimatedCost: integer("estimated_cost").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
});

export const schema = {
  users,
  merchants,
  stores,
  products,
  collections,
  conversations,
  messages,
  tasks,
  memories,
  modelUsage,
};
