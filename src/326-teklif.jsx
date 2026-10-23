// =============================================================================================
// TEKLİF MODÜLÜ (v1.715.0 — kullanıcı, 23 Ekim: "Teklif diye alan ekleyelim, siparişin aynısı ama onaylanınca
// siparişe dönüşecek şekilde")
//
// Teklif, müşteriye verilen fiyat teklifidir: sipariş gibi cari + kalemler (ürün · renk · beden · miktar · fiyat) taşır
// ama SİPARİŞ DEĞİLDİR — stok rezervasyonu yazmaz, planlamaya girmez, cariye borç yazmaz, sevkiyat/depo onu görmez.
// Bu yüzden `siparisler` listesine "Teklif" tipiyle KONMADI: uygulamada 20'den fazla yer `tip !== "Alış"`i "satış
// siparişi" sayıyor (sevkiyat merkezi, teslim, fiş bağı…); teklif oraya sızsaydı bekleyen sevkiyat gibi görünürdü. Teklifler
// kendi tekil tablosunda (`teklifler`, görevler/faturalar kalıbı — bütün liste jsonb) durur; hiçbir eski kod onu okumaz.
//
// Akış: Hazırlanıyor → Gönderildi → (müşteri onayladı) SİPARİŞE DÖNÜŞTÜ ya da Reddedildi. Dönüştürme (100-app
// `teklifiSipariseDonustur`) kalemleri birebir kopyalayıp normal satış siparişi açar (SAT- numarası, "Bekliyor"); o andan
// sonra planlama/rezervasyon/sevkiyat her zamanki yolundan işler. Teklifte `siparisNo` ve siparişte `teklifNo` bağı kalır.
// Geçerlilik tarihi geçmiş açık teklif "Süresi doldu" görünür (türetilir, saklanmaz).
//
// Form sipariş formunun sadeleştirilmiş hâli: ürün (mamul) + renk seçilir, o rengin bedenleri satır satır miktar alır,
// fiyat fiyat kuralından (075 `fiyatBul`: cariye özel → grup → genel) önerilir ve değiştirilebilir. Sipariş formundaki
// asorti, barkod, ambalaj ve kilitli kalem mantığı teklife gerekmiyor; o form 2 600 satır ve siparişe sıkı bağlı,
// teklif kipi eklemek iki ekranı birbirine karıştırırdı.
// =============================================================================================

const TEKLIF_DURUMLARI = ["Hazırlanıyor", "Gönderildi", "Siparişe dönüştü", "Reddedildi"];
const TEKLIF_DURUM_RENK = {
  "Hazırlanıyor": "var(--erp-text-3)", "Gönderildi": "var(--erp-info)", "Siparişe dönüştü": "var(--erp-primary)",
  "Reddedildi": "var(--erp-warn)", "Süresi doldu": "#B8860B",
};
const TEKLIF_VARSAYILAN_GECERLILIK_GUN = 15;

// Sıradaki teklif numarası: kullanılmış en büyük + 1, çöp dahil (060 `sonrakiSiparisNo` ile aynı gerekçe — silinen numara
// geri dönmez). Saf.
function sonrakiTeklifNo(teklifler, cop) {
  const onEk = "TKL-";
  const hepsi = [...(teklifler || []), ...((cop || []).filter((k) => k && k.tur === "teklif" && k.veri).map((k) => k.veri))];
  const enBuyuk = hepsi.reduce((enb, t) => {
    if (!t || typeof t.teklifNo !== "string" || !t.teklifNo.startsWith(onEk)) return enb;
    const n = parseInt(t.teklifNo.slice(onEk.length), 10);
    return Number.isFinite(n) && n > enb ? n : enb;
  }, 1000);
  return onEk + (enBuyuk + 1);
}

// Görünen durum: saklanan durum + geçerlilik. Açık (Hazırlanıyor/Gönderildi) teklifin tarihi geçtiyse "Süresi doldu". Saf.
function teklifDurumu(teklif, bugun) {
  if (!teklif) return "Hazırlanıyor";
  const d = teklif.durum || "Hazırlanıyor";
  if ((d === "Hazırlanıyor" || d === "Gönderildi") && teklif.gecerlilikTarihi && bugun && teklif.gecerlilikTarihi < bugun) return "Süresi doldu";
  return d;
}

// Para birimi başına matrah / KDV / toplam. Saf.
function teklifToplami(teklif) {
  const toplam = {};
  ((teklif && teklif.kalemler) || []).forEach((k) => {
    const pb = k.paraBirimi || "TRY";
    const matrah = (Number(k.miktar) || 0) * (Number(k.birimFiyat) || 0);
    const kdv = matrah * ((Number(k.kdvOrani) || 0) / 100);
    const t = toplam[pb] || (toplam[pb] = { matrah: 0, kdv: 0, toplam: 0, adet: 0 });
    t.matrah += matrah; t.kdv += kdv; t.toplam += matrah + kdv; t.adet += Number(k.miktar) || 0;
  });
  Object.values(toplam).forEach((t) => { t.matrah = Math.round(t.matrah * 100) / 100; t.kdv = Math.round(t.kdv * 100) / 100; t.toplam = Math.round(t.toplam * 100) / 100; });
  return toplam;
}

