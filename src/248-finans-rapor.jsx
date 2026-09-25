// ================= FİNANS RAPORU — VARLIK / YÜKÜMLÜLÜK (25 Eylül, v1.463.0) =================
//
// Kullanıcı: "Finans raporu ekleyelim. Birden fazla rapor yapabileceğimiz, sipariş raporu gibi
// istediklerimizi kaydederiz. Varlık raporu örnek olarak: alacaklarımız, borçlarımız, hammadde stok
// mali değeri, mamul stok değeri, portföydeki çekler toplamı, yazılan çekler toplamı… çok detaylı.
// 2 defter için ayrı filtreleyerek rapor şablonu yapalım. Büyük uygulamalardan da esinlen."
//
// TASARIM (büyük ERP'lerin bilanço / varlık-kaynak raporundan):
//   • Her para kalemi TEK SATIR: bir kasa, bir banka hesabı, bir carinin bir para birimindeki
//     bakiyesi, bir çek, bir stok varyantı. Satırlar sipariş raporunun motoruna (`RaporSekmesi`)
//     veriliyor — süzgeç, gruplama, sıralama, Excel, yazdırma ve KAYITLI RAPORLAR hazır; ikinci bir
//     rapor mantığı yazılmadı. Hazır şablonlar (Varlık Raporu, Alacak/Borç, Çek vadeleri, Stok
//     değeri, Döviz pozisyonu, Nakit takvimi) kullanıcı raporu gibi açılıp değiştirilebiliyor.
//   • Üstte BİLANÇO ÖZETİ: varlıklar / yükümlülükler grup toplamları ve NET VARLIK (özkaynak
//     karşılığı). "Genel · Resmi yan yana" seçilince iki defter ve farkı aynı tabloda.
//   • DEFTER: cari ve kasa/banka hareketleri kendi defterinde ("Muhasebe" = ikisine de,
//     `defterKapsar`). Çek, doğduğu giriş hareketinin defterinde. STOK DEFTERSİZ: mal fiziksel ve
//     tek — stok hareketleri defter taşımıyor; her iki defterde de aynı stok görünür (ekranda yazılı).
//   • TARİH İTİBARIYLA: bakiyeler o güne kadarki hareketlerden; çek durumu geçmiş satırları o güne
//     kadar oynatılarak bulunuyor (geri alma satırları da durum değiştirdiği için doğru sonuç).
//   • TL KARŞILIĞI güncel kurla (`muhasebe.kurlar`); kuru olmayan birim toplamlara girmiyor ve
//     satırda "kur yok" yazıyor — sessizce 1:1 saymak raporu yanıltırdı (bkz. alisKuruEksik dersi).
//   • İŞARETLİ "Net Etki (TL)": varlık +, yükümlülük −, bilgi satırı 0. Bu sütunu toplayan her
//     rapor (hangi süzgeçle olursa olsun) doğrudan NET VARLIĞI verir.

const FINANS_RAPOR_ALANLARI = [
  { anahtar: "taraf", ad: "Taraf", tip: "metin", secenekler: ["Varlık", "Yükümlülük", "Bilgi"] },
  { anahtar: "grup", ad: "Grup", tip: "metin", secenekler: ["Hazır Değerler", "Ticari Alacaklar", "Alınan Çekler", "Stoklar", "Ticari Borçlar", "Verilen Çekler", "Ciro Edilen Çekler (risk)"] },
  { anahtar: "kalem", ad: "Kalem", tip: "metin" },
  { anahtar: "ad", ad: "Hesap / Cari / Ürün", tip: "metin" },
  { anahtar: "ayrinti", ad: "Ayrıntı", tip: "metin" },
  { anahtar: "defter", ad: "Defter", tip: "metin", secenekler: ["Tümü", "Genel", "Resmi"] },
  { anahtar: "paraBirimi", ad: "P.B.", tip: "metin", secenekler: ["TRY", "USD", "EUR"] },
  { anahtar: "tutar", ad: "Tutar", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "tlKarsiligi", ad: "TL Karşılığı", tip: "para" },
  { anahtar: "netEtki", ad: "Net Etki (TL)", tip: "para" },
  { anahtar: "miktar", ad: "Miktar", tip: "sayi" },
  { anahtar: "birimDeger", ad: "Birim Değer (TL)", tip: "para", toplanmaz: true },
  { anahtar: "vade", ad: "Vade", tip: "tarih" },
  { anahtar: "vadeAy", ad: "Vade Ayı", tip: "metin" },
  { anahtar: "vadeDurumu", ad: "Vade Durumu", tip: "metin", secenekler: ["Vadesi geçmiş", "0-30 gün", "31-60 gün", "61-90 gün", "90+ gün"] },
  { anahtar: "sonHareket", ad: "Son Hareket", tip: "tarih" },
  { anahtar: "not", ad: "Not", tip: "metin" },
];

