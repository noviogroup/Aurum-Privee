import assert from "node:assert/strict";
import test from "node:test";
import { contactInquirySchema } from "@/lib/contact-inquiry";

const valid = {
  name: "Amara Clarke",
  email: " Amara@Example.com ",
  phone: "(242) 555-0100",
  topic: "Fragrance guidance",
  orderNumber: "",
  message: "I would like help finding a soft floral fragrance for evenings.",
  website: "",
};

test("contact inquiries normalize bounded customer details", () => {
  const result = contactInquirySchema.parse(valid);
  assert.equal(result.email, "amara@example.com");
  assert.equal(result.orderNumber, undefined);
  assert.equal(result.website, undefined);
});

test("contact inquiries reject short notes, unknown topics, and extra fields", () => {
  assert.equal(contactInquirySchema.safeParse({ ...valid, message: "Too short" }).success, false);
  assert.equal(contactInquirySchema.safeParse({ ...valid, topic: "Wholesale" }).success, false);
  assert.equal(contactInquirySchema.safeParse({ ...valid, admin: true }).success, false);
});
