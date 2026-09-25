   ============================================================================================= */

// Küçük yuvarlama farkları bulgu sayılmaz: para ve miktar hesapları kayan noktalı sayıyla
// yapılıyor, 0,0000001 fark gerçek bir tutarsızlık değil.
const TUTARLILIK_TOLERANS = 0.01;
const yakinMi = (a, b) => Math.abs((a || 0) - (b || 0)) <= TUTARLILIK_TOLERANS;

function veriTutarliligiDenetle({ stok, cariler, siparisler, tanimlar, fisDefteri, muhasebe, uretim, stokRezervasyonlari }) {
  const bulgular = [];
  const ekle = (agirlik, kod, baslik, detay, ipucu, veri) =>
    bulgular.push({ agirlik, kod, baslik, detay, ipucu, veri });


  const cariIndex = new Map((cariler || []).map((c) => [c.id, c]));
  const siparisIndex = new Map((siparisler || []).map((x) => [x.id, x]));

  // ---- Tüm hareketleri tek listede topla -------------------------------------------------
  const stokHareketleri = [];
  (stok || []).forEach((p) => {
    (p.hareketler || []).forEach((h) => stokHareketleri.push({ ...h, urunId: p.id, urunAd: p.ad }));
  });

  // ---- HAYALET KARŞILANAN (kullanıcı, 20 Eylül) ------------------------------------------
  //
  // Kullanıcı: *"Sipariş toplamı 136 çift ama planlayabileceğim 120 çift görünüyor... üretim ve
  // sevkiyatlarını silip yeniden planlarken oluşan durum."*
  //
  // Sipariş kaleminin `karsilanan` değeri, o siparişe kesilen fişlerdeki GERÇEK sevk toplamından
  // fazlaysa aradaki fark hayalettir: sevkiyat silinmiş ama sayaç geri alınmamış. Sonuç, siparişin
  // bir kısmının planlanamaması — 136 çiftlik siparişte 120 çift planlanabiliyor, 16 çift hiçbir
  // yerde görünmeden kayboluyor.
  //
  // ÖLÇÜ STOK HAREKETLERİ: fiş defteri değil, çünkü sevk edilen mal stoktan çıkar ve o hareket
  // siparişin kimliğini taşır. Hareket yoksa sevk de olmamıştır.
  (siparisler || []).forEach((sp) => {
    if (!sp || !Array.isArray(sp.kalemler)) return;
    const sevkEdilen = {};
    stokHareketleri.forEach((h) => {
      if (h.siparisId !== sp.id) return;
      const adet = sp.tip === "Alış" ? (h.miktar || 0) : -(h.miktar || 0);
      if (adet <= 0) return;
      const anahtar = `${h.urunId}|${h.renk || ""}|${h.beden || ""}`;
      sevkEdilen[anahtar] = (sevkEdilen[anahtar] || 0) + adet;
    });
    sp.kalemler.forEach((k) => {
      const kayitli = k.karsilanan || 0;
      if (kayitli <= 0) return;
      const gercek = sevkEdilen[`${k.urunId}|${k.renk || ""}|${k.beden || ""}`] || 0;
      if (kayitli - gercek > TUTARLILIK_TOLERANS) {
        ekle(
          "uyari", "hayalet-karsilanan",
          "Karşılanan miktar hareketlerden fazla",
          `${sp.siparisNo} · ${k.urunAd} ${k.renk} ${k.beden}: kayıtlı karşılanan ${kayitli}, `
          + `stok hareketlerinde ${gercek} — aradaki ${kayitli - gercek} adet planlanamıyor.`,
          "Sevkiyat ya da üretim silindiğinde sayaç geri alınmamış. Onarım, karşılananı gerçek sevk miktarına çeker.",
          { siparisId: sp.id, kalemId: k.id, gercek }
        );
      }
    });
  });

  const cariHareketleri = [];
  (cariler || []).forEach((c) => {
    (c.hareketler || []).forEach((h) => cariHareketleri.push({ ...h, cariId: c.id, cariUnvan: c.unvan }));
  });

  // ---- 1) FİŞSİZ HAREKET ------------------------------------------------------------------
  // Fiş numarası olmayan bir hareket hiçbir belgeye bağlanamaz: ne iptal edilebilir, ne
  // denetlenebilir. Kodda yasak (12. denetim), ama eski kayıtlarda kalmış olabilir.
  stokHareketleri.filter((h) => !h.fisNo).forEach((h) => {
    ekle("yuksek", "fissiz-stok", "Fişsiz stok hareketi",
      `${h.urunAd} · ${h.renk} · ${h.beden} · ${h.miktar}`,
      "Bu hareket hiçbir fişe bağlı değil; iptal edilemez ve izlenemez.");
  });
  cariHareketleri.filter((h) => !h.fisNo).forEach((h) => {
    ekle("yuksek", "fissiz-cari", "Fişsiz cari hareketi",
      `${h.cariUnvan} · ${h.yon} ${h.tutar} ${h.paraBirimi || "TRY"}`,
      "Bu hareket hiçbir fişe bağlı değil; iptal edilemez ve izlenemez.");
  });

  // ---- 2) SİPARİŞ KARŞILANANI ↔ STOK HAREKETLERİ ------------------------------------------
  // Siparişin "karşılanan" alanı, o kaleme ait stok hareketlerinin toplamı olmalı. Tutmuyorsa
  // ya bir teslim kaydı silindi ama sipariş geri alınmadı (fiş silme yolu bunu yapmıyordu),
  // ya da tersi. Sonucu ağır: kalem bir daha teslim alınamaz ya da iki kez alınır.
  const kalemHareketToplami = new Map();
  stokHareketleri.forEach((h) => {
    if (!h.siparisId || !h.kalemId) return;
    const anahtar = `${h.siparisId}|${h.kalemId}`;
    kalemHareketToplami.set(anahtar, (kalemHareketToplami.get(anahtar) || 0) + Math.abs(h.miktar || 0));
  });
  (siparisler || []).forEach((sip) => {
    (sip.kalemler || []).forEach((k) => {
      const beklenen = kalemHareketToplami.get(`${sip.id}|${k.id}`) || 0;
      const yazan = k.karsilanan || 0;
      if (yakinMi(beklenen, yazan)) return;
      ekle("yuksek", "siparis-karsilanan", "Sipariş karşılananı hareketlerle uyuşmuyor",
        `${sip.siparisNo} · ${k.urunAd} · ${k.renk} · ${k.beden} — siparişte ${yazan}, stok hareketlerinde ${beklenen}`,
        yazan > beklenen
          ? "Teslim kaydı silinmiş ya da buluta yazılamamış: siparişte var, stokta yok. \"Fişten yeniden yaz\" eksik hareketi siparişin fişinden üretir."
          : "Stokta bu kaleme ait fazladan hareket var: kalem iki kez teslim alınmış olabilir.",
        // Onarım için gereken her şey: hangi sipariş, hangi kalem, kaç eksik.
        { siparisId: sip.id, kalemId: k.id, eksik: Math.round((yazan - beklenen) * 100) / 100 });
    });
  });

  // ---- 2b) FİŞ DEFTERİ ↔ STOK HAREKETLERİ (15 Eylül, Adım 2) --------------------------------
  // Defter doğruluğun kaynağı: iptal edilmemiş bir fişin her stok hareketi stokta da olmalı.
  // Yoksa hareket kaybolmuştur (yazma yarım kaldı, kayıt silindi) — ve defterde kesin kaydı
  // durduğu için TAHMİNE gerek yok, birebir yeniden yazılabilir.
  const stokHareketIdleri = new Set(stokHareketleri.map((h) => h.id));
  (fisDefteri || []).forEach((f) => {
    if (f.iptal) return;
    (f.stokHareketleri || []).forEach((h) => {
      if (!h.id || stokHareketIdleri.has(h.id)) return;
      ekle("yuksek", "defter-eksik-hareket", "Fiş defterinde var, stokta yok",
        `${f.fisNo} · ${h.urunAd || h.urunId} · ${h.renk} · ${h.beden} — ${h.miktar}`,
        "Defterdeki fiş kaydı bu hareketi içeriyor ama stok hareketlerinde yok. \"Defterden yeniden kur\" hareketi birebir geri yazar (tahmin değil, kayıttan).",
        { fisNo: f.fisNo, hareket: h });
    });
  });
  // Tersi de denetlenir: stokta olup defterde olmayan hareket — eski kayıtlar (defterden önce
  // kesilmiş fişler) buraya düşer, o yüzden BİLGİ ağırlığında.
  const defterHareketIdleri = new Set((fisDefteri || []).flatMap((f) => (f.stokHareketleri || []).map((h) => h.id)).filter(Boolean));
  if ((fisDefteri || []).length > 0) {
    const defterDisi = stokHareketleri.filter((h) => h.id && !defterHareketIdleri.has(h.id));
    if (defterDisi.length > 0) {
      ekle("dusuk", "defter-disi-hareket", "Fiş defterinde olmayan stok hareketi",
        `${defterDisi.length} hareket (en eskisi: ${defterDisi[defterDisi.length - 1].fisNo || "fişsiz"})`,
        "Bunlar fiş defteri kurulmadan (15 Eylül) önce kesilmiş fişlerin hareketleridir; sorun değildir. Defter kurulduktan sonra oluşan bir hareket buraya düşerse fiş yolu dışından yazılmış demektir.");
    }
  }

  // ---- 2c) PARA HAREKETİNİN KASA/BANKA KARŞILIĞI YOK (17 Eylül) ----------------------------
  // Ödeme/tahsilat bir PARA hareketidir: bir hesaba girer ya da bir hesaptan çıkar. Karşılığı
  // yoksa cari bakiyesi değişmiş ama kasa bakiyesi değişmemiştir — "bu para nereye girdi?"
  // sorusunun cevabı kayıtta yoktur. (v1.314.0'dan itibaren hesap seçimi zorunlu; bu kural eski
  // kayıtları bulmak için.)
  (cariler || []).forEach((c) => {
    (c.hareketler || []).forEach((h) => {
      const tip = h.islemTipi || (/^(Ödeme|Tahsilat)\b/.test(h.aciklama || "") ? (h.aciklama || "").split(/[\s(·:]/)[0] : null);
      if (tip !== "Ödeme" && tip !== "Tahsilat") return;
      if (h.muhasebeBagId || h.hesapAd) return;   // karşılığı var
      if (h.odemeSekli === "Çek" || h.odemeSekli === "Senet") return;   // çek kasaya girmez
      ekle("orta", "para-hareketi-hesapsiz", "Ödeme/tahsilatın kasa/banka karşılığı yok",
        `${c.unvan} · ${tarihYaz(h.tarih)} · ${tip} · ${(h.tutar || 0).toLocaleString("tr-TR")} ${h.paraBirimi || "TRY"}`,
        "Cari bakiyesi değişmiş ama para hiçbir kasaya/bankaya işlenmemiş. Kaydı silip kasa/banka seçerek yeniden girin — hangi hesaba gittiğini yalnız siz bilirsiniz, otomatik onarım tahmin olurdu.");
    });
  });

  // ---- 1b) KAYNAĞI BELİRSİZ STOK HAREKETİ (20 Eylül) ---------------------------------------
  //
  // Kullanıcı: *"Kayıtsız stok, hareket istemiyorum; neyin nereden geldiği belli olsun."*
  //
  // Üç ayrı kusur tek kuralda toplanıyor, çünkü üçü de aynı soruyu cevapsız bırakıyor:
  // "bu miktar nereden geldi?"
  //   • `fisOtomatik` — hareket fişsiz geldi, sistem sonradan numara uydurdu. Numara var ama
  //     o numaranın arkasında gerçek bir belge YOK.
  //   • `kaynak` boş — alış mı, üretim mi, sayım mı belli değil.
  //   • `fisNo` boş — hiçbir belgeye bağlı değil.
  //
  // ONARIM DÜĞMESİ YOK (bilerek): düzeltme, izi kalan bir işlemle yapılır — Bağımsız Stok Girişi
  // ile sayım fişi kesmek gibi. Sessizce alan doldurmak, sorunun üstünü örtmek olur.
  {
    const belirsizler = stokHareketleri.filter((h) => h.fisOtomatik || !h.kaynak || !h.fisNo);
    belirsizler.slice(0, 60).forEach((h) => {
      const sebep = !h.fisNo ? "fiş numarası yok"
        : (!h.kaynak ? "kaynağı yazılmamış" : "fişsiz geldi, numara sonradan verildi");
      ekle("uyari", "kaynaksiz-hareket", "Kaynağı belirsiz stok hareketi",
        `${h.urunAd} · ${h.renk || ""} ${h.beden || ""} · ${tarihYaz(h.tarih)} · ${h.miktar > 0 ? "+" : ""}${h.miktar} · ${sebep}`
        + (h.fisNo ? ` · ${h.fisNo}` : ""),
        "Bu hareketin arkasında gerçek bir belge yok. Miktar doğruysa dokunmayın; yanlışsa Bağımsız Stok Girişi ile sayım fişi kesip düzeltin — o zaman fark da iz bırakır.",
        { urunId: h.urunId, hareketId: h.id });
    });
    if (belirsizler.length > 60) {
      ekle("uyari", "kaynaksiz-hareket", "Kaynağı belirsiz stok hareketi",
        `… ve ${belirsizler.length - 60} hareket daha`,
        "Liste kısaltıldı.", null);
    }
  }

  // ---- 1c) KAYNAĞI BELİRSİZ CARİ HAREKETİ (20 Eylül) ---------------------------------------
  //
  // Stok tarafındaki kuralın aynısı, para tarafı için. Fiş numarası olmayan bir cari hareketi,
  // ekstrede "nereden çıktı" sorusunu cevapsız bırakır. Açılış bakiyeleri hariç tutuluyor:
  // onlar tanımı gereği belgesizdir ve `acilis` işaretiyle ayrılmıştır.
  (cariler || []).forEach((c) => {
    (c.hareketler || []).forEach((h) => {
      if (h.acilis || h.acilisMi) return;
      if (h.fisNo) return;
      ekle("uyari", "kaynaksiz-cari-hareketi", "Fiş numarası olmayan cari hareketi",
        `${c.unvan} · ${tarihYaz(h.tarih)} · ${h.yon || ""} · ${(h.tutar || 0).toLocaleString("tr-TR")} ${h.paraBirimi || "TRY"}`
        + (h.aciklama ? ` · ${h.aciklama}` : ""),
        "Ekstrede bu satırın arkasında belge yok. Yanlışsa hareketi silip doğru fişle yeniden girin.",
        { cariId: c.id, hareketId: h.id });
    });
  });

  // ---- 2e) HAYALET REZERVASYON (20 Eylül) --------------------------------------------------
  //
  // Üretim planlandığında hammadde için stok rezervasyonu yazılıyor (`uretimNo` alanıyla).
  // Üretim silindiğinde bu defter temizlenmiyordu: silinmiş üretimin talebi defterde kalıyor ve
  // Depo ekranında AÇIK İHTİYAÇ olarak görünüyordu. Kullanıcının bildirdiği belirti buydu —
  // "üretim ihtiyacı 0,30 adet ama talep 1,96 diyor".
  //
  // (v1.373.0'dan itibaren silme defteri de temizliyor; bu kural ESKİ kayıtları bulmak için.)
  {
    const uretimNolari = new Set((uretim || []).map((u) => String(u.siparisNo)));
    const hayaletler = (stokRezervasyonlari || []).filter(
      (r) => r && r.uretimNo && !uretimNolari.has(String(r.uretimNo))
        && Math.max(0, (r.miktar || 0) - (r.tuketilen || 0)) > 0
    );
    if (hayaletler.length > 0) {
      const toplam = hayaletler.reduce((t, r) => t + Math.max(0, (r.miktar || 0) - (r.tuketilen || 0)), 0);
      hayaletler.slice(0, 40).forEach((r) => {
        ekle("uyari", "hayalet-rezervasyon", "Silinmiş üretimin rezervasyonu duruyor",
          `Üretim ${r.uretimNo} · ${r.urunAd || r.urunId} ${r.renk || ""} ${r.beden || ""} · `
          + `kalan ${stokYuvarla(Math.max(0, (r.miktar || 0) - (r.tuketilen || 0)))}`,
          `Bu üretim artık yok ama talebi defterde duruyor; Depo'da açık ihtiyaç olduğundan yüksek `
          + `görünüyor (toplam ${stokYuvarla(toplam)} birim). Onarım, yetim kayıtları siler.`,
          { rezId: r.id || null, uretimNo: r.uretimNo });
      });
    }
  }

  // ---- 2d) KARŞILIKSIZ PARA HAREKETİ — KASA TARAFI (20 Eylül) ------------------------------
  //
  // 2c kuralı CARİ tarafından bakıyordu: "ekstrede ödeme var, kasada yok". Bu kural TERS yöne
  // bakıyor: kasada/bankada hareket var ama karşılığı yok. Para kasadan çıkmış, kime gittiği
  // yazılmamış — kasa bakiyesi doğru ama o para hiçbir yere bağlanmıyor ve kâr-zarar raporunda
  // görünmüyor (gider kartı olmadığı için).
  //
  // ÜÇ MEŞRU KARŞILIK VAR, sırayla bakılıyor:
  //   1. Virman — para iki hesap arasında gezdi, karşı ayağı `muhasebeBagId` ile eşleşir.
  //   2. Gider/gelir kartı — kira, elektrik gibi; cari yok ama karşılık var.
  //   3. Cari bağı — ödeme/tahsilat; karşı tarafın cari hareketi duruyor olmalı.
  //
  // (v1.322.0'dan beri yeni hareketlerde karşılık ZORUNLU; bu kural eski kayıtlar için.)
  const cariBagIdleri = new Set();
  (cariler || []).forEach((c) => {
    (c.hareketler || []).forEach((h) => { if (h.muhasebeBagId) cariBagIdleri.add(h.muhasebeBagId); });
  });
  const tumHesaplar = [
    ...((muhasebe && muhasebe.kasalar) || []).map((h) => ({ ...h, tur: "Kasa" })),
    ...((muhasebe && muhasebe.bankalar) || []).map((h) => ({ ...h, tur: "Banka" })),
  ];
  // Virman ayaklarını say: bir bağ kimliğinde iki hareket olmalı.
  const virmanSayaci = {};
  tumHesaplar.forEach((hes) => {
    (hes.hareketler || []).forEach((h) => {
      if (h.virmanMi && h.muhasebeBagId) virmanSayaci[h.muhasebeBagId] = (virmanSayaci[h.muhasebeBagId] || 0) + 1;
    });
  });
  tumHesaplar.forEach((hes) => {
    (hes.hareketler || []).forEach((h) => {
      const tutarYazi = `${(h.tutar || 0).toLocaleString("tr-TR")} ${hes.paraBirimi || "TRY"}`;
      const kunye = `${hes.tur} ${hes.ad} · ${tarihYaz(h.tarih)} · ${h.yon || ""} · ${tutarYazi}`;
      if (h.virmanMi) {
        // VİRMANIN TEK AYAĞI: para bir hesaptan çıkmış ama diğerine girmemiş (ya da tersi).
        if ((virmanSayaci[h.muhasebeBagId] || 0) < 2) {
          ekle("ciddi", "virman-tek-ayak", "Virmanın tek ayağı var",
            kunye,
            "Virman iki hareket yazar: kaynaktan çıkış, hedefe giriş. Biri silinmiş — toplam kasa bakiyesi yanlış. Kaydı silip virmanı yeniden yapın.",
            { hesapId: hes.id, hareketId: h.id });
        }
        return;
      }
      if (h.giderKartId) return;                       // gider/gelir kartı: karşılık var
      if (h.muhasebeBagId && cariBagIdleri.has(h.muhasebeBagId)) return;  // cari karşılığı duruyor
      if (h.muhasebeBagId) {
        // Bağ var ama karşı taraf yok: hareket "bağlı" görünüyor, aslında yetim.
        ekle("ciddi", "para-bagi-kopuk", "Para hareketinin cari karşılığı silinmiş",
          kunye,
          "Hareket bir cari kaydına bağlı ama o kayıt artık yok. Kasa bakiyesi bu tutarı içeriyor, cari ekstresi içermiyor.",
          { hesapId: hes.id, hareketId: h.id });
        return;
      }
      ekle("orta", "para-hareketi-karsiliksiz", "Kasa/banka hareketinin karşılığı yok",
        kunye + (h.aciklama ? ` · ${h.aciklama}` : ""),
        "Ne cari, ne gider/gelir kartı, ne virman. Para hareket etmiş ama nereye gittiği yazılmamış; kâr-zarar raporuna da girmiyor. Hareketi düzenleyip gider/gelir kartı seçin.",
        { hesapId: hes.id, hareketId: h.id });
    });
  });

  // ---- 3) MAL GİRDİ AMA BORÇ YAZILMADI (ve tersi) ------------------------------------------
  // Bir fişte stok hareketi varsa cari hareketi de olmalı (ve tersi). Biri eksikse ya mal
  // bedelsiz girmiş görünür ya da ödenmemiş bir borç yazılmıştır.
  const fisIndex = new Map();
  const fisAl = (fisNo) => {
    if (!fisIndex.has(fisNo)) fisIndex.set(fisNo, { fisNo, stok: [], cari: [] });
    return fisIndex.get(fisNo);
  };
  stokHareketleri.forEach((h) => { if (h.fisNo) fisAl(h.fisNo).stok.push(h); });
  cariHareketleri.forEach((h) => { if (h.fisNo) fisAl(h.fisNo).cari.push(h); });

  fisIndex.forEach((f) => {
    // Üretim fişlerinde cari tarafı OLMAYABİLİR (kendi atölyende ürettiğin mal borç doğurmaz),
    // bu yüzden yalnızca alış/satış kaynaklı fişler denetlenir.
    const ticariMi = f.stok.some((h) => h.kaynak === "Satınalma" || h.kaynak === "Satış");
    if (!ticariMi) return;
    if (f.stok.length > 0 && f.cari.length === 0) {
      ekle("yuksek", "borcsuz-mal", "Mal hareketi var, cari kaydı yok",
        `${f.fisNo} · ${f.stok.length} stok hareketi`,
        "Mal girmiş/çıkmış ama cariye borç/alacak yazılmamış: bakiye eksik.");
    }
    if (f.cari.length > 0 && f.stok.length === 0) {
      ekle("orta", "malsiz-borc", "Cari kaydı var, mal hareketi yok",
        `${f.fisNo} · ${f.cari.length} cari hareketi`,
        "Cariye borç/alacak yazılmış ama stok değişmemiş. Hizmet/masraf kaydıysa normaldir.");
    }
  });

  // ---- 4) STOK–CARİ KİMLİK BAĞI -----------------------------------------------------------
  // Aynı kalemin stok ve cari hareketi AYNI kimliği taşımalı. Taşımazsa, ekstreden tek satır
  // silindiğinde stok tarafı bulunamaz: borç gider, mal stokta kalır. Eski fişlerde bu bağ yok.
  const cariIdKumesi = new Set(cariHareketleri.map((h) => h.id));
  fisIndex.forEach((f) => {
    if (f.stok.length === 0 || f.cari.length === 0) return;
    const bagsiz = f.stok.filter((h) => !cariIdKumesi.has(h.id));
    if (bagsiz.length === 0) return;
    ekle("orta", "kimlik-bagi-yok", "Stok ve cari hareketi bağsız",
      `${f.fisNo} · ${bagsiz.length} stok hareketinin cari karşılığı farklı kimlikte`,
      "Bu fişi cari ekstresinden silerseniz borç silinir ama mal stokta kalır. Fişler ekranından silin.");
  });

  // ---- 5) TUTAR ↔ MİKTAR × BİRİM FİYAT ----------------------------------------------------
  cariHareketleri.forEach((h) => {
    if (h.miktar == null || h.birimFiyat == null) return;
    const beklenen = h.miktar * h.birimFiyat;
    if (yakinMi(beklenen, h.tutar)) return;
    ekle("orta", "tutar-uyumsuz", "Tutar, miktar × birim fiyat ile uyuşmuyor",
      `${h.cariUnvan} · ${h.fisNo} · ${h.urunAd} — kayıtta ${h.tutar}, hesapta ${stokYuvarla(beklenen)}`,
      "Fiyat sonradan değişmiş ya da tutar elle düzenlenmiş olabilir.");
  });

  // ---- 6) MUHASEBE EŞ KAYITLARI -----------------------------------------------------------
  // Muhasebe defterinde her kayıt Genel + Resmi olarak iki satır yazılır ve `esId` ile
  // birbirine bağlanır. Biri silinip diğeri kalırsa bakiye kalıcı olarak bozulur.
  const cariIdMap = new Map(cariHareketleri.map((h) => [h.id, h]));
  cariHareketleri.forEach((h) => {
    if (!h.esId) return;
    if (cariIdMap.has(h.esId)) return;
    ekle("yuksek", "yetim-es-kayit", "Muhasebe eş kaydı yetim kalmış",
      `${h.cariUnvan} · ${h.fisNo} · ${h.defter} defteri`,
      "Genel/Resmi çiftinin bir yarısı silinmiş: bu defterin bakiyesi hatalı.");
  });

  // ---- 7) YETİM REFERANSLAR ---------------------------------------------------------------
  stokHareketleri.forEach((h) => {
    if (h.siparisId && !siparisIndex.has(h.siparisId)) {
      ekle("orta", "yetim-siparis", "Hareket, olmayan bir siparişe bağlı",
        `${h.urunAd} · ${h.fisNo} · sipariş ${h.siparisNo || h.siparisId}`,
        "Sipariş silinmiş ama hareketi kalmış.");
    }
    if (h.cariId && !cariIndex.has(h.cariId)) {
      ekle("orta", "yetim-cari", "Hareket, olmayan bir cariye bağlı",
        `${h.urunAd} · ${h.fisNo}`,
        "Cari silinmiş ama hareketi kalmış.");
    }
  });

  // ---- BARKOD KODLARI TEKİL Mİ ------------------------------------------------------------
  //
  // Aynı numaranın iki kayda düşmesi, basılmış etiketin YANLIŞ malı göstermesi demek — okunmayan
  // etiketten kötüsü budur. `kodlariAta` tekilliği koruyor ama iki cihaz aynı anda kod atarsa
  // uygulama tarafındaki kontrol bunu göremez; veritabanındaki tekil indeks stok noyu tutuyor,
  // tanım kodları ise tek JSON satırında olduğu için indeksle korunamıyor. Denetim burada.
  const kodTekilligi = (liste, ad, hane) => {
    const gorulen = new Map();
    (liste || []).forEach((k) => {
      if (!k.barkodKodu) return;
      const n = Number(k.barkodKodu);
      if (gorulen.has(n)) {
        ekle("yuksek", "BARKOD_KOD_CAKISMASI", `${ad} barkod kodu iki kayıtta`,
          `${String(n).padStart(hane, "0")}: ${gorulen.get(n)} · ${k.ad || k.id}`,
          "Aynı kod iki kayda düştüğünde okutulan barkod yanlış kaydı gösterir. Kayıtlardan birinin kodu elle temizlenip yeniden atanmalı; o kayda ait BASILMIŞ ETİKETLER yeniden basılmalı.");
      } else gorulen.set(n, k.ad || k.id);
    });
  };
  const t = tanimlar || {};
  kodTekilligi(t.renkler, "Renk", 4);
  kodTekilligi(t.bedenler, "Ölçü", 2);
  kodTekilligi(t.asortiler, "Asorti", 3);
  kodTekilligi((stok || []).map((u) => ({ ...u, barkodKodu: u.stokNo })), "Stok no", 4);

  // ---- STOK ÖNBELLEĞİ DEFTERLE UYUŞUYOR MU ------------------------------------------------
  //
  // `variants[].miktar` bir ÖNBELLEK; asıl kayıt `hareketler[]`. İkisi ayrışırsa ekrandaki sayı
  // ile fişlerin anlattığı hikâye birbirini tutmaz ve hangisinin doğru olduğu belli olmaz.
  //
  // Açılış fişi kesilmeden bu denetim HER ÜRÜNDE bulgu verirdi (açılış bakiyelerinin hareketi
  // yok). Bu yüzden bulgu, "açılış fişi kesin" tavsiyesiyle birlikte veriliyor.
  acilisAcigi(stok).forEach((a) => {
    ekle("orta", "STOK_DEFTER_AYRISMASI", "Stok miktarının hareket karşılığı yok",
      `${a.urunAd} · ${a.renk || "—"}${a.beden ? ` · ${a.beden}` : ""}: ${a.fark > 0 ? "+" : ""}${a.fark}`,
      "Ekrandaki miktar ile hareketlerin toplamı ayrışıyor. Uygulamaya geçmeden önceki bakiyeler ya da elle girilmiş miktarlar böyle görünür — Açılış Fişi ile tek satıra dökülebilir.");
  });

  const agirlikSirasi = { yuksek: 0, orta: 1, dusuk: 2 };
  bulgular.sort((a, b) => agirlikSirasi[a.agirlik] - agirlikSirasi[b.agirlik]);
  return {
    bulgular,
    ozet: {
      toplam: bulgular.length,
      yuksek: bulgular.filter((b) => b.agirlik === "yuksek").length,
      orta: bulgular.filter((b) => b.agirlik === "orta").length,
      denetlenen: {
        stokHareketi: stokHareketleri.length,
        cariHareketi: cariHareketleri.length,
        fis: fisIndex.size,
        siparisKalemi: (siparisler || []).reduce((t, x) => t + (x.kalemler || []).length, 0),
      },
    },
  };
}


// Tutarlılık bulgularını gösteren ekran. Denetim İSTEK ÜZERİNE çalışır, kendiliğinden değil:
// bütün hareketleri tarıyor ve büyük veride pahalı; her ekran açılışında koşturmak uygulamayı
// yavaşlatırdı.
function VeriDenetimiEkrani({ uretim, stokRezervasyonlari, onRezervasyonTemizle, muhasebe, onKarsilananOnar, stok, cariler, siparisler, tanimlar, fisDefteri, onAcilisFisiKes, onEksikHareketOnar, onDefterdenYenidenKur }) {
  const [sonuc, setSonuc] = useState(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [acikKod, setAcikKod] = useState(null);

  function calistir() {
    setCalisiyor(true);
    // Bir sonraki karede çalışır: aksi hâlde "Denetleniyor…" yazısı hiç görünmeden
    // arayüz donuyor ve kullanıcı düğmenin çalışmadığını sanıyor.
    setTimeout(() => {
      setSonuc(veriTutarliligiDenetle({ stok, cariler, siparisler, tanimlar, fisDefteri, muhasebe, uretim, stokRezervasyonlari }));
      setCalisiyor(false);
    }, 20);
  }

  // Veri değişince (onarım sonrası) sonuç açıksa yeniden denetle: eski kapanışta (closure) çalışan
  // bir "yeniden başlat" eski stoku görüp bulguyu açık gösteriyordu.
  useEffect(() => {
    if (!sonuc) return;
    const z = setTimeout(() => setSonuc(veriTutarliligiDenetle({ stok, cariler, siparisler, tanimlar, fisDefteri })), 50);
    return () => clearTimeout(z);
  }, [stok, cariler, siparisler, fisDefteri, tanimlar]); // eslint-disable-line react-hooks/exhaustive-deps -- tanimlar: v1.408.0, denetim 18 C

  const agirlikRenk = { yuksek: "var(--erp-warn)", orta: "var(--erp-brown)", dusuk: "var(--erp-text-2)" };
  const agirlikAd = { yuksek: "Ciddi", orta: "Dikkat", dusuk: "Bilgi" };

  // Aynı koddan onlarca bulgu çıkabilir (ör. 40 fişsiz hareket). Hepsini alt alta dökmek
  // ekranı okunmaz yapardı; kod bazında gruplanıp katlanıyor.
  const gruplar = (() => {
    if (!sonuc) return [];
    const m = new Map();
    sonuc.bulgular.forEach((b) => {
      if (!m.has(b.kod)) m.set(b.kod, { kod: b.kod, agirlik: b.agirlik, baslik: b.baslik, ipucu: b.ipucu, kayitlar: [] });
      m.get(b.kod).kayitlar.push(b.detay);
      (m.get(b.kod).veriler = m.get(b.kod).veriler || []).push(b.veri);
    });
    return Array.from(m.values());
  })();

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* ---- AÇILIŞ FİŞİ ------------------------------------------------------------------------
          Miktar iki yerde duruyor: `variants[].miktar` (ÖNBELLEK) ve `hareketler[]` (DEFTER).
          İlk kurulumda ve elle stok girişinde miktar yazıldı ama hareket yazılmadı; defter
          önbelleği açıklamıyor. "Stok hareketten türetilsin" bu yüzden mümkün değildi.
          Panel açığı gösteriyor ve tek satıra döküyor. */}
      {(() => {
        const acik = acilisAcigi(stok);
        const toplamKalem = acik.length;
        return (
          <div style={{
            background: toplamKalem > 0 ? "#FBF0E2" : "#F0F5F0",
            border: `1px solid ${toplamKalem > 0 ? "#C9A063" : "#B9CDB9"}`,
            borderRadius: "var(--erp-r-md)", padding: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)", marginBottom: 4 }}>Açılış Fişi</div>
            {toplamKalem === 0 ? (
              <div style={{ fontSize: 12, color: "#3F5A33", lineHeight: 1.5 }}>
                Stok miktarlarının tamamı hareketlerle açıklanıyor — açık yok. Her miktarın bir
                fişi var, yani stok hareketlerden türetilebilir durumda.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#7A3B22", marginBottom: 10, lineHeight: 1.5 }}>
                  <b>{toplamKalem} renk/ölçüde</b> stok miktarının hareket karşılığı yok. Bunlar
                  büyük ihtimalle uygulamaya geçmeden önceki bakiyeler ya da elle girilmiş
                  miktarlar. Açılış fişi, bu farkı ürün başına TEK bir hareket olarak yazar —
                  miktarlar DEĞİŞMEZ, yalnız nereden geldikleri kayda geçer.
                </div>
                <div style={{ display: "grid", gap: 3, maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
                  {acik.slice(0, 50).map((a, i) => (
                    <div key={i} className="mono" style={{ fontSize: 11, color: "var(--erp-text)", background: "#fff", borderRadius: "var(--erp-r-sm)", padding: "4px 8px" }}>
                      {a.urunAd} · {a.renk || "—"}{a.beden ? ` · ${a.beden}` : ""} → {a.fark > 0 ? "+" : ""}{a.fark}
                    </div>
                  ))}
                  {acik.length > 50 && (
                    <div style={{ fontSize: 11, color: "var(--erp-text-2)" }}>… ve {acik.length - 50} satır daha</div>
                  )}
                </div>
                {/* GERİ ALINAMAZ DEĞİL ama toplu: hareketler normal yollarla tek tek silinebilir.
                    Yine de onay isteniyor — bir tıkla yüzlerce hareket yazan bir düğme. */}
                <button className="btn-primary" onClick={() => onAcilisFisiKes && onAcilisFisiKes()}>
                  <FileText size={14} /> Açılış Fişini Kes ({toplamKalem} satır)
                </button>
              </>
            )}
          </div>
        );
      })()}

      <div style={{ background: "var(--erp-panel)", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)", marginBottom: 4 }}>Veri Tutarlılık Denetimi</div>
        <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginBottom: 10, lineHeight: 1.5 }}>
          Kayıtların birbirini tutup tutmadığını denetler: siparişlerin teslim miktarları stok
          hareketleriyle uyuşuyor mu, mal girişlerinin cari karşılığı var mı, muhasebe eş
          kayıtları eksik mi. Hiçbir şeyi değiştirmez, yalnızca bulur.
        </div>
        <button
                          data-denetim-baslat="1" className="btn-primary" onClick={calistir} disabled={calisiyor}>
          {calisiyor ? <><Loader2 size={14} className="spin" /> Denetleniyor…</> : <><ScanLine size={14} /> Denetimi Başlat</>}
        </button>
      </div>

      {sonuc && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { ad: "Ciddi", n: sonuc.ozet.yuksek, renk: "var(--erp-warn)" },
              { ad: "Dikkat", n: sonuc.ozet.orta, renk: "var(--erp-brown)" },
              { ad: "Denetlenen fiş", n: sonuc.ozet.denetlenen.fis, renk: "var(--erp-text-2)" },
              { ad: "Stok hareketi", n: sonuc.ozet.denetlenen.stokHareketi, renk: "var(--erp-text-2)" },
              { ad: "Cari hareketi", n: sonuc.ozet.denetlenen.cariHareketi, renk: "var(--erp-text-2)" },
              { ad: "Sipariş kalemi", n: sonuc.ozet.denetlenen.siparisKalemi, renk: "var(--erp-text-2)" },
            ].map((x) => (
              <div key={x.ad} style={{ background: "#fff", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", padding: "8px 14px", minWidth: 110 }}>
                <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: x.renk }}>{x.n}</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--erp-text-3)" }}>{x.ad}</div>
              </div>
            ))}
          </div>

          {sonuc.bulgular.length === 0 ? (
            <div style={{ background: "#4E6B4E14", border: "1px solid #4E6B4E", borderRadius: "var(--erp-r-md)", padding: 14, fontSize: 13, color: "var(--erp-primary)", fontWeight: 600 }}>
              <Check size={14} /> Tutarsızlık bulunamadı — kayıtlar birbirini tutuyor.
            </div>
          ) : (
            gruplar.map((g) => {
              const acik = acikKod === g.kod;
              return (
                <div key={g.kod} style={{ background: "#fff", border: `1px solid ${agirlikRenk[g.agirlik]}`, borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setAcikKod(acik ? null : g.kod)}
                    style={{
                      width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
                      padding: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--erp-r-pill)",
                        background: `${agirlikRenk[g.agirlik]}1A`, color: agirlikRenk[g.agirlik],
                      }}
                    >
                      {agirlikAd[g.agirlik]}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>{g.baslik}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{g.kayitlar.length} kayıt</span>
                    <span style={{ marginLeft: "auto", color: "var(--erp-text-3)" }}>{acik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                  </button>
                  {acik && (
                    <div style={{ padding: "0 12px 12px" }}>
                      <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginBottom: 8, lineHeight: 1.5 }}>{g.ipucu}</div>
                      {/* ONARIM (15 Eylül): siparişte var, stok hareketinde yok → eksik hareketi
                          siparişin fişinden yeniden yaz. Yalnız EKSİK yönü onarılır; fazla hareket
                          elle incelenmeli (hangisi gerçek, hangisi mükerrer). */}
                      {/* DEFTERDEN YENİDEN KUR (Adım 2): kaynak kesin olduğu için tahmin yok. */}
                      {/* OTOMATİK ONARIM DÜĞMELERİ KALDIRILDI (kullanıcı, 20 Eylül: "veri
                          denetimi bizi yanlışa daha fazla sürüklüyor; düzelttiği şey aslında
                          üstünü süpürmek... yanlış veriyi düzeltmek daha yanlış").

                          Dört düğme vardı: "Defterden yeniden kur", "Fişten yeniden yaz",
                          "Karşılananı düzelt", "Yetim rezervasyonları temizle". Hepsi veriyi
                          SESSİZCE düzeltiyor, hatanın NEDEN oluştuğunu gizliyordu — aynı hata
                          ertesi gün yine oluşuyor, kullanıcı da "düzelttim" sanıyordu.

                          Denetim artık yalnız BİLDİRİR. Düzeltme, izi kalan bir işlemle yapılır. */}
                      <div style={{ background: "#FFF4E6", border: "1px solid #E1A03F", borderRadius: "var(--erp-r-md)",
                        padding: "8px 10px", marginBottom: 8, fontSize: 11, color: "#7A5A28", lineHeight: 1.5 }}>
                        <b>Otomatik düzeltme yok.</b> Bu liste yalnız bildirir — düzeltme izi kalan
                        bir işlemle yapılır: stok farkı için <b>Bağımsız Stok Girişi</b> (sayım fişi),
                        yanlış fiş için <b>fişi geri alıp yeniden kesmek</b>, yetim kayıt için
                        kaynağını (üretim/sipariş) düzeltmek.
                      </div>
                      <div style={{ display: "grid", gap: 3, maxHeight: 300, overflowY: "auto" }}>
                        {g.kayitlar.map((d, i) => (
                          <div key={i} className="mono" style={{ fontSize: 11, color: "var(--erp-text)", background: "var(--erp-panel)", borderRadius: "var(--erp-r-sm)", padding: "4px 8px" }}>
                            {d}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

