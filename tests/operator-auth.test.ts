import assert from "node:assert/strict";
import test from "node:test";
import {
  createOperatorSession,
  isSameOriginRequest,
  operatorCookieName,
  verifyOperatorPassword,
  verifyOperatorSession,
} from "../lib/operator-auth";

const originalEnvironment = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnvironment };
});

test("operator sessions are signed, expire and reject tampering", () => {
  process.env.OPERATIONS_SESSION_SECRET = "session-secret-that-is-longer-than-thirty-two-characters";
  const now = Date.UTC(2026, 7, 12, 12, 0, 0);
  const token = createOperatorSession(now);
  assert.ok(token);
  assert.equal(verifyOperatorSession(token, now + 1_000), true);
  assert.equal(verifyOperatorSession(`${token.slice(0, -1)}x`, now + 1_000), false);
  assert.equal(verifyOperatorSession(token, now + 9 * 60 * 60 * 1_000), false);
});

test("operator access refuses weak configuration", () => {
  process.env.OPERATIONS_SESSION_SECRET = "replace_me";
  process.env.OPERATIONS_PASSWORD = "short";
  assert.equal(createOperatorSession(), null);
  assert.equal(verifyOperatorPassword("short"), false);
});

test("operator password verification and cookie mode are explicit", () => {
  process.env.OPERATIONS_PASSWORD = "a-unique-local-operator-password";
  assert.equal(verifyOperatorPassword("a-unique-local-operator-password"), true);
  assert.equal(verifyOperatorPassword("a-unique-local-operator-passworx"), false);
  Object.assign(process.env, { NODE_ENV: "development" });
  assert.equal(operatorCookieName(), "lola_lily_ops");
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.equal(operatorCookieName(), "__Host-lola_lily_ops");
});

test("state-changing operator requests require the configured origin", () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.lolalily.example";
  assert.equal(isSameOriginRequest(new Request("https://shop.lolalily.example/api/operations/session", { headers: { origin: "https://shop.lolalily.example" } })), true);
  assert.equal(isSameOriginRequest(new Request("https://shop.lolalily.example/api/operations/session", { headers: { origin: "https://attacker.example" } })), false);
  assert.equal(isSameOriginRequest(new Request("https://shop.lolalily.example/api/operations/session")), false);
});
