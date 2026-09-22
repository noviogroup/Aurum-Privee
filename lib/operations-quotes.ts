import { listQuoteRequests } from "@/lib/netlify-commerce";
import type { OperationsQuoteRequests } from "@/lib/operations-quote-types";

export async function getOperationsQuoteRequests(): Promise<OperationsQuoteRequests> {
  try {
    const requests = await listQuoteRequests(500);
    return {
      requests,
      configured: true,
      totals: {
        all: requests.length,
        open: requests.filter((request) => ["new", "reviewing", "needs_info"].includes(request.status)).length,
        quoted: requests.filter((request) => request.status === "quoted").length,
        closed: requests.filter((request) => request.status === "closed").length,
      },
    };
  } catch {
    return { requests: [], configured: false, totals: { all: 0, open: 0, quoted: 0, closed: 0 } };
  }
}
