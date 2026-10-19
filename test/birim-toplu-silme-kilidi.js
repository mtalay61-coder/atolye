// BİRİM TESTİ — TOPLU SİLME KİLİDİ (v1.712.0)
// Kullanıcı (19 Ekim): "Üretim fişleri silindi … çok sıkı kontrol etmemiz gerekiyor, bu çok önemli." Fark katmanı,
// ekrandaki liste eksik/bayat gelirse bellekte olup listede olmayan her kaydı buluttan SİLİYORDU. Sahte bulutla ölçülür:
//   1. Kural saf: 20'den az silme geçer; 20 ve üstü ama tablonun yarısından azı geçer; yarısı ve üstü engellenir.
//   2. 30 üretimden 30'u silinecek yazma: hiçbir istek gitmez, söz reddedilir (topluSilmeEngeli), bellek geri alınır
//      (aynı tablonun sonraki yazması yine engellenir — bayat liste hâlâ bayat), bekleyen kayıt defterine düşmez.
//   3. Aynı yazma `topluSilmeIzni` ile (sıfırlama / çöp / onaylı yedek) geçer: DELETE gider.
//   4. 30 üretimden 3'ü silinecek yazma kilide takılmaz.
//   5. Alt tabloda da (stok_hareketleri: 40 hareketin 40'ı) kilit çalışır; ana ürün PATCH'i bile gitmez.
//   6. Yedek geri yüklemenin silecekleri doğru sayılır; kilidi aşan satırlar ayrılır.
const bellek = {};
global.window = global.window || {};
global.window.localStorage = { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } };
const istekler = [];
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const yontem = sec.method || "GET";
  istekler.push({ yontem, yol, govde: sec.body ? String(sec.body) : "" });
  const govde = yontem === "PATCH" ? [{ id: "x" }] : [];
  return { ok: true, status: 200, json: async () => govde, text: async () => "" };
};
const { supabaseTabloEsitle, tabloBaslangicTam, bekleyenKayitlariOku, surumleriYukle,
  topluSilmeEngeliMi, topluSilmeEngeliBul, TOPLU_SILME_ESIGI, yedekSilinecekleri } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const uretimKaydi = (i) => ({ id: `u${i}`, siparisNo: `SAT-${i}`, adet: 10, prosesIlerleme: [] });
const silmeler = (tablo) => istekler.filter((r) => r.yontem === "DELETE" && r.yol.startsWith(tablo)).length;
// Günlük yazması (gunluk tablosu) veri isteği değildir; sayımda ayrı tutulur.
const veriIstekleri = () => istekler.filter((r) => !r.yol.startsWith("gunluk"));
const gunlukKayitlari = () => istekler.filter((r) => r.yol.startsWith("gunluk")).map((r) => r.govde);

