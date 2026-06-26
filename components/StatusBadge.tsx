"use client";

const labels: Record<string, string> = {
  submitted: "Dërguar",
  preparing: "Në përgatitje",
  ready: "Gati",
  cancelled: "Anuluar",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge-${status}`}>{labels[status] ?? status}</span>
  );
}
