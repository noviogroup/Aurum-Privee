import type { Metadata } from "next";
import { QuoteList } from "@/components/quote-list";

export const metadata: Metadata = {
  title: "Quote list",
  description: "Build and submit an Aurum Privée trade fragrance request.",
  robots: { index: false, follow: true },
};

export default function QuoteListPage() {
  return <QuoteList />;
}
