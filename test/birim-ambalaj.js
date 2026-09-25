// BİRİM TESTİ — AMBALAJ SATIRI: DEĞİŞKEN Mİ SABİT Mİ
//
// Kural artık ürünün malzeme tipine DEĞİL, reçete satırına bağlı. Ambalaj tipinde birden çok
// malzeme tanımlanıyor ve hepsinin rengi siparişten gelmiyor.
const { ambalajUrunuMu, ambalajDegiskenSatirMi, ambalajRengiUygula, receteRenkKapsamEksikleri,
  ambalajRenkSecenekleri } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const kutu = { id: "amb1", ad: "Kutu", kategori: "Hammadde", malzemeTipi: "Ambalaj",
  variants: [{ renk: "Kraft", beden: "", miktar: 0 }, { renk: "Siyah", beden: "", miktar: 0 }] };
const poset = { id: "amb2", ad: "Koruyucu Poşet", kategori: "Hammadde", malzemeTipi: "Ambalaj",
  variants: [{ renk: "Şeffaf", beden: "", miktar: 0 }] };
const deri = { id: "u1", ad: "Deri", kategori: "Hammadde", malzemeTipi: "Deri",
  variants: [{ renk: "Siyah", beden: "", miktar: 0 }] };
const stok = [kutu, poset, deri];

const satir = (urunId, ek = {}) => ({ hammaddeUrunId: urunId, mamulRenk: "Siyah", renk: "Kraft", ...ek });
const siparis = { ambalaj: { renk: "Siyah" } };

bekle("kutu ambalaj tipinde", ambalajUrunuMu(kutu), true);
bekle("deri ambalaj tipinde değil", ambalajUrunuMu(deri), false);

// ---- 1) Alan yoksa eski davranış: değişken ----
bekle("alan yoksa ürün tipine bakılır (eski satır)", ambalajDegiskenSatirMi(satir("amb1"), kutu), true);
bekle("alan yoksa normal malzeme sabittir", ambalajDegiskenSatirMi(satir("u1"), deri), false);
// MALZEME TİPİNDEN BAĞIMSIZ: kullanıcı kutusunu "Kutu" diye tanımlasa da satır işaretliyse değişken.
const kutuTipsiz = { id: "amb3", ad: "Kutu", kategori: "Hammadde", malzemeTipi: "Kutu",
  variants: [{ renk: "Kraft", beden: "", miktar: 0 }] };
bekle("tipi Ambalaj olmayan üründe de satır işareti geçerli",
  ambalajDegiskenSatirMi({ hammaddeUrunId: "amb3", ambalajDegisken: true }, kutuTipsiz), true);
bekle("ambalaj tipli üründe satır sabit işaretliyse sabittir",
  ambalajDegiskenSatirMi({ hammaddeUrunId: "amb1", ambalajDegisken: false }, kutu), false);
bekle("eski satırda renk siparişten gelir", ambalajRengiUygula(satir("amb1"), siparis, stok, null), "Siyah");

// ---- 2) SABİT işaretli satır: sipariş rengi UYGULANMAZ ----
const sabit = satir("amb2", { ambalajDegisken: false, renk: "Şeffaf" });
bekle("sabit satır değişken değildir", ambalajDegiskenSatirMi(sabit, poset), false);
bekle("sabit satırda reçetedeki renk korunur", ambalajRengiUygula(sabit, siparis, stok, null), "Şeffaf");

// ---- 3) DEĞİŞKEN işaretli satır ----
const degisken = satir("amb1", { ambalajDegisken: true });
bekle("değişken satırda sipariş rengi uygulanır", ambalajRengiUygula(degisken, siparis, stok, null), "Siyah");

// ---- 4) Ambalaj olmayan malzeme hiçbir zaman etkilenmez ----
bekle("deri satırı siparişten etkilenmez",
  ambalajRengiUygula(satir("u1", { renk: "Siyah", ambalajDegisken: true }), siparis, stok, null), "Siyah");

// ---- 5) Renk kapsam denetimi: sabit satır MUAF DEĞİL ----
// Mamulün iki rengi var; ambalaj satırı yalnızca birine tanımlı.
const mamul = {
  id: "m1", ad: "Bot", kategori: "Mamul",
  variants: [{ renk: "Siyah", beden: "41" }, { renk: "Taba", beden: "41" }],
  recete: [sabit],
};
bekle("sabit ambalaj satırı eksik renk uyarısı verir",
  receteRenkKapsamEksikleri(mamul, stok).length > 0, true);
const mamulDegisken = { ...mamul, recete: [satir("amb1", { ambalajDegisken: true })] };
bekle("değişken ambalaj satırı kapsam denetiminden muaf",
  receteRenkKapsamEksikleri(mamulDegisken, stok).length, 0);

// ---- 6) Siparişte seçilebilecek renkler REÇETEDEN gelir ----
// Kullanıcı: "değişken istenen stokları seçelim, oradan eşleştirsin."
{
  const hepsi = { ...mamul, recete: [satir("amb1", { ambalajDegisken: true })] };
  bekle("seçenek yazılmamışsa o hammaddenin tüm renkleri",
    ambalajRenkSecenekleri(hepsi, stok), ["Kraft", "Siyah"]);

  const daraltilmis = { ...mamul, recete: [satir("amb1", { ambalajDegisken: true, ambalajSecenekleri: ["Kraft"] })] };
  bekle("seçenek yazılmışsa yalnızca onlar",
    ambalajRenkSecenekleri(daraltilmis, stok), ["Kraft"]);

  const sabitli = { ...mamul, recete: [sabit] };
  bekle("sabit satır siparişe seçenek üretmez", ambalajRenkSecenekleri(sabitli, stok), []);

  const karisik = { ...mamul, recete: [
    satir("amb1", { ambalajDegisken: true, ambalajSecenekleri: ["Siyah"] }),
    satir("amb2", { ambalajDegisken: true }),
    { hammaddeUrunId: "u1", mamulRenk: "Siyah", renk: "Siyah" },
  ] };
  bekle("birden çok ambalaj satırı birleşir, deri karışmaz",
    ambalajRenkSecenekleri(karisik, stok), ["Siyah", "Şeffaf"]);

  bekle("reçetesiz mamulde seçenek yok", ambalajRenkSecenekleri({ recete: [] }, stok), []);

  // Malzeme tipi "Ambalaj" olmayan bir kutu, satır işaretiyle siparişe seçenek üretir.
  const tipsiz = { ...mamul, recete: [{ hammaddeUrunId: "amb3", mamulRenk: "Siyah", renk: "Kraft", ambalajDegisken: true }] };
  bekle("tipsiz kutu da siparişe seçenek üretir",
    ambalajRenkSecenekleri(tipsiz, [...stok, kutuTipsiz]), ["Kraft"]);
}

console.log(hata ? "── AMBALAJ BİRİM TESTİ BAŞARISIZ ──" : "── ambalaj birim testi temiz ──");
process.exit(hata);
