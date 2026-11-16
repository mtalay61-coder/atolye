// SENARYO — SİTE HESABI YÖNETİMİ YALNIZ YÖNETİCİ (güvenlik denetimi 1. madde, 16 Kasım).
//
// Sunucu (site-portal.sql, 19): site_hesap_kaydet / site_hesap_sil / site_kayit_onayla / site_kayit_reddet yalnız Yönetici
// (`site_yonetici_kapisi`, fonksiyonun ilk satırı). Bu senaryo ERP tarafını ölçer; sunucu taklittir ve aynı kuralı uygular
// (Yönetici değilse 403 / 42501 "YETKI_YOK", hiçbir şey yazmaz). Üç ayrı oturum (ayrı tarayıcı = ayrı bilgisayar):
//   A) Ali — Tanımlar'da "Kullanıcı" (cari modülünde tam yetkili), sunucuda Yönetici DEĞİL.
//      Ölçülen: yönetim düğmeleri görünüyor mu; görünürse "Onayla" yeni cari açıyor mu (boşta cari).
//   B) Mahmut — Yönetici (istemcide ve sunucuda). Ölçülen: onay (yeni cari + hesap), ret, erişimi kapat çalışıyor; onay
//      ÖN KONTROLDE düşerse (kullanıcı adı alınmış / talep başka cihazda işlenmiş) cari AÇILMIYOR.
//   C) Veli — istemcideki listede Yönetici ama sunucu tanımıyor (rolü sunucuda düşürülmüş / eski tanımlar). Ölçülen: düğme
//      görünse de "Onayla" önce sunucuya sorar; cari AÇILMAZ, onay çağrısı gitmez.
// Senaryo düzeltmeden ÖNCEKİ pakette de çalışır (TEST_HTML ile): o zaman A ve C'de boşta cari kalması ölçülür.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
const { bulutGirisRotasi, girisYap } = require("./giris-yardimci.js");

const TAM = { goruntuleme: true, duzenleme: true, kaydetme: true, silme: true };
const KULLANICILAR = [
  { id: "k1", ad: "Mahmut", kullaniciAdi: "mahmut", rol: "Yönetici", yetkiler: {} },
  { id: "k2", ad: "Ali", kullaniciAdi: "ali", rol: "Kullanıcı", yetkiler: { cari: TAM } },
  { id: "k3", ad: "Veli", kullaniciAdi: "veli", rol: "Yönetici", yetkiler: {} },
];
const talep = (id, unvan, kullanici, saat) => ({ id, olusturma: `2026-11-16T${saat}:00+00:00`, kullanici, bilgiler: { unvan, telefon: "05321234567", adres: "İstanbul" } });

function tohum() {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  t["tanimlar:data"] = JSON.stringify({ ...tanimlar, girisAktifMi: true, kullanicilar: KULLANICILAR });
  const cariler = JSON.parse(TOHUM["cari:data"]);
  t["cari:data"] = JSON.stringify([...cariler, { id: "c4", unvan: "Müşteri D", tip: "Müşteri", telefon: "", paraBirimi: "TRY", hareketler: [] }]);
  return t;
}

