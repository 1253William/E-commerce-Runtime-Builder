import type { AIProvider } from "@seltra/ai";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";

interface VisualIssue { severity: "critical" | "major" | "minor"; route: string; observation: string; recommendation: string; }
interface CriticResult { score: number; passed: boolean; issues: VisualIssue[]; summary: string; }
function latestOutput(context: string | undefined, prefix: string): Record<string, unknown> | undefined {
  if (!context) return undefined;
  try { const parsed = JSON.parse(context) as Record<string, unknown>; const key = Object.keys(parsed).filter((name) => name === prefix || new RegExp(`^${prefix}-\\d+$`).test(name)).at(-1); return key ? parsed[key] as Record<string, unknown> : undefined; }
  catch { return undefined; }
}

export class VisualCriticAgent implements Agent {
  readonly id = "visual-critic";
  constructor(private readonly ai?: AIProvider) {}
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.ai) return { status: "failed", output: { error: "Visual critic AI provider is not configured" } };
    const browser = latestOutput(task.context, "browser");
    const design = latestOutput(task.context, "design");
    if (!browser?.desktop || !browser.mobile) return { status: "failed", output: { error: "Real desktop and mobile screenshot observations are required" } };
    try {
      const result = await this.ai.generateStructured<CriticResult>({
        task: `Evaluate the actual rendered application against merchant intent, application plan, and design direction. The desktop and mobile screenshot observations contain Cloudflare Vision model critiques from real screenshots plus captured DOM and runtime data. Return a numeric quality score from 0 to 100, pass only when there are no critical or major issues, and concrete route-specific repair instructions. Compare intent, plan, design and rendered output; do not say only "make it prettier".\n\nIntent: ${task.objective}\nDesign direction: ${JSON.stringify(design)}\nRendered observations: ${JSON.stringify({ desktop: browser.desktop, mobile: browser.mobile })}`,
        model: process.env.AI_MODEL_REASONING,
      }, { type: "object", required: ["score", "passed", "issues", "summary"], properties: { score: { type: "number", minimum: 0, maximum: 100 }, passed: { type: "boolean" }, summary: { type: "string" }, issues: { type: "array", items: { type: "object", required: ["severity", "route", "observation", "recommendation"], properties: { severity: { type: "string", enum: ["critical", "major", "minor"] }, route: { type: "string" }, observation: { type: "string" }, recommendation: { type: "string" } } } } } });
      return { status: "success", output: { ...result, screenshotKeys: [browser.desktop, browser.mobile].flatMap((view) => (view as { routes: Array<{ screenshotKey: string }> }).routes.map((route) => route.screenshotKey)) } };
    } catch (cause) { return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Visual critique failed" } }; }
  }
}
