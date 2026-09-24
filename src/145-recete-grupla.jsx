// Reçete satırlarını hammadde+renk bazında gruplar; her grup içinde mamul bedeni <-> hammadde bedeni eşleşmesi listelenir.
// Reçete satırlarını sadece HAMMADDEYE göre gruplar (tek kart) — kart içinde tüm satırlar
// (farklı mamul renk/pozisyon/hammadde rengi olsa bile) düz bir liste olarak tutulur.
// Reçete satırlarını EKLEME İŞLEMİ bazında gruplar.
//
// Neden hammadde kimliği tek başına yetmiyor: aynı stok kalemi bir mamulde BİRDEN FAZLA amaçla
// kullanılabilir. "Deri Nubuk" hem yüz derisi hem astar olarak girilebilir; ikisinin miktarı,
// rengi ve prosesi farklıdır. Hepsini tek başlık altında toplamak bu ayrımı yok ediyor, farklı
// miktarları tek satıra sıkıştırıyor ve hangi eklemenin ne için yapıldığı anlaşılmaz hale geliyordu.
//
// Bu yüzden anahtar `eklemeId` içerir: her "Reçeteye Ekle" işlemi kendi grubunu oluşturur.
// GERİYE DÖNÜK UYUM: eklemeId'si olmayan eski satırlar, eskisi gibi hammadde+proses bazında
// gruplanır — mevcut reçeteler bozulmaz, sadece bundan sonraki eklemeler ayrışır.
function receteGrupla(recete) {
  const gruplar = [];
  const index = {};
  recete.forEach((r) => {
    const key = r.eklemeId
      ? `e:${r.eklemeId}`
      : `h:${r.hammaddeUrunId}__${r.proses || ""}`;
    if (!(key in index)) {
      index[key] = gruplar.length;
      gruplar.push({
        key,
        hammaddeAd: r.hammaddeAd,
        hammaddeUrunId: r.hammaddeUrunId,
        eklemeId: r.eklemeId || null,
        eklemeTarihi: r.eklemeTarihi || null,
        satirlar: [],
      });
    }
    gruplar[index[key]].satirlar.push(r);
  });
  return gruplar;
}

// Maliyet/yazdırma hesaplamaları için: hammadde+renk aynı olsa bile miktar farklıysa
// (yani ayrı bir ekleme/kullanım söz konusuysa) ayrı satır olarak tutar, hiçbiri kaybolmaz.
function receteMaliyetGrupla(recete) {
  const gruplar = [];
  const index = {};
  recete.forEach((r) => {
    const key = `${r.hammaddeUrunId}__${r.renk}__${r.miktar}`;
    if (!(key in index)) {
      index[key] = gruplar.length;
      gruplar.push({ key, hammaddeAd: r.hammaddeAd, renk: r.renk, satirlar: [] });
    }
    gruplar[index[key]].satirlar.push(r);
  });
  return gruplar;
}

// Reçete satırlarını önce proses sırasına göre böler (proses tanımlanmış sırayla, ardından "Belirtilmemiş").
// Proseslerin sırası normalde Tanımlar'daki genel sıraya (p.sira) göre belirlenir. Ancak bazı
// istisnai ürünlerde bu genel sıra uygun olmayabilir — bu yüzden bir ürüne özel "sira override"
// (urunSiraOverride: {[prosesAdi]: özelSiraNo}) tanımlıysa, o proses için GENEL sıra yerine bu
// özel değer kullanılır. Böylece Tanımlar'daki genel sıralamaya dokunmadan, sadece bu ürünün
// reçetesinde belirli bir prosesi öne/geriye alabilirsiniz.
function receteProsesGrupla(recete, tanimlarProsesler, urunSiraOverride) {
  const siraMap = {};
  (tanimlarProsesler || []).forEach((p) => { siraMap[p.ad] = p.sira ?? 0; });

  const gruplar = {};
  recete.forEach((r) => {
    const key = r.proses || "Belirtilmemiş";
    if (!gruplar[key]) gruplar[key] = [];
    gruplar[key].push(r);
  });

  return Object.entries(gruplar)
    .map(([proses, satirlar]) => {
      const ozel = (urunSiraOverride || {})[proses];
      const genelSira = proses === "Belirtilmemiş" ? null : (siraMap[proses] ?? 999);
      return { proses, sira: ozel != null ? ozel : genelSira, ozelSiraMi: ozel != null, satirlar };
    })
    .sort((a, b) => {
      if (a.sira === null) return 1;
      if (b.sira === null) return -1;
      return a.sira - b.sira;
    });
}

