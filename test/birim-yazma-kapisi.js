// BİRİM TESTİ — YAZMA KAPISI + TANIM UZLAŞTIRMA (v1.744.16, 030 / 089 / 091).
// Olay (kullanıcı, 11 Kasım, günlük 20:19 "Bilinmeyen — Tanımlar bulutla birleştirildi: başka cihazda eklenen 81 öğe korundu"):
// giriş ekranında sabahtan bekleyen cihaz, akşam bağlantı gelince sabahki tanım kopyasıyla kendiliğinden yazdı.
// Ölçülen:
//   KAPI       oturum kapalı → yazma sunucuya gitmez (GET / günlük / salt-okur işlev gider); "bilinmiyor" + jeton yok → kapalı.
//   KİLİT      eksik yükleme (VERI_KILIDI) → sunucuya gitmez, bekleyen deftere DE düşmez.
//   OTURUM     kapalıyken tanım yazması → sunucuya gitmez, bekleyen deftere düşer (giriş yapınca uzlaştırılarak gider).
//   ÇIKIŞ      yazma kuyrukta (birleştirme okuması yolda) beklerken oturum kapanır → POST GİTMEZ, defterde.
//   OKUMA      tanımlar sunucudan okunamazsa → yazılmaz (eski kopya bütünüyle gönderilmez), defterde.
//   UZLAŞTIRMA başka cihazın EKLEDİĞİ ve DEĞİŞTİRDİĞİ tanım korunur; bu cihazın gerçek değişikliği de kalır; silinen geri gelmez;
//              özet okunur ("renkler 2, …"), öğe adı içermez.
//   TAZELİK    okundu → taze; bağlantı geri geldi / uzun bekleme → bayat; tazeleme okunamazsa null.
const bellek = {};
global.window = global.window || {};
global.window.localStorage = { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } };
global.window.__supabaseYenidenDenemeMs = [1, 1, 1];
const istekler = [];
let bulutTanim = null;
let getDussun = false;
let getBekletici = null;    // GET'i dışarıdan bekletmek için (çıkış sınaması)
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const yontem = sec.method || "GET";
  if (yontem === "GET" && /^tanimlar\?/.test(yol)) {
    if (getBekletici) await getBekletici;
    if (getDussun) throw new TypeError("Failed to fetch");
  }
  istekler.push({ yontem, yol: yol.split("?")[0], govde: sec.body ? JSON.parse(sec.body) : null });
  const json = yontem === "GET" && /^tanimlar\?/.test(yol) ? (bulutTanim ? [{ veri: bulutTanim }] : []) : [];
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => json, text: async () => "" };
};
const E = require("./erp.cjs");
const { yazmaOturumuAyarla, bulutYazmaEngeli, supabaseIstek, tekilYaz, tekilTabanAyarla, bekleyenYazmalariOku, VERI_KILIDI,
  tanimlarUzlastir, tanimlariSunucudanTazele, tanimlarTazeMi, tanimlarBayatla, tanimlarOkundu, tanimBekleyenTabanOku } = E;
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const R = (id, ad, ek = {}) => ({ id, ad, ...ek });
const posts = () => istekler.filter((r) => r.yontem !== "GET");
const sifirla = () => { istekler.length = 0; delete bellek["bekleyen:yazma"]; getDussun = false; getBekletici = null; };
const defter = () => Object.keys(bekleyenYazmalariOku());

