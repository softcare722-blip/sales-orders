import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getStore } from "@/lib/db";

const SESSION_COOKIE = "sales_orders_session";

export default async function Home() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!userId) {
    redirect("/login");
  }

  const user = getStore().users.find(
    (u) => u.id === Number(userId) && u.active
  );

  if (!user) {
    redirect("/login");
  }

  if (user.role === "manager") redirect("/manager");
  redirect("/agent");
}
