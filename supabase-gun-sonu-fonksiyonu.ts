// @ts-nocheck — çekirdek uygulamanın JavaScript kodundan otomatik çıkarılıyor (tipsiz).
// ================= GÜN SONU RAPORU — SUNUCU FONKSİYONU (Supabase Edge Function `gun-sonu`) =================
//
// Kullanıcı: "Sunucudan otomatik gönderilsin, uygulama açık olmasa da."
//
// BU DOSYA ÜRETİLİR: `gun-sonu-sablon.ts` + uygulamanın rapor çekirdeği (`./yap.sh` → `gun-sonu-sunucu.js`).
// Elle düzenlemeyin; şablonu ya da src/264-gun-sonu.jsx'i düzenleyip yap.sh çalıştırın. Rapor hesabı uygulamadaki
// "Gün Sonu Raporu" ekranıyla AYNI koddur; uygulamada rapor değiştiğinde bu dosyayı Supabase'e yeniden yapıştırın.
//
// ---------------------------------------------------------------------------------------------
// KURULUM (bir kez)
//   1. Supabase > Edge Functions > Create function > adı:  gun-sonu
//      Şablon kodu silin, bu dosyanın TAMAMINI yapıştırın > Deploy.
//      "Verify JWT with legacy secret" KAPALI (fonksiyon çağıranı kendisi doğruluyor).
//   2. Edge Functions > Secrets: GUN_SONU_ANAHTAR = uzun rastgele bir metin (zamanlayıcının parolası; koda girmez).
//      SMTP_SIFRE zaten `eposta` fonksiyonu için girildiyse yeterli (aynı ayar kullanılır).
//   3. SQL Editor'de `gun-sonu.sql`'i çalıştırın (gönderim kaydı tablosu + her 15 dakikada bir çağıran zamanlayıcı;
//      içindeki <PROJE> ve <GUN_SONU_ANAHTAR> yerlerini doldurun).
//   4. Uygulama: Finans › Gün Sonu Raporu › Otomatik gönderim: "her gün", saat, alıcılar. "Sunucudan şimdi gönder
//      (deneme)" ile kurulumu sınayın.
//
// ÇALIŞMA: zamanlayıcı her 15 dakikada çağırır. Fonksiyon Tanımlar'daki ayarı okur; otomatik açıksa ve İstanbul saatiyle
// belirlenen saat geçmişse, o günün raporu `gun_sonu_gonderim` tablosunda yoksa önce satırı YAZAR (gün birincil
// anahtar: iki çağrı yarışsa da yalnız biri gönderir), sonra gönderir ve sonucu satıra yazar.
// E-posta: özet metin + raporun tamamı HTML gövde + aynı rapor ek dosya (indirilip tarayıcıda açılır/yazdırılır).
// ---------------------------------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-gun-sonu-anahtar",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const yanit = (durum: number, govde: unknown) =>
  new Response(JSON.stringify(govde), { status: durum, headers: { ...CORS, "Content-Type": "application/json" } });

// ---- ÇEKİRDEK: atolye-erp.jsx'ten OTOMATİK çıkarıldı (gun-sonu-sunucu.js) — ELLE DÜZENLEMEYİN ----
// Tanımlar: alisPbKodu, OKUMA_ISTISNA, alanAdi, ekiKokeAc, kayitaCevir, TARIH_BICIM, SAAT_BICIM, tarihYaz, stokYuvarla, FIS_ON_EKI, fisOnEki, PDF_CIKTI_STILI, pdfCiktiBelgesi, bakiyeMetni, hareketDefterde, cariDefterHareketleri, defterKapsar, PARA_SEMBOLU, cariMutabakatBakiyesi, gunSonuGun, gunSonuPara, gunSonuPBToplam, gunSonuSonAlislar, gunSonuAlisFiyati, gunSonuVerisi, gunSonuPBMetni, gunSonuBolumleri, gunSonuHTML, gunSonuAlicilari, htmlKacis

function alisPbKodu(urun) {
  const ham = String((urun && urun.alisParaBirimi) || "").trim();
  if (!ham || ham === "₺" || ham === "TL" || ham === "TRY") return "TRY";
  const esleme = { "$": "USD", "€": "EUR", "£": "GBP", USD: "USD", EUR: "EUR", GBP: "GBP" };
  return esleme[ham] || ham.toUpperCase();
}

const OKUMA_ISTISNA = {
  not_metni: "not", fiyat: "birimFiyat", min_stok: "minStok",
  on_yuz: "on", arka_yuz: "arka",
};

function alanAdi(sutun) {
  if (OKUMA_ISTISNA[sutun]) return OKUMA_ISTISNA[sutun];
  return sutun.replace(/_([a-z])/g, (_, h) => h.toUpperCase());
}

function ekiKokeAc(kayit) {
  const { ek, ...kalan } = kayit || {};
  return ek && typeof ek === "object" && !Array.isArray(ek) ? { ...ek, ...kalan } : kalan;
}

function kayitaCevir(satir) {
  const k = {};
  Object.entries(satir || {}).forEach(([s, v]) => {
    // `surum` UYGULAMA ALANI DEĞİL, altyapı sayacıdır. Kayda sızarsa fark hesabına girer ve
    // her başarılı yazmadan sonra kayıt "değişmiş" görünüp yeniden yazılır (bkz. _surumler).
    if (s === "surum") return;
    k[alanAdi(s)] = v;
  });
  return k;
}

