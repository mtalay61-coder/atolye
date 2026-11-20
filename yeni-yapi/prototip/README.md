# Atölye prototipi

Veritabanı olmadan, tıklanabilir ekranlar. Örnek veri; hiçbir şey kaydedilmez, sayfa yenilenince başa döner.
Önizleme: https://claude.ai/artifact/9pSVfkv3ec7zn3a7aL5aqS (her derlemede `dist/onizleme.html` yeniden yayınlanır).

```bash
npm install
npm run dev      # tasarımı eşitler, yerel sunucu
npm run build    # tasarımı eşitler, tip denetimi, dist/ ve dist/onizleme.html (tek dosya)
```

## Kurallar

- **Tasarım elle kopyalanmaz.** `npm run esitle` (`scripts/tasarim-esitle.mjs`) `../tasarim/tokens.json`'dan
  `public/tasarim/tokens.css`'i üretir, `bundle.css` ve `bundle.js`'i (window.Atolye) kopyalar, `../sema.json`'u
  `src/veri/`'ye alır. Renk, ikon, araç çubuğu sırası, arama kuralı tasarım sisteminde değişir.
- **Ekranlar veriyi yalnız `src/veri/kaynak.ts`'ten alır.** Bağlama zamanı yalnız o dosya değişir: okumalar Supabase
  görünümlerinden, yazmalar komut fonksiyonlarından. `src/veri/hesap.ts`'teki türetilmiş sayılar o zaman
  görünümlerden gelir ve dosya kalkar.
- **Prototipte iş kuralı yazılmaz.** Stok, bakiye, karşılanan miktar örnek sayıdır.
- **Her menü öğesi şemadaki bir modüldür** (`src/menu.ts`). Ekranı çizilmemiş modül `Planlanan` sayfasında şemadaki
  amacını ve kılavuz adımlarını gösterir.
- Her ekran `../tasarim/ekran-kaliplari.md`'deki bir kalıba oturur ve `../tasarim/denetim-listesi.md`'den geçer.

## Çizilen ekranlar

| Adres | Ekran | Kalıp |
|---|---|---|
| (giriş) | Giriş | — |
| `#siparisler` | Sipariş listesi: süzgeç çipleri, süzgeç satırı, seçim, sağ tık, iptal onayı | Liste |
| `#siparis-<no>` | Sipariş kartı: ‹ önceki · sıra · sonraki › (PageUp/PageDown, listenin süzgeciyle), Genel · Kalemler (matris, sevk işaretli) · Sevkler · Notlar, İşlemler menüsü | Kart |
| `#siparis-yeni` | Yeni sipariş: aramalı müşteri/ürün, beden matrisiyle kalem ekleme, toplamlar | Belge |
| `#cariler` | Cari listesi: rol çipleri (Müşteri, Tedarikçi, Fasoncu · personel, Bize borçlu, Pasif), geniş arama (ad, kod, yetkili, telefon, vergi no), işaretli bakiye, Türk lirası toplamları, Pasife al | Liste |
| `#cari-<kod>` | Cari kartı: ‹ › gezgin, bakiye başlıkta, Genel · Hareketler (ekstre, koşan bakiye) · Siparişler · Notlar, İşlemler menüsü; kartın içinde düzenleme, kaydedilmemiş değişiklik sorusu | Kart |
| `#cari-yeni` | Yeni cari: aynı kart, doğrulamalar (ünvan, rol, vergi no 10/11 hane, e-posta, telefon), benzer cari uyarısı, aramalı il seçimi | Kart |
| `#tanimlar` | Tanımlar › Görünüm: tema seçimi | Kart |
| `#modul-<KOD>` | Henüz çizilmemiş modül: şemadan amaç ve kılavuz | — |

Kayıt gezgini `KartBasligi`'nin `gezgin` özelliğidir; liste ekranı sırasını `gezintiAyarla(tür, { liste })` ile paylaşır.
Cari, ürün ve diğer kartlar aynı iki satırla bağlanır.

Kullanıcı menüsünde "Çevrimdışını dene": şerit çıkar, bütün yazma düğmeleri pasifleşir.
