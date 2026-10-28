-- YEREL SINAMA: BUGÜNKÜ STOK TABLOLARININ TAKLİDİ + ÖRNEK VERİ — yalnız yerel PostgreSQL, Supabase'e VERİLMEZ.
-- Depoda urunler / varyantlar / stok_hareketleri'nin ilk kurulum DDL'i yok (bkz. kurulum-betigi.sql başlığı); sütunlar
-- uygulamanın yazdığı alanlardan (src/040, 090) çıkarıldı. Göç sütunları to_jsonb ile okuduğu için tip farkı (tarih metin mi
-- zaman damgası mı) sonucu değiştirmez — burada bilerek karışık: tarih metin.
--
-- Örnek veri, göçün karşılaşacağı zor durumların her birinden bir tane içerir (yorumlarda hangisi olduğu yazılı).

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
  {"id": "F-3", "fisNo": "F-3", "tip": "Manuel", "kaynak": "Manuel", "zaman": "2026-10-07T08:00:00Z", "iptal": true,
   "stokHareketleri": [{"id": "h9", "urunId": "u-canta", "renk": "Kahve", "beden": "37", "miktar": 0.5}]}
]'::jsonb);
