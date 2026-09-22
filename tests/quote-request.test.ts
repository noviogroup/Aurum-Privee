import assert from "node:assert/strict";
import test from "node:test";
import { quoteRequestSchema } from "@/lib/quote-request";

const valid = {
  submissionId: "123e4567-e89b-42d3-a456-426614174000",
  companyName: "Maison Retail Ltd",
  contactName: "Amara Clarke",
  email: " AMARA@EXAMPLE.COM ",
  phone: "",
  buyerType: "Retailer",
  destinationCountry: "",
  message: "",
  consent: true,
  website: "",
  lines: [{ productId: "product-1", quantity: 24, note: "Case pack preferred" }],
};

test("quote requests normalize optional buyer details", () => {
  const result = quoteRequestSchema.parse(valid);
  assert.equal(result.email, "amara@example.com");
  assert.equal(result.phone, undefined);
  assert.equal(result.destinationCountry, undefined);
  assert.equal(result.message, undefined);
});

test("quote requests require consent, valid quantities and unique products", () => {
  assert.equal(quoteRequestSchema.safeParse({ ...valid, consent: false }).success, false);
  assert.equal(quoteRequestSchema.safeParse({ ...valid, lines: [{ productId: "product-1", quantity: 0 }] }).success, false);
  assert.equal(quoteRequestSchema.safeParse({ ...valid, lines: [...valid.lines, ...valid.lines] }).success, false);
});