const TARIH_BICIM = new Intl.DateTimeFormat("tr-TR");

const SAAT_BICIM = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

function tarihYaz(deger, saatliMi) {
  if (!deger) return "";

  // SADECE GÜN olan değerler ("2026-08-30") ayrı ele alınır. JavaScript bu biçimi UTC gece
  // yarısı sayıyor; Türkiye UTC+3 olduğu için ekrana "30.08.2026 03:00" diye basılıyordu.
  // O 03:00 gerçek bir saat değil, saat dilimi çevirisinin artığı — kullanıcı haklı olarak
  // "tarih yanlış" diyordu. Cari hareketleri gün damgasıyla saklanıyor (bugunYerel), saatleri
  // yok; olmayan bir saati uydurmak yerine hiç göstermiyoruz.
  const sadeGun = /^\d{4}-\d{2}-\d{2}$/.test(String(deger).trim());
  if (sadeGun) {
    const [y, a, g] = String(deger).trim().split("-");
    return `${g}.${a}.${y}`;
  }

  const d = new Date(deger);
  if (isNaN(d.getTime())) return String(deger);
  const tarih = TARIH_BICIM.format(d);

  // SAAT ARTIK VARSAYILAN. Önceden çağıranın açıkça istemesi gerekiyordu ve 13 çağrının 9'u
  // istemiyordu; sonuçta saati kaydedilmiş bir hareket bile ekranda yalnızca günle görünüyordu.
  // Kural basitleşti: değerde saat VARSA gösterilir, yoksa gösterilmez. Gün damgaları zaten
  // yukarıda ayrılıyor, yani buraya gelen her değerin gerçek bir saati var.
  // Çağıran açıkça `false` derse yine saatsiz yazılır (dar sütunlar için).
  if (saatliMi === false) return tarih;
  return `${tarih} ${SAAT_BICIM.format(d)}`;
}

function stokYuvarla(sayi) {
  return Math.round((Number(sayi) || 0) * 1e6) / 1e6;
}

const FIS_ON_EKI = { "Alış": "AF", "Satış": "SF", "Ödeme": "ODM", "Tahsilat": "THS" };

function fisOnEki(tip) {
  return FIS_ON_EKI[tip] || "EL";
}

const PDF_CIKTI_STILI = "html,body{margin:0;padding:0;zoom:1}body{width:794px;box-sizing:border-box;padding:24px;background:#fff;color:#33281C;" +
  "font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%;" +
  "letter-spacing:normal;word-spacing:normal;font-kerning:normal}" +
  "table{width:100%;border-collapse:collapse}th,td{padding:4px 8px;text-align:left;font-size:12px;text-transform:none;letter-spacing:normal}" +
  ".mono{font-family:'Courier New',Courier,'Liberation Mono',monospace}img{max-width:100%}";

function pdfCiktiBelgesi(govdeHTML) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=794"><style>${PDF_CIKTI_STILI}</style></head><body>${govdeHTML}</body></html>`;
}

function bakiyeMetni(bakiyeler, isaretli = true) {
  const girdiler = Object.entries(bakiyeler || {});
  if (girdiler.length === 0) return "0 ₺";
  return girdiler
    .map(([pb, t]) => `${isaretli && t > 0 ? "+" : ""}${t.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`)
    .join(" · ");
}

function hareketDefterde(h, defter) {
  // AÇIKLAMA DA DEFTERE GÖRE (v1.682.0 — kullanıcı: "açıklamalar deftere göre değişsin; hepsi kendi tarafında görünsün"):
  // Resmi bakışında `resmiAciklama` (Resmi karşılığı), diğerlerinde asıl açıklama (Genel karşılığı).
  if (defter === "Resmi" && h && h.resmiPB && h.resmiTutar != null)
    return { ...h, tutar: h.resmiTutar, paraBirimi: h.resmiPB, aciklama: h.resmiAciklama || h.aciklama };
  return h;
}

function cariDefterHareketleri(hareketler, defter) {
  return (hareketler || []).filter((h) => defterKapsar(h.defter, defter)).map((h) => hareketDefterde(h, defter));
}

function defterKapsar(kayitDefteri, secilen) {
  if (!secilen || secilen === "Tümü") return true;
  const d = kayitDefteri || "Genel";
  return d === secilen || d === "Muhasebe";
}

const PARA_SEMBOLU = { TRY: "₺", USD: "$", EUR: "€" };

function cariMutabakatBakiyesi(cari, donem, defter) {
  const toplam = {};
  cariDefterHareketleri((cari && cari.hareketler) || [], defter)
    .filter((h) => String(h.tarih || "").slice(0, 10) <= donem)
    .forEach((h) => {
      const pb = h.paraBirimi || "TRY";
      toplam[pb] = (toplam[pb] || 0) + (h.yon === "Borç" ? (h.tutar || 0) : -(h.tutar || 0));
    });
  Object.keys(toplam).forEach((pb) => { if (stokYuvarla(toplam[pb]) === 0) delete toplam[pb]; });
  return toplam;
}

