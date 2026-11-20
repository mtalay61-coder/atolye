// SENARYO — KÂR-ZARAR › ATÖLYE BÖLÜMÜ: DÖNEM ÇİFT BAŞI, SEZON TABLOSU, SON 3/6 AY, TARİH ARALIĞI (v1.744.32, kullanıcı 20 Kasım).
//   "6 ay × 140.000 ₺ ÷ 6 aylık kesimhane adedi … sezon olarak da değerlendirebiliriz; sezon siparişten; aynı anda 2 sezon
//    üretimi yaptığımız oluyor" · "tarih aralığı da ekleyebiliriz".
// Tohum (tarihler bugüne göre): KESİMHANE (KEMAL 80.000, GAFFAR 60.000). Bu ay ve geçen ay MAŞ- maaş fişleri (sunucu fişi biçimi,
// işlem tipi yok). Geçen ay: İlkbahar/Yaz 600 + Sonbahar/Kış 400 çift; bu ay: İlkbahar/Yaz 700 çift. 3 ay önce maaş var, teslim yok.
// Ölçülen: Son 6 ay / Bu ay / tarih aralığı (geçen ayın tamamı) için bölüm satırı ve sezon tablosu; dağıtılamayan uyarısı.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const ayKaydir = (n) => { const d = new Date(); d.setDate(15); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7); };
const gunSon = (ay) => { const [y, m] = ay.split("-").map(Number); return new Date(y, m, 0).getDate(); };

async function calistir() {
  const t = { ...TOHUM };
  const buAy = ayKaydir(0), gecen = ayKaydir(-1), ucOnce = ayKaydir(-3);
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bolumler = [{ id: "bk", ad: "KESİMHANE", prosesler: ["Kesim"], personel: [{ cariId: "kemal", maas: 80000 }, { cariId: "gaffar", maas: 60000 }] }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const cariler = JSON.parse(t["cari:data"]);
  // Anahtar uygulamanın kendi biçimiyle (015 maasFisNo: MAAS-YYYY-MM-<4 haneli cari kodu>); carilerin kodu verilir — kodsuz
  // anahtar eşleşmezse uygulama bu ayın maaşını yerel yoldan bir kez daha tahakkuk ederdi (test verisinin hatası, uygulamanın değil).
  const maas = (cari, kod, ay, tutar, no) => ({ id: `m-${cari}-${ay}`, fisNo: `MAŞ-${no}`, tarih: `${ay}-01`, zaman: `${ay}-01T08:00:00.000Z`, yon: "Alacak", tutar,
    odemeSekli: "Nakit", defter: "Genel", bolumId: "bk", maasAnahtari: `MAAS-${ay}-${kod}`, aciklama: "maaş" });
  cariler.push({ id: "kemal", kod: "901", unvan: "KESİCİ KEMAL", tip: "Personel", paraBirimi: "TRY", hareketler: [buAy, gecen, ucOnce].map((a, i) => maas("kemal", "0901", a, 80000, `K${i}`)) });
  cariler.push({ id: "gaffar", kod: "902", unvan: "KESİCİ GAFFAR", tip: "Personel", paraBirimi: "TRY", hareketler: [buAy, gecen, ucOnce].map((a, i) => maas("gaffar", "0902", a, 60000, `G${i}`)) });
  t["cari:data"] = JSON.stringify(cariler);
  const sip = JSON.parse(t["siparis:data"]);
  sip.push({ id: "sIY", siparisNo: "SAT-IY", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: `${gecen}-01`, sezon: "İlkbahar/Yaz 2027", kalemler: [] });
  sip.push({ id: "sSK", siparisNo: "SAT-SK", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: `${gecen}-01`, sezon: "Sonbahar/Kış 2026", kalemler: [] });
  t["siparis:data"] = JSON.stringify(sip);
  const tah = (id, tarih, adet) => ({ id, bolumId: "bk", bolumAd: "KESİMHANE", proses: "Kesim", tarih, zaman: `${tarih}T10:00:00.000Z`, adet, ucret: 30, tutar: adet * 30, personelId: "kemal" });
  const ur = (id, sipId, tahs) => ({ id, siparisNo: id, takipKodu: id, model: "Bot", urunId: "u2", renk: "Siyah", adet: 1, bedenMiktarlari: [], stogaEklendiMi: false,
    asama: "Kesim", durum: "Devam", olusturuldu: `${gecen}-01T08:00:00.000Z`, rezervasyonSiparisId: sipId, prosesIlerleme: [], bolumTahakkuklari: tahs });
  t["uretim:siparisler"] = JSON.stringify([
    ur("U-IY1", "sIY", [tah("t1", `${gecen}-10`, 600)]),
    ur("U-SK1", "sSK", [tah("t2", `${gecen}-20`, 400)]),
    ur("U-IY2", "sIY", [tah("t3", `${buAy}-05`, 700)]),
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  await modulAc(sayfa, "Gelir / Gider");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-gg-sekme="karzarar"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const olc = () => sayfa.evaluate(() => {
    const cift = document.querySelector('[data-kz-bolum-cift="KESİMHANE"]');
    const sezon = [...document.querySelectorAll("[data-kz-bolum-sezon-satir]")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.innerText.trim()).join(" | "));
    const dag = document.querySelector('[data-kz-bolum-dagitilamayan="KESİMHANE"]');
    return { ciftBasi: cift ? cift.innerText.trim() : null, sezonlar: sezon, dagitilamayan: dag ? dag.innerText.trim() : null };
  });
  const donem = async (k) => { await sayfa.locator(`[data-kz-donem="${k}"]`).first().click(); await sayfa.waitForTimeout(500); };
  const sonuc = {};
  sonuc.donemDugmeleri = await sayfa.evaluate(() => [...document.querySelectorAll("[data-kz-donem]")].map((b) => b.textContent.trim()));
  await donem("son6Ay");
  await sayfa.evaluate(() => { const r = document.querySelector('[data-kz-bolum="KESİMHANE"]'); if (r) r.click(); });
  await sayfa.waitForTimeout(600);
  sonuc.son6Ay = await olc();
  await donem("buAy");
  sonuc.buAy = await olc();
  await donem("aralik");
  sonuc.aralikBos = { ...(await olc()), uyari: await sayfa.evaluate(() => /başlangıç ve bitiş tarihini seçin/.test(document.body.innerText)) };
  await sayfa.locator("[data-kz-aralik-bas]").fill(`${gecen}-01`);
  await sayfa.locator("[data-kz-aralik-son]").fill(`${gecen}-${gunSon(gecen)}`);
  await sayfa.waitForTimeout(500);
  sonuc.aralikGecenAy = await olc();
  sonuc.hatalar = hatalar;
  await tarayici.close();
  return sonuc;
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
