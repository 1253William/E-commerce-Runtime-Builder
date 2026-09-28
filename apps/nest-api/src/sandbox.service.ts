import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { HttpSandboxProvider, type SandboxProvider, type WorkspaceFile } from "@seltra/sandbox";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class SandboxService {
  private readonly provider: SandboxProvider;
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    this.provider = new HttpSandboxProvider(process.env.SANDBOX_WORKER_URL ?? "", process.env.SANDBOX_WORKER_TOKEN ?? "");
  }
  async provision(storeId: string, merchantId: string) {
    const store = await this.prisma.store.findFirst({ where: { id: storeId, merchantId } });
    if (!store) return null;
    const workspace = await this.prisma.workspace.upsert({
      where: { storeId },
      create: { id: randomUUID(), storeId, merchantId, sandboxId: `seltra-workspace-${storeId.toLowerCase()}`, status: "PROVISIONING" },
      update: { status: "PROVISIONING" },
    });
    try {
      await this.provider.ensureWorkspace(workspace.sandboxId.replace(/^seltra-workspace-/, ""));
      return await this.prisma.workspace.update({ where: { id: workspace.id }, data: { status: "READY" } });
    } catch (cause) {
      await this.prisma.workspace.update({ where: { id: workspace.id }, data: { status: "FAILED" } });
      throw cause;
    }
  }
  async owned(storeId: string, merchantId: string) { return this.prisma.workspace.findFirst({ where: { storeId, merchantId } }); }
  async files(storeId: string, merchantId: string) {
    const workspace = await this.owned(storeId, merchantId);
    return workspace?.status === "READY" ? this.provider.listFiles(this.id(workspace.sandboxId)) : null;
  }
  async read(storeId: string, merchantId: string, path: string) {
    const workspace = await this.owned(storeId, merchantId);
    return workspace?.status === "READY" ? this.provider.readFile(this.id(workspace.sandboxId), path) : null;
  }
  async writeFile(storeId: string, merchantId: string, path: string, content: string) {
    const workspace = await this.owned(storeId, merchantId);
    if (workspace?.status !== "READY") return null;
    await this.provider.writeFile(this.id(workspace.sandboxId), path, content);
    return { path };
  }
  async execute(storeId: string, merchantId: string, argv: string[]) {
    const workspace = await this.owned(storeId, merchantId);
    return workspace?.status === "READY" ? this.provider.execute(this.id(workspace.sandboxId), argv) : null;
  }
  async preview(storeId: string, merchantId: string) {
    const workspace = await this.owned(storeId, merchantId);
    if (workspace?.status !== "READY") return null;
    const result = await this.provider.startPreview(this.id(workspace.sandboxId), 4173);
    return this.prisma.workspace.update({ where: { id: workspace.id }, data: { previewUrl: result.url } });
  }
  async saveSnapshot(storeId: string, merchantId: string, taskId?: string) {
    const workspace = await this.owned(storeId, merchantId);
    if (workspace?.status !== "READY") return null;
    const files: WorkspaceFile[] = await this.provider.snapshot(this.id(workspace.sandboxId));
    const latest = await this.prisma.workspaceSnapshot.findFirst({ where: { workspaceId: workspace.id }, orderBy: { revision: "desc" } });
    return this.prisma.workspaceSnapshot.create({ data: { id: randomUUID(), workspaceId: workspace.id, taskId, revision: (latest?.revision ?? 0) + 1, files: files as never } });
  }
  private id(sandboxId: string) { return sandboxId.replace(/^seltra-workspace-/, ""); }
}
