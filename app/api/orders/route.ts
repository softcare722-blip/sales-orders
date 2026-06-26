import { NextRequest } from "next/server";
import {
  getStore,
  logAudit,
  now,
  persist,
  touchOrder,
} from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import {
  fetchOrder,
  fetchOrders,
  deleteOrdersByFilter,
  countOrdersByFilter,
} from "@/lib/orders";
import { error, json } from "@/lib/api";

function resolveUnitPrice(bodyPrice: unknown): number | null {
  if (bodyPrice === undefined || bodyPrice === null || bodyPrice === "") {
    return null;
  }
  const price = Number(String(bodyPrice).replace(",", "."));
  if (isNaN(price) || price < 0) return null;
  return price;
}

function canEditItems(
  role: string,
  order: { agent_id: number; status: string },
  userId: number
): boolean {
  if (role === "manager") {
    return order.status === "submitted" || order.status === "preparing";
  }
  return role === "agent" && order.agent_id === userId && order.status === "submitted";
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return error("Nuk jeni të identifikuar", 401);

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const order = fetchOrder(Number(id));
    if (!order) return error("Porosia nuk u gjet", 404);
    if (user.role === "agent" && order.agent_id !== user.id) {
      return error("Nuk është porosia juaj", 403);
    }
    return json({ order });
  }

  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  if (user.role === "agent") {
    const s = getStore();
    const orders = s.orders
      .filter((o) => o.agent_id === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 50);

    return json({ orders: orders.map((o) => fetchOrder(o.id)!) });
  }

  return json({ orders: fetchOrders(status) });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["agent"]);
  } catch {
    return error("Vetëm për agjentët", 403);
  }

  const body = await request.json();
  const clientName = String(body.client_name ?? "").trim();
  const notes = String(body.notes ?? "").trim();

  const s = getStore();
  const order = {
    id: s.nextId.orders++,
    agent_id: user!.id,
    client_name: clientName,
    status: "submitted" as const,
    notes,
    created_at: now(),
    updated_at: now(),
  };
  s.orders.push(order);
  persist();

  logAudit(user!.id, "order_created", order.id, { client_name: clientName });

  return json({ order: fetchOrder(order.id) }, 201);
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return error("Nuk jeni të identifikuar", 401);

  const body = await request.json();

  if (body.action === "preview_delete") {
    if (user.role !== "manager") return error("Vetëm për menaxherët", 403);
    const statuses = Array.isArray(body.statuses)
      ? body.statuses.filter((s: string) =>
          ["submitted", "preparing", "ready", "cancelled"].includes(s)
        )
      : [];
    if (statuses.length === 0) return error("Zgjidhni të paktën një status");
    const count = countOrdersByFilter({
      from: body.from || undefined,
      to: body.to || undefined,
      statuses,
    });
    return json({ count });
  }

  if (body.action === "delete_filtered") {
    if (user.role !== "manager") return error("Vetëm për menaxherët", 403);
    const statuses = Array.isArray(body.statuses)
      ? body.statuses.filter((s: string) =>
          ["submitted", "preparing", "ready", "cancelled"].includes(s)
        )
      : [];
    if (statuses.length === 0) return error("Zgjidhni të paktën një status");
    const count = deleteOrdersByFilter({
      from: body.from || undefined,
      to: body.to || undefined,
      statuses,
    });
    persist();
    logAudit(user.id, "orders_deleted", null, {
      count,
      from: body.from,
      to: body.to,
      statuses,
    });
    return json({ deleted: count });
  }

  const orderId = Number(body.order_id);
  if (!orderId) return error("Kërkohet order_id");

  const order = fetchOrder(orderId);
  if (!order) return error("Porosia nuk u gjet", 404);

  const s = getStore();
  const orderRef = s.orders.find((o) => o.id === orderId)!;

  if (body.action === "add_item") {
    if (!canEditItems(user.role, order, user.id)) {
      return error("Nuk lejohet", 403);
    }

    const productId = Number(body.product_id);
    const quantity = Number(body.quantity);
    const quantityText = String(body.quantity_text ?? "").trim() || null;
    if (!productId || !quantity || quantity <= 0) {
      return error("Kërkohen product_id dhe quantity");
    }

    const unitPrice = resolveUnitPrice(body.unit_price);
    const unitPriceText = String(body.unit_price_text ?? "").trim() || null;

    s.order_items.push({
      id: s.nextId.order_items++,
      order_id: orderId,
      product_id: productId,
      quantity,
      quantity_text: quantityText,
      unit_price: unitPrice,
      unit_price_text: unitPriceText,
      added_by: user.id,
      removed_at: null,
      removed_by: null,
      created_at: now(),
    });
    touchOrder(orderId);
    logAudit(user.id, "item_added", orderId, {
      product_id: productId,
      quantity,
      unit_price: unitPrice,
    });

    return json({ order: fetchOrder(orderId) });
  }

  if (body.action === "update_item") {
    if (user.role !== "manager") return error("Vetëm për menaxherët", 403);
    if (!canEditItems(user.role, order, user.id)) {
      return error("Porosia nuk mund të ndryshohet në këtë status");
    }

    const itemId = Number(body.item_id);
    if (!itemId) return error("Kërkohet item_id");

    const item = s.order_items.find(
      (i) => i.id === itemId && i.order_id === orderId
    );
    if (!item) return error("Artikulli nuk u gjet", 404);
    if (item.removed_at) return error("Tashmë i hequr");

    if (body.quantity !== undefined) {
      const quantity = Number(body.quantity);
      if (!quantity || quantity <= 0) return error("Sasia e pavlefshme");
      item.quantity = quantity;
    }

    // FIXED: Also save quantity_text so "5+1" is preserved
    if (body.quantity_text !== undefined) {
      const quantityText = String(body.quantity_text ?? "").trim() || null;
      item.quantity_text = quantityText;
    }

    if (body.unit_price !== undefined) {
      const price = Number(body.unit_price);
      if (isNaN(price) || price < 0) return error("Çmimi i pavlefshëm");
      item.unit_price = price;
    }

    // FIXED: Also save unit_price_text so custom prices are preserved
    if (body.unit_price_text !== undefined) {
      const unitPriceText = String(body.unit_price_text ?? "").trim() || null;
      item.unit_price_text = unitPriceText;
    }

    touchOrder(orderId);
    logAudit(user.id, "item_updated", orderId, { item_id: itemId });
    persist();

    return json({ order: fetchOrder(orderId) });
  }

  if (body.action === "remove_item") {
    const itemId = Number(body.item_id);
    if (!itemId) return error("Kërkohet item_id");

    const item = s.order_items.find(
      (i) => i.id === itemId && i.order_id === orderId
    );
    if (!item) return error("Artikulli nuk u gjet", 404);
    if (item.removed_at) return error("Tashmë i hequr");

    const canRemove =
      user.role === "manager" ||
      (user.role === "agent" &&
        order.agent_id === user.id &&
        order.status === "submitted");

    if (!canRemove) return error("Nuk lejohet", 403);

    item.removed_at = now();
    item.removed_by = user.id;
    touchOrder(orderId);
    logAudit(user.id, "item_removed", orderId, { item_id: itemId });
    persist();

    return json({ order: fetchOrder(orderId) });
  }

  if (body.action === "update_status") {
    if (user.role !== "manager") return error("Vetëm për menaxherët", 403);
    const status = body.status;
    if (!["submitted", "preparing", "ready", "cancelled"].includes(status)) {
      return error("Status i pavlefshëm");
    }

    orderRef.status = status;
    orderRef.updated_at = now();
    persist();
    logAudit(user.id, "status_changed", orderId, {
      from: order.status,
      to: status,
    });

    return json({ order: fetchOrder(orderId) });
  }

  if (body.action === "update_client") {
    if (user.role !== "agent" || order.agent_id !== user.id) {
      return error("Nuk lejohet", 403);
    }
    const clientName = String(body.client_name ?? "").trim();
    orderRef.client_name = clientName;
    orderRef.updated_at = now();
    persist();
    logAudit(user.id, "client_updated", orderId, { client_name: clientName });
    return json({ order: fetchOrder(orderId) });
  }

  return error("Veprim i panjohur");
}
