import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "store.json");

export type UserRole = "agent" | "manager";
export type OrderStatus = "submitted" | "preparing" | "ready" | "cancelled";

export interface User {
  id: number;
  name: string;
  pin: string;
  role: UserRole;
  active: boolean;
}

export interface Product {
  id: number;
  barcode: string;
  description: string;
  price: number;
  active: boolean;
}

export interface Order {
  id: number;
  agent_id: number;
  client_name: string;
  status: OrderStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  quantity_text: string | null;
  unit_price: number | null;
  unit_price_text: string | null;
  added_by: number;
  removed_at: string | null;
  removed_by: number | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  order_id: number | null;
  user_id: number;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface Store {
  users: User[];
  products: Product[];
  orders: Order[];
  order_items: OrderItem[];
  audit_log: AuditEntry[];
  nextId: {
    users: number;
    products: number;
    orders: number;
    order_items: number;
    audit_log: number;
  };
}

let store: Store | null = null;

function now() {
  return new Date().toISOString();
}

function migrateStore(s: Store): Store {
  for (const p of s.products) {
    if (typeof (p as Product).price !== "number") {
      (p as Product).price = 0;
    }
  }
  for (const i of s.order_items) {
    if (!("unit_price" in i)) {
      (i as OrderItem).unit_price = null;
    }
    if (!("quantity_text" in i)) {
      (i as OrderItem).quantity_text = null;
    }
    if (!("unit_price_text" in i)) {
      (i as OrderItem).unit_price_text = null;
    }
  }
  return s;
}

function loadStore(): Store {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    return migrateStore(JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as Store);
  }
  const empty: Store = {
    users: [],
    products: [],
    orders: [],
    order_items: [],
    audit_log: [],
    nextId: { users: 1, products: 1, orders: 1, order_items: 1, audit_log: 1 },
  };
  saveStore(empty);
  seedIfEmpty(empty);
  saveStore(empty);
  return empty;
}

function saveStore(s: Store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(s, null, 2), "utf-8");
}

export function getStore(): Store {
  if (!store) store = loadStore();
  return store;
}

export function persist() {
  if (store) saveStore(store);
}

function seedIfEmpty(s: Store) {
  if (s.users.length > 0) return;

  s.users.push(
    { id: s.nextId.users++, name: "Ana Agent", pin: "1234", role: "agent", active: true },
    { id: s.nextId.users++, name: "Beni Agent", pin: "1234", role: "agent", active: true },
    { id: s.nextId.users++, name: "Manager", pin: "0000", role: "manager", active: true }
  );

  const products: [string, string, number][] = [
    ["1234567890123", "Coca Cola 0.5L", 0],
    ["1234567890456", "Coca Cola 1.5L", 0],
    ["9876543210123", "Fanta Orange 0.5L", 0],
    ["9876543210456", "Fanta Orange 1.5L", 0],
    ["5555555555012", "Mineral Water 0.5L", 0],
    ["5555555555456", "Mineral Water 1.5L", 0],
    ["1111111111012", "Bread White 500g", 0],
    ["1111111111456", "Bread Whole Grain 500g", 0],
    ["2222222222012", "Milk 1L Full Fat", 0],
    ["2222222222456", "Milk 1L Low Fat", 0],
    ["3333333333012", "Eggs 10 pack", 0],
    ["4444444444012", "Butter 250g", 0],
    ["6666666666012", "Sugar 1kg", 0],
    ["7777777777012", "Flour 1kg", 0],
    ["8888888888012", "Rice 1kg", 0],
  ];
  for (const [barcode, description, price] of products) {
    s.products.push({
      id: s.nextId.products++,
      barcode,
      description,
      price,
      active: true,
    });
  }
}

export function logAudit(
  userId: number,
  action: string,
  orderId: number | null,
  details: Record<string, unknown> = {}
) {
  const s = getStore();
  s.audit_log.push({
    id: s.nextId.audit_log++,
    order_id: orderId,
    user_id: userId,
    action,
    details,
    created_at: now(),
  });
  persist();
}

export function touchOrder(orderId: number) {
  const s = getStore();
  const order = s.orders.find((o) => o.id === orderId);
  if (order) order.updated_at = now();
  persist();
}

export { now };
