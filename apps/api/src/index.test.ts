import assert from "node:assert/strict";
import test from "node:test";

import app from "./index";

test("health endpoint is available", async () => {
  const response = await app.request("http://localhost/health");
  assert.equal(response.status, 200);

  const payload = (await response.json()) as { ok: boolean; service: string };
  assert.equal(payload.ok, true);
  assert.equal(payload.service, "seltra-api");
});

test("signup creates a merchant and store", async () => {
  const response = await app.request("http://localhost/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "new@seltra.dev", password: "secret123", name: "North Studio" }),
  });

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    success: boolean;
    data: { user: { email: string; merchantId: string }; store: { merchantId: string } };
  };
  assert.equal(payload.success, true);
  assert.equal(payload.data.user.email, "new@seltra.dev");
  assert.equal(payload.data.store.merchantId, payload.data.user.merchantId);
});

test("stores endpoint returns merchant-owned stores", async () => {
  const response = await app.request("http://localhost/stores", {
    headers: { Authorization: "Bearer user_1" },
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as { success: boolean; data: Array<{ id: string }> };
  assert.equal(payload.success, true);
  assert.ok(payload.data.length >= 1);
});

test("legacy API reports unavailable execution instead of a fabricated plan", async () => {
  const response = await app.request("http://localhost/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer user_1",
    },
    body: JSON.stringify({ objective: "Build a premium skincare store" }),
  });

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    success: boolean;
    data: { objective: string; status: string; plan?: { objective: string; steps: string[] } };
  };
  assert.equal(payload.success, true);
  assert.equal(payload.data.objective, "Build a premium skincare store");
  assert.equal(payload.data.status, "blocked");
});

test("preview route reports that no real workspace preview exists", async () => {
  const response = await app.request("http://localhost/stores/store_1/preview", {
    method: "POST",
    headers: { Authorization: "Bearer user_1" },
  });

  assert.equal(response.status, 404);
});

test("task lifecycle preserves ownership and records events", async () => {
  const created = await app.request("http://localhost/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer user_1" },
    body: JSON.stringify({ objective: "Prepare a product launch" }),
  });
  const createdPayload = (await created.json()) as { data: { id: string } };

  const approved = await app.request(`http://localhost/tasks/${createdPayload.data.id}/approve`, {
    method: "POST",
    headers: { Authorization: "Bearer user_1" },
  });

  assert.equal(approved.status, 200);
  const approvedPayload = (await approved.json()) as { success: boolean; data: { status: string; events: string[] } };
  assert.equal(approvedPayload.success, true);
  assert.equal(approvedPayload.data.status, "completed");
  assert.ok(approvedPayload.data.events.includes("approval.granted"));
});

test("product and conversation routes delegate to domain services", async () => {
  const productResponse = await app.request("http://localhost/stores/store_1/products", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer user_1" },
    body: JSON.stringify({ name: "Barrier Cream", price: 29, inventory: 12 }),
  });
  assert.equal(productResponse.status, 201);

  const productsResponse = await app.request("http://localhost/stores/store_1/products", { headers: { Authorization: "Bearer user_1" } });
  const productsPayload = (await productsResponse.json()) as { data: Array<{ name: string }> };
  assert.ok(productsPayload.data.some((product) => product.name === "Barrier Cream"));

  const conversationResponse = await app.request("http://localhost/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer user_1" },
    body: JSON.stringify({ title: "Launch planning" }),
  });
  const conversationPayload = (await conversationResponse.json()) as { data: { id: string } };
  const messageResponse = await app.request(`http://localhost/conversations/${conversationPayload.data.id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer user_1" },
    body: JSON.stringify({ content: "Build the launch page" }),
  });

  assert.equal(messageResponse.status, 201);
  const messagePayload = (await messageResponse.json()) as { success: boolean; data: { content: string } };
  assert.equal(messagePayload.success, true);
  assert.equal(messagePayload.data.content, "Build the launch page");
});

test("store ownership distinguishes missing and forbidden resources", async () => {
  const missing = await app.request("http://localhost/stores/missing-store", {
    headers: { Authorization: "Bearer user_1" },
  });
  assert.equal(missing.status, 404);

  const signup = await app.request("http://localhost/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner-two@seltra.dev", password: "secret123", name: "Owner Two" }),
  });
  const signupPayload = (await signup.json()) as { data: { store: { id: string } } };
  const forbidden = await app.request(`http://localhost/stores/${signupPayload.data.store.id}`, {
    headers: { Authorization: "Bearer user_1" },
  });
  assert.equal(forbidden.status, 403);
});

test("task ownership distinguishes missing and forbidden resources", async () => {
  const missing = await app.request("http://localhost/tasks/missing-task", {
    headers: { Authorization: "Bearer user_1" },
  });
  assert.equal(missing.status, 404);

  const signup = await app.request("http://localhost/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner-three@seltra.dev", password: "secret123", name: "Owner Three" }),
  });
  const signupPayload = (await signup.json()) as { data: { user: { id: string } } };
  const task = await app.request("http://localhost/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${signupPayload.data.user.id}` },
    body: JSON.stringify({ objective: "Create a private task" }),
  });
  const taskPayload = (await task.json()) as { data: { id: string } };
  const forbidden = await app.request(`http://localhost/tasks/${taskPayload.data.id}`, {
    headers: { Authorization: "Bearer user_1" },
  });
  assert.equal(forbidden.status, 403);
});

test("collections and preview verification use extracted services", async () => {
  const collection = await app.request("http://localhost/stores/store_1/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer user_1" },
    body: JSON.stringify({ name: "Daily Rituals", description: "A simple skincare routine" }),
  });
  assert.equal(collection.status, 201);

  const collections = await app.request("http://localhost/stores/store_1/collections", {
    headers: { Authorization: "Bearer user_1" },
  });
  const collectionPayload = (await collections.json()) as { data: Array<{ name: string }> };
  assert.ok(collectionPayload.data.some((entry) => entry.name === "Daily Rituals"));

  const verification = await app.request("http://localhost/stores/store_1/preview/verify", {
    method: "POST",
    headers: { Authorization: "Bearer user_1" },
  });
  assert.equal(verification.status, 404);

  const repair = await app.request("http://localhost/stores/store_1/preview/repair", {
    method: "POST",
    headers: { Authorization: "Bearer user_1" },
  });
  assert.equal(repair.status, 404);
});
