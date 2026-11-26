#!/usr/bin/env node
// TANIMLAR × İKİ CİHAZ AYNI ANDA (26–27 Kasım, kapsamlı inceleme 25 B2). Uygulama EKRANDAN, iki ayrı tarayıcı = iki cihaz, aynı yerel
// PostgreSQL (gercek-pg-kopru). Canlıya dokunmaz.
//
// B'nin Tanımlar YAZMASI (1.744.37: koşulsuz POST · 1.744.39: sürüm koşullu PATCH) A'nın yazması bitene kadar BEKLETİLİR — B okumasını
// yapmış, yazması yolda (yavaş mobil ağ). Sonra B'nin yazması salınır.
// SENARYO (ortam değişkeni):
//   ekle    — A "Kırmızı", B "Lacivert" ekler. Beklenen: ikisi de sunucuda ve stk_renk'te etkin. (1.744.37: Kırmızı KAYBOLUR.)
//   cakisma — A "Vizon Yılan" rengini "Vizon Deri", B "Vizon Rugan" yapar (aynı alan). Beklenen (1.744.39): sunucuda A'nın değeri
//             kalır (B sessizce ezmez), B'de "İnceleme gerekiyor" şeridinde çakışma satırı, B'nin değişikliği bekleyen defterde (kaybolmadı);
//             B "Benimkini uygula" deyince sunucuya B'nin değeri gider.
// YARIS=0 → kontrol (bekletme yok, sıralı).
const path = require("path");
const { ekranAc, toastlar } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const DB = process.env.EKRAN_DB || "inc_yaris";
const YARIS = process.env.YARIS !== "0";
const SENARYO = process.env.SENARYO || "ekle";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
const renkSekmesi = async (sayfa) => {
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-urun-alt="renk"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
};
const renkEkle = async (sayfa, ad) => { const kutu = sayfa.locator('input[placeholder="Örn. Ham Bej"]').first(); await kutu.fill(ad); await kutu.press("Enter"); };
const renkAdi = async (sayfa, eski, yeni) => { const kutu = sayfa.locator(`input[value="${eski}"]`).first(); await kutu.fill(yeni); await kutu.press("Enter"); };

