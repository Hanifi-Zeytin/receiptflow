import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { uploadFileToS3, saveFileLocally } from "@/lib/storage";

type HeaderJson = {
  isletme?: string;
  adres?: string;
  telefon?: string;
  tarih?: string;
  saat?: string;
  satis_no?: number;
  odeme_tipi?: string;
  kasiyer?: string;
  genel_toplam_kdv_haric?: number;
  genel_toplam_kdv_dahil?: number;
};

function extractHeaderJson(params: {
  vendorNameInput?: string | null;
  dateInput?: string | null;
  grandTotalInput?: string | null;
}): HeaderJson {
  const { vendorNameInput, dateInput, grandTotalInput } = params;
  const header: HeaderJson = {};
  if (vendorNameInput) header.isletme = vendorNameInput;
  if (dateInput) header.tarih = dateInput;
  // Saat kullanıcıdan gelmiyor; boş bırakılır
  // Ödeme tipi/kasiyer gelmiyor; boş bırakılır
  if (grandTotalInput) {
    const num = Number(String(grandTotalInput).replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!Number.isNaN(num)) header.genel_toplam_kdv_dahil = Number(num.toFixed(2));
  }
  return header;
}

export async function GET() {
  try {
    const receipts = await prisma.receipt.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ receipts });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/receipts - Starting...");
    
    const formData = await req.formData();
    const maybeFile = formData.get("file");
    const providedFileUrl = formData.get("fileUrl")?.toString();
    const vendorNameInput = formData.get("vendorName")?.toString();
    const dateInput = formData.get("date")?.toString();
    const grandTotalInput = formData.get("grandTotal")?.toString();

    console.log("Form data received:", {
      hasFile: !!maybeFile,
      fileType: maybeFile ? typeof maybeFile : 'none',
      vendorName: vendorNameInput,
      date: dateInput,
      grandTotal: grandTotalInput
    });

    let fileUrl = providedFileUrl ?? "";
    let imageBuffer: Buffer | null = null;

    if (maybeFile && typeof maybeFile !== "string") {
      console.log("Processing file upload...");
      const file = maybeFile as File;
      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      
      const ext = file.name.split('.').pop() || "bin";
      const filename = `${randomUUID()}.${ext}`;
      
      console.log("File info:", { filename, size: imageBuffer.length, type: file.type });
      
      if (process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID) {
        console.log("Using S3 storage...");
        fileUrl = await uploadFileToS3(imageBuffer, filename, file.type);
      } else {
        console.log("Using local storage...");
        fileUrl = await saveFileLocally(imageBuffer, filename);
      }
      
      console.log("File saved to:", fileUrl);
    }

    if (!fileUrl) {
      console.log("No file URL available");
      return NextResponse.json({ error: "file or fileUrl is required" }, { status: 400 });
    }

    const headerJson = extractHeaderJson({ vendorNameInput, dateInput, grandTotalInput });

    console.log("Creating receipt in database...");
    console.log("Database URL:", process.env.DATABASE_URL ? "Set" : "Not set");

    const receipt = await prisma.receipt.create({
      data: {
        fileUrl,
        vendorName: vendorNameInput ?? null,
        date: dateInput ? new Date(dateInput) : null,
        grandTotal: grandTotalInput ?? null,
        status: "DRAFT",
        headerJson: Object.keys(headerJson).length ? (headerJson as unknown as any) : undefined,
      },
    });

    console.log("Receipt created successfully:", receipt.id);
    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    console.error("Error creating receipt:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json({ 
      error: "Failed to create receipt",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
