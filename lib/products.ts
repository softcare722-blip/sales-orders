import { getStore, type Product, persist } from "./db";

let barcodeIndex: Map<string, Product[]> | null = null;
let activeProducts: Product[] | null = null;

function rebuildIndex() {
  const products = getStore().products.filter((p) => p.active);
  activeProducts = products;
  barcodeIndex = new Map();
  for (const p of products) {
    const suffix = p.barcode.slice(-4);
    const list = barcodeIndex.get(suffix) ?? [];
    list.push(p);
    barcodeIndex.set(suffix, list);
  }
}

function ensureIndex() {
  if (!barcodeIndex || !activeProducts) rebuildIndex();
}

export function invalidateProductIndex() {
  barcodeIndex = null;
  activeProducts = null;
}

export function searchProducts(q: string): Product[] {
  ensureIndex();
  const query = q.trim();
  if (query.length < 2) return [];

  if (/^\d{4}$/.test(query)) {
    return (barcodeIndex!.get(query) ?? []).slice(0, 20);
  }

  const lower = query.toLowerCase();
  return activeProducts!
    .filter((p) => p.description.toLowerCase().includes(lower))
    .slice(0, 20);
}

export function getAllProducts(): Product[] {
  const s = getStore();
  return s.products;
}

export function getProductById(id: number): Product | null {
  const s = getStore();
  return s.products.find((p) => p.id === id) ?? null;
}

export function addProduct(product: Omit<Product, "id">): Product {
  const s = getStore();
  const newProduct: Product = {
    id: s.nextId.products++,
    ...product,
  };
  s.products.push(newProduct);
  persist();
  invalidateProductIndex();
  return newProduct;
}

export function updateProduct(id: number, updates: Partial<Omit<Product, "id">>): Product | null {
  const s = getStore();
  const product = s.products.find((p) => p.id === id);
  if (!product) return null;

  Object.assign(product, updates);
  persist();
  invalidateProductIndex();
  return product;
}

export function deleteProduct(id: number): boolean {
  const s = getStore();
  const index = s.products.findIndex((p) => p.id === id);
  if (index === -1) return false;

  s.products.splice(index, 1);
  persist();
  invalidateProductIndex();
  return true;
}
