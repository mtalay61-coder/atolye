// ================= ÜRETİM FİŞLERİ → GELİR/GİDER KARTI (v1.692) =================
//
// Kullanıcı: "Üretim fişleri gelir giderden bağlanması gerekiyor, rapor alırken karşılık olarak denge
// sağlanması için. Kesim için yapılan işçiliği kesim işçiliği giderine bağlayacağız, hangi prosesin hangi
// gidere bağlanacağı seçilecek. Üretim hammadde çıkışı da bir gidere bağlanmalı — boşa giden hiçbir fiş
// olmaması gerekir."
//
// BAĞ TANIMDA, FİŞTE DEĞİL: `tanimlar.prosesGiderKartlari` { [proses adı]: kartId } ve
// `tanimlar.hammaddeCikisGiderKartId`. Fişlere kart kimliği YAZILMAZ — bağ sonradan kurulsa da değişse de
// geçmiş fişler hemen doğru karta düşer (bölüm maaşının `bolumId` ile bağlanması gibi, 015 maasGiderKarti).
//
// İŞÇİLİK: proses `-<Proses>-İşçilik` fiş ekinden okunur (hareket proses alanı taşımıyor). Bağlı işçilik
// Kâr/Zarar'da "Üretim işçiliği" satırından çıkıp kartın grubunda gider olarak görünür — çift sayım yok.
//
// HAMMADDE ÇIKIŞI: üretimde tüketilen hammadde (stok hareketi, kaynak "Üretim", eksi miktar; iade artı) ×
// hammadde birim fiyatı (maliyetle aynı `hammaddeBirimFiyati`). Kartın ekstresinde ve toplamında görünür;
// Kâr/Zarar'a AYRICA eklenmez: satılan malın maliyeti (SMM) bu hammaddeyi zaten içeriyor, eklemek iki kez
// düşmek olurdu. Kart "karşılık"tır: tüketim nereye gitti sorusunun cevabı.

