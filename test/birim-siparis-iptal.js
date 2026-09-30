// BİRİM TESTİ — SİPARİŞ İPTALİ: BAĞ ÇÖZME (v1.512.0).
// Kural (kullanıcı, 28 Eylül): sipariş iptal edilince fişler SİLİNMEZ, bağımsız kalır; alım/üretim
// devam eder, bağı kopar; ayrılmış stok serbest stoğa düşer.
const { siparisBaglariniCoz, siparisIptalOzeti, siparisIslemGormusMu, yetimSiparisBaglariniCoz, mamulDeposuDurumu } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const sat = { id: "sp1", siparisNo: "SAT-10", tip: "Satış", cariId: "c1", durum: "Kısmi Teslim", kalemler: [
  { id: "k1", urunId: "u1", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 10, karsilanan: 4, planlama: { tip: "Üretim", referansNo: "URT-1" } },
] };
const baska = { id: "sp2", siparisNo: "SAT-1001", tip: "Satış", cariId: "c1", durum: "Bekliyor", not: "", kalemler: [] };
const alis = { id: "al1", siparisNo: "ALS-5", tip: "Alış", cariId: "c9", durum: "Bekliyor", not: "Kaynak: SAT-10", rezervasyonSiparisId: "sp1",
  kalemler: [{ id: "ak1", urunId: "h1", miktar: 50, karsilanan: 0, rezervasyonlar: [{ siparisId: "sp1", siparisNo: "SAT-10", miktar: 30 }, { siparisId: "sp2", siparisNo: "SAT-1001", miktar: 20 }] }] };
const stok = [
  { id: "u1", ad: "Bot", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "40", miktar: 6 }], hareketler: [
    { id: "h1", fisNo: "SF-1", siparisId: "sp1", siparisNo: "SAT-10", kalemId: "k1", renk: "Siyah", beden: "40", miktar: -4, cariId: "c1" },
    { id: "h2", fisNo: "URT-1-Giriş", rezervasyonSiparisId: "sp1", renk: "Siyah", beden: "40", miktar: 10 },
    { id: "h3", fisNo: "SF-2", siparisId: "sp2", siparisNo: "SAT-1001", kalemId: "x", renk: "Siyah", beden: "40", miktar: -1 },
  ] },
  { id: "h1u", ad: "Deri", kategori: "Hammadde", variants: [], hareketler: [] },
];
const cariler = [{ id: "c1", unvan: "Müşteri", hareketler: [
  { id: "h1", fisNo: "SF-1", siparisId: "sp1", siparisNo: "SAT-10", kalemId: "k1", yon: "Borç", tutar: 400 },
] }];
const uretim = [{ id: "ur1", siparisNo: "URT-1", model: "Bot", rezervasyonSiparisId: "sp1", not: "Kaynak: SAT-10", stogaEklendiMi: false }];
const koliler = [{ id: "ko1", kod: "K-1", siparisId: "sp1", cariId: "c1", durum: "Hazır", kalemler: [{ urunId: "u1", renk: "Siyah", beden: "40", adet: 6 }] }];
const stokRezervasyonlari = [
  { id: "r1", urunId: "h1u", siparisId: "sp1", uretimNo: "URT-1", miktar: 12, tuketilen: 2 },
  { id: "r2", urunId: "h1u", siparisId: "sp2", miktar: 5, tuketilen: 0 },
];
const fisDefteri = [{ id: "SF-1", fisNo: "SF-1", siparisId: "sp1", siparisNo: "SAT-10", stokHareketleri: [{ id: "h1", siparisId: "sp1", siparisNo: "SAT-10", kalemId: "k1" }] }];
const veri = { stok, cariler, siparisler: [sat, baska, alis], uretim, koliler, stokRezervasyonlari, fisDefteri };

console.log("önizleme");
const oz = siparisIptalOzeti(veri, "sp1");
bekle("fişler, alış, üretim, koli, ayrılan", [oz.fisNolar, oz.alislar.map((a) => a.siparisNo), oz.uretimler.map((u) => u.siparisNo), oz.koliler.map((k) => k.kod), oz.rezervasyonMiktari],
  [["SF-1"], ["ALS-5"], ["URT-1"], ["K-1"], 40]);
