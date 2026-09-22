import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const netlify = readFileSync("netlify.toml", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");
const environment = readFileSync(".env.example", "utf8");
const robots = readFileSync("app/robots.ts", "utf8");
const account = readFileSync("app/account/page.tsx", "utf8");
const workflow = readFileSync(".github/workflows/verify.yml", "utf8");

function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("Netlify blocks publishing when release checks fail", () => {
  assert.match(netlify, /command = "npm run verify:build"/);
});

test("Netlify and Next apply the required production browser security policy", () => {
  for (const [key, value] of [
    ["X-Frame-Options", "DENY"],
    ["X-Content-Type-Options", "nosniff"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
    ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
  ]) {
    assert.match(netlify, new RegExp(`${escapePattern(key)} = "${escapePattern(value)}"`));
    assert.match(nextConfig, new RegExp(`key: "${escapePattern(key)}", value: "${escapePattern(value)}"`));
  }

  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ]) {
    assert.match(netlify, new RegExp(escapePattern(directive)));
    assert.match(nextConfig, new RegExp(escapePattern(directive)));
  }
});

test("clean CI exercises the production provider, migrations and dependency audit", () => {
  assert.match(workflow, /COMMERCE_PROVIDER: wix/);
  assert.match(workflow, /NEXT_PUBLIC_CHECKOUT_ENABLED: "false"/);
  assert.match(workflow, /image: postgres:16/);
  assert.match(workflow, /npm run test:migrations/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /npm run verify/);
});

test("every documented recovery worker has a production schedule", () => {
  for (const name of [
    "inventory-reservation-cleanup",
    "transactional-email-retry",
    "loyverse-order-retry",
    "loyverse-nightly-reconcile",
    "store-health-monitor",
  ]) {
    assert.match(netlify, new RegExp(`\\[functions\\."${name}"\\]\\n\\s+schedule = `));
  }
});

test("browser authentication can reach the configured Supabase project", () => {
  assert.match(netlify, /connect-src[^\n]*https:\/\/\*\.supabase\.co[^\n]*wss:\/\/\*\.supabase\.co/);
});

test("the sample production contract lists independent worker secrets", () => {
  assert.match(environment, /^SYNC_SECRET=/m);
  assert.match(environment, /^HEALTH_MONITOR_SECRET=/m);
  assert.match(environment, /^LOYVERSE_WEBHOOK_TOKEN=/m);
  assert.match(environment, /^COMMERCE_PROVIDER=wix$/m);
});

test("private and transactional routes are excluded from search indexing", () => {
  for (const path of ["/account", "/api/", "/auth/", "/checkout", "/operations", "/order", "/saved"]) {
    assert.match(robots, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(account, /robots: \{ index: false, follow: false \}/);
});

test("legacy operations mutations fail closed while Wix is active", () => {
  for (const path of [
    "app/api/operations/orders/fulfillment/route.ts",
    "app/api/operations/catalog/route.ts",
    "app/api/operations/customers/route.ts",
    "app/api/operations/images/route.ts",
  ]) {
    assert.match(readFileSync(path, "utf8"), /legacyOperationsWritesEnabled\(\)/);
  }
});

test("every legacy commerce endpoint is inert while Wix is active", () => {
  for (const path of [
    "app/api/stripe/webhook/route.ts",
    "app/api/loyverse/webhook/route.ts",
    "app/api/orders/route.ts",
    "app/api/orders/fulfillment/route.ts",
    "app/api/setup/loyverse/route.ts",
    "app/api/sync/email/route.ts",
    "app/api/sync/loyverse/route.ts",
    "app/api/sync/loyverse/orders/route.ts",
    "app/api/sync/reservations/route.ts",
  ]) {
    assert.match(readFileSync(path, "utf8"), /legacyCommerceEnabled\(\)/);
  }
});
