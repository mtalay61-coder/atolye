#!/usr/bin/env node
// EKRAN SINAMASI — KASA (7 Kasım). Uygulama EKRANDAN, gerçek yerel PostgreSQL'e karşı (gercek-pg-kopru); veritabanı kos-ekran.sh'ın
// (canlı benzeri, 12 yok, kurallar KAPALI; Merkez Kasa K1 TRY; gelir kartı "Ekran Gelir", gider kartı "Ekran Gider").
// Gelir / gider girişi Ödeme & Tahsilat'ta (v1.674.0'dan beri kasa ekranında yalnız virman): Tahsilat|Ödeme · Nakit · gelir/gider kartı
// · tutar · Kaydet. İptal: aynı ekranın "Son tahsilat ve ödemeler" listesinde satırın sil düğmesi (onaylı) → sunucuda fiş iptali.
// Her adımda Merkez Kasa bakiyesi iki yerden:
//   SUNUCU — kas_hareket (geçerli satır, fişi geçerli): Giriş − Çıkış
//   EKRAN  — Kasa & Banka › hesap listesinde Merkez Kasa satırının bakiyesi
// Adımlar: gelir · gider · gelirin iptali · yenileme · Kaydet'e çift tık · aynı istek ağda iki kez · yanıt kaybı · yenileme.
const { ekranAc, yenile, toastlar, O } = require("./ortak-ekran.js");
const DB = process.env.EKRAN_DB || "atolye_ekran";
const HESAP = "K1";
let gecen = 0, kalan = 0; const tablo = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  let mod = null; const ozel = [];
  const mudahale = async (s, k) => {
    await s.route("**/rest/v1/rpc/fis_kes**", async (r) => {
      if (!mod) return r.fallback();
      const m = mod; mod = null;
      const q = r.request();
      const sahte = { url: () => q.url(), method: () => q.method(), headers: () => q.headers(), postData: () => q.postData() };
      const bir = await k.__yanitla(sahte);
      ozel.push({ m, ilk: bir.status, govde: bir.body.slice(0, 140) });
      if (m === "kayip") return r.abort("connectionreset");
      const iki = await k.__yanitla(sahte);
      ozel.push({ m, ikinci: iki.status, govde: iki.body.slice(0, 140) });
      return r.fulfill(iki);
    });
  };
  const e = await ekranAc(DB, { mudahale });
  const { sayfa, k } = e;
  console.log(`ekran-kasa · ${DB} · kurallar ${e.ayar.fis_aktif ? "AÇIK" : "KAPALI"}`);
  const sunucu = async () => Number((await k.sorgu(`select coalesce(sum(case when h.veri->>'yon' = 'Giriş' then (h.veri->>'tutar')::numeric else -(h.veri->>'tutar')::numeric end), 0) as b
    from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where h.hesap_id = $1 and not h.iptal and (h.fis_id is null or not f.iptal)`, [HESAP]))[0].b);
  const fisler = async () => (await k.sorgu(`select h.fis_id, f.tur, f.iptal, string_agg((h.veri->>'yon') || ':' || (h.veri->>'tutar') || (case when h.iptal then '(iptal)' else '' end), ',') as satir
    from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where h.hesap_id = $1 and h.olusturma > $2 group by 1, 2, 3, f.olusturma order by f.olusturma`, [HESAP, baslangic]));
  const baslangic = (await k.sorgu("select now() as t"))[0].t;
  const ekran = async () => {
    await O.modulAc(sayfa, "Kasa & Banka"); await sayfa.waitForTimeout(800);
    // hesap satırı: "Merkez Kasa 50.400 ₺" — ad bilinir, ondan sonraki ilk tr-TR sayı bakiyedir
    const t = await sayfa.locator(`[data-hesap-satir="${HESAP}"]`).first().innerText();
    const m = t.replace(/\s+/g, " ").match(/Merkez Kasa\s+(-?[\d.]+(?:,\d+)?)/);
    return m ? Number(m[1].replace(/\./g, "").replace(",", ".")) : NaN;
  };
  let beklenen = await sunucu();
  const olc = async (adim) => {
    const s = await sunucu(); const ek = await ekran();
    console.log(adim);
    k_(`${adim} · sunucu (kas_hareket)`, s, beklenen);
    k_(`${adim} · ekran (Kasa & Banka)`, ek, beklenen);
    tablo.push({ adim, beklenen, sunucu: s, ekran: ek });
  };
  // "Tahsilat / Ödeme gir" — Kasa & Banka alanının sekmesi (data-odeme-alani-sekme="odemetahsilat")
  const odemeAc = async () => {
    await O.modulAc(sayfa, "Kasa & Banka"); await sayfa.waitForTimeout(500);
    await sayfa.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible').first().click(); await sayfa.waitForTimeout(700);
  };
  // Ödeme & Tahsilat › tip › Nakit › kart › tutar › Kaydet
  const kayit = async (tip, kartAd, tutar, { kaydet = "tek" } = {}) => {
    await odemeAc();
    await sayfa.locator(`[data-odeme-tip="${tip}"]:visible`).first().click();
    await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').first().click(); await sayfa.waitForTimeout(250);
    const hesapDugmesi = sayfa.locator("[data-odeme-hesap]:visible");
    if (await hesapDugmesi.count() > 1) await sayfa.locator('[data-odeme-hesap]:visible', { hasText: "Merkez" }).first().click();
    const kutu = sayfa.locator("[data-odeme-cari]:visible").first();
    await kutu.click(); await kutu.fill(kartAd); await sayfa.waitForTimeout(300); await kutu.press("Enter"); await sayfa.waitForTimeout(400);
    await sayfa.locator("[data-kart-odeme-tutar]:visible").first().fill(String(tutar));
    const d = sayfa.locator("[data-kart-odeme-kaydet]:visible").first();
    const satirBasligi = await sayfa.locator("[data-kart-odeme-satiri]:visible b").first().textContent().catch(() => "");
    if (kaydet === "cift") await d.dblclick(); else await d.click();
    await sayfa.waitForTimeout(2500);
    const t = await toastlar(sayfa);
    const son = (await k.sorgu(`select fis_id from public.kas_hareket where hesap_id = $1 order by olusturma desc limit 1`, [HESAP]))[0];
    return { toast: t, fis: son && son.fis_id, satirBasligi: (satirBasligi || "").replace(/\s+/g, " ").trim() };
  };

  await olc("0 · başlangıç");
  const g = await kayit("Tahsilat", "Ekran Gelir", 1000);
  beklenen += 1000;
  console.log(`    gelir: ${g.satirBasligi} · fiş ${g.fis} · ${g.toast.slice(0, 100)}`);
  await olc("1 · gelir 1.000");

  const gd = await kayit("Ödeme", "Ekran Gider", 250);
  beklenen -= 250;
  console.log(`    gider: ${gd.satirBasligi} · fiş ${gd.fis} · ${gd.toast.slice(0, 100)}`);
  await olc("2 · gider 250");

  // İPTAL: Ödeme & Tahsilat › Son tahsilat ve ödemeler › gelir satırının sil düğmesi › onay
  await odemeAc();
  const sil = sayfa.locator(`[data-odeme-son-sil="${g.fis}"] [data-sil-onay]`).first();
  const bulundu = await sil.count();
  if (bulundu) { await sil.click(); await sayfa.waitForTimeout(300); await sayfa.locator("[data-sil-onayla]").first().click(); await sayfa.waitForTimeout(2500); }
  console.log(`    iptal: satır ${bulundu ? "bulundu" : "YOK"} · ${(await toastlar(sayfa)).slice(0, 120)}`);
  const gf = (await fisler()).find((f) => f.fis_id === g.fis);
  k_("3 · gelir fişi sunucuda iptal", gf && gf.iptal, true);
  beklenen -= 1000;
  await olc("3 · gelirin iptali");

  await yenile(sayfa);
  await olc("4 · sayfa yenilendi");

  const f0 = (await fisler()).length;
  await kayit("Tahsilat", "Ekran Gelir", 400, { kaydet: "cift" });
  beklenen += 400;
  k_("5 · çift tık → tek fiş", (await fisler()).length - f0, 1);
  await olc("5 · Kaydet'e çift tık (gelir 400)");

  const f1 = (await fisler()).length;
  mod = "tekrar";
  await kayit("Ödeme", "Ekran Gider", 75);
  beklenen -= 75;
  console.log(`    tekrar: ${JSON.stringify(ozel.filter((x) => x.m === "tekrar").map((x) => x.ilk || x.ikinci))} · ${(ozel.find((x) => x.ikinci) || {}).govde || ""}`);
  k_("6 · aynı istek iki kez → tek fiş", (await fisler()).length - f1, 1);
  await olc("6 · aynı kaydetme isteği ağda iki kez (gider 75)");

  const f2 = (await fisler()).length;
  mod = "kayip";
  const d3 = await kayit("Tahsilat", "Ekran Gelir", 60);
  const formDolu = await sayfa.locator("[data-kart-odeme-tutar]:visible").first().inputValue().catch(() => "");
  console.log(`    yanıt kaybı: tutar kutusu "${formDolu}" · ${d3.toast.slice(0, 160)}`);
  let tekrarBasildi = false;
  if (formDolu) { tekrarBasildi = true; await sayfa.locator("[data-kart-odeme-kaydet]:visible").first().click(); await sayfa.waitForTimeout(2500);
    console.log(`    kullanıcı yeniden Kaydet: ${(await toastlar(sayfa)).slice(0, 160)}`); }
  beklenen += 60;
  k_(`7 · yanıt kaybı${tekrarBasildi ? " + yeniden Kaydet" : ""} → tek fiş`, (await fisler()).length - f2, 1);
  await olc(`7 · yanıt kaybı${tekrarBasildi ? " + yeniden Kaydet" : ""} (gelir 60)`);

  await yenile(sayfa);
  await olc("8 · sayfa yenilendi");

  console.log("FİŞLER (sunucu, bu koşu)"); (await fisler()).forEach((f) => console.log(`    ${f.fis_id} ${f.tur} ${f.iptal ? "İPTAL" : "geçerli"} ${f.satir}`));
  const hatali = k.gunluk.filter((x) => x.durum >= 400 && !/^(onaylar|cop|cek_gorselleri|modeller|gorevler)$/.test(x.yol));
  console.log(`  ağ: ${k.gunluk.length} istek, hatalı ${hatali.length} ${JSON.stringify(hatali.slice(0, 8))}`);
  if (e.hatalar.length) console.log(`  sayfa hataları: ${e.hatalar.slice(0, 5).join(" | ")}`);
  require("fs").writeFileSync(process.env.EKRAN_TABLO || "/dev/null", JSON.stringify(tablo, null, 1));
  console.log(`── ekran-kasa: ${gecen} geçti, ${kalan} kaldı ──`);
  await e.tarayici.close(); await k.kapat();
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
