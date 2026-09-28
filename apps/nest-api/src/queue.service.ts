import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PgBoss } from "pg-boss";

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly boss = process.env.DATABASE_URL ? new PgBoss({ connectionString: process.env.DATABASE_URL, supervise: false }) : null;

  async onModuleInit() {
    if (!this.boss) return;
    await this.boss.start();
    await this.boss.createQueue("seltra-agent-tasks");
  }

  async enqueueTask(taskId: string, merchantId: string) {
    if (!this.boss) return null;
    return this.boss.send("seltra-agent-tasks", { taskId, merchantId });
  }

  async onModuleDestroy() {
    if (this.boss) await this.boss.stop();
  }
}
