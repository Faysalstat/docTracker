// helpers first: it loads .env before any model (and the DB connector) is imported.
import { EMAIL_DOMAIN, api, useTestServer } from "./helpers";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcrypt";
import User from "../src/model/user";

const credentials = { email: `admin@${EMAIL_DOMAIN}`, password: "Str0ng!Passw0rd" };

useTestServer(async () => {
  await User.create({
    name: "Test Admin",
    email: credentials.email,
    password: await bcrypt.hash(credentials.password, 4),
  });
});

async function loginToken() {
  const res = await api.post("/api/auth/login", credentials, { token: null });
  return (res.body as { token: string }).token;
}

describe("POST /api/auth/login", () => {
  it("returns a token and the user without the password", async () => {
    const res = await api.post("/api/auth/login", credentials, { token: null });

    assert.equal(res.status, 200);
    assert.equal(res.message, "Login successful");
    assert.equal(typeof res.body.token, "string");
    assert.ok(!Number.isNaN(Date.parse(res.body.expiresAt)));
    assert.equal(res.body.user.email, credentials.email);
    assert.equal(res.body.user.role, "admin");
    assert.equal(typeof res.body.user._id, "string");
    assert.equal("password" in res.body.user, false);
  });

  it("accepts the email case-insensitively", async () => {
    const res = await api.post(
      "/api/auth/login",
      { ...credentials, email: credentials.email.toUpperCase() },
      { token: null },
    );
    assert.equal(res.status, 200);
  });

  for (const [name, body] of [
    ["wrong password", { email: credentials.email, password: "wrong-password" }],
    ["unknown email", { email: `nobody@${EMAIL_DOMAIN}`, password: credentials.password }],
  ] as const) {
    it(`returns the same generic 401 for ${name}`, async () => {
      const res = await api.post("/api/auth/login", body, { token: null });
      assert.equal(res.status, 401);
      assert.equal(res.message, "Login failed: Invalid email or password");
    });
  }

  it("rejects invalid input with a readable message", async () => {
    const res = await api.post(
      "/api/auth/login",
      { email: "not-an-email", password: "" },
      { token: null },
    );
    assert.equal(res.status, 401);
    assert.equal(res.message, "Login failed: email must be a valid email address");
  });

  it("rejects operator injection in the credentials", async () => {
    const res = await api.post(
      "/api/auth/login",
      { email: { $gt: "" }, password: { $gt: "" } },
      { token: null },
    );
    assert.equal(res.status, 401);
    assert.equal(res.message, "Login failed: email must be a string");
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without a token", async () => {
    const res = await api.get("/api/auth/me", { token: null });
    assert.equal(res.status, 401);
  });

  it("returns the current user for a valid token", async () => {
    const res = await api.get("/api/auth/me", { token: await loginToken() });
    assert.equal(res.status, 200);
    assert.equal(res.body.email, credentials.email);
    assert.equal(res.body.role, "admin");
  });

  it("returns 401 when the token's user no longer exists", async () => {
    // The default test token belongs to a random id with no user record.
    const res = await api.get("/api/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.message, "Current user fetch failed: User not found");
  });
});