// TEKLİFİ SİPARİŞE ÇEVİR — saf. Sipariş formunun (325 `siparisKaydet`) ürettiği kaydın aynısı: SAT- numarası, "Bekliyor",
// kalemler yeni kimlikle ve `karsilanan: 0`. Teklifin notu ve müşteri kodu geçer; teklif numarası siparişte `teklifNo`.
// Teslim tarihi teklifte yazıldıysa o, yoksa boş (sipariş kartından girilir).
function teklifiSipariseCevir(teklif, { siparisler, cop, simdi, bugun }) {
  const kalemler = ((teklif && teklif.kalemler) || []).map((k) => ({
    id: uid("kalem"), urunId: k.urunId, urunAd: k.urunAd, renk: k.renk || "", beden: k.beden || "",
    miktar: Number(k.miktar) || 0, karsilanan: 0, birim: k.birim || "çift",
    birimFiyat: Number(k.birimFiyat) || 0, paraBirimi: k.paraBirimi || "TRY",
    ...(k.kdvOrani != null ? { kdvOrani: Number(k.kdvOrani) } : {}),
    ...(k.aciklama ? { aciklama: k.aciklama } : {}),
    ambalaj: null,
  })).filter((k) => k.miktar > 0);
  return {
    id: uid("sip"),
    siparisNo: sonrakiSiparisNo(siparisler, "SAT-", cop),
    tip: "Satış", cariId: teklif.cariId, tarih: bugun, teslimTarihi: teklif.teslimTarihi || "",
    not: teklif.not || "", musteriKodu: teklif.musteriKodu || "",
    ...(teklif.belgeNo ? { belgeNo: teklif.belgeNo } : {}), ...(teklif.sezon ? { sezon: teklif.sezon } : {}),
    kayitParaBirimi: null, kayitKurlari: {},
    durum: "Bekliyor", kalemler,
    defterTercihi: teklif.defterTercihi || "Genel",
    olusturuldu: simdi,
    teklifId: teklif.id, teklifNo: teklif.teklifNo,
  };
}

// Kalem doğrulama — saf. Döner: hata metni ya da null.
function teklifKalemHatasi(kalemler) {
  if (!kalemler || kalemler.length === 0) return "En az 1 kalem ekleyin";
  const bozuk = kalemler.find((k) => !k.urunId || !(Number(k.miktar) > 0));
  if (bozuk) return `${bozuk.urunAd || "Kalem"}: miktar girin`;
  return null;
}

// Ürün+renk grupları (ekran ve çıktı için). Saf.
function teklifKalemGruplari(kalemler) {
  const m = new Map();
  (kalemler || []).forEach((k) => {
    const a = `${k.urunId}|${k.renk || ""}`;
    if (!m.has(a)) m.set(a, { urunId: k.urunId, urunAd: k.urunAd, renk: k.renk || "", birim: k.birim, paraBirimi: k.paraBirimi || "TRY", kalemler: [] });
    m.get(a).kalemler.push(k);
  });
  return [...m.values()].map((g) => ({ ...g, kalemler: g.kalemler.slice().sort((a, b) => bedenSirala([a.beden || "", b.beden || ""])[0] === (a.beden || "") ? -1 : 1) }));
}

const teklifParaYaz = (x, pb) => `${(Number(x) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PARA_SEMBOLU[pb] || pb || ""}`;
function teklifGecerlilikVarsayilani(tarih) {
  const d = new Date(`${tarih || bugunYerel()}T12:00:00`);
  d.setDate(d.getDate() + TEKLIF_VARSAYILAN_GECERLILIK_GUN);
  return bugunYerel(d);
}

