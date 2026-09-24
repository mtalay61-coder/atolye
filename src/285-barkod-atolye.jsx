// ================= BARKODLA ATÖLYE =================
//
// Kullanıcı: "Her personelin kendi barkodu var. Barkod okutup kendi alabileceği ve teslim
// edebileceği ürünleri görüyor. Her üretimin kendi barkodu olacak; üretim barkodunu okutunca
// alınmış ise teslim edilecek, alınmamış ise alınacak. İlk okutma iş alma, ikinci okutma teslim.
// Hiçbir tuşa basmadan sadece barkod okutarak."
//
// TASARIM: TEK KUTU, İKİ AŞAMA.
// Ekranda tek bir okutma kutusu var ve odak hep onda. Ne okutulduğuna göre ne yapılacağına
// UYGULAMA karar veriyor:
//   personel barkodu  → o kişinin ekranı açılır
//   üretim/parça kodu → o iş ALINMAMIŞSA alınır, ALINMIŞSA teslim edilir
// Kullanıcıya "şimdi şunu seç" dedirtecek hiçbir adım yok; kalfanın elinde okuyucudan başka bir
// şey olmayabilir.
//
// PARÇALANMA — kullanıcının "ince ayrıntı" dediği yer:
// 32 çiftlik bir iş 12 + 20 diye iki kalfaya bölünebiliyor. Her parça KENDİ barkodunu alıyor ve
// kod ana koddan türüyor: `1001-1`, `1001-2`. Böylece elindeki etikete bakan biri hangi üretimin
// parçası olduğunu okuyabiliyor. Kod ATAMAYA YAZILIP SAKLANIYOR, sıradan türetilmiyor: bir atama
// silinirse sıradaki parçanın kodu kaymaz ve basılmış etiket geçersiz olmaz.
// (Varyant barkodlarında da aynı karar verildi; sebep aynı.)

// Bir atamaya kalıcı barkod üretir. `mevcutKodlar` aynı üretimdeki diğer parçaların kodları.
function parcaBarkoduUret(anaKod, mevcutKodlar) {
  const kok = `${anaKod}-`;
  let enBuyuk = 0;
  (mevcutKodlar || []).forEach((k) => {
    if (!k || !String(k).startsWith(kok)) return;
    const son = String(k).slice(kok.length);
    if (/^\d+$/.test(son)) enBuyuk = Math.max(enBuyuk, parseInt(son, 10));
  });
  return `${kok}${enBuyuk + 1}`;
}

// Okutulan kodun ne olduğunu bulur. Tek kutu, tek arama: kod önce personelde, sonra üretim
// parçalarında, sonra ana üretim kodlarında aranıyor.
function barkodCoz(kod, cariler, uretim) {
  const temiz = String(kod || "").trim();
  if (!temiz) return null;
  const kucuk = temiz.toLocaleLowerCase("tr-TR");

  const personel = (cariler || []).find(
    (c) => c.barkodKodu && String(c.barkodKodu).toLocaleLowerCase("tr-TR") === kucuk);
  if (personel) return { tur: "personel", personel };

  // AYNI KOD BİRDEN ÇOK ATAMADA OLABİLİR.
  //
  // Bölünme yoksa parça, üretimin kendi kodunu taşıyor (v1.94.0): aynı bohça Kesim'de de Saya'da
  // da "1000". Eski atamalar bitmiş olarak duruyor, o yüzden AÇIK olan aranıyor — okutulan etiket
  // her zaman "şu an elde olan iş"i gösterir. Hepsi bitmişse parça olarak eşleşme YOK; kod ana
  // üretim kodu gibi çözülüp sıradaki prosese iş verilir.
  for (const u of uretim || []) {
    for (const adim of u.prosesIlerleme || []) {
      const atama = (adim.atamalar || []).find((a) => a.barkod === temiz && !a.tamamlandiMi);
      if (atama) return { tur: "parca", uretim: u, adim, atama };
    }
  }

  // BİTMİŞ PARÇA = SONRAKİ PROSESE HAZIR BOHÇA.
  //
  // Parça bir proseste teslim edildiğinde etiketi üzerinde kalıyor ve aynı etiket sonraki proseste
  // okutuluyor. Kod bohçayı tanıyor, prosesi değil: "1000-1" Kesim'de teslim edildiyse Saya'da
  // yine "1000-1" olarak alınır — kullanıcının deyişiyle "sanki ayrı üretimmiş gibi" yoluna
  // devam eder. En SON teslim edilen eşleşme alınıyor: aynı kod birden çok proseste geçmiş olabilir.
  for (const u of uretim || []) {
    const ilerleme = u.prosesIlerleme || [];
    for (let i = ilerleme.length - 1; i >= 0; i--) {
      const atama = (ilerleme[i].atamalar || []).find((a) => a.barkod === temiz && a.tamamlandiMi);
      if (!atama) continue;
      const sonraki = ilerleme[i + 1];
      if (!sonraki || sonraki.tamamlandiMi) break;   // gidecek proses yok
      return { tur: "bitmisParca", uretim: u, adim: sonraki, kaynakAdim: ilerleme[i], atama };
    }
  }

  const ana = (uretim || []).find((u) => u.takipKodu === temiz || u.siparisNo === temiz);
  if (ana) return { tur: "uretim", uretim: ana };

  return null;
}

