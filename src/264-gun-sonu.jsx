// ================= FİNANS › GÜN SONU RAPORU (v1.686.0) =================
//
// Kullanıcı: "Gün sonu raporu yapalım, her günün sonunda mail atsın ve indirilenler olsun. Gün içerisindeki
// hareketleri — alış, satış, kasa hareketleri, üretim hareketleri gibi — detaylı raporlasın; gün sonu cari bakiyeleri,
// eldeki çekler, kasada ve bankadaki paralar, stok miktarları vs."
//
// HESAP TEK YERDE (`gunSonuVerisi`, saf): ekran, PDF/yazdır, Excel ve e-posta aynı veriyi okur — biri ötekinden
// ayrışmasın. Kurallar ERP'nin geri kalanıyla aynı: cari bakiye `cariMutabakatBakiyesi` (263; tarih ≤ gün, deftere
// göre, para birimi başına), kasa/banka `defterKapsar` + tarih ≤ gün, stok = hareketlerin gün sonuna kadarki toplamı
// (hareketi olmayan ürün `variants`'tan — 012 `stokMiktarlariniHesapla` ile aynı istisna).
// ÇEKLER BUGÜNKÜ DURUMLA: çekin durum geçmişi tarih tarih tutulmuyor; geçmiş bir günün raporunda "portföy" şu anki
// portföydür (rapor bunu başlıkta yazar).
//
// OTOMATİK GÖNDERİM SUNUCUDA (v1.687.0 — kullanıcı: "sunucudan otomatik gönderilsin, uygulama açık olmasa da"):
// `supabase-gun-sonu-fonksiyonu.ts` (Edge Function `gun-sonu`), Supabase zamanlayıcısı (pg_cron, `gun-sonu.sql`) her 15
// dakikada çağırır. Ayarlar Tanımlar'da `firmaBilgileri.gunSonu` = { otomatik, saat, alicilar, defter }; fonksiyon
// İstanbul saatiyle saat geçmişse ve o günün raporu gönderilmemişse gönderir. Gönderim kaydı AYRI tabloda
// (`gun_sonu_gonderim`, gün birincil anahtar → aynı gün iki kez gitmez); Tanımlar'a yazılmaz, çünkü uygulama
// Tanımlar'ı bütün olarak yazıyor ve sunucunun işaretini ezerdi. FONKSİYON BU DOSYADAN ÜRETİLİR (`gun-sonu-sunucu.js`):
// hesap ve görünüm burada değişince sunucudaki de aynı kalsın — yalnız yeniden yapıştırılması gerekir. Bu yüzden
// `gunSonuVerisi`/`gunSonuHTML` ve kullandıkları SAF kalmalı (React/window/document yok; üretici denetler).

function gunSonuGun(t) { return String(t || "").slice(0, 10); }
function gunSonuPara(t, pb) {
  return `${(Number(t) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb || ""}`.trim();
}
function gunSonuPBToplam(liste, tutarAl, pbAl) {
  const m = {};
  liste.forEach((x) => { const pb = pbAl(x) || "TRY"; m[pb] = stokYuvarla((m[pb] || 0) + (Number(tutarAl(x)) || 0)); });
  return m;
}

// ALIŞ FİYATI: ürünün gün sonuna kadarki EN SON alış fişi fiyatı (renk/beden ayırmadan; kalemin kendi birimi — çevrildiyse
// ham fiyat, 077 `alisDizini` ile aynı okuma); alış fişi yoksa kart alış fiyatı (`alisFiyati` + `alisPbKodu`).
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

// PDF / yazdır / e-posta gövdesi. Tablolar sade (PDF_CIKTI_STILI ile çizilir).
// BÖLÜMLER (v1.688.4): her bölüm { baslik, kolonlar: [[ad, sağaYaslı]], satirlar: [[hücre…]] } — e-posta/PDF (gunSonuHTML)
// ve ekran (GunSonuListe: süzgeç, kaydırma, çerçeve — kullanıcı: "her liste rapor mantığında olsun") AYNI listeden çizer.
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

