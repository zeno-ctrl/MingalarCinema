import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Booking, BookingSeat, Seat, Showtime, Movie, Branch, Hall } from "@prisma/client";
import { formatMMK } from "@/lib/utils";

export type FullBooking = Booking & {
  seats: (BookingSeat & { seat: Seat })[];
  showtime: Showtime & { movie: Movie; branch: Branch; hall: Hall };
};

export async function getTicketQrDataUrl(booking: Pick<Booking, "qrToken">): Promise<string> {
  return QRCode.toDataURL(booking.qrToken, { margin: 1, width: 240 });
}

export async function generateTicketPdf(booking: FullBooking): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([320, 480]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const brandRed = rgb(0.843, 0.216, 0.169);
  const muted = rgb(0.42, 0.42, 0.44);
  let y = 440;

  page.drawText("Mingalar Cinema", { x: 20, y, size: 16, font: bold, color: brandRed });
  y -= 30;
  page.drawText(booking.showtime.movie.titleEn, { x: 20, y, size: 14, font: bold });
  y -= 22;
  page.drawText(`${booking.showtime.branch.nameEn} - ${booking.showtime.hall.name}`, { x: 20, y, size: 10, font, color: muted });
  y -= 16;
  page.drawText(
    booking.showtime.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
    { x: 20, y, size: 10, font, color: muted },
  );
  y -= 24;

  const seatLabels = booking.seats.map((s) => s.seat.label).join(", ");
  page.drawText(`Seats: ${seatLabels}`, { x: 20, y, size: 11, font });
  y -= 18;
  page.drawText(`Total paid: ${formatMMK(booking.total)}`, { x: 20, y, size: 11, font });
  y -= 30;

  const qrDataUrl = await getTicketQrDataUrl(booking);
  const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qrImage = await doc.embedPng(qrImageBytes);
  const qrSize = 180;
  page.drawImage(qrImage, { x: (320 - qrSize) / 2, y: y - qrSize, width: qrSize, height: qrSize });
  y -= qrSize + 20;

  page.drawText(booking.reference, { x: (320 - font.widthOfTextAtSize(booking.reference, 12)) / 2, y, size: 12, font: bold });
  y -= 16;
  page.drawText("Show this QR code at the cinema entrance", {
    x: (320 - font.widthOfTextAtSize("Show this QR code at the cinema entrance", 8)) / 2,
    y,
    size: 8,
    font,
    color: muted,
  });

  return doc.save();
}
