#!/usr/bin/env node
// EKRAN SINAMASI — G-25'İN 1.744.36 İSTEMCİSİNE ETKİSİ (24 Kasım). Kullanıcı: "SQL'in mevcut 1.744.36 üzerindeki etkisini açıkça göster:
// hangi kullanıcıların mevcut mesai işlemi duracak? Arayüz hazır olmadan SQL uygulanmasını otomatik olarak uygun sayma."
// Yalnız yerel PostgreSQL (gercek-pg-kopru; JWT'li authenticated — SQL Editor yetkisi kullanıcı başarısı sayılmaz). Supabase'e bağlanmaz.
// BEKLENTİ YAZMAZ, ÖLÇER: aynı kullanıcı G-25'siz ve G-25'li kopyada aynı üç işlemi ekrandan yapar; fark raporlanır (kos-g25-etki.sh).
//   A. Maaş tahakkuku şeridi (100-app, v1.740 — her oturumda görünür, yetkiye bakmaz): görünüyor mu → "Onayla" → MAŞ fişi yazıldı mı,
//      ekranda ne kaldı (şerit, bildirim)
//   B. Cari › G25 Personel › Bilgiler › Mesai (272): kart açılıyor mu, panel var mı → hafta içi 10 saat → "Mesaiyi yaz" → MS fişi
//      yazıldı mı, saat kutuları boşaldı mı, bildirim
//   C. Aynı panelde aylık maaş 30.000 → 31.000 (Tanımlar yazması) → sunucudaki maaş, ekrandaki değer, bildirim; sayfa yenilenince
//      ekranda ne görünüyor (reddedilen yerel değişiklik nerede kalıyor)
// Kullanım: EKRAN_DB=<kopya> EKRAN_KULLANICI=<ad> ISTEMCI_DIZIN=<1.744.36 ağacı> node test/ekran/ekran-g25-etki.js → tek satır JSON
const { ekranAc, yenile, toastlar, O } = require("./ortak-ekran.js");
const DB = process.env.EKRAN_DB; const KULLANICI = process.env.EKRAN_KULLANICI || "Ali";
if (!DB) { console.error("EKRAN_DB gerekli"); process.exit(2); }