(async () => {
  let tut = null; const tutulan = [];
  const mudahaleB = async (s) => {
    await s.route("**/rest/v1/tanimlar**", async (r) => {
      const m = r.request().method();
      if ((m === "POST" || m === "PATCH") && tut) { await tut; tutulan.push(m); }
      return r.fallback();
    });
  };
  const A = await ekranAc(DB, {});
  const B = await ekranAc(DB, { mudahale: mudahaleB });
  B.sayfa.on("dialog", (d) => d.accept());
  const surum = await A.sayfa.evaluate(() => (document.body.innerText.match(/v1\.\d+\.\d+/) || [""])[0]);
  console.log(`ekran-tanim-yaris · ${DB} · ${SENARYO} · ${YARIS ? "YARIŞ (B'nin yazması A'dan sonra varır)" : "KONTROL (sıralı)"} · istemci ${surum}`);
  await renkSekmesi(A.sayfa); await renkSekmesi(B.sayfa);
  const k = A.k;
  const sunucuRenkleri = async () => (await k.sorgu(`select array(select r ->> 'ad' from jsonb_array_elements(veri -> 'renkler') r order by 1) as a from public.tanimlar where id = 'tekil'`))[0].a;
  const etkin = async () => (await k.sorgu(`select array(select ad from public.stk_renk where tur = 'renk' and aktif order by 1) as a`))[0].a;
  const isle = async (b, a) => {
    let birak;
    if (YARIS) { tut = new Promise((r) => { birak = r; }); await b(); await B.sayfa.waitForTimeout(1500); await a(); await A.sayfa.waitForTimeout(4000); tut = null; birak(); }
    else { await a(); await A.sayfa.waitForTimeout(4000); await b(); }
    await B.sayfa.waitForTimeout(20000);
  };

  if (SENARYO === "ekle") {
    await isle(() => renkEkle(B.sayfa, "Lacivert"), () => renkEkle(A.sayfa, "Kırmızı"));
    console.log(`  B'nin bekletilen yazması: ${tutulan.join(",") || "yok"}`);
    k_("Tanımlar renkleri (sunucu)", await sunucuRenkleri(), ["Kırmızı", "Lacivert", "Siyah", "Vizon Yılan"]);
    k_("stk_renk etkin renkler", await etkin(), ["Kırmızı", "Lacivert", "Siyah", "Vizon Yılan"]);
    // KODLAR (kullanıcı, 27 Kasım: "büyük sayacı almak iki cihazın aynı kodu üretmesini tek başına engellemez"): renk kodu (kod) ve
    // barkod kodu (barkodKodu) bütün renklerde TEKİL olmalı — iki cihaz aynı sayaçtan aynı kodu vermiş olsa bile.
    const kodlar = (await k.sorgu(`select r ->> 'ad' as ad, r ->> 'kod' as kod, r ->> 'barkodKodu' as bk from public.tanimlar, jsonb_array_elements(veri -> 'renkler') r where id = 'tekil' order by 1`));
    console.log("  kodlar:", JSON.stringify(kodlar));
    const tekil = (alan) => { const d = kodlar.map((x) => x[alan]).filter((x) => x != null && x !== ""); return d.length === new Set(d).size; };
    k_("renk kodları (kod) tekil", tekil("kod"), true);
    k_("barkod kodları (barkodKodu) tekil", tekil("bk"), true);
    k_("iki yeni rengin ikisi de kodlu", kodlar.filter((x) => ["Kırmızı", "Lacivert"].includes(x.ad)).every((x) => x.kod && x.bk), true);
  } else {
    await isle(() => renkAdi(B.sayfa, "Vizon Yılan", "Vizon Rugan"), () => renkAdi(A.sayfa, "Vizon Yılan", "Vizon Deri"));
    console.log(`  B'nin bekletilen yazması: ${tutulan.join(",") || "yok"}`);
    const seritB = await B.sayfa.evaluate(() => [...document.querySelectorAll("[data-tanim-cakisma-satir]")].map((x) => x.getAttribute("data-tanim-cakisma-satir")));
    const bekleyenB = await B.sayfa.evaluate(() => { try { return Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}")); } catch (e) { return []; } });
    // Yerel kopya IndexedDB'de (guvenliYaz); ekrandaki Tanımlar listesi bellekteki hâli gösterir.
    const yerelB = await B.sayfa.evaluate(() => ["Siyah", "Vizon Rugan", "Vizon Deri", "Vizon Yılan"].filter((a) => [...document.querySelectorAll("input")].some((i) => i.value === a)));
    k_("sunucuda A'nın değeri (B sessizce ezmedi)", await sunucuRenkleri(), ["Siyah", "Vizon Deri"]);
    k_("B'de çakışma şeridi: hangi öğe", seritB, ["renkler › Vizon Rugan › ad"]);
    k_("B'nin değişikliği bekleyen defterde (kaybolmadı)", bekleyenB.includes("tanimlar:data"), true);
    k_("B'nin yerel Tanımlar'ı kendi değerini koruyor", yerelB, ["Siyah", "Vizon Rugan"]);
    // KARAR VERİLİRKEN ÜÇÜNCÜ YAZMA (kullanıcı, 27 Kasım): onay yalnız GÖRÜLEN çakışmayı çözer.
    //   karar_ucuncu  — A bu arada başka bir renk ("Mor") ekler → B onaylayınca Mor KALIR, yalnız çakışan ad B'nin olur.
    //   karar_degisti — A bu arada AYNI alanı yeniden değiştirir ("Vizon Saten") → B'nin onayı geçersiz: sunucu A'nın son değerini
    //                   korur, B'ye YENİDEN sorulur (şeritte sunucu değeri "Vizon Saten").
    if (SENARYO === "karar_ucuncu") { await renkEkle(A.sayfa, "Mor"); await A.sayfa.waitForTimeout(5000); }
    if (SENARYO === "karar_degisti") { await renkAdi(A.sayfa, "Vizon Deri", "Vizon Saten"); await A.sayfa.waitForTimeout(5000); }
    if (seritB.length) {
      await B.sayfa.locator("[data-tanim-cakisma-benim]").first().click();
      await B.sayfa.waitForTimeout(8000);
      if (SENARYO === "karar_degisti") {
        k_("karar sırasında aynı alan yeniden değişti → sunucuda A'nın SON değeri korundu", await sunucuRenkleri(), ["Siyah", "Vizon Saten"]);
        const yeniden = await B.sayfa.evaluate(() => [...document.querySelectorAll("[data-tanim-cakisma-satir]")].map((x) => x.innerText.replace(/\s+/g, " ")));
        k_("B'ye yeniden soruldu (şeritte yeni sunucu değeri)", yeniden.length === 1 && /Vizon Saten/.test(yeniden[0]), true);
      } else {
        k_("'Benimkini uygula' → sunucuda B'nin değeri" + (SENARYO === "karar_ucuncu" ? ", A'nın bu arada eklediği Mor KORUNDU" : ""), await sunucuRenkleri(),
          SENARYO === "karar_ucuncu" ? ["Mor", "Siyah", "Vizon Rugan"] : ["Siyah", "Vizon Rugan"]);
        k_("çakışma şeridi kapandı", await B.sayfa.locator("[data-tanim-cakisma-satir]").count(), 0);
      }
    }
  }
  console.log(`  B bildirimleri: ${(await toastlar(B.sayfa)).slice(0, 240)}`);
  console.log(`── ekran-tanim-yaris (${SENARYO}, ${YARIS ? "yarış" : "kontrol"}): ${gecen} geçti · ${kalan} kaldı ──`);
  await A.tarayici.close(); await B.tarayici.close();
  process.exit(kalan ? 1 : 0);
})().catch((h) => { console.error("HATA", h); process.exit(2); });
