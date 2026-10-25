import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMonters } from "@/lib/queries";
import { ORDER_TYPES, type OrderType } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const sel = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm";

export function NewOrderDialog({ clientId, trigger }: { clientId?: string; trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const clients = useQuery({
    queryKey: ["clients-min"],
    enabled: open,
    queryFn: async () => (await supabase.from("clients").select("id, name, address, city").order("name")).data ?? [],
  });
  const monters = useQuery({ queryKey: ["monters"], enabled: open, queryFn: fetchMonters });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const client_id = String(f.get("client_id"));
    const assigned_to = String(f.get("assigned_to") || "") || null;
    const c = clients.data?.find((x) => x.id === client_id);
    const scheduled = String(f.get("scheduled_at") || "");
    const { error } = await supabase.from("work_orders").insert({
      client_id,
      type: f.get("type") as OrderType,
      title: String(f.get("title")),
      description: String(f.get("description") || "") || null,
      address: String(f.get("address") || "") || [c?.address, c?.city].filter(Boolean).join(", ") || null,
      scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
      assigned_to,
      status: assigned_to ? "dodijeljen" : "novi",
    });
    if (error) return toast.error(error.message);
    toast.success("Radni nalog kreiran");
    qc.invalidateQueries({ queryKey: ["orders"] });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novi radni nalog</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Klijent</Label>
            <select name="client_id" required defaultValue={clientId ?? ""} className={sel}>
              <option value="" disabled>Odaberite klijenta…</option>
              {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vrsta</Label>
              <select name="type" className={sel} defaultValue="montaza">
                {Object.entries(ORDER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Termin</Label>
              <Input type="datetime-local" name="scheduled_at" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Naslov</Label>
            <Input name="title" required placeholder="npr. Montaža Mitsubishi MSZ-LN 3,5 kW" />
          </div>
          <div className="space-y-1.5">
            <Label>Opis</Label>
            <Textarea name="description" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Adresa radova (prazno = adresa klijenta)</Label>
            <Input name="address" />
          </div>
          <div className="space-y-1.5">
            <Label>Monter</Label>
            <select name="assigned_to" className={sel} defaultValue="">
              <option value="">— nije dodijeljen —</option>
              {monters.data?.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
            </select>
          </div>
          <Button className="w-full font-bold">Kreiraj nalog</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
