import { NextRequest } from "next/server";
import { getSessionUser, requireRole } from "@/lib/auth";
import { error, json } from "@/lib/api";
import {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/products";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return error("Nuk jeni të identifikuar", 401);

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const product = getProductById(Number(id));
    if (!product) return error("Produkti nuk u gjet", 404);
    return json({ product });
  }

  return json({ products: getAllProducts() });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["manager"]);
  } catch {
    return error("Vetëm për menaxherët", 403);
  }

  const body = await request.json();
  const barcode = String(body.barcode ?? "").trim();
  const description = String(body.description ?? "").trim();
  const price = Number(body.price);
  const active = body.active !== undefined ? Boolean(body.active) : true;

  if (!barcode) return error("Kërkohet barkodi");
  if (!description) return error("Kërkohet përshkrimi");
  if (isNaN(price) || price < 0) return error("Çmimi i pavlefshëm");

  const existingProducts = getAllProducts();
  const duplicateBarcode = existingProducts.find((p) => p.barcode === barcode);
  if (duplicateBarcode) {
    return error("Kjo barkodë ekziston tashmë");
  }

  const product = addProduct({ barcode, description, price, active });
  return json({ product }, 201);
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["manager"]);
  } catch {
    return error("Vetëm për menaxherët", 403);
  }

  const body = await request.json();
  const id = Number(body.id);
  if (!id) return error("Kërkohet ID");

  const updates: Partial<{ barcode: string; description: string; price: number; active: boolean }> = {};
  if (body.barcode !== undefined) {
    const barcode = String(body.barcode).trim();
    const existingProducts = getAllProducts();
    const duplicateBarcode = existingProducts.find((p) => p.barcode === barcode && p.id !== id);
    if (duplicateBarcode) {
      return error("Kjo barkodë ekziston tashmë");
    }
    updates.barcode = barcode;
  }
  if (body.description !== undefined) updates.description = String(body.description).trim();
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (isNaN(price) || price < 0) return error("Çmimi i pavlefshëm");
    updates.price = price;
  }
  if (body.active !== undefined) updates.active = Boolean(body.active);

  const product = updateProduct(id, updates);
  if (!product) return error("Produkti nuk u gjet", 404);

  return json({ product });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requireRole(user, ["manager"]);
  } catch {
    return error("Vetëm për menaxherët", 403);
  }

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return error("Kërkohet ID");

  const success = deleteProduct(id);
  if (!success) return error("Produkti nuk u gjet", 404);

  return json({ success: true });
}
