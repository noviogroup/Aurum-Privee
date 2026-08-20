import { redirect } from "next/navigation";
import { OperationsCustomersConsole } from "@/components/operations-customers-console";
import { getOperationsCustomers } from "@/lib/operations-customers";
import { hasOperatorSession } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

export default async function OperationsCustomersPage() {
  if (!await hasOperatorSession()) redirect("/operations/login");
  return <OperationsCustomersConsole initialCustomers={await getOperationsCustomers()} />;
}