// Excel: her bölüm ayrı sayfa (rakamlar sayı olarak — Excel'de toplanabilsin).
function gunSonuExcel(v) {
  if (typeof XLSX === "undefined" || !XLSX.utils || !XLSX.utils.book_new) return false;
  const wb = XLSX.utils.book_new();
  const sayfa = (ad, satirlar) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(satirlar.length ? satirlar : [{ Bilgi: "Kayıt yok" }]), ad);
  sayfa("Fişler", v.fisler.flatMap((f) => f.kalemler.map((k) => ({ Tür: f.tur, "Fiş No": f.fisNo, Cari: f.cari, Ürün: k.urun, Renk: k.renk, Beden: k.beden, Miktar: k.miktar, Birim: k.birim, "Birim Fiyat": k.birimFiyat, Tutar: k.tutar, "P.B.": k.pb }))));
  sayfa("Cari hareketleri", v.cariHareketleri.map((x) => ({ Cari: x.cari, İşlem: x.tip, Yön: x.yon, Açıklama: x.aciklama, "Fiş No": x.fisNo, Tutar: x.tutar, "P.B.": x.pb, Defter: x.defter })));
  sayfa("Kasa-Banka hareketleri", v.kasaHareketleri.map((x) => ({ Hesap: x.hesap, Yön: x.yon, "Karşı taraf": x.karsi, Açıklama: x.aciklama, "Fiş No": x.fisNo, Tutar: x.tutar, "P.B.": x.pb })));
  sayfa("Üretim", [
    ...v.uretimHareketleri.map((x) => ({ Tür: "Stok hareketi", Ürün: x.urun, Renk: x.renk, Beden: x.beden, Sipariş: x.siparisNo, Fiş: x.fisNo, Miktar: x.miktar, Birim: x.birim })),
    ...v.uretimAsamalari.map((x) => ({ Tür: `Proses ${x.olay}`, Ürün: x.model, Renk: x.renk, Sipariş: x.siparisNo, Fiş: x.proses, Personel: x.personel, Miktar: x.miktar })),
  ]);
  sayfa("Stok hareketleri", v.stokHareketleri.map((x) => ({ Ürün: x.urun, Kategori: x.kategori, Renk: x.renk, Beden: x.beden, Kaynak: x.kaynak, Cari: x.cari, "Fiş No": x.fisNo, Miktar: x.miktar, Birim: x.birim })));
  sayfa("Kasa-Banka bakiyeleri", v.hesapBakiyeleri.map((x) => ({ Hesap: x.hesap, Giriş: x.giris, Çıkış: x.cikis, Bakiye: x.bakiye, "P.B.": x.pb })));
  sayfa("Çekler", v.cekler.map((x) => ({ Vade: x.vade, "Çek No": x.cekNo, Banka: x.banka, Cari: x.cari, Tutar: x.tutar, "P.B.": x.pb })));
  sayfa("Cari bakiyeleri", v.cariBakiyeListesi.flatMap((x) => Object.entries(x.bakiye).map(([pb, t]) => ({ Cari: x.cari, Tip: x.tip, Bakiye: stokYuvarla(t), "P.B.": pb }))));
  sayfa("Stok", v.stokMiktarlari.map((x) => ({ Kategori: x.kategori, Ürün: x.urun, Miktar: x.miktar, Birim: x.birim, "Alış fiyatı": x.fiyat, "P.B.": x.pb, "Fiyat kaynağı": x.kaynak, "Stok tutarı": x.tutar })));
  XLSX.writeFile(wb, `gun-sonu-${v.gun}.xlsx`);
  return true;
}

async function gunSonuEpostaGonder({ veri, firma, alicilar }) {
  const blob = await htmldenPdfBlob(gunSonuHTML(veri, firma));
  if (!blob) return { tamam: false, hata: "PDF hazırlanamadı" };
  const base64 = await new Promise((coz, red) => { const r = new FileReader(); r.onload = () => coz(String(r.result).split(",")[1]); r.onerror = red; r.readAsDataURL(blob); });
  const o = veri.ozet;
  const metin = `${tarihYaz(veri.gun)} gün sonu özeti\n\n` +
    `Satış: ${gunSonuPBMetni(o.satis)}\nAlış: ${gunSonuPBMetni(o.alis)}\n` +
    `Kasa/Banka giriş: ${gunSonuPBMetni(o.kasaGiris)}\nKasa/Banka çıkış: ${gunSonuPBMetni(o.kasaCikis)}\n` +
    `Kasa + Banka gün sonu: ${gunSonuPBMetni(o.kasaBakiye)}\nPortföydeki çekler: ${gunSonuPBMetni(o.cekToplam)}\n` +
    `Stok tutarı (alış fiyatıyla): ${gunSonuPBMetni(o.stokTutar)}\n` +
    `Üretimden stoğa giriş: ${o.uretimGiris.toLocaleString("tr-TR")}\n\nAyrıntılı rapor ektedir.\n${(firma && firma.unvan) || ""}`;
  const hatalar = [];
  for (const kime of alicilar) {
    const s = await epostaGonder({ kime, konu: `Gün sonu raporu — ${tarihYaz(veri.gun)} — ${(firma && firma.unvan) || ""}`.trim(), metin, dosyaAdi: `Gun sonu ${veri.gun}.pdf`, pdfBase64: base64 });
    if (!s.tamam) hatalar.push(`${kime}: ${s.hata}`);
  }
  return hatalar.length ? { tamam: false, hata: hatalar.join("; ") } : { tamam: true };
}

