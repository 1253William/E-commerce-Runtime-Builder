import {
  createId,
  demoMerchant,
  demoStore,
  demoUser,
  type AgentTask,
  type Collection,
  type Conversation,
  type Merchant,
  type Product,
  type Store,
  type StorePreview,
  type User,
} from "@seltra/shared";
import type {
  CollectionRepository,
  ConversationRepository,
  MerchantRepository,
  PreviewRepository,
  ProductRepository,
  StoreRepository,
  TaskRepository,
  UserRepository,
} from "../repositories/inMemoryRepositories";

export interface CreateStoreInput { name: string; slug?: string; status?: Store["status"]; brand?: Store["brand"]; theme?: Store["theme"]; }
export interface CreateProductInput { name?: string; slug?: string; description?: string; price?: number; currency?: string; inventory?: number; status?: Product["status"]; }
export interface CreateCollectionInput { name?: string; slug?: string; description?: string; }
export type OwnedResult<T> =
  | { status: "ok"; value: T }
  | { status: "not_found" }
  | { status: "forbidden" };

export class AuthService {
  constructor(private readonly users: UserRepository, private readonly merchants: MerchantRepository, private readonly stores: StoreRepository) {}
  async currentUser(token?: string): Promise<User> { return (token ? await this.users.getById(token) : null) ?? demoUser; }
  async signup(input: { email: string; name: string }): Promise<{ user: User; merchant: Merchant; store: Store }> {
    const now = new Date().toISOString();
    const merchant: Merchant = { id: createId("merchant"), name: input.name, slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), createdAt: now, status: "active" };
    const user: User = { id: createId("user"), email: input.email, name: input.name, merchantId: merchant.id, role: "owner", createdAt: now };
    const store: Store = { ...demoStore, id: createId("store"), merchantId: merchant.id, name: "New Store", slug: "new-store", status: "draft", createdAt: now, updatedAt: now };
    await this.merchants.create(merchant); await this.users.create(user); await this.stores.create(store);
    return { user, merchant, store };
  }
  async login(email: string): Promise<{ user: User; token: string }> { const user = await this.users.getByEmail(email) ?? demoUser; return { user, token: user.id }; }
}

export class StoreService {
  constructor(private readonly stores: StoreRepository) {}
  async list(merchantId: string) { return this.stores.listByMerchantId(merchantId); }
  async getOwned(id: string, merchantId: string): Promise<OwnedResult<Store>> { const store = await this.stores.getById(id); if (!store) return { status: "not_found" }; if (store.merchantId !== merchantId) return { status: "forbidden" }; return { status: "ok", value: store }; }
  async create(merchantId: string, input: CreateStoreInput): Promise<Store> { const now = new Date().toISOString(); const store: Store = { id: createId("store"), merchantId, name: input.name, slug: input.slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), status: input.status ?? "draft", brand: input.brand ?? { name: input.name, palette: ["#f8f3ec", "#1a1a1a", "#c9a76a"], tone: "premium editorial" }, theme: input.theme ?? { mode: "minimal", accent: "#c9a76a" }, createdAt: now, updatedAt: now }; return this.stores.create(store); }
  async update(id: string, merchantId: string, changes: Partial<Store>): Promise<OwnedResult<Store>> { const result = await this.getOwned(id, merchantId); return result.status === "ok" ? { status: "ok", value: await this.stores.update({ ...result.value, ...changes, updatedAt: new Date().toISOString() }) } : result; }
}

export class CatalogService {
  constructor(private readonly stores: StoreRepository, private readonly products: ProductRepository, private readonly collections: CollectionRepository) {}
  async getOwnedStore(storeId: string, merchantId: string) { const store = await this.stores.getById(storeId); return store?.merchantId === merchantId ? store : null; }
  async listProducts(storeId: string, merchantId: string) { if (!await this.getOwnedStore(storeId, merchantId)) return null; return this.products.listByStoreId(storeId); }
  async createProduct(storeId: string, merchantId: string, input: CreateProductInput) { if (!await this.getOwnedStore(storeId, merchantId)) return null; const product: Product = { id: createId("product"), storeId, name: input.name ?? "New product", slug: input.slug ?? "new-product", description: input.description ?? "", price: Number(input.price ?? 0), currency: input.currency ?? "USD", inventory: Number(input.inventory ?? 0), status: input.status === "active" ? "active" : "draft", createdAt: new Date().toISOString() }; return this.products.create(product); }
  async updateProduct(storeId: string, productId: string, merchantId: string, changes: Partial<Product>) { if (!await this.getOwnedStore(storeId, merchantId)) return null; const product = await this.products.getById(storeId, productId); return product ? this.products.update({ ...product, ...changes }) : undefined; }
  async deleteProduct(storeId: string, productId: string, merchantId: string) { if (!await this.getOwnedStore(storeId, merchantId)) return null; return this.products.delete(storeId, productId); }
  async listCollections(storeId: string, merchantId: string) { if (!await this.getOwnedStore(storeId, merchantId)) return null; return this.collections.listByStoreId(storeId); }
  async createCollection(storeId: string, merchantId: string, input: CreateCollectionInput) { if (!await this.getOwnedStore(storeId, merchantId)) return null; const collection: Collection = { id: createId("collection"), storeId, name: input.name ?? "New collection", slug: input.slug ?? "new-collection", description: input.description ?? "", createdAt: new Date().toISOString() }; return this.collections.create(collection); }
}

