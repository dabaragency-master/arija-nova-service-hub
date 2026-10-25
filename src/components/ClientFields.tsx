import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLIENT_TYPES } from "@/lib/crm";

type C = Record<string, unknown>;

export function ClientFields({ c }: { c?: C }) {
  const v = (k: string) => (c?.[k] as string | null | undefined) ?? "";
  const f = (name: string, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input name={name} type={type} defaultValue={v(name)} required={name === "name"} />
    </div>
  );
  return (
    <>
      {f("name", "Ime / naziv tvrtke")}
      <div className="space-y-1.5">
        <Label>Vrsta klijenta</Label>
        <select name="client_type" defaultValue={v("client_type") || "privatni"} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
          {Object.entries(CLIENT_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">{f("phone", "Telefon")}{f("email", "Email", "email")}</div>
      <div className="grid grid-cols-2 gap-3">{f("address", "Adresa")}{f("city", "Grad")}</div>
      {f("oib", "OIB")}
      <div className="grid grid-cols-2 gap-3">
        {f("floor", "Kat")}
        <div className="space-y-1.5">
          <Label>Lift</Label>
          <select name="has_lift" defaultValue={c?.["has_lift"] == null ? "" : String(c["has_lift"])} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
            <option value="">—</option><option value="true">Ima lift</option><option value="false">Nema lifta</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Pristup vanjskoj jedinici / parking</Label>
        <Textarea name="access_notes" defaultValue={v("access_notes")} rows={2} placeholder="npr. potrebne ljestve 4 m, parking u dvorištu" />
      </div>
      <div className="space-y-1.5">
        <Label>Napomena</Label>
        <Textarea name="notes" defaultValue={v("notes")} rows={2} />
      </div>
    </>
  );
}

export function formToClient(fd: FormData) {
  const g = (k: string) => String(fd.get(k) || "").trim() || null;
  const lift = g("has_lift");
  return {
    name: g("name")!, phone: g("phone"), email: g("email"), address: g("address"), city: g("city"), oib: g("oib"), notes: g("notes"),
    client_type: g("client_type") ?? "privatni", floor: g("floor"), access_notes: g("access_notes"),
    has_lift: lift == null ? null : lift === "true",
  };
}
