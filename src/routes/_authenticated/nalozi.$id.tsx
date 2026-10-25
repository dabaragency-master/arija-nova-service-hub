import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Camera, FileDown, MapPin, Phone, Play, CheckCircle2, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { fetchMonters } from "@/lib/queries";
import { ORDER_STATUSES, ORDER_TYPES, fmtDate, orderNo, type OrderStatus } from "@/lib/labels";
import { downloadOrderPdf } from "@/lib/pdf";
import { StatusBadge } from "@/components/StatusBadge";
import { SignaturePad } from "@/components/SignaturePad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/nalozi/$id")({
  head: () => ({ meta: [{ title: "Radni nalog — Arija Nova CRM" }] }),
  component: OrderDetail,
});

const sel = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm";

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OrderDetail() {
  const { id } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const key = ["orders", "detail", id];

  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: o, error } = await supabase
        .from("work_orders")
        .select("*, clients(id, name, phone, email, address, city, oib)")
        .eq("id", id)
        .single();
      if (error) throw error;
      const [{ data: materials }, { data: photos }] = await Promise.all([
        supabase.from("work_order_materials").select("*").eq("work_order_id", id).order("created_at"),
        supabase.from("work_order_photos").select("*").eq("work_order_id", id).order("created_at"),
      ]);
      const urls = photos?.length
        ? (await supabase.storage.from("order-photos").createSignedUrls(photos.map((p) => p.path), 3600)).data ?? []
        : [];
      let monter: string | null = null;
      if (o.assigned_to) {
        const { data: p } = await supabase.from("profiles").select("full_name, email").eq("id", o.assigned_to).maybeSingle();
        monter = p?.full_name || p?.email || null;
      }
      return {
        o,
        materials: materials ?? [],
        photos: (photos ?? []).map((p, i) => ({ ...p, url: urls[i]?.signedUrl })),
        monter,
      };
    },
  });
  const monters = useQuery({ queryKey: ["monters"], enabled: me.isStaff, queryFn: fetchMonters });

  const [workDone, setWorkDone] = useState("");
  const [hours, setHours] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [mat, setMat] = useState({ name: "", quantity: "1", unit: "kom" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (q.data) {
      setWorkDone(q.data.o.work_done ?? "");
      setHours(q.data.o.hours?.toString() ?? "");
      setSignedBy(q.data.o.signed_by ?? q.data.o.clients?.name ?? "");
    }
  }, [q.data]);

  if (q.isLoading) return <div className="text-muted-foreground">Učitavanje…</div>;
  if (q.error || !q.data) return <div>Nalog nije pronađen.</div>;
  const { o, materials, photos, monter } = q.data;
  const canEdit = me.isStaff || o.assigned_to === me.userId;
  const refresh = () => qc.invalidateQueries({ queryKey: ["orders"] });

  async function update(patch: Record<string, unknown>, msg?: string) {
    const { error } = await supabase.from("work_orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    if (msg) toast.success(msg);
    refresh();
  }

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!mat.name) return;
    const { error } = await supabase
      .from("work_order_materials")
      .insert({ work_order_id: id, name: mat.name, quantity: Number(mat.quantity) || 1, unit: mat.unit });
    if (error) return toast.error(error.message);
    setMat({ name: "", quantity: "1", unit: "kom" });
    refresh();
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      const path = `${id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.]/g, "_")}`;
      const up = await supabase.storage.from("order-photos").upload(path, f);
      if (up.error) {
        toast.error(up.error.message);
        continue;
      }
      await supabase.from("work_order_photos").insert({ work_order_id: id, path });
    }
    setUploading(false);
    refresh();
  }

  function pdf() {
    downloadOrderPdf({
      ...o,
      hours: o.hours != null ? Number(o.hours) : null,
      client: o.clients,
      monter,
      materials: materials.map((m) => ({ ...m, quantity: Number(m.quantity) })),
    });
  }

  const addr = o.address || [o.clients?.address, o.clients?.city].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/nalozi" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Nalozi
      </Link>

      <div className="rounded-2xl bg-hero p-6 text-primary-foreground shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold opacity-75">{orderNo(o.number)} · {ORDER_TYPES[o.type]}</div>
            <h1 className="mt-1 text-2xl font-extrabold">{o.title}</h1>
            <div className="mt-1 opacity-85">{o.clients?.name}</div>
          </div>
          <StatusBadge status={o.status} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {addr && (
            <a className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(addr)}`}>
              <MapPin className="h-4 w-4" /> {addr}
            </a>
          )}
          {o.clients?.phone && (
            <a className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold" href={`tel:${o.clients.phone}`}>
              <Phone className="h-4 w-4" /> {o.clients.phone}
            </a>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div><span className="opacity-70">Termin:</span> {fmtDate(o.scheduled_at)}</div>
          <div><span className="opacity-70">Monter:</span> {monter ?? "—"}</div>
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {["novi", "dodijeljen"].includes(o.status) && (
            <Button onClick={() => update({ status: "u_tijeku" }, "Rad započet")} className="font-bold"><Play className="h-4 w-4" /> Započni rad</Button>
          )}
          {o.status === "u_tijeku" && (
            <Button
              onClick={() => update({ status: "zavrsen", completed_at: new Date().toISOString(), work_done: workDone, hours: hours ? Number(hours) : null }, "Nalog završen")}
              className="bg-success font-bold text-success-foreground hover:bg-success/90"
            >
              <CheckCircle2 className="h-4 w-4" /> Završi nalog
            </Button>
          )}
          <Button variant="outline" onClick={pdf}><FileDown className="h-4 w-4" /> PDF nalog</Button>
        </div>
      )}
      {!canEdit && o.status === "zavrsen" && (
        <Button variant="outline" onClick={pdf}><FileDown className="h-4 w-4" /> Preuzmi PDF</Button>
      )}

      {me.isStaff && (
        <Card title="Upravljanje">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Monter</Label>
              <select
                className={sel}
                value={o.assigned_to ?? ""}
                onChange={(e) => update({ assigned_to: e.target.value || null, ...(o.status === "novi" && e.target.value ? { status: "dodijeljen" } : {}) }, "Monter dodijeljen")}
              >
                <option value="">— nije dodijeljen —</option>
                {monters.data?.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select className={sel} value={o.status} onChange={(e) => update({ status: e.target.value as OrderStatus }, "Status ažuriran")}>
                {Object.entries(ORDER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </Card>
      )}

      {o.description && (
        <Card title="Opis">
          <p className="whitespace-pre-wrap text-sm">{o.description}</p>
        </Card>
      )}

      <Card title="Izvršeni rad">
        {canEdit ? (
          <div className="space-y-3">
            <Textarea rows={4} value={workDone} onChange={(e) => setWorkDone(e.target.value)} placeholder="Što je napravljeno…" />
            <div className="flex items-end gap-3">
              <div className="w-32 space-y-1.5">
                <Label>Radni sati</Label>
                <Input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={() => update({ work_done: workDone, hours: hours ? Number(hours) : null }, "Spremljeno")}>Spremi</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            <p className="whitespace-pre-wrap">{o.work_done || "—"}</p>
            {o.hours != null && <p className="mt-2 text-muted-foreground">Radni sati: {o.hours} h</p>}
          </div>
        )}
      </Card>

      <Card title="Utrošeni materijal">
        {materials.length ? (
          <ul className="divide-y">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span>{m.name}</span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold">{Number(m.quantity)} {m.unit}</span>
                  {canEdit && (
                    <button aria-label="Ukloni" onClick={async () => { await supabase.from("work_order_materials").delete().eq("id", m.id); refresh(); }}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Nema upisanog materijala.</p>}
        {canEdit && (
          <form onSubmit={addMaterial} className="mt-3 flex gap-2">
            <Input className="flex-1" placeholder="npr. Bakrena cijev 1/4" value={mat.name} onChange={(e) => setMat({ ...mat, name: e.target.value })} />
            <Input className="w-20" type="number" step="0.01" value={mat.quantity} onChange={(e) => setMat({ ...mat, quantity: e.target.value })} />
            <select className={sel + " w-20"} value={mat.unit} onChange={(e) => setMat({ ...mat, unit: e.target.value })}>
              {["kom", "m", "kg", "l", "set"].map((u) => <option key={u}>{u}</option>)}
            </select>
            <Button size="icon" aria-label="Dodaj"><Plus className="h-4 w-4" /></Button>
          </form>
        )}
      </Card>

      <Card
        title="Fotografije"
        action={canEdit && (
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground">
            <Camera className="h-4 w-4" /> {uploading ? "Učitavam…" : "Dodaj"}
            <input type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => upload(e.target.files)} />
          </label>
        )}
      >
        {photos.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg bg-muted">
                {p.url && <img src={p.url} alt="Fotografija s terena" loading="lazy" className="h-full w-full object-cover" />}
              </a>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">Nema fotografija.</p>}
      </Card>

      <Card title="Potpis klijenta">
        {o.signature ? (
          <div>
            <img src={o.signature} alt="Potpis klijenta" className="h-32 rounded-lg border bg-card" />
            <p className="mt-2 text-sm text-muted-foreground">{o.signed_by}</p>
            {canEdit && <Button variant="ghost" size="sm" className="mt-1" onClick={() => update({ signature: null, signed_by: null })}>Ponovi potpis</Button>}
          </div>
        ) : canEdit ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Ime potpisnika</Label>
              <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
            </div>
            <SignaturePad onSave={(sig) => update({ signature: sig, signed_by: signedBy }, "Potpis spremljen")} />
          </div>
        ) : <p className="text-sm text-muted-foreground">Još nije potpisano.</p>}
      </Card>
    </div>
  );
}
