import { supabase } from "@/integrations/supabase/client";
import { isServiceDue, nextServiceDate } from "@/lib/crm";

export async function fetchMonters() {
  const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "monter");
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return [];
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  return data ?? [];
}

export async function fetchProfilesMap(ids: (string | null)[]) {
  const clean = [...new Set(ids.filter(Boolean))] as string[];
  if (!clean.length) return {} as Record<string, string>;
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", clean);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name || p.email || "—"])) as Record<string, string>;
}

export async function fetchDueDevices() {
  const { data } = await supabase.from("devices").select("*, clients(id, name, phone, city)");
  return (data ?? [])
    .map((d) => ({ ...d, next: nextServiceDate(d) }))
    .filter((d) => isServiceDue(d.next))
    .sort((a, b) => (a.next! < b.next! ? -1 : 1));
}

