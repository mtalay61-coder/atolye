#!/usr/bin/env node
// F2 / BEKLEYEN DEFTER — KALICI SUNUCU REDDİ (kullanıcı kararı 2 Kasım: "reddedilen bu tür işlemler bekleyen kayıt defterinde sonsuz
// otomatik tekrar döngüsüne girmemeli; yerel kayıt silinmeden kullanıcıya açık hata gösterilmeli ve inceleme gerektiren duruma
// alınmalı"). Bugünkü istemcinin (F0_ERP ile eski 1.742.1) GERÇEK yazma yolu: 040 tabloYaz → supabaseTabloEsitle → stk_yaz.
// Sunucu: bu dalın SQL'i (F1.1, kurallar KAPALI — canlının hâli). Bayat yerel veri bağı çözülmüş hareketi yeniden yazar → 42501.
// 100-app bekleyenleriYenidenGonder her 60 sn ve "online"da bekleyen tabloları AYNI tabloYaz ile yeniden gönderir (sayaç sınırsız,
// geçici / kalıcı hata ayrımı yok) — burada o çağrı N kez tekrarlanır. Tarayıcıda zamanlayıcının kendisi: senaryo-kalici-red.js.
// KIRMIZI beklenen kontroller hedef davranışı ister (F2 istemci düzeltmesi sonrası yeşil).
const F = require("../f0/f11-ortak.js");
const { E, ON } = F;
const kutu = {};
window.storage = {
  async get(a) { if (!(a in kutu)) throw new Error("bulunamadı: " + a); return { key: a, value: kutu[a], shared: true }; },
  async set(a, d) { kutu[a] = String(d); return { key: a, value: String(d), shared: true }; },
  async delete(a) { delete kutu[a]; return { key: a, deleted: true }; },
  async list(on = "") { return { keys: Object.keys(kutu).filter((k) => k.startsWith(on)) }; },
};
const TEKRAR = Number(process.env.F2_TEKRAR || 5);

