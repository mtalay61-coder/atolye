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

  console.log(hata ? "── UÇTAN UCA (FİŞ) HATALI ──" : "── uçtan uca (fiş defteri) temiz ──");
  process.exit(hata);
})().catch((e) => { console.error(e); process.exit(1); });
