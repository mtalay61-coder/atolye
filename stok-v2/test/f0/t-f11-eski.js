#!/usr/bin/env node
// F1.1 — ESKİ 1.742.1 İSTEMCİSİ + YENİ SQL (kullanıcı kuralı 5). Canlıdaki istemcinin KENDİ kodu: 20834ea `src/`
// (eski-istemci.sh → .eski-istemci/erp.cjs). Sunucu: bu koşunun veritabanı (bugün 1.743.0; F1.1 kurulunca F1.1).
// Senaryolar eski istemcinin yollarıyla: teslim (081, `artis` yok), sipariş iptali (087/088 + fis_bag_coz), fiş iptali (100
// fisGeriAl — yerel veride bağ çözülmüşse kalem düşümü BOŞ, alt göndermez), kalem birleştirme (075 bekleyenKalemleriBirlestir,
// köprü alt_yaz), yedekten geri yükleme (köprü, kurallar kapalı ve açık).
// Birleştirme ve geri yükleme F1.1'in KAPSAMI DIŞI (kural 6): kırmızı kalmaları beklenir, açık risk olarak raporlanır.
const fs = require("fs");
const path = require("path");
const ESKI = path.join(__dirname, ".eski-istemci");
if (!process.env.F0_ERP) {
  if (!fs.existsSync(path.join(ESKI, "erp.cjs"))) { console.error("eski istemci yok — önce: bash eski-istemci.sh"); process.exit(2); }
  process.env.F0_ERP = path.join(ESKI, "erp.cjs");
}
const KAYNAK = process.env.F0_KAYNAK || path.join(ESKI, "src");
const F = require("./f11-ortak.js");
const { ON, E } = F;
const TEKRAR = Number(process.env.F11_TEKRAR || 3);
const k075 = fs.readFileSync(path.join(KAYNAK, "075-fis-ortak.jsx"), "utf8");
const bb = k075.indexOf("function bekleyenKalemleriBirlestir"), bs = k075.indexOf("\n}\n", bb) + 3;
const bekleyenKalemleriBirlestir = new Function(`${k075.slice(bb, bs)}; return bekleyenKalemleriBirlestir;`)();
const teslim = (s, k, adet, ekran, istek) => F.rpc("fis_kes", F.teslimYuku({ s, kalemId: k, adet, ekran, istek, eski: true }));
const sutunYok = "sütun yok";

