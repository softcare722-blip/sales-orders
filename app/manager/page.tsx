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
  list_price?: number;
  line_total?: number;
  barcode: string;
  description: string;
  added_by_name: string;
  removed_at: string | null;
}

interface Order {
  id: number;
  agent_name: string;
  client_name: string;
  status: string;
  created_at: string;
  order_total?: number;
  items: OrderItem[];
}

interface AuditEntry {
  id: number;
  order_id: number | null;
  action: string;
  details: string;
  created_at: string;
  user_name: string;
}

interface ClientReport {
  client_name: string;
  order_count: number;
  total_items: number;
  total_value: number;
  last_order_at: string;
}

interface Product {
  id: number;
  barcode: string;
  description: string;
  price: number;
  active: boolean;
}

interface User {
  id: number;
  name: string;
  pin: string;
  role: string;
  active: boolean;
}

const STATUS_OPTIONS = ["all", "submitted", "preparing", "ready", "cancelled"];
const DELETE_STATUS_OPTIONS = ["submitted", "preparing", "ready", "cancelled"];

const STATUS_LABELS: Record<string, string> = {
  all: "Të gjitha",
  submitted: "Dërguar",
  preparing: "Në përgatitje",
  ready: "Gati",
  cancelled: "Anuluar",
};

const ACTION_LABELS: Record<string, string> = {
  login: "Identifikim",
  logout: "Dalje",
  order_created: "Porosi e krijuar",
  item_added: "Artikull i shtuar",
  item_removed: "Artikull i hequr",
  item_updated: "Artikull i përditësuar",
  status_changed: "Statusi u ndryshua",
  client_updated: "Klienti u përditësua",
  orders_deleted: "Porosi të fshira",
};

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

