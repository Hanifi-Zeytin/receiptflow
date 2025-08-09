"use client";
import { useState, useRef } from "react";
import Link from "next/link";

type HeaderJson = {
  isletme: string;
  adres: string;
  telefon: string;
  tarih: string;
  saat: string;
  satis_no: number | null;
  odeme_tipi: string;
  kasiyer: string;
  genel_toplam_kdv_haric: number | null;
  genel_toplam_kdv_dahil: number | null;
};

function toHeaderJson(receipt: any): HeaderJson {
  // Tarihi dd.mm.yyyy olarak formatla
  const tarih = receipt?.date ? new Date(receipt.date).toLocaleDateString("tr-TR") : "";
  // Genel toplam (dahil) sayısallaştır
  const toplamDahil = receipt?.grandTotal ? Number(String(receipt.grandTotal).replace(/[^0-9.,]/g, '').replace(',', '.')) : null;
  // Şemaya uygun objeyi döndür
  return {
    isletme: receipt?.vendorName || "",
    adres: receipt?.headerJson?.adres || "",
    telefon: receipt?.headerJson?.telefon || "",
    tarih,
    saat: receipt?.headerJson?.saat || "",
    satis_no: receipt?.headerJson?.satis_no ?? null,
    odeme_tipi: receipt?.headerJson?.odeme_tipi || "",
    kasiyer: receipt?.headerJson?.kasiyer || "",
    genel_toplam_kdv_haric: receipt?.headerJson?.genel_toplam_kdv_haric ?? null,
    genel_toplam_kdv_dahil: toplamDahil,
  };
}

export default function UploadPage() {
  const [fileUrl, setFileUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [grandTotal, setGrandTotal] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [lastReceiptJson, setLastReceiptJson] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setLastReceiptJson(null);
    
    const form = new FormData();
    if (file) form.append("file", file);
    if (fileUrl) form.append("fileUrl", fileUrl);
    if (vendorName) form.append("vendorName", vendorName);
    if (grandTotal) form.append("grandTotal", grandTotal);
    
    try {
      const res = await fetch("/api/receipts", { method: "POST", body: form });
      const data = await res.json();
      
      if (res.ok) {
        setMessage("✅ Fiş başarıyla yüklendi!");
        setMessageType('success');
        const header = toHeaderJson(data.receipt);
        setLastReceiptJson(JSON.stringify(header, null, 2));
        // Reset form
        setFile(null);
        setFileUrl("");
        setVendorName("");
        setGrandTotal("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setMessage(data.error ?? "❌ Hata oluştu");
        setMessageType('error');
      }
    } catch {
      setMessage("❌ Bağlantı hatası oluştu");
      setMessageType('error');
    }
    
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileUrl(""); // Clear URL when file is selected
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.startsWith('image/') || droppedFile.type === 'application/pdf')) {
      setFile(droppedFile);
      setFileUrl("");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const analyzeWithGemini = async () => {
    try {
      setAiLoading(true);
      setAiResult(null);
      let imageBase64: string | undefined;
      let imageUrlPayload: string | undefined;

      if (file) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        imageBase64 = btoa(binary);
      } else if (fileUrl) {
        imageUrlPayload = fileUrl;
      } else {
        setAiResult("Lütfen önce bir fiş dosyası seçin veya URL girin.");
        setAiLoading(false);
        return;
      }

      const res = await fetch("/api/ai/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          imageUrl: imageUrlPayload,
          headerHint: {
            isletme: vendorName || undefined,
            genel_toplam_kdv_dahil: grandTotal || undefined,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiResult(JSON.stringify(data.headerJson ?? data.raw, null, 2));
      } else {
        setAiResult(data.error ?? "Analiz başarısız");
      }
    } catch (e) {
      setAiResult("Analiz sırasında hata oluştu");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h1 className="text-2xl font-bold text-gray-900">ReceiptFlow</h1>
                  <p className="text-sm text-gray-500">Akıllı Fiş Yönetim Sistemi</p>
                </div>
              </Link>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/upload" className="text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Fiş Yükle
              </Link>
              <Link href="/receipts" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Fişler
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Fiş Yükle</h2>
          <p className="text-lg text-gray-600">Fişinizi yükleyin, JSON verisini hemen görün ve indirin</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={onSubmit} className="space-y-8">
            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">Fiş Dosyası</label>
              
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {file ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Dosyayı Kaldır
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dosya seçin veya sürükleyip bırakın</p>
                      <p className="text-xs text-gray-500">JPG, PNG, PDF (max 10MB)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Dosya Seç
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Alternative URL Input */}
            <div className="border-t pt-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Veya Dosya URL&apos;si</label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => {
                  setFileUrl(e.target.value);
                  if (e.target.value) setFile(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/receipt.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">Dosya yükleme yerine URL de kullanabilirsiniz</p>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Satıcı Adı</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: ABC Market"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Toplam Tutar</label>
                <input
                  type="text"
                  value={grandTotal}
                  onChange={(e) => setGrandTotal(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: 150.50 TL"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/receipts"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                İptal
              </Link>
              <button
                type="button"
                onClick={analyzeWithGemini}
                disabled={aiLoading || (!file && !fileUrl)}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {aiLoading ? "Gemini analiz ediliyor..." : "Gemini ile Analiz Et"}
              </button>
              <button
                type="submit"
                disabled={loading || (!file && !fileUrl)}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Yükleniyor...
                  </>
                ) : (
                  'Fişi Yükle'
                )}
              </button>
            </div>
          </form>

          {/* Message Display */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              messageType === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* Last Receipt JSON */}
          {lastReceiptJson && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Oluşturulan Fiş JSON</h3>
                <a
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(lastReceiptJson)}`}
                  download="receipt.json"
                  className="text-blue-600 text-sm hover:text-blue-700"
                >
                  İndir
                </a>
              </div>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap break-all">{lastReceiptJson}</pre>
            </div>
          )}

          {/* AI Result */}
          {aiResult && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Gemini Analiz Sonucu</h3>
                <a
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(aiResult)}`}
                  download="receipt-ai.json"
                  className="text-blue-600 text-sm hover:text-blue-700"
                >
                  İndir
                </a>
              </div>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap break-all">{aiResult}</pre>
            </div>
          )}
        </div>

        {/* Features Preview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Hızlı İşlem</h3>
            <p className="text-sm text-gray-600">JSON verisini anında görüntüleyin ve indirin</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Kolay Paylaşım</h3>
            <p className="text-sm text-gray-600">JSON çıktısını paylaşın veya entegrasyonlar için kullanın</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Düzenlenebilir</h3>
            <p className="text-sm text-gray-600">İhtiyacınıza göre alanları genişletin (OCR eklenebilir)</p>
          </div>
        </div>
      </main>
    </div>
  );
}


