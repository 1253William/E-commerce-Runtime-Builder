import { Controller, Get, Headers, Inject, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { SandboxService } from "./sandbox.service.js";

@Controller("stores/:id/workspace")
export class WorkspaceController {
  constructor(@Inject(SandboxService) private readonly sandbox: SandboxService) {}
  private merchant(headers: Record<string, string | string[] | undefined>) {
    const value = headers["x-merchant-id"];
    return typeof value === "string" ? value : "merchant_1";
  }
  @Get() async get(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) {
    const workspace = await this.sandbox.owned(id, this.merchant(headers));
    return workspace ? response.json({ success: true, data: workspace }) : response.status(404).json({ success: false, error: "Workspace not found" });
  }
  @Get("files") async files(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Res() response: Response) {
    const result = await this.sandbox.files(id, this.merchant(headers));
    return result ? response.json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Workspace is not ready" });
  }
  @Get("file") async read(@Headers() headers: Record<string, string | string[] | undefined>, @Param("id") id: string, @Query("path") path: string, @Res() response: Response) {
    if (!path) return response.status(400).json({ success: false, error: "path is required" });
    const result = await this.sandbox.read(id, this.merchant(headers), path);
    return result !== null ? response.json({ success: true, data: result }) : response.status(404).json({ success: false, error: "Workspace file not found" });
  }
}
