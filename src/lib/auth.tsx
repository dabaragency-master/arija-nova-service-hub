import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "prodavac" | "monter" | "klijent";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

export function useMe() {
  const { session, ready } = useSession();
  const uid = session?.user.id;
  const q = useQuery({
    queryKey: ["me", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid!),
        supabase.from("profiles").select("*").eq("id", uid!).maybeSingle(),
      ]);
      return { roles: (roles ?? []).map((r) => r.role as AppRole), profile };
    },
  });
  const roles = q.data?.roles ?? [];
  const has = (...r: AppRole[]) => roles.some((x) => r.includes(x));
  return {
    ready: ready && (!uid || !q.isLoading),
    session,
    userId: uid,
    profile: q.data?.profile,
    roles,
    has,
    isAdmin: has("admin"),
    isStaff: has("admin", "prodavac"),
    isMonter: has("monter"),
    isInternal: has("admin", "prodavac", "monter"),
    isKlijent: !has("admin", "prodavac", "monter"),
  };
}
