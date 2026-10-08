import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { api, request, useTestServer } from "./helpers";

useTestServer();

describe("app foundation", () => {
  it("GET /api is public and reports the API is alive", async () => {
    const health = await api.get("/api", { token: null });
    assert.equal(health.status, 200);
    assert.equal(health.message, "API is alive");
  });

  it("protects every other route by default", async () => {
    const res = await api.get("/api/doctor/list", { token: null });
    assert.equal(res.status, 401);
    assert.deepEqual(
      { isSuccess: res.isSuccess, message: res.message, body: res.body },
      { isSuccess: false, message: "Authentication required", body: null },
    );
  });

  it("rejects a forged token", async () => {
    const res = await api.get("/api/doctor/list", { token: "not.a.valid-token" });
    assert.equal(res.status, 401);
    assert.equal(res.message, "Invalid or expired token");
  });

  it("answers unknown routes with the envelope and 404", async () => {
    const res = await api.get("/api/does-not-exist");
    assert.equal(res.status, 404);
    assert.equal(res.isSuccess, false);
    assert.equal(res.message, "Route GET /api/does-not-exist not found");
  });

  it("returns 400 for malformed JSON bodies", async () => {
    const res = await request("POST", "/api/doctor/create", { rawBody: '{"broken":' });
    assert.equal(res.status, 400);
    assert.equal(res.message, "Malformed JSON body");
  });

  it("sets security and no-store headers and hides the framework", async () => {
    const res = await api.get("/api/doctor/options");
    assert.equal(res.headers.get("x-powered-by"), null);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.equal(res.headers.get("etag"), null);
  });
});
