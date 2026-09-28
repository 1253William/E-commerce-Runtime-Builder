import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createId, type AgentTask, type Conversation } from "@seltra/shared";
import type { Env, Variables } from "./env";
import {
  InMemoryCollectionRepository,
  InMemoryConversationRepository,
  InMemoryMerchantRepository,
  InMemoryPreviewRepository,
  InMemoryProductRepository,
  InMemoryStoreRepository,
  InMemoryTaskRepository,
  InMemoryUserRepository,
} from "./repositories/inMemoryRepositories";
import { AuthService, CatalogService, ConversationService, PreviewService, StoreService, TaskService, initialState } from "./services/runtimeServices";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const userRepository = new InMemoryUserRepository(initialState.users);
const merchantRepository = new InMemoryMerchantRepository(initialState.merchants);
const storeRepository = new InMemoryStoreRepository(initialState.stores);
const productRepository = new InMemoryProductRepository(initialState.products);
const collectionRepository = new InMemoryCollectionRepository(initialState.collections);
const conversationRepository = new InMemoryConversationRepository(initialState.conversations);
const taskRepository = new InMemoryTaskRepository(initialState.tasks);
const previewRepository = new InMemoryPreviewRepository(initialState.previews);
const authService = new AuthService(userRepository, merchantRepository, storeRepository);
const storeService = new StoreService(storeRepository);
const catalogService = new CatalogService(storeRepository, productRepository, collectionRepository);
const conversationService = new ConversationService(conversationRepository);
const taskService = new TaskService(taskRepository);
const previewService = new PreviewService(storeRepository, previewRepository);

const signupSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(2).default("Merchant") });
const createStoreSchema = z.object({
  name: z.string().min(2).default("My Store"),
  slug: z.string().min(2).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  brand: z.object({ name: z.string().default("My Brand"), palette: z.array(z.string()).default(["#f8f3ec", "#1a1a1a", "#c9a76a"]), tone: z.string().default("premium editorial") }).optional(),
  theme: z.object({ mode: z.enum(["editorial", "minimal", "luxury"]).default("minimal"), accent: z.string().default("#c9a76a") }).optional(),
});
const createTaskSchema = z.object({ objective: z.string().min(2), storeId: z.string().optional() });

async function currentUser(c: any) {
  const header = c.req.header("Authorization");
  return authService.currentUser(header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined);
}

app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowHeaders: ["Content-Type", "Authorization"] }));
app.get("/health", (c) => c.json({ ok: true, service: "seltra-api", environment: c.env?.APP_ENV ?? "development" }));

app.post("/auth/signup", zValidator("json", signupSchema), async (c) => {
  const body = c.req.valid("json");
  return c.json({ success: true, data: await authService.signup({ email: body.email, name: body.name }) }, 201);
});
app.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ success: true, data: await authService.login(typeof body?.email === "string" ? body.email : "merchant@seltra.dev") });
});
app.post("/auth/logout", (c) => c.json({ success: true, data: { loggedOut: true } }));
app.get("/auth/me", async (c) => c.json({ success: true, data: { user: await currentUser(c) } }));

app.get("/stores", async (c) => c.json({ success: true, data: await storeService.list((await currentUser(c)).merchantId) }));
app.post("/stores", zValidator("json", createStoreSchema), async (c) => {
  const user = await currentUser(c);
  return c.json({ success: true, data: await storeService.create(user.merchantId, c.req.valid("json")) }, 201);
});
app.get("/stores/:id", async (c) => {
  const result = await storeService.getOwned(c.req.param("id"), (await currentUser(c)).merchantId);
  if (result.status === "not_found") return c.json({ success: false, error: "Store not found" }, 404);
  if (result.status === "forbidden") return c.json({ success: false, error: "Access denied" }, 403);
  return c.json({ success: true, data: result.value });
});
app.patch("/stores/:id", async (c) => {
  const result = await storeService.update(c.req.param("id"), (await currentUser(c)).merchantId, await c.req.json().catch(() => ({})));
  if (result.status === "not_found") return c.json({ success: false, error: "Store not found" }, 404);
  if (result.status === "forbidden") return c.json({ success: false, error: "Access denied" }, 403);
  return c.json({ success: true, data: result.value });
});

app.post("/conversations", async (c) => {
  const user = await currentUser(c); const body = await c.req.json().catch(() => ({}));
  const conversation = await conversationService.create(user.merchantId, typeof body.storeId === "string" ? body.storeId : undefined, typeof body.title === "string" ? body.title : "New conversation");
  return c.json({ success: true, data: conversation }, 201);
});
app.get("/conversations/:id", async (c) => {
  const conversation = await conversationService.getOwned(c.req.param("id"), (await currentUser(c)).merchantId);
  return conversation ? c.json({ success: true, data: conversation }) : c.json({ success: false, error: "Conversation not found" }, 404);
});
app.post("/conversations/:id/messages", async (c) => {
  const user = await currentUser(c); const body = await c.req.json().catch(() => ({}));
  const message: Conversation["messages"][number] = { id: createId("message"), role: body.role === "assistant" || body.role === "system" ? body.role : "user", content: typeof body.content === "string" ? body.content : "", createdAt: new Date().toISOString() };
  const result = await conversationService.addMessage(c.req.param("id"), user.merchantId, message);
  return result ? c.json({ success: true, data: result }, 201) : c.json({ success: false, error: "Conversation not found" }, 404);
});
app.get("/conversations/:id/events", async (c) => {
  const conversation = await conversationService.getOwned(c.req.param("id"), (await currentUser(c)).merchantId);
  return conversation ? c.json({ success: true, data: { events: conversation.messages.map((message) => ({ ...message, source: "conversation" })) } }) : c.json({ success: false, error: "Conversation not found" }, 404);
});

