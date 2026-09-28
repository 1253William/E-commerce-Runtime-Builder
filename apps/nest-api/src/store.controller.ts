import { Body, Controller, Get, Headers, Inject, Param, Patch, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { StoreService } from "./store.service.js";

@Controller("stores")
export class StoreController {
  constructor(@Inject(StoreService) private readonly stores: StoreService) {}

  @Get()
  list(@Headers("x-merchant-id") merchantId = "merchant_1") { return this.stores.list(merchantId); }

  @Get(":id")
  async get(@Param("id") id: string, @Headers("x-merchant-id") merchantId = "merchant_1", @Res() response: Response) {
    const result = await this.stores.getOwned(id, merchantId);
    if (result.status === "not_found") return response.status(404).json({ success: false, error: "Store not found" });
    if (result.status === "forbidden") return response.status(403).json({ success: false, error: "Access denied" });
    return response.json({ success: true, data: result.value });
  }

  @Post()
  create(@Body() body: Record<string, unknown>, @Headers("x-merchant-id") merchantId = "merchant_1") {
    const name = typeof body.name === "string" ? body.name : "My Store";
    return this.stores.create({
      id: randomUUID(), merchant: { connect: { id: merchantId } }, name,
      slug: typeof body.slug === "string" ? body.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      brandName: name, brandPalette: ["#f8f3ec", "#1a1a1a", "#c9a76a"], brandTone: "premium editorial",
      themeMode: "minimal", themeAccent: "#c9a76a",
    });
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Headers("x-merchant-id") merchantId = "merchant_1", @Body() body: Record<string, unknown>, @Res() response: Response) {
    const result = await this.stores.update(id, merchantId, body);
    if (result.status === "not_found") return response.status(404).json({ success: false, error: "Store not found" });
    if (result.status === "forbidden") return response.status(403).json({ success: false, error: "Access denied" });
    return response.json({ success: true, data: result.value });
  }
}
