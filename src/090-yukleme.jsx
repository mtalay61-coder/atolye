// ================= AÇILIŞ YÜKLEME =================
//
// 19 Eylül (2. madde, 4. tur): `100-app.jsx`ten çıkarılan EN BÜYÜK parça (627 satır).
//
// Uygulamanın açılışı burada: bulut mu yerel mi okunacak, hangi tablo hangi sırayla gelecek, göç
// gerekiyor mu, bekleyen yazma defterinde ne var. Bütün state'leri bu blok dolduruyor — bu yüzden
// hem en riskli hem de bölünmesi en gerekli parçaydı: App'in içinde dururken her değişiklik
// açılışın yanından geçiyordu.
//
// KORUNAN KURALLAR:
//   • Bekleyen yazma defterinde kayıtlı tablo için YEREL kopya esas alınır — yarım kalmış bir
//     bulut yazımı, yereldeki güncel veriyi ezmemeli (21. bölümün kök nedeni buydu).
//   • Bulut okunamazsa yerel kopya kullanılır ve kullanıcıya söylenir; sessizce boş açılmaz.
//   • Göçler (özel kod, açılış hareketi) okumadan HEMEN sonra, tek sefer çalışır.
function useAcilisYukleme(d) {
  const {
    yuklemeSayaci, acilisGocuUygula, showToast,
    setBekleyenYazmalar, setBulutGirisGerekli, setCariler, setCekGorselleri, setCop,
    setFisDefteri, setGorevler, setKoliler, setLoading, setMesajOkumalari, setMesajlar, setModeller,
    setMuhasebe, setOnaylar, setSiparisler, setStok, setStokRezervasyonlari, setStorageOk,
    setTanimlar, setUretim, setVeriKaynagi, setVeriKilidiSebep,
  } = d;

// ---- yükleme ----
useEffect(() => {
  (async () => {
    try {
      let t = { renkler: [], bedenler: [], birimler: BIRIMLER.map((ad) => ({ id: `birim-${ad}`, ad })), prosesler: [], asortiler: [], ozelKodAlanlari: [], renkKombinasyonlari: [], hammaddeTipleri: [], araProsesler: [], kullanicilar: [], firmaBilgileri: { logo: VARSAYILAN_LOGO, unvan: "", telefon: "", adres: "", email: "", website: "", vergiNo: "" }, girisAktifMi: false };
      let s = [];
      let u = [];
      let c = [];
      // ---- BULUTTAN OKUMA ----
      // Supabase bağlıysa veri ORADAN gelir; tarayıcı deposu yalnızca yedek kopyadır.
      // Böylece beş bilgisayar aynı veriyi görür.
      //
      // Bulut okunamazsa (internet yok, sunucu erişilemez) uygulama DURMAZ: yerel kopyayla
      // açılır ve kullanıcı uyarılır. Atölyede işin durmaması, güncel veriden daha önceliklidir —
      // ama kullanıcının hangi hâle baktığını bilmesi şart.
      if (supabaseAcikMi()) {
        // Kayıtlı oturum varsa okumalar jetonla yapılır. Yoksa anon anahtarla — birinci
        // aşamada RLS hâlâ izin veriyor, ikinci aşamada bu yol kapanacak.
        oturumBaslat();
        try {
          const bulut = await supabasedenOku();

          // BEKLEYEN YAZMA VARSA YEREL KAZANIR (15 Eylül, bkz. 030-supabase "bekleyen yazma
          // defteri"). Bir tablo son oturumda buluta yazılamadıysa bulutun eski hâli yerelin
          // güncel hâlini EZMEMELİ — stok tutarsızlığının kaynağı tam olarak buydu.
          const bekleyenler = bekleyenYazmalariOku();
          const yerelKazansin = async (anahtar, alan) => {
            if (!bekleyenler[anahtar]) return;
            try {
              const okuma = await guvenliOku(anahtar, null);
              if (okuma.deger) {
                bulut[alan] = JSON.parse(okuma.deger);
                console.warn(`Bekleyen yazma: ${anahtar} için yerel kopya esas alındı (bulut ${bekleyenler[anahtar].zaman} tarihinden beri geride)`);
              }
            } catch (e) { console.error("Bekleyen yazma okunamadı:", anahtar, e); }
          };
          await yerelKazansin("stok:items", "stok");
          await yerelKazansin("siparis:data", "siparisler");
          await yerelKazansin("uretim:siparisler", "uretim");
          await yerelKazansin("cari:data", "cariler");
          if (bekleyenler["tanimlar:data"]) {
            try { const o = await guvenliOku("tanimlar:data", null); if (o.deger) bulut.tanimlar = JSON.parse(o.deger); } catch (e) { /* */ }
          }
          if (Object.keys(bekleyenler).length > 0) {
            setBekleyenYazmalar(bekleyenler);
          }

          if (bulut.tanimlar) t = { ...t, ...bulut.tanimlar };
          setTanimlar(t);
          // Kimliği olmayan renk kayıtları burada damgalanır — bir kerelik, sessiz.
          const damga = renkKimlikleriniDamgala(bulut.stok, t.renkler || []);
          if (damga.damgalanan > 0) {
            console.info(`${damga.damgalanan} renk kaydı kimlikle eşleştirildi`);
            yazimiIzle(tabloYaz("stok:items", "urunler", damga.urunler), "Stok kartları", damga.urunler);
          }
          // ÖZEL KOD GÖÇÜ — bir kerelik, sessiz. Beş sabit etiket + dizi değerler yerine
          // kimlikli alanlar + kimlik→değer nesnesi. Göç ETMEZSE ekranlar boş görünür ve
          // girilmiş kodlar kaybolmuş sanılır, o yüzden okumadan hemen sonra yapılıyor.
          const kodGoc = ozelKodGoc(t, damga.urunler, () => uid("oka"));
          if (kodGoc.degisti) {
            t = kodGoc.tanimlar;
            setTanimlar(t);
            yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", t), "Tanımlar", t);
            if (kodGoc.degisenUrun > 0) {
              console.info(`${kodGoc.degisenUrun} ürünün özel kodları yeni biçime taşındı`);
              yazimiIzle(tabloYaz("stok:items", "urunler", kodGoc.stok), "Stok kartları", kodGoc.stok);
            }
          }
          // EKSİK BARKOD KODLARI (v1.467.0) — renk / ölçü / asorti. Stok kartından ya da siparişten
          // açılan tanımlar kodsuz kalıyordu (kısa yollar `saveTanimlar`ı atlıyordu, bkz. 100-app
          // `tanimlarKodluYaz`). Eski kayıtlar burada bir kez, sessizce tamamlanıyor; kodu olana
          // dokunulmuyor. Yalnız BULUTTAN okununca: çevrimdışı açılışta sayaç bayat olabilir.
          const barkodKod = kodlariAta([], t);
          if (barkodKod.atanan.renk + barkodKod.atanan.beden + barkodKod.atanan.asorti > 0) {
            t = barkodKod.tanimlar;
            setTanimlar(t);
            yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", t), "Tanımlar", t);
            console.info(`Eksik barkod kodları atandı: renk ${barkodKod.atanan.renk}, ölçü ${barkodKod.atanan.beden}, asorti ${barkodKod.atanan.asorti}`);
          }
          setStok(acilisGocuUygula(kodGoc.stok, t));
          // Bulut kaynak olduğu için görseller ürünlerin İÇİNDE geldi. Yerel kopyayı da
          // tazeliyoruz ki internetsiz açılışta görseller kaybolmasın. Önce mevcut anahtarlar
          // okunuyor — yalnızca imzaları kurmak için; içerikleri kullanılmıyor, çünkü bulut
          // daha günceldir. Bu okuma olmadan her açılışta BÜTÜN görseller yeniden yazılırdı.
          gorselleriOku(null)
            .then(() => gorselleriYaz(gorselleriAyir(kodGoc.stok).gorseller))
            .catch((e) => console.error("Görsel yerel kopyası tazelenemedi:", e));
          // CARİ KODLARI — kodu olmayanlara burada atanıyor. Bir kerelik ve sessiz; kodu
          // olanlara dokunulmuyor.
          // İKİZ KAYIT GÖÇÜ — "Muhasebe" defterinde eskiden Genel+Resmi diye iki satır
          // yazılıyordu; tek satıra indiriliyor. Bir kerelik ve sessiz; kodu atamadan ÖNCE
          // çalışıyor ki iki yazma tek turda birleşsin.
          const ikizGoc = esIkizleriBirlestir(bulut.cariler);
          if (ikizGoc.birlesen > 0) console.info(`${ikizGoc.birlesen} muhasebe eş kaydı tek kayda birleştirildi`);
          const cariKod = cariKodlariAta(ikizGoc.cariler, t);
          if (cariKod.atanan > 0 || ikizGoc.birlesen > 0) {
            if (cariKod.atanan > 0) {
              t = cariKod.tanimlar;
              setTanimlar(t);
              yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", t), "Tanımlar", t);
            }
            yazimiIzle(tabloYaz("cari:data", "cariler", cariKod.cariler), "Cari kartları", cariKod.cariler);
          }
          setUretim(bulut.uretim);
          setCariler(cariKod.cariler);
          setSiparisler(bulut.siparisler);
          setStokRezervasyonlari(bulut.stokRezervasyonlari);
          // ÇÖP ve ONAYLAR da buluttan okunur. Okunmadıklarında uygulama onları BOŞ sanıyor;
          // "çöpü boşalt" dendiğinde fark hesabı silinecek bir şey görmüyor ve buluttaki
          // kayıtlar olduğu gibi kalıyordu.
          setOnaylar(bulut.onaylar || []);
          setCop(bulut.cop || []);

          // Fark katmanının başlangıcı buluttan gelen hâldir; yerelden değil.
          tabloBaslangicTam("urunler", damga.urunler);
          tabloBaslangicTam("siparisler", bulut.siparisler);
          tabloBaslangicTam("uretim", bulut.uretim);
          tabloBaslangicTam("cariler", bulut.cariler);
          tabloBaslangicTam("stok_rezervasyonlari", bulut.stokRezervasyonlari);
          tabloBaslangicTam("onaylar", bulut.onaylar || []);
          tabloBaslangicTam("cop", bulut.cop || []);

          // Muhasebe (kasa/banka/çek) ve onaylar henüz tabloya taşınmadı; bulut açıkken de
          // tarayıcı deposundan okunur. Bunlar tek kullanıcı tarafından girilen, nadiren
          // çakışan kayıtlar — taşınmaları öncelikli değildi.
          // Muhasebe BULUTTAN okunur; yerel kopya yalnızca bulut erişilemezse kullanılır.
          // Kur bilgisi de burada: ikinci bilgisayarda elle girilen kur kaybolmasın diye.
          try {
            const mSatir = await supabaseTumSatirlar("muhasebe");
            if (mSatir[0] && mSatir[0].veri) setMuhasebe(mSatir[0].veri);
            else {
              const okuma = await guvenliOku("muhasebe:data", null);
              if (okuma.deger) setMuhasebe(JSON.parse(okuma.deger));
            }
          } catch (e) {
            try {
              const okuma = await guvenliOku("muhasebe:data", null);
              if (okuma.deger) setMuhasebe(JSON.parse(okuma.deger));
            } catch (e2) { /* muhasebe okunamazsa boş başlar */ }
          }
          // ÇEK GÖRSELLERİ — kendi tablosu var, satır satır okunuyor. Bulut erişilemezse
          // yerel anahtarlar okunuyor (çek başına `cekgorsel:<id>`).
          // `bulut.cekGorselleri` zaten okundu (045-oku); ayrıca sorgulamaya gerek yok.
          setCekGorselleri(bulut.cekGorselleri || []);

          // KOLİLER de muhasebe gibi tekil tablo: buluttan okunur, yerel kopya yalnızca bulut
          // erişilemezse kullanılır. Yazıp okumamak, ikinci bilgisayarda koli listesini BOŞ
          // gösterirdi — paketlemeyi yapan personel kendi kurduğu koliyi bulamazdı.
          try {
            const kSatir = await supabaseTumSatirlar("koliler");
            if (kSatir[0] && kSatir[0].veri) setKoliler(kSatir[0].veri);
            else {
              const okuma = await guvenliOku("koli:data", null);
              if (okuma.deger) setKoliler(JSON.parse(okuma.deger));
            }
          } catch (e) {
            try {
              const okuma = await guvenliOku("koli:data", null);
              if (okuma.deger) setKoliler(JSON.parse(okuma.deger));
            } catch (e2) { /* koliler okunamazsa boş başlar */ }
          }

          // GÖREVLER — kolilerle aynı kalıp. Tablo yoksa (gorevler.sql çalıştırılmadıysa) yerel
          // kopya kullanılır; yazma uyarısı ekranda görünür, veri kaybolmaz.
          try {
            const mdSatir = await supabaseTumSatirlar("modeller");
            if (mdSatir[0] && mdSatir[0].veri) setModeller(mdSatir[0].veri);
            else {
              const okuma = await guvenliOku("model:data", null);
              if (okuma.deger) setModeller(JSON.parse(okuma.deger));
            }
          } catch (e) {
            try {
              const okuma = await guvenliOku("model:data", null);
              if (okuma.deger) setModeller(JSON.parse(okuma.deger));
            } catch (e2) { /* modelhane boş başlar */ }
          }

          try {
            const fSatir = await supabaseTumSatirlar("fis_defteri");
            if (fSatir[0] && fSatir[0].veri) setFisDefteri(fSatir[0].veri);
            else {
              const okuma = await guvenliOku("fisdefter:data", null);
              if (okuma.deger) setFisDefteri(JSON.parse(okuma.deger));
            }
          } catch (e) {
            try {
              const okuma = await guvenliOku("fisdefter:data", null);
              if (okuma.deger) setFisDefteri(JSON.parse(okuma.deger));
            } catch (e2) { /* defter okunamazsa boş başlar */ }
          }

          try {
            const mSatir = await supabaseTumSatirlar("mesajlar");
            if (mSatir[0] && mSatir[0].veri) setMesajlar(mSatir[0].veri);
            else {
              const okuma = await guvenliOku("mesaj:data", null);
              if (okuma.deger) setMesajlar(JSON.parse(okuma.deger));
            }
          } catch (e) {
            try {
              const okuma = await guvenliOku("mesaj:data", null);
              if (okuma.deger) setMesajlar(JSON.parse(okuma.deger));
            } catch (e2) { /* mesajlar okunamazsa boş başlar */ }
          }
          try {
            const okumaO = await guvenliOku("mesaj:okuma", null);
            if (okumaO.deger) setMesajOkumalari(JSON.parse(okumaO.deger));
          } catch (e) { /* okuma damgaları yalnız bu cihazın, kaybı önemsiz */ }

          try {
            const gSatir = await supabaseTumSatirlar("gorevler");
            if (gSatir[0] && gSatir[0].veri) setGorevler(gSatir[0].veri);
            else {
              const okuma = await guvenliOku("gorev:data", null);
              if (okuma.deger) setGorevler(JSON.parse(okuma.deger));
            }
          } catch (e) {
            try {
              const okuma = await guvenliOku("gorev:data", null);
              if (okuma.deger) setGorevler(JSON.parse(okuma.deger));
            } catch (e2) { /* görevler okunamazsa boş başlar */ }
          }

          // Onaylar artık BULUTTAN okunuyor (yukarıda), yerelden okumaya gerek yok.

          setVeriKaynagi({ tur: "bulut", zaman: Date.now() });
          setLoading(false);
          return;
        } catch (e) {
          console.error("Bulut okuma hatası:", e);
          const mesaj = String(e && e.message || e);
          // YETKİ REDDİ = 2. aşama etkin ve oturum yok/geçersiz. Yerel kopyaya düşülmüyor;
          // bulut giriş ekranı. Ağ hatası (internet yok) ise eskisi gibi yerel kopya.
          // İki okuma yolu iki biçimde hata veriyor: `supabaseIstek` "Supabase 401: …",
          // `supabaseTumSatirlar` "tanimlar: HTTP 403". İkisi de yakalanıyor.
          if (/\b(Supabase|HTTP) 40[13]\b|permission denied|Buluta yazma yetkisi yok|JWT|jwt/.test(mesaj)) {
            oturumYaz(null);
            setBulutGirisGerekli({ sebep: mesaj });
            setLoading(false);
            return;
          }
          setVeriKaynagi({ tur: "yerel", hata: mesaj, zaman: Date.now() });
          // Yerel okumaya devam et — aşağıdaki akış çalışacak.
        }
      }

      // Hangi anahtarların GERÇEKTEN var olduğunu önce öğreniyoruz; "yok" ile "okunamadı" ayrımı
      // buna dayanıyor (bkz. guvenliOku). Liste alınamazsa null döner ve tüm okumalar temkinli
      // moda geçer.
      const anahtarKumesi = await mevcutAnahtarlar();
      const okumaHatalari = [];
      // Liste alınamadığında kullanılan yedek karar kuralı için: kaç anahtar okunabildi, kaçı okunamadı.
      const supheliler = [];
      let basariliOkuma = 0;
      try {
        const okuma = await guvenliOku("tanimlar:data", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("tanimlar:data");
        else if (okuma.supheli) supheliler.push("tanimlar:data");
        else basariliOkuma++;
        t = okuma.deger ? JSON.parse(okuma.deger) : t;
        t.araProsesler = t.araProsesler || [];
        t.kullanicilar = t.kullanicilar || [];
        t.firmaBilgileri = t.firmaBilgileri || { logo: VARSAYILAN_LOGO, unvan: "", telefon: "", adres: "", email: "", website: "", vergiNo: "" };
        t.girisAktifMi = t.girisAktifMi ?? false;
        const birimler = t.birimler || [];

        // Renk kayıtları yüklenirken tekil `malzemeTipi` DİZİYE çevrilir. Böylece kodun geri
        // kalanı tek bir biçimle çalışır; eski kayıtlar da çoklu tip desteğinden yararlanır.
        let renkler = (t.renkler || []).map((r2) => ({
          ...r2,
          tip: r2.tip || "Mamul",
          renkKodu: r2.renkKodu || "#C9B99A",
          kod: r2.kod || "",
          malzemeTipleri: Array.isArray(r2.malzemeTipleri)
            ? r2.malzemeTipleri.filter(Boolean)
            : (r2.malzemeTipi ? [r2.malzemeTipi] : []),
        }));

        // ---- RENK GÖÇÜ: ÜÇ KATMANDAN İKİYE (kullanıcı, 13 Eylül, 9g) ------------------------------
        // Eskiden "Mamul rengi" (tip Mamul) ile "Hammadde rengi" ayrı listelerdi; model rengi de
        // mamul renklerinden kuruluyordu. Kullanıcının kuralı: renk = STOK RENGİ (tek liste), model
        // rengi = stok renklerinin kombinasyonu; tek renkli mamul o rengin kendisini taşır. Göç:
        // bütün renkler tek tip ("Hammadde" = stok rengi); aynı adlı çiftler (Mamul "Siyah" +
        // Hammadde "Siyah") tek kayda inir — silinen kaydın kimliği kombinasyonlarda kalan kayda
        // çevrilir (varyant/reçete renk ADIYLA bağlı, dokunulmaz). Tek yönlü ve idempotent.
        let renkGocuOldu = false;
        {
          const kalanlar = [];
          const idHaritasi = {};
          renkler.forEach((r) => {
            const tipMamul = (r.tip || "Mamul") === "Mamul";
            const ayni = kalanlar.find((k) => k.ad.toLocaleLowerCase("tr-TR") === (r.ad || "").toLocaleLowerCase("tr-TR"));
            if (ayni) {
              // Çift kayıt: hammadde tipli olan kalır; kalan kaydın malzeme tipleri birleşir.
              const kalan = ayni;
              const silinen = r;
              if (tipMamul && !kalan.eskiTip) { /* kalan zaten hammadde */ } else if (!tipMamul && kalan.eskiTip === "Mamul") {
                // Kalan mamul kökenli, gelen hammadde: hammadde olanı kalan yap.
                idHaritasi[kalan.id] = r.id;
                kalanlar[kalanlar.indexOf(kalan)] = { ...r, tip: "Hammadde", malzemeTipleri: [...new Set([...(r.malzemeTipleri || []), ...(kalan.malzemeTipleri || [])])] };
                renkGocuOldu = true;
                return;
              }
              idHaritasi[silinen.id] = kalan.id;
              kalan.malzemeTipleri = [...new Set([...(kalan.malzemeTipleri || []), ...(r.malzemeTipleri || [])])];
              renkGocuOldu = true;
              return;
            }
            if (tipMamul) { renkGocuOldu = true; kalanlar.push({ ...r, tip: "Hammadde", eskiTip: "Mamul" }); }
            else kalanlar.push({ ...r });
          });
          if (renkGocuOldu) {
            renkler = kalanlar.map(({ eskiTip: _e, ...r }) => r);
            t.renkKombinasyonlari = (t.renkKombinasyonlari || []).map((k) => ({
              ...k, renkIdler: (k.renkIdler || []).map((id) => idHaritasi[id] || id),
            }));
            console.info("Renk göçü: mamul/hammadde ayrımı kaldırıldı, tek renk listesi.");
          }
        }

        const bedenler = (t.bedenler || []).map((b) => ({ ...b, tip: b.tip || "Beden" }));

        const prosesler = (t.prosesler || [])
          .map((p, i) => ({ ...p, sira: p.sira != null ? p.sira : i })).sort((a, b) => a.sira - b.sira);

        const asortiler = t.asortiler || [];

        const eskiKodEtiketleri = t.ozelKodEtiketleri || [];
        // Eski biçim (beş sabit etiket) burada KORUNUYOR, dönüştürülmüyor: dönüşümü
        // `ozelKodGoc` yapıyor ve ürünlerdeki dizi değerleri de onunla birlikte taşınmak
        // zorunda. Etiketleri burada tek başına dönüştürmek, değerleri bağsız bırakırdı.
        const ozelKodAlanlari = t.ozelKodAlanlari || null;

        const renkKombinasyonlari = t.renkKombinasyonlari || [];
        const hammaddeTipleri = t.hammaddeTipleri || [];

        // BİLİNMEYEN ALANLAR KORUNUYOR (`...t`). Bu satır eskiden tanımları SABİT bir alan
        // listesiyle yeniden kuruyor, listede olmayan her şeyi düşürüyordu. `kodSayaclari` (6b:
        // barkod ve cari kodu sayaçları — "geri gitmez, silinen numara bir daha verilmez") her
        // açılışta sıfırlanıyordu; `kullanilan` kümesi yalnız DURAN kayıtların numarasını
        // koruduğundan silinmiş en yüksek numara bir sonraki kayda verilebilirdi. 12 Eylül'de
        // `raporlar` da aynı yüzden kayboldu ve fark edildi. Alan listesine yeni bir isim ekleme
        // zorunluluğu kaldırıldı: dönüştürülen alanlar aşağıda EZİLİYOR, gerisi olduğu gibi kalıyor.
        t = { ...t, renkler, bedenler, birimler, prosesler, asortiler, renkKombinasyonlari, hammaddeTipleri, mamulTipleri: t.mamulTipleri || [], fiyatGruplari: t.fiyatGruplari || [], araProsesler: t.araProsesler || [], kullanicilar: t.kullanicilar || [], firmaBilgileri: t.firmaBilgileri || { logo: VARSAYILAN_LOGO, unvan: "", telefon: "", adres: "", email: "", website: "", vergiNo: "" }, girisAktifMi: t.girisAktifMi ?? false };
        if (ozelKodAlanlari) t.ozelKodAlanlari = ozelKodAlanlari;
        // İki bağımsız iş — `else` bağlıyken renk göçü olan açılışta eski kod etiketleri düşüyordu.
        if (eskiKodEtiketleri.length) t.ozelKodEtiketleri = eskiKodEtiketleri;
        if (renkGocuOldu) yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", t), "Tanımlar", t);
        try {
          await tekilYaz("tanimlar:data", "tanimlar", t);
        } catch (setErr) {}
      } catch (e) { okumaHatalari.push("tanimlar:data"); }
      try {
        const okuma = await guvenliOku("stok:items", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("stok:items");
        else if (okuma.supheli) supheliler.push("stok:items");
        else basariliOkuma++;
        s = okuma.deger ? JSON.parse(okuma.deger) : [];
      } catch (e) { okumaHatalari.push("stok:items"); }
      // GÖRSELLER AYRI ANAHTARLARDAN GERİ BİRLEŞTİRİLİYOR. Okuma hatası stok yüklemesini
      // DÜŞÜRMÜYOR: görselsiz bir stok listesi çalışır, stoksuz bir uygulama çalışmaz.
      try {
        const gOkuma = await gorselleriOku(anahtarKumesi);
        s = gorselleriBirlestir(s, gOkuma.gorseller);
      } catch (e) { console.error("Görseller okunamadı:", e); }
      // eski kayıtları normalize et (tekli renk/beden -> matris, eksik alanlara varsayılan ver)
      s = s.map((entry) =>
        entry.variants
          ? {
              ...entry,
              renkResimleri: entry.renkResimleri || {},
              alisFiyati: entry.alisFiyati || 0,
              alisParaBirimi: entry.alisParaBirimi || "₺",
              // Eski kayıtlarda satış para birimi YOK; varsayılan ₺ çünkü o tarihe kadar
              // satış fiyatı ekranlarda zaten ₺ olarak basılıyordu — geçmiş veriyi başka bir
              // birime çekmek, hiç girilmemiş bir bilgiyi uydurmak olurdu.
              satisParaBirimi: entry.satisParaBirimi || "₺",
              // Yılı olmayan eski kayıtlar boş kalıyor: uydurulan bir yıl, süzgeçte yanlış
              // koleksiyona düşen ürünler demek olurdu.
              sezonYili: entry.sezonYili || "",
              // Yılı olmayan eski kayıtlar boş kalıyor: uydurulan bir yıl, süzgeçte yanlış
              // koleksiyona düşen ürünler demek olurdu.
              sezonYili: entry.sezonYili || "",
              satisFiyati: entry.satisFiyati || 0,
              // tedarikciId: yeni biçim (cari kimliği). tedarikci: eski serbest metin — bilerek
              // korunuyor, çünkü kimliği olmayan eski kayıtlarda gösterilecek tek bilgi o.
              tedarikciId: entry.tedarikciId || "",
              tedarikci: entry.tedarikci || "",
              paketlemeNotu: entry.paketlemeNotu || "",
              kapakResmi: entry.kapakResmi || "",
              olcuTipi: entry.olcuTipi || "Beden",
              varsayilanProses: entry.varsayilanProses || "",
              hareketler: entry.hareketler || [],
              ekFiyatlar: entry.ekFiyatlar || [],
              recete: (entry.recete || []).map((r) => ({ ...r, mamulBeden: r.mamulBeden || "Tüm Bedenler", mamulRenk: r.mamulRenk || "", proses: r.proses || "" })),
              prosesUcretleri: entry.prosesUcretleri || {},
              // ESKİ BİÇİM KORUNUYOR, KIRPILMIYOR. Burada "beş elemanlı dizi değilse sıfırla"
              // kuralı vardı; yeni biçim (kimlik→değer NESNESİ) bu kurala takılıp her açılışta
              // SİLİNİYORDU. Değerlerin dönüşümünü `ozelKodGoc` yapıyor, bu satırın işi
              // yalnızca alanın var olmasını garanti etmek.
              ozelKodlar: entry.ozelKodlar || {},
              malzemeTipi: entry.malzemeTipi || "",
              // Yükleme sırasında miktarlar yuvarlanır: bu düzeltmeden ÖNCE birikmiş ondalık
              // hatalar (−3.55e-15 gibi) kayıtlı veride duruyor. Uygulama her açıldığında
              // temizlenir; kullanıcının elle düzeltmesi gerekmez.
              variants: (entry.variants || []).map((v) => ({
                ...v,
                miktar: stokYuvarla(v.miktar),
                minStok: v.minStok != null ? v.minStok : (entry.minStok || 0),
              })),
            }
          : {
              id: entry.id,
              ad: entry.ad,
              kategori: entry.kategori,
              birim: entry.birim,
              minStok: entry.minStok || 0,
              alisFiyati: 0,
              alisParaBirimi: "₺",
              satisParaBirimi: "₺",
              satisFiyati: 0,
              tedarikci: "",
              paketlemeNotu: "",
              kapakResmi: "",
              olcuTipi: "Beden",
              varsayilanProses: "",
              variants: [{ renk: entry.renk || "Standart", beden: entry.beden || "Standart", miktar: entry.miktar || 0 }],
              renkResimleri: {},
              hareketler: [],
              ekFiyatlar: [],
              recete: [],
              prosesUcretleri: {},
              ozelKodlar: {},
            }
      );
      try {
        const okuma = await guvenliOku("uretim:siparisler", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("uretim:siparisler");
        else if (okuma.supheli) supheliler.push("uretim:siparisler");
        else basariliOkuma++;
        u = okuma.deger ? JSON.parse(okuma.deger) : [];
      } catch (e) { okumaHatalari.push("uretim:siparisler"); }
      u = u.map((o) => {
        const toplamAdetMig = (o.bedenMiktarlari || []).reduce((s, bm) => s + (bm.miktar || 0), 0);
        return {
        ...o,
        urunId: o.urunId || null,
        renk: o.renk || "",
        bedenMiktarlari: o.bedenMiktarlari || null,
        stogaEklendiMi: o.stogaEklendiMi || false,
        personelId: o.personelId || null,
        ucretPerAdet: o.ucretPerAdet || 0,
        ucretOdendiMi: o.ucretOdendiMi || false,
        prosesIlerleme: (o.prosesIlerleme || [
          { proses: "Üretim", sira: 0, tamamlandiMi: !!o.stogaEklendiMi, personelId: o.personelId || null, tamamlanmaTarihi: o.stogaEklendiMi ? o.olusturuldu : null },
        ]).map((p) => {
          // İki aşamalı akış: önce personele "iş verilir" (rezerve edilir), sonra "teslim alınır"
          // (stok düşer + işçilik cariye işlenir). Eski kayıtlarda bu ayrım yoktu — tamamlanmış
          // adımlar zaten verilip teslim alınmış sayılır, tamamlanmamışlar henüz verilmemiş sayılır.
          const verildiMi = p.verildiMi ?? !!p.tamamlandiMi;
          const verilmeTarihi = p.verilmeTarihi || (p.tamamlandiMi ? p.tamamlanmaTarihi : null);
          // ATAMALAR: bir prosesin BİRDEN FAZLA personele bölüştürülmüş halini tutar. Eski (tekil
          // personelId/verildiMi/tamamlandiMi alanlarına sahip) kayıtlar burada TEK bir atamaya
          // dönüştürülür — böylece ileri dönük tüm mantık artık SADECE atamalar üzerinden çalışır.
          let atamalar = p.atamalar;
          if (!atamalar) {
            if (p.araProsesMi) {
              atamalar = []; // Ara prosesler atama mekanizmasını kullanmaz, kendi ayrı alanlarıyla çalışır.
            } else if (p.tamamlandiMi && p.personelId) {
              atamalar = [{ id: uid("atama"), personelId: p.personelId, miktar: toplamAdetMig, verildiMi: true, verilmeTarihi, tamamlandiMi: true, tamamlanmaTarihi: p.tamamlanmaTarihi }];
            } else if (verildiMi && p.personelId) {
              atamalar = [{ id: uid("atama"), personelId: p.personelId, miktar: toplamAdetMig, verildiMi: true, verilmeTarihi, tamamlandiMi: false, tamamlanmaTarihi: null }];
            } else {
              atamalar = [];
            }
          }
          return { ...p, verildiMi, verilmeTarihi, atamalar };
        }),
      };
      });
      try {
        const okuma = await guvenliOku("cari:data", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("cari:data");
        else if (okuma.supheli) supheliler.push("cari:data");
        else basariliOkuma++;
        c = okuma.deger ? JSON.parse(okuma.deger) : [];
      } catch (e) { okumaHatalari.push("cari:data"); }
      c = c.map((cari) => ({
        ...cari,
        hareketler: (cari.hareketler || []).map((h) => ({ ...h, fisNo: h.fisNo || "", defter: h.defter || "Genel" })),
        telefon: cari.telefon || "",
        vergiNo: cari.vergiNo || "",
        adres: cari.adres || "",
        notlar: cari.notlar || "",
      }));
      let sp = [];
      try {
        const okuma = await guvenliOku("siparis:data", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("siparis:data");
        else if (okuma.supheli) supheliler.push("siparis:data");
        else basariliOkuma++;
        sp = okuma.deger ? JSON.parse(okuma.deger) : [];
      } catch (e) { okumaHatalari.push("siparis:data"); }
      sp = sp.map((s2) => ({
        ...s2,
        kalemler: (s2.kalemler || []).map((k) => ({ ...k, karsilanan: k.karsilanan || 0 })),
        durum: s2.durum || "Bekliyor",
        teslimSayaci: s2.teslimSayaci || 0,
      }));
      let oy = [];
      try {
        const okuma = await guvenliOku("onaylar:data", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("onaylar:data");
        else if (okuma.supheli) supheliler.push("onaylar:data");
        else basariliOkuma++;
        oy = okuma.deger ? JSON.parse(okuma.deger) : [];
      } catch (e) { okumaHatalari.push("onaylar:data"); }
      let mh = { kasalar: [], bankalar: [], cekler: [] };
      try {
        const okuma = await guvenliOku("muhasebe:data", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("muhasebe:data");
        else if (okuma.supheli) supheliler.push("muhasebe:data");
        else basariliOkuma++;
        if (okuma.deger) mh = { kasalar: [], bankalar: [], cekler: [], ...JSON.parse(okuma.deger) };
      } catch (e) { okumaHatalari.push("muhasebe:data"); }

      let srez = [];
      try {
        const okuma = await guvenliOku("stokrez:data", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("stokrez:data");
        else if (okuma.supheli) supheliler.push("stokrez:data");
        else basariliOkuma++;
        srez = okuma.deger ? JSON.parse(okuma.deger) : [];
      } catch (e) { okumaHatalari.push("stokrez:data"); }

      let cp = [];
      try {
        const okuma = await guvenliOku("cop:data", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("cop:data");
        else if (okuma.supheli) supheliler.push("cop:data");
        else basariliOkuma++;
        cp = okuma.deger ? JSON.parse(okuma.deger) : [];
      } catch (e) { okumaHatalari.push("cop:data"); }
      // Bir veya daha fazla anahtar okunamadıysa: ekranda gördüğün veri EKSİK demektir. Bu
      // durumda yazmayı tamamen kilitliyoruz — aksi halde ilk kayıtta eksik hâl diske yazılır ve
      // okunamayan kayıtlar kalıcı olarak yok olur.
      // Liste alınamadıysa (supheliler dolu): bazı anahtarlar okunup bazıları okunamıyorsa bu
      // GERÇEK bir sorundur — depolama çalışıyor ama o kayıtlara erişilemiyor. Hiçbiri
      // okunamıyorsa bu büyük olasılıkla YENİ KURULUM'dur ve kilitlemek yanlış olur.
      if (supheliler.length > 0 && basariliOkuma > 0) {
        supheliler.forEach((a) => okumaHatalari.push(a));
      }

      if (okumaHatalari.length > 0) {
        VERI_KILIDI.aktif = true;
        VERI_KILIDI_UYARI.bildir = () =>
          showToast("Kayıt yapılamadı — veriler eksik yüklendiği için kaydetme kapalı. Sayfayı yenileyin.");
        VERI_KILIDI.sebep = okumaHatalari.join(", ");
        setVeriKilidiSebep(okumaHatalari.join(", "));
      }
      // Yerel yüklemede de kimlik damgalaması yapılır — iki yolun davranışı ayrışmamalı.
      const yerelDamga = renkKimlikleriniDamgala(s, t.renkler || []);
      // ÖZEL KOD GÖÇÜ BURADA DA ÇALIŞMALI. Yalnızca bulut yoluna konsaydı, internetsiz açılan
      // bir cihazda eski biçim taşınmadan kalır ve kodlar ekranda hiç görünmezdi — tam olarak
      // yukarıdaki yorumun uyardığı ayrışma.
      const yerelKodGoc = ozelKodGoc(t, yerelDamga.urunler, () => uid("oka"));
      if (yerelKodGoc.degisti) {
        t = yerelKodGoc.tanimlar;
        yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", t), "Tanımlar", t);
        if (yerelKodGoc.degisenUrun > 0) yazimiIzle(tabloYaz("stok:items", "urunler", yerelKodGoc.stok), "Stok kartları", yerelKodGoc.stok);
      }
      // ÇEK GÖRSELLERİ yerel yolda çek başına anahtarlardan toplanıyor.
      try {
        const cekler = ((mh && mh.cekler) || []);
        const gorseller = [];
        for (const cek of cekler) {
          const g = await cekGorselOku(cek.id);
          if (g && (g.on || g.arka)) gorseller.push({ id: cek.id, on: g.on || "", arka: g.arka || "" });
        }
        setCekGorselleri(gorseller);
      } catch (e) { console.error("Çek görselleri okunamadı:", e); }

      const yerelIkiz = esIkizleriBirlestir(c);
      const yerelCariKod = cariKodlariAta(yerelIkiz.cariler, t);
      if (yerelCariKod.atanan > 0 || yerelIkiz.birlesen > 0) {
        if (yerelCariKod.atanan > 0) {
          t = yerelCariKod.tanimlar;
          yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", t), "Tanımlar", t);
        }
        yazimiIzle(tabloYaz("cari:data", "cariler", yerelCariKod.cariler), "Cari kartları", yerelCariKod.cariler);
      }
      setTanimlar(t);
      setStok(acilisGocuUygula(yerelKodGoc.stok, t));
      setUretim(u);
      setCariler(yerelCariKod.cariler);
      setSiparisler(sp);
      setOnaylar(oy);
      setMuhasebe(mh);
      setStokRezervasyonlari(Array.isArray(srez) ? srez : []);
      setCop(cp);
      try {
        const okumaMd = await guvenliOku("model:data", anahtarKumesi);
        if (okumaMd.deger) { try { setModeller(JSON.parse(okumaMd.deger)); } catch (e) { /* bozuksa boş */ } }
        const okumaF = await guvenliOku("fisdefter:data", anahtarKumesi);
        if (okumaF.deger) { try { setFisDefteri(JSON.parse(okumaF.deger)); } catch (e) { /* bozuksa boş */ } }
        const okumaG = await guvenliOku("gorev:data", anahtarKumesi);
        if (okumaG.deger) { try { setGorevler(JSON.parse(okumaG.deger)); } catch (e) { /* bozuksa boş */ } }
        const okumaM = await guvenliOku("mesaj:data", anahtarKumesi);
        if (okumaM.deger) { try { setMesajlar(JSON.parse(okumaM.deger)); } catch (e) { /* bozuksa boş */ } }
        try { const oo = await guvenliOku("mesaj:okuma", anahtarKumesi); if (oo.deger) setMesajOkumalari(JSON.parse(oo.deger)); } catch (e) { /* */ }

        const okuma = await guvenliOku("koli:data", anahtarKumesi);
        if (okuma.hata) okumaHatalari.push("koli:data");
        else if (okuma.supheli) supheliler.push("koli:data");
        else basariliOkuma++;
        setKoliler(okuma.deger ? JSON.parse(okuma.deger) : []);
      } catch (e) { okumaHatalari.push("koli:data"); }

      // VERİ KATMANI BAŞLANGICI — diskten okunan hâl "bilinen son hâl" olarak işaretlenir.
      // Bu yapılmazsa ilk kayıtta her satır "yeni eklendi" görünür; Supabase'e geçildiğinde
      // bütün tablo gereksiz yere yeniden yazılırdı.
      tabloBaslangicTam("urunler", yerelDamga.urunler);
      tabloBaslangicTam("siparisler", sp);
      tabloBaslangicTam("uretim", u);
      tabloBaslangicTam("cariler", c);
      tabloBaslangicTam("stok_rezervasyonlari", Array.isArray(srez) ? srez : []);
      tabloBaslangicTam("onaylar", oy);
      tabloBaslangicTam("cop", cp);
    } catch (e) {
      setStorageOk(false);
    } finally {
      setLoading(false);
    }
  })();
// Bulut ön girişinden sonra yeniden çalışır (bkz. yuklemeSayaci).
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [yuklemeSayaci]);
}
