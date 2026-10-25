import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Mail, MapPin, MessageCircle, Navigation, Phone, Plus, ShieldCheck, Snowflake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/labels";
import { CLIENT_TYPES, REFRIGERANTS, isServiceDue, mapsLink, nextServiceDate, serviceDoneUpdate, waLink, warrantyStatus, type ClientType } from "@/lib/crm";
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

const pill = "inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground";

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
  const addr = [c.address, c.city].filter(Boolean).join(", ");

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
      refrigerant: g("refrigerant"), warranty_until: g("warranty_until"),
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["clients", id] });
    setDevOpen(false);
  }
  async function serviceDone(devId: string) {
    const { error } = await supabase.from("devices").update(serviceDoneUpdate(new Date().toISOString().slice(0, 10))).eq("id", devId);
    if (error) { toast.error(error.message); return; }
    toast.success("Servis evidentiran, sljedeći za 12 mjeseci");
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/klijenti" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Klijenti
      </Link>
      <div className="rounded-2xl bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-primary">{CLIENT_TYPES[(c.client_type as ClientType) ?? "privatni"] ?? c.client_type}</div>
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
        <div className="mt-4 flex flex-wrap gap-2">
          {c.phone && <a href={`tel:${c.phone}`} className={pill}><Phone className="h-4 w-4" />{c.phone}</a>}
          {c.phone && <a href={waLink(c.phone)} target="_blank" rel="noreferrer" className={pill}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
          {c.email && <a href={`mailto:${c.email}`} className={pill}><Mail className="h-4 w-4" />{c.email}</a>}
          {addr && <a href={mapsLink(addr)} target="_blank" rel="noreferrer" className={pill}><Navigation className="h-4 w-4" />{addr}</a>}
        </div>
        {(c.floor || c.has_lift != null || c.access_notes) && (
          <div className="mt-4 rounded-lg border p-3 text-sm">
            <div className="mb-1 flex items-center gap-1.5 font-bold"><MapPin className="h-4 w-4" /> Pristup objektu</div>
            <div className="text-muted-foreground">
              {[c.floor && `Kat: ${c.floor}`, c.has_lift != null && (c.has_lift ? "Ima lift" : "Nema lifta")].filter(Boolean).join(" · ")}
            </div>
            {c.access_notes && <p className="mt-1">{c.access_notes}</p>}
          </div>
        )}
        {c.notes && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{c.notes}</p>}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Uređaji</h2>
          <Dialog open={devOpen} onOpenChange={setDevOpen}>
            <DialogTrigger asChild><Button variant="secondary" size="sm"><Plus className="h-4 w-4" /> Uređaj</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                  <div className="space-y-1.5">
                    <Label>Rashladni plin</Label>
                    <select name="refrigerant" className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
                      <option value="">—</option>
                      {REFRIGERANTS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5"><Label>Jamstvo do</Label><Input type="date" name="warranty_until" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Ugrađen</Label><Input type="date" name="installed_at" /></div>
                  <div className="space-y-1.5"><Label>Sljedeći servis</Label><Input type="date" name="next_service_at" /></div>
                </div>
                <p className="text-xs text-muted-foreground">Ako ne upišete sljedeći servis, računa se 12 mjeseci od ugradnje.</p>
                <Button className="w-full font-bold">Spremi</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {q.data!.devices.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {q.data!.devices.map((d) => {
              const next = nextServiceDate(d);
              const due = isServiceDue(next);
              const w = warrantyStatus(d.warranty_until);
              return (
                <div key={d.id} className="flex gap-3 rounded-2xl bg-card p-4 shadow-card">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Snowflake className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-bold">{d.brand} {d.model}</div>
                    <div className="text-muted-foreground">{[d.location, d.serial_number && `SN ${d.serial_number}`, d.refrigerant].filter(Boolean).join(" · ")}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ugrađen {fmtDate(d.installed_at, false)} · Zadnji servis {fmtDate(d.last_service_at, false)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className={due ? "rounded-full bg-warning px-2 py-0.5 text-warning-foreground" : "rounded-full bg-muted px-2 py-0.5"}>
                        Servis {fmtDate(next, false)}
                      </span>
                      {w && (
                        <span className={w === "aktivno" ? "inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-success-foreground" : "rounded-full bg-destructive px-2 py-0.5 text-destructive-foreground"}>
                          <ShieldCheck className="h-3 w-3" /> Jamstvo {w === "aktivno" ? `do ${fmtDate(d.warranty_until, false)}` : "isteklo"}
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 h-8 px-2" onClick={() => serviceDone(d.id)}>
                      <CheckCircle2 className="h-4 w-4" /> Servis obavljen danas
                    </Button>
                  </div>
                </div>
              );
            })}
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
