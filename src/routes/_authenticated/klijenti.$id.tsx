import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Mail, MapPin, Phone, Plus, Snowflake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/labels";
import { NewOrderDialog } from "@/components/OrderForm";
import { ORDER_SELECT, OrderList, type OrderRow } from "@/components/OrderList";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientFields, formToClient } from "@/components/ClientFields";

export const Route = createFileRoute("/_authenticated/klijenti/$id")({
  head: () => ({ meta: [{ title: "Klijent — Arija Nova CRM" }] }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const q = useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      const [c, d, o] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("devices").select("*").eq("client_id", id).order("created_at"),
        supabase.from("work_orders").select(ORDER_SELECT).eq("client_id", id).order("created_at", { ascending: false }),
      ]);
      return { c: c.data, devices: d.data ?? [], orders: (o.data ?? []) as unknown as OrderRow[] };
    },
  });
  if (q.isLoading) return <div className="text-muted-foreground">Učitavanje…</div>;
  const c = q.data?.c;
  if (!c) return <div>Klijent nije pronađen.</div>;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { error } = await supabase.from("clients").update(formToClient(new FormData(e.currentTarget))).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["clients"] });
    setEditOpen(false);
  }
  async function addDevice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) || "") || null;
    const { error } = await supabase.from("devices").insert({
      client_id: id, brand: g("brand"), model: g("model")!, serial_number: g("serial_number"),
      location: g("location"), installed_at: g("installed_at"), next_service_at: g("next_service_at"),
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["clients", id] });
    setDevOpen(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/klijenti" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Klijenti
      </Link>
      <div className="rounded-2xl bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{c.name}</h1>
            {c.oib && <div className="text-sm text-muted-foreground">OIB {c.oib}</div>}
            {c.user_id && <div className="mt-1 text-xs font-semibold text-success">Ima pristup aplikaciji</div>}
          </div>
          <div className="flex gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild><Button variant="outline">Uredi</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Uredi klijenta</DialogTitle></DialogHeader>
                <form onSubmit={save} className="space-y-3">
                  <ClientFields c={c} />
                  <Button className="w-full font-bold">Spremi</Button>
                </form>
              </DialogContent>
            </Dialog>
            <NewOrderDialog clientId={id} trigger={<Button className="font-bold"><Plus className="h-4 w-4" /> Nalog</Button>} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-primary"><Phone className="h-4 w-4" />{c.phone}</a>}
          {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-primary"><Mail className="h-4 w-4" />{c.email}</a>}
          {(c.address || c.city) && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{[c.address, c.city].filter(Boolean).join(", ")}</span>}
        </div>
        {c.notes && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{c.notes}</p>}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Uređaji</h2>
          <Dialog open={devOpen} onOpenChange={setDevOpen}>
            <DialogTrigger asChild><Button variant="secondary" size="sm"><Plus className="h-4 w-4" /> Uređaj</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novi uređaj</DialogTitle></DialogHeader>
              <form onSubmit={addDevice} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Proizvođač</Label><Input name="brand" placeholder="Mitsubishi Electric" /></div>
                  <div className="space-y-1.5"><Label>Model</Label><Input name="model" required placeholder="MSZ-LN35VG" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Serijski broj</Label><Input name="serial_number" /></div>
                  <div className="space-y-1.5"><Label>Prostorija</Label><Input name="location" placeholder="Dnevni boravak" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Ugrađen</Label><Input type="date" name="installed_at" /></div>
                  <div className="space-y-1.5"><Label>Sljedeći servis</Label><Input type="date" name="next_service_at" /></div>
                </div>
                <Button className="w-full font-bold">Spremi</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {q.data!.devices.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {q.data!.devices.map((d) => (
              <div key={d.id} className="flex gap-3 rounded-2xl bg-card p-4 shadow-card">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Snowflake className="h-5 w-5" /></div>
                <div className="text-sm">
                  <div className="font-bold">{d.brand} {d.model}</div>
                  <div className="text-muted-foreground">{d.location} {d.serial_number && `· SN ${d.serial_number}`}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Ugrađen {fmtDate(d.installed_at, false)} · Servis {fmtDate(d.next_service_at, false)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nema upisanih uređaja.</div>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Radni nalozi</h2>
        <OrderList orders={q.data!.orders} />
      </section>
    </div>
  );
}
