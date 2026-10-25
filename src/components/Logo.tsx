import { cn } from "@/lib/utils";

export function Logo({ className, sub }: { className?: string; sub?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden>
        <circle cx="20" cy="20" r="19" fill="currentColor" />
        <path d="M8 27 L15 13 L20 23 L25 13 L32 27" stroke="var(--primary)" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="leading-none">
        <div className="text-xl font-bold tracking-tight">arija nova</div>
        {sub && <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">{sub}</div>}
      </div>
    </div>
  );
}
