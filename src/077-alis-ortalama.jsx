// ================= MALİYETTE SON ALIŞ ORTALAMASI (27 Eylül, v1.499.0) =================
//
// Kullanıcı: "Maliyet ilk olarak son hammadde rengin alış fiyatlarının ortalamasından çeksin." Kapsam
// (soruldu): HER YERDE — ürün kartı Maliyet sekmesi ve çıktısı, kâr/zarar, stok değeri, üretimdeki mal,
// maliyet farkı, modelhane. Hepsi `hammaddeBirimFiyati` (015) üzerinden geçiyor; bu dosya onun ilk adımı.
//
// KURAL (kullanıcı): "Son alış ama son alış eski ise dikkate almasın; TL ise o gün USD'ye çevirip USD
// olarak ortalama bu değer olurdu desin. Son alışlar 3 aydan eski ise bu şekilde davransın."
//   1. Son 3 aydaki alışlar (o hammadde, o renk; boy verilmişse o boy) → MİKTAR AĞIRLIKLI ortalama. Çok
//      alınan partinin fiyatı daha çok etkiler; tek küçük alış ortalamayı bozmaz.
//   2. Son 3 ayda alış yoksa EN SON alış alınır, ama TL fiyatı olduğu gibi değil: o günün USD kuruyla
//      dolara çevrilir ve bugünün kuruyla TL'ye getirilir ("bugün alsak aşağı yukarı bu olurdu"). TL'nin
//      değer kaybı eski fiyatı yapay olarak ucuz gösteriyordu. Dövizli alış zaten sabit değerde; kendi
//      biriminde kalır. O günün kuru `kurGecmisi`nde yoksa düzeltilemez — fiyat olduğu gibi, kaynakta yazar.
//   3. Hiç alış yoksa eskisi gibi: fiyat kuralı (renk/boy) → kart alış fiyatı (015 `hammaddeBirimFiyati`).
//
// KAYNAK: cari hareketleri — alış fişi (`AF-`) her kalemi ürün adı, renk, boy, miktar, birim fiyatla
// cariye yazıyor (`sonAlisFiyatlari` ile aynı okuma). Fiş geri alınınca hareket silindiği için ortalama
// da kendiliğinden düzeliyor; ayrı bir "son fiyat" alanı tutulmuyor.
//
// HIZ: stok değeri yüzlerce ürün × renk için çağırıyor; her çağrıda bütün cari hareketlerini taramamak
// için alışlar ürün adına göre bir kez dizinleniyor (cariler dizisi değişince yeniden — WeakMap).

const ALIS_ORTALAMA_AY = 3;
const alisDiziniOnbellek = new WeakMap();

function alisDizini(cariler) {
  if (!Array.isArray(cariler)) return new Map();
  const onceki = alisDiziniOnbellek.get(cariler);
  if (onceki) return onceki;
  const onEk = `${fisOnEki("Alış")}-`;
  const dizin = new Map();
  cariler.forEach((c) => (c.hareketler || []).forEach((h) => {
    if (!h || !h.fisNo || !String(h.fisNo).startsWith(onEk)) return;
    const ad = String(h.urunAd || "").toLocaleLowerCase("tr-TR").trim();
    if (!ad) return;
    // Kalemin KENDİ birimindeki fiyat: çevrim yapıldıysa ham fiyat (cariye TL yazılmış USD alış USD sayılır).
    const cevrildi = h.hamBirimFiyat != null && h.kalemParaBirimi;
    const fiyat = cevrildi ? h.hamBirimFiyat : h.birimFiyat;
    if (!(fiyat > 0)) return;
    if (!dizin.has(ad)) dizin.set(ad, []);
    dizin.get(ad).push({
      tarih: String(h.tarih || "").slice(0, 10), zaman: h.zaman || "", fisNo: h.fisNo,
      renk: stokAnahtarNrm(h.renk), beden: stokAnahtarNrm(h.beden),
      miktar: Math.abs(Number(h.miktar) || 0), fiyat: Number(fiyat),
      pb: cevrildi ? h.kalemParaBirimi : (h.paraBirimi || "TRY"),
    });
  }));
  dizin.forEach((l) => l.sort((a, b) => (b.tarih + b.zaman).localeCompare(a.tarih + a.zaman)));
  alisDiziniOnbellek.set(cariler, dizin);
  return dizin;
}

// "YYYY-AA-GG"den n ay önce (ay sonu taşmasında ayın son günü).
function aylarOnce(gun, n) {
  const [y, a, g] = String(gun).slice(0, 10).split("-").map(Number);
  const hedef = new Date(Date.UTC(y, a - 1 - n, 1));
  const ayinSonGunu = new Date(Date.UTC(hedef.getUTCFullYear(), hedef.getUTCMonth() + 1, 0)).getUTCDate();
  hedef.setUTCDate(Math.min(g, ayinSonGunu));
  return hedef.toISOString().slice(0, 10);
}