export class ConversationService {
  constructor(private readonly conversations: ConversationRepository) {}
  async create(merchantId: string, storeId: string | undefined, title: string): Promise<Conversation> { const now = new Date().toISOString(); return this.conversations.create({ id: createId("conversation"), merchantId, storeId, title, messages: [], createdAt: now, updatedAt: now }); }
  async getOwned(id: string, merchantId: string) { const conversation = await this.conversations.getById(id); return conversation?.merchantId === merchantId ? conversation : null; }
  async addMessage(id: string, merchantId: string, message: Conversation["messages"][number]) { const conversation = await this.getOwned(id, merchantId); if (!conversation) return null; conversation.messages.push(message); conversation.updatedAt = new Date().toISOString(); await this.conversations.update(conversation); return message; }
}

export class TaskService {
  constructor(private readonly tasks: TaskRepository) {}
  async getOwned(id: string, merchantId: string): Promise<OwnedResult<AgentTask>> { const task = await this.tasks.getById(id); if (!task) return { status: "not_found" }; if (task.merchantId !== merchantId) return { status: "forbidden" }; return { status: "ok", value: task }; }
  async create(merchantId: string, objective: string, storeId?: string): Promise<AgentTask> { const now = new Date().toISOString(); return this.tasks.create({ id: createId("task"), merchantId, storeId, status: "blocked", objective, events: ["task.created", "execution.provider_unavailable"], createdAt: now, updatedAt: now }); }
  async transition(id: string, merchantId: string, status: AgentTask["status"], event: string): Promise<OwnedResult<AgentTask>> { const result = await this.getOwned(id, merchantId); if (result.status !== "ok") return result; return { status: "ok", value: await this.tasks.update({ ...result.value, status, events: [...result.value.events, event], updatedAt: new Date().toISOString() }) }; }
}

export class PreviewService {
  constructor(private readonly stores: StoreRepository, private readonly previews: PreviewRepository) {}
  async create(storeId: string, merchantId: string) { if (!await this.ownedStore(storeId, merchantId)) return null; return null; }
  async get(storeId: string, merchantId: string) { if (!await this.ownedStore(storeId, merchantId)) return null; return this.previews.getByStoreId(storeId); }
  async verifyPreview(storeId: string, merchantId: string) { const preview = await this.get(storeId, merchantId); if (!preview) return null; try { const response = await fetch(preview.previewUrl, { signal: AbortSignal.timeout(10_000) }); return { status: "observed", passed: response.ok, httpStatus: response.status, previewUrl: preview.previewUrl }; } catch (error) { return { status: "provider_unavailable", passed: false, error: error instanceof Error ? error.message : "Preview request failed" }; } }
  async repairPreview(storeId: string, merchantId: string) { const verification = await this.verifyPreview(storeId, merchantId); return verification ? { status: "unavailable", fixed: false, message: "No code-aware repair runtime is configured" } : null; }
  private async ownedStore(storeId: string, merchantId: string) { const store = await this.stores.getById(storeId); return store?.merchantId === merchantId ? store : null; }
}


export const initialState = {
  users: new Map<string, User>([[demoUser.id, demoUser]]),
  merchants: new Map<string, Merchant>([[demoMerchant.id, demoMerchant]]),
  stores: new Map<string, Store>([[demoStore.id, demoStore]]),
  products: new Map<string, Map<string, Product>>(),
  collections: new Map<string, Map<string, Collection>>(),
  conversations: new Map<string, Conversation>(),
  tasks: new Map<string, AgentTask>(),
  previews: new Map<string, StorePreview>(),
};
