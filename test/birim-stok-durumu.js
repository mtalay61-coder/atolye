// BİRİM TESTİ — STOK DURUMU HESABI (küsurat ve denklem).
//
// Kullanıcı ekran görüntüsüyle bildirdi: Taban kartında "beklenen serbest 15.87", "açık 3.87".
// Taban ÇİFT ile sayılıyor; yarım taban diye bir şey yok.
//
// Sebep: kısmen teslim alınmış alış kalemlerinde yoldaki miktar, teslim ORANIYLA çarpılıyordu
// (karsilanan / miktar). Bölünmez birimlerde bu küsurat üretiyor.
const { stokDurumu, hammaddeRezervasyonDagit } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const kur = ({ stok, alisMiktar, alisKarsilanan, rezMiktar, talep }) => stokDurumu(
  "u1", "Beyaz", "36",
  [{
    id: "a1", siparisNo: "ALS-1", tip: "Alış", durum: "Onaylandı",
    kalemler: [{
      urunId: "u1", renk: "Beyaz", beden: "36", miktar: alisMiktar, karsilanan: alisKarsilanan,
      rezervasyonlar: rezMiktar ? [{ siparisId: "s1", siparisNo: "SAT-1", miktar: rezMiktar, tuketilen: 0 }] : [],
    }],
  }],
  talep ? [{ id: "r1", urunId: "u1", renk: "Beyaz", beden: "36", siparisId: "s1", siparisNo: "SAT-1", miktar: talep, tuketilen: 0, tarih: "2026-09-01" }] : [],
  [{ id: "u1", variants: [{ renk: "Beyaz", beden: "36", miktar: stok }] }],
);

// KULLANICININ DURUMU: stok 7, alış 27 (5'i gelmiş), 22'si rezerveli, talep 22.
{
  const d = kur({ stok: 7, alisMiktar: 27, alisKarsilanan: 5, rezMiktar: 22, talep: 22 });
  const sayilar = [d.stok, d.rezerve, d.serbest, d.yoldaToplamAlim, d.yoldaRezerve, d.beklenenSerbest, d.toplamTalep, d.acikToplam];
  bekle("hiçbir değerde küsurat yok", sayilar.every(Number.isInteger), true);
  bekle("stok / ayrılan / serbest", [d.stok, d.rezerve, d.serbest], [7, 7, 0]);
  // Gelmiş olan 5 STOK sütununda; yolda kalan 22.
  bekle("satın alma teslim alınanı saymaz", d.yoldaToplamAlim, 22);
  // Talep 22, stoktan 7 karşılandı, kalan 15'i yoldan tahsis edildi.
  bekle("yoldan tahsisli", d.yoldaRezerve, 15);
  bekle("açık yok", d.acikToplam, 0);
  // DENKLEM: talep = stoktan ayrılan + yoldan tahsisli + açık
  bekle("talep denklemi tutuyor", d.rezerve + d.yoldaRezerve + d.acikToplam, d.toplamTalep);
}

// TAM TESLİM ALINMIŞ ALIŞ: yolda hiçbir şey kalmaz.
{
  const d = kur({ stok: 27, alisMiktar: 27, alisKarsilanan: 27, rezMiktar: 22, talep: 22 });
  bekle("teslim alınmış alış yolda görünmez", d.yoldaToplamAlim, 0);
  bekle("talep stoktan karşılanır", [d.rezerve, d.acikToplam], [22, 0]);
  // Kalan 5 serbest; yolda bir şey yok.
  bekle("beklenen serbest = serbest", d.beklenenSerbest, 5);
}

// HİÇ TESLİM ALINMAMIŞ: yoldaki tamamı sayılır.
{
  const d = kur({ stok: 0, alisMiktar: 12, alisKarsilanan: 0, rezMiktar: 12, talep: 12 });
  bekle("stok yoksa ayrılan 0", d.rezerve, 0);
  bekle("yoldaki tamamı", d.yoldaToplamAlim, 12);
  bekle("tamamı talebe tahsisli → beklenen serbest 0", d.beklenenSerbest, 0);
  bekle("açık yok", d.acikToplam, 0);
}

// TALEBİ STOKTAN KARŞILANMIŞ REZERVELİ ALIM: sahipsiz kalır, serbest sayılır.
{
  const d = kur({ stok: 7, alisMiktar: 6, alisKarsilanan: 0, rezMiktar: 6, talep: 6 });
  bekle("tahsis yok", d.yoldaRezerve, 0);
  bekle("beklenen serbest = serbest + sahipsiz yolda", d.beklenenSerbest, 7);
}

// ---- ALIŞ REZERVASYONUNUN SİPARİŞLERE DAĞITIMI ----
//
// Kullanıcı ekran görüntüsüyle bildirdi: 177 çiftlik ALS-1004, üç satış siparişine
// "123.13 · 46.17 · 7.7" diye bölünmüştü. Küsuratın ASIL KAYNAĞI buydu — dağıtım siparişlerin
// ağırlığına ORANLANIYORDU. Doğrusu: her siparişe KENDİ ihtiyacı kadar, sırayla.
{
  const kaynaklar = [
    { siparisId: "s4", siparisNo: "SAT-1004", hammaddeMiktar: 123 },
    { siparisId: "s1", siparisNo: "SAT-1001", hammaddeMiktar: 46 },
    { siparisId: "s2", siparisNo: "SAT-1002", hammaddeMiktar: 8 },
  ];
  const tam = hammaddeRezervasyonDagit(kaynaklar, 177);
  bekle("ihtiyaç kadar dağıtılır, küsurat yok", tam.map((x) => x.miktar), [123, 46, 8]);

  // Alınan miktar YETMİYORSA sırayla dağıtılır; sonrakilere bir şey kalmaz.
  const eksik = hammaddeRezervasyonDagit(kaynaklar, 100);
  bekle("yetmeyen miktar sırayla", eksik.map((x) => [x.siparisNo, x.miktar]), [["SAT-1004", 100]]);

  // FAZLASI REZERVESİZ KALIR: kimseye söz verilmemiştir, geldiğinde serbest stok olur.
  const fazla = hammaddeRezervasyonDagit(kaynaklar, 200);
  bekle("fazlası rezerve edilmez", fazla.reduce((t, x) => t + x.miktar, 0), 177);

  // Kesirli birimlerde (metre) küsurat MEŞRU: kural yalnızca yeni küsurat ÜRETMEMEK.
  const metre = hammaddeRezervasyonDagit([{ siparisId: "s1", siparisNo: "SAT-1", hammaddeMiktar: 2.5 }], 2.5);
  bekle("kesirli ihtiyaç korunur", metre.map((x) => x.miktar), [2.5]);
}

console.log(hata ? "── STOK DURUMU TESTİ BAŞARISIZ ──" : "── stok durumu testi temiz ──");
process.exit(hata);