// O güne ait (ya da ondan önceki en yakın) kur. `kurGecmisi` en yeni önde; kayıt yoksa null.
function gunKuru(kurGecmisi, gun, pb) {
  const hedef = String(gun).slice(0, 10);
  let bulunan = null;
  (kurGecmisi || []).forEach((k) => {
    const t = String(k.tarih || "").slice(0, 10);
    const deger = parseFloat(k[pb]);
    if (!t || t > hedef || !(deger > 0)) return;
    if (!bulunan || t > bulunan.t) bulunan = { t, deger };
  });
  return bulunan ? bulunan.deger : null;
}

const tarihTr = (gun) => (gun ? `${gun.slice(8, 10)}.${gun.slice(5, 7)}.${gun.slice(0, 4)}` : "");

// Hammaddenin son alışlardan maliyet fiyatı. `baglam`: { cariler, kurGecmisi, bugun? }. Alış yoksa null
// (çağıran kural/kart fiyatına düşer). Dönüş `hammaddeBirimFiyati` biçiminde + `alisSayisi`.
function sonAlisMaliyeti(hammadde, renk, beden, kurlar, baglam) {
  if (!hammadde || !baglam || !baglam.cariler) return null;
  const tum = alisDizini(baglam.cariler).get(String(hammadde.ad || "").toLocaleLowerCase("tr-TR").trim()) || [];
  const r = stokAnahtarNrm(renk);
  // Boy: reçetede boy yazılıysa o boyun alışları (fermuar boyları ayrı fiyatlı); "Tüm Bedenler" boy değil.
  const b = beden === "Tüm Bedenler" ? "" : stokAnahtarNrm(beden);
  const alislar = tum.filter((a) => a.renk === r && (!b || a.beden === b));
  if (!alislar.length) return null;
  const kur = (pb) => (pb === "TRY" ? 1 : parseFloat((kurlar || {})[pb]) || 0);
  const bugun = baglam.bugun || bugunYerel();
  const sinir = aylarOnce(bugun, ALIS_ORTALAMA_AY);
  const yakin = alislar.filter((a) => a.tarih >= sinir && a.tarih <= bugun);

  if (yakin.length) {
    // Hepsi aynı birimdeyse ortalama o birimde (maliyet dökümünde "12,40 $" görünsün); karışıksa TL'de.
    const birimler = new Set(yakin.map((a) => a.pb));
    const tekPb = birimler.size === 1 ? yakin[0].pb : "TRY";
    let pay = 0; let payda = 0; let kurYok = null;
    yakin.forEach((a) => {
      const w = a.miktar > 0 ? a.miktar : 1;
      let f = a.fiyat;
      if (a.pb !== tekPb) { const k = kur(a.pb); if (!k) { kurYok = a.pb; return; } f = a.fiyat * k; }
      pay += f * w; payda += w;
    });
    if (!payda) return null;
    const kendiFiyat = Math.round((pay / payda) * 10000) / 10000;
    const k = kur(tekPb);
    return {
      kendiFiyat, pb: tekPb, tl: k ? kendiFiyat * k : kendiFiyat, alisSayisi: yakin.length, kurYok,
      kaynak: yakin.length === 1 ? `Son alış (${tarihTr(yakin[0].tarih)})` : `Son ${ALIS_ORTALAMA_AY} ay ${yakin.length} alış ortalaması`,
    };
  }

  // 3 aydan eski: en son alış, TL ise o günün USD kuruyla bugüne taşınır.
  const son = alislar.find((a) => a.tarih <= bugun) || alislar[0];
  if (son.pb === "TRY") {
    const o = gunKuru(baglam.kurGecmisi, son.tarih, "USD");
    const bugunUsd = kur("USD");
    if (o && bugunUsd) {
      const usd = Math.round((son.fiyat / o) * 10000) / 10000;
      return { kendiFiyat: usd, pb: "USD", tl: usd * bugunUsd, alisSayisi: 1, eskiAlis: true,
        kaynak: `Son alış ${tarihTr(son.tarih)} (3 aydan eski): ${son.fiyat.toLocaleString("tr-TR")} ₺ o günün kuruyla ${usd.toLocaleString("tr-TR")} $` };
    }
    return { kendiFiyat: son.fiyat, pb: "TRY", tl: son.fiyat, alisSayisi: 1, eskiAlis: true,
      kaynak: `Son alış ${tarihTr(son.tarih)} (3 aydan eski; o günün kuru kayıtlı değil, güncellenemedi)` };
  }
  const k = kur(son.pb);
  return { kendiFiyat: son.fiyat, pb: son.pb, tl: k ? son.fiyat * k : son.fiyat, alisSayisi: 1, eskiAlis: true,
    kaynak: `Son alış ${tarihTr(son.tarih)} (3 aydan eski, ${son.pb})` };
}