// ANA + ARA PROSESLER (v1.694, kullanıcı: "ara proseslere de aynı şekilde olması gerekli"): ara proses işçiliği de
// `<sipariş>-<AraProses>-İşçilik` fişiyle yazılır; aynı bağ tablosu (prosesGiderKartlari) ikisini de tutar.
function tumProsesTanimlari(tanimlar) {
  return [...((tanimlar && tanimlar.prosesler) || []), ...((tanimlar && tanimlar.araProsesler) || [])];
}
function iscilikFisProsesi(fisNo, prosesler) {
  const f = String(fisNo || "");
  if (!/-İşçilik$/.test(f)) return "";
  const govde = f.slice(0, -"-İşçilik".length);
  // En uzun eşleşen proses adı (ör. "Üste ve Temizleme" ile "Temizleme" ikisi de tanımlıysa uzunu).
  const adaylar = (prosesler || []).map((p) => p.ad || p).filter(Boolean).sort((a, b) => b.length - a.length);
  const bulunan = adaylar.find((ad) => govde.endsWith(`-${ad}`));
  if (bulunan) return bulunan;
  const i = govde.lastIndexOf("-");
  return i >= 0 ? govde.slice(i + 1) : "";
}
function iscilikGiderKarti(tanimlar, h) {
  const proses = iscilikFisProsesi(h && h.fisNo, tumProsesTanimlari(tanimlar));
  const id = proses && ((tanimlar && tanimlar.prosesGiderKartlari) || {})[proses];
  return (id && ((tanimlar && tanimlar.giderKartlari) || []).find((k) => k.id === id)) || null;
}
function hammaddeCikisGiderKarti(tanimlar) {
  const id = tanimlar && tanimlar.hammaddeCikisGiderKartId;
  return (id && ((tanimlar && tanimlar.giderKartlari) || []).find((k) => k.id === id)) || null;
}
// Bağa bakmadan bütün üretim işçiliği cari hareketleri (maaş hariç) — karşılıksız sayımı ve kart ekstresi için.
function uretimIscilikHareketleri(cariler) {
  const l = [];
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
    if (h.fisNo && /-İşçilik$/.test(h.fisNo)) l.push({ ...h, cariUnvan: c.unvan });
  }));
  return l;
}
// Üretim hammadde çıkışları — fiş başına bir satır (tutar TL). Mamul girişi (-Giriş) sayılmaz.
function uretimHammaddeCikislari(stok, kurlar) {
  const fisler = {};
  (stok || []).forEach((p) => {
    if (p.kategori === "Mamul") return;
    (p.hareketler || []).forEach((h) => {
      if (h.kaynak !== "Üretim" || !h.fisNo || /-Giriş$/.test(h.fisNo)) return;
      const m = -(parseFloat(h.miktar) || 0);
      if (!m) return;
      let tl = 0;
      try { tl = (hammaddeBirimFiyati(p, h.renk, h.beden, kurlar || {}) || {}).tl || 0; } catch (e) { tl = 0; }
      const f = fisler[h.fisNo] || (fisler[h.fisNo] = { fisNo: h.fisNo, tarih: String(h.tarih || "").slice(0, 10), tutar: 0, kalem: 0, siparisNo: h.siparisNo });
      f.tutar += m * tl;
      f.kalem += 1;
    });
  });
  return Object.values(fisler);
}
// Kartın üretim karşılıkları — 396 kart ekstresine eklenir (yon Çıkış = gider).
function kartUretimHareketleri(tanimlar, cariler, stok, kurlar, kartId) {
  const liste = [];
  uretimIscilikHareketleri(cariler).forEach((h) => {
    const k = iscilikGiderKarti(tanimlar, h);
    if (k && k.id === kartId) liste.push({ ...h, yon: "Çıkış", paraBirimi: h.paraBirimi || "TRY", hesapAd: `İşçilik tahakkuku · ${h.cariUnvan}`, uretimKarsiligi: true });
  });
  stokKartHareketleri(tanimlar, stok, kurlar, kartId).forEach((h) => liste.push(h));
  satisAlisKartHareketleri(tanimlar, cariler, kurlar, kartId).forEach((h) => liste.push(h));
  const hk = hammaddeCikisGiderKarti(tanimlar);
  if (hk && hk.id === kartId) {
    uretimHammaddeCikislari(stok, kurlar).forEach((f) => liste.push({ id: `uhc-${f.fisNo}`, fisNo: f.fisNo, tarih: f.tarih, tutar: Math.round(f.tutar * 100) / 100,
      yon: "Çıkış", paraBirimi: "TRY", hesapAd: `Hammadde çıkışı · ${f.kalem} kalem`, aciklama: `Üretim ${f.siparisNo || ""} hammadde tüketimi`, uretimKarsiligi: true }));
  }
  return liste;
}
// Karşılığı olmayan üretim fişleri (bağ kurulmamış).
function karsiliksizUretimFisleri(tanimlar, cariler, stok, kurlar) {
  const iscilik = uretimIscilikHareketleri(cariler).filter((h) => !iscilikGiderKarti(tanimlar, h));
  const prosesler = Array.from(new Set(iscilik.map((h) => iscilikFisProsesi(h.fisNo, tumProsesTanimlari(tanimlar))).filter(Boolean)));
  const hammadde = hammaddeCikisGiderKarti(tanimlar) ? [] : uretimHammaddeCikislari(stok, kurlar);
  const kv = (id) => id && ((tanimlar && tanimlar.giderKartlari) || []).some((k) => k.id === id);
  const manuel = stokManuelFisleri(stok, kurlar);
  const stokSayisi = manuel.filter((f) => (f.giris > 0 && !kv(tanimlar && tanimlar.stokGirisGelirKartId)) || (f.cikis > 0 && !kv(tanimlar && tanimlar.stokCikisGiderKartId))).length;
  const satisAlisSayisi = satisAlisFisleri(cariler, kurlar).filter((f) => !kv(f.tip === "Satış" ? (tanimlar && tanimlar.satisGelirKartId) : (tanimlar && tanimlar.alisGiderKartId))).length;
  // MAAŞ (v1.697): bölümünün gider kartı olmayan maaş fişleri (015 maasGiderKarti).
  let maasSayisi = 0;
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
    if ((maasHareketiMi(h)) && !maasGiderKarti(tanimlar, h)) maasSayisi++;
  }));
  return { iscilikSayisi: iscilik.length, prosesler, hammaddeSayisi: hammadde.length, stokSayisi, satisAlisSayisi, maasSayisi };
}

