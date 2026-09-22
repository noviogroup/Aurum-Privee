import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientRequestTimeoutError,
  ClientResponseFormatError,
  requestJson,
} from "../lib/client-json-request";

test("client JSON requests return the response and decoded body", async () => {
  const result = await requestJson<{ message: string }>("https://example.test/api", {
    fetcher: async () => new Response(JSON.stringify({ message: "received" }), {
      status: 202,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }),
  });

  assert.equal(result.response.status, 202);
  assert.deepEqual(result.data, { message: "received" });
});

test("client JSON requests reject non-JSON edge responses", async () => {
  await assert.rejects(
    requestJson("https://example.test/api", {
      fetcher: async () => new Response("Gateway timeout", {
        status: 504,
        headers: { "Content-Type": "text/html" },
      }),
    }),
    ClientResponseFormatError,
  );
});

test("client JSON requests abort stalled responses within the deadline", async () => {
  const stalledFetch: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });

  await assert.rejects(
    requestJson("https://example.test/api", { fetcher: stalledFetch, timeoutMs: 10 }),
    ClientRequestTimeoutError,
  );
});

test("client JSON requests forward an upstream lifecycle abort", async () => {
  const controller = new AbortController();
  const stalledFetch: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });

  const request = requestJson("https://example.test/api", {
    fetcher: stalledFetch,
    signal: controller.signal,
  });
  controller.abort();

  await assert.rejects(request, (error: unknown) => error instanceof DOMException && error.name === "AbortError");
});
