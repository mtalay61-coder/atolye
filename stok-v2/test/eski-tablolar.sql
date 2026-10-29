-- YEREL SINAMA: BUGÜNKÜ STOK TABLOLARININ TAKLİDİ + ÖRNEK VERİ — yalnız yerel PostgreSQL, Supabase'e VERİLMEZ.
-- Depoda urunler / varyantlar / stok_hareketleri'nin ilk kurulum DDL'i yok (bkz. kurulum-betigi.sql başlığı); sütunlar
-- uygulamanın yazdığı alanlardan (src/040, 090) çıkarıldı. Göç sütunları to_jsonb ile okuduğu için tip farkı (tarih metin mi
-- zaman damgası mı) sonucu değiştirmez — burada bilerek karışık: tarih metin.
--
-- Örnek veri, göçün karşılaşacağı zor durumların her birinden bir tane içerir (yorumlarda hangisi olduğu yazılı).
-- Fiş defterinde AYNI fiş iki kez iptal kaydı olarak durabiliyor (canlı veride görüldü: "10032-Saya", 28 Ekim): F-2 iki kez.
-- Bozuk kayıtlar da (F-9: satırlar dizi değil, iptal metin; F-10: miktar boş; düz metin kayıt) geçişi durdurmamalı.

create table public.urunler (id text primary key, ad text not null, kategori text, veri jsonb);
create table public.varyantlar (
  urun_id text not null, renk text not null default 'Standart', renk_id text, beden text not null default 'Standart',
  miktar numeric not null default 0, min_stok numeric not null default 0,
  unique (urun_id, renk, beden)
);
create table public.stok_hareketleri (
  id text primary key, urun_id text, renk text, beden text, miktar numeric, kaynak text, tarih text, fis_no text,
  siparis_no text, cari_id text, uretim_id text, siparis_id text, kalem_id text, rezervasyon_siparis_id text,
  fazla_gonderim boolean default false, aciklama text, ek jsonb
);
create table public.tanimlar (id text primary key, veri jsonb);
create table public.fis_defteri (id text primary key, veri jsonb);

insert into public.tanimlar values ('tekil', '{
  "girisAktifMi": true,
  "kullanicilar": [
    {"kullaniciAdi": "Ali", "rol": "Yönetici"},
    {"kullaniciAdi": "Veli", "rol": "Kullanıcı", "yetkiler": {"stok": {"goruntuleme": true, "kaydetme": false, "silme": false}}},
    {"kullaniciAdi": "Ayşe", "rol": "Kullanıcı", "yetkiler": {"stok": {"goruntuleme": true, "kaydetme": true, "silme": false}}}
  ],
  "renkler": [
    {"id": "r-siyah", "ad": "Siyah", "kod": "01"},
    {"id": "r-taba", "ad": "Taba", "kod": "02"},
    {"id": "r-kahve", "ad": "Kahve", "kod": "03"}
  ],
  "renkKombinasyonlari": [
    {"id": "kombi-1", "kod": "1058", "renkIdler": ["r-taba", "r-siyah"]}
  ],
  "bedenler": [
    {"id": "b-36", "ad": "36", "tip": "Beden"},
    {"id": "b-37", "ad": "37", "tip": "Beden"}
  ]
}'::jsonb);

insert into public.urunler (id, ad, kategori) values
  ('u-canta', 'Deri Çanta', 'Mamul'),
  ('u-kosele', 'Kösele', 'Hammadde'),
  ('u-iplik', 'İplik', 'Hammadde'),
  ('u-eski', 'Eski Model', 'Mamul');

