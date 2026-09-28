import { Body, Controller, Headers, Inject, Param, Patch, Post, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { RuntimeService } from "./runtime.service.js";

@Controller()
export class RuntimeController {
  constructor(@Inject(RuntimeService) private readonly runtime: RuntimeService) {}

  private merchant(headers: Record<string, string | string[] | undefined>) { const value = headers["x-merchant-id"]; return typeof value === "string" ? value : "merchant_1"; }

  @Post("auth/signup") signup(@Body() body: { email: string; name: string }) { return this.runtime.signup(body); }
  @Post("auth/login") async login(@Body() body: { email?: string }, @Res() response: Response) { const result = await this.runtime.login(body.email ?? ""); return result ? response.json({ success: true, data: result }) : response.status(404).json({ success: false, error: "User not found" }); }

  @Post("conversations") createConversation(@Headers() headers: Record<string, string | string[] | undefined>, @Body() body: { storeId?: string; title?: string }) { return this.runtime.createConversation(this.merchant(headers), body); }
  @Get("conversations/:id") async getConversation(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { const result = await this.runtime.getConversation(id, this.merchant(headers)); return result ? response.json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Conversation not found" }); }
  @Post("conversations/:id/messages") async addMessage(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Body() body: { role?: "USER" | "ASSISTANT" | "SYSTEM"; content?: string }, @Res() response: Response) { const result = await this.runtime.addMessage(id, this.merchant(headers), body); return result ? response.status(201).json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Conversation not found" }); }

  @Post("tasks") async createTask(@Headers() headers: Record<string, string | string[] | undefined>, @Body() body: { objective: string; storeId?: string }, @Res() response: Response) { const result = await this.runtime.createTask(this.merchant(headers), body.objective, body.storeId); return response.status(201).json({ success: true, data: result }); }
  @Get("tasks/:id") async getTask(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { const result = await this.runtime.getTask(id, this.merchant(headers)); return result ? response.json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Task not found" }); }
  @Get("stores/:id/tasks") async latestTask(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { const result = await this.runtime.getLatestTask(id, this.merchant(headers)); return response.json({ success: true, data: result }); }
  @Post("tasks/:id/cancel") cancel(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { return this.transitionTask(id, this.merchant(headers), "CANCELLED", "task.cancelled", response); }
  @Post("tasks/:id/approve") approve(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { return this.transitionTask(id, this.merchant(headers), "COMPLETED", "approval.granted", response); }
  @Post("tasks/:id/retry") retry(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { return this.transitionTask(id, this.merchant(headers), "QUEUED", "task.retry", response); }

  @Get("stores/:id/products") listProducts(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string) { return this.runtime.listProducts(id, this.merchant(headers)); }
  @Post("stores/:id/products") async createProduct(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Body() body: Record<string, unknown>, @Res() response: Response) { const result = await this.runtime.createProduct(id, this.merchant(headers), body); return result ? response.status(201).json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Store not found" }); }
  @Get("stores/:id/collections") listCollections(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string) { return this.runtime.listCollections(id, this.merchant(headers)); }
  @Post("stores/:id/collections") async createCollection(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Body() body: Record<string, unknown>, @Res() response: Response) { const result = await this.runtime.createCollection(id, this.merchant(headers), body); return result ? response.status(201).json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Store not found" }); }

  @Post("stores/:id/preview") async createPreview(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { const result = await this.runtime.createPreview(id, this.merchant(headers)); return result ? response.status(201).json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Store not found" }); }
  @Post("stores/:id/publish") async publish(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { const result = await this.runtime.publishStore(id, this.merchant(headers)); return result ? response.json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Store not found" }); }
  @Post("stores/:id/preview/verify") async verify(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { const result = await this.runtime.verifyPreview(id, this.merchant(headers)); return result ? response.json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Store not found" }); }
  @Post("stores/:id/preview/repair") async repair(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) { const result = await this.runtime.repairPreview(id, this.merchant(headers)); return result ? response.json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Store not found" }); }

  private async transitionTask(id: string, merchantId: string, status: "CANCELLED" | "COMPLETED" | "QUEUED", event: string, response: Response) { const result = await this.runtime.transitionTask(id, merchantId, status, event); return result ? response.json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Task not found" }); }
}
