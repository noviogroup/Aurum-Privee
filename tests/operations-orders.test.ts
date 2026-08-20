import assert from "node:assert/strict";
import test from "node:test";
import { orderNeedsAttention, type OperationsOrder } from "../lib/operations-types";

const base: OperationsOrder = {
  id: "10000000-0000-0000-0000-000000000001",
  orderNumber: "LL-TEST",
  paymentStatus: "paid",
  fulfillmentStatus: "unfulfilled",
  confirmationEmailStatus: "sent",
  fulfillmentEmailStatus: "not_sent",
  loyverseSyncStatus: "succeeded",
  loyverseSyncAttempts: 1,
  loyverseSyncClaimedAt: null,
  loyverseRefundSyncStatus: null,
  loyverseRefundSyncAttempts: 0,
  loyverseRefundSyncClaimedAt: null,
  customerName: "Client",
  customerEmail: "client@example.com",
  customerPhone: null,
  subtotal: 100,
  shippingAmount: 0,
  taxAmount: 10,
  total: 110,
  currency: "BSD",
  deliveryDetails: null,
  lineItems: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test("attention flags only operational exceptions", () => {
  assert.equal(orderNeedsAttention(base), false);
  assert.equal(orderNeedsAttention({ ...base, confirmationEmailStatus: "failed" }), true);
  assert.equal(orderNeedsAttention({ ...base, fulfillmentEmailStatus: "failed" }), true);
  assert.equal(orderNeedsAttention({ ...base, loyverseSyncStatus: "failed" }), true);
  assert.equal(orderNeedsAttention({ ...base, loyverseSyncStatus: "processing", loyverseSyncClaimedAt: "2020-01-01T00:00:00.000Z" }), true);
  assert.equal(orderNeedsAttention({ ...base, loyverseSyncStatus: "failed", loyverseSyncAttempts: 8 }), true);
  assert.equal(orderNeedsAttention({ ...base, loyverseRefundSyncStatus: "manual_required" }), true);
  assert.equal(orderNeedsAttention({ ...base, paymentStatus: "pending" }), true);
});
