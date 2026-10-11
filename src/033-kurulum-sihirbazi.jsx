// =============================================================================================
// KURULUM SİHİRBAZI (v1.644.0 — pazarlama yol haritasının 2. adımı; kullanıcı: "Kurulum sihirbazına geç")
//
// Yeni firma ilk açtığında boş bir Tanımlar ekranıyla karşılaşıyordu: renk, beden, proses tanımlanmadan ürün kartı
// açılamıyor, ama hangisinin önce gerektiğini söyleyen yoktu. Sihirbaz beş adımda en gerekli tanımları kurar:
//   1. Firma bilgileri (unvan zorunlu — fişlerde, çıktılarda görünüyor)
//   2. Ölçüler (beden şablonu: kadın/erkek/çocuk ayakkabı, giyim ya da bedensiz + elle ek)
//   3. Renkler (sık kullanılanlardan seçme + elle ek)
//   4. Prosesler (ayakkabı / giyim şablonu + elle ek)
//   5. KDV açık mı + özet
//
// NE ZAMAN AÇILIR (`kurulumSihirbaziGerekli`): firma GERÇEKTEN BOŞ (ürün, cari, renk, proses yok) VE kurulum daha önce
// bitirilmemiş/atlanmamış (`tanimlar.kurulumTamamlandi`) VE kişi Yönetici (giriş sistemi kapalıysa herkes). Veri taşıyan
// bir firmada (ana firma dâhil) hiç görünmez — mevcut kurulumu ezme ihtimali yok.
// YAZMA: tek `saveTanimlar` — tanımların kendi yazma yolu (bulut + fark belleği + bekleyen defter); sihirbaz ayrı bir
// yazıcı değil. Uygulama MEVCUDA EKLER (aynı adlı renk/ölçü/proses ikinci kez açılmaz), hiçbir şeyi silmez.
// =============================================================================================
const KURULUM_OLCU_SABLONLARI = [
  { id: "kadin", ad: "Kadın ayakkabı (35–41)", olculer: ["35", "36", "37", "38", "39", "40", "41"] },
  { id: "erkek", ad: "Erkek ayakkabı (39–46)", olculer: ["39", "40", "41", "42", "43", "44", "45", "46"] },
  { id: "genis", ad: "Kadın + erkek (35–46)", olculer: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"] },
  { id: "cocuk", ad: "Çocuk ayakkabı (26–35)", olculer: ["26", "27", "28", "29", "30", "31", "32", "33", "34", "35"] },
  { id: "giyim", ad: "Giyim (XS–XXL)", olculer: ["XS", "S", "M", "L", "XL", "XXL"] },
  { id: "yok", ad: "Bedensiz ürünler", olculer: [] },
];
const KURULUM_RENK_ONERILERI = [
  { ad: "Siyah", kod: "#1F1F1F" }, { ad: "Beyaz", kod: "#F5F5F2" }, { ad: "Kahve", kod: "#6B4A2E" }, { ad: "Taba", kod: "#A8642E" },
  { ad: "Lacivert", kod: "#1F2A44" }, { ad: "Gri", kod: "#8A8A8A" }, { ad: "Bej", kod: "#D8C3A0" }, { ad: "Bordo", kod: "#6E1F2A" },
  { ad: "Haki", kod: "#6B6B3A" }, { ad: "Kırmızı", kod: "#B3261E" }, { ad: "Krem", kod: "#EFE6D2" }, { ad: "Vizon", kod: "#9C8B7A" },
];
const KURULUM_PROSES_SABLONLARI = [
  { id: "ayakkabi", ad: "Ayakkabı", prosesler: ["Kesim", "Saya", "Montaj", "Taban", "Paketleme"] },
  { id: "giyim", ad: "Giyim", prosesler: ["Kesim", "Dikim", "Ütü", "Paketleme"] },
  { id: "yok", ad: "Şimdilik yok", prosesler: [] },
];

function kurulumSihirbaziGerekli({ tanimlar, stok, cariler, aktifKullanici, girisAktif }) {
  const t = tanimlar || {};
  if (t.kurulumTamamlandi) return false;
  if ((stok || []).length || (cariler || []).length) return false;
  if ((t.renkler || []).length || (t.prosesler || []).length) return false;
  if (girisAktif && !(aktifKullanici && aktifKullanici.rol === "Yönetici")) return false;
  return true;
}

// Virgül/satır ile ayrılmış elle girişi listeye çevirir ("38, 39 ,40" → ["38","39","40"]).
function kurulumListesi(metin) {
  return String(metin || "").split(/[,\n;]/).map((x) => x.trim()).filter(Boolean);
}
const kurulumAyniAd = (a, b) => String(a || "").toLocaleLowerCase("tr-TR") === String(b || "").toLocaleLowerCase("tr-TR");

// SAF: seçimleri tanımlara EKLER. secim = { firma: {...}, olculer: [ad], renkler: [{ad, kod}], prosesler: [ad], kdvAktif }.
// `yeniKimlik` testte sabit kimlik vermek için.
function kurulumTanimlariniUygula(tanimlar, secim, yeniKimlik = uid) {
  const t = { ...(tanimlar || {}) };
  const firma = (secim && secim.firma) || {};
  const fb = { ...(t.firmaBilgileri || {}) };
  for (const alan of ["unvan", "telefon", "adres", "email", "vergiNo", "vergiDairesi"]) {
    const d = String(firma[alan] || "").trim();
    if (d) fb[alan] = d;
  }
  if (secim && typeof secim.kdvAktif === "boolean") fb.kdvAktif = secim.kdvAktif;
  t.firmaBilgileri = fb;

  const bedenler = [...(t.bedenler || [])];
  for (const ad of (secim && secim.olculer) || []) {
    if (!bedenler.some((b) => kurulumAyniAd(b.ad, ad) && (b.tip || "Beden") === "Beden")) bedenler.push({ id: yeniKimlik("olcu"), ad, tip: "Beden" });
  }
  t.bedenler = bedenler;

  // Renk kodu: Tanımlar'daki `sonrakiRenkKodu` kuralı (renk + model rengi kodları tek havuz, 101'den).
  const renkler = [...(t.renkler || [])];
  const kullanilan = new Set([...renkler.map((r) => parseInt(r.kod, 10)), ...(t.renkKombinasyonlari || []).map((k) => parseInt(k.kod, 10))].filter((n) => !isNaN(n)));
  const renkKodlari = renkler.map((r) => parseInt(r.kod, 10)).filter((n) => !isNaN(n));
  let sonraki = (renkKodlari.length ? Math.max(...renkKodlari) : 100) + 1;
  for (const r of (secim && secim.renkler) || []) {
    if (renkler.some((x) => kurulumAyniAd(x.ad, r.ad))) continue;
    while (kullanilan.has(sonraki)) sonraki += 1;
    renkler.push({ id: yeniKimlik("renk"), ad: r.ad, tip: "Hammadde", renkKodu: r.kod || "#C9B99A", kod: String(sonraki) });
    kullanilan.add(sonraki); sonraki += 1;
  }
  t.renkler = renkler;

  // Proses: Tanımlar'daki `addProses` kuralı — sıra artar, her proses ayrı binlik barkod aralığı.
  const prosesler = [...(t.prosesler || [])];
  let sira = prosesler.reduce((m, p) => Math.max(m, p.sira ?? 0), -1);
  const baslangiclar = new Set(prosesler.map((p) => p.baslangicNo ?? 1000));
  for (const ad of (secim && secim.prosesler) || []) {
    if (prosesler.some((p) => kurulumAyniAd(p.ad, ad))) continue;
    let aday = 1000;
    while (baslangiclar.has(aday)) aday += 1000;
    baslangiclar.add(aday); sira += 1;
    prosesler.push({ id: yeniKimlik("proses"), ad, sira, baslangicNo: aday });
  }
  t.prosesler = prosesler;
  t.kurulumTamamlandi = true;
  return t;
}

function KurulumSihirbazi({ tanimlar, onKaydet }) {
  const fb0 = (tanimlar && tanimlar.firmaBilgileri) || {};
  const [adim, setAdim] = useState(0);
  const [firma, setFirma] = useState({ unvan: fb0.unvan || "", telefon: fb0.telefon || "", adres: fb0.adres || "", email: fb0.email || "", vergiNo: fb0.vergiNo || "", vergiDairesi: fb0.vergiDairesi || "" });
  const [olcuSablonu, setOlcuSablonu] = useState("kadin");
  const [olcuEk, setOlcuEk] = useState("");
  const [renkSecili, setRenkSecili] = useState(() => new Set(["Siyah", "Beyaz", "Kahve", "Taba"]));
  const [renkEk, setRenkEk] = useState("");
  const [prosesSablonu, setProsesSablonu] = useState("ayakkabi");
  const [prosesEk, setProsesEk] = useState("");
  const [kdvAktif, setKdvAktif] = useState(!!fb0.kdvAktif);

  const olculer = [...((KURULUM_OLCU_SABLONLARI.find((s) => s.id === olcuSablonu) || {}).olculer || []), ...kurulumListesi(olcuEk)]
    .filter((ad, i, l) => l.findIndex((x) => kurulumAyniAd(x, ad)) === i);
  const renkler = [
    ...KURULUM_RENK_ONERILERI.filter((r) => renkSecili.has(r.ad)),
    ...kurulumListesi(renkEk).map((ad) => ({ ad, kod: "#C9B99A" })),
  ].filter((r, i, l) => l.findIndex((x) => kurulumAyniAd(x.ad, r.ad)) === i);
  const prosesler = [...((KURULUM_PROSES_SABLONLARI.find((s) => s.id === prosesSablonu) || {}).prosesler || []), ...kurulumListesi(prosesEk)]
    .filter((ad, i, l) => l.findIndex((x) => kurulumAyniAd(x, ad)) === i);

  const ADIMLAR = ["Firma", "Ölçüler", "Renkler", "Prosesler", "Bitir"];
  const ileriKapali = adim === 0 && !firma.unvan.trim();
  const alan = (ad, etiket, ek = {}) => (
    <Field label={etiket}>
      <input data-kurulum-alan={ad} value={firma[ad]} onChange={(e) => setFirma({ ...firma, [ad]: e.target.value })} style={inputStyle} {...ek} />
    </Field>
  );
  const cip = (secili, etiket, onClick, renk, veri) => (
    <button type="button" key={etiket} onClick={onClick} data-kurulum-cip={veri || etiket}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, fontSize: 13, cursor: "pointer",
        border: `1.5px solid ${secili ? "var(--erp-accent, #5B3E96)" : "var(--erp-line, #ddd)"}`,
        background: secili ? "var(--erp-accent-bg, #EEE8F7)" : "var(--erp-panel, #fff)", color: "var(--erp-text)" }}>
      {renk ? <span style={{ width: 12, height: 12, borderRadius: 999, background: renk, border: "1px solid rgba(0,0,0,.2)" }} /> : null}
      {etiket}
    </button>
  );
  const not = (metin) => <div style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px", lineHeight: 1.5 }}>{metin}</div>;

  function bitir() {
    onKaydet(kurulumTanimlariniUygula(tanimlar, { firma, olculer, renkler, prosesler, kdvAktif }));
  }

  return (
    <div data-kurulum-sihirbazi="1" style={{ position: "fixed", inset: 0, zIndex: 650, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--erp-panel, #fff)", borderRadius: "var(--erp-r-lg)", width: 560, maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", fontFamily: "var(--erp-font, 'Inter', sans-serif)" }}>
        <div style={{ padding: "18px 22px 10px", borderBottom: "1px solid var(--erp-line-soft)" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Hoş geldiniz — kurulum</div>
          <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginTop: 2 }}>Beş kısa adım. Hepsi sonradan Tanımlar'dan değiştirilebilir.</div>
          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
            {ADIMLAR.map((a, i) => (
              <div key={a} data-kurulum-adim-gostergesi={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: i === adim ? 700 : 500,
                color: i <= adim ? "var(--erp-text)" : "var(--erp-text-3)", borderTop: `3px solid ${i <= adim ? "var(--erp-accent, #5B3E96)" : "var(--erp-line, #ddd)"}`, paddingTop: 4 }}>
                {i + 1}. {a}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "16px 22px", overflowY: "auto", flex: 1 }} data-kurulum-adim={ADIMLAR[adim]}>
          {adim === 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {not("Fişlerde, sipariş çıktılarında ve faturada görünür. Yalnız unvan zorunlu.")}
              {alan("unvan", "Firma unvanı *", { autoFocus: true, placeholder: "örn. Öz Deri Ayakkabı" })}
              {alan("telefon", "Telefon")}
              {alan("adres", "Adres")}
              {alan("email", "E-posta")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {alan("vergiNo", "Vergi no / TCKN", { inputMode: "numeric" })}
                {alan("vergiDairesi", "Vergi dairesi")}
              </div>
            </div>
          ) : null}

          {adim === 1 ? (
            <div>
              {not("Ürünlerinizin beden aralığı. Ürün kartında ve siparişte bu ölçüler sütun olarak çıkar.")}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {KURULUM_OLCU_SABLONLARI.map((s) => cip(olcuSablonu === s.id, s.ad, () => setOlcuSablonu(s.id), null, `olcu-${s.id}`))}
              </div>
              <Field label="Ek ölçüler (virgülle ayırın)">
                <input data-kurulum-olcu-ek="1" value={olcuEk} onChange={(e) => setOlcuEk(e.target.value)} style={inputStyle} placeholder="örn. 34, 42" />
              </Field>
              <div data-kurulum-olcu-ozet="1" style={{ marginTop: 10, fontSize: 12, color: "var(--erp-text-2)" }}>
                {olculer.length ? `Eklenecek: ${olculer.join(" · ")}` : "Ölçü eklenmeyecek."}
              </div>
            </div>
          ) : null}

          {adim === 2 ? (
            <div>
              {not("Sık kullandığınız renkleri seçin. Her renge otomatik barkod kodu verilir.")}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {KURULUM_RENK_ONERILERI.map((r) => cip(renkSecili.has(r.ad), r.ad, () => {
                  const y = new Set(renkSecili);
                  if (y.has(r.ad)) y.delete(r.ad); else y.add(r.ad);
                  setRenkSecili(y);
                }, r.kod, `renk-${r.ad}`))}
              </div>
              <Field label="Başka renkler (virgülle ayırın)">
                <input data-kurulum-renk-ek="1" value={renkEk} onChange={(e) => setRenkEk(e.target.value)} style={inputStyle} placeholder="örn. Pudra, Antrasit" />
              </Field>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--erp-text-2)" }}>{renkler.length} renk eklenecek.</div>
            </div>
          ) : null}

          {adim === 3 ? (
            <div>
              {not("Üretimin aşamaları. Üretim kartında iş bu sırayla ustadan ustaya geçer.")}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {KURULUM_PROSES_SABLONLARI.map((s) => cip(prosesSablonu === s.id, s.ad, () => setProsesSablonu(s.id), null, `proses-${s.id}`))}
              </div>
              <Field label="Ek prosesler (virgülle ayırın, sırayla)">
                <input data-kurulum-proses-ek="1" value={prosesEk} onChange={(e) => setProsesEk(e.target.value)} style={inputStyle} placeholder="örn. Boya, Kalite kontrol" />
              </Field>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--erp-text-2)" }}>
                {prosesler.length ? `Sıra: ${prosesler.join(" → ")}` : "Proses eklenmeyecek."}
              </div>
            </div>
          ) : null}

          {adim === 4 ? (
            <div>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginBottom: 14 }}>
                <input type="checkbox" data-kurulum-kdv="1" checked={kdvAktif} onChange={(e) => setKdvAktif(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Fişlerde KDV kullan <span style={{ display: "block", fontSize: 11, color: "var(--erp-text-3)" }}>Faturalı çalışıyorsanız açın. Sonradan Tanımlar › Firma'dan değiştirilir.</span></span>
              </label>
              <div data-kurulum-ozet="1" style={{ fontSize: 13, lineHeight: 1.8, background: "var(--erp-panel-2, #f6f4f0)", borderRadius: "var(--erp-r-md)", padding: "10px 12px" }}>
                <div><b>Firma:</b> {firma.unvan || "—"}</div>
                <div><b>Ölçüler:</b> {olculer.length ? olculer.join(", ") : "yok"}</div>
                <div><b>Renkler:</b> {renkler.length ? renkler.map((r) => r.ad).join(", ") : "yok"}</div>
                <div><b>Prosesler:</b> {prosesler.length ? prosesler.join(" → ") : "yok"}</div>
                <div><b>KDV:</b> {kdvAktif ? "açık" : "kapalı"}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginTop: 12 }}>
                Sonraki adım: Stok'tan ilk ürününüzü, Cari'den ilk müşteri ya da tedarikçinizi ekleyin.
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ padding: "12px 22px", borderTop: "1px solid var(--erp-line-soft)", display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="btn-ghost" data-kurulum-atla="1" style={{ fontSize: 12 }}
            onClick={() => onKaydet({ ...tanimlar, kurulumTamamlandi: true }, true)} title="Sihirbaz bir daha açılmaz; tanımları Tanımlar ekranından yaparsınız">
            Atla
          </button>
          <div style={{ flex: 1 }} />
          {adim > 0 ? <button type="button" className="btn-ghost" data-kurulum-geri="1" onClick={() => setAdim(adim - 1)}>Geri</button> : null}
          {adim < ADIMLAR.length - 1 ? (
            <button type="button" className="btn-primary" data-kurulum-ileri="1" disabled={ileriKapali} onClick={() => setAdim(adim + 1)}>İleri</button>
          ) : (
            <button type="button" className="btn-primary" data-kurulum-bitir="1" onClick={bitir}>Kurulumu bitir</button>
          )}
        </div>
      </div>
    </div>
  );
}
