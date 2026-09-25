function AsortiOlusturucu({ bedenler, onKaydet }) {
  const [ad, setAd] = useState("");
  const [oranlar, setOranlar] = useState({});

  function kaydet() {
    const liste = bedenler.map((b) => ({ beden: b.ad, oran: oranlar[b.ad] || "" }));
    onKaydet(ad, liste);
    setAd("");
    setOranlar({});
  }

  if (bedenler.length === 0) {
    return <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>Önce yukarıdan Beden veya Boyut tanımlayın.</div>;
  }

  return (
    <div style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 14, maxWidth: 640 }}>
      <Field label="Asorti Adı">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Örn. Standart Asorti" style={{ ...inputStyle, marginBottom: 10 }} />
      </Field>
      <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>Beden başına oran/adet</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {bedenler.map((b) => (
          <label key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text)" }}>{b.ad}</span>
            <input
              type="number" min="0"
              value={oranlar[b.ad] || ""}
              onChange={(e) => setOranlar({ ...oranlar, [b.ad]: e.target.value })}
              style={{ ...inputStyle, width: 56, textAlign: "center", padding: "6px" }}
            />
          </label>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn-primary btn-save" onClick={kaydet}><Save size={14} /> Asorti Kaydet</button>
      </div>
    </div>
  );
}

/* ================= STOK MODÜLÜ (Renk × Beden Matrisi, görsel ürüne özel) ================= */

// Yanlışlıkla tek tıkla silmeyi önlemek için: ilk tıklama "Emin misiniz?" onayına geçer,
// birkaç saniye içinde ikinci tıklama gelmezse otomatik eski haline döner.
// Pasife alma / geri alma düğmesi. Silmenin YANINDA durur ama ondan görsel olarak ayrılır: silme
// kiremit rengi ve geri alınamaz, pasife alma mor ve her an geri alınabilir. Kullanıcı ikisini
// karıştırmamalı — biri son çare, diğeri normal iş akışı.
function PasifButonu({ pasif, onDegistir, etiket }) {
  return (
    <button
      type="button"
      onClick={onDegistir}
      className="btn-ghost"
      title={
        pasif
          ? `${etiket} yeniden kullanıma açılır; seçim listelerinde tekrar görünür`
          : `${etiket} kullanımdan kaldırılır. Kayıt ve tüm geçmişi durur, sadece YENİ işlemlerde seçilemez.`
      }
      style={{
        padding: "6px 11px", fontSize: 12,
        borderColor: pasif ? "var(--erp-primary)" : "var(--erp-purple)",
        color: pasif ? "var(--erp-primary)" : "var(--erp-purple)",
      }}
    >
      {pasif ? <><Check size={13} /> Aktife Al</> : <><Archive size={13} /> Pasife Al</>}
    </button>
  );
}

