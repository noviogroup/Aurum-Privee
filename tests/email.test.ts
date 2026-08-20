import assert from "node:assert/strict";
import test from "node:test";
import { sendContactInquiryNotification, sendOrderEmails } from "@/lib/email";

async function withResendResponse<T>(status: number, body: object, run: () => Promise<T>) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  const originalNotification = process.env.STORE_NOTIFICATION_EMAIL;
  process.env.RESEND_API_KEY = "re_test_transactional_email";
  process.env.RESEND_FROM_EMAIL = "Aurum Privée <orders@example.com>";
  process.env.STORE_NOTIFICATION_EMAIL = "store@example.com";
  const calls: Array<{ url: string; headers: Headers; body: string }> = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers), body: String(init?.body || "") });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
  try { return { result: await run(), calls }; }
  finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = originalFrom;
    if (originalNotification === undefined) delete process.env.STORE_NOTIFICATION_EMAIL; else process.env.STORE_NOTIFICATION_EMAIL = originalNotification;
  }
}

test("order confirmation fails loudly when Resend returns an API error", async () => {
  await assert.rejects(
    () => withResendResponse(422, { name: "validation_error", message: "Sending domain is not verified", statusCode: 422 }, () => sendOrderEmails({
      orderNumber: "AP-EMAIL-1", customerName: "Client", customerEmail: "client@example.com", total: 110,
      items: [{ name: "Test Fragrance", quantity: 1, amount: 100 }],
    })),
    /Sending domain is not verified/,
  );
});

test("order confirmation uses stable customer and merchant idempotency keys", async () => {
  const { calls } = await withResendResponse(200, { id: "email-id" }, () => sendOrderEmails({
    orderNumber: "AP-EMAIL-2", customerName: "Client", customerEmail: "client@example.com", total: 110,
    items: [{ name: "Test Fragrance", quantity: 1, amount: 100 }],
  }));
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.headers.get("idempotency-key")).sort(), [
    "aurum-privee/order-confirmation/AP-EMAIL-2/customer",
    "aurum-privee/order-confirmation/AP-EMAIL-2/merchant",
  ]);
});

test("contact notification fails loudly when Resend returns an API error", async () => {
  await assert.rejects(
    () => withResendResponse(500, { name: "application_error", message: "Temporary failure", statusCode: 500 }, () => sendContactInquiryNotification({
      reference: "APC-TEST", name: "Client", email: "client@example.com", topic: "Order help", message: "Please help me with my recent fragrance order.",
    })),
    /Temporary failure/,
  );
});