insert into public.varyantlar (urun_id, renk, renk_id, beden, miktar, min_stok) values
  -- Model rengi (kodlu etiket) + beden; hareket toplamı = kayıtlı miktar.
  ('u-canta', '1058 - Taba/Siyah', 'kombi-1', '36', 10, 2),
  -- Kodsuz mamul rengi (hammadde rengi adıyla); kayıtlı 5 ama hareket toplamı 3 → göç fark fişi +2.
  ('u-canta', 'Kahve', null, '37', 5, 0),
  -- Eksi stok: kırpılmamalı.
  ('u-kosele', 'Siyah', 'r-siyah', 'Standart', -4, 0),
  -- Bayat renk kimliği: ad "Taba" ama kimlik r-siyah → kimliğe değil ada güvenilir.
  ('u-kosele', 'Taba', 'r-siyah', 'Standart', 7, 1),
  -- Hareketsiz, sıfır stoklu ürün.
  ('u-iplik', 'Standart', null, 'Standart', 0, 0),
  -- Tanımda olmayan renk ve beden → 'serbest' renk/ölçü; fişsiz hareketi var.
  ('u-eski', 'Eski Bordo', null, 'XL', 2, 0),
  -- Varyant tablosunda olup ürünü silinmiş satır → atlanır.
  ('u-silinmis', 'Siyah', null, 'Standart', 9, 0);

insert into public.stok_hareketleri (id, urun_id, renk, beden, miktar, kaynak, tarih, fis_no, siparis_no, cari_id, aciklama, ek) values
  -- F-1: alış fişi, iki satır (defterde başlığı var).
  ('h1', 'u-canta', '1058 - Taba/Siyah', '36', 12, 'Satınalma', '2026-10-01T09:00:00Z', 'F-1', null, 'c-1', null, null),
  ('h2', 'u-kosele', 'Taba', 'Standart', 7, 'Satınalma', '2026-10-01T09:00:00Z', 'F-1', null, 'c-1', null, '{"birimFiyat": 120}'),
  -- F-4: satış; aynı fişte küçük harfli renk adı ("siyah") — ad eşleşmesi büyük/küçük harf duyarsız.
  ('h3', 'u-canta', '1058 - Taba/Siyah', '36', -2, 'Satış', '2026-10-05T14:30:00Z', 'F-4', 'S-100', 'c-2', null, null),
  ('h4', 'u-kosele', 'siyah', 'Standart', -4, 'Satış', '2026-10-05T14:30:00Z', 'F-4', 'S-100', 'c-2', null, null),
  -- F-5: üretim girişi, kodsuz renk.
  ('h5', 'u-canta', 'Kahve', '37', 3, 'Üretim', '2026-10-06T10:00:00Z', 'F-5', null, null, null, null),
  -- Fişsiz eski hareket → kendi fişini alır (ESKI-h6).
  ('h6', 'u-eski', 'Eski Bordo', 'XL', 2, 'Manuel', '2026-09-01', null, null, null, 'eski kayıt', null),
  -- Ürünü olmayan hareket → atlanır.
  ('h7', 'u-silinmis', 'Siyah', 'Standart', 9, 'Manuel', '2026-09-01', 'F-6', null, null, null, null),
  -- Sıfır miktarlı hareket → atlanır (yeni yapıda miktar ≠ 0).
  ('h8', 'u-iplik', 'Standart', 'Standart', 0, 'Manuel', '2026-09-02', 'F-7', null, null, null, null),
  -- F-3: defterde İPTAL görünüyor ama hareketi hâlâ canlı (bugün stokta sayılıyor) → sayılır, raporlanır.
  ('h9', 'u-canta', 'Kahve', '37', 0.5, 'Manuel', '2026-10-07T08:00:00Z', 'F-3', null, null, null, null),
  ('h10', 'u-canta', 'Kahve', '37', -0.5, 'Manuel', '2026-10-07T08:00:00Z', 'F-3', null, null, null, null);

