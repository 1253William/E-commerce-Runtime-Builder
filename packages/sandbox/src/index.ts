export interface WorkspaceFile { path: string; content: string; }
export interface CommandResult { success: boolean; exitCode: number; stdout: string; stderr: string; }
export interface PreviewResult { url: string; processId: string; }
export interface BrowserObservation { routes: Array<{ url: string; httpStatus: number | null; dom: { title: string; text: string; links: Array<{ text: string; href: string | null }>; buttons: string[]; forms: number; images: Array<{ src: string; loaded: boolean }> }; screenshotKey: string; viewport: { width: number; height: number } | null }>; consoleErrors: string[]; failedRequests: string[]; badResponses: string[]; visualCritique?: { status: string; feedback?: string; error?: string }; capturedAt: string; }
export interface SandboxToolEvent { toolName: string; input: unknown; output?: unknown; error?: string; status: "success" | "failed"; startedAt: string; finishedAt: string; }
export interface SandboxProvider {
  ensureWorkspace(workspaceId: string): Promise<void>;
  listFiles(workspaceId: string): Promise<string[]>;
  createDirectory(workspaceId: string, path: string): Promise<void>;
  readFile(workspaceId: string, path: string): Promise<string>;
  writeFile(workspaceId: string, path: string, content: string): Promise<void>;
  deleteFile(workspaceId: string, path: string): Promise<void>;
  moveFile(workspaceId: string, source: string, destination: string): Promise<void>;
  copyFile(workspaceId: string, source: string, destination: string): Promise<void>;
  execute(workspaceId: string, argv: string[], cwd?: string): Promise<CommandResult>;
  startProcess(workspaceId: string, argv: string[], cwd?: string): Promise<{ processId: string }>;
  listProcesses(workspaceId: string): Promise<Array<{ id: string; command: string; pid: number }>>;
  stopProcess(workspaceId: string, processId: string): Promise<void>;
  startPreview(workspaceId: string, port: number, argv?: string[]): Promise<PreviewResult>;
  observe(workspaceId: string, url: string, options?: { width?: number; height?: number; routes?: string[]; critiqueContext?: string }): Promise<BrowserObservation>;
  snapshot(workspaceId: string): Promise<WorkspaceFile[]>;
}

export class SandboxUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = "SandboxUnavailableError"; }
}

const workspaceIdPattern = /^[a-zA-Z0-9_-]{1,96}$/;
function describeFetchFailure(cause: unknown): string {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = cause;
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    if (current.message) messages.push(current.message);
    if (current instanceof AggregateError) {
      for (const nested of current.errors) {
        if (nested instanceof Error && nested.message) messages.push(nested.message);
        else if (nested != null) messages.push(String(nested));
      }
    }
    current = current.cause;
  }
  if (!messages.length) return String(cause);
  return [...new Set(messages)].join("; caused by: ");
}

export function validateWorkspaceId(value: string): string {
  if (!workspaceIdPattern.test(value)) throw new Error("Invalid workspace id");
  return value;
}

export function validateWorkspacePath(value: string): string {
  const path = value.replace(/\\/g, "/");
  if (!path || path.startsWith("/") || path.includes("\0") || path.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error("Workspace paths must be relative and cannot escape the workspace");
  }
  return path;
}

