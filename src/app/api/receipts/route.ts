import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { uploadFileToS3, saveFileLocally } from "@/lib/storage";

export async function GET() {
  const receipts = await prisma.receipt.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ receipts });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const maybeFile = formData.get("file");
  const providedFileUrl = formData.get("fileUrl")?.toString();
  const vendorNameInput = formData.get("vendorName")?.toString();
  const dateInput = formData.get("date")?.toString();
  const grandTotalInput = formData.get("grandTotal")?.toString();

  let fileUrl = providedFileUrl ?? "";
  let imageBuffer: Buffer | null = null;

  // If a file is provided, save it to cloud storage or local storage
  if (maybeFile && typeof maybeFile !== "string") {
    const file = maybeFile as File;
    const arrayBuffer = await file.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
    
    const ext = file.name.split('.').pop() || "bin";
    const filename = `${randomUUID()}.${ext}`;
    
    // Use cloud storage in production, local storage in development
    if (process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID) {
      fileUrl = await uploadFileToS3(imageBuffer, filename, file.type);
    } else {
      fileUrl = await saveFileLocally(imageBuffer, filename);
    }
  }

  if (!fileUrl) {
    return NextResponse.json({ error: "file or fileUrl is required" }, { status: 400 });
  }

  // For now, skip OCR and just save the receipt
  // OCR can be added later with a different library
  const parsed = {};

  const receipt = await prisma.receipt.create({
    data: {
      fileUrl,
      vendorName: vendorNameInput ?? null,
      date: dateInput ? new Date(dateInput) : null,
      grandTotal: grandTotalInput ?? null,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ receipt }, { status: 201 });
}


