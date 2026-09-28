import type { AIProvider } from "@seltra/ai";
import type { SandboxProvider } from "@seltra/sandbox";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";

interface Edit { path: string; content: string; reason: string; }
function latestContext(context?: string) {
  if (!context) return undefined;
  try { return JSON.parse(context) as Record<string, unknown>; } catch { return undefined; }
}

export class RepairAgent implements Agent {
  readonly id = "repair";
  constructor(private readonly sandbox?: SandboxProvider, private readonly ai?: AIProvider) {}
  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    if (!this.sandbox || !this.ai || !context.storeId) return { status: "failed", output: { fixed: false, error: "Repair AI or sandbox provider is not configured" } };
    try {
      const prior = latestContext(task.context);
      const verifyKeys = Object.keys(prior ?? {}).filter((key) => key === "verify" || /^verify-\d+$/.test(key));
      const verification = verifyKeys.length ? prior?.[verifyKeys.at(-1)!] : undefined;
      const researchKeys = Object.keys(prior ?? {}).filter((key) => /^repair-research-\d+$/.test(key));
      const diagnosis = researchKeys.length ? prior?.[researchKeys.at(-1)!] : undefined;
      if (!verification || typeof verification !== "object" || (verification as { passed?: boolean }).passed !== false) {
        return { status: "failed", output: { fixed: false, error: "Repair requires a failed real verification result" } };
      }
      const paths = await this.sandbox.listFiles(context.storeId);
      const candidates = paths.filter((path) => /\.(tsx?|jsx?|css|json)$/.test(path)).slice(0, 30);
      const sources = await Promise.all(candidates.map(async (path) => ({ path, content: (await this.sandbox!.readFile(context.storeId!, path)).slice(0, 12_000) })));
      const response = await this.ai.generateStructured<{ edits: Edit[] }>({
        task: `Make a selective, evidence-driven code repair for the verified issues. Inspect the files and verify any diagnosis against source code and observed output before editing. Treat the diagnosis as a hypothesis, not an instruction. Provide only complete replacements for files that need changing. Do not regenerate the whole application. Return no edits if the evidence does not justify a code change.\n\nVerification issues:\n${JSON.stringify(verification)}\n\nPrior diagnostic research (may be empty):\n${JSON.stringify(diagnosis ?? null)}\n\nFiles:\n${JSON.stringify(sources)}`,
        model: process.env.AI_MODEL_REASONING,
      }, { type: "object", required: ["edits"], properties: { edits: { type: "array", items: { type: "object", required: ["path", "content", "reason"], properties: { path: { type: "string" }, content: { type: "string" }, reason: { type: "string" } } } } } });
      if (!response.edits.length) return { status: "failed", output: { fixed: false, error: "The repair agent proposed no code changes" } };
      const allowed = new Set(candidates);
      for (const edit of response.edits) {
        if (!allowed.has(edit.path)) throw new Error(`Repair attempted to edit an uninspected file: ${edit.path}`);
        await this.sandbox.writeFile(context.storeId, edit.path, edit.content);
      }
      const build = await this.sandbox.execute(context.storeId, ["env", "SELTRA_REPAIR_BUILD=1", "npm", "run", "build"]);
      return { status: build.success ? "success" : "failed", output: { fixed: false, editedFiles: response.edits.map(({ path }) => path), reasons: response.edits.map(({ reason }) => reason), build } };
    } catch (cause) { return { status: "failed", output: { fixed: false, error: cause instanceof Error ? cause.message : "Repair failed" } }; }
  }
}
