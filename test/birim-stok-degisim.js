// BİRİM TESTİ — REÇETEDE STOK DEĞİŞİMİ SIFIRDAN EŞLEŞİR (v1.636.1)
// Kullanıcı: "stok değiştiğinde stoğun renk eşleştirme mantığı da değişmesi gerekli, sıfırdan stok ekler gibi davranmalı".
// Ölçülen: eski stoğun rengi (Taba) taşınmaz, yeni stokta mamul rengiyle aynı ad seçilir; renksiz stokta "Standart";
// bedensiz stokta beden satırları (aynı miktar) tek "Tüm Bedenler" satırına iner; bedenli stokta "Tüm Bedenler" satırı
// mamul bedenlerine açılır; çözülemeyen hücre eski değerle kalır ve sayılır; miktar, proses, pozisyon korunur.
const { stokDegisimSatirlari } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };

const eskiDeri = { id: "d1", ad: "Deri A", birim: "desi", variants: [{ renk: "Taba", beden: "Standart" }, { renk: "Siyah", beden: "Standart" }] };
const yeniDeri = { id: "d2", ad: "Deri B", birim: "dm2", variants: [{ renk: "Siyah", beden: "Standart" }, { renk: "Kahve", beden: "Standart" }] };
const renksiz = { id: "d3", ad: "Jut", birim: "m", variants: [{ renk: "Standart", beden: "Standart" }] };
const taban = { id: "t1", ad: "Taban", birim: "çift", variants: [{ renk: "Siyah", beden: "40" }, { renk: "Siyah", beden: "41" }] };
const urunler = [eskiDeri, yeniDeri, renksiz, taban];
const mb = () => ["40", "41"];
const satir = (mamulRenk, renk, extra = {}) => ({ id: `r-${mamulRenk}-${extra.mamulBeden || "T"}`, mamulRenk, mamulBeden: "Tüm Bedenler", hammaddeUrunId: "d1", hammaddeAd: "Deri A",
  renk, beden: "Standart", miktar: 15, birim: "desi", proses: "Kesim", aciklama: "", ...extra });

// Mamul Siyah'a eski stokta (bilerek) Taba verilmişti; yeni stokta Siyah var → Siyah (eski karar taşınmaz).
let c = stokDegisimSatirlari([satir("Siyah", "Taba"), satir("Kahve", "Taba")], yeniDeri, urunler, mb);
bekle("aynı ad: Siyah→Siyah, Kahve→Kahve", c.satirlar.map((r) => `${r.mamulRenk}:${r.renk}`), ["Siyah:Siyah", "Kahve:Kahve"]);
bekle("stok, birim değişti; miktar/proses kaldı", c.satirlar.map((r) => [r.hammaddeUrunId, r.hammaddeAd, r.birim, r.miktar, r.proses]), [["d2", "Deri B", "dm2", 15, "Kesim"], ["d2", "Deri B", "dm2", 15, "Kesim"]]);
bekle("id taşınmaz (yeni satır)", c.satirlar.every((r) => r.id === undefined), true);

// Yeni stokta karşılığı olmayan mamul rengi: eski değerle kalır, sayılır.
c = stokDegisimSatirlari([satir("Bej", "Taba")], yeniDeri, urunler, mb);
bekle("çözülemeyen renk eski değerle kalır, sayılır", { renk: c.satirlar[0].renk, bos: c.bosRenk }, { renk: "Taba", bos: 1 });

// Renksiz stok: "Standart".
c = stokDegisimSatirlari([satir("Siyah", "Siyah"), satir("Kahve", "Taba")], renksiz, urunler, mb);
bekle("renksiz stok: Standart", c.satirlar.map((r) => r.renk), ["Standart", "Standart"]);

// Bedenli → bedensiz: aynı miktarlı beden satırları tek satıra.
const bedenli = [satir("Siyah", "Siyah", { mamulBeden: "40", beden: "40", hammaddeUrunId: "t1" }), satir("Siyah", "Siyah", { mamulBeden: "41", beden: "41", hammaddeUrunId: "t1" })];
c = stokDegisimSatirlari(bedenli, yeniDeri, urunler, mb);
bekle("bedensiz stok: beden satırları tek 'Tüm Bedenler'", c.satirlar.map((r) => `${r.mamulBeden}/${r.beden}`), ["Tüm Bedenler/Standart"]);
c = stokDegisimSatirlari([bedenli[0], { ...bedenli[1], miktar: 16 }], yeniDeri, urunler, mb);
bekle("miktarlar farklıysa bedenler korunur", c.satirlar.map((r) => `${r.mamulBeden}/${r.beden}/${r.miktar}`), ["40/Standart/15", "41/Standart/16"]);

// Bedensiz → bedenli: "Tüm Bedenler" mamul bedenlerine açılır, boy aynı ad.
c = stokDegisimSatirlari([satir("Siyah", "Siyah")], taban, urunler, mb);
bekle("bedenli stok: mamul bedenlerine açılır", c.satirlar.map((r) => `${r.mamulBeden}/${r.beden}/${r.renk}`), ["40/40/Siyah", "41/41/Siyah"]);

// Pozisyonlu (kombinasyon) satır: pozisyonun rengi.
c = stokDegisimSatirlari([satir("1001 - Taba/Siyah", "Taba", { aciklama: "2. Renk" })], yeniDeri, urunler, mb);
bekle("kombinasyonda pozisyon rengi (2. Renk = Siyah)", [c.satirlar[0].renk, c.satirlar[0].aciklama], ["Siyah", "2. Renk"]);

process.exit(hata);
