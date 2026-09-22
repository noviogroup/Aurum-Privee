import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collection",
  description: "Browse the Aurum Privée fragrance collection.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  redirect("/shop");
}
