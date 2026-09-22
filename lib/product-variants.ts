import type { Product } from "@/lib/types";

export type ProductVariantFamily = {
  key: string;
  brand: string;
  name: string;
  productIds: string[];
};

// Loyverse currently stores many fragrance formats as separate items. These
// families are intentionally reviewed and explicit: similarity in a name is
// not enough to merge two fragrances (for example, Sauvage and Eau Sauvage).
export const PRODUCT_VARIANT_FAMILIES: ProductVariantFamily[] = [
  {
    key: "dior-sauvage",
    brand: "Dior",
    name: "Sauvage",
    productIds: [
      "bb4bf3b6-a6cd-4bba-939d-3ceafbefad16",
      "2df7bfb9-a95a-48ed-b1a3-0e75eb7e8814",
      "460426e4-f854-40f4-9217-7fac41fe75bf",
      "e490f09d-f3cc-43d8-b39b-c8e29f1255f1",
      "7b027759-a2c5-43e7-bb91-93975567c14e",
      "9f78f027-1c03-4b3a-b6c8-7e397c098c26",
    ],
  },
  {
    key: "burberry-weekend",
    brand: "Burberry",
    name: "Weekend",
    productIds: [
      "005801d4-6ff6-47ef-b41e-ddc50856c838",
      "092c8ab2-a9bd-4391-9bcb-377b560dc518",
      "dedfa51f-380a-4386-b58c-61cf40d2dc47",
    ],
  },
  {
    key: "paco-rabanne-million",
    brand: "Paco Rabanne",
    name: "1 Million",
    productIds: [
      "12c884dc-2af9-44b2-aa7e-4a175df9bd47",
      "808d82ea-3e0b-419f-a81d-1f683cb1f610",
      "be8ed277-19be-4362-ab08-526a75e56d49",
    ],
  },
  {
    key: "antonio-banderas-diavolo",
    brand: "Antonio Banderas",
    name: "Diavolo",
    productIds: [
      "e7a36f55-8ec4-43d9-90d1-47068d1cb9aa",
      "2286d090-4402-4a09-9ae5-bb5dfb03feed",
    ],
  },
  {
    key: "calvin-klein-in2u",
    brand: "Calvin Klein",
    name: "CK IN2U",
    productIds: [
      "9cac1c4f-a5b1-41c0-85a0-855fef578cd0",
      "89438ef5-9d37-4d3a-b228-eaa4b356ccad",
    ],
  },
  {
    key: "carolina-herrera-212-nyc",
    brand: "Carolina Herrera",
    name: "212 NYC",
    productIds: [
      "e9f781d8-b677-4a25-8ecf-010e68f9fc41",
      "6755009f-2aa4-4002-9990-9ab9a899fa14",
    ],
  },
  {
    key: "giorgio-armani-diamonds-men",
    brand: "Giorgio Armani",
    name: "Armani Diamonds for Men",
    productIds: [
      "5273c3cf-b326-41de-8c55-5a7181c377e9",
      "ab0592d7-7445-42fd-ba19-3d8f096dd883",
    ],
  },
  {
    key: "paco-rabanne-lady-million-fabulous",
    brand: "Paco Rabanne",
    name: "Lady Million Fabulous Intense",
    productIds: [
      "436cf178-8351-48dc-b046-28b07eb9bba3",
      "c368cfb3-c4d7-4cf4-b207-f79a8d71d25c",
    ],
  },
  {
    key: "carolina-herrera-la-bomba",
    brand: "Carolina Herrera",
    name: "La Bomba",
    productIds: [
      "bb00ef84-1e72-41c7-97e8-2a5cd691ce2b",
      "97c02542-ffe1-489c-a2d1-4f7749d62458",
    ],
  },
  {
    key: "givenchy-organza",
    brand: "Givenchy",
    name: "Organza",
    productIds: [
      "cfb5b4a8-067a-411f-8043-b975bbddd5a5",
      "44181ae9-f7be-4333-b40e-276af678d89a",
    ],
  },
  {
    key: "givenchy-very-irresistible",
    brand: "Givenchy",
    name: "Very Irrésistible",
    productIds: [
      "4efe9971-699e-433c-8c44-c5ddb61ae136",
      "0be45ee5-91a2-491d-a30a-3252eef4c006",
    ],
  },
  {
    key: "guy-laroche-drakkar-noir",
    brand: "Guy Laroche",
    name: "Drakkar Noir",
    productIds: [
      "c6a0f148-bb23-438b-9836-e87cc2d3a796",
      "87974458-10ce-4495-85d2-3cd4ac8e488c",
    ],
  },
  {
    key: "jean-paul-gaultier-classique",
    brand: "Jean Paul Gaultier",
    name: "Classique",
    productIds: [
      "fcea81c4-2e72-4c8e-9e19-39e22115cfb7",
      "23babd79-2c37-481f-a885-470b96c67090",
    ],
  },
  {
    key: "lancome-la-vie-est-belle",
    brand: "Lancôme",
    name: "La Vie Est Belle",
    productIds: [
      "f205281d-1618-402f-9ff7-6e213c1326ef",
      "0c6da493-fa13-45d0-a5f8-93fd198cb08c",
    ],
  },
  {
    key: "michael-kors-gorgeous",
    brand: "Michael Kors",
    name: "Gorgeous!",
    productIds: [
      "60fcd3cf-f517-4ea1-ab52-babbeebe52e8",
      "83b47c13-5ceb-402e-8c0a-220063ce3bbe",
    ],
  },
  {
    key: "paco-rabanne-phantom-intense-elixir",
    brand: "Paco Rabanne",
    name: "Phantom Intense Elixir",
    productIds: [
      "09de25d0-df98-43dc-9284-c2ff18e2acf3",
      "eb570b43-b950-4dd8-bdc4-bfdaa1dbdee7",
    ],
  },
  {
    key: "prada-luna-rossa-ocean",
    brand: "Prada",
    name: "Luna Rossa Ocean",
    productIds: [
      "bf9436db-a747-478d-9229-f724aa1a8ce0",
      "13f188ee-1169-4d07-98e1-b735c3aaed46",
    ],
  },
  {
    key: "ralph-lauren-romance",
    brand: "Ralph Lauren",
    name: "Romance",
    productIds: [
      "be6d70c1-1a6e-4206-9f05-3fa29195f4ab",
      "48aa9ed4-aff1-4d33-800d-779da22d36ad",
    ],
  },
  {
    key: "tom-ford-black-orchid",
    brand: "Tom Ford",
    name: "Black Orchid",
    productIds: [
      "7fcf5448-ebd6-42d2-9ddf-b67204d63feb",
      "c7152c35-68ea-45d9-9300-184ea42175eb",
    ],
  },
  {
    key: "bbw-into-the-night-mist",
    brand: "Bath & Body Works",
    name: "Into the Night Body Mist",
    productIds: [
      "0935e473-76b2-481a-96e9-ee68e27068c8",
      "7a5d4130-9508-4a0d-b266-ece5e2137f24",
    ],
  },
];

const familyByProductId = new Map(
  PRODUCT_VARIANT_FAMILIES.flatMap((family) => family.productIds.map((id) => [id, family] as const)),
);

export function getProductVariantFamily(productId: string) {
  return familyByProductId.get(productId);
}

export function getProductVariants(productId: string, products: Product[]) {
  const family = getProductVariantFamily(productId);
  if (!family) return [];
  const order = new Map(family.productIds.map((id, index) => [id, index]));
  return products
    .filter((product) => order.has(product.id))
    .sort((left, right) => (order.get(left.id) || 0) - (order.get(right.id) || 0));
}

export function productVariantLabel(product: Product) {
  const parts = [product.size, product.concentration].filter((part) => part
    && part !== "Fine fragrance"
    && part !== "Size not specified");
  return parts.join(" · ") || "Edition details available on request";
}
