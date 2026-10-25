import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/klijenti/")({
  head: () => ({ meta: [{ title: "Klijenti — Arija Nova CRM" }] }),
  component: Clients,
});

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
        <Textarea name="notes" defaultValue={c?.notes ?? ""} rows={2} />
      </div>
    </>
  );
}

export function formToClient(fd: FormData) {
  const g = (k: string) => String(fd.get(k) || "").trim() || null;
  return { name: g("name")!, phone: g("phone"), email: g("email"), address: g("address"), city: g("city"), oib: g("oib"), notes: g("notes") };
}

function Clients() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await supabase.from("clients").select("*").order("name")).data ?? [],
  });
  const term = q.toLowerCase();
  const list = (clients.data ?? []).filter((c) =>
    [c.name, c.phone, c.email, c.city, c.address].some((x) => x?.toLowerCase().includes(term)),
  );

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { error } = await supabase.from("clients").insert(formToClient(new FormData(e.currentTarget)));
    if (error) return toast.error(error.message);
    toast.success("Klijent dodan");
    qc.invalidateQueries({ queryKey: ["clients"] });
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Klijenti"
        sub={`${clients.data?.length ?? 0} u bazi`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="font-bold"><Plus className="h-4 w-4" /> Novi klijent</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novi klijent</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <ClientFields />
                <Button className="w-full font-bold">Spremi</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="bg-card pl-9" placeholder="Traži klijenta…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        {list.length === 0 && <div className="p-10 text-center text-muted-foreground">Nema klijenata.</div>}
        {list.map((c) => (
          <Link key={c.id} to="/klijenti/$id" params={{ id: c.id }} className="flex items-center justify-between gap-3 border-b px-5 py-3.5 last:border-0 hover:bg-accent">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary font-bold text-secondary-foreground">
                {c.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold">{c.name}</div>
                <div className="truncate text-sm text-muted-foreground">{[c.address, c.city].filter(Boolean).join(", ") || c.email}</div>
              </div>
            </div>
            <div className="hidden text-sm text-muted-foreground sm:block">{c.phone}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
