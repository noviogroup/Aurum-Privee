import assert from "node:assert/strict";
import test from "node:test";
import { getHealthStatus } from "@/lib/health";
import { GET } from "@/app/api/health/route";
import { buildWixHealthStatus } from "@/lib/wix-health";

test("public health is a cheap liveness response without operational telemetry", async () => {
  const response = await GET(new Request("https://shop.example/api/health"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.match(response.headers.get("cache-control") || "", /max-age=30/);
});

test("detailed health requires the monitor bearer secret", async () => {
  const previousSecret = process.env.HEALTH_MONITOR_SECRET;
  const previousProvider = process.env.COMMERCE_PROVIDER;
  process.env.HEALTH_MONITOR_SECRET = "12345678901234567890123456789012";
  process.env.COMMERCE_PROVIDER = "legacy";
  try {
    const denied = await GET(new Request("https://shop.example/api/health", { headers: { authorization: "Bearer wrong" } }));
    assert.deepEqual(await denied.json(), { status: "ok" });
    const accepted = await GET(new Request("https://shop.example/api/health", { headers: { authorization: "Bearer 12345678901234567890123456789012" } }));
    const body = await accepted.json();
    assert.equal(accepted.status, 503);
    assert.equal(body.status, "unavailable");
    assert.equal(body.database, "unavailable");
  } finally {
    if (previousSecret === undefined) delete process.env.HEALTH_MONITOR_SECRET; else process.env.HEALTH_MONITOR_SECRET = previousSecret;
    if (previousProvider === undefined) delete process.env.COMMERCE_PROVIDER; else process.env.COMMERCE_PROVIDER = previousProvider;
  }
});

test("health reports unavailable without a configured database", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousProvider = process.env.COMMERCE_PROVIDER;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.COMMERCE_PROVIDER = "legacy";
  try {
    const status = await getHealthStatus(new Date("2026-08-12T12:00:00.000Z"));
    assert.equal(status.status, "unavailable");
    assert.equal(status.database, "unavailable");
    assert.equal(status.checkedAt, "2026-08-12T12:00:00.000Z");
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    if (previousProvider === undefined) delete process.env.COMMERCE_PROVIDER; else process.env.COMMERCE_PROVIDER = previousProvider;
  }
});

test("Wix health requires every approved SKU to resolve to a live catalog variant", () => {
  const healthy = buildWixHealthStatus({
    checkedAt: "2026-09-17T12:00:00.000Z",
    mappedSkuCount: 733,
    expectedSkuCount: 733,
    availableMappedVariants: 733,
    orderApiReachable: true,
  });
  assert.equal(healthy.status, "ok");
  assert.equal(healthy.catalog, "ok");
  assert.equal(healthy.orderVerification, "ok");

  assert.equal(buildWixHealthStatus({
    checkedAt: healthy.checkedAt,
    mappedSkuCount: 732,
    expectedSkuCount: 733,
    availableMappedVariants: 733,
    orderApiReachable: true,
  }).status, "degraded");
  assert.equal(buildWixHealthStatus({
    checkedAt: healthy.checkedAt,
    mappedSkuCount: 733,
    expectedSkuCount: 733,
    availableMappedVariants: 732,
    orderApiReachable: true,
  }).status, "degraded");
  assert.equal(buildWixHealthStatus({
    checkedAt: healthy.checkedAt,
    mappedSkuCount: 733,
    expectedSkuCount: 733,
    availableMappedVariants: 733,
    orderApiReachable: false,
  }).status, "degraded");
});
