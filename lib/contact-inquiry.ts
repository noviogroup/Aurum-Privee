import { z } from "zod";

export const inquiryTopics = ["Fragrance guidance", "Order help", "Gifting", "Authenticity", "Other"] as const;

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().transform((value) => value || undefined);

export const contactInquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: optionalText(40),
  topic: z.enum(inquiryTopics),
  orderNumber: optionalText(64),
  message: z.string().trim().min(20).max(2_000),
  website: z.string().max(0).optional().transform((value) => value || undefined),
}).strict();

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;
