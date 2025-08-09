import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

import { GoogleGenerativeAI } from "@google/generative-ai";

type AnalyzeRequest = {
  imageBase64?: string; // optional: base64 image
  imageUrl?: string;    // optional: remote/public url
  headerHint?: {
    isletme?: string;
    tarih?: string;
    genel_toplam_kdv_dahil?: number | string;
  };
};

type HeaderJson = {
  isletme?: string;
  adres?: string;
  telefon?: string;
  tarih?: string;
  saat?: string;
  satis_no?: number | null;
  odeme_tipi?: string;
  kasiyer?: string;
  genel_toplam_kdv_haric?: number | null;
  genel_toplam_kdv_dahil?: number | null;
};

function buildPrompt(hints?: AnalyzeRequest["headerHint"]) {
  const hintLines: string[] = [];
  if (hints?.isletme) hintLines.push(`İşletme adı ipucu: ${hints.isletme}`);
  if (hints?.tarih) hintLines.push(`Tarih ipucu: ${hints.tarih}`);
  if (hints?.genel_toplam_kdv_dahil)
    hintLines.push(`Genel toplam (KDV dahil) ipucu: ${hints.genel_toplam_kdv_dahil}`);

  return [
    "Aşağıdaki fiş görselinden sadece şu alanları çıkar ve JSON olarak döndür:",
    "isletme, adres, telefon, tarih (dd.mm.yyyy), saat (hh:mm), satis_no, odeme_tipi, kasiyer, genel_toplam_kdv_haric, genel_toplam_kdv_dahil",
    "Sadece geçerli JSON döndür; açıklama ekleme.",
    ...(hintLines.length ? ["İpuçları:", ...hintLines] : []),
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeRequest;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY tanımlı değil" }, { status: 500 });
    }

    if (!body.imageBase64 && !body.imageUrl) {
      return NextResponse.json({ error: "imageBase64 veya imageUrl gerekli" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = buildPrompt(body.headerHint);

    const inputs: any[] = [prompt];

    if (body.imageBase64) {
      inputs.push({
        inlineData: {
          mimeType: "image/*",
          data: body.imageBase64,
        },
      });
    } else if (body.imageUrl) {
      inputs.push({
        fileData: {
          fileUri: body.imageUrl,
          mimeType: "image/*",
        },
      });
    }

    const result = await model.generateContent(inputs as any);
    const text = result.response.text();

    // Try parse to JSON; if fails, return raw
    let parsed: HeaderJson | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {}

    return NextResponse.json({ raw: text, headerJson: parsed ?? null });
  } catch (error) {
    console.error("Gemini analyze error:", error);
    return NextResponse.json({ error: "Analiz sırasında hata oluştu" }, { status: 500 });
  }
}


