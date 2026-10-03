// ================= FİYAT LİSTESİ (3 Ekim, v1.550.0) =================
//
// Kullanıcı: "Fiyat listesi yapmamız gerekli. Modellerin seçili fiyatları ile alakalı. Örnek Toptan TL
// fiyat seçip filtreleyince modellerin Toptan TL fiyatları çıkmalı, fiyat yoksa boş göstermeli ve aynı
// ekrandan girip düzeltilebilmeli ve kaydedilebilmeli. Bu ekranda farklı kaydet de olmalı. Örnek olarak
// Toptan TL %14 + yapıp o fiyatın üzerine yüzde 14 artırarak veya 10 TL indirim gibi seçeneklerle pratik
// şekilde başka fiyat grubu da oluşturalım."
//
// VERİ YENİ DEĞİL: fiyat grubu Tanımlar'da (`tanimlar.fiyatGruplari`: ad, tip, paraBirimi), ürünün o
// gruptaki fiyatı ürünün `fiyatKurallari`nda (`kapsam: "fiyatGrubu"`, `deger: grupId`). Fiş ve sipariş
// `fiyatBul` ile AYNI kuralı okuyor — bu ekran ayrı bir fiyat deposu açmıyor, var olanı toplu gösterip
// yazıyor. Böylece burada girilen fiyat, gruba atanmış cariye kesilen fişte kendiliğinden gelir.
// "Genel satış / Genel alış" da kaynak olarak seçilebilir (ürün kartındaki satisFiyati / alisFiyati).
//
// Her yazım ürünün `fiyatGecmisi`ne düşer (ürün kartındaki "Fiyat Değişiklik Geçmişi") — kim değiştirdi
// sorusu toplu işlemde de cevapsız kalmasın.

const FL_GENEL_SATIS = "__genelSatis";
const FL_GENEL_ALIS = "__genelAlis";

// Seçilebilir kaynaklar: iki genel fiyat + Tanımlar'daki her fiyat grubu. Saf.
function fiyatListesiKaynaklari(fiyatGruplari) {
  return [
    { key: FL_GENEL_SATIS, ad: "Genel satış fiyatı", tip: "Satış", genel: true, paraBirimi: null },
    { key: FL_GENEL_ALIS, ad: "Genel alış fiyatı", tip: "Alış", genel: true, paraBirimi: null },
    ...(fiyatGruplari || []).map((g) => ({ key: g.id, grupId: g.id, ad: g.ad, tip: g.tip || "Satış", genel: false,
      paraBirimi: alisPbKodu({ alisParaBirimi: g.paraBirimi }) })),
  ];
}

// Grubun ürün üzerindeki kuralı: renk/beden kırılımı OLMAYAN grup kuralı (fiyatBul da onu okuyor).
function flGrupKurali(urun, kaynak) {
  return (urun.fiyatKurallari || []).find((k) => k.kapsam === "fiyatGrubu" && k.deger === kaynak.grupId
    && k.tip === kaynak.tip && !k.renk && !k.beden) || null;
}

// Ürünün seçili kaynaktaki fiyatı. Fiyat yoksa `fiyat: null` (ekranda BOŞ — 0 yazmak "bedava" sanılır).
function urunKaynakFiyati(urun, kaynak) {
  if (!urun || !kaynak) return { fiyat: null, paraBirimi: "TRY" };
  if (kaynak.genel) {
    const satis = kaynak.tip === "Satış";
    const f = parseFloat(satis ? urun.satisFiyati : urun.alisFiyati);
    return { fiyat: f > 0 ? f : null, paraBirimi: alisPbKodu({ alisParaBirimi: satis ? urun.satisParaBirimi : urun.alisParaBirimi }) };
  }
  const k = flGrupKurali(urun, kaynak);
  return {
    fiyat: k && k.fiyat > 0 ? k.fiyat : null,
    // Kural kendi birimini taşır; taşımıyorsa (eski kayıt) grubun birimi.
    paraBirimi: (k && k.paraBirimi) || kaynak.paraBirimi || "TRY",
  };
}

