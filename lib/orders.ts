import { getStore } from "./db";

export interface OrderItemView {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  quantity_text: string | null;
  unit_price: number;
  unit_price_text: string | null;
  list_price: number;
  line_total: number;
  barcode: string;
  description: string;
  added_by_name: string;
  removed_at: string | null;
  removed_by_name: string | null;
}

export interface OrderView {
  id: number;
  agent_id: number;
  agent_name: string;
  client_name: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  items: OrderItemView[];
  order_total: number;
}

function effectivePrice(
  unitPrice: number | null,
  listPrice: number
): number {
  if (unitPrice !== null && unitPrice >= 0) return unitPrice;
  return listPrice;
}

function mapItems(orderId: number, activeOnly = false): OrderItemView[] {
  const s = getStore();
  return s.order_items
    .filter((i) => i.order_id === orderId && (!activeOnly || !i.removed_at))
    .map((i) => {
      const product = s.products.find((p) => p.id === i.product_id);
      const addedBy = s.users.find((u) => u.id === i.added_by)!;
      const removedBy = i.removed_by
        ? s.users.find((u) => u.id === i.removed_by)
        : null;
      const listPrice = product?.price ?? 0;
      const unitPrice = effectivePrice(i.unit_price, listPrice);
      return {
        id: i.id,
        order_id: i.order_id,
        product_id: i.product_id,
        quantity: i.quantity,
        quantity_text: i.quantity_text ?? null,
        unit_price: unitPrice,
        unit_price_text: i.unit_price_text ?? null,
        list_price: listPrice,
        line_total: unitPrice * i.quantity,
        barcode: product?.barcode ?? `#${i.product_id}`,
        description: product?.description ?? `Produkt i fshirë (ID: ${i.product_id})`,
        added_by_name: addedBy.name,
        removed_at: i.removed_at,
        removed_by_name: removedBy?.name ?? null,
      };
    });
}

function orderTotal(items: OrderItemView[]): number {
  return items
    .filter((i) => !i.removed_at)
    .reduce((sum, i) => sum + i.line_total, 0);
}

export function fetchOrder(orderId: number): OrderView | null {
  const s = getStore();
  const order = s.orders.find((o) => o.id === orderId);
  if (!order) return null;
  const agent = s.users.find((u) => u.id === order.agent_id)!;
  const items = mapItems(orderId);
  return {
    ...order,
    agent_name: agent.name,
    items,
    order_total: orderTotal(items),
  };
}

const statusOrder: Record<string, number> = {
  submitted: 1,
  preparing: 2,
  ready: 3,
  cancelled: 4,
};

export function fetchOrders(statusFilter?: string): OrderView[] {
  const s = getStore();
  let orders = [...s.orders];
  if (statusFilter && statusFilter !== "all") {
    orders = orders.filter((o) => o.status === statusFilter);
  }
  orders.sort((a, b) => {
    const sd = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (sd !== 0) return sd;
    return b.created_at.localeCompare(a.created_at);
  });

  return orders.map((order) => {
    const agent = s.users.find((u) => u.id === order.agent_id)!;
    const items = mapItems(order.id, true);
    return {
      ...order,
      agent_name: agent.name,
      items,
      order_total: orderTotal(items),
    };
  });
}

export interface ReportFilters {
  from?: string;
  to?: string;
  status?: string;
  client_name?: string;
}

export interface ClientSalesEntry {
  client_name: string;
  order_count: number;
  total_items: number;
  total_value: number;
  last_order_at: string;
}

function matchesDateRange(
  createdAt: string,
  from?: string,
  to?: string
): boolean {
  const day = createdAt.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function matchesStatus(status: string, filter?: string): boolean {
  if (!filter || filter === "all") return true;
  return status === filter;
}

function matchesClientName(clientName: string, filter?: string): boolean {
  if (!filter || filter.trim() === "") return true;
  const search = filter.trim().toLowerCase();
  return clientName.toLowerCase().includes(search);
}

export function fetchClientSalesReport(
  filters: ReportFilters = {}
): ClientSalesEntry[] {
  const s = getStore();
  const map = new Map<
    string,
    {
      order_count: number;
      total_items: number;
      total_value: number;
      last_order_at: string;
    }
  >();

  for (const order of s.orders) {
    if (!matchesDateRange(order.created_at, filters.from, filters.to)) continue;
    if (!matchesStatus(order.status, filters.status)) continue;

    const name = order.client_name.trim() || "Pa emër klienti";
    if (!matchesClientName(name, filters.client_name)) continue;
    const items = s.order_items.filter(
      (i) => i.order_id === order.id && !i.removed_at
    );
    const existing = map.get(name) ?? {
      order_count: 0,
      total_items: 0,
      total_value: 0,
      last_order_at: "",
    };
    existing.order_count += 1;
    for (const item of items) {
      const product = s.products.find((p) => p.id === item.product_id);
      const listPrice = product?.price ?? 0;
      const unitPrice = effectivePrice(item.unit_price, listPrice);
      existing.total_items += item.quantity;
      existing.total_value += unitPrice * item.quantity;
    }
    if (order.created_at > existing.last_order_at) {
      existing.last_order_at = order.created_at;
    }
    map.set(name, existing);
  }

  return Array.from(map.entries())
    .map(([client_name, data]) => ({ client_name, ...data }))
    .sort((a, b) => b.last_order_at.localeCompare(a.last_order_at));
}

export interface DeleteFilters {
  from?: string;
  to?: string;
  statuses: string[];
}

export function countOrdersByFilter(filters: DeleteFilters): number {
  const s = getStore();
  return s.orders.filter(
    (o) =>
      matchesDateRange(o.created_at, filters.from, filters.to) &&
      filters.statuses.includes(o.status)
  ).length;
}

export function deleteOrdersByFilter(filters: DeleteFilters): number {
  const s = getStore();
  const ids = new Set(
    s.orders
      .filter(
        (o) =>
          matchesDateRange(o.created_at, filters.from, filters.to) &&
          filters.statuses.includes(o.status)
      )
      .map((o) => o.id)
  );

  if (ids.size === 0) return 0;

  s.orders = s.orders.filter((o) => !ids.has(o.id));
  s.order_items = s.order_items.filter((i) => !ids.has(i.order_id));
  return ids.size;
}