const FINANS_GRUP_SIRASI = ["Hazır Değerler", "Ticari Alacaklar", "Alınan Çekler", "Stoklar", "Ticari Borçlar", "Verilen Çekler", "Ciro Edilen Çekler (risk)"];

// HAZIR ŞABLONLAR. Kayıtlı rapor biçiminde (245-rapor `kaydet` ile aynı alanlar); kimlikleri sabit.
// Kullanıcı birini değiştirip kaydederse aynı kimlikle `tanimlar.raporlar`a yazılır ve onunki
// geçerli olur. Silinen hazır şablon yeniden görünür — hazırlar kod ile gelir, veri değildir.
const FINANS_HAZIR_RAPORLAR = [
  { id: "hazir-finans-varlik", ad: "Varlık Raporu", tanim: {
    // Yalnız işaretli Net Etki: TL karşılığı sütununun toplamı varlıkla borcu toplardı.
    sutunlar: ["taraf", "grup", "kalem", "netEtki"], gruplar: ["taraf", "grup", "kalem"],
    suzgecler: [], siralama: { alan: "taraf", yon: "artan" } } },
  { id: "hazir-finans-alacak-borc", ad: "Alacaklar ve Borçlar", tanim: {
    sutunlar: ["kalem", "ad", "ayrinti", "defter", "paraBirimi", "tutar", "tlKarsiligi", "sonHareket"], gruplar: [],
    suzgecler: [{ alan: "grup", islem: "icerir", deger: "Ticari" }], siralama: { alan: "tlKarsiligi", yon: "azalan" } } },
  { id: "hazir-finans-cekler", ad: "Çekler ve Vadeler", tanim: {
    sutunlar: ["kalem", "ad", "ayrinti", "vade", "vadeDurumu", "paraBirimi", "tutar", "tlKarsiligi"], gruplar: [],
    suzgecler: [{ alan: "grup", islem: "icerir", deger: "Çek" }], siralama: { alan: "vade", yon: "artan" } } },
  { id: "hazir-finans-stok", ad: "Stok Değeri", tanim: {
    sutunlar: ["kalem", "ad", "miktar", "tlKarsiligi"], gruplar: ["kalem", "ad"],
    suzgecler: [{ alan: "grup", islem: "esit", deger: "Stoklar" }], siralama: { alan: "tlKarsiligi", yon: "azalan" } } },
  { id: "hazir-finans-doviz", ad: "Döviz Pozisyonu", tanim: {
    sutunlar: ["paraBirimi", "taraf", "tutar", "tlKarsiligi", "netEtki"], gruplar: ["paraBirimi", "taraf"],
    suzgecler: [{ alan: "grup", islem: "farkli", deger: "Stoklar" }], siralama: { alan: "paraBirimi", yon: "artan" } } },
  { id: "hazir-finans-nakit-takvimi", ad: "Nakit Takvimi (çek vadeleri)", tanim: {
    sutunlar: ["vadeAy", "taraf", "kalem", "netEtki"], gruplar: ["vadeAy", "taraf", "kalem"],
    suzgecler: [{ alan: "grup", islem: "icerir", deger: "Çek" }, { alan: "taraf", islem: "farkli", deger: "Bilgi" }], siralama: { alan: "vadeAy", yon: "artan" } } },
].map((r) => ({ ...r, modul: "finans", kapsam: "ortak", sahip: null, hazir: true,
  tanim: { kolonAramalari: {}, matris: false, sutunAyarlari: {}, ...r.tanim } }));

