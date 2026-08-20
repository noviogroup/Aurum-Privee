export type InquiryStatus = "new" | "in_progress" | "replied" | "closed";

export type InquiryReply = { id: string; message: string; providerMessageId: string | null; sentAt: string };

export type OperationsInquiry = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  topic: string;
  orderNumber: string | null;
  message: string;
  status: InquiryStatus;
  notificationStatus: "pending" | "sent" | "failed";
  createdAt: string;
  updatedAt: string;
  replies: InquiryReply[];
};

export type OperationsInquiries = {
  inquiries: OperationsInquiry[];
  configured: boolean;
  preview: boolean;
  totals: { all: number; open: number; replied: number; closed: number };
};
