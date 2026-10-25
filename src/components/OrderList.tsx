import { Link } from "@tanstack/react-router";
import { CalendarClock, MapPin } from "lucide-react";
import { ORDER_TYPES, fmtDate, orderNo, type OrderStatus, type OrderType } from "@/lib/labels";
import { StatusBadge } from "./StatusBadge";

export type OrderRow = {
  id: string;
  number: number;
  title: string;
  type: OrderType;
  status: OrderStatus;
  scheduled_at: string | null;
  address: string | null;
  clients: { name: string } | null;
};

export function OrderList({ orders, empty = "Nema naloga." }: { orders: OrderRow[]; empty?: string }) {
  if (!orders.length) return <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">{empty}</div>;
  return (
    <div className="grid gap-3">
      {orders.map((o) => (
        <Link
          key={o.id}
          to="/nalozi/$id"
          params={{ id: o.id }}
          className="block rounded-2xl bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-primary">{orderNo(o.number)} · {ORDER_TYPES[o.type]}</div>
              <div className="mt-0.5 truncate font-bold">{o.title}</div>
              <div className="text-sm text-muted-foreground">{o.clients?.name}</div>
            </div>
            <StatusBadge status={o.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{fmtDate(o.scheduled_at)}</span>
            {o.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{o.address}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}

export const ORDER_SELECT = "id, number, title, type, status, scheduled_at, address, assigned_to, clients(name)";
