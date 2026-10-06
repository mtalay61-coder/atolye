// SENARYO — MODEL RENGİ BARKODU (6 Ekim, v1.602.0).
// Kullanıcı (Sandalet › Barkodlar, renkler "1031 - Kırmızı Deri/Gümüş" model rengi): "Barkodları kurulamıyor."
// Ürün kartı barkod kurarken kombinasyon listesine bakmıyordu. Ölçülen: model renkli mamulün Barkodlar sekmesinde
// renk kodu 1031 ve beden barkodu 90 + stokNo(4) + 1031 + bedenKodu(2) kurulur; "barkod kurulamıyor" yok; sayfa hatası yok.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.renkler = [{ id: "r1", ad: "Siyah", barkodKodu: 1 }, { id: "r2", ad: "Taba", barkodKodu: 2 }, { id: "r3", ad: "Kırmızı Deri", barkodKodu: 3 }, { id: "r4", ad: "Gümüş", barkodKodu: 4 }];
  tan.bedenler = [{ id: "b1", ad: "40", barkodKodu: 1 }, { id: "b2", ad: "41", barkodKodu: 2 }, { id: "b3", ad: "42", barkodKodu: 3 }];
  tan.renkKombinasyonlari = [{ id: "kb1", kod: "1031", renkIdler: ["r3", "r4"] }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(t["stok:items"]);
  st.push({ id: "snd", ad: "Sandalet", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", stokNo: "0053", hareketler: [], recete: [],
    variants: ["40", "41"].map((b) => ({ renk: "1031 - Kırmızı Deri/Gümüş", renkId: "kb1", beden: b, miktar: 0 })) });
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Sandalet" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Barkodlar/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const sonuc = await sayfa.evaluate(() => {
    const metin = document.body.innerText;
    const satirlar = [...document.querySelectorAll("[data-etiket-sec]")].map((cb) => {
      const tr = cb.closest("tr"); const td = [...tr.querySelectorAll("td")].map((x) => x.textContent.trim());
      return { renkKodu: td[2], olcu: td[3], olcuKodu: td[4], barkod: td[5], secilebilir: !cb.disabled };
    });
    return { kurulamayan: (metin.match(/barkod kurulamıyor/g) || []).length, urunBarkodu: (metin.match(/Ürün barkodu \(renksiz\):\s*(\d+)/) || [])[1] || "", satirlar };
  });
  await tarayici.close();
  return { ...sonuc, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
