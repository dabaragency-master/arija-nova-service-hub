export const CLIENT_TYPES = {
  privatni: "Privatni korisnik",
  tvrtka: "Tvrtka",
  apartman: "Iznajmljivač / apartmani",
} as const;
export type ClientType = keyof typeof CLIENT_TYPES;

export const PHOTO_CATEGORIES = {
  prije: "Prije radova",
  poslije: "Nakon radova",
  kvar: "Zatečeno stanje / kvar",
  ostalo: "Ostalo",
} as const;
export type PhotoCategory = keyof typeof PHOTO_CATEGORIES;

export const REFRIGERANTS = ["R32", "R410A", "R290", "R134a", "R407C"];

export const CHECKLISTS: Record<string, string[]> = {
  servis: [
    "Čišćenje filtera unutarnje jedinice",
    "Dezinfekcija isparivača",
    "Čišćenje vanjske jedinice",
    "Provjera tlaka rashladnog plina",
    "Provjera odvoda kondenzata",
    "Provjera električnih spojeva",
    "Probni rad (hlađenje / grijanje)",
  ],
  montaza: [
    "Dogovorena pozicija jedinica s klijentom",
    "Montaža nosača i vanjske jedinice",
    "Postavljanje cijevi i kanalica",
    "Vakumiranje instalacije",
    "Test nepropusnosti",
    "Električno spajanje",
    "Probni rad i upute klijentu",
  ],
  reklamacija: ["Utvrđen kvar", "Provjera tlaka plina", "Provjera elektronike", "Kvar otklonjen"],
  prodaja: ["Isporuka opreme", "Upute za korištenje"],
};

export type ChecklistItem = { label: string; done: boolean };

export function defaultChecklist(type: string): ChecklistItem[] {
  return (CHECKLISTS[type] ?? []).map((label) => ({ label, done: false }));
}

/** Croatian numbers to international format for wa.me (0911234567 -> 385911234567). */
export function normalizePhone(phone: string) {
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  else if (p.startsWith("00")) p = p.slice(2);
  else if (p.startsWith("0")) p = "385" + p.slice(1);
  return p;
}

export function waLink(phone: string, text?: string) {
  return `https://wa.me/${normalizePhone(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function mapsLink(addr: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
}

function addYear(d: string) {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCFullYear(dt.getUTCFullYear() + 1);
  return dt.toISOString().slice(0, 10);
}

/** Next yearly service: explicit date, else 12 months after last service or installation. */
export function nextServiceDate(d: { next_service_at: string | null; last_service_at: string | null; installed_at: string | null }) {
  if (d.next_service_at) return d.next_service_at;
  const base = d.last_service_at ?? d.installed_at;
  return base ? addYear(base) : null;
}

export function daysUntil(date: string, today = new Date()) {
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.parse(date + "T00:00:00Z") - t) / 86400000);
}

/** Service is "due" when it is overdue or within the next 30 days. */
export function isServiceDue(date: string | null, today = new Date()) {
  return date != null && daysUntil(date, today) <= 30;
}

export function warrantyStatus(until: string | null, today = new Date()) {
  if (!until) return null;
  return daysUntil(until, today) >= 0 ? "aktivno" : "isteklo";
}

export function serviceDoneUpdate(today: string) {
  return { last_service_at: today, next_service_at: addYear(today) };
}
