// BİRİM TESTİ — İNTERNETSİZ AÇILAN KAYIT BULUTA MUTLAKA GİDER (v1.556.0, "Jut" olayı)
//
// Kullanıcı (3 Ekim): "Jut stoğu açtım ve reçeteye ekledim, Jut'u silmedim ama stokta görünmüyor, reçetede
// görünüyor. Bir ara elektrik gitti ve internetsiz çalıştım." Sahte bulutla (fetch taklidi) ölçülür:
//   1. İnternet yokken Jut açılır → yazma düşer → defterde "yaz".
//   2. İnternet gelir, reçete değişir → yazma Jut'u da GÖNDERİR (eskiden yalnız reçeteyi gönderiyordu).
//   3. Oturum kapanır (bellek ölür) → yeni oturumda taban buluttan + defter → ilk yazma Jut2'yi gönderir.
//   4. Başka cihazın aynı ürüne eklediği hareket SİLİNMEZ; bu cihazda silinen hareket silinir.
//   5. Yerel + bulut birleştirme: başka cihazın eklediği ürün ekranda kalır, bu cihazda silinen gelmez.
//   6. Reçetede olup stokta olmayan hammadde bulunur ve aynı kimlikle kurulur.
const bellek = {};
global.window = global.window || {};
global.window.localStorage = { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } };

let ag = "yok";
const istekler = [];
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const yontem = sec.method || "GET";
  if (ag === "yok") throw new TypeError("Failed to fetch");
  istekler.push({ yontem, yol, govde: sec.body ? JSON.parse(sec.body) : null });
  const govde = yontem === "PATCH" ? [{ id: "x" }] : [];
  return { ok: true, status: yontem === "GET" || yontem === "PATCH" ? 200 : 201, json: async () => govde, text: async () => "" };
};

const { supabaseTabloEsitle, tabloBaslangicTam, tabloBaslangicBekleyen, bekleyenKayitlariOku, yereliBulutlaBirlestir, surumleriYukle,
  kayipHammaddeler, kayipHammaddeKarti, derinBirlestir } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const urun = (id, ad, ek = {}) => ({ id, ad, kategori: "Hammadde", birim: "adet", olcuTipi: "Serbest", variants: [], hareketler: [], recete: [], ...ek });
