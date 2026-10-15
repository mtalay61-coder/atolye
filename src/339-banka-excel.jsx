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

function BankaExcelEkrani({ muhasebe, cariler, onCariliKaydet, onBankaHareketi, showToast }) {
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
      return { no: i, tarih, aciklama, tutar, ref, onceden: oncekiRefler.has(ref), oneriId: oneri ? oneri.id : "" };
    }).filter(Boolean);
  }, [ham, esleme, cariler, oncekiRefler]);

  const durum = (k) => {
    const s = secim[k.no] || {};
    return { sec: s.sec != null ? s.sec : !k.onceden, cariId: s.cariId != null ? s.cariId : k.oneriId };
  };
  const degistir = (no, alan, deger) => setSecim((o) => ({ ...o, [no]: { ...(o[no] || {}), [alan]: deger } }));
  const secilenler = kalemler.filter((k) => durum(k).sec);
  const toplamGiris = secilenler.filter((k) => k.tutar > 0).reduce((t, k) => t + k.tutar, 0);
  const toplamCikis = secilenler.filter((k) => k.tutar < 0).reduce((t, k) => t - k.tutar, 0);
  const pb = (banka && banka.paraBirimi) || "TRY";
  const para = (t) => `${t.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb}`;

  const kaydet = () => {
    if (!banka) { showToast("Önce banka hesabını seçin"); return; }
    if (secilenler.length === 0) { showToast("Aktarılacak satır seçilmedi"); return; }
    let cariSay = 0, bankaSay = 0;
    secilenler.forEach((k) => {
      const { cariId } = durum(k);
      const cari = cariId ? (cariler || []).find((c) => c.id === cariId) : null;
      const tutar = Math.abs(k.tutar);
      if (cari) {
        const islemTipi = k.tutar > 0 ? "Tahsilat" : "Ödeme";
        const kur = kasaCariHareketiKur({
          islemTipi, tarih: k.tarih, cariId: cari.id, cariUnvan: cari.unvan, cariTutar: tutar, cariPB: pb,
          hesapTur: "banka", hesapId: banka.id, hesapAd: banka.ad, hesapPB: pb, hesapTutar: tutar,
          defter, aciklama: k.aciklama, odemeSekli: "Havale/EFT",
        });
        onCariliKaydet({ cariId: cari.id, cariHareketi: { ...kur.cariHareketi, bankaRef: k.ref },
          muhasebe: { hesapTur: "banka", hesapId: banka.id, hareket: { ...kur.muhasebeHareketi, bankaRef: k.ref } } });
        cariSay++;
      } else {
        onBankaHareketi({ hesapTur: "banka", hesapId: banka.id, hareket: {
          id: uid("mhrk"), tarih: k.tarih, yon: k.tutar > 0 ? "Giriş" : "Çıkış", tutar, defter,
          aciklama: k.aciklama || "Banka hareketi (Excel)", bankaRef: k.ref, kullanici: islemKullanicisiAd(),
        } });
        bankaSay++;
      }
    });
    showToast(`${secilenler.length} satır aktarıldı — ${cariSay} cariye işlendi, ${bankaSay} yalnız bankaya`);
    setSecim({});
  };

  const kutu = { border: "1.5px solid var(--hrk-renk)", borderRadius: 10, padding: 12, background: "#fff", marginBottom: 12 };
  const aktifCariler = (cariler || []).filter((c) => !c.pasif);

  return (
    <div data-banka-excel="1" className="renkli-form" style={{ "--hrk-renk": "#2F6B4F" }}>
      <div style={{ ...kutu, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>Banka hesabı</span>
          <select data-banka-excel-hesap="1" value={bankaId} onChange={(e) => setBankaId(e.target.value)} style={{ minWidth: 220 }}>
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
            <button className="btn-primary" data-banka-excel-kaydet="1" style={{ marginLeft: "auto" }} onClick={kaydet} disabled={!banka}>
              Seçilenleri aktar
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ textAlign: "left", color: "var(--erp-text-2)", fontSize: 11 }}>
                <th style={{ padding: 4 }}><input type="checkbox" data-renk-koru="1" checked={secilenler.length === kalemler.length}
                  onChange={(e) => setSecim((o) => { const y = { ...o }; kalemler.forEach((k) => { y[k.no] = { ...(y[k.no] || {}), sec: e.target.checked }; }); return y; })} /></th>
                <th style={{ padding: 4 }}>Tarih</th><th style={{ padding: 4 }}>Açıklama</th><th style={{ padding: 4 }}>İşlem</th>
                <th style={{ padding: 4, textAlign: "right" }}>Tutar</th><th style={{ padding: 4, minWidth: 220 }}>Cari (boş = yalnız banka)</th>
              </tr></thead>
              <tbody>{kalemler.map((k) => {
                const d = durum(k);
                const tip = k.tutar > 0 ? "Tahsilat" : "Ödeme";
                return (
                  <tr key={k.no} data-banka-excel-satir={k.no} style={{ borderTop: "1px solid var(--erp-line-soft)", opacity: d.sec ? 1 : 0.5 }}>
                    <td style={{ padding: 4 }}><input type="checkbox" data-renk-koru="1" checked={d.sec} onChange={(e) => degistir(k.no, "sec", e.target.checked)} /></td>
                    <td style={{ padding: 4, whiteSpace: "nowrap" }}>{tarihYaz(k.tarih)}</td>
                    <td style={{ padding: 4 }}>{k.aciklama}{k.onceden && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--erp-warn)", fontWeight: 700 }}>daha önce aktarıldı</span>}</td>
                    <td style={{ padding: 4, color: d.cariId ? HAREKET_TIPI_RENK[tip] : "var(--erp-text-2)", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {d.cariId ? tip : (k.tutar > 0 ? "Banka girişi" : "Banka çıkışı")}
                    </td>
                    <td className="mono" style={{ padding: 4, textAlign: "right", whiteSpace: "nowrap", color: k.tutar > 0 ? HAREKET_TIPI_RENK["Tahsilat"] : HAREKET_TIPI_RENK["Ödeme"] }}>{para(k.tutar)}</td>
                    <td style={{ padding: 4 }}>
                      <CariSecici cariler={aktifCariler} deger={d.cariId || null} onDegis={(id) => degistir(k.no, "cariId", id || "")} kucuk placeholder="Cari seç…" />
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}
      {!ham && bankalar.length === 0 && <EmptyState text="Önce Kasa & Banka'da bir banka hesabı açın." />}
    </div>
  );
}
