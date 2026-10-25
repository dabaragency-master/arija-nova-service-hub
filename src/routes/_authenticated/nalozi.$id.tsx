import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Camera, FileDown, MapPin, Phone, Play, CheckCircle2, Trash2, Plus, MessageCircle, Mic } from "lucide-react";
import { PHOTO_CATEGORIES, defaultChecklist, mapsLink, serviceDoneUpdate, waLink, type ChecklistItem, type PhotoCategory } from "@/lib/crm";
import type { TablesUpdate } from "@/integrations/supabase/types";
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
  const catalog = useQuery({
    queryKey: ["materials-catalog"],
    enabled: me.isInternal,
    queryFn: async () => (await supabase.from("materials_catalog").select("*").order("name")).data ?? [],
  });

  const [workDone, setWorkDone] = useState("");
  const [hours, setHours] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [mat, setMat] = useState({ name: "", quantity: "1", unit: "kom" });
  const [uploading, setUploading] = useState(false);
  const [photoCat, setPhotoCat] = useState<PhotoCategory>("prije");
  const [listening, setListening] = useState(false);

  function dictate() {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) { toast.error("Diktiranje nije podržano u ovom pregledniku."); return; }
    const r = new SR();
    r.lang = "hr-HR";
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setWorkDone((w) => (w ? w + " " : "") + text);
    };
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  }

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
  const saved = (o.checklist as unknown as ChecklistItem[] | null) ?? [];
  const checklist = saved.length ? saved : defaultChecklist(o.type);

  async function toggleCheck(i: number) {
    const next = checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c));
    await update({ checklist: next as unknown as TablesUpdate<"work_orders">["checklist"] });
  }

  async function finish() {
    await update({ status: "zavrsen", completed_at: new Date().toISOString(), work_done: workDone, hours: hours ? Number(hours) : null }, "Nalog završen");
    if (o.device_id && (o.type === "servis" || o.type === "montaza")) {
      await supabase.from("devices").update(serviceDoneUpdate(new Date().toISOString().slice(0, 10))).eq("id", o.device_id);
    }
  }

  async function update(patch: TablesUpdate<"work_orders">, msg?: string) {
    const { error } = await supabase.from("work_orders").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (msg) toast.success(msg);
    refresh();
  }

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!mat.name) return;
    const { error } = await supabase
      .from("work_order_materials")
      .insert({ work_order_id: id, name: mat.name, quantity: Number(mat.quantity) || 1, unit: mat.unit });
    if (error) { toast.error(error.message); return; }
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
      await supabase.from("work_order_photos").insert({ work_order_id: id, path, category: photoCat });
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
      checklist,
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
            <a className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold" target="_blank" rel="noreferrer" href={mapsLink(addr)}>
              <MapPin className="h-4 w-4" /> Navigacija: {addr}
            </a>
          )}
          {o.clients?.phone && (
            <a className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold" href={`tel:${o.clients.phone}`}>
              <Phone className="h-4 w-4" /> {o.clients.phone}
            </a>
          )}
          {o.clients?.phone && canEdit && (
            <a
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold"
              target="_blank" rel="noreferrer"
              href={waLink(o.clients.phone, `Poštovani, ovdje Arija Nova. Monter je na putu i stiže za otprilike 20 minuta (nalog ${orderNo(o.number)}).`)}
            >
              <MessageCircle className="h-4 w-4" /> Javi „na putu”
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
              onClick={finish}
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

      {checklist.length > 0 && (
        <Card title={`Kontrolna lista (${checklist.filter((c) => c.done).length}/${checklist.length})`}>
          <ul className="space-y-1">
            {checklist.map((c, i) => (
              <li key={c.label}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted">
                  <input type="checkbox" className="h-5 w-5 accent-primary" checked={c.done} disabled={!canEdit} onChange={() => toggleCheck(i)} />
                  <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title="Izvršeni rad"
        action={canEdit && (
          <Button variant="secondary" size="sm" onClick={dictate} disabled={listening}>
            <Mic className="h-4 w-4" /> {listening ? "Slušam…" : "Diktiraj"}
          </Button>
        )}
      >
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
          <div className="mt-3 space-y-2">
            {!!catalog.data?.length && (
              <select
                className={sel}
                value=""
                onChange={(e) => {
                  const c = catalog.data?.find((x) => x.id === e.target.value);
                  if (c) setMat({ ...mat, name: c.name, unit: c.unit });
                }}
              >
                <option value="">Odaberi iz šifarnika…</option>
                {catalog.data.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>)}
              </select>
            )}
            <form onSubmit={addMaterial} className="flex gap-2">
              <Input className="flex-1" placeholder="ili upiši ručno" value={mat.name} onChange={(e) => setMat({ ...mat, name: e.target.value })} />
              <Input className="w-20" type="number" step="0.01" value={mat.quantity} onChange={(e) => setMat({ ...mat, quantity: e.target.value })} />
              <select className={sel + " w-20"} value={mat.unit} onChange={(e) => setMat({ ...mat, unit: e.target.value })}>
                {["kom", "m", "kg", "l", "set"].map((u) => <option key={u}>{u}</option>)}
              </select>
              <Button size="icon" aria-label="Dodaj"><Plus className="h-4 w-4" /></Button>
            </form>
          </div>
        )}
      </Card>

      <Card
        title="Fotografije"
        action={canEdit && (
          <div className="flex items-center gap-2">
            <select aria-label="Vrsta fotografije" className="h-8 rounded-md border border-input bg-card px-2 text-sm" value={photoCat} onChange={(e) => setPhotoCat(e.target.value as PhotoCategory)}>
              {Object.entries(PHOTO_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground">
              <Camera className="h-4 w-4" /> {uploading ? "Učitavam…" : "Dodaj"}
              <input type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => upload(e.target.files)} />
            </label>
          </div>
        )}
      >
        {photos.length ? (
          <div className="space-y-4">
            {(Object.keys(PHOTO_CATEGORIES) as PhotoCategory[]).map((cat) => {
              const list = photos.filter((p) => (p.category ?? "ostalo") === cat);
              if (!list.length) return null;
              return (
                <div key={cat}>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{PHOTO_CATEGORIES[cat]}</div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {list.map((p) => (
                      <a key={p.id} href={p.url ?? undefined} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg bg-muted">
                        {p.url && <img src={p.url} alt={PHOTO_CATEGORIES[cat]} loading="lazy" className="h-full w-full object-cover" />}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
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
