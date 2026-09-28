CREATE TYPE "WorkspaceStatus" AS ENUM ('PROVISIONING', 'READY', 'FAILED', 'ARCHIVED');
ALTER TYPE "TaskStatus" ADD VALUE 'NEEDS_REVIEW';
CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL, "merchantId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "sandboxId" TEXT NOT NULL,
  "root" TEXT NOT NULL DEFAULT '/workspace', "status" "WorkspaceStatus" NOT NULL DEFAULT 'PROVISIONING',
  "previewUrl" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkspaceSnapshot" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "taskId" TEXT, "revision" INTEGER NOT NULL,
  "files" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Workspace_storeId_key" ON "Workspace"("storeId");
CREATE UNIQUE INDEX "Workspace_sandboxId_key" ON "Workspace"("sandboxId");
CREATE UNIQUE INDEX "WorkspaceSnapshot_workspaceId_revision_key" ON "WorkspaceSnapshot"("workspaceId", "revision");
CREATE INDEX "WorkspaceSnapshot_workspaceId_createdAt_idx" ON "WorkspaceSnapshot"("workspaceId", "createdAt");
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceSnapshot" ADD CONSTRAINT "WorkspaceSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
