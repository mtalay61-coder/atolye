// BİRİM TESTİ — AÇILIŞ FİŞİ
//
// Kullanıcı: "Her hareket fişe bağlı olsun, stok hareketten türetilsin."
//
// Bugüne kadar mümkün değildi: miktar iki yerde duruyor — `variants[].miktar` (ÖNBELLEK) ve
// `hareketler[]` (DEFTER). İlk kurulumda ve elle stok girişinde miktar yazıldı ama hareket
// yazılmadı; defter önbelleği açıklamıyordu. Türetmeye kalksaydık açılış bakiyeleri sıfırlanır,
// elde olan mal kayıtta yok olurdu.
//
// Açılış fişi bu boşluğu tek satıra döküyor. ASIL İDDİA: kesildikten sonra defter önbelleği
// EKSİKSİZ açıklıyor, yani açık sıfırlanıyor.
const { acilisFarklari, acilisFisleriUret, acilisAcigi } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};

let sayac = 0;
const fisNoUretici = () => `ACL-20260906-${String(++sayac).padStart(3, "0")}`;
const uret = (stok) => acilisFisleriUret(stok, { fisNoUretici, tarih: "2026-09-06" });

const stok0 = [
  // Hiç hareketi yok: miktarın TAMAMI açılış.
  { id: "u1", ad: "Deri", variants: [{ renk: "Siyah", beden: "", miktar: 12 }], hareketler: [] },
  // Kısmen açıklanmış: 10 var, hareketler 4 anlatıyor → 6 açılış.
  { id: "u2", ad: "Bot", variants: [{ renk: "Siyah", beden: "40", miktar: 10 }],
    hareketler: [{ id: "h1", renk: "Siyah", beden: "40", miktar: 6, fisNo: "AF-1" },
                 { id: "h2", renk: "Siyah", beden: "40", miktar: -2, fisNo: "SF-1" }] },
  // TAM AÇIKLANMIŞ: açılış fişi kesilmemeli.
  { id: "u3", ad: "Toka", variants: [{ renk: "Standart", beden: "Standart", miktar: 5 }],
    hareketler: [{ id: "h3", renk: "Standart", beden: "Standart", miktar: 5, fisNo: "AF-2" }] },
];

// ---- FARK HESABI --------------------------------------------------------------------------------
bekle("hareketsiz \u00fcr\u00fcnde t\u00fcm miktar a\u00e7\u0131k", acilisFarklari(stok0[0]), [{ renk: "Siyah", beden: "", fark: 12 }]);
bekle("k\u0131smen a\u00e7\u0131klanm\u0131\u015f \u00fcr\u00fcn", acilisFarklari(stok0[1]), [{ renk: "Siyah", beden: "40", fark: 6 }]);
bekle("tam a\u00e7\u0131klanm\u0131\u015f \u00fcr\u00fcnde fark yok", acilisFarklari(stok0[2]), []);

// EKSİ FARK DA YAZILIR: hareketler stoktan FAZLASINI anlatıyorsa açılış negatif olur. Kırpmamak
// proje kuralı — eksi stok "girişlerin eksik" bilgisidir, gizlenmez.
const fazlaHareket = { id: "u4", ad: "Astar", variants: [{ renk: "Bej", beden: "", miktar: 2 }],
  hareketler: [{ id: "h4", renk: "Bej", beden: "", miktar: 9, fisNo: "AF-3" }] };
bekle("hareket fazlaysa a\u00e7\u0131l\u0131\u015f eksi", acilisFarklari(fazlaHareket), [{ renk: "Bej", beden: "", fark: -7 }]);

// ---- ÜRETİM -------------------------------------------------------------------------------------
const sonuc = uret(stok0);
bekle("yaln\u0131z a\u00e7\u0131\u011f\u0131 olan iki \u00fcr\u00fcne yaz\u0131ld\u0131", sonuc.hareketler.length, 2);
bekle("\u00fcr\u00fcn ba\u015f\u0131na TEK fi\u015f numaras\u0131", sonuc.urunSayisi, 2);
bekle("fi\u015f numaras\u0131 var", sonuc.hareketler.every((h) => !!h.fisNo), true);
bekle("kayna\u011f\u0131 A\u00e7\u0131l\u0131\u015f", sonuc.hareketler.map((h) => h.kaynak), ["A\u00e7\u0131l\u0131\u015f", "A\u00e7\u0131l\u0131\u015f"]);
bekle("dokunulmayan \u00fcr\u00fcn ayn\u0131 nesne", sonuc.stok[2], stok0[2]);
bekle("miktarlar de\u011fi\u015fmedi", sonuc.stok.map((u) => u.variants[0].miktar), [12, 10, 5]);

// ASIL İDDİA: açılıştan sonra defter önbelleği EKSİKSİZ açıklıyor.
bekle("a\u00e7\u0131k s\u0131f\u0131rland\u0131", acilisAcigi(sonuc.stok), []);
// İkinci çağrı yeni hareket üretmiyor — açılış bir kez kesilir.
bekle("ikinci \u00e7a\u011f\u0131r\u0131 hareket \u00fcretmiyor", uret(sonuc.stok).hareketler.length, 0);

// ---- AÇIK LİSTESİ --------------------------------------------------------------------------------
const acik = acilisAcigi(stok0);
bekle("a\u00e7\u0131k listesi iki sat\u0131r", acik.length, 2);
bekle("sat\u0131r \u00fcr\u00fcn\u00fc tan\u0131ml\u0131yor", acik[0], { urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", fark: 12 });

// Aynı ürünün birden çok varyantı: hepsi AYNI fişe bağlanıyor — bir ürünün açılışı tek olaydır.
const cokVaryant = [{ id: "u5", ad: "Sandalet", hareketler: [],
  variants: [{ renk: "Siyah", beden: "38", miktar: 3 }, { renk: "Siyah", beden: "39", miktar: 4 }] }];
const cs = uret(cokVaryant);
bekle("varyantlar ayn\u0131 fi\u015fe ba\u011fl\u0131", new Set(cs.hareketler.map((h) => h.fisNo)).size, 1);
bekle("varyant ba\u015f\u0131na bir hareket", cs.hareketler.map((h) => h.miktar), [3, 4]);

console.log(hata ? "\n\u2500\u2500 A\u00c7ILI\u015e F\u0130\u015e\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 a\u00e7\u0131l\u0131\u015f fi\u015fi testi temiz \u2500\u2500");
process.exit(hata);
