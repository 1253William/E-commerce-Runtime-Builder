export type AgentStatus = "success" | "failed";
export interface AgentTaskInput { objective: string; context?: string; modelType: string; }
export interface AgentRunContext { runId?: string; merchantId?: string; storeId?: string; workspaceId?: string; context?: string; }
export interface AgentOutput { status: AgentStatus; output: unknown; }
export interface RuntimeAgent { id: string; execute(task: AgentTaskInput, context: AgentRunContext): Promise<AgentOutput>; }
export interface TaskDefinition { id: string; agentId: string; objective: string; modelType: string; }
export interface CrewDefinition { id: string; taskIds: string[]; }
export interface FlowStep { taskId: string; dependsOn?: string[]; when?: { taskId: string; path: string; equals: unknown }; continueOnFailure?: boolean; }
export interface FlowDefinition { id: string; steps: FlowStep[]; }
export interface AgentObservation { taskId: string; agentId: string; runId?: string; status: AgentStatus; startedAt: string; finishedAt: string; output: unknown; }
export interface Artifact<T = unknown> { id: string; type: string; value: T; createdAt: string; }
export interface Tool<Input = unknown, Output = unknown> { id: string; description: string; execute(input: Input, context: AgentRunContext): Promise<Output>; }
export interface ToolExecutionObservation { toolId: string; runId?: string; startedAt: string; finishedAt: string; status: AgentStatus; input: unknown; output?: unknown; error?: string; }
export interface ToolPolicy { canExecute(toolId: string, context: AgentRunContext): boolean; }
export interface ModelDefinition { id: string; provider: string; model: string; tasks: string[]; }

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();
  register(tool: Tool): this { if (this.tools.has(tool.id)) throw new Error(`Tool already registered: ${tool.id}`); this.tools.set(tool.id, tool); return this; }
  get(id: string): Tool { const tool = this.tools.get(id); if (!tool) throw new Error(`Tool not registered: ${id}`); return tool; }
  list() { return [...this.tools.keys()]; }
}

export class PolicyRegistry {
  private readonly policies = new Map<string, ToolPolicy>();
  register(id: string, policy: ToolPolicy): this { this.policies.set(id, policy); return this; }
  get(id: string): ToolPolicy { const policy = this.policies.get(id); if (!policy) throw new Error(`Policy not registered: ${id}`); return policy; }
}

export class ModelRegistry {
  private readonly models = new Map<string, ModelDefinition>();
  register(model: ModelDefinition): this { this.models.set(model.id, model); return this; }
  forTask(task: string) { return [...this.models.values()].find((model) => model.tasks.includes(task)); }
}

export class ObservationStore {
  private readonly observations: AgentObservation[] = [];
  append(observation: AgentObservation) { this.observations.push(observation); }
  list(runId?: string) { return this.observations.filter((observation) => !runId || observation.runId === runId); }
}

export class ToolObservationStore {
  private readonly executions: ToolExecutionObservation[] = [];
  append(execution: ToolExecutionObservation) { this.executions.push(execution); }
  list(runId?: string) { return this.executions.filter((execution) => !runId || execution.runId === runId); }
}