export class HttpSandboxProvider implements SandboxProvider {
  constructor(private readonly endpoint: string, private readonly token: string, private readonly fetcher: typeof fetch = fetch, private readonly onToolExecution?: (event: SandboxToolEvent) => Promise<void> | void) {}
  private async request<T>(workspaceId: string, route: string, init?: RequestInit): Promise<T> {
    validateWorkspaceId(workspaceId);
    const startedAt = new Date().toISOString();
    const toolName = toolNameFor(route, init?.method ?? "GET");
    let requestBody: unknown = init?.body;
    if (typeof requestBody === "string") { try { requestBody = sanitize(JSON.parse(requestBody)); } catch { requestBody = "[unparseable request body]"; } }
    const input = { workspaceId, route, method: init?.method ?? "GET", body: requestBody };
    if (!this.endpoint || !this.token) {
      const message = "Sandbox endpoint or internal token is not configured";
      await this.onToolExecution?.({ toolName, input, status: "failed", error: message, startedAt, finishedAt: new Date().toISOString() });
      throw new SandboxUnavailableError(message);
    }
    let response: Response;
    try {
      response = await this.fetcher(`${this.endpoint.replace(/\/$/, "")}/workspaces/${encodeURIComponent(workspaceId)}${route}`, {
        ...init, headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json", ...init?.headers },
      });
    } catch (cause) {
      const detail = describeFetchFailure(cause);
      const message = `Sandbox service is unreachable: ${detail}`;
      await this.onToolExecution?.({ toolName, input, status: "failed", error: message, startedAt, finishedAt: new Date().toISOString() });
      throw new SandboxUnavailableError(message, { cause });
    }
    const body = await response.json().catch(() => ({})) as { data?: T; error?: string };
    if (!response.ok) {
      const message = body.error ?? `Sandbox request failed (${response.status})`;
      await this.onToolExecution?.({ toolName, input, status: "failed", error: message, startedAt, finishedAt: new Date().toISOString() });
      throw new SandboxUnavailableError(message);
    }
    const toolOutput = route.startsWith("/files/content") && typeof body.data === "string" ? { characters: body.data.length, contentRedacted: true } : sanitize(body.data);
    await this.onToolExecution?.({ toolName, input, output: toolOutput, status: "success", startedAt, finishedAt: new Date().toISOString() });
    return body.data as T;
  }
  async ensureWorkspace(workspaceId: string) { await this.request(workspaceId, "", { method: "PUT" }); }
  async listFiles(workspaceId: string) { return this.request<string[]>(workspaceId, "/files"); }
  async createDirectory(workspaceId: string, path: string) { await this.request(workspaceId, "/directories", { method: "PUT", body: JSON.stringify({ path: validateWorkspacePath(path) }) }); }
  async readFile(workspaceId: string, path: string) { return this.request<string>(workspaceId, `/files/content?path=${encodeURIComponent(validateWorkspacePath(path))}`); }
  async writeFile(workspaceId: string, path: string, content: string) { await this.request(workspaceId, "/files", { method: "PUT", body: JSON.stringify({ path: validateWorkspacePath(path), content }) }); }
  async deleteFile(workspaceId: string, path: string) { await this.request(workspaceId, `/files?path=${encodeURIComponent(validateWorkspacePath(path))}`, { method: "DELETE" }); }
  async moveFile(workspaceId: string, source: string, destination: string) { await this.request(workspaceId, "/files/move", { method: "POST", body: JSON.stringify({ source: validateWorkspacePath(source), destination: validateWorkspacePath(destination) }) }); }
  async copyFile(workspaceId: string, source: string, destination: string) { await this.request(workspaceId, "/files/copy", { method: "POST", body: JSON.stringify({ source: validateWorkspacePath(source), destination: validateWorkspacePath(destination) }) }); }
  async execute(workspaceId: string, argv: string[], cwd = "/workspace") {
    if (!argv.length || argv.some((part) => typeof part !== "string" || part.length > 4096)) throw new Error("Invalid command arguments");
    return this.request<CommandResult>(workspaceId, "/commands", { method: "POST", body: JSON.stringify({ argv, cwd }) });
  }
  async startProcess(workspaceId: string, argv: string[], cwd = "/workspace") {
    if (!argv.length || argv.some((part) => typeof part !== "string" || part.length > 4096)) throw new Error("Invalid command arguments");
    return this.request<{ processId: string }>(workspaceId, "/processes", { method: "POST", body: JSON.stringify({ argv, cwd }) });
  }
  async listProcesses(workspaceId: string) { return this.request<Array<{ id: string; command: string; pid: number }>>(workspaceId, "/processes"); }
  async stopProcess(workspaceId: string, processId: string) { await this.request(workspaceId, `/processes?id=${encodeURIComponent(processId)}`, { method: "DELETE" }); }
  async startPreview(workspaceId: string, port: number, argv?: string[]) {
    return this.request<PreviewResult>(workspaceId, "/preview", { method: "POST", body: JSON.stringify({ port, argv }) });
  }
  async observe(workspaceId: string, url: string, options: { width?: number; height?: number; routes?: string[]; critiqueContext?: string } = {}) {
    return this.request<BrowserObservation>(workspaceId, "/browser", { method: "POST", body: JSON.stringify({ url, ...options }) });
  }
  async snapshot(workspaceId: string) {
    const paths = await this.listFiles(workspaceId);
    return Promise.all(paths.map(async (path) => ({ path, content: await this.readFile(workspaceId, path) })));
  }
}

function toolNameFor(route: string, method: string) {
  if (route.startsWith("/files/content")) return "fs.read";
  if (route === "/files" && method === "PUT") return "fs.write";
  if (route === "/files" && method === "DELETE") return "fs.delete";
  if (route === "/files" && method === "GET") return "fs.list";
  if (route === "/directories") return "fs.mkdir";
  if (route === "/files/move") return "fs.move";
  if (route === "/files/copy") return "fs.copy";
  if (route === "/commands") return "shell.exec";
  if (route === "/processes" && method === "GET") return "process.list";
  if (route === "/processes" && method === "DELETE") return "process.stop";
  if (route === "/processes") return "process.start";
  if (route === "/preview") return "preview.start";
  if (route === "/browser") return "browser.observe";
  if (route === "") return "workspace.ensure";
  return "sandbox.operation";
}

function sanitize(value: unknown, key = ""): unknown {
  if (/content|token|password|secret|screenshotbase64/i.test(key)) {
    if (typeof value === "string") return { redacted: true, characters: value.length };
    return "[redacted]";
  }
  if (typeof value === "string") return value.length > 2_000 ? `${value.slice(0, 2_000)}…[truncated]` : value;
  if (Array.isArray(value)) return value.slice(0, 100).map((entry) => sanitize(entry));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 100).map(([childKey, child]) => [childKey, sanitize(child, childKey)]));
  return value;
}
