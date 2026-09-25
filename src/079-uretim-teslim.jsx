// ================= ÜRETİM TESLİM ALMA =================
//
// 19 Eylül (2. madde, 11. tur): App'ten çıkarılan EN BÜYÜK tek fonksiyon (489 satır). Bir üretim
// adımının personelden teslim alınması: sağlam/hurda ayrımı, işçilik ücreti, tamir ataması,
// son adımda mamul girişi.
//
// KURALLAR (hepsi pahalıya öğrenildi):
//   • HURDA ÜCRET ALMAZ: hurdanın çıktığı aşama o aşamadır; hurdaya işçilik ödemek, hatayı
//     ödüllendirmekti. Açıklamada "(N hurda ödenmedi)" diye yazılıyor ki tartışma olmasın.
//   • İŞÇİLİK AYRI FİŞ (`-İşçilik` ekiyle): mal hareketi ile para hareketi aynı numarada
//     toplanırsa "bu fiş neyi anlatıyor" sorusu cevapsız kalıyordu.
//   • TAMİR AYRI ATAMA: tamir, aynı adımın yeniden verilmesi olarak kaydediliyor ve kaynağı
//     yazılıyor — "kaç kez tamir gitti" sorusu ancak böyle cevaplanabiliyor.
//   • SON ADIMDA MAMUL GİRER: mamul stoğa yalnız üretim tamamlandığında girer; ara adımda girmek,
//     satılamayacak malı satılabilir göstermekti.
function useUretimTeslim(d) {
  const {
    stok, cariler, uretim, siparisler, tanimlar, showToast,
    setStok, setCariler, setUretim, aktifKullanici,
    stokRezervasyonlari, setSiparisler, setStokRezervasyonlari,
  } = d;

const uretimProsesAtamaTeslimAl = useCallback((uretimId, prosesAdi, atamaId, sonuc) => {
  const siparis = uretim.find((o) => o.id === uretimId);
  if (!siparis || !siparis.prosesIlerleme) return;
  const adimIndex = siparis.prosesIlerleme.findIndex((p) => p.proses === prosesAdi);
  if (adimIndex === -1) return;
  const adim = siparis.prosesIlerleme[adimIndex];
  const atama = (adim.atamalar || []).find((a) => a.id === atamaId);
  if (!atama || atama.tamamlandiMi) return;

  // ---- TESLİM SONUCU ----
  // Verilmemişse tamamı sağlam sayılır (eski davranış, geriye dönük uyum).
  const atamaSonuc = sonuc || { saglam: { ...(atama.bedenMiktarlari || {}) }, tamir: [], hurda: [] };
  const saglamHarita = atamaSonuc.saglam || {};
  const tamirListesi = atamaSonuc.tamir || [];
  const hurdaListesi = atamaSonuc.hurda || [];
  const iadeListesi = atamaSonuc.iadeler || [];
  // EK ALINAN HAMMADDE (20 Eylül): iş sırasında depodan fazladan alınan malzeme. İadenin
  // tersi — stoktan ÇIKAR ve kendi fişini alır (`-EkMalzeme`). Tüketimi doğrudan artırmak
  // yerine ayrı hareket: "ne verildi, ne ek alındı, ne geri geldi" üçü de kayıtta kalsın;
  // birim tüketim hesabı ancak böyle doğru çıkar.
  const ekAlinanListesi = atamaSonuc.ekAlinanlar || [];
  const hurdaAdet = hurdaListesi.reduce((t, h) => t + (h.miktar || 0), 0);
  const tamirAdet = tamirListesi.reduce((t, h) => t + (h.miktar || 0), 0);

  // Üçünün toplamı verilen miktara eşit olmalı — tutmuyorsa kayıt yapılmaz. Aksi halde çiftler
  // sessizce kaybolur ya da yoktan var olur.
  const sonucToplam = bedenToplami(saglamHarita) + tamirAdet + hurdaAdet;
  // KISMİ TESLİM: toplam verilenden AZ olabilir; FAZLA olamaz.
  if (sonucToplam - atama.miktar > 0.001) {
    showToast(`Teslim edilen ${sonucToplam}, verilen ${atama.miktar} — fazla olamaz`);
    return;
  }
  if (sonucToplam <= 0) return;

  // Beden bazında teslim edilen miktar. Hammadde tüketimi ve ücret buna göre hesaplanır —
  // verilene göre hesaplamak, teslim edilmemiş çiftin malzemesini düşmek olurdu.
  const teslimBedenleri = {};
  Object.entries(saglamHarita).forEach(([b, m]) => { teslimBedenleri[b] = (teslimBedenleri[b] || 0) + m; });
  tamirListesi.forEach((t) => { teslimBedenleri[t.beden] = (teslimBedenleri[t.beden] || 0) + t.miktar; });
  hurdaListesi.forEach((h) => { teslimBedenleri[h.beden] = (teslimBedenleri[h.beden] || 0) + h.miktar; });

  const kismiMi = atama.miktar - sonucToplam > 0.001;
  const kalanBedenleri = {};
  Object.entries(atama.bedenMiktarlari || {}).forEach(([b, m]) => {
    const kalan = stokYuvarla(m - (teslimBedenleri[b] || 0));
    if (kalan > 0) kalanBedenleri[b] = kalan;
  });

  // NOT: Burada "önceki tüm adımlar tamamlanmalı" gibi katı bir kontrol YOK — bu atama zaten
  // uretimProsesVer sırasında, önceki adımdan akan (kısmen teslim alınmış) miktarla sınırlı olarak
  // OLUŞTURULMUŞTU. Yani bu atamanın var olması, zaten önceki adımdan yeterli miktarın aktığının
  // kanıtıdır — burada AYRICA "tüm önceki prosesler tamamlandı mı" diye sormak, kısmi akışı
  // engelleyip bu adımın hiç teslim alınamamasına yol açardı (bu adım henüz gerçekten teslim
  // alınabilir durumdayken bile).

  const urun = uretimUrunu(siparis, stok);
  const toplamAdet = siparis.bedenMiktarlari.reduce((s, bm) => s + bm.miktar, 0);
  // Tüketim TESLİM EDİLEN miktara göre: ustanın elinde duran çiftin malzemesi düşülmez.
  const atamaBedenMiktarlari = teslimBedenleri;
  // Fiş numarası, kullanıcıya görünen cari hareket/ekstre kayıtlarında da kullanıldığı için, atamanın
  // ham teknik id'si (uid("atama") ile üretilen rastgele karakter dizisi) yerine bu prosesteki KAÇINCI
  // atama olduğunu gösteren sade bir sıra numarası kullanılır — tek atama varsa hiç eklenmez.
  // Ek `uretimAtamaEki`den geliyor: parça barkodu varsa ondan, yoksa konumdan. Konumdan türetmek,
  // bir atama silindiğinde diğerlerinin fiş numarasını kaydırıyordu.
  const fisNo = `${siparis.siparisNo}-${prosesAdi}${uretimAtamaEki(siparis, adim.atamalar || [], atama)}`;
  // MAMUL GİRİŞİ AYRI FİŞ.
  //
  // Önceden hammadde tüketimi ve mamul girişi AYNI fişteydi. Fiş listesinde bu, "Üretim Çıkışı"
  // etiketli bir kaydın içinde mamulün stoğa GİRDİĞİNİ göstermek anlamına geliyordu —
  // muhasebe mantığına aykırı ve takibi zor.
  //
  // Artık iki ayrı fiş: `1001-Temizleme` (hammadde çıkışı) ve `1001-Temizleme-Giriş`
  // (mamul girişi). Numara ortak kökten türediği için geri alma ikisini de buluyor.
  const girisFisNo = `${fisNo}-Giriş`;
  // Tüketim özeti artık yalnızca sonucu değil HESABI da taşır: hangi reçete satırı, kaç adetle
  // çarpıldı. "Takviye Bezi -0,9 metre" yazısı, 0,9'un nereden geldiğini söylemiyordu; bir eksik
  // tüketim şüphesinde kullanıcının bakabileceği tek yer burasıydı ve orada bilgi yoktu.
  const hareketOzet = [];
  const tuketimDetay = {}; // hammaddeAd -> { toplam, birim, parcalar: ["0,1 × 9 (36)"] }
  // Rezervasyon düşümü için: hangi hammadde+renk+bedenden ne kadar tüketildi.
  // Stok güncellemesiyle AYNI geçişte toplanır ki iki hesap birbirinden ayrışmasın.
  const rezervasyonDusulecek = []; // { hammaddeUrunId, hammaddeAd, renk, beden, miktar, birim }

  // Bu ATAMAYA ait hammaddeleri (reçeteden, atamanın GERÇEK beden dağılımına göre — oransal tahmin
  // değil, tam doğru) düş.
  let nextStok = stok;

  // KAPSAM UYARISI: bu atamada üretilen bedenlerden bazılarının reçetede karşılığı yoksa, o
  // bedenler için HİÇ hammadde düşülmez. Sessiz kalırsa fark ancak sayımda ortaya çıkar; bu
  // yüzden teslim alma anında, tam da eksiğin oluştuğu yerde bildirilir.
  if (urun && Array.isArray(urun.recete)) {
    const uretilenBedenler = Object.keys(atamaBedenMiktarlari).filter((b) => atamaBedenMiktarlari[b] > 0);
    const kapsamEksik = receteKapsamEksikleri(urun, siparis.renk, uretilenBedenler)
      .filter((e) => !prosesAdi || !e.proses || e.proses === prosesAdi);
    if (kapsamEksik.length > 0) {
      const ozet = kapsamEksik
        .slice(0, 3)
        .map((e) => `${e.hammaddeAd} (${e.eksikBedenler.join(", ")})`)
        .join("; ");
      showToast(
        `Dikkat: reçetede bu bedenler tanımlı değil — ${ozet}${kapsamEksik.length > 3 ? " …" : ""}. ` +
        "Bu bedenler için hammadde DÜŞÜLMEDİ. Ürün kartı > Reçete sekmesinden tamamlayın."
      );
    }
  }

  if (urun && urun.recete) {
    nextStok = stok.map((p) => {
      let pDegisti = false;
      let variants = p.variants;
      const yeniHareketler = [];
      urun.recete
        .filter((r) => {
          if (r.proses !== prosesAdi || r.mamulRenk !== siparis.renk || r.hammaddeUrunId !== p.id) return false;
          // TAMİR atamasında reçetenin TAMAMI değil, yalnızca SEÇİLEN hammaddeler yeniden çıkar.
          // Sökülüp yeniden kullanılan parçalar için ikinci kez malzeme düşmek, stoğu yanlış
          // gösterir; hiç düşmemek de kullanılan malzemeyi görünmez kılardı. Seçim kullanıcıda.
          if (atama.tamirMi) return (atama.tamirHammaddeler || []).includes(r.hammaddeUrunId);
          return true;
        })
        .forEach((r) => {
          const uretilenMiktar = r.mamulBeden === "Tüm Bedenler"
            ? Object.values(atamaBedenMiktarlari).reduce((s, m) => s + m, 0)
            : (atamaBedenMiktarlari[r.mamulBeden] || 0);
          if (!uretilenMiktar) return;
          // ELLE VERİLEN MİKTAR REÇETEYİ EZER (kullanıcı, 19 Eylül: "elle doldurduğumuzda
          // yazılıyor ama yine reçeteden çekiyor... burada sadece elle girilen miktarı üretime
          // çıkış yapması gerekiyor").
          //
          // İş verirken kullanıcı hammadde miktarını değiştirebiliyor (`verilenHammaddeler`) —
          // reçete 300 desi diyor ama ustaya 390 desi veriliyor. Stok çıkışı yine reçeteden
          // hesaplanınca DEPODA OLMAYAN 90 desi havada kalıyordu: fiilen çıkan mal ile kayıt
          // tutmuyordu. Artan hesabı zaten verilen miktara göre yapılıyordu; çıkış da öyle olmalı.
          const _etkinRenkOn = ambalajRengiUygula(r, siparis, stok);
          const _verilenKayit = (atama.verilenHammaddeler || {})[`${r.hammaddeUrunId}|${_etkinRenkOn}|${r.beden}`];
          const tuketilecek = _verilenKayit && _verilenKayit.verilen != null
            ? Math.round((_verilenKayit.verilen || 0) * 100) / 100
            : Math.round(r.miktar * uretilenMiktar * 100) / 100;
          if (!(tuketilecek > 0)) return;
          // Siparişte seçilen kutu rengi burada da uygulanır (bkz. ilk tüketim noktasındaki not).
          // `siparis` burada ÜRETİM emridir; kutu tercihi planlama sırasında ona kopyalanmıştır.
          const etkinRenk = ambalajRengiUygula(r, siparis, stok);
          variants = variants.map((v) =>
            v.renk === etkinRenk && v.beden === r.beden ? { ...v, miktar: stokYuvarla(v.miktar - tuketilecek) } : v
          );
          pDegisti = true;
          rezervasyonDusulecek.push({
            hammaddeUrunId: r.hammaddeUrunId, hammaddeAd: r.hammaddeAd,
            renk: etkinRenk, beden: r.beden, miktar: tuketilecek, birim: hammaddeBirimi(r.hammaddeUrunId, stok, r.birim),
          });
          if (!tuketimDetay[r.hammaddeAd]) tuketimDetay[r.hammaddeAd] = { toplam: 0, birim: hammaddeBirimi(r.hammaddeUrunId, stok, r.birim), parcalar: [] };
          tuketimDetay[r.hammaddeAd].toplam = Math.round((tuketimDetay[r.hammaddeAd].toplam + tuketilecek) * 1000) / 1000;
          tuketimDetay[r.hammaddeAd].parcalar.push(
            `${r.miktar}×${uretilenMiktar}${r.mamulBeden === "Tüm Bedenler" ? "" : ` (${r.mamulBeden})`}`
          );
          yeniHareketler.push({
            id: uid("hrk"), tarih: new Date().toISOString(),
            renk: etkinRenk, beden: r.beden, miktar: -tuketilecek,
            kaynak: "Üretim", cariId: null, siparisNo: siparis.siparisNo, uretimId: siparis.id,
            fisNo,
          });
        });
      if (!pDegisti) return p;
      return { ...p, variants, hareketler: [...yeniHareketler, ...(p.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI) };
    });

    // Özet satırları: "Takviye Bezi -7,2 metre (0,1×9 (36) + 0,1×9 (37) + …)"
    Object.entries(tuketimDetay).forEach(([ad, d]) => {
      const parcaMetni = d.parcalar.length > 1
        ? ` [${d.parcalar.slice(0, 6).join(" + ")}${d.parcalar.length > 6 ? " + …" : ""}]`
        : ` [${d.parcalar[0]}]`;
      hareketOzet.push(`${ad} -${d.toplam} ${d.birim}${parcaMetni}`);
    });
  }

  // İşçilik ücreti. TAMİR atamalarında reçetedeki proses ücreti KULLANILMAZ — tamir ücreti
  // atamaya özeldir ve elle girilir: hatayı yapan usta bedelsiz düzeltebilir (0), ya da iş başka
  // bir ustaya yaptırılıp ona ödenir. Normal atamalarda ürünün proses ücreti geçerlidir.
  const ucret = atama.tamirMi
    ? (atama.tamirUcret || 0)
    : (urun && urun.prosesUcretleri ? (urun.prosesUcretleri[prosesAdi] || 0) : 0);
  let nextCariler = cariler;
  if (atama.personelId && ucret > 0) {
    // HURDA ÜCRETİ ÖDENMEZ: hurdanın çıktığı aşama bu aşamadır ve o adetler için işçilik
    // hak edilmemiştir. Önceki aşamalarda ödenmiş ücretlere dokunulmaz — o işler yapılmıştı.
    // Tamir edilen çiftler için ücret ÖDENİR: iş yapıldı, kusur tamirde giderilecek.
    // Ücret de teslim edilen üzerinden; hurda yine düşülür.
    const ucretliAdet = Math.max(0, sonucToplam - hurdaAdet);
    const tutar = ucretliAdet * ucret;
    nextCariler = cariler.map((c) =>
      c.id === atama.personelId
        ? {
            ...c,
            hareketler: [{
              id: uid("hrk"), tarih: bugunYerel(), zaman: new Date().toISOString(),
              // YÖN (22 Eylül, v1.409.0 — kullanıcı: "işçilik fişleri ters yazılıyor, bizim personele
              // borçlanmamız gerekli"). "Borç" yazılıyordu: personel bize borçlu görünüyor, ödeme de
              // bakiyeyi kapatmak yerine BÜYÜTÜYORDU. İşçilik bir hizmet alımıdır — alış gibi ALACAK.
              // Yön tek kaynaktan (`hareketYonu`), elle yazılmıyor: kural üç kez kurulmuştu, ikisi yanlıştı.
              // İŞLEM TİPİ YAZILIYOR (23 Eylül, v1.433.0 — kullanıcı: "işçilik olan sanki alım yapmışız gibi
              // gösteriyor"). Tip yoktu: cari ekstresi fiş numarasının önekine bakıp karar veriyor
              // (AF- alış, SF- satış…), işçilik hiçbirine uymadığı için ROZETSİZ kalıyor ve ürün alanları
              // olduğu için alış fişi gibi tablolanıyordu. Artık kendi tipiyle geliyor.
              islemTipi: "İşçilik",
              yon: hareketYonu("İşçilik"), tutar, odemeSekli: "Nakit", vade: "", defter: "Genel",
              // İŞÇİLİK AYRI FİŞ — bkz. ara proses tarafındaki gerekçe.
              siparisNo: siparis.siparisNo, fisNo: `${fisNo}-İşçilik`, uretimId: siparis.id,
              // urunAd/renk, bu hareketin ürün resmini gösterebilmek için yapısal olarak da tutulur —
              // açıklama metnindeki ürün adını ayrıca ayrıştırmaya gerek kalmaz.
              urunAd: siparis.model, renk: siparis.renk,
              // ADET VE BİRİM FİYAT ALAN OLARAK (kullanıcı, 19 Eylül: "üretim işçilikte br fiyat
              // ve adet göstermeli, sonuçta var bu"). Bilgi açıklama metninde vardı ama fiş
              // listesi ALANLARI okuyor; metinden ayrıştırmak kırılgan olurdu.
              miktar: ucretliAdet, birimFiyat: ucret, birim: "adet",
              // Açıklama, fişin NE İÇİN kesildiğini kendi başına anlatmalı: cari ekstresine
              // bakan kişi sipariş numarasını açıp bakmak zorunda kalmasın.
              // "Üretim (Kesim)" ne olduğunu söylemiyordu; "Kesim işçilik ücreti" söylüyor.
              aciklama: (atama.tamirMi ? `${prosesAdi} tamir ücreti` : `${prosesAdi} işçilik ücreti`) +
                ` — ${siparis.model} · ${ucretliAdet} adet × ${ucret} ₺` +
                (atama.tamirMi && atama.tamirKaynakProses ? ` — ${atama.tamirKaynakProses} kaynaklı` : "") +
                (hurdaAdet > 0 ? ` (${hurdaAdet} hurda ödenmedi)` : ""),
            }, ...(c.hareketler || [])],
          }
        : c
    );
  }

  // let: aşağıda tamir atamaları eklenirken yeniden atanır.
  let nextProsesIlerleme = siparis.prosesIlerleme.map((p, i) => {
    if (i !== adimIndex) return p;
    const yeniAtamalar = (p.atamalar || []).map((a) =>
      a.id === atamaId
        ? {
            ...a, tamamlandiMi: true, tamamlanmaTarihi: new Date().toISOString(),
            // Sonuç atamaya yazılır: akış, ücret ve fire raporları buradan okur.
            sonuc: { saglam: saglamHarita, tamir: tamirListesi, hurda: hurdaListesi },
          }
        : a
    );
    const tamamlananToplam = yeniAtamalar.filter((a) => a.tamamlandiMi).reduce((s, a) => s + a.miktar, 0);
    const adimTamamlandiMi = yeniAtamalar.every((a) => a.tamamlandiMi) && tamamlananToplam >= toplamAdet;
    return { ...p, atamalar: yeniAtamalar, tamamlandiMi: adimTamamlandiMi, tamamlanmaTarihi: adimTamamlandiMi ? new Date().toISOString() : null };
  });
  const tumuTamam = nextProsesIlerleme.every((p) => p.tamamlandiMi);
  const buAdimTamamlandiMi = nextProsesIlerleme[adimIndex].tamamlandiMi;
  const buAdimSonProsesMi = adimIndex === siparis.prosesIlerleme.length - 1;

  // Bu atama SON PROSESE aitse, mamulün BU ATAMAYA karşılık gelen kısmı HEMEN stoğa eklenir —
  // siparişin TAMAMININ bitmesini beklemeye gerek yoktur. Böylece örneğin 56 çiftlik bir siparişte
  // 32 çift son prosesten geçtiyse, o 32 çift derhal satılabilir/stokta görünür hale gelir; kalan 24
  // çift henüz önceki proseste bekliyor olsa bile. Aynı fişNo (bu atamaya özel) kullanılır ki silme/
  // geri alma işlemleri bu mamul eklemesini de doğru şekilde bulup geri alabilsin.
  if (buAdimSonProsesMi) {
    nextStok = nextStok.map((p) => {
      if (p.id !== siparis.urunId) return p;
      let variants = p.variants;
      const yeniHareketler = [];
      // Mamul stoğuna yalnızca SAĞLAM çiftler girer. Hurda gitti; tamirdeki çift henüz bitmedi,
      // tamir tamamlanıp akışa döndüğünde stoğa eklenecek.
      Object.entries(saglamHarita).forEach(([beden, miktar]) => {
        if (!miktar || miktar <= 0) return;
        variants = variants.map((v) =>
          v.renk === siparis.renk && v.beden === beden ? { ...v, miktar: stokYuvarla(v.miktar + miktar) } : v
        );
        yeniHareketler.push({
          id: uid("hrk"), tarih: new Date().toISOString(),
          renk: siparis.renk, beden, miktar,
          kaynak: "Üretim", cariId: null, siparisNo: siparis.siparisNo, uretimId: siparis.id,
          fisNo: girisFisNo,
          // Bu üretim bir satış siparişinin Tedarik Planlaması ile oluştuysa, o satışın GERÇEK
          // kimliği (rezervasyonSiparisId) buraya taşınır — kesin kaynak izleme için.
          rezervasyonSiparisId: siparis.rezervasyonSiparisId || null,
        });
      });
      return { ...p, variants, hareketler: [...yeniHareketler, ...(p.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI) };
    });
  }

  // ---- TAMİR ATAMALARI ----
  // Tamire ayrılan çiftler, seçilen prosese GERİ döner ve orada yeni bir atama olarak belirir.
  // Ayrı bir "tamir kuyruğu" kurmak yerine normal atama akışını kullanıyoruz: iş verme, teslim
  // alma, geri alma zaten çalışıyor — ikinci bir akış kurmak, düzeltmeleri iki yerde yapmayı
  // gerektirirdi. Atama `tamirMi` ile işaretlenir; ücreti reçeteden değil, elle girilen değerden
  // gelir (tamir işçiliği değişkendir).
  if (tamirListesi.length > 0) {
    tamirListesi.forEach((t) => {
      const hedefIndex = nextProsesIlerleme.findIndex((x) => x.proses === t.hedefProses);
      if (hedefIndex === -1) return;
      const bedenMiktarlari = { [t.beden]: t.miktar };
      const tamirAtamasi = {
        id: uid("atama"),
        personelId: t.personelId || null,
        bedenMiktarlari, miktar: t.miktar,
        // Personel seçildiyse iş doğrudan VERİLMİŞ sayılır — kim yapacağı zaten belli, ayrıca
        // "iş ver" adımı istemek gereksiz bir tıklama olurdu. Seçilmediyse o proseste bekleyen
        // iş olarak görünür ve normal akışta atanır.
        verildiMi: !!t.personelId,
        verilmeTarihi: t.personelId ? new Date().toISOString() : null,
        tamamlandiMi: false, tamamlanmaTarihi: null,
        tamirMi: true,
        tamirKaynakProses: prosesAdi,
        tamirSebep: t.sebep || "",
        tamirUcret: t.ucret || 0,
        // Tamirde hangi hammaddelerin yeniden çıkacağı seçilir; boşsa hiç hammadde düşülmez.
        tamirHammaddeler: t.hammaddeler || [],
      };
      nextProsesIlerleme = nextProsesIlerleme.map((x, i) =>
        i === hedefIndex ? { ...x, atamalar: [...(x.atamalar || []), tamirAtamasi], tamamlandiMi: false } : x
      );
    });
  }

  const nextUretim = uretim.map((o) =>
    o.id === uretimId
      ? { ...o, prosesIlerleme: nextProsesIlerleme, asama: tumuTamam ? "Tamamlandı" : prosesAdi, stogaEklendiMi: tumuTamam || o.stogaEklendiMi }
      : o
  );

  // ---- REÇETE GERÇEKLEŞMESİ ----
  //
  // Kullanıcı (6 Eylül): "Hammadde birim adedi reçeteye NOT olarak yansısın — deri 30 desi
  // planlandı ama 31 desiden çıkıyor gibi. Bununla hem reçete kontrolü yaparız, gerçek maliyet
  // yakalanıyor mu diye."
  //
  //     gerçek birim tüketim = (verilen − iade) / teslim alınan sağlam adet
  //
  // ÖLÇÜM ANI BURASI: verilen hammadde atamada kayıtlı (7z-18), iade de bu teslim almada
  // giriliyor. İkisi ilk kez bir arada yalnız bu noktada bulunuyor.
  //
  // SAĞLAM ADEDE BÖLÜNÜYOR, verilen adede değil: hurda çıkan çift için de deri harcandı ama o
  // çift satılmayacak. "Bir SATILABİLİR çift kaç desi yiyor" sorusunun cevabı maliyet için
  // doğru olanı. (Fire ayrı bir başlık ve kendi ekranında izleniyor.)
  const verilenler = atama.verilenHammaddeler || null;
  const saglamToplam = Object.values(saglamHarita).reduce((t, m) => t + (Number(m) || 0), 0);
  if (verilenler && saglamToplam > 0) {
    const olcumler = [];
    Object.entries(verilenler).forEach(([anahtar, v]) => {
      if (!v || !(v.verilen > 0)) return;
      // Bu hammaddeden bu teslimde geri gelen miktar.
      const iade = iadeListesi
        .filter((i) => `${i.urunId}|${i.renk}|${i.beden}` === anahtar)
        .reduce((t, i) => t + (i.miktar || 0), 0);
      const netTuketim = v.verilen - iade;
      if (!(netTuketim > 0)) return;
      olcumler.push({
        hammaddeUrunId: v.urunId,
        renk: v.renk,
        beden: v.beden,
        // Reçete beklentisi de ADET BAŞINA çevriliyor: `beklenen` bu atamanın TOPLAMI için
        // hesaplanmıştı, karşılaştırma birim bazında olmalı.
        planlanan: v.beklenen > 0 ? Math.round((v.beklenen / saglamToplam) * 10000) / 10000 : 0,
        gerceklesen: Math.round((netTuketim / saglamToplam) * 10000) / 10000,
        tarih: bugunYerel(),
        // Hangi üretimde (21 Eylül): Maliyet sekmesinde fark "üretim no · stok · fark" diye
        // gösteriliyor; özet ortalama bunu kaybediyordu.
        uretimNo: siparis.siparisNo || null,
        toplamFark: Math.round((netTuketim - (v.beklenen || 0)) * 10000) / 10000,
      });
    });
    if (olcumler.length > 0) {
      // Ölçüm MAMULE yazılıyor: "bu modelden bir çift kaç desi yiyor" sorusu ürünün sorusudur.
      // Aynı deri başka modelde başka miktarda kullanılır.
      nextStok = nextStok.map((p) => (p.id === siparis.urunId
        ? { ...p, receteGerceklesme: receteGerceklesmeEkle(p.receteGerceklesme, olcumler) }
        : p));
    }
  }

  // ---- ARTAN HAMMADDE İADESİ ----
  // Kesimde artan deri, ambalajda artan kutu stoğa geri döner. Tüketim reçeteye göre YAZILMAYA
  // DEVAM EDER; iade ayrı bir GİRİŞ hareketi olur. Tüketimi doğrudan azaltmak daha kısa olurdu
  // ama "ne verildi / ne geri geldi" ayrımını kaybederdik — fire hesabı da yanlış çıkardı.
  if (iadeListesi.length > 0) {
    nextStok = nextStok.map((p) => {
      const bu = iadeListesi.filter((i) => i.urunId === p.id && i.miktar > 0);
      if (bu.length === 0) return p;
      let variants = p.variants;
      const yeniHareketler = [];
      bu.forEach((i) => {
        variants = variants.map((v) =>
          v.renk === i.renk && v.beden === i.beden
            ? { ...v, miktar: stokYuvarla(v.miktar + i.miktar) }
            : v
        );
        yeniHareketler.push({
          id: uid("hrk"), tarih: new Date().toISOString(),
          renk: i.renk, beden: i.beden, miktar: i.miktar,
          // AYRI FİŞ (kullanıcı, 17 Eylül): iade, çıkışla AYNI fiş numarasını taşıyordu; fiş
          // listesinde tek satır ve NET (-168) görünüyor, +8'lik iade hiçbir fişte
          // görünmüyordu. Oysa iade ayrı bir olay: farklı yön, farklı an. Artık kendi fişi var
          // (`10001-Kesim-İade`) ve fiş listesinde ayrı satır olarak duruyor.
          // Geri alma da bu numarayı tanıyor (`uretimFisAdlari`).
          kaynak: "Üretim", fisNo: `${fisNo}-İade`, uretimId: siparis.id, siparisNo: siparis.siparisNo,
          rezervasyonSiparisId: siparis.rezervasyonSiparisId || null,
          aciklama: `Artan iade (${prosesAdi}): ${siparis.model} · ${siparis.renk}`,
        });
      });
      return { ...p, variants, hareketler: [...yeniHareketler, ...(p.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI) };
    });
  }

  if (ekAlinanListesi.length > 0) {
    nextStok = nextStok.map((p) => {
      const bu = ekAlinanListesi.filter((i) => i.urunId === p.id && i.miktar > 0);
      if (bu.length === 0) return p;
      let variants = p.variants;
      const yeniHareketler = [];
      bu.forEach((i) => {
        variants = variants.map((v) =>
          v.renk === i.renk && v.beden === i.beden
            ? { ...v, miktar: stokYuvarla(v.miktar - i.miktar) }
            : v
        );
        yeniHareketler.push({
          id: uid("hrk"), tarih: new Date().toISOString(),
          renk: i.renk, beden: i.beden, miktar: -i.miktar,
          kaynak: "Üretim", fisNo: `${fisNo}-EkMalzeme`, uretimId: siparis.id, siparisNo: siparis.siparisNo,
          rezervasyonSiparisId: siparis.rezervasyonSiparisId || null,
          aciklama: `Ek malzeme (${prosesAdi}): ${siparis.model} · ${siparis.renk}`,
        });
      });
      return { ...p, variants, hareketler: [...yeniHareketler, ...(p.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI) };
    });
  }

  // ---- REZERVASYON TÜKETİMİ ----
  // Tüketilen hammadde, bu üretimin bağlı olduğu satış siparişinin AÇIK rezervasyonlarından
  // FIFO ile düşülür. Rezervasyonu aşan kısım engellenmez, "rezervasyonsuz" sayılır ve uyarılır —
  // fire atölyede gerçek, işi durdurmak yanlış olurdu.
  let nextSiparislerRez = siparisler;
  let nextStokRez = stokRezervasyonlari;
  const rezervasyonsuzlar = [];
  const kapananRezervasyonlar = [];
  if (siparis.rezervasyonSiparisId && rezervasyonDusulecek.length > 0) {
    rezervasyonDusulecek.forEach((d) => {
      // ÖNCE stok rezervasyonu (üretim kararında ayrılan mevcut mal), SONRA alış rezervasyonu.
      // Sıra önemli: stoktan ayrılan mal fiilen elde, alış rezervasyonu ise satın alınmış maldır.
      // Elde olanı önce tüketmek, hem gerçek akışa hem FIFO'ya uygun.
      const stokSonuc = stokRezervasyonTuket(
        nextStokRez, siparis.rezervasyonSiparisId,
        d.hammaddeUrunId, d.renk, d.beden, d.miktar, -1
      );
      nextStokRez = stokSonuc.defter;
      stokSonuc.kapananlar.forEach((no) => { if (no && !kapananRezervasyonlar.includes(no)) kapananRezervasyonlar.push(no); });

      const kalan = stokSonuc.kalanIhtiyac;
      if (kalan > 0.0001) {
        const sonuc = rezervasyonTuket(
          nextSiparislerRez, siparis.rezervasyonSiparisId,
          d.hammaddeUrunId, d.renk, d.beden, kalan, -1
        );
        nextSiparislerRez = sonuc.yeniSiparisler;
        if (sonuc.rezervasyonsuz > 0.0001) {
          rezervasyonsuzlar.push(`${d.hammaddeAd} ${Math.round(sonuc.rezervasyonsuz * 1000) / 1000} ${d.birim || ""}`.trim());
        }
        sonuc.kapananlar.forEach((no) => { if (no && !kapananRezervasyonlar.includes(no)) kapananRezervasyonlar.push(no); });
      }
    });
  }

  setStok(nextStok);
  setCariler(nextCariler);
  setUretim(nextUretim);
  yazimiIzle(tabloYaz("stok:items", "urunler", nextStok), "Stok kartları", nextStok);
  yazimiIzle(tabloYaz("cari:data", "cariler", nextCariler), "Cari kartları", nextCariler);
  yazimiIzle(tabloYaz("uretim:siparisler", "uretim", nextUretim), "Üretim", nextUretim);
  if (nextSiparislerRez !== siparisler) {
    setSiparisler(nextSiparislerRez);
    yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparislerRez), "Siparişler", nextSiparislerRez);
  }
  // Artan malzeme rezervasyonu da SERBEST bırakır: geri gelen mal aslında tüketilmemiştir.
  // Bunu atlarsak rezervasyon "kullanıldı" görünür ve o sipariş için stokta duran malzeme
  // ikinci kez talep edilmiş gibi hesaplanır.
  if (siparis.rezervasyonSiparisId && iadeListesi.length > 0) {
    iadeListesi.forEach((i) => {
      const sSonuc = stokRezervasyonTuket(
        nextStokRez, siparis.rezervasyonSiparisId, i.urunId, i.renk, i.beden, i.miktar, +1
      );
      nextStokRez = sSonuc.defter;
      const kalanIade = i.miktar - sSonuc.dusulen;
      if (kalanIade > 0.0001) {
        const aSonuc = rezervasyonTuket(
          nextSiparislerRez, siparis.rezervasyonSiparisId, i.urunId, i.renk, i.beden, kalanIade, +1
        );
        nextSiparislerRez = aSonuc.yeniSiparisler;
      }
    });
  }

  if (nextStokRez !== stokRezervasyonlari) {
    setStokRezervasyonlari(nextStokRez);
    yazimiIzle(tabloYaz("stokrez:data", "stok_rezervasyonlari", nextStokRez), "Stok rezervasyonları", nextStokRez);
  }

  // Bu üretim bir satış siparişi için rezerve edilmişti ama üretim bitene kadar o satış BAŞKA
  // şekilde (mevcut stoktan) zaten karşılanmış olabilir. Böyle bir çakışma varsa kullanıcıyı
  // açıkça bilgilendiriyoruz — üretilen mamul zaten genel stoğa eklendi (yukarıda), ekstra bir
  // işlem gerekmiyor, ama kullanıcının "neden fazla stok var" diye şaşırmaması için bunu belirtiyoruz.
  let rezervasyonUyarisi = "";
  // Kısmi teslimde kalan miktar açıkça söylenir; yoksa "eksik mi girdim" tereddüdü doğar.
  if (kismiMi) {
    rezervasyonUyarisi += ` — ${stokYuvarla(atama.miktar - sonucToplam)} çift ustada kaldı, sonra teslim edilecek.`;
  }
  // FİRE ÖZETİ — hurda ve tamir sessiz kalmamalı; ikisi de maliyet ve teslim tarihi etkiler.
  if (hurdaAdet > 0) {
    rezervasyonUyarisi += ` — ⚠ ${hurdaAdet} çift HURDA (ücret ödenmedi, harcanan hammadde kayıp).` +
      ` Siparişi tamamlamak için ${hurdaAdet} çift yeniden başlatılmalı.`;
  }
  if (iadeListesi.length > 0) {
    const ozet = iadeListesi.map((i) => `${i.ad} ${i.miktar} ${i.birim || ""}`.trim()).join(", ");
    rezervasyonUyarisi += ` — artan stoğa döndü: ${ozet}`;
  }
  if (tamirAdet > 0) {
    const hedefler = Array.from(new Set(tamirListesi.map((t) => t.hedefProses))).join(", ");
    rezervasyonUyarisi += ` — ${tamirAdet} çift TAMİRE gönderildi (${hedefler}).`;
  }
  if (kapananRezervasyonlar.length > 0) {
    rezervasyonUyarisi += ` — rezervasyon kapandı: ${kapananRezervasyonlar.join(", ")}`;
  }
  if (rezervasyonsuzlar.length > 0) {
    // Rezervasyonu aşan tüketim, BAŞKA bir siparişin rezervesini yemiş olabilir. Sessiz kalırsa
    // eksik ancak o sipariş üretime girdiğinde ortaya çıkar.
    rezervasyonUyarisi += ` — ⚠ rezervasyon dışı tüketim: ${rezervasyonsuzlar.join(", ")}. Başka siparişlerin rezervesi etkilenmiş olabilir.`;
  }
  if (tumuTamam && siparis.rezervasyonSiparisId) {
    const bagliSatis = siparisler.find((s) => s.id === siparis.rezervasyonSiparisId);
    if (bagliSatis) {
      const ilgiliKalemler = bagliSatis.kalemler.filter((k) => k.urunId === siparis.urunId && k.renk === siparis.renk);
      const hepsiKarsilanmis = ilgiliKalemler.length > 0 && ilgiliKalemler.every((k) => (k.karsilanan || 0) >= k.miktar);
      if (hepsiKarsilanmis) {
        rezervasyonUyarisi = ` — ⚠ Bu üretim "${bagliSatis.siparisNo}" siparişi için rezerve edilmişti, ama o sipariş üretim bitmeden önce zaten (stoktan) karşılanmış. Üretilen mamul genel stoğa eklendi, başka bir sipariş için kullanılabilir.`;
      }
    }
  }

  showToast(
    (tumuTamam
      ? `${siparis.siparisNo} tüm prosesler tamamlandı — mamul stoğa eklendi`
      : buAdimTamamlandiMi
      ? `${prosesAdi} adımı tamamen bitti${hareketOzet.length ? ` (${hareketOzet.join(", ")})` : ""}${buAdimSonProsesMi ? " — bu kısım mamul stoğa eklendi" : ""}`
      : `${atama.miktar} adetlik atama teslim alındı${hareketOzet.length ? ` (${hareketOzet.join(", ")})` : ""}${buAdimSonProsesMi ? " — bu kısım mamul stoğa eklendi" : ""}`)
    + rezervasyonUyarisi
  );
}, [stok, cariler, uretim, siparisler, showToast, stokRezervasyonlari]);

  return uretimProsesAtamaTeslimAl;
}
