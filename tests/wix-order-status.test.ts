import assert from "node:assert/strict";
import test from "node:test";
import { confirmedWixOrder, wixOrderIdIsWellFormed } from "@/lib/wix-order-status";

const orderId = "123e4567-e89b-42d3-a456-426614174000";

test("Wix confirmation accepts only a matching approved GUID", () => {
  assert.equal(wixOrderIdIsWellFormed(orderId), true);
  assert.deepEqual(confirmedWixOrder({
    requestedId: orderId,
    orderId,
    orderNumber: "1042",
    status: "APPROVED",
  }), { id: orderId, number: "1042" });
});

test("Wix confirmation rejects untrusted, mismatched and incomplete orders", () => {
  assert.equal(wixOrderIdIsWellFormed("1234--------------------"), false);
  assert.equal(confirmedWixOrder({ requestedId: "not-an-order", orderId, status: "APPROVED" }), null);
  assert.equal(confirmedWixOrder({ requestedId: orderId, orderId: "223e4567-e89b-42d3-a456-426614174000", status: "APPROVED" }), null);
  assert.equal(confirmedWixOrder({ requestedId: orderId, orderId, status: "PENDING" }), null);
  assert.equal(confirmedWixOrder({ requestedId: orderId, orderId, status: "REJECTED" }), null);
});
