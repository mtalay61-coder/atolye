// SENARYO — TEK FİŞ DEFTERİ: SİLME FİŞ İPTALİDİR (v1.737.0, stok-v2/FIS-DEFTERI-PLAN.md "Geri alma ve iptal").
// Sahte sunucu: fiş defteri kurulu. Kasa & Banka › TL Kasa › Virman (aynı birim, iki TL kasa) → VRM fişi sunucuda; sonra kaynak
// ayağı sağ tık › Sil.
// Ölçülen: (1) virman tek istek, iki ayak aynı fişte; (2) silme TEK `fis_iptal` (o fişin numarasıyla) — satır satır kas_yaz
// silmesi gitmez; (3) iki ayak birlikte ekrandan kalkar; (4) sunucu fişinin satırı "düzenle"de değişmez, uyarı verir.
const { uygulamaAc, depoOku, modulAc, sagTikAc, sagTikSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 },
    kasalar: [
      { id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] },
      { id: "k3", ad: "Şube Kasa", paraBirimi: "TRY", hareketler: [] },
    ],
  });
  const istekler = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push({ ad: "fis_kes", ozet: `${p.fis.tur}:${((p.kasa || {}).hareketler || []).map((x) => `${x.hesap_id}/${x.veri.yon}/${x.veri.tutar}`).join("+")}` });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: `${p.fis.onek}-261031001`, bagliFisNo: null, zatenVar: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/fis_iptal**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push({ ad: "fis_iptal", ozet: p.no });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: p.no, zatenIptal: false }) });
    });
    for (const ad of ["car_yaz", "kas_yaz", "fis_yaz"]) {
      await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => {
        const p = JSON.parse(r.request().postData() || "{}").p || {};
        istekler.push({ ad, ozet: ((p.hareketIptal || []).length ? "hareketIptal" : "") });
        return r.abort();
      });
    }
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Kasa & Banka");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /TL Kasa/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-islem="virman"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const s = document.querySelector("[data-virman-hedef]");
    const o = [...s.options].find((x) => /Şube Kasa/.test(x.textContent));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-virman-tutar]").fill("300");
  await sayfa.locator("[data-virman-sebep]").fill("Şubeye nakit");
  await sayfa.evaluate(() => { const b = document.querySelector("[data-virman-kaydet]"); if (b) b.click(); });
  await sayfa.waitForTimeout(1500);
  const kasalar = async () => ((await depoOku(sayfa, "muhasebe:data")).kasalar || []).map((k) => `${k.id}:${(k.hareketler || []).map((h) => `${h.fisNo}/${h.yon}/${h.tutar}`).join(",")}`);
  const virmanSonrasi = await kasalar();

  // Düzenle: sunucu fişinin satırı yerinde değişmez (virman satırında menüde zaten yok — doğrudan çağrı yerine metin yok; atlanır)
  // Sil: kaynak ayağı sağ tık › Sil › onay
  const vid = await sayfa.evaluate(() => {
    const tr = [...document.querySelectorAll("tr[data-kasa-hareket-satir]")].find((x) => x.getBoundingClientRect().width > 0 && /Virman/.test(x.textContent));
    return tr ? tr.getAttribute("data-kasa-hareket-satir") : null;
  });
  if (vid) await sagTikSec(sayfa, `[data-kasa-hareket-satir="${vid}"]`, "sil");
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-sil-onayla]").first().click();
  await sayfa.waitForTimeout(1800);
  const silmeSonrasi = await kasalar();
  const toast = await sayfa.evaluate(() => [...document.querySelectorAll("[data-toast]")].map((x) => x.innerText.replace(/\s+/g, " ").trim()).join(" | "));
  const defter = await sayfa.evaluate(() => (window.__fisDefteriOku ? window.__fisDefteriOku() : [])
    .filter((f) => f && f.sunucu).map((f) => `${f.fisNo}|${f.tip}|${(f.kasaHareketleri || []).length}|${f.iptal ? "iptal" : "gecerli"}`));
  await tarayici.close();
  return { hatalar, virmanSonrasi, silmeSonrasi, toast: toast.replace(/\d{1,3}(\.\d{3})*(,\d+)?/g, "N"), defter, istekler: istekler.map((x) => `${x.ad}${x.ozet ? `:${x.ozet}` : ""}`) };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
