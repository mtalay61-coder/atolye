// Bir Satış siparişindeki eksik (henüz tam karşılanmamış) kalemlerin durumunu tek bir özet rozete
// çevirir. Sipariş ilk girildiğinde (hiç planlama yokken) "Planlanacak", Tedarik Planlama'dan satın
// alma oluşturulunca "Satın Alınacak", üretim planlanınca "Üretilecek" — ve bunların ilerleme
// durumlarına (bekliyor/kısmi/tamam) göre daha spesifik metinler döner. Eksik kalem yoksa null döner.
function siparisTedarikDurumuHesapla(siparis, tumSiparisler, uretimSiparisleri) {
  if (siparis.tip !== "Satış" || siparis.durum === "İptal") return null;
  const eksikKalemler = siparis.kalemler.filter((k) => (k.karsilanan || 0) < k.miktar);
  if (eksikKalemler.length === 0) return null;

  const planlanmamis = eksikKalemler.filter((k) => !k.planlama);
  const satinAlmaPlanli = eksikKalemler.filter((k) => k.planlama && k.planlama.tip === "Satınalma");
  const uretimPlanli = eksikKalemler.filter((k) => k.planlama && k.planlama.tip === "Üretim");

  // Hiçbir eksik kalem için planlama yapılmamışsa, en öncelikli/en genel durum budur.
  if (planlanmamis.length === eksikKalemler.length) {
    return { metin: "Planlanacak", renk: "var(--erp-text-3)" };
  }

  let tamamlanan = 0, kismi = 0;
  satinAlmaPlanli.forEach((k) => {
    const bagli = (tumSiparisler || []).find((s) => s.siparisNo === k.planlama.referansNo);
    if (bagli && bagli.durum === "Tamamlandı") tamamlanan++;
    else if (bagli && bagli.durum === "Kısmi Teslim") kismi++;
  });
  uretimPlanli.forEach((k) => {
    const bagli = (uretimSiparisleri || []).find((o) => o.siparisNo === k.planlama.referansNo);
    if (bagli && bagli.stogaEklendiMi) tamamlanan++;
  });
  const planliToplam = satinAlmaPlanli.length + uretimPlanli.length;

  if (planlanmamis.length > 0) {
    // Bazıları hiç planlanmamış, bazıları planlanmış — karma durum, en dikkat gerektirene işaret eder.
    return { metin: "Kısmen Planlanacak", renk: "var(--erp-text-3)" };
  }
  if (tamamlanan === planliToplam) {
    return { metin: "Tedarik Tamam", renk: "var(--erp-primary)" };
  }
  if (kismi > 0 || tamamlanan > 0) {
    return { metin: "Tedarik Kısmen Hazır", renk: "#C97B3D" };
  }
  if (satinAlmaPlanli.length > 0 && uretimPlanli.length === 0) {
    return { metin: "Alış Siparişi", renk: "var(--erp-info)" };
  }
  // Üst rozet YALNIZCA TÜRÜ söyler: üretimde mi, satın almada mı, ikisi birden mi.
  // Hangi proseste olduğu SATIR BAZINDA gösterilir (kalem matrisinde) — bir siparişte birden
  // fazla ürün/renk olabilir ve her biri farklı aşamada olur; tek bir rozete sıkıştırmak
  // yanıltıcı olurdu.
  const uretimBasladiMi = uretimPlanli.some((k) => {
    const bagli = (uretimSiparisleri || []).find((o) => o.siparisNo === k.planlama.referansNo);
    return bagli && (bagli.prosesIlerleme || []).some((p) => p.tamamlandiMi || (p.atamalar || []).some((a) => a.verildiMi));
  });

  if (uretimPlanli.length > 0 && satinAlmaPlanli.length > 0) {
    return { metin: "Üretim + Satın Alma", renk: "var(--erp-purple)", uretimde: uretimBasladiMi };
  }
  if (uretimPlanli.length > 0) {
    return uretimBasladiMi
      ? { metin: "Üretimde", renk: "var(--erp-primary)", uretimde: true }
      : { metin: "Üretilecek", renk: "var(--erp-info)" };
  }
  return { metin: "Tedarik Bekleniyor", renk: "var(--erp-info)" };
}