insert into public.fis_defteri values ('tekil', '[
  {"id": "F-1", "fisNo": "F-1", "tip": "Alış", "kaynak": "Satınalma", "cariId": "c-1", "zaman": "2026-10-01T09:00:00Z",
   "stokTarihi": "2026-10-01T08:30:00Z", "kullanici": "Ali", "defter": "stok"},
  {"id": "F-4", "fisNo": "F-4", "tip": "Satış", "kaynak": "Satış", "cariId": "c-2", "siparisId": "sip-100", "siparisNo": "S-100",
   "zaman": "2026-10-05T14:30:00Z", "kullanici": "Ayşe"},
  {"id": "F-2", "fisNo": "F-2", "tip": "Giriş", "kaynak": "Manuel", "zaman": "2026-10-03T11:00:00Z", "kullanici": "Ali",
   "iptal": true, "iptalZamani": "2026-10-03T12:00:00Z",
   "stokHareketleri": [{"id": "h-iptal-1", "urunId": "u-canta", "renk": "1058 - Taba/Siyah", "beden": "36", "miktar": 50, "kaynak": "Manuel"}]},
  {"id": "F-2", "fisNo": "F-2", "tip": "Giriş", "kaynak": "Manuel", "zaman": "2026-10-03T11:00:00Z", "kullanici": "Ali",
   "iptal": true, "iptalZamani": "2026-10-03T12:05:00Z",
   "stokHareketleri": [{"id": "h-iptal-1", "urunId": "u-canta", "renk": "1058 - Taba/Siyah", "beden": "36", "miktar": 50, "kaynak": "Manuel"},
                       {"id": "h-iptal-2", "urunId": "u-kosele", "renk": "Siyah", "beden": "Standart", "miktar": 3, "kaynak": "Manuel"}]},
  {"id": "F-9", "iptal": "true", "stokHareketleri": {"bozuk": 1}},
  {"id": "F-10", "iptal": true, "stokHareketleri": [{"id": "h-b1", "urunId": "u-iplik", "miktar": ""}]},
  "bozuk kayıt",
  {"id": "F-3", "fisNo": "F-3", "tip": "Manuel", "kaynak": "Manuel", "zaman": "2026-10-07T08:00:00Z", "iptal": true,
   "stokHareketleri": [{"id": "h9", "urunId": "u-canta", "renk": "Kahve", "beden": "37", "miktar": 0.5}]}
]'::jsonb);

-- CARİ (cari v2 sınaması). Tarih alanları bugünkü tablodaki gibi tipli: tarih gün, zaman zaman damgası — göç METNE çevirir,
-- uygulamanın bugün okuduğu biçim aynen kalmalı.
create table public.cariler (id text primary key, unvan text not null, tip text, ek jsonb);
create table public.cari_hareketleri (
  id text primary key, cari_id text references public.cariler(id) on delete cascade, tarih date, zaman timestamptz, yon text,
  tutar numeric, para_birimi text, odeme_sekli text, vade text, defter text, fis_no text, siparis_no text, uretim_id text,
  urun_ad text, renk text, aciklama text, ek jsonb
);
insert into public.cariler values ('c-1', 'Ege Deri', 'Tedarikçi', null), ('c-2', 'Yıldız Mağazaları', 'Müşteri', null);
insert into public.cari_hareketleri values
  ('ch1', 'c-1', '2026-10-01', '2026-10-01T09:00:00Z', 'Borç', 840, 'TRY', 'Nakit', null, 'Genel', 'F-1', null, null, 'Kösele', 'Taba', 'Alış fişi', '{"miktar": 7, "birim": "m", "kullanici": "Ali"}'),
  ('ch2', 'c-2', '2026-10-05', '2026-10-05T14:30:00Z', 'Alacak', 1250.5, 'TRY', 'Vadeli', '2026-11-05', 'Genel', 'F-4', 'S-100', null, 'Deri Çanta', null, 'Satış fişi', '{}'),
  ('ch3', 'c-2', '2026-10-06', null, 'Borç', 1000, 'TRY', 'Havale', null, 'Genel', 'TH-1', null, null, null, null, 'Tahsilat', '{"islemTipi": "Tahsilat"}'),
  -- Carisi olmayan bozuk satır → göçte atlanır, raporlanır.
  ('ch4', null, '2026-09-01', null, 'Borç', 5, 'TRY', null, null, 'Genel', null, null, null, null, null, 'yetim', null);

