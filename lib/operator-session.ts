import { cookies } from "next/headers";
import { operatorCookieName, verifyOperatorSession } from "@/lib/operator-auth";

export async function hasOperatorSession() {
  const store = await cookies();
  return verifyOperatorSession(store.get(operatorCookieName())?.value);
}