bekle("işlem görmüş → iptal", siparisIslemGormusMu(oz, sat), true);
bekle("önizleme hiçbir şeyi değiştirmez", [veri.stok[0].hareketler[0].siparisId, veri.siparisler[0].durum], ["sp1", "Kısmi Teslim"]);

console.log("iptal");
const r = siparisBaglariniCoz(veri, "sp1", { zaman: "2026-09-28T10:00:00Z", kullanici: "Mehmet" });
const h1 = r.stok[0].hareketler[0];
bekle("fiş hareketi SİLİNMEDİ, miktar aynı, bağ koptu", [r.stok[0].hareketler.length, h1.miktar, h1.fisNo, "siparisId" in h1, "kalemId" in h1, h1.siparisNo], [3, -4, "SF-1", false, false, "SAT-10 (iptal)"]);
bekle("stok miktarı değişmedi", r.stok[0].variants[0].miktar, 6);
bekle("cari hareketi (tutar) aynı, bağ koptu", [r.cariler[0].hareketler.length, r.cariler[0].hareketler[0].tutar, r.cariler[0].hareketler[0].siparisNo, "siparisId" in r.cariler[0].hareketler[0]], [1, 400, "SAT-10 (iptal)", false]);
bekle("mamul girişinin 'bu satış için' zinciri boşaldı", r.stok[0].hareketler[1].rezervasyonSiparisId, null);
bekle("başka siparişin hareketine dokunulmadı", r.stok[0].hareketler[2], stok[0].hareketler[2]);
const s1 = r.siparisler.find((s) => s.id === "sp1");
bekle("sipariş İptal durumunda kalıyor (silinmedi)", [r.siparisler.length, s1.durum, s1.iptalEden, s1.kalemler[0].miktar], [3, "İptal", "Mehmet", 10]);
const a1 = r.siparisler.find((s) => s.id === "al1");
bekle("alış DEVAM: durum aynı, zincir ve bu siparişin rezervasyonu kalktı, diğerininki duruyor",
  [a1.durum, a1.rezervasyonSiparisId, a1.kalemler[0].rezervasyonlar.map((x) => x.siparisNo), a1.not], ["Bekliyor", null, ["SAT-1001"], "Kaynak: SAT-10 (iptal)"]);
bekle("SAT-1001 ('SAT-10' ile başlıyor) etkilenmedi", r.siparisler.find((s) => s.id === "sp2"), baska);
bekle("üretim DEVAM: zincir boş, not işaretli", [r.uretim[0].rezervasyonSiparisId, r.uretim[0].not, r.uretim.length], [null, "Kaynak: SAT-10 (iptal)", 1]);
bekle("koli duruyor, siparişsiz", [r.koliler[0].siparisId, r.koliler[0].iptalSiparisNo, r.koliler[0].durum], [null, "SAT-10", "Hazır"]);
bekle("hammadde rezervasyonu kalktı (diğer sipariş duruyor)", r.stokRezervasyonlari.map((x) => x.id), ["r2"]);
bekle("fiş defteri: kayıt ve kopyası bağsız", [r.fisDefteri[0].siparisId, r.fisDefteri[0].siparisNo, "siparisId" in r.fisDefteri[0].stokHareketleri[0]], [null, "SAT-10 (iptal)", false]);

console.log("serbest stok");
const once = mamulDeposuDurumu(veri.stok, veri.siparisler, [], veri.koliler);
const sonra = mamulDeposuDurumu(r.stok, r.siparisler, [], r.koliler);
const hc = (satirlar) => satirlar.find((x) => x.urunId === "u1").hucreler["40"];
bekle("önce: 6 çift kolide, serbest 0 · sonra: kolide 0, serbest 6, talep 0", [hc(once).kolide, hc(once).serbest, hc(sonra).kolide, hc(sonra).serbest, hc(sonra).talep], [6, 0, 0, 6, 0]);

