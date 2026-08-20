import type { Metadata } from "next";
import { SavedFragrances } from "@/components/saved-fragrances";

export const metadata: Metadata = {
  title: "Saved fragrances",
  description: "Your private Aurum Privée fragrance edit, saved on this device.",
  robots: { index: false, follow: true },
};

export default function SavedPage() {
  return <SavedFragrances />;
}
