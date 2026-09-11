export type ScentFamily = "Floral" | "Fresh" | "Woody" | "Amber" | "Gourmand";
export type ProductAudience = "Women" | "Men" | "Unisex";

export type Product = {
  id: string;
  loyverseItemId?: string;
  loyverseVariantId?: string;
  loyverseTaxIds?: string[];
  loyverseTaxes?: import("@/lib/tax").CommerceTax[];
  wixProductId?: string;
  wixVariantId?: string;
  slug: string;
  brand: string;
  name: string;
  concentration: string;
  size: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  audience?: ProductAudience;
  family: ScentFamily;
  notes: { top: string[]; heart: string[]; base: string[] };
  detailsSource?: { label: string; url: string };
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
