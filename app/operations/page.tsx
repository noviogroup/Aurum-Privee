import { redirect } from "next/navigation";
import { OperationsConsole } from "@/components/operations-console";
import { getOperationsOrders } from "@/lib/operations-orders";
import { hasOperatorSession } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  if (!await hasOperatorSession()) redirect("/operations/login");
  const { order } = await searchParams;
  const result = await getOperationsOrders();
  return (
    <OperationsConsole initialOrders={result.orders} preview={result.preview} initialOrder={order} />
  );
}
