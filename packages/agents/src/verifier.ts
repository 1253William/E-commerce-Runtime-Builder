import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";
import { latestPrior, priorOutputs } from "./prior-outputs.js";
interface RouteObservation { url: string; httpStatus: number | null; dom: { title: string; text: string; images: Array<{ src: string; loaded: boolean }> }; }
interface ViewObservation { routes: RouteObservation[]; consoleErrors: string[]; failedRequests: string[]; badResponses: string[]; }
export class Verifier implements Agent {
  readonly id = "verifier";
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    const prior = priorOutputs(task, context);
    const observed = latestPrior<{ previewUrl?: string; desktop?: ViewObservation; mobile?: ViewObservation }>(prior, "browser");
    if (!observed?.desktop || !observed.mobile) return { status: "failed", output: { passed: false, status: "insufficient_observations", issues: ["Real desktop and mobile browser observations are required"] } };
    const visual = latestPrior<{ passed?: boolean; issues?: Array<{ severity: string; route: string; observation: string }> }>(prior, "critic");
    if (!visual) return { status: "failed", output: { passed: false, status: "insufficient_observations", issues: ["A visual critic result based on real screenshots is required"] } };
    const issues: string[] = [];
    for (const [viewport, result] of [["desktop", observed.desktop], ["mobile", observed.mobile]] as const) {
      for (const error of result.consoleErrors) issues.push(`${viewport} console error: ${error}`);
      for (const failure of result.failedRequests) issues.push(`${viewport} request failed: ${failure}`);
      for (const response of result.badResponses) issues.push(`${viewport} unsuccessful response: ${response}`);
      for (const route of result.routes) {
        if (route.httpStatus === null || route.httpStatus >= 400) issues.push(`${viewport} route did not load: ${route.url} (${route.httpStatus ?? "no response"})`);
        if (!route.dom.title) issues.push(`${viewport} route has no document title: ${route.url}`);
        for (const image of route.dom.images) if (!image.loaded) issues.push(`${viewport} image failed to load: ${image.src}`);
      }
    }
    if (!visual.passed) for (const issue of visual.issues ?? []) if (issue.severity === "critical" || issue.severity === "major") issues.push(`Visual ${issue.severity} on ${issue.route}: ${issue.observation}`);
    if (!visual.passed && !(visual.issues?.length)) issues.push("Visual critic rejected the application without issue details");
    return { status: "success", output: { passed: issues.length === 0, status: issues.length ? "needs_repair" : "verified", previewUrl: observed.previewUrl, issues, routeCount: observed.desktop.routes.length, checkedViewports: ["desktop", "mobile"], evaluatedAt: new Date().toISOString() } };
  }
}