// Bir üretimde ŞU AN dağıtılabilir durumdaki adım: sırası gelmiş, tamamlanmamış ilk proses.
// "Sırası gelmiş" demek: kendinden öncekiler bitmiş. Sıra atlatmak, yapılmamış işin üstüne iş
// vermek olurdu.
function siradakiAdim(u) {
  const ilerleme = u.prosesIlerleme || [];
  for (let i = 0; i < ilerleme.length; i++) {
    const oncekilerBitti = ilerleme.slice(0, i).every((p) => p.tamamlandiMi);
    if (!ilerleme[i].tamamlandiMi && oncekilerBitti) return { adim: ilerleme[i], adimIndex: i };
  }
  return null;
}

// Adımda henüz dağıtılmamış miktar (beden bazında).
function dagitilmamis(u, adim) {
  const toplam = {};
  ((u.bedenMiktarlari || []).length ? u.bedenMiktarlari : [{ beden: u.beden || "", miktar: u.adet || 0 }])
    .forEach((b) => { toplam[b.beden] = (toplam[b.beden] || 0) + (b.miktar || 0); });
  (adim.atamalar || []).forEach((a) => {
    Object.entries(a.bedenMiktarlari || {}).forEach(([beden, m]) => {
      toplam[beden] = (toplam[beden] || 0) - (m || 0);
    });
  });
  return Object.entries(toplam).filter(([, m]) => m > 0).map(([beden, miktar]) => ({ beden, miktar }));
}

