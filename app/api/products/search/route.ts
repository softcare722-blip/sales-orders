import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { error, json } from "@/lib/api";
import { searchProducts } from "@/lib/products";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return error("Nuk jeni të identifikuar", 401);

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return json({ products: [] });

  const products = searchProducts(q);

  return json({
    products: products.map(({ id, barcode, description, price }) => ({
      id,
      barcode,
      description,
      price,
    })),
  });
}
