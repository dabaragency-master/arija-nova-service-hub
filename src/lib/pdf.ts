import { jsPDF } from "jspdf";
import { ORDER_STATUSES, ORDER_TYPES, fmtDate, orderNo, type OrderStatus, type OrderType } from "./labels";

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
  checklist?: { label: string; done: boolean }[];
};

async function toBase64(url: string) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

// Noto Sans is embedded so Croatian diacritics (č, ć, š, ž, đ) render correctly.
async function loadFonts(doc: jsPDF) {
  const [r, b] = await Promise.all([toBase64("/fonts/NotoSans-Regular.ttf"), toBase64("/fonts/NotoSans-Bold.ttf")]);
  doc.addFileToVFS("NotoSans-Regular.ttf", r);
  doc.addFont("NotoSans-Regular.ttf", "Noto", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", b);
  doc.addFont("NotoSans-Bold.ttf", "Noto", "bold");
  doc.setFont("Noto", "normal");
}

export async function downloadOrderPdf(o: PdfOrder) {
  const doc = new jsPDF();
  await loadFonts(doc);
  const blue: [number, number, number] = [10, 64, 140];
  doc.setFillColor(...blue);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("Noto", "bold");
  doc.setFontSize(20);
  doc.text("arija nova", 14, 15);
  doc.setFont("Noto", "normal");
  doc.setFontSize(9);
  doc.text("Klima uređaji – prodaja, montaža, servis", 14, 22);
  doc.setFontSize(14);
  doc.text(`RADNI NALOG ${orderNo(o.number)}`, 196, 18, { align: "right" });

  doc.setTextColor(30, 30, 40);
  let y = 44;
  const ensure = (h: number) => { if (y + h > 285) { doc.addPage(); y = 20; } };
  const row = (label: string, value: string) => {
    const lines = doc.splitTextToSize(value || "-", 140);
    ensure(6 * lines.length);
    doc.setFont("Noto", "bold");
    doc.text(label, 14, y);
    doc.setFont("Noto", "normal");
    doc.text(lines, 56, y);
    y += 6 * lines.length + 1;
  };
  const heading = (s: string) => {
    ensure(14);
    y += 4;
    doc.setFont("Noto", "bold");
    doc.text(s, 14, y);
    y += 2;
    doc.setDrawColor(...blue);
    doc.line(14, y, 196, y);
    y += 6;
    doc.setFont("Noto", "normal");
  };
  doc.setFontSize(10);
  row("Klijent:", o.client?.name ?? "");
  row("OIB:", o.client?.oib ?? "");
  row("Telefon:", o.client?.phone ?? "");
  row("Adresa:", o.address || [o.client?.address, o.client?.city].filter(Boolean).join(", "));
  row("Vrsta:", ORDER_TYPES[o.type]);
  row("Status:", ORDER_STATUSES[o.status]);
  row("Termin:", fmtDate(o.scheduled_at));
  row("Završeno:", fmtDate(o.completed_at));
  row("Monter:", o.monter ?? "");
  row("Radni sati:", o.hours != null ? `${o.hours} h` : "");
  y += 3;
  row("Naslov:", o.title);
  row("Opis:", o.description ?? "");
  row("Izvršeni rad:", o.work_done ?? "");

  if (o.checklist?.length) {
    heading("Kontrolna lista");
    o.checklist.forEach((c) => {
      ensure(6);
      doc.text(`${c.done ? "[✓]" : "[  ]"}  ${c.label}`.replace("✓", "x"), 14, y);
      y += 6;
    });
  }

  heading("Utrošeni materijal");
  if (!o.materials.length) { doc.text("-", 14, y); y += 6; }
  o.materials.forEach((m, i) => {
    ensure(6);
    doc.text(`${i + 1}. ${m.name}`, 14, y);
    doc.text(`${m.quantity} ${m.unit}`, 196, y, { align: "right" });
    y += 6;
  });

  if (y + 50 > 285) { doc.addPage(); y = 20; }
  y = Math.max(y + 10, 230 > y + 10 && y < 230 ? 230 : y + 10);
  doc.setFont("Noto", "bold");
  doc.text("Potpis klijenta", 130, y);
  if (o.signature) {
    try { doc.addImage(o.signature, "PNG", 130, y + 3, 60, 28); } catch { /* ignore */ }
  }
  doc.line(130, y + 33, 196, y + 33);
  doc.setFont("Noto", "normal");
  doc.text(o.signed_by ?? "", 130, y + 39);
  doc.save(`${orderNo(o.number)}.pdf`);
}
