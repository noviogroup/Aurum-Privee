export type ScentFamily = "Floral" | "Fresh" | "Woody" | "Amber" | "Gourmand";

export type Product = {
  id: string;
  loyverseItemId?: string;
  loyverseVariantId?: string;
  loyverseTaxIds?: string[];
  loyverseTaxes?: import("@/lib/tax").CommerceTax[];
  slug: string;
  brand: string;
  name: string;
  concentration: string;
  size: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  family: ScentFamily;
  notes: { top: string[]; heart: string[]; base: string[] };
  image: string;
  imageAlt: string;
  featured?: boolean;
  newArrival?: boolean;
  stock: number;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type CheckoutLine = {
  productId: string;
  quantity: number;
};
