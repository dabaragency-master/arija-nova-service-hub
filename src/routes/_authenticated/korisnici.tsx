import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, type AppRole } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/korisnici")({
  head: () => ({ meta: [{ title: "Korisnici — Arija Nova CRM" }] }),
  component: Users,
});

function Users() {
  const me = useMe();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["users"],
    enabled: me.isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({ ...p, role: (roles?.find((r) => r.user_id === p.id)?.role ?? "klijent") as AppRole }));
    },
  });

  if (!me.isAdmin) return <div>Samo administrator ima pristup.</div>;

  async function setRole(userId: string, role: AppRole) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Uloga promijenjena");
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Korisnici" sub="Novi korisnici dobivaju ulogu klijenta. Ovdje im dodijelite ulogu monterа, prodavača ili administratora." />
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        {q.data?.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 last:border-0">
            <div className="min-w-0">
              <div className="truncate font-bold">{u.full_name || "—"}</div>
              <div className="truncate text-sm text-muted-foreground">{u.email}</div>
            </div>
            <select
              disabled={u.id === me.userId}
              value={u.role}
              onChange={(e) => setRole(u.id, e.target.value as AppRole)}
              className="h-9 rounded-md border border-input bg-card px-3 text-sm font-semibold"
            >
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
