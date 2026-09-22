export const DEFAULT_CLIENT_REQUEST_TIMEOUT_MS = 15_000;

export class ClientRequestTimeoutError extends Error {
  constructor() {
    super("The request timed out");
    this.name = "ClientRequestTimeoutError";
  }
}

export class ClientResponseFormatError extends Error {
  constructor() {
    super("The server returned an unexpected response");
    this.name = "ClientResponseFormatError";
  }
}

type ClientJsonRequestInit = RequestInit & {
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

export async function requestJson<T>(input: RequestInfo | URL, options: ClientJsonRequestInit = {}) {
  const {
    fetcher = fetch,
    signal: upstreamSignal,
    timeoutMs = DEFAULT_CLIENT_REQUEST_TIMEOUT_MS,
    ...requestInit
  } = options;
  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort(upstreamSignal?.reason);

  if (upstreamSignal?.aborted) forwardAbort();
  else upstreamSignal?.addEventListener("abort", forwardAbort, { once: true });

  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetcher(input, { ...requestInit, signal: controller.signal });
    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (!contentType.includes("application/json")) throw new ClientResponseFormatError();

    try {
      return { response, data: await response.json() as T };
    } catch {
      throw new ClientResponseFormatError();
    }
  } catch (error) {
    if (timedOut) throw new ClientRequestTimeoutError();
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", forwardAbort);
  }
}