function gunSonuAlicilari(ayar) {
  return String((ayar && ayar.alicilar) || "").split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /@/.test(x));
}
// EKRAN LİSTESİ (v1.688.4 — kullanıcı: "her liste rapor mantığında olsun: filtreleme, kayma ve çerçeve"): bölüm çerçeveli
// kutuda, sabit yükseklikte kayar (başlık ve süzgeç satırı üstte sabit), her sütunun altında arama kutusu (içerir; tutar
// sütununda da metin olarak arar — "20.000" yazmak yeter). E-posta/PDF bu bileşeni kullanmaz (gunSonuHTML).
function GunSonuListe({ baslik, kolonlar, satirlar }) {
  const [ara, setAra] = useState({});
  const q = (i) => String(ara[i] || "").toLocaleLowerCase("tr-TR").trim();
  const suzulen = satirlar.filter((s) => kolonlar.every((_, i) => !q(i) || String(s[i] == null ? "" : s[i]).toLocaleLowerCase("tr-TR").includes(q(i))));
  const suzgecVar = kolonlar.some((_, i) => q(i));
  return (
    <div data-gun-sonu-bolum={baslik} style={{ marginTop: 14 }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 14, display: "flex", alignItems: "baseline", gap: 6 }}>
        {baslik} <span style={{ fontWeight: 400, color: "var(--erp-text-3)", fontSize: 11 }}>({suzgecVar ? `${suzulen.length} / ` : ""}{satirlar.length})</span>
        {suzgecVar && <button type="button" className="btn-ghost" onClick={() => setAra({})} style={{ marginLeft: "auto", padding: "1px 8px", fontSize: 11 }}>Süzgeci temizle</button>}
      </h3>
      {satirlar.length === 0 ? <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Kayıt yok</div> : (
        <div data-gun-sonu-kutu="1" style={{ maxHeight: 340, overflow: "auto", border: "1.5px solid var(--erp-line)", borderRadius: "var(--erp-r-md)" }}>
          <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--erp-panel)", zIndex: 1 }}>
              <tr>{kolonlar.map(([k, sag]) => <th key={k} style={{ fontSize: 10, padding: "6px 8px", textAlign: sag ? "right" : "left", color: "var(--erp-text-2)" }}>{k}</th>)}</tr>
              <tr>{kolonlar.map(([k, sag], i) => (
                <th key={k} style={{ padding: "0 4px 5px" }}>
                  <input data-gun-sonu-ara={`${baslik}|${k}`} value={ara[i] || ""} onChange={(e) => setAra((o) => ({ ...o, [i]: e.target.value }))} placeholder="ara…"
                    style={{ width: "100%", minWidth: 50, boxSizing: "border-box", fontSize: 11, padding: "3px 5px", border: "1px solid var(--erp-line)", borderRadius: 4, fontWeight: 400, textAlign: sag ? "right" : "left" }} />
                </th>
              ))}</tr>
            </thead>
            <tbody>{suzulen.map((s, j) => (
              <tr key={j} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                {s.map((h, i) => <td key={i} style={{ padding: "5px 8px", textAlign: kolonlar[i][1] ? "right" : "left", whiteSpace: kolonlar[i][1] ? "nowrap" : undefined }}>{h}</td>)}
              </tr>
            ))}</tbody>
          </table>
          {suzulen.length === 0 && <div style={{ fontSize: 11, color: "var(--erp-text-3)", padding: 8 }}>Süzgece uyan kayıt yok.</div>}
        </div>
      )}
    </div>
  );
}