function gunSonuGun(t) { return String(t || "").slice(0, 10); }

function gunSonuPara(t, pb) {
  return `${(Number(t) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb || ""}`.trim();
}

function gunSonuPBToplam(liste, tutarAl, pbAl) {
  const m = {};
  liste.forEach((x) => { const pb = pbAl(x) || "TRY"; m[pb] = stokYuvarla((m[pb] || 0) + (Number(tutarAl(x)) || 0)); });
  return m;
}

function gunSonuSonAlislar(cariler, gun) {
  const onEk = `${fisOnEki("Alış")}-`;
  const m = new Map();
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
    if (!h || !h.fisNo || !String(h.fisNo).startsWith(onEk) || gunSonuGun(h.tarih) > gun) return;
    const ad = String(h.urunAd || "").toLocaleLowerCase("tr-TR").trim();
    const cevrildi = h.hamBirimFiyat != null && h.kalemParaBirimi;
    const fiyat = Number(cevrildi ? h.hamBirimFiyat : h.birimFiyat);
    if (!ad || !(fiyat > 0)) return;
    const anahtar = `${gunSonuGun(h.tarih)}${h.zaman || ""}`;
    const onceki = m.get(ad);
    if (!onceki || anahtar > onceki.anahtar) m.set(ad, { anahtar, fiyat, pb: cevrildi ? h.kalemParaBirimi : (h.paraBirimi || "TRY"), kaynak: `son alış ${tarihYaz(gunSonuGun(h.tarih))}` });
  }));
  return m;
}

function gunSonuAlisFiyati(urun, gun, sonAlislar) {
  const son = sonAlislar.get(String(urun.ad || "").toLocaleLowerCase("tr-TR").trim());
  if (son) return son;
  const f = Number(urun.alisFiyati) || 0;
  return f > 0 ? { fiyat: f, pb: alisPbKodu(urun), kaynak: "kart" } : null;
}

