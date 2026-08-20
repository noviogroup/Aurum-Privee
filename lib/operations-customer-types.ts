import type { ScentFamily } from "@/lib/types";

export type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
};

export type OperationsCustomer = {
  email: string;
  name: string;
  phone: string | null;
  orderCount: number;
  lifetimeSpend: number;
  currency: string;
  lastOrderAt: string;
  newsletterStatus: "pending" | "subscribed" | "unsubscribed" | "none";
  loyverseLinked: boolean;
  preferredFamilies: ScentFamily[];
  staffNotes: string;
  vip: boolean;
  profileUpdatedAt: string | null;
  orders: CustomerOrderSummary[];
};

export type OperationsCustomers = {
  customers: OperationsCustomer[];
  configured: boolean;
  preview: boolean;
  totals: { all: number; returning: number; vip: number; newsletter: number };
};
