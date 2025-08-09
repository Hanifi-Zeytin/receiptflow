import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();

  const receipts = await prisma.receipt.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows = receipts.map((r) => ({
    id: r.id,
    vendorName: r.vendorName ?? "",
    date: r.date ? r.date.toISOString().slice(0, 10) : "",
    grandTotal: r.grandTotal ?? "",
    status: r.status,
    fileUrl: r.fileUrl,
  }));

  if (format === "json") return NextResponse.json(rows);

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Receipts");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=receipts.xlsx",
      },
    });
  }

  if (format === "pdf") {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks: Buffer[] = [];
    const streamFinished = new Promise<void>((resolve) => {
      doc.on("data", (chunk) => chunks.push(chunk as Buffer));
      doc.on("end", () => resolve());
    });

    doc.fontSize(18).text("Receipts Export", { align: "center" });
    doc.moveDown();

    const headers = ["ID", "Vendor", "Date", "Total", "Status"] as const;
    doc.fontSize(12).text(headers.join("  |  "));
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.5);

    rows.forEach((r) => {
      const line = [r.id.slice(0, 8), r.vendorName, r.date, String(r.grandTotal ?? ""), r.status].join("  |  ");
      doc.text(line);
    });

    doc.end();
    await streamFinished;

    const pdfBuffer = Buffer.concat(chunks);
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=receipts.pdf",
      },
    });
  }

  // CSV default
  const header = Object.keys(rows[0] ?? { id: "", vendorName: "", date: "", grandTotal: "", status: "", fileUrl: "" });
  const csv = [
    header.join(","),
    ...rows.map((r) => header.map((h) => String((r as Record<string, string>)[h]).replaceAll('"', '""')).map((c)=>`"${c}"`).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=receipts.csv",
    },
  });
}
