import { NextRequest } from "next/server";
import { getStore } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { error, json } from "@/lib/api";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["manager"]);
  } catch {
    return error("Vetëm për menaxherët", 403);
  }

  const orderId = request.nextUrl.searchParams.get("order_id");
  const s = getStore();

  let logs = [...s.audit_log];
  if (orderId) {
    logs = logs.filter((a) => a.order_id === Number(orderId));
  }
  logs.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return json({
    logs: logs.slice(0, 200).map((a) => ({
      id: a.id,
      order_id: a.order_id,
      action: a.action,
      details: JSON.stringify(a.details),
      created_at: a.created_at,
      user_name: s.users.find((u) => u.id === a.user_id)?.name ?? "?",
    })),
  });
}
