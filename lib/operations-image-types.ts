export type OperationsImageProduct = {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  imageUrl: string | null;
  loyverseImageUrl: string | null;
  stock: number;
  missing: boolean;
  curated: boolean;
  updatedAt: string;
};

export type OperationsImageCatalog = {
  products: OperationsImageProduct[];
  configured: boolean;
  preview: boolean;
  totals: { all: number; missing: number; curated: number; loyverse: number };
};

export type ProductImageUploadResult = {
  productId: string;
  imageUrl: string;
  width: number;
  height: number;
  uploadedAt: string;
};

