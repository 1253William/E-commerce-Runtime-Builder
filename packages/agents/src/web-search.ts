export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchTool {
  search(query: string, limit?: number): Promise<WebSearchResult[]>;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function safeResultUrl(value: string): string | undefined {
  try {
    const url = new URL(decodeHtml(value), "https://html.duckduckgo.com");
    if (url.hostname === "duckduckgo.com" && url.pathname === "/l/") {
      const target = url.searchParams.get("uddg");
      if (target) return safeResultUrl(target);
    }
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Searches the web through Tavily when TAVILY_API_KEY is configured. In local
 * development, it falls back to DuckDuckGo's lightweight HTML results page.
 */
export class HttpWebSearchTool implements WebSearchTool {
  constructor(
    private readonly apiKey = process.env.TAVILY_API_KEY,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async search(query: string, limit = 5): Promise<WebSearchResult[]> {
    const normalized = query.trim().slice(0, 500);
    if (!normalized) return [];
    const boundedLimit = Math.max(1, Math.min(5, Math.floor(limit)));
    return this.apiKey
      ? this.searchTavily(normalized, boundedLimit)
      : this.searchDuckDuckGo(normalized, boundedLimit);
  }

  private async searchTavily(query: string, limit: number): Promise<WebSearchResult[]> {
    const response = await this.fetcher("https://api.tavily.com/search", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ query, topic: "general", search_depth: "advanced", chunks_per_source: 3, max_results: limit, include_answer: false }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Tavily search failed (${response.status})`);
    const payload = await response.json() as { results?: Array<{ title?: unknown; url?: unknown; content?: unknown }> };
    return (payload.results ?? []).flatMap((result) => {
      const url = typeof result.url === "string" ? safeResultUrl(result.url) : undefined;
      if (!url) return [];
      return [{ title: String(result.title ?? "Untitled result").slice(0, 300), url, snippet: String(result.content ?? "").slice(0, 1_000) }];
    }).slice(0, limit);
  }

  private async searchDuckDuckGo(query: string, limit: number): Promise<WebSearchResult[]> {
    const url = new URL("https://html.duckduckgo.com/html/");
    url.searchParams.set("q", query);
    const response = await this.fetcher(url, {
      headers: { "user-agent": "SeltraResearch/1.0 (+https://seltra.app)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`DuckDuckGo search failed (${response.status})`);
    const html = await response.text();
    const results: WebSearchResult[] = [];
    const blocks = html.match(/<div[^>]+class="[^"]*result[^"]*"[^>]*>[\s\S]*?(?=<div[^>]+class="[^"]*result[^"]*"|$)/gi) ?? [];
    for (const block of blocks) {
      const link = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!link) continue;
      const resultUrl = safeResultUrl(link[1]!);
      if (!resultUrl) continue;
      const snippet = block.match(/<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>|<td[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
      results.push({ title: stripTags(link[2]!).slice(0, 300), url: resultUrl, snippet: stripTags(snippet?.[1] ?? snippet?.[2] ?? "").slice(0, 1_000) });
      if (results.length >= limit) break;
    }
    return results;
  }
}
