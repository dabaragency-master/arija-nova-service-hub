import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Phone, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { fmtDate } from "@/lib/labels";
import { daysUntil, waLink } from "@/lib/crm";
import { fetchDueDevices } from "@/lib/queries";
import { PageHeader } from "@/components/AppShell";
import { NewOrderDialog } from "@/components/OrderForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/servisi")({
  head: () => ({ meta: [{ title: "Godišnji servisi — Arija Nova CRM" }] }),
  component: Services,
});

function Services() {
  const me = useMe();
  const q = useQuery({ queryKey: ["due-devices"], queryFn: fetchDueDevices });
  const list = q.data ?? [];
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Godišnji servisi" sub="Uređaji kojima je servis istekao ili dolazi u sljedećih 30 dana. Redovni servis čuva jamstvo." />
      {q.isLoading ? <div className="text-muted-foreground">Učitavanje…</div> : !list.length ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Nema uređaja za servis u sljedećih 30 dana.</div>
      ) : (
        <div className="grid gap-3">
          {list.map((d) => {
            const days = daysUntil(d.next!);
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-card">
                <div className="min-w-0">
                  <Link to="/klijenti/$id" params={{ id: d.client_id }} className="font-bold hover:text-primary">{d.clients?.name}</Link>
                  <div className="text-sm text-muted-foreground">{[d.brand, d.model, d.location, d.clients?.city].filter(Boolean).join(" · ")}</div>
                  <div className={"mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold " + (days < 0 ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground")}>
                    {days < 0 ? `Kasni ${-days} dana` : days === 0 ? "Danas" : `Za ${days} dana`} · {fmtDate(d.next, false)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {d.clients?.phone && (
                    <>
                      <Button asChild variant="outline" size="icon" aria-label="Nazovi"><a href={`tel:${d.clients.phone}`}><Phone className="h-4 w-4" /></a></Button>
                      <Button asChild variant="outline" size="icon" aria-label="WhatsApp">
                        <a target="_blank" rel="noreferrer" href={waLink(d.clients.phone, `Poštovani, ovdje Arija Nova. Vrijeme je za redovni godišnji servis Vašeg klima uređaja (${[d.brand, d.model].filter(Boolean).join(" ")}). Kada Vam odgovara termin?`)}>
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  )}
                  {me.isStaff && <NewOrderDialog clientId={d.client_id} trigger={<Button className="font-bold"><Plus className="h-4 w-4" /> Nalog</Button>} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
