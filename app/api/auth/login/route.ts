import { NextRequest } from "next/server";
import { getStore, logAudit } from "@/lib/db";
import { clearSession, getSessionUser, setSession } from "@/lib/auth";
import { error, json } from "@/lib/api";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, pin } = body;

  if (!name || !pin) return error("Kërkohen emri dhe PIN-i");

  const user = getStore().users.find(
    (u) =>
      u.name === String(name).trim() &&
      u.pin === String(pin).trim() &&
      u.active
  );

  if (!user) return error("Emri ose PIN-i i pavlefshëm", 401);

  await setSession(user.id);
  logAudit(user.id, "login", null, { role: user.role });

  return json({ user: { id: user.id, name: user.name, role: user.role } });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (user) logAudit(user.id, "logout", null);
  await clearSession();
  return json({ ok: true });
}
