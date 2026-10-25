import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClientFields({ c }: { c?: Record<string, string | null> }) {
  const f = (name: string, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input name={name} type={type} defaultValue={c?.[name] ?? ""} required={name === "name"} />
    </div>
  );
  return (
    <>
      {f("name", "Ime / naziv tvrtke")}
      <div className="grid grid-cols-2 gap-3">{f("phone", "Telefon")}{f("email", "Email", "email")}</div>
      <div className="grid grid-cols-2 gap-3">{f("address", "Adresa")}{f("city", "Grad")}</div>
      {f("oib", "OIB")}
      <div className="space-y-1.5">
        <Label>Napomena</Label>
        <Textarea name="notes" defaultValue={c?.["notes"] ?? ""} rows={2} />
      </div>
    </>
  );
}

export function formToClient(fd: FormData) {
  const g = (k: string) => String(fd.get(k) || "").trim() || null;
  return { name: g("name")!, phone: g("phone"), email: g("email"), address: g("address"), city: g("city"), oib: g("oib"), notes: g("notes") };
}