function gunSonuVerisi({ gun, defter = "Tümü", cariler, muhasebe, stok, uretim }) {
  const cariAd = {}; (cariler || []).forEach((c) => { cariAd[c.id] = c.unvan; });
  const urunAd = {}; (stok || []).forEach((p) => { urunAd[p.id] = p.ad; });
  const defterUyar = (d) => defter === "Tümü" || defterKapsar(d, defter);

  // ---- 1) ALIŞ / SATIŞ FİŞLERİ: ürünlü cari hareketleri fiş numarasıyla gruplanır (fiş kalem kalem yazılıyor) ----
  const fisMap = new Map();
  const cariHareketleri = [];
  (cariler || []).forEach((c) => {
    cariDefterHareketleri(c.hareketler || [], defter === "Tümü" ? "Tümü" : defter)
      .filter((h) => gunSonuGun(h.tarih) === gun)
      .forEach((h) => {
        if (h.urunAd && h.fisNo) {
          const a = `${c.id}|${h.fisNo}`;
          if (!fisMap.has(a)) fisMap.set(a, { fisNo: h.fisNo, cari: c.unvan, cariTip: c.tip || "", tur: h.yon === "Borç" ? "Satış" : "Alış", kalemler: [], toplam: {}, defter: h.defter || "Genel" });
          const f = fisMap.get(a);
          f.kalemler.push({ urun: h.urunAd, renk: h.renk || "", beden: h.beden || "", miktar: h.miktar || 0, birim: h.birim || "", birimFiyat: h.birimFiyat || 0, tutar: h.tutar || 0, pb: h.paraBirimi || "TRY" });
          const pb = h.paraBirimi || "TRY";
          f.toplam[pb] = stokYuvarla((f.toplam[pb] || 0) + (h.tutar || 0));
        } else {
          cariHareketleri.push({ cari: c.unvan, tip: h.islemTipi || (h.yon === "Borç" ? "Borç" : "Alacak"), yon: h.yon, aciklama: h.aciklama || "", fisNo: h.fisNo || "", tutar: h.tutar || 0, pb: h.paraBirimi || "TRY", defter: h.defter || "Genel" });
        }
      });
  });
  const fisler = [...fisMap.values()].sort((a, b) => a.tur.localeCompare(b.tur) || a.fisNo.localeCompare(b.fisNo));

  // ---- 2) KASA / BANKA: günün hareketleri + gün sonu bakiyesi ----
  const hesaplar = [
    ...((muhasebe && muhasebe.kasalar) || []).map((h) => ({ ...h, tur: "Kasa" })),
    ...((muhasebe && muhasebe.bankalar) || []).map((h) => ({ ...h, tur: "Banka" })),
  ];
  const kasaHareketleri = [];
  const hesapBakiyeleri = hesaplar.map((h) => {
    const pb = h.paraBirimi || "TRY";
    let bakiye = 0, giris = 0, cikis = 0;
    (h.hareketler || []).filter((x) => defterUyar(x.defter)).forEach((x) => {
      const g = gunSonuGun(x.tarih);
      if (g > gun) return;
      const t = Number(x.tutar) || 0;
      bakiye += x.yon === "Giriş" ? t : -t;
      if (g === gun) {
        if (x.yon === "Giriş") giris += t; else cikis += t;
        kasaHareketleri.push({ hesap: `${h.tur}: ${h.ad}`, yon: x.yon, tutar: t, pb, karsi: x.cariId ? (cariAd[x.cariId] || "") : (x.giderKartAd || (x.virmanMi ? "virman" : "")), aciklama: x.aciklama || "", fisNo: x.fisNo || "" });
      }
    });
    return { hesap: `${h.tur}: ${h.ad}`, tur: h.tur, pb, giris: stokYuvarla(giris), cikis: stokYuvarla(cikis), bakiye: stokYuvarla(bakiye) };
  });

  // ---- 3) STOK: günün hareketleri (üretim ayrı başlıkta) + gün sonu miktarları ----
  const stokHareketleri = [];
  const uretimHareketleri = [];
  const sonAlislar = gunSonuSonAlislar(cariler, gun);
  const stokMiktarlari = [];
  (stok || []).forEach((p) => {
    if (!p || p.kategori === "Hizmet") return;
    const hareketler = p.hareketler || [];
    hareketler.filter((x) => gunSonuGun(x.tarih) === gun).forEach((x) => {
      const satir = { urun: p.ad, kategori: p.kategori || "", renk: x.renk || "", beden: x.beden || "", miktar: x.miktar || 0, birim: p.birim || "", kaynak: x.kaynak || "", fisNo: x.fisNo || "", cari: x.cariId ? (cariAd[x.cariId] || "") : "", siparisNo: x.siparisNo || "" };
      (x.kaynak === "Üretim" ? uretimHareketleri : stokHareketleri).push(satir);
    });
    // ÜRÜN BAŞINA TEK SATIR (v1.687.0 — kullanıcı: "stok miktarları detaysız olsun; stok miktarı, alış fiyatı ve stok
    // tutarı yeterli, renk beden gerek yok"). Miktar = renk/beden toplamı.
    const miktar = stokYuvarla(hareketler.length
      ? hareketler.filter((x) => gunSonuGun(x.tarih) <= gun).reduce((t, x) => t + (Number(x.miktar) || 0), 0)
      : (p.variants || []).reduce((t, v) => t + (Number(v.miktar) || 0), 0));
    if (!miktar) return;
    const fiyat = gunSonuAlisFiyati(p, gun, sonAlislar);
    stokMiktarlari.push({ urun: p.ad, kategori: p.kategori || "", miktar, birim: p.birim || "",
      fiyat: fiyat ? fiyat.fiyat : null, pb: fiyat ? fiyat.pb : "", kaynak: fiyat ? fiyat.kaynak : "",
      tutar: fiyat ? stokYuvarla(miktar * fiyat.fiyat) : null });
  });
  stokMiktarlari.sort((a, b) => a.kategori.localeCompare(b.kategori, "tr") || a.urun.localeCompare(b.urun, "tr"));

  // ---- 4) ÜRETİM AŞAMALARI: o gün verilen / tamamlanan proses atamaları ----
  const uretimAsamalari = [];
  (uretim || []).forEach((u) => (u.prosesIlerleme || []).forEach((pr) => (pr.atamalar || []).forEach((at) => {
    const kim = cariAd[at.personelId] || "";
    if (gunSonuGun(at.verilmeTarihi) === gun) uretimAsamalari.push({ siparisNo: u.takipKodu || u.siparisNo || "", model: u.model || urunAd[u.urunId] || "", renk: u.renk || "", proses: pr.proses, olay: "Verildi", personel: kim, miktar: at.miktar || 0 });
    if (at.tamamlandiMi && gunSonuGun(at.tamamlanmaTarihi) === gun) uretimAsamalari.push({ siparisNo: u.takipKodu || u.siparisNo || "", model: u.model || urunAd[u.urunId] || "", renk: u.renk || "", proses: pr.proses, olay: "Tamamlandı", personel: kim, miktar: at.miktar || 0 });
  })));

  // ---- 5) CARİ BAKİYELERİ ve ÇEKLER ----
  const bakiyeDefter = defter === "Tümü" ? "Genel" : defter;
  const cariBakiyeListesi = (cariler || [])
    .map((c) => ({ cari: c.unvan, tip: c.tip || "", bakiye: cariMutabakatBakiyesi(c, gun, bakiyeDefter) }))
    .filter((x) => Object.keys(x.bakiye).length > 0)
    .sort((a, b) => a.tip.localeCompare(b.tip, "tr") || a.cari.localeCompare(b.cari, "tr"));
  const cekler = ((muhasebe && muhasebe.cekler) || [])
    .filter((c) => (c.durum || "Portföyde") === "Portföyde" && defterUyar(c.defter))
    .map((c) => ({ cekNo: c.cekNo || "", banka: c.banka || "", cari: cariAd[c.cariId] || "", vade: c.vadeTarihi || "", tutar: Number(c.tutar) || 0, pb: c.paraBirimi || "TRY" }))
    .sort((a, b) => String(a.vade).localeCompare(String(b.vade)));

  return {
    gun, defter, bakiyeDefter,
    fisler, cariHareketleri, kasaHareketleri, hesapBakiyeleri, stokHareketleri, uretimHareketleri, uretimAsamalari,
    stokMiktarlari, cariBakiyeListesi, cekler,
    ozet: {
      satis: gunSonuPBToplam(fisler.filter((f) => f.tur === "Satış").flatMap((f) => Object.entries(f.toplam)), (x) => x[1], (x) => x[0]),
      alis: gunSonuPBToplam(fisler.filter((f) => f.tur === "Alış").flatMap((f) => Object.entries(f.toplam)), (x) => x[1], (x) => x[0]),
      kasaGiris: gunSonuPBToplam(kasaHareketleri.filter((x) => x.yon === "Giriş"), (x) => x.tutar, (x) => x.pb),
      kasaCikis: gunSonuPBToplam(kasaHareketleri.filter((x) => x.yon !== "Giriş"), (x) => x.tutar, (x) => x.pb),
      kasaBakiye: gunSonuPBToplam(hesapBakiyeleri, (x) => x.bakiye, (x) => x.pb),
      cekToplam: gunSonuPBToplam(cekler, (x) => x.tutar, (x) => x.pb),
      stokTutar: gunSonuPBToplam(stokMiktarlari.filter((x) => x.tutar != null), (x) => x.tutar, (x) => x.pb),
      uretimGiris: stokYuvarla(uretimHareketleri.filter((x) => x.miktar > 0).reduce((t, x) => t + x.miktar, 0)),
    },
  };
}

