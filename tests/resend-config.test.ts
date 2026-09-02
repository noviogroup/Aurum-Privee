import assert from "node:assert/strict";
import test from "node:test";
import {
  extractMailbox,
  isRestrictedResendKeyError,
  resendSenderDomain,
  validateResendConfiguration,
} from "@/lib/resend-config";

test("Resend configuration extracts a branded mailbox and domain", () => {
  assert.equal(extractMailbox("Aurum Privée <Orders@Mail.AurumPrivee.com>"), "orders@mail.aurumprivee.com");
  assert.equal(resendSenderDomain("Aurum Privée <orders@mail.aurumprivee.com>"), "mail.aurumprivee.com");
});

test("Resend configuration rejects placeholders and invalid recipients", () => {
  const result = validateResendConfiguration({
    RESEND_API_KEY: "re_replace_me",
    RESEND_FROM_EMAIL: "Aurum Privée <orders@mail.aurumprivee.com>",
    STORE_NOTIFICATION_EMAIL: "orders",
  });
  assert.deepEqual(result.issues, [
    "Provide a valid server-only RESEND_API_KEY.",
    "Set STORE_NOTIFICATION_EMAIL to a real monitored inbox.",
  ]);
});

test("Resend configuration does not accept an example mailbox as a merchant recipient", () => {
  const result = validateResendConfiguration({
    RESEND_API_KEY: `re_${"x".repeat(32)}`,
    RESEND_FROM_EMAIL: "Aurum Privée <orders@mail.aurumprivee.com>",
    STORE_NOTIFICATION_EMAIL: "replace-with-monitored-order-inbox@example.com",
  });
  assert.deepEqual(result.issues, ["Set STORE_NOTIFICATION_EMAIL to a real monitored inbox."]);
});

test("Resend configuration recognizes a restricted sending key response", () => {
  assert.equal(isRestrictedResendKeyError({ name: "restricted_api_key", statusCode: 401 }), true);
  assert.equal(isRestrictedResendKeyError({ name: "invalid_api_key", statusCode: 403 }), false);
});