(async () => {
  console.log("1) Kapı");
  yazmaOturumuAyarla("bilinmiyor");
  bekle("açılış (bilinmiyor) + bulut jetonu yok → kapalı", (bulutYazmaEngeli() || {}).kod, "oturum-kapali");
  yazmaOturumuAyarla("kapali");
  bekle("giriş ekranı → kapalı", (bulutYazmaEngeli() || {}).kod, "oturum-kapali");
  sifirla();
  let red = null; try { await supabaseIstek("urunler", { method: "POST", body: "[]" }); } catch (e) { red = e.yazmaKapisi; }
  bekle("kapalıyken POST reddedilir, ağa çıkmaz", [red, istekler.length], ["oturum-kapali", 0]);
  await supabaseIstek("tanimlar?id=eq.tekil&select=veri");
  await supabaseIstek("gunluk", { method: "POST", body: "[]" });
  await supabaseIstek("rpc/site_raporu", { method: "POST", body: "{}" });
  bekle("kapalıyken okuma, günlük ve salt-okur işlev gider", istekler.map((r) => `${r.yontem} ${r.yol}`), ["GET tanimlar", "POST gunluk", "POST rpc/site_raporu"]);
  sifirla(); red = null; try { await supabaseIstek("gunluk?id=not.is.null", { method: "DELETE" }); } catch (e) { red = e.yazmaKapisi; }
  bekle("günlük SİLME kapıya takılır", red, "oturum-kapali");
  yazmaOturumuAyarla("acik");
  bekle("oturum açık → engel yok", bulutYazmaEngeli(), null);

  console.log("2) Eksik yükleme kilidi");
  VERI_KILIDI.aktif = true;
  bekle("kilit → engel eksik-yukleme", (bulutYazmaEngeli() || {}).kod, "eksik-yukleme");
  sifirla(); bulutTanim = { renkler: [R("r1", "Siyah")] };
  await tekilYaz("tanimlar:data", "tanimlar", { renkler: [R("r1", "Siyah"), R("r9", "Yeni")] });
  bekle("kilitliyken tanım yazması sunucuya gitmez", istekler.length, 0);
  bekle("kilitliyken bekleyen deftere düşmez", defter(), []);
  sifirla(); red = null; try { await supabaseIstek("rpc/fis_kes", { method: "POST", body: "{}" }); } catch (e) { red = e.yazmaKapisi; }
  bekle("kilitliyken fiş kesme (RPC) de gitmez", [red, istekler.length], ["eksik-yukleme", 0]);
  VERI_KILIDI.aktif = false;

  console.log("3) Oturum kapalıyken tanım yazması");
  yazmaOturumuAyarla("kapali"); sifirla();
  await tekilYaz("tanimlar:data", "tanimlar", { renkler: [R("r1", "Siyah"), R("r9", "Yeni")] });
  bekle("POST yok", posts().length, 0);
  bekle("bekleyen defterde (giriş yapınca gönderilir)", defter(), ["tanimlar:data"]);
  yazmaOturumuAyarla("acik");

  console.log("4) Gönderim sırasında çıkış (kuyrukta beklerken)");
  sifirla(); bulutTanim = { renkler: [R("r1", "Siyah")] };
  let birak; getBekletici = new Promise((r) => { birak = r; });
  const yazma = tekilYaz("tanimlar:data", "tanimlar", { renkler: [R("r1", "Siyah"), R("r9", "Yeni")] });
  await new Promise((r) => setTimeout(r, 10));
  yazmaOturumuAyarla("kapali");          // kullanıcı çıktı / oturum kapandı
  birak(); await yazma;
  bekle("birleştirme okuması bitti ama POST gitmedi", istekler.map((r) => r.yontem), ["GET"]);
  bekle("kayıt defterde kaldı (kaybolmadı)", defter(), ["tanimlar:data"]);
  yazmaOturumuAyarla("acik");

  console.log("5) Tanımlar sunucudan okunamazsa yazılmaz");
  sifirla(); getDussun = true;
  await tekilYaz("tanimlar:data", "tanimlar", { renkler: [R("r1", "Siyah")] });
  bekle("POST yok (eski kopya bütünüyle gönderilmedi)", posts().length, 0);
  bekle("defterde, sebep okunamadı", [defter(), /okunamadı/.test((bekleyenYazmalariOku()["tanimlar:data"] || {}).hata || "")], [["tanimlar:data"], true]);

  console.log("6) Uzlaştırma — başka cihazın eklediği ve değiştirdiği korunur");
  // Sabah: taban = sunucu. Gün içinde BAŞKA cihaz: r2 "Lacivert" ekledi, r1 adını "Siyah Süet" yaptı, r3'ü sildi.
  // BU cihaz (sabah kopyası): k1 kombinasyonu ekledi (gerçek değişiklik), r4'ün kodunu değiştirdi.
  const taban = { renkler: [R("r1", "Siyah"), R("r3", "Bej"), R("r4", "Taba", { kod: "4" })], renkKombinasyonlari: [], girisAktifMi: true };
  const bulut = { renkler: [R("r1", "Siyah Süet"), R("r4", "Taba", { kod: "4" }), R("r2", "Lacivert")], renkKombinasyonlari: [], girisAktifMi: true,
    __silinenler: { r3: Date.now() } };
  const yerel = { renkler: [R("r1", "Siyah"), R("r3", "Bej"), R("r4", "Taba", { kod: "44" })], renkKombinasyonlari: [R("k1", "1001")], girisAktifMi: true };
  const u = tanimlarUzlastir(yerel, bulut, taban, {});
  const ad = (id) => (u.tanimlar.renkler.find((x) => x.id === id) || {}).ad;
  bekle("başka cihazın eklediği r2 korundu", ad("r2"), "Lacivert");
  bekle("başka cihazın DEĞİŞTİRDİĞİ r1 adı korundu (eski kopya geri yazmadı)", ad("r1"), "Siyah Süet");
  bekle("başka cihazın sildiği r3 geri gelmedi", ad("r3"), undefined);
  bekle("bu cihazın gerçek değişikliği (r4 kodu) kaldı", (u.tanimlar.renkler.find((x) => x.id === "r4") || {}).kod, "44");
  bekle("bu cihazın eklediği k1 kaldı", u.tanimlar.renkKombinasyonlari.map((x) => x.id), ["k1"]);
  bekle("okunur özet (öğe adı yok)", u.metin, "başka cihazdan 1 öğe korundu (renkler 1); 1 öğede sunucudaki değişiklik korundu (renkler 1); başka cihazda silinen 1 öğe çıkarıldı (renkler 1)");
  bekle("özette ad / değer geçmiyor", /Lacivert|Siyah|Bej|Taba/.test(u.metin), false);
  const eski = tanimlarUzlastir(yerel, bulut, undefined, {});
  bekle("taban yoksa (eski davranış) aynı kimlikte bu cihaz kazanır — yalnız ekleme / silme korunur", [(eski.tanimlar.renkler.find((x) => x.id === "r1") || {}).ad, (eski.tanimlar.renkler.find((x) => x.id === "r2") || {}).ad], ["Siyah", "Lacivert"]);
  // Aynı senaryo tekilYaz üstünden: sunucuya giden gövde
  sifirla(); bulutTanim = bulut; tekilTabanAyarla("tanimlar", taban);
  await tekilYaz("tanimlar:data", "tanimlar", yerel, { tetikleyen: "sınama" });
  const giden = (posts().find((r) => r.yol === "tanimlar") || { govde: [{ veri: {} }] }).govde[0].veri;
  bekle("tekilYaz: sunucuya giden — r1 'Siyah Süet', r2 var, r3 yok, r4 kod 44, k1 var",
    [(giden.renkler || []).map((x) => `${x.id}:${x.ad}:${x.kod || ""}`).sort(), (giden.renkKombinasyonlari || []).map((x) => x.id)],
    [["r1:Siyah Süet:", "r2:Lacivert:", "r4:Taba:44"], ["k1"]]);

  console.log("7) Tazelik");
  tanimlarOkundu();
  bekle("okundu → taze", tanimlarTazeMi(), true);
  tanimlarBayatla("bağlantı geri geldi");
  bekle("bağlantı geri geldi → bayat", tanimlarTazeMi(), false);
  sifirla(); getDussun = true;
  bekle("tazeleme okunamazsa null (yazma yapılmaz)", await tanimlariSunucudanTazele(yerel), null);
  bekle("başarısız tazelemeden sonra hâlâ bayat", tanimlarTazeMi(), false);
  sifirla(); bulutTanim = bulut; tekilTabanAyarla("tanimlar", taban);
  const taze = await tanimlariSunucudanTazele(yerel);
  bekle("tazeleme başarılı → uzlaşmış hâl (r1 'Siyah Süet', k1 kaldı) ve taze", [(taze.tanimlar.renkler.find((x) => x.id === "r1") || {}).ad, taze.tanimlar.renkKombinasyonlari.length, tanimlarTazeMi()], ["Siyah Süet", 1, true]);
  bekle("tazeleme hiçbir şey YAZMADI", posts().length, 0);

  console.log("8) Sayfa yenilense de bekleyen tanım kaydının tabanı korunur");
  // Sabah taban T (sunucu). Oturum kapalıyken bu cihaz k1 ekledi → bekleyen. Sayfa yenilendi (bellekteki taban gitti).
  // Bu arada başka cihaz r1'i "Siyah Süet" yaptı. Yeniden gönderim (giriş sonrası) r1'i ESKİ adla geri almamalı.
  delete bellek["tanimlar:bekleyen-taban"];
  const T = { renkler: [R("r1", "Siyah")], renkKombinasyonlari: [] };
  tekilTabanAyarla("tanimlar", T);
  yazmaOturumuAyarla("kapali"); sifirla();
  const yerel8 = { renkler: [R("r1", "Siyah")], renkKombinasyonlari: [R("k1", "1001")] };
  await tekilYaz("tanimlar:data", "tanimlar", yerel8);
  bekle("düşen tanım yazmasının tabanı saklandı", (tanimBekleyenTabanOku() || {}).renkler, T.renkler);
  tekilTabanAyarla("tanimlar", null);   // sayfa yenilendi: bellek boş
  yazmaOturumuAyarla("acik"); sifirla();
  bulutTanim = { renkler: [R("r1", "Siyah Süet"), R("r2", "Lacivert")], renkKombinasyonlari: [] };
  const t8 = await tanimlariSunucudanTazele(yerel8);
  bekle("yenilemeden sonra: başka cihazın değiştirdiği ad korunur, bu cihazın k1'i kalır, eklenen r2 gelir",
    [t8.tanimlar.renkler.map((x) => `${x.id}:${x.ad}`), t8.tanimlar.renkKombinasyonlari.map((x) => x.id)], [["r1:Siyah Süet", "r2:Lacivert"], ["k1"]]);
  sifirla();
  await tekilYaz("tanimlar:data", "tanimlar", t8.tanimlar);
  bekle("başarılı yazma → POST gitti, saklı taban silindi, defter boş", [posts().length, tanimBekleyenTabanOku(), defter()], [1, undefined, []]);

  if (hata) { console.log("BİRİM TESTİ HATA: yazma kapısı"); process.exit(1); }
  console.log("── yazma kapısı testi temiz ──");
})().catch((e) => { console.error(e); process.exit(1); });