(async () => {
  console.log(`F2 bekleyen defter / kalıcı ret · önek ${ON} · istemci ${process.env.F0_ERP ? "F0_ERP" : "bugünkü"} · iz sütunları ${F.izSutunlari()}/3`);
  const kural0 = F.kurallarAcik();
  F.kurallariAyarla(false);
  // KONTROL: aynı ilgisiz değişiklik (Taba asgari stok 5) TEK BAŞINA bu yoldan yazılabiliyor mu
  {
    const taban = F.stokOku(); E.tabloBaslangicTam("urunler", JSON.parse(JSON.stringify(taban)));
    const y = JSON.parse(JSON.stringify(taban)); y.forEach((u) => (u.variants || []).forEach((v) => { if (v.renk === "Taba") v.minStok = 5; }));
    const r = await E.tabloYaz("stok:items", "urunler", y);
    const m = F.psql(`select string_agg(v.min_stok::text, ',') from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id where v.urun_id = 'u-yeni' and r.ad = 'Taba';`);
    F.kontrol("BR.kontrol-tek-basina", "kontrol: ilgisiz değişiklik tek başına yazılır (asgari stok 5)", { sonra: { ok: r.ok, minStok: m }, gercek: [r.ok, /(^|,)5(,|$)/.test(m || "")], beklenen: [true, true] });
    E.bekleyenYazmalariOku()["stok:items"] && console.log("  ! kontrol yazması deftere düştü");
  }
  const k = `${ON}-k`, s = F.siparisKur(F.sipObj(`${ON}-s`, [F.kalemObj(k, 20, 0)]));
  const fis = F.rpc("fis_kes", F.teslimYuku({ s, kalemId: k, adet: 3, ekran: 0, istek: `${ON}-i` })).sonuc.fisNo;
  const yerelA = F.stokOku();                       // A cihazı: sipariş iptalinden ÖNCEKİ fotoğraf
  await F.siparisIptal(s, F.yerelOku(s));           // B cihazı siparişi iptal eder (bağ geçmişe)
  E.tabloBaslangicTam("urunler", JSON.parse(JSON.stringify(yerelA)));
  const yeni = JSON.parse(JSON.stringify(yerelA));
  yeni.forEach((u) => (u.hareketler || []).forEach((h) => { if (h.fisNo === fis) h.aciklama = "A cihazında düzenlendi"; }));
  // A'nın aynı tablodaki İLGİSİZ, meşru bir değişikliği de aynı yazmaya biner (ör. varyantın asgari stoğu)
  yeni.forEach((u) => (u.variants || []).forEach((v) => { if (v.renk === "Taba") v.minStok = 7; }));

  const istekSay = () => F.giden.filter((g) => g.ad === "stk_yaz").length;
  const denemeler = [];
  let sonuc = null;
  for (let i = 0; i < TEKRAR; i++) {
    F.giden.length = 0;
    sonuc = await E.tabloYaz("stok:items", "urunler", yeni);
    const d = E.bekleyenYazmalariOku()["stok:items"] || null;
    denemeler.push({ tur: i + 1, ok: sonuc.ok, stkYaz: istekSay(), deneme: d && d.deneme });
  }
  const yerelKalan = JSON.parse(kutu["stok:items"] || "[]");
  const yerelSatir = yerelKalan.flatMap((u) => u.hareketler || []).find((h) => h.fisNo === fis) || {};
  const d = E.bekleyenYazmalariOku()["stok:items"] || {};
  const kayit = (E.bekleyenKayitlariOku() || {}).urunler || null;
  const sunucu = F.durum(k, fis); const sat = (sunucu.satirlar || [])[0] || {};
  const minStok = F.psql(`select string_agg(v.min_stok::text, ',') from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id where v.urun_id = 'u-yeni' and r.ad = 'Taba';`);
  F.kurallariAyarla(kural0);
  F.gozlem("BR.olcum", "her tekrar (bekleyenleriYenidenGonder ile aynı çağrı)", denemeler);
  F.gozlem("BR.hata-metni", "defterde saklanan hata", String(d.hata || "").slice(0, 160));

  F.kontrol("BR.sunucu-korur", "sunucu bağı diriltmez (her tekrarda reddeder), iz ve karşılanan aynı", {
    sonra: { satir: sat, karsilanan: sunucu.karsilanan }, gercek: [sat.kalem, sat.gecmisKalem, sunucu.karsilanan], beklenen: [null, k, 3] });
  F.kontrol("BR.yerel-korunur", "yerel kayıt silinmez (A cihazının düzenlemesi yerelde duruyor)", {
    sonra: { aciklama: yerelSatir.aciklama }, gercek: yerelSatir.aciklama, beklenen: "A cihazında düzenlendi" });
  // 1.744.0: reddedilen satır bekleyen kayıt defterinde DEĞİL, kalıcı inceleme deposunda yerel hâliyle (yedek) durur; ikisi de
  // localStorage — uygulama kapanınca kaybolmaz. 1.743.0 / 1.742.1: bekleyen kayıt defteri.
  const incY = typeof E.incelemeOku === "function" ? Object.values(E.incelemeOku().urunler || {}).some((x) => x && x.kayit) : false;
  F.kontrol("BR.bekleyen-kayit", "gönderilemeyen değişiklik kalıcı olarak saklandı (bekleyen kayıt defteri ya da inceleme yedeği)", {
    sonra: { bekleyenKayit: !!kayit, incelemeYedegi: incY }, gercek: !!kayit || incY, beklenen: true });
  // HEDEF (bugün kırmızı): kalıcı ret otomatik tekrar EDİLMEZ — ilk retten sonra sunucuya yeniden gitmez, deneme sayacı büyümez
  const otomatikTekrar = denemeler.slice(1).reduce((t, x) => t + x.stkYaz, 0);
  F.kontrol("BR.otomatik-tekrar-yok", `kalıcı ret ${TEKRAR - 1} otomatik denemede yeniden gönderilmez`, {
    sonra: { ilkTurdanSonraStkYaz: otomatikTekrar, deneme: d.deneme }, gercek: otomatikTekrar, beklenen: 0 });
  // 1.744.0: reddedilen SATIR "bekleyen:inceleme"de (030 incelemeOku); satır bilinmiyorsa bekleyen yazma kaydı `inceleme: true`
  const inc = typeof E.incelemeOku === "function" ? (E.incelemeOku().urunler || {}) : {};
  const hid = F.psql(`select id from public.stk_hareket where fis_id = '${fis}' limit 1;`);
  F.kontrol("BR.inceleme-durumu", "kayıt 'inceleme gerekiyor' olarak işaretli (geçici ağ hatasından ayrı), reddedilen yerel hâl yedekte", {
    sonra: { bekleyenKaydi: d, inceleme: inc[hid] ? { ...inc[hid], kayit: inc[hid].kayit ? "var" : null } : null },
    gercek: !!(d.inceleme || (inc[hid] && inc[hid].kayit)), beklenen: true });
  F.kontrol("BR.ilgisiz-degisiklik", "aynı tablodaki ilgisiz meşru değişiklik reddedilen satır yüzünden takılmaz", {
    sonra: { tabaMinStok: minStok }, gercek: /(^|,)7(,|$)/.test(minStok || ""), beklenen: true });
  F.bitir();
})().catch((e) => { try { F.kurallariAyarla(true); } catch (x) { /* */ } console.error(e); process.exit(2); });