// Fişteki ürün SATIRLARININ kendi fiyatı/para birimi HİÇ DEĞİŞTİRİLMEZ — bu bileşen SADECE fişin
// GENEL toplamını (pbToplamlari — her para birimindeki toplam), seçilen tek bir hedef para birimine,
// kur üzerinden çevirip GÖSTERİR. Salt görüntüleme/hesaplama amaçlıdır; hiçbir kalem satırına geri
// yazılmaz — Kasa/Banka'daki mantığın aksine, burada kaynak veri asla mutasyona uğramaz.
function FisToplamCeviriPaneli({ pbToplamlari, kurlar, deger, onDegistir }) {
  const pbler = Object.keys(pbToplamlari);
  // Bu bileşen TAMAMEN "kontrollü" (controlled) çalışır — kendi kalıcılığını KENDİSİ yönetmez, dışarıdan
  // gelen `deger` ({kayitParaBirimi, kayitKurlari}) ile başlar, her değişiklikte `onDegistir` ile dışarı
  // bildirir. Böylece HEM "Yeni Sipariş Oluşturma" formunda (henüz kaydedilmemiş sipariş, seçim form
  // state'inde tutulur ve kaydedilirken siparişe yazılır) HEM var olan bir siparişin kartında (seçim
  // doğrudan siparişe kalıcı yazılır) AYNI bileşen, AYNI mantıkla, TUTARLI çalışır — iki ayrı, birbirinden
  // farklı davranan kod yolu OLMAZ (önceki hatanın kök nedeni tam olarak buydu: yeni sipariş formunda
  // seçim hiçbir yere yazılmıyordu, sadece var olan siparişte kalıcıydı).
  const kayitliPB = (deger && deger.kayitParaBirimi) || null;
  const kayitliKurlar = (deger && deger.kayitKurlari) || {};
  const [hedefPB, setHedefPB] = useState(kayitliPB || pbler[0] || "TRY");
  const [kurOverride, setKurOverride] = useState(kayitliKurlar); // { [yabanciPB]: kur (sayı) }

  if (pbler.length === 0) return null;

  function hedefPBDegistir(yeniPB) {
    setHedefPB(yeniPB);
    setKurOverride({});
    // ÖNEMLİ: seçilen para birimi HER ZAMAN AÇIKÇA bildirilir — "kalemlerin varsayılan para birimiyle
    // aynıysa boş bırak" gibi bir kısayol YAPILMAZ (önceki bir hatanın kaynağıydı).
    if (onDegistir) onDegistir({ kayitParaBirimi: yeniPB, kayitKurlari: {} });
  }
  function kurDegistir(pb, degerStr) {
    const yeniOverride = { ...kurOverride, [pb]: degerStr };
    setKurOverride(yeniOverride);
    if (onDegistir) {
      const sayisalOverride = {};
      Object.entries(yeniOverride).forEach(([k, v]) => { const n = parseFloat(v); if (n > 0) sayisalOverride[k] = n; });
      onDegistir({ kayitParaBirimi: hedefPB, kayitKurlari: sayisalOverride });
    }
  }

  // Kur HER ZAMAN doğal (standart) döviz kuru yönünde sorulur: "1 [yabancı para] = ? TRY" — asla
  // "1 TRY = ? USD" gibi tersine, kafa karıştırıcı bir yönde SORULMAZ. Bir çeviri için yabancı para,
  // pb/hedefPB ikilisinden TRY OLMAYAN taraftır (ikisi de yabancıysa — örn. USD→EUR — pb esas alınır).
  function yabanciParaBul(pb) {
    if (pb !== "TRY") return pb;
    if (hedefPB !== "TRY") return hedefPB;
    return null; // ikisi de TRY olamaz zaten (digerPbler, hedefPB'yi filtreler)
  }
  function onerilenKurBul(pb) {
    const yabanci = yabanciParaBul(pb);
    if (!yabanci) return 1;
    return (kurlar || {})[yabanci] || null;
  }
  function kullanilacakKurBul(pb) {
    // ÖNEMLİ: kurOverride HER ZAMAN "yabancı para birimi" (TRY olmayan taraf) anahtarıyla okunur —
    // "pb" bazen TRY'nin kendisi olabilir (örn. kalem TRY, hedef USD ise pb="TRY" ama gerçek kur
    // "USD" anahtarı altında saklanır) — bu, aşağıdaki hedefeCevir/paraCevirGenel'in beklediği
    // formatla (Muhasebe'deki kurlar HER ZAMAN "1 yabancı = X TRY" biçiminde) BİREBİR aynı olmalıdır.
    const yabanci = yabanciParaBul(pb);
    const elle = kurOverride[yabanci];
    const deger = elle !== undefined && elle !== "" ? parseFloat(elle) : onerilenKurBul(pb);
    return deger;
  }
  // Girilen "1 yabancı = ? TRY" kuru kullanılarak, pbToplamlari[pb] tutarını hedefPB'ye çevirir.
  function hedefeCevir(pb) {
    if (pb === hedefPB) return pbToplamlari[pb];
    const kur = kullanilacakKurBul(pb); // TRY karşılığı (1 yabancı = kur TRY)
    if (!(kur > 0)) return null;
    if (hedefPB === "TRY") {
      // pb (yabancı) → TRY: tutar × kur
      return pbToplamlari[pb] * kur;
    }
    if (pb === "TRY") {
      // TRY → hedefPB (yabancı): tutar ÷ kur (kur = 1 hedefPB'nin TRY karşılığı)
      return pbToplamlari[pb] / kur;
    }
    // İkisi de yabancı (örn. USD→EUR): önce pb'yi TRY'ye, sonra TRY'yi hedefPB'ye çevir.
    const hedefKur = (kurlar || {})[hedefPB];
    if (!(hedefKur > 0)) return null;
    return (pbToplamlari[pb] * kur) / hedefKur;
  }

  let toplamHedef = 0;
  let hepsiHesaplanabilir = true;
  pbler.forEach((pb) => {
    const cevrilmis = hedefeCevir(pb);
    if (cevrilmis == null) { hepsiHesaplanabilir = false; return; }
    toplamHedef += cevrilmis;
  });
  const digerPbler = pbler.filter((pb) => pb !== hedefPB);

  return (
    <div style={{ background: "#EDE7F2", border: "1px solid #C9B3D9", borderRadius: "var(--erp-r-md)", padding: "6px 8px", marginTop: 8, textAlign: "left" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--erp-purple)", fontWeight: 700, whiteSpace: "nowrap" }} title="Ürün satırları değişmez; bu seçim siparişte kalıcı olarak saklanır">
          Fiş P.Birimi:
        </span>
        <select value={hedefPB} onChange={(e) => hedefPBDegistir(e.target.value)} style={{ padding: "3px 5px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", fontSize: 11 }}>
          {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
        </select>
        {digerPbler.map((pb) => {
          const yabanci = yabanciParaBul(pb);
          return (
            <label key={pb} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--erp-text-2)", fontWeight: 600, whiteSpace: "nowrap" }}>
              1 {yabanci} =
              <input
                type="number" step="0.0001" min="0"
                value={kurOverride[yabanci] !== undefined ? kurOverride[yabanci] : (onerilenKurBul(pb) ?? "")}
                onChange={(e) => kurDegistir(yabanci, e.target.value)}
                placeholder={onerilenKurBul(pb) == null ? "kur?" : ""}
                title="Muhasebe'deki güncel kurdan otomatik öneriliyor — isterseniz değiştirebilirsiniz"
                style={{ width: 60, padding: "3px 5px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", fontSize: 11 }}
              />
              TRY
            </label>
          );
        })}
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-primary)", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {hepsiHesaplanabilir ? (
            <>Toplam: <span className="mono">{toplamHedef.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[hedefPB] || hedefPB}</span></>
          ) : (
            <span style={{ color: "var(--erp-warn)", fontWeight: 400 }}>kur eksik</span>
          )}
        </span>
      </div>
    </div>
  );
}