// Taklit sunucu: her oturum kendi durumuyla başlar. `yonetici`: sunucunun bu oturumu Yönetici sayıp saymadığı.
function sunucu(yonetici, talepler) {
  const s = { yonetici, talepler: talepler.map((x) => ({ ...x, durum: "yeni" })), hesaplar: { c2: "musteri.b" }, cagrilar: [], listedenDus: new Set() };
  s.rota = async (sayfa) => {
    await sayfa.route("**/rest/v1/site_talepleri*", (r) => r.fulfill({ contentType: "application/json", body: "[]" }));
    await sayfa.route("**/rest/v1/rpc/**", (r) => {
      const ad = r.request().url().split("/rpc/")[1].split("?")[0];
      const g = JSON.parse(r.request().postData() || "{}");
      const json = (v) => r.fulfill({ contentType: "application/json", body: JSON.stringify(v) });
      const kapi = () => { s.cagrilar.push(`${ad}:RET`); r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "42501", message: "YETKI_YOK: müşteri site hesabı işlemleri yalnız Yönetici" }) }); };
      const kural = (m) => { s.cagrilar.push(`${ad}:HATA`); r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "P0001", message: m }) }); };
      if (ad === "yonetici_mi") { s.cagrilar.push(ad); return json(s.yonetici); }
      if (ad === "site_kayit_listesi") {
        const l = s.talepler.filter((x) => x.durum === "yeni" && !s.listedenDus.has(x.id)).map(({ durum, ...x }) => x);
        // YARIŞ: listeyi okuyan ön kontrolden HEMEN SONRA başka cihaz talebi işler (kontrol ile onay arası).
        if (s.yaris) { const t = s.talepler.find((x) => x.id === s.yaris); if (t) t.durum = "onaylandi"; s.yaris = null; }
        return json(l);
      }
      if (ad === "site_hesap_listesi") return json(Object.entries(s.hesaplar).map(([cari_id, kullanici]) => ({ cari_id, kullanici, son_giris: null })));
      if (ad === "site_hesap_bilgi") return json(s.hesaplar[g.p_cari_id] ? { kullanici: s.hesaplar[g.p_cari_id], sonGiris: null, kilitli: false } : null);
      if (ad === "site_kayit_onayla") {
        if (!s.yonetici) return kapi();
        const t = s.talepler.find((x) => x.id === g.p_id && x.durum === "yeni");
        if (!t) return kural("Talep bulunamadı ya da işlenmiş");
        if (Object.values(s.hesaplar).includes(t.kullanici)) return kural("Bu kullanıcı adı artık kullanılıyor");
        s.hesaplar[g.p_cari_id] = t.kullanici; t.durum = "onaylandi"; t.cari = g.p_cari_id;
        s.cagrilar.push(`${ad}:TAMAM`); return r.fulfill({ status: 204, body: "" });
      }
      if (ad === "site_kayit_reddet") {
        if (!s.yonetici) return kapi();
        const t = s.talepler.find((x) => x.id === g.p_id && x.durum === "yeni"); if (t) t.durum = "reddedildi";
        s.cagrilar.push(`${ad}:TAMAM`); return r.fulfill({ status: 204, body: "" });
      }
      if (ad === "site_hesap_kaydet") { if (!s.yonetici) return kapi(); s.hesaplar[g.p_cari_id] = g.p_kullanici; s.cagrilar.push(`${ad}:TAMAM`); return r.fulfill({ status: 204, body: "" }); }
      if (ad === "site_hesap_sil") { if (!s.yonetici) return kapi(); delete s.hesaplar[g.p_cari_id]; s.cagrilar.push(`${ad}:TAMAM`); return r.fulfill({ status: 204, body: "" }); }
      s.cagrilar.push(`${ad}:?`);
      return r.fulfill({ status: 404, body: "" });
    });
  };
  return s;
}