const gunSonuPBMetni = (m) => (Object.keys(m || {}).length ? Object.entries(m).map(([pb, t]) => gunSonuPara(t, pb)).join(" · ") : "—");

function gunSonuBolumleri(v) {
  const sonuc = [];
  const b = (baslik, kolonlar, satirlar) => sonuc.push({ baslik, kolonlar, satirlar });
  b("Alış / Satış fişleri", [["Tür"], ["Fiş No"], ["Cari"], ["Kalemler"], ["Tutar", 1]],
    v.fisler.map((x) => [x.tur, x.fisNo, x.cari, x.kalemler.map((k) => `${k.urun} ${[k.renk, k.beden].filter(Boolean).join("/")} × ${k.miktar.toLocaleString("tr-TR")} ${k.birim}`).join("; "), gunSonuPBMetni(x.toplam)]));
  b("Tahsilat / ödeme ve diğer cari hareketleri", [["Cari"], ["İşlem"], ["Açıklama"], ["Borç", 1], ["Alacak", 1]],
    v.cariHareketleri.map((x) => [x.cari, x.tip, x.aciklama, x.yon === "Borç" ? gunSonuPara(x.tutar, x.pb) : "", x.yon !== "Borç" ? gunSonuPara(x.tutar, x.pb) : ""]));
  b("Kasa / banka hareketleri", [["Hesap"], ["Karşı taraf"], ["Açıklama"], ["Giriş", 1], ["Çıkış", 1]],
    v.kasaHareketleri.map((x) => [x.hesap, x.karsi, x.aciklama, x.yon === "Giriş" ? gunSonuPara(x.tutar, x.pb) : "", x.yon !== "Giriş" ? gunSonuPara(x.tutar, x.pb) : ""]));
  b("Üretim — stok hareketleri", [["Ürün"], ["Renk/Beden"], ["Sipariş"], ["Fiş"], ["Miktar", 1]],
    v.uretimHareketleri.map((x) => [x.urun, [x.renk, x.beden].filter(Boolean).join(" / "), x.siparisNo, x.fisNo, `${x.miktar.toLocaleString("tr-TR")} ${x.birim}`]));
  b("Üretim — proses atamaları", [["Sipariş"], ["Model"], ["Proses"], ["Olay"], ["Personel"], ["Miktar", 1]],
    v.uretimAsamalari.map((x) => [x.siparisNo, `${x.model} ${x.renk}`.trim(), x.proses, x.olay, x.personel, x.miktar.toLocaleString("tr-TR")]));
  b("Diğer stok hareketleri", [["Ürün"], ["Renk/Beden"], ["Kaynak"], ["Cari"], ["Fiş"], ["Miktar", 1]],
    v.stokHareketleri.map((x) => [x.urun, [x.renk, x.beden].filter(Boolean).join(" / "), x.kaynak, x.cari, x.fisNo, `${x.miktar.toLocaleString("tr-TR")} ${x.birim}`]));
  b("Kasa ve banka bakiyeleri (gün sonu)", [["Hesap"], ["Giriş", 1], ["Çıkış", 1], ["Bakiye", 1]],
    v.hesapBakiyeleri.map((x) => [x.hesap, gunSonuPara(x.giris, x.pb), gunSonuPara(x.cikis, x.pb), gunSonuPara(x.bakiye, x.pb)]));
  b("Portföydeki çekler (bugünkü durum)", [["Vade"], ["Çek No"], ["Banka"], ["Cari"], ["Tutar", 1]],
    v.cekler.map((x) => [x.vade ? tarihYaz(x.vade) : "", x.cekNo, x.banka, x.cari, gunSonuPara(x.tutar, x.pb)]));
  b(`Cari bakiyeleri (gün sonu, ${v.bakiyeDefter} defter)`, [["Cari"], ["Tip"], ["Bakiye (+ bize borçlu / − bizden alacaklı)", 1]],
    v.cariBakiyeListesi.map((x) => [x.cari, x.tip, bakiyeMetni(x.bakiye)]));
  b("Stok (gün sonu)", [["Kategori"], ["Ürün"], ["Miktar", 1], ["Alış fiyatı", 1], ["Stok tutarı", 1]],
    v.stokMiktarlari.map((x) => [x.kategori, x.urun, `${x.miktar.toLocaleString("tr-TR")} ${x.birim}`,
      x.fiyat != null ? `${gunSonuPara(x.fiyat, x.pb)} (${x.kaynak})` : "fiyat yok", x.tutar != null ? gunSonuPara(x.tutar, x.pb) : ""]));
  return sonuc;
}