// Gelir/Gider ekranındaki bağlantı paneli.
// TOPLU VE SÜZÜLEN (v1.695, kullanıcı: "bu ekranı toparlamak lazım, filtreli, yazınca daralan liste şeklinde"): başlık
// tıklanınca açılır/kapanır (kapalı başlar, cihazda hatırlanır); kapalıyken özet (kaç bağ, kaç karşılıksız). Açıkken arama
// kutusu satırları hem sol etikete hem bağlı karta göre süzer; satırlar iki sütunlu sıkı ızgarada.
function UretimGiderBaglari({ tanimlar, onSave, cariler, stok, kurlar }) {
  const kartlar = (tanimlar && tanimlar.giderKartlari) || [];
  const giderKartlari = kartlar.filter((k) => (k.tur || "gider") !== "gelir");
  const gelirKartlari = kartlar.filter((k) => (k.tur || "gider") === "gelir");
  const bag = (tanimlar && tanimlar.prosesGiderKartlari) || {};
  const [acik, setAcik] = useState(() => { try { return localStorage.getItem("ugb-acik") === "1"; } catch (e) { return false; } });
  const [ara, setAra] = useState("");
  const ac = (v) => { setAcik(v); try { localStorage.setItem("ugb-acik", v ? "1" : "0"); } catch (e) { /* yoksay */ } };
  // Hem tanımlı prosesler hem işçilik fişlerinde geçen (tanımdan silinmiş olabilir) prosesler.
  const fisProsesleri = uretimIscilikHareketleri(cariler).map((h) => iscilikFisProsesi(h.fisNo, tumProsesTanimlari(tanimlar))).filter(Boolean);
  const prosesler = Array.from(new Set([...tumProsesTanimlari(tanimlar).map((p) => p.ad).filter(Boolean), ...fisProsesleri]));
  const eksik = karsiliksizUretimFisleri(tanimlar, cariler, stok, kurlar);
  const set = (alan) => (v) => onSave({ ...tanimlar, [alan]: v || null });
  const satirlar = [
    ...prosesler.map((p) => ({ grup: "İşçilik", etiket: `${p} işçiliği`, deger: bag[p], veri: p,
      onDegis: (v) => onSave({ ...tanimlar, prosesGiderKartlari: { ...bag, [p]: v || undefined } }) })),
    // MAAŞ BÖLÜM BAŞINA (v1.697, kullanıcı: "maaşlar bölüm başına ayrılsın, kesimhane maaşı gibi"): her atölye içi bölümün
    // maaşı kendi kartına. Bağ kartın `bolumId` alanında (015 bolumGiderKarti) — seçilen kart bölüme bağlanır, eskisi çözülür.
    ...((tanimlar && tanimlar.bolumler) || []).map((b) => ({ grup: "Maaş", etiket: `${b.ad} maaşları`, deger: (bolumGiderKarti(tanimlar, b) || {}).id, veri: `maas-${b.ad}`,
      onDegis: (v) => onSave({ ...tanimlar, giderKartlari: kartlar.map((k) => (k.id === v ? { ...k, bolumId: b.id } : k.bolumId === b.id ? { ...k, bolumId: undefined } : k)) }) })),
    { grup: "Stok", etiket: "Üretim hammadde çıkışı", deger: tanimlar && tanimlar.hammaddeCikisGiderKartId, veri: "hammadde-cikisi", onDegis: set("hammaddeCikisGiderKartId") },
    { grup: "Stok", etiket: "Stok girişi (bağımsız)", deger: tanimlar && tanimlar.stokGirisGelirKartId, veri: "stok-girisi", gelirMi: true, onDegis: set("stokGirisGelirKartId") },
    { grup: "Stok", etiket: "Stok çıkışı (bağımsız)", deger: tanimlar && tanimlar.stokCikisGiderKartId, veri: "stok-cikisi", onDegis: set("stokCikisGiderKartId") },
    { grup: "Fiş", etiket: "Satış fişleri", deger: tanimlar && tanimlar.satisGelirKartId, veri: "satis-fisleri", gelirMi: true, onDegis: set("satisGelirKartId") },
    { grup: "Fiş", etiket: "Alış fişleri", deger: tanimlar && tanimlar.alisGiderKartId, veri: "alis-fisleri", onDegis: set("alisGiderKartId") },
  ];
  const kartAdi = (id) => ((kartlar.find((k) => k.id === id) || {}).ad) || "";
  const nrm = (x) => String(x || "").toLocaleLowerCase("tr-TR");
  const q = nrm(ara.trim());
  const gorunen = satirlar.filter((r) => !q || nrm(r.etiket).includes(q) || nrm(kartAdi(r.deger)).includes(q) || nrm(r.grup).includes(q));
  const bagli = satirlar.filter((r) => r.deger && kartlar.some((k) => k.id === r.deger)).length;
  const karsiliksiz = eksik.iscilikSayisi + eksik.hammaddeSayisi + eksik.stokSayisi + eksik.satisAlisSayisi + eksik.maasSayisi;
  return (
    <div data-uretim-gider-baglari style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14, background: "#fff" }}>
      <button type="button" data-ugb-baslik={acik ? "acik" : "kapali"} onClick={() => ac(!acik)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        {acik ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--erp-text)" }}>Fişlerin gelir / gider karşılığı</span>
        <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{bagli}/{satirlar.length} bağlı</span>
        {karsiliksiz > 0 && <span data-karsiliksiz-uretim style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)" }}>⚠ {karsiliksiz} karşılıksız fiş</span>}
      </button>
      {acik && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 8px", lineHeight: 1.5 }}>
            İşçilik, hammadde çıkışı, bağımsız stok giriş/çıkışı, satış ve alış fişleri bir karta bağlanır; kart ekstresinde ve toplamında
            görünür, bağ geçmiş fişler için de geçerlidir. Bağlı işçilik ve bağımsız stok giriş/çıkışı Kâr/Zarar'a girer; hammadde çıkışı,
            satış ve alış Kâr/Zarar'da zaten (ciro / satılan malın maliyeti) sayıldığından ikinci kez eklenmez.
          </p>
          {karsiliksiz > 0 && (
            <div style={{ padding: "6px 10px", marginBottom: 8, borderRadius: "var(--erp-r-md)", border: "1.5px solid var(--erp-warn)", background: "var(--erp-orange-bg)", color: "var(--erp-warn)", fontSize: 12, fontWeight: 600 }}>
              ⚠ Karşılığı olmayan fiş: {[eksik.iscilikSayisi && `${eksik.iscilikSayisi} işçilik (${eksik.prosesler.join(", ")})`, eksik.hammaddeSayisi && `${eksik.hammaddeSayisi} hammadde çıkışı`,
                eksik.stokSayisi && `${eksik.stokSayisi} stok giriş/çıkış`, eksik.satisAlisSayisi && `${eksik.satisAlisSayisi} satış/alış`, eksik.maasSayisi && `${eksik.maasSayisi} maaş (bölümü ya da bölüm kartı yok)`].filter(Boolean).join(" · ")}
            </div>
          )}
          <input data-ugb-ara value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ara: proses, kart adı, stok, satış…"
            style={{ ...inputStyle, width: "100%", maxWidth: 360, marginBottom: 8, fontSize: 13 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "4px 16px", maxHeight: 420, overflowY: "auto" }}>
            {gorunen.map((r) => (
              <div key={r.veri} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", borderBottom: "1px solid var(--erp-line-soft)" }}>
                <span style={{ flex: "1 1 0", minWidth: 0, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.etiket}>{r.etiket}</span>
                <select value={r.deger || ""} data-uretim-gider-bag={r.veri} onChange={(e) => r.onDegis(e.target.value)}
                  style={{ ...inputStyle, width: 190, fontSize: 12, padding: "3px 6px", borderColor: r.deger ? "var(--erp-line)" : "var(--erp-warn)" }}>
                  <option value="">— bağlı değil —</option>
                  {(r.gelirMi ? gelirKartlari : giderKartlari).map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
                </select>
              </div>
            ))}
            {gorunen.length === 0 && <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>Eşleşen satır yok.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// OTOMATİK KART (v1.693, kullanıcı: "gider kartlarını otomatik oluştur prosesler için, bunu tanımlar prosese ekle").
// Bağı olmayan (ya da bağlı kartı silinmiş) her prosese "<Proses> işçiliği" kartı: aynı adlı kart varsa o bağlanır,
// yoksa Üretim grubunda açılır. Hammadde çıkışı için "Üretim hammadde gideri". Kullanıcının elle kurduğu bağa
// dokunulmaz. Değişiklik yoksa AYNI nesne döner (çağıran yazıp yazmayacağını buna bakarak bilir).
function prosesKartAdi(proses) { return `${proses} işçiliği`; }
function prosesGiderKartlariniTamamla(tanimlar) {
  const prosesler = Array.from(new Set(tumProsesTanimlari(tanimlar).map((p) => p.ad).filter(Boolean)));
  if (!prosesler.length) return tanimlar;
  let kartlar = tanimlar.giderKartlari || [];
  const bag = { ...(tanimlar.prosesGiderKartlari || {}) };
  let hamId = tanimlar.hammaddeCikisGiderKartId || null;
  let degisti = false;
  const gruplar = giderGelirGruplari(tanimlar);
  const grup = gruplar.find((g) => g.key === "uretim") || gruplar.find((g) => g.tur !== "gelir") || gruplar[0] || { key: "uretim", tur: "gider", tdhp: "730" };
  const kartBulAc = (ad) => {
    const var_ = kartlar.find((k) => kodEsit(k.ad, ad));
    if (var_) return var_.id;
    const yeni = { id: uid("gkart"), ad, grup: grup.key, tur: grup.tur, tdhp: grup.tdhp };
    kartlar = [...kartlar, yeni];
    return yeni.id;
  };
  prosesler.forEach((p) => {
    if (bag[p] && kartlar.some((k) => k.id === bag[p])) return;
    bag[p] = kartBulAc(prosesKartAdi(p));
    degisti = true;
  });
  if (!hamId || !kartlar.some((k) => k.id === hamId)) { hamId = kartBulAc("Üretim hammadde gideri"); degisti = true; }
  // Bağımsız stok giriş/çıkış kartları (v1.694): giriş "Diğer gelir" grubunda gelir kartı.
  let sgId = tanimlar.stokGirisGelirKartId || null, scId = tanimlar.stokCikisGiderKartId || null;
  if (!sgId || !kartlar.some((k) => k.id === sgId)) {
    const gg = gruplar.find((g) => g.tur === "gelir") || { key: "gelir", tur: "gelir", tdhp: "649" };
    const var_ = kartlar.find((k) => kodEsit(k.ad, "Stok girişi (sayım fazlası)"));
    if (var_) sgId = var_.id; else { const y = { id: uid("gkart"), ad: "Stok girişi (sayım fazlası)", grup: gg.key, tur: gg.tur, tdhp: gg.tdhp }; kartlar = [...kartlar, y]; sgId = y.id; }
    degisti = true;
  }
  if (!scId || !kartlar.some((k) => k.id === scId)) { scId = kartBulAc("Stok çıkışı (fire / sayım eksiği)"); degisti = true; }
  // Satış / alış fişleri (v1.695): satış "Diğer gelir" grubunda gelir kartı, alış Üretim grubunda gider kartı.
  let saId = tanimlar.satisGelirKartId || null, alId = tanimlar.alisGiderKartId || null;
  if (!saId || !kartlar.some((k) => k.id === saId)) {
    const gg = gruplar.find((g) => g.tur === "gelir") || { key: "gelir", tur: "gelir", tdhp: "649" };
    const var_ = kartlar.find((k) => kodEsit(k.ad, "Satış gelirleri"));
    if (var_) saId = var_.id; else { const y = { id: uid("gkart"), ad: "Satış gelirleri", grup: gg.key, tur: gg.tur, tdhp: "600" }; kartlar = [...kartlar, y]; saId = y.id; }
    degisti = true;
  }
  if (!alId || !kartlar.some((k) => k.id === alId)) { alId = kartBulAc("Alışlar (mal ve hammadde)"); degisti = true; }
  // SATIŞLAR GRUBU (v1.696, kullanıcı: "satışlar ayrı Satışlar grubunda görünsün"): gelir türünde "Satışlar" grubu (600)
  // açılır ve satış kartı oraya alınır. BİR KEZ (`satisGrubuKuruldu`): kullanıcı kartı sonra başka gruba taşırsa geri çekilmez.
  let gruplarYeni = null;
  if (!tanimlar.satisGrubuKuruldu) {
    const mevcutGruplar = giderGelirGruplari(tanimlar);
    const sg = mevcutGruplar.find((g) => g.key === "satislar" || kodEsit(g.ad, "Satışlar"));
    const grupKey = sg ? sg.key : "satislar";
    if (!sg) gruplarYeni = [...mevcutGruplar, { key: "satislar", ad: "Satışlar", tur: "gelir", tdhp: "600" }];
    kartlar = kartlar.map((k) => (k.id === saId ? { ...k, grup: grupKey, tur: "gelir" } : k));
    degisti = true;
  }
  return degisti ? { ...tanimlar, ...(gruplarYeni ? { giderGruplari: gruplarYeni } : {}), satisGrubuKuruldu: true,
    giderKartlari: kartlar, prosesGiderKartlari: bag, hammaddeCikisGiderKartId: hamId, stokGirisGelirKartId: sgId, stokCikisGiderKartId: scId, satisGelirKartId: saId, alisGiderKartId: alId } : tanimlar;
}

// Sistemin kendiliğinden açtığı kart mı (proses işçiliği, hammadde çıkışı, bölüm)?
function otomatikGiderKartiMi(tanimlar, k) {
  if (!k) return false;
  if (k.bolumId) return true;
  if (tanimlar && [tanimlar.hammaddeCikisGiderKartId, tanimlar.stokGirisGelirKartId, tanimlar.stokCikisGiderKartId, tanimlar.satisGelirKartId, tanimlar.alisGiderKartId].includes(k.id)) return true;
  return Object.values((tanimlar && tanimlar.prosesGiderKartlari) || {}).includes(k.id);
}

// ================= BAĞIMSIZ STOK GİRİŞ / ÇIKIŞ → GELİR / GİDER KARTI (v1.694) =================
// Kullanıcı: "Stok çıkış ve girişini de gelir gidere bağlayalım; 100 farklı ürün girişi ve çıkışı olduğunda tek gelir
// ve gider olarak yazabiliriz." Bağımsız Stok Girişi/Çıkışı (MNL- fişi; sayım fazlası/eksiği, fire, numune) cari
// karşılığı olmayan tek stok hareketidir. Ürün ne olursa olsun hepsi TEK karta: girişler `stokGirisGelirKartId`
// (gelir), çıkışlar `stokCikisGiderKartId` (gider). Tutar = miktar × birim fiyat (maliyetle aynı `hammaddeBirimFiyati`).
// Açılış (ACILIS-) devirdir, gelir/gider değildir — sayılmaz. Bunlar SMM'de olmadığı için Kâr/Zarar'a da girer.
function stokManuelFisleri(stok, kurlar) {
  const fisler = {};
  (stok || []).forEach((p) => (p.hareketler || []).forEach((h) => {
    if (h.kaynak !== "Manuel" || !/^MNL-/.test(String(h.fisNo || ""))) return;
    const m = parseFloat(h.miktar) || 0;
    if (!m) return;
    let tl = 0;
    try { tl = (hammaddeBirimFiyati(p, h.renk, h.beden, kurlar || {}) || {}).tl || 0; } catch (e) { tl = 0; }
    const f = fisler[h.fisNo] || (fisler[h.fisNo] = { fisNo: h.fisNo, tarih: String(h.tarih || "").slice(0, 10), giris: 0, cikis: 0, urunler: new Set() });
    if (m > 0) f.giris += m * tl; else f.cikis += -m * tl;
    f.urunler.add(p.ad);
  }));
  return Object.values(fisler).map((f) => ({ ...f, urunSayisi: f.urunler.size, urunler: undefined }));
}
function stokKartHareketleri(tanimlar, stok, kurlar, kartId) {
  const gi = tanimlar && tanimlar.stokGirisGelirKartId, ci = tanimlar && tanimlar.stokCikisGiderKartId;
  if (kartId !== gi && kartId !== ci) return [];
  const l = [];
  stokManuelFisleri(stok, kurlar).forEach((f) => {
    if (kartId === gi && f.giris > 0) l.push({ id: `sg-${f.fisNo}`, fisNo: f.fisNo, tarih: f.tarih, tutar: Math.round(f.giris * 100) / 100, yon: "Giriş", paraBirimi: "TRY", hesapAd: `Stok girişi · ${f.urunSayisi} ürün`, aciklama: "Bağımsız stok girişi", uretimKarsiligi: true });
    if (kartId === ci && f.cikis > 0) l.push({ id: `sc-${f.fisNo}`, fisNo: f.fisNo, tarih: f.tarih, tutar: Math.round(f.cikis * 100) / 100, yon: "Çıkış", paraBirimi: "TRY", hesapAd: `Stok çıkışı · ${f.urunSayisi} ürün`, aciklama: "Bağımsız stok çıkışı", uretimKarsiligi: true });
  });
  return l;
}
// Kâr/Zarar için dönem toplamları (tarih süzgeci dışarıdan).
function stokManuelToplamlari(tanimlar, stok, kurlar, tarihUygun) {
  const gk = ((tanimlar && tanimlar.giderKartlari) || []);
  const giris = gk.find((k) => k.id === (tanimlar && tanimlar.stokGirisGelirKartId)) || null;
  const cikis = gk.find((k) => k.id === (tanimlar && tanimlar.stokCikisGiderKartId)) || null;
  let g = 0, c = 0;
  stokManuelFisleri(stok, kurlar).forEach((f) => { if (tarihUygun && !tarihUygun(f.tarih)) return; g += f.giris; c += f.cikis; });
  return { girisKart: giris, cikisKart: cikis, giris: g, cikis: c };
}

// ================= SATIŞ / ALIŞ FİŞLERİ → GELİR / GİDER KARTI (v1.695) =================
// Kullanıcı: "Satış ve alış fişlerini de gelir gidere bağlayalım" (ilke: "her hareketin cari, tutar veya fiş karşılığı
// olmak zorunda"). Satış fişleri (SF-/SAT-) `satisGelirKartId` gelir kartına, alış fişleri (AF-/ALS-) `alisGiderKartId`
// gider kartına — fiş başına bir satır, tutar cari hareketlerinin toplamı (TL'ye çevrilmiş). Kâr/Zarar'a EKLENMEZ: satış
// zaten "Satış geliri", alış da stoğa girip satılınca SMM olarak sayılıyor; kart karşılık ve döküm içindir.
function satisAlisFisTipi(fisNo) {
  const f = String(fisNo || "");
  if (f.startsWith("SF-") || f.startsWith("SAT-")) return "Satış";
  if (f.startsWith("AF-") || f.startsWith("ALS-")) return "Alış";
  return "";
}
function satisAlisFisleri(cariler, kurlar) {
  const fisler = {};
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
    const tip = satisAlisFisTipi(h.fisNo);
    if (!tip) return;
    const pb = h.paraBirimi || "TRY";
    const kur = pb === "TRY" ? 1 : ((kurlar || {})[pb] || 1);
    const f = fisler[h.fisNo] || (fisler[h.fisNo] = { fisNo: h.fisNo, tip, tarih: String(h.tarih || "").slice(0, 10), tutar: 0, cari: c.unvan });
    f.tutar += (parseFloat(h.tutar) || 0) * kur;
  }));
  return Object.values(fisler);
}
function satisAlisKartHareketleri(tanimlar, cariler, kurlar, kartId) {
  const si = tanimlar && tanimlar.satisGelirKartId, ai = tanimlar && tanimlar.alisGiderKartId;
  if (kartId !== si && kartId !== ai) return [];
  return satisAlisFisleri(cariler, kurlar)
    .filter((f) => (f.tip === "Satış" && kartId === si) || (f.tip === "Alış" && kartId === ai))
    .map((f) => ({ id: `sa-${f.fisNo}`, fisNo: f.fisNo, tarih: f.tarih, tutar: Math.round(f.tutar * 100) / 100, yon: f.tip === "Satış" ? "Giriş" : "Çıkış",
      paraBirimi: "TRY", hesapAd: `${f.tip} fişi · ${f.cari}`, aciklama: `${f.tip} fişi`, uretimKarsiligi: true }));
}
