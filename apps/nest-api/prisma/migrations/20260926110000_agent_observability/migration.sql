CREATE TABLE "AgentRun" (
  "id" TEXT NOT NULL, "taskId" TEXT NOT NULL, "flowId" TEXT NOT NULL, "status" TEXT NOT NULL,
  "state" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "finishedAt" TIMESTAMP(3),
  CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AgentStep" (
  "id" TEXT NOT NULL, "runId" TEXT NOT NULL, "taskKey" TEXT NOT NULL, "agentId" TEXT NOT NULL, "status" TEXT NOT NULL,
  "input" JSONB, "output" JSONB, "startedAt" TIMESTAMP(3) NOT NULL, "finishedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentStep_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ToolExecution" (
  "id" TEXT NOT NULL, "runId" TEXT NOT NULL, "stepId" TEXT, "toolName" TEXT NOT NULL, "status" TEXT NOT NULL,
  "input" JSONB NOT NULL, "output" JSONB, "error" TEXT, "startedAt" TIMESTAMP(3) NOT NULL, "finishedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ToolExecution_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Observation" (
  "id" TEXT NOT NULL, "runId" TEXT NOT NULL, "stepId" TEXT, "kind" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Evaluation" (
  "id" TEXT NOT NULL, "runId" TEXT NOT NULL, "kind" TEXT NOT NULL, "passed" BOOLEAN NOT NULL,
  "score" DOUBLE PRECISION, "findings" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgentStep_runId_taskKey_key" ON "AgentStep"("runId", "taskKey");
CREATE INDEX "AgentRun_taskId_createdAt_idx" ON "AgentRun"("taskId", "createdAt");
CREATE INDEX "AgentRun_status_startedAt_idx" ON "AgentRun"("status", "startedAt");
CREATE INDEX "AgentStep_runId_startedAt_idx" ON "AgentStep"("runId", "startedAt");
CREATE INDEX "ToolExecution_runId_startedAt_idx" ON "ToolExecution"("runId", "startedAt");
CREATE INDEX "Observation_runId_createdAt_idx" ON "Observation"("runId", "createdAt");
CREATE INDEX "Evaluation_runId_kind_idx" ON "Evaluation"("runId", "kind");
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentStep" ADD CONSTRAINT "AgentStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToolExecution" ADD CONSTRAINT "ToolExecution_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToolExecution" ADD CONSTRAINT "ToolExecution_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "AgentStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "AgentStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
