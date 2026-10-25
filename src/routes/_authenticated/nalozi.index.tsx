import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/labels";
import { PageHeader } from "@/components/AppShell";
import { NewOrderDialog } from "@/components/OrderForm";
import { ORDER_SELECT, OrderList, type OrderRow } from "@/components/OrderList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/nalozi/")({
  head: () => ({ meta: [{ title: "Radni nalozi — Arija Nova CRM" }] }),
  component: Orders,
});

function Orders() {
  const me = useMe();
  const [status, setStatus] = useState<OrderStatus | "sve">("sve");
  const [q, setQ] = useState("");
  const orders = useQuery({
    queryKey: ["orders", "list", me.userId],
    queryFn: async () => {
      let qq = supabase.from("work_orders").select(ORDER_SELECT).order("created_at", { ascending: false });
      if (me.isMonter && !me.isStaff) qq = qq.eq("assigned_to", me.userId!);
      return ((await qq).data ?? []) as unknown as OrderRow[];
    },
  });
  const term = q.toLowerCase();
  const list = (orders.data ?? []).filter(
    (o) =>
      (status === "sve" || o.status === status) &&
      (!term || o.title.toLowerCase().includes(term) || o.clients?.name.toLowerCase().includes(term) || String(o.number).includes(term)),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={me.isKlijent ? "Moji nalozi" : "Radni nalozi"}
        action={me.isStaff && <NewOrderDialog trigger={<Button className="font-bold"><Plus className="h-4 w-4" /> Novi nalog</Button>} />}
      />
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="bg-card pl-9" placeholder="Traži po klijentu, naslovu ili broju…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(["sve", ...Object.keys(ORDER_STATUSES)] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s as OrderStatus | "sve")}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold",
              status === s ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground shadow-card",
            )}
          >
            {s === "sve" ? "Svi" : ORDER_STATUSES[s as OrderStatus]}
          </button>
        ))}
      </div>
      {orders.isLoading ? <div className="text-muted-foreground">Učitavanje…</div> : <OrderList orders={list} />}
    </div>
  );
}
