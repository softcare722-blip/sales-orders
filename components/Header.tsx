"use client";

import { useRouter } from "next/navigation";

interface Props {
  userName: string;
  role: string;
}

export function Header({ userName, role }: Props) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div>
          <p className="font-bold text-slate-900">Porositë</p>
          <p className="text-xs text-slate-500">
            {userName} · {role}
          </p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={logout}>
          Dilni
        </button>
      </div>
    </header>
  );
}
