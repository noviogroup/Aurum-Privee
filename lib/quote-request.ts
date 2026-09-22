import { z } from "zod";

export const buyerTypes = ["Retailer", "Distributor", "Hospitality", "Corporate", "Other"] as const;

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().transform((value) => value || undefined);

export const quoteRequestSchema = z.object({
  submissionId: z.string().uuid(),
  companyName: z.string().trim().min(2).max(140),
  contactName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: optionalText(40),
  buyerType: z.enum(buyerTypes),
  destinationCountry: optionalText(80),
  message: optionalText(2_000),
  consent: z.literal(true),
  website: z.string().max(0).optional().transform((value) => value || undefined),
  lines: z.array(z.object({
    productId: z.string().min(1).max(120),
    quantity: z.number().int().min(1).max(999),
    note: optionalText(500),
  }).strict()).min(1).max(20),
}).strict().superRefine((value, context) => {
  if (new Set(value.lines.map((line) => line.productId)).size !== value.lines.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Each product may appear only once", path: ["lines"] });
  }
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
