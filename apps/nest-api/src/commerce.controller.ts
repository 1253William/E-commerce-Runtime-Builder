import { Body, Controller, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";
import { CommerceService } from "./commerce.service.js";

@Controller("stores/:storeId/commerce")
export class CommerceController {
  constructor(@Inject(CommerceService) private readonly commerce: CommerceService) {}
  @Get(":kind") list(@Param("storeId") storeId: string, @Param("kind") kind: string, @Headers("x-merchant-id") merchantId = "merchant_1") {
    return this.commerce.list(storeId, merchantId, kind);
  }
  @Post(":kind") create(@Param("storeId") storeId: string, @Param("kind") kind: string, @Headers("x-merchant-id") merchantId = "merchant_1", @Body() body: { data?: unknown }) {
    return this.commerce.create(storeId, merchantId, kind, body?.data);
  }
  @Patch(":kind/:recordId") update(@Param("storeId") storeId: string, @Param("kind") kind: string, @Param("recordId") recordId: string, @Headers("x-merchant-id") merchantId = "merchant_1", @Body() body: unknown) {
    return this.commerce.update(storeId, merchantId, kind, recordId, body);
  }
}