(async () => {
  // 1) Saf kural
  bekle("eşik 20", TOPLU_SILME_ESIGI, 20);
  bekle("19 silme (hepsi) geçer — küçük tablo", topluSilmeEngeliMi(19, 19), false);
  bekle("20 silme, 100 kayıttan: geçer (yarıdan az)", topluSilmeEngeliMi(20, 100), false);
  bekle("50 silme, 100 kayıttan: engel (yarısı)", topluSilmeEngeliMi(50, 100), true);
  bekle("30 silme, 30 kayıttan: engel", topluSilmeEngeliMi(30, 30), true);
  bekle("0 silme: geçer", topluSilmeEngeliMi(0, 500), false);
  bekle("engel bulucu: ana tablo", topluSilmeEngeliBul("uretim", { silinen: new Array(25) }, [], { uretim: new Map(new Array(30).fill(0).map((_, i) => [i, "x"])) }),
    { tablo: "uretim", silinen: 25, onceki: 30 });
  bekle("engel bulucu: temiz", topluSilmeEngeliBul("uretim", { silinen: [] }, [], { uretim: new Map() }), null);

  // 2) Bütün üretimler listeden düşmüş → yazma engellenir
  const otuz = new Array(30).fill(0).map((_, i) => uretimKaydi(i));
  tabloBaslangicTam("uretim", otuz);
  surumleriYukle("uretim", otuz.map((u) => ({ id: u.id, surum: 1 })));
  let sonuc = null;
  try { await supabaseTabloEsitle("uretim", []); sonuc = "geçti"; } catch (e) { sonuc = e.topluSilmeEngeli ? "engel" : `başka hata: ${e.message}`; }
  bekle("30/30 üretim silmesi engellendi", sonuc, "engel");
  bekle("hiç veri isteği gitmedi", veriIstekleri().length, 0);
  bekle("günlüğe TOPLU SİLME ENGELLENDİ düştü", gunlukKayitlari().some((g) => /TOPLU SİLME ENGELLENDİ: uretim/.test(g)), true);
  bekle("bekleyen kayıt defterine düşmedi", bekleyenKayitlariOku().uretim, undefined);
  // Bellek geri alındı: aynı bayat liste ikinci kez de takılır (sessizce "artık fark yok" denmez).
  sonuc = null;
  try { await supabaseTabloEsitle("uretim", []); sonuc = "geçti"; } catch (e) { sonuc = e.topluSilmeEngeli ? "engel" : "başka"; }
  bekle("ikinci deneme de engellendi (bellek geri alınmış)", sonuc, "engel");

  // 3) Açık izinle geçer
  await supabaseTabloEsitle("uretim", [], { topluSilmeIzni: true });
  bekle("izinle DELETE gitti", silmeler("uretim") >= 1, true);

  // 4) Küçük silme takılmaz
  istekler.length = 0;
  tabloBaslangicTam("uretim", otuz);
  surumleriYukle("uretim", otuz.map((u) => ({ id: u.id, surum: 1 })));
  await supabaseTabloEsitle("uretim", otuz.slice(3));
  bekle("30'dan 3 silme geçti", silmeler("uretim"), 1);

  // 5) Alt tablo: 40 hareketin hepsi listeden düşmüş
  istekler.length = 0;
  const hareketler = new Array(40).fill(0).map((_, i) => ({ id: `h${i}`, tarih: "2026-10-01", tip: "Giriş", renk: "Siyah", beden: "41", miktar: 1, fisNo: `F${i}` }));
  const deri = { id: "d1", ad: "Deri", kategori: "Hammadde", birim: "ds", olcuTipi: "Serbest", variants: [{ renk: "Siyah", beden: "41", miktar: 40 }], hareketler, recete: [] };
  tabloBaslangicTam("urunler", [deri]);
  surumleriYukle("urunler", [{ id: "d1", surum: 1 }]);
  sonuc = null;
  try { await supabaseTabloEsitle("urunler", [{ ...deri, hareketler: [], variants: [{ renk: "Siyah", beden: "41", miktar: 0 }] }]); sonuc = "geçti"; }
  catch (e) { sonuc = e.topluSilmeEngeli ? "engel" : `başka hata: ${e.message}`; }
  bekle("40/40 stok hareketi silmesi engellendi", sonuc, "engel");
  bekle("ürün PATCH'i bile gitmedi (varyant 0'a ezilmedi)", veriIstekleri().length, 0);

  // 6) Yedek geri yüklemenin silecekleri
  const bugun = { stok: [deri], siparisler: [], uretim: otuz, cariler: [], stokRezervasyonlari: [], onaylar: [] };
  const eskiYedek = { stok: [{ ...deri, hareketler: [], variants: [] }], siparisler: [], uretim: [], cariler: [] };
  const oz = yedekSilinecekleri(bugun, eskiYedek);
  bekle("yedek: üretim 30 ve hareket 40 silinecek diye yazar", oz.satirlar, [
    "Stok hareketi: bugün 40, yedekte 0 (40 eksik)",
    "Ürün varyantı: bugün 1, yedekte 0 (1 eksik)",
    "Üretim: 30 kayıt silinecek (bugün 30, yedekte 0)",
  ]);
  bekle("kilidi aşanlar: hareket ve üretim (varyant 1 değil)", oz.kilitliSatirlar.length, 2);
  bekle("güncel yedek: silinecek yok", yedekSilinecekleri(bugun, { ...bugun }), { satirlar: [], kilitliSatirlar: [] });

  if (hata) { console.log("BİRİM TESTİ HATA: toplu silme kilidi"); process.exit(1); }
  console.log("birim-toplu-silme-kilidi: tamam");
})().catch((e) => { console.error(e); process.exit(1); });
