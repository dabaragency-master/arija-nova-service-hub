import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { fetchMonters } from "@/lib/queries";
import { ORDER_TYPES, orderNo, type OrderStatus, type OrderType } from "@/lib/labels";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/raspored")({
  head: () => ({ meta: [{ title: "Raspored — Arija Nova CRM" }] }),
  component: Schedule,
});

type Row = { id: string; number: number; title: string; type: OrderType; status: OrderStatus; scheduled_at: string; assigned_to: string | null; clients: { name: string; city: string | null } | null };

function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function Schedule() {
  const me = useMe();
  const [offset, setOffset] = useState(0);
  const from = startOfWeek(new Date());
  from.setDate(from.getDate() + offset * 7);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);

  const q = useQuery({
    queryKey: ["schedule", from.toISOString(), me.userId],
    queryFn: async () => {
      let qq = supabase
        .from("work_orders")
        .select("id, number, title, type, status, scheduled_at, assigned_to, clients(name, city)")
        .gte("scheduled_at", from.toISOString())
        .lt("scheduled_at", to.toISOString())
        .neq("status", "otkazan")
        .order("scheduled_at");
      if (!me.isStaff) qq = qq.eq("assigned_to", me.userId!);
      return ((await qq).data ?? []) as unknown as Row[];
    },
  });
  const monters = useQuery({ queryKey: ["monters"], enabled: me.isStaff, queryFn: fetchMonters });
  const names = Object.fromEntries((monters.data ?? []).map((m) => [m.id, m.full_name || m.email || "—"]));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    return d;
  });
  const todayStr = new Date().toDateString();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={me.isStaff ? "Raspored montera" : "Moj raspored"}
        sub={`${days[0]!.toLocaleDateString("hr-HR")} – ${days[6]!.toLocaleDateString("hr-HR")}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" aria-label="Prethodni tjedan" onClick={() => setOffset(offset - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setOffset(0)}>Ovaj tjedan</Button>
            <Button variant="outline" size="icon" aria-label="Sljedeći tjedan" onClick={() => setOffset(offset + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        }
      />
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const items = (q.data ?? []).filter((o) => new Date(o.scheduled_at).toDateString() === d.toDateString());
          const isToday = d.toDateString() === todayStr;
          return (
            <div key={d.toISOString()} className={"min-h-28 rounded-2xl p-3 shadow-card " + (isToday ? "bg-accent ring-2 ring-primary" : "bg-card")}>
              <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">
                {d.toLocaleDateString("hr-HR", { weekday: "short", day: "2-digit", month: "2-digit" })}
              </div>
              <div className="space-y-2">
                {items.map((o) => (
                  <Link key={o.id} to="/nalozi/$id" params={{ id: o.id }} className="block rounded-lg border bg-background p-2 text-xs hover:ring-1 hover:ring-primary/40">
                    <div className="font-bold text-primary">
                      {new Date(o.scheduled_at).toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" })} · {ORDER_TYPES[o.type]}
                    </div>
                    <div className="truncate font-semibold">{o.clients?.name}</div>
                    <div className="truncate text-muted-foreground">{o.clients?.city ?? o.title}</div>
                    {me.isStaff && <div className="mt-1 truncate">{o.assigned_to ? names[o.assigned_to] ?? "Monter" : "⚠ Nedodijeljen"}</div>}
                    <div className="mt-1 flex items-center justify-between"><span className="text-muted-foreground">{orderNo(o.number)}</span><StatusBadge status={o.status} /></div>
                  </Link>
                ))}
                {!items.length && <div className="text-xs text-muted-foreground">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
