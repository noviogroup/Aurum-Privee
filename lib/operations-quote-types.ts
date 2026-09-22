export type QuoteRequestStatus = "new" | "reviewing" | "needs_info" | "quoted" | "closed";

export type QuoteRequestLine = {
  productId: string;
  slug: string;
  brand: string;
  name: string;
  concentration: string;
  size: string;
  quantity: number;
  note: string | null;
};

export type OperationsQuoteRequest = {
  id: string;
  submissionId: string;
  reference: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  buyerType: string;
  destinationCountry: string | null;
  message: string | null;
  lines: QuoteRequestLine[];
  status: QuoteRequestStatus;
  notificationStatus: "pending" | "sent" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type OperationsQuoteRequests = {
  requests: OperationsQuoteRequest[];
  configured: boolean;
  totals: { all: number; open: number; quoted: number; closed: number };
};
