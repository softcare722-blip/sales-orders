"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { ProductSearch } from "@/components/ProductSearch";
import { OrderItemsList } from "@/components/OrderItemsList";
import { StatusBadge } from "@/components/StatusBadge";

interface User {
  id: number;
  name: string;
  role: string;
}

interface OrderItem {
  id: number;
  quantity: number;
  quantity_text: string | null;
  unit_price?: number;
  unit_price_text: string | null;
  line_total?: number;
  barcode: string;
  description: string;
  added_by_name: string;
  removed_at: string | null;
}

interface Order {
  id: number;
  client_name: string;
  status: string;
  created_at: string;
  order_total?: number;
  items: OrderItem[];
}

type Tab = "new" | "history";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(n: number) {
  return `${n.toLocaleString("sq-AL")} Lek`;
}

export default function AgentPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("new");
  const [order, setOrder] = useState<Order | null>(null);
  const [clientName, setClientName] = useState("");
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadSession = useCallback(async () => {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "agent") {
      router.replace("/login");
      return null;
    }
    setUser(me.user);
    return me.user as User;
  }, [router]);

  const loadPastOrders = useCallback(async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setPastOrders(data.orders ?? []);
  }, []);

  useEffect(() => {
    loadSession().finally(() => setAuthChecked(true));
  }, [loadSession]);

  useEffect(() => {
    if (tab === "history") loadPastOrders();
  }, [tab, loadPastOrders]);

  async function createOrder() {
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: clientName }),
      });
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
        setClientName(data.order.client_name ?? "");
      }
    } finally {
      setBusy(false);
    }
  }

  async function patchOrder(body: Record<string, unknown>) {
    const orderId = (body.order_id as number) || order?.id;
    if (!orderId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, ...body }),
      });
      const data = await res.json();
      if (data.order) {
        if (order && order.id === orderId) {
          setOrder(data.order);
        } else if (historyOrder && historyOrder.id === orderId) {
          setHistoryOrder(data.order);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveClientName() {
    await patchOrder({ action: "update_client", client_name: clientName });
  }

  async function openHistoryOrder(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders?id=${id}`);
      const data = await res.json();
      if (data.order) setHistoryOrder(data.order);
    } finally {
      setBusy(false);
    }
  }

  const canEdit = order?.status === "submitted";

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Duke u ngarkuar...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pb-8">
      <Header userName={user.name} role="Agjent shitjesh" />

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors ${
              tab === "new" ? "bg-white shadow-sm" : "text-slate-600"
            }`}
            onClick={() => {
              setTab("new");
              setHistoryOrder(null);
            }}
          >
            Porosi e re
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors ${
              tab === "history" ? "bg-white shadow-sm" : "text-slate-600"
            }`}
            onClick={() => setTab("history")}
          >
            Porositë e mia
          </button>
        </div>

        {tab === "new" && (
          <>
            {!order ? (
              <div className="card space-y-4">
                <h1 className="text-xl font-bold">Porosi e re</h1>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Emri i klientit (opsional)
                  </label>
                  <input
                    className="input text-base"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Emri i dyqanit ose klientit"
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={createOrder}
                  disabled={busy}
                >
                  Fillo porosinë
                </button>
              </div>
            ) : (
              <>
                <div className="card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h1 className="text-xl font-bold">Porosia #{order.id}</h1>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="input text-base"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Emri i klientit"
                      disabled={!canEdit || busy}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        className="btn-secondary shrink-0"
                        onClick={saveClientName}
                        disabled={busy}
                      >
                        Ruaj
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Data: {formatDate(order.created_at)}
                  </p>
                  {order.order_total !== undefined && order.order_total > 0 && (
                    <p className="font-semibold">
                      Totali: {formatMoney(order.order_total)}
                    </p>
                  )}
                </div>

                <div className="card">
                  <h2 className="mb-3 font-semibold">Artikujt e porosisë</h2>
                  <OrderItemsList
                    items={order.items}
                    canRemove={!!canEdit}
                    onRemove={(itemId) =>
                      patchOrder({ action: "remove_item", item_id: itemId })
                    }
                    busy={busy}
                  />
                </div>

                {canEdit && (
                  <ProductSearch
                    disabled={busy}
                    onAdd={(productId, quantity, quantityText, unitPrice, unitPriceText) =>
                      patchOrder({
                        action: "add_item",
                        product_id: productId,
                        quantity,
                        quantity_text: quantityText,
                        unit_price: unitPrice,
                        unit_price_text: unitPriceText,
                      })
                    }
                  />
                )}

                {canEdit && (
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={() => {
                      setOrder(null);
                      setClientName("");
                    }}
                  >
                    Fillo një porosi tjetër
                  </button>
                )}

                {!canEdit && (
                  <p className="text-center text-sm text-slate-500">
                    Kjo porosi po përgatitet — kontaktoni menaxherin për ta
                    ndryshuar.
                  </p>
                )}
              </>
            )}
          </>
        )}

        {tab === "history" && (
          <>
            {historyOrder ? (
              <div className="space-y-4">
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600"
                  onClick={() => setHistoryOrder(null)}
                >
                  ← Kthehu te lista
                </button>

                <div className="card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h1 className="text-xl font-bold">
                      Porosia #{historyOrder.id}
                    </h1>
                    <StatusBadge status={historyOrder.status} />
                  </div>
                  <p className="text-sm">
                    <span className="text-slate-500">Klienti:</span>{" "}
                    {historyOrder.client_name || "—"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Data: {formatDate(historyOrder.created_at)}
                  </p>
                  {historyOrder.order_total !== undefined &&
                    historyOrder.order_total > 0 && (
                      <p className="font-semibold">
                        Totali: {formatMoney(historyOrder.order_total)}
                      </p>
                    )}
                </div>

                <div className="card">
                  <h2 className="mb-3 font-semibold">Artikujt e porosisë</h2>
                  <OrderItemsList
                    items={historyOrder.items}
                    canRemove={historyOrder.status === "submitted"}
                    onRemove={(itemId) =>
                      patchOrder({ action: "remove_item", item_id: itemId })
                    }
                    editable={historyOrder.status === "submitted"}
                    onUpdate={(itemId, quantity, quantityText, unitPrice, unitPriceText) =>
                      patchOrder({
                        action: "update_item",
                        item_id: itemId,
                        quantity,
                        quantity_text: quantityText,
                        unit_price: unitPrice,
                        unit_price_text: unitPriceText,
                      })
                    }
                    busy={busy}
                  />
                </div>

                {historyOrder.status === "submitted" && (
                  <ProductSearch
                    disabled={busy}
                    onAdd={(productId, quantity, quantityText, unitPrice, unitPriceText) =>
                      patchOrder({
                        order_id: historyOrder.id,
                        action: "add_item",
                        product_id: productId,
                        quantity,
                        quantity_text: quantityText,
                        unit_price: unitPrice,
                        unit_price_text: unitPriceText,
                      })
                    }
                  />
                )}
              </div>
            ) : (
              <div className="card">
                <h1 className="mb-3 text-xl font-bold">Porositë e mia</h1>
                <ul className="divide-y divide-slate-100">
                  {pastOrders.length === 0 && (
                    <li className="py-6 text-center text-sm text-slate-400">
                      Nuk keni porosi ende
                    </li>
                  )}
                  {pastOrders.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className="w-full py-3 text-left transition-colors hover:bg-slate-50"
                        onClick={() => openHistoryOrder(o.id)}
                        disabled={busy}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">#{o.id}</span>
                          <StatusBadge status={o.status} />
                        </div>
                        <p className="text-sm">
                          {o.client_name || "Pa emër klienti"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(o.created_at)} · {o.items.length} artikuj
                          {o.order_total ? ` · ${formatMoney(o.order_total)}` : ""}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
