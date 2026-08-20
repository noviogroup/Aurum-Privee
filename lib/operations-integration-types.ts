export type IntegrationId = "loyverse" | "database" | "payments" | "email" | "domain" | "security";
export type IntegrationState = "ready" | "attention" | "missing" | "error";

export type IntegrationFact = {
  label: string;
  value: string;
};

export type OperationsIntegration = {
  id: IntegrationId;
  name: string;
  summary: string;
  state: IntegrationState;
  status: string;
  connection: string;
  facts: IntegrationFact[];
  requirements: string[];
};

export type OperationsReadiness = {
  ready: number;
  total: number;
  live: boolean;
  checkedAt: string;
  services: OperationsIntegration[];
};