const gidenUrunler = () => istekler.filter((r) => r.yol.startsWith("urunler") && r.yontem !== "DELETE")
  .flatMap((r) => (Array.isArray(r.govde) ? r.govde.map((g) => g.id) : [r.yol.match(/id=eq\.([^&]+)/) ? decodeURIComponent(r.yol.match(/id=eq\.([^&]+)/)[1]).replace(/"/g, "") : "?"]));
const silinenler = (tablo) => istekler.filter((r) => r.yontem === "DELETE" && r.yol.startsWith(tablo)).map((r) => decodeURIComponent(r.yol));

(async () => {
  // Başlangıç: bulutta yalnız 27080 D (mamul, reçetesiz) var.
  const mamul = urun("m1", "27080 D", { kategori: "Mamul" });
  tabloBaslangicTam("urunler", [mamul]);
  surumleriYukle("urunler", [{ id: "m1", surum: 1 }]);

  // 1) İnternet yok: Jut açılır.
  ag = "yok";
  const jut = urun("jut1", "Jut");
  let dustu = false;
  try { await supabaseTabloEsitle("urunler", [mamul, jut]); } catch (e) { dustu = true; }
  bekle("internetsiz yazma düştü", dustu, true);
  bekle("defterde Jut 'yaz'", (bekleyenKayitlariOku().urunler || {}).ana, { jut1: "yaz" });

  // 2) İnternet geldi; reçeteye Jut eklendi → sıradaki yazma.
  ag = "var";
  const receteli = { ...mamul, recete: [{ hammaddeUrunId: "jut1", hammaddeAd: "Jut", birim: "Çift", mamulRenk: "Kahve Süet", miktar: 0.0286 }] };
  await supabaseTabloEsitle("urunler", [receteli, jut]);
  bekle("Jut da buluta gitti (eskiden yalnız reçete gidiyordu)", gidenUrunler().sort(), ["jut1", "m1"]);
  bekle("başarıdan sonra defter temiz", bekleyenKayitlariOku().urunler, undefined);

  // 3) Oturumlar arası: Jut2 internetsiz açılır, uygulama kapanır.
  istekler.length = 0;
  ag = "yok";
  const jut2 = urun("jut2", "Jut 2");
  try { await supabaseTabloEsitle("urunler", [receteli, jut, jut2]); } catch (e) { /* beklenen */ }
  // Yeni oturum: bulut [receteli, jut], durum yerel [receteli, jut, jut2].
  tabloBaslangicBekleyen("urunler", [receteli, jut], [receteli, jut, jut2]);
  ag = "var";
  await supabaseTabloEsitle("urunler", [receteli, jut, jut2]);
  bekle("yeni oturumda ilk yazma Jut 2'yi gönderdi", gidenUrunler(), ["jut2"]);

  // 4) Alt kayıtlar: bulutta A'nın h1 hareketi (başka cihaz), yerelde h1 yok ama h2 var.
  istekler.length = 0;
  const hr = (id) => ({ id, tarih: "2026-10-03T10:00:00.000Z", renk: "", beden: "", miktar: 1, kaynak: "Giriş" });
  const bulutA = urun("A", "Deri", { hareketler: [hr("h1"), hr("h3")] });
  const yerelA = urun("A", "Deri", { hareketler: [hr("h2"), hr("h3")] });
  surumleriYukle("urunler", [{ id: "m1", surum: 2 }, { id: "jut1", surum: 1 }, { id: "jut2", surum: 1 }, { id: "A", surum: 1 }]);
  tabloBaslangicBekleyen("urunler", [bulutA], [yerelA]);
  await supabaseTabloEsitle("urunler", [yerelA]);
  bekle("başka cihazın hareketi (h1) silinmedi, ürünler de silinmedi", [silinenler("stok_hareketleri"), silinenler("urunler")], [[], []]);
  bekle("yerel hareket (h2) gönderildi", istekler.filter((r) => r.yol.startsWith("stok_hareketleri") && r.yontem === "POST").flatMap((r) => r.govde.map((g) => g.id)), ["h2"]);

  // 5) Birleştirme
  bekle("yerel + bulutta yeni ürün", yereliBulutlaBirlestir([urun("A", "Deri")], [urun("A", "Deri"), urun("B", "Yeni")], "urunler").map((u) => u.id), ["A", "B"]);

  // 6) Kayıp hammadde onarımı
  const kayip = kayipHammaddeler([{ ...receteli }, urun("A", "Deri")]);
  bekle("reçetede olup stokta olmayan: Jut", kayip.map((h) => `${h.id}:${h.ad}:${h.birim}:${h.kullananlar.join(",")}`), ["jut1:Jut:Çift:27080 D"]);
  const kart = kayipHammaddeKarti(kayip[0]);
  bekle("aynı kimlikle hammadde kartı", [kart.id, kart.ad, kart.kategori, kart.birim, kart.variants.length], ["jut1", "Jut", "Hammadde", "Çift", 1]);
  bekle("stokta varsa kayıp sayılmaz", kayipHammaddeler([receteli, jut]).length, 0);

  // 7) Tek parça tablolar (Kasa & Banka): internetsiz girilen fiş + başka cihazın fişi ikisi de kalır.
  const yerelM = { kasalar: [{ id: "k1", ad: "Kasa", hareketler: [{ id: "f1", tutar: 100 }, { id: "f2-internetsiz", tutar: 50 }] }], kurlar: { USD: 49 } };
  const bulutM = { kasalar: [{ id: "k1", ad: "Kasa", hareketler: [{ id: "f1", tutar: 100 }, { id: "f3-baska-cihaz", tutar: 70 }] }, { id: "k2", ad: "Banka" }], kurlar: { USD: 48, EUR: 55 } };
  const m = derinBirlestir(yerelM, bulutM);
  bekle("kasa fişleri: internetsiz + başka cihaz", m.kasalar[0].hareketler.map((h) => h.id), ["f1", "f2-internetsiz", "f3-baska-cihaz"]);
  bekle("buluttaki yeni hesap eklendi", m.kasalar.map((k) => k.id), ["k1", "k2"]);
  bekle("aynı alanda yerel kazanır, yeni anahtar gelir", m.kurlar, { USD: 49, EUR: 55 });
  bekle("bulut yoksa yerel", derinBirlestir([{ id: 1 }], null), [{ id: 1 }]);

  console.log(hata ? "birim-bekleyen-kayit: HATA" : "birim-bekleyen-kayit: tamam");
  process.exit(hata);
})().catch((e) => { console.error(e); process.exit(1); });
