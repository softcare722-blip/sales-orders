"use client";

import { useEffect, useState } from "react";

interface Product {
  id: number;
  barcode: string;
  description: string;
}

interface Props {
  onAdd: (productId: number, quantity: number) => void;
  disabled?: boolean;
}

export function ProductSearch({ onAdd, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [searching, setSearching] = useState(false);

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
    return quantities[id] ?? 1;
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Add products</h2>
      <input
        className="input"
        placeholder="Last 4 barcode digits or part of description..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      <p className="text-xs text-slate-500">
        Type 4 digits (e.g. 1012) or part of name (e.g. coca, milk)
      </p>

      {searching && <p className="text-sm text-slate-400">Searching...</p>}

      <ul className="divide-y divide-slate-100">
        {results.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.description}</p>
              <p className="text-xs text-slate-500">...{p.barcode.slice(-4)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <input
                type="number"
                min={1}
                step={1}
                className="input w-20"
                value={getQty(p.id)}
                onChange={(e) =>
                  setQuantities((q) => ({
                    ...q,
                    [p.id]: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                disabled={disabled}
              />
              <button
                type="button"
                className="btn-primary whitespace-nowrap px-3 py-2 text-sm"
                onClick={() => onAdd(p.id, getQty(p.id))}
                disabled={disabled}
              >
                Add
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!searching && query.length >= 2 && results.length === 0 && (
        <p className="text-sm text-slate-400">No products found</p>
      )}
    </div>
  );
}
