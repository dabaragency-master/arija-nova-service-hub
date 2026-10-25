export const ORDER_TYPES = {
  montaza: "Montaža",
  servis: "Servis",
  prodaja: "Prodaja",
  reklamacija: "Reklamacija",
} as const;

export const ORDER_STATUSES = {
  novi: "Novi",
  dodijeljen: "Dodijeljen",
  u_tijeku: "U tijeku",
  zavrsen: "Završen",
  otkazan: "Otkazan",
} as const;

export const ROLE_LABELS = {
  admin: "Administrator",
  prodavac: "Prodavač",
  monter: "Monter",
  klijent: "Klijent",
} as const;

export type OrderStatus = keyof typeof ORDER_STATUSES;
export type OrderType = keyof typeof ORDER_TYPES;

export const STATUS_CLASS: Record<OrderStatus, string> = {
  novi: "bg-secondary text-secondary-foreground",
  dodijeljen: "bg-accent text-accent-foreground ring-1 ring-primary/20",
  u_tijeku: "bg-warning text-warning-foreground",
  zavrsen: "bg-success text-success-foreground",
  otkazan: "bg-muted text-muted-foreground line-through",
};

export function fmtDate(d?: string | null, withTime = true) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function orderNo(n: number) {
  return `RN-${String(n).padStart(5, "0")}`;
}
