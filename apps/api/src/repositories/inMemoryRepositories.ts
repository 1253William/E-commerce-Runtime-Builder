import type {
  AgentTask,
  Collection,
  Conversation,
  Merchant,
  Product,
  Store,
  StorePreview,
  User,
} from "@seltra/shared";

export interface UserRepository {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
}

export interface MerchantRepository {
  getById(id: string): Promise<Merchant | null>;
  create(merchant: Merchant): Promise<Merchant>;
  update(merchant: Merchant): Promise<Merchant>;
}

export interface StoreRepository {
  getById(id: string): Promise<Store | null>;
  listByMerchantId(merchantId: string): Promise<Store[]>;
  create(store: Store): Promise<Store>;
  update(store: Store): Promise<Store>;
}

export interface ProductRepository {
  listByStoreId(storeId: string): Promise<Product[]>;
  getById(storeId: string, productId: string): Promise<Product | null>;
  create(product: Product): Promise<Product>;
  update(product: Product): Promise<Product>;
  delete(storeId: string, productId: string): Promise<boolean>;
}

export interface CollectionRepository {
  listByStoreId(storeId: string): Promise<Collection[]>;
  create(collection: Collection): Promise<Collection>;
  update(collection: Collection): Promise<Collection>;
}

export interface ConversationRepository {
  getById(id: string): Promise<Conversation | null>;
  create(conversation: Conversation): Promise<Conversation>;
  update(conversation: Conversation): Promise<Conversation>;
}

export interface TaskRepository {
  getById(id: string): Promise<AgentTask | null>;
  create(task: AgentTask): Promise<AgentTask>;
  update(task: AgentTask): Promise<AgentTask>;
}

export interface PreviewRepository {
  getByStoreId(storeId: string): Promise<StorePreview | null>;
  create(preview: StorePreview): Promise<StorePreview>;
  update(preview: StorePreview): Promise<StorePreview>;
}

export class InMemoryUserRepository implements UserRepository {
  constructor(private readonly records: Map<string, User>) {}
  async getById(id: string) { return this.records.get(id) ?? null; }
  async getByEmail(email: string) { return Array.from(this.records.values()).find((user) => user.email === email) ?? null; }
  async create(user: User) { this.records.set(user.id, user); return user; }
  async update(user: User) { this.records.set(user.id, user); return user; }
}

export class InMemoryMerchantRepository implements MerchantRepository {
  constructor(private readonly records: Map<string, Merchant>) {}
  async getById(id: string) { return this.records.get(id) ?? null; }
  async create(merchant: Merchant) { this.records.set(merchant.id, merchant); return merchant; }
  async update(merchant: Merchant) { this.records.set(merchant.id, merchant); return merchant; }
}

export class InMemoryStoreRepository implements StoreRepository {
  constructor(private readonly records: Map<string, Store>) {}
  async getById(id: string) { return this.records.get(id) ?? null; }
  async listByMerchantId(merchantId: string) { return Array.from(this.records.values()).filter((store) => store.merchantId === merchantId); }
  async create(store: Store) { this.records.set(store.id, store); return store; }
  async update(store: Store) { this.records.set(store.id, store); return store; }
}

export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly records: Map<string, Map<string, Product>>) {}
  private forStore(storeId: string) { const records = this.records.get(storeId) ?? new Map<string, Product>(); this.records.set(storeId, records); return records; }
  async listByStoreId(storeId: string) { return Array.from(this.forStore(storeId).values()); }
  async getById(storeId: string, productId: string) { return this.forStore(storeId).get(productId) ?? null; }
  async create(product: Product) { this.forStore(product.storeId).set(product.id, product); return product; }
  async update(product: Product) { this.forStore(product.storeId).set(product.id, product); return product; }
  async delete(storeId: string, productId: string) { return this.forStore(storeId).delete(productId); }
}

export class InMemoryCollectionRepository implements CollectionRepository {
  constructor(private readonly records: Map<string, Map<string, Collection>>) {}
  async listByStoreId(storeId: string) { return Array.from((this.records.get(storeId) ?? new Map()).values()); }
  async create(collection: Collection) { if (!this.records.has(collection.storeId)) this.records.set(collection.storeId, new Map()); this.records.get(collection.storeId)?.set(collection.id, collection); return collection; }
  async update(collection: Collection) { if (!this.records.has(collection.storeId)) this.records.set(collection.storeId, new Map()); this.records.get(collection.storeId)?.set(collection.id, collection); return collection; }
}

export class InMemoryConversationRepository implements ConversationRepository {
  constructor(private readonly records: Map<string, Conversation>) {}
  async getById(id: string) { return this.records.get(id) ?? null; }
  async create(conversation: Conversation) { this.records.set(conversation.id, conversation); return conversation; }
  async update(conversation: Conversation) { this.records.set(conversation.id, conversation); return conversation; }
}

export class InMemoryTaskRepository implements TaskRepository {
  constructor(private readonly records: Map<string, AgentTask>) {}
  async getById(id: string) { return this.records.get(id) ?? null; }
  async create(task: AgentTask) { this.records.set(task.id, task); return task; }
  async update(task: AgentTask) { this.records.set(task.id, task); return task; }
}

export class InMemoryPreviewRepository implements PreviewRepository {
  constructor(private readonly records: Map<string, StorePreview>) {}
  async getByStoreId(storeId: string) { return this.records.get(storeId) ?? null; }
  async create(preview: StorePreview) { this.records.set(preview.storeId, preview); return preview; }
  async update(preview: StorePreview) { this.records.set(preview.storeId, preview); return preview; }
}