// Yazdırılabilir teklif formu (HTML gövdesi; 075 `pdfCiktiBelgesi` sarar). Saf.
function teklifYazdirHtml(teklif, cari, firmaBilgileri, stok) {
  const fb = firmaBilgileri || {};
  const kdvli = kdvAktifMi(fb);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  const gruplar = teklifKalemGruplari(teklif.kalemler);
  const satirlar = gruplar.map((g) => g.kalemler.map((k) => {
    const matrah = (Number(k.miktar) || 0) * (Number(k.birimFiyat) || 0);
    return `<tr><td>${esc(g.urunAd)}</td><td>${esc(g.renk || "—")}</td><td>${esc(k.beden || "—")}</td><td class="sag">${esc(k.miktar)} ${esc(g.birim || "")}</td>`
      + `<td class="sag">${esc(teklifParaYaz(k.birimFiyat, g.paraBirimi))}</td>${kdvli ? `<td class="sag">%${esc(k.kdvOrani != null ? k.kdvOrani : "")}</td>` : ""}<td class="sag">${esc(teklifParaYaz(matrah, g.paraBirimi))}</td></tr>`;
  }).join("")).join("");
  const toplam = teklifToplami(teklif);
  const toplamSatirlari = Object.entries(toplam).map(([pb, t]) => (kdvli
    ? `<tr><td colspan="${kdvli ? 6 : 5}" class="sag">Ara toplam</td><td class="sag">${esc(teklifParaYaz(t.matrah, pb))}</td></tr>`
      + `<tr><td colspan="6" class="sag">KDV</td><td class="sag">${esc(teklifParaYaz(t.kdv, pb))}</td></tr>`
      + `<tr class="kalin"><td colspan="6" class="sag">Genel toplam</td><td class="sag">${esc(teklifParaYaz(t.toplam, pb))}</td></tr>`
    : `<tr class="kalin"><td colspan="5" class="sag">Toplam</td><td class="sag">${esc(teklifParaYaz(t.toplam, pb))}</td></tr>`)).join("");
  const logo = fb.logo ? `<img src="${esc(fb.logo)}" alt="" style="max-height:64px;max-width:200px;object-fit:contain" />` : "";
  return `
<div style="font-family:Arial,sans-serif;font-size:12px;color:#222;padding:24px 28px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid #333;padding-bottom:12px">
    <div>${logo}<div style="font-size:18px;font-weight:700">${esc(fb.unvan || "")}</div>
      <div style="color:#555">${[fb.adres, fb.telefon, fb.email, fb.website].filter(Boolean).map(esc).join(" · ")}</div></div>
    <div style="text-align:right"><div style="font-size:22px;font-weight:700;letter-spacing:.04em">TEKLİF</div>
      <div><b>${esc(teklif.teklifNo)}</b></div><div>Tarih: ${esc(teklif.tarih || "")}</div>
      ${teklif.gecerlilikTarihi ? `<div>Geçerlilik: ${esc(teklif.gecerlilikTarihi)}</div>` : ""}
      ${teklif.teslimTarihi ? `<div>Teslim: ${esc(teklif.teslimTarihi)}</div>` : ""}</div>
  </div>
  <div style="margin:14px 0"><div style="color:#777;font-size:11px;text-transform:uppercase">Sayın</div>
    <div style="font-size:14px;font-weight:700">${esc((cari && (cari.resmiUnvan || cari.unvan)) || "")}</div>
    <div style="color:#555">${[cari && cari.adres, cari && cari.telefon, cari && cari.vergiNo ? `VKN ${cari.vergiNo}` : ""].filter(Boolean).map(esc).join(" · ")}</div>
    ${teklif.musteriKodu ? `<div style="color:#555">Müşteri referansı: ${esc(teklif.musteriKodu)}</div>` : ""}</div>
  <style>.tk th,.tk td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}.tk th{background:#f3f3f3;font-size:11px;text-transform:uppercase}.sag{text-align:right!important}.kalin td{font-weight:700;border-top:2px solid #333}</style>
  <table class="tk" style="width:100%;border-collapse:collapse">
    <thead><tr><th>Ürün</th><th>Renk</th><th>Ölçü</th><th class="sag">Miktar</th><th class="sag">Birim fiyat</th>${kdvli ? "<th class=\"sag\">KDV</th>" : ""}<th class="sag">Tutar</th></tr></thead>
    <tbody>${satirlar}${toplamSatirlari}</tbody>
  </table>
  ${teklif.not ? `<div style="margin-top:14px;white-space:pre-wrap"><b>Not:</b> ${esc(teklif.not)}</div>` : ""}
  <div style="margin-top:28px;color:#777;font-size:11px">Bu teklif ${teklif.gecerlilikTarihi ? `${esc(teklif.gecerlilikTarihi)} tarihine kadar` : "belirtilen süre boyunca"} geçerlidir. Onayınızla sipariş olarak işleme alınır.</div>
</div>`;
}