export default function ManagerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState("submitted");
  const [authChecked, setAuthChecked] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [clientReport, setClientReport] = useState<ClientReport[]>([]);
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportClientName, setReportClientName] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [deleteFrom, setDeleteFrom] = useState("");
  const [deleteTo, setDeleteTo] = useState("");
  const [deleteStatuses, setDeleteStatuses] = useState<string[]>([
    "ready",
    "cancelled",
  ]);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [showDeleteOrders, setShowDeleteOrders] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    barcode: "",
    description: "",
    price: "",
    active: true,
  });
  const [productSearch, setProductSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    pin: "",
    role: "agent",
    active: true,
  });

  const loadOrders = useCallback(async (status: string) => {
    setOrdersLoading(true);
    try {
      const response = await fetch(`/api/orders?status=${status}`);
      if (!response.ok) throw new Error("Failed to load orders");
      const data = await response.json();
      setOrders(data.orders ?? []);
    } catch (error) {
      console.error(error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadOrderDetail = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/orders?id=${id}`);
      if (!response.ok) throw new Error("Failed to load order");
      const data = await response.json();
      setSelectedOrder(data.order ?? null);
    } catch (error) {
      console.error(error);
      setSelectedOrder(null);
    }
  }, []);

  const loadClientReport = useCallback(async () => {
    const params = new URLSearchParams();
    if (reportFrom) params.set("from", reportFrom);
    if (reportTo) params.set("to", reportTo);
    if (reportStatus !== "all") params.set("status", reportStatus);
    if (reportClientName) params.set("client_name", reportClientName);
    try {
      const response = await fetch(`/api/reports/clients?${params}`);
      if (!response.ok) throw new Error("Failed to load report");
      const data = await response.json();
      setClientReport(data.clients ?? []);
    } catch (error) {
      console.error(error);
      setClientReport([]);
    }
  }, [reportFrom, reportTo, reportStatus, reportClientName]);

  const loadLogs = useCallback(async (orderId?: number) => {
    try {
      const url = orderId ? `/api/audit?order_id=${orderId}` : "/api/audit";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load logs");
      const data = await response.json();
      setLogs(data.logs ?? []);
    } catch (error) {
      console.error(error);
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== "manager") {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        loadOrders("submitted");
      })
      .finally(() => setAuthChecked(true));
  }, [router, loadOrders]);

  useEffect(() => {
    if (authChecked) loadOrders(filter);
  }, [filter, authChecked, loadOrders]);

  useEffect(() => {
    if (showReport) loadClientReport();
  }, [showReport, loadClientReport]);

  useEffect(() => {
    if (selectedId) {
      loadOrderDetail(selectedId);
      loadLogs(selectedId);
    } else {
      setSelectedOrder(null);
      setLogs([]);
    }
  }, [selectedId, loadOrderDetail, loadLogs]);

  async function updateStatus(status: string) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedId,
          action: "update_status",
          status,
        }),
      });
      await loadOrders(filter);
      await loadOrderDetail(selectedId);
      await loadLogs(selectedId);
    } finally {
      setBusy(false);
    }
  }

  async function previewDelete() {
    if (deleteStatuses.length === 0) {
      setDeleteMessage("Zgjidhni të paktën një status.");
      return;
    }
    setBusy(true);
    setDeleteMessage("");
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview_delete",
          from: deleteFrom || undefined,
          to: deleteTo || undefined,
          statuses: deleteStatuses,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteMessage(`Do fshihen ${data.count} porosi.`);
      } else {
        setDeleteMessage(data.error || "Gabim.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteFiltered() {
    if (deleteStatuses.length === 0) return;
    const ok = window.confirm(
      "Jeni të sigurt që doni të fshini porositë sipas filtrave?"
    );
    if (!ok) return;

    setBusy(true);
    setDeleteMessage("");
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_filtered",
          from: deleteFrom || undefined,
          to: deleteTo || undefined,
          statuses: deleteStatuses,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteMessage(`U fshinë ${data.deleted} porosi.`);
        if (selectedId) {
          const detailRes = await fetch(`/api/orders?id=${selectedId}`);
          if (!detailRes.ok) setSelectedId(null);
        }
        await loadOrders(filter);
        if (showReport) await loadClientReport();
      } else {
        setDeleteMessage(data.error || "Gabim gjatë fshirjes.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function addItem(productId: number, quantity: number, quantityText: string, unitPrice: number, unitPriceText: string) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedId,
          action: "add_item",
          product_id: productId,
          quantity,
          quantity_text: quantityText,
          unit_price: unitPrice,
          unit_price_text: unitPriceText,
        }),
      });
      await loadOrderDetail(selectedId);
      await loadLogs(selectedId);
      await loadOrders(filter);
    } finally {
      setBusy(false);
    }
  }

  async function updateItem(itemId: number, quantity: number, unitPrice: number) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedId,
          action: "update_item",
          item_id: itemId,
          quantity,
          unit_price: unitPrice,
        }),
      });
      await loadOrderDetail(selectedId);
      await loadLogs(selectedId);
      await loadOrders(filter);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: number) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedId,
          action: "remove_item",
          item_id: itemId,
        }),
      });
      await loadOrderDetail(selectedId);
      await loadLogs(selectedId);
      await loadOrders(filter);
    } finally {
      setBusy(false);
    }
  }

  function toggleDeleteStatus(status: string) {
    setDeleteStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  }

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to load products");
      const data = await response.json();
      setProducts(data.products ?? []);
    } catch (error) {
      console.error(error);
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    if (showProducts) loadProducts();
  }, [showProducts, loadProducts]);

  async function saveProduct() {
    setBusy(true);
    try {
      const price = Number(productForm.price);
      if (isNaN(price) || price < 0) {
        alert("Çmimi i pavlefshëm");
        return;
      }

      let res;
      if (editingProduct) {
        res = await fetch("/api/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingProduct.id,
            barcode: productForm.barcode,
            description: productForm.description,
            price,
            active: productForm.active,
          }),
        });
      } else {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barcode: productForm.barcode,
            description: productForm.description,
            price,
            active: productForm.active,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gabim gjatë ruajtjes");
        return;
      }

      await loadProducts();
      setEditingProduct(null);
      setProductForm({ barcode: "", description: "", price: "", active: true });
    } catch (error) {
      console.error(error);
      alert("Gabim gjatë ruajtjes");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm("Jeni të sigurt që doni të fshini këtë produkt?")) return;

    setBusy(true);
    try {
      await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      });
      await loadProducts();
    } catch (error) {
      console.error(error);
      alert("Gabim gjatë fshirjes");
    } finally {
      setBusy(false);
    }
  }

  function startEditProduct(product: Product) {
    setEditingProduct(product);
    setProductForm({
      barcode: product.barcode,
      description: product.description,
      price: String(product.price),
      active: product.active,
    });
  }

  function cancelEditProduct() {
    setEditingProduct(null);
    setProductForm({ barcode: "", description: "", price: "", active: true });
  }

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const search = productSearch.trim().toLowerCase();
    return p.description.toLowerCase().includes(search) || p.barcode.toLowerCase().includes(search);
  });

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to load users");
      const data = await response.json();
      setUsers(data.users ?? []);
    } catch (error) {
      console.error(error);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    if (showUsers) loadUsers();
  }, [showUsers, loadUsers]);

  async function saveUser() {
    if (!userForm.name || !userForm.pin || !userForm.role) {
      alert("Plotësoni të gjitha fushat");
      return;
    }
    setBusy(true);
    try {
      const method = editingUser ? "PATCH" : "POST";
      const body = editingUser
        ? { id: editingUser.id, ...userForm }
        : userForm;
      const response = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to save user");
      await loadUsers();
      setUserForm({ name: "", pin: "", role: "agent", active: true });
      setEditingUser(null);
    } catch (error) {
      console.error(error);
      alert("Gabim gjatë ruajtjes");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: number) {
    if (!confirm("A jeni të sigurt që doni të fshini këtë përdorues?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Failed to delete user");
      await loadUsers();
    } catch (error) {
      console.error(error);
      alert("Gabim gjatë fshirjes");
    } finally {
      setBusy(false);
    }
  }

  function startEditUser(user: User) {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      pin: user.pin,
      role: user.role,
      active: user.active,
    });
  }

  function cancelEditUser() {
    setEditingUser(null);
    setUserForm({ name: "", pin: "", role: "agent", active: true });
  }

  async function loadClientOrders(clientName: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      const allOrders = data.orders ?? [];
      const clientOrders = allOrders.filter((o: Order) => o.client_name === clientName);
      setClientOrders(clientOrders);
      setSelectedClient(clientName);
    } catch (error) {
      console.error(error);
      alert("Gabim gjatë ngarkimit të porosive");
    } finally {
      setBusy(false);
    }
  }

  const canManageItems =
    selectedOrder?.status === "submitted" ||
    selectedOrder?.status === "preparing";

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
      <Header userName={user.name} role="Menaxher" />

      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-xl font-bold">Porositë</h1>
              <select
                className="input w-auto py-1.5 text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
            </div>

            <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto">
              {ordersLoading && (
                <li className="py-6 text-center text-sm text-slate-400">
                  Duke u ngarkuar...
                </li>
              )}
              {!ordersLoading && orders.length === 0 && (
                <li className="py-6 text-center text-sm text-slate-400">
                  Nuk ka porosi
                </li>
              )}
              {orders.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className={`w-full px-1 py-3 text-left transition-colors hover:bg-slate-50 ${
                      selectedId === o.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedId(o.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">#{o.id}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-sm">{o.client_name || "Pa emër klienti"}</p>
                    <p className="text-xs text-slate-500">
                      {o.agent_name} · {o.items.length} artikuj ·{" "}
                      {formatDate(o.created_at)}
                    </p>
                    {o.items.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        {o.items.slice(0, 3).map((i) => i.description).join(", ")}
                        {o.items.length > 3 && "..."}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <button
              type="button"
              className="mb-3 text-sm font-semibold text-blue-600"
              onClick={() => setShowReport((v) => !v)}
            >
              {showReport ? "Fshih" : "Shfaq"} raportin e klientëve
            </button>
            {showReport && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Data nga
                    </label>
                    <input
                      type="date"
                      className="input text-base"
                      value={reportFrom}
                      onChange={(e) => setReportFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Data deri
                    </label>
                    <input
                      type="date"
                      className="input text-base"
                      value={reportTo}
                      onChange={(e) => setReportTo(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Status
                  </label>
                  <select
                    className="input text-base"
                    value={reportStatus}
                    onChange={(e) => setReportStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Emri i klientit
                  </label>
                  <input
                    type="text"
                    className="input text-base"
                    placeholder="Kërko sipas emrit..."
                    value={reportClientName}
                    onChange={(e) => setReportClientName(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-secondary w-full text-sm"
                  onClick={loadClientReport}
                >
                  Apliko filtrat
                </button>
                {clientReport.length === 0 && (
                  <p className="text-sm text-slate-400">Nuk ka të dhëna</p>
                )}
                <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm">
                  {clientReport.map((c) => (
                    <li key={c.client_name} className="py-2">
                      <button
                        type="button"
                        className="w-full text-left transition-colors hover:bg-slate-50 rounded px-1 py-1"
                        onClick={() => loadClientOrders(c.client_name)}
                      >
                        <p className="font-medium text-blue-600">{c.client_name}</p>
                        <p className="text-xs text-slate-500">
                          {c.order_count} porosi · {c.total_items} artikuj ·{" "}
                          {formatMoney(c.total_value)}
                        </p>
                        <p className="text-xs text-slate-400">
                          fundit: {formatDate(c.last_order_at)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {selectedClient && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Porositë për: {selectedClient}</h2>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => setSelectedClient(null)}
                >
                  Mbyll
                </button>
              </div>
              {clientOrders.length === 0 ? (
                <p className="text-sm text-slate-400">Nuk ka porosi për këtë klient</p>
              ) : (
                <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto text-sm">
                  {clientOrders.map((o) => (
                    <li key={o.id} className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">#{o.id}</p>
                          <p className="text-xs text-slate-500">{formatDate(o.created_at)}</p>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="mt-2 space-y-1">
                        {o.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs text-slate-600">
                            <span>{item.description}</span>
                            <span>
                              {item.quantity_text || item.quantity} × {item.unit_price_text || formatMoney(item.unit_price ?? 0)} = {formatMoney(item.line_total ?? 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {o.order_total !== undefined && o.order_total > 0 && (
                        <p className="mt-2 text-sm font-semibold">
                          Total: {formatMoney(o.order_total)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="card space-y-3">
            <button
              type="button"
              className="mb-3 text-sm font-semibold text-blue-600"
              onClick={() => setShowProducts((v) => !v)}
            >
              {showProducts ? "Fshih" : "Shfaq"} menaxhimin e artikujve
            </button>
            {showProducts && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <h3 className="font-semibold">
                    {editingProduct ? "Modifiko artikullin" : "Shto artikull të ri"}
                  </h3>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Barkodi
                    </label>
                    <input
                      type="text"
                      className="input text-base"
                      placeholder="Barkodi..."
                      value={productForm.barcode}
                      onChange={(e) =>
                        setProductForm({ ...productForm, barcode: e.target.value })
                      }
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Përshkrimi
                    </label>
                    <input
                      type="text"
                      className="input text-base"
                      placeholder="Përshkrimi..."
                      value={productForm.description}
                      onChange={(e) =>
                        setProductForm({ ...productForm, description: e.target.value })
                      }
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Çmimi
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input text-base"
                      placeholder="Çmimi..."
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({ ...productForm, price: e.target.value })
                      }
                      disabled={busy}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="productActive"
                      checked={productForm.active}
                      onChange={(e) =>
                        setProductForm({ ...productForm, active: e.target.checked })
                      }
                      disabled={busy}
                    />
                    <label htmlFor="productActive" className="text-sm">
                      Aktiv
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={saveProduct}
                      disabled={busy}
                    >
                      {editingProduct ? "Ruaj ndryshimet" : "Shto"}
                    </button>
                    {editingProduct && (
                      <button
                        type="button"
                        className="btn-secondary text-sm"
                        onClick={cancelEditProduct}
                        disabled={busy}
                      >
                        Anulo
                      </button>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="mb-2">
                    <label className="mb-1 block text-xs text-slate-500">
                      Kërko artikuj
                    </label>
                    <input
                      type="text"
                      className="input text-base"
                      placeholder="Kërko sipas emrit..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <h3 className="mb-2 font-semibold">Lista e artikujve</h3>
                  {filteredProducts.length === 0 && (
                    <p className="text-sm text-slate-400">Nuk ka artikuj</p>
                  )}
                  <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm">
                    {filteredProducts.map((p) => (
                      <li key={p.id} className="py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium">{p.description}</p>
                            <p className="text-xs text-slate-500">
                              Barkodi: {p.barcode} · Çmimi: {formatMoney(p.price)}
                            </p>
                            {!p.active && (
                              <p className="text-xs text-red-500">Jo aktiv</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => startEditProduct(p)}
                              disabled={busy}
                            >
                              Modifiko
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => deleteProduct(p.id)}
                              disabled={busy}
                            >
                              Fshi
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="card space-y-3">
            <button
              type="button"
              className="mb-3 text-sm font-semibold text-blue-600"
              onClick={() => setShowUsers((v) => !v)}
            >
              {showUsers ? "Fshih" : "Shfaq"} menaxhimin e përdoruesve
            </button>
            {showUsers && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <h3 className="font-semibold">
                    {editingUser ? "Modifiko përdoruesin" : "Shto përdorues të ri"}
                  </h3>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Emri
                    </label>
                    <input
                      type="text"
                      className="input text-base"
                      placeholder="Emri..."
                      value={userForm.name}
                      onChange={(e) =>
                        setUserForm({ ...userForm, name: e.target.value })
                      }
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      PIN
                    </label>
                    <input
                      type="text"
                      className="input text-base"
                      placeholder="PIN..."
                      value={userForm.pin}
                      onChange={(e) =>
                        setUserForm({ ...userForm, pin: e.target.value })
                      }
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Roli
                    </label>
                    <select
                      className="input text-base"
                      value={userForm.role}
                      onChange={(e) =>
                        setUserForm({ ...userForm, role: e.target.value })
                      }
                      disabled={busy}
                    >
                      <option value="agent">Agjent</option>
                      <option value="manager">Menaxher</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="userActive"
                      checked={userForm.active}
                      onChange={(e) =>
                        setUserForm({ ...userForm, active: e.target.checked })
                      }
                      disabled={busy}
                    />
                    <label htmlFor="userActive" className="text-sm">
                      Aktiv
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={saveUser}
                      disabled={busy}
                    >
                      {editingUser ? "Ruaj ndryshimet" : "Shto"}
                    </button>
                    {editingUser && (
                      <button
                        type="button"
                        className="btn-secondary text-sm"
                        onClick={cancelEditUser}
                        disabled={busy}
                      >
                        Anulo
                      </button>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <h3 className="mb-2 font-semibold">Lista e përdoruesve</h3>
                  {users.length === 0 && (
                    <p className="text-sm text-slate-400">Nuk ka përdorues</p>
                  )}
                  <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm">
                    {users.map((u) => (
                      <li key={u.id} className="py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-slate-500">
                              Roli: {u.role === "manager" ? "Menaxher" : "Agjent"} · PIN: {u.pin}
                            </p>
                            {!u.active && (
                              <p className="text-xs text-red-500">Jo aktiv</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => startEditUser(u)}
                              disabled={busy}
                            >
                              Modifiko
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => deleteUser(u.id)}
                              disabled={busy}
                            >
                              Fshi
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="card space-y-3">
            <button
              type="button"
              className="mb-3 text-sm font-semibold text-blue-600"
              onClick={() => setShowDeleteOrders((v) => !v)}
            >
              {showDeleteOrders ? "Fshih" : "Shfaq"} fshirjen e porosive
            </button>
            {showDeleteOrders && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Data nga
                    </label>
                    <input
                      type="date"
                      className="input text-base"
                      value={deleteFrom}
                      onChange={(e) => setDeleteFrom(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Data deri
                    </label>
                    <input
                      type="date"
                      className="input text-base"
                      value={deleteTo}
                      onChange={(e) => setDeleteTo(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs text-slate-500">Status për fshirje</p>
                  <div className="flex flex-wrap gap-2">
                    {DELETE_STATUS_OPTIONS.map((s) => (
                      <label
                        key={s}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={deleteStatuses.includes(s)}
                          onChange={() => toggleDeleteStatus(s)}
                          disabled={busy}
                        />
                        {STATUS_LABELS[s]}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={previewDelete}
                    disabled={busy}
                  >
                    Shiko sa fshihen
                  </button>
                  <button
                    type="button"
                    className="btn-danger text-sm"
                    onClick={deleteFiltered}
                    disabled={busy}
                  >
                    Fshi
                  </button>
                </div>
                {deleteMessage && (
                  <p className="text-sm text-slate-600">{deleteMessage}</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          {!selectedOrder ? (
            <div className="card py-12 text-center text-slate-400">
              Zgjidhni një porosi për përgatitje
            </div>
          ) : (
            <>
              <div className="card space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">
                    Porosia #{selectedOrder.id}
                  </h2>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <p className="text-sm">
                  <span className="text-slate-500">Klienti:</span>{" "}
                  {selectedOrder.client_name || "—"}
                </p>
                <p className="text-sm">
                  <span className="text-slate-500">Agjenti:</span>{" "}
                  {selectedOrder.agent_name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(selectedOrder.created_at)}
                </p>
                {selectedOrder.order_total !== undefined &&
                  selectedOrder.order_total > 0 && (
                    <p className="font-semibold">
                      Totali: {formatMoney(selectedOrder.order_total)}
                    </p>
                  )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedOrder.status === "submitted" && (
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={busy}
                      onClick={() => updateStatus("preparing")}
                    >
                      Fillo përgatitjen
                    </button>
                  )}
                  {selectedOrder.status === "preparing" && (
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={busy}
                      onClick={() => updateStatus("ready")}
                    >
                      Shëno si gati
                    </button>
                  )}
                  {selectedOrder.status !== "cancelled" &&
                    selectedOrder.status !== "ready" && (
                      <button
                        type="button"
                        className="btn-danger text-sm"
                        disabled={busy}
                        onClick={() => updateStatus("cancelled")}
                      >
                        Anulo porosinë
                      </button>
                    )}
                </div>
              </div>

              <div className="card">
                <h3 className="mb-3 font-semibold">Artikuj për përgatitje</h3>
                <OrderItemsList
                  items={selectedOrder.items}
                  canRemove={canManageItems}
                  onRemove={removeItem}
                  editable={canManageItems}
                  onUpdate={updateItem}
                  busy={busy}
                />
              </div>

              {canManageItems && (
                <ProductSearch disabled={busy} onAdd={(productId, quantity, quantityText, unitPrice, unitPriceText) => addItem(productId, quantity, quantityText, unitPrice, unitPriceText)} />
              )}

              <div className="card">
                <button
                  type="button"
                  className="mb-3 text-sm font-semibold text-blue-600"
                  onClick={() => setShowLogs((v) => !v)}
                >
                  {showLogs ? "Fshih" : "Shfaq"} regjistrin e aktivitetit
                </button>
                {showLogs && (
                  <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">
                    {logs.map((log) => (
                      <li key={log.id} className="rounded bg-slate-50 p-2">
                        <p>
                          <span className="font-medium">{log.user_name}</span> ·{" "}
                          {ACTION_LABELS[log.action] ??
                            log.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-slate-500">
                          {formatDate(log.created_at)}
                        </p>
                      </li>
                    ))}
                    {logs.length === 0 && (
                      <li className="text-slate-400">Nuk ka regjistrime</li>
                    )}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
