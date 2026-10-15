// ================= ÖDEME & TAHSİLAT › BANKA EXCEL'İ (v1.671.0) =================
//
// Kullanıcı: "Excel'den banka hareketlerini gireceğimiz ekran yapalım."
//
// AKIŞ: banka hesabı seç → bankanın Excel/CSV ekstresini yükle → sütunlar kendiliğinden eşlenir (gerekirse elle
// değiştirilir) → her satır için cari önerilir (açıklamada ünvan / resmi ünvan / cari kodu geçiyorsa) → işaretli
// satırlar kaydedilir. Artı tutar Tahsilat (bankaya giriş), eksi tutar Ödeme (bankadan çıkış).
//
// KAYIT YOLU YENİ DEĞİL: carili satır `kasaCariHareketiKur` (207) ile kurulur ve Ödeme & Tahsilat ekranının
// kullandığı huniden (`siparisOdemesiKaydet` → addCariHareketFromStok + muhasebeyePesinIsle) geçer; her satır kendi
// fiş numarasını alır (THS-/ODM-). Carisiz satır (masraf, vergi, virman…) yalnız banka hareketi olur. Fişsiz cari
// hareketi oluşmaz; iki huni de güncelleyici fonksiyonla yazdığı için art arda çağrı güvenli.
//
// AYNI SATIR İKİ KEZ GİRMESİN: her satırın parmak izi (`bankaRef` = gün|tutar|açıklama) banka hareketine yazılır;
// aynı dosya tekrar yüklenirse o satırlar "daha önce aktarıldı" diye işaretsiz gelir. (Şema dışı alan → `ek`.)
//
// Dosya TARAYICIDA okunur (XLSX kütüphanesi), hiçbir yere gönderilmez.

const BANKA_EXCEL_ALANLAR = [
  ["tarih", "Tarih", /tarih|date|valör|valor/],
  ["aciklama", "Açıklama", /açıklama|aciklama|description|işlem|islem|detay/],
  ["tutar", "Tutar (±)", /^tutar|amount|işlem tutarı|islem tutari/],
  ["giris", "Giriş / Alacak", /alacak|giriş|giris|gelen|credit/],
  ["cikis", "Çıkış / Borç", /borç|borc|çıkış|cikis|giden|debit/],
];

// "1.234,56" / "-1,234.56" / 1234.56 / "1.234,56 TL" → sayı. Son ayraç ondalık sayılır.
function bankaSayiCoz(v) {
  if (typeof v === "number") return v;
  let s = String(v == null ? "" : v).replace(/[^\d.,\-+]/g, "");
  if (!s) return NaN;
  const sonV = s.lastIndexOf(","), sonN = s.lastIndexOf(".");
  if (sonV > sonN) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  return parseFloat(s);
}

// Date / Excel seri günü / "15.10.2026" / "2026-10-15" → "YYYY-MM-DD".
function bankaTarihCoz(v) {
  const iki = (n) => String(n).padStart(2, "0");
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${iki(v.getMonth() + 1)}-${iki(v.getDate())}`;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${iki(d.getUTCMonth() + 1)}-${iki(d.getUTCDate())}`;
  }
  const s = String(v || "").trim();
  let m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${iki(m[2])}-${iki(m[1])}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

// CSV (virgül, noktalı virgül ya da sekme; tırnaklı alan) → satır dizisi. Excel'in "CSV kaydet"i Türkçe ayarda ";"
// kullanıyor, bankaların bir kısmı ","; ayraç ilk satırlarda en çok geçenden seçilir.
function bankaCsvCoz(metin) {
  const ilk = metin.split(/\r?\n/).slice(0, 10).join("\n");
  const ayrac = [";", "\t", ","].map((a) => [a, ilk.split(a).length]).sort((x, y) => y[1] - x[1])[0][0];
  const satirlar = []; let satir = [], alan = "", tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"' && metin[i + 1] === '"') { alan += '"'; i++; }
      else if (c === '"') tirnak = false;
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ayrac) { satir.push(alan); alan = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && metin[i + 1] === "\n") i++;
      satir.push(alan); satirlar.push(satir); satir = []; alan = "";
    } else alan += c;
  }
  if (alan !== "" || satir.length) { satir.push(alan); satirlar.push(satir); }
  return satirlar;
}

