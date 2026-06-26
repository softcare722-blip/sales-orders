import { cookies } from "next/headers";
import { getStore, type User } from "./db";

const SESSION_COOKIE = "sales_orders_session";

export async function getSessionUser(): Promise<Pick<User, "id" | "name" | "role"> | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = getStore().users.find(
    (u) => u.id === Number(userId) && u.active
  );
  if (!user) return null;
  return { id: user.id, name: user.name, role: user.role };
}

export async function setSession(userId: number) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function requireRole(
  user: Pick<User, "role"> | null,
  roles: User["role"][]
): Pick<User, "id" | "name" | "role"> {
  if (!user || !roles.includes(user.role)) {
    throw new Error("Unauthorized");
  }
  return user as Pick<User, "id" | "name" | "role">;
}
