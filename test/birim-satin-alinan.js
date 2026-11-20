// BİRİM — SATIN ALINAN ÜRÜN (v1.744.29, kullanıcı 20 Kasım: "ürün stok kartında tedarikçi ekleyelim ve satın aldığımız ürünler
// için reçete olmasın"). Mamuldeki ayrı işaret `satinAlinan`:
//   - üretim kapısı (055 uretimReceteKapisi) reddeder — reçete onay serbestisi (test kısayolu) açıkken bile
//   - hammadde ihtiyacı (230 mrpHesapla) doğmaz — işaretlenmeden önce kalmış reçete olsa bile
//   - maliyet (156 urunMaliyetHesabi) alış fiyatından — kalmış reçete hesaba girmez
//   - işaret yalnız MAMULDE anlamlı (hammadde zaten satın alınır; hammaddede işaret yok sayılır)
const { satinAlinanMi, uretimReceteKapisi, mrpHesapla, urunMaliyetHesabi, siparisHammaddeIhtiyaci } = require("./erp.cjs");

let gecti = 0, kaldi = 0;
const ok = (ad, kosul) => { if (kosul) { gecti++; console.log("  ✓ " + ad); } else { kaldi++; console.log("  ✗ " + ad); } };

const deri = { id: "u1", ad: "Deri", kategori: "Hammadde", birim: "metre", variants: [{ renk: "Siyah", beden: "", miktar: 100 }], recete: [] };
const recete = [{ proses: "Kesim", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "metre" }];
const uretilen = { id: "m1", ad: "Bot", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "40", miktar: 0 }], recete, alisFiyati: 0 };
const alinan = { id: "m2", ad: "Hazır Sandalet", kategori: "Mamul", satinAlinan: true, tedarikciId: "c1", alisFiyati: 250, alisParaBirimi: "₺",
  variants: [{ renk: "Siyah", beden: "40", miktar: 0 }], recete };   // işaretlenmeden önceden kalmış reçete
const hammaddeIsaretli = { ...deri, id: "u9", satinAlinan: true };
const stok = [deri, uretilen, alinan, hammaddeIsaretli];

console.log("── satinAlinanMi");
ok("işaretli mamul → evet", satinAlinanMi(alinan) === true);
ok("işaretsiz mamul → hayır", satinAlinanMi(uretilen) === false);
ok("hammaddede işaret yok sayılır", satinAlinanMi(hammaddeIsaretli) === false);
ok("ürün yok → hayır", satinAlinanMi(null) === false);

console.log("── üretim kapısı");
const kapi = uretimReceteKapisi(alinan, stok);
ok("satın alınan ürün üretime girmez (ileti)", typeof kapi === "string" && /satın alınan ürün/.test(kapi));
global.window = { __receteOnaySerbest: true };
ok("reçete onay serbestisi açıkken de reddeder", /satın alınan ürün/.test(uretimReceteKapisi(alinan, stok) || ""));
ok("serbestiyle üretilen ürün geçer (kıyas)", uretimReceteKapisi(uretilen, stok) === null);
delete global.window;

console.log("── hammadde ihtiyacı");
const kalem = (id, urun) => ({ id, urunId: urun.id, urunAd: urun.ad, renk: "Siyah", beden: "40", miktar: 3, karsilanan: 0 });
const siparisler = [{ id: "s1", siparisNo: "SAT-1", tip: "Satış", durum: "Bekliyor", kalemler: [kalem("k1", uretilen), kalem("k2", alinan)] }];
const ihtiyac = mrpHesapla(siparisler, stok, [], false, {});
const deriSatiri = ihtiyac.find((x) => x.hammaddeUrunId === "u1");
ok("üretilen ürün hammadde ihtiyacı doğurur (3 × 2 = 6)", deriSatiri && deriSatiri.gereken === 6);
ok("satın alınan ürün ihtiyaca katılmaz (kaynaklarda yok)", deriSatiri && !deriSatiri.kaynaklar.some((k) => k.urunAd === "Hazır Sandalet"));

console.log("── sipariş başına ihtiyaç (sipariş kartı)");
const sh = siparisHammaddeIhtiyaci({ id: "s2", kalemler: [kalem("k3", alinan)] }, stok, [], [], {});
const shSatirlar = (sh && sh.kalemler) || [];
const shRecetesiz = (sh && sh.recetesizKalem) || 0;
ok("satın alınan kalem hammadde satırı üretmez", shSatirlar.length === 0);
ok("satın alınan kalem reçetesiz sayılmaz", shRecetesiz === 0);

console.log("── maliyet");
const m = urunMaliyetHesabi(alinan, { stok, kurlar: {} });
ok("maliyet alış fiyatından (tur alis)", m.tur === "alis");
ok("maliyet tutarı = alış fiyatı (250 TL)", m.tamTL === 250);
const mu = urunMaliyetHesabi(uretilen, { stok, kurlar: {} });
ok("üretilen ürün reçeteden hesaplanır (kıyas)", mu.tur === "recete");

console.log(`── satin-alinan: ${gecti} geçti, ${kaldi} kaldı ──`);
process.exit(kaldi ? 1 : 0);
