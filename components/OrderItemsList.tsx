"use client";

import { useState } from "react";

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

interface Props {
  items: OrderItem[];
  canRemove: boolean;
  onRemove: (itemId: number) => void;
  showRemoved?: boolean;
  editable?: boolean;
  onUpdate?: (
    itemId: number,
    quantity: number,
    quantityText: string,
    unitPrice: number,
    unitPriceText: string
  ) => void;
  busy?: boolean;
}

function formatMoney(n: number) {
  return `${n.toLocaleString("sq-AL")} Lek`;
}

function parseQuantity(text: string): number {
  const value = text.trim().replace(/\s+/g, "");

  if (!value) return NaN;

  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  const normalized = value.replace(/[xX×]/g, "*");

  if (normalized.includes("+")) {
    const parts = normalized.split("+").map((p) => Number(p));

    if (parts.some(isNaN)) return NaN;

    return parts.reduce((a, b) => a + b, 0);
  }

  if (normalized.includes("*")) {
    const parts = normalized.split("*").map((p) => Number(p));

    if (parts.some(isNaN)) return NaN;

    return parts.reduce((a, b) => a * b, 1);
  }

  return NaN;
}

export function OrderItemsList({
  items,
  canRemove,
  onRemove,
  showRemoved = false,
  editable = false,
  onUpdate,
  busy = false,
}: Props) {
  const [edits, setEdits] = useState<
    Record<number, { quantity: string; unit_price: string }>
  >({});

  const visible = showRemoved
    ? items
    : items.filter((i) => !i.removed_at);

  if (visible.length === 0) {
    return <p className="text-sm text-slate-400">Ende pa artikuj</p>;
  }

  const total = visible.reduce((sum, i) => sum + (i.line_total ?? 0), 0);

  function getEdit(item: OrderItem) {
    return (
      edits[item.id] ?? {
        quantity: item.quantity_text || String(item.quantity),
        unit_price: item.unit_price_text || String(item.unit_price ?? 0),
      }
    );
  }

  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {visible.map((item) => (
          <li
            key={item.id}
            className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between ${
              item.removed_at ? "opacity-50 line-through" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.description}</p>

              <p className="text-xs text-slate-500">
                ...{item.barcode.slice(-4)} · shtuar nga {item.added_by_name}
              </p>

              {!editable && (
                <p className="mt-1 text-sm text-slate-700">
                  {item.quantity_text || item.quantity} ×{" "}
                  {item.unit_price_text ||
                    formatMoney(item.unit_price ?? 0)}{" "}
                  ={" "}
                  <span className="font-semibold">
                    {formatMoney(item.line_total ?? 0)}
                  </span>
                </p>
              )}
            </div>

            {editable && !item.removed_at && onUpdate && (
              <div className="flex shrink-0 flex-wrap items-end gap-2">
                <div>
                  <label className="text-xs text-slate-500">
                    Sasia
                  </label>

                  <input
                    className="input w-20 text-base"
                    inputMode="text"
                    value={getEdit(item).quantity}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [item.id]: {
                          ...getEdit(item),
                          quantity: e.target.value,
                        },
                      }))
                    }
                    disabled={busy}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500">
                    Çmimi
                  </label>

                  <input
                    className="input w-24 text-base"
                    inputMode="text"
                    value={getEdit(item).unit_price}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [item.id]: {
                          ...getEdit(item),
                          unit_price: e.target.value,
                        },
                      }))
                    }
                    disabled={busy}
                  />
                </div>

                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-sm"
                  disabled={busy}
                  onClick={() => {
                    const edit = getEdit(item);

                    const quantityText = edit.quantity.trim();
                    const quantity = parseQuantity(quantityText);

                    const unitPriceText = edit.unit_price.trim();
                    const unitPrice = Number(
                      unitPriceText.replace(",", ".")
                    );

                    if (
                      isNaN(quantity) ||
                      quantity <= 0 ||
                      isNaN(unitPrice) ||
                      unitPrice < 0
                    ) {
                      alert("Sasia ose çmimi nuk është i vlefshëm.");
                      return;
                    }

                    onUpdate(
                      item.id,
                      quantity,
                      quantityText,
                      unitPrice,
                      unitPriceText
                    );
                  }}
                >
                  Ruaj
                </button>

                {canRemove && (
                  <button
                    type="button"
                    className="btn-danger px-3 py-2 text-sm"
                    onClick={() => onRemove(item.id)}
                    disabled={busy}
                  >
                    Hiq
                  </button>
                )}
              </div>
            )}

            {canRemove && !editable && !item.removed_at && (
              <button
                type="button"
                className="btn-danger shrink-0 px-3 py-1.5 text-sm"
                onClick={() => onRemove(item.id)}
                disabled={busy}
              >
                Hiq
              </button>
            )}
          </li>
        ))}
      </ul>

      {total > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-right font-semibold">
          Totali: {formatMoney(total)}
        </p>
      )}
    </div>
  );
}