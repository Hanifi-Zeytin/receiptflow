import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { uploadFileToS3, saveFileLocally } from "@/lib/storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import fs from "fs/promises";

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

async function toBase64FromFileSystem(publicRelativePath: string): Promise<{ base64: string; mimeType: string }> {
  const filePath = path.join(process.cwd(), "public", publicRelativePath.replace(/^\/+/, ""));
  const data = await fs.readFile(filePath);
  const ext = path.extname(publicRelativePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".pdf" ? "application/pdf" : "application/octet-stream";
  return { base64: data.toString("base64"), mimeType };
}

async function toBase64FromUrl(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Resim indirilemedi: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuf).toString("base64");
  const mimeType = res.headers.get("content-type") || "image/*";
  return { base64, mimeType };
}

async function analyzeWithGemini(input: { base64?: string; imageUrl?: string; headerHint?: HeaderJson }): Promise<HeaderJson | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = [
      "Aşağıdaki fiş görselinden sadece şu alanları çıkar ve JSON olarak döndür:",
      "isletme, adres, telefon, tarih (dd.mm.yyyy), saat (hh:mm), satis_no, odeme_tipi, kasiyer, genel_toplam_kdv_haric, genel_toplam_kdv_dahil",
      "Sadece geçerli JSON döndür; açıklama ekleme.",
      input.headerHint?.isletme ? `İpucu - İşletme: ${input.headerHint.isletme}` : "",
      input.headerHint?.tarih ? `İpucu - Tarih: ${input.headerHint.tarih}` : "",
      input.headerHint?.genel_toplam_kdv_dahil ? `İpucu - Toplam: ${input.headerHint.genel_toplam_kdv_dahil}` : "",
    ].filter(Boolean).join("\n");

    const parts: any[] = [prompt];
    if (input.base64) {
      parts.push({ inlineData: { mimeType: "image/*", data: input.base64 } });
    } else if (input.imageUrl) {
      const { base64, mimeType } = await toBase64FromUrl(input.imageUrl);
      parts.push({ inlineData: { mimeType, data: base64 } });
    }

    const result = await model.generateContent(parts as any);
    const text = result.response.text();
    try {
      const parsed = JSON.parse(text);
      return parsed as HeaderJson;
    } catch {
      return null;
    }
  } catch (e) {
    console.error("Gemini analyze failed:", e);
    return null;
  }
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

    let headerJson = extractHeaderJson({ vendorNameInput, dateInput, grandTotalInput });

    // Otomatik AI analizi (varsa)
    try {
      const hasApiKey = !!process.env.GEMINI_API_KEY;
      if (hasApiKey) {
        let base64: string | undefined;
        let inferUrl: string | undefined;

        if (imageBuffer) {
          base64 = imageBuffer.toString("base64");
        } else if (fileUrl.startsWith("http")) {
          inferUrl = fileUrl;
        } else if (fileUrl.startsWith("/uploads/")) {
          const fromFs = await toBase64FromFileSystem(fileUrl);
          base64 = fromFs.base64;
        }

        if (base64 || inferUrl) {
          const ai = await analyzeWithGemini({
            base64,
            imageUrl: inferUrl,
            headerHint: headerJson,
          });
          if (ai && Object.keys(ai).length) {
            headerJson = { ...headerJson, ...ai };
          }
        }
      }
    } catch (e) {
      console.warn("AI analysis skipped due to error:", e);
    }

    console.log("Creating receipt in database...");
    console.log("Database URL:", process.env.DATABASE_URL ? "Set" : "Not set");

    // AI sonuçlarını DB alanlarına yansıt (tercihen AI → input fallback)
    const vendorFromAI = headerJson.isletme ?? undefined;
    const totalFromAI = headerJson.genel_toplam_kdv_dahil ?? undefined;
    const parseAiDate = (val?: string) => {
      if (!val) return undefined;
      // dd.mm.yyyy beklenir; değilse Date.parse'a bırak
      const m = val.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      if (m) {
        const [_, dd, mm, yyyy] = m;
        return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    };
    const dateFromAI = parseAiDate(headerJson.tarih);

    const receipt = await prisma.receipt.create({
      data: {
        fileUrl,
        vendorName: vendorFromAI ?? vendorNameInput ?? null,
        date: dateFromAI ?? (dateInput ? new Date(dateInput) : null),
        grandTotal: (typeof totalFromAI === 'number' ? totalFromAI : (grandTotalInput ? Number(String(grandTotalInput).replace(/[^0-9.,]/g, '').replace(',', '.')) : undefined)) ?? null,
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
