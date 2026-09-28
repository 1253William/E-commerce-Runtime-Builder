import { Inject, Injectable } from "@nestjs/common";
import { Prisma, Store } from "@prisma/client";
import { PrismaService } from "./prisma.service.js";

export interface StoreRepository {
  getById(id: string): Promise<Store | null>;
  listByMerchantId(merchantId: string): Promise<Store[]>;
  create(input: Prisma.StoreCreateInput): Promise<Store>;
  update(id: string, input: Prisma.StoreUpdateInput): Promise<Store>;
}

@Injectable()
export class PrismaStoreRepository implements StoreRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  getById(id: string) { return this.prisma.store.findUnique({ where: { id } }); }
  listByMerchantId(merchantId: string) { return this.prisma.store.findMany({ where: { merchantId } }); }
  create(input: Prisma.StoreCreateInput) { return this.prisma.store.create({ data: input }); }
  update(id: string, input: Prisma.StoreUpdateInput) { return this.prisma.store.update({ where: { id }, data: input }); }
}