// Aynı fişteki (veya fiş yoksa aynı gün/işlemdeki) hareketleri gruplar; renk+beden liste halinde gösterilir.
// Bir MAMUL ürünün renk/bedeni için: henüz teslim edilmemiş (karşılanmamış) satış siparişi kalemlerinin
// toplamı kadar "rezerve" (taahhüt edilmiş ama fiziksel stoktan düşülmemiş) miktarı hesaplar.
// Bir MAMUL ürünün renk/bedeni için: hâlâ karşılanmamış Satış siparişi kalemlerinden doğan rezerve
// miktarı, HANGİ siparişten (id + siparisNo) ne kadar geldiğini de ayrı ayrı listeleyerek döndürür.
function mamulRezerveHesapla(urunId, renk, beden, siparisler) {
  const detay = [];
  (siparisler || []).forEach((s) => {
    if (s.tip !== "Satış" || s.durum === "İptal") return;
    s.kalemler.forEach((k) => {
      if (k.urunId !== urunId || k.renk !== renk || k.beden !== beden) return;
      const kalan = k.miktar - (k.karsilanan || 0);
      // Bu kalem için bir Tedarik Planlaması (Satınalma/Üretim) varsa, bu rezervasyonun HANGİ açık
      // sipariş tarafından karşılanmak üzere planlandığını da gösteririz — böylece stoktaki rezerve
      // detayına bakan biri, bu miktarın zaten yolda olup olmadığını görebilir.
      if (kalan > 0) detay.push({ siparisId: s.id, siparisNo: s.siparisNo, miktar: kalan, planlama: k.planlama || null });
    });
  });
  const toplam = detay.reduce((s, d) => s + d.miktar, 0);
  return { toplam, detay };
}

// Bir HAMMADDE ürünün renk/bedeni için: henüz tamamlanmamış proses adımlarında tüketilecek olan
// (ama henüz gerçek stoktan düşülmemiş) miktarı, ilgili mamulün reçetesi üzerinden hesaplar.
// Bir HAMMADDE ürünün renk/bedeni için: personele "verilmiş" ama henüz "teslim alınmamış" proses
// adımlarında tüketilecek olan (ama henüz gerçek stoktan düşülmemiş) miktarı, HANGİ üretim
// siparişinden (id + siparisNo) ne kadar geldiğini de ayrı ayrı listeleyerek hesaplar.
function hammaddeRezerveHesapla(urunId, renk, beden, uretim, tumUrunler) {
  const norm = (s) => (s || "").toString().trim().toLocaleLowerCase("tr-TR");
  const detay = [];
  (uretim || []).forEach((o) => {
    if (!o.prosesIlerleme || o.stogaEklendiMi) return;
    const urun = (tumUrunler || []).find((p) => p.id === o.urunId);
    if (!urun || !urun.recete) return;
    const toplamAdet = (o.bedenMiktarlari || []).reduce((s, bm) => s + bm.miktar, 0);
    let buUretimIcin = 0;
    // Üretim siparişi oluşturulup planlandığı andan itibaren (personele "verilmesi" beklenmeden),
    // henüz tamamlanmamış TÜM proses adımlarının hammaddesi rezerve edilir. Eşleştirme, boşluk/
    // büyük-küçük harf farklarına karşı normalize edilerek yapılır — aksi halde ufak bir yazım
    // farkı (örn. kopyala-yapıştırdan gelen fazladan boşluk) rezerveyi sessizce sıfırlayabilirdi.
    o.prosesIlerleme
      .filter((p) => !p.tamamlandiMi)
      .forEach((p) => {
        urun.recete
          .filter((r) =>
            norm(r.proses) === norm(p.proses) &&
            norm(r.mamulRenk) === norm(o.renk) &&
            r.hammaddeUrunId === urunId &&
            norm(r.renk) === norm(renk) &&
            norm(r.beden) === norm(beden)
          )
          .forEach((r) => {
            const bm = (o.bedenMiktarlari || []).find((x) => norm(x.beden) === norm(r.mamulBeden));
            const uretilenMiktar = r.mamulBeden === "Tüm Bedenler" ? toplamAdet : (bm ? bm.miktar : 0);
            buUretimIcin += r.miktar * uretilenMiktar;
          });
      });
    if (buUretimIcin > 0) detay.push({ uretimId: o.id, siparisNo: o.siparisNo, miktar: buUretimIcin });
  });
  const toplam = detay.reduce((s, d) => s + d.miktar, 0);
  return { toplam, detay };
}