function GunSonuRaporu({ cariler, muhasebe, stok, uretim, tanimlar, saveTanimlar, aktifKullanici, showToast }) {
  const [gun, setGun] = useState(bugunYerel());
  const [defter, setDefter] = useState("Tümü");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const firma = (tanimlar && tanimlar.firmaBilgileri) || {};
  const ayar = firma.gunSonu || {};
  const smtp = firma.eposta || {};
  const smtpVar = !!(smtp.sunucu && smtp.kullanici);
  const yonetici = aktifKullanici && aktifKullanici.rol === "Yönetici";
  const veri = React.useMemo(() => gunSonuVerisi({ gun, defter, cariler, muhasebe, stok, uretim }), [gun, defter, cariler, muhasebe, stok, uretim]);
  const html = React.useMemo(() => gunSonuHTML(veri, firma), [veri, firma]);
  const ustHtml = React.useMemo(() => gunSonuHTML(veri, firma, undefined, true), [veri, firma]);

  // Sunucunun son gönderimi (`gun_sonu_gonderim` tablosu). Tablo yoksa ya da okunamazsa sessiz: bilgi amaçlı.
  const [sonGonderim, setSonGonderim] = useState(undefined);
  const sonGonderimOku = React.useCallback(() => {
    if (typeof supabaseIstek !== "function" || !supabaseAcikMi()) return;
    supabaseIstek("gun_sonu_gonderim?select=gun,durum,zaman&order=gun.desc&limit=1")
      .then((r) => setSonGonderim(Array.isArray(r) && r[0] ? r[0] : null)).catch(() => {});
  }, []);
  React.useEffect(() => { sonGonderimOku(); }, [sonGonderimOku]);
  const [sunucuDeneniyor, setSunucuDeneniyor] = useState(false);
  const sunucudanDene = React.useCallback(async () => {
    setSunucuDeneniyor(true);
    try {
      const yanit = await fetch(`${SUPABASE_URL}/functions/v1/gun-sonu`, {
        method: "POST", headers: { ...(await yetkiBasliklari()), "Content-Type": "application/json" },
        body: JSON.stringify({ deneme: true }),
      });
      const j = await yanit.json().catch(() => ({}));
      showToast(j.tamam ? `Sunucu raporu gönderdi: ${j.mesaj || ""}` : `Sunucu: ${j.hata || `HTTP ${yanit.status} — fonksiyon kurulu mu?`}`);
    } catch (e) {
      showToast(`Sunucuya ulaşılamadı: ${String((e && e.message) || e)}`);
    }
    setSunucuDeneniyor(false);
    sonGonderimOku();
  }, [showToast, sonGonderimOku]);
  const ayarYaz = (d) => saveTanimlar({ ...tanimlar, firmaBilgileri: { ...firma, gunSonu: { ...ayar, ...d } } });
  const yazdir = () => {
    const w = window.open("", "_blank");
    if (!w) { showToast("Açılır pencere engellendi"); return; }
    w.document.write(pdfCiktiBelgesi(html)); w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  };
  const pdfIndir = async () => {
    const gGun = gun;   // dosya adı, PDF'i hazırlanan günün adı olsun
    const blob = await htmldenPdfBlob(html);
    if (!blob) { showToast("PDF hazırlanamadı (bağlantı?)"); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `gun-sonu-${gGun}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const excelIndir = () => { if (!gunSonuExcel(veri)) showToast("Excel kütüphanesi yüklenemedi"); };
  const simdiGonder = React.useCallback(async () => {
    const alicilar = gunSonuAlicilari(ayar);
    if (alicilar.length === 0) { showToast("Önce alıcı e-posta adresi girin"); return; }
    const gVeri = veri;   // gönderim başladığındaki rapor — arada gün değişse de aynı rapor gider
    setGonderiliyor(true);
    const s = await gunSonuEpostaGonder({ veri: gVeri, firma, alicilar });
    setGonderiliyor(false);
    showToast(s.tamam ? `Gün sonu raporu gönderildi (${alicilar.length} alıcı)` : `Gönderilemedi: ${s.hata}`);
  }, [ayar, veri, firma, showToast]);

  const kutu = { border: "1.5px solid var(--hrk-renk)", borderRadius: 10, padding: 12, background: "#fff", marginBottom: 12 };
  const etiket = (m) => <span style={{ fontSize: 11, fontWeight: 700 }}>{m}</span>;
  return (
    <div data-gun-sonu="1" className="renkli-form" style={{ "--hrk-renk": "#2F6B4F" }}>
      <div style={{ ...kutu, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 3 }}>{etiket("Gün")}<input type="date" data-gun-sonu-tarih="1" value={gun} onChange={(e) => setGun(e.target.value || bugunYerel())} /></label>
        <label style={{ display: "grid", gap: 3 }}>{etiket("Defter")}
          <select value={defter} data-gun-sonu-defter="1" onChange={(e) => setDefter(e.target.value)}>{["Tümü", "Genel", "Resmi"].map((d) => <option key={d}>{d}</option>)}</select></label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="btn-ghost" onClick={yazdir}>Yazdır</button>
          <button className="btn-ghost" data-gun-sonu-pdf="1" onClick={pdfIndir}>PDF indir</button>
          <button className="btn-ghost" data-gun-sonu-excel="1" onClick={excelIndir}>Excel indir</button>
          <button className="btn-primary" data-gun-sonu-gonder="1" disabled={!smtpVar || gonderiliyor} onClick={simdiGonder}
            title={smtpVar ? "Raporu PDF ekli e-postayla şimdi gönder" : "Önce Tanımlar › Firma › E-posta gönderim ayarlarını girin"}>
            {gonderiliyor ? "Gönderiliyor…" : "E-posta gönder"}
          </button>
        </div>
      </div>
      <div style={{ ...kutu, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 12 }} data-gun-sonu-ayar="1">
        <b>Otomatik gönderim</b>
        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" data-gun-sonu-otomatik="1" disabled={!yonetici} checked={!!ayar.otomatik} onChange={(e) => ayarYaz({ otomatik: e.target.checked })} /> her gün
        </label>
        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>saat
          <input type="time" data-gun-sonu-saat="1" disabled={!yonetici} value={ayar.saat || "19:00"} onChange={(e) => ayarYaz({ saat: e.target.value || "19:00" })} />
        </label>
        <label style={{ display: "flex", gap: 4, alignItems: "center", flex: "1 1 260px" }}>alıcılar
          <input data-gun-sonu-alicilar="1" disabled={!yonetici} defaultValue={ayar.alicilar || ""} key={ayar.alicilar || ""} placeholder="ornek@firma.com, ikinci@firma.com"
            onBlur={(e) => { if (e.target.value !== (ayar.alicilar || "")) ayarYaz({ alicilar: e.target.value }); }} style={{ flex: 1 }} />
        </label>
        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>defter
          <select disabled={!yonetici} value={ayar.defter || "Tümü"} onChange={(e) => ayarYaz({ defter: e.target.value })}>{["Tümü", "Genel", "Resmi"].map((d) => <option key={d}>{d}</option>)}</select>
        </label>
        <button className="btn-ghost" data-gun-sonu-sunucu-dene="1" disabled={sunucuDeneniyor} onClick={sunucudanDene}
          title="Sunucu fonksiyonunu şimdi çalıştırır: bugünün raporunu alıcılara gönderir (kurulumu sınamak için)">
          {sunucuDeneniyor ? "Sunucu çalışıyor…" : "Sunucudan şimdi gönder (deneme)"}
        </button>
        <div style={{ width: "100%", color: "var(--erp-text-2)" }}>
          Rapor SUNUCUDAN gider (uygulama kapalı olsa da): her gün belirlenen saatten sonra, o günün raporu e-postanın
          içinde ve ekinde (indirilip yazdırılabilir HTML). Kurulum: Supabase'de <span className="mono">gun-sonu</span> fonksiyonu ve <span className="mono">gun-sonu.sql</span>.
          {sonGonderim && <> Son sunucu gönderimi: <b data-gun-sonu-son="1">{tarihYaz(sonGonderim.gun)}</b> — {sonGonderim.durum}</>}
          {sonGonderim === null && <> Sunucudan henüz gönderim kaydı yok.</>}
          {!smtpVar && <span style={{ color: "var(--erp-warn)" }}> E-posta için Tanımlar › Firma › E-posta gönderim ayarları ve Supabase'de SMTP_SIFRE gerekli.</span>}
          {!yonetici && <span> Ayarları yalnız Yönetici değiştirebilir.</span>}
        </div>
      </div>
      <div style={{ ...kutu, overflowX: "auto" }} data-gun-sonu-icerik="1">
        <div dangerouslySetInnerHTML={{ __html: ustHtml }} />
        {gunSonuBolumleri(veri).map((b) => <GunSonuListe key={b.baslik} {...b} />)}
      </div>
    </div>
  );
}