// TOPLU İŞLEM: yüzde ya da tutar, artış ya da indirim, isteğe bağlı yuvarlama adımı. Saf.
//   islem = { tur: "yuzde" | "tutar", yon: 1 | -1, deger, adim }  (adim: 0.01, 0.05, 0.5, 1, 5, 10)
// Sonuç 0 ya da eksiye düşerse null (o ürün yeni listede boş kalır, eksi fiyat yazılmaz).
function fiyatDonustur(fiyat, islem) {
  if (!(fiyat > 0)) return null;
  const d = parseFloat(islem && islem.deger);
  let y = fiyat;
  if (d > 0) y = islem.tur === "tutar" ? fiyat + (islem.yon < 0 ? -d : d) : fiyat * (1 + (islem.yon < 0 ? -d : d) / 100);
  const adim = parseFloat(islem && islem.adim) > 0 ? parseFloat(islem.adim) : 0.01;
  y = Math.round(y / adim) * adim;
  y = Math.round(y * 100) / 100;   // kayan nokta artığı (0.1 + 0.2) temizlensin
  return y > 0 ? y : null;
}

// FİYATLARI KAYNAĞA YAZ. Saf: yeni ürün listesini ve değişen ürün sayısını döndürür.
//   fiyatlar: { urunId: sayı | null }  — null "fiyatı kaldır" demek (grupta kural silinir, genelde 0).
//   s: { zaman, kim, not, paraBirimleri: { urunId: pb } }  — pb verilmezse var olan kuralın birimi, yoksa grubun.
function fiyatListesiYaz(urunler, kaynak, fiyatlar, s = {}) {
  const zaman = s.zaman || new Date().toISOString();
  let degisen = 0;
  const sonuc = (urunler || []).map((u) => {
    if (!Object.prototype.hasOwnProperty.call(fiyatlar, u.id)) return u;
    const yeni = fiyatlar[u.id] > 0 ? Math.round(fiyatlar[u.id] * 100) / 100 : null;
    const eski = urunKaynakFiyati(u, kaynak);
    const pb = (s.paraBirimleri && s.paraBirimleri[u.id]) || null;
    if ((eski.fiyat || null) === yeni && (!pb || pb === eski.paraBirimi)) return u;
    degisen++;
    const log = { id: uid("flog"), tarih: zaman, tip: kaynak.tip,
      etiket: `${kaynak.genel ? kaynak.ad : `Grup: ${kaynak.ad}`} (fiyat listesi${s.not ? ` · ${s.not}` : ""}${s.kim ? ` · ${s.kim}` : ""})`,
      eskiFiyat: eski.fiyat, yeniFiyat: yeni, eskiParaBirimi: eski.fiyat != null ? eski.paraBirimi : null,
      paraBirimi: pb || eski.paraBirimi };
    const gecmis = [log, ...(u.fiyatGecmisi || [])].slice(0, HAREKET_GECMIS_SINIRI);
    if (kaynak.genel) {
      const alan = kaynak.tip === "Satış" ? "satisFiyati" : "alisFiyati";
      const pbAlan = kaynak.tip === "Satış" ? "satisParaBirimi" : "alisParaBirimi";
      return { ...u, [alan]: yeni || 0, ...(pb ? { [pbAlan]: PARA_SEMBOLU[pb] || pb } : {}), fiyatGecmisi: gecmis };
    }
    const kurallar = u.fiyatKurallari || [];
    const mevcut = flGrupKurali(u, kaynak);
    let yeniKurallar;
    if (yeni == null) {
      yeniKurallar = kurallar.filter((k) => !mevcut || k.id !== mevcut.id);
    } else {
      const kural = { ...(mevcut || {}), id: mevcut ? mevcut.id : uid("fkural"), kapsam: "fiyatGrubu", deger: kaynak.grupId,
        tip: kaynak.tip, fiyat: yeni, paraBirimi: pb || (mevcut && mevcut.paraBirimi) || kaynak.paraBirimi || "TRY",
        etiket: kaynak.ad, renk: null, beden: null, kaynak: "fiyatListesi" };
      yeniKurallar = mevcut ? kurallar.map((k) => (k.id === mevcut.id ? kural : k)) : [...kurallar, kural];
    }
    return { ...u, fiyatKurallari: yeniKurallar, fiyatGecmisi: gecmis };
  });
  return { urunler: sonuc, degisen };
}

