import { redirect } from "next/navigation";
import { OperationsCustomersConsole } from "@/components/operations-customers-console";
import { getOperationsCustomers } from "@/lib/operations-customers";
import { hasOperatorSession } from "@/lib/operator-session";
import { getCommerceProvider } from "@/lib/wix-config";

export const dynamic = "force-dynamic";

export default async function OperationsCustomersPage() {
  if (!await hasOperatorSession()) redirect("/operations/login");
  return <OperationsCustomersConsole commerceProvider={getCommerceProvider(process.env.COMMERCE_PROVIDER)} initialCustomers={await getOperationsCustomers()} />;
}
