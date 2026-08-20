import { z } from "zod";

const note = z.string().trim().min(1).max(60);
const notes = z.object({
  top: z.array(note).max(12),
  heart: z.array(note).max(12),
  base: z.array(note).max(12),
}).strict();

export const productCurationSchema = z.object({
  productId: z.string().uuid(),
  description: z.string().trim().min(20).max(1200),
  scentFamily: z.enum(["Floral", "Fresh", "Woody", "Amber", "Gourmand"]),
  notes,
  featured: z.boolean(),
  newArrival: z.boolean(),
  storefrontVisible: z.boolean(),
  sortOrder: z.number().int().min(0).max(100000),
}).strict();

export function splitCurationNotes(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