function hareketleriGrupla(hareketler) {
  const gruplar = [];
  const index = {};
  hareketler.forEach((h) => {
    const gun = h.tarih ? h.tarih.slice(0, 10) : "";
    const key = h.fisNo
      ? `fis__${h.fisNo}`
      : `${gun}__${h.kaynak}__${h.siparisNo || ""}__${h.cariId || ""}__${h.renk}`;
    if (!(key in index)) {
      index[key] = gruplar.length;
      gruplar.push({ key, tarih: h.tarih, kaynak: h.kaynak, cariId: h.cariId, siparisNo: h.siparisNo, fisNo: h.fisNo, hareketler: [] });
    }
    gruplar[index[key]].hareketler.push(h);
  });
  return gruplar;
}


// STOK HAREKETİ KAYNAĞININ EKRAN ETİKETİ.
//
// Kullanıcının altını çizdiği ayrım: SİPARİŞ ile FİŞ ayrı şeyler.
//   satış siparişi / alış siparişi → henüz olmamış, sözleşilmiş iş
//   satış fişi / alış fişi         → fiilen olmuş, stoğu ve cariyi hareket ettiren belge
//
// Stok hareketinin kaynağı kayıtta "Satınalma" yazıyor ve ekranda da öyle görünüyordu; oysa o
// satır bir ALIŞ FİŞİDİR. "Satınalma" kelimesi işi hâlâ sipariş aşamasındaymış gibi gösteriyordu.
//
// KAYITTAKİ DEĞER DEĞİŞTİRİLMEDİ, yalnızca ekran adı eşleniyor: `kaynak` alanı bütün geçmiş
// kayıtlarda ve süzgeç karşılaştırmalarında kullanılıyor; onu değiştirmek veri göçü gerektirirdi
// ve eski kayıtlar süzgeçlerin dışında kalırdı.
function kaynakEtiketi(kaynak, gruplar) {
  if (kaynak === "Üretim") return uretimKaynakEtiketi(gruplar);
  if (kaynak === "Satınalma") return "Alış Fişi";
  if (kaynak === "Satış") return "Satış Fişi";
  return kaynak;
}

// ÜRETİM KAYNAKLI HAREKETLERİN ETİKETİ — yöne göre.
//
// Aynı kaynak ("Üretim") iki farklı anlama geliyor:
//   mamulde  → üretim bitti, mal stoğa GİRDİ
//   hammaddede → malzeme üretime ÇIKTI
// Sabit "Üretimden Giriş" yazmak, hammadde kartlarında yanlış bir cümle kuruyordu.
// Kategoriye bakmak yerine hareketlerin İŞARETİNE bakılıyor: kategori yanlış girilmiş olabilir,
// hareketin işareti ise fiilen ne olduğunu söyler.
function uretimKaynakEtiketi(gruplar) {
  let giris = 0;
  let cikis = 0;
  (gruplar || []).forEach((g) => {
    if (g.kaynak !== "Üretim") return;
    (g.hareketler || []).forEach((h) => {
      if ((h.miktar || 0) > 0) giris += 1;
      else if ((h.miktar || 0) < 0) cikis += 1;
    });
  });
  if (giris > 0 && cikis === 0) return "Üretimden Giriş";
  if (cikis > 0 && giris === 0) return "Üretime Çıkış";
  return "Üretim";   // karışıksa yön iddia edilmiyor
}
