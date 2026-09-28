import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { CommerceService } from "./commerce.service.js";
import type { PrismaService } from "./prisma.service.js";

function service(overrides: Record<string, unknown> = {}) {
  const calls: Array<{ operation: string; args: unknown }> = [];
  const prisma = {
    store: { async findUnique(args: unknown) { calls.push({ operation: "store.findUnique", args }); return { id: "store-a", merchantId: "merchant-a" }; } },
    commerceRecord: {
      async findMany(args: unknown) { calls.push({ operation: "record.findMany", args }); return []; },
      async create(args: unknown) { calls.push({ operation: "record.create", args }); return { id: "record-a", status: "pending" }; },
      async findFirst(args: unknown) { calls.push({ operation: "record.findFirst", args }); return { id: "record-a", storeId: "store-a", merchantId: "merchant-a", type: "ORDER", status: "pending", data: {} }; },
      async updateMany(args: unknown) { calls.push({ operation: "record.updateMany", args }); return { count: 1 }; },
      async findUnique(args: unknown) { calls.push({ operation: "record.findUnique", args }); return { id: "record-a", status: "confirmed" }; },
    },
    ...overrides,
  } as unknown as PrismaService;
  return { commerce: new CommerceService(prisma), calls };
}

test("commerce records are store scoped and start at their domain lifecycle state", async () => {
  const { commerce, calls } = service();
  const created = await commerce.create("store-a", "merchant-a", "orders", { number: "A-1" });
  assert.deepEqual(created, { id: "record-a", status: "pending" });
  assert.equal(calls.some((call) => call.operation === "record.create"), true);
  const createArgs = calls.find((call) => call.operation === "record.create")?.args as { data: { type: string; status: string; merchantId: string } };
  assert.deepEqual({ type: createArgs.data.type, status: createArgs.data.status, merchantId: createArgs.data.merchantId }, { type: "ORDER", status: "pending", merchantId: "merchant-a" });
});

test("commerce status transitions are validated and updated with optimistic concurrency", async () => {
  const { commerce, calls } = service();
  await commerce.update("store-a", "merchant-a", "orders", "record-a", { status: "confirmed" });
  const updateArgs = calls.find((call) => call.operation === "record.updateMany")?.args as { where: { status: string; merchantId: string }; data: { status: string } };
  assert.deepEqual(updateArgs.where, { id: "record-a", storeId: "store-a", merchantId: "merchant-a", status: "pending" });
  assert.equal(updateArgs.data.status, "confirmed");
  await assert.rejects(commerce.update("store-a", "merchant-a", "orders", "record-a", { status: "refunded" }), BadRequestException);
});

test("commerce records reject access through a different merchant", async () => {
  const { commerce } = service({ store: { async findUnique() { return { id: "store-a", merchantId: "other-merchant" }; } } });
  await assert.rejects(commerce.list("store-a", "merchant-a", "orders"), ForbiddenException);
});
