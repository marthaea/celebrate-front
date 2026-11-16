import { formatDate, money } from "../../src/format.js";

/** Draws the logo mark onto a canvas so it can go into the PDF as a picture. */
function logoPng() {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      canvas.getContext("2d").drawImage(image, 0, 0, 256, 256);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve(null);
    image.src = "/favicon.svg";
  });
}

/** Builds and downloads a PDF receipt with a QR code vendors can scan to check the booking. */
export async function downloadReceipt(booking) {
  // Loaded only when asked for: the PDF library is large.
  const [{ jsPDF }, QR] = await Promise.all([import("jspdf"), import("qrcode")]);
  const verifyUrl = `${window.location.origin}/verify/${booking.id}`;
  const [logo, qr] = await Promise.all([logoPng(), QR.toDataURL(verifyUrl, { margin: 1, width: 360, color: { dark: "#24140f" } })]);

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const left = 18;
  const right = 192;
  const ink = [36, 20, 15];
  const quiet = [118, 101, 91];

  doc.setFillColor(212, 43, 43);
  doc.rect(0, 0, 210, 40, "F");
  if (logo) doc.addImage(logo, "PNG", left, 9, 22, 22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(22).text("CELEBRATE", left + 28, 20);
  doc.setFont("helvetica", "normal").setFontSize(11).text("Tukusanyukidde · E-receipt", left + 28, 28);
  doc.setFont("helvetica", "bold").setFontSize(13).text(booking.id, right, 20, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(10).text(formatDate(booking.createdAt.slice(0, 10)), right, 28, { align: "right" });

  let y = 54;
  const row = (label, value, bold = false) => {
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...quiet).text(label, left, y);
    doc.setFont("helvetica", bold ? "bold" : "normal").setTextColor(...ink).text(String(value), right, y, { align: "right" });
    y += 7;
  };
  const rule = () => {
    doc.setDrawColor(237, 220, 189).line(left, y - 3, right, y - 3);
    y += 3;
  };
  const heading = (text) => {
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(212, 43, 43).text(text.toUpperCase(), left, y);
    y += 7;
  };

  heading("Event");
  if (booking.customer) row("Booked by", booking.customer);
  row("Event", `${booking.event.type}, ${formatDate(booking.event.date)}`);
  row("District", booking.event.district);
  row("Guests", booking.event.guests.toLocaleString("en-US"));
  row("Paid by", booking.method);
  rule();

  heading("Services");
  for (const line of booking.quote.lines) {
    row(`${line.name} · ${line.vendor}`.slice(0, 70), money(line.amount));
  }
  rule();

  row("Item cost", money(booking.quote.itemCost));
  row("Labour and setup", money(booking.quote.labour));
  row("Transport", money(booking.quote.transport));
  row(`Platform fee (${Math.round(booking.quote.feeRate * 100)}%)`, money(booking.quote.platformFee));
  y += 2;
  doc.setFillColor(255, 241, 214).roundedRect(left - 3, y - 6, right - left + 6, 13, 3, 3, "F");
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...ink).text("Grand total", left, y + 2);
  doc.setTextColor(212, 43, 43).text(money(booking.total ?? booking.paid), right, y + 2, { align: "right" });
  y += 16;
  row(booking.balance ? "Deposit paid" : "Paid in full", money(booking.paid), true);
  if (booking.balance) row("Balance due on the day", money(booking.balance), true);
  y += 8;

  doc.addImage(qr, "PNG", left, y, 42, 42);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...ink).text("Vendors: scan to confirm this booking", left + 50, y + 12);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...quiet);
  doc.text(doc.splitTextToSize(`The code opens ${verifyUrl}, which shows whether this receipt is genuine and what was booked.`, 120), left + 50, y + 19);
  doc.text("Webale nnyo!", left + 50, y + 38);

  doc.setFontSize(8).text("Demonstration receipt: payments on this site are simulated and no money has moved.", left, 285);
  doc.save(`${booking.id}.pdf`);
}
