export type ModelType = "intent" | "summarization" | "planning" | "design" | "build" | "runtime" | "code" | "vision" | "image";

export interface AIRequest {
  task: string;
  context?: string;
  model?: string;
  schema?: Record<string, unknown>;
  maxTokens?: number;
}

export interface AIStreamEvent {
  type: "chunk" | "done" | "error";
  text?: string;
  done?: boolean;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface BudgetThresholds {
  warning: number;
  critical: number;
  stop: number;
}

export interface UsageRecord {
  provider: string;
  model: string;
  task: string;
  agent: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estimatedCost: number;
  createdAt: string;
}

export interface AIProvider {
  providerName: string;
  generateText(input: AIRequest): Promise<AIResponse>;
  streamText(input: AIRequest): AsyncIterable<AIStreamEvent>;
  generateStructured<T>(input: AIRequest, schema: Record<string, unknown>): Promise<T>;
}

export interface ModelSelection {
  provider: string;
  model: string;
  task: ModelType;
}

export class UsageTracker {
  private history: UsageRecord[] = [];

  record(record: Omit<UsageRecord, "createdAt">): UsageRecord {
    const entry: UsageRecord = {
      ...record,
      createdAt: new Date().toISOString(),
    };
    this.history.push(entry);
    return entry;
  }

  totalCost(): number {
    return this.history.reduce((sum, record) => sum + record.estimatedCost, 0);
  }

  snapshot(): UsageRecord[] {
    return [...this.history];
  }
}

export class BudgetController {
  constructor(private thresholds: BudgetThresholds = { warning: 0.5, critical: 0.75, stop: 1 }) {}

  getStatus(usageRatio: number): "normal" | "warning" | "critical" | "stop" {
    if (usageRatio >= this.thresholds.stop) return "stop";
    if (usageRatio >= this.thresholds.critical) return "critical";
    if (usageRatio >= this.thresholds.warning) return "warning";
    return "normal";
  }
}

export class CloudflareAIProvider implements AIProvider {
  providerName = "cloudflare";

  constructor(
    private readonly accountId = typeof process === "undefined" ? "" : process.env["CLOUDFLARE_ACCOUNT_ID-2"] ?? "",
    private readonly apiToken = typeof process === "undefined" ? "" : process.env["CLOUDFLARE_API_TOKEN-2"] ?? "",
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async run(input: AIRequest, stream = false): Promise<Response> {
    if (!this.accountId || !this.apiToken) throw new Error("Cloudflare AI credentials are not configured");
    const model = input.model ?? (typeof process === "undefined" ? undefined : process.env.AI_MODEL_DEFAULT) ?? "@cf/meta/llama-3.1-8b-instruct";
    if (!model.startsWith("@cf/")) throw new Error(`Unsupported Cloudflare model ID: ${model}. Use a Cloudflare-hosted @cf/ model; AI Gateway providers are disabled.`);
    const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/ai`;
    const url = `${base}/run/${model.split("/").map(encodeURIComponent).join("/")}`;
    const messages = [{ role: "system", content: "You are Seltra, a commerce application building assistant. Follow the requested output format exactly." }, { role: "user", content: input.context ? `${input.task}\n\nContext:\n${input.context}` : input.task }];
    const response = await this.fetcher(url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        messages, stream,
        ...(model === "@cf/openai/gpt-oss-120b" ? { reasoning_effort: "low" } : {}),
        ...(input.schema ? { max_tokens: input.maxTokens ?? 4096, response_format: { type: "json_schema", json_schema: input.schema } } : {}),
      }),
    });
    if (!response.ok) throw new Error(`Cloudflare AI request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
    return response;
  }

  async generateText(input: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const model = input.model ?? (typeof process === "undefined" ? undefined : process.env.AI_MODEL_DEFAULT) ?? "@cf/meta/llama-3.1-8b-instruct";
    const response = await this.run(input);
    const payload = await response.json() as { result?: { response?: unknown; choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }; choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const content = payload.result?.response ?? payload.result?.choices?.[0]?.message?.content ?? payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" && (!content || typeof content !== "object")) {
      const finishReason = payload.result?.choices?.[0]?.finish_reason ?? payload.choices?.[0]?.finish_reason ?? "unknown";
      throw new Error(`Cloudflare AI returned no text content (finish reason: ${finishReason})`);
    }
    const text = typeof content === "string" ? content : JSON.stringify(content);
    return {
      content: text,
      provider: this.providerName,
      model,
      inputTokens: payload.result?.usage?.prompt_tokens ?? payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.result?.usage?.completion_tokens ?? payload.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
    };
  }

  async *streamText(input: AIRequest): AsyncIterable<AIStreamEvent> {
    try {
      const response = await this.run(input, true);
      if (!response.body) throw new Error("Cloudflare AI streaming response has no body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const event = JSON.parse(payload) as { response?: string; result?: { response?: string; choices?: Array<{ delta?: { content?: string } }> }; choices?: Array<{ delta?: { content?: string } }> };
            const text = event.response ?? event.result?.response ?? event.result?.choices?.[0]?.delta?.content ?? event.choices?.[0]?.delta?.content;
            if (text) yield { type: "chunk", text };
          } catch { /* Ignore non-JSON SSE keepalive data. */ }
        }
      }
      yield { type: "done", done: true };
    } catch (error) {
      yield { type: "error", text: error instanceof Error ? error.message : "Cloudflare AI stream failed" };
    }
  }

