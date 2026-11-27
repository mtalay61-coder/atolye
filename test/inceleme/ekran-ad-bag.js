#!/usr/bin/env node
// AD DEĞİŞİKLİĞİ × BAYAT CİHAZ (26 Kasım, kapsamlı inceleme). Uygulama EKRANDAN (yayındaki 1.744.37 derlemesi, test.html), bütün
// bulut istekleri gercek-pg-kopru ile YEREL PostgreSQL'e. Canlıya dokunmaz.
//
// SORU: sipariş kalemi varyanta renk ADIYLA bağlı (siparis_kalemleri.renk metin; kimlik sütunu yok). Ad değişikliği (082
// hammaddeRenkAdDegistir) kalemleri BU CİHAZIN BELLEĞİNDEKİ sipariş listesinden çevirip yazar. Başka cihazın az önce eklediği ve bu
// cihazın henüz görmediği (değişiklik yoklaması 8 sn) kalem çevrilmezse eski adla kalır → varyantı bulunamaz (bağ kopar).
//
// ADIMLAR
//   0. Taban: inc_taban kopyası — 1054 = Siyah/Vizon Yılan; SAT-9001'de iki kalem (40, 41) "1054 - Siyah/Vizon Yılan".
//   1. Ali (Yönetici) uygulamayı açar, siparişleri yükler.
//   2. "BAŞKA CİHAZ": veritabanına doğrudan yeni sipariş SAT-9002 + kalem (aynı renk, 40 × 4) yazılır (degisiklik sayacı artar).
//   3. Ali HEMEN (yoklama gelmeden) Tanımlar › Renk "Vizon Yılan" → "Vizon Deri" yapar.
//   4. 20 sn beklenir (yoklama, yazma kuyrukları biter), sayfa yenilenir.
// ÖLÇÜLEN (sunucudan): her kalemin renk metni ve o adla ETKİN varyant bulunup bulunmadığı (envanter sorgusunun
//   `etkin_varyanta_bagli` kuralı: stk_nrm(kalem.renk) = stk_nrm(stk_renk.ad), aynı ürün, varyant etkin) · stk_renk adları ·
//   sipariş miktarları (değişmemeli).
// KONTROL GRUBU (BAYAT=0): 2. adımdan sonra 15 sn beklenip (yoklama siparişleri getirsin) aynı ad değişikliği yapılır → beklenen:
//   bütün kalemler bağlı. Bu, testin bozulan durumu gerçekten AYIRT ettiğini gösterir.
const path = require("path");
const { ekranAc, yenile, toastlar, O } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const DB = process.env.EKRAN_DB || "inc_ad";
const BAYAT = process.env.BAYAT !== "0";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  // BAYAT: değişiklik yoklamasının yanıtı dondurulur (son görülen sayaç tekrar verilir) — arka planda kalmış / ağı oynak cihaz.
  let dondur = false, sonYanit = null;
  const mudahale = async (s, k) => {
    await s.route("**/rest/v1/degisiklik**", async (r) => {
      if (dondur && sonYanit) return r.fulfill(sonYanit);
      const i = r.request();
      const y = await k.__yanitla({ url: () => i.url(), method: () => i.method(), headers: () => i.headers(), postData: () => i.postData() });
      if (i.method() === "GET") sonYanit = y;
      return r.fulfill(y);
    });
  };
  const e = await ekranAc(DB, { mudahale });
  const { sayfa, k } = e;
  console.log(`ekran-ad-bag · ${DB} · ${BAYAT ? "BAYAT cihaz (ad değişikliği yoklamadan önce)" : "KONTROL (yoklamadan sonra)"}`);
  const bag = async () => (await k.sorgu(`
    select s.siparis_no || '/' || kl.beden as kalem, kl.renk, kl.miktar::float as miktar,
           exists (select 1 from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id
                    where v.urun_id = kl.urun_id and v.aktif and public.stk_nrm(r.ad) = public.stk_nrm(kl.renk)) as bagli
      from public.siparis_kalemleri kl join public.siparisler s on s.id = kl.siparis_id order by 1`));
  const once = await bag();
  console.log("  önce:", JSON.stringify(once));

  await O.modulAc(sayfa, "Sipariş").catch(() => {});
  await sayfa.waitForTimeout(800);
  if (BAYAT) dondur = true;
  // 2. başka cihaz
  await k.sorgu(`insert into public.siparisler (id, siparis_no, tip, cari_id, durum, tarih, surum) values ('sp-inc-2', 'SAT-9002', 'satis', 'inc-musteri', 'Bekliyor', current_date, 1)`);
  await k.sorgu(`insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, sira) values ('kl-inc2-40', 'sp-inc-2', 'inc-bot', 'İnceleme Bot', '1054 - Siyah/Vizon Yılan', '40', 4, 0)`);
  if (!BAYAT) await sayfa.waitForTimeout(15000);
  // 3. ad değişikliği (Tanımlar › Ürün › Renk)
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-urun-alt="renk"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const kutu = sayfa.locator('input[value="Vizon Yılan"]').first();
  if (!(await kutu.count())) throw new Error("Vizon Yılan kutusu bulunamadı");
  await kutu.fill("Vizon Deri"); await kutu.press("Enter");
  await sayfa.waitForTimeout(1500);
  const sonBildirim = await toastlar(sayfa);
  console.log("  bildirim:", sonBildirim.slice(0, 200));
  await sayfa.waitForTimeout(3000);
  dondur = false;
  await sayfa.waitForTimeout(20000);
  await yenile(sayfa);
  await sayfa.waitForTimeout(3000);

  const sonra = await bag();
  // KURULUMSUZ (1.744.38, B1 2. tur): sunucuda tanim_renk_ad_degistir yok → istemci eski yola DÖNMEZ; hiçbir şey değişmez, açık ileti.
  if (process.env.KURULUMSUZ === "1") {
    const renkler = (await k.sorgu(`select id, ad from public.stk_renk where id in ('r-vizon', 'k-1054') order by id`)).map((x) => `${x.id}=${x.ad}`);
    k_("kurulumsuz: Tanımlar adı DEĞİŞMEDİ", renkler, ["k-1054=1054 - Siyah/Vizon Yılan", "r-vizon=Vizon Yılan"]);
    k_("kurulumsuz: kalemler değişmedi", sonra.map((x) => `${x.kalem}:${x.renk}:${x.bagli}`), ["SAT-9001/40:1054 - Siyah/Vizon Yılan:true", "SAT-9001/41:1054 - Siyah/Vizon Yılan:true", "SAT-9002/40:1054 - Siyah/Vizon Yılan:true"]);
    k_("kurulumsuz: açık ileti", /kurulumu yok/.test(sonBildirim), true);
    console.log(`── ekran-ad-bag (kurulumsuz): ${gecen} geçti · ${kalan} kaldı ──`);
    await e.tarayici.close(); process.exit(kalan ? 1 : 0);
  }
  console.log("  sonra:", JSON.stringify(sonra));
  const renkler = (await k.sorgu(`select id, ad from public.stk_renk where id in ('r-vizon', 'k-1054') order by id`)).map((x) => `${x.id}=${x.ad}`);
  k_("Tanımlar adı değişti (stk_renk)", renkler, ["k-1054=1054 - Siyah/Vizon Deri", "r-vizon=Vizon Deri"]);
  k_("miktarlar değişmedi", sonra.map((x) => `${x.kalem}:${x.miktar}`), ["SAT-9001/40:2", "SAT-9001/41:3", "SAT-9002/40:4"]);
  k_("bütün kalemler yeni adda", sonra.map((x) => `${x.kalem}:${x.renk}`), ["SAT-9001/40:1054 - Siyah/Vizon Deri", "SAT-9001/41:1054 - Siyah/Vizon Deri", "SAT-9002/40:1054 - Siyah/Vizon Deri"]);
  k_("bütün kalemler etkin varyanta bağlı", sonra.map((x) => `${x.kalem}:${x.bagli}`), ["SAT-9001/40:true", "SAT-9001/41:true", "SAT-9002/40:true"]);
  if (e.hatalar.length) console.log("  sayfa hataları:", e.hatalar.slice(0, 3));
  if (process.env.AYIKLA) console.log("  köprü (2xx dışı):", JSON.stringify((k.gunluk || []).filter((x) => x.durum >= 300).slice(0, 25)));
  console.log(`── ekran-ad-bag (${BAYAT ? "bayat" : "kontrol"}): ${gecen} geçti · ${kalan} kaldı ──`);
  await e.tarayici.close();
  process.exit(kalan ? 1 : 0);
})().catch((h) => { console.error("HATA", h); process.exit(2); });
