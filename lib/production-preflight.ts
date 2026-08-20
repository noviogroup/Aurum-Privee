import type { OperationsReadiness } from "@/lib/operations-integration-types";

export type ProductionPreflightResult = {
  passed: boolean;
  checkedAt: string;
  failures: Array<{ service: string; status: string; requirements: string[] }>;
};

export function evaluateProductionPreflight(readiness: OperationsReadiness): ProductionPreflightResult {
  const failures = readiness.services
    .filter((service) => service.state !== "ready")
    .map((service) => ({
      service: service.name,
      status: service.status,
      requirements: service.requirements.length ? service.requirements : ["Resolve the reported integration check"],
    }));

  if (!readiness.live) {
    failures.unshift({
      service: "Live verification",
      status: "Not run",
      requirements: ["Run all provider and infrastructure checks against the production environment"],
    });
  }

  return {
    passed: readiness.live && readiness.services.length > 0 && failures.length === 0,
    checkedAt: readiness.checkedAt,
    failures,
  };
}
