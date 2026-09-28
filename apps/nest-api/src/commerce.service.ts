import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service.js";

const types = ["SERVICE", "APPOINTMENT", "ORDER", "QUOTE", "INVENTORY", "CUSTOMER", "FULFILLMENT", "SERVICE_CASE", "PRODUCTION", "TABLE", "MENU_ITEM", "SUBSCRIPTION"] as const;
type RecordType = typeof types[number];
const initialStatus: Record<RecordType, string> = { SERVICE: "draft", APPOINTMENT: "requested", ORDER: "pending", QUOTE: "draft", INVENTORY: "active", CUSTOMER: "active", FULFILLMENT: "pending", SERVICE_CASE: "submitted", PRODUCTION: "queued", TABLE: "available", MENU_ITEM: "draft", SUBSCRIPTION: "pending" };
const transitions: Record<string, string[]> = {
  draft: ["active", "cancelled"], pending: ["confirmed", "paid", "cancelled"], requested: ["confirmed", "cancelled"], confirmed: ["in_progress", "cancelled"], in_progress: ["ready", "completed"], ready: ["completed"], submitted: ["assessing", "cancelled"], assessing: ["quoted", "cancelled"], quoted: ["approved", "rejected"], approved: ["paid", "cancelled"], paid: ["in_progress", "refunded"], queued: ["in_progress", "cancelled"], available: ["occupied"], occupied: ["available"], active: ["inactive", "cancelled"],
};

@Injectable()
export class CommerceService {
  constructor(private readonly prisma: PrismaService) {}

  private async ownedStore(storeId: string, merchantId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException("Store not found");
    if (store.merchantId !== merchantId) throw new ForbiddenException("Store access denied");
    return store;
  }
  private type(kind: string): RecordType {
    const value = ({ services: "SERVICE", appointments: "APPOINTMENT", orders: "ORDER", quotes: "QUOTE", inventory: "INVENTORY", inventories: "INVENTORY", customers: "CUSTOMER", fulfillment: "FULFILLMENT", fulfillments: "FULFILLMENT", "service-cases": "SERVICE_CASE", production: "PRODUCTION", tables: "TABLE", "menu-items": "MENU_ITEM", subscriptions: "SUBSCRIPTION" } as Record<string, string>)[kind] ?? kind.replace(/-/g, "_").toUpperCase();
    if (!types.includes(value as RecordType)) throw new BadRequestException(`Unsupported commerce resource: ${kind}`);
    return value as RecordType;
  }
  private data(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("data must be a JSON object");
    if (JSON.stringify(value).length > 65_536) throw new BadRequestException("Commerce record data exceeds 64 KB");
    return value as Record<string, unknown>;
  }
  async list(storeId: string, merchantId: string, kind: string) {
    await this.ownedStore(storeId, merchantId);
    return this.prisma.commerceRecord.findMany({ where: { storeId, merchantId, type: this.type(kind) }, orderBy: { createdAt: "desc" } });
  }
  async create(storeId: string, merchantId: string, kind: string, value: unknown) {
    await this.ownedStore(storeId, merchantId);
    const type = this.type(kind);
    const body = this.data(value);
    return this.prisma.commerceRecord.create({ data: { id: randomUUID(), storeId, merchantId, type, status: initialStatus[type], data: body as Prisma.InputJsonValue } });
  }
  async update(storeId: string, merchantId: string, kind: string, id: string, value: unknown) {
    await this.ownedStore(storeId, merchantId);
    const type = this.type(kind);
    const record = await this.prisma.commerceRecord.findFirst({ where: { id, storeId, merchantId, type } });
    if (!record) throw new NotFoundException("Commerce record not found");
    const body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const data = body.data === undefined ? undefined : this.data(body.data);
    let status: string | undefined;
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !transitions[record.status]?.includes(body.status)) throw new BadRequestException(`Invalid status transition: ${record.status} -> ${String(body.status)}`);
      status = body.status;
    }
    if (data === undefined && status === undefined) throw new BadRequestException("Provide data or a valid next status");
    const changed = await this.prisma.commerceRecord.updateMany({ where: { id, storeId, merchantId, status: record.status }, data: { ...(data === undefined ? {} : { data: data as Prisma.InputJsonValue }), ...(status ? { status } : {}) } });
    if (!changed.count) throw new ConflictException("Commerce record changed concurrently; reload it and retry");
    return this.prisma.commerceRecord.findUnique({ where: { id } });
  }
}
