import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHostedBaseUrl } from "@/lib/hosted-verification";

test("hosted verification requires an explicit HTTPS deployment origin", () => {
  assert.throws(() => normalizeHostedBaseUrl(undefined), /Set PLAYWRIGHT_BASE_URL/);
  assert.throws(() => normalizeHostedBaseUrl("http://preview.example"), /must use HTTPS/);
  assert.equal(
    normalizeHostedBaseUrl(" https://deploy-preview-42--aurum-privee.netlify.app/ "),
    "https://deploy-preview-42--aurum-privee.netlify.app",
  );
});

test("hosted verification rejects URLs that could test the wrong surface", () => {
  for (const value of [
    "https://user:password@preview.example/",
    "https://preview.example/shop",
    "https://preview.example/?branch=main",
    "https://preview.example/#release",
  ]) {
    assert.throws(() => normalizeHostedBaseUrl(value), /clean deployment origin/);
  }
});
