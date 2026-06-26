import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { invalidateProductIndex } from "../lib/products";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "store.json");
const DEFAULT_XLSX = "d:\\Desktop\\Book1.xlsx";

interface Store {
  products: Array<{
    id: number;
    barcode: string;
    description: string;
    price: number;
    active: boolean;
  }>;
  nextId: { products: number };
}

function parsePrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val.replace(",", ".").trim());
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function main() {
  const xlsxPath = process.argv[2] || DEFAULT_XLSX;
  if (!fs.existsSync(xlsxPath)) {
    console.error(`Skedari nuk u gjet: ${xlsxPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(DB_PATH)) {
    console.error(`store.json nuk u gjet: ${DB_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  const store: Store = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const byBarcode = new Map(
    store.products.map((p) => [p.barcode.trim(), p])
  );

  let updated = 0;
  let added = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length < 3) continue;

    const barcode = String(row[0] ?? "").trim();
    const description = String(row[1] ?? "").trim();
    const price = parsePrice(row[2]);

    if (!barcode || barcode.toLowerCase() === "barkod" || barcode.toLowerCase() === "barcode") {
      continue;
    }

    const existing = byBarcode.get(barcode);
    if (existing) {
      existing.description = description || existing.description;
      existing.price = price;
      updated++;
    } else {
      const product = {
        id: store.nextId.products++,
        barcode,
        description: description || barcode,
        price,
        active: true,
      };
      store.products.push(product);
      byBarcode.set(barcode, product);
      added++;
    }
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), "utf-8");
  invalidateProductIndex();

  console.log(`Import përfundoi: ${updated} përditësuar, ${added} të rinj.`);
}

main();
