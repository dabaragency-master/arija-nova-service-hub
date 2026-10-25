import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, LayoutDashboard, LogOut, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { Logo } from "./Logo";

export function AppShell() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const nav = [
    { to: "/dashboard", label: "Pregled", icon: LayoutDashboard, show: true },
    { to: "/nalozi", label: me.isKlijent ? "Moji nalozi" : "Radni nalozi", icon: ClipboardList, show: true },
    { to: "/klijenti", label: "Klijenti", icon: Users, show: me.isStaff },
    { to: "/korisnici", label: "Korisnici", icon: ShieldCheck, show: me.isAdmin },
  ].filter((n) => n.show) as { to: "/dashboard" | "/nalozi" | "/klijenti" | "/korisnici"; label: string; icon: typeof Users }[];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const roleLabel = me.roles[0] ? ROLE_LABELS[me.roles[0]] : "";

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground md:flex">
        <Logo sub="CRM" className="text-sidebar-primary" />
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "!bg-sidebar-primary !text-sidebar-primary-foreground" }}
            >
              <n.icon className="h-4.5 w-4.5" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border pt-4">
          <div className="truncate text-sm font-semibold">{me.profile?.full_name ?? me.session?.user.email}</div>
          <div className="text-xs opacity-70">{roleLabel}</div>
          <button onClick={signOut} className="mt-3 flex items-center gap-2 text-sm opacity-80 hover:opacity-100">
            <LogOut className="h-4 w-4" /> Odjava
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <Logo className="text-sidebar-primary [&_svg]:h-7 [&_svg]:w-7" />
        <button onClick={signOut} aria-label="Odjava" className="rounded-lg p-2 hover:bg-sidebar-accent">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-10 md:pb-10 md:pt-8">
        {me.ready ? <Outlet /> : <div className="py-20 text-center text-muted-foreground">Učitavanje…</div>}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground"
            activeProps={{ className: "!text-primary" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
