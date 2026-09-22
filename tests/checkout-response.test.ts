import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutRedirectUrl,
  checkoutRedirectUrlFromBody,
  checkoutResponseError,
} from "@/lib/checkout-response";

function response(body: unknown, ok: boolean) {
  return {
    ok,
    json: async () => body,
  };
}

test("checkout response returns the hosted checkout URL", async () => {
  assert.equal(
    await checkoutRedirectUrl(response({ url: "https://www.wix.com/checkout/ready" }, true)),
    "https://www.wix.com/checkout/ready",
  );
  assert.equal(
    checkoutRedirectUrlFromBody({ ok: true }, { url: "https://www.wix.com/checkout/decoded" }),
    "https://www.wix.com/checkout/decoded",
  );
});

test("checkout response preserves a concise server-provided recovery message", async () => {
  await assert.rejects(
    checkoutRedirectUrl(response({ error: "Checkout is temporarily closed." }, false)),
    /Checkout is temporarily closed\./,
  );
});

test("checkout response uses a safe fallback for malformed or oversized errors", async () => {
  await assert.rejects(
    checkoutRedirectUrl(response({ error: "x".repeat(241) }, false)),
    new Error(checkoutResponseError),
  );
  await assert.rejects(
    checkoutRedirectUrl(response({}, true)),
    new Error(checkoutResponseError),
  );
});

test("checkout response uses a safe fallback when an upstream proxy returns non-JSON", async () => {
  await assert.rejects(
    checkoutRedirectUrl({ ok: false, json: async () => { throw new SyntaxError("Unexpected token"); } }),
    new Error(checkoutResponseError),
  );
});

test("checkout response rejects unsafe hosted redirect destinations", () => {
  for (const url of [
    "javascript:alert(document.domain)",
    "http://checkout.example.test/session",
    "https://user:password@checkout.example.test/session",
    "/checkout/session",
  ]) {
    assert.throws(
      () => checkoutRedirectUrlFromBody({ ok: true }, { url }),
      new Error(checkoutResponseError),
    );
  }
});