// Bir siparişin liste özetinde gösterilecek toplamını hesaplar. Liste satırı ve dipnot toplamı AYNI
// fonksiyonu kullanır — iki ayrı yerde iki ayrı hesap tutmak, birinin güncellenip diğerinin unutulduğu
// ve toplamların tutmadığı klasik hataya yol açardı.
// Dönen `paraBirimi`, toplamın HANGİ birimde olduğunu söyler; dipnot bunu kullanarak birimleri
// birbirine karıştırmadan ayrı ayrı toplar.
function siparisOzetToplami(siparis, kurlar) {
  if (siparis.kayitParaBirimi) {
    const birlesikKurlar = { ...(kurlar || {}), ...(siparis.kayitKurlari || {}) };
    const pbToplamlariOzet = {};
    siparis.kalemler.forEach((k) => {
      const pb = k.paraBirimi || "TRY";
      pbToplamlariOzet[pb] = (pbToplamlariOzet[pb] || 0) + k.miktar * k.birimFiyat;
    });
    let toplamKayitPB = 0;
    let hepsiCevrilebildi = true;
    Object.entries(pbToplamlariOzet).forEach(([pb, tut]) => {
      const cevrilmis = paraCevirGenel(tut, pb, siparis.kayitParaBirimi, birlesikKurlar);
      if (cevrilmis == null) { hepsiCevrilebildi = false; return; }
      toplamKayitPB += cevrilmis;
    });
    if (hepsiCevrilebildi) {
      return {
        toplam: toplamKayitPB,
        paraBirimi: siparis.kayitParaBirimi,
        sembol: PARA_SEMBOLU[siparis.kayitParaBirimi] || siparis.kayitParaBirimi,
        karisik: false,
      };
    }
    // Çevrilemeyen bir para birimi varsa toplam ham olarak verilir ve KARIŞIK işaretlenir —
    // dipnotta bu tür siparişleri diğerleriyle toplamak yanıltıcı olurdu.
    return { toplam: siparis.kalemler.reduce((s, k) => s + k.miktar * k.birimFiyat, 0), paraBirimi: "TRY", sembol: "₺", karisik: true };
  }
  const toplam = siparis.kalemler.reduce((sum, k) => sum + k.miktar * k.birimFiyat, 0);
  const kalemPBleri = new Set(siparis.kalemler.map((k) => k.paraBirimi || "TRY"));
  const tekPB = kalemPBleri.size <= 1 && siparis.kalemler[0] ? (siparis.kalemler[0].paraBirimi || "TRY") : null;
  return {
    toplam,
    paraBirimi: tekPB || "TRY",
    sembol: tekPB ? (PARA_SEMBOLU[tekPB] || tekPB) : "₺",
    karisik: !tekPB && kalemPBleri.size > 1,
  };
}

