import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service.js";
import { QueueService } from "./queue.service.js";
import { SandboxService } from "./sandbox.service.js";

@Injectable()
export class RuntimeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(QueueService) private readonly queue: QueueService, @Inject(SandboxService) private readonly sandbox: SandboxService) {}

  async signup(input: { email: string; name: string }) {
    const merchantId = randomUUID();
    const userId = randomUUID();
    const storeId = randomUUID();
    const baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "merchant";
    const slug = `${baseSlug}-${merchantId.slice(0, 8)}`;
    const merchant = await this.prisma.merchant.create({ data: { id: merchantId, name: input.name, slug, status: "ACTIVE" } });
    const user = await this.prisma.user.create({ data: { id: userId, email: input.email, name: input.name, merchantId, role: "OWNER" } });
    const store = await this.prisma.store.create({ data: { id: storeId, merchantId, name: `${input.name} Store`, slug: `${baseSlug}-store`, status: "DRAFT", brandName: input.name, brandPalette: ["#f8f3ec", "#1a1a1a", "#c9a76a"], brandTone: "premium editorial", themeMode: "minimal", themeAccent: "#c9a76a" } });
    return { user, merchant, store };
  }

  async login(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return { user, token: user.id };
  }

  async createConversation(merchantId: string, input: { storeId?: string; title?: string }) {
    return this.prisma.conversation.create({ data: { id: randomUUID(), merchantId, storeId: input.storeId, title: input.title ?? "New conversation" } });
  }

  async getConversation(id: string, merchantId: string) {
    return this.prisma.conversation.findFirst({ where: { id, merchantId }, include: { messages: true } });
  }

  async addMessage(id: string, merchantId: string, input: { role?: "USER" | "ASSISTANT" | "SYSTEM"; content?: string }) {
    const conversation = await this.getConversation(id, merchantId);
    if (!conversation) return null;
    return this.prisma.message.create({ data: { id: randomUUID(), conversationId: id, role: input.role ?? "USER", content: input.content ?? "" } });
  }

  async createTask(merchantId: string, objective: string, storeId?: string) {
    const existingStore = storeId
      ? await this.prisma.store.findFirst({ where: { id: storeId, merchantId } })
      : await this.prisma.store.findFirst({ where: { merchantId }, orderBy: { createdAt: "asc" } });
    const resolvedStoreId = existingStore?.id;
    const derivedStoreName = this.storeNameFromObjective(objective);
    if (existingStore && derivedStoreName) {
      await this.prisma.store.update({ where: { id: existingStore.id }, data: { name: derivedStoreName } });
    }
    const task = await this.prisma.task.create({ data: { id: randomUUID(), merchantId, storeId: resolvedStoreId, objective, status: "QUEUED", events: ["task.created", "task.queued"] } });
    await this.queue.enqueueTask(task.id, merchantId);
    return task;
  }

  async getTask(id: string, merchantId: string) {
    return this.prisma.task.findFirst({ where: { id, merchantId } });
  }

  async getLatestTask(storeId: string, merchantId: string) {
    return this.prisma.task.findFirst({ where: { storeId, merchantId }, orderBy: { createdAt: "desc" } });
  }

  async transitionTask(id: string, merchantId: string, status: "CANCELLED" | "COMPLETED" | "QUEUED", event: string) {
    const task = await this.getTask(id, merchantId);
    if (!task) return null;
    const events = Array.isArray(task.events) ? [...task.events, event] : [event];
    return this.prisma.task.update({ where: { id }, data: { status, events } });
  }

  async listProducts(storeId: string, merchantId: string) {
    if (!(await this.ownedStore(storeId, merchantId))) return null;
    return this.prisma.product.findMany({ where: { storeId } });
  }

  async createProduct(storeId: string, merchantId: string, input: Record<string, unknown>) {
    if (!(await this.ownedStore(storeId, merchantId))) return null;
    const name = typeof input.name === "string" ? input.name : "New product";
    return this.prisma.product.create({ data: { id: randomUUID(), storeId, name, slug: typeof input.slug === "string" ? input.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: typeof input.description === "string" ? input.description : "", price: Number(input.price ?? 0), currency: typeof input.currency === "string" ? input.currency : "USD", inventory: Number(input.inventory ?? 0), status: input.status === "ACTIVE" ? "ACTIVE" : "DRAFT" } });
  }

  async listCollections(storeId: string, merchantId: string) {
    if (!(await this.ownedStore(storeId, merchantId))) return null;
    return this.prisma.collection.findMany({ where: { storeId } });
  }

  async createCollection(storeId: string, merchantId: string, input: Record<string, unknown>) {
    if (!(await this.ownedStore(storeId, merchantId))) return null;
    const name = typeof input.name === "string" ? input.name : "New collection";
    return this.prisma.collection.create({ data: { id: randomUUID(), storeId, name, slug: typeof input.slug === "string" ? input.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: typeof input.description === "string" ? input.description : "" } });
  }

  async createPreview(storeId: string, merchantId: string) {
    const store = await this.ownedStore(storeId, merchantId);
    if (!store) return null;
    const preview = await this.sandbox.preview(storeId, merchantId);
    if (!preview?.previewUrl) return null;
    return this.prisma.preview.upsert({ where: { id: storeId }, create: { id: storeId, storeId, previewUrl: preview.previewUrl, status: "ready" }, update: { previewUrl: preview.previewUrl, status: "ready" } });
  }

  async publishStore(storeId: string, merchantId: string) {
    const store = await this.ownedStore(storeId, merchantId);
    if (!store) return null;
    const workspace = await this.sandbox.owned(storeId, merchantId);
    if (!workspace?.previewUrl) return null;
    return { previewUrl: workspace.previewUrl, status: "awaiting_approval", requiresProductionPublisher: true };
  }

  async verifyPreview(storeId: string, merchantId: string) {
    const workspace = await this.sandbox.owned(storeId, merchantId);
    if (!workspace?.previewUrl) return null;
    try {
      const response = await fetch(workspace.previewUrl, { signal: AbortSignal.timeout(10_000) });
      return { status: "observed", passed: response.ok, previewUrl: workspace.previewUrl, httpStatus: response.status, contentType: response.headers.get("content-type"), checkedAt: new Date().toISOString(), issues: response.ok ? [] : [`Preview returned HTTP ${response.status}`] };
    } catch (cause) {
      return { status: "provider_unavailable", passed: false, previewUrl: workspace.previewUrl, issues: [cause instanceof Error ? cause.message : "Preview health request failed"] };
    }
  }

  async repairPreview(storeId: string, merchantId: string) {
    const verification = await this.verifyPreview(storeId, merchantId);
    if (!verification) return null;
    return { status: "unavailable", fixed: false, issues: verification.issues, message: "A code-aware repair runtime is not configured." };
  }

  private async ownedStore(storeId: string, merchantId: string) {
    return this.prisma.store.findFirst({ where: { id: storeId, merchantId } });
  }

  private storeNameFromObjective(objective: string) {
    const explicitName = objective.match(/(?:business name|store name)\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? objective.match(/\bcalled\s+([^.!\n]+)/i)?.[1]?.trim();
    if (explicitName) return explicitName;
    if (/##\s*(merchant information|brand overview)/i.test(objective)) return null;
    const cleaned = objective.replace(/^(build|create|make)\s+(me\s+)?/i, "").replace(/\s+(store|shop|storefront)\b.*$/i, "").replace(/^(a|an|the)\s+/i, "").trim();
    if (!cleaned) return null;
    const title = cleaned.split(/\s+/).slice(0, 4).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    return `${title} Store`;
  }
}
