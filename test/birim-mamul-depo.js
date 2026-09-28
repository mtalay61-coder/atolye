// BİRİM TESTİ — MAMUL DEPOSU "AÇIK" (28 Eylül, v1.506.0)
//
// Kullanıcı: "Açık ne demek?" → açıklama + öneri → "Evet, düzelt". Açık = talep − (o siparişin kolisindeki)
// − serbest − üretimde. Önce siparişin kendi kolisi açığı kapatmıyordu: 16 çift kolide hazırken "16 üretilmeli".
// İddialar:
//   • Siparişin kendi kolisi açığı kapatır (16 talep, 16 kolide → açık 0); serbest yine 0 (başkasına satılmaz).
//   • Başka siparişin kolisi bu siparişin açığını KAPATMAZ.
//   • Koli içeriği siparişin kalanını aşarsa yalnız kalan kadarı sayılır.
//   • Sipariş no'suz koli carisi/içeriğiyle çözülür; hiç çözülemeyen koli açığı kapatmaz; sevk edilmiş koli sayılmaz.
const { mamulDeposuDurumu } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const stok = [{ id: "m", ad: "Bot", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "37", miktar: 16 }] }];
const sip = (id, miktar, karsilanan = 0) => ({ id, siparisNo: id, tip: "Satış", durum: "Onaylandı", cariId: "c",
  kalemler: [{ id: id + "k", urunId: "m", urunAd: "Bot", renk: "Siyah", beden: "37", miktar, karsilanan }] });
const koli = (id, siparisId, adet, durum = "Hazır", cariId = "c") => ({ id, kod: id, durum, siparisId, cariId,
  kalemler: [{ urunId: "m", urunAd: "Bot", renk: "Siyah", beden: "37", adet }] });
const h = (siparisler, koliler) => {
  const x = mamulDeposuDurumu(stok, siparisler, [], koliler)[0].hucreler["37"];
  return { talep: x.talep, kolide: x.kolide, serbest: x.serbest, acik: x.acik };
};

bekle("kolisiz: 16 talep, 16 serbest → açık 0", h([sip("S1", 16)], []), { talep: 16, kolide: 0, serbest: 16, acik: 0 });
bekle("kendi kolisinde 16 → açık 0 (önce 16'ydı), serbest 0", h([sip("S1", 16)], [koli("K1", "S1", 16)]), { talep: 16, kolide: 16, serbest: 0, acik: 0 });
bekle("S1'in kolisi S2'nin açığını kapatmaz", h([sip("S1", 16), sip("S2", 10)], [koli("K1", "S1", 16)]), { talep: 26, kolide: 16, serbest: 0, acik: 10 });
bekle("koli siparişin kalanını aşarsa yalnız kalan kadar", h([sip("S1", 16, 10)], [koli("K1", "S1", 16)]), { talep: 6, kolide: 16, serbest: 0, acik: 0 });
bekle("aşan kısım başka siparişe sayılmaz", h([sip("S1", 16, 10), sip("S2", 10)], [koli("K1", "S1", 16)]), { talep: 16, kolide: 16, serbest: 0, acik: 10 });
// Sipariş no'suz koli CARİSİ ve içeriğiyle çözülür (fiş/sevkiyatla aynı kural `koliSiparisiniCoz`) → açığı kapatır.
bekle("sipariş no'suz ama carisi belli koli içerikten çözülür", h([sip("S1", 16)], [koli("K1", null, 16)]), { talep: 16, kolide: 16, serbest: 0, acik: 0 });
bekle("hiç çözülemeyen (sipariş ve cari yok) koli açığı kapatmaz", h([sip("S1", 16)], [koli("K1", null, 16, "Hazır", null)]), { talep: 16, kolide: 16, serbest: 0, acik: 16 });
bekle("sevk edilmiş koli sayılmaz", h([sip("S1", 16)], [koli("K1", "S1", 16, "Sevk edildi")]), { talep: 16, kolide: 0, serbest: 16, acik: 0 });

process.exit(hata);
