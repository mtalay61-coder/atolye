// BİRİM TESTİ — ÇÖP KUTUSU GÜVENLİĞİ (v1.549.0)
//
// Kullanıcı: "Çöp kutusunu daha verimli kullanalım. Güvenliğe karşı." Ölçülenler: 90 gün saklama (sayı
// sınırı yok), kalıcı silme yalnız Yönetici + en az 30 gün, toplu silme alarmı eşiği, tanımlardan /
// listelerden düşenlerin bulunması, gizli alanların (şifre) çöpe ve arşiv görünümüne girmemesi.
const { copuBuda, copKaliciSilinebilirMi, topluSilmeDurumu, listedenDusenler, tanimdanDusenler,
  gizliAlanlariAt, tanimKaydiAdi, arsivSatiriOzeti } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const GUN = 24 * 60 * 60 * 1000;
const simdi = Date.parse("2026-10-03T12:00:00Z");
const gunOnce = (g) => new Date(simdi - g * GUN).toISOString();
const k = (id, g) => ({ id, silinmeTarihi: gunOnce(g) });

// 1) Saklama: 90 günü aşan düşer; sayı sınırı yok (eskiden 300'de kesiliyordu).
bekle("90 günden eski düşer, 89 günlük kalır", copuBuda([k("a", 1), k("b", 89), k("c", 91)], simdi).map((x) => x.id), ["a", "b"]);
const cok = Array.from({ length: 400 }, (_, i) => k(`x${i}`, 1));
bekle("400 yeni kayıt kesilmeden kalır", copuBuda(cok, simdi).length, 400);

// 2) Kalıcı silme izni.
const yon = { ad: "Ali", rol: "Yönetici" };
const kul = { ad: "Veli", rol: "Kullanıcı" };
bekle("Kullanıcı 40 günlük kaydı silemez", copKaliciSilinebilirMi(k("a", 40), kul, simdi).ok, false);
bekle("Yönetici 10 günlük kaydı silemez", copKaliciSilinebilirMi(k("a", 10), yon, simdi).ok, false);
bekle("…sebep kalan günü söyler", /20 gün sonra/.test(copKaliciSilinebilirMi(k("a", 10), yon, simdi).sebep), true);
bekle("Yönetici 30 günlük kaydı siler", copKaliciSilinebilirMi(k("a", 30), yon, simdi).ok, true);
bekle("oturum yoksa silinemez", copKaliciSilinebilirMi(k("a", 40), null, simdi).ok, false);

// 3) Toplu silme alarmı: 10 dk'da 20 silme; aynı pencerede ikinci uyarı yok; pencere dışı sayılmaz.
const zam = (n, aralikSn) => Array.from({ length: n }, (_, i) => simdi - i * aralikSn * 1000);
bekle("19 silme uyarmaz", topluSilmeDurumu(zam(19, 10), 0, simdi).uyar, false);
bekle("20 silme uyarır", topluSilmeDurumu(zam(20, 10), 0, simdi).uyar, true);
bekle("5 dk önce uyarıldıysa yeniden uyarmaz", topluSilmeDurumu(zam(25, 10), simdi - 5 * 60000, simdi).uyar, false);
bekle("11 dk önce uyarıldıysa yeniden uyarır", topluSilmeDurumu(zam(25, 10), simdi - 11 * 60000, simdi).uyar, true);
bekle("1 dk arayla 20 silme: pencerede yalnız 11 kalır", topluSilmeDurumu(zam(20, 60), 0, simdi).sayi, 11);

// 4) Listeden / tanımlardan düşenler.
bekle("listeden düşen görev", listedenDusenler([{ id: 1 }, { id: 2 }], [{ id: 2 }]).map((x) => x.id), [1]);
const once = {
  renkler: [{ id: "r1", ad: "Siyah" }, { id: "r2", ad: "Kahve" }],
  hammaddeTipleri: ["Deri", "Taban"],
  kullanicilar: [{ id: "u1", ad: "Veli", kullaniciAdi: "veli", sifre: "gizli", sifreHash: "x" }],
  firmaBilgileri: { ad: "A" },
};
const sonra = { renkler: [{ id: "r1", ad: "Siyah" }], hammaddeTipleri: ["Deri"], kullanicilar: [], firmaBilgileri: { ad: "B" } };
const dusen = tanimdanDusenler(once, sonra);
bekle("renk, tip ve kullanıcı düşer; nesne alan (firma) karışmaz", dusen.map((d) => `${d.alan}:${d.kayit.id || d.kayit}`), ["renkler:r2", "hammaddeTipleri:Taban", "kullanicilar:u1"]);
bekle("kullanıcı çöpe şifresiz düşer", dusen[2].kayit, { id: "u1", ad: "Veli", kullaniciAdi: "veli" });
bekle("ad değişikliği silme sayılmaz", tanimdanDusenler(once, { ...once, renkler: [{ id: "r1", ad: "Kara" }, { id: "r2", ad: "Kahve" }] }), []);
bekle("tanım başlığı", tanimKaydiAdi("renkler", { id: "r2", ad: "Kahve" }), "Renk: Kahve");

// 5) Gizli alanlar derinde de atılır (arşivdeki tanımlar görüntüsü).
bekle("iç içe şifre atılır", gizliAlanlariAt({ veri: { kullanicilar: [{ ad: "A", sifre: "1" }] }, smtpSifre: "x" }), { veri: { kullanicilar: [{ ad: "A" }] } });

// 6) Arşiv satırı özeti: kullanıcı e-postadan bulunur; çöp satırında asıl kayıt `veri` içinde.
const kullanicilar = [{ id: "u1", ad: "Ayşe", kullaniciAdi: "ayse" }];
bekle("ürün satırı", arsivSatiriOzeti({ tablo: "urunler", islem: "DELETE", satir_id: "p1", veri: { id: "p1", ad: "Bot" }, silen_eposta: "ayse@atolye.local" }, kullanicilar),
  { tabloAdi: "Ürün", baslik: "Bot", kim: "Ayşe" });
bekle("çöp satırı başlığı", arsivSatiriOzeti({ tablo: "cop", islem: "DELETE", veri: { id: "c1", baslik: "Cari: X", veri: {} } }, kullanicilar).baslik, "Cari: X");
bekle("görüntü satırı", arsivSatiriOzeti({ tablo: "tanimlar", islem: "GORUNTU", veri: { id: "tekil", veri: {} }, silen_eposta: "yok@x" }, kullanicilar),
  { tabloAdi: "Tanımlar", baslik: "Değişiklik öncesi anlık görüntü", kim: "yok@x" });

console.log(hata ? "birim-cop: HATA" : "birim-cop: tamam");
process.exit(hata);
