# ReceiptFlow - Akıllı Fiş Yönetim Sistemi

Modern ve kullanıcı dostu fiş yönetim uygulaması. OCR teknolojisi ile fişlerinizi otomatik olarak işleyin, organize edin ve muhasebe süreçlerinizi hızlandırın.

## 🌟 Özellikler

- 📸 **Kolay Fiş Yükleme**: Sürükle-bırak ile dosya yükleme
- 🤖 **Otomatik OCR**: Gelişmiş metin tanıma teknolojisi
- 📊 **Dashboard**: Detaylı istatistikler ve raporlama
- 🔄 **Onay Sistemi**: Fiş onaylama/reddetme işlemleri
- 📤 **Dışa Aktarma**: CSV, XLSX, JSON formatlarında raporlar
- 🌐 **Cloud Storage**: Güvenli dosya depolama
- 📱 **Responsive**: Mobil ve masaüstü uyumlu

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js 18+ 
- PostgreSQL veritabanı
- AWS S3 (opsiyonel, dosya yükleme için)

### Kurulum

1. **Repository'yi klonlayın**
```bash
git clone https://github.com/Hanifi-Zeytin/receiptflow.git
cd receiptflow
```

2. **Dependencies'i yükleyin**
```bash
npm install
```

3. **Environment variables'ları ayarlayın**
```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:
```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# AWS S3 (opsiyonel)
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="receiptflow-uploads"
```

4. **Veritabanını hazırlayın**
```bash
npx prisma generate
npx prisma db push
```

5. **Uygulamayı başlatın**
```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

## 🌐 Production Deployment

### Render ile Deploy

1. **Render.com'a gidin**
2. **GitHub hesabınızla giriş yapın**
3. **"New +" → "Web Service"**
4. **Repository'nizi seçin**
5. **Otomatik deploy olacak**

### Manuel Deploy

1. **Build oluşturun**
```bash
npm run build
```

2. **Production'da çalıştırın**
```bash
npm start
```

## 📁 Proje Yapısı

```
receiptflow/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── upload/         # Fiş yükleme sayfası
│   │   ├── receipts/       # Fiş listesi sayfası
│   │   └── page.tsx        # Ana sayfa
│   ├── lib/                # Utility fonksiyonları
│   │   ├── prisma.ts       # Database client
│   │   └── storage.ts      # File storage utilities
│   └── components/         # React components
├── prisma/                 # Database schema
├── public/                 # Static files
└── package.json
```

## 🛠️ Teknolojiler

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL, Prisma ORM
- **File Storage**: AWS S3
- **Deployment**: Render

## 📊 API Endpoints

- `GET /api/receipts` - Fişleri listele
- `POST /api/receipts` - Yeni fiş yükle
- `POST /api/receipts/[id]/approve` - Fiş onayla
- `POST /api/receipts/[id]/reject` - Fiş reddet
- `GET /api/exports` - Rapor dışa aktar

## 🔧 Geliştirme

### Yeni özellik ekleme

1. Feature branch oluşturun
```bash
git checkout -b feature/new-feature
```

2. Değişiklikleri yapın ve commit edin
```bash
git add .
git commit -m "Add new feature"
```

3. Pull request oluşturun

### Test

```bash
npm run test
```

## 📈 Performans

- ⚡ Hızlı sayfa yüklemeleri
- 🖼️ Optimized image processing
- 💾 Efficient database queries
- ☁️ Cloud-based file storage

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- Email: contact@receiptflow.com
- Website: https://receiptflow.com
- GitHub: https://github.com/Hanifi-Zeytin/receiptflow

## 🙏 Teşekkürler

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://prisma.io/) - Database toolkit
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Render](https://render.com/) - Deployment platform

---

**🚀 Uygulama şu anda Render'da deploy ediliyor!**
