import assert from "node:assert/strict";
import test from "node:test";
import { BudgetController, CloudflareAIProvider, ModelRouter } from "./index.js";

test("Cloudflare provider calls the real Workers AI endpoint", async () => {
  let requested = "";
  const provider = new CloudflareAIProvider("account-1", "secret-token", async (input, init) => {
    requested = String(input);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer secret-token");
    const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
    assert.match(body.messages[1].content, /premium skincare store/i);
    return Response.json({ result: { response: "Generated source instructions" }, usage: { prompt_tokens: 14, completion_tokens: 21 } });
  });
  const response = await provider.generateText({ task: "Build a premium skincare store" });
  assert.match(requested, /accounts\/account-1\/ai\/run\//);
  assert.equal(response.provider, "cloudflare");
  assert.equal(response.content, "Generated source instructions");
  assert.equal(response.inputTokens, 14);
  assert.equal(response.outputTokens, 21);
});

test("Cloudflare provider reads OpenAI-format completions wrapped by Workers AI", async () => {
  const provider = new CloudflareAIProvider("account-1", "secret-token", async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { reasoning_effort?: string };
    assert.equal(body.reasoning_effort, "low");
    return Response.json({ result: { choices: [{ message: { content: '{"files":[]}' } }], usage: { prompt_tokens: 7, completion_tokens: 11 } } });
  });
  const response = await provider.generateText({ task: "Return JSON", model: "@cf/openai/gpt-oss-120b" });
  assert.equal(response.content, '{"files":[]}');
  assert.equal(response.inputTokens, 7);
  assert.equal(response.outputTokens, 11);
});

test("Cloudflare provider reports missing credentials instead of returning a placeholder", async () => {
  const provider = new CloudflareAIProvider("", "");
  await assert.rejects(provider.generateText({ task: "Build an app" }), /credentials are not configured/);
});

test("Cloudflare provider blocks third-party AI Gateway model IDs", async () => {
  let requested = false;
  const provider = new CloudflareAIProvider("account-1", "secret-token", async () => {
    requested = true;
    return Response.json({});
  });
  await assert.rejects(provider.generateText({ task: "Build an app", model: "openai/gpt-6-sol" }), /AI Gateway providers are disabled/);
  assert.equal(requested, false);
});

test("Cloudflare Workers AI always reads account 2 credentials", async () => {
  const previous = {
    account1: process.env["CLOUDFLARE_ACCOUNT_ID-1"],
    token1: process.env["CLOUDFLARE_API_TOKEN-1"],
    account2: process.env["CLOUDFLARE_ACCOUNT_ID-2"],
    token2: process.env["CLOUDFLARE_API_TOKEN-2"],
  };
  process.env["CLOUDFLARE_ACCOUNT_ID-1"] = "execution-account";
  process.env["CLOUDFLARE_API_TOKEN-1"] = "execution-token";
  process.env["CLOUDFLARE_ACCOUNT_ID-2"] = "models-account";
  process.env["CLOUDFLARE_API_TOKEN-2"] = "models-token";
  try {
    let requested = "";
    const provider = new CloudflareAIProvider(undefined, undefined, async (input, init) => {
      requested = String(input);
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer models-token");
      return Response.json({ result: { response: "OK" } });
    });
    await provider.generateText({ task: "Test account routing" });
    assert.match(requested, /accounts\/models-account\/ai\/run\//);
    assert.doesNotMatch(requested, /execution-account/);
  } finally {
    for (const [key, value] of [["CLOUDFLARE_ACCOUNT_ID-1", previous.account1], ["CLOUDFLARE_API_TOKEN-1", previous.token1], ["CLOUDFLARE_ACCOUNT_ID-2", previous.account2], ["CLOUDFLARE_API_TOKEN-2", previous.token2]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("model router chooses the right model for planning", () => {
  const router = new ModelRouter(new CloudflareAIProvider("account", "token"));
  const selected = router.chooseModel("planning");
  assert.equal(selected.task, "planning");
  assert.equal(selected.model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
});

test("budget controller exposes status thresholds", () => {
  const controller = new BudgetController({ warning: 0.5, critical: 0.75, stop: 1 });
  assert.equal(controller.getStatus(0.4), "normal");
  assert.equal(controller.getStatus(0.6), "warning");
  assert.equal(controller.getStatus(0.9), "critical");
  assert.equal(controller.getStatus(1), "stop");
});
