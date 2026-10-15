function CariModule({ kapsam = "cari", onOdemeAlaniGit, onOdemeKaydet, onFiseGitNo, muhasebe, kurlar, onMuhasebeHareketi, cariler, onSave, showToast, onFisSil, siparisler, onGoToSiparis, stok, firmaBilgileri, tanimlarProsesler, tanimlarAraProsesler, onCopaAt, onStokFisiAc, tanimlarFiyatGruplari, onPencereAc, onCekEkle, odemeHedefi, onOdemeHedefiTuketildi, hedefCariId, onHedefCariTuketildi }) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [cariTipSekme, setCariTipSekme] = useState("Tümü");
  // AYNI ANDA TEK KART AÇIK. Her kart kendi açıklık durumunu tutunca birkaç kart üst üste
  // açılıyor ve liste okunamaz hale geliyordu — cari kartı uzun (hareketler, prosesler, formlar).
  // Açık kartın kimliği burada tutulur; yeni bir kart açılınca öncekinin durumu kendiliğinden
  // kapanır. Aynı karta tekrar tıklamak onu kapatır.
  const [acikCariId, setAcikCariId] = useState(null);
  const [pasifSekme, setPasifSekme] = useState(false);
  const [personelProsesSekme, setPersonelProsesSekme] = useState("Tümü");
  // ÜST SEKME (v1.619.0 — kullanıcı: "cari bölümüne rapor yapalım"): Liste (kartlar) · Raporlar (262 CariRaporlari).
  const [cariUstSekme, setCariUstSekme] = useState("liste");
  // ÖDEME & TAHSİLAT GÖRÜNÜMÜ (v1.645.8 — kullanıcı: "Ödeme & Tahsilat sekme olsun; kasa, banka, çek, senet hepsi
  // içerisinde olsun, ödemeler ve tahsilatların girileceği yer"). Finans menüsünde ayrı öğe ama AYNI CariModule örneği
  // (`kapsam="odeme"`, 100'de Mamul Stok / Çek & Senet deseni): form cari kartındaki formun KENDİSİ (265 — kasa/banka,
  // kur çevrimi, çek/senet bilgileri ve Çek & Senet'e kaydı) — ikinci bir ödeme formu yazılmadı, kurallar tek yerde.
  // Akış: Tahsilat/Ödeme → ödeme şekli → cari; seçilen carinin kartı açık gelir, form dolu (`odemeHedefi` yolu).
  const [odemeTip, setOdemeTip] = useState("Tahsilat");
  const [odemeSekliSecim, setOdemeSekliSecim] = useState("Nakit");
  const [odemeCariId, setOdemeCariId] = useState("");
  const [odemeYerelHedef, setOdemeYerelHedef] = useState(null);
  const [odemeListeSuzgec, setOdemeListeSuzgec] = useState("Tümü");
  // DEFTER SÜZGECİ (v1.665.2 — kullanıcı: "son tahsilatları genel ve muhasebe olarak defterlere ayır"). Kural ERP'nin
  // geri kalanıyla aynı: "Muhasebe" defterindeki kayıt hem Genel'de hem Resmi'de sayılır (defterKapsar).
  const [odemeDefterSuzgec, setOdemeDefterSuzgec] = useState("Tümü");
  const [odemeKartGoster, setOdemeKartGoster] = useState(false);
  const [odemeHesapSecim, setOdemeHesapSecim] = useState({});   // { Nakit: "kasa:id", "Havale/EFT": "banka:id", … } — şekil başına hatırlanır   // kısa form yerine carinin kartı (hareketlerine bakmak için)
  const odemeFormunuAc = (cariId, tip, sekil) => {
    setOdemeKartGoster(false);
    setOdemeCariId(cariId || "");
    setOdemeYerelHedef(cariId ? { cariId, tip, odemeSekli: sekil } : null);
  };
  // SİPARİŞTEN GELEN TAHSİLAT/ÖDEME HEDEFİ (v1.612.0): süzgeçleri sıfırla (kart listede görünsün) ve o kartı aç.
  // Formu doldurma işi kartın kendisinde (CariCard, `odemeHedefi` etkisi); hedefi de o tüketir.
  useEffect(() => {
    if (!odemeHedefi) return;
    setQuery("");
    setCariTipSekme("Tümü");
    setPasifSekme(false);
    setAcikCariId(odemeHedefi.cariId);
  }, [odemeHedefi]);
  // CARİ KARTINA GİT (v1.638.0, 100 `cariyeGit`): aynı süzgeç sıfırlama, kart açılır ve görünür yere kaydırılır.
  useEffect(() => {
    if (!hedefCariId) return;
    setQuery("");
    setCariTipSekme("Tümü");
    setPasifSekme(false);
    setCariUstSekme("liste");
    setAcikCariId(hedefCariId);
    if (onHedefCariTuketildi) onHedefCariTuketildi();
    const id = hedefCariId;
    setTimeout(() => {
      const k = document.querySelector(`[data-cari-kart-id="${id}"]`);
      if (k && k.scrollIntoView) k.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 350);
  }, [hedefCariId]);
  // LİSTE DEFTERİ (v1.543.0 — kullanıcı: "Resmi defter olmayan yer kaldı mı?" → "Diğerlerini yap"). Satır
  // bakiyesi, üstteki Alacak/Borç/Net özeti ve dip toplam seçilen deftere göre (Muhasebe ikisine de girer).
  // Açık kartın içindeki Genel/Resmi ayrımı ve ekstre süzgeci ayrı — kartta zaten var.
  const [listeDefter, setListeDefter] = useState("Tümü");
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    // PARA BİRİMİ FORMDA SORULUYOR (kullanıcı, 9 Eylül: "cari açılışta varsayılan para birimi
    // seçmiyoruz ki, bilgiyi neden alıyor?").
    //
    // Haklıydı: alan formda HİÇ YOKTU. Cari sessizce "TRY" olarak kaydediliyor, kullanıcı ancak
    // kartını açıp düzenlerse fark ediyordu. v1.210.0'da hareket ve fiş formları bu alanı
    // varsayılan olarak kullanmaya başladı — yani sorulmayan bir bilgi karar veriyordu.
    //
    // Varsayılan yine TRY: çoğu cari TL, her seferinde seçtirmek gereksiz. Ama artık GÖRÜNÜR ve
    // değiştirilebilir; sessiz bir varsayım değil.
    return { unvan: "", tip: "Müşteri", telefon: "", vergiNo: "", adres: "", ulke: "", notlar: "", paraBirimi: "TRY" };
  }

  function addCari() {
    if (!form.unvan.trim()) return showToast("Cari unvanı gerekli");
    // Hatalı ya da başka caride kayıtlı vergi no: engellenmez, sorulur (077-vergino — yurt dışı cari,
    // aynı firmanın hem müşteri hem tedarikçi kaydı gibi bilinçli durumlar olabilir).
    const vergiUyarilari = vergiNoUyarilari(cariler, form.vergiNo);
    if (vergiUyarilari.length && !window.confirm(`${vergiUyarilari.join("\n")}\n\nYine de kaydedilsin mi?`)) return;
    const cari = {
      id: uid("cari"),
      unvan: form.unvan.trim(),
      tip: form.tip,
      telefon: form.telefon.trim(),
      vergiNo: vergiNoKaydedilecek(form.vergiNo),
      adres: form.adres.trim(),
      // ÜLKE (v1.612.0 — kullanıcı: "caride ülke de girebilelim"): yurt dışı müşteri (Tiran, Arnavutluk gibi) için.
      // Sütun değil `ek` (semaDisiHam); e-faturada alıcı ülkesi buradan, boşsa Türkiye.
      ...(form.ulke && form.ulke.trim() ? { ulke: form.ulke.trim() } : {}),
      notlar: form.notlar.trim(),
      paraBirimi: form.paraBirimi || "TRY",
      // SİTEDE ÖDEME ŞEKLİ SORULSUN (v1.652.0 — kullanıcı: "herkes bu şekilde devam etmesin; yeni müşteri ve seçtiğimiz
      // müşteri için bu şekilde olsun"): yeni müşteride açık başlar; eski müşterilerde kapalı (cari kartından açılır).
      ...(form.tip === "Müşteri" || form.tip === "Her İkisi" ? { siteOdemeSor: true } : {}),
      hareketler: [],
    };
    onSave([cari, ...cariler]);
    setForm(emptyForm());
    setShowForm(false);
    showToast("Cari eklendi");
  }

  // Ürün silmedeki politikanın CARİ karşılığı: geçmişi olan cari silinmez, onayla da silinmez.
  // Eskiden "Hareketleri de Sil ve Cariyi Sil" seçeneği vardı; bu, carinin tüm borç/alacak geçmişini
  // ve o hareketlere bağlı stok/sipariş etkilerini birlikte götürüyordu. Cari hareketi bir muhasebe
  // kaydıdır — silinmesi bakiyeyi değiştirir, mutabakatı bozar ve karşı taraftaki kasa/banka
  // kayıtlarını yetim bırakır. Bir tıkla geri alınamaz bir zincir başlıyordu.
  function removeCari(id) {
    const cari = cariler.find((c) => c.id === id);
    if (!cari) return;

    // Bu cariye ait bir sipariş varsa (Alış/Satış) — silme kesinlikle engellenir. Cariyi silmek,
    // bu siparişleri "sahipsiz" (var olmayan bir cariye bağlı) bırakır, bu asla izin verilmemeli.
    const bagliSiparis = (siparisler || []).find((s) => s.cariId === id);
    if (bagliSiparis) {
      showToast(`"${cari.unvan}" silinemiyor — bu cariye ait "${bagliSiparis.siparisNo}" siparişi var. Önce o siparişi silin/başka cariye taşıyın.`);
      return;
    }

    // Bu cariye ait bir stok giriş/çıkış hareketi varsa (örn. bu cariden alınan/bu cariye satılan
    // ürün hareketleri) — silme engellenir, aksi halde stok geçmişinde "sahipsiz" bir kayıt kalır.
    const bagliStokHareketi = (stok || []).some((p) => (p.hareketler || []).some((h) => h.cariId === id));
    if (bagliStokHareketi) {
      showToast(`"${cari.unvan}" silinemiyor — bu cariye ait stok giriş/çıkış hareketi var.`);
      return;
    }

    const hareketSayisi = (cari.hareketler || []).length;
    if (hareketSayisi > 0) {
      const borcSayisi = (cari.hareketler || []).filter((h) => h.yon === "Borç").length;
      const alacakSayisi = hareketSayisi - borcSayisi;
      showToast(
        `"${cari.unvan}" silinemez — ${hareketSayisi} hareket kayıtlı (${borcSayisi} borç, ${alacakSayisi} alacak). ` +
        "Geçmişi olan cari silinmez; kullanımdan kaldırmak için yeni işlem girmeyin."
      );
      return;
    }
    // Hareketsiz cari doğrudan siliniyor — çöp kaydı burada alınır (cascade yolunda zaten alınıyor).
    if (onCopaAt) {
      onCopaAt("cari", cari.unvan, cari, {
        ozet: `${cari.tip || "Cari"} — hareketsiz`,
        yanEtkiliMi: false,
      });
    }
    onSave(cariler.filter((c) => c.id !== id));
    showToast("Cari silindi — Tanımlar > Çöp Kutusu'ndan geri alınabilir");
  }

  // hareket tekil bir obje ya da (Muhasebe defterinde olduğu gibi) bir dizi olabilir — hepsi TEK seferde eklenir.
  function addHareket(cariId, hareketVeyaDizi) {
    const gelenler = Array.isArray(hareketVeyaDizi) ? hareketVeyaDizi : [hareketVeyaDizi];
    // TEK ÇAĞRI = TEK FİŞ. Muhasebe defterinde aynı işlem Genel+Resmi olarak iki kayıt üretiyor;
    // numarayı kayıt başına üretmek onlara AYRI numaralar verir ve tek işlem iki fiş gibi görünürdü.
    const yeniNo = fisNoSiradaki(fisOnEki((gelenler[0] || {}).islemTipi), tumFisNumaralari(cariler));
    const eklenecekler = gelenler
      // SON SAVUNMA HATTI — bkz. addCariHareketFromStok. Fişsiz hareket buradan da geçemez.
      // SON SAVUNMA HATTI — bkz. addCariHareketFromStok.
      .map((h) => ({
        ...h, id: h.id || uid("hrk"),
        // Sıra numarası mevcut numaralardan hesaplanıyor; aynı çağrıda birden çok hareket varsa
        // (Muhasebe defterinin Genel+Resmi çifti) hepsi AYNI numarayı alır — onlar tek fiştir.
        fisNo: h.fisNo || yeniNo,
        zaman: h.zaman || new Date().toISOString(),
        // `islemTipi` yalnızca numarayı seçmek için taşındı; kayda yazılmıyor.
        islemTipi: undefined,
      }));
    const next = cariler.map((c) =>
      c.id === cariId ? { ...c, hareketler: [...eklenecekler, ...(c.hareketler || [])] } : c
    );
    onSave(next);
    showToast("Hareket eklendi");
  }



  function updateCariField(cariId, field, value) {
    const next = cariler.map((c) => (c.id === cariId ? { ...c, [field]: value } : c));
    onSave(next);
  }

  // Birden fazla alanı TEK seferde (atomik) günceller — iki ayrı updateCariField çağrısı aynı anda
  // yapılırsa ikincisi birincinin değişikliğini görmeyip üzerine yazabilir, bu yüzden ayrı bir fonksiyon.
  function updateCariFields(cariId, fields) {
    const next = cariler.map((c) => (c.id === cariId ? { ...c, ...fields } : c));
    onSave(next);
  }

  // Bir personelin "Bağlı Prosesler" seçimini değiştirir — SADECE ekler/çıkarır, barkod koduna dokunmaz.
  function bagliProsesToggle(cariId, prosesAdi) {
    const cari = cariler.find((c) => c.id === cariId);
    if (!cari) return;
    const mevcutBagli = cari.bagliProsesler || [];
    const seciliMi = mevcutBagli.includes(prosesAdi);
    const yeniBagli = seciliMi ? mevcutBagli.filter((x) => x !== prosesAdi) : [...mevcutBagli, prosesAdi];
    updateCariField(cariId, "bagliProsesler", yeniBagli);
  }

  // Açıkça seçilen BİR proses için, o prosesin sırasında kalan bir sonraki barkod kodunu hesaplayıp
  // atar (Kesim: 1000, 1001, 1002... gibi) — proses tanımındaki "Başlangıç No"dan başlar, o prosese
  // zaten bağlı personellerin kodlarının en büyüğünün bir fazlasını kullanır. Personel bu prosese
  // henüz bağlı değilse otomatik olarak bağlı prosesler listesine de eklenir.
  function barkodOtomatikAta(cariId, prosesAdi) {
    if (!prosesAdi) {
      showToast("Önce bir proses seçin");
      return;
    }
    const cari = cariler.find((c) => c.id === cariId);
    if (!cari) return;

    const prosesTanim = (tanimlarProsesler || []).find((p) => p.ad === prosesAdi);
    const baslangic = prosesTanim ? (prosesTanim.baslangicNo ?? 1000) : 1000;
    // Kodun hesabı "kim bu prosese etiketli" diye bakmak yerine, doğrudan bu prosesin sayı ARALIĞINA
    // (bandına, örn. Kesim=1000-1999, Saya=2000-2999) hangi kodların düştüğüne bakar. Bu, bir
    // personelin bağlı proses etiketleri karışık/eksik olsa bile SAYININ KENDİSİNİN her zaman doğru
    // prosesin aralığından gelmesini garanti eder — barkod numarasına bakarak hangi prosese ait
    // olduğu her zaman doğru anlaşılır.
    const bandGenisligi = 1000;
    const bandSonu = baslangic + bandGenisligi - 1;
    const buBanttakiKodlar = cariler
      .filter((c) => c.id !== cariId && c.barkodKodu && /^\d+$/.test(c.barkodKodu))
      .map((c) => parseInt(c.barkodKodu, 10))
      .filter((kod) => kod >= baslangic && kod <= bandSonu);
    const yeniKod = buBanttakiKodlar.length > 0 ? Math.max(...buBanttakiKodlar) + 1 : baslangic;

    const mevcutBagli = cari.bagliProsesler || [];
    const yeniBagli = mevcutBagli.includes(prosesAdi) ? mevcutBagli : [...mevcutBagli, prosesAdi];

    updateCariFields(cariId, { bagliProsesler: yeniBagli, barkodKodu: String(yeniKod) });
    showToast(`"${prosesAdi}" için barkod kodu atandı: ${yeniKod}`);
  }

  // Sekme sayıları ile listenin AYNI temele oturması şart. Önceden sayılar ham `cariler`
  // listesinden hesaplanıyordu; liste ise pasif ve arama süzgeçlerinden geçiyordu.
  // Sonuç: "Tümü (9)" yazarken liste boş çıkabiliyordu — kullanıcı için "tutarsız çalışıyor".
  //
  // Ortak taban: aktif/pasif ayrımı ve arama uygulanmış hâl. Tip sekmeleri bunun ÜZERİNE biner,
  // sayılar da bu tabandan sayılır.
  const cariTaban = cariler
    .filter((c) => (pasifSekme ? !!c.pasif : !c.pasif))
    .filter((c) =>
      // KOD DA ARANIYOR: kodun görünür olmasının tek anlamı onunla bulunabilmesi.
      // RESMİ ÜNVAN DA ARANIYOR (v1.666.0 — "aramalarda ikisi de görünsün").
      `${c.unvan} ${c.resmiUnvan || ""} ${c.telefon} ${c.vergiNo} ${cariKodMetni(c)}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"))
    );

  const filtered = cariTaban
    .filter((c) => cariTipSekme === "Tümü" || c.tip === cariTipSekme)
    .filter((c) =>
      cariTipSekme !== "Personel" || personelProsesSekme === "Tümü" || (c.bagliProsesler || []).includes(personelProsesSekme)
    );

  // defter verilmezse tüm hareketleri (Genel + Resmi) toplar; "Genel" ya da "Resmi" verilirse sadece o deftere aittir.
  const pasifCariSayisi = cariler.filter((c) => c.pasif).length;

  // ÖZET DE PARA BİRİMİ BAZINDA: farklı para birimlerindeki alacakları toplayıp tek sembolle
  // yazmak, yapılmamış bir kur çevrimini yapılmış gibi gösteriyordu.
  const toplamAlacak = {};
  const toplamBorc = {};
  cariler.forEach((c) => {
    Object.entries(cariBakiyeleri(c, listeDefter)).forEach(([pb, t]) => {
      if (t > 0) toplamAlacak[pb] = (toplamAlacak[pb] || 0) + t;
      else if (t < 0) toplamBorc[pb] = (toplamBorc[pb] || 0) - t;
    });
  });

  if (kapsam === "odemerapor") {
    return <OdemeRaporu cariler={cariler} muhasebe={muhasebe}
      onCariAc={(id) => { setOdemeCariId(id); setOdemeYerelHedef(null); setOdemeKartGoster(true); if (onOdemeAlaniGit) onOdemeAlaniGit("odemetahsilat"); }} />;
  }
  if (kapsam === "odeme") {
    const odemeCari = cariler.find((c) => c.id === odemeCariId) || null;
    // SON TAHSİLAT VE ÖDEMELER: bütün carilerin para hareketleri (THS-/ODM- fişleri, 200 `paraHareketiMi`), yeniden eskiye.
    const sonHareketler = [];
    cariler.forEach((c) => (c.hareketler || []).forEach((h) => {
      if (!paraHareketiMi(h)) return;
      const tip = /^ODM-/.test(String(h.fisNo || "")) || /^ödeme$/i.test(String(h.aciklama || "").trim()) ? "Ödeme" : "Tahsilat";
      if (odemeListeSuzgec !== "Tümü" && tip !== odemeListeSuzgec) return;
      if (odemeDefterSuzgec !== "Tümü" && !defterKapsar(h.defter || "Genel", odemeDefterSuzgec)) return;
      sonHareketler.push({ c, h, tip });
    }));
    sonHareketler.sort((a, b) => String(b.h.tarih || "").localeCompare(String(a.h.tarih || "")) || String(b.h.zaman || "").localeCompare(String(a.h.zaman || "")));
    const tipDugmesi = (tip) => {
      const renk = HAREKET_TIPI_RENK[tip];
      const aktif = odemeTip === tip;
      return (
        <button key={tip} type="button" data-odeme-tip={tip}
          onClick={() => { setOdemeTip(tip); if (odemeCariId) odemeFormunuAc(odemeCariId, tip, odemeSekliSecim); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            borderRadius: "var(--erp-r-md)", border: `2px solid ${renk}`, background: aktif ? renk : "#fff", color: aktif ? "#fff" : renk }}>
          <HareketIkonu tip={tip} size={16} /> {tip}
        </button>
      );
    };
    // KASA / BANKA SEÇİMİ (v1.645.13 — kullanıcı: "cari seçilen yere kasa banka seçilsin, hepsi kendi bölümünde"): nakitte
    // yalnız kasalar, havale/EFT ve kredi kartında yalnız bankalar. Seçim şekil başına hatırlanır; yoksa carinin para
    // birimindeki ilk hesap, o da yoksa ilk hesap. (Üstteki kasa/banka/çek özet kartları kullanıcı isteğiyle kalktı.)
    const kisaSekil = KISA_FORM_SEKILLERI.includes(odemeSekliSecim);
    const hesapListesi = !kisaSekil ? [] : (odemeSekliSecim === "Nakit"
      ? ((muhasebe && muhasebe.kasalar) || []).filter((h) => !h.pasif).map((h) => ({ deger: `kasa:${h.id}`, kisaAd: h.ad, pb: h.paraBirimi || "TRY", h }))
      : ((muhasebe && muhasebe.bankalar) || []).filter((h) => !h.pasif).map((h) => ({ deger: `banka:${h.id}`, kisaAd: h.ad, pb: h.paraBirimi || "TRY", h })));
    const seciliHesap = hesapListesi.find((x) => x.deger === odemeHesapSecim[odemeSekliSecim])
      || hesapListesi.find((x) => odemeCari && x.pb === (odemeCari.paraBirimi || "TRY")) || hesapListesi[0] || null;
    // Kutular tahsilatta yeşil, ödemede turuncu (v1.665.1 — 100 .renkli-form).
    return (
      <div data-odeme-tahsilat="1" style={{ "--hrk-renk": odemeTip === "Tahsilat" ? "#2E7D4F" : "#B7791F" }}>
        <div style={{ ...MOR_SERIT_STIL, padding: "10px 12px", marginBottom: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {tipDugmesi("Tahsilat")}{tipDugmesi("Ödeme")}
            <span style={{ fontSize: 12, color: "var(--erp-text-2)", marginLeft: 6 }}>
              {odemeTip === "Tahsilat" ? "Müşteriden / cariden para, çek ya da senet alındı" : "Tedarikçiye / cariye para, çek ya da senet verildi"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)", minWidth: 90 }}>Ödeme şekli</span>
            {ODEME_SEKILLERI.map((o) => {
              const aktif = odemeSekliSecim === o;
              return (
                <button key={o} type="button" data-odeme-sekli={o}
                  onClick={() => { setOdemeSekliSecim(o); if (odemeCariId) odemeFormunuAc(odemeCariId, odemeTip, o); }}
                  style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: "var(--erp-r-pill)",
                    border: `1.5px solid ${aktif ? "var(--erp-purple)" : "var(--erp-line)"}`, background: aktif ? "var(--erp-purple)" : "#fff",
                    color: aktif ? "#fff" : "var(--erp-text-2)" }}>
                  {o === "Nakit" ? "Nakit (kasa)" : o === "Havale/EFT" ? "Havale / EFT (banka)" : o}
                </button>
              );
            })}
          </div>
          {kisaSekil && (
            <div data-odeme-hesaplar={odemeSekliSecim} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)", minWidth: 90 }}>{odemeSekliSecim === "Nakit" ? "Kasa" : "Banka"}</span>
              {hesapListesi.length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--erp-warn)" }}>{odemeSekliSecim === "Nakit" ? "Kasa" : "Banka"} tanımlı değil — Kasa & Banka sekmesinden açın.</span>
              ) : hesapListesi.map((x) => {
                const aktif = seciliHesap && seciliHesap.deger === x.deger;
                return (
                  <button key={x.deger} type="button" data-odeme-hesap={x.kisaAd}
                    onClick={() => setOdemeHesapSecim((o) => ({ ...o, [odemeSekliSecim]: x.deger }))}
                    style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: "var(--erp-r-pill)",
                      border: `1.5px solid ${aktif ? "#2F6B4F" : "var(--erp-line)"}`, background: aktif ? "#2F6B4F" : "#fff",
                      color: aktif ? "#fff" : "var(--erp-text-2)" }}>
                    {x.kisaAd} <span className="mono" style={{ fontWeight: 400, opacity: 0.85 }}>· {Math.round(hesapBakiyesi(x.h)).toLocaleString("tr-TR")} {PARA_SEMBOLU[x.pb] || x.pb}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)", minWidth: 90 }}>Cari</span>
            <div style={{ minWidth: 280, flex: "0 1 420px" }}>
              <CariSecici cariler={cariler.filter((c) => !c.pasif)} deger={odemeCariId} veriAdi="data-odeme-cari"
                onDegis={(id) => odemeFormunuAc(id, odemeTip, odemeSekliSecim)} />
            </div>
          </div>
        </div>

        {odemeCari && !odemeKartGoster && KISA_FORM_SEKILLERI.includes(odemeSekliSecim) && onOdemeKaydet ? (
          // KASA & BANKA İŞLEMİ GİBİ (v1.645.10 — kullanıcı: "ödeme için kasa banka işlemleri gibi açabilir"): nakit /
          // havale / kredi kartında cari kartının tamamı açılmaz; tek satırlık kısa form (tarih, tutar, kasa/banka,
          // açıklama — 338, sipariş kartındakiyle aynı çekirdek `kasaCariHareketiKur`). Çek / senette çek bilgileri
          // gerektiği için cari kartının formu açılır (aşağıda).
          <div data-odeme-kisa-form="1">
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <b style={{ fontSize: 14 }}>{odemeCari.unvan}</b>
              <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                Bakiye: {Object.entries(cariBakiyeleri(odemeCari)).filter(([, t]) => Math.abs(t) > 0.004)
                  .map(([pb, t]) => `${t > 0 ? "+" : ""}${t.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`).join(" · ") || "0"}
              </span>
              <button type="button" className="btn-ghost" style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 12 }}
                onClick={() => { setOdemeYerelHedef(null); setOdemeKartGoster(true); }}
                title="Cari kartını aç (hareketler, çek/senet)">Cari kartı</button>
            </div>
            <OdemeSatiri key={`${odemeCari.id}|${odemeTip}|${odemeSekliSecim}`}
              tip={odemeTip} odemeSekli={odemeSekliSecim} hesap={seciliHesap} cari={odemeCari} kurlar={kurlar} showToast={showToast}
              onKaydet={(k) => {
                onOdemeKaydet(k);
                showToast(`${odemeTip} kaydedildi — ${odemeCari.unvan}${seciliHesap ? ` · ${seciliHesap.kisaAd}` : ""}`);
              }} />
          </div>
        ) : odemeCari ? (
          <CariCard
            onFiseGitNo={onFiseGitNo} muhasebe={muhasebe} kurlar={kurlar} onMuhasebeHareketi={onMuhasebeHareketi} showToast={showToast}
            key={odemeCari.id} cari={odemeCari} acik onAcKapa={() => odemeFormunuAc("", odemeTip, odemeSekliSecim)}
            onCekEkle={onCekEkle} bakiye={cariBakiyeleri(odemeCari)} listeBakiye={cariBakiyeleri(odemeCari, listeDefter)}
            genelBakiye={cariBakiyeleri(odemeCari, "Genel")} resmiBakiye={cariBakiyeleri(odemeCari, "Resmi")}
            onAddHareket={addHareket} onFisSil={onFisSil} onRemove={removeCari} onFieldChange={updateCariField} onFieldsChange={updateCariFields}
            siparisler={siparisler} onGoToSiparis={onGoToSiparis} stok={stok} firmaBilgileri={firmaBilgileri}
            tanimlarProsesler={tanimlarProsesler} tanimlarAraProsesler={tanimlarAraProsesler} onBagliProsesToggle={bagliProsesToggle}
            onBarkodOtomatikAta={barkodOtomatikAta} tumCariler={cariler} onStokFisiAc={onStokFisiAc} tanimlarFiyatGruplari={tanimlarFiyatGruplari}
            onPencereAc={onPencereAc} odemeHedefi={odemeYerelHedef} onOdemeHedefiTuketildi={() => setOdemeYerelHedef(null)}
          />
        ) : (
          <EmptyState text={`${odemeTip} girmek için yukarıdan cariyi seçin — kasa, banka, çek ve senet aynı formda.`} />
        )}

        {/* SON KAYITLAR: satıra dokununca o carinin kartı açılır (form açılmaz — kayda bakmak için). */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <b style={{ fontSize: 13 }}>Son tahsilat ve ödemeler</b>
            {["Tümü", "Tahsilat", "Ödeme"].map((t) => (
              <button key={t} type="button" data-odeme-liste-suzgec={t} onClick={() => setOdemeListeSuzgec(t)}
                style={{ padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: "var(--erp-r-pill)",
                  border: "1px solid var(--erp-line)", background: odemeListeSuzgec === t ? "var(--erp-text)" : "#fff",
                  color: odemeListeSuzgec === t ? "#fff" : "var(--erp-text-2)" }}>{t}</button>
            ))}
            <span style={{ width: 1, height: 18, background: "var(--erp-line)", margin: "0 4px" }} />
            {[["Tümü", "Tüm defterler"], ["Genel", "Genel"], ["Resmi", "Resmi"], ["Muhasebe", "Muhasebe"]].map(([d, ad]) => (
              <button key={d} type="button" data-odeme-defter-suzgec={d} onClick={() => setOdemeDefterSuzgec(d)}
                style={{ padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: "var(--erp-r-pill)",
                  border: "1px solid #5B3F75", background: odemeDefterSuzgec === d ? "#5B3F75" : "#fff",
                  color: odemeDefterSuzgec === d ? "#fff" : "#5B3F75" }}>{ad}</button>
            ))}
          </div>
          {sonHareketler.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--erp-text-3)", padding: 10 }}>Henüz kayıt yok.</div>
          ) : (
            <div data-odeme-son-liste="1" style={{ maxHeight: 420, overflowY: "auto", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--erp-panel)", zIndex: 1 }}>
                  <tr>{["Tarih", "Cari", "İşlem", "Şekli", "Defter", "Tutar", "Fiş No", "Açıklama"].map((b) => (
                    <th key={b} style={{ fontSize: 10, textAlign: b === "Tutar" ? "right" : "left", padding: "6px 8px", color: "var(--erp-text-2)" }}>{b}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {sonHareketler.slice(0, 200).map(({ c, h, tip }, i) => {
                    const renk = HAREKET_TIPI_RENK[tip];
                    return (
                      <tr key={`${c.id}-${h.id || i}`} data-odeme-son-satir={h.fisNo || i} onClick={() => { setOdemeCariId(c.id); setOdemeYerelHedef(null); setOdemeKartGoster(true); }}
                        style={{ cursor: "pointer", borderTop: "1px solid var(--erp-line-soft)" }}>
                        <td className="mono" style={{ fontSize: 11, padding: "5px 8px", whiteSpace: "nowrap" }}>{tarihTr(String(h.tarih || "").slice(0, 10))}</td>
                        <td style={{ fontSize: 12, padding: "5px 8px", fontWeight: 600 }}>{c.unvan}</td>
                        <td style={{ padding: "5px 8px" }}>
                          <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: alfaEkle(renk, "22"), color: renk }}>
                            <HareketIkonu tip={tip} size={11} />{tip}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, padding: "5px 8px" }}>{h.odemeSekli || "—"}</td>
                        <td style={{ fontSize: 11, padding: "5px 8px", color: "#5B3F75", fontWeight: 600 }}>{h.defter || "Genel"}</td>
                        <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {Number(h.tutar || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[h.paraBirimi || c.paraBirimi || "TRY"] || h.paraBirimi}
                        </td>
                        <td className="mono" style={{ fontSize: 11, padding: "5px 8px" }}>{h.fisNo || ""}</td>
                        <td style={{ fontSize: 11, padding: "5px 8px", color: "var(--erp-text-2)" }}>{h.aciklama || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  const ustSekmeSeridi = (
    <div style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "1px solid var(--erp-line)" }}>
      {[{ key: "liste", ad: "Liste" }, { key: "raporlar", ad: "Raporlar" }].map((t) => (
        <button key={t.key} type="button" data-cari-ust-sekme={t.key} onClick={() => setCariUstSekme(t.key)}
          style={{ padding: "5px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "none", border: "none",
            borderBottom: `3px solid ${cariUstSekme === t.key ? "var(--erp-text)" : "transparent"}`,
            color: cariUstSekme === t.key ? "var(--erp-text)" : "var(--erp-text-3)" }}>
          {t.ad}
        </button>
      ))}
    </div>
  );
  if (cariUstSekme === "raporlar") {
    return (
      <div>
        {ustSekmeSeridi}
        <CariRaporlari cariler={cariler} siparisler={siparisler} firmaBilgileri={firmaBilgileri} showToast={showToast} onGoToSiparis={onGoToSiparis} />
      </div>
    );
  }

  return (
    <div>
      {ustSekmeSeridi}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {/* PASİF SEKMESİ — pasife alınan kartlar buradan görülür ve geri alınabilir.
            Sayı sıfırsa sekme hiç gösterilmez: hiç pasif kaydı olmayan bir kullanıcıya boş bir
            sekme sunmak, arayüzü sebepsiz kalabalıklaştırırdı. */}
        {pasifCariSayisi > 0 && (
          <button
            type="button"
            onClick={() => setPasifSekme((v) => !v)}
            style={{
              padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: "none", background: "transparent", marginLeft: "auto",
              color: pasifSekme ? "var(--erp-purple)" : "var(--erp-text-3)",
              borderBottom: pasifSekme ? "2px solid #6B4E8A" : "2px solid transparent",
            }}
          >
            Pasifler ({pasifCariSayisi})
          </button>
        )}
        {["Tümü", ...CARI_TIPLERI.filter((t) => t !== "Her İkisi")].map((t) => {
          const aktif = cariTipSekme === t;
          const renkT = t === "Tümü" ? "var(--erp-text)" : (CARI_TIP_RENK[t] || "var(--erp-text-2)");
          const sayi = t === "Tümü" ? cariTaban.length : cariTaban.filter((c) => c.tip === t).length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setCariTipSekme(t)}
              // HER SEKME KENDİ RENGİNDE (kullanıcı, 6 Eylül). Önceden renk YALNIZ seçiliyken
              // görünüyordu; seçili olmayanların hepsi aynı griydi, yani renk "hangi tip" değil
              // "hangisi seçili" bilgisini taşıyordu — zaten dolgudan anlaşılan bir şey.
              //
              // Şimdi renk TİPİ söylüyor, DOLGU seçimi: seçili olan koyu zemin + açık yazı,
              // diğerleri kendi renginde ama soluk. İkisi farklı iki soruya cevap veriyor.
              style={{
                padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${aktif ? renkT : alfaEkle(renkT, "66")}`,
                background: aktif ? renkT : alfaEkle(renkT, "14"),
                color: aktif ? "var(--erp-panel)" : renkT,
              }}
            >
              {t} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
            </button>
          );
        })}
      </div>

      {cariTipSekme === "Personel" && (tanimlarProsesler || []).length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12, paddingLeft: 8 }}>
          {/* Ara prosesler de sekme olarak listelenir: yalnızca ara prosese bağlı bir personel,
              aksi halde hiçbir proses sekmesinde görünmez ve "Tümü" dışında bulunamazdı. */}
          {["Tümü", ...tanimlarProsesler.map((p) => p.ad), ...(tanimlarAraProsesler || []).map((p) => p.ad)].map((t) => {
            const aktif = personelProsesSekme === t;
            // Sayılar da ortak tabandan: aktif/pasif ve arama uygulanmış hâl.
            const sayi = t === "Tümü"
              ? cariTaban.filter((c) => c.tip === "Personel").length
              : cariTaban.filter((c) => c.tip === "Personel" && (c.bagliProsesler || []).includes(t)).length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setPersonelProsesSekme(t)}
                style={{
                  padding: "4px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  border: `1.5px solid ${aktif ? "var(--erp-purple)" : "var(--erp-border)"}`,
                  background: aktif ? "#6B4E8A1A" : "#fff",
                  color: aktif ? "var(--erp-purple)" : "var(--erp-text-3)",
                }}
              >
                {t} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--erp-text-3)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari, telefon veya vergi no ara…"
            style={{
              width: "100%", padding: "8px 10px 8px 32px", borderRadius: "var(--erp-r-md)",
              border: "1px solid var(--erp-line)", background: "var(--erp-panel)", fontSize: 14,
            }}
          />
          <AramaTemizle deger={query} onTemizle={() => setQuery("")} veri="cari" />
        </div>
        <div data-cari-liste-defter={listeDefter} style={{ display: "flex", gap: 4 }}>
          {["Tümü", "Genel", "Resmi"].map((d) => (
            <button key={d} type="button" data-cari-defter-sec={d} onClick={() => setListeDefter(d)}
              style={{ padding: "5px 11px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${listeDefter === d ? "var(--erp-primary)" : "var(--erp-border)"}`,
                background: listeDefter === d ? "#4E6B4E1A" : "#fff", color: listeDefter === d ? "var(--erp-primary)" : "var(--erp-text-2)" }}>
              {d}
            </button>
          ))}
        </div>
        {cariler.length > 0 && (
          <>
            <span className="mono" style={{ fontSize: 13, color: "var(--erp-primary)", fontWeight: 600 }}>
              Alacak: {bakiyeMetni(toplamAlacak, false)}
            </span>
            <span className="mono" style={{ fontSize: 13, color: "var(--erp-warn)", fontWeight: 600 }}>
              Borç: {bakiyeMetni(Object.fromEntries(Object.entries(toplamBorc).map(([pb, t]) => [pb, -t])))}
            </span>
            {/* NET (v1.518.0): alacak − borç, para birimi başına. */}
            <span className="mono" data-cari-ozet-net="1" style={{ fontSize: 13, fontWeight: 700, color: bakiyeRengi(bakiyeYonu(bakiyeleriTopla([toplamAlacak, Object.fromEntries(Object.entries(toplamBorc).map(([pb, t]) => [pb, -t]))]))) }}>
              Net: {bakiyeMetni(bakiyeleriTopla([toplamAlacak, Object.fromEntries(Object.entries(toplamBorc).map(([pb, t]) => [pb, -t]))]))}
            </span>
          </>
        )}
        <button className="btn-primary" style={{ marginLeft: "auto" }} onClick={() => setShowForm((s) => !s)}>
          <Plus size={15} /> Cari Ekle
        </button>
      </div>

      {/* Siteden gelen müşteri kayıtları (v1.657.0, 266): onaylanınca cari + site hesabı açılır. */}
      {kapsam === "cari" && <SiteKayitTalepleriPaneli cariler={cariler} onSave={onSave} showToast={showToast} />}
      {showForm && (
        <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 16, marginBottom: 20 }}>
          {/* MOR KAYIT ŞERİDİ (v1.625.0): Kaydet · Vazgeç formun üstünde (önce dipteydi). */}
          <KayitSeridi baslik="Yeni Cari" ikon={<Users size={15} color="#5B3F75" />} veri="data-cari-form-seridi">
            <button className="btn-primary btn-save" onClick={addCari}><Save size={14} /> Kaydet</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}><X size={14} /> Vazgeç</button>
          </KayitSeridi>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 10 }}>
            <Field label="Unvan / Ad Soyad">
              <input value={form.unvan} onChange={(e) => setForm({ ...form, unvan: e.target.value })} placeholder="Örn. Deniz Ayakkabıcılık" style={inputStyle} />
            </Field>
            <Field label="Tip">
              <select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })} style={inputStyle}>
                {CARI_TIPLERI.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Telefon">
              <input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} placeholder="05xx xxx xx xx" style={inputStyle} />
            </Field>
            <Field label="Vergi No / TCKN">
              <input value={form.vergiNo} onChange={(e) => setForm({ ...form, vergiNo: e.target.value })} placeholder="Opsiyonel" inputMode="numeric" data-yeni-cari-vergi-no="1" style={inputStyle} />
              <VergiNoUyarisi cariler={cariler} no={form.vergiNo} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 1fr", gap: 10, marginTop: 10 }}>
            <Field label="Adres">
              <input value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} placeholder="Opsiyonel" style={inputStyle} />
            </Field>
            <Field label="Ülke">
              <input value={form.ulke} onChange={(e) => setForm({ ...form, ulke: e.target.value })} placeholder="Boşsa Türkiye" data-yeni-cari-ulke="1" style={inputStyle} />
            </Field>
            <Field label="Not">
              <input value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} placeholder="Opsiyonel" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            {/* Bu carinin alış/satış ve tahsilat formları bu para birimiyle açılacak (v1.210.0).
                Kullanıcı her işlemde yine değiştirebilir. */}
            <Field label="Para Birimi">
              <select
                value={form.paraBirimi}
                onChange={(e) => setForm({ ...form, paraBirimi: e.target.value })}
                title="Bu cariyle yapılan işlemlerde varsayılan para birimi"
                style={inputStyle}
              >
                {MUHASEBE_PARA_BIRIMLERI.map((pb) => (
                  <option key={pb} value={pb}>{pb} {PARA_SEMBOLU[pb] || ""}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState text={cariler.length === 0 ? "Henüz cari kaydı yok. İlk cariyi ekleyerek başlayın." : "Aramanızla eşleşen cari yok."} />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((c) => (
            <CariCard
              onFiseGitNo={onFiseGitNo}
              muhasebe={muhasebe}
              kurlar={kurlar}
              onMuhasebeHareketi={onMuhasebeHareketi}
              showToast={showToast}
              key={c.id}
              cari={c}
              acik={acikCariId === c.id}
              onAcKapa={() => setAcikCariId((onceki) => (onceki === c.id ? null : c.id))}
              onCekEkle={onCekEkle}
              bakiye={cariBakiyeleri(c)}
              listeBakiye={cariBakiyeleri(c, listeDefter)}
              genelBakiye={cariBakiyeleri(c, "Genel")}
              resmiBakiye={cariBakiyeleri(c, "Resmi")}
              onAddHareket={addHareket}
              onFisSil={onFisSil}
              onRemove={removeCari}
              onFieldChange={updateCariField}
              onFieldsChange={updateCariFields}
              siparisler={siparisler}
              onGoToSiparis={onGoToSiparis}
              stok={stok}
              firmaBilgileri={firmaBilgileri}
              tanimlarProsesler={tanimlarProsesler}
              tanimlarAraProsesler={tanimlarAraProsesler}
              onBagliProsesToggle={bagliProsesToggle}
              onBarkodOtomatikAta={barkodOtomatikAta}
              tumCariler={cariler}
              onStokFisiAc={onStokFisiAc}
              tanimlarFiyatGruplari={tanimlarFiyatGruplari}
              onPencereAc={onPencereAc}
              odemeHedefi={odemeHedefi && odemeHedefi.cariId === c.id ? odemeHedefi : null}
              onOdemeHedefiTuketildi={onOdemeHedefiTuketildi}
            />
          ))}
          {/* DİP TOPLAM (v1.518.0 — kullanıcı: alacak ve borç ayrı, altta net). LİSTELENEN carilerin (sekme + arama
              süzgeci uygulanmış) toplamı: Alacak (+), Borç (−), Net = ikisinin toplamı. Para birimleri ayrı satırda
              — farklı birimleri toplamak yapılmamış bir kur çevrimi olurdu. */}
          {(() => {
            const ayrik = filtered.map((c) => bakiyeAyir(cariBakiyeleri(c, listeDefter)));
            const alacakT = bakiyeleriTopla(ayrik.map((x) => x.alacak));
            const borcT = bakiyeleriTopla(ayrik.map((x) => x.borc));
            const netT = bakiyeleriTopla([alacakT, borcT]);
            const pbler = Array.from(new Set([...Object.keys(alacakT), ...Object.keys(borcT)]));
            if (!pbler.length) return null;
            return (
              <div data-cari-liste-toplam="1" style={{ background: "var(--erp-panel)", border: "1.5px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: "10px 16px", display: "grid", gap: 6 }}>
                {pbler.map((pb) => {
                  const a = alacakT[pb] || 0; const b = borcT[pb] || 0; const n = netT[pb] || 0;
                  const para = (x) => `${x > 0 ? "+" : ""}${x.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`;
                  return (
                    <div key={pb} data-cari-liste-toplam-pb={pb} style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)", marginRight: "auto" }}>
                        Toplam · {filtered.length} cari{pbler.length > 1 ? ` · ${pb}` : ""}
                      </span>
                      <span className="mono" style={{ fontSize: 13 }}>Alacak <b style={{ color: "var(--erp-primary)" }}>{para(a)}</b></span>
                      <span className="mono" style={{ fontSize: 13 }}>Borç <b style={{ color: "var(--erp-warn)" }}>{para(b)}</b></span>
                      <span className="mono" data-cari-liste-net={pb} style={{ fontSize: 14 }}>
                        Net {n > 0 ? "alacak" : n < 0 ? "borç" : ""} <b style={{ color: bakiyeRengi(n) }}>{para(n)}</b>
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Cari hareketlerini fiş no'ya göre gruplar (fiş no yoksa her hareket kendi tekil grubu olur).
function cariHareketleriGrupla(hareketler) {
  const gruplar = [];
  const index = {};
  hareketler.forEach((h) => {
    // PEŞİN KAYIT AYRI GRUP (v1.537.0 — son denetim): fişten peşin tahsilat/ödeme fişle aynı `fisNo`yu taşıyor.
    // Aynı gruba girince grup tutarı fiş + peşin toplanıyor, yön ilk kaydınkiyle sayılıyordu: 1000 ₺ satış + 1000 ₺
    // peşin tahsil ekstrede "Borç 2000" ve koşan bakiye +2000 görünüyordu (başlık doğru olarak 0). Kasaya bağlı
    // (`muhasebeBagId`) kayıt kendi satırında, kendi yönüyle durur — e-fatura da onu fatura satırından ayırıyor.
    const key = h.fisNo ? (h.muhasebeBagId ? `pesin__${h.fisNo}__${h.id}` : `fis__${h.fisNo}`) : `tek__${h.id}`;
    if (!(key in index)) {
      index[key] = gruplar.length;
      // `zaman` DA TAŞINIYOR: ekstre sıralaması gün içinde saate bakıyor (bkz. 265-carikart).
      // Yalnız `tarih` taşınırken aynı günün kayıtları rastgele sırada görünüyordu.
      gruplar.push({ key, fisNo: h.fisNo, tarih: h.tarih, zaman: h.zaman || null, yon: h.yon, odemeSekli: h.odemeSekli, vade: h.vade, hareketler: [] });
    }
    gruplar[index[key]].hareketler.push(h);
  });
  return gruplar;
}


// FİŞ KALEM MATRİSİ — malzeme SATIR, beden SÜTUN (MATRİS KURALI).
//
// Fiş kalemleri iki ekranda gösteriliyor: Fişler modülü ve cari ekstresi. İkisi ayrı ayrı
// yazılmıştı ve zamanla ayrıştılar — biri beden rozetleri, diğeri başka bir düzen. Aynı fiş
// iki ekranda iki farklı şekilde görününce "hangisi doğru" sorusu doğuyordu. Artık TEK bileşen.
//
// Düz liste yerine matris: beş bedenli bir alışta düz liste tek malzemeyi beş satıra yayardı.
//
// BR. FİYAT sütunu kayıt para biriminde; kalem başka parada girildiyse KUR sütunu ham fiyatı ve
// kullanılan kuru gösterir. Yalnızca çevrilmiş fiyatı yazmak "bu 2.000 ₺ nereden çıktı"
// sorusunu cevapsız bırakıyordu.
function FisKalemMatrisi({ urunGruplari, stok, kompakt }) {
  if (!urunGruplari || urunGruplari.length === 0) return null;

  // Sütunlar tüm satırların bedenlerinin birleşimi; bir satırda olmayan beden "—" ile geçilir.
  const tumBedenler = bedenSirala(Array.from(new Set(
    urunGruplari.flatMap((ug) => (ug.items || []).map((h) => h.beden)).filter((b) => b != null && b !== "")
  )));
  // Ölçüsüz malzemede (kilo, desi) beden sütunu hiç açılmaz — boş bir sütun başlığı gürültüdür.
  const bedenliMi = tumBedenler.length > 0;
  const kurVarMi = urunGruplari.some((ug) => (ug.items || []).some((h) => h.kalemParaBirimi));

  // RENK SÜTUNUNUN BAŞLIĞI (v1.494.0 — kullanıcı: "stok hareketlerinde ortak isim olduğunda üst başlık
  // ortak olsun, değişince ayrı satır eklesin"). Ürünün `renkBasligi` (Baskı, Kalınlık…): hepsi aynıysa
  // sütun başlığı o; karışıksa başlıklar birlikte yazar ve başlık değiştiği her yerde ara satır açılır.
  const ugUrunu = (ug) => (stok || []).find((p) => p.ad === ug.urunAd);
  const ugBaslik = (ug) => renkBasligi(ugUrunu(ug));
  const ortakBaslik = ortakRenkBasligi(urunGruplari.map((ug) => ugUrunu(ug) || {}));
  const renkSutunBasligi = ortakBaslik || Array.from(new Set(urunGruplari.map(ugBaslik))).join(" / ");
  // KDV'Lİ FİŞ (v1.496.0): `tutar` KDV dahil yazılıyor; KDV ayrı sütunda görünür, TUTAR başlığı bunu söyler.
  const kdvVarMi = urunGruplari.some((ug) => (ug.items || []).some((h) => h.kdvTutari != null));
  const sutunSayisi = 2 + tumBedenler.length + 3 + (kurVarMi ? 1 : 0) + (kdvVarMi ? 1 : 0);

  const yazi = kompakt ? 10 : 11;
  const bh = { fontSize: yazi - 1, fontWeight: 700, color: "var(--erp-text-2)", padding: "3px 6px", whiteSpace: "nowrap" };
  const td = { fontSize: yazi, padding: "4px 6px", whiteSpace: "nowrap" };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...bh, textAlign: "left" }}>ÜRÜN</th>
            <th data-fis-kalem-renk-sutunu="1" style={{ ...bh, textAlign: "left" }}>{renkSutunBasligi.toLocaleUpperCase("tr-TR")}</th>
            {bedenliMi && tumBedenler.map((b) => (
              <th key={b} className="mono" style={{ ...bh, textAlign: "center" }}>{olcuGoster(b, "Miktar")}</th>
            ))}
            <th style={{ ...bh, textAlign: "right", borderLeft: "1px dashed var(--erp-line)" }}>TOPLAM</th>
            <th style={{ ...bh, textAlign: "right" }}>BR. FİYAT</th>
            {kurVarMi && <th style={{ ...bh, textAlign: "right" }}>KUR</th>}
            {kdvVarMi && <th data-fis-kalem-kdv-sutunu="1" style={{ ...bh, textAlign: "right" }}>KDV</th>}
            <th style={{ ...bh, textAlign: "right" }}>{kdvVarMi ? "TUTAR (KDV DAHİL)" : "TUTAR"}</th>
          </tr>
        </thead>
        <tbody>
          {urunGruplari.map((ug, ugi) => {
            const araBaslikVar = !ortakBaslik && (ugi === 0 || ugBaslik(urunGruplari[ugi - 1]) !== ugBaslik(ug));
            const items = ug.items || [];
            const miktarVar = items.some((h) => h.miktar != null);
            const toplamAdet = stokYuvarla(items.reduce((t, h) => t + (h.miktar || 0), 0));
            // TUTAR önce kaydın KENDİ tutarından okunur; miktar × fiyat yalnızca tutarı olmayan
            // satırlarda (stok hareketleri) hesaplanır. Her zaman yeniden çarpsaydık, eski
            // kayıtlarda miktar/fiyat eksik olduğu için tutar 0 görünürdü — cariye gerçekten
            // yazılmış rakam varken ekranda sıfır göstermek en yanıltıcı hata olurdu.
            const tutarBilinen = items.some((h) => h.tutar != null);
            const toplamTutar = stokYuvarla(items.reduce(
              (t, h) => t + (h.tutar != null ? h.tutar : (h.miktar || 0) * (h.birimFiyat || 0)), 0));
            const pb = (items[0] || {}).paraBirimi || "TRY";
            const sembol = PARA_SEMBOLU[pb] || pb;
            const cevrimli = items.find((h) => h.kalemParaBirimi);

            // BR. FİYAT sütununda KULLANICININ GİRDİĞİ fiyat, girdiği para biriminde durur.
            // Önce çevrilmiş fiyat yazılıyordu: kullanıcı 0,25 $ girip ekranda 12,03 ₺ görüyor,
            // kendi girdiği rakamı hiçbir yerde bulamıyordu. Çevrim KUR sütununda anlatılıyor.
            //
            // ESKİ KAYITLAR: `hamBirimFiyat`/`kur` alanları sonradan eklendi. O alanları taşımayan
            // kayıtlarda ham fiyat uydurulmaz — kayıtta ne varsa o gösterilir, kur "?" kalır.
            const girilenler = Array.from(new Set(items.map((h) =>
              (h.kalemParaBirimi && h.hamBirimFiyat != null) ? h.hamBirimFiyat : h.birimFiyat
            ).filter((f) => f != null)));
            const tekGirilen = girilenler.length === 1 ? girilenler[0] : null;
            const hamVarMi = !!(cevrimli && cevrimli.hamBirimFiyat != null);
            const girilenPB = hamVarMi ? cevrimli.kalemParaBirimi : pb;
            const girilenSembol = PARA_SEMBOLU[girilenPB] || girilenPB;
            // Çevrilmiş birim fiyat: kur sütununda "= X ₺" olarak gösterilir.
            const cevrilmisBirim = Array.from(new Set(items.map((h) => h.birimFiyat).filter((f) => f != null)));
            const tekCevrilmis = cevrilmisBirim.length === 1 ? cevrilmisBirim[0] : null;
            const urun = (stok || []).find((p) => p.ad === ug.urunAd);
            const gorsel = urun ? ((urun.renkResimleri || {})[ug.renk] || urun.kapakResmi) : null;
            // Miktarı OLMAYAN kayıt hücreye 0 yazdırmaz: eski kayıtlarda miktar hiç saklanmamış,
            // "0 aldım" ile "kaç aldığım kayıtlı değil" apayrı şeyler.
            const bedenIndex = {};
            items.forEach((h) => {
              if (h.miktar == null) return;
              bedenIndex[h.beden] = (bedenIndex[h.beden] || 0) + h.miktar;
            });
            return (
              <React.Fragment key={ug.key}>
              {araBaslikVar && (
                <tr data-fis-kalem-ara-baslik={ugBaslik(ug)}>
                  <td colSpan={sutunSayisi} style={{ ...td, fontSize: yazi - 1, fontWeight: 800, letterSpacing: ".04em", color: "var(--erp-text-2)", background: "var(--erp-head)" }}>
                    {ugBaslik(ug).toLocaleUpperCase("tr-TR")}
                  </td>
                </tr>
              )}
              <tr key={ug.key} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                <td style={{ ...td, fontWeight: 600 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <ColorSwatch src={gorsel} editable={false} size={kompakt ? 16 : 20} />
                    {ug.urunAd}
                  </span>
                </td>
                <td className="mono" style={{ ...td, color: "var(--erp-text-2)" }}>{olcuGoster(ug.renk)}</td>
                {bedenliMi && tumBedenler.map((b) => {
                  const m = bedenIndex[b];
                  if (m == null) return <td key={b} style={{ ...td, textAlign: "center", color: "var(--erp-line-soft)" }}>—</td>;
                  return (
                    <td key={b} className="mono" style={{ ...td, textAlign: "center", fontWeight: 700, color: m < 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                      {stokYuvarla(m)}
                    </td>
                  );
                })}
                <td className="mono" style={{ ...td, textAlign: "right", fontWeight: 700, borderLeft: "1px dashed var(--erp-line)" }}>
                  {miktarVar
                    ? <>{toplamAdet} <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}>{ug.birim || ""}</span></>
                    : <span style={{ fontWeight: 400, color: "var(--erp-line-soft)" }} title="Bu eski kayıtta miktar bilgisi saklanmamış">—</span>}
                </td>
                {/* GİRİLEN fiyat, girildiği para biriminde. */}
                <td className="mono" style={{ ...td, textAlign: "right" }}>
                  {tekGirilen != null
                    ? `${tekGirilen.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} ${girilenSembol}`
                    : girilenler.length > 1
                      ? <span style={{ color: "var(--erp-warn)" }} title="Bedenler farklı birim fiyatta">farklı</span>
                      : <span style={{ color: "var(--erp-line-soft)" }} title="Bu eski kayıtta birim fiyat saklanmamış">—</span>}
                </td>
                {/* İŞLEM AÇIKÇA YAZILIR: "× 48,1 = 12,03 ₺". Kur sözleşmesi "1 yabancı = X TRY"
                    olduğu için yabancıdan TL'ye ÇARPILIR, TL'den yabancıya BÖLÜNÜR; iki yabancı
                    arasında ikisi birden yapılır. Hep "×" yazmak, bölme yapılan durumda yanlış
                    bir işlem göstermek olurdu. */}
                {kurVarMi && (
                  <td className="mono" style={{ ...td, textAlign: "right", color: "var(--erp-text-2)" }}>
                    {cevrimli ? (
                      <span title={`Kalem ${cevrimli.kalemParaBirimi} olarak girildi, ${pb} karşılığına çevrildi`}>
                        {(cevrimli.kur || cevrimli.kurHedef) ? (
                          <>
                            {cevrimli.kur ? `× ${cevrimli.kur.toLocaleString("tr-TR", { maximumFractionDigits: 4 })}` : ""}
                            {cevrimli.kurHedef ? `${cevrimli.kur ? " " : ""}÷ ${cevrimli.kurHedef.toLocaleString("tr-TR", { maximumFractionDigits: 4 })}` : ""}
                          </>
                        ) : (
                          <span style={{ color: "var(--erp-warn)" }} title="Bu eski kayıtta kullanılan kur saklanmamış">kur yok</span>
                        )}
                        {tekCevrilmis != null && (
                          <span style={{ color: "var(--erp-text-3)" }}>
                            {" = "}{tekCevrilmis.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} {sembol}
                          </span>
                        )}
                      </span>
                    ) : "—"}
                  </td>
                )}
                {kdvVarMi && (() => {
                  const kdvToplam = stokYuvarla(items.reduce((t, h) => t + (h.kdvTutari || 0), 0));
                  const oranlar = Array.from(new Set(items.filter((h) => h.kdvOrani != null).map((h) => h.kdvOrani)));
                  return (
                    <td className="mono" data-fis-kalem-kdv={ug.key} style={{ ...td, textAlign: "right" }}>
                      {items.some((h) => h.kdvTutari != null)
                        ? <>{oranlar.length === 1 ? <span style={{ color: "var(--erp-text-3)" }}>%{oranlar[0]} </span> : null}{kdvToplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}</>
                        : <span style={{ color: "var(--erp-line-soft)" }}>—</span>}
                    </td>
                  );
                })()}
                <td className="mono" style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                  {(tutarBilinen || toplamTutar > 0)
                    ? <>{toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}</>
                    : <span style={{ fontWeight: 400, color: "var(--erp-line-soft)" }}>—</span>}
                </td>
              </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Bir fiş grubu içindeki hareketleri ürün+renk bazında toplar (yapılandırılmış ürün bilgisi olanlar için).
function urunRenkGrupla(hareketler) {
  const g = [];
  const idx = {};
  hareketler.forEach((h) => {
    if (!h.urunAd) return;
    const key = `${h.urunAd}__${h.renk}`;
    if (!(key in idx)) {
      idx[key] = g.length;
      g.push({ key, urunAd: h.urunAd, renk: h.renk, birim: h.birim, items: [] });
    }
    g[idx[key]].items.push(h);
  });
  return g;
}


// Vergi no kutusunun altındaki anlık uyarı (yazarken): hatalı numara kırmızı, aynı numaralı cari turuncu,
// geçerliyse türü (VKN / TCKN) yeşil. Kayıt sırasında aynı kontrol bir kez daha sorulur (addCari).
function VergiNoUyarisi({ cariler, no, haricId }) {
  const n = vergiNoNormal(no);
  if (!n) return null;
  const k = vergiNoKontrol(n);
  // Yazma sürerken (10 haneden az) kırmızı göstermek gürültü olur; eksik hane mesajı ancak 10+ hanede.
  const yaziliyor = /^\d{1,9}$/.test(n);
  const ayni = ayniVergiNoluCariler(cariler, n, haricId);
  const satir = { fontSize: 11, marginTop: 3, lineHeight: 1.3 };
  return (
    <div data-vergi-no-uyarisi="1">
      {!k.gecerli && !yaziliyor && <div style={{ ...satir, color: "var(--erp-danger)", fontWeight: 600 }} data-vergi-no-hatali="1">{k.mesaj}</div>}
      {k.gecerli && <div style={{ ...satir, color: "var(--erp-primary)" }} data-vergi-no-gecerli={k.tur}>✓ {k.tur === "tckn" ? "TC kimlik no" : "Vergi no"} geçerli</div>}
      {ayni.length > 0 && (
        <div style={{ ...satir, color: "var(--erp-orange)", fontWeight: 600 }} data-vergi-no-mukerrer="1">
          Bu numarayla kayıtlı: {ayni.map((c) => `${c.unvan} (${c.tip})`).join(", ")}
        </div>
      )}
    </div>
  );
}

// ÖDEME & TAHSİLAT ALANI (v1.645.10 — kullanıcı: "Ödeme ve tahsilat içerisinde kasa, banka, çek, senet hepsi dahil
// olacak; onları toparlayacak alan diye yaptık"). v1.645.8'de yalnız giriş ekranıydı; Kasa & Banka ve Çek & Senet
// menüde ayrı duruyordu. Şimdi üçü TEK ALANIN sekmeleri: bu şerit üç ekranın da üstünde. Ekranlar yerinde kaldı
// (Cari/MuhasebeModule tek örnekleri, sekme anahtarları odemetahsilat / muhasebe / cekler) — bağlantılar, sağ tık
// "kasaya git" gibi yollar ve senaryolar bozulmasın; şerit yalnız aralarında geçiş ve ortak başlık.
const ODEME_ALANI_SEKMELERI = [
  { tab: "odemetahsilat", ad: "Tahsilat / Ödeme gir", Ikon: ArrowDownCircle },
  { tab: "muhasebe", ad: "Kasa & Banka", Ikon: Wallet },
  { tab: "cekler", ad: "Çek & Senet", Ikon: Receipt },
  { tab: "odemerapor", ad: "Rapor", Ikon: TrendingUp },
  // v1.671.0: bankanın Excel ekstresinden toplu giriş (339).
  { tab: "bankaexcel", ad: "Banka Excel'i", Ikon: Upload },
];
function OdemeAlaniSeridi({ tab, onGit }) {
  if (!ODEME_ALANI_SEKMELERI.some((s) => s.tab === tab)) return null;
  return (
    <div data-odeme-alani-seridi="1" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12,
      padding: "6px 8px", background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)" }}>
      {ODEME_ALANI_SEKMELERI.map(({ tab: t, ad, Ikon }) => {
        const aktif = t === tab;
        return (
          <button key={t} type="button" data-odeme-alani-sekme={t} onClick={() => onGit(t)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              borderRadius: "var(--erp-r-md)", border: `1.5px solid ${aktif ? "#2F6B4F" : "var(--erp-line)"}`,
              background: aktif ? "#2F6B4F" : "#fff", color: aktif ? "#fff" : "var(--erp-text-2)" }}>
            <Ikon size={15} /> {ad}
          </button>
        );
      })}
    </div>
  );
}

// ÖDEME & TAHSİLAT RAPORU (v1.645.10 — kullanıcı: "Bu alana rapor da ekleriz"). Alanın dördüncü sekmesi. Seçilen
// tarih aralığında: (1) ödeme şekli × Tahsilat / Ödeme / Net — para birimi başına ayrı (farklı birimleri toplamak
// yapılmamış bir kur çevrimi olurdu); (2) kasa/banka başına giriş / çıkış ve güncel bakiye; (3) vadesi 30 gün içinde
// dolan portföy çek/senetleri; (4) kayıt listesi. Kaynak YALNIZ mevcut kayıtlar: cari para hareketleri (THS-/ODM-,
// `paraHareketiMi`), hesap hareketleri, çek defteri — ayrı bir rapor tablosu tutulmaz.
function odemeHareketTipi(h) {
  if (h.islemTipi === "Tahsilat" || h.islemTipi === "Ödeme") return h.islemTipi;
  if (/^ODM-/.test(String(h.fisNo || "")) || /^ödeme/i.test(String(h.aciklama || "").trim())) return "Ödeme";
  return "Tahsilat";
}
function OdemeRaporu({ cariler, muhasebe, onCariAc }) {
  const bugun = bugunYerel();
  const ayBasi = `${bugun.slice(0, 8)}01`;
  const [aralik, setAralik] = useState({ bas: ayBasi, bit: bugun });
  const [tipSuzgec, setTipSuzgec] = useState("Tümü");
  const icinde = (t) => { const g = String(t || "").slice(0, 10); return g >= aralik.bas && g <= aralik.bit; };
  const kisayol = (ad) => {
    const d = new Date(`${bugun}T12:00:00`); const iso = (x) => x.toISOString().slice(0, 10);
    if (ad === "Bugün") return { bas: bugun, bit: bugun };
    if (ad === "Bu hafta") { const g = (d.getDay() + 6) % 7; const b = new Date(d); b.setDate(d.getDate() - g); return { bas: iso(b), bit: bugun }; }
    if (ad === "Bu ay") return { bas: ayBasi, bit: bugun };
    if (ad === "Geçen ay") { const b = new Date(d.getFullYear(), d.getMonth() - 1, 1, 12); const s = new Date(d.getFullYear(), d.getMonth(), 0, 12); return { bas: iso(b), bit: iso(s) }; }
    return { bas: `${bugun.slice(0, 4)}-01-01`, bit: bugun };
  };
  const kayitlar = [];
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
    if (!paraHareketiMi(h) || !icinde(h.tarih)) return;
    const tip = odemeHareketTipi(h);
    if (tipSuzgec !== "Tümü" && tip !== tipSuzgec) return;
    kayitlar.push({ c, h, tip, pb: h.paraBirimi || c.paraBirimi || "TRY", sekil: h.odemeSekli || "Diğer" });
  }));
  kayitlar.sort((a, b) => String(b.h.tarih || "").localeCompare(String(a.h.tarih || "")) || String(b.h.zaman || "").localeCompare(String(a.h.zaman || "")));
  const para = (x, pb) => `${Number(x || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`;
  // (1) Şekil × tip, para birimi başına.
  const ozet = {};
  kayitlar.forEach(({ tip, pb, sekil, h }) => {
    const o = (ozet[pb] = ozet[pb] || {}); const s = (o[sekil] = o[sekil] || { Tahsilat: 0, "Ödeme": 0, adet: 0 });
    s[tip] += Number(h.tutar) || 0; s.adet += 1;
  });
  const sekilSirasi = [...ODEME_SEKILLERI, "Diğer"];
  // (2) Hesaplar: aralıktaki giriş/çıkış + güncel bakiye.
  const hesaplar = [
    ...(((muhasebe && muhasebe.kasalar) || []).map((h) => ({ tur: "Kasa", h }))),
    ...(((muhasebe && muhasebe.bankalar) || []).map((h) => ({ tur: "Banka", h }))),
  ].map(({ tur, h }) => {
    let giris = 0, cikis = 0;
    (h.hareketler || []).forEach((x) => { if (!icinde(x.tarih)) return; if (x.yon === "Giriş") giris += Number(x.tutar) || 0; else cikis += Number(x.tutar) || 0; });
    return { tur, h, giris, cikis, bakiye: hesapBakiyesi(h) };
  });
  // (3) Vadesi yaklaşan portföy çek/senetleri.
  const otuzGun = (() => { const d = new Date(`${bugun}T12:00:00`); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();
  const yaklasan = ((muhasebe && muhasebe.cekler) || [])
    .filter((c) => (c.durum || "Portföyde") === "Portföyde" && c.vadeTarihi && String(c.vadeTarihi).slice(0, 10) <= otuzGun)
    .sort((a, b) => String(a.vadeTarihi).localeCompare(String(b.vadeTarihi)));
  const th = { fontSize: 10, textAlign: "left", padding: "6px 8px", color: "var(--erp-text-2)", background: "var(--erp-panel)" };
  const td = { fontSize: 12, padding: "5px 8px", borderTop: "1px solid var(--erp-line-soft)" };
  const kutu = { background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 12 };
  return (
    <div data-odeme-raporu="1">
      <div style={{ ...MOR_SERIT_STIL, padding: "8px 12px", marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="date" data-odeme-rapor-bas="1" value={aralik.bas} onChange={(e) => setAralik({ ...aralik, bas: e.target.value })} style={{ ...inputStyle, width: 150 }} />
        <span>–</span>
        <input type="date" data-odeme-rapor-bit="1" value={aralik.bit} onChange={(e) => setAralik({ ...aralik, bit: e.target.value })} style={{ ...inputStyle, width: 150 }} />
        {["Bugün", "Bu hafta", "Bu ay", "Geçen ay", "Bu yıl"].map((k) => (
          <button key={k} type="button" className="btn-ghost" data-odeme-rapor-kisayol={k} style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => setAralik(kisayol(k))}>{k}</button>
        ))}
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
          {["Tümü", "Tahsilat", "Ödeme"].map((t) => (
            <button key={t} type="button" data-odeme-rapor-tip={t} onClick={() => setTipSuzgec(t)}
              style={{ padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: "var(--erp-r-pill)", border: "1px solid var(--erp-line)",
                background: tipSuzgec === t ? "var(--erp-text)" : "#fff", color: tipSuzgec === t ? "#fff" : "var(--erp-text-2)" }}>{t}</button>
          ))}
        </span>
      </div>

      <div style={kutu}>
        <b style={{ fontSize: 13 }}>Ödeme şekline göre</b>
        {Object.keys(ozet).length === 0 ? <div style={{ fontSize: 12, color: "var(--erp-text-3)", padding: 8 }}>Bu aralıkta tahsilat / ödeme yok.</div> :
          Object.entries(ozet).map(([pb, o]) => {
            const top = { Tahsilat: 0, "Ödeme": 0, adet: 0 };
            Object.values(o).forEach((s) => { top.Tahsilat += s.Tahsilat; top["Ödeme"] += s["Ödeme"]; top.adet += s.adet; });
            const satirlar = sekilSirasi.filter((k) => o[k]);
            return (
              <table key={pb} data-odeme-rapor-ozet={pb} style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead><tr>{[`Şekil (${pb})`, "Tahsilat", "Ödeme", "Net", "Adet"].map((b, i) => <th key={b} style={{ ...th, textAlign: i ? "right" : "left" }}>{b}</th>)}</tr></thead>
                <tbody>
                  {[...satirlar.map((k) => [k, o[k]]), ["Toplam", top]].map(([k, s]) => (
                    <tr key={k} style={k === "Toplam" ? { fontWeight: 700 } : undefined}>
                      <td style={td}>{k}</td>
                      <td className="mono" style={{ ...td, textAlign: "right", color: HAREKET_TIPI_RENK["Tahsilat"] }}>{para(s.Tahsilat, pb)}</td>
                      <td className="mono" style={{ ...td, textAlign: "right", color: HAREKET_TIPI_RENK["Ödeme"] }}>{para(s["Ödeme"], pb)}</td>
                      <td className="mono" style={{ ...td, textAlign: "right" }}>{para(s.Tahsilat - s["Ödeme"], pb)}</td>
                      <td className="mono" style={{ ...td, textAlign: "right" }}>{s.adet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })}
      </div>

      <div style={kutu}>
        <b style={{ fontSize: 13 }}>Kasa ve bankalar</b>
        <table data-odeme-rapor-hesaplar="1" style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead><tr>{["Hesap", "Giriş (aralık)", "Çıkış (aralık)", "Net (aralık)", "Güncel bakiye"].map((b, i) => <th key={b} style={{ ...th, textAlign: i ? "right" : "left" }}>{b}</th>)}</tr></thead>
          <tbody>
            {hesaplar.map(({ tur, h, giris, cikis, bakiye }) => (
              <tr key={h.id}>
                <td style={td}>{tur} · {h.ad}</td>
                <td className="mono" style={{ ...td, textAlign: "right" }}>{para(giris, h.paraBirimi || "TRY")}</td>
                <td className="mono" style={{ ...td, textAlign: "right" }}>{para(cikis, h.paraBirimi || "TRY")}</td>
                <td className="mono" style={{ ...td, textAlign: "right" }}>{para(giris - cikis, h.paraBirimi || "TRY")}</td>
                <td className="mono" style={{ ...td, textAlign: "right", fontWeight: 700, color: bakiye < 0 ? "var(--erp-danger, #B3261E)" : "#2F6B4F" }}>{para(bakiye, h.paraBirimi || "TRY")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={kutu}>
        <b style={{ fontSize: 13 }}>Vadesi 30 gün içinde dolan çek / senet (portföyde) · {yaklasan.length}</b>
        {yaklasan.length === 0 ? <div style={{ fontSize: 12, color: "var(--erp-text-3)", padding: 8 }}>Yok.</div> : (
          <table data-odeme-rapor-vade="1" style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead><tr>{["Vade", "No", "Cari / keşideci", "Tutar"].map((b, i) => <th key={b} style={{ ...th, textAlign: i === 3 ? "right" : "left" }}>{b}</th>)}</tr></thead>
            <tbody>{yaklasan.map((c) => (
              <tr key={c.id} style={String(c.vadeTarihi).slice(0, 10) < bugun ? { color: "var(--erp-danger, #B3261E)" } : undefined}>
                <td className="mono" style={td}>{tarihTr(String(c.vadeTarihi).slice(0, 10))}</td>
                <td className="mono" style={td}>{c.cekNo || "—"}</td>
                <td style={td}>{c.cariUnvan || c.kesideci || ((cariler || []).find((x) => x.id === c.cariId) || {}).unvan || "—"}</td>
                <td className="mono" style={{ ...td, textAlign: "right" }}>{para(c.tutar, c.paraBirimi || "TRY")}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div style={kutu}>
        <b style={{ fontSize: 13 }}>Kayıtlar · {kayitlar.length}</b>
        <div style={{ maxHeight: 420, overflowY: "auto", marginTop: 8 }}>
          <table data-odeme-rapor-liste="1" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}><tr>{["Tarih", "Cari", "İşlem", "Şekli", "Tutar", "Fiş No", "Kullanıcı"].map((b) => <th key={b} style={{ ...th, textAlign: b === "Tutar" ? "right" : "left" }}>{b}</th>)}</tr></thead>
            <tbody>{kayitlar.map(({ c, h, tip, pb }, i) => (
              <tr key={`${c.id}-${h.id || i}`} style={{ cursor: "pointer" }} onClick={() => onCariAc && onCariAc(c.id)}>
                <td className="mono" style={td}>{tarihTr(String(h.tarih || "").slice(0, 10))}</td>
                <td style={{ ...td, fontWeight: 600 }}>{c.unvan}</td>
                <td style={{ ...td, color: HAREKET_TIPI_RENK[tip], fontWeight: 700 }}>{tip}</td>
                <td style={td}>{h.odemeSekli || "—"}</td>
                <td className="mono" style={{ ...td, textAlign: "right", fontWeight: 700 }}>{para(h.tutar, pb)}</td>
                <td className="mono" style={td}>{h.fisNo || ""}</td>
                <td style={{ ...td, color: "var(--erp-text-2)" }}>{h.kullanici || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