  async generateStructured<T>(input: AIRequest, schema: Record<string, unknown>): Promise<T> {
    const baseTask = `${input.task}\nReturn only valid JSON matching this JSON schema:\n${JSON.stringify(schema)}`;
    let previousError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const task = attempt === 0
        ? baseTask
        : `${baseTask}\nYour previous output was invalid JSON: ${previousError instanceof Error ? previousError.message : "JSON parse failed"}. Return valid JSON only, with no markdown or surrounding text.`;
      const response = await this.generateText({ ...input, schema, task });
      const text = response.content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      try { return JSON.parse(text) as T; }
      catch (cause) {
        previousError = cause;
      }
    }
    const detail = previousError instanceof Error ? previousError.message : "JSON parse failed";
    throw new Error(`Cloudflare AI returned invalid structured JSON after one retry: ${detail}`, { cause: previousError });
  }
}

export class ModelRouter {
  private readonly defaultProvider: AIProvider;
  private readonly fallbackProvider?: AIProvider;

  constructor(defaultProvider: AIProvider, fallbackProvider?: AIProvider) {
    this.defaultProvider = defaultProvider;
    this.fallbackProvider = fallbackProvider;
  }

  chooseModel(task: ModelType): ModelSelection {
    const map: Record<ModelType, { model: string; provider: string }> = {
      intent: { model: process.env.AI_MODEL_DEFAULT ?? "@cf/meta/llama-3.1-8b-instruct", provider: "cloudflare" },
      summarization: { model: process.env.AI_MODEL_FAST ?? process.env.AI_MODEL_DEFAULT ?? "@cf/meta/llama-3.1-8b-instruct", provider: "cloudflare" },
      planning: { model: process.env.AI_MODEL_REASONING ?? process.env.AI_MODEL_DEFAULT ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast", provider: "cloudflare" },
      design: { model: process.env.AI_MODEL_REASONING ?? process.env.AI_MODEL_DEFAULT ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast", provider: "cloudflare" },
      build: { model: process.env.AI_MODEL_REASONING ?? process.env.AI_MODEL_DEFAULT ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast", provider: "cloudflare" },
      runtime: { model: process.env.AI_MODEL_REASONING ?? process.env.AI_MODEL_DEFAULT ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast", provider: "cloudflare" },
      code: { model: process.env.AI_MODEL_REASONING ?? process.env.AI_MODEL_DEFAULT ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast", provider: "cloudflare" },
      vision: { model: process.env.AI_MODEL_VISION ?? "@cf/meta/llama-3.2-11b-vision-instruct", provider: "cloudflare" },
      image: { model: process.env.AI_MODEL_IMAGE ?? "@cf/stabilityai/stable-diffusion-xl", provider: "cloudflare" },
    };

    const selected = map[task];
    return {
      provider: selected.provider,
      model: selected.model,
      task,
    };
  }

  getProvider(task: ModelType): AIProvider {
    return this.defaultProvider;
  }
}
