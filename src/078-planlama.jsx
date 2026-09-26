// ================= TEDARİK PLANLAMA =================
//
// 19 Eylül (2. madde, 12. tur): satış siparişini karşılamak için üretim açma, satın alma siparişi
// açma ve hammadde satın alma planlama.
//
// KURALLAR:
//   • KALEM İKİYE BÖLÜNÜR: kısmi planlamada kalemin planlanan parçası ayrı, kalan parçası ayrı
//     kayıt olur. Miktarı azaltmak, kalan miktarı sessizce kaybetmek ve bir daha planlanamaz hale
//     getirmek demekti. (Üst matris bu bölünmeyi göstermez — bkz. v1.339.0.)
//   • REZERVASYON DEFTERİ: üretim kararı alındığında MEVCUT stoktan da ayırmak gerekir; o
//     miktarın alışı yoktur, dolayısıyla alış kaleminde izi de yoktur. Ayrı defter tutuluyor.
//   • Aynı ürün/renk/beden için FARKLI fişlere planlanmış tekrar eden kalemler otomatik
//     birleştirilmiyor: ayrı tedarik kayıtlarını temsil ediyorlar, birleştirmek hangi malın
//     hangi fişten geldiğini kaybettirirdi.
function usePlanlama(d) {
  const {
    uretim, stok, tanimlar, siparisler, cariler, stokRezervasyonlari, showToast,
    setUretim, setSiparisler, setStokRezervasyonlari, setStok, cop,
  } = d;

const planlaUretim = useCallback((satisSiparisId, girdiler) => {
  const girdiListesi = (Array.isArray(girdiler) ? girdiler : [girdiler])
    .map((x) => (typeof x === "string" ? { kalemId: x, miktar: null } : x));
  setSiparisler((prevSiparisler) => {
    const satisSiparis = prevSiparisler.find((s) => s.id === satisSiparisId);
    if (!satisSiparis) return prevSiparisler;

    // Aynı renkteki kalemleri tek üretim siparişinde topla
    const renkGruplari = {};
    girdiListesi.forEach((g) => {
      const k = satisSiparis.kalemler.find((x) => x.id === g.kalemId);
      if (!k) return;
      const kalan = k.miktar - (k.karsilanan || 0);
      const miktar = g.miktar != null ? Math.min(g.miktar, kalan) : kalan;
      if (miktar <= 0) return;
      if (!renkGruplari[k.renk]) renkGruplari[k.renk] = [];
      renkGruplari[k.renk].push({ kalemId: k.id, beden: k.beden, miktar, urunAd: k.urunAd, urunId: k.urunId, ambalaj: k.ambalaj || null });
    });

    const yeniUretimler = [];
    const referanslar = {}; // kalemId -> uretimNo
    // HATA DÜZELTMESİ: numara eskiden `uretim.length` üzerinden üretiliyordu. Bir üretim siparişi
    // silindiğinde dizi kısalıyor ve BİR SONRAKİ planlama, hâlâ kullanımda olan bir numarayı
    // yeniden veriyordu. İki farklı üretim aynı numarayı taşıyınca, satış kalemlerinin
    // `planlama.referansNo` bağlantısı yanlış kayda gidiyor; silme işlemi de ilgisiz kalemlerin
    // planlamasını temizliyordu. Doğrusu: dizinin uzunluğu değil, KULLANILMIŞ EN BÜYÜK numara.
    // SİLİNENLER DE SAYILIYOR: numara serbest kalmıyor, çöpteki üretimin numarası yeniden
    // verilmiyor. Aksi halde eski etiket ve parça barkodları yeni üretime aitmiş gibi görünürdü.
    let sayac = enBuyukUretimNo(uretim, cop) - URETIM_NO_TABAN;
    Object.entries(renkGruplari).forEach(([renk, satirlar]) => {
      sayac++;
      const uretimNo = String(URETIM_NO_TABAN + sayac);
      const urun = stok.find((p) => p.id === satirlar[0].urunId);
      // Elle açılan üretimle AYNI adım kuralı (v1.477.0, `uretimProsesAdimlari`): ara prosesler baştan
      // yerinde (önceden iş verilirken sonradan ekleniyordu) ve ara proses adı normal adım olmuyor.
      const prosesIlerleme = uretimProsesAdimlari(urun, renk, tanimlar);
      yeniUretimler.push({
        id: uid("uretim"),
        siparisNo: uretimNo,
        // takipKodu: barkod/tarama amaçlı, siparisNo'dan BAĞIMSIZ bir alan — siparisNo fiş/cari takibinde
        // kullanılan iş mantığına bağlıyken, takipKodu sadece bu üretimi (kendi id'sinden) bulmak için
        // kullanılır. İkisi ayrı tutulduğu için biri değişse/yeniden adlandırılsa bile diğeri etkilenmez.
        takipKodu: uretimNo,
        // rezervasyonSiparisId: bu üretimi TALEP EDEN satış siparişinin GERÇEK kimliği (id, siparisNo
        // değil). Üretim tamamlanıp mamul stoğa eklendiğinde bu kimlik stok hareketine de taşınır —
        // böylece "bu ürün hangi satıştan geldi" sorusu tahmine değil, kesin bir zincire dayanır.
        rezervasyonSiparisId: satisSiparisId,
        // Kutu bilgisi üretim emrine KOPYALANIR (referansla bırakılmaz): atölyedeki kişi üretim
        // kartına baktığında hangi kutuya gireceğini görmeli, satış siparişini açmak zorunda
        // kalmamalı. Ayrıca satış siparişi sonradan değişse bile o an basılmış emir tutarlı kalır.
        // Kutu tercihi ÖNCE kalemden, yoksa siparişten alınır — kutu artık kalem bazında
        // seçiliyor (bkz. ambalajRengiUygula). Yalnızca siparişe bakmak, kalem bazlı seçimi
        // görmüyordu ve üretim hep reçetedeki varsayılan kutuyu (Standart) tüketiyordu.
        ambalaj: (() => {
          const kalemAmbalaj = satirlar.find((x) => x.ambalaj && x.ambalaj.renk);
          if (kalemAmbalaj) return kalemAmbalaj.ambalaj;
          const kaynakSip = siparisler.find((x) => x.id === satisSiparisId);
          return kaynakSip && kaynakSip.ambalaj && kaynakSip.ambalaj.renk ? kaynakSip.ambalaj : null;
        })(),
        model: satirlar[0].urunAd,
        adet: satirlar.reduce((s, x) => s + x.miktar, 0),
        beden: `${renk} · ${satirlar.map((x) => `${x.beden}:${x.miktar}`).join(", ")}`,
        urunId: satirlar[0].urunId,
        renk,
        bedenMiktarlari: satirlar.map((x) => ({ beden: x.beden, miktar: x.miktar })),
        stogaEklendiMi: false,
        prosesIlerleme,
        termin: "",
        not: `Kaynak: ${satisSiparis.siparisNo}`,
        asama: "Planlandı",
        olusturuldu: new Date().toISOString(),
      });
      satirlar.forEach((x) => { referanslar[x.kalemId] = uretimNo; });
    });
    if (yeniUretimler.length === 0) return prevSiparisler;

    const nextUretim = [...yeniUretimler, ...uretim];
    setUretim(nextUretim);
    yazimiIzle(tabloYaz("uretim:siparisler", "uretim", nextUretim), "Üretim", nextUretim);

    // ---- OTOMATİK HAMMADDE REZERVASYONU ----
    // Üretim kararı alındığı an, reçeteye göre gereken hammaddenin MEVCUT STOKTA bulunan kısmı
    // bu siparişe ayrılır. Ayırmazsak, aynı malzeme başka bir siparişin üretimine gidebilir ve
    // bu sipariş üretime girdiğinde malzeme yok olur — eksik ancak o anda fark edilir.
    //
    // Yalnızca SERBEST (başka siparişe ayrılmamış) miktar rezerve edilir; zaten rezerve olanı
    // ikinci kez ayırmak, aynı malı iki siparişe söz vermek olurdu.
    // Stokta olmayan kısım rezerve EDİLMEZ — o, satın alma ile karşılanır ve alış rezervasyonu
    // olarak zaten kaydediliyor.
    const yeniStokRez = [];
    yeniUretimler.forEach((u) => {
      const mamul = uretimUrunu(u, stok);
      if (!mamul || !Array.isArray(mamul.recete)) return;
      const toplamAdet = (u.bedenMiktarlari || []).reduce((t, bm) => t + (bm.miktar || 0), 0);
      // Hammadde+renk+beden bazında toplam ihtiyaç
      const ihtiyac = {};
      mamul.recete
        .filter((r) => r.mamulRenk === u.renk)
        .forEach((r) => {
          const bm = (u.bedenMiktarlari || []).find((x) => x.beden === r.mamulBeden);
          const adet = r.mamulBeden === "Tüm Bedenler" ? toplamAdet : (bm ? bm.miktar : 0);
          if (!adet) return;
          const etkinRenk = ambalajRengiUygula(r, u, stok);
          const anahtar = `${r.hammaddeUrunId}|${etkinRenk}|${r.beden}`;
          if (!ihtiyac[anahtar]) {
            ihtiyac[anahtar] = { urunId: r.hammaddeUrunId, ad: r.hammaddeAd, renk: etkinRenk, beden: r.beden, birim: hammaddeBirimi(r.hammaddeUrunId, stok, r.birim), miktar: 0 };
          }
          ihtiyac[anahtar].miktar = stokYuvarla(ihtiyac[anahtar].miktar + r.miktar * adet);
        });

      Object.values(ihtiyac).forEach((h) => {
        if (!(h.miktar > 0)) return;
        // AYNI ÜRETİM İÇİN İKİNCİ KEZ REZERVASYON YAZILMAZ.
        //
        // Bildirilen belirti: bir malzemenin talep listesinde AYNI sipariş dört kez, hepsi
        // "talep 20". Planlama aynı üretim için tekrar çalıştığında rezervasyon defterine ikinci
        // bir kayıt ekliyordu; talep de o kadar kat büyüyordu.
        //
        // Anahtar (üretim no + malzeme): bir üretimin bir malzemeye ihtiyacı TEK bir taleptir.
        // Miktar değiştiyse doğru davranış eskisini güncellemek olurdu; ama planlama miktarı
        // yeniden hesapladığı için ikinci yazımı ATLAMAK yeterli — eski kayıt zaten aynı hesabın
        // sonucu. Kullanıcı üretimi değiştirdiyse planlamayı temizleyip yeniden planlıyor.
        const zatenVar = [...(stokRezervasyonlari || []), ...yeniStokRez].some((r) =>
          r.uretimNo === u.siparisNo && r.urunId === h.urunId && r.renk === h.renk && r.beden === h.beden);
        if (zatenVar) return;
        // Rezervasyon TAM İHTİYAÇ kadar yazılır — stokta olan kadarıyla SINIRLANMAZ.
        //
        // Rezervasyon bir TALEPTİR: "bu sipariş bu malzemeden şu kadar isteyecek". Talebi stokla
        // kısmak, mevcut olmayanı hiç talep etmemek demekti; o zaman açık ihtiyaç görünmez ve
        // satın alma neye göre yapılacağını bilemezdi.
        //
        // Stokun yetip yetmediği AYRI bir hesaptır (bkz. rezervasyonKarsilama): talepler stoğa
        // tarih sırasıyla dağıtılır, karşılanamayan kısım "açık" olarak kalır ve satın almayı o
        // sayı yönlendirir.
        yeniStokRez.push({
          id: uid("srez"),
          urunId: h.urunId, urunAd: h.ad, renk: h.renk, beden: h.beden, birim: h.birim,
          siparisId: satisSiparisId, siparisNo: satisSiparis.siparisNo,
          uretimNo: u.siparisNo,
          miktar: h.miktar, tuketilen: 0,
          tarih: new Date().toISOString(),
        });
      });
    });

    if (yeniStokRez.length > 0) {
      const nextStokRez = [...stokRezervasyonlari, ...yeniStokRez];
      setStokRezervasyonlari(nextStokRez);
      yazimiIzle(tabloYaz("stokrez:data", "stok_rezervasyonlari", nextStokRez), "Stok rezervasyonları", nextStokRez);
    }

    // ÖNEMLİ: bir kalemin SADECE BİR KISMI planlanmışsa (örn. 2 çiftlik bir kalemin 1 çifti üretime
    // verildiyse), o kalemi OLDUĞU GİBİ "planlandı" işaretlemek YANLIŞTIR — geri kalan (planlanmamış)
    // miktar sessizce kaybolur, bir daha planlanamaz hale gelir. Bunun yerine kalem İKİYE BÖLÜNÜR:
    // planlanan miktar kadar bir kalem (planlama dolu) + kalan miktar kadar YENİ bir kalem (planlama
    // boş, hâlâ "bekleyen" listesinde görünmeye devam eder).
    const girdiMiktarlari = {}; // kalemId -> bu çağrıda planlanan miktar
    girdiListesi.forEach((g) => {
      const k = satisSiparis.kalemler.find((x) => x.id === g.kalemId);
      if (!k) return;
      const kalanOncesi = k.miktar - (k.karsilanan || 0);
      const planlanan = g.miktar != null ? Math.min(g.miktar, kalanOncesi) : kalanOncesi;
      if (planlanan > 0) girdiMiktarlari[g.kalemId] = planlanan;
    });

    const nextSiparisler = prevSiparisler.map((s) => {
      if (s.id !== satisSiparisId) return s;
      const yeniKalemler = [];
      s.kalemler.forEach((k) => {
        const uretimNo = referanslar[k.id];
        const planlananMiktar = girdiMiktarlari[k.id];
        if (!uretimNo || !planlananMiktar) { yeniKalemler.push(k); return; }
        const kalanOncesi = k.miktar - (k.karsilanan || 0);
        if (planlananMiktar >= kalanOncesi) {
          // Kalemin TÜM kalan miktarı planlandı — bölmeye gerek yok, doğrudan işaretle.
          yeniKalemler.push({ ...k, planlama: { tip: "Üretim", referansNo: uretimNo } });
        } else {
          // KISMİ planlama: kalemi ikiye böl. İlk parça (planlananMiktar kadar) planlanmış sayılır;
          // ikinci parça (kalan fark) YENİ bir kalem olarak, planlanmamış şekilde eklenir — böylece
          // "Tedarik Planlama" ekranında hâlâ bekleyen olarak görünüp AYRICA planlanabilir. Orijinal
          // kalemde ZATEN teslim alınmış (karsilanan) bir miktar varsa, bu bilgi İLK (planlanan)
          // parçaya aktarılır — planlananMiktar zaten "karşılanmamış" kısımdan hesaplandığı için bu
          // tutarlıdır; ikinci (yeni ayrılan, henüz hiç planlanmamış) parça her zaman karsilanan=0'dır.
          yeniKalemler.push({ ...k, miktar: planlananMiktar + (k.karsilanan || 0), planlama: { tip: "Üretim", referansNo: uretimNo } });
          yeniKalemler.push({ ...k, id: uid("kalem"), miktar: k.miktar - planlananMiktar - (k.karsilanan || 0), karsilanan: 0, planlama: null });
        }
      });
      return { ...s, kalemler: yeniKalemler };
    });
    yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparisler), "Siparişler", nextSiparisler);
    showToast(
      yeniUretimler.length === 1
        ? `${yeniUretimler[0].siparisNo} üretim siparişi oluşturuldu`
        : `${yeniUretimler.length} üretim siparişi oluşturuldu`
    );
    return nextSiparisler;
  });
}, [uretim, stok, tanimlar, siparisler, stokRezervasyonlari, showToast, cop]);

