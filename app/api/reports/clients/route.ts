import { NextRequest } from "next/server";
import { getSessionUser, requireRole } from "@/lib/auth";
import { error, json } from "@/lib/api";
import { fetchClientSalesReport } from "@/lib/orders";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["manager"]);
  } catch {
    return error("Vetëm për menaxherët", 403);
  }

  const from = request.nextUrl.searchParams.get("from") ?? undefined;
  const to = request.nextUrl.searchParams.get("to") ?? undefined;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const client_name = request.nextUrl.searchParams.get("client_name") ?? undefined;

  return json({
    clients: fetchClientSalesReport({ from, to, status, client_name }),
  });
}
