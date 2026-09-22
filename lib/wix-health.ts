export type WixHealthStatus = {
  status: "ok" | "degraded";
  checkedAt: string;
  provider: "wix";
  catalog: "ok" | "degraded";
  orderVerification: "ok" | "degraded";
  mappedSkuCount: number;
  expectedSkuCount: number;
  availableMappedVariants: number;
};

export function buildWixHealthStatus(input: {
  checkedAt: string;
  mappedSkuCount: number;
  expectedSkuCount: number;
  availableMappedVariants: number;
  orderApiReachable: boolean;
}): WixHealthStatus {
  const catalogReady = input.expectedSkuCount > 0
    && input.mappedSkuCount === input.expectedSkuCount
    && input.availableMappedVariants === input.expectedSkuCount;
  return {
    status: catalogReady && input.orderApiReachable ? "ok" : "degraded",
    checkedAt: input.checkedAt,
    provider: "wix",
    catalog: catalogReady ? "ok" : "degraded",
    orderVerification: input.orderApiReachable ? "ok" : "degraded",
    mappedSkuCount: input.mappedSkuCount,
    expectedSkuCount: input.expectedSkuCount,
    availableMappedVariants: input.availableMappedVariants,
  };
}