(async () => {
  const { tarayici, sayfa, k, hatalar } = await ekranAc(DB, { kullanici: KULLANICI });
  const sonuc = { kullanici: KULLANICI, db: DB };
  const fisSay = async (onek) => (await k.sorgu(`select count(*)::int as n from public.stk_fis where cari_id = 'g25-p' and onek = $1 and not iptal`, [onek]))[0].n;
  const maasSunucu = async () => (await k.sorgu(`select (p ->> 'maas')::numeric as m from public.tanimlar t, jsonb_array_elements(t.veri -> 'bolumler') b,
      jsonb_array_elements(b -> 'personel') p where t.id = 'tekil' and b ->> 'id' = 'bk-g25' and p ->> 'cariId' = 'g25-p'`))[0].m;
  const bildirim = async () => { const t = await toastlar(sayfa); return t ? t.slice(0, 220) : ""; };
  const temizleBildirim = () => sayfa.evaluate(() => document.querySelectorAll("[data-toast]").forEach((x) => x.remove())).catch(() => {});
  sonuc.giris = await sayfa.evaluate(() => !document.querySelector('input[type="password"]'));

  // A. MAAŞ ŞERİDİ
  try {
    const serit = sayfa.locator("[data-maas-bekliyor]");
    sonuc.A_serit_gorunur = (await serit.count()) > 0;
    if (sonuc.A_serit_gorunur) {
      const once = await fisSay("MAS"); await temizleBildirim();
      await sayfa.locator("[data-maas-onayla]").first().click(); await sayfa.waitForTimeout(3500);
      sonuc.A_mas_yazildi = (await fisSay("MAS")) - once;
      sonuc.A_serit_sonra = (await serit.count()) > 0;
      sonuc.A_bildirim = await bildirim();
    }
  } catch (e) { sonuc.A_hata = String(e.message).slice(0, 160); }

  // B. MESAİ
  try {
    await O.modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(700);
    const kart = sayfa.locator('button:has-text("G25 Personel"):visible');
    sonuc.B_kart_bulundu = (await kart.count()) > 0;
    if (sonuc.B_kart_bulundu) {
      await kart.last().click(); await sayfa.waitForTimeout(700);
      await sayfa.locator('[data-cari-sekme="bilgiler"]:visible').last().click(); await sayfa.waitForTimeout(600);
      sonuc.B_panel = (await sayfa.locator("[data-mesai-yaz]:visible").count()) > 0;
      if (sonuc.B_panel) {
        const once = await fisSay("MS"); await temizleBildirim();
        await sayfa.locator('[data-mesai-saat="haftaIci"]:visible').first().fill("10"); await sayfa.waitForTimeout(200);
        sonuc.B_tutar_ekranda = (await sayfa.locator("[data-mesai-tutar]:visible").first().innerText()).trim();
        sonuc.B_dugme_etkin = await sayfa.locator("[data-mesai-yaz]:visible").first().isEnabled();
        if (sonuc.B_dugme_etkin) { await sayfa.locator("[data-mesai-yaz]:visible").first().click(); await sayfa.waitForTimeout(3500); }
        sonuc.B_ms_yazildi = (await fisSay("MS")) - once;
        sonuc.B_saat_kutusu_sonra = await sayfa.locator('[data-mesai-saat="haftaIci"]:visible').first().inputValue();
        sonuc.B_bildirim = await bildirim();
      }
    }
  } catch (e) { sonuc.B_hata = String(e.message).slice(0, 160); }

  // C. MAAŞ DEĞİŞİKLİĞİ (Tanımlar yazması)
  try {
    const kutu = sayfa.locator("[data-personel-maas]:visible");
    sonuc.C_kutu = (await kutu.count()) > 0;
    if (sonuc.C_kutu) {
      sonuc.C_sunucu_once = Number(await maasSunucu()); await temizleBildirim();
      await kutu.first().fill("31000"); await kutu.first().blur(); await sayfa.waitForTimeout(4500);
      sonuc.C_sunucu_sonra = Number(await maasSunucu());
      sonuc.C_ekran_sonra = await sayfa.locator("[data-personel-maas]:visible").first().inputValue().catch(() => null);
      sonuc.C_bildirim = await bildirim();
      sonuc.C_inceleme_seridi = await sayfa.evaluate(() => { const x = [...document.querySelectorAll("div")].find((d) => /İnceleme gerekiyor|incelemeniz gerek/i.test(d.innerText || "") && d.children.length < 12);
        return x ? x.innerText.replace(/\s+/g, " ").trim().slice(0, 200) : ""; });
      await yenile(sayfa); await sayfa.waitForTimeout(1500);
      await O.modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(700);
      await sayfa.locator('button:has-text("G25 Personel"):visible').last().click(); await sayfa.waitForTimeout(700);
      await sayfa.locator('[data-cari-sekme="bilgiler"]:visible').last().click(); await sayfa.waitForTimeout(600);
      sonuc.C_yenileme_sonrasi_ekran = await sayfa.locator("[data-personel-maas]:visible").first().inputValue().catch(() => null);
      sonuc.C_yenileme_sonrasi_sunucu = Number(await maasSunucu());
    }
  } catch (e) { sonuc.C_hata = String(e.message).slice(0, 160); }

  sonuc.sayfa_hatalari = hatalar.slice(0, 5);
  console.log(JSON.stringify(sonuc));
  await tarayici.close(); await k.kapat?.();
  process.exit(0);
})().catch((e) => { console.log(JSON.stringify({ kullanici: KULLANICI, db: DB, olumcul: String(e.stack || e).slice(0, 300) })); process.exit(1); });
