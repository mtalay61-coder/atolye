#!/usr/bin/env node
// B3a-2 ALAN / İŞLEM YETKİ MATRİSİ (27 Kasım) — YALNIZ yerel PostgreSQL (canlı yetki / politika / tetikleyicileriyle hizalı taban kopyası).
// Her deneme PostgREST'in çalıştırdığı gibi: ayrı işlem · SET LOCAL ROLE authenticated · request.jwt.claims. Deneme sonunda işlem GERİ
// ALINIR. Başarıda yazılan değer okunur; retlerde SQLSTATE + ileti. Hesaplar bu betikle (yalnız sınama kopyasına) eklenir:
//   ayse = yalnız stok (g, d, k) · cem = yalnız cari (g, d, k) · selin = yalnız sipariş (g, d, k) · murat = yalnız muhasebe (g, d, k)
//   tuna = yalnız tanımlar (g, d — silme YOK) · deniz = cari + sipariş (g, d, k) · ali = Yönetici
// BEKLENEN: hesap sırasıyla Y (yazabilmeli) / R (KR040). "AÇIK (B6)" işaretli durumlar bu paketin BİLEREK kapatmadığı ücret verisidir.
// Kullanım: KOPRU_PG=<pg> node b3a2-matris.js <veritabanı>   (veritabanı atılabilir kopya olmalı — hesaplar eklenir)
const { Client } = require(process.env.KOPRU_PG || "pg");
const db = process.argv[2];
const H = ["ayse", "cem", "selin", "murat", "tuna", "deniz", "ali"];
const yt = (m) => ({ [m]: { goruntuleme: true, duzenleme: true, kaydetme: true } });
const HESAP = [
  { kullaniciAdi: "Cem", eposta: "cem@atolye.local", rol: "Personel", yetkiler: yt("cari") },
  { kullaniciAdi: "Selin", eposta: "selin@atolye.local", rol: "Personel", yetkiler: yt("siparis") },
  { kullaniciAdi: "Murat", eposta: "murat@atolye.local", rol: "Personel", yetkiler: yt("muhasebe") },
  { kullaniciAdi: "Tuna", eposta: "tuna@atolye.local", rol: "Personel", yetkiler: { tanimlar: { goruntuleme: true, duzenleme: true } } },
  { kullaniciAdi: "Deniz", eposta: "deniz@atolye.local", rol: "Personel", yetkiler: { ...yt("cari"), ...yt("siparis") } },
];
const AD = { ayse: "Ayşe", cem: "Cem", selin: "Selin", murat: "Murat", tuna: "Tuna", deniz: "Deniz", ali: "Ali" };
const T = (yol, deger) => `update public.tanimlar set veri = jsonb_set(veri, '${yol}', ${deger}) where id = 'tekil'`;
// [ad, beklenen (H sırası), sql (metin ya da hesap → metin), doğrulama sql'i, (isteğe bağlı) hazırlık sql'i — jetonsuz, denemeden ÖNCE aynı işlemde]
const D = [
  // ── CARİLER
  ["cari: hızlı ekleme (yalnız unvan + tip)", "YYYRRYY", `insert into public.cariler (id, unvan, tip) values ('c-hizli', 'Hızlı Tedarikçi', 'Tedarikçi')`, `select count(*) from public.cariler where id = 'c-hizli'`],
  ["cari: dolu kart ekleme (telefon, vergi no)", "RYRRRYY", `insert into public.cariler (id, unvan, tip, telefon, vergi_no) values ('c-dolu', 'Dolu Cari', 'Müşteri', '555', '123')`, `select count(*) from public.cariler where id = 'c-dolu'`],
  ["cari: unvan değiştirme", "RYRRRYY", `update public.cariler set unvan = 'Değişti' where id = 'inc-musteri'`, `select unvan from public.cariler where id = 'inc-musteri'`],
  ["cari: BOŞ koda kod verme (otomatik)", "YYYYYYY", `update public.cariler set kod = 7 where id = 'inc-musteri'`, `select kod from public.cariler where id = 'inc-musteri'`],
  ["cari: müşterinin fiyat grubunu değiştirme", "RRRRRYY", `update public.cariler set ek = coalesce(ek, '{}'::jsonb) || '{"fiyatGrubuId": "fg-toptan"}' where id = 'inc-musteri'`, `select ek ->> 'fiyatGrubuId' from public.cariler where id = 'inc-musteri'`],
  ["cari: eski fiyat_grubu sütununu değiştirme", "RRRRRYY", `update public.cariler set fiyat_grubu = 'fg-toptan' where id = 'inc-musteri'`, `select fiyat_grubu from public.cariler where id = 'inc-musteri'`],
  ["cari: fiyat gruplu yeni cari (hızlı ekleme sayılmaz)", "RRRRRYY", `insert into public.cariler (id, unvan, tip, ek) values ('c-fg', 'Gruplu', 'Müşteri', '{"fiyatGrubuId": "fg-toptan"}')`, `select count(*) from public.cariler where id = 'c-fg'`],
  ["cari: ek alanında fiyat grubu DIŞI değişiklik (not)", "RYRRRYY", `update public.cariler set ek = coalesce(ek, '{}'::jsonb) || '{"notlar": "x"}' where id = 'inc-musteri'`, `select ek ->> 'notlar' from public.cariler where id = 'inc-musteri'`],
  ["cari: değişmeyen satırı aynen gönderme (ekle-ya-da-güncelle)", "YYYYYYY",
    `insert into public.cariler select * from public.cariler where id = 'inc-musteri' on conflict (id) do update set unvan = excluded.unvan, tip = excluded.tip, telefon = excluded.telefon, fiyat_grubu = excluded.fiyat_grubu`,
    `select unvan from public.cariler where id = 'inc-musteri'`],
  ["cari: boş alanları varsayılanla yazma (null → [], {}, false, TRY — açılış normalleştirmesi)", "YYYYYYY",
    `update public.cariler set bagli_prosesler = '[]', ek = coalesce(ek, '{}'::jsonb), pasif = false, para_birimi = coalesce(para_birimi, 'TRY') where id = 'inc-musteri'`,
    `select pasif from public.cariler where id = 'inc-musteri'`],
  ["cari: ek'e sunucunun olusturma damgasını geri yazma (veri değil)", "YYYYYYY", `update public.cariler set ek = coalesce(ek, '{}'::jsonb) || '{"olusturma": "2026-11-26T18:35:17Z"}' where id = 'inc-musteri'`, `select ek ->> 'olusturma' from public.cariler where id = 'inc-musteri'`],
  // ── OLUMSUZ: otomatik yazma istisnaları (boş değer, oluşturma damgası) GERÇEK değişikliği gizleyemez
  ["İSTİSNA cari: boş telefonu DOLDURMA (boş ≡ boş istisnası dolu değeri geçirmez)", "RYRRRYY", `update public.cariler set telefon = '0555 000 00 00' where id = 'inc-musteri'`, `select telefon from public.cariler where id = 'inc-musteri'`],
  ["İSTİSNA cari: dolu telefonu BOŞALTMA", "RYRRRYY", `update public.cariler set telefon = '' where id = 'inc-musteri'`, `select coalesce(telefon, 'null') from public.cariler where id = 'inc-musteri'`,
    `update public.cariler set telefon = '0555 111 11 11' where id = 'inc-musteri'`],
  ["İSTİSNA cari: pasif false → TRUE (false boş sayılır, true sayılmaz)", "RYRRRYY", `update public.cariler set pasif = true where id = 'inc-musteri'`, `select pasif from public.cariler where id = 'inc-musteri'`],
  ["İSTİSNA cari: para birimini TRY DIŞI bir değerle doldurma", "RYRRRYY", `update public.cariler set para_birimi = 'USD' where id = 'inc-musteri'`, `select para_birimi from public.cariler where id = 'inc-musteri'`],
  ["İSTİSNA cari: oluşturma damgasının YANINDA başka ek anahtarı", "RYRRRYY", `update public.cariler set ek = coalesce(ek, '{}'::jsonb) || '{"olusturma": "2026-11-26T18:35:17Z", "vadeGun": 90}' where id = 'inc-musteri'`, `select ek ->> 'vadeGun' from public.cariler where id = 'inc-musteri'`],
  ["İSTİSNA cari: oluşturma damgasının YANINDA fiyat grubu", "RRRRRYY", `update public.cariler set ek = coalesce(ek, '{}'::jsonb) || '{"olusturma": "2026-11-26T18:35:17Z", "fiyatGrubuId": "fg-toptan"}' where id = 'inc-musteri'`, `select ek ->> 'fiyatGrubuId' from public.cariler where id = 'inc-musteri'`],
  ["İSTİSNA cari: oluşturma damgasının YANINDA unvan değişikliği", "RYRRRYY", `update public.cariler set unvan = 'Gizli Değişiklik', ek = coalesce(ek, '{}'::jsonb) || '{"olusturma": "2026-11-26T18:35:17Z"}' where id = 'inc-musteri'`, `select unvan from public.cariler where id = 'inc-musteri'`],
  ["İSTİSNA cari: mevcut fiyat grubunu SİLME (dolu → boş)", "RRRRRYY", `update public.cariler set ek = ek - 'fiyatGrubuId' where id = 'inc-musteri'`, `select coalesce(ek ->> 'fiyatGrubuId', 'yok') from public.cariler where id = 'inc-musteri'`,
    `update public.cariler set ek = '{"fiyatGrubuId": "fg-toptan"}' where id = 'inc-musteri'`],
  ["İSTİSNA ürün: mevcut satış fiyatını SIFIRLAMA (dolu → 0)", "RRYRRYY", `update public.urunler set satis_fiyati = 0 where id = 'inc-bot'`, `select satis_fiyati from public.urunler where id = 'inc-bot'`,
    `update public.urunler set satis_fiyati = 250 where id = 'inc-bot'`],
  ["İSTİSNA ürün: mevcut alış fiyatını NULL yapma", "RRRYRRY", `update public.urunler set alis_fiyati = null where id = 'inc-bot'`, `select coalesce(alis_fiyati::text, 'null') from public.urunler where id = 'inc-bot'`,
    `update public.urunler set alis_fiyati = 80 where id = 'inc-bot'`],
  ["İSTİSNA ürün: mevcut fiyat kurallarını BOŞALTMA (dolu → [])", "RRYRRYY", `update public.urunler set fiyat_kurallari = '[]' where id = 'inc-bot'`, `select jsonb_array_length(fiyat_kurallari) from public.urunler where id = 'inc-bot'`,
    `update public.urunler set fiyat_kurallari = '[{"tip": "Satış", "kapsam": "fiyatGrubu", "deger": "fg-toptan", "fiyat": 100}]' where id = 'inc-bot'`],
  ["İSTİSNA ürün: satış fiyatı DOLUYKEN para birimini değiştirme", "RRYRRYY", `update public.urunler set satis_para_birimi = '$' where id = 'inc-bot'`, `select satis_para_birimi from public.urunler where id = 'inc-bot'`,
    `update public.urunler set satis_fiyati = 250, satis_para_birimi = '₺' where id = 'inc-bot'`],
  ["İSTİSNA ürün: ad değişikliğinin YANINDA fiyat değişikliği (tam satır)", "RRYRRYY", `update public.urunler set ad = 'Ad + Fiyat', satis_fiyati = 1 where id = 'inc-bot'`, `select ad from public.urunler where id = 'inc-bot'`],
  // ── ÜRÜNLER (yalnız fiyat alanları denetlenir)
  ["ürün: boş fiyat alanlarını varsayılanla yazma (null → 0, boş birim → ₺)", "YYYYYYY",
    `update public.urunler set satis_fiyati = coalesce(satis_fiyati, 0), alis_fiyati = coalesce(alis_fiyati, 0), fiyat_kurallari = coalesce(fiyat_kurallari, '[]'), satis_para_birimi = coalesce(nullif(satis_para_birimi, ''), '₺') where id = 'inc-bot'`,
    `select satis_fiyati from public.urunler where id = 'inc-bot'`],
  ["ürün: fiyat dışı alan (ad) değiştirme", "YYYYYYY", `update public.urunler set ad = 'Yeni Ad' where id = 'inc-bot'`, `select ad from public.urunler where id = 'inc-bot'`],
  ["ürün: satış fiyatını değiştirme", "RRYRRYY", `update public.urunler set satis_fiyati = 999 where id = 'inc-bot'`, `select satis_fiyati from public.urunler where id = 'inc-bot'`],
  ["ürün: alış fiyatını değiştirme", "RRRYRRY", `update public.urunler set alis_fiyati = 555 where id = 'inc-bot'`, `select alis_fiyati from public.urunler where id = 'inc-bot'`],
  ["ürün: adı değiştirip fiyatları AYNEN gönderme (istemcinin tam satır yazması)", "YYYYYYY",
    `insert into public.urunler select * from public.urunler where id = 'inc-bot' on conflict (id) do update set ad = 'Tam Satır', satis_fiyati = excluded.satis_fiyati, alis_fiyati = excluded.alis_fiyati, satis_para_birimi = excluded.satis_para_birimi, alis_para_birimi = excluded.alis_para_birimi, fiyat_kurallari = excluded.fiyat_kurallari`,
    `select ad from public.urunler where id = 'inc-bot'`],
  ["ürün: satış fiyat kuralı ekleme (fiyat grubu fiyatı)", "RRYRRYY", `update public.urunler set fiyat_kurallari = '[{"tip": "Satış", "kapsam": "fiyatGrubu", "deger": "fg-toptan", "fiyat": 100}]' where id = 'inc-bot'`, `select jsonb_array_length(fiyat_kurallari) from public.urunler where id = 'inc-bot'`],
  ["ürün: alış fiyat kuralı ekleme", "RRRYRRY", `update public.urunler set fiyat_kurallari = '[{"tip": "Alış", "kapsam": "renk", "deger": "Siyah", "fiyat": 50}]' where id = 'inc-bot'`, `select jsonb_array_length(fiyat_kurallari) from public.urunler where id = 'inc-bot'`],
  ["ürün: fiyatsız yeni ürün", "YYYYYYY", `insert into public.urunler (id, ad, kategori, satis_para_birimi, alis_para_birimi) values ('u-yeni', 'Yeni Ürün', 'Mamul', '₺', '₺')`, `select count(*) from public.urunler where id = 'u-yeni'`],
  ["ürün: satış fiyatlı yeni ürün", "RRYRRYY", `insert into public.urunler (id, ad, kategori, satis_fiyati) values ('u-yeni2', 'Fiyatlı Ürün', 'Mamul', 250)`, `select count(*) from public.urunler where id = 'u-yeni2'`],
  // ── TANIMLAR
  ["tanımlar: boş varsayılan iskeleti yazma (açılış: boş firma bilgileri, boş listeler)", "YYYYYYY",
    `update public.tanimlar set veri = veri || '{"firmaBilgileri": {"logo": "", "unvan": "", "telefon": ""}, "hammaddeTipleri": [], "araProsesler": [], "ozelKodAlanlari": []}' where id = 'tekil'`,
    `select veri -> 'firmaBilgileri' ->> 'unvan' from public.tanimlar`],
  ["tanımlar: firma bilgisi yokken yalnız varsayılan logolu boş iskelet (açılış)", "YYYYYYY",
    `update public.tanimlar set veri = (veri - 'firmaBilgileri') || '{"firmaBilgileri": {"logo": "data:image/png;base64,AAAA", "unvan": "", "telefon": ""}}' where id = 'tekil' and not (veri ? 'firmaBilgileri')`,
    `select (veri ? 'firmaBilgileri')::text from public.tanimlar`],
  // ── OLUMSUZ: varsayılan firma bilgisi ve boş iskelet istisnaları
  ["İSTİSNA tanımlar: firma bilgisi YOKKEN iskeletin içinde DOLU unvan", "RRRRYRY",
    `update public.tanimlar set veri = veri || '{"firmaBilgileri": {"logo": "data:image/png;base64,AAAA", "unvan": "Sahte Firma", "telefon": ""}}' where id = 'tekil'`, `select veri -> 'firmaBilgileri' ->> 'unvan' from public.tanimlar`],
  ["İSTİSNA tanımlar: firma bilgisi YOKKEN iskeletin içinde iç içe DOLU değer (e-posta sunucusu)", "RRRRYRY",
    `update public.tanimlar set veri = veri || '{"firmaBilgileri": {"logo": "", "unvan": "", "eposta": {"sunucu": "smtp.ornek.test", "kullanici": ""}}}' where id = 'tekil'`, `select veri -> 'firmaBilgileri' -> 'eposta' ->> 'sunucu' from public.tanimlar`],
  ["İSTİSNA tanımlar: firma bilgisi YOKKEN iskeletin içinde KDV anahtarını AÇMA (true)", "RRRRYRY",
    `update public.tanimlar set veri = veri || '{"firmaBilgileri": {"logo": "", "unvan": "", "kdvAktif": true}}' where id = 'tekil'`, `select veri -> 'firmaBilgileri' ->> 'kdvAktif' from public.tanimlar`],
  ["İSTİSNA tanımlar: firma bilgisi YOKKEN dönem kapanış tarihi yazma", "RRRRYRY",
    `update public.tanimlar set veri = veri || '{"firmaBilgileri": {"logo": "", "unvan": "", "donemKapanis": "2026-12-31"}}' where id = 'tekil'`, `select veri -> 'firmaBilgileri' ->> 'donemKapanis' from public.tanimlar`],
  ["İSTİSNA tanımlar: firma bilgisi VARKEN yalnız logoyu değiştirme (logo istisnası yalnız ilk iskelette)", "RRRRYRY",
    T("{firmaBilgileri,logo}", `'"data:image/png;base64,BBBB"'`), `select veri -> 'firmaBilgileri' ->> 'logo' from public.tanimlar`,
    `update public.tanimlar set veri = veri || '{"firmaBilgileri": {"logo": "data:image/png;base64,AAAA", "unvan": "Gerçek Firma"}}' where id = 'tekil'`],
  ["İSTİSNA tanımlar: firma bilgisi VARKEN boş iskeletle EZME (dolu → boş)", "RRRRYRY",
    T("{firmaBilgileri}", `'{"logo": "data:image/png;base64,AAAA", "unvan": "", "telefon": ""}'`), `select coalesce(veri -> 'firmaBilgileri' ->> 'unvan', '') from public.tanimlar`,
    `update public.tanimlar set veri = veri || '{"firmaBilgileri": {"logo": "data:image/png;base64,AAAA", "unvan": "Gerçek Firma"}}' where id = 'tekil'`],
  ["İSTİSNA tanımlar: boş iskeletin YANINDA dolu ara proses listesi", "RRRRYRY",
    `update public.tanimlar set veri = veri || '{"firmaBilgileri": {"logo": "", "unvan": ""}, "hammaddeTipleri": [], "araProsesler": [{"id": "ap-1", "ad": "Gizli Proses", "ucret": 50}]}' where id = 'tekil'`, `select jsonb_array_length(veri -> 'araProsesler') from public.tanimlar`],
  ["İSTİSNA tanımlar: boş iskeletin YANINDA bilinmeyen anahtarı true yapma", "RRRRYRY",
    `update public.tanimlar set veri = veri || '{"ozelKodAlanlari": [], "siteYayinda": true}' where id = 'tekil'`, `select veri ->> 'siteYayinda' from public.tanimlar`],
  ["İSTİSNA tanımlar: bilinmeyen anahtarı false yazma (boş ≡ boş — değişiklik değil)", "YYYYYYY",
    `update public.tanimlar set veri = veri || '{"siteYayinda": false}' where id = 'tekil'`, `select veri ->> 'siteYayinda' from public.tanimlar`],
  ["tanımlar: firma unvanını yazma (gerçek değişiklik)", "RRRRYRY", T("{firmaBilgileri}", `'{"logo": "", "unvan": "Başka Firma"}'`), `select veri -> 'firmaBilgileri' ->> 'unvan' from public.tanimlar`],
  ["tanımlar: kod sayacını ARTIRMA", "YYYYYYY", T("{kodSayaclari}", `'{"renk": 60, "beden": 5}'`), `select veri -> 'kodSayaclari' ->> 'renk' from public.tanimlar`],
  ["tanımlar: kod sayacını GERİ ALMA", "RRRRYRY", T("{kodSayaclari}", `'{"renk": 1, "beden": 5}'`), `select veri -> 'kodSayaclari' ->> 'renk' from public.tanimlar`],
  ["tanımlar: yeni renk EKLEME (ürün ekranı)", "YRRRYRY", T("{renkler}", `(veri -> 'renkler') || '[{"id": "r-yeni", "ad": "Yeni Renk"}]'`), `select jsonb_array_length(veri -> 'renkler') from public.tanimlar`],
  ["tanımlar: mevcut rengin ADINI değiştirme", "RRRRYRY", T("{renkler,1,ad}", `'"Bozuk Ad"'`), `select veri -> 'renkler' -> 1 ->> 'ad' from public.tanimlar`],
  ["tanımlar: BÜTÜN renkleri silme", "RRRRRRY", T("{renkler}", `'[]'`), `select jsonb_array_length(veri -> 'renkler') from public.tanimlar`],
  ["tanımlar: tek rengi silme", "RRRRRRY", T("{renkler}", `(veri -> 'renkler') - 1`), `select jsonb_array_length(veri -> 'renkler') from public.tanimlar`],
  ["tanımlar: BOŞ renk koduna kod verme (otomatik)", "YYYYYYY", T("{renkler,0,kod}", `'"101"'`), `select veri -> 'renkler' -> 0 ->> 'kod' from public.tanimlar`],
  ["tanımlar: yeni kombinasyon EKLEME (model rengi)", "YRRRYRY", T("{renkKombinasyonlari}", `(veri -> 'renkKombinasyonlari') || '[{"id": "k-yeni", "kod": "1055", "renkIdler": ["r-siyah"]}]'`), `select jsonb_array_length(veri -> 'renkKombinasyonlari') from public.tanimlar`],
  ["tanımlar: mevcut kombinasyonun bileşenini değiştirme", "RRRRYRY", T("{renkKombinasyonlari,0,renkIdler}", `'["r-siyah"]'`), `select veri -> 'renkKombinasyonlari' -> 0 -> 'renkIdler' from public.tanimlar`],
  ["tanımlar: yeni beden EKLEME", "RRRRYRY", T("{bedenler}", `(veri -> 'bedenler') || '[{"id": "b-42", "ad": "42", "tip": "Beden"}]'`), `select jsonb_array_length(veri -> 'bedenler') from public.tanimlar`],
  ["tanımlar: SATIŞ fiyat grubu ekleme", "RRYRRYY", T("{fiyatGruplari}", `coalesce(veri -> 'fiyatGruplari', '[]') || '[{"id": "fg-yeni", "ad": "Yeni Grup", "tip": "Satış", "paraBirimi": "TRY"}]'`), `select jsonb_array_length(veri -> 'fiyatGruplari') from public.tanimlar`],
  ["tanımlar: ALIŞ fiyat grubu ekleme", "RRRYRRY", T("{fiyatGruplari}", `coalesce(veri -> 'fiyatGruplari', '[]') || '[{"id": "fg-alis", "ad": "Alış Grubu", "tip": "Alış", "paraBirimi": "TRY"}]'`), `select jsonb_array_length(veri -> 'fiyatGruplari') from public.tanimlar`],
  ["tanımlar: gider kartı ekleme", "RRRYYRY", T("{giderKartlari}", `coalesce(veri -> 'giderKartlari', '[]') || '[{"id": "gk-yeni", "ad": "Yeni Gider", "tur": "gider"}]'`), `select jsonb_array_length(veri -> 'giderKartlari') from public.tanimlar`],
  ["tanımlar: ORTAK ekran düzeni", "RRRRYRY", T("{ekranDuzenleri}", `'{"stok": [{"id": "ad", "genislik": 200}]}'`), `select veri -> 'ekranDuzenleri' is not null from public.tanimlar`],
  ["tanımlar: KİŞİSEL rapor (sahibi kendisi)", "YYYYYYY", (h) => T("{raporlar}", `coalesce(veri -> 'raporlar', '[]') || '[{"id": "rp-k", "ad": "Benim Raporum", "kapsam": "kisisel", "sahip": "${AD[h]}"}]'`), `select jsonb_array_length(veri -> 'raporlar') from public.tanimlar`],
  ["tanımlar: ORTAK rapor", "RRRRYRY", T("{raporlar}", `coalesce(veri -> 'raporlar', '[]') || '[{"id": "rp-o", "ad": "Ortak Rapor", "kapsam": "ortak", "sahip": "Ali"}]'`), `select jsonb_array_length(veri -> 'raporlar') from public.tanimlar`],
  ["tanımlar: başkasının kişisel raporu", "RRRRYRY", T("{raporlar}", `coalesce(veri -> 'raporlar', '[]') || '[{"id": "rp-b", "ad": "Başkasının", "kapsam": "kisisel", "sahip": "Başkası"}]'`), `select jsonb_array_length(veri -> 'raporlar') from public.tanimlar`],
  ["AÇIK (B6) tanımlar: personel maaşı (bolumler) — bu pakette kural YOK", "YYYYYYY", T("{bolumler}", `'[{"id": "bl-1", "ad": "Kesim", "personel": [{"cariId": "inc-musteri", "maas": 99999}]}]'`), `select veri -> 'bolumler' -> 0 -> 'personel' -> 0 ->> 'maas' from public.tanimlar`],
  ["AÇIK (B6) ürün: proses ücretleri — bu pakette kural YOK", "YYYYYYY", `update public.urunler set proses_ucretleri = '{"Kesim": 999}' where id = 'inc-bot'`, `select proses_ucretleri ->> 'Kesim' from public.urunler where id = 'inc-bot'`],
];
(async () => {
  const c = new Client({ host: process.env.PGHOST || "localhost", database: db, user: "postgres" });
  await c.connect();
  // hesaplar (yalnız eksikse) + satış fiyat grubu (cari fiyat grubu sınaması için)
  await c.query(`update public.tanimlar set veri = jsonb_set(jsonb_set(veri, '{kullanicilar}',
      (select jsonb_agg(x) from jsonb_array_elements(veri -> 'kullanicilar') x where not (x ->> 'eposta') = any($2::text[])) || $1::jsonb),
      '{fiyatGruplari}', '[{"id": "fg-toptan", "ad": "Toptan", "tip": "Satış", "paraBirimi": "TRY"}]'::jsonb) || '{"kodSayaclari": {"renk": 50, "beden": 5}}'::jsonb where id = 'tekil'`,
    [JSON.stringify(HESAP.map((h, i) => ({ id: `u-${i}`, ...h }))), HESAP.map((h) => h.eposta)]);
  const kurulu = (await c.query("select count(*)::int n from pg_trigger where tgname = 'b3a2_alan_koru'")).rows[0].n;
  const b3a = (await c.query("select count(*)::int n from pg_trigger where tgname = 'b3a_yazma_koru'")).rows[0].n;
  console.log(`b3a2-matris · ${db} · B3a-2 ${kurulu ? "KURULU" : "KURULU DEĞİL"} · B3a ${b3a ? "kurulu" : "yok"}`);
  const oz = { uyumlu: 0, acik: 0, fazla: 0 }; const ham = [];
  for (const [ad, beklenen, sql, dogrula, hazirlik] of D) {
    console.log(`\n■ ${ad}`);
    for (const [i, h] of H.entries()) {
      await c.query("begin"); let s;
      try {
        if (hazirlik) await c.query(hazirlik);   // jeton yok → kurallar serbest; işlem sonunda geri alınır
        await c.query(`select set_config('request.jwt.claims', $1, true), set_config('request.headers', '{"x-atolye-surum":"1.744.42"}', true)`,
          [JSON.stringify({ role: "authenticated", email: `${h}@atolye.local`, sub: "00000000-0000-0000-0000-00000000000" + (i + 1) })]);
        await c.query("set local role authenticated"); await c.query("savepoint d");
        try { const r = await c.query(typeof sql === "function" ? sql(h) : sql);
          let v = null; try { v = Object.values((await c.query(dogrula)).rows[0] || {})[0]; } catch (e) { v = `okunamadı ${e.code}`; }
          s = { g: r.rowCount > 0 ? "Y" : "0", not: `satır ${r.rowCount} · sonra: ${v}` };
        } catch (e) { await c.query("rollback to savepoint d"); s = { g: e.code === "KR040" ? "R" : "H", not: `${e.code} ${String(e.message).slice(0, 120)}` }; }
      } finally { await c.query("rollback"); }
      const b = beklenen[i]; const karar = s.g === b ? "uyumlu" : s.g === "Y" ? "acik" : "fazla";
      oz[karar] += 1; ham.push(`${ad}|${h}|${s.g}`);
      console.log(`   ${karar === "uyumlu" ? "✓" : "✗"} ${h.padEnd(6)} ${s.g}  ${s.not}${karar === "uyumlu" ? "" : `   ← ${karar === "acik" ? "AÇIK (yetkisiz yazdı)" : "FAZLA KISIT / yanlış gerekçe"} (beklenen ${b})`}`);
    }
  }
  await c.end();
  console.log(`\n── b3a2-matris ${db}: ${oz.uyumlu} uyumlu · ${oz.acik} AÇIK · ${oz.fazla} fazla kısıt / yanlış gerekçe ──`);
  if (process.argv[3]) require("fs").writeFileSync(process.argv[3], ham.join("\n"));
  process.exit(oz.acik || oz.fazla ? 1 : 0);
})().catch((e) => { console.error("HATA", e); process.exit(2); });