function bankaNorm(s) {
  return String(s || "").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü ]/g, " ").replace(/\s+/g, " ").trim();
}

// Açıklamada cari adı geçiyor mu? En uzun eşleşen kazanır ("Fatih" ile "Fatih Ticaret" ikisi de geçerse ikincisi).
// Eşik: en az 4 harflik ad; ünvanın ilk iki kelimesi de denenir (bankalar ünvanı kısaltıyor: "FATIH TIC AS").
function bankaCariOner(aciklama, cariler) {
  const a = ` ${bankaNorm(aciklama)} `;
  let en = null, enUzun = 0;
  (cariler || []).forEach((c) => {
    if (c.pasif) return;
    const adaylar = [c.unvan, c.resmiUnvan, c.kod];
    [c.unvan, c.resmiUnvan].forEach((u) => { const k = bankaNorm(u).split(" "); if (k.length > 2) adaylar.push(k.slice(0, 2).join(" ")); });
    adaylar.forEach((x) => {
      const n = bankaNorm(x);
      if (n.length >= 4 && a.includes(` ${n} `) && n.length > enUzun) { en = c; enUzun = n.length; }
    });
  });
  return en;
}

function BankaExcelEkrani({ muhasebe, cariler, giderKartlari, onCariliKaydet, onBankaHareketi, showToast }) {
  const bankalar = (muhasebe && muhasebe.bankalar) || [];
  const [bankaId, setBankaId] = useState(bankalar.length === 1 ? bankalar[0].id : "");
  const [defter, setDefter] = useState("Genel");
  const [ham, setHam] = useState(null);        // { dosya, satirlar: [[...]], baslikSatiri }
  const [esleme, setEsleme] = useState({});
  const [secim, setSecim] = useState({});      // satır no → { sec, cariId }
  const banka = bankalar.find((b) => b.id === bankaId) || null;
  // Tek banka hesabı varsa kendiliğinden seçili (muhasebe verisi ekran açıldıktan sonra da gelebilir).
  useEffect(() => { if (!bankaId && bankalar.length === 1) setBankaId(bankalar[0].id); }, [bankaId, bankalar]);

  const oncekiRefler = React.useMemo(() => new Set(((banka && banka.hareketler) || []).map((h) => h.bankaRef).filter(Boolean)), [banka]);

  const dosyaOku = (dosya) => {
    if (!dosya) return;
    const okuyucu = new FileReader();
    okuyucu.onload = (e) => {
      try {
        let satirlar;
        if (/\.csv$|\.txt$/i.test(dosya.name)) {
          // UTF-8 değilse (eski Excel CSV'si Windows-1254) Türkçe harfler bozulur; önce UTF-8, "�" çıkarsa 1254.
          let metin = new TextDecoder("utf-8").decode(e.target.result);
          if (metin.includes("\uFFFD")) metin = new TextDecoder("windows-1254").decode(e.target.result);
          satirlar = bankaCsvCoz(metin.replace(/^\uFEFF/, ""));
        } else {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array", cellDates: true });
          satirlar = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
        }
        // BAŞLIK SATIRI: bankalar ekstrenin üstüne hesap bilgisi yazıyor; "tarih" ve tutar/borç/alacak geçen ilk satır.
        let bi = satirlar.findIndex((r) => {
          const t = r.map((x) => bankaNorm(x)).join(" | ");
          return /tarih/.test(t) && /(tutar|borç|borc|alacak|amount)/.test(t);
        });
        if (bi < 0) bi = 0;
        const basliklar = (satirlar[bi] || []).map((x) => String(x || "").trim());
        const yeni = {};
        BANKA_EXCEL_ALANLAR.forEach(([k, , re]) => {
          const i = basliklar.findIndex((b, j) => re.test(bankaNorm(b)) && !Object.values(yeni).includes(j));
          if (i >= 0) yeni[k] = i;
        });
        // "Tutar" bulunduysa giriş/çıkış ayrı sütunları kullanılmaz (bazı bankalar ikisini de veriyor: tutar + bakiye).
        if (yeni.tutar != null) { delete yeni.giris; delete yeni.cikis; }
        setHam({ dosya: dosya.name, satirlar, bi, basliklar });
        setEsleme(yeni);
        setSecim({});
      } catch (err) {
        showToast(`Dosya okunamadı: ${err.message || err}`);
      }
    };
    okuyucu.readAsArrayBuffer(dosya);
  };

  const kalemler = React.useMemo(() => {
    if (!ham) return [];
    const al = (r, k) => (esleme[k] != null ? r[esleme[k]] : "");
    return ham.satirlar.slice(ham.bi + 1).map((r, i) => {
      const tarih = bankaTarihCoz(al(r, "tarih"));
      const aciklama = String(al(r, "aciklama") || "").trim();
      let tutar = NaN;
      if (esleme.tutar != null) tutar = bankaSayiCoz(al(r, "tutar"));
      else {
        const g = bankaSayiCoz(al(r, "giris")), c = bankaSayiCoz(al(r, "cikis"));
        tutar = (isNaN(g) ? 0 : Math.abs(g)) - (isNaN(c) ? 0 : Math.abs(c));
      }
      if (!tarih || !(Math.abs(tutar) > 0.004)) return null;
      tutar = Math.round(tutar * 100) / 100;
      const ref = `${tarih}|${tutar}|${bankaNorm(aciklama)}`;
      const oneri = bankaCariOner(aciklama, cariler);
      return { no: i, tarih, aciklama, tutar, ref, onceden: oncekiRefler.has(ref), oneriId: oneri ? oneri.id : "",
        kilitli: donemKilitliMi(tarih) };
    }).filter(Boolean);
  }, [ham, esleme, cariler, oncekiRefler]);

  // BANKA MUTABAKATI (v1.672.0). Ekstre satırı sistemdeki banka hareketleriyle eşleştirilir:
  //   1) aynı parmak izi (`bankaRef`) → "daha önce aktarıldı";
  //   2) elle girilmiş hareket: aynı yön, aynı tutar, tarih ±3 gün → "sistemde var" (işaretsiz gelir, iki kez girilmez).
  // Bir hareket yalnız BİR satırla eşleşir (aynı gün iki eşit havale ayrı ayrı sayılsın). Ekstrenin tarih aralığında
  // sistemde olup ekstrede karşılığı olmayan hareketler ayrıca listelenir — yanlış/eksik girişi bulmak için.
  const mutabakat = React.useMemo(() => {
    const hareketler = ((banka && banka.hareketler) || []).filter((h) => h && h.tarih);
    const kullanilan = new Set();
    const eslesme = {};
    kalemler.forEach((k) => {
      const ayniRef = hareketler.find((h) => h.bankaRef === k.ref && !kullanilan.has(h.id));
      if (ayniRef) { kullanilan.add(ayniRef.id); return; }
      const yon = k.tutar > 0 ? "Giriş" : "Çıkış";
      const gunFark = (a, b) => Math.abs((new Date(`${a}T00:00:00`) - new Date(`${String(b).slice(0, 10)}T00:00:00`)) / 86400000);
      const aday = hareketler.filter((h) => !kullanilan.has(h.id) && !h.bankaRef && h.yon === yon
        && Math.abs((Number(h.tutar) || 0) - Math.abs(k.tutar)) < 0.01 && gunFark(k.tarih, h.tarih) <= 3)
        .sort((a, b) => gunFark(k.tarih, a.tarih) - gunFark(k.tarih, b.tarih))[0];
      if (aday) { kullanilan.add(aday.id); eslesme[k.no] = aday; }
    });
    const tarihler = kalemler.map((k) => k.tarih).sort();
    const eksikler = tarihler.length === 0 ? [] : hareketler.filter((h) => {
      const t = String(h.tarih).slice(0, 10);
      return t >= tarihler[0] && t <= tarihler[tarihler.length - 1] && !kullanilan.has(h.id);
    });
    return { eslesme, eksikler };
  }, [kalemler, banka]);

  const bankaPB = (banka && banka.paraBirimi) || "TRY";
  const kurlar = (muhasebe && muhasebe.kurlar) || {};
  const durum = (k) => {
    const s = secim[k.no] || {};
    // KİLİTLİ SATIR (v1.674.0): daha önce aktarılmış ya da kapalı dönemdeki satır hiçbir yoldan (tümünü seç dahil)
    // seçilemez — "tümünü seç" önceden aktarılanları da işaretliyordu, ikinci aktarım aynı hareketleri iki kez yazardı.
    const kilit = k.kilitli || k.onceden;
    const varsayilan = !kilit && !mutabakat.eslesme[k.no];
    // ÖNERİ KENDİLİĞİNDEN SEÇİLMEZ (v1.674.0 — kullanıcı: "boş seçilen cari New Diamond carisine aktardı"). Banka
    // açıklamasında ALICI olarak firmanın kendi adı geçiyordu ("… - NEW DİAMOND"), öneri onu cari sanıp kutuyu
    // doldurmuştu. Artık öneri yalnız tıklanırsa uygulanır; karşı taraf her satırda kullanıcının seçimi.
    const cariId = s.cariId || "";
    // P. TİPİ + KUR (v1.674.1 — kullanıcı: "P. tipi değiştirme de olsun, kur girmeli; sistemde var olan"). Cariye
    // işlenecek para birimi varsayılan carinin kendi birimi; banka biriminden farklıysa kur "1 cari PB = ? banka PB",
    // sistemdeki kurla (muhasebe.kurlar, üst şerit) dolu gelir, satırda değiştirilebilir. Cari tutarı = banka tutarı ÷ kur.
    const cariK = cariId ? (cariler || []).find((c) => c.id === cariId) : null;
    const cariPB = s.cariPB || (cariK && cariK.paraBirimi) || bankaPB;
    const oneriKur = cariPB === bankaPB ? 1 : paraCevirGenel(1, cariPB, bankaPB, kurlar);
    const kur = cariPB === bankaPB ? 1 : (parseFloat(String(s.kur || "").replace(",", ".")) || oneriKur || 0);
    return { sec: kilit ? false : (s.sec != null ? s.sec : varsayilan), cariId, kartId: s.kartId || "", kilit, cariPB, kur, oneriKur };
  };
  const degistir = (no, alan, deger) => setSecim((o) => ({ ...o, [no]: { ...(o[no] || {}), [alan]: deger } }));
  const secilenler = kalemler.filter((k) => durum(k).sec);
  const toplamGiris = secilenler.filter((k) => k.tutar > 0).reduce((t, k) => t + k.tutar, 0);
  const toplamCikis = secilenler.filter((k) => k.tutar < 0).reduce((t, k) => t - k.tutar, 0);
  const pb = bankaPB;
  const para = (t) => `${t.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`;

  // KARŞI TARAF ZORUNLU (v1.674.0 — kullanıcı: "cari boş seçilmesin, gelir veya gider kartlarımız listelensin,
  // mutlaka birini seçelim; boş ödeme olmaz"). Kasa & Banka'nın elle girişindeki kuralla aynı (210, 17 Eylül).
  const karsiliksiz = secilenler.filter((k) => { const d = durum(k); return !d.cariId && !d.kartId; });
  const kaydet = () => {
    if (!banka) { showToast("Önce banka hesabını seçin"); return; }
    if (secilenler.length === 0) { showToast("Aktarılacak satır seçilmedi"); return; }
    const kursuz = secilenler.filter((k) => { const d = durum(k); return d.cariId && d.cariPB !== bankaPB && !(d.kur > 0); });
    if (kursuz.length > 0) { showToast(`${kursuz.length} satırda kur yok — ${kursuz.map((k) => durum(k).cariPB).join(", ")} kurunu girin`); return; }
    if (karsiliksiz.length > 0) { showToast(`${karsiliksiz.length} seçili satırda karşı taraf yok — cari ya da gelir/gider kartı seçin`); return; }
    let cariSay = 0, bankaSay = 0;
    secilenler.forEach((k) => {
      const { cariId, kartId, cariPB, kur: satirKur } = durum(k);
      const kart = kartId ? (giderKartlari || []).find((x) => x.id === kartId) : null;
      const cari = cariId ? (cariler || []).find((c) => c.id === cariId) : null;
      const tutar = Math.abs(k.tutar);
      if (cari) {
        const islemTipi = k.tutar > 0 ? "Tahsilat" : "Ödeme";
        const kur = kasaCariHareketiKur({
          islemTipi, tarih: k.tarih, cariId: cari.id, cariUnvan: cari.unvan,
          cariTutar: cariPB === pb ? tutar : stokYuvarla(tutar / satirKur), cariPB, kur: cariPB === pb ? undefined : satirKur,
          hesapTur: "banka", hesapId: banka.id, hesapAd: banka.ad, hesapPB: pb, hesapTutar: tutar,
          defter, aciklama: k.aciklama, odemeSekli: "Havale/EFT",
        });
        onCariliKaydet({ cariId: cari.id, cariHareketi: { ...kur.cariHareketi, bankaRef: k.ref },
          muhasebe: { hesapTur: "banka", hesapId: banka.id, hareket: { ...kur.muhasebeHareketi, bankaRef: k.ref } } });
        cariSay++;
      } else {
        onBankaHareketi({ hesapTur: "banka", hesapId: banka.id, hareket: {
          id: uid("mhrk"), tarih: k.tarih, yon: k.tutar > 0 ? "Giriş" : "Çıkış", tutar, defter,
          giderKartId: kart ? kart.id : null, giderKartAd: kart ? kart.ad : null, giderGrubu: kart ? (kart.grup || null) : null,
          aciklama: `${kart ? kart.ad : "Banka hareketi"}${k.aciklama ? ` · ${k.aciklama}` : ""}`, bankaRef: k.ref, kullanici: islemKullanicisiAd(),
        } });
        bankaSay++;
      }
    });
    showToast(`${secilenler.length} satır aktarıldı — ${cariSay} cariye, ${bankaSay} gelir/gider kartına işlendi`);
    setSecim({});
  };

  const kutu = { border: "1.5px solid var(--hrk-renk)", borderRadius: 10, padding: 12, background: "#fff", marginBottom: 12 };
  const aktifCariler = (cariler || []).filter((c) => !c.pasif);

  return (
    <div data-banka-excel="1" className="renkli-form" style={{ "--hrk-renk": "#2F6B4F" }}>
      <div style={{ ...kutu, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>Banka hesabı</span>
          <select data-banka-excel-hesap="1" data-renk-koru="1" value={bankaId} onChange={(e) => setBankaId(e.target.value)}
            style={{ minWidth: 220, border: `2px solid ${banka ? "var(--hrk-renk)" : "var(--erp-danger, #B3261E)"}`, borderRadius: 6, padding: "4px 6px" }}>
            <option value="">— seçin —</option>
            {bankalar.map((b) => <option key={b.id} value={b.id}>{b.ad} · {b.paraBirimi || "TRY"}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>Defter</span>
          <select value={defter} onChange={(e) => setDefter(e.target.value)}>
            {["Genel", "Resmi", "Muhasebe"].map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>Ekstre dosyası (Excel / CSV)</span>
          <input data-banka-excel-dosya="1" type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => { dosyaOku(e.target.files && e.target.files[0]); e.target.value = ""; }} />
        </label>
        {ham && <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{ham.dosya} · {kalemler.length} hareket</span>}
      </div>

      {ham && (
        <div style={{ ...kutu, display: "flex", gap: 10, flexWrap: "wrap" }} data-banka-excel-esleme="1">
          <b style={{ width: "100%", fontSize: 12 }}>Sütun eşleme</b>
          {BANKA_EXCEL_ALANLAR.map(([k, ad]) => (
            <label key={k} style={{ display: "grid", gap: 2 }}>
              <span style={{ fontSize: 11 }}>{ad}</span>
              <select data-renk-koru="1" value={esleme[k] != null ? esleme[k] : ""} onChange={(e) => setEsleme((o) => {
                const y = { ...o }; if (e.target.value === "") delete y[k]; else y[k] = Number(e.target.value); return y; })}>
                <option value="">—</option>
                {ham.basliklar.map((b, i) => <option key={i} value={i}>{b || `Sütun ${i + 1}`}</option>)}
              </select>
            </label>
          ))}
          <span style={{ fontSize: 11, color: "var(--erp-text-2)", alignSelf: "center" }}>
            Tek "Tutar" sütunu varsa artı = giriş, eksi = çıkış; yoksa Giriş ve Çıkış sütunlarını seçin.
          </span>
        </div>
      )}

      {kalemler.length > 0 && (
        <div style={kutu}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <b>{secilenler.length} / {kalemler.length} satır seçili</b>
            <span style={{ color: HAREKET_TIPI_RENK["Tahsilat"] }}>Giriş {para(toplamGiris)}</span>
            <span style={{ color: HAREKET_TIPI_RENK["Ödeme"] }}>Çıkış {para(toplamCikis)}</span>
            {/* BANKA SEÇİLMEDEN DÜĞME PASİFTİ, sebebi yazmıyordu (kullanıcı, v1.673.1: "seçilenleri aktar neden aktif
                olmuyor?"). Birden çok banka hesabı varsa kendiliğinden seçilmez; düğme sebebi söyler, üstteki seçici kırmızı. */}
            {banka && karsiliksiz.length > 0 && <span data-banka-excel-karsiliksiz="1" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--erp-danger, #B3261E)" }}>{karsiliksiz.length} satırda karşı taraf seçilmedi</span>}
            {!banka && <span data-banka-excel-banka-yok="1" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--erp-danger, #B3261E)" }}>↑ Önce yukarıdan banka hesabını seçin</span>}
            <button className="btn-primary" data-banka-excel-kaydet="1" style={{ marginLeft: banka && !karsiliksiz.length ? "auto" : 0 }} onClick={kaydet} disabled={!banka || secilenler.length === 0 || karsiliksiz.length > 0}>
              Seçilenleri aktar ({secilenler.length})
            </button>
          </div>
          {/* LİSTE KENDİ İÇİNDE KAYAR (v1.673.1 — kullanıcı: "banka hareketleri aşağı kaysın, ekran aşağı inmesin"):
              özet satırı ve Aktar düğmesi hep görünür, başlık satırı yapışkan. */}
          <div data-banka-excel-liste="1" style={{ overflow: "auto", maxHeight: "60vh", border: "1px solid var(--erp-line-soft)", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1, boxShadow: "0 1px 0 var(--erp-line)" }}><tr style={{ textAlign: "left", color: "var(--erp-text-2)", fontSize: 11 }}>
                <th style={{ padding: 4 }}><input type="checkbox" data-renk-koru="1" checked={secilenler.length > 0 && secilenler.length === kalemler.filter((k) => !durum(k).kilit).length}
                  onChange={(e) => setSecim((o) => { const y = { ...o }; kalemler.forEach((k) => { if (!durum(k).kilit) y[k.no] = { ...(y[k.no] || {}), sec: e.target.checked }; }); return y; })} /></th>
                <th style={{ padding: 4 }}>Tarih</th><th style={{ padding: 4 }}>Açıklama</th><th style={{ padding: 4 }}>İşlem</th>
                <th style={{ padding: 4, textAlign: "right" }}>Tutar</th><th style={{ padding: 4, minWidth: 220 }}>Karşı taraf: cari ya da gelir/gider kartı</th>
              </tr></thead>
              <tbody>{kalemler.map((k) => {
                const d = durum(k);
                const tip = k.tutar > 0 ? "Tahsilat" : "Ödeme";
                return (
                  <tr key={k.no} data-banka-excel-satir={k.no} style={{ borderTop: "1px solid var(--erp-line-soft)", opacity: d.sec ? 1 : 0.5 }}>
                    <td style={{ padding: 4 }}><input type="checkbox" data-renk-koru="1" checked={d.sec} disabled={d.kilit} onChange={(e) => degistir(k.no, "sec", e.target.checked)} /></td>
                    <td style={{ padding: 4, whiteSpace: "nowrap" }}>{tarihYaz(k.tarih)}</td>
                    <td style={{ padding: 4 }}>{k.aciklama}{k.onceden && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--erp-warn)", fontWeight: 700 }}>daha önce aktarıldı</span>}
                      {mutabakat.eslesme[k.no] && <span data-banka-excel-sistemde="1" title={mutabakat.eslesme[k.no].aciklama || ""} style={{ marginLeft: 6, fontSize: 10, color: "var(--erp-info)", fontWeight: 700 }}>
                        sistemde var ({tarihYaz(mutabakat.eslesme[k.no].tarih)}{mutabakat.eslesme[k.no].aciklama ? ` · ${String(mutabakat.eslesme[k.no].aciklama).slice(0, 40)}` : ""})</span>}
                      {k.kilitli && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--erp-danger, #B3261E)", fontWeight: 700 }}>kapalı dönem</span>}</td>
                    <td style={{ padding: 4, color: d.cariId ? HAREKET_TIPI_RENK[tip] : "var(--erp-text-2)", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {d.cariId ? tip : d.kartId ? (k.tutar > 0 ? "Gelir" : "Gider") : <span style={{ color: d.sec ? "var(--erp-danger, #B3261E)" : undefined }}>seçilmedi</span>}
                    </td>
                    <td className="mono" style={{ padding: 4, textAlign: "right", whiteSpace: "nowrap", color: k.tutar > 0 ? HAREKET_TIPI_RENK["Tahsilat"] : HAREKET_TIPI_RENK["Ödeme"] }}>{para(k.tutar)}</td>
                    <td style={{ padding: 4 }}>
                      <div style={{ display: "grid", gap: 3, outline: d.sec && !d.cariId && !d.kartId ? "2px solid var(--erp-danger, #B3261E)" : "none", borderRadius: 6 }}>
                        <CariSecici cariler={aktifCariler} deger={d.cariId || null} onDegis={(id) => setSecim((o) => ({ ...o, [k.no]: { ...(o[k.no] || {}), cariId: id || "", kartId: id ? "" : (o[k.no] || {}).kartId } }))} kucuk placeholder="Cari seç…" />
                        {d.cariId && (
                          <div data-banka-excel-pb={k.no} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11, flexWrap: "wrap" }}>
                            <span>P. tipi</span>
                            <select data-renk-koru="1" value={d.cariPB} style={{ fontSize: 11, padding: "2px 4px" }}
                              onChange={(e) => setSecim((o) => ({ ...o, [k.no]: { ...(o[k.no] || {}), cariPB: e.target.value, kur: "" } }))}>
                              {MUHASEBE_PARA_BIRIMLERI.map((p2) => <option key={p2} value={p2}>{p2}</option>)}
                            </select>
                            {d.cariPB !== bankaPB && (<>
                              <span>kur 1 {d.cariPB} =</span>
                              <input data-renk-koru="1" data-banka-excel-kur={k.no} inputMode="decimal" style={{ width: 64, fontSize: 11, padding: "2px 4px" }}
                                value={(secim[k.no] || {}).kur != null && (secim[k.no] || {}).kur !== "" ? secim[k.no].kur : (d.oneriKur ? String(stokYuvarla(d.oneriKur)) : "")}
                                onChange={(e) => setSecim((o) => ({ ...o, [k.no]: { ...(o[k.no] || {}), kur: e.target.value } }))} />
                              <span>{bankaPB}</span>
                              <b className="mono">→ {d.kur > 0 ? `${stokYuvarla(Math.abs(k.tutar) / d.kur).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[d.cariPB] || d.cariPB}` : "kur yok"}</b>
                            </>)}
                          </div>
                        )}
                        {k.oneriId && !d.cariId && !d.kartId && (() => { const oc = (cariler || []).find((c) => c.id === k.oneriId); return oc && (
                          <button type="button" className="btn-ghost" data-banka-excel-oneri={k.no} style={{ fontSize: 11, padding: "1px 6px", justifySelf: "start" }}
                            onClick={() => setSecim((o) => ({ ...o, [k.no]: { ...(o[k.no] || {}), cariId: oc.id, kartId: "" } }))}>öneri: {oc.unvan} — seç</button>); })()}
                        {(giderKartlari || []).length > 0 && (
                          <select data-renk-koru="1" data-banka-excel-kart={k.no} value={d.kartId} style={{ fontSize: 12, padding: "3px 6px" }}
                            onChange={(e) => setSecim((o) => ({ ...o, [k.no]: { ...(o[k.no] || {}), kartId: e.target.value, cariId: e.target.value ? "" : (o[k.no] || {}).cariId } }))}>
                            <option value="">— ya da gelir/gider kartı —</option>
                            {giderKartlari.map((g) => <option key={g.id} value={g.id}>{g.ad}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}
      {kalemler.length > 0 && banka && (
        <div style={kutu} data-banka-excel-eksik="1">
          <b style={{ fontSize: 12 }}>Mutabakat</b>
          <div style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "4px 0 8px" }}>
            Ekstrede {kalemler.length} satır · {kalemler.filter((k) => k.onceden).length} daha önce aktarılmış · {Object.keys(mutabakat.eslesme).length} sistemde elle girilmiş ·{" "}
            {kalemler.filter((k) => !k.onceden && !mutabakat.eslesme[k.no]).length} yeni
          </div>
          {mutabakat.eksikler.length === 0
            ? <div style={{ fontSize: 12, color: "var(--erp-primary)" }}>Bu tarih aralığında sistemdeki bütün banka hareketlerinin ekstrede karşılığı var.</div>
            : (<>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-danger, #B3261E)", marginBottom: 4 }}>
                Sistemde olup ekstrede olmayan {mutabakat.eksikler.length} hareket (yanlış tutar/tarih ya da bankaya hiç geçmemiş olabilir):
              </div>
              {mutabakat.eksikler.map((h) => (
                <div key={h.id} data-banka-excel-eksik-satir="1" style={{ display: "flex", gap: 10, fontSize: 12, padding: "2px 0" }}>
                  <span>{tarihYaz(h.tarih)}</span>
                  <span className="mono" style={{ color: h.yon === "Giriş" ? HAREKET_TIPI_RENK["Tahsilat"] : HAREKET_TIPI_RENK["Ödeme"] }}>{h.yon === "Giriş" ? "+" : "−"}{para(Number(h.tutar) || 0)}</span>
                  <span style={{ color: "var(--erp-text-2)" }}>{h.aciklama}</span>
                </div>
              ))}
            </>)}
        </div>
      )}
      {!ham && bankalar.length === 0 && <EmptyState text="Önce Kasa & Banka'da bir banka hesabı açın." />}
    </div>
  );
}
