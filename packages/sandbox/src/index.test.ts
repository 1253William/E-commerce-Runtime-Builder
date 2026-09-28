import assert from "node:assert/strict";
import test from "node:test";
import { HttpSandboxProvider, validateWorkspaceId, validateWorkspacePath } from "./index.js";

test("workspace ids and paths reject traversal", () => {
  assert.equal(validateWorkspaceId("store_123"), "store_123");
  assert.equal(validateWorkspacePath("app/page.tsx"), "app/page.tsx");
  assert.throws(() => validateWorkspaceId("../other"), /Invalid workspace id/);
  assert.throws(() => validateWorkspacePath("app/../../secrets"), /cannot escape/);
  assert.throws(() => validateWorkspacePath("/etc/passwd"), /relative/);
});

test("sandbox client uses authenticated structured file requests", async () => {
  let url = "";
  const provider = new HttpSandboxProvider("https://sandbox.example", "test-token", async (input, init) => {
    url = String(input);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-token");
    assert.deepEqual(JSON.parse(String(init?.body)), { path: "app/page.tsx", content: "source" });
    return Response.json({ data: { path: "app/page.tsx" } });
  });
  await provider.writeFile("store_123", "app/page.tsx", "source");
  assert.equal(url, "https://sandbox.example/workspaces/store_123/files");
});
