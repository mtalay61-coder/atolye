#!/usr/bin/env node
// TEK FİŞ DEFTERİ — UÇTAN UCA (v1.732.0): uygulamanın alış/satış fişi yolu (089 stokFisiSunucuYuku / stokFisiSunucuSonucu,
// 078 fiş kes + fark tabanı) → gerçek `fis_kes` / `fis_iptal` (yerel PostgreSQL, KURALLAR AÇIK) → görünümler.
// Ölçülen: fiş + bağlı makbuz + satırlar sunucuda; numaralar yerel kayıtlara yerleşti; sonraki olağan eşitleme (stok, cari,
// kasa) HİÇBİR satırı yeniden göndermiyor (kurallar açık: gönderseydi reddedilirdi); buluttaki stok ekrandakiyle aynı;
// "Geri al" fişi ve makbuzu iptal ediyor, sonra yine yeniden gönderim yok ve bulut ekranla aynı.
// kos.sh çalıştırır (sinama-fis.sql'den sonra). Supabase'e DOKUNMAZ.
const { execFileSync } = require("child_process");
const path = require("path");
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";
const psql = (sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB], { input: sql, encoding: "utf8" }).trim();
const jsonSorgu = (sql) => JSON.parse(psql(`select coalesce(json_agg(x), '[]'::json) from (${sql}) x;`) || "[]");

const bellek = {};
global.window = { localStorage: { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } },
  __supabaseYenidenDenemeMs: [] };
const cagrilar = [];
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const rpcAdi = (yol.match(/^rpc\/(stk_yaz|car_yaz|fis_yaz|alt_yaz|kas_yaz|lst_yaz|fis_kes|fis_iptal)/) || [])[1];
  if (rpcAdi) {
    const p = JSON.parse(sec.body).p;
    cagrilar.push({ rpcAdi, p });
    const metin = JSON.stringify(p);
    if (metin.includes("$j$")) throw new Error("test: yük $j$ içeriyor");
    try {
      const sonuc = psql(`select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', false);
                          set role authenticated;
                          select public.${rpcAdi}($j$${metin}$j$::jsonb);`).split("\n").pop();
      return { ok: true, status: 200, json: async () => JSON.parse(sonuc), text: async () => sonuc };
    } catch (e) {
      const m = String(e.stderr || e.message);
      return { ok: false, status: 400, json: async () => ({ message: m }), text: async () => m };
    }
  }
  return { ok: true, status: 200, json: async () => (sec.method === "PATCH" ? [{ id: "x" }] : []), text: async () => "" };
};
const E = require(path.join(__dirname, "../../test/erp.cjs"));

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\n    çıkan:   ", JSON.stringify(a)); }
};
const derin = (x) => JSON.parse(JSON.stringify(x));
const std = (x) => (x == null || String(x).trim() === "" || String(x).trim() === "Standart" ? "Standart" : String(x));
const yuvarla = (n) => Math.round(Number(n) * 1e6) / 1e6;

function stokOku() {
  const urunler = jsonSorgu("select id, ad, kategori from public.urunler order by id");
  const v = jsonSorgu("select * from public.varyantlar");
  const h = jsonSorgu("select * from public.stok_hareketleri order by tarih desc, id");
  return urunler.map((u) => ({
    ...u,
    variants: v.filter((x) => x.urun_id === u.id).map((x) => ({ renk: x.renk, renkId: x.renk_id || null, beden: x.beden, miktar: yuvarla(x.miktar), minStok: Number(x.min_stok) || 0 })),
    hareketler: h.filter((x) => x.urun_id === u.id).map((x) => {
      const { ek, urun_id, fis_no, siparis_no, cari_id, uretim_id, siparis_id, kalem_id, rezervasyon_siparis_id, fazla_gonderim, ...kalan } = x;
      return { ...(ek || {}), ...kalan, fisNo: fis_no, siparisNo: siparis_no, cariId: cari_id, uretimId: uretim_id, siparisId: siparis_id,
        kalemId: kalem_id, rezervasyonSiparisId: rezervasyon_siparis_id, fazlaGonderim: fazla_gonderim, miktar: Number(x.miktar) };
    }),
  }));
}
function carilerOku() {
  const c = jsonSorgu("select id, unvan from public.cariler order by id");
  const h = jsonSorgu("select * from public.cari_hareketleri");
  return c.map((x) => ({ ...x, hareketler: h.filter((y) => y.cari_id === x.id).map((y) => { const { cari_id, ...k } = E.kayitaCevir(y); return E.ekiKokeAc(k); }) }));
}
const muhasebeOku = () => JSON.parse(psql("select veri from public.muhasebe limit 1;"));
function stokOzet(stok) {
  const m = {};
  stok.forEach((u) => (u.hareketler || []).forEach((h) => { const k = `${u.id}|${std(h.renk)}|${std(h.beden)}`; m[k] = yuvarla((m[k] || 0) + Number(h.miktar || 0)); }));
  Object.keys(m).forEach((k) => { if (m[k] === 0) delete m[k]; });
  return m;
}
const cariOzet = (cariler) => cariler.map((c) => `${c.id}:${(c.hareketler || []).map((h) => `${h.id}/${h.fisNo}/${h.tutar}`).sort().join(",")}`).join(";");
const kasaOzet = (m) => (m.kasalar || []).map((k) => `${k.id}:${(k.hareketler || []).map((h) => `${h.id}/${h.fisNo || ""}/${h.tutar}`).sort().join(",")}`).join(";");