// Bir veya birden fazla kalemi (farklı renk/beden dahil) TEK bir Alış siparişinde, seçilen TEK tedarikçiye planlar.
// girdiler: kalemId string dizisi (kalan tam miktar) YA DA {kalemId, miktar} çiftleri (özel adet).
const planlaSatinAlma = useCallback((satisSiparisId, girdiler, cariId) => {
  const girdiListesi = (Array.isArray(girdiler) ? girdiler : [girdiler])
    .map((x) => (typeof x === "string" ? { kalemId: x, miktar: null } : x));
  setSiparisler((prevSiparisler) => {
    const satisSiparis = prevSiparisler.find((s) => s.id === satisSiparisId);
    if (!satisSiparis) return prevSiparisler;

    const alisKalemleri = [];
    const referanslar = {}; // kalemId -> bu çağrıda planlanan miktar (0'dan büyükse referans oluşur)
    girdiListesi.forEach((g) => {
      const k = satisSiparis.kalemler.find((x) => x.id === g.kalemId);
      if (!k) return;
      const kalan = k.miktar - (k.karsilanan || 0);
      const miktar = g.miktar != null ? Math.min(g.miktar, kalan) : kalan;
      if (miktar <= 0) return;
      const urun = stok.find((p) => p.id === k.urunId);
      alisKalemleri.push({
        id: uid("kalem"), urunId: k.urunId, urunAd: k.urunAd, birim: k.birim,
        renk: k.renk, beden: k.beden, miktar, birimFiyat: (urun && urun.alisFiyati) || 0, karsilanan: 0,
      });
      referanslar[k.id] = miktar;
    });
    if (alisKalemleri.length === 0) return prevSiparisler;

    const alisNo = sonrakiSiparisNo(prevSiparisler, "ALS-");

    const yeniAlisSiparisi = {
      id: uid("sip"),
      siparisNo: alisNo,
      tip: "Alış", cariId,
      tarih: bugunYerel(), teslimTarihi: "",
      not: `Kaynak: ${satisSiparis.siparisNo}`,
      // rezervasyonSiparisId: bu alışı TALEP EDEN satış siparişinin GERÇEK kimliği (id). Alış teslim
      // alınıp stoğa girdiğinde bu kimlik stok hareketine de taşınır — "bu ürün hangi satıştan geldi"
      // sorusu artık tahmine değil, kesin bir zincire dayanır.
      rezervasyonSiparisId: satisSiparisId,
      durum: "Bekliyor",
      kalemler: alisKalemleri,
      teslimSayaci: 0,
      // Bağlı satış siparişinde daha önce bir defter tercihi seçildiyse, oluşan alış siparişi de
      // aynı tercihle başlar — kullanıcı tekrar seçmek zorunda kalmaz.
      defterTercihi: satisSiparis.defterTercihi || "",
      olusturuldu: new Date().toISOString(),
    };

    // ÖNEMLİ: bir kalemin SADECE BİR KISMI planlanmışsa, kalemi olduğu gibi "planlandı" işaretlemek
    // YANLIŞTIR — geri kalan (planlanmamış) miktar sessizce kaybolur. Bunun yerine kalem İKİYE
    // BÖLÜNÜR: planlanan miktar kadar bir kalem (planlama dolu) + kalan miktar kadar YENİ bir kalem
    // (planlama boş, hâlâ "bekleyen" listesinde görünmeye devam eder) — üretim planlamasıyla BİREBİR
    // aynı mantık (bkz. planlaUretim).
    const nextKalemli = prevSiparisler.map((s) => {
      if (s.id !== satisSiparisId) return s;
      const yeniKalemler = [];
      s.kalemler.forEach((k) => {
        const planlananMiktar = referanslar[k.id];
        if (!planlananMiktar) { yeniKalemler.push(k); return; }
        const kalanOncesi = k.miktar - (k.karsilanan || 0);
        if (planlananMiktar >= kalanOncesi) {
          yeniKalemler.push({ ...k, planlama: { tip: "Satınalma", referansNo: alisNo } });
        } else {
          yeniKalemler.push({ ...k, miktar: planlananMiktar + (k.karsilanan || 0), planlama: { tip: "Satınalma", referansNo: alisNo } });
          yeniKalemler.push({ ...k, id: uid("kalem"), miktar: k.miktar - planlananMiktar - (k.karsilanan || 0), karsilanan: 0, planlama: null });
        }
      });
      return { ...s, kalemler: yeniKalemler };
    });
    const nextSiparisler = [yeniAlisSiparisi, ...nextKalemli];
    yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparisler), "Siparişler", nextSiparisler);
    showToast(`${alisNo} alış siparişi oluşturuldu (${alisKalemleri.length} kalem)`);
    return nextSiparisler;
  });
}, [stok, showToast]);

