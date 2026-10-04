// SENARYO — ATÖLYE İÇİ BÖLÜM: KESİMHANE (4 Ekim, v1.585.0).
// Kullanıcı: "Kesimhanemiz var, 5 kişi maaşlı. Ürün maliyetine kesim 30 ₺ giriyorum; üretimde bu tutar cariye alacak
// yazılıyor ama biz maaş ödüyoruz. Carilerde hareket olmuyor, üretim carisi bizden fazla alacaklı görünüyor."
// Ölçülen zincir: Kesim prosesi "Kesimhane" bölümüne bağlı, Personel C üye (maaş 20.000).
//   1) Açılışta bu ayın maaşı Personel C carisine "Maaş" alacağı olarak bir kez tahakkuk eder (MAAS-YYYY-MM-… fişi).
//   2) 3 çift Kesim teslimi: cariye "-İşçilik" hareketi YAZILMAZ; üretim kaydına bölüm tahakkuku 3 × 30 = 90 ₺.
//   3) Kâr-Zarar › Atölye içi bölümler: Kesimhane tahakkuk 90, maaş 20.000 → zarar 19.910.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bolumler = [{ id: "bk", ad: "Kesimhane", prosesler: ["Kesim"], personel: [{ cariId: "c3", maas: 20000 }] }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(t["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  bot.prosesUcretleri = { ...(bot.prosesUcretleri || {}), Kesim: 30 };
  t["stok:items"] = JSON.stringify(st);
  t["uretim:siparisler"] = JSON.stringify([{
    id: "up2", siparisNo: "1002", takipKodu: "1002", model: "Bot", urunId: "u2", renk: "Siyah", adet: 3,
    bedenMiktarlari: [{ beden: "41", miktar: 3 }], beden: "Siyah · 41:3",
    stogaEklendiMi: false, asama: "Kesim", durum: "Devam", olusturuldu: "2026-09-01T08:00:00.000Z",
    prosesIlerleme: [{ proses: "Kesim", sira: 1, verildiMi: true, tamamlandiMi: false, personelId: "c3",
      atamalar: [{ id: "at2", personelId: "c3", miktar: 3, bedenMiktarlari: { "41": 3 }, barkod: "1002",
        verildiMi: true, tamamlandiMi: false, verilmeTarihi: "2026-09-02" }] }],
  }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2500);
  const cariC = async () => ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c3") || {};
  const ozet = (h) => `${String(h.fisNo || "").replace(/\d{4}-\d{2}/, "YYYY-MM")} · ${h.islemTipi || "?"} · ${h.yon} · ${h.tutar}`;
  const onceki = new Set(((await cariC()).hareketler || []).map((h) => h.id));
  const maasOnce = ((await cariC()).hareketler || []).filter((h) => /^MAAS-/.test(h.fisNo || "")).map(ozet);

  await modulAc(sayfa, "Üretim");
  await sayfa.waitForTimeout(700);
  await sayfa.getByText("1002", { exact: true }).last().click();
  await sayfa.waitForTimeout(900);
  await sayfa.locator("[data-teslim-al]:visible").first().click();
  await sayfa.waitForTimeout(1500);
  const sonra = await cariC();
  const yeniHareketler = (sonra.hareketler || []).filter((h) => !onceki.has(h.id)).map(ozet);
  const u = ((await depoOku(sayfa, "uretim:siparisler")) || []).find((x) => x.id === "up2") || {};
  const tahakkuk = (u.bolumTahakkuklari || []).map((x) => `${x.bolumAd} · ${x.proses} · ${x.adet} × ${x.ucret} = ${x.tutar} · ${x.fisNo}`);

  await modulAc(sayfa, "Kasa & Banka");
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Kâr \/ Zarar/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const bolumSatiri = await sayfa.evaluate(() => { const r = document.querySelector('[data-kz-bolum="Kesimhane"]'); return r ? r.innerText.replace(/\s+/g, " ").trim() : "yok"; });
  const iscilikToplam = await sayfa.evaluate(() => { const r = document.querySelector("[data-iscilik-dokumu]"); return r ? r.innerText.replace(/\s+/g, " ").trim().slice(0, 120) : "yok"; });
  await tarayici.close();
  return { hatalar, maasOnce, teslim: { yeniCariHareketleri: yeniHareketler, tahakkuk, adimTamam: !!(u.prosesIlerleme || [{}])[0].tamamlandiMi }, karZarar: { bolumSatiri, iscilikToplam } };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