// FARKLI KAYDET İÇİN BİRİM ÇEVİRME: hedef grubun birimi satırın biriminden farklıysa kurla çevrilir;
// kur yoksa satır atlanır ve sayılır (yanlış birimde fiyat yazmaktansa boş bırakmak). Saf.
function fiyatlariHedefBirime(satirlar, hedefPb, kurlar) {
  const fiyatlar = {}; const paraBirimleri = {}; let cevrilemeyen = 0;
  (satirlar || []).forEach((r) => {
    if (!(r.fiyat > 0)) return;
    if (!hedefPb || r.paraBirimi === hedefPb) { fiyatlar[r.urunId] = r.fiyat; paraBirimleri[r.urunId] = r.paraBirimi; return; }
    const c = fiyatFiseCevir(r.fiyat, r.paraBirimi, hedefPb, kurlar || {});
    if (c.cevrilemedi || !(c.fiyat > 0)) { cevrilemeyen++; return; }
    fiyatlar[r.urunId] = Math.round(c.fiyat * 100) / 100; paraBirimleri[r.urunId] = hedefPb;
  });
  return { fiyatlar, paraBirimleri, cevrilemeyen };
}

function FiyatListesiModule({ stok, tanimlar, kurlar, onStokKaydet, onTanimlarKaydet, showToast, aktifKullanici }) {
  const kaynaklar = fiyatListesiKaynaklari(tanimlar.fiyatGruplari);
  // Varsayılan: ilk SATIŞ fiyat grubu (kullanıcının örneği "Toptan TL"); grup yoksa genel satış.
  const [kaynakKey, setKaynakKey] = useState(() => ((tanimlar.fiyatGruplari || []).find((g) => (g.tip || "Satış") === "Satış") || {}).id || FL_GENEL_SATIS);
  const kaynak = kaynaklar.find((k) => k.key === kaynakKey) || kaynaklar[0];
  const [kategori, setKategori] = useState("Mamul");
  const [arama, setArama] = useState("");
  const [goster, setGoster] = useState("tumu");   // tumu | fiyatli | fiyatsiz
  // Düzenlemeler KAYNAK BAŞINA tutulur: kaynak değiştirince yazılanlar kaybolmasın, karışmasın da.
  const [duzenler, setDuzenler] = useState({});
  const kaynakDuzen = duzenler[kaynak.key] || {};
  const [islem, setIslem] = useState({ tur: "yuzde", yon: 1, deger: "", adim: "0.01" });
  const islemAktif = parseFloat(String(islem.deger).replace(",", ".")) > 0;
  const islemNorm = { ...islem, deger: parseFloat(String(islem.deger).replace(",", ".")) || 0 };
  const [farkli, setFarkli] = useState(null);   // null | { hedef: "yeni" | grupId, ad, paraBirimi }

  const kategoriler = ["Tümü", ...Array.from(new Set((stok || []).map((u) => u.kategori).filter(Boolean)))];
  const q = arama.trim().toLocaleLowerCase("tr-TR");
  const satirlar = (stok || [])
    .filter((u) => kategori === "Tümü" || u.kategori === kategori)
    .filter((u) => !q || [u.ad, u.stokNo, u.kod, u.modelKodu].some((x) => String(x || "").toLocaleLowerCase("tr-TR").includes(q)))
    .map((u) => {
      const k = urunKaynakFiyati(u, kaynak);
      const yazi = Object.prototype.hasOwnProperty.call(kaynakDuzen, u.id) ? kaynakDuzen[u.id] : null;
      const duzen = yazi == null ? null : (yazi.trim() === "" ? null : fiyatSayisi(yazi));
      const gecerli = yazi == null ? k.fiyat : (duzen > 0 ? duzen : null);
      return { urun: u, urunId: u.id, kayitli: k.fiyat, paraBirimi: k.paraBirimi, yazi, degisti: yazi != null && (gecerli || null) !== (k.fiyat || null),
        fiyat: gecerli, yeni: islemAktif ? fiyatDonustur(gecerli, islemNorm) : gecerli };
    })
    .filter((r) => goster === "tumu" || (goster === "fiyatli" ? r.fiyat > 0 : !(r.fiyat > 0)))
    .sort((a, b) => String(a.urun.ad || "").localeCompare(String(b.urun.ad || ""), "tr"));
  const degisenler = satirlar.filter((r) => r.degisti);
  const fiyatliSayi = satirlar.filter((r) => r.fiyat > 0).length;

  const yaz = (id, metin) => setDuzenler((d) => ({ ...d, [kaynak.key]: { ...(d[kaynak.key] || {}), [id]: metin } }));
  const duzenTemizle = () => setDuzenler((d) => ({ ...d, [kaynak.key]: {} }));
  const kim = (aktifKullanici && aktifKullanici.ad) || "";

  // KAYDET: yalnız elle değiştirilen satırlar, seçili kaynağa.
  const kaydet = () => {
    if (degisenler.length === 0) return;
    const fiyatlar = {};
    degisenler.forEach((r) => { fiyatlar[r.urunId] = r.fiyat; });
    const { urunler, degisen } = fiyatListesiYaz(stok, kaynak, fiyatlar, { kim });
    if (degisen) onStokKaydet(urunler);
    duzenTemizle();
    showToast(`${degisen} ürünün "${kaynak.ad}" fiyatı kaydedildi`);
  };

  // TOPLU İŞLEMİ BU LİSTEYE AL: yeni değerler düzenleme olarak yazılır — kullanıcı görür, isterse tek tek
  // düzeltir, sonra Kaydet. Doğrudan yazmıyoruz: yüzlerce fiyatı tek tıkla değiştirmek geri dönüşü zor bir iş.
  const islemiListeyeAl = () => {
    if (!islemAktif) return;
    setDuzenler((d) => {
      const yeni = { ...(d[kaynak.key] || {}) };
      satirlar.forEach((r) => { if (r.fiyat > 0) yeni[r.urunId] = fiyatYazi(r.yeni == null ? "" : r.yeni); });
      return { ...d, [kaynak.key]: yeni };
    });
    setIslem((i) => ({ ...i, deger: "" }));
  };

  // FARKLI KAYDET: ekrandaki fiyatlar (toplu işlem varsa uygulanmış hâli) başka bir gruba — yeni ya da var
  // olan. Yeni grup Tanımlar'a eklenir; birimi farklıysa kurla çevrilir. Yalnız fiyatı OLAN satırlar yazılır,
  // hedef grupta listede görünmeyen (süzgeç dışı) ürünlere dokunulmaz.
  const farkliKaydet = () => {
    if (!farkli) return;
    let hedef;
    let yeniTanimlar = null;
    if (farkli.hedef === "yeni") {
      const ad = (farkli.ad || "").trim();
      if (!ad) { showToast("Yeni fiyat grubunun adını yazın"); return; }
      if ((tanimlar.fiyatGruplari || []).some((g) => g.ad.toLocaleLowerCase("tr-TR") === ad.toLocaleLowerCase("tr-TR"))) {
        showToast(`"${ad}" adında bir fiyat grubu zaten var — listeden seçin ya da başka ad verin`); return;
      }
      const g = { id: uid("fgrup"), ad, tip: kaynak.tip, paraBirimi: farkli.paraBirimi || "TRY" };
      yeniTanimlar = { ...tanimlar, fiyatGruplari: [...(tanimlar.fiyatGruplari || []), g] };
      hedef = fiyatListesiKaynaklari([g])[2];
    } else {
      hedef = kaynaklar.find((k) => k.key === farkli.hedef);
      if (!hedef || hedef.key === kaynak.key) { showToast("Hedef olarak başka bir fiyat grubu seçin"); return; }
    }
    const kaynakSatirlar = satirlar.map((r) => ({ urunId: r.urunId, fiyat: r.yeni, paraBirimi: r.paraBirimi }));
    const { fiyatlar, paraBirimleri, cevrilemeyen } = fiyatlariHedefBirime(kaynakSatirlar, hedef.genel ? null : hedef.paraBirimi, kurlar);
    const not = `${kaynak.ad}${islemAktif ? ` ${islemNorm.yon < 0 ? "−" : "+"}${islemNorm.tur === "yuzde" ? `%${islemNorm.deger}` : islemNorm.deger}` : ""}'dan`;
    const { urunler, degisen } = fiyatListesiYaz(stok, hedef, fiyatlar, { kim, not, paraBirimleri });
    if (yeniTanimlar) onTanimlarKaydet(yeniTanimlar);
    if (degisen) onStokKaydet(urunler);
    setFarkli(null);
    setIslem((i) => ({ ...i, deger: "" }));
    // Kaynak listedeki KAYDEDİLMEMİŞ düzenlemeler silinmez: kaynak başına tutuluyor, geri dönünce yerinde.
    setKaynakKey(hedef.key);   // sonucu hemen görsün
    showToast(`"${hedef.ad}" ${yeniTanimlar ? "oluşturuldu" : "güncellendi"} — ${degisen} ürün fiyatı yazıldı`
      + (cevrilemeyen ? ` · ${cevrilemeyen} ürün kur olmadığı için atlandı` : ""));
  };

  const pbSembol = (pb) => PARA_SEMBOLU[pb] || pb || "";
  const kutu = { ...inputStyle, fontSize: 13 };
  const cip = (aktif) => ({ padding: "5px 11px", fontSize: 12, fontWeight: 700, borderRadius: "var(--erp-r-pill)", cursor: "pointer",
    border: `1.5px solid ${aktif ? "var(--erp-accent)" : "var(--erp-border-2)"}`, background: aktif ? "var(--erp-accent-tint)" : "#fff",
    color: aktif ? "var(--erp-accent)" : "var(--erp-text-2)" });

  return (
    <div data-fiyat-listesi="1">
      {/* ÜST: kaynak + süzgeçler */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)" }}>Fiyat</label>
        <select data-fl-kaynak="1" value={kaynak.key} onChange={(e) => { setKaynakKey(e.target.value); setFarkli(null); }}
          style={{ ...kutu, width: 230, fontWeight: 700 }}>
          {kaynaklar.map((k) => (
            <option key={k.key} value={k.key}>{k.ad}{k.genel ? "" : ` · ${k.tip} · ${pbSembol(k.paraBirimi)}`}</option>
          ))}
        </select>
        <select data-fl-kategori="1" value={kategori} onChange={(e) => setKategori(e.target.value)} style={{ ...kutu, width: 140 }}>
          {kategoriler.map((k) => <option key={k} value={k}>{k === "Tümü" ? "Tüm kategoriler" : k}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          {[["tumu", "Tümü"], ["fiyatli", "Fiyatı olan"], ["fiyatsiz", "Fiyatı boş"]].map(([k, ad]) => (
            <button key={k} type="button" data-fl-goster={k} onClick={() => setGoster(k)} style={cip(goster === k)}>{ad}</button>
          ))}
        </div>
        <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Listede ara…" style={{ ...kutu, width: 180, marginLeft: "auto" }} />
      </div>
      {(tanimlar.fiyatGruplari || []).length === 0 && (
        <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginBottom: 10 }}>
          Henüz fiyat grubu yok — aşağıdan "Farklı kaydet" ile genel fiyattan yeni grup oluşturabilir ya da Tanımlar › Ürün › Fiyat Grupları'ndan açabilirsiniz.
        </div>
      )}

      {/* TOPLU İŞLEM + FARKLI KAYDET */}
      <div data-fl-toplu="1" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "var(--erp-panel)",
        border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "10px 12px", marginBottom: 12 }}>
        <b style={{ fontSize: 12 }}>Toplu işlem:</b>
        <div style={{ display: "flex", gap: 4 }}>
          {[[1, "Artır"], [-1, "İndir"]].map(([yon, ad]) => (
            <button key={yon} type="button" data-fl-yon={yon} onClick={() => setIslem((i) => ({ ...i, yon }))} style={cip(islem.yon === yon)}>{ad}</button>
          ))}
        </div>
        <input data-fl-deger="1" value={islem.deger} inputMode="decimal" placeholder={islem.tur === "yuzde" ? "14" : "10"}
          onChange={(e) => setIslem((i) => ({ ...i, deger: e.target.value }))} style={{ ...kutu, width: 80, textAlign: "right" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[["yuzde", "%"], ["tutar", `Tutar (${pbSembol(kaynak.paraBirimi || "TRY")})`]].map(([tur, ad]) => (
            <button key={tur} type="button" data-fl-tur={tur} onClick={() => setIslem((i) => ({ ...i, tur }))} style={cip(islem.tur === tur)}>{ad}</button>
          ))}
        </div>
        <label style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Yuvarla</label>
        <select data-fl-adim="1" value={islem.adim} onChange={(e) => setIslem((i) => ({ ...i, adim: e.target.value }))} style={{ ...kutu, width: 100 }}>
          {[["0.01", "Kuruş"], ["0.05", "0,05"], ["0.5", "0,50"], ["1", "1"], ["5", "5"], ["10", "10"]].map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
        </select>
        <button type="button" className="btn-ghost" data-fl-listeye-al="1" disabled={!islemAktif} onClick={islemiListeyeAl}
          title="Yeni fiyatları bu listeye yaz (Kaydet'e basılana kadar kaydedilmez)" style={{ padding: "6px 11px", fontSize: 12 }}>
          Bu listeye uygula
        </button>
        <button type="button" className="btn-primary" data-fl-farkli-ac="1"
          onClick={() => setFarkli(farkli ? null : { hedef: "yeni", ad: "", paraBirimi: kaynak.paraBirimi || "TRY" })}
          style={{ padding: "6px 12px", fontSize: 12, marginLeft: "auto" }}>
          <Save size={13} /> Farklı kaydet…
        </button>
        {farkli && (
          <div data-fl-farkli="1" style={{ flexBasis: "100%", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderTop: "1px dashed var(--erp-line)", paddingTop: 8 }}>
            <span style={{ fontSize: 12 }}>
              Ekrandaki {fiyatliSayi} fiyat{islemAktif ? ` (${islemNorm.yon < 0 ? "−" : "+"}${islemNorm.tur === "yuzde" ? `%${islemNorm.deger}` : `${islemNorm.deger} ${pbSembol(kaynak.paraBirimi || "TRY")}`} uygulanmış)` : ""} →
            </span>
            <select data-fl-hedef="1" value={farkli.hedef} onChange={(e) => setFarkli((f) => ({ ...f, hedef: e.target.value }))} style={{ ...kutu, width: 200 }}>
              <option value="yeni">Yeni fiyat grubu…</option>
              {kaynaklar.filter((k) => k.key !== kaynak.key && k.tip === kaynak.tip).map((k) => <option key={k.key} value={k.key}>{k.ad}</option>)}
            </select>
            {farkli.hedef === "yeni" && (
              <>
                <input data-fl-yeni-ad="1" value={farkli.ad} placeholder="Örn. Toptan TL +14" autoFocus
                  onChange={(e) => setFarkli((f) => ({ ...f, ad: e.target.value }))} style={{ ...kutu, width: 190 }} />
                <select data-fl-yeni-pb="1" value={farkli.paraBirimi} onChange={(e) => setFarkli((f) => ({ ...f, paraBirimi: e.target.value }))} style={{ ...kutu, width: 90 }}>
                  {["TRY", "USD", "EUR"].map((pb) => <option key={pb} value={pb}>{pbSembol(pb)} {pb}</option>)}
                </select>
              </>
            )}
            <button type="button" className="btn-primary btn-save" data-fl-farkli-kaydet="1" onClick={farkliKaydet} style={{ padding: "6px 12px", fontSize: 12 }}>
              <Check size={13} /> Grubu kaydet
            </button>
            <button type="button" className="btn-ghost" onClick={() => setFarkli(null)} style={{ padding: "6px 10px", fontSize: 12 }}>Vazgeç</button>
          </div>
        )}
      </div>

      {/* KAYDET ÇUBUĞU — yalnız değişiklik varken */}
      {degisenler.length > 0 && (
        <div data-fl-degisen={degisenler.length} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, padding: "8px 12px",
          background: "var(--erp-accent-tint)", borderRadius: "var(--erp-r-md)", fontSize: 13 }}>
          <b>{degisenler.length} fiyat değişti</b> — "{kaynak.ad}" listesine kaydedilmedi.
          <button type="button" className="btn-primary btn-save" data-fl-kaydet="1" onClick={kaydet} style={{ marginLeft: "auto", padding: "6px 14px" }}>
            <Save size={13} /> Kaydet
          </button>
          <button type="button" className="btn-ghost" data-fl-vazgec="1" onClick={duzenTemizle} style={{ padding: "6px 10px" }}>Vazgeç</button>
        </div>
      )}

      {/* LİSTE */}
      <div style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--erp-panel)", textAlign: "left" }}>
              <th style={{ padding: "8px 10px", width: 90 }}>Stok no</th>
              <th style={{ padding: "8px 10px" }}>Model / ürün</th>
              <th style={{ padding: "8px 10px", width: 100 }}>Kategori</th>
              <th style={{ padding: "8px 10px", width: 150, textAlign: "right" }}>{kaynak.ad}</th>
              {islemAktif && <th style={{ padding: "8px 10px", width: 120, textAlign: "right" }}>Yeni fiyat</th>}
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "var(--erp-text-3)" }}>Bu süzgeçle ürün yok.</td></tr>
            )}
            {satirlar.map((r) => (
              <tr key={r.urunId} data-fl-satir={r.urun.ad} style={{ borderTop: "1px solid var(--erp-line-soft)", background: r.degisti ? "#FFF8E6" : undefined }}>
                <td className="mono" style={{ padding: "6px 10px", fontSize: 11, color: "var(--erp-text-3)" }}>{r.urun.stokNo || "—"}</td>
                <td style={{ padding: "6px 10px", fontWeight: 600 }}>{r.urun.ad}</td>
                <td style={{ padding: "6px 10px", fontSize: 11, color: "var(--erp-text-2)" }}>{r.urun.kategori || ""}</td>
                <td style={{ padding: "4px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                  <input data-fl-fiyat={r.urun.ad} inputMode="decimal"
                    value={r.yazi != null ? r.yazi : fiyatYazi(r.kayitli)}
                    placeholder="—"
                    onChange={(e) => yaz(r.urunId, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && degisenler.length) kaydet(); }}
                    style={{ ...kutu, width: 100, textAlign: "right", padding: "5px 8px", fontWeight: r.degisti ? 800 : 600,
                      borderColor: r.degisti ? "var(--erp-warn)" : undefined }} />
                  <span style={{ marginLeft: 5, fontSize: 12, color: "var(--erp-text-2)" }}>{pbSembol(r.paraBirimi)}</span>
                </td>
                {islemAktif && (
                  <td data-fl-yeni={r.urun.ad} className="mono" style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: "var(--erp-accent)" }}>
                    {r.yeni > 0 ? `${r.yeni.toFixed(2).replace(".", ",")} ${pbSembol(r.paraBirimi)}` : ""}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginTop: 6 }}>
        {satirlar.length} ürün · {fiyatliSayi} fiyatlı · boş kutu = bu listede fiyatı yok (yazıp Kaydet'e basın; kutuyu boşaltmak fiyatı kaldırır).
        Fiş ve siparişte bu fiyat, gruba atanmış cariye kendiliğinden gelir.
      </div>
    </div>
  );
}
