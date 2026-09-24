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