// Tarih karşılaştırması gün düzeyinde ("2026-09-25" ya da ISO zaman damgası).
function finansGun(t) { return String(t || "").slice(0, 10); }

function finansVadeDurumu(vade, bugun) {
  if (!vade) return { vadeDurumu: "", vadeAy: "" };
  const gun = (t) => Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10));
  const fark = Math.round((gun(finansGun(vade)) - gun(bugun)) / 86400000);
  const vadeDurumu = fark < 0 ? "Vadesi geçmiş" : fark <= 30 ? "0-30 gün" : fark <= 60 ? "31-60 gün" : fark <= 90 ? "61-90 gün" : "90+ gün";
  return { vadeDurumu, vadeAy: finansGun(vade).slice(0, 7) };
}

// Mamulün birim değeri. "maliyet": reçetedeki hammaddelerin güncel alış fiyatıyla toplamı
// (işçilik ve genel gider DAHİL DEĞİL — ekranda yazılı); "satis": kart satış fiyatı; "alis": kart
// alış fiyatı. Reçete satırı ürün kartındaki kuralla eşleşiyor (mamul rengi + "Tüm Bedenler" ya da o beden).
function finansMamulBirimDegeri(urun, renk, beden, yontem, stok, kurlar) {
  if (yontem === "satis" || yontem === "alis") {
    const fiyat = parseFloat(yontem === "satis" ? urun.satisFiyati : urun.alisFiyati) || 0;
    const pb = alisPbKodu({ alisParaBirimi: yontem === "satis" ? urun.satisParaBirimi : urun.alisParaBirimi });
    const kur = pb === "TRY" ? 1 : parseFloat((kurlar || {})[pb]) || 0;
    return { tl: kur ? fiyat * kur : 0, kurYok: !kur && fiyat > 0 ? pb : null, fiyatsiz: !(fiyat > 0) };
  }
  const satirlar = (urun.recete || []).filter((r) => stokAnahtarNrm(r.mamulRenk) === stokAnahtarNrm(renk)
    && (!r.mamulBeden || r.mamulBeden === "Tüm Bedenler" || stokAnahtarNrm(r.mamulBeden) === stokAnahtarNrm(beden)));
  let tl = 0; let kurYok = null;
  satirlar.forEach((r) => {
    const hm = (stok || []).find((p) => p.id === r.hammaddeUrunId);
    if (!hm) return;
    const bf = hammaddeBirimFiyati(hm, r.renk, r.beden, kurlar);
    if (bf.pb !== "TRY" && !(parseFloat((kurlar || {})[bf.pb]) > 0)) kurYok = bf.pb;
    tl += (parseFloat(r.miktar) || 0) * bf.tl;
  });
  return { tl, kurYok, fiyatsiz: satirlar.length === 0 || !(tl > 0) };
}