(async () => {
  const surum = (fs.readFileSync(path.join(KAYNAK, "015-sabitler.jsx"), "utf8").match(/const SURUM = "([^"]*)"/) || [])[1];
  console.log(`F1.1 eski istemci · ${surum} (${process.env.F0_ERP}) · önek ${ON} · iz sütunları ${F.izSutunlari()}/3 · kurallar ${F.kurallarAcik() ? "açık" : "KAPALI"}`);
  if (typeof E.fisKesKalemArtisi === "function") console.log("  ! uyarı: yüklenen istemcide fisKesKalemArtisi var — 1.742.1 değil");

  // E11.S1 — eski istemci: teslim 3 → sipariş iptali → fiş iptali
  {
    const k = `${ON}-s1k`, s = F.siparisKur(F.sipObj(`${ON}-s1`, [F.kalemObj(k, 20, 0)]));
    const fis = teslim(s, k, 3, 0, `${ON}-s1i`).sonuc.fisNo;
    const ip = await F.siparisIptal(s, F.yerelOku(s));
    const d1 = F.durum(k, fis); const sat = (d1.satirlar || [])[0] || {};
    F.kontrol("E11.siparis-iptali", "eski istemci sipariş iptali: fis_bag_coz + başlık yazması kabul, geçmiş bağ yazılır, karşılanan 3 = hesap 3", {
      sonra: { fisBagCoz: ip.bc, yazma: ip.yazma, karsilanan: d1.karsilanan, hesap: d1.hesap, satirlar: d1.satirlar },
      gercek: [typeof ip.bc === "object", ip.yazma.hata, d1.karsilanan, d1.hesap, F.izVar() ? sat.gecmisKalem : sutunYok], beklenen: [true, null, 3, 3, k] });
    const fy = F.fisIptalYuku(fis, ip.yerel);
    const r = F.rpc("fis_iptal", fy.yuk);
    const d2 = F.durum(k, fis);
    F.kontrol("E11.S1-fis-iptali", "eski istemci S1 fiş iptali: karşılanan 0 = hesap 0, hayalet yok", {
      sonra: { fisIptal: r.ok ? "tamam" : r.hata, istemcininKalemDusumu: fy.kalemDusumu, gonderilenAlt: fy.yuk.alt || null, karsilanan: d2.karsilanan, hesap: d2.hesap,
        D1b: F.denetim(`${ON}-s1`).D1b_hayalet_karsilanan || 0 },
      gercek: [r.ok, d2.karsilanan, d2.hesap, F.denetim(`${ON}-s1`).D1b_hayalet_karsilanan || 0], beklenen: [true, 0, 0, 0] });
  }

  // E11.S2a — eski istemci, zorlanmış eşzamanlı (kalem 1 sn tutulur), iki başlangıç sırası
  for (const [kimlik, ilkIptal] of [["E11.S2a-eszamanli", true], ["E11.S2a-ters-sira", false]]) {
    const kayit = [];
    for (let i = 0; i < TEKRAR; i++) {
      const on = `${ON}-${ilkIptal ? "a" : "b"}${String(i).padStart(3, "0")}`;   // sabit genişlik (denetim öneki)
      const k = `${on}k`, s = F.siparisKur(F.sipObj(on, [F.kalemObj(k, 20, 0)]));
      const fis = teslim(s, k, 3, 0, `${on}i`).sonuc.fisNo;
      const fy = F.fisIptalYuku(fis, F.yerelOku(s));
      const tut = F.oturum(`begin; select id from public.siparis_kalemleri where id = '${k}' for update; select pg_sleep(1); commit;`);
      await F.uyu(200);
      const p1 = ilkIptal ? F.rpcAyri("fis_iptal", fy.yuk) : F.rpcAyri("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo });
      await F.uyu(300);
      const p2 = ilkIptal ? F.rpcAyri("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo }) : F.rpcAyri("fis_iptal", fy.yuk);
      const [r1, r2] = await Promise.all([p1, p2, tut]);
      const d = F.durum(k, fis);
      kayit.push({ ilk: F.kisa(r1), ikinci: F.kisa(r2), karsilanan: d.karsilanan, hesap: d.hesap, D1b: F.denetim(on).D1b_hayalet_karsilanan || 0 });
    }
    const ayri = [...new Set(kayit.map((x) => JSON.stringify(x)))].map((x) => JSON.parse(x));
    F.kontrol(kimlik, `eski istemci S2a (${ilkIptal ? "fiş iptali önce" : "sipariş iptali önce"}) ×${TEKRAR}: ikisi tamam, karşılanan 0 = hesap 0`, {
      sonra: ayri, gercek: ayri, beklenen: [{ ilk: "ok", ikinci: "ok", karsilanan: 0, hesap: 0, D1b: 0 }] });
  }

  // E11.birlestirme — AÇIK RİSK (F2): A (10) 3 teslim, B (10) 4 teslim; bekleyen kalemler birleşir (B silinir)
  {
    const A = `${ON}-mA`, B = `${ON}-mB`, s = F.siparisKur(F.sipObj(`${ON}-m`, [F.kalemObj(A, 10, 0), F.kalemObj(B, 10, 0)]));
    teslim(s, A, 3, 0, `${ON}-mi1`); teslim(s, B, 4, 0, `${ON}-mi2`);
    const yerel = F.yerelOku(s).siparisler;
    const kd = (id) => F.jsonSorgu(`select coalesce(karsilanan, 0)::float as karsilanan, miktar::float as miktar from public.siparis_kalemleri where id = '${id}'`)[0] || "yok";
    const once = { A: kd(A), B: kd(B) };
    const y = await F.kaydet("siparisler", yerel, [{ ...yerel[0], kalemler: bekleyenKalemleriBirlestir(yerel[0].kalemler) }]);
    const den = F.denetim(`${ON}-m`);
    const sonra = { A: kd(A), B: kd(B), yazma: y, D2a: den.D2a_sahipsiz_hareket_kalem_yok || 0, D1a: den.D1a_karsilanan_hareketten_farkli || 0 };
    const kalanK = [sonra.A, sonra.B].filter((x) => x !== "yok").reduce((t, x) => t + x.karsilanan, 0);
    F.kontrol("E11.birlestirme", "AÇIK RİSK (F2) — birleştirmede teslim kaybolmaz: kalan kalemlerin karşılananı 7, sahipsiz hareket yok", { once, sonra,
      gercek: [kalanK, sonra.D2a], beklenen: [7, 0] });
  }

  // E11.bayat-satir — kurallar KAPALI (canlının bugünkü hâli, eski stk_yaz yolu açık): A cihazının yerel verisi sipariş iptalinden
  // ÖNCE; B siparişi iptal eder; A aynı hareketi (kalemId'si dolu) köprüden yeniden yazar. Bağ dirilmemeli, iz bozulmamalı,
  // karşılanan değişmemeli (yazma reddedilir — uygulama bekleyen deftere alır).
  {
    const kural1 = F.kurallarAcik();
    F.kurallariAyarla(false);
    const k = `${ON}-yk`, s = F.siparisKur(F.sipObj(`${ON}-y`, [F.kalemObj(k, 20, 0)]));
    const fis = teslim(s, k, 3, 0, `${ON}-yi`).sonuc.fisNo;
    const yerelA = F.stokOku();
    await F.siparisIptal(s, F.yerelOku(s));
    const once = F.durum(k, fis);
    const yeni = JSON.parse(JSON.stringify(yerelA));
    yeni.forEach((u) => (u.hareketler || []).forEach((h) => { if (h.fisNo === fis) h.aciklama = "A cihazında düzenlendi"; }));
    const y = await F.kaydet("urunler", yerelA, yeni);
    const sonra = F.durum(k, fis); const sat = (sonra.satirlar || [])[0] || {};
    F.kurallariAyarla(kural1);
    F.kontrol("E11.bayat-satir", "kurallar kapalı, bayat yerel veri: bağı çözülmüş hareket yeniden siparişe bağlanmaz, iz ve karşılanan aynı", {
      once: { karsilanan: once.karsilanan, satirlar: once.satirlar }, sonra: { yazma: y, karsilanan: sonra.karsilanan, hesap: sonra.hesap, satirlar: sonra.satirlar },
      gercek: [sat.kalem, sat.siparis, F.izVar() ? sat.gecmisKalem : sutunYok, sonra.karsilanan, sonra.hesap], beklenen: [null, null, k, 3, 3] });
  }

  // E11.geri-yukleme — AÇIK RİSK (F5): yedek T0 → 3 teslim + fiyat 150 → yedekten geri (stok + sipariş, köprü), kurallar kapalı / açık
  const kural0 = F.kurallarAcik();
  for (const acik of [false, true]) {
    F.kurallariAyarla(acik);
    const on = `${ON}-g${acik ? "a" : "k"}`;
    const A = `${on}A`, s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    const yedekStok = F.stokOku(), yedekSip = [s];
    const t = teslim(s, A, 3, 0, `${on}i`);
    const simdi = [{ ...s, durum: "Kısmi Teslim", kalemler: [F.kalemObj(A, 20, 3, { birimFiyat: 150 })] }];
    await F.kaydet("siparisler", yedekSip, simdi);
    const once = F.durum(A, t.sonuc.fisNo);
    const r1 = await F.kaydet("urunler", F.stokOku(), yedekStok, { topluSilmeIzni: true });
    const r2 = await F.kaydet("siparisler", simdi, yedekSip, { topluSilmeIzni: true });
    const sonra = F.durum(A, t.sonuc.fisNo);
    const den = F.denetim(on);
    const hata = Object.entries(den).filter(([k, n]) => n > 0 && /^(D1|D2|D6)/.test(k)).map(([k, n]) => `${k}:${n}`);
    F.kontrol(`E11.geri-yukleme-${acik ? "acik" : "kapali"}`, `AÇIK RİSK (F5) — kurallar ${acik ? "açık" : "kapalı"}: geri yüklemeden sonra karşılanan = hesap, D1 / D2 / D6 temiz`, {
      once: { karsilanan: once.karsilanan, hesap: once.hesap }, sonra: { karsilanan: sonra.karsilanan, hesap: sonra.hesap, fisGecerli: sonra.fisGecerli,
        stokYazmasi: r1.hata ? "RED" : "kabul", siparisYazmasi: r2.hata ? "RED" : "kabul", denetim: hata },
      gercek: [sonra.karsilanan === sonra.hesap, hata], beklenen: [true, []] });
  }
  F.kurallariAyarla(kural0);
  F.bitir();
})().catch((e) => { try { F.kurallariAyarla(true); } catch (x) { /* */ } console.error(e); process.exit(2); });