app.post("/tasks", zValidator("json", createTaskSchema), async (c) => {
  const user = await currentUser(c); const body = c.req.valid("json");
  return c.json({ success: true, data: await taskService.create(user.merchantId, body.objective, body.storeId) }, 201);
});
app.get("/tasks/:id", async (c) => {
  const result = await taskService.getOwned(c.req.param("id"), (await currentUser(c)).merchantId);
  if (result.status === "not_found") return c.json({ success: false, error: "Task not found" }, 404);
  if (result.status === "forbidden") return c.json({ success: false, error: "Access denied" }, 403);
  return c.json({ success: true, data: result.value });
});
app.post("/tasks/:id/cancel", async (c) => transitionTask(c, "cancelled", "task.cancelled"));
app.post("/tasks/:id/approve", async (c) => transitionTask(c, "completed", "approval.granted"));
app.post("/tasks/:id/retry", async (c) => transitionTask(c, "queued", "task.retry"));

async function transitionTask(c: any, status: AgentTask["status"], event: string) {
  const result = await taskService.transition(c.req.param("id"), (await currentUser(c)).merchantId, status, event);
  if (result.status === "not_found") return c.json({ success: false, error: "Task not found" }, 404);
  if (result.status === "forbidden") return c.json({ success: false, error: "Access denied" }, 403);
  return c.json({ success: true, data: result.value });
}

app.post("/stores/:id/preview", async (c) => {
  const preview = await previewService.create(c.req.param("id"), (await currentUser(c)).merchantId);
  return preview ? c.json({ success: true, data: preview }, 201) : c.json({ success: false, error: "Store not found" }, 404);
});
app.get("/stores/:id/preview", async (c) => {
  const preview = await previewService.get(c.req.param("id"), (await currentUser(c)).merchantId);
  return preview ? c.json({ success: true, data: preview }) : c.json({ success: false, error: "Store not found" }, 404);
});
app.post("/stores/:id/preview/verify", async (c) => {
  const result = await previewService.verifyPreview(c.req.param("id"), (await currentUser(c)).merchantId);
  return result ? c.json({ success: true, data: result }) : c.json({ success: false, error: "Store not found" }, 404);
});
app.post("/stores/:id/preview/repair", async (c) => {
  const result = await previewService.repairPreview(c.req.param("id"), (await currentUser(c)).merchantId);
  return result ? c.json({ success: true, data: result }) : c.json({ success: false, error: "Store not found" }, 404);
});

app.get("/stores/:id/products", async (c) => {
  const products = await catalogService.listProducts(c.req.param("id"), (await currentUser(c)).merchantId);
  return products ? c.json({ success: true, data: products }) : c.json({ success: false, error: "Store not found" }, 404);
});
app.post("/stores/:id/products", async (c) => {
  const product = await catalogService.createProduct(c.req.param("id"), (await currentUser(c)).merchantId, await c.req.json().catch(() => ({})));
  return product ? c.json({ success: true, data: product }, 201) : c.json({ success: false, error: "Store not found" }, 404);
});
app.patch("/stores/:id/products/:productId", async (c) => {
  const product = await catalogService.updateProduct(c.req.param("id"), c.req.param("productId"), (await currentUser(c)).merchantId, await c.req.json().catch(() => ({})));
  return product ? c.json({ success: true, data: product }) : c.json({ success: false, error: "Product not found" }, 404);
});
app.delete("/stores/:id/products/:productId", async (c) => {
  const deleted = await catalogService.deleteProduct(c.req.param("id"), c.req.param("productId"), (await currentUser(c)).merchantId);
  return deleted === null ? c.json({ success: false, error: "Store not found" }, 404) : c.json({ success: true, data: { deleted } });
});
app.get("/stores/:id/collections", async (c) => {
  const collections = await catalogService.listCollections(c.req.param("id"), (await currentUser(c)).merchantId);
  return collections ? c.json({ success: true, data: collections }) : c.json({ success: false, error: "Store not found" }, 404);
});
app.post("/stores/:id/collections", async (c) => {
  const collection = await catalogService.createCollection(c.req.param("id"), (await currentUser(c)).merchantId, await c.req.json().catch(() => ({})));
  return collection ? c.json({ success: true, data: collection }, 201) : c.json({ success: false, error: "Store not found" }, 404);
});

export default app;
export { app, initialState };
