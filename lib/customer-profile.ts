import { z } from "zod";

export const customerProfileSchema = z.object({
  email: z.string().trim().email().max(320),
  preferredFamilies: z.array(z.enum(["Floral", "Fresh", "Woody", "Amber", "Gourmand"])).max(5).refine((value) => new Set(value).size === value.length),
  staffNotes: z.string().trim().max(1000),
  vip: z.boolean(),
}).strict();

export function normalizeCustomerEmail(value: string) {
  return value.trim().toLowerCase();
}

export function maskCustomerEmail(value: string) {
  const [local, domain] = normalizeCustomerEmail(value).split("@");
  if (!local || !domain) return "Email unavailable";
  return `${local.slice(0, 2)}••••@${domain}`;
}
