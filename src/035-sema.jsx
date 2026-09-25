// NOT: Otomatik camelCase -> snake_case çevirisi KALDIRILDI. Kaydı olduğu gibi çevirmek,
// `variants` ve `hareketler` gibi tabloda KARŞILIĞI OLMAYAN alanları da sütun sanıp göndermeye
// yol açıyordu; PostgREST 400 döndürüyor ve hiçbir şey yazılmıyordu.
// Artık TABLO_SEMA her tablo için sütunları AÇIKÇA sayıyor — hangi alanın nereye gittiği belli.

// =============================================================================================
// TABLO ŞEMASI — uygulama kaydını veritabanı satırlarına ayrıştırır
//
// Uygulamada ürün, varyantlarını ve hareketlerini İÇİNDE taşır:
//     { id, ad, variants: [...], hareketler: [...] }
// Veritabanında bunlar AYRI TABLOLARDIR. Kaydı olduğu gibi göndermek "column does not exist"
// hatası verir — ilk denemede tam olarak bu oldu ve hata sessizce yutulduğu için hiçbir şey
// yazılmadı, kimse de fark etmedi.
//
// Aşağıdaki şema her tablo için iki şeyi tanımlar:
//   satir()    — ana tabloya gidecek sütunlar (SADECE var olanlar, açıkça sayılmış)
//   cocuklar[] — alt tablolara açılacak diziler
//
// Alt kayıtlar da fark hesabına girer: 500 hareketi olan bir üründe tek hareket eklendiğinde
// yalnızca o satır yazılır, 500'ü birden değil.
const TABLO_SEMA = {
  urunler: {
    satir: (u) => ({
      // birim || "adet" DEĞİL: uydurulmuş bir varsayılan, veritabanına yanlış birim yazar ve
      // geri okunduğunda ürünün gerçek birimi kaybolmuş olur. Boşsa boş gider.
      id: u.id, ad: u.ad, kategori: u.kategori, birim: u.birim || null,
      malzeme_tipi: u.malzemeTipi || null, mamul_tipi: u.mamulTipi || null,
      olcu_tipi: u.olcuTipi || "Beden", alis_fiyati: u.alisFiyati || 0,
      alis_para_birimi: u.alisParaBirimi || "₺", satis_fiyati: u.satisFiyati || 0,
      // SATIŞ PARA BİRİMİ ALIŞTAN AYRI. Deriyi dolarla alıp ürünü euroyla satmak mümkün;
      // tek alan varken satış fiyatı ekranlarda "₺" sabitiyle basılıyordu, yani yanlış birimde.
      // `satis-para-birimi.sql` çalıştırılmadan bu alan buluta gitmez.
      satis_para_birimi: u.satisParaBirimi || "₺",
      // SEZON YILI — "İlkbahar/Yaz" tek başına hangi yılın koleksiyonu olduğunu söylemiyor.
      // Ayrı alan: sezon adıyla birleştirip tek metin yapmak ("İlkbahar/Yaz 2027"), süzgecin
      // sezona VE yıla ayrı ayrı bakmasını imkânsız kılardı.
      // `sezon-yili.sql` çalıştırılmadan buluta gitmez.
      sezon_yili: u.sezonYili || null,
      // SEZON YILI — "İlkbahar/Yaz" tek başına hangi yılın koleksiyonu olduğunu söylemiyor.
      // Ayrı alan: sezon adıyla birleştirip tek metin yapmak ("İlkbahar/Yaz 2027"), süzgecin
      // sezona VE yıla ayrı ayrı bakmasını imkânsız kılardı.
      // `sezon-yili.sql` çalıştırılmadan buluta gitmez.
      sezon_yili: u.sezonYili || null,
      tedarikci_id: u.tedarikciId || null, varsayilan_proses: u.varsayilanProses || null,
      paketleme_notu: u.paketlemeNotu || null, kapak_resmi: u.kapakResmi || null,
      renk_resimleri: u.renkResimleri || {}, recete: u.recete || [],
      // Reçetenin GERÇEKLEŞMESİ — planlanan ile fiilen tüketilen arasındaki farkın özeti.
      // Reçetenin kendisinden ayrı tutuluyor: reçete kullanıcının yazdığı TAHMİN, bu ise
      // ölçüm. İkisini aynı alanda karıştırmak, "hangisi benim yazdığım" sorusunu doğururdu.
      recete_gerceklesme: u.receteGerceklesme || {},
      fiyat_kurallari: u.fiyatKurallari || [], proses_ucretleri: u.prosesUcretleri || {},
      ozel_kodlar: u.ozelKodlar || {}, pasif: !!u.pasif,
      // STOK NO — barkod şemasının ilk dört hanesi (90 + stokNo + ...). Bir kez atanır, ürün
      // yeniden adlandırılınca DEĞİŞMEZ; basılmış etiketin geçerli kalması buna bağlı.
      // Sütun eklenmeden önce `barkod-semasi.sql` çalıştırılmalı. Okuma tarafı otomatik:
      // `stok_no` -> `stokNo` (bkz. alanAdi).
      stok_no: u.stokNo || null,
    }),
    cocuklar: [
      {
        tablo: "varyantlar",
        // Varyantın kendi kimliği yok; renk+beden birlikte tekil. Çakışma çözümü de buna göre.
        cakisma: "urun_id,renk,beden",
        anahtar: (v) => `${v.urun_id}|${v.renk}|${v.beden}`,
        cikar: (u) => (u.variants || []).map((v) => ({
          // renk_id ASIL BAĞ; renk yalnızca okunabilir önbellek. Kimlik yazılmazsa geri
          // okunduğunda kaybolur ve yeniden adlandırma tekrar metne muhtaç kalır.
          urun_id: u.id, renk: v.renk, renk_id: v.renkId || null, beden: v.beden,
          miktar: v.miktar || 0, min_stok: v.minStok || 0,
        })),
      },
      {
        tablo: "stok_hareketleri",
        anahtar: (h) => h.id,
        cikar: (u) => (u.hareketler || []).map((h) => ({
          id: h.id, urun_id: u.id, renk: h.renk || null, beden: h.beden || null,
          miktar: h.miktar || 0, kaynak: h.kaynak || null,
          tarih: h.tarih || new Date().toISOString(),
          fis_no: h.fisNo || null, siparis_no: h.siparisNo || null, cari_id: h.cariId || null,
          uretim_id: h.uretimId || null, siparis_id: h.siparisId || null, kalem_id: h.kalemId || null,
          rezervasyon_siparis_id: h.rezervasyonSiparisId || null,
          fazla_gonderim: !!h.fazlaGonderim, aciklama: h.aciklama || null, ek: {},
        })),
      },
    ],
  },

  cariler: {
    satir: (c) => ({
      id: c.id, unvan: c.unvan, tip: c.tip || null, telefon: c.telefon || null,
      vergi_no: c.vergiNo || null, adres: c.adres || null, para_birimi: c.paraBirimi || "TRY",
      resim: c.resim || null, barkod_kodu: c.barkodKodu || null,
      // CARİ KODU — kalıcı, insan okunur kimlik. `barkod_kodu` ile karıştırılmasın: o, personelin
      // atölyede okuttuğu barkod. `cari-kodu.sql` çalıştırılmadan buluta gitmez.
      kod: c.kod || null,
      bagli_prosesler: c.bagliProsesler || [], fiyat_grubu: c.fiyatGrubu || null,
      // WhatsApp numarası (13 Eylül): tabloda sütunu yok, `ek`te; okuma tarafı kök alana açıyor.
      pasif: !!c.pasif, ek: { ...(c.whatsapp ? { whatsapp: c.whatsapp } : {}), ...(c.eposta ? { eposta: c.eposta } : {}) },
    }),
    cocuklar: [{
      tablo: "cari_hareketleri",
      anahtar: (h) => h.id,
      cikar: (c) => (c.hareketler || []).map((h) => ({
        id: h.id, cari_id: c.id, tarih: (h.tarih || "").slice(0, 10) || null,
        // `tarih` GÜN olarak kalıyor (süzgeçler, vade, sıralama ona bağlı); saat ayrı sütunda.
        // Eski kayıtlarda null — saat hiç kaydedilmemişti, uydurmak yerine boş bırakılıyor.
        zaman: h.zaman || null,
        yon: h.yon || "Borç", tutar: h.tutar || 0, para_birimi: h.paraBirimi || "TRY",
        odeme_sekli: h.odemeSekli || null, vade: h.vade || null, defter: h.defter || "Genel",
        fis_no: h.fisNo || null, siparis_no: h.siparisNo || null, uretim_id: h.uretimId || null,
        urun_ad: h.urunAd || null, renk: h.renk || null, aciklama: h.aciklama || null,
        // KALEM DETAYI `ek` İÇİNDE.
        // `beden`, `miktar`, `birim` ve `birimFiyat` uygulamada kullanılıyor ama tabloda sütunu
        // YOK — buluta hiç gitmiyordu. Yerelde fiş satırları görünüyor, sayfa yenilenip veri
        // buluttan okununca "38: +10 m" rozetleri boşalıyordu. Sütun eklemek şema göçü ister;
        // `ek` zaten bu iş için duruyordu ama boş yazılıyordu.
        // `esId` de buradan gidiyor: Muhasebe defterindeki Genel/Resmi eşleşmesi yenilemeden
        // sonra kopuyor, biri silinince diğeri yetim kalıyordu.
        ek: {
          beden: h.beden ?? null, miktar: h.miktar ?? null, birim: h.birim || null,
          birimFiyat: h.birimFiyat ?? null, kalemParaBirimi: h.kalemParaBirimi || null,
          hamBirimFiyat: h.hamBirimFiyat ?? null, kur: h.kur ?? null, kurHedef: h.kurHedef ?? null,
          esId: h.esId || null, siparisId: h.siparisId || null, kalemId: h.kalemId || null,
          cariAd: h.cariAd || null,
          // KİMİN YAPTIĞI. Ana sayfadaki işlem akışı "kim ne yaptı" diye soruyor; kayıtta bu bilgi
          // hiç yoktu. `ek` içine yazmak yeni sütun (SQL göçü) gerektirmiyor ve okuma tarafı
          // `ek`i zaten kayıt köküne açıyor.
          kullanici: h.kullanici || null,
          // Çek/senet ayrıntıları tek nesne hâlinde: banka, şube, no, IBAN, keşideci, kendi/cirolu.
          cek: h.cek || null,
          // PARANIN NEREYE İŞLENDİĞİ. Kullanıcı (6 Eylül): "Cari hesap hareketlerinde ödeme
          // tahsilatın nereye işlendiği bilgisi görünsün — 1000 USD ödeme, kasa TL gibi."
          // Açıklama metnine gömmek yerine ALAN olarak duruyor: metinden ayrıştırmak, açıklama
          // kullanıcı tarafından değiştirilebildiği için kırılgan olurdu.
          // `muhasebeBagId` de buradan gidiyor — kasa/cari eşleşmesi yenilemeden sonra kopuyordu.
          muhasebeBagId: h.muhasebeBagId || null,
          hesapAd: h.hesapAd || null,
          hesapPB: h.hesapPB || null,
          hesapTutar: h.hesapTutar ?? null,
        },
      })),
    }],
  },

  // ÇEK GÖRSELLERİ — kullanıcı (6 Eylül): "Çek resimleri SQL bağlantısı olsun."
  //
  // AYRI TABLO, ÇEK BAŞINA BİR SATIR. Görselleri `muhasebe` tekil kaydına koymak, ürün
  // görsellerinde çarptığımız duvarın aynısı olurdu (7u): tek anahtar, 5 MB, dolduğunda MUHASEBE
  // KAYDEDİLEMEZ. Ayrı tabloda her çek kendi satırında; sıkışma yok.
  //
  // YEREL TARAFTA yine çek başına ayrı anahtar (`cekgorsel:<id>`) kullanılıyor — `tabloYaz`ın
  // dördüncü parametresiyle (bkz. 040-esitle) buluta tam liste, yerele boş liste yazılıyor.
  cek_gorselleri: {
    satir: (g) => ({
      id: g.id,
      on_yuz: g.on || null,
      arka_yuz: g.arka || null,
    }),
  },

  siparisler: {
    satir: (s) => ({
      id: s.id, siparis_no: s.siparisNo, tip: s.tip, cari_id: s.cariId || null,
      tarih: s.tarih || null, teslim_tarihi: s.teslimTarihi || null, durum: s.durum || "Bekliyor",
      musteri_kodu: s.musteriKodu || null, defter_tercihi: s.defterTercihi || "Genel",
      kayit_para_birimi: s.kayitParaBirimi || null, kayit_kurlari: s.kayitKurlari || null,
      // `olusturuldu` şemada YOKTU: uygulama yazıyordu ama buluta gitmiyordu, yenileyince
      // kayboluyordu. Ona dayanan sıralamalar sessizce gün damgasına düşüyordu.
      // `tarih` kullanıcının girdiği sipariş tarihi, `olusturuldu` kaydın sisteme girdiği an —
      // ikisi farklı sorular.
      ambalaj: s.ambalaj || null, not_metni: s.not || null, olusturuldu: s.olusturuldu || null,
    }),
    cocuklar: [{
      tablo: "siparis_kalemleri",
      anahtar: (k) => k.id,
      cikar: (s) => (s.kalemler || []).map((k, i) => ({
        id: k.id, siparis_id: s.id, urun_id: k.urunId || null, urun_ad: k.urunAd || null,
        renk: k.renk || null, beden: k.beden || null, miktar: k.miktar || 0,
        // DİKKAT: uygulamadaki alan adı `birimFiyat`, `fiyat` değil. İlk sürümde yanlış alan
        // yazıldığı için fiyatlar hep 0 gidiyordu ve geri okunduğunda `birimFiyat` tanımsız
        // kalıp sipariş kartını çökertiyordu.
        karsilanan: k.karsilanan || 0, fiyat: k.birimFiyat || 0, para_birimi: k.paraBirimi || "TRY",
        birim: k.birim || null, planlama: k.planlama || null, ambalaj: k.ambalaj || null,
        rezervasyonlar: k.rezervasyonlar || [], sira: i,
      })),
    }],
  },

  uretim: {
    // Atamalar prosesIlerleme'nin İÇİNDEN çıkarılır — atölyede üç kişi aynı anda iş alıp
    // teslim ediyor, kayıt bazlı yazılması gereken asıl yer burası.
    satir: (o) => ({
      id: o.id, siparis_no: o.siparisNo, takip_kodu: o.takipKodu || null,
      urun_id: o.urunId || null, model: o.model || null, renk: o.renk || null,
      adet: o.adet || 0, beden_miktarlari: o.bedenMiktarlari || [],
      proses_ilerleme: (o.prosesIlerleme || []).map(({ atamalar, ...kalan }) => kalan),
      rezervasyon_siparis_id: o.rezervasyonSiparisId || null, ambalaj: o.ambalaj || null,
      termin: o.termin || null, asama: o.asama || "Planlandı",
      stoga_eklendi_mi: !!o.stogaEklendiMi, hurda_telafisi_mi: !!o.hurdaTelafisiMi,
      hurda_kaynak_uretim_no: o.hurdaKaynakUretimNo || null, not_metni: o.not || null,
      olusturuldu: o.olusturuldu || null,
    }),
    cocuklar: [{
      tablo: "uretim_atamalari",
      anahtar: (a) => a.id,
      cikar: (o) => {
        const liste = [];
        (o.prosesIlerleme || []).forEach((p) => {
          (p.atamalar || []).forEach((a) => {
            liste.push({
              id: a.id, uretim_id: o.id, proses: p.proses, personel_id: a.personelId || null,
              beden_miktarlari: a.bedenMiktarlari || {}, miktar: a.miktar || 0,
              verildi_mi: !!a.verildiMi, verilme_tarihi: a.verilmeTarihi || null,
              tamamlandi_mi: !!a.tamamlandiMi, tamamlanma_tarihi: a.tamamlanmaTarihi || null,
              sonuc: a.sonuc || null, tamir_mi: !!a.tamirMi,
              tamir_kaynak_proses: a.tamirKaynakProses || null, tamir_sebep: a.tamirSebep || null,
              tamir_ucret: a.tamirUcret || 0, tamir_hammaddeler: a.tamirHammaddeler || [],
              // Parça barkodu: "1001-1", "1001-2". Atölyede okutulan kod bu.
              barkod: a.barkod || null,
            });
          });
        });
        return liste;
      },
    }],
  },

  stok_rezervasyonlari: {
    satir: (r) => ({
      id: r.id, urun_id: r.urunId, urun_ad: r.urunAd || null, renk: r.renk || null,
      beden: r.beden || null, birim: r.birim || null, siparis_id: r.siparisId || null,
      siparis_no: r.siparisNo || null, uretim_no: r.uretimNo || null,
      miktar: r.miktar || 0, tuketilen: r.tuketilen || 0,
      tarih: r.tarih || new Date().toISOString(),
    }),
    cocuklar: [],
  },

  onaylar: { satir: (o) => ({ id: o.id, tip: o.tip || null, veri: o, durum: o.durum || "bekliyor" }), cocuklar: [] },
  cop:     { satir: (c) => ({ id: c.id, tur: c.tur || null, baslik: c.baslik || null, veri: c, silen: c.silen || null }), cocuklar: [] },
};

