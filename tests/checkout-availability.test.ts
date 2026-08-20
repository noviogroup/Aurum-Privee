import assert from "node:assert/strict";
import test from "node:test";
import { checkoutIsEnabled } from "@/lib/checkout-availability";
import { POST } from "@/app/api/checkout/route";

test("checkout launch control fails closed", () => {
  assert.equal(checkoutIsEnabled(undefined), false);
  assert.equal(checkoutIsEnabled(""), false);
  assert.equal(checkoutIsEnabled("false"), false);
  assert.equal(checkoutIsEnabled("TRUE"), false);
});

test("checkout opens only for an explicit true value", () => {
  assert.equal(checkoutIsEnabled("true"), true);
});

test("checkout API refuses requests while launch control is closed", async () => {
  const previous = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED;
  delete process.env.NEXT_PUBLIC_CHECKOUT_ENABLED;
  try {
    const response = await POST(new Request("https://shop.example/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ productId: "example", quantity: 1 }] }),
    }));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Online checkout is not open yet." });
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_CHECKOUT_ENABLED;
    else process.env.NEXT_PUBLIC_CHECKOUT_ENABLED = previous;
  }
});
