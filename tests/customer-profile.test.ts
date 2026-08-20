import assert from "node:assert/strict";
import test from "node:test";
import { customerProfileSchema, maskCustomerEmail, normalizeCustomerEmail } from "@/lib/customer-profile";

test("normalizes and masks customer identifiers for operations display", () => {
  assert.equal(normalizeCustomerEmail(" Client@Example.COM "), "client@example.com");
  assert.equal(maskCustomerEmail("amara@example.com"), "am••••@example.com");
});

test("accepts bounded staff-only profiles and rejects extra or duplicate fields", () => {
  const valid = { email: "client@example.com", preferredFamilies: ["Floral", "Amber"], staffNotes: "Gift-ready packaging.", vip: true };
  assert.equal(customerProfileSchema.safeParse(valid).success, true);
  assert.equal(customerProfileSchema.safeParse({ ...valid, preferredFamilies: ["Floral", "Floral"] }).success, false);
  assert.equal(customerProfileSchema.safeParse({ ...valid, staffNotes: "x".repeat(1001) }).success, false);
  assert.equal(customerProfileSchema.safeParse({ ...valid, newsletterStatus: "subscribed" }).success, false);
});