(async () => {
  E.stokV2AktifAyarla(true); E.cariV2AktifAyarla(true); E.altV2AktifAyarla(true); E.kasaV2AktifAyarla(true);
  E.fisDefteriKuruluAyarla(true);
  bekle("0: kurallar açık", psql("select public.fis_kural_aktif();"), "t");
  E.stokV2TanimlarAyarla(JSON.parse(psql("select veri from public.tanimlar where id = 'tekil';")));
  let stok = stokOku();
  let cariler = carilerOku();
  let muhasebe = muhasebeOku();
  E.tabloBaslangicTam("urunler", derin(stok));
  E.tabloBaslangicTam("cariler", derin(cariler));
  E.tekilTabanAyarla("muhasebe", derin(muhasebe));

  console.log("1) Satış fişi + peşin tahsilat (bağlı makbuz)");
  const tarih = "2026-10-30";
  const fisGovdesi = {
    fisNo: E.FIS_YER, tip: "Satış", cariId: "c-yeni", kaynak: "Satış", stokTarihi: `${tarih}T10:00:00.000Z`, cariTarihi: tarih,
    zaman: new Date().toISOString(), kayitParaBirimi: "TRY", kurlar: {}, kurZorunlu: true, tutarYuvarla: true, birimFiyatBolerek: false,
    yon: E.hareketYonu("Satış"), kullanici: "Ali", defter: "Genel", odemeSekli: "Nakit", vade: "",
    pesin: { tutar: 100, hesapId: "K1", hesapTur: "kasa", hesapAd: "Merkez Kasa", paraBirimi: "TRY", hesapPB: "TRY" },
    siparis: null,
    kalemler: [{ urunId: "u-yeni", urunAd: "Yeni Ürün", renk: "Siyah", beden: "", birim: "çift", miktar: 2, birimFiyat: 150, paraBirimi: "TRY" }],
    stokAciklama: () => `Satış fişi · ${E.FIS_YER}`,
    cariAciklama: (k) => `Cariye Satış fişi: ${k.urunAd} · ${k.renk} · ${k.miktar}`,
  };
  const sonuc = E.fisYaz(stok, cariler, fisGovdesi);
  const zaman = new Date().toISOString();
  const { yuk, p } = E.stokFisiSunucuYuku({ cariId: "c-yeni", tip: "Satış", fis: { fisNo: "TED-77" }, fisGovdesi, sonuc, kalemler: fisGovdesi.kalemler,
    kayitPB: "TRY", fisAciklamasi: "Cariye Satış fişi", siparisler: [], kullaniciAd: "Ali", zaman, istek: "uu-istek-1" });
  const r = await E.fisKesGonder(yuk);
  const no = r.fisNo, bno = r.bagliFisNo;
  bekle("1: numaralar sunucudan", [/^SF-\d{9}$/.test(no), /^TH-\d{9}$/.test(bno)], [true, true]);
  bekle("1: sunucuda satırlar", psql(`select (select count(*) from public.stk_hareket where fis_id = '${no}') || '/' || (select count(*) from public.car_hareket where fis_id = '${no}') || '/' || (select count(*) from public.car_hareket where fis_id = '${bno}') || '/' || (select count(*) from public.kas_hareket where fis_id = '${bno}');`), "1/1/1/1");
  bekle("1: belge no ek bilgide, açıklamada numara", psql(`select (ek ->> 'belgeNo') || '|' || (select aciklama from public.stk_hareket where fis_id = '${no}') from public.stk_fis where id = '${no}';`), `TED-77|Satış fişi · ${no}`);
  const s = E.stokFisiSunucuSonucu({ p, sonuc, yuk, no, bno, cariId: "c-yeni", fisGovdesi, kullaniciAd: "Ali", zaman });
  // Uygulamanın yaptığı: yerel durum + taban
  const stokEskiler = stok.filter((u) => u.id === "u-yeni");
  const stokYeniler = s.yeniStok.filter((u) => u.id === "u-yeni");
  stok = E.stokMiktarlariniHesapla(E.degisenKayitlariBirlestir(stok, stokEskiler, stokYeniler));
  E.fisKesTabaniKur("urunler", stokEskiler, E.stokMiktarlariniHesapla(stokYeniler));
  const cariEski = cariler.find((c) => c.id === "c-yeni");
  const cariYeni = { ...cariEski, hareketler: [...s.yeniCariHareketleri, ...(cariEski.hareketler || [])] };
  cariler = cariler.map((c) => (c.id === "c-yeni" ? cariYeni : c));
  E.fisKesTabaniKur("cariler", [cariEski], [cariYeni]);
  muhasebe = E.hesabaHareketEkle(muhasebe, "kasa", "K1", s.kasaHareketi);
  E.fisKesKasaTabaniKur([{ hesapTur: "kasa", hesapId: "K1", hareket: s.kasaHareketi }]);
  bekle("1: yerel numaralar", [s.yeniCariHareketleri.map((h) => h.fisNo).sort(), s.kasaHareketi.fisNo, String(s.kasaHareketi.aciklama).includes(no)], [[no, bno].sort(), bno, true]);

  console.log("2) Olağan eşitleme hiçbir satırı yeniden göndermez (kurallar açık)");
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  await E.supabaseTabloEsitle("cariler", cariler);
  await E.tekilYaz("muhasebe:data", "muhasebe", muhasebe);
  const satirliCagri = cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal)":\[\{|"(iptal|hareketIptal)":\["/));
  bekle("2: satır gönderen istek yok", satirliCagri.map((c) => c.rpcAdi), []);
  bekle("2: bekleyen yazma yok", Object.keys(E.bekleyenYazmalariOku()), []);
  bekle("2: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));
  bekle("2: bulut cari = ekran", cariOzet(carilerOku()), cariOzet(cariler));
  bekle("2: bulut kasa = ekran", kasaOzet(muhasebeOku()), kasaOzet(muhasebe));
  const liste = jsonSorgu(`select veri from public.fis_listesi where id in ('${no}', '${bno}') order by id`).map((x) => x.veri);
  bekle("2: fiş listesi (makbuz + fiş, bağlı)", liste.map((f) => `${f.fisNo}:${f.aile}:${f.bagliFis}:${f.stokHareketleri.length}/${f.cariHareketleri.length}/${f.kasaHareketleri.length}`).sort(),
    [`${bno}:para:${no}:0/1/1`, `${no}:stok:${bno}:1/1/0`].sort());

  console.log("3) Geri al: fiş + makbuz iptal");
  const g = E.fisGeriAl({ stok, cariler, siparisler: [], uretim: [], muhasebe, koliler: [], faturalar: [] },
    { hareketIdler: [...p.kimlikler, ...s.yeniCariHareketleri.map((h) => h.id)], kullanici: "Ali" });
  const etkStok = E.fisKesEtkilenen(stok, g.stok, E.fisKesDegisenIdler(stok, g.stok));
  const etkCari = E.fisKesEtkilenen(cariler, g.cariler, E.fisKesDegisenIdler(cariler, g.cariler));
  await E.fisIptalGonder(no, "Geri alındı", null);
  bekle("3: sunucuda iptal (fiş, makbuz, satırlar)", psql(`select bool_and(iptal)::text from (select iptal from public.stk_fis where id in ('${no}', '${bno}') union all select iptal from public.stk_hareket where fis_id = '${no}' union all select iptal from public.car_hareket where fis_id in ('${no}', '${bno}') union all select iptal from public.kas_hareket where fis_id = '${bno}') x;`), "true");
  stok = E.stokMiktarlariniHesapla(g.stok);
  E.fisKesTabaniKur("urunler", etkStok.eskiler, E.stokMiktarlariniHesapla(etkStok.yeniler));
  cariler = g.cariler;
  E.fisKesTabaniKur("cariler", etkCari.eskiler, etkCari.yeniler);
  const k = E.kasadanBaglariCikar(g.muhasebe, g.muhasebeBagIdler);
  muhasebe = k.muhasebe;
  E.fisKesKasaTabaniKur([], k.silinen);
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  await E.supabaseTabloEsitle("cariler", cariler);
  await E.tekilYaz("muhasebe:data", "muhasebe", muhasebe);
  bekle("3: iptalden sonra satır gönderen istek yok", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("3: bekleyen yazma yok", Object.keys(E.bekleyenYazmalariOku()), []);
  bekle("3: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));
  bekle("3: bulut cari = ekran", cariOzet(carilerOku()), cariOzet(cariler));
  bekle("3: bulut kasa = ekran", kasaOzet(muhasebeOku()), kasaOzet(muhasebe));

  console.log("4) Sipariş teslimi (satış siparişinin 2 / 3'ü sevk) — fiş + stok + cari + kalemin karşılananı tek işlemde");
  psql(`insert into public.siparisler (id, siparis_no, tip, cari_id, durum) values ('sip-t', 'SS-9', 'Satış', 'c-yeni', 'Bekliyor');
        insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, karsilanan, fiyat, para_birimi, birim, sira)
        values ('k-t', 'sip-t', 'u-yeni', 'Yeni Ürün', 'Siyah', null, 3, 0, 100, 'TRY', 'çift', 0);`);
  const sip = { id: "sip-t", siparisNo: "SS-9", tip: "Satış", cariId: "c-yeni", durum: "Bekliyor", defterTercihi: "Genel",
    kalemler: [{ id: "k-t", urunId: "u-yeni", urunAd: "Yeni Ürün", renk: "Siyah", beden: null, miktar: 3, karsilanan: 0, birimFiyat: 100, paraBirimi: "TRY", birim: "çift" }] };
  let siparisler = [sip];
  E.tabloBaslangicTam("siparisler", derin(siparisler));
  const fisGovdesi2 = {
    fisNo: E.FIS_YER, tip: "Satış", cariId: "c-yeni", kaynak: "Satış", stokTarihi: `${tarih}T11:00:00.000Z`, cariTarihi: tarih, zaman: new Date().toISOString(),
    kayitParaBirimi: null, kurlar: {}, kurZorunlu: false, tutarYuvarla: false, birimFiyatBolerek: true, yon: E.hareketYonu("Satış"), kullanici: "Ali",
    defter: "Genel", odemeSekli: "Nakit", vade: "", siparis: { id: "sip-t", siparisNo: "SS-9", rezervasyonSiparisId: null },
    kalemler: [{ urunId: "u-yeni", urunAd: "Yeni Ürün", renk: "Siyah", beden: null, birim: "çift", miktar: 2, birimFiyat: 100, paraBirimi: "TRY", kalemId: "k-t", kalan: 3, fazlaGonderim: false, _siparisId: "sip-t" }],
    cariAciklama: (k) => `Satış Siparişi SS-9: ${k.urunAd} · ${k.miktar}`,
  };
  const sonuc2 = E.fisYaz(stok, cariler, fisGovdesi2);
  const nextSiparisler = [{ ...sip, durum: "Kısmi Teslim", teslimSayaci: 1, kalemler: [{ ...sip.kalemler[0], karsilanan: 2 }] }];
  const defterKaydi2 = E.fisDefterKaydiKur(fisGovdesi2, sonuc2, { kullanici: "Ali" });
  const t = E.siparisTeslimSunucuYuku({ siparis: sip, fisGovdesi2, sonuc: sonuc2, islenenler: fisGovdesi2.kalemler, defterKaydi: defterKaydi2,
    oncekiSiparisler: siparisler, nextSiparisler, etkilenenIdler: new Set(["sip-t"]), yeniSayac: 1, kullaniciAd: "Ali", zaman, istek: "uu-istek-teslim" });
  const r2 = await E.fisKesGonder(t.yuk);
  const no2 = r2.fisNo;
  bekle("4: sunucuda fiş + satırlar + karşılanan", psql(`select (select siparis_no from public.stk_fis where id = '${no2}') || '/' || (select count(*) from public.stk_hareket where fis_id = '${no2}') || '/' || (select count(*) from public.car_hareket where fis_id = '${no2}') || '/' || (select karsilanan from public.siparis_kalemleri where id = 'k-t');`), "SS-9/1/1/2");
  const doldur2 = (x) => E.fisYerTutucuDoldur(x, no2);
  const stokEski2 = stok.filter((u) => u.id === "u-yeni");
  const stokYeni2 = sonuc2.stok.filter((u) => u.id === "u-yeni").map((u) => ({ ...u, hareketler: u.hareketler.map((h) => (t.kimlikler.has(h.id) ? doldur2(h) : h)) }));
  stok = E.stokMiktarlariniHesapla(E.degisenKayitlariBirlestir(stok, stokEski2, stokYeni2));
  E.fisKesTabaniKur("urunler", stokEski2, E.stokMiktarlariniHesapla(stokYeni2));
  const cariEski2 = cariler.find((c) => c.id === "c-yeni");
  const cariYeni2 = { ...cariEski2, hareketler: [...t.cariHareketleri.map(doldur2), ...(cariEski2.hareketler || [])] };
  cariler = cariler.map((c) => (c.id === "c-yeni" ? cariYeni2 : c));
  E.fisKesTabaniKur("cariler", [cariEski2], [cariYeni2]);
  E.fisKesTabaniKur("siparisler", t.etkSiparis.eskiler, t.etkSiparis.yeniler, { anaDahil: false });
  siparisler = nextSiparisler;
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  await E.supabaseTabloEsitle("cariler", cariler);
  await E.supabaseTabloEsitle("siparisler", siparisler);
  bekle("4: eşitleme hiçbir satırı yeniden göndermedi", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("4: bekleyen yazma yok", Object.keys(E.bekleyenYazmalariOku()), []);
  bekle("4: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));
  bekle("4: bulut cari = ekran", cariOzet(carilerOku()), cariOzet(cariler));

  console.log("5) Siparişten satış fişi (fiş formu, kalem siparişe bağlı): kalan 1 çift — sipariş kalemi tamamlanır");
  const fisGovdesi3 = { ...fisGovdesi, pesin: null, siparis: null,
    kalemler: [{ urunId: "u-yeni", urunAd: "Yeni Ürün", renk: "Siyah", beden: "", birim: "çift", miktar: 1, birimFiyat: 100, paraBirimi: "TRY",
      siparis: { id: "sip-t", siparisNo: "SS-9", rezervasyonSiparisId: null }, kalemId: "k-t" }] };
  const sonuc3 = E.fisYaz(stok, cariler, fisGovdesi3);
  const f3 = E.stokFisiSunucuYuku({ cariId: "c-yeni", tip: "Satış", fis: {}, fisGovdesi: fisGovdesi3, sonuc: sonuc3, kalemler: fisGovdesi3.kalemler,
    kayitPB: "TRY", fisAciklamasi: "Siparişten satış", siparisler, kullaniciAd: "Ali", zaman, istek: "uu-istek-sip" });
  bekle("5: yükte sipariş kalemi (karşılanan 3)", ((f3.yuk.alt || {}).siparis_kalemleri || { satirlar: [] }).satirlar.map((x) => `${x.id}:${x.karsilanan}`), ["k-t:3"]);
  const r3 = await E.fisKesGonder(f3.yuk);
  bekle("5: sunucuda karşılanan 3, fişte sipariş bağı", psql(`select (select karsilanan from public.siparis_kalemleri where id = 'k-t') || '/' || (select siparis_no from public.stk_hareket where fis_id = '${r3.fisNo}');`), "3/SS-9");
  const s3 = E.stokFisiSunucuSonucu({ p: f3.p, sonuc: sonuc3, yuk: f3.yuk, no: r3.fisNo, bno: null, cariId: "c-yeni", fisGovdesi: fisGovdesi3, kullaniciAd: "Ali", zaman });
  const stokEski3 = stok.filter((u) => u.id === "u-yeni");
  const stokYeni3 = s3.yeniStok.filter((u) => u.id === "u-yeni");
  stok = E.stokMiktarlariniHesapla(E.degisenKayitlariBirlestir(stok, stokEski3, stokYeni3));
  E.fisKesTabaniKur("urunler", stokEski3, E.stokMiktarlariniHesapla(stokYeni3));
  const cariEski3 = cariler.find((c) => c.id === "c-yeni");
  const cariYeni3 = { ...cariEski3, hareketler: [...s3.yeniCariHareketleri, ...(cariEski3.hareketler || [])] };
  cariler = cariler.map((c) => (c.id === "c-yeni" ? cariYeni3 : c));
  E.fisKesTabaniKur("cariler", [cariEski3], [cariYeni3]);
  E.fisKesTabaniKur("siparisler", f3.p.etkSiparis.eskiler, f3.p.etkSiparis.yeniler, { anaDahil: false });
  siparisler = E.degisenKayitlariBirlestir(siparisler, siparisler, f3.p.yeniSiparisler);
  bekle("5: sipariş tamamlandı (ekranda)", siparisler[0].durum, "Tamamlandı");
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  await E.supabaseTabloEsitle("cariler", cariler);
  await E.supabaseTabloEsitle("siparisler", siparisler);
  bekle("5: eşitleme hiçbir satırı yeniden göndermedi", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("5: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));
  bekle("5: bulut cari = ekran", cariOzet(carilerOku()), cariOzet(cariler));

  console.log("6) Üretim teslimi TEK fiş (ÜRT): hammadde çıkışı + mamul girişi + işçilik + atamanın teslimi tek işlemde; geri al = iptal");
  psql(`insert into public.urunler (id, ad, kategori) values ('u-ham', 'Deri', 'Hammadde') on conflict do nothing;
        insert into public.cariler (id, unvan, tip) values ('c-per', 'Usta Veli', 'Personel') on conflict do nothing;
        insert into public.uretim (id, siparis_no, urun_id, asama) values ('ur-1', 'U-1', 'u-yeni', 'Kesim') on conflict do nothing;
        insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, tamamlandi_mi)
        values ('a-1', 'ur-1', 'Kesim', 'c-per', '{"Standart": 2}', 2, true, false) on conflict do nothing;`);
  stok = stokOku();
  cariler = carilerOku();
  E.tabloBaslangicTam("urunler", derin(stok));
  E.tabloBaslangicTam("cariler", derin(cariler));
  const atama = { id: "a-1", personelId: "c-per", bedenMiktarlari: { Standart: 2 }, miktar: 2, verildiMi: true, verilmeTarihi: null, tamamlandiMi: false, tamamlanmaTarihi: null };
  const uretimKaydi = { id: "ur-1", siparisNo: "U-1", urunId: "u-yeni", model: "Yeni Ürün", renk: "Siyah", asama: "Kesim",
    bedenMiktarlari: [{ beden: "Standart", miktar: 2 }], prosesIlerleme: [{ proses: "Kesim", atamalar: [atama], tamamlandiMi: false }] };
  let uretim = [uretimKaydi];
  E.tabloBaslangicTam("uretim", derin(uretim));
  // Uygulamanın teslim hesabının çıktısı (079): yer tutuculu satırlar, satır türü `uretimFisAdi`nda.
  const ad = (x) => ({ fisNo: E.FIS_YER, uretimFisAdi: x });
  const zamanU = "2026-10-31T09:00:00.000Z";
  const yeniStokU = stok.map((u) => (u.id === "u-ham"
    ? { ...u, hareketler: [{ id: "uh-1", tarih: zamanU, renk: "Siyah", beden: "Standart", miktar: -3, kaynak: "Üretim", siparisNo: "U-1", uretimId: "ur-1", ...ad("U-1-Kesim") }, ...(u.hareketler || [])] }
    : u.id === "u-yeni"
      ? { ...u, hareketler: [{ id: "uh-2", tarih: zamanU, renk: "Siyah", beden: "Standart", miktar: 2, kaynak: "Üretim", siparisNo: "U-1", uretimId: "ur-1", ...ad("U-1-Kesim-Giriş") }, ...(u.hareketler || [])] }
      : u));
  const yeniCarilerU = cariler.map((c) => (c.id === "c-per"
    ? { ...c, hareketler: [{ id: "uc-1", tarih: "2026-10-31", zaman: zamanU, islemTipi: "İşçilik", yon: E.hareketYonu("İşçilik"), tutar: 40, defter: "Genel",
        siparisNo: "U-1", uretimId: "ur-1", miktar: 2, birimFiyat: 20, aciklama: "Kesim işçilik ücreti — Yeni Ürün · 2 adet × 20 ₺", ...ad("U-1-Kesim-İşçilik") }, ...(c.hareketler || [])] }
    : c));
  const yeniUretimU = [{ ...uretimKaydi, asama: "Tamamlandı", stogaEklendiMi: true, prosesIlerleme: [{ proses: "Kesim", tamamlandiMi: true,
    atamalar: [{ ...atama, tamamlandiMi: true, tamamlanmaTarihi: zamanU, fisNo: "U-1-Kesim", sonuc: { saglam: { Standart: 2 }, tamir: [], hurda: [] } }] }] }];
  const h6 = E.uretimTeslimSunucuYuku({ siparis: uretimKaydi, prosesAdi: "Kesim", atamaFisAdi: "U-1-Kesim", eskiStok: stok, yeniStok: yeniStokU,
    eskiCariler: cariler, yeniCariler: yeniCarilerU, eskiUretim: uretim, yeniUretim: yeniUretimU, eskiSiparisler: [], yeniSiparisler: [],
    kullaniciAd: "Ali", istek: "uu-istek-uretim" });
  bekle("6: yük (aile, satır, atama)", [h6.bos, h6.yuk.fis.aile, h6.yuk.stok.satirlar.length, h6.yuk.cari.satirlar.length,
    h6.yuk.alt.uretim_atamalari.satirlar.map((x) => `${x.id}:${x.tamamlandi_mi}`)], [false, "stok", 2, 1, ["a-1:true"]]);
  const r6 = await E.fisKesGonder(h6.yuk);
  const no6 = r6.fisNo;
  bekle("6: sunucuda ÜRT fişi + 2 stok + 1 cari satırı + atama teslim alındı", [/^ÜRT-\d{9}$/.test(no6),
    psql(`select (select count(*) from public.stk_hareket where fis_id = '${no6}') || '/' || (select count(*) from public.car_hareket where fis_id = '${no6}') || '/' || (select tamamlandi_mi from public.uretim_atamalari where id = 'a-1') || '/' || (select uretim_id from public.stk_fis where id = '${no6}');`)],
    [true, "2/1/true/ur-1"]);
  bekle("6: satır türü sunucuda (ek)", psql(`select string_agg(ek ->> 'uretimFisAdi', ',' order by id) from public.stk_hareket where fis_id = '${no6}';`), "U-1-Kesim,U-1-Kesim-Giriş");
  // Uygulamanın yaptığı (079 uretimTeslimSunucuyaKes): numara yerleşir, durum + taban.
  const d6 = (x) => E.fisYerTutucuDoldur(x, no6);
  const stokYeni6 = d6(h6.etkStok.yeniler);
  stok = E.stokMiktarlariniHesapla(E.degisenKayitlariBirlestir(stok, h6.etkStok.eskiler, stokYeni6));
  E.fisKesTabaniKur("urunler", h6.etkStok.eskiler, E.stokMiktarlariniHesapla(stokYeni6));
  const cariYeni6 = d6(h6.etkCari.yeniler);
  cariler = E.degisenKayitlariBirlestir(cariler, h6.etkCari.eskiler, cariYeni6);
  E.fisKesTabaniKur("cariler", h6.etkCari.eskiler, cariYeni6);
  E.fisKesTabaniKur("uretim", h6.etkUretim.eskiler, yeniUretimU, { anaDahil: false });
  uretim = yeniUretimU;
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  await E.supabaseTabloEsitle("cariler", cariler);
  await E.supabaseTabloEsitle("uretim", uretim);
  bekle("6: eşitleme hiçbir satırı yeniden göndermedi (atama dahil)", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("6: bekleyen yazma yok", Object.keys(E.bekleyenYazmalariOku()), []);
  bekle("6: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));
  bekle("6: bulut cari = ekran", cariOzet(carilerOku()), cariOzet(cariler));
  bekle("6: buluttan okunan satır türünü taşıyor", stokOku().flatMap((u) => u.hareketler).filter((h) => h.fisNo === no6).map((h) => h.uretimFisAdi).sort(), ["U-1-Kesim", "U-1-Kesim-Giriş"]);

  console.log("7) Üretim teslimini geri al: fiş ailesi satır türünden bulunur, fiş iptal, atama geri döner (tek işlem)");
  const g7 = E.fisGeriAl({ stok, cariler, siparisler: [], uretim, muhasebe, koliler: [], faturalar: [] },
    { uretimHedefi: { uretimId: "ur-1", prosesAdi: "Kesim", atamaId: "a-1" }, uretimeIzinVer: true });
  bekle("7: geri alınan satırlar (3)", [g7.silinenStok, g7.silinenCari], [2, 1]);
  const ss7 = E.uretimSunucuFisSatirlari(g7.silinenStokKayitlari, g7.silinenCariKayitlari);
  bekle("7: iptal edilecek fiş", ss7.fisler, [no6]);
  const etkU7 = E.fisKesEtkilenen(uretim, g7.uretim, ["ur-1"]);
  const af7 = E.fisKesAltFarki("uretim", "uretim_atamalari", etkU7.eskiler[0], etkU7.yeniler[0]);
  await E.fisIptalGonder(no6, "Üretim teslimi geri alındı", { uretim_atamalari: af7 });
  bekle("7: sunucuda fiş + satırlar iptal, atama teslim alınmadı", psql(`select (select bool_and(iptal)::text from (select iptal from public.stk_fis where id = '${no6}' union all select iptal from public.stk_hareket where fis_id = '${no6}' union all select iptal from public.car_hareket where fis_id = '${no6}') x) || '/' || (select tamamlandi_mi from public.uretim_atamalari where id = 'a-1');`), "true/false");
  E.fisKesTabandanCikar("urunler", "stok_hareketleri", ss7.stokIdler);
  E.fisKesTabandanCikar("cariler", "cari_hareketleri", ss7.cariIdler);
  E.fisKesTabaniKur("uretim", etkU7.eskiler, etkU7.yeniler, { anaDahil: false });
  stok = E.stokMiktarlariniHesapla(g7.stok);
  cariler = g7.cariler;
  uretim = g7.uretim;
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  await E.supabaseTabloEsitle("cariler", cariler);
  await E.supabaseTabloEsitle("uretim", uretim);
  bekle("7: eşitleme hiçbir satırı göndermedi (silme yok)", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("7: bekleyen yazma yok", Object.keys(E.bekleyenYazmalariOku()), []);
  bekle("7: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));
  bekle("7: bulut cari = ekran", cariOzet(carilerOku()), cariOzet(cariler));

  console.log("8) Ardışık iki ara proses iş verirken tamamlanır: her biri kendi ÜRT fişi, yeni atama SON fişle; biri geri alınır");
  psql(`insert into public.uretim (id, siparis_no, urun_id, asama) values ('ur-2', 'U-2', 'u-yeni', 'Saya') on conflict do nothing;`);
  stok = stokOku();
  cariler = carilerOku();
  E.tabloBaslangicTam("urunler", derin(stok));
  E.tabloBaslangicTam("cariler", derin(cariler));
  const araAdim = (ad) => ({ proses: ad, araProsesMi: true, araProsesId: `ap-${ad}`, araProsesCariId: "c-per", tamamlandiMi: false, verildiMi: false, atamalar: [] });
  const ur2 = { id: "ur-2", siparisNo: "U-2", urunId: "u-yeni", model: "Yeni Ürün", renk: "Siyah", asama: "Kesim", bedenMiktarlari: [{ beden: "Standart", miktar: 1 }],
    prosesIlerleme: [{ proses: "Kesim", tamamlandiMi: true, atamalar: [] }, araAdim("Boya"), araAdim("Cila"), { proses: "Saya", tamamlandiMi: false, atamalar: [] }] };
  uretim = [ur2];
  E.tabloBaslangicTam("uretim", derin(uretim));
  const yeniAtama2 = { id: "a-2", personelId: "c-per", bedenMiktarlari: { Standart: 1 }, miktar: 1, verildiMi: true, verilmeTarihi: zamanU, tamamlandiMi: false, tamamlanmaTarihi: null };
  const satir8 = (id, ad, miktar) => ({ id, tarih: zamanU, renk: "Siyah", beden: "Standart", miktar, kaynak: "Üretim", siparisNo: "U-2", uretimId: "ur-2", fisNo: E.FIS_YER, uretimFisAdi: ad });
  const yeniStok8 = stok.map((u) => (u.id === "u-ham" ? { ...u, hareketler: [satir8("uh-b", "U-2-Boya", -0.5), satir8("uh-c", "U-2-Cila", -0.25), ...(u.hareketler || [])] } : u));
  const yeniCari8 = cariler.map((c) => (c.id === "c-per" ? { ...c, hareketler: [{ id: "uc-b", tarih: "2026-10-31", zaman: zamanU, islemTipi: "İşçilik", yon: E.hareketYonu("İşçilik"),
    tutar: 5, defter: "Genel", siparisNo: "U-2", uretimId: "ur-2", fisNo: E.FIS_YER, uretimFisAdi: "U-2-Boya-İşçilik" }, ...(c.hareketler || [])] } : c));
  const tamam = (a) => ({ ...a, tamamlandiMi: true, verildiMi: true, personelId: "c-per", tamamlanmaTarihi: zamanU });
  const yeniUretim8 = [{ ...ur2, prosesIlerleme: [ur2.prosesIlerleme[0], tamam(ur2.prosesIlerleme[1]), tamam(ur2.prosesIlerleme[2]), { ...ur2.prosesIlerleme[3], atamalar: [yeniAtama2] }] }];
  const ortak8 = { siparis: ur2, eskiStok: stok, yeniStok: yeniStok8, eskiCariler: cariler, yeniCariler: yeniCari8, eskiUretim: uretim, yeniUretim: yeniUretim8,
    eskiSiparisler: [], yeniSiparisler: [], kullaniciAd: "Ali" };
  const hz = ["Boya", "Cila"].map((p, i) => E.uretimTeslimSunucuYuku({ ...ortak8, prosesAdi: p, atamaFisAdi: `U-2-${p}`, istek: `uu-ara-${p}`,
    aile: new Set([`U-2-${p}`, `U-2-${p}-İşçilik`]), altDahil: i === 1 }));
  bekle("8: yükler (satır sayısı, alt yalnız sonda)", hz.map((h) => `${h.yuk.stok.satirlar.length}/${h.yuk.cari.satirlar.length}/${h.yuk.alt ? h.yuk.alt.uretim_atamalari.satirlar.map((x) => x.id).join("+") : "-"}`), ["1/1/-", "1/0/a-2"]);
  const nolar8 = [];
  for (const h of hz) nolar8.push((await E.fisKesGonder(h.yuk)).fisNo);
  bekle("8: iki ayrı fiş, satırlar doğru fişte, atama yazıldı", psql(`select (select count(*) from public.stk_hareket where fis_id = '${nolar8[0]}') || '/' || (select count(*) from public.car_hareket where fis_id = '${nolar8[0]}') || '/' || (select count(*) from public.stk_hareket where fis_id = '${nolar8[1]}') || '/' || (select count(*) from public.uretim_atamalari where id = 'a-2');`), "1/1/1/1");
  const numaralar8 = new Map([["U-2-Boya", nolar8[0]], ["U-2-Boya-İşçilik", nolar8[0]], ["U-2-Cila", nolar8[1]], ["U-2-Cila-İşçilik", nolar8[1]]]);
  const dold8 = (x) => E.fisYerTutucuAileyeDoldur(x, numaralar8);
  let ekranStok = stok;
  E.fisKesStokUygula((f) => { ekranStok = E.stokMiktarlariniHesapla(f(ekranStok)); }, hz[0].etkStok, dold8);
  stok = ekranStok;
  const cariYeni8 = dold8(hz[0].etkCari.yeniler);
  cariler = E.degisenKayitlariBirlestir(cariler, hz[0].etkCari.eskiler, cariYeni8);
  E.fisKesTabaniKur("cariler", hz[0].etkCari.eskiler, cariYeni8);
  E.fisKesTabaniKur("uretim", hz[1].etkUretim.eskiler, yeniUretim8, { anaDahil: false });
  uretim = yeniUretim8;
  bekle("8: ekranda her satır kendi fişinin numarası", stok.find((u) => u.id === "u-ham").hareketler.filter((h) => ["uh-b", "uh-c"].includes(h.id)).map((h) => `${h.id}:${h.fisNo === nolar8[0] ? 1 : h.fisNo === nolar8[1] ? 2 : "?"}`).sort(), ["uh-b:1", "uh-c:2"]);
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  await E.supabaseTabloEsitle("cariler", cariler);
  await E.supabaseTabloEsitle("uretim", uretim);
  bekle("8: eşitleme hiçbir satırı yeniden göndermedi", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("8: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));
  bekle("8: bulut cari = ekran", cariOzet(carilerOku()), cariOzet(cariler));
  // Cila'yı geri al (önce iş vermeyi geri almış gibi: Saya ataması kaldırılır, sonra ara proses).
  const uretimGeri = [{ ...uretim[0], prosesIlerleme: uretim[0].prosesIlerleme.map((p) => (p.proses === "Saya" ? { ...p, atamalar: [] } : p)) }];
  const g8 = E.fisGeriAl({ stok, cariler, siparisler: [], uretim: uretimGeri, muhasebe, koliler: [], faturalar: [] },
    { uretimHedefi: { uretimId: "ur-2", prosesAdi: "Cila", atamaId: null }, uretimeIzinVer: true });
  const ss8 = E.uretimSunucuFisSatirlari(g8.silinenStokKayitlari, g8.silinenCariKayitlari);
  bekle("8: Cila geri alınınca yalnız Cila fişi", [ss8.fisler, ss8.stokIdler], [[nolar8[1]], ["uh-c"]]);
  await E.fisIptalGonder(nolar8[1], "Ara proses geri alındı", null);
  E.fisKesTabandanCikar("urunler", "stok_hareketleri", ss8.stokIdler);
  stok = E.stokMiktarlariniHesapla(g8.stok);
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  bekle("8: geri almada satır gönderilmedi", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("8: Boya fişi yerinde, Cila iptal", psql(`select (select iptal from public.stk_fis where id = '${nolar8[0]}') || '/' || (select iptal from public.stk_fis where id = '${nolar8[1]}');`), "false/true");
  bekle("8: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));

  console.log("9) Numune: NUM fişi sunucudan, hammadde çıkışıyla tek işlemde");
  const yeniStok9 = stok.map((u) => (u.id === "u-ham" ? { ...u, hareketler: [{ id: "un-1", tarih: zamanU, renk: "Siyah", beden: "Standart", miktar: -0.3,
    kaynak: "Numune", fisNo: E.FIS_YER, siparisNo: "M-7", cariId: null, aciklama: "Numune M-7 · 0.5 çift" }, ...(u.hareketler || [])] } : u));
  const h9 = E.stokFisiYuku({ fis: { tur: "Numune", onek: "NUM", kaynak: "Numune", siparisNo: "M-7", kullanici: "Ali", aciklama: "Numune M-7 · 0.5 çift", ek: { modelId: "m-7" } },
    eskiStok: stok, yeniStok: yeniStok9, istek: "uu-numune" });
  const no9 = (await E.fisKesGonder(h9.yuk)).fisNo;
  bekle("9: NUM fişi + 1 satır", [/^NUM-\d{9}$/.test(no9), psql(`select count(*) from public.stk_hareket where fis_id = '${no9}';`)], [true, "1"]);
  ekranStok = stok;
  E.fisKesStokUygula((f) => { ekranStok = E.stokMiktarlariniHesapla(f(ekranStok)); }, h9.etkStok, (x) => E.fisYerTutucuDoldur(x, no9));
  stok = ekranStok;
  bekle("9: defter kaydı", (({ fisNo, aile, tip, sunucu }) => [fisNo === no9, aile, tip, sunucu])(E.sunucuFisKaydi(h9.yuk, no9, h9.stokHareketleri)), [true, "stok", "Numune", true]);
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  bekle("9: eşitleme satır göndermedi", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("9: bekleyen yazma yok", Object.keys(E.bekleyenYazmalariOku()), []);
  bekle("9: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));

  console.log("10) Açılış fişi: hareket karşılığı olmayan miktarlar (iki üründe) TEK ACL fişinde");
  const acStok = stok.map((u) => (u.id === "u-ham" || u.id === "u-yeni"
    ? { ...u, variants: (u.variants || []).map((v, i) => (i === 0 ? { ...v, miktar: yuvarla(Number(v.miktar) + 4) } : v)) } : u));
  const ac = E.acilisFisleriUret(acStok, { fisNoUretici: () => E.FIS_YER, tarih: "2026-10-31" });
  const h10 = E.stokFisiYuku({ fis: { tur: "Açılış", onek: "ACL", kaynak: "Açılış", kullanici: "Ali", aciklama: "Açılış fişi" }, eskiStok: stok, yeniStok: ac.stok, istek: "uu-acilis" });
  bekle("10: yük iki ürünün satırı", [h10.bos, new Set(h10.yuk.stok.satirlar.map((x) => x.urunId)).size], [false, 2]);
  const no10 = (await E.fisKesGonder(h10.yuk)).fisNo;
  bekle("10: tek ACL fişi, iki satır", [/^ACL-\d{9}$/.test(no10), psql(`select count(*) from public.stk_hareket where fis_id = '${no10}';`)], [true, String(h10.yuk.stok.satirlar.length)]);
  ekranStok = stok;
  E.fisKesStokUygula((f) => { ekranStok = E.stokMiktarlariniHesapla(f(ekranStok)); }, h10.etkStok, (x) => E.fisYerTutucuDoldur(x, no10));
  stok = ekranStok;
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("urunler", stok);
  bekle("10: eşitleme satır göndermedi", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("10: bulut stok = ekran", stokOzet(stokOku()), stokOzet(stok));

  console.log("11) Tahsilat makbuzu (cari kartı / Ödeme & Tahsilat / sipariş ödemesi): cari + kasa satırı TEK TH fişi; geri al = iptal");
  cariler = carilerOku();
  muhasebe = muhasebeOku();
  E.tabloBaslangicTam("cariler", derin(cariler));
  E.tekilTabanAyarla("muhasebe", derin(muhasebe));
  const k11 = E.kasaCariHareketiKur({ islemTipi: "Tahsilat", tarih: "2026-10-31", cariId: "c-yeni", cariUnvan: "Yeni Cari", cariTutar: 250, cariPB: "TRY",
    hesapTur: "kasa", hesapId: "K1", hesapAd: "Merkez Kasa", hesapPB: "TRY", hesapTutar: 250, defter: "Genel", aciklama: "", odemeSekli: "Nakit" });
  const h11 = E.paraFisiYuku({ fis: { tur: "Tahsilat", onek: E.paraFisOneki("Tahsilat"), kaynak: "Cari kartı", ek: { belgeNo: "MKB-5" } }, cariId: "c-yeni",
    hareketler: [{ ...k11.cariHareketi, islemTipi: undefined }], kasa: { hesapTur: "kasa", hesapId: "K1", hareket: k11.muhasebeHareketi },
    istek: "uu-tahsilat", zaman: zamanU, kullaniciAd: "Ali" });
  const no11 = (await E.fisKesGonder(h11.yuk)).fisNo;
  bekle("11: TH fişi, 1 cari + 1 kasa satırı, belge no", [/^TH-\d{9}$/.test(no11),
    psql(`select (select count(*) from public.car_hareket where fis_id = '${no11}') || '/' || (select count(*) from public.kas_hareket where fis_id = '${no11}') || '/' || (select ek ->> 'belgeNo' from public.stk_fis where id = '${no11}') || '/' || (select kasa_hesap_id from public.stk_fis where id = '${no11}');`)],
    [true, "1/1/MKB-5/K1"]);
  const d11 = (x) => E.fisYerTutucuDoldur(x, no11);
  const ch11 = d11(h11.cariHareketleri);
  const cEski11 = cariler.find((c) => c.id === "c-yeni");
  const cYeni11 = { ...cEski11, hareketler: [...ch11, ...(cEski11.hareketler || [])] };
  cariler = cariler.map((c) => (c.id === "c-yeni" ? cYeni11 : c));
  E.fisKesTabaniKur("cariler", [cEski11], [cYeni11]);
  const kh11 = d11(h11.kasaHareketi);
  muhasebe = E.hesabaHareketEkle(muhasebe, "kasa", "K1", kh11);
  E.fisKesKasaTabaniKur([{ hesapTur: "kasa", hesapId: "K1", hareket: kh11 }]);
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("cariler", cariler);
  await E.tekilYaz("muhasebe:data", "muhasebe", muhasebe);
  bekle("11: eşitleme satır göndermedi", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("11: bekleyen yazma yok", Object.keys(E.bekleyenYazmalariOku()), []);
  bekle("11: bulut cari = ekran", cariOzet(carilerOku()), cariOzet(cariler));
  bekle("11: bulut kasa = ekran", kasaOzet(muhasebeOku()), kasaOzet(muhasebe));
  const g11 = E.fisGeriAl({ stok, cariler, siparisler: [], uretim: [], muhasebe, koliler: [], faturalar: [] }, { hareketIdler: ch11.map((h) => h.id), kullanici: "Ali" });
  const etkC11 = E.fisKesEtkilenen(cariler, g11.cariler, E.fisKesDegisenIdler(cariler, g11.cariler));
  await E.fisIptalGonder(no11, "Geri alındı", null);
  cariler = g11.cariler;
  E.fisKesTabaniKur("cariler", etkC11.eskiler, etkC11.yeniler);
  const kc11 = E.kasadanBaglariCikar(g11.muhasebe, g11.muhasebeBagIdler);
  muhasebe = kc11.muhasebe;
  E.fisKesKasaTabaniKur([], kc11.silinen);
  bekle("11: geri al kasa bağını buldu", kc11.silinen.length, 1);
  cagrilar.length = 0;
  await E.supabaseTabloEsitle("cariler", cariler);
  await E.tekilYaz("muhasebe:data", "muhasebe", muhasebe);
  bekle("11: iptalden sonra satır gönderilmedi", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("11: sunucuda fiş + iki satır iptal", psql(`select bool_and(iptal)::text from (select iptal from public.stk_fis where id = '${no11}' union all select iptal from public.car_hareket where fis_id = '${no11}' union all select iptal from public.kas_hareket where fis_id = '${no11}') x;`), "true");
  bekle("11: bulut cari = ekran", cariOzet(carilerOku()), cariOzet(cariler));
  bekle("11: bulut kasa = ekran", kasaOzet(muhasebeOku()), kasaOzet(muhasebe));

  console.log("12) Virman: iki kasa / banka ayağı TEK VRM fişi; gider kartı ödemesi: yalnız kasa satırlı GD fişi");
  const hesaplar12 = jsonSorgu("select id from public.kas_hesap order by id").map((x) => x.id);
  const [kA, kB] = [hesaplar12[0], hesaplar12[1] || hesaplar12[0]];
  const tur12 = (id) => ((muhasebe.bankalar || []).some((b) => b.id === id) ? "banka" : "kasa");
  const ortak12 = { tarih: "2026-10-31", virmanMi: true, virmanSebebi: "Döviz bozdurma", defter: "Muhasebe", kullanici: "Ali", muhasebeBagId: "bag-v12" };
  const h12 = E.paraFisiYuku({ fis: { tur: "Virman", onek: E.paraFisOneki("Virman"), kaynak: "Virman", defter: "Muhasebe", ek: { sebep: "Döviz bozdurma" } },
    cariId: null, hareketler: [], kasa: [
      { hesapTur: tur12(kA), hesapId: kA, hareket: { ...ortak12, id: "v12-c", yon: "Çıkış", tutar: 100, aciklama: "Virman →" } },
      { hesapTur: tur12(kB), hesapId: kB, hareket: { ...ortak12, id: "v12-g", yon: "Giriş", tutar: 100, aciklama: "Virman ←" } }],
    istek: "uu-virman", zaman: zamanU, kullaniciAd: "Ali" });
  const no12 = (await E.fisKesGonder(h12.yuk)).fisNo;
  bekle("12: VRM fişi, iki kasa satırı, cari yok", [/^VRM-\d{9}$/.test(no12),
    psql(`select (select count(*) from public.kas_hareket where fis_id = '${no12}') || '/' || (select count(*) from public.car_hareket where fis_id = '${no12}') || '/' || (select aile from public.stk_fis where id = '${no12}');`)],
    [true, "2/0/para"]);
  const ay12 = h12.ayaklar.map((k) => ({ hesapTur: k.hesapTur, hesapId: k.hesapId, hareket: E.fisYerTutucuDoldur(k.hareket, no12) }));
  muhasebe = ay12.reduce((m, k) => E.hesabaHareketEkle(m, k.hesapTur, k.hesapId, k.hareket), muhasebe);
  E.fisKesKasaTabaniKur(ay12);
  const hg = E.paraFisiYuku({ fis: { tur: "Gider", onek: E.paraFisOneki("Gider"), kaynak: "Gelir/Gider kartı", ek: { giderKartId: "gk-kira" } }, cariId: null, hareketler: [],
    kasa: { hesapTur: tur12(kA), hesapId: kA, hareket: { id: "g12", tarih: "2026-10-31", yon: "Çıkış", tutar: 40, defter: "Genel", giderKartId: "gk-kira", giderKartAd: "Kira", aciklama: "Kira" } },
    istek: "uu-gider", zaman: zamanU, kullaniciAd: "Ali" });
  const nog = (await E.fisKesGonder(hg.yuk)).fisNo;
  bekle("12: GD fişi, tek kasa satırı", [/^GD-\d{9}$/.test(nog), psql(`select count(*) from public.kas_hareket where fis_id = '${nog}';`)], [true, "1"]);
  const kg = { hesapTur: tur12(kA), hesapId: kA, hareket: E.fisYerTutucuDoldur(hg.ayaklar[0].hareket, nog) };
  muhasebe = E.hesabaHareketEkle(muhasebe, kg.hesapTur, kg.hesapId, kg.hareket);
  E.fisKesKasaTabaniKur([kg]);
  cagrilar.length = 0;
  await E.tekilYaz("muhasebe:data", "muhasebe", muhasebe);
  bekle("12: eşitleme satır göndermedi", cagrilar.filter((c) => JSON.stringify(c.p).match(/"(satirlar|hareketler|iptal|hareketIptal|sil)":\[("|\{)/)).map((c) => c.rpcAdi), []);
  bekle("12: bekleyen yazma yok", Object.keys(E.bekleyenYazmalariOku()), []);
  bekle("12: bulut kasa = ekran", kasaOzet(muhasebeOku()), kasaOzet(muhasebe));

  console.log(hata ? "── UÇTAN UCA (FİŞ) HATALI ──" : "── uçtan uca (fiş defteri) temiz ──");
  process.exit(hata);
})().catch((e) => { console.error(e); process.exit(1); });
