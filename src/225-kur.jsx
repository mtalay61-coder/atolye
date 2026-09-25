// Başlık çubuğunda duran kur göstergesi. Kur, sipariş fiyatlandırmasından hammadde maliyetine kadar
// her ekranı etkilediği için tek bir modülün içine gömülü kalmamalı. Kur hiç girilmemişse rozet
// "kur girilmedi" uyarısına döner — sessizce 0 göstermek, yanlış maliyet hesaplarına yol açardı.
// `dar`: sol menü daraltılmışken (7 Eylül, rozet menünün en altına alındı) yalnız değerler
// gösteriliyor — 64 piksellik menüde yan yana iki kur + iki düğme sığmıyor.
// `serit`: üst sekme şeridinde (40 piksel yükseklik). Kutu kenarlıksız ve tek satır — şeritte
// çerçeveli bir kutu, sekmelerle karışıp "bu da mı sekme" sorusu doğuruyordu.
// `dar`: sol menü daraltılmışken kullanılıyordu; rozet şeride taşındıktan sonra (7 Eylül) çağıran
// kalmadı ama parametre duruyor — menüye geri konması istenirse hazır.
function KurRozeti({ kurlar, kurGecmisi, yukleniyor, onGuncelle, onElleKaydet, dar, serit }) {
  // GEÇMİŞ VARSAYILAN AÇIK (kullanıcı, 7 Eylül: "kur geçmişi listelensin"). Panel zaten elle
  // açılıyor; açan kişi kurla ilgileniyor demektir, geçmişi bir tık daha arkaya koymak gereksiz.
  const [gecmisAcik, setGecmisAcik] = useState(true);
  const k = kurlar || {};
  const varMi = !!(k.USD || k.EUR);
  // Kurun NE ZAMAN çekildiği, değerin kendisi kadar önemli: 3 gün önceki kurla fiyat vermek risklidir.
  const gunFarki = k.tarih ? Math.floor((Date.now() - new Date(k.tarih).getTime()) / 86400000) : null;
  const bayat = gunFarki != null && gunFarki >= 1;
  // Kaynak ayrımı görsel olmalı: TCMB resmî satış kurudur; Harem/Piyasa/Elle ise değildir. Aradaki
  // fark binde birkaç olsa da, fatura ve maliyet kaydında "hangi kuru kullandık" sorusunun cevabı
  // ekranda görünmüyorsa sonradan kanıtlanamaz. Bu yüzden TCMB dışındaki her kaynak etiketlenir.
  const kaynak = k.kaynak || (varMi ? "TCMB" : null);
  const resmiMi = !kaynak || kaynak === "TCMB";
  const KAYNAK_RENK = { Harem: "var(--erp-brown)", Piyasa: "var(--erp-warn)", Elle: "var(--erp-purple)", Web: "var(--erp-info)" };
  const kaynakRenk = KAYNAK_RENK[kaynak] || "var(--erp-primary)";
  const elleGirilmis = kaynak === "Elle";
  // DAR MENÜDE İKİ ONDALIK: dört ondalıklı "48,2400" 64 piksellik menüde ikinci satıra kırılıyordu
  // (kullanıcı ekran görüntüsüyle bildirdi, 7 Eylül). Kuruş hassasiyeti hesapta korunuyor; burada
  // gösterilen yalnız bir GÖZ UCU bilgisi ve tam değer `title`da duruyor.
  const kisa = dar || serit;
  const bicim = (v) => (v
    ? v.toLocaleString("tr-TR", { minimumFractionDigits: kisa ? 2 : 4, maximumFractionDigits: kisa ? 2 : 4 })
    : "—");

  const [elleAcik, setElleAcik] = useState(false);
  const [form, setForm] = useState({ USD: "", EUR: "" });

  function elleAc() {
    // Kutular mevcut değerlerle açılır — kullanıcı genelde birini düzeltmek ister, ikisini de
    // sıfırdan yazmak zorunda kalması gereksiz bir yük olurdu.
    setForm({ USD: k.USD ? String(k.USD) : "", EUR: k.EUR ? String(k.EUR) : "" });
    setElleAcik(true);
  }

  const [hata, setHata] = useState("");

  function elleKaydet() {
    const usd = parseFloat(String(form.USD).replace(",", "."));
    const eur = parseFloat(String(form.EUR).replace(",", "."));

    // ÖNCEDEN: ikisi birden geçerli değilse SESSİZCE hiçbir şey yapılmıyordu. Kullanıcı yalnızca
    // USD girip kaydete bastığında hiçbir tepki almıyor, "kaydetmiyor" diyordu — haklı olarak.
    // Artık tek kuru güncellemek yeterli: girilmeyen alan MEVCUT değerini korur.
    const k = kurlar || {};
    const yeniUsd = usd > 0 ? usd : (k.USD > 0 ? k.USD : 0);
    const yeniEur = eur > 0 ? eur : (k.EUR > 0 ? k.EUR : 0);
    if (!(usd > 0) && !(eur > 0)) { setHata("USD ya da EUR için geçerli bir değer girin"); return; }
    if (!(yeniUsd > 0) || !(yeniEur > 0)) { setHata("İlk girişte iki kuru da girmelisiniz"); return; }
    setHata("");
    onElleKaydet && onElleKaydet(yeniUsd, yeniEur);
    setElleAcik(false);
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          // Menüde dikey dizilim: yatay hâli 220 piksellik menüde bile taşıyordu.
          display: "flex", flexDirection: dar ? "column" : "row", alignItems: "center",
          gap: dar ? 2 : (serit ? 6 : 8),
          padding: dar ? "6px 4px" : (serit ? "2px 8px" : "5px 10px"),
          borderRadius: serit ? 999 : 8,
          // ŞERİTTE ÇERÇEVE YOK, ama uyarı durumlarında (kur girilmemiş / bayat / gayriresmî)
          // kenarlık geri geliyor: o üç durum GÖRÜLMELİ, sessizce geçilmemeli.
          border: !varMi ? "1px solid #E1611F"
            : bayat ? "1px solid #C9A063"
            : !resmiMi ? `1px solid ${kaynakRenk}66`
            : (serit ? "1px solid #BCD3B5" : "1px solid #E4D8C0"),
          background: varMi ? (serit ? "var(--erp-panel)" : "#fff") : "var(--erp-orange-bg)",
        }}
        title={
          varMi
            ? `${kaynak} satış kuru${resmiMi ? " (resmî)" : " — resmî TCMB kuru DEĞİL"}${k.tarih ? " · " + new Date(k.tarih).toLocaleString("tr-TR") : ""}${bayat ? ` · ${gunFarki} gün önce güncellendi` : ""}`
            : "Henüz kur girilmedi — döviz cinsi tutarlar çevrilemez"
        }
      >
        {varMi ? (
          <div style={{ display: serit ? "flex" : "grid", gap: serit ? 8 : 1, alignItems: "center" }}>
            <span className="mono" style={{ fontSize: dar ? 10 : 11, fontWeight: 700, color: "#2F6B4F", lineHeight: 1.2, whiteSpace: "nowrap" }}>${dar ? "" : " "}{bicim(k.USD)}</span>
            <span className="mono" style={{ fontSize: dar ? 10 : 11, fontWeight: 700, color: "var(--erp-info)", lineHeight: 1.2, whiteSpace: "nowrap" }}>€{dar ? "" : " "}{bicim(k.EUR)}</span>
          </div>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-warn)" }}>Kur girilmedi</span>
        )}

        {/* Elle girilmiş kur, resmî kurdan görsel olarak AYIRT EDİLEBİLİR olmalı — aksi halde
            kullanıcı ekrandaki sayının TCMB'den geldiğini varsayar. */}
        {varMi && !resmiMi && !dar && !serit && (
          <span
            className="mono"
            title={
              elleGirilmis
                ? "Kur elle girildi — resmî TCMB kuru değil"
                : `${kaynak} piyasa kuru — TCMB'nin resmî satış kuru değil, resmî kayıtta doğrulayın`
            }
            style={{ fontSize: 9, fontWeight: 700, color: kaynakRenk, background: alfaEkle(kaynakRenk, "18"), padding: "1px 5px", borderRadius: "var(--erp-r-pill)", whiteSpace: "nowrap" }}
          >
            {elleGirilmis ? "elle" : kaynak.toLocaleLowerCase("tr-TR")}
          </span>
        )}
        {/* DAR MENÜDE ROZETLER GİZLİ: "elle" ve "5g" etiketleri kutuyu iki satır daha uzatıyordu.
            Bilgi kaybolmuyor — ikisi de `title`da yazılı ve menü genişletilince geri geliyor.
            Bayatlık uyarısı görsel olarak KENARLIK RENGİNDE de duruyor, yani dar menüde bile
            "bu kur eski" bilgisi tamamen kaybolmuş olmuyor. */}
        {bayat && !dar && !serit && <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-warn)" }}>{gunFarki}g</span>}

        {/* DÜĞMELER DAR MODDA YAN YANA: dikey dizilimde alt alta düşüp kutuyu iki kat uzatıyorlardı
            (kullanıcı ekran görüntüsü, 7 Eylül). Kendi satırlarında bir sıra oluşturuyorlar. */}
        <span style={{ display: "flex", gap: 3, flexShrink: 0 }}>
        <button
          type="button"
          onClick={elleAcik ? () => setElleAcik(false) : elleAc}
          title="Kuru elle gir"
          style={{
            border: "1px solid #E4D8C0", background: elleAcik ? "var(--erp-border-2)" : "var(--erp-panel)", borderRadius: "var(--erp-r-md)",
            padding: (dar || serit) ? "2px 4px" : "4px 6px", cursor: "pointer", color: "var(--erp-text-2)", display: "flex", flexShrink: 0,
          }}
        >
          <Pencil size={(dar || serit) ? 11 : 12} />
        </button>
        {/* DİKKAT: onClick'e fonksiyon DOĞRUDAN verilmez — React tıklama olayını ilk argüman olarak
            geçirir, bu da fonksiyonun `sessiz` parametresine düşüp hata mesajlarını bastırırdı
            (buton çalışır ama hiçbir şey söylemez görünürdü). Argümansız sarmalamak şart. */}
        <button
          type="button"
          onClick={() => onGuncelle()}
          disabled={yukleniyor}
          title="TCMB'den güncelle"
          style={{
            border: "1px solid #E4D8C0", background: "var(--erp-panel)", borderRadius: "var(--erp-r-md)",
            padding: (dar || serit) ? "2px 4px" : "4px 6px",
            cursor: yukleniyor ? "default" : "pointer", color: "var(--erp-text-2)", display: "flex", flexShrink: 0,
          }}
        >
          <RefreshCw size={(dar || serit) ? 11 : 12} style={yukleniyor ? { animation: "spin 1s linear infinite" } : undefined} />
        </button>
        </span>
      </div>

      {elleAcik && (
        <div
          style={{
            // zIndex 600 > şeridin 500'ü: panel şeritten AŞAĞI taşıyor ve altındaki içeriğin
            // üzerinde durması gerekiyor. 400 iken sayfanın kendi ögelerinin altında kalıyordu.
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 600,
            background: "#fff", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 10,
            boxShadow: "none", minWidth: 230,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text)", marginBottom: 6 }}>Kuru elle gir (1 birim = ? ₺)</div>
          <div style={{ display: "grid", gap: 6 }}>
            {["USD", "EUR"].map((pb) => (
              <label key={pb} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 34, color: pb === "USD" ? "#2F6B4F" : "var(--erp-info)" }}>{pb}</span>
                <input
                  type="number" step="0.0001" min="0"
                  value={form[pb]}
                  onChange={(e) => setForm({ ...form, [pb]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") elleKaydet(); }}
                  className="mono"
                  placeholder="0,0000"
                  style={{ flex: 1, padding: "5px 7px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 12 }}
                />
                <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>₺</span>
              </label>
            ))}
          </div>
          {/* Kaydedilemediğinde SEBEBİ yazılır; sessizce hiçbir şey yapmamak "uygulama bozuk"
              dedirtiyordu. */}
          {hata && <div style={{ fontSize: 11, color: "var(--erp-warn)", fontWeight: 600, marginTop: 7 }}>{hata}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="btn-primary btn-save" style={{ padding: "5px 10px", fontSize: 11 }} onClick={elleKaydet}>
              <Check size={12} /> Kaydet
            </button>
            <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => { setElleAcik(false); setHata(""); }}>Vazgeç</button>
          </div>
          <div style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 6, lineHeight: 1.5 }}>
            TCMB'nin döviz satış kurunu tcmb.gov.tr adresinden okuyup buraya yazabilirsiniz.
          </div>

          {/* KUR GEÇMİŞİ — katlanmış: her açılışta göze girmesin ama arandığında bulunsun. */}
          {(kurGecmisi || []).length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #E4D8C0" }}>
              <button
                type="button"
                onClick={() => setGecmisAcik((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--erp-text-2)" }}
              >
                {gecmisAcik ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Kur geçmişi ({kurGecmisi.length})
              </button>
              {gecmisAcik && (
                <div style={{ maxHeight: 190, overflowY: "auto", marginTop: 6 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {kurGecmisi.map((g) => (
                        <tr key={g.id} style={{ borderTop: "1px solid #E4D8C0" }}>
                          <td className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)", padding: "3px 4px", whiteSpace: "nowrap" }}>
                            {String(g.tarih || "").slice(8, 10)}.{String(g.tarih || "").slice(5, 7)} {String(g.tarih || "").slice(11, 16)}
                          </td>
                          <td className="mono" style={{ fontSize: 11, padding: "3px 4px", textAlign: "right" }}>
                            {(g.USD || 0).toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </td>
                          <td className="mono" style={{ fontSize: 11, padding: "3px 4px", textAlign: "right" }}>
                            {(g.EUR || 0).toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </td>
                          <td style={{ padding: "3px 4px" }}>
                            <span className="mono" style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: "var(--erp-r-pill)", background: g.kaynak === "TCMB" ? "#2F6B4F22" : "#8A5A3822", color: g.kaynak === "TCMB" ? "#2F6B4F" : "var(--erp-brown)" }}>
                              {g.kaynak || "Elle"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

