import type { AgentContext, AgentTask } from "./index.js";

/** Outputs from earlier flow tasks, keyed by task id ("build", "browser-1", ...). */
export function priorOutputs(task: AgentTask, context: AgentContext): Record<string, unknown> | undefined {
  for (const raw of [task.context, context.context]) {
    if (!raw) continue;
    try {
      const value = JSON.parse(raw) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch { /* try the next source */ }
  }
  return undefined;
}

export function latestPrior<T = Record<string, unknown>>(prior: Record<string, unknown> | undefined, prefix: string): T | undefined {
  if (!prior) return undefined;
  const key = Object.keys(prior).filter((name) => name === prefix || new RegExp(`^${prefix}-\\d+$`).test(name)).at(-1);
  return key ? prior[key] as T : undefined;
}
