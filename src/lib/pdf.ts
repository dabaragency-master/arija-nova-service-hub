import { jsPDF } from "jspdf";
import { ORDER_STATUSES, ORDER_TYPES, fmtDate, orderNo, type OrderStatus, type OrderType } from "./labels";

// jsPDF default fonts lack Croatian diacritics; transliterate for reliable output.
const t = (s?: string | null) =>
  (s ?? "")
    .replace(/[čć]/g, "c").replace(/[ČĆ]/g, "C")
    .replace(/š/g, "s").replace(/Š/g, "S")
    .replace(/ž/g, "z").replace(/Ž/g, "Z")
    .replace(/đ/g, "dj").replace(/Đ/g, "Dj");

export type PdfOrder = {
  number: number;
  type: OrderType;
  status: OrderStatus;
  title: string;
  description: string | null;
  work_done: string | null;
  address: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  hours: number | null;
  signature: string | null;
  signed_by: string | null;
  client: { name: string; address: string | null; city: string | null; phone: string | null; oib: string | null } | null;
  monter: string | null;
  materials: { name: string; quantity: number; unit: string }[];
};

export function downloadOrderPdf(o: PdfOrder) {
  const doc = new jsPDF();
  const blue: [number, number, number] = [10, 64, 140];
  doc.setFillColor(...blue);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("arija nova", 14, 15);
  doc.setFontSize(9);
  doc.text("Klima uredaji - prodaja, montaza, servis", 14, 22);
  doc.setFontSize(14);
  doc.text(`RADNI NALOG ${orderNo(o.number)}`, 196, 18, { align: "right" });

  doc.setTextColor(30, 30, 40);
  let y = 44;
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(t(value) || "-", 140);
    doc.text(lines, 56, y);
    y += 6 * lines.length + 1;
  };
  doc.setFontSize(10);
  row("Klijent:", o.client?.name ?? "");
  row("OIB:", o.client?.oib ?? "");
  row("Telefon:", o.client?.phone ?? "");
  row("Adresa:", o.address || [o.client?.address, o.client?.city].filter(Boolean).join(", "));
  row("Vrsta:", ORDER_TYPES[o.type]);
  row("Status:", ORDER_STATUSES[o.status]);
  row("Termin:", fmtDate(o.scheduled_at));
  row("Zavrseno:", fmtDate(o.completed_at));
  row("Monter:", o.monter ?? "");
  row("Radni sati:", o.hours != null ? `${o.hours} h` : "");
  y += 3;
  row("Naslov:", o.title);
  row("Opis:", o.description ?? "");
  row("Izvrseni rad:", o.work_done ?? "");

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Utroseni materijal", 14, y);
  y += 2;
  doc.setDrawColor(...blue);
  doc.line(14, y, 196, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  if (!o.materials.length) {
    doc.text("-", 14, y);
    y += 6;
  }
  o.materials.forEach((m, i) => {
    doc.text(`${i + 1}. ${t(m.name)}`, 14, y);
    doc.text(`${m.quantity} ${t(m.unit)}`, 196, y, { align: "right" });
    y += 6;
  });

  y = Math.max(y + 10, 230);
  doc.setFont("helvetica", "bold");
  doc.text("Potpis klijenta", 130, y);
  if (o.signature) {
    try {
      doc.addImage(o.signature, "PNG", 130, y + 3, 60, 28);
    } catch {
      /* ignore */
    }
  }
  doc.line(130, y + 33, 196, y + 33);
  doc.setFont("helvetica", "normal");
  doc.text(t(o.signed_by ?? ""), 130, y + 39);
  doc.save(`${orderNo(o.number)}.pdf`);
}
