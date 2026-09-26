/* ================= SİPARİŞ MODÜLÜ (Satış / Alış) ================= */

const SIPARIS_DURUM_RENK = {
  "Bekliyor": "var(--erp-text-3)", "Onaylandı": "var(--erp-info)", "Hazırlanıyor": "#C97B3D",
  "Kısmi Teslim": "#B8860B", "Tamamlandı": "var(--erp-primary)", "İptal": "var(--erp-warn)",
};


// Mikrofonla konuşulan bir siparişi (tarayıcının konuşma tanıma API'siyle metne çevirip, Claude API'ye
// gönderip yapılandırılmış JSON'a dönüştürerek) forma doldurur. Hiçbir veri otomatik kaydedilmez —
// sadece formu doldurur, kullanıcı gözden geçirip normal akışla ekler/kaydeder.
// NOT: Tarayıcının kendi konuşma tanıma API'si (SpeechRecognition), Claude artifact'lerinin çalıştığı
// güvenlik sanal alanında (iframe sandbox) mikrofon izni verilmediği için burada çalışmıyor — bu,
// koddan değil ortamdan kaynaklanan bir kısıtlama. Bunun yerine, TELEFON/BİLGİSAYAR KLAVYENİZİN kendi
// dikte tuşunu (Android/iPhone klavyesindeki mikrofon simgesi) kullanarak bu metin kutusuna
// konuşabilirsiniz — bu, işletim sistemi seviyesinde çalıştığı için sanal alan kısıtlamasından etkilenmez.
function SesliSiparisButonu({ tip, cariUygun, urunUygun, onSonuc, showToast }) {
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState("");
  const [isleniyor, setIsleniyor] = useState(false);

  async function isle() {
    if (!metin.trim()) return;
    setIsleniyor(true);
    try {
      const cariListesi = cariUygun.map((c) => c.unvan).join(", ") || "(kayıtlı cari yok)";
      const urunListesi = urunUygun.map((p) => p.ad).join(", ") || "(kayıtlı ürün yok)";
      const prompt = `Aşağıdaki Türkçe komuttan bir ${tip} siparişi bilgisini çıkar. SADECE JSON döndür,
başka hiçbir açıklama, markdown işareti ya da metin ekleme.

Komut: "${metin}"

Mevcut cariler: ${cariListesi}
Mevcut ürünler: ${urunListesi}

Şu formatta JSON döndür:
{"cariAdi": "en yakın eşleşen cari adı veya null", "urunAdi": "en yakın eşleşen ürün adı veya null", "renk": "renk adı veya null", "bedenMiktarlari": {"beden": miktar_sayi}, "birimFiyat": sayi_veya_null, "teslimTarihi": "YYYY-MM-DD veya null", "not": "varsa ek not, yoksa null"}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const text = (data.content || []).map((c) => c.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      onSonuc(parsed);
      setMetin("");
      setAcik(false);
    } catch (e) {
      showToast("Komut işlenemedi — lütfen tekrar deneyin");
    }
    setIsleniyor(false);
  }

  // KAPALIYKEN YALNIZ AMBLEM (kullanıcı, 6 Eylül: "sağda mikrofon amblemi ile ses ile kayıt
  // olsun, ekranı çok kaplamasın"). Metin ve örnek cümle, formun en üstünde mor bir kutu hâlinde
  // dört satır yer kaplıyordu; oysa özellik ayda birkaç kez kullanılıyor. Ne olduğu `title`da.
  if (!acik) {
    return (
      <button
        type="button"
        className="btn-ghost"
        onClick={() => setAcik(true)}
        title="Sesle ya da yazarak doldur — örn. &quot;Ahmet Yılmaz'a 1027 model siyah 38 numaradan 5 çift, birim fiyat 250 lira&quot;"
        style={{ padding: "6px 10px", fontSize: 15, lineHeight: 1, alignSelf: "flex-end" }}
      >
        🎤
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <textarea
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        placeholder={`Klavyenizin mikrofon tuşuyla dikte edin ya da yazın: Ahmet Yılmaza 1027 model siyah renk 38 numaradan 5 çift, birim fiyat 250 lira`}
        rows={2}
        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        autoFocus
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn-primary" onClick={isle} disabled={isleniyor || !metin.trim()}>
          {isleniyor ? "İşleniyor…" : "İşle ve Forma Doldur"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => { setAcik(false); setMetin(""); }}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}


// Sipariş formunun "Ekle" düğmesi (v1.470.0 — kullanıcı: "kalemlere ekle'nin adını Ekle yap, rengi
// yeşil olsun, güzel bir ikonu da olabilir"). Hayalet düğme formdaki onca kutunun arasında
// kayboluyordu; kalemi listeye geçiren tek eylem olduğu için dolu ve yeşil. Sabit yeşil (tema
// değil): koyu temada da beyaz yazıyla okunuyor, "Kaydet"in kırmızısıyla karışmıyor.
const EKLE_DUGMESI = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 16px", fontSize: 13, fontWeight: 700,
  color: "#fff", background: "#2F8F46", border: "1px solid #257238",
  borderRadius: "var(--erp-r-md)", cursor: "pointer", whiteSpace: "nowrap",
};

// ================= KALEM NOTLARI — PROSES BAZLI (26 Eylül, v1.476.0) =================
//
// Kullanıcı: "Not girdiğimizde üretime not varsa üretimin hangi prosesine ait onu da yazıp o proseste
// gösterecek. Örnek: kesim için 'deriyi iyi yerinden kes', temizleme için 'her tek poşete konacak'."
//
// Kalemde `notlar: [{ proses, metin }]` — proses "" = GENEL not (v1.470'teki renk bazlı açıklama).
// Bir renk satırının bütün ölçüleri aynı notları taşır. Eski `aciklama` alanı genel not olarak
// okunur (`kalemNotlari`); düzenlenince `notlar`a taşınır.
//
// ÜRETİM notları KOPYALAMAZ, siparişten CANLI okur (`uretimSiparisNotlari`): kalemin
// `planlama.referansNo`su üretim numarası. Böylece planlamadan SONRA eklenen not da atölyeye düşer,
// eski planlanmış işler de göç gerektirmeden notlarını gösterir. (Kutu rengi kopyalanıyor çünkü
// hammadde tüketimini değiştiriyor; not yalnız bilgi.)
function kalemNotlari(k) {
  if (!k) return [];
  const liste = [];
  if (k.aciklama) liste.push({ proses: "", metin: String(k.aciklama) });
  (k.notlar || []).forEach((n) => { if (n && String(n.metin || "").trim()) liste.push({ proses: n.proses || "", metin: String(n.metin).trim() }); });
  return notlariTekille(liste);
}
function notlariTekille(liste) {
  const gorulen = new Set();
  return (liste || []).filter((n) => { const a = `${n.proses}|${n.metin}`; if (gorulen.has(a)) return false; gorulen.add(a); return true; });
}
// Bir renk satırındaki (aynı ürün+renk, farklı ölçüler) kalemlerin notları.
function grupNotlari(kalemler) { return notlariTekille((kalemler || []).flatMap(kalemNotlari)); }
// Üretime bağlı satış kalemlerinin notları (üretim no = kalemin planlama referansı).
function uretimSiparisNotlari(u, siparisler) {
  if (!u || !u.siparisNo) return [];
  const kalemler = [];
  (siparisler || []).forEach((s) => (s.kalemler || []).forEach((k) => {
    if (k.planlama && k.planlama.tip === "Üretim" && k.planlama.referansNo === u.siparisNo) kalemler.push(k);
  }));
  return grupNotlari(kalemler);
}
const notEtiketi = (n) => (n.proses ? `${n.proses}: ${n.metin}` : n.metin);

// Not listesi + ekleyici. `onTaslak`: yazılan ama henüz eklenmemiş not (sipariş formunda "Ekle"
// basılınca o da kaleme gitsin — "+"ya basmayı unutmak notu kaybettirmesin).
function KalemNotDuzenleyici({ notlar, prosesler, onDegis, onTaslak, salt = false, kucuk = false, veriAdi = "data-kalem-notlari" }) {
  const [proses, setProses] = useState("");
  const [metin, setMetin] = useState("");
  const ekle = () => {
    const m = metin.trim();
    if (!m) return;
    onDegis(notlariTekille([...(notlar || []), { proses, metin: m }]));
    setMetin(""); if (onTaslak) onTaslak(null);
  };
  const fs = kucuk ? 11 : 12;
  return (
    <div {...{ [veriAdi]: "1" }} style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", fontFamily: "var(--erp-font, sans-serif)" }}>
      {(notlar || []).map((n, i) => (
        <span key={`${n.proses}|${n.metin}`} data-kalem-not={notEtiketi(n)}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: fs, padding: "1px 7px", borderRadius: "var(--erp-r-pill)",
            background: n.proses ? "#FFF4DC" : "var(--erp-panel-2)", border: `1px solid ${n.proses ? "#E3C77A" : "var(--erp-line)"}`, whiteSpace: "normal" }}>
          {n.proses && <b style={{ color: "#8A6A2E" }}>{n.proses}:</b>}
          {n.metin}
          {!salt && (
            <button type="button" title="Notu sil" onClick={() => onDegis((notlar || []).filter((_, j) => j !== i))}
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--erp-text-3)", padding: 0, display: "flex" }}>
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      {!salt && (
        <span style={{ display: "inline-flex", gap: 3, alignItems: "center", flex: "1 1 180px", minWidth: 150 }}>
          <select value={proses} onChange={(e) => { setProses(e.target.value); if (onTaslak && metin.trim()) onTaslak({ proses: e.target.value, metin: metin.trim() }); }}
            data-kalem-not-proses="1" title="Notun ait olduğu proses — üretimde o proseste gösterilir"
            style={{ fontSize: fs, padding: "3px 2px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", maxWidth: 110 }}>
            <option value="">Genel</option>
            {(prosesler || []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input value={metin} data-kalem-not-metin="1"
            onChange={(e) => { setMetin(e.target.value); if (onTaslak) onTaslak(e.target.value.trim() ? { proses, metin: e.target.value.trim() } : null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ekle(); } }}
            placeholder={proses ? `${proses} notu…` : "Not…"}
            style={{ flex: 1, minWidth: 80, fontSize: fs, padding: "3px 6px", border: "1px dashed var(--erp-line)", borderRadius: "var(--erp-r-sm)", background: "transparent", fontFamily: "inherit" }} />
          <button type="button" data-kalem-not-ekle="1" onClick={ekle} disabled={!metin.trim()} title="Notu ekle"
            style={{ border: "1px solid var(--erp-line)", background: "#fff", borderRadius: "var(--erp-r-sm)", cursor: "pointer", padding: "2px 5px", display: "flex" }}>
            <Plus size={11} />
          </button>
        </span>
      )}
    </div>
  );
}

// Basılı belgelere (iş emri, teslim fişi) serbest metin yazarken: "<" gibi karakterler HTML'i bozmasın.
function htmlKacis(v) {
  return String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
}
