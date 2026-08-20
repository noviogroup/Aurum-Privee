import { BRAND_NAME } from "@/lib/brand";

function normalizedBrandName(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}

export function expectedLoyverseBusinessName(environment: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  return (environment.LOYVERSE_EXPECTED_BUSINESS_NAME || BRAND_NAME).trim();
}

export function loyverseBusinessNameMatches(actual: string, expected: string) {
  return normalizedBrandName(actual) === normalizedBrandName(expected);
}

export function deliveryItemRequirement() {
  return "Create and approve a fixed-price, non-stock ‘New Providence Delivery’ service item in Loyverse, apply the correct taxes, then configure its variant ID";
}
