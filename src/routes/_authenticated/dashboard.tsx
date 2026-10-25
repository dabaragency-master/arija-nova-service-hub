import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { fetchMonters } from "@/lib/queries";
import { fetchDueDevices } from "./servisi";
import { PageHeader } from "@/components/AppShell";
import { NewOrderDialog } from "@/components/OrderForm";
import { ORDER_SELECT, OrderList, type OrderRow } from "@/components/OrderList";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Pregled — Arija Nova CRM" }] }),
  component: Dashboard,
});

type DashRow = OrderRow & { assigned_to: string | null; completed_at: string | null; hours: number | null };

function Dashboard() {
  const me = useMe();
  const orders = useQuery({
    queryKey: ["orders", "all", me.userId],
    queryFn: async () => {
      let q = supabase.from("work_orders").select(ORDER_SELECT + ", completed_at, hours").order("scheduled_at", { ascending: true, nullsFirst: false });
      if (me.isMonter && !me.isStaff) q = q.eq("assigned_to", me.userId!);
      return ((await q).data ?? []) as unknown as DashRow[];
    },
  });
  const clientsCount = useQuery({
    queryKey: ["clients-count"],
    enabled: me.isStaff,
    queryFn: async () => (await supabase.from("clients").select("id", { count: "exact", head: true })).count ?? 0,
  });
  const due = useQuery({ queryKey: ["due-devices"], enabled: me.isStaff, queryFn: fetchDueDevices });
  const monters = useQuery({ queryKey: ["monters"], enabled: me.isStaff, queryFn: fetchMonters });

  const all = orders.data ?? [];
  const open = all.filter((o) => !["zavrsen", "otkazan"].includes(o.status));
  const today = new Date().toDateString();
  const todays = open.filter((o) => o.scheduled_at && new Date(o.scheduled_at).toDateString() === today);
  const name = me.profile?.full_name?.split(" ")[0] ?? "";
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const perMonter = (monters.data ?? []).map((m) => {
    const mine = all.filter((o) => o.assigned_to === m.id);
    const doneMonth = mine.filter((o) => o.status === "zavrsen" && (o.completed_at ?? "") >= monthStart);
    return {
      id: m.id,
      name: m.full_name || m.email || "—",
      open: mine.filter((o) => !["zavrsen", "otkazan"].includes(o.status)).length,
      montaze: doneMonth.filter((o) => o.type === "montaza").length,
      servisi: doneMonth.filter((o) => o.type === "servis").length,
      hours: doneMonth.reduce((s, o) => s + Number(o.hours ?? 0), 0),
    };
  });

  const stats = me.isStaff
    ? [
        { l: "Otvoreni nalozi", v: open.length },
        { l: "Danas na terenu", v: todays.length },
        { l: "Nedodijeljeni", v: all.filter((o) => o.status === "novi").length },
        { l: "Klijenata", v: clientsCount.data ?? 0 },
      ]
    : [
        { l: "Otvoreni", v: open.length },
        { l: "Danas", v: todays.length },
        { l: "Završeni", v: all.filter((o) => o.status === "zavrsen").length },
      ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Pozdrav${name ? ", " + name : ""}`}
        sub={me.isKlijent ? "Pregled vaših servisa i montaža." : me.isMonter && !me.isStaff ? "Vaši današnji i nadolazeći nalozi." : "Stanje poslovanja danas."}
        action={me.isStaff && <NewOrderDialog trigger={<Button className="font-bold"><Plus className="h-4 w-4" /> Novi nalog</Button>} />}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.l} className={i === 0 ? "rounded-2xl bg-hero p-5 text-primary-foreground shadow-card" : "rounded-2xl bg-card p-5 shadow-card"}>
            <div className="text-3xl font-extrabold">{s.v}</div>
            <div className="mt-1 text-sm font-semibold opacity-75">{s.l}</div>
          </div>
        ))}
      </div>
      {me.isStaff && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link to="/servisi" className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-card hover:ring-1 hover:ring-primary/30">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-warning text-warning-foreground"><Wrench className="h-6 w-6" /></div>
            <div>
              <div className="text-3xl font-extrabold">{due.data?.length ?? 0}</div>
              <div className="text-sm font-semibold text-muted-foreground">uređaja za godišnji servis</div>
            </div>
          </Link>
          <div className="rounded-2xl bg-card p-5 shadow-card md:col-span-2">
            <div className="mb-3 font-bold">Monteri — ovaj mjesec</div>
            {perMonter.length ? (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="pb-2">Monter</th><th>Otvoreno</th><th>Montaže</th><th>Servisi</th><th>Sati</th></tr>
                </thead>
                <tbody>
                  {perMonter.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="py-2 font-semibold">{m.name}</td><td>{m.open}</td><td>{m.montaze}</td><td>{m.servisi}</td><td>{m.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground">Još nema montera. Dodijelite ulogu u izborniku Korisnici.</p>}
          </div>
        </div>
      )}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold">{me.isKlijent ? "Vaši nalozi" : "Nadolazeći nalozi"}</h2>
        <Link to="/nalozi" className="text-sm font-semibold text-primary">Svi nalozi →</Link>
      </div>
      <div className="mt-3">
        <OrderList orders={(me.isKlijent ? all : open).slice(0, 8)} empty={me.isKlijent ? "Još nemate radnih naloga." : "Nema otvorenih naloga."} />
      </div>
    </div>
  );
}
