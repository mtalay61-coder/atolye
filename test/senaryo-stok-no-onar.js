// SENARYO — STOK NO ÇAKIŞMASI AÇILIŞTA ONARILIR (6 Ekim, v1.606.0).
// Kullanıcı: Supabase 409 urunler_stok_no_tekil, 315 deneme. Tohumda iki ürün aynı stok no (7): Bot (eski kimlik) ve
// Çizme (yeni kimlik). Ölçülen: açılışta Çizme yeni numara alır (sıradaki boş), Bot 7'de kalır, sayaç ilerler. Sayfa hatası yok.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const st = JSON.parse(t["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  bot.stokNo = 7;
  st.push({ ...bot, id: "stok-zzzz-yeni", ad: "Çizme", stokNo: 7, hareketler: [], recete: [], variants: bot.variants.map((v) => ({ ...v, miktar: 0 })) });
  t["stok:items"] = JSON.stringify(st);
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.kodSayaclari = { stok: 7 };
  t["tanimlar:data"] = JSON.stringify(tan);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(3000);
  const stok = await depoOku(sayfa, "stok:items");
  const nolar = stok.filter((p) => ["u2", "stok-zzzz-yeni"].includes(p.id)).map((p) => `${p.ad}:${p.stokNo}`).sort();
  const sayac = ((await depoOku(sayfa, "tanimlar:data")).kodSayaclari || {}).stok;
  await tarayici.close();
  return { nolar, sayac, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
