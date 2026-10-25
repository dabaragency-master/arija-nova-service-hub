import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, PenLine, Smartphone, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arija Nova CRM — klijenti, radni nalozi i teren" },
      { name: "description", content: "Poslovni sustav Arija Nova za prodaju, montažu i servis klima uređaja." },
      { property: "og:title", content: "Arija Nova CRM" },
      { property: "og:description", content: "Klijenti, radni nalozi i aplikacija za montere na jednom mjestu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const features = [
    { icon: ClipboardCheck, t: "Radni nalozi", d: "Montaža, servis i reklamacije — od zaprimanja do potpisa." },
    { icon: Users, t: "Baza klijenata", d: "Svi klijenti, uređaji i povijest servisa na jednom mjestu." },
    { icon: Smartphone, t: "Aplikacija za teren", d: "Monteri na mobitelu: fotke, materijal, radni sati." },
    { icon: PenLine, t: "Potpis i PDF", d: "Klijent potpisuje na ekranu, nalog odmah u PDF-u." },
  ];
  return (
    <div className="min-h-screen bg-hero text-primary-foreground">
      <div className="dot-grid min-h-screen">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo className="text-primary-foreground" />
          <Button asChild variant="secondary" className="font-bold">
            <Link to="/auth">Prijava</Link>
          </Button>
        </header>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-28">
          <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-70">Klima uređaji · CRM</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Cijelo poslovanje Arija Nove u jednoj aplikaciji.
          </h1>
          <p className="mt-6 max-w-xl text-lg opacity-80">
            Uredu, prodavačima, monterima na terenu i klijentima — brzo, pregledno i uvijek pri ruci.
          </p>
          <div className="mt-10 flex gap-3">
            <Button asChild size="lg" variant="secondary" className="font-bold">
              <Link to="/auth">Uđi u aplikaciju</Link>
            </Button>
          </div>
          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.t} className="rounded-2xl bg-primary-foreground/10 p-5 ring-1 ring-primary-foreground/15 backdrop-blur">
                <f.icon className="h-7 w-7" />
                <div className="mt-4 text-lg font-bold">{f.t}</div>
                <p className="mt-1 text-sm opacity-75">{f.d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
