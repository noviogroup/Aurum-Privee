const wixOrderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WixOrderConfirmation = {
  id: string;
  number: string | null;
};

export function wixOrderIdIsWellFormed(value: string | undefined) {
  return Boolean(value && wixOrderIdPattern.test(value));
}

export function confirmedWixOrder(input: {
  requestedId: string;
  orderId: string | null | undefined;
  orderNumber?: string | null;
  status?: string | null;
}): WixOrderConfirmation | null {
  if (!wixOrderIdIsWellFormed(input.requestedId)) return null;
  if (input.orderId !== input.requestedId || input.status !== "APPROVED") return null;
  return { id: input.orderId, number: input.orderNumber?.trim() || null };
}
