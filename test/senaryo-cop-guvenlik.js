// SENARYO — ÇÖP KUTUSU GÜVENLİĞİ (v1.549.0).
//
// Kullanıcı: "Çöp kutusunu daha verimli kullanalım. Güvenliğe karşı." → "Hepsini yap".
//   1. Tanımlardan silinen renk çöpe düşer ve geri yüklenince yerine döner (eskiden iz kalmıyordu).
//   2. 30 günü dolmamış kayıt kilitli (kalıcı silinemez); 30 günü dolan silinebilir.
//   3. 90 güne 14 günden az kalan kayıt için uyarı; 90 günü aşan açılışta düşer.
//   4. "Boşalt" yalnız 30 günden eskileri siler, yeniler kalır.
//   5. Sunucu arşivi bölümü Yöneticiye görünür; bulut yokken bunu söyler.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.renkler = [...tanim.renkler, { id: "r9", ad: "Lacivert", tip: "Hammadde" }];
  // Toplu silme alarmı için 20 silinebilir tanım ve bildirimi alacak bir Yönetici.
  tanim.hammaddeTipleri = Array.from({ length: 20 }, (_, i) => ({ id: `ht${i + 1}`, ad: `Tip${i + 1}` }));
  tanim.kullanicilar = [...tanim.kullanicilar, { id: "k2", ad: "Patron", rol: "Yönetici", yetkiler: {} }];
  t["tanimlar:data"] = JSON.stringify(tanim);
  const gunOnce = (g) => new Date(Date.now() - g * 864e5).toISOString();
  const ck = (id, baslik, g) => ({ id, tur: "cari", baslik, ozet: "", veri: { id: `v-${id}`, unvan: baslik }, ustKayit: null,
    yanEtkiliMi: false, geriAlinabilirMi: true, silinmeTarihi: gunOnce(g), kullaniciAd: "Test", kullaniciId: "k1" });
  t["cop:data"] = JSON.stringify([ck("c-yeni", "Yeni Cari", 10), ck("c-eski", "Eski Cari", 40), ck("c-dusecek", "Düşecek Cari", 85), ck("c-asmis", "Asmis Cari", 120)]);

  // Sunucu arşivi isteği örnek satırlarla cevaplanır (ortamda bulut yok); görünümün okuduğu biçim sınanır.
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/silinen_arsiv**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
      { id: 2, tablo: "cariler", islem: "DELETE", satir_id: "c7", veri: { id: "c7", unvan: "Silinen Cari" }, silen_eposta: "test@atolye.local", zaman: "2026-10-03T09:00:00Z" },
      { id: 1, tablo: "tanimlar", islem: "GORUNTU", satir_id: "tekil", veri: { id: "tekil", veri: { kullanicilar: [{ ad: "A", sifre: "gizli" }] } }, silen_eposta: null, zaman: "2026-10-03T08:00:00Z" },
    ]) }));
  };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const copSekme = async () => {
    await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
    await sayfa.waitForTimeout(400);
    await sayfa.locator('[data-tanim-sekme="cop"]').first().click();
    await sayfa.waitForTimeout(500);
  };
  const metin = (sec) => sayfa.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, " ").trim()), sec);
  const kartlar = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-cop-kart]")].map((d) => d.getAttribute("data-cop-kart")));

  // ---- 2-3-5: başlangıç durumu ----
  await copSekme();
  const baslangic = {
    kartlar: await kartlar(),
    kilitli: await sayfa.locator("[data-cop-sil-kilitli]").count(),
    yakinda: await metin("[data-cop-yakinda]"),
    kalanGun: await metin("[data-cop-kalan-gun]"),
    arsivVar: await sayfa.locator("[data-sunucu-arsivi]").count(),
  };
  await sayfa.locator("[data-arsiv-yukle]").first().click();
  await sayfa.waitForTimeout(400);
  // Saat dilimine bağlı kalmasın: zaman damgası karşılaştırmadan çıkarılır.
  const arsivSatirlari = (await metin("[data-sunucu-arsivi] button[type=button]:not([data-arsiv-yukle])")).map((x) => x.replace(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}/, "<zaman>"));
  // Görüntü satırını açınca iç içe şifre görünmemeli.
  await sayfa.locator('[data-sunucu-arsivi] button:has-text("anlık görüntü")').first().click();
  await sayfa.waitForTimeout(200);
  const arsivIcerik = ((await metin("[data-sunucu-arsivi] pre"))[0] || "").includes("gizli") ? "ŞİFRE GÖRÜNÜYOR" : "şifresiz";

  // ---- 1: renk sil → çöp → geri yükle ----
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click();
  await sayfa.waitForTimeout(500);
  const silindi = await sayfa.evaluate(() => {
    // Renk adı düzenlenebilir kutuda (value), metin düğümünde değil.
    const yaprak = [...document.querySelectorAll("input")].find((e) => e.offsetParent && e.value === "Lacivert");
    let el = yaprak;
    while (el && !el.querySelector('[data-ikon="X"]')) el = el.parentElement;
    const x = el && el.querySelector('[data-ikon="X"]');
    if (!x) return false;
    x.closest("button").click();
    return true;
  });
  await sayfa.waitForTimeout(700);
  const renkSonra = ((await depoOku(sayfa, "tanimlar:data")).renkler || []).map((r) => r.ad);
  const copSonra = (await depoOku(sayfa, "cop:data")).map((k) => `${k.tur}:${k.baslik}`);
  await copSekme();
  const geriVar = await sayfa.locator('[data-cop-kart="Renk: Lacivert"] button:has-text("Geri yükle")').count();
  if (geriVar) await sayfa.locator('[data-cop-kart="Renk: Lacivert"] button:has-text("Geri yükle")').first().click();
  await sayfa.waitForTimeout(800);
  const renkGeri = ((await depoOku(sayfa, "tanimlar:data")).renkler || []).map((r) => r.ad);
  const copGeri = (await depoOku(sayfa, "cop:data")).map((k) => k.baslik);

  // ---- 4: Boşalt ----
  await sayfa.locator('button[title="30 günden eski kayıtları kalıcı sil"]').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-sil-onayla]").first().click();
  await sayfa.waitForTimeout(800);
  const bosaltSonra = (await depoOku(sayfa, "cop:data")).map((k) => k.baslik);
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, fullPage: true });

  // ---- 6: toplu silme alarmı — 10 dakikada 20 silme (renk silmesi 1, burada 20 tip daha) ----
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("20 tanımlı öğe"):visible').first().click();   // liste kapalı gelir
  await sayfa.waitForTimeout(300);
  for (let i = 1; i <= 20; i++) {
    await sayfa.evaluate((ad) => {
      let el = [...document.querySelectorAll("span,div,input")].find((e) => e.offsetParent
        && (e.tagName === "INPUT" ? e.value === ad : e.children.length === 0 && e.textContent.trim() === ad));
      while (el && !el.querySelector('[data-ikon="X"]')) el = el.parentElement;
      const x = el && el.querySelector('[data-ikon="X"]');
      if (x) x.closest("button").click();
    }, `Tip${i}`);
    await sayfa.waitForTimeout(120);
  }
  await sayfa.waitForTimeout(600);
  const kalanTip = ((await depoOku(sayfa, "tanimlar:data")).hammaddeTipleri || []).length;
  const mesajlar = ((await depoOku(sayfa, "mesaj:data")) || []).map((m) => ({ kanal: m.kanal, uyari: /Güvenlik uyarısı/.test(m.metin), sayi: (m.metin.match(/(\d+) kayıt sildi/) || [])[1] }));

  await tarayici.close();
  return { baslangic, arsivSatirlari, arsivIcerik, silindi, renkSonra, copSonra, renkGeri, copGeri, bosaltSonra, kalanTip, mesajlar, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
