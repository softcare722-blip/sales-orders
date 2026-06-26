"use client";

import { useEffect, useState } from "react";

interface Product {
  id: number;
  barcode: string;
  description: string;
  price: number;
}

interface Props {
  onAdd: (productId: number, quantity: number, quantityText: string, unitPrice: number, unitPriceText: string) => void;
  disabled?: boolean;
}

function formatPrice(n: number) {
  return n > 0 ? `${n.toLocaleString("sq-AL")} Lek` : "—";
}

export function ProductSearch({ onAdd, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        setResults(data.products ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function getQty(id: number) {
    const val = quantities[id];
    if (!val) return 1;

    // Handle expressions like "5+1"
    if (val.includes("+")) {
      const parts = val.split("+").map((p) => Number(p.trim()));
      if (parts.every((n) => !isNaN(n) && n >= 0)) {
        const sum = parts.reduce((a, b) => a + b, 0);
        return sum > 0 ? sum : 1;
      }
    }

    const num = Number(val);
    return isNaN(num) || num < 1 ? 1 : num;
  }

  function getPrice(p: Product) {
    const val = prices[p.id];
    if (val !== undefined && val !== "") {
      // Handle "gratis" or similar text
      const lower = val.toLowerCase().trim();
      if (lower === "gratis" || lower === "falas" || lower === "0") {
        return 0;
      }

      const num = Number(val.replace(",", "."));
      if (!isNaN(num) && num >= 0) return num;
    }
    return p.price;
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Shto produkte</h2>

      <input
        className="input text-base"
        placeholder="4 shifrat e fundit të barkodit ose pjesë e përshkrimit..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />

      <p className="text-xs text-slate-500">
        Shkruani 4 shifra (p.sh. 1012) ose pjesë të emrit (p.sh. rifuxho, role)
      </p>

      {searching && (
        <p className="text-sm text-slate-400">Duke kërkuar...</p>
      )}

      <ul className="divide-y divide-slate-100">
        {results.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.description}</p>
              <p className="text-xs text-slate-500">
                ...{p.barcode.slice(-4)} · Listë: {formatPrice(p.price)}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-slate-500">Sasia</label>
                <input
                  type="text"
                  inputMode="text"
                  className="input w-16 text-base"
                  defaultValue="1"
                  onFocus={() => {
                    setQuantities((q) => ({
                      ...q,
                      [p.id]: q[p.id] ?? "1",
                    }));
                  }}
                  onChange={(e) =>
                    setQuantities((q) => ({
                      ...q,
                      [p.id]: e.target.value,
                    }))
                  }
                  disabled={disabled}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-slate-500">Çmimi</label>
                <input
                  type="text"
                  inputMode="text"
                  className="input w-24 text-base"
                  placeholder={p.price > 0 ? String(p.price) : "0"}
                  onFocus={() => {
                    setPrices((pr) => ({
                      ...pr,
                      [p.id]: pr[p.id] ?? (p.price > 0 ? String(p.price) : ""),
                    }));
                  }}
                  onChange={(e) =>
                    setPrices((pr) => ({
                      ...pr,
                      [p.id]: e.target.value,
                    }))
                  }
                  disabled={disabled}
                />
              </div>

              <button
                type="button"
                className="btn-primary mt-4 whitespace-nowrap px-3 py-2 text-sm sm:mt-0"
                onClick={async () => {
                  setAdding(true);
                  try {
                    await onAdd(p.id, getQty(p.id), quantities[p.id] || String(getQty(p.id)), getPrice(p), prices[p.id] || (getPrice(p) > 0 ? String(getPrice(p)) : ""));
                  } finally {
                    setAdding(false);
                  }
                }}
                disabled={disabled || adding}
              >
                {adding ? "Duke shtuar..." : "Shto"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!searching && query.length >= 2 && results.length === 0 && (
        <p className="text-sm text-slate-400">Nuk u gjetën produkte</p>
      )}
    </div>
  );
}
