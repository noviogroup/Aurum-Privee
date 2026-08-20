import type { ScentFamily } from "@/lib/types";

export type OperationsCatalogProduct = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  imageUrl: string;
  price: number;
  stock: number;
  description: string;
  scentFamily: ScentFamily;
  notes: { top: string[]; heart: string[]; base: string[] };
  featured: boolean;
  newArrival: boolean;
  storefrontVisible: boolean;
  sortOrder: number;
  curatedAt: string | null;
};

export type OperationsCatalog = {
  products: OperationsCatalogProduct[];
  configured: boolean;
  preview: boolean;
  totals: { all: number; needsCuration: number; featured: number; hidden: number };
};

export type ProductCurationInput = Pick<OperationsCatalogProduct, "id" | "description" | "scentFamily" | "notes" | "featured" | "newArrival" | "storefrontVisible" | "sortOrder">;