function SiparisOzetSatiri({ siparis, cariler, onAc, onTamEkran, tumSiparisler, uretimSiparisleri, acikMi, kurlar }) {
  const cari = cariler.find((c) => c.id === siparis.cariId);
  const ozetToplam = siparisOzetToplami(siparis, kurlar);
  const toplam = ozetToplam.toplam;
  const toplamSembol2 = ozetToplam.sembol;
  const toplamAdet = siparis.kalemler.reduce((sum, k) => sum + k.miktar, 0);
  // "Kalem sayısı" RENK+BEDEN satır sayısı değil, DİSTİNCT ÜRÜN (stok kalemi) sayısıdır — aynı ürünün
  // farklı renk/bedenleri (örn. 40 renk+beden satırı) tek bir ürün olarak sayılır, "40 kalem" yerine
  // gerçek ürün çeşidi (örn. "2 kalem") gösterilir.
  const kalemSayisi = new Set(siparis.kalemler.map((k) => k.urunId)).size;
  // Liste satırında para biriminin AÇIKÇA görünmesi için bir rozet — sadece toplam sembolüne bakıp
  // anlamak yerine, sipariş USD/EUR gibi TRY'den farklı bir birimde ise (ya da kalemler karışık para
  // biriminde ise) bunu net bir etiketle gösterir.
  const kullanilanPBler = Array.from(new Set(siparis.kalemler.map((k) => k.paraBirimi || "TRY")));
  const paraBirimiRozeti = siparis.kayitParaBirimi
    ? siparis.kayitParaBirimi
    : kullanilanPBler.length > 1
    ? "Karışık P.B."
    : kullanilanPBler[0] !== "TRY"
    ? kullanilanPBler[0]
    : null;
  const durumRenk = SIPARIS_DURUM_RENK[siparis.durum] || "var(--erp-text-2)";
  // Tedarik Planlama'dan ("Satın Alınacak") otomatik oluşmuş Alış siparişlerinin notu "Kaynak: SP-xxxx" formatındadır.
  const kaynakEslesme = (siparis.not || "").match(/^Kaynak:\s*(.+)$/);
  const bagliSatisNo = kaynakEslesme ? kaynakEslesme[1].trim() : null;

  // Bu (Satış) siparişteki eksik kalemlerin tedarik durumunu özetler — siparişi açmadan görünsün diye.
  const tedarikOzeti = siparisTedarikDurumuHesapla(siparis, tumSiparisler, uretimSiparisleri);

  // REZERVASYON ROZETLERİ — Planlama > Sipariş İhtiyaç Planlama'dan doğan bağlantılar iki yönde de
  // liste satırında görünür:
  //   • Alış satırında: bu hammadde alışı HANGİ satış siparişleri için açıldı.
  //   • Satış satırında: bu satış için HANGİ hammadde alışları açıldı.
  // Not: liste satırının kendisi bir <button> olduğu için buradaki rozetler TIKLANABİLİR DEĞİLDİR
  // (iç içe buton geçersiz HTML'dir ve satırı açma davranışını bozar). Tıklanabilir bağlantılar
  // siparişin AÇILMIŞ detayında (SiparisCard) yer alır.
  const alisRezervasyonlari = siparis.tip === "Alış" ? alisRezervasyonOzeti(siparis, tumSiparisler) : [];
  const bagliHammaddeAlislari = siparis.tip === "Satış" ? satisIcinHammaddeAlislari(siparis.id, tumSiparisler) : [];
  return (
    /* Kap <div>: içinde iki ayrı düğme var (aç/kapa oku ve tam ekran karesi). <button> içine
       <button> koymak geçersiz HTML olurdu; ayrıca satırın herhangi bir yerine tıklamak da aç/kapa
       yapsın istiyoruz, bu yüzden kap role="button" taşıyor. */
    <div
      role="button"
      tabIndex={0}
      data-siparis-satir={siparis.siparisNo}
      onClick={onAc}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAc(); } }}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 14,
        background: bagliSatisNo ? "var(--erp-hover)" : "var(--erp-panel)",
        // Kenarlık ve köşe yuvarlaması DIŞ çerçeveye ait; burada yalnızca açıkken alt ayraç çizilir.
        border: "none",
        borderBottom: acikMi ? "1px solid var(--erp-line-soft)" : "none",
        borderLeft: bagliSatisNo ? "3px solid #C97B3D" : "3px solid transparent",
        cursor: "pointer", textAlign: "left", flexWrap: "wrap",
      }}
    >
      {/* Tip ikonu KALDIRILDI: hemen yanındaki cari adı rozeti zaten tipin rengini taşıyor
          (satış çini mavisi, alış taba) ve satırın solunda ayrıca renkli şerit var. Aynı bilgiyi
          üç kez göstermek satırı kalabalıklaştırıyordu. */}
      {/* CARİ ADI en belirgin öğe. Listede aranan şey "hangi müşterinin siparişi" olduğu; sipariş
          numarası ikincil bir referans. Önceden ad, tarihten sonra küçük punto ile duruyordu ve
          göz önce numaraya takılıyordu. */}
      {/* Cari adı dolu bir alan içinde: listede aranan ilk bilgi bu ve düz metin olarak
          diğer alanların arasında kayboluyordu. Renk siparişin tipini de söyler —
          satış çini mavisi, alış taba. */}
      <span
        style={{
          display: "inline-block", maxWidth: 240, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontSize: 15, fontWeight: 700,
          color: "var(--erp-panel-2)",
          background: siparis.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)",
          padding: "4px 12px", borderRadius: "var(--erp-r-md)",
        }}
      >
        {cari ? cari.unvan : "—"}
      </span>
      <span className="mono" style={{ fontWeight: 700, fontSize: 12, color: "var(--erp-text-2)" }}>{siparis.siparisNo}</span>
      {siparis.musteriKodu && (
        <span
          className="mono"
          title={`${siparis.tip === "Alış" ? "Tedarikçi" : "Müşteri"} sipariş kodu`}
          style={{ fontSize: 11, fontWeight: 600, color: "var(--erp-purple)", background: "#6B4E8A18", padding: "1px 7px", borderRadius: "var(--erp-r-pill)" }}
        >
          #{siparis.musteriKodu}
        </span>
      )}
      {siparis.ambalaj && siparis.ambalaj.renk && (
        <span
          className="mono"
          title={`Bu siparişin kutusu: ${siparis.ambalaj.renk}. Reçetedeki ambalaj renginin yerine geçer.`}
          style={{ fontSize: 11, fontWeight: 600, color: "var(--erp-brown)", background: "#8A5A3818", padding: "1px 7px", borderRadius: "var(--erp-r-pill)", display: "flex", alignItems: "center", gap: 4 }}
        >
          <Package size={11} /> {siparis.ambalaj.renk}
        </span>
      )}
      <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{siparis.tarih || siparis.olusturuldu ? tarihYaz(siparis.olusturuldu || siparis.tarih) : "—"}</span>
      {bagliSatisNo && (
        <span
          className="mono"
          title="Bu alış siparişi, bir satış siparişini karşılamak için Tedarik Planlama'dan oluşturuldu"
          style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
            background: "#C97B3D22", color: "#C97B3D",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <ArrowRight size={11} /> Satış: {bagliSatisNo}
        </span>
      )}
      {siparis.hammaddeTalebiMi && (
        <span
          className="mono"
          title="Bu alış siparişi, Planlama > Sipariş İhtiyaç Planlama ekranından hammadde ihtiyacı için açıldı"
          style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
            background: "#8A5A3822", color: "var(--erp-brown)", display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <Boxes size={11} /> Hammadde
        </span>
      )}
      {alisRezervasyonlari.length > 0 && (
        <span
          className="mono"
          title={
            "Rezerve edildiği satış siparişleri:\n" +
            alisRezervasyonlari.map((r) => `${r.siparisNo}: ${r.miktar}${r.birim ? " " + r.birim : ""}${r.kaynakSilinmis ? " (kaynak sipariş silinmiş)" : ""}`).join("\n")
          }
          style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
            background: "#9C3D3D1A", color: "#9C3D3D", border: "1px solid #C99A9A",
            display: "flex", alignItems: "center", gap: 4, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          Rezerve: {alisRezervasyonlari.slice(0, 3).map((r) => r.siparisNo).join(", ")}
          {alisRezervasyonlari.length > 3 ? ` +${alisRezervasyonlari.length - 3}` : ""}
        </span>
      )}
      {bagliHammaddeAlislari.length > 0 && (
        <span
          className="mono"
          title={
            "Bu sipariş için açılmış hammadde alışları:\n" +
            bagliHammaddeAlislari.map((a) => `${a.alisSiparisNo} · ${a.durum} · yolda ${a.yolda}`).join("\n")
          }
          style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
            background: bagliHammaddeAlislari.some((a) => a.yolda > 0) ? "#3D6B8A1A" : "#4E6B4E1A",
            color: bagliHammaddeAlislari.some((a) => a.yolda > 0) ? "var(--erp-info)" : "var(--erp-primary)",
            border: "1px solid #A9BECC", display: "flex", alignItems: "center", gap: 4,
            maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          <Boxes size={11} /> Hammadde: {bagliHammaddeAlislari.slice(0, 3).map((a) => a.alisSiparisNo).join(", ")}
          {bagliHammaddeAlislari.length > 3 ? ` +${bagliHammaddeAlislari.length - 3}` : ""}
        </span>
      )}
      <span
        className="mono"
        style={{
          fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
          background: "var(--erp-panel-2)", color: "var(--erp-text)",
        }}
        title={`${kalemSayisi} farklı kalem`}
      >
        {kalemSayisi} kalem · {toplamAdet} adet
      </span>
      {paraBirimiRozeti && (
        <span
          className="mono"
          title={siparis.kayitParaBirimi ? "Bu siparişin kayıt para birimi" : kullanilanPBler.length > 1 ? "Kalemler farklı para birimlerinde girilmiş" : "Bu siparişin kalemleri TRY dışında bir para biriminde"}
          style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
            background: "#2F6B4F22", color: "#2F6B4F",
          }}
        >
          {paraBirimiRozeti}
        </span>
      )}
      <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Teslim: {siparis.teslimTarihi ? tarihYaz(siparis.teslimTarihi) : "—"}</span>
      <span
        className="mono"
        style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
          background: alfaEkle(durumRenk, "22"), color: durumRenk,
        }}
      >
        {siparis.durum}
      </span>
      <span className="mono" style={{ marginLeft: "auto", fontWeight: 700, fontSize: 14 }}>
        {toplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {toplamSembol2}
      </span>
      {/* TEDARİK DURUMU satırın EN SAĞINDA — listeyi tararken en çok bakılan bilgi budur:
          "bu sipariş nerede?". Üretimdeyse hangi proseste olduğu ve kaçıncı adımda olduğu yazar
          (Kesim 1/5 gibi); proses kendi rengiyle gelir, üretim ekranındakiyle aynı renk. */}
      {tedarikOzeti && (
        <span
          className="mono"
          title={
            tedarikOzeti.uretimde
              ? `Üretimde — sıradaki proses: ${tedarikOzeti.metin} (${tedarikOzeti.adim} proses tamam)`
              : "Bu siparişteki eksik kalemler için planlanan satın alma/üretimin durumu"
          }
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--erp-r-pill)",
            background: tedarikOzeti.uretimde ? tedarikOzeti.renk : alfaEkle(tedarikOzeti.renk, "22"),
            color: tedarikOzeti.uretimde ? "var(--erp-panel-2)" : tedarikOzeti.renk,
          }}
        >
          {tedarikOzeti.uretimde && <Hammer size={11} />}
          {tedarikOzeti.metin}
        </span>
      )}
      {/* Kare: siparişi TAM EKRAN açar (düzenleme orada yapılır). Ok ise satırın altına salt-okunur
          önizleme açar. İki ayrı eylem, iki ayrı hedef — aynı düğmeye yüklenirse kullanıcı hangisinin
          olacağını kestiremez. */}
      {onTamEkran && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTamEkran(); }}
          data-siparis-tam-ekran={siparis.siparisNo}
          title="Tam ekran aç — düzenleme, teslim alma ve planlama burada yapılır"
          className="btn-ikon"
          style={{ flexShrink: 0 }}
        >
          <Maximize2 size={15} />
        </button>
      )}
      <ChevronRight
        size={18}
        color="var(--erp-text-3)"
        style={{ transform: acikMi ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }}
      />
    </div>
  );
}

