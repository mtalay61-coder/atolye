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
// MALİYET KAYNAĞI (v1.551.0): reçeteli üründe tam maliyet, reçetesizde (dışarıdan alınan) alış fiyatı — TL.
// SALT OKUNUR: maliyet ürün kartında hesaplanır; buradan yalnız üzerine kâr koyup "Farklı kaydet" ile satış
// fiyatı (grup ya da genel) üretilir.
const FL_MALIYET = "__maliyet";

// Seçilebilir kaynaklar: iki genel fiyat + Tanımlar'daki her fiyat grubu. Saf.
function fiyatListesiKaynaklari(fiyatGruplari) {
  return [
    { key: FL_GENEL_SATIS, ad: "Genel satış fiyatı", tip: "Satış", genel: true, paraBirimi: null },
    { key: FL_GENEL_ALIS, ad: "Genel alış fiyatı", tip: "Alış", genel: true, paraBirimi: null },
    { key: FL_MALIYET, ad: "Maliyet (reçete / alış)", tip: "Maliyet", maliyet: true, genel: false, paraBirimi: "TRY" },
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
// `ctx` yalnız maliyet kaynağında gerekir (urunMaliyetHesabi bağlamı: tumUrunler, kurlar, tanımlar…).
function urunKaynakFiyati(urun, kaynak, ctx) {
  if (!urun || !kaynak) return { fiyat: null, paraBirimi: "TRY" };
  if (kaynak.maliyet) {
    const hesap = urunMaliyetHesabi(urun, ctx || {});
    return { fiyat: hesap.tamTL, paraBirimi: "TRY", hesap };
  }
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
  // Maliyet hesaplanan bir değer, yazılacak yeri yok (kart hesaplar).
  if (!kaynak || kaynak.maliyet) return { urunler, degisen: 0 };
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

function FiyatListesiModule({ stok, tanimlar, kurlar, cariler, kurGecmisi, onStokKaydet, onTanimlarKaydet, showToast, aktifKullanici }) {
  const kaynaklar = fiyatListesiKaynaklari(tanimlar.fiyatGruplari);
  const maliyetCtx = { tumUrunler: stok, tanimlarProsesler: tanimlar.prosesler || [], tanimlarAraProsesler: tanimlar.araProsesler || [],
    kurlar, cariler: cariler || [], kurGecmisi: kurGecmisi || [], aylikUretimHedefi: tanimlar.aylikUretimHedefi, genelGiderler: tanimlar.genelGiderler };
  // Maliyet kaynağında varsayılan: yalnız "Maliyet OK" olanlar — onaylanmamış maliyetin üstüne fiyat kurmayalım.
  const [yalnizOk, setYalnizOk] = useState(true);
  // Varsayılan: ilk SATIŞ fiyat grubu (kullanıcının örneği "Toptan TL"); grup yoksa genel satış.
  const [kaynakKey, setKaynakKey] = useState(() => ((tanimlar.fiyatGruplari || []).find((g) => (g.tip || "Satış") === "Satış") || {}).id || FL_GENEL_SATIS);
  const kaynak = kaynaklar.find((k) => k.key === kaynakKey) || kaynaklar[0];
  const [kategori, setKategori] = useState("Mamul");
  const [arama, setArama] = useState("");
  const [ozelSecim, setOzelSecim] = useState({});   // { alanId: değer }
  const [buyukResim, setBuyukResim] = useState(null);   // { src, ad }
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
  // ÖZEL KOD SÜZGECİ (v1.553.0, 008): kategoriye uyan ürünlerde dolu olan her özel kod alanı bir seçim kutusu.
  // Arama kutusu da özel kod değerlerini tarar ("Sezon 2026" gibi).
  const ozelAlanlar = tanimlar.ozelKodAlanlari || [];
  const kategoridekiler = (stok || []).filter((u) => kategori === "Tümü" || u.kategori === kategori);
  const ozelSecenekler = ozelKodSecenekleri(kategoridekiler, ozelAlanlar);
  const satirlar = kategoridekiler
    .filter((u) => ozelKodSuzgeceUyar(u, ozelAlanlar, ozelSecim))
    .filter((u) => !q || [u.ad, u.stokNo, u.kod, u.modelKodu, ozelKodMetni(u, ozelAlanlar)].some((x) => String(x || "").toLocaleLowerCase("tr-TR").includes(q)))
    .map((u) => {
      const k = urunKaynakFiyati(u, kaynak, maliyetCtx);
      const yazi = !kaynak.maliyet && Object.prototype.hasOwnProperty.call(kaynakDuzen, u.id) ? kaynakDuzen[u.id] : null;
      const duzen = yazi == null ? null : (yazi.trim() === "" ? null : fiyatSayisi(yazi));
      const gecerli = yazi == null ? k.fiyat : (duzen > 0 ? duzen : null);
      return { urun: u, urunId: u.id, kayitli: k.fiyat, paraBirimi: k.paraBirimi, yazi, hesap: k.hesap || null,
        onay: k.hesap ? maliyetOnayDurumu(u, k.hesap) : null, degisti: yazi != null && (gecerli || null) !== (k.fiyat || null),
        fiyat: gecerli, yeni: islemAktif ? fiyatDonustur(gecerli, islemNorm) : gecerli };
    })
    .filter((r) => goster === "tumu" || (goster === "fiyatli" ? r.fiyat > 0 : !(r.fiyat > 0)))
    .filter((r) => !kaynak.maliyet || !yalnizOk || (r.onay && r.onay.durum === "ok"))
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
      const g = { id: uid("fgrup"), ad, tip: farkli.tip || "Satış", paraBirimi: farkli.paraBirimi || "TRY" };
      yeniTanimlar = { ...tanimlar, fiyatGruplari: [...(tanimlar.fiyatGruplari || []), g] };
      hedef = fiyatListesiKaynaklari([g]).find((k) => k.grupId === g.id);   // sıraya değil kimliğe bak
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
          style={{ ...kutu, width: 270, fontWeight: 700 }}>
          {kaynaklar.map((k) => (
            <option key={k.key} value={k.key}>{k.ad}{k.genel || k.maliyet ? "" : ` · ${k.tip} · ${pbSembol(k.paraBirimi)}`}</option>
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
        {kaynak.maliyet && (
          <button type="button" data-fl-yalniz-ok={yalnizOk ? "1" : "0"} onClick={() => setYalnizOk((x) => !x)} style={cip(yalnizOk)}
            title="Ürün kartı › Maliyet'te 'Maliyet OK' denmiş ve o günden beri maliyeti değişmemiş ürünler">
            {yalnizOk ? "✓ " : ""}Yalnız Maliyet OK
          </button>
        )}
        <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Listede ara…" style={{ ...kutu, width: 180, marginLeft: "auto" }} />
      </div>
      {ozelSecenekler.length > 0 && (
        <div data-fl-ozel-kodlar="1" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: -4, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)" }}>Özel kod</span>
          {ozelSecenekler.map((a) => (
            <select key={a.id} data-fl-ozel-kod={a.ad} value={ozelSecim[a.id] || ""}
              onChange={(e) => setOzelSecim((s) => ({ ...s, [a.id]: e.target.value }))}
              style={{ ...kutu, width: "auto", minWidth: 130, fontWeight: ozelSecim[a.id] ? 700 : 400,
                borderColor: ozelSecim[a.id] ? "var(--erp-accent)" : undefined }}>
              <option value="">{a.ad}: Tümü</option>
              {a.degerler.map((d) => <option key={d} value={d}>{a.ad}: {d}</option>)}
            </select>
          ))}
          {Object.values(ozelSecim).some(Boolean) && (
            <button type="button" className="btn-ghost" data-fl-ozel-temizle="1" onClick={() => setOzelSecim({})} style={{ padding: "4px 10px", fontSize: 12 }}>
              Süzgeci temizle
            </button>
          )}
        </div>
      )}
      {buyukResim && (
        <div data-fl-resim-buyuk="1" onClick={() => setBuyukResim(null)}
          style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(34,27,20,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <div style={{ background: "#fff", borderRadius: "var(--erp-r-lg)", padding: 10, maxWidth: "90vw", maxHeight: "90vh", textAlign: "center" }}>
            <img src={buyukResim.src} alt={buyukResim.ad} style={{ maxWidth: "85vw", maxHeight: "80vh", objectFit: "contain", display: "block" }} />
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{buyukResim.ad}</div>
          </div>
        </div>
      )}
      {(tanimlar.fiyatGruplari || []).length === 0 && (
        <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginBottom: 10 }}>
          Henüz fiyat grubu yok — aşağıdan "Farklı kaydet" ile genel fiyattan yeni grup oluşturabilir ya da Tanımlar › Ürün › Fiyat Grupları'ndan açabilirsiniz.
        </div>
      )}

      {/* TOPLU İŞLEM + FARKLI KAYDET */}
      <div data-fl-toplu="1" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "var(--erp-panel)",
        border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "10px 12px", marginBottom: 12 }}>
        <b style={{ fontSize: 12 }}>{kaynak.maliyet ? "Kâr ekle:" : "Toplu işlem:"}</b>
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
        <button type="button" className="btn-ghost" data-fl-listeye-al="1" disabled={!islemAktif || kaynak.maliyet} onClick={islemiListeyeAl}
          title="Yeni fiyatları bu listeye yaz (Kaydet'e basılana kadar kaydedilmez)" style={{ padding: "6px 11px", fontSize: 12 }}>
          Bu listeye uygula
        </button>
        <button type="button" className="btn-primary" data-fl-farkli-ac="1"
          onClick={() => setFarkli(farkli ? null : { hedef: "yeni", ad: "", paraBirimi: kaynak.paraBirimi || "TRY",
            // Maliyetten ve alıştan SATIŞ fiyatı üretilir (kullanıcı: "alış fiyatından satış fiyatı yapalım").
            tip: kaynak.maliyet || kaynak.tip === "Alış" ? "Satış" : kaynak.tip })}
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
              {kaynaklar.filter((k) => k.key !== kaynak.key && !k.maliyet).map((k) => <option key={k.key} value={k.key}>{k.ad}{k.genel ? "" : ` · ${k.tip}`}</option>)}
            </select>
            {farkli.hedef === "yeni" && (
              <>
                <input data-fl-yeni-ad="1" value={farkli.ad} placeholder="Örn. Toptan TL +14" autoFocus
                  onChange={(e) => setFarkli((f) => ({ ...f, ad: e.target.value }))} style={{ ...kutu, width: 190 }} />
                <select data-fl-yeni-tip="1" value={farkli.tip} onChange={(e) => setFarkli((f) => ({ ...f, tip: e.target.value }))} style={{ ...kutu, width: 90 }}>
                  {["Satış", "Alış"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
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
              <th style={{ padding: "8px 6px", width: 52 }}></th>
              <th style={{ padding: "8px 10px", width: 90 }}>Stok no</th>
              <th style={{ padding: "8px 10px" }}>Model / ürün</th>
              <th style={{ padding: "8px 10px", width: 100 }}>Kategori</th>
              {kaynak.maliyet && <th style={{ padding: "8px 10px", width: 210 }}>Maliyet durumu</th>}
              <th style={{ padding: "8px 10px", width: 150, textAlign: "right" }}>{kaynak.maliyet ? "Maliyet" : kaynak.ad}</th>
              {islemAktif && <th style={{ padding: "8px 10px", width: 120, textAlign: "right" }}>Yeni fiyat</th>}
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "var(--erp-text-3)" }}>Bu süzgeçle ürün yok.</td></tr>
            )}
            {satirlar.map((r) => (
              <tr key={r.urunId} data-fl-satir={r.urun.ad} style={{ borderTop: "1px solid var(--erp-line-soft)", background: r.degisti ? "#FFF8E6" : undefined }}>
                <td style={{ padding: "4px 6px" }}>
                  {(() => {
                    // STOK RESMİ (v1.553.0): kapak, yoksa ilk renk resmi; tıklayınca büyür.
                    const g = urunGorselleri(r.urun);
                    const src = g ? (g.kapakResmi || Object.values(g.renkResimleri)[0]) : "";
                    return src
                      ? <img src={src} alt={r.urun.ad} data-fl-resim={r.urun.ad} onClick={() => setBuyukResim({ src, ad: r.urun.ad })}
                          style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "var(--erp-r-sm)", border: "1px solid var(--erp-line-soft)", cursor: "zoom-in", display: "block" }} />
                      : <div style={{ width: 40, height: 40, borderRadius: "var(--erp-r-sm)", background: "var(--erp-panel)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--erp-text-3)" }}><ImageIcon size={16} /></div>;
                  })()}
                </td>
                <td className="mono" style={{ padding: "6px 10px", fontSize: 11, color: "var(--erp-text-3)" }}>{r.urun.stokNo || "—"}</td>
                <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                  {r.urun.ad}
                  {/* Özel kodlar adın altında küçük: süzerken neyle süzüldüğü görünsün. */}
                  {ozelKodCiftleri(r.urun, ozelAlanlar).length > 0 && (
                    <div data-fl-ozel-satir="1" style={{ fontSize: 10, fontWeight: 400, color: "var(--erp-text-3)", marginTop: 1 }}>
                      {ozelKodCiftleri(r.urun, ozelAlanlar).map((c) => `${c.etiket}: ${c.deger}`).join(" · ")}
                    </div>
                  )}
                </td>
                <td style={{ padding: "6px 10px", fontSize: 11, color: "var(--erp-text-2)" }}>{r.urun.kategori || ""}</td>
                {kaynak.maliyet && (
                  <td data-fl-maliyet-durum={r.urun.ad} style={{ padding: "6px 10px", fontSize: 11 }}>
                    {r.onay.durum === "ok" && <span style={{ color: "var(--erp-ok)", fontWeight: 700 }}>✓ OK · {new Date(r.onay.tarih).toLocaleDateString("tr-TR")}</span>}
                    {r.onay.durum === "eskidi" && <span style={{ color: "var(--erp-warn)", fontWeight: 700 }} title="Onaydan sonra maliyet değişti — ürün kartında yeniden onaylayın">⚠ değişti · onay {new Date(r.onay.tarih).toLocaleDateString("tr-TR")}</span>}
                    {r.onay.durum === "yok" && <span style={{ color: "var(--erp-text-3)" }}>onaylanmadı</span>}
                    <span style={{ color: "var(--erp-text-3)" }}> · {r.hesap.tur === "alis" ? "alış" : r.hesap.tur === "recete" ? "reçete" : "—"}</span>
                    {r.hesap.eksikler.length > 0 && <span title={r.hesap.eksikler.join("\n")} style={{ color: "var(--erp-warn)" }}> · {r.hesap.eksikler.length} eksik</span>}
                  </td>
                )}
                <td style={{ padding: "4px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                  <input data-fl-fiyat={r.urun.ad} inputMode="decimal" readOnly={!!kaynak.maliyet}
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
        {kaynak.maliyet ? (
          <>{satirlar.length} ürün · maliyet TL, ürün kartında hesaplanır (reçeteli: reçete + işçilik + genel gider; reçetesiz: alış fiyatı) —
            buradan değiştirilmez. Onay ürün kartı › Maliyet › "Maliyet OK". Kâr ekleyip "Farklı kaydet" ile satış fiyatı yazın.</>
        ) : (
          <>{satirlar.length} ürün · {fiyatliSayi} fiyatlı · boş kutu = bu listede fiyatı yok (yazıp Kaydet'e basın; kutuyu boşaltmak fiyatı kaldırır).
            Fiş ve siparişte bu fiyat, gruba atanmış cariye kendiliğinden gelir.</>
        )}
      </div>
    </div>
  );
}
