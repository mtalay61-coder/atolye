// ================= SİPARİŞTEN TESLİM ALMA =================
//
// 19 Eylül (2. madde, 10. tur): siparişin karşılanmasını kaydeden yol — fiş kesilir, stok hareketi
// ve cari hareketi yazılır, siparişin karşılanan miktarı güncellenir.
//
// ATOMİK (22. bölüm, Adım 3): önce HESAP yapılır (hiçbir state'e dokunmadan), sonra FİŞ DEFTERİNE
// yazılır; defter yazılamazsa sipariş, stok, cari ve koli — hiçbiri değişmez. Bu sıra bir kez
// yanlış kurulmuştu: yan etkiler hesabın içindeydi ve defter reddetse bile stok değişiyordu.
//
// BİRDEN ÇOK SİPARİŞ: teslim satırı kendi `siparisId`sini taşıyabilir (aynı carinin başka bir
// siparişi). Fiş numarası ve sayaç ANA siparişten gelir, karşılanan miktar ise her siparişin
// kendisine yazılır — tek fişle iki siparişi kapatmak mümkün.
function useSiparisTeslim(d) {
  const {
    siparisler, stok, cariler, muhasebe, koliler, showToast, aktifKullanici, saveKoliler,
    fisDefterineKayitYaz, setSiparisler, setStok, setCariler,
  } = d;

const siparisGerceklestir = useCallback(async (siparisId, teslimler, defter = "Genel", koliIdler = []) => {
  let defterKaydiBekleyen = null;
  let koliIslemi = null;
  const hesap = (() => {
    const prevSiparisler = siparisler;
    const siparis = prevSiparisler.find((s) => s.id === siparisId);
    if (!siparis) return null;

    const yeniSayac = (siparis.teslimSayaci || 0) + 1;
    const fisNo = `${siparis.siparisNo}-F${yeniSayac}`;

    // Teslim satırları fiş kalemlerine çevriliyor. `kalan` da taşınıyor: sipariş fazlası hem
    // hareket üzerinde işaretlenecek hem de kullanıcıya özetlenecek.
    //
    // BİRDEN ÇOK SİPARİŞ (9b, 13 Eylül): teslim satırı `siparisId` taşıyorsa kalem O siparişten
    // alınır (aynı carinin başka bir alış siparişi). Fiş numarası ve fiş sayacı ANA (açılan)
    // siparişin; diğer siparişler yalnız `karsilanan`/durum günceller. Başka cariye ait sipariş
    // reddedilir — fiş tek cariye kesilir.
    const siparisBul = (id) => (!id || id === siparisId ? siparis : prevSiparisler.find((s) => s.id === id));
    const fisKalemleri = [];
    teslimler.forEach((t) => {
      if (!t.miktar || t.miktar <= 0) return;
      const kaynakSiparis = siparisBul(t.siparisId);
      if (!kaynakSiparis || kaynakSiparis.cariId !== siparis.cariId || kaynakSiparis.tip !== siparis.tip) return;
      const kalem = kaynakSiparis.kalemler.find((k) => k.id === t.kalemId);
      if (!kalem) return;
      const kalan = kalem.miktar - (kalem.karsilanan || 0);
      fisKalemleri.push({
        urunId: kalem.urunId, urunAd: kalem.urunAd, renk: kalem.renk, beden: kalem.beden,
        // FİŞ FİYATI (kullanıcı, 14 Eylül: "alış fişi girişinde fiyat ve para birimi de olsun ve
        // değiştirilebilir olsun"). Teslim satırı fiyat taşıyorsa O geçerli: gerçekleşen alış,
        // sipariş fiyatından farklı olabilir. Sipariş kaydının fiyatı DEĞİŞMEZ — sipariş ne
        // konuşulduğunu, fiş ne olduğunu gösterir.
        birim: kalem.birim, miktar: t.miktar,
        birimFiyat: t.birimFiyat != null && t.birimFiyat !== "" ? Number(t.birimFiyat) : kalem.birimFiyat,
        paraBirimi: t.paraBirimi || kalem.paraBirimi || "TRY",
        kalemId: kalem.id, kalan, fazlaGonderim: t.miktar > kalan,
        _siparisId: kaynakSiparis.id,
        ...(kaynakSiparis.id !== siparis.id
          ? { siparis: { id: kaynakSiparis.id, siparisNo: kaynakSiparis.siparisNo, rezervasyonSiparisId: kaynakSiparis.rezervasyonSiparisId } }
          : {}),
      });
    });

    // SEVKİYATTA OKUTULAN KOLİLER. Fiş numarası burada belli olduğu için işaretleme de burada:
    // koli "Sevk edildi"ye geçer ve hangi fişle çıktığını saklar. `fisGeriAl` bu bağdan geri döner.
    if (koliIdler && koliIdler.length > 0) {
      const zaman = new Date().toISOString();
      // ERTELENDİ (Adım 3): defter yazımı başarısız olursa koli "sevk edildi" kalmasın.
      koliIslemi = () => saveKoliler((koliler || []).map((k) => (koliIdler.includes(k.id)
        ? { ...k, durum: "Sevk edildi", sevkFisNo: fisNo, sevkZamani: zaman }
        : k)));
    }

    const fisGovdesi2 = {
      fisNo, tip: siparis.tip, cariId: siparis.cariId,
      kaynak: siparis.tip === "Alış" ? "Satınalma" : "Satış",
      stokTarihi: new Date().toISOString(),
      cariTarihi: bugunYerel(),
      // AYRIŞMA 5 KAPANDI: sipariş yolu cari hareketine zaman damgası YAZMIYORDU (bu yol
      // `addCariHareketFromStok` hunisinden geçmediği için). Sonuç: aynı gün kesilen fişler
      // ekstrede yalnızca günle görünüyor, hangisinin önce olduğu anlaşılmıyordu. Cari hareketi
      // gün bazlı saklanmaya devam ediyor; `zaman` onun yanında duran ayrı bir damga.
      zaman: new Date().toISOString(),
      // Sipariş bir "kayıt para birimi"ne ayarlanmışsa cariye işlenecek tutar HER ZAMAN o para
      // biriminde ve kayıtlı kurla hesaplanır; ayarlanmamışsa kalemin KENDİ para birimi kullanılır.
      kayitParaBirimi: siparis.kayitParaBirimi || null,
      kurlar: { ...(muhasebe.kurlar || {}), ...(siparis.kayitKurlari || {}) },
      kurZorunlu: false,
      tutarYuvarla: false,
      birimFiyatBolerek: true,
      yon: hareketYonu(siparis.tip),
      kullanici: (aktifKullanici && aktifKullanici.ad) || null,
      defter,
      odemeSekli: "Nakit",
      vade: "",
      siparis: { id: siparis.id, siparisNo: siparis.siparisNo, rezervasyonSiparisId: siparis.rezervasyonSiparisId },
      kalemler: fisKalemleri,
      cariAciklama: (k, c) =>
        `${siparis.tip} Siparişi ${(k.siparis && k.siparis.siparisNo) || siparis.siparisNo}: ${k.urunAd} · ${k.renk} · ${k.beden} · ${k.miktar} ${k.birim}${k.fazlaGonderim ? " (sipariş fazlası)" : ""}`
        + (c.cevrildiMi ? ` (${c.hamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${c.kalemPB} karşılığı)` : ""),
    };
    const sonuc = fisYaz(stok, cariler, fisGovdesi2);

    // Veri bütünlüğü: aynı id'ye sahip birden fazla ürün varsa (ya da hiç yoksa) o kalem
    // işlenmez ve kullanıcı açıkça uyarılır — sessizce yanlış ürünü güncellemektense.
    sonuc.atlananlar.forEach(({ kalem, sebep }) => {
      showToast(sebep === "yok"
        ? `Uyarı: "${kalem.urunAd}" ürünü stokta bulunamadı (id: ${kalem.urunId}) — bu kalem işlenmedi.`
        : `Veri hatası: "${kalem.urunAd}" için birden fazla ürün aynı id'yi taşıyor — bu kalem işlenmedi, lütfen bildirin.`);
    });
    const atlanan = new Set(sonuc.atlananlar.map((a) => a.kalem));
    const islenenler = fisKalemleri.filter((k) => !atlanan.has(k));
    // FİŞ DEFTERİ kaydı hazırlanıyor; YAZMA dışarıda, hesap bittikten sonra (Adım 3).
    defterKaydiBekleyen = fisDefterKaydiKur(fisGovdesi2, sonuc, { kullanici: (aktifKullanici && aktifKullanici.ad) || "" });
    if (islenenler.length === 0) {
      showToast("İşlenecek bir miktar girilmedi");
      return null;
    }
    // FAZLA SEVK REDDEDİLİYOR (kullanıcı, 19 Eylül: "sevkiyat fazla yapılamasın, olmayan ürün
    // satılamaz, mantığı iyi oturtalım").
    //
    // Eskiden fazla gönderim yalnız İŞARETLENİYORDU: fiş kesiliyor, sipariş kapanıyor ve fark
    // ancak aylar sonra fatura tutmayınca görülüyordu. 136 çiftlik siparişe 160 çift çıkmıştı.
    // Artık işlem HİÇ yapılmıyor ve hangi bedende ne kadar fazla olduğu tek tek yazılıyor —
    // "sipariş aşılıyor" demek kullanıcıya nereyi düzelteceğini söylemiyordu.
    const fazlalar = islenenler.filter((k) => k.fazlaGonderim)
      .map((k) => ({ ad: k.urunAd, renk: k.renk, beden: k.beden, fazla: k.miktar - k.kalan }));
    if (fazlalar.length > 0) {
      showToast(`Sipariş aşılıyor — ${fazlalar.map((f) => `${f.ad} ${f.renk} ${f.beden}: ${f.fazla} fazla`).join(" · ")}`);
      return null;
    }

    // OLMAYAN ÜRÜN SATILAMAZ: sevk edilen miktar mevcut stoğu aşamaz. Eksi stok teknik olarak
    // mümkün (açılış göçü, sayım farkı) ama SATIŞLA eksiye düşmek başka: depoda olmayan malı
    // sevk etmiş görünmek, hem müşteriye hem muhasebeye yanlış bilgi vermekti.
    // YALNIZ SATIŞTA: alış siparişinde mal GİRİYOR, stok kontrolü anlamsız (ilk denemede alış
    // teslimatı da reddedilmişti).
    const stokAsanlar = [];
    if (siparis.tip !== "Alış") islenenler.forEach((k) => {
      const urun = (stok || []).find((u) => u.id === k.urunId || u.ad === k.urunAd);
      if (!urun) return;
      const v = (urun.variants || []).find((x) => (x.renk || "") === (k.renk || "") && (x.beden || "") === (k.beden || ""));
      const mevcut = v ? (v.miktar || 0) : 0;
      if (k.miktar > mevcut) stokAsanlar.push(`${k.urunAd} ${k.renk} ${k.beden}: stok ${mevcut}, sevk ${k.miktar}`);
    });
    if (stokAsanlar.length > 0) {
      showToast(`Stokta yok — ${stokAsanlar.join(" · ")}`);
      return null;
    }

    const nextStok = sonuc.stok;
    const nextCariler = sonuc.cariler;

    // Her etkilenen siparişin kalemleri ve durumu kendi kaydında güncellenir. İşlenen kalemler
    // (atlananlar hariç) esas alınır.
    const islenenAnahtarlar = new Set(islenenler.map((k) => `${k._siparisId}|${k.kalemId}`));
    const etkilenenIdler = new Set(islenenler.map((k) => k._siparisId));
    const siparisiGuncelle = (s) => {
      const nextKalemler = s.kalemler.map((k) => {
        if (!islenenAnahtarlar.has(`${s.id}|${k.id}`)) return k;
        const t = teslimler.find((x) => x.kalemId === k.id && (x.siparisId || siparisId) === s.id);
        const eklenecek = t && t.miktar > 0 ? t.miktar : 0;
        // karşılanan, sipariş miktarını aşamaz (fazlalık ayrıca bildirilir), gerçek stok/cari hareketi tam miktarla işlendi
        return { ...k, karsilanan: Math.min(k.miktar, (k.karsilanan || 0) + eklenecek) };
      });
      const tumuTam = nextKalemler.every((k) => (k.karsilanan || 0) >= k.miktar);
      const hicYok = nextKalemler.every((k) => (k.karsilanan || 0) === 0);
      const yeniDurum = tumuTam ? "Tamamlandı" : hicYok ? s.durum : "Kısmi Teslim";
      return { ...s, kalemler: nextKalemler, durum: yeniDurum };
    };
    // Bu siparişin ilk teslimatında seçilen defter, sonraki tüm fişlerde varsayılan olarak hatırlanır.
    const yeniDefterTercihi = siparis.defterTercihi || defter;

    const nextSiparisler = prevSiparisler.map((s) => {
      if (s.id === siparisId) return { ...siparisiGuncelle(s), teslimSayaci: yeniSayac, defterTercihi: yeniDefterTercihi };
      if (etkilenenIdler.has(s.id)) return siparisiGuncelle(s);
      return s;
    });
    // Aşağıdaki rezervasyon uyarısı ana siparişin "tamamlandı" bilgisini kullanıyor.
    const anaSiparisSonra = nextSiparisler.find((s) => s.id === siparisId) || siparis;
    const tumuTam = anaSiparisSonra.durum === "Tamamlandı";

    // ATOMİKLİK (15 Eylül düzeltmesi): stok/cari yazımı ve depolama BURADAN kaldırıldı.
    // Hesap fonksiyonu SAF olmalı — burada `setStok` çağırmak, fiş defterine yazma başarısız
    // olsa bile stoğun değişmesi demekti; Adım 3'ün güvencesi yarım kalıyordu.

    // Bu Alış siparişi bir satış siparişi için rezerve edilmişti ama teslim alınana kadar o satış
    // BAŞKA şekilde (mevcut stoktan) zaten karşılanmış olabilir. Böyle bir çakışma varsa kullanıcıyı
    // açıkça bilgilendiriyoruz — teslim alınan ürün zaten genel stoğa eklendi, ekstra işlem gerekmez.
    let rezervasyonUyarisi = "";
    // hammaddeTalebiMi olan alışlarda bu kontrol ANLAMSIZDIR: kalemler HAMMADDEDİR, bağlı satış
    // siparişinin kalemleri ise MAMUL — urunId'ler hiçbir zaman eşleşmez, dolayısıyla kontrol ya
    // sessizce hiçbir şey bulmaz ya da (aynı ürün hem satılıp hem girdi olarak kullanılıyorsa)
    // yanıltıcı bir uyarı üretirdi. Bu yüzden hammadde alışları buradan hariç tutulur.
    if (tumuTam && siparis.tip === "Alış" && siparis.rezervasyonSiparisId && !siparis.hammaddeTalebiMi) {
      const bagliSatis = prevSiparisler.find((s) => s.id === siparis.rezervasyonSiparisId);
      if (bagliSatis) {
        const ilgiliUrunIdler = new Set(siparis.kalemler.map((k) => k.urunId));
        const ilgiliKalemler = bagliSatis.kalemler.filter((k) => ilgiliUrunIdler.has(k.urunId));
        const hepsiKarsilanmis = ilgiliKalemler.length > 0 && ilgiliKalemler.every((k) => (k.karsilanan || 0) >= k.miktar);
        if (hepsiKarsilanmis) {
          rezervasyonUyarisi = ` — ⚠ Bu satın alma "${bagliSatis.siparisNo}" siparişi için rezerve edilmişti, ama o sipariş teslim alınmadan önce zaten (stoktan) karşılanmış. Alınan ürün genel stoğa eklendi, başka bir sipariş için kullanılabilir.`;
        }
      }
    }

    return { nextSiparisler, nextStok, nextCariler, bildirim: fazlalar.length > 0
      ? `${fisNo} · Sipariş fazlası gönderildi: ${fazlalar.map((f) => `${f.ad} ${f.renk} ${f.beden} (+${f.fazla})`).join(", ")}${rezervasyonUyarisi}`
      : `${fisNo} kaydedildi — ${tumuTam ? "Sipariş tamamlandı" : "Kısmi teslim/tahsil işlendi, eksik var"}${rezervasyonUyarisi}` };
  })();

  // ---- ATOMİK KAPI (Adım 3, 15 Eylül) ----
  // Hesap bitti, hiçbir state'e dokunulmadı. Önce FİŞ DEFTERİ; yazılamazsa çıkılır ve sipariş,
  // stok, cari, koli — hiçbiri değişmez.
  // DÖNÜŞ DEĞERİ (22 Eylül, v1.415.0): çağıran işin OLUP OLMADIĞINI bilmeli. Depo > Sevkiyat
  // ekranı okutulan koliyi ancak sevk gerçekleştiyse listeden düşürüyor; defter reddederse koli
  // listede kalmalı. Uyarıyı yine bu kapı veriyor, çağıran yalnız true/false'a bakıyor.
  if (!hesap) return false;
  if (defterKaydiBekleyen && !(await fisDefterineKayitYaz(defterKaydiBekleyen))) return false;

  const { nextSiparisler, nextStok, nextCariler, bildirim } = hesap;
  setSiparisler(nextSiparisler);
  if (koliIslemi) koliIslemi();
  setStok(nextStok);
  setCariler(nextCariler);
  // Depolama isteklerini PARALEL değil SIRALI (birer birer) gönderiyoruz — aynı anda çok istek
  // atmak hız sınırına takılıp sessizce başarısız olabiliyordu. Her biri bir kez başarısız
  // olursa kısa bir bekleyip tekrar deneniyor.
  (async () => {
    // tabloYaz KULLANILIYOR, guvenliYaz DEĞİL: doğrudan yazmak veri katmanını atlıyordu ve
    // teslim alma sonucu buluta hiç gitmiyordu. Stok hareketleri tablosunun boş kalmasının
    // sebebi buydu.
    const yazilacaklar = [
      ["stok:items", "urunler", nextStok],
      ["cari:data", "cariler", nextCariler],
      ["siparis:data", "siparisler", nextSiparisler],
    ];
    const basarisizlar = [];
    for (const [key, tablo, deger] of yazilacaklar) {
      let denemeSayisi = 0;
      let basarili = false;
      while (denemeSayisi < 2 && !basarili) {
        try {
          await tabloYaz(key, tablo, deger);
          basarili = true;
        } catch (e) {
          denemeSayisi++;
          if (denemeSayisi < 2) await new Promise((r) => setTimeout(r, 400));
        }
      }
      if (!basarili) basarisizlar.push(key);
    }
    if (basarisizlar.length > 0) {
      showToast(`⚠ Şunlar kaydedilemedi: ${basarisizlar.join(", ")} — sayfayı yenilemeden tekrar deneyin!`);
    }
  })();

  // Depolama istekleri SIRALI: aynı anda çok istek hız sınırına takılıp sessizce başarısız
  // olabiliyordu. Her biri bir kez daha deneniyor.
  (async () => {
    const yazilacaklar = [
      ["stok:items", "urunler", nextStok],
      ["cari:data", "cariler", nextCariler],
      ["siparis:data", "siparisler", nextSiparisler],
    ];
    const basarisizlar = [];
    for (const [key, tablo, deger] of yazilacaklar) {
      let deneme = 0, basarili = false;
      while (deneme < 2 && !basarili) {
        try { await tabloYaz(key, tablo, deger); basarili = true; }
        catch (e) { deneme++; if (deneme < 2) await new Promise((r) => setTimeout(r, 400)); }
      }
      if (!basarili) basarisizlar.push(key);
    }
    if (basarisizlar.length > 0) {
      showToast(`⚠ Şunlar kaydedilemedi: ${basarisizlar.join(", ")} — "Yeniden dene" şeridinden gönderin`);
    }
  })();
  showToast(bildirim);
  return true;
}, [siparisler, stok, cariler, showToast, muhasebe, aktifKullanici, koliler, saveKoliler, fisDefterineKayitYaz]);

  return siparisGerceklestir;
}