export class AgentRegistry {
  private readonly agents = new Map<string, RuntimeAgent>();
  register(agent: RuntimeAgent): this {
    if (this.agents.has(agent.id)) throw new Error(`Agent already registered: ${agent.id}`);
    this.agents.set(agent.id, agent);
    return this;
  }
  get(id: string): RuntimeAgent {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent not registered: ${id}`);
    return agent;
  }
  list() { return [...this.agents.keys()]; }
}

export class TaskRunner {
  async run(definition: TaskDefinition, agent: RuntimeAgent, context: AgentRunContext, prior: Record<string, unknown>, objective?: string): Promise<AgentObservation> {
    const startedAt = new Date().toISOString();
    let suppliedContext: Record<string, unknown> = {};
    try {
      const parsed = context.context ? JSON.parse(context.context) as unknown : undefined;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) suppliedContext = parsed as Record<string, unknown>;
    } catch { /* Keep opaque run context under suppliedContext below. */ }
    const taskContext = JSON.stringify({ ...suppliedContext, ...prior, suppliedContext: context.context });
    const agentContext = { ...context, context: taskContext };
    const output = await agent.execute({ objective: objective ?? definition.objective, modelType: definition.modelType, context: taskContext }, agentContext);
    return { taskId: definition.id, agentId: definition.agentId, runId: context.runId, status: output.status, startedAt, finishedAt: new Date().toISOString(), output: output.output };
  }
}

export class AgentRuntime {
  private readonly tasks = new Map<string, TaskDefinition>();
  private readonly flows = new Map<string, FlowDefinition>();
  private readonly crews = new Map<string, CrewDefinition>();
  constructor(readonly agents: AgentRegistry, private readonly runner = new TaskRunner(), readonly tools = new ToolRegistry(), readonly models = new ModelRegistry(), readonly policies = new PolicyRegistry(), readonly observations = new ObservationStore(), readonly toolObservations = new ToolObservationStore()) {}
  registerTask(task: TaskDefinition) { this.tasks.set(task.id, task); return this; }
  registerFlow(flow: FlowDefinition) { this.flows.set(flow.id, flow); return this; }
  registerCrew(crew: CrewDefinition) { this.crews.set(crew.id, crew); return this; }
  async runCrew(crewId: string, context: AgentRunContext, objective?: string) {
    const crew = this.crews.get(crewId);
    if (!crew) throw new Error(`Crew not registered: ${crewId}`);
    const flowId = `crew:${crewId}`;
    this.registerFlow({ id: flowId, steps: crew.taskIds.map((taskId, index) => ({ taskId, ...(index ? { dependsOn: [crew.taskIds[index - 1]] } : {}) })) });
    return this.runFlow(flowId, context, objective);
  }
  async executeTool<T>(toolId: string, input: unknown, context: AgentRunContext, policyId = "default"): Promise<T> {
    const startedAt = new Date().toISOString();
    try {
      if (!this.policies.get(policyId).canExecute(toolId, context)) throw new Error(`Tool execution denied by policy: ${toolId}`);
      const output = await this.tools.get(toolId).execute(input, context) as T;
      this.toolObservations.append({ toolId, runId: context.runId, startedAt, finishedAt: new Date().toISOString(), status: "success", input, output });
      return output;
    } catch (cause) {
      this.toolObservations.append({ toolId, runId: context.runId, startedAt, finishedAt: new Date().toISOString(), status: "failed", input, error: cause instanceof Error ? cause.message : "Tool execution failed" });
      throw cause;
    }
  }
  async runFlow(flowId: string, context: AgentRunContext, objective?: string, onObservation?: (observation: AgentObservation) => Promise<void> | void, initialOutputs: Record<string, unknown> = {}): Promise<AgentObservation[]> {
    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow not registered: ${flowId}`);
    const results: AgentObservation[] = [];
    const outputs: Record<string, unknown> = { ...initialOutputs };
    for (const step of flow.steps) {
      if (step.when && !Object.is(readPath(outputs[step.when.taskId], step.when.path), step.when.equals)) {
        outputs[step.taskId] = { skipped: true, reason: "Flow condition was not met" };
        continue;
      }
      const definition = this.tasks.get(step.taskId);
      if (!definition) throw new Error(`Task not registered: ${step.taskId}`);
      for (const dependency of step.dependsOn ?? []) if (!(dependency in outputs)) throw new Error(`Flow dependency has not completed: ${dependency}`);
      const observation = await this.runner.run(definition, this.agents.get(definition.agentId), context, outputs, objective);
      results.push(observation);
      this.observations.append(observation);
      outputs[step.taskId] = observation.output;
      await onObservation?.(observation);
      if (observation.status !== "success" && !step.continueOnFailure) break;
    }
    return results;
  }
}

function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}