-- SİPARİŞ VE ÜRETİM (alt-v2 sınaması) — tablolar bugünkü gibi tipli; alt_yaz bunlara tablonun kendi tipiyle yazar.
create table public.siparisler (id text primary key, siparis_no text, tip text, cari_id text, durum text, ek jsonb, surum int default 1);
create table public.siparis_kalemleri (
  id text primary key, siparis_id text references public.siparisler(id) on delete cascade, urun_id text, urun_ad text, renk text,
  beden text, miktar numeric, karsilanan numeric default 0, fiyat numeric, para_birimi text, birim text, planlama jsonb,
  ambalaj jsonb, rezervasyonlar jsonb, sira int, ek jsonb
);
create table public.uretim (id text primary key, siparis_no text, urun_id text, asama text, ek jsonb, surum int default 1);
create table public.uretim_atamalari (
  id text primary key, uretim_id text references public.uretim(id) on delete cascade, proses text, personel_id text,
  beden_miktarlari jsonb, miktar numeric, verildi_mi boolean, verilme_tarihi text, tamamlandi_mi boolean, tamamlanma_tarihi text,
  sonuc text, tamir_mi boolean, tamir_kaynak_proses text, tamir_sebep text, tamir_ucret numeric, tamir_hammaddeler jsonb,
  barkod text, ek jsonb
);
insert into public.siparisler values ('sip-100', 'S-100', 'Satış', 'c-2', 'Onaylandı', null, 1);
insert into public.siparis_kalemleri values
  ('k1', 'sip-100', 'u-canta', 'Deri Çanta', '1058 - Taba/Siyah', '36', 10, 2, 450, 'TRY', 'adet', null, null, '[]', 0, null);
insert into public.uretim values ('ur-1', '10032', 'u-canta', 'Üretimde', null, 1);
insert into public.uretim_atamalari values
  ('at-1', 'ur-1', 'Saya', 'p-1', '{"36": 5}', 5, true, '2026-10-20', false, null, null, false, null, null, 0, '[]', '10032-1', null);

-- KASA & BANKA (kasa v2 sınaması) — bugünkü gibi tek satırlık belge. Kimliksiz eski hareket ve çek bilerek var.
create table public.muhasebe (id text primary key, veri jsonb);
insert into public.muhasebe values ('tekil', '{
  "kasalar": [{"id": "kasa-1", "ad": "Merkez Kasa", "paraBirimi": "TRY", "hareketler": [
     {"id": "mh1", "tarih": "2026-10-20", "yon": "Giriş", "tutar": 1000, "cariId": "c-2", "muhasebeBagId": "bag1", "defter": "Genel", "aciklama": "Tahsilat"},
     {"id": "mh2", "tarih": "2026-10-21", "yon": "Çıkış", "tutar": 250, "defter": "Genel", "aciklama": "Kira"},
     {"tarih": "2026-09-01", "yon": "Giriş", "tutar": 50, "aciklama": "eski, kimliksiz"}]}],
  "bankalar": [{"id": "banka-1", "ad": "Ziraat", "paraBirimi": "TRY", "iban": "TR00", "hareketler": [
     {"id": "mh3", "tarih": "2026-10-22", "yon": "Giriş", "tutar": 5000, "defter": "Resmi", "aciklama": "Havale"}]}],
  "cekler": [{"id": "cek-1", "cekNo": "A1", "tutar": 750, "durum": "Portföyde"}, {"cekNo": "A0", "tutar": 10, "durum": "Tahsil edildi"}],
  "kurlar": {"USD": 41.2, "EUR": 48.1},
  "kurGecmisi": [{"tarih": "2026-10-20", "USD": 41}]
}');
