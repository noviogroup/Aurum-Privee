import assert from "node:assert/strict";
import test from "node:test";
import { evaluateProductionPreflight } from "@/lib/production-preflight";
import type { OperationsReadiness } from "@/lib/operations-integration-types";

function readiness(overrides: Partial<OperationsReadiness> = {}): OperationsReadiness {
  return {
    ready: 1,
    total: 1,
    live: true,
    checkedAt: "2026-08-13T12:00:00.000Z",
    services: [{
      id: "loyverse",
      name: "Loyverse",
      summary: "Catalog and orders",
      state: "ready",
      status: "Ready",
      connection: "API reachable",
      facts: [],
      requirements: [],
    }],
    ...overrides,
  };
}

test("production preflight passes only fully ready live checks", () => {
  assert.equal(evaluateProductionPreflight(readiness()).passed, true);
});

test("production preflight rejects configuration-only results", () => {
  const result = evaluateProductionPreflight(readiness({ live: false }));
  assert.equal(result.passed, false);
  assert.equal(result.failures[0].service, "Live verification");
});

test("production preflight reports every non-ready service requirement", () => {
  const result = evaluateProductionPreflight(readiness({
    ready: 0,
    services: [{
      id: "payments",
      name: "Payments",
      summary: "Checkout",
      state: "attention",
      status: "Launch disabled",
      connection: "API reachable",
      facts: [],
      requirements: ["Set NEXT_PUBLIC_CHECKOUT_ENABLED=true only after acceptance testing"],
    }],
  }));
  assert.equal(result.passed, false);
  assert.deepEqual(result.failures, [{
    service: "Payments",
    status: "Launch disabled",
    requirements: ["Set NEXT_PUBLIC_CHECKOUT_ENABLED=true only after acceptance testing"],
  }]);
});

test("production preflight cannot pass an empty service set", () => {
  assert.equal(evaluateProductionPreflight(readiness({ ready: 0, total: 0, services: [] })).passed, false);
});