// ANA FONKSİYON — düz satırlar. `defter`: "Tümü" | "Genel" | "Resmi"; `tarih`: "YYYY-AA-GG"
// (boşsa bugün). `mamulDegerleme`: "maliyet" | "satis" | "alis".
function finansRaporSatirlari({ cariler, muhasebe, stok, kurlar, defter = "Tümü", tarih, mamulDegerleme = "maliyet" } = {}) {
  const bugun = tarih || bugunYerel();
  const bugunMu = !tarih || tarih >= bugunYerel();
  const kurTablosu = kurlar || (muhasebe && muhasebe.kurlar) || {};
  const tl = (tutar, pb) => {
    if ((pb || "TRY") === "TRY") return { tl: tutar, kurYok: null };
    const kur = parseFloat(kurTablosu[pb]);
    return kur > 0 ? { tl: Math.round(tutar * kur * 100) / 100, kurYok: null } : { tl: null, kurYok: pb };
  };
  const yuv = (x) => Math.round((x || 0) * 100) / 100;
  const defterEtiketi = defter === "Tümü" ? "Tümü" : defter;
  const satirlar = [];
  const ekle = (s) => {
    const cevrim = s.tlKarsiligi !== undefined ? { tl: s.tlKarsiligi, kurYok: s.kurYok || null } : tl(s.tutar, s.paraBirimi);
    const isaret = s.taraf === "Varlık" ? 1 : s.taraf === "Yükümlülük" ? -1 : 0;
    satirlar.push({
      defter: defterEtiketi, ayrinti: "", vade: "", vadeAy: "", vadeDurumu: "", sonHareket: "", miktar: null, birimDeger: null,
      ...s,
      tutar: yuv(s.tutar),
      tlKarsiligi: cevrim.tl == null ? null : yuv(cevrim.tl),
      netEtki: cevrim.tl == null ? 0 : yuv(cevrim.tl * isaret),
      not: [s.not, cevrim.kurYok ? `${cevrim.kurYok} kuru yok — toplamlara girmedi` : ""].filter(Boolean).join(" · "),
    });
  };
  const kapsar = (d) => defterKapsar(d, defter);

  // ---- HAZIR DEĞERLER: kasa ve banka ----
  [["kasalar", "Kasa"], ["bankalar", "Banka"]].forEach(([anahtar, kalem]) => {
    ((muhasebe && muhasebe[anahtar]) || []).forEach((h) => {
      const hareketler = (h.hareketler || []).filter((x) => kapsar(x.defter) && finansGun(x.tarih) <= bugun);
      const bakiye = hareketler.reduce((t, x) => t + (x.yon === "Giriş" ? (x.tutar || 0) : -(x.tutar || 0)), 0);
      if (Math.abs(bakiye) < 0.005 && h.pasif) return;
      ekle({ taraf: "Varlık", grup: "Hazır Değerler", kalem, ad: h.ad, ayrinti: h.banka || "", paraBirimi: h.paraBirimi || "TRY", tutar: bakiye,
        sonHareket: hareketler.reduce((m, x) => (finansGun(x.tarih) > m ? finansGun(x.tarih) : m), ""),
        not: bakiye < 0 ? "eksi bakiye" : "" });
    });
  });

  // ---- CARİLER: para birimi başına bakiye. + alacak (varlık), − borç (yükümlülük) ----
  // Cari tipine göre kalem: müşteriye verilen avans da "alacak", tedarikçinin bize borcu da.
  (cariler || []).forEach((c) => {
    const pbBakiye = {}; const pbSon = {};
    (c.hareketler || []).filter((h) => kapsar(h.defter) && finansGun(h.tarih) <= bugun).forEach((h) => {
      const pb = h.paraBirimi || "TRY";
      pbBakiye[pb] = (pbBakiye[pb] || 0) + (h.yon === "Borç" ? (h.tutar || 0) : -(h.tutar || 0));
      if (finansGun(h.tarih) > (pbSon[pb] || "")) pbSon[pb] = finansGun(h.tarih);
    });
    Object.entries(pbBakiye).forEach(([pb, b]) => {
      if (Math.abs(b) < 0.005) return;
      const tip = c.tip || "Müşteri";
      const alacak = b > 0;
      ekle({
        taraf: alacak ? "Varlık" : "Yükümlülük",
        grup: alacak ? "Ticari Alacaklar" : "Ticari Borçlar",
        kalem: `${tip} ${alacak ? "alacağı" : "borcu"}`,
        ad: c.unvan, ayrinti: tip + (c.pasif ? " · pasif" : ""), paraBirimi: pb, tutar: Math.abs(b), sonHareket: pbSon[pb] || "",
      });
    });
  });

  // ---- ÇEKLER — durum o tarihe kadarki geçmişten ----
  const tumHareketler = new Map();
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => tumHareketler.set(h.id, { cari: c, h })));
  ((muhasebe && muhasebe.cekler) || []).forEach((cek) => {
    const giris = cek.hareketId ? tumHareketler.get(cek.hareketId) : null;
    const girisDefteri = (giris && giris.h.defter) || "Genel";
    if (!kapsar(girisDefteri)) return;
    const girisTarihi = finansGun((giris && giris.h.tarih) || cek.tarih || ((cek.gecmis || [])[0] || {}).tarih || "");
    if (girisTarihi && girisTarihi > bugun) return;
    let durum = "Portföyde";
    (cek.gecmis || []).forEach((g) => { if (!g.tarih || finansGun(g.tarih) <= bugun) durum = g.yeniDurum || durum; });
    if (bugunMu) durum = cek.durum || durum;
    const verilen = (cek.tip || "Alınan") === "Verilen";
    const cari = (cariler || []).find((c) => c.id === cek.cariId);
    const ortak = {
      ad: `${cek.cekNo || "numarasız"}${cek.banka ? ` · ${cek.banka}` : ""}`,
      ayrinti: cari ? cari.unvan : "", paraBirimi: cek.paraBirimi || "TRY", tutar: cek.tutar || 0, vade: cek.vadeTarihi || "",
      ...finansVadeDurumu(cek.vadeTarihi, bugun),
    };
    if (!verilen) {
      if (durum === "Portföyde") ekle({ ...ortak, taraf: "Varlık", grup: "Alınan Çekler", kalem: "Portföydeki çek" });
      else if (durum === "Tahsilde") ekle({ ...ortak, taraf: "Varlık", grup: "Alınan Çekler", kalem: "Bankada tahsildeki çek", not: cek.tahsilBankaAd || "" });
      else if (durum === "Karşılıksız") ekle({ ...ortak, taraf: "Varlık", grup: "Alınan Çekler", kalem: "Karşılıksız (şüpheli) çek" });
      // CİRO RİSKİ (nazım hesap): ciro ettiğimiz çek vadesinde ödenmezse bize döner. Vadesi
      // geçmemiş cirolu çek bilgi olarak listelenir, net varlığa girmez.
      else if (durum === "Ciro Edildi" && (!cek.vadeTarihi || finansGun(cek.vadeTarihi) >= bugun)) {
        const son = [...cekEtkinGecmis(cek)].reverse().find((g) => g.yeniDurum === "Ciro Edildi");
        ekle({ ...ortak, taraf: "Bilgi", grup: "Ciro Edilen Çekler (risk)", kalem: "Ciro edilen, vadesi gelmemiş", not: son && son.cariAd ? `→ ${son.cariAd}` : "" });
      }
    } else if (durum === "Portföyde" || durum === "Tahsilde") {
      // Şahsi çek "Portföyde" = verildi, henüz ödenmedi: vadesinde hesaptan çıkacak BORÇ.
      ekle({ ...ortak, taraf: "Yükümlülük", grup: "Verilen Çekler", kalem: "Ödenecek şahsi çek" });
    }
  });

  // ---- STOKLAR — defter taşımıyor, her defterde aynı ----
  (stok || []).forEach((p) => {
    if (!p || p.kategori === "Hizmet") return;
    const mamul = p.kategori === "Mamul";
    const miktarlar = new Map();
    if ((p.hareketler || []).length) {
      p.hareketler.filter((h) => finansGun(h.tarih) <= bugun).forEach((h) => {
        const k = `${stokAnahtarNrm(h.renk)}|${stokAnahtarNrm(h.beden)}`;
        miktarlar.set(k, (miktarlar.get(k) || 0) + (Number(h.miktar) || 0));
      });
    } else if (bugunMu) {
      (p.variants || []).forEach((v) => {
        const k = `${stokAnahtarNrm(v.renk)}|${stokAnahtarNrm(v.beden)}`;
        miktarlar.set(k, (miktarlar.get(k) || 0) + (Number(v.miktar) || 0));
      });
    }
    miktarlar.forEach((miktar, k) => {
      miktar = stokYuvarla(miktar);
      if (Math.abs(miktar) < 0.0005) return;
      const [renk, beden] = k.split("|");
      let birim = 0; let kurYok = null; let fiyatsiz = false;
      if (mamul) {
        const d = finansMamulBirimDegeri(p, renk, beden, mamulDegerleme, stok, kurTablosu);
        birim = d.tl; kurYok = d.kurYok; fiyatsiz = d.fiyatsiz;
      } else {
        const bf = hammaddeBirimFiyati(p, renk, beden, kurTablosu);
        birim = bf.tl; fiyatsiz = !(bf.kendiFiyat > 0);
        if (bf.pb !== "TRY" && !(parseFloat(kurTablosu[bf.pb]) > 0) && bf.kendiFiyat > 0) kurYok = bf.pb;
      }
      const deger = kurYok ? null : miktar * birim;
      ekle({
        taraf: "Varlık", grup: "Stoklar", kalem: p.kategori || "Hammadde", ad: p.ad,
        ayrinti: [olcuGoster(renk), olcuGoster(beden)].filter(Boolean).join(" · "),
        paraBirimi: "TRY", tutar: deger || 0, tlKarsiligi: deger, kurYok, miktar, birimDeger: kurYok ? null : yuv(birim),
        not: [fiyatsiz ? "fiyat/maliyet yok — değer 0" : "", miktar < 0 ? "eksi stok" : ""].filter(Boolean).join(" · "),
      });
    });
  });

  return satirlar;
}