async function oturum(kullaniciAdi, s, hatalar) {
  const { tarayici, sayfa } = await uygulamaAc(tohum(), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const toastlar = [];
  sayfa.on("dialog", (d) => d.accept());
  await bulutGirisRotasi(sayfa, { eposta: `${kullaniciAdi}@atolye.local` });
  await s.rota(sayfa);   // sonra kurulan rota önce çalışır: site uçları taklitte, kalan REST bulutGirisRotasi'nda
  await sayfa.waitForTimeout(2500);
  await girisYap(sayfa, kullaniciAdi, "gizli123");
  await sayfa.waitForTimeout(800);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(1200);
  // Bildirimler birkaç saniye görünür: her işlemden hemen sonra okunur (sabit açıklama yazıları kalıba girmez).
  const KALIP = /(Site hesabı[^\n]*|Müşteri site hesabı işlemlerini[^\n]*|[^\n]*cari açılmadı[^\n]*|Reddedilemedi[^\n]*|Kayıt talebi reddedildi|Web sitesi erişimi kapatıldı)/g;
  const toastOku = async () => { const m = await sayfa.evaluate(() => document.body.innerText); for (const x of (m.match(KALIP) || [])) if (!toastlar.includes(x)) toastlar.push(x); };
  return { tarayici, sayfa, toastlar, toastOku };
}

const cariSayisi = async (sayfa, unvan) => ((await depoOku(sayfa, "cari:data")) || []).filter((c) => c.unvan === unvan).length;
const kayitDugmeleri = (sayfa) => sayfa.evaluate(() => [...document.querySelectorAll("[data-site-kayit]")].map((e) => `${e.getAttribute("data-site-kayit")}: ${[...e.querySelectorAll("button")].map((b) => b.textContent.trim()).join(" + ") || "düğme yok"}`));
const onaylaTikla = (sayfa, kullanici) => sayfa.evaluate((k) => { const b = [...document.querySelectorAll(`[data-site-kayit="${k}"] button`)].find((x) => /Onayla/.test(x.textContent)); if (b) b.click(); return !!b; }, kullanici);
const reddetTikla = (sayfa, kullanici) => sayfa.evaluate((k) => { const b = [...document.querySelectorAll(`[data-site-kayit="${k}"] button`)].find((x) => /Reddet/.test(x.textContent)); if (b) b.click(); return !!b; }, kullanici);
async function kartPaneli(sayfa, unvan) {
  await sayfa.locator(`button:has-text("${unvan}"):visible`).last().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-cari-sekme="bilgiler"]:visible').last().click();
  await sayfa.waitForTimeout(600);
  return sayfa.evaluate(() => { const p = [...document.querySelectorAll("[data-site-erisim]")].pop(); if (!p) return "panel yok";
    return [...p.querySelectorAll("button")].map((b) => b.textContent.trim()).join(" + ") || "düğme yok"; });
}