console.log("boş sipariş → silme");
const bos = { id: "sp3", siparisNo: "SAT-11", tip: "Satış", durum: "Bekliyor", kalemler: [{ id: "q", miktar: 3 }] };
bekle("bağı olmayan sipariş işlem görmemiş sayılır", siparisIslemGormusMu(siparisIptalOzeti({ ...veri, siparisler: [...veri.siparisler, bos] }, "sp3"), bos), false);

console.log("yalnız fiş girişi iptale zorlar (v1.544.0)");
{
  // Kullanıcının örneği: SAT-1004'ün planladığı alış ALS-1007, henüz fişi yok → SİLİNİR, satışın planlaması boşalır.
  const satP = { id: "s1", siparisNo: "SAT-1004", tip: "Satış", durum: "Bekliyor",
    kalemler: [{ id: "k1", miktar: 8, planlama: { tip: "Satınalma", referansNo: "ALS-1007" } }] };
  const als = { id: "a1", siparisNo: "ALS-1007", tip: "Alış", durum: "Bekliyor", not: "Kaynak: SAT-1004", kalemler: [{ id: "ka", miktar: 8 }] };
  const v2 = { stok: [], cariler: [], siparisler: [satP, als], uretim: [], koliler: [], stokRezervasyonlari: [] };
  const ozA = siparisIptalOzeti(v2, "a1");
  bekle("fişsiz, satışa bağlı alış → silinebilir (bağ var ama bilgi)", [ozA.planlamasiBosalan, siparisIslemGormusMu(ozA, als)], [["SAT-1004"], false]);
  const silA = siparisBaglariniCoz(v2, "a1", { sil: true });
  bekle("silmede de satışın planlaması boşalıyor, alış iptale dönmüyor",
    [silA.siparisler.find((x) => x.id === "s1").kalemler[0].planlama, silA.siparisler.find((x) => x.id === "a1").durum], [null, "Bekliyor"]);
  bekle("planlanmış ama fişsiz satış → silinebilir", siparisIslemGormusMu(siparisIptalOzeti(v2, "s1"), satP), false);
  const alsTeslim = { ...als, kalemler: [{ id: "ka", miktar: 8, karsilanan: 2 }] };
  bekle("teslim alınmış (karşılanan) → iptal", siparisIslemGormusMu(siparisIptalOzeti({ ...v2, siparisler: [satP, alsTeslim] }, "a1"), alsTeslim), true);
  const v3 = { ...v2, stok: [{ id: "u", hareketler: [{ id: "h", siparisId: "a1", siparisNo: "ALS-1007", fisNo: "AF-1", miktar: 8 }] }] };
  bekle("fiş hareketi varsa → iptal", siparisIslemGormusMu(siparisIptalOzeti(v3, "a1"), als), true);
}

console.log("mevcut yetim hareketler");
const y = yetimSiparisBaglariniCoz([{ id: "u", hareketler: [{ id: "a", siparisId: "yok", siparisNo: "SAT-9", kalemId: "k", miktar: -2 }, { id: "b", siparisId: "sp2", siparisNo: "SAT-1001" }] }],
  [{ id: "c", hareketler: [{ id: "a", siparisId: "yok", siparisNo: "SAT-9", tutar: 50 }] }], [baska]);
bekle("silinmiş siparişe bağlı olanlar bağsız, miktar/tutar aynı; var olana dokunulmadı",
  [y.sayi, y.siparisNolar, y.stok[0].hareketler[0].siparisNo, "siparisId" in y.stok[0].hareketler[0], y.stok[0].hareketler[0].miktar, y.cariler[0].hareketler[0].tutar, y.stok[0].hareketler[1].siparisId],
  [2, ["SAT-9"], "SAT-9 (iptal)", false, -2, 50, "sp2"]);

console.log(hata ? "\n── SİPARİŞ İPTAL TESTİ BAŞARISIZ ──" : "\n── sipariş iptal testi temiz ──");
process.exit(hata);