// ---------------------------------------------------------------------------------------------
function TeklifModule({ teklifler, onSave, siparisler, cariler, stok, firmaBilgileri, tanimlar, showToast, onSipariseDonustur, onSil, onGoToSiparis, onGoToCari, aktifKullanici, cop, hedefTeklifId, onHedefTuketildi }) {
  const bugun = bugunYerel();
  const [durumFiltre, setDurumFiltre] = useState("Açık");
  const [arama, setArama] = useState("");
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [acikId, setAcikId] = useState(null);
  // Form alanları
  const [cariId, setCariId] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [gecerlilikTarihi, setGecerlilikTarihi] = useState(teklifGecerlilikVarsayilani(bugun));
  const [teslimTarihi, setTeslimTarihi] = useState("");
  const [musteriKodu, setMusteriKodu] = useState("");
  const [not, setNot] = useState("");
  const [kalemler, setKalemler] = useState([]);
  // Kalem ekleme satırı
  const [kUrunId, setKUrunId] = useState("");
  const [kRenk, setKRenk] = useState("");
  const [kFiyat, setKFiyat] = useState("");
  const [kParaBirimi, setKParaBirimi] = useState("TRY");
  const [kMiktarlar, setKMiktarlar] = useState({});   // beden -> miktar (metin)
  const [kAciklama, setKAciklama] = useState("");

  const kdvAktif = kdvAktifMi(firmaBilgileri);
  const cariUygun = (cariler || []).filter((c) => (c.tip === "Müşteri" || c.tip === "Her İkisi") && (!c.pasif || c.id === cariId));
  const urunUygun = (stok || []).filter((p) => p.kategori === "Mamul");
  const seciliUrun = urunUygun.find((u) => u.id === kUrunId) || null;
  const urunRenkleri = (u) => Array.from(new Set(((u && u.variants) || []).map((v) => v.renk).filter(Boolean)));
  const urunBedenleri = (u, renk) => bedenSirala(Array.from(new Set(((u && u.variants) || []).filter((v) => !renk || v.renk === renk).map((v) => v.beden || "").filter((b) => b !== ""))));
  const renkler = urunRenkleri(seciliUrun);
  const bedenler = seciliUrun ? urunBedenleri(seciliUrun, kRenk) : [];

  // Hedefe gidiş (anasayfa / cari kartından).
  useEffect(() => {
    if (!hedefTeklifId) return;
    setDurumFiltre("Tümü"); setAcikId(hedefTeklifId);
    if (onHedefTuketildi) onHedefTuketildi();
  }, [hedefTeklifId, onHedefTuketildi]);

  // Ürün/renk/cari değişince fiyat önerisi (fiyat kuralı). Kullanıcı elle yazdıysa ezilmez: öneri yalnız kutu boşken.
  useEffect(() => {
    if (!seciliUrun) return;
    const f = fiyatBul(seciliUrun, kRenk, bedenler[0] || "", cariId, "Satış", cariler);
    setKFiyat(f.fiyat > 0 ? String(f.fiyat) : "");
    setKParaBirimi(["TRY", "USD", "EUR"].includes(f.paraBirimi) ? f.paraBirimi : (paraKoduna(f.paraBirimi) || "TRY"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kUrunId, kRenk, cariId]);

  function formuSifirla() {
    setCariId(""); setTarih(bugun); setGecerlilikTarihi(teklifGecerlilikVarsayilani(bugun)); setTeslimTarihi("");
    setMusteriKodu(""); setNot(""); setKalemler([]); kalemSatiriniSifirla(); setDuzenlenenId(null);
  }
  function kalemSatiriniSifirla() { setKUrunId(""); setKRenk(""); setKFiyat(""); setKMiktarlar({}); setKAciklama(""); }

  function kalemEkle() {
    if (!seciliUrun) return showToast("Ürün seçin");
    if (renkler.length > 0 && !kRenk) return showToast("Renk seçin");
    const fiyat = parseFloat(String(kFiyat).replace(",", ".")) || 0;
    const olculer = bedenler.length ? bedenler : [""];
    const yeniler = olculer
      .map((b) => ({ beden: b, miktar: Number(String(kMiktarlar[b] || "").replace(",", ".")) || 0 }))
      .filter((x) => x.miktar > 0)
      .map((x) => ({
        id: uid("kalem"), urunId: seciliUrun.id, urunAd: seciliUrun.ad, birim: seciliUrun.birim || "çift",
        renk: kRenk || "", beden: x.beden, miktar: x.miktar, birimFiyat: fiyat, paraBirimi: kParaBirimi,
        ...(kdvAktif ? { kdvOrani: urunKdvOrani(seciliUrun, firmaBilgileri) } : {}),
        ...(kAciklama.trim() ? { aciklama: kAciklama.trim() } : {}),
      }));
    if (yeniler.length === 0) return showToast("En az bir ölçüye miktar girin");
    // Aynı ürün+renk+beden zaten varsa miktar üstüne eklenir (sipariş formuyla aynı kural).
    let sonuc = kalemler.slice();
    yeniler.forEach((y) => {
      const i = sonuc.findIndex((k) => k.urunId === y.urunId && k.renk === y.renk && k.beden === y.beden);
      if (i >= 0) sonuc[i] = { ...sonuc[i], miktar: sonuc[i].miktar + y.miktar, birimFiyat: y.birimFiyat, paraBirimi: y.paraBirimi };
      else sonuc.push(y);
    });
    setKalemler(sonuc);
    kalemSatiriniSifirla();
    showToast(`${seciliUrun.ad}${kRenk ? ` · ${kRenk}` : ""}: ${yeniler.length} ölçü eklendi`);
  }
  function grupSil(g) { setKalemler(kalemler.filter((k) => !(k.urunId === g.urunId && (k.renk || "") === g.renk))); }
  function grupFiyatDegistir(g, deger) {
    const f = parseFloat(String(deger).replace(",", ".")) || 0;
    setKalemler(kalemler.map((k) => (k.urunId === g.urunId && (k.renk || "") === g.renk ? { ...k, birimFiyat: f } : k)));
  }
  function kalemMiktarDegistir(id, deger) {
    const m = Number(String(deger).replace(",", ".")) || 0;
    setKalemler(m > 0 ? kalemler.map((k) => (k.id === id ? { ...k, miktar: m } : k)) : kalemler.filter((k) => k.id !== id));
  }

  function duzenle(t) {
    setDuzenlenenId(t.id); setCariId(t.cariId || ""); setTarih(t.tarih || bugun); setGecerlilikTarihi(t.gecerlilikTarihi || "");
    setTeslimTarihi(t.teslimTarihi || ""); setMusteriKodu(t.musteriKodu || ""); setNot(t.not || "");
    setKalemler((t.kalemler || []).map((k) => ({ ...k }))); kalemSatiriniSifirla(); setFormAcik(true);
    setTimeout(() => { const el = typeof document !== "undefined" ? document.getElementById("teklif-form") : null; if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }
  function kopyala(t) {
    setDuzenlenenId(null); setCariId(t.cariId || ""); setTarih(bugun); setGecerlilikTarihi(teklifGecerlilikVarsayilani(bugun));
    setTeslimTarihi(""); setMusteriKodu(t.musteriKodu || ""); setNot(t.not || "");
    setKalemler((t.kalemler || []).map((k) => ({ ...k, id: uid("kalem") }))); kalemSatiriniSifirla(); setFormAcik(true);
    showToast(`${t.teklifNo} kopyalandı — yeni teklif olarak kaydedilecek`);
  }

  function kaydet() {
    if (!cariId) return showToast("Müşteri seçin");
    const hata = teklifKalemHatasi(kalemler);
    if (hata) return showToast(hata);
    if (duzenlenenId) {
      const mevcut = (teklifler || []).find((t) => t.id === duzenlenenId);
      if (!mevcut) return showToast("Teklif bulunamadı");
      if (mevcut.durum === "Siparişe dönüştü") return showToast("Siparişe dönüşmüş teklif düzenlenemez");
      onSave((teklifler || []).map((t) => (t.id !== duzenlenenId ? t : {
        ...t, cariId, tarih, gecerlilikTarihi, teslimTarihi, musteriKodu: musteriKodu.trim(), not: not.trim(), kalemler,
        guncellendi: new Date().toISOString(),
      })));
      showToast(`${mevcut.teklifNo} güncellendi`);
    } else {
      const teklif = {
        id: uid("tkl"), teklifNo: sonrakiTeklifNo(teklifler, cop),
        cariId, tarih, gecerlilikTarihi, teslimTarihi, musteriKodu: musteriKodu.trim(), not: not.trim(),
        durum: "Hazırlanıyor", kalemler, defterTercihi: "Genel",
        olusturuldu: new Date().toISOString(), olusturan: (aktifKullanici && aktifKullanici.ad) || undefined,
      };
      onSave([teklif, ...(teklifler || [])]);
      showToast(`${teklif.teklifNo} oluşturuldu`);
    }
    formuSifirla(); setFormAcik(false);
  }

  function durumDegistir(t, durum, ek = {}) {
    onSave((teklifler || []).map((x) => (x.id === t.id ? { ...x, durum, ...ek, durumZamani: new Date().toISOString() } : x)));
  }
  function yazdir(t) {
    const cari = (cariler || []).find((c) => c.id === t.cariId);
    const w = window.open("", "_blank");
    if (!w) { showToast("Açılır pencere engellendi"); return; }
    w.document.write(pdfCiktiBelgesi(teklifYazdirHtml(t, cari, firmaBilgileri, stok))); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  }
  function donustur(t) {
    const d = teklifDurumu(t, bugun);
    if (d === "Siparişe dönüştü") return showToast(`${t.teklifNo} zaten siparişe dönüştü (${t.siparisNo || ""})`);
    const hata = teklifKalemHatasi(t.kalemler);
    if (hata) return showToast(hata);
    const toplam = teklifToplami(t);
    const ozet = Object.entries(toplam).map(([pb, x]) => teklifParaYaz(x.toplam, pb)).join(" + ");
    if (!window.confirm(`${t.teklifNo} siparişe dönüştürülecek: ${(t.kalemler || []).length} kalem, ${ozet}.\n\nSatış siparişi açılır (SAT- numarası alır), planlama ve rezervasyon o siparişten yürür. Devam?`)) return;
    onSipariseDonustur(t.id);
  }

  const cariAdi = (id) => { const c = (cariler || []).find((x) => x.id === id); return c ? c.unvan : "—"; };
  const q = arama.trim().toLocaleLowerCase("tr-TR");
  const liste = (teklifler || []).filter((t) => {
    const d = teklifDurumu(t, bugun);
    if (durumFiltre === "Açık" && !(d === "Hazırlanıyor" || d === "Gönderildi" || d === "Süresi doldu")) return false;
    if (durumFiltre !== "Açık" && durumFiltre !== "Tümü" && d !== durumFiltre) return false;
    if (!q) return true;
    const metin = [t.teklifNo, cariAdi(t.cariId), t.musteriKodu, t.not, ...(t.kalemler || []).map((k) => `${k.urunAd} ${k.renk}`)].join(" ").toLocaleLowerCase("tr-TR");
    return metin.includes(q);
  });
  const sayilar = TEKLIF_DURUMLARI.concat(["Süresi doldu"]).reduce((m, d) => { m[d] = (teklifler || []).filter((t) => teklifDurumu(t, bugun) === d).length; return m; }, {});
  const acikSayi = sayilar["Hazırlanıyor"] + sayilar["Gönderildi"] + sayilar["Süresi doldu"];

  const kucukInput = { ...inputStyle, padding: "6px 8px", fontSize: 13 };
  const etiket = (m) => <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-3)", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".04em" }}>{m}</div>;

  return (
    <div data-teklif-modulu="1">
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" data-teklif-yeni="1" style={EKLE_DUGMESI} onClick={() => { if (formAcik && !duzenlenenId) { setFormAcik(false); return; } formuSifirla(); setFormAcik(true); }}>
          <Plus size={15} /> {formAcik && !duzenlenenId ? "Formu kapat" : "Yeni Teklif"}
        </button>
        <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Teklif no, müşteri, ürün ara…" data-teklif-arama="1"
          style={{ ...inputStyle, maxWidth: 320, padding: "7px 10px", fontSize: 13 }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["Açık", "Tümü", ...TEKLIF_DURUMLARI, "Süresi doldu"].map((d) => {
            const n = d === "Açık" ? acikSayi : d === "Tümü" ? (teklifler || []).length : sayilar[d];
            const aktif = durumFiltre === d;
            return (
              <button key={d} type="button" data-teklif-durum-filtre={d} onClick={() => setDurumFiltre(d)}
                style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: "var(--erp-r-pill)", cursor: "pointer",
                  border: `1px solid ${aktif ? "var(--erp-text)" : "var(--erp-line)"}`, background: aktif ? "var(--erp-text)" : "#fff", color: aktif ? "#fff" : (TEKLIF_DURUM_RENK[d] || "var(--erp-text-2)") }}>
                {d} {n ? `(${n})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {formAcik && (
        <div id="teklif-form" data-teklif-form="1" style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <b style={{ fontSize: 14 }}>{duzenlenenId ? `Teklifi düzenle — ${((teklifler || []).find((t) => t.id === duzenlenenId) || {}).teklifNo || ""}` : "Yeni teklif"}</b>
            <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => { formuSifirla(); setFormAcik(false); }}>Vazgeç</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "span 2" }}>{etiket("Müşteri")}
              <CariSecici cariler={cariUygun} deger={cariId} onDegis={setCariId} placeholder="Müşteri ara…" veriAdi="data-teklif-cari" />
            </div>
            <div>{etiket("Tarih")}<input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} data-teklif-tarih="1" style={kucukInput} /></div>
            <div>{etiket("Geçerlilik")}<input type="date" value={gecerlilikTarihi} onChange={(e) => setGecerlilikTarihi(e.target.value)} data-teklif-gecerlilik="1" style={kucukInput} /></div>
            <div>{etiket("Teslim (isteğe bağlı)")}<input type="date" value={teslimTarihi} onChange={(e) => setTeslimTarihi(e.target.value)} data-teklif-teslim="1" style={kucukInput} /></div>
            <div>{etiket("Müşteri referansı")}<input value={musteriKodu} onChange={(e) => setMusteriKodu(e.target.value)} placeholder="Müşterinin talep no'su" style={kucukInput} /></div>
          </div>

          {/* KALEM EKLEME: ürün → renk → o rengin ölçüleri miktar kutularıyla; fiyat kuraldan önerilir. */}
          <div style={{ background: "var(--erp-panel)", borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ minWidth: 220, flex: "1 1 220px" }}>{etiket("Ürün")}
                {seciliUrun ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <b data-teklif-secili-urun="1" style={{ fontSize: 13 }}>{seciliUrun.ad}</b>
                    <button type="button" className="btn-ghost" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => { setKUrunId(""); setKRenk(""); setKMiktarlar({}); }}>değiştir</button>
                  </div>
                ) : (
                  <AramaliSecici secenekler={urunUygun.map((u) => ({ deger: u.id, etiket: u.ad }))} onSec={(id) => { setKUrunId(id); setKRenk(""); setKMiktarlar({}); }}
                    placeholder="Ürün ara…" veriAdi="data-teklif-urun" genislik={260} />
                )}
              </div>
              {seciliUrun && renkler.length > 0 && (
                <div style={{ minWidth: 150 }}>{etiket("Renk")}
                  <select value={kRenk} onChange={(e) => { setKRenk(e.target.value); setKMiktarlar({}); }} data-teklif-renk="1" style={kucukInput}>
                    <option value="">Renk seçin</option>
                    {renkler.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              {seciliUrun && (
                <>
                  <div style={{ width: 120 }}>{etiket("Birim fiyat")}
                    <input value={kFiyat} onChange={(e) => setKFiyat(e.target.value)} inputMode="decimal" data-teklif-fiyat="1" style={kucukInput} placeholder="0" />
                  </div>
                  <div style={{ width: 90 }}>{etiket("Para")}
                    <select value={kParaBirimi} onChange={(e) => setKParaBirimi(e.target.value)} style={kucukInput}>
                      {["TRY", "USD", "EUR"].map((pb) => <option key={pb} value={pb}>{PARA_SEMBOLU[pb]} {pb}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            {seciliUrun && (renkler.length === 0 || kRenk) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
                {(bedenler.length ? bedenler : [""]).map((b) => (
                  <div key={b || "tek"} style={{ width: 70 }}>
                    {etiket(b || "Miktar")}
                    <input value={kMiktarlar[b] || ""} onChange={(e) => setKMiktarlar({ ...kMiktarlar, [b]: e.target.value })} inputMode="decimal"
                      data-teklif-miktar={b || "tek"} style={{ ...kucukInput, textAlign: "center" }} placeholder="0"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); kalemEkle(); } }} />
                  </div>
                ))}
                <div style={{ flex: "1 1 160px", minWidth: 160 }}>{etiket("Satır notu")}
                  <input value={kAciklama} onChange={(e) => setKAciklama(e.target.value)} placeholder="isteğe bağlı" style={kucukInput} />
                </div>
                <button type="button" data-teklif-kalem-ekle="1" style={EKLE_DUGMESI} onClick={kalemEkle}><Plus size={14} /> Kalemi ekle</button>
              </div>
            )}
          </div>

          {kalemler.length > 0 && (
            <div data-teklif-kalemler="1" style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              {teklifKalemGruplari(kalemler).map((g) => (
                <div key={`${g.urunId}|${g.renk}`} data-teklif-kalem-grup={`${g.urunAd}|${g.renk}`} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-sm)", padding: "6px 10px" }}>
                  <b style={{ fontSize: 13, minWidth: 160 }}>{g.urunAd}{g.renk ? ` · ${g.renk}` : ""}</b>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                    {g.kalemler.map((k) => (
                      <span key={k.id} className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, background: "var(--erp-panel)", borderRadius: "var(--erp-r-sm)", padding: "2px 6px" }}>
                        {k.beden || "—"}:
                        <input value={k.miktar} onChange={(e) => kalemMiktarDegistir(k.id, e.target.value)} inputMode="decimal" style={{ width: 44, border: "1px solid var(--erp-line)", borderRadius: 4, fontSize: 12, textAlign: "center", padding: "1px 2px" }} />
                      </span>
                    ))}
                  </div>
                  <span className="mono" style={{ fontSize: 12, display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <input value={g.kalemler[0].birimFiyat} onChange={(e) => grupFiyatDegistir(g, e.target.value)} inputMode="decimal" title="Birim fiyat" style={{ width: 80, border: "1px solid var(--erp-line)", borderRadius: 4, fontSize: 12, textAlign: "right", padding: "2px 4px" }} />
                    {PARA_SEMBOLU[g.paraBirimi] || g.paraBirimi}
                  </span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, minWidth: 90, textAlign: "right" }}>
                    {teklifParaYaz(g.kalemler.reduce((t, k) => t + k.miktar * (k.birimFiyat || 0), 0), g.paraBirimi)}
                  </span>
                  <button type="button" title="Satırı çıkar" className="btn-ghost" style={{ padding: "2px 6px" }} onClick={() => grupSil(g)}><X size={13} /></button>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom: 10 }}>{etiket("Not")}
            <textarea value={not} onChange={(e) => setNot(e.target.value)} rows={2} placeholder="Ödeme şartı, teslim koşulu, açıklama…" data-teklif-not="1" style={{ ...kucukInput, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn-primary" data-teklif-kaydet="1" onClick={kaydet} style={{ padding: "8px 18px" }}>
              {duzenlenenId ? "Değişiklikleri kaydet" : "Teklifi kaydet"}
            </button>
            {Object.entries(teklifToplami({ kalemler })).map(([pb, t]) => (
              <span key={pb} className="mono" style={{ fontSize: 13 }}>
                {kdvAktif ? `${teklifParaYaz(t.matrah, pb)} + KDV ${teklifParaYaz(t.kdv, pb)} = ` : ""}<b>{teklifParaYaz(t.toplam, pb)}</b> · {t.adet} {kalemler[0] && kalemler[0].birim}
              </span>
            ))}
          </div>
        </div>
      )}

      {liste.length === 0 ? (
        <EmptyState text={(teklifler || []).length === 0 ? "Henüz teklif yok. \"Yeni Teklif\" ile başlayın." : "Bu süzgeçte teklif yok."} />
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {liste.map((t) => {
            const d = teklifDurumu(t, bugun);
            const acik = acikId === t.id;
            const toplam = teklifToplami(t);
            const adet = (t.kalemler || []).reduce((x, k) => x + (Number(k.miktar) || 0), 0);
            const donusebilir = d === "Hazırlanıyor" || d === "Gönderildi" || d === "Süresi doldu";
            return (
              <div key={t.id} data-teklif-satir={t.teklifNo} style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderLeft: `4px solid ${TEKLIF_DURUM_RENK[d] || "var(--erp-line)"}`, borderRadius: "var(--erp-r-md)" }}>
                <button type="button" onClick={() => setAcikId(acik ? null : t.id)}
                  style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", background: "none", border: "none", padding: "8px 12px", cursor: "pointer", textAlign: "left", flexWrap: "wrap" }}>
                  <b className="mono" style={{ fontSize: 13, minWidth: 84 }}>{t.teklifNo}</b>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: "1 1 160px" }}>{cariAdi(t.cariId)}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{t.tarih}{t.gecerlilikTarihi ? ` → ${t.gecerlilikTarihi}` : ""}</span>
                  <span className="mono" style={{ fontSize: 12 }}>{(t.kalemler || []).length} kalem · {adet} {(t.kalemler || [])[0] ? (t.kalemler[0].birim || "") : ""}</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{Object.entries(toplam).map(([pb, x]) => teklifParaYaz(x.toplam, pb)).join(" + ") || "—"}</span>
                  <span data-teklif-durum={d} style={{ fontSize: 11, fontWeight: 700, color: TEKLIF_DURUM_RENK[d], border: `1px solid ${TEKLIF_DURUM_RENK[d]}`, borderRadius: "var(--erp-r-pill)", padding: "2px 8px" }}>{d}{t.siparisNo ? ` · ${t.siparisNo}` : ""}</span>
                  {acik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {acik && (
                  <div style={{ padding: "0 12px 10px" }}>
                    <table className="mono" style={{ borderCollapse: "collapse", fontSize: 12, width: "100%", marginBottom: 8 }}>
                      <thead><tr style={{ color: "var(--erp-text-3)", textAlign: "left" }}><th style={{ padding: "3px 6px" }}>Ürün</th><th style={{ padding: "3px 6px" }}>Renk</th><th style={{ padding: "3px 6px" }}>Ölçüler</th><th style={{ padding: "3px 6px", textAlign: "right" }}>Fiyat</th><th style={{ padding: "3px 6px", textAlign: "right" }}>Tutar</th></tr></thead>
                      <tbody>
                        {teklifKalemGruplari(t.kalemler).map((g) => (
                          <tr key={`${g.urunId}|${g.renk}`} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                            <td style={{ padding: "3px 6px" }}>{g.urunAd}</td>
                            <td style={{ padding: "3px 6px" }}>{g.renk || "—"}</td>
                            <td style={{ padding: "3px 6px" }}>{g.kalemler.map((k) => `${k.beden || "—"}:${k.miktar}`).join("  ")}</td>
                            <td style={{ padding: "3px 6px", textAlign: "right" }}>{teklifParaYaz(g.kalemler[0].birimFiyat, g.paraBirimi)}</td>
                            <td style={{ padding: "3px 6px", textAlign: "right" }}>{teklifParaYaz(g.kalemler.reduce((x, k) => x + k.miktar * (k.birimFiyat || 0), 0), g.paraBirimi)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {t.not && <div style={{ fontSize: 12, color: "var(--erp-text-2)", whiteSpace: "pre-wrap", marginBottom: 8 }}><b>Not:</b> {t.not}</div>}
                    {t.redSebebi && <div style={{ fontSize: 12, color: "var(--erp-warn)", marginBottom: 8 }}><b>Red sebebi:</b> {t.redSebebi}</div>}
                    <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginBottom: 8 }}>
                      {t.olusturan ? `Hazırlayan: ${t.olusturan} · ` : ""}{t.teslimTarihi ? `Teslim: ${t.teslimTarihi} · ` : ""}{t.musteriKodu ? `Müşteri ref: ${t.musteriKodu}` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {donusebilir && <button type="button" className="btn-primary" data-teklif-donustur="1" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => donustur(t)}><PackageCheck size={13} /> Onaylandı — siparişe dönüştür</button>}
                      {d === "Hazırlanıyor" && <button type="button" className="btn-ghost" data-teklif-gonderildi="1" style={{ fontSize: 12 }} onClick={() => durumDegistir(t, "Gönderildi")}>Gönderildi işaretle</button>}
                      {donusebilir && <button type="button" className="btn-ghost" data-teklif-duzenle="1" style={{ fontSize: 12 }} onClick={() => duzenle(t)}><Pencil size={12} /> Düzenle</button>}
                      {donusebilir && <button type="button" className="btn-ghost" data-teklif-reddet="1" style={{ fontSize: 12, color: "var(--erp-warn)" }} onClick={() => { const s = window.prompt(`${t.teklifNo} reddedildi olarak işaretlenecek. Sebep (isteğe bağlı):`, ""); if (s === null) return; durumDegistir(t, "Reddedildi", { redSebebi: s.trim() }); }}>Reddedildi</button>}
                      {d === "Reddedildi" && <button type="button" className="btn-ghost" data-teklif-yeniden-ac="1" style={{ fontSize: 12 }} onClick={() => durumDegistir(t, "Hazırlanıyor", { redSebebi: undefined })}>Yeniden aç</button>}
                      {t.siparisId && onGoToSiparis && <button type="button" className="btn-ghost" data-teklif-siparise-git="1" style={{ fontSize: 12 }} onClick={() => onGoToSiparis(t.siparisId)}><ArrowRight size={12} /> Siparişe git ({t.siparisNo})</button>}
                      <button type="button" className="btn-ghost" data-teklif-yazdir="1" style={{ fontSize: 12 }} onClick={() => yazdir(t)}><Printer size={12} /> Yazdır</button>
                      <button type="button" className="btn-ghost" data-teklif-kopyala="1" style={{ fontSize: 12 }} onClick={() => kopyala(t)}>Kopyala</button>
                      {onGoToCari && <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => onGoToCari(t.cariId)}>Cari kartı</button>}
                      {d !== "Siparişe dönüştü" && onSil && <button type="button" className="btn-ghost" data-teklif-sil="1" style={{ fontSize: 12, color: "var(--erp-warn)", marginLeft: "auto" }} onClick={() => { if (window.confirm(`${t.teklifNo} silinecek (çöp kutusuna gider). Devam?`)) onSil(t); }}><Trash2 size={12} /> Sil</button>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