// HAMMADDE SATIN ALMA — Planlama > Sipariş İhtiyaç Planlama ekranından çağrılır.
// planlaSatinAlma'dan (mamul satın alma) BİLİNÇLİ OLARAK ayrı tutulmuştur; ikisi farklı şeylerdir:
//   • planlaSatinAlma: MAMULÜ dışarıdan hazır alır -> satış kalemini "Satınalma" olarak işaretler,
//     gerekirse kalemi ikiye böler, o kalem artık üretilmeyeceği için hammadde ihtiyacından düşer.
//   • planlaHammaddeSatinAlma: mamul yine BİZDE üretilecek, sadece GİRDİSİ satın alınır -> satış
//     kalemine HİÇ DOKUNMAZ. Kaleme dokunmak, MRP'nin o mamulü "dışarıdan gelecek" sanıp hammadde
//     ihtiyacını tamamen silmesine yol açardı.
//
// `talepler`: [{ hammaddeUrunId, hammaddeAd, renk, beden, birim, miktar,
//                rezervasyonlar: [{ siparisId, siparisNo, miktar }] }]
// Birden fazla hammadde kalemi ve her kalemde birden fazla kaynak satış siparişi olabilir; hepsi
// TEK bir alış siparişinde toplanır (tedarikçi ortak olduğu için), ama rezervasyon kaydı kalem
// kalem, sipariş sipariş ayrı tutulur.
const planlaHammaddeSatinAlma = useCallback((talepler, cariId) => {
  const gecerli = (talepler || [])
    .map((t) => ({ ...t, miktar: Math.round((parseFloat(t.miktar) || 0) * 100) / 100 }))
    .filter((t) => t.hammaddeUrunId && t.miktar > 0);
  if (gecerli.length === 0) { showToast("Sipariş edilecek bir miktar girilmedi"); return; }
  if (!cariId) { showToast("Önce bir tedarikçi seçin"); return; }

  setSiparisler((prev) => {
    const alisNo = sonrakiSiparisNo(prev, "ALS-");
    const tumKaynakIdler = new Set();
    const kaynakNolar = new Set();

    const kalemler = gecerli.map((t) => {
      const urun = stok.find((p) => p.id === t.hammaddeUrunId);
      // Rezervasyon toplamı kalem miktarını AŞAMAZ. Kullanıcı ihtiyaçtan FAZLA sipariş verirse
      // (ör. minimum sipariş adedi yüzünden), fazlalık hiçbir siparişe atfedilmez — serbest stoktur.
      // Kullanıcı ihtiyaçtan AZ sipariş verirse paylar orantılı olarak küçültülür.
      const ham = (t.rezervasyonlar || []).filter((r) => r.siparisId && (r.miktar || 0) > 0);
      const hamToplam = ham.reduce((s, r) => s + r.miktar, 0);
      const olcek = hamToplam > t.miktar && hamToplam > 0 ? t.miktar / hamToplam : 1;
      const rezervasyonlar = ham
        .map((r) => {
          tumKaynakIdler.add(r.siparisId);
          if (r.siparisNo) kaynakNolar.add(r.siparisNo);
          // tuketilen: üretimde kullanılan pay. Yeni kayıtlar 0 ile başlar; eski kayıtlarda alan yoksa
          // rezervasyonKalan() onu 0 sayar, bu yüzden veri göçü gerekmez.
          return { siparisId: r.siparisId, siparisNo: r.siparisNo || null, miktar: Math.round(r.miktar * olcek * 100) / 100, tuketilen: 0 };
        })
        .filter((r) => r.miktar > 0);

      return {
        id: uid("kalem"),
        urunId: t.hammaddeUrunId,
        urunAd: t.hammaddeAd || (urun ? urun.ad : ""),
        birim: t.birim || (urun ? urun.birim : ""),
        renk: t.renk, beden: t.beden, miktar: t.miktar,
        birimFiyat: (urun && urun.alisFiyati) || 0,
        karsilanan: 0,
        rezervasyonlar,
      };
    });

    const idListesi = Array.from(tumKaynakIdler);
    const yeniAlis = {
      id: uid("sip"),
      siparisNo: alisNo,
      tip: "Alış",
      cariId,
      tarih: bugunYerel(),
      teslimTarihi: "",
      hammaddeTalebiMi: true,
      rezervasyonSiparisIdleri: idListesi,
      // Tek kaynak varsa eski alan da doldurulur — stok hareketine taşınan zincir (bkz.
      // siparisGerceklestir) böylece hiç değiştirilmeden çalışmaya devam eder. Çok kaynaklıysa
      // tekil alan BİLEREK boş bırakılır: rastgele birini seçmek yanlış bir zincir üretirdi.
      rezervasyonSiparisId: idListesi.length === 1 ? idListesi[0] : null,
      not: kaynakNolar.size > 0
        ? `Hammadde ihtiyacı — Kaynak: ${Array.from(kaynakNolar).join(", ")}`
        : "Hammadde ihtiyacı",
      durum: "Bekliyor",
      kalemler,
      teslimSayaci: 0,
      olusturuldu: new Date().toISOString(),
    };

    const next = [yeniAlis, ...prev];
    yazimiIzle(tabloYaz("siparis:data", "siparisler", next), "Siparişler", next);
    showToast(
      `${alisNo} hammadde alış siparişi oluşturuldu — ${kalemler.length} kalem` +
      (idListesi.length > 1 ? `, ${idListesi.length} satış siparişine rezerve` : "")
    );
    return next;
  });
}, [stok, showToast]);

  return { planlaUretim, planlaSatinAlma, planlaHammaddeSatinAlma };
}
