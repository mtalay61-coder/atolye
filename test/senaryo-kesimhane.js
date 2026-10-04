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

  // v1.587.0: Kâr / Zarar Finans › Gelir / Gider ekranında.
  await modulAc(sayfa, "Gelir / Gider");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-gg-sekme="karzarar"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const bolumSatiri = await sayfa.evaluate(() => { const r = document.querySelector('[data-kz-bolum="Kesimhane"]'); return r ? r.innerText.replace(/\s+/g, " ").trim() : "yok"; });
  const iscilikToplam = await sayfa.evaluate(() => { const r = document.querySelector("[data-iscilik-dokumu]"); return r ? r.innerText.replace(/\s+/g, " ").trim().slice(0, 120) : "yok"; });
  // v1.587.0: maaş "Üretim işçiliği"nde değil, Giderler › Üretim gideri › "Kesimhane işçiliği" kartında.
  const giderGrubu = await sayfa.evaluate(() => { const r = document.querySelector('[data-kz-grup="uretim"]'); return r ? r.innerText.replace(/\s+/g, " ").trim().slice(0, 120) : "yok"; });
  const giderSatiri = await sayfa.evaluate(() => { const m = document.body.innerText.replace(/\n/g, " | "); const i = m.indexOf("− Giderler"); return i < 0 ? null : m.slice(i, i + 40).split("|")[1].trim(); });
  // v1.586: bölüm satırına tıklayınca döküm açılır — aylık verim, personel ve girişler.
  await sayfa.locator('[data-kz-bolum="Kesimhane"]').click();
  await sayfa.waitForTimeout(600);
  const dokum = await sayfa.evaluate(() => {
    const m = (x) => x.innerText.replace(/\s+/g, " ").trim().replace(/\d{2}\.\d{2}\.\d{4}/g, "GG.AA.YYYY").replace(/\b\d{4}-\d{2}\b/g, "YYYY-AA");
    return {
      acik: !!document.querySelector("[data-kz-bolum-dokum]"),
      aylar: [...document.querySelectorAll("[data-kz-bolum-ay]")].map(m),
      personel: [...document.querySelectorAll("[data-kz-bolum-personel]")].map(m),
      girisler: [...document.querySelectorAll("[data-kz-bolum-giris]")].map(m),
    };
  });
  // Gelir / Gider Kartları: bölümle açılan "Kesimhane işçiliği" kartı, rozeti ve ekstresinde maaş tahakkuku.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-gg-sekme="kartlar"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const kart = await sayfa.evaluate(() => {
    const r = document.querySelector('[data-gider-kart="Kesimhane işçiliği"]');
    if (!r) return "yok";
    return { satir: r.innerText.replace(/\s+/g, " ").trim(), rozet: !!r.querySelector("[data-gider-kart-bolum]") };
  });
  await sayfa.locator('[data-kart-ekstre="Kesimhane işçiliği"]').click();
  await sayfa.waitForTimeout(400);
  const kartEkstre = await sayfa.evaluate(() => { const r = document.querySelector('[data-kart-hareketleri="Kesimhane işçiliği"]'); return r ? r.innerText.replace(/\s+/g, " ").trim().replace(/\d{2}\.\d{2}\.\d{4}/g, "GG.AA.YYYY").replace(/[A-ZÇĞİÖŞÜa-zçğıöşü]+ \d{4} maaşı/g, "AY YYYY maaşı") : "yok"; });
  const tanimKart = ((await depoOku(sayfa, "tanimlar:data")) || {}).giderKartlari || [];
  const bolumKarti = tanimKart.filter((k) => k.bolumId === "bk").map((k) => `${k.ad} · ${k.grup} · ${k.tur}`);
  await tarayici.close();
  return { hatalar, maasOnce, teslim: { yeniCariHareketleri: yeniHareketler, tahakkuk, adimTamam: !!(u.prosesIlerleme || [{}])[0].tamamlandiMi },
    karZarar: { bolumSatiri, iscilikToplam, giderGrubu, giderSatiri, dokum }, giderKarti: { kart, kartEkstre, bolumKarti } };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
