#!/usr/bin/env node
// TANIMLAR × İKİ CİHAZ AYNI ANDA (26 Kasım, kapsamlı inceleme). Uygulama EKRANDAN (1.744.37), iki ayrı tarayıcı = iki cihaz, aynı
// yerel PostgreSQL (gercek-pg-kopru). Canlıya dokunmaz.
//
// SORU: Tanımlar tek satır (tanimlar.tekil). 030 tekilYaz: buluttan OKU → üç yönlü birleştir → koşulsuz POST (upsert). Okuma ile yazma
// arasında başka cihaz yazarsa, ikinci yazma ilkinin eklediğini görmeden bütün satırı basar mı? (tanimlar_surum tetikleyicisi sürümü
// artırıyor ama istemci yazmada sürüm koşulu göndermiyor.)
// ADIMLAR: A ve B açılır (ikisi de Ali). B'nin Tanımlar POST'u, A'nın POST'u bitene kadar BEKLETİLİR (B okumasını yapmış, yazması
//   yolda — yavaş mobil ağ). A "Kırmızı" ekler, B "Lacivert" ekler. Sonra B'nin yazması salınır.
// ÖLÇÜLEN (sunucudan): tanimlar.veri.renkler adları · stk_renk etkin adlar. Beklenen: ikisi de var.
// KONTROL (YARIS=0): B'nin yazması bekletilmez (A bitince B ekler) → beklenen: ikisi de var.
const path = require("path");
const { ekranAc } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const DB = process.env.EKRAN_DB || "inc_yaris";
const YARIS = process.env.YARIS !== "0";
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
const renkEkle = async (sayfa, ad) => {
  const kutu = sayfa.locator('input[placeholder="Örn. Ham Bej"]').first();
  await kutu.fill(ad); await kutu.press("Enter");
};

(async () => {
  let tut = null; const tutulan = [];
  const mudahaleB = async (s, k) => {
    await s.route("**/rest/v1/tanimlar**", async (r) => {
      const i = r.request();
      if (i.method() === "POST" && tut) { await tut; tutulan.push(new Date().toISOString()); }
      return r.fallback();
    });
  };
  const A = await ekranAc(DB, {});
  const B = await ekranAc(DB, { mudahale: mudahaleB });
  console.log(`ekran-tanim-yaris · ${DB} · ${YARIS ? "YARIŞ (B'nin yazması A'dan sonra varır)" : "KONTROL (sıralı)"}`);
  await renkSekmesi(A.sayfa); await renkSekmesi(B.sayfa);
  let birak;
  if (YARIS) tut = new Promise((r) => { birak = r; });
  if (YARIS) {
    await renkEkle(B.sayfa, "Lacivert");          // B okur, yazması bekler
    await B.sayfa.waitForTimeout(1500);
    await renkEkle(A.sayfa, "Kırmızı");           // A okur + yazar
    await A.sayfa.waitForTimeout(4000);
    tut = null; birak();                           // B'nin yazması varır
  } else {
    await renkEkle(A.sayfa, "Kırmızı");
    await A.sayfa.waitForTimeout(4000);
    await renkEkle(B.sayfa, "Lacivert");
  }
  await B.sayfa.waitForTimeout(25000);             // yoklama + yeniden denemeler bitsin
  const k = A.k;
  const tanim = (await k.sorgu(`select array(select r ->> 'ad' from jsonb_array_elements(veri -> 'renkler') r order by 1) as a from public.tanimlar where id = 'tekil'`))[0].a;
  const etkin = (await k.sorgu(`select array(select ad from public.stk_renk where tur = 'renk' and aktif order by 1) as a`))[0].a;
  console.log(`  B'nin bekletilen yazması: ${tutulan.length}`);
  k_("Tanımlar renkleri (sunucu)", tanim, ["Kırmızı", "Lacivert", "Siyah", "Vizon Yılan"]);
  k_("stk_renk etkin renkler", etkin, ["Kırmızı", "Lacivert", "Siyah", "Vizon Yılan"]);
  console.log(`── ekran-tanim-yaris (${YARIS ? "yarış" : "kontrol"}): ${gecen} geçti · ${kalan} kaldı ──`);
  await A.tarayici.close(); await B.tarayici.close();
  process.exit(kalan ? 1 : 0);
})().catch((h) => { console.error("HATA", h); process.exit(2); });