async function calistir() {
  const hatalar = [];
  const T1 = talep("t1", "Yeni Firma Ltd", "yeni.firma", "09:00");
  const T2 = talep("t2", "Reddedilecek AŞ", "red.firma", "09:05");
  const T3 = talep("t3", "Alinmis Ad Ltd", "musteri.b", "09:10");     // kullanıcı adı başka caride (c2) kullanılıyor
  const T4 = talep("t4", "Islenmis Ltd", "islenmis.firma", "09:15");  // ekranda görünüyor, sunucuda başka cihaz işledi
  const T5 = talep("t5", "Yaris Ltd", "yaris.firma", "09:20");         // ön kontrolden SONRA başka cihaz işler (kalan açık)

  // ---- A) Ali: Yönetici değil (istemci + sunucu) ----
  const sA = sunucu(false, [T1, T2]);
  let o = await oturum("ali", sA, hatalar);
  const A = { kayitDugmeleri: await kayitDugmeleri(o.sayfa) };
  A.onaylaTiklandi = await onaylaTikla(o.sayfa, "yeni.firma");
  await o.sayfa.waitForTimeout(2500);
  await o.toastOku();
  A.reddetTiklandi = await reddetTikla(o.sayfa, "red.firma");
  await o.sayfa.waitForTimeout(1200);
  await o.toastOku();
  A.yeniCari = await cariSayisi(o.sayfa, "Yeni Firma Ltd");
  A.sunucuTalepleri = sA.talepler.map((x) => `${x.id}:${x.durum}`);
  A.sunucuHesaplari = sA.hesaplar;
  A.kartMusteriB = await kartPaneli(o.sayfa, "Müşteri B");
  A.kartMusteriD = await kartPaneli(o.sayfa, "Müşteri D");
  A.cagrilar = sA.cagrilar.filter((x) => !/^site_(hesap_bilgi|hesap_listesi|kayit_listesi)/.test(x));
  A.toastlar = o.toastlar;
  await o.tarayici.close();

  // ---- B) Mahmut: Yönetici ----
  const sB = sunucu(true, [T1, T2, T3, T4, T5]);
  o = await oturum("mahmut", sB, hatalar);
  const B = { kayitDugmeleri: await kayitDugmeleri(o.sayfa) };
  // B1: alınmış kullanıcı adı → ön kontrolde düşmeli (düzeltmeden önce: cari açılır, onay sunucuda düşer)
  B.alinmisTiklandi = await onaylaTikla(o.sayfa, "musteri.b");
  await o.sayfa.waitForTimeout(2500);
  await o.toastOku();
  B.alinmisCari = await cariSayisi(o.sayfa, "Alinmis Ad Ltd");
  // B2: başka cihazda işlenmiş talep (ekranda hâlâ var)
  sB.talepler.find((x) => x.id === "t4").durum = "onaylandi";
  B.islenmisTiklandi = await onaylaTikla(o.sayfa, "islenmis.firma");
  await o.sayfa.waitForTimeout(2500);
  await o.toastOku();
  B.islenmisCari = await cariSayisi(o.sayfa, "Islenmis Ltd");
  // B3: normal onay — yeni cari + hesap
  B.onaylaTiklandi = await onaylaTikla(o.sayfa, "yeni.firma");
  await o.sayfa.waitForTimeout(2500);
  await o.toastOku();
  const yeni = ((await depoOku(o.sayfa, "cari:data")) || []).filter((c) => c.unvan === "Yeni Firma Ltd");
  B.yeniCari = yeni.length;
  B.hesapYeniCariye = !!yeni[0] && sB.hesaplar[yeni[0].id] === "yeni.firma";
  // B6: yarış — ön kontrol geçer, onay sunucuda düşer: cari açılmış olur, bildirim bunu söylemeli (kalan, bilinen açık)
  sB.yaris = "t5";
  B.yarisTiklandi = await onaylaTikla(o.sayfa, "yaris.firma");
  await o.sayfa.waitForTimeout(2500);
  await o.toastOku();
  B.yarisCari = await cariSayisi(o.sayfa, "Yaris Ltd");
  // B4: ret
  B.reddetTiklandi = await reddetTikla(o.sayfa, "red.firma");
  await o.sayfa.waitForTimeout(1200);
  await o.toastOku();
  B.sunucuTalepleri = sB.talepler.map((x) => `${x.id}:${x.durum}`);
  B.kalanDugmeler = await kayitDugmeleri(o.sayfa);
  // B5: cari kartı — erişimi kapat
  B.kartMusteriB = await kartPaneli(o.sayfa, "Müşteri B");
  await o.sayfa.evaluate(() => { const p = [...document.querySelectorAll("[data-site-erisim]")].pop(); const b = [...p.querySelectorAll("button")].find((x) => /Erişimi kapat/.test(x.textContent)); if (b) b.click(); });
  await o.sayfa.waitForTimeout(900);
  await o.toastOku();
  B.c2HesapKapandi = !sB.hesaplar.c2;
  B.kartMusteriD = await kartPaneli(o.sayfa, "Müşteri D");
  await o.toastOku();
  B.cagrilar = sB.cagrilar.filter((x) => !/^site_(hesap_bilgi|hesap_listesi|kayit_listesi)/.test(x));
  B.toastlar = o.toastlar;
  await o.tarayici.close();

  // ---- C) Veli: istemcide Yönetici, sunucuda değil ----
  const sC = sunucu(false, [T1]);
  o = await oturum("veli", sC, hatalar);
  const C = { kayitDugmeleri: await kayitDugmeleri(o.sayfa) };
  C.onaylaTiklandi = await onaylaTikla(o.sayfa, "yeni.firma");
  await o.sayfa.waitForTimeout(2500);
  await o.toastOku();
  await o.toastOku();
  C.yeniCari = await cariSayisi(o.sayfa, "Yeni Firma Ltd");
  C.sunucuTalepleri = sC.talepler.map((x) => `${x.id}:${x.durum}`);
  C.cagrilar = sC.cagrilar.filter((x) => !/^site_(hesap_bilgi|hesap_listesi|kayit_listesi)/.test(x));
  C.toastlar = o.toastlar;
  await o.tarayici.close();

  return { hatalar, A, B, C };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
