import { redirect } from "next/navigation";
import { OperationsIntegrationsConsole } from "@/components/operations-integrations-console";
import { getOperationsReadiness } from "@/lib/operations-integrations";
import { hasOperatorSession } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

export default async function OperationsIntegrationsPage() {
  if (!await hasOperatorSession()) redirect("/operations/login");
  const readiness = await getOperationsReadiness({ live: true });
  return <OperationsIntegrationsConsole initialReadiness={readiness} />;
}