function gunSonuHTML(v, firma, hazirlanma = new Date().toLocaleString("tr-TR"), yalnizUst = false) {
  const e = htmlKacis;
  const f = firma || {};
  const tablo = (baslik, kolonlar, satirlar, bosMetin = "Kayıt yok") => `
    <h3 style="margin:18px 0 6px;font-size:14px;border-bottom:2px solid #2F6B4F;padding-bottom:3px">${e(baslik)} <span style="font-weight:400;color:#777;font-size:11px">(${satirlar.length})</span></h3>
    ${satirlar.length === 0 ? `<div style="font-size:11px;color:#888">${e(bosMetin)}</div>` : `<table><thead><tr>${kolonlar.map(([k, sag]) => `<th style="border-bottom:1px solid #999;font-size:11px;${sag ? "text-align:right" : ""}">${e(k)}</th>`).join("")}</tr></thead><tbody>
    ${satirlar.map((s) => `<tr>${s.map((h, i) => `<td style="border-bottom:1px solid #eee;font-size:11px;${kolonlar[i][1] ? "text-align:right;white-space:nowrap" : ""}">${e(h)}</td>`).join("")}</tr>`).join("")}</tbody></table>`}`;
  const o = v.ozet;
  const kutu = (b, d) => `<td style="border:1px solid #ddd;padding:6px;vertical-align:top"><div style="font-size:10px;color:#777">${e(b)}</div><div style="font-weight:700;font-size:12px">${e(d)}</div></td>`;
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2F6B4F;padding-bottom:6px">
      <div><div style="font-size:18px;font-weight:800">${e(f.unvan || "")}</div><div style="font-size:15px">Gün Sonu Raporu — ${e(tarihYaz(v.gun))}</div></div>
      <div style="font-size:10px;color:#666;text-align:right">Defter: ${e(v.defter)}${v.defter === "Tümü" ? ` (bakiyeler ${e(v.bakiyeDefter)})` : ""}<br/>Hazırlanma: ${e(hazirlanma)}</div>
    </div>
    <table style="margin-top:10px"><tr>
      ${kutu("Satış", gunSonuPBMetni(o.satis))}${kutu("Alış", gunSonuPBMetni(o.alis))}${kutu("Kasa/Banka giriş", gunSonuPBMetni(o.kasaGiris))}${kutu("Kasa/Banka çıkış", gunSonuPBMetni(o.kasaCikis))}
    </tr><tr>
      ${kutu("Kasa + Banka gün sonu", gunSonuPBMetni(o.kasaBakiye))}${kutu("Portföydeki çekler", gunSonuPBMetni(o.cekToplam))}${kutu("Stok tutarı (alış fiyatıyla)", gunSonuPBMetni(o.stokTutar))}${kutu("Üretimden stoğa giriş", `${o.uretimGiris.toLocaleString("tr-TR")}`)}
    </tr></table>
    ${yalnizUst ? "" : gunSonuBolumleri(v).map((x) => tablo(x.baslik, x.kolonlar, x.satirlar)).join("")}
  `;
}

function gunSonuAlicilari(ayar) {
  return String((ayar && ayar.alicilar) || "").split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /@/.test(x));
}

function htmlKacis(v) {
  return String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
}
// ---- ÇEKİRDEK SONU ----


// İstanbul'un şu anki günü ve dakikası (sunucu UTC'de çalışır).
function istanbulSimdi() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { gun: `${p.year}-${p.month}-${p.day}`, dakika: Number(p.hour) * 60 + Number(p.minute), metin: `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}` };
}

// PostgREST 1000 satır sınırı: sayfa sayfa okunur (uygulamadaki `supabaseTumSatirlar` gibi).
async function tumSatirlar(db, tablo: string, sutunlar = "*") {
  const hepsi = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await db.from(tablo).select(sutunlar).range(bas, bas + 999);
    if (error) throw new Error(`${tablo} okunamadı: ${error.message}`);
    hepsi.push(...(data || []));
    if (!data || data.length < 1000) return hepsi;
  }
}

// Uygulamadaki okuma (045 `supabasedenOku`) ile aynı biçime: alt tablolar ana kayda, `ek` köke.
async function veriOku(db) {
  const grupla = (satirlar, alan) => { const m = new Map(); satirlar.forEach((s) => { const a = s[alan]; if (!m.has(a)) m.set(a, []); m.get(a).push(s); }); return m; };
  const [tanimS, muhasebeS, cariS, cariHS, urunS, varyantS, stokHS, uretimS, atamaS] = await Promise.all([
    db.from("tanimlar").select("veri").eq("id", "tekil").maybeSingle(),
    db.from("muhasebe").select("veri").eq("id", "tekil").maybeSingle(),
    tumSatirlar(db, "cariler"),
    tumSatirlar(db, "cari_hareketleri"),
    tumSatirlar(db, "urunler", "id,ad,kategori,birim,alis_fiyati,alis_para_birimi,ek"),
    tumSatirlar(db, "varyantlar", "urun_id,renk,beden,miktar"),
    tumSatirlar(db, "stok_hareketleri"),
    tumSatirlar(db, "uretim"),
    tumSatirlar(db, "uretim_atamalari"),
  ]);
  const cariHMap = grupla(cariHS, "cari_id");
  const cariler = cariS.map((c) => ({
    ...kayitaCevir(c), ...(c.ek || {}),
    hareketler: (cariHMap.get(c.id) || []).map((h) => {
      const k = kayitaCevir(h); const ek = k.ek || {}; delete k.ek;
      Object.entries(ek).forEach(([a, d]) => { if (d !== null && d !== undefined) k[a] = d; });
      return k;
    }),
  }));
  const varyantMap = grupla(varyantS, "urun_id");
  const stokHMap = grupla(stokHS, "urun_id");
  const stok = urunS.map((u) => ({
    ...ekiKokeAc(kayitaCevir(u)),
    variants: (varyantMap.get(u.id) || []).map((v) => ({ renk: v.renk, beden: v.beden, miktar: Number(v.miktar) || 0 })),
    hareketler: (stokHMap.get(u.id) || []).map((h) => ekiKokeAc(kayitaCevir(h))),
  }));
  const atamaMap = grupla(atamaS, "uretim_id");
  const uretim = uretimS.map((o) => {
    const atamalar = atamaMap.get(o.id) || [];
    return { ...ekiKokeAc(kayitaCevir(o)), prosesIlerleme: (o.proses_ilerleme || []).map((p) => ({ ...p, atamalar: atamalar.filter((a) => a.proses === p.proses).map((a) => ekiKokeAc(kayitaCevir(a))) })) };
  });
  return { tanimlar: (tanimS.data && tanimS.data.veri) || {}, muhasebe: (muhasebeS.data && muhasebeS.data.veri) || {}, cariler, stok, uretim };
}

// KONU SATIRI GÜVENLİ (v1.724.2 — kullanıcı, Gmail'de ham MIME görünen gün sonu raporu: "Gün sonu raporu bozuldu"). denomailer
// 1.6.0 konuyu `=?utf-8?Q?…?=` ile kodlarken 76. karakterde yumuşak satır sonu ("=\r\n") koyuyor; başlık satırının devamı
// boşlukla başlamadığı için posta sunucusu başlıkları orada bitmiş sayıyor, gövde ve ekler ham metin olarak görünüyor. Firma
// ünvanı uzayınca (Talay Ayakkabı Tekstil İnşaat San Tic Ltd Şti) konu bu sınırı aştı. Konu ASCII'ye çevrilir (ğ→g, ş→s, ı→i…)
// ve 60 karakterle sınırlanır: ASCII metin kodlanınca uzamaz, 60 + 12 sarmalayıcı < 76. Kelime ortasından kesmez.
const TR_ASCII: Record<string, string> = { "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "ı": "i", "İ": "I", "ö": "o", "Ö": "O", "ş": "s", "Ş": "S", "ü": "u", "Ü": "U", "—": "-", "–": "-", "·": "-", "’": "'", "“": "\"", "”": "\"" };
function konuGuvenli(konu: string, enFazla = 60): string {
  const ascii = String(konu || "").split("").map((h) => TR_ASCII[h] ?? (h.charCodeAt(0) < 128 ? h : "-")).join("").replace(/\s+/g, " ").trim();
  if (ascii.length <= enFazla) return ascii;
  const kesik = ascii.slice(0, enFazla);
  const bosluk = kesik.lastIndexOf(" ");
  return (bosluk > enFazla - 20 ? kesik.slice(0, bosluk) : kesik).trim();
}

function base64Utf8(metin: string) {
  const bayt = new TextEncoder().encode(metin);
  let ikili = "";
  for (let i = 0; i < bayt.length; i += 0x8000) ikili += String.fromCharCode(...bayt.subarray(i, i + 0x8000));
  return btoa(ikili);
}

async function raporGonder(veriler, gun: string, saatMetni: string) {
  const firma = (veriler.tanimlar && veriler.tanimlar.firmaBilgileri) || {};
  const ayar = firma.gunSonu || {};
  const smtp = firma.eposta || {};
  const sifre = Deno.env.get("SMTP_SIFRE") || smtp.sifre || "";
  const alicilar = gunSonuAlicilari(ayar);
  if (!smtp.sunucu || !smtp.kullanici || !sifre) throw new Error("E-posta ayarları eksik — Tanımlar › Firma › E-posta ve SMTP_SIFRE sırrı");
  if (alicilar.length === 0) throw new Error("Alıcı yok — Gün Sonu Raporu › Otomatik gönderim › alıcılar");
  const veri = gunSonuVerisi({ gun, defter: ayar.defter || "Tümü", cariler: veriler.cariler, muhasebe: veriler.muhasebe, stok: veriler.stok, uretim: veriler.uretim });
  const html = pdfCiktiBelgesi(gunSonuHTML(veri, firma, `${saatMetni} (sunucu)`));
  const o = veri.ozet;
  const yaz = (m) => (Object.keys(m || {}).length ? Object.entries(m).map(([pb, t]) => `${Number(t).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${pb}`).join(" · ") : "—");
  const metin = `${gun.split("-").reverse().join(".")} gün sonu özeti\n\nSatış: ${yaz(o.satis)}\nAlış: ${yaz(o.alis)}\n` +
    `Kasa/Banka giriş: ${yaz(o.kasaGiris)}\nKasa/Banka çıkış: ${yaz(o.kasaCikis)}\nKasa + Banka gün sonu: ${yaz(o.kasaBakiye)}\n` +
    `Portföydeki çekler: ${yaz(o.cekToplam)}\nStok tutarı (alış fiyatıyla): ${yaz(o.stokTutar)}\n\nAyrıntılı rapor ekte.\n${firma.unvan || ""}`;
  const port = Number(smtp.port) || 465;
  const istemci = new SMTPClient({ connection: { hostname: smtp.sunucu, port, tls: (smtp.tls || (port === 465 ? "tls" : "starttls")) === "tls", auth: { username: smtp.kullanici, password: sifre } } });
  try {
    await istemci.send({
      from: smtp.gonderenAd ? `${smtp.gonderenAd} <${smtp.kullanici}>` : smtp.kullanici,
      to: alicilar,
      subject: konuGuvenli(`Gun sonu raporu - ${gun.split("-").reverse().join(".")} - ${firma.unvan || ""}`),
      content: metin,
      html,
      attachments: [{ filename: `Gun-sonu-${gun}.html`, contentType: "text/html; charset=utf-8", encoding: "base64", content: base64Utf8(html) }],
    });
  } finally {
    try { await istemci.close(); } catch { /* */ }
  }
  return `${alicilar.length} alıcı`;
}

Deno.serve(async (istek: Request) => {
  if (istek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (istek.method !== "POST") return yanit(405, { tamam: false, hata: "Yalnız POST" });
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // ÇAĞIRAN: zamanlayıcı (GUN_SONU_ANAHTAR başlığı) ya da giriş yapmış kullanıcı (yalnız "deneme").
  const anahtar = Deno.env.get("GUN_SONU_ANAHTAR") || "";
  const zamanlayici = !!anahtar && istek.headers.get("x-gun-sonu-anahtar") === anahtar;
  if (!zamanlayici) {
    const jeton = (istek.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = jeton ? await anon.auth.getUser(jeton) : { data: null, error: true };
    if (error || !data?.user) return yanit(401, { tamam: false, hata: "Yetkisiz — giriş yapılmalı ya da zamanlayıcı anahtarı" });
  }

  const simdi = istanbulSimdi();
  try {
    if (!zamanlayici) {
      // DENEME: bugünün raporu hemen gönderilir; gönderim kaydına yazılmaz (akşamki otomatik gönderimi engellemesin).
      const veriler = await veriOku(db);
      const mesaj = await raporGonder(veriler, simdi.gun, simdi.metin);
      return yanit(200, { tamam: true, mesaj });
    }
    const { data: tanimS } = await db.from("tanimlar").select("veri").eq("id", "tekil").maybeSingle();
    const ayar = (tanimS?.veri?.firmaBilgileri?.gunSonu) || {};
    if (!ayar.otomatik) return yanit(200, { tamam: true, mesaj: "otomatik gönderim kapalı" });
    const [s, d] = String(ayar.saat || "19:00").split(":").map((x) => parseInt(x, 10) || 0);
    if (simdi.dakika < s * 60 + d) return yanit(200, { tamam: true, mesaj: "saat gelmedi" });
    // SAHİPLEN: günün satırı ilk yazana ait; çakışma (23505) = başka çağrı gönderiyor/göndermiş.
    const { error: sahip } = await db.from("gun_sonu_gonderim").insert({ gun: simdi.gun, durum: "gönderiliyor" });
    if (sahip) return yanit(200, { tamam: true, mesaj: sahip.code === "23505" ? "bugün gönderildi" : `kayıt yazılamadı: ${sahip.message}` });
    try {
      const veriler = await veriOku(db);
      const mesaj = await raporGonder(veriler, simdi.gun, simdi.metin);
      await db.from("gun_sonu_gonderim").update({ durum: `gönderildi (${mesaj})`, zaman: new Date().toISOString() }).eq("gun", simdi.gun);
      return yanit(200, { tamam: true, mesaj });
    } catch (e) {
      // Hata kaydedilir ve satır SİLİNMEZ: her 15 dakikada yeniden denenip aynı hatayla posta kutusu doldurulmasın.
      // Düzeltince "Sunucudan şimdi gönder" ile elle gönderilir.
      await db.from("gun_sonu_gonderim").update({ durum: `HATA: ${String((e as Error)?.message || e)}`, zaman: new Date().toISOString() }).eq("gun", simdi.gun);
      throw e;
    }
  } catch (e) {
    return yanit(500, { tamam: false, hata: String((e as Error)?.message || e) });
  }
});
