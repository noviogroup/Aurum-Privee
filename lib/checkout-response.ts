export const checkoutNetworkError = "Checkout could not be reached. Check your connection and try again.";
export const checkoutResponseError = "Checkout could not be started. Please try again.";

export type CheckoutResponseBody = {
  error?: unknown;
  url?: unknown;
};

function safeCheckoutError(error: unknown) {
  if (typeof error !== "string") return checkoutResponseError;
  const message = error.trim();
  return message && message.length <= 240 ? message : checkoutResponseError;
}

export async function checkoutRedirectUrl(response: Pick<Response, "json" | "ok">) {
  let body: CheckoutResponseBody = {};

  try {
    body = await response.json() as CheckoutResponseBody;
  } catch {
    throw new Error(checkoutResponseError);
  }

  return checkoutRedirectUrlFromBody(response, body);
}

export function checkoutRedirectUrlFromBody(response: Pick<Response, "ok">, body: CheckoutResponseBody) {
  if (!response.ok || typeof body.url !== "string" || !body.url.trim()) {
    throw new Error(safeCheckoutError(body.error));
  }

  try {
    const url = new URL(body.url);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    return url.toString();
  } catch {
    throw new Error(checkoutResponseError);
  }
}
