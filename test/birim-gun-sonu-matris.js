// BİRİM — GÜN SONU RAPORU BEDEN MATRİSİ (v1.744.5; kullanıcı 3 Kasım: "matris şeklinde düzenler misin"). Fiş kalemleri ve stok
// hareketleri ürün + renk (+ fiş / kaynak) satırına toplanır, bedenler sütun olur. Ekran, PDF ve e-posta aynı bölümlerden çizer.
const E = require("./erp.cjs");
let hata = 0;
const bak = (ad, gercek, beklenen) => { const ok = JSON.stringify(gercek) === JSON.stringify(beklenen); if (!ok) hata = 1;
  console.log(`  ${ok ? "✓" : "✗"} ${ad}${ok ? "" : `\n      beklenen: ${JSON.stringify(beklenen)}\n      çıkan:    ${JSON.stringify(gercek)}`}`); };
const k = (b, m, f) => ({ urun: "Deneme Stok", renk: "1001 - Siyah", beden: b, miktar: m, birim: "Çift", tutar: m * f, pb: "TRY" });
const bos = { cariHareketleri: [], kasaHareketleri: [], uretimHareketleri: [], uretimAsamalari: [], hesapBakiyeleri: [], cekler: [], cariBakiyeListesi: [], stokMiktarlari: [], bakiyeDefter: "Genel" };
// 3 Kasım canlı deneme günü (kullanıcının gönderdiği rapor)
const v = { ...bos,
  fisler: [{ tur: "Alış", fisNo: "AF-261103001", cari: "Tedarik", kalemler: [k("38", 2, 22), k("36", 1, 22), k("37", 1, 22), k("39", 2, 22), k("40", 1, 22)] },
    { tur: "Satış", fisNo: "SF-261103001", cari: "Deneme Müşteri", kalemler: [k("36", 1, 222), k("37", 1, 222), k("38", 2, 222), k("39", 2, 222), k("40", 1, 222)] }],
  stokHareketleri: [["36", -1], ["37", -1], ["38", -2], ["39", -2], ["40", -1]].map(([b, m]) => ({ urun: "Deneme Stok", renk: "1001 - Siyah", beden: b, miktar: m, birim: "Çift", kaynak: "Satış", cari: "Deneme Müşteri", fisNo: "SF-261103001" })) };
const bol = Object.fromEntries(E.gunSonuBolumleri(v).map((b) => [b.baslik, b]));
const f = bol["Alış / Satış fişleri"];
bak("fiş bölümü: bedenler sütun (sayı sırasıyla), sonda toplam ve tutar", f.kolonlar.map((x) => x[0]), ["Tür", "Fiş No", "Cari", "Ürün", "Renk", "36", "37", "38", "39", "40", "Toplam", "Tutar"]);
bak("fiş bölümü: fiş başına tek satır (ürün + renk)", f.satirlar, [
  ["Alış", "AF-261103001", "Tedarik", "Deneme Stok", "1001 - Siyah", "1", "1", "2", "2", "1", "7 Çift", "154,00 ₺"],
  ["Satış", "SF-261103001", "Deneme Müşteri", "Deneme Stok", "1001 - Siyah", "1", "1", "2", "2", "1", "7 Çift", "1.554,00 ₺"]]);
bak("beden sütunları sağa yaslı", f.kolonlar.slice(5).every((x) => x[1] === 1), true);
bak("stok hareketi: çıkış eksi, satır başına toplam", bol["Diğer stok hareketleri"].satirlar, [["Deneme Stok", "1001 - Siyah", "Satış", "Deneme Müşteri", "SF-261103001", "-1", "-1", "-2", "-2", "-1", "-7 Çift"]]);
// Kenar durumları
const mx = E.gunSonuMatris([{ beden: "M", miktar: 2, birim: "adet" }, { beden: "S", miktar: 1, birim: "adet" }, { beden: "XL", miktar: 1, birim: "adet" }, { beden: "40", miktar: 3 }, { beden: "", miktar: 5 }, { beden: "M", miktar: 1, birim: "adet" }], () => ["x"]);
bak("sayısal bedenler önce, harfliler beden sırasıyla (S, M, XL), bedensiz '—' en sonda", mx.bedenler, ["40", "S", "M", "XL", "—"]);
bak("aynı beden toplanır; toplam bütün bedenler", [mx.gruplar[0].hucre.M, mx.gruplar[0].toplam], [3, 13]);
bak("boş gün: bölüm satırsız", E.gunSonuBolumleri({ ...bos, fisler: [], stokHareketleri: [] }).find((b) => b.baslik === "Alış / Satış fişleri").satirlar, []);
process.exit(hata);
