// BİRİM TESTİ — ARA PROSES ADIMLARI (26 Eylül, v1.477.0)
//
// Kullanıcı: "Ara prosese de hammadde eklenebilir olmalı, normal proses gibi hareket edecek ve bir
// prosesin altına birden fazla ara proses eklenebilmeli."
//
// İddialar:
//   • Bir asıl prosesin ardına BİRDEN ÇOK ara adım, eklenme sırasıyla.
//   • Eski kayıt (tek kimlik) da okunuyor.
//   • Reçetede ara proses adına bağlı hammadde satırı (ara prosesin hammaddesi) ara adı İKİNCİ KEZ
//     normal adım yapmıyor (önceki hata).
//   • Aynı ara proses iki asıl prosese bağlıysa tek adım (adla bulunduğu için).
//   • `araProsesCiftleri` maliyet listesi için bütün çiftleri veriyor.
const { uretimProsesAdimlari, araProsesIdleri, araProsesCiftleri } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const tanimlar = {
  prosesler: [{ ad: "Kesim", sira: 1 }, { ad: "Saya", sira: 2 }, { ad: "Montaj", sira: 3 }],
  araProsesler: [{ id: "ap1", ad: "Boya", cariId: "c1", ucret: 2 }, { id: "ap2", ad: "Temizleme", cariId: "c1", ucret: 1 }, { id: "ap3", ad: "Ütü", cariId: "c1", ucret: 1 }],
};
const urun = {
  recete: [
    { proses: "Saya", mamulRenk: "Siyah", hammaddeUrunId: "deri" },
    { proses: "Kesim", mamulRenk: "Siyah", hammaddeUrunId: "deri" },
    { proses: "Temizleme", mamulRenk: "Siyah", hammaddeUrunId: "poset" },   // ara prosesin hammaddesi
    { proses: "Montaj", mamulRenk: "Siyah", hammaddeUrunId: "taban" },
  ],
  araProsesEklentileri: { Kesim: ["ap1", "ap2"], Saya: "ap3" },
};
const ozet = (l) => l.map((a) => `${a.proses}${a.araProsesMi ? "*" : ""}`);
bekle("sıra: Kesim → Boya* → Temizleme* → Saya → Ütü* (eski tek kimlik) → Montaj", ozet(uretimProsesAdimlari(urun, "Siyah", tanimlar)),
  ["Kesim", "Boya*", "Temizleme*", "Saya", "Ütü*", "Montaj"]);
bekle("ara adımların kimliği ve carisi", uretimProsesAdimlari(urun, "Siyah", tanimlar).filter((a) => a.araProsesMi).map((a) => [a.araProsesId, a.araProsesCariId]),
  [["ap1", "c1"], ["ap2", "c1"], ["ap3", "c1"]]);
bekle("ara sırası asılın arasında", uretimProsesAdimlari(urun, "Siyah", tanimlar).map((a) => a.sira), [1, 1.5, 1.51, 2, 2.5, 3]);
bekle("aynı ara proses iki yerde → tek adım", ozet(uretimProsesAdimlari({ ...urun, araProsesEklentileri: { Kesim: ["ap1"], Saya: ["ap1"] } }, "Siyah", tanimlar)),
  ["Kesim", "Boya*", "Saya", "Montaj"]);
bekle("reçetesiz → tek 'Üretim' adımı", ozet(uretimProsesAdimlari({ recete: [] }, "Siyah", tanimlar)), ["Üretim"]);
bekle("araProsesIdleri: dizi ve tek kimlik", [araProsesIdleri(urun, "Kesim"), araProsesIdleri(urun, "Saya"), araProsesIdleri(urun, "Montaj")], [["ap1", "ap2"], ["ap3"], []]);
bekle("araProsesCiftleri", araProsesCiftleri(urun), [["Kesim", "ap1"], ["Kesim", "ap2"], ["Saya", "ap3"]]);

if (hata) { console.log("── ara proses testi BAŞARISIZ ──"); process.exit(1); }
console.log("── ara proses testi temiz ──");
