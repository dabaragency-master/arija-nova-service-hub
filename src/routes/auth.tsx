import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Prijava — Arija Nova CRM" },
      { name: "description", content: "Prijavite se u Arija Nova CRM." },
      { property: "og:title", content: "Prijava — Arija Nova CRM" },
      { property: "og:description", content: "Prijava za djelatnike i klijente Arija Nove." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/dashboard" }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && navigate({ to: "/dashboard" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Pogrešan email ili lozinka.");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else toast.success("Provjerite email i potvrdite registraciju.");
    }
    setBusy(false);
  }

  async function oauth(p: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Prijava nije uspjela.");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden bg-hero text-primary-foreground md:block">
        <div className="dot-grid flex h-full flex-col justify-between p-12">
          <Logo className="text-primary-foreground" sub="CRM" />
          <p className="max-w-sm text-3xl font-extrabold leading-tight">Klima uređaji. Montaža. Servis. Sve na jednom mjestu.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 text-primary md:hidden" />
          <h1 className="text-2xl font-extrabold">{mode === "in" ? "Prijava" : "Registracija"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "in" ? "Dobro došli natrag." : "Klijenti se registriraju emailom s kojim su upisani kod nas."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "up" && (
              <div className="space-y-1.5">
                <Label>Ime i prezime</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Lozinka</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full font-bold" disabled={busy}>
              {mode === "in" ? "Prijavi se" : "Registriraj se"}
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ili <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => oauth("google")}>Nastavi s Google računom</Button>
            <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>
              Continue with Lovable
            </button>
          </div>
          <button className="mt-6 text-sm font-semibold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Nemate račun? Registrirajte se" : "Već imate račun? Prijavite se"}
          </button>
        </div>
      </div>
    </div>
  );
}
