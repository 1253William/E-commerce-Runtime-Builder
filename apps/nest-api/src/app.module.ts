import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";
import { StoreController } from "./store.controller.js";
import { PrismaStoreRepository } from "./store.repository.js";
import { StoreService } from "./store.service.js";
import { HealthController } from "./health.controller.js";
import { RuntimeController } from "./runtime.controller.js";
import { RuntimeService } from "./runtime.service.js";
import { QueueService } from "./queue.service.js";
import { SandboxService } from "./sandbox.service.js";
import { WorkspaceController } from "./workspace.controller.js";
import { CommerceController } from "./commerce.controller.js";
import { CommerceService } from "./commerce.service.js";

@Module({ controllers: [HealthController, StoreController, RuntimeController, WorkspaceController, CommerceController], providers: [PrismaService, PrismaStoreRepository, StoreService, RuntimeService, QueueService, SandboxService, CommerceService] })
export class AppModule {}
