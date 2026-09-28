import { Inject, Injectable } from "@nestjs/common";
import { Prisma, Store } from "@prisma/client";
import { PrismaStoreRepository } from "./store.repository.js";

export type OwnedResult<T> =
  | { status: "ok"; value: T }
  | { status: "not_found" }
  | { status: "forbidden" };

@Injectable()
export class StoreService {
  constructor(@Inject(PrismaStoreRepository) private readonly stores: PrismaStoreRepository) {}

  list(merchantId: string) { return this.stores.listByMerchantId(merchantId); }

  async getOwned(id: string, merchantId: string): Promise<OwnedResult<Store>> {
    const store = await this.stores.getById(id);
    if (!store) return { status: "not_found" };
    if (store.merchantId !== merchantId) return { status: "forbidden" };
    return { status: "ok", value: store };
  }

  create(input: Prisma.StoreCreateInput) { return this.stores.create(input); }

  async update(id: string, merchantId: string, input: Prisma.StoreUpdateInput): Promise<OwnedResult<Store>> {
    const result = await this.getOwned(id, merchantId);
    return result.status === "ok" ? { status: "ok", value: await this.stores.update(id, input) } : result;
  }
}