// SİLME ONAYI — PENCERELİ (ERP standardı, 21 Eylül; kullanıcı "devam" ile karma yolu seçti:
// ikon satırda kalır, onay pencereyle).
//
// Önce "Emin misiniz? Tekrar dokunun" çift dokunuşuydu: 3 saniye içinde aynı yere ikinci kez
// dokunmak silmeye yetiyordu — telefonda kaydırırken yanlışlıkla iki kez dokunmak kolay.
// Standart: "silme onay penceresi açıyor, düğmesi 'Sil' diyor ('Tamam' değil)". Pencerede ne
// silineceği (`baslikNormal`) yazıyor; Esc ve Vazgeç kapatır, Sil kırmızı ve tek dolu düğme.
//
// İŞARETLER: `data-sil-onay` ikon düğmesinde (testler bununla açar), `data-sil-onayla`
// penceredeki Sil'de. Testlerdeki eski "iki kez tıkla" akışı: ilk tık pencereyi açar, ikinci
// tık AYNI ikon yerine pencereye düşer — bu yüzden ikinci tık `data-sil-onayla`ya yönlendirildi.
function SilOnayButonu({ onConfirm, boyut = 11, baslikNormal = "Sil", baslikOnay, kartEylemi = false }) {
  const [acik, setAcik] = useState(false);
  React.useEffect(() => {
    if (!acik) return undefined;
    const dinle = (e) => { if (e.key === "Escape") { e.stopPropagation(); setAcik(false); } };
    window.addEventListener("keydown", dinle, true);
    return () => window.removeEventListener("keydown", dinle, true);
  }, [acik]);

  return (
    <>
      <button
        type="button"
        data-sil-onay="1"
        data-kart-eylem={kartEylemi ? "sil" : undefined}
        title={baslikNormal}
        aria-label={baslikNormal}
        className="btn-ikon tehlike"
        style={{ padding: 3 }}
        onClick={(e) => { e.stopPropagation(); setAcik(true); }}
      >
        <Trash2 size={boyut} />
      </button>
      {acik && (
        <div role="dialog" aria-modal="true" data-sil-penceresi="1"
          onClick={(e) => { e.stopPropagation(); setAcik(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(36,32,27,.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)",
              padding: 16, width: "min(360px, 100%)", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertTriangle size={18} color="var(--erp-void)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)" }}>
                {baslikNormal && baslikNormal !== "Sil" ? baslikNormal : "Bu kayıt silinsin mi?"}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Bu işlem geri alınmayabilir.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost" data-sil-vazgec="1"
                onClick={(e) => { e.stopPropagation(); setAcik(false); }}
                style={{ padding: "6px 14px", fontSize: 13 }}>Vazgeç</button>
              <button type="button" data-sil-onayla="1" autoFocus
                onClick={(e) => { e.stopPropagation(); setAcik(false); onConfirm(); }}
                style={{ padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: "var(--erp-accent)", color: "#fff", border: "1px solid var(--erp-accent)",
                  borderRadius: "var(--erp-r-sm)" }}>
                <Trash2 size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function urunOlcuTipi(stok, urunId) {
  const p = (stok || []).find((x) => x.id === urunId);
  return (p && p.olcuTipi) || "Beden";
}

// ASORTİ YALNIZCA BEDENDE VAR — proje kuralı.
// Asorti, "bir sette hangi bedenden kaç çift" demektir; bu kavramın boyutlu malzemede
// (16 cm fermuar, 20 cm astar) ya da ölçüsüz malzemede karşılığı YOKTUR. Kontrol oralarda da
// çiziliyordu: kullanıcı bir asorti seçip Uygula'ya basıyor, hiçbir kutu dolmuyor ve ekranın
// bozuk olduğunu düşünüyordu.
//
// İKİ SÜZGEÇ birden var, biri diğerinin yedeği:
//   1) `olcuTipi` — çağıran tarafın bildirdiği ölçü tipi. Asıl kural bu.
//   2) oran eşleşmesi — hiçbir asortinin oranları bu ölçülerle kesişmiyorsa kontrol zaten
//      hiçbir şey yapamaz. Çağıran `olcuTipi` vermeyi unutsa bile bu süzgeç tutar.
// Kural bileşenin İÇİNDE: her çağrı yerinde tekrarlansaydı, yeni eklenen bir ekranda
// unutulurdu. Ayrıca `asortidenetim.js` her çağrı yerinde `olcuTipi` verilmesini zorunlu tutar.
function AsortiUygulaKontrolu({ asortiler, bedenSecenekleri, onUygula, olcuTipi, kalanlar, onBilgi, onAsortiliKoliler }) {
  // Varsayılan olarak listedeki ilk asorti seçili gelir — kullanıcı isterse değiştirebilir.
  const [asortiId, setAsortiId] = useState((asortiler && asortiler[0]) ? asortiler[0].id : "");
  const [setSayisi, setSetSayisi] = useState("1");

  useEffect(() => {
    if (!asortiId && asortiler && asortiler.length > 0) setAsortiId(asortiler[0].id);
  }, [asortiler]);

  if (!asortiler || asortiler.length === 0) return null;
  // 1. süzgeç: ölçü tipi beden değilse asortinin anlamı yok.
  if ((olcuTipi || "Beden") !== "Beden") return null;
  // 2. süzgeç: bedenler tanımlı asortilerin hiçbiriyle kesişmiyorsa Uygula hiçbir kutuyu
  // dolduramaz. Boş bir kontrol göstermek, kullanıcıya çalışmayan bir düğme sunmaktır.
  const olculer = new Set(bedenSecenekleri || []);
  const uygulanabilir = asortiler.some((a) => (a.oranlar || []).some((o) => olculer.has(o.beden)));
  if (!uygulanabilir) return null;

  function uygula() {
    const asorti = asortiler.find((a) => a.id === asortiId);
    if (!asorti) return;
    const carpan = parseFloat(setSayisi) || 0;
    if (carpan <= 0) return;
    const sonuc = {};
    asorti.oranlar.forEach((o) => {
      if (bedenSecenekleri.includes(o.beden)) {
        sonuc[o.beden] = String(o.oran * carpan);
      }
    });
    onUygula(sonuc);
  }

  // TÜM ADETLERİ ASORTİLE (kullanıcı, 19 Eylül: "standart asorti 8'li seçip 'tüm adetleri bu
  // şekilde koli yap' dendiğinde adedi asortileyip artan adetler boşta kalacak şekilde asorti
  // oluştursun; kalanı elle koliye ekleriz").
  //
  // HESAP: her beden için kalan / o bedenin oranı → bunların EN KÜÇÜĞÜ tam set sayısıdır. Bir
  // bedende 3 set yetecek mal varken diğerinde 5 set varsa çıkan asorti 3 settir; fazlası
  // asortiye girmez, hücrelerde kalır. Artanı zorla dağıtmak, asortiyi asorti olmaktan çıkarırdı
  // — koliyi açan kişi beklediği dağılımı bulamazdı.
  function tumunuAsortile() {
    const asorti = asortiler.find((a) => a.id === asortiId);
    if (!asorti || !kalanlar) return;
    let setAdedi = null;
    asorti.oranlar.forEach((o) => {
      if (!bedenSecenekleri.includes(o.beden) || !o.oran) return;
      const kalan = parseFloat(kalanlar[o.beden]) || 0;
      const olabilir = Math.floor(kalan / o.oran);
      setAdedi = setAdedi === null ? olabilir : Math.min(setAdedi, olabilir);
    });
    if (!setAdedi || setAdedi <= 0) {
      if (onBilgi) onBilgi("Kalan adetler bir tam asorti setine yetmiyor — kalanı elle girin");
      return;
    }
    // HER SET AYRI KOLİ (19 Eylül düzeltmesi): asorti koli demek "içinde bir set olan koli".
    // Önce N setin toplamı tek koliye yazılıyordu; koliyi açan üç setlik yığın buluyordu.
    if (onAsortiliKoliler) {
      const birSet = {};
      asorti.oranlar.forEach((o) => {
        if (bedenSecenekleri.includes(o.beden)) birSet[o.beden] = String(o.oran);
      });
      onAsortiliKoliler(setAdedi, birSet);
      return;
    }
    const sonuc = {};
    asorti.oranlar.forEach((o) => {
      if (bedenSecenekleri.includes(o.beden)) sonuc[o.beden] = String(o.oran * setAdedi);
    });
    onUygula(sonuc);
    if (onBilgi) onBilgi(`${setAdedi} set asorti dolduruldu — artan adetler boşta bırakıldı`);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
      <select value={asortiId} onChange={(e) => setAsortiId(e.target.value)} style={{ ...inputStyle, width: 160, fontSize: 12 }}>
        <option value="">Asorti seçin (opsiyonel)…</option>
        {asortiler.map((a) => <option key={a.id} value={a.id}>{a.ad}</option>)}
      </select>
      <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>×</span>
      <input
        type="number" min="1" value={setSayisi} onChange={(e) => setSetSayisi(e.target.value)}
        style={{ ...inputStyle, width: 50, fontSize: 12, padding: "6px 4px", textAlign: "center" }}
      />
      <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>set</span>
      <button type="button" className="btn-ghost" style={{ fontSize: 11, padding: "5px 10px" }} disabled={!asortiId} onClick={uygula}>
        Uygula
      </button>
      {/* Kalan bilgisi verilmişse "tümünü asortile" düğmesi çıkar. */}
      {kalanlar && (
        <button type="button" className="btn-ghost" data-tumunu-asortile="1"
          style={{ fontSize: 11, padding: "5px 10px", borderColor: "var(--erp-primary)", color: "var(--erp-primary)" }}
          disabled={!asortiId} onClick={tumunuAsortile}
          title="Kalan adetleri bu asorti kuralına göre tam setlere böler; HER SET AYRI KOLİ olur, artan adetler boşta kalır">
          {onAsortiliKoliler ? "Asortili koliler kur" : "Tüm adetleri asortile"}
        </button>
      )}
    </div>
  );
}

// Elle girilen beden bazlı miktarların oranı, tanımlı asortilerin HİÇBİRİYLE eşleşmiyorsa
// kullanıcıya bu dağılımı yeni bir asorti olarak kaydetme seçeneği sunar.
function asortiEslesiyorMu(degerler, bedenSecenekleri, asortiler) {
  const girilenBedenler = bedenSecenekleri.filter((b) => (parseFloat(degerler[b]) || 0) > 0);
  if (girilenBedenler.length === 0) return true; // henüz bir şey girilmemiş, teklif göstermeye gerek yok
  return (asortiler || []).some((a) => {
    const aBedenler = a.oranlar.map((o) => o.beden);
    if (aBedenler.length !== girilenBedenler.length) return false;
    if (!girilenBedenler.every((b) => aBedenler.includes(b))) return false;
    let oran = null;
    return girilenBedenler.every((b) => {
      const v = parseFloat(degerler[b]) || 0;
      const o = (a.oranlar.find((x) => x.beden === b) || {}).oran || 0;
      if (o === 0) return false;
      const r = v / o;
      if (oran === null) { oran = r; return true; }
      return Math.abs(r - oran) < 0.001;
    });
  });
}

function AsortiOlusturTeklifi({ degerler, bedenSecenekleri, asortiler, onOlustur }) {
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState("");

  const girilenBedenler = bedenSecenekleri.filter((b) => (parseFloat(degerler[b]) || 0) > 0);
  if (girilenBedenler.length < 2) return null; // tek bedenlik girişten anlamlı bir oran çıkmaz
  if (asortiEslesiyorMu(degerler, bedenSecenekleri, asortiler)) return null;

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  function kaydet() {
    const degerListesi = girilenBedenler.map((b) => Math.round(parseFloat(degerler[b])));
    const ortakBolen = degerListesi.reduce((a, b) => gcd(a, b));
    const oranlar = girilenBedenler.map((b) => ({
      beden: b,
      oran: Math.round(parseFloat(degerler[b])) / (ortakBolen || 1),
    }));
    onOlustur(ad, oranlar);
    setAd("");
    setAcik(false);
  }

  return (
    <div style={{ marginBottom: 8 }}>
      {!acik ? (
        <button type="button" className="btn-ghost" style={{ fontSize: 11, padding: "4px 9px" }} onClick={() => setAcik(true)}>
          Bu dağılımı asorti olarak kaydet
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <input
            autoFocus
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Yeni asorti adı"
            style={{ ...inputStyle, width: 150, fontSize: 12 }}
            onKeyDown={(e) => e.key === "Enter" && ad.trim() && kaydet()}
          />
          <button type="button" className="btn-primary" style={{ fontSize: 11, padding: "5px 10px" }} disabled={!ad.trim()} onClick={kaydet}>
            Kaydet
          </button>
          <button type="button" className="btn-ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => { setAcik(false); setAd(""); }}>
            Vazgeç
          </button>
        </div>
      )}
    </div>
  );
}

// Bir mamul rengi "1001 - Siyah/Beyaz/Kırmızı" (Model Rengi kombinasyonu) formatındaysa, verilen
// sıra numarasındaki (1, 2, 3…) tekil rengi döndürür. Kombinasyon değilse ya da o sıra yoksa null döner.
function kombinasyonRengiCoz(mamulRenk, pozisyonNo) {
  const m = (mamulRenk || "").match(/^.+ - (.+)$/);
  if (!m) return null;
  const renkler = m[1].split("/").map((s) => s.trim());
  return renkler[pozisyonNo - 1] || null;
}

// Bir renk adı "1004 - Kırmızı/Bej" (çok renkli) YA DA "1028 - Siyah" (tek renkli) gibi bir Model
// Rengi kombinasyon ETİKETİ formatındaysa true döner. Serbest metinle "yeni renk" eklerken biri
// yanlışlıkla bu formatta bir isim yazarsa, bu isim TEKİL renkler listesine karışıp "1 renkli" /
// "N renkli" filtrelerinde kombinasyon gibi görünen bir kayıt oluşturabilir — bu yardımcı, bu tür
// kayıtları (tek/çok renkli fark etmeksizin) güvenle dışlamak için kullanılır.
function kombinasyonEtiketiFormatindaMi(ad) {
  return /^\d+\s*-\s*\S/.test((ad || "").trim());
}

// Kaydedilmiş bir "N. Renk" açıklamasını, o satırın mamul rengine göre çözüp gösterilecek metni üretir.
function aciklamaGoster(aciklama, mamulRenk) {
  if (!aciklama) return "";
  const m = aciklama.match(/^(\d+)\. Renk$/);
  if (!m) return aciklama;
  const cozulen = kombinasyonRengiCoz(mamulRenk, parseInt(m[1], 10));
  return cozulen ? `${aciklama} (${cozulen})` : aciklama;
}

function cellKey(renk, beden) {
  return `${renk}__${beden}`;
}


// ---- KAYIT EYLEMLERİ — TEK ŞERİT, HEP SAĞ ÜSTTE ------------------------------------------------
//
// Kullanıcı (7 Eylül): "Silme ve kaydetme butonları tek tip olsun; bazı yerlerde aşağıda,
// bazılarında üstte. Standart olsun, kullanıcı ekranda silme/kaydetme aramasın — hepsi sağ üstte.
// Kaydet, sil, düzenle ikon şeklinde standart olsun."
//
// Uygulamada 23 ayrı "Kaydet" düğmesi vardı, 13 dosyada; kimi formun altında, kimi başlığın
// yanında. Her ekranda düğmeyi ARAMAK gerekiyordu.
//
// Bu bileşen o üç eylemi tek yerde tanımlıyor: aynı sıra, aynı ikonlar, aynı konum.
//
// SIRA SABİT — Düzenle · Kaydet · Sil. Silme EN SAĞDA ve en uçta: yanlışlıkla basma riski en
// yüksek olan eylem, parmağın en az uğradığı köşede dursun. Kaydet ile Sil'i yan yana koymak
// (ikisi de "işi bitiren" eylem gibi göründüğü için) en tehlikeli yerleşim olurdu.
//
// Verilmeyen eylem HİÇ ÇİZİLMİYOR; devre dışı gri bir ikon "neden basamıyorum" sorusu doğurur.
// `duzenleBaslik`: ikon tek başına NEYİ düzenlediğini söylemez. "Düzenle" yazan bir kalem ikonu,
// üç farklı şeyi düzenleyebilecek bir ekranda hangisi olduğunu belirtmiyor — ipucu metni bunu
// taşıyor ve testler de ona bağlanıyor.
function KayitEylemleri({ onDuzenle, onKaydet, onSil, kaydetEtkin = true, silBaslik = "Sil", duzenleBaslik = "Düzenle", boyut = 15 }) {
  if (!onDuzenle && !onKaydet && !onSil) return null;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: "auto" }}>
      {/* KART EYLEM KALIBI (20 Eylül): `data-kart-eylem` işareti — cari ve ürün kartıyla aynı;
          `senaryo-kart-eylemleri` bu işaretle ölçüyor. Sıra sabit: Düzenle · Kaydet · Sil. */}
      {onDuzenle && (
        <button type="button" onClick={onDuzenle} title={duzenleBaslik || "Düzenle · F2"} className="btn-ikon" data-kart-eylem="duzenle">
          <Pencil size={boyut} />
        </button>
      )}
      {onKaydet && (
        <button
          type="button"
          onClick={onKaydet}
          disabled={!kaydetEtkin}
          data-kart-eylem="kaydet"
          title={kaydetEtkin ? "Kaydet · Ctrl+S" : "Kaydedilecek bir değişiklik yok"}
          className="btn-ikon"
          style={{ opacity: kaydetEtkin ? 1 : 0.45, cursor: kaydetEtkin ? "pointer" : "default" }}
        >
          <Check size={boyut} />
        </button>
      )}
      {/* Silme ONAYLI: tek dokunuşla kayıt gitmesin (mevcut `SilOnayButonu` kalıbı). */}
      {onSil && <SilOnayButonu onConfirm={onSil} boyut={boyut} baslikNormal={silBaslik} kartEylemi />}
    </span>
  );
}


// RESİM BÜYÜTME (kullanıcı, 21 Eylül: "resmin üzerine tıklayınca resim büyüsün"). Stok
// katalogundaki büyütmenin ortak hali: tam ekran, kırpmasız (`contain`), dokununca/Esc ile kapanır.
function ResimBuyutucu({ resim, onKapat }) {
  React.useEffect(() => {
    if (!resim) return undefined;
    const d = (e) => { if (e.key === "Escape") { e.stopPropagation(); onKapat(); } };
    window.addEventListener("keydown", d, true);
    return () => window.removeEventListener("keydown", d, true);
  }, [resim, onKapat]);
  if (!resim) return null;
  return (
    <div data-resim-buyuk="1" onClick={onKapat} title="Kapatmak için dokunun"
      style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(30,24,16,.86)", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 20, cursor: "zoom-out" }}>
      <img src={resim.url} alt={resim.ad || ""} style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: "var(--erp-r-md)" }} />
      {resim.ad && <div className="mono" style={{ color: "var(--erp-panel-2)", fontSize: 13 }}>{resim.ad}</div>}
    </div>
  );
}