// BİLANÇO ÖZETİ — grup toplamları (TL) ve net varlık. Kuru olmayan satırlar toplam dışı, sayılıyor.
function finansOzet(satirlar) {
  const gruplar = {};
  let varlik = 0, yukumluluk = 0, bilgi = 0, kurYok = 0;
  (satirlar || []).forEach((s) => {
    if (s.tlKarsiligi == null) { kurYok += 1; return; }
    gruplar[s.grup] = gruplar[s.grup] || { taraf: s.taraf, toplam: 0, adet: 0 };
    gruplar[s.grup].toplam += s.tlKarsiligi;
    gruplar[s.grup].adet += 1;
    if (s.taraf === "Varlık") varlik += s.tlKarsiligi;
    else if (s.taraf === "Yükümlülük") yukumluluk += s.tlKarsiligi;
    else bilgi += s.tlKarsiligi;
  });
  const yuv = (x) => Math.round(x * 100) / 100;
  Object.values(gruplar).forEach((g) => { g.toplam = yuv(g.toplam); });
  return { gruplar, varlik: yuv(varlik), yukumluluk: yuv(yukumluluk), net: yuv(varlik - yukumluluk), bilgi: yuv(bilgi), kurYok };
}

function FinansRaporu({ cariler, muhasebe, stok, raporlar, onRaporlarKaydet, aktifKullanici, showToast, firmaBilgileri }) {
  const [defter, setDefter] = useState("Tümü");   // "Tümü" | "Genel" | "Resmi" | "YanYana"
  const [tarih, setTarih] = useState("");
  const [mamulDegerleme, setMamulDegerleme] = useState("maliyet");
  const kurlar = (muhasebe && muhasebe.kurlar) || {};
  const ortak = { cariler, muhasebe, stok, kurlar, tarih, mamulDegerleme };
  // YAN YANA: iki defterin satırları birlikte (Defter sütunu ayırır); özet iki sütunlu.
  const satirlar = defter === "YanYana"
    ? [...finansRaporSatirlari({ ...ortak, defter: "Genel" }), ...finansRaporSatirlari({ ...ortak, defter: "Resmi" })]
    : finansRaporSatirlari({ ...ortak, defter });
  const ozetler = defter === "YanYana"
    ? [["Genel", finansOzet(satirlar.filter((s) => s.defter === "Genel"))], ["Resmi", finansOzet(satirlar.filter((s) => s.defter === "Resmi"))]]
    : [[defter === "Tümü" ? "Tüm defterler" : defter, finansOzet(satirlar)]];
  const para = (v) => `${(v || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
  const fiyatsizSayisi = satirlar.filter((s) => s.grup === "Stoklar" && /fiyat\/maliyet yok/.test(s.not || "")).length;
  const kurYokSayisi = satirlar.filter((s) => s.tlKarsiligi == null).length;
  // Hazır şablonlar + kayıtlılar. Kaydedilen (değiştirilmiş) hazır şablon kendi kimliğiyle geçerli.
  const kayitli = raporlar || [];
  const gorunenRaporlar = [...FINANS_HAZIR_RAPORLAR.filter((h) => !kayitli.some((r) => r.id === h.id)), ...kayitli];
  // Kaydederken DOKUNULMAMIŞ hazır şablonlar veriye yazılmıyor (nesne kimliğiyle ayırt ediliyor).
  const raporlariKaydet = (liste) => onRaporlarKaydet((liste || []).filter((r) => !FINANS_HAZIR_RAPORLAR.includes(r)));
  const secim = (deger, set, secenekler) => (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {secenekler.map(([d, ad]) => (
        <button key={d} type="button" onClick={() => set(d)} data-finans-secim={d}
          style={{ padding: "5px 11px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
            border: `1.5px solid ${deger === d ? "var(--erp-primary)" : "var(--erp-line)"}`,
            background: deger === d ? "var(--erp-primary)" : "#fff", color: deger === d ? "#fff" : "var(--erp-text-2)" }}>
          {ad}
        </button>
      ))}
    </div>
  );
  const etiket = { fontSize: 11, fontWeight: 700, color: "var(--erp-text-3)", textTransform: "uppercase", letterSpacing: ".04em" };
  const gruplar = FINANS_GRUP_SIRASI.filter((g) => ozetler.some(([, o]) => o.gruplar[g]));
  const taraflar = [["Varlık", "VARLIKLAR"], ["Yükümlülük", "YÜKÜMLÜLÜKLER"], ["Bilgi", "BİLGİ (net varlığa girmez)"]];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end", background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <span style={etiket}>Defter</span>
          {secim(defter, setDefter, [["Tümü", "Tümü"], ["Genel", "Genel"], ["Resmi", "Resmi"], ["YanYana", "Genel · Resmi yan yana"]])}
        </div>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={etiket}>Tarih itibarıyla</span>
          <input type="date" data-finans-tarih="1" value={tarih} onChange={(e) => setTarih(e.target.value)} style={{ ...inputStyle, width: 160 }} />
        </label>
        <div style={{ display: "grid", gap: 4 }}>
          <span style={etiket}>Mamul değerleme</span>
          {secim(mamulDegerleme, setMamulDegerleme, [["maliyet", "Reçete maliyeti"], ["satis", "Satış fiyatı"], ["alis", "Kart alış fiyatı"]])}
        </div>
      </div>

      <div id="finans-ozet-yazdir" data-finans-ozet="1" style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <b style={{ fontSize: 15 }}>Varlık Özeti{(firmaBilgileri || {}).unvan ? ` — ${firmaBilgileri.unvan}` : ""}</b>
          <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
            {tarih ? `${tarihYaz(tarih)} itibarıyla` : "bugün itibarıyla"} · kurlar: {Object.entries(kurlar).filter(([k, v]) => /^[A-Z]{3}$/.test(k) && v).map(([k, v]) => `${k} ${v}`).join(", ") || "yok"}
          </span>
          <button type="button" className="btn-ghost no-print" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12 }}
            onClick={() => indirYazdirilabilirHTML("#finans-ozet-yazdir", `Varlik-Ozeti-${tarih || bugunYerel()}`)}>
            <Printer size={13} /> Yazdır
          </button>
        </div>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Grup</th>
              {ozetler.map(([ad]) => <th key={ad} style={{ textAlign: "right" }}>{ad}</th>)}
              {ozetler.length === 2 && <th style={{ textAlign: "right" }}>Fark (Genel − Resmi)</th>}
            </tr>
          </thead>
          <tbody>
            {taraflar.map(([taraf, baslik]) => {
              const tarafGruplari = gruplar.filter((g) => ozetler.some(([, o]) => o.gruplar[g] && o.gruplar[g].taraf === taraf));
              if (tarafGruplari.length === 0) return null;
              return (
                <React.Fragment key={taraf}>
                  <tr><td colSpan={ozetler.length + 2} style={{ fontSize: 11, fontWeight: 800, color: "var(--erp-text-3)", paddingTop: 10 }}>{baslik}</td></tr>
                  {tarafGruplari.map((g) => {
                    const deger = (o) => (o.gruplar[g] ? o.gruplar[g].toplam : 0);
                    return (
                      <tr key={g} data-finans-ozet-grup={g}>
                        <td>{g}</td>
                        {ozetler.map(([ad, o]) => <td key={ad} className="mono" style={{ textAlign: "right" }}>{para(deger(o))}</td>)}
                        {ozetler.length === 2 && <td className="mono" style={{ textAlign: "right", color: "var(--erp-text-2)" }}>{para(deger(ozetler[0][1]) - deger(ozetler[1][1]))}</td>}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {[["Toplam varlık", "varlik"], ["Toplam yükümlülük", "yukumluluk"], ["NET VARLIK", "net"]].map(([ad, k]) => (
              <tr key={k} data-finans-ozet-toplam={k} style={{ borderTop: "2px solid var(--erp-line)" }}>
                <td style={{ fontWeight: 800 }}>{ad}</td>
                {ozetler.map(([d, o]) => (
                  <td key={d} className="mono" style={{ textAlign: "right", fontWeight: 800, color: k === "net" ? (o.net >= 0 ? "var(--erp-primary)" : "var(--erp-warn)") : undefined }}>{para(o[k])}</td>
                ))}
                {ozetler.length === 2 && <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{para(ozetler[0][1][k] - ozetler[1][1][k])}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: "var(--erp-text-2)", display: "grid", gap: 2 }}>
          <span>Stok defter ayırmaz (mal fiziksel ve tek) — her iki defterde aynı stok değeri görünür.
            {mamulDegerleme === "maliyet" ? " Mamul değeri reçetedeki hammaddelerin güncel alış fiyatıyla; işçilik ve genel gider dahil değil." : ""}</span>
          {fiyatsizSayisi > 0 && <span style={{ color: "#B7791F" }}>⚠ {fiyatsizSayisi} stok kaleminin fiyatı/maliyeti yok — değeri 0 sayıldı ("Stok Değeri" raporunda Not sütununda).</span>}
          {kurYokSayisi > 0 && <span style={{ color: "var(--erp-warn)" }}>⚠ {kurYokSayisi} kalemin para biriminde kur yok — toplamlara girmedi. Üst şeritteki kur rozetinden girin.</span>}
        </div>
      </div>

      <RaporSekmesi
        modulAnahtari="finans"
        baslik="Finans Raporu"
        alanlar={FINANS_RAPOR_ALANLARI}
        satirlar={satirlar}
        raporlar={gorunenRaporlar}
        onRaporlarKaydet={raporlariKaydet}
        aktifKullanici={aktifKullanici}
        showToast={showToast}
        arama=""
      />
    </div>
  );
}