function BarkodAtolyeEkrani({ cariler, uretim, stok, onProsesVer, onProsesTamamla, onClose }) {
  const [personel, setPersonel] = useState(null);
  const [kod, setKod] = useState("");
  // KISMİ ALMA İÇİN MİKTAR KUTUSU.
  //
  // Okutma varsayılan olarak kalanın TAMAMINI alıyor; en sık yapılan iş bu. Ama kullanıcının
  // özellikle belirttiği durum var: 32 çiftlik iş 12 + 20 diye iki kalfaya bölünebiliyor.
  // Tamamını alan bir okutma bölmeyi imkânsız kılardı — ikinci kalfaya hiçbir şey kalmazdı.
  // Kutu BOŞ bırakılırsa tamamı alınır; sayı yazılırsa o kadarı. Yazmak tek hareket, tuş değil.
  const [miktar, setMiktar] = useState("");
  const [gunluk, setGunluk] = useState([]);   // son işlemler, en yenisi başta
  // BU OTURUMDA TESLİM EDİLENLER. Kalfa gün içinde onlarca parça teslim ediyor; "bugün ne yaptım"
  // sorusunun cevabı ekranda kalmalı. Kayıt üretimde zaten tutuluyor ama oradan okumak, kalfanın
  // yapamayacağı bir gezinme gerektirirdi. Oturum = personel girişinden çıkışına kadar; başka
  // biri barkodunu okuttuğunda liste sıfırlanıyor, çünkü artık başka birinin işi görünürdü.
  const [teslimEdilenler, setTeslimEdilenler] = useState([]);
  const kutuRef = React.useRef(null);

  // ODAK HEP OKUTMA KUTUSUNDA. Barkod okuyucu klavye gibi yazıyor; odak başka yerdeyse okutma
  // hiçbir işe yaramıyor ve kullanıcı sebebini anlamıyor.
  useEffect(() => { if (kutuRef.current) kutuRef.current.focus(); });

  // KENDİLİĞİNDEN OKUMA YOK — KULLANICI KARARI (v1.102.0).
  //
  // Bir ara "yazma durunca kendiliğinden okut" eklenmişti (Enter göndermeyen okuyucular için).
  // Ama kodlar ELLE de giriliyor ve o durumda yazarken verilen kısa duraklamalar yarım kodu
  // okutuyordu. Tetikleyici artık AÇIK: Enter ya da yanındaki "Okut" düğmesi. Belirsiz bir
  // otomatik davranıştansa iki net yol daha iyi.

  const bildir = (tur, metin) => setGunluk((o) => [{ tur, metin, zaman: new Date() }, ...o].slice(0, 12));

  // Bu personelin ELİNDEKİ işler: kendisine verilmiş ve henüz teslim etmemiş parçalar.
  const elindekiler = [];
  (uretim || []).forEach((u) => {
    (u.prosesIlerleme || []).forEach((adim) => {
      (adim.atamalar || []).forEach((a) => {
        if (personel && a.personelId === personel.id && !a.tamamlandiMi) {
          elindekiler.push({ uretim: u, adim, atama: a });
        }
      });
    });
  });

  // Bu personelin ALABİLECEĞİ işler: bağlı olduğu proseslerde sırası gelmiş ve dağıtılmamış
  // miktarı olan üretimler. Bağlı proses tanımlı değilse hiçbir şey gösterilmiyor — herkesin her
  // işi alabilmesi, atölyede kimin ne yaptığını izlenemez hale getirirdi.
  const alinabilirler = [];
  if (personel) {
    const bagli = personel.bagliProsesler || [];
    (uretim || []).forEach((u) => {
      // BÖLÜNMÜŞ ÜRETİMDE PARÇALAR LİSTELENİR, ana kod değil. Ana kodu göstermek "tamamını
      // alabilirsin" demekti ve bölünmeyi geri birleştiriyordu.
      if (uretimBolunmusMu(u)) {
        const ilerleme = u.prosesIlerleme || [];
        ilerleme.forEach((adim, i) => {
          const sonraki = ilerleme[i + 1];
          if (!sonraki || sonraki.tamamlandiMi || sonraki.araProsesMi) return;
          if (!bagli.includes(sonraki.proses)) return;
          (adim.atamalar || []).forEach((a) => {
            if (!a.tamamlandiMi || !a.barkod) return;
            // Bu parça sonraki adımda zaten alınmışsa listede durmamalı.
            if ((sonraki.atamalar || []).some((x) => x.barkod === a.barkod)) return;
            const tasinacak = (a.sonuc && a.sonuc.saglam) || a.bedenMiktarlari || {};
            const kalan = Object.entries(tasinacak)
              .filter(([, m]) => (m || 0) > 0)
              .map(([beden, miktar]) => ({ beden, miktar }));
            if (kalan.length === 0) return;
            alinabilirler.push({ uretim: u, adim: sonraki, kalan, parcaKod: a.barkod });
          });
        });
        return;
      }
      const s = siradakiAdim(u);
      if (!s || s.adim.araProsesMi) return;
      if (!bagli.includes(s.adim.proses)) return;
      const kalan = dagitilmamis(u, s.adim);
      if (kalan.length === 0) return;
      alinabilirler.push({ uretim: u, adim: s.adim, kalan });
    });
  }

  function isAl(u, adim) {
    const kalan = dagitilmamis(u, adim);
    if (kalan.length === 0) { bildir("hata", `${u.takipKodu}: dağıtılacak iş kalmamış`); return; }
    const kalanToplam = kalan.reduce((t, k) => t + k.miktar, 0);
    const istenen = parseFloat(miktar);

    const bedenMiktarlari = {};
    if (istenen > 0 && istenen < kalanToplam) {
      // KISMİ ALMA: istenen adet bedenlere SIRAYLA dağıtılıyor. Oransal bölmek küsurat üretirdi
      // (12 çiftin 3 bedene bölünmesi 4.33 gibi); atölyede çift bölünmez.
      let kalanIstek = istenen;
      kalan.forEach((k) => {
        if (kalanIstek <= 0) return;
        const pay = Math.min(k.miktar, kalanIstek);
        bedenMiktarlari[k.beden] = pay;
        kalanIstek -= pay;
      });
    } else {
      kalan.forEach((k) => { bedenMiktarlari[k.beden] = k.miktar; });
    }

    onProsesVer(u.id, adim.proses, personel.id, bedenMiktarlari);
    const adet = Object.values(bedenMiktarlari).reduce((t, m) => t + m, 0);
    setMiktar("");
    bildir("al", `${u.takipKodu} · ${adim.proses} · ${adet} çift alındı${adet < kalanToplam ? ` (${kalanToplam - adet} çift başkasına kaldı)` : ""}`);
  }

  function teslimEt(u, adim, atama) {
    // Teslim de tek okutmayla: tamamı sağlam kabul ediliyor. Fire/tamir varsa üretim kartındaki
    // ayrıntılı teslim ekranı kullanılıyor — atölyede okuyucudan başka bir şey olmayabilir.
    //
    // BİÇİM `saglam`/`tamir`/`hurda` OLMAK ZORUNDA. İlk yazımda `bedenMiktarlari` gönderilmişti;
    // teslim alma fonksiyonu sağlam haritasını boş buluyor, toplam sıfır çıkıyor ve SESSİZCE
    // dönüyordu. Ekranda hiçbir şey olmuyordu: "barkod sadece alma yapıyor, teslim etmiyor".
    // Sessiz dönüş, yanlış biçimden daha pahalıya mal oldu — hata görünmedi.
    const sonuc = { saglam: { ...(atama.bedenMiktarlari || {}) }, tamir: [], hurda: [] };
    onProsesTamamla(u.id, adim.proses, atama.id, sonuc);
    const adet = Object.values(atama.bedenMiktarlari || {}).reduce((t, m) => t + (m || 0), 0);
    const urun = (stok || []).find((x) => x.id === u.urunId);
    setTeslimEdilenler((o) => [{
      barkod: atama.barkod || u.takipKodu,
      urunAd: (urun && urun.ad) || u.model || "",
      renk: u.renk || "",
      proses: adim.proses,
      adet,
      zaman: new Date(),
    }, ...o]);
    bildir("teslim", `${atama.barkod || u.takipKodu} · ${adim.proses} · ${adet} çift teslim edildi`);
  }

  function okut(deger) {
    const sonuc = barkodCoz(deger, cariler, uretim);
    setKod("");
    if (!sonuc) {
      // Neden bulunamadığını da söyle: kullanıcı kodu mu yanlış okuttu, kod mu tanımsız?
      bildir("hata", personel
        ? `Tanınmayan barkod: ${deger} — bu üretim/parça kodu bulunamadı`
        : `Tanınmayan barkod: ${deger} — bu kod hiçbir personele tanımlı değil`);
      return;
    }

    if (sonuc.tur === "personel") {
      setPersonel(sonuc.personel);
      setGunluk([]);
      setTeslimEdilenler([]);
      setMiktar("");
      bildir("giris", `${sonuc.personel.unvan} girdi`);
      return;
    }
    if (!personel) { bildir("hata", "Önce kendi barkodunuzu okutun"); return; }

    if (sonuc.tur === "bitmisParca") {
      // Bohçayı sonraki prosese al — KODU DEĞİŞMEDEN.
      const { uretim: u, adim, atama } = sonuc;
      if ((personel.bagliProsesler || []).length && !(personel.bagliProsesler || []).includes(adim.proses)) {
        bildir("hata", `${atama.barkod}: sıradaki proses "${adim.proses}", size tanımlı değil`);
        return;
      }
      // Teslim edilen SAĞLAM miktar taşınır; hurda/tamire ayrılan çift sonraki prosese gitmez.
      const tasinacak = (atama.sonuc && atama.sonuc.saglam) || atama.bedenMiktarlari || {};
      const adet = Object.values(tasinacak).reduce((t, m) => t + (m || 0), 0);
      if (adet <= 0) { bildir("hata", `${atama.barkod}: taşınacak sağlam çift yok`); return; }
      onProsesVer(u.id, adim.proses, personel.id, tasinacak, atama.barkod);
      bildir("al", `${atama.barkod} · ${adim.proses} · ${adet} çift alındı`);
      return;
    }

    if (sonuc.tur === "parca") {
      const { uretim: u, adim, atama } = sonuc;
      if (atama.tamamlandiMi) { bildir("hata", `${atama.barkod}: bu parça zaten teslim edilmiş`); return; }
      if (atama.personelId !== personel.id) {
        // Başkasının işini teslim etmeye izin verilmiyor: kimin ne yaptığı kaydın kendisi.
        const sahip = (cariler || []).find((c) => c.id === atama.personelId);
        bildir("hata", `${atama.barkod}: bu iş ${sahip ? sahip.unvan : "başka birinde"}`);
        return;
      }
      teslimEt(u, adim, atama);
      return;
    }

    // Ana üretim kodu: sırası gelen adımda dağıtılmamış iş varsa AL.
    const u = sonuc.uretim;
    const s = siradakiAdim(u);
    // ANA KOD BÖLÜNMEDEN SONRA YENİ ADIMDA KAPALI.
    //
    // Kural iki durumu ayırmak zorunda:
    //   - Bölünen adımın KALANI (64 alındı, 40 duruyor): ana kod hâlâ geçerli, çünkü o 40 çiftin
    //     henüz bir parça etiketi yok. İkinci kalfa ana kodu okutup kalanı alıyor.
    //   - YENİ bir adım (Saya bitti, Kalfa açıldı): ana kod KAPALI. Burada ana kodu kabul etmek,
    //     iki parçayı tek iş gibi birleştiriyordu — bildirilen hata buydu (64 + 40 → 104).
    //
    // Ayırt edici: hedef adımda hiç atama var mı? Varsa dağıtım sürüyor, yoksa adım yeni.
    if (s && uretimBolunmusMu(u) && (s.adim.atamalar || []).length === 0) {
      bildir("hata", `${u.takipKodu} bölündü — parça barkodunu okutun: ${uretimParcaKodlari(u).join(", ")}`);
      return;
    }
    if (!s) { bildir("hata", `${u.takipKodu}: bütün prosesler bitmiş`); return; }
    if ((personel.bagliProsesler || []).length && !(personel.bagliProsesler || []).includes(s.adim.proses)) {
      bildir("hata", `${u.takipKodu}: sıradaki proses "${s.adim.proses}", size tanımlı değil`);
      return;
    }
    // Bu personelin bu üretimde teslim etmediği parçası varsa, ana kod TESLİM anlamına gelir.
    // "İlk okutma alma, ikinci okutma teslim" kuralı: parça etiketi yanında olmayan kalfa ana
    // kodu okutarak da teslim edebilsin.
    const kendiParcasi = (s.adim.atamalar || []).find((a) => a.personelId === personel.id && !a.tamamlandiMi);
    if (kendiParcasi) { teslimEt(u, s.adim, kendiParcasi); return; }
    isAl(u, s.adim);
  }

  const barkodluPersonelSayisi = (cariler || []).filter((c) => c.barkodKodu).length;
  const RENK = { al: "var(--erp-brown)", teslim: "var(--erp-primary)", giris: "var(--erp-info)", hata: "var(--erp-warn)" };

  // ÜST ŞERİDİN ALTINDAN BAŞLIYOR. `inset: 0` ile ekranın tepesinden başlıyordu ama sekme
  // şeridinin zIndex'i daha yüksek (500 > 200): şerit bu ekranın başlığının ÜZERİNE oturuyordu
  // (kullanıcı bildirdi, 6 Eylül). Diğer tam ekran paneller zaten `top: PENCERE_SERIT_YUKSEKLIGI`
  // kullanıyordu; bu ikisi o kuralın dışında kalmıştı.
  return (
    <div style={{ position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: 0, right: 0, bottom: 0, background: "#3A291D", zIndex: 200, display: "flex", flexDirection: "column", padding: 16, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <ScanLine size={20} color="var(--erp-panel-2)" />
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--erp-panel-2)" }}>Barkodla Atölye</span>
        {personel && (
          <span style={{ fontSize: 15, fontWeight: 700, color: "#E1C699" }}>· {personel.unvan}</span>
        )}
        <button className="btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>
          <X size={14} /> Kapat
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      {/* HİÇ BARKOD TANIMLI DEĞİLSE bunu ekranda söyle. Okutup tepki alamayan kullanıcının ilk
          düşüneceği şey "uygulama bozuk" oluyor; oysa sebep çoğu zaman kodun hiç atanmamış olması. */}
      {barkodluPersonelSayisi === 0 && (
        <div style={{ background: "#FBF0E2", border: "2px solid #B85C2E", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 12, fontSize: 13, color: "#7A3B22" }}>
          <b>Hiçbir personelin barkod kodu tanımlı değil.</b> Cari → personel kartı → Düzenle →
          Barkod Kodu alanından kod verin (ya da "Kod Ata" ile otomatik üretin). Kod olmadan bu
          ekranda okutma çalışmaz.
        </div>
      )}

      <input
        ref={kutuRef}
        value={kod}
        onChange={(e) => setKod(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); okut(kod); } }}
        onBlur={() => { if (kutuRef.current) setTimeout(() => kutuRef.current && kutuRef.current.focus(), 50); }}
        placeholder={personel ? "Üretim / parça barkodu — okutun ya da yazıp Enter" : "Kendi barkodunuzu okutun ya da yazıp Enter"}
        title="Barkod"
        style={{
          flex: 1, padding: "14px 16px", fontSize: 20, fontFamily: "monospace",
          borderRadius: "var(--erp-r-md)", border: "2px solid #C9A063", background: "var(--erp-panel)",
        }}
      />
      {/* ELLE GİRİŞ İÇİN AÇIK DÜĞME. Okuyucu Enter göndermiyorsa ya da kod elle yazılıyorsa
          tetikleyici burada; kendiliğinden okumaya gerek kalmıyor. */}
      <button
        type="button"
        className="btn-primary"
        style={{ padding: "0 18px", fontSize: 15 }}
        title="Kutudaki kodu okut"
        onClick={() => okut(kod)}
      >
        <ScanLine size={16} /> Okut
      </button>
      {personel && (
        <label style={{ display: "grid", gap: 2 }}>
          <span style={{ fontSize: 10, color: "var(--erp-border)" }}>Miktar (boş = tamamı)</span>
          <input
            type="number"
            min="0"
            value={miktar}
            onChange={(e) => setMiktar(e.target.value)}
            placeholder="tamamı"
            title="Alınacak miktar"
            style={{
              width: 120, padding: "12px 10px", fontSize: 18, textAlign: "center",
              borderRadius: "var(--erp-r-md)", border: "2px solid #C9A063", background: "var(--erp-panel)",
            }}
          />
        </label>
      )}
      </div>

      {/* SON İŞLEMLER — kalfanın tek geri bildirimi bu. Okuyucuyla çalışırken ekrana bakılmıyor
          bile; bakıldığında ne olduğunun tek satırda görünmesi gerekiyor. */}
      {gunluk.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {gunluk.slice(0, 4).map((g, i) => (
            <div key={i} style={{ fontSize: i === 0 ? 16 : 13, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? RENK[g.tur] : "var(--erp-border)", background: i === 0 ? "var(--erp-panel)" : "transparent", borderRadius: "var(--erp-r-md)", padding: i === 0 ? "8px 12px" : "2px 12px" }}>
              {g.metin}
            </div>
          ))}
        </div>
      )}

      {personel && (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <div style={{ background: "var(--erp-panel-2)", borderRadius: "var(--erp-r-md)", padding: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)", marginBottom: 6 }}>
              Alabileceğim işler ({alinabilirler.length})
            </div>
            {alinabilirler.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                {(personel.bagliProsesler || []).length === 0
                  ? "Cari kartınızda bağlı proses tanımlı değil."
                  : "Sıradaki işlerde size uygun iş yok."}
              </div>
            ) : alinabilirler.map(({ uretim: u, adim, kalan, parcaKod }) => {
              const adet = kalan.reduce((t, k) => t + k.miktar, 0);
              const urun = (stok || []).find((x) => x.id === u.urunId);
              return (
                <div key={`${u.id}|${adim.proses}|${parcaKod || ""}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid #E4D8C0", fontSize: 13 }}>
                  {/* Bölünmüş üretimde PARÇA kodu görünür; ana kod artık kapalı. */}
                  <span className="mono" style={{ fontWeight: 700 }}>{parcaKod || u.takipKodu}</span>
                  <span>{(urun && urun.ad) || u.model || ""} · {adim.proses}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontWeight: 700 }}>{adet} çift</span>
                </div>
              );
            })}
          </div>
          <div style={{ background: "var(--erp-panel-2)", borderRadius: "var(--erp-r-md)", padding: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)", marginBottom: 6 }}>
              Elimdeki işler ({elindekiler.length})
            </div>
            {elindekiler.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Teslim edilecek iş yok.</div>
            ) : elindekiler.map(({ uretim: u, adim, atama }) => {
              const adet = Object.values(atama.bedenMiktarlari || {}).reduce((t, m) => t + (m || 0), 0);
              return (
                <div key={atama.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid #E4D8C0", fontSize: 13 }}>
                  <span className="mono" style={{ fontWeight: 700 }}>{atama.barkod || u.takipKodu}</span>
                  <span>{adim.proses}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontWeight: 700 }}>{adet} çift</span>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ALTTA: BU OTURUMDA TESLİM EDİLENLER. Üstteki iki sütun "ne yapacağım", buradaki "ne
          yaptım". Kalfa gün sonunda ustaya bunu gösteriyor; ekrandan çıkmadan görülebilmeli. */}
      {personel && teslimEdilenler.length > 0 && (
        <div style={{ background: "var(--erp-primary)", borderRadius: "var(--erp-r-md)", padding: 10, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-panel-2)" }}>Bu oturumda teslim ettiklerim</span>
            <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginLeft: "auto" }}>
              {teslimEdilenler.reduce((t, x) => t + x.adet, 0)} çift · {teslimEdilenler.length} parça
            </span>
          </div>
          <div style={{ background: "var(--erp-panel-2)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
            {teslimEdilenler.map((x, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", fontSize: 12, borderTop: i ? "1px solid #E4D8C0" : "none" }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", minWidth: 44 }}>
                  {x.zaman.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="mono" style={{ fontWeight: 700 }}>{x.barkod}</span>
                <span>{x.urunAd}{x.renk ? ` · ${x.renk}` : ""}</span>
                <span style={{ color: "var(--erp-text-2)" }}>{x.proses}</span>
                <span className="mono" style={{ marginLeft: "auto", fontWeight: 700 }}>{x.adet} çift</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
