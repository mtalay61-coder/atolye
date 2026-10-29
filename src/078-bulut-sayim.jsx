// =============================================================================================
// BULUT SAYIMI + SUNUCU ARŞİVİNDEN GERİ YÜKLEME (v1.712.0)
//
// Kullanıcı (19 Ekim): "Üretim fişleri silindi, talep de görünüyor 10033 nolu üretime ait, çok sıkı kontrol
// etmemiz gerekiyor, bu çok önemli. Bunun yüzünden hâlâ kullanmaya başlamadım!" Ekranda üretim listesi boş, stok
// hareketleri 0, varyant miktarları 0 — ama rezervasyon hâlâ 10033'ü gösteriyordu. İlk soru "veri bulutta gerçekten
// silindi mi, yoksa bu cihaz mı eksik okudu?" idi ve uygulamada bunu söyleyen tek bir ekran yoktu.
//
// Üç parça:
//   1. `supabaseSatirSayisi`: tabloyu İNDİRMEDEN satır sayısı (HEAD + `Prefer: count=exact`, Content-Range'den okunur).
//   2. `cihazSayimlari` / `sayimKarsilastir` (saf): ekrandaki sayılar ile bulut sayıları yan yana, arşivdeki (son 30
//      gün silinen) sayıyla birlikte. "Bulutta var, cihazda yok" → cihaz bayat (sayfayı yenile); "cihazda var, bulutta
//      yok" → bulutta silinmiş; "arşivde var" → geri yüklenebilir.
//   3. `arsivSatirlariniGeriYukle`: sunucu arşivindeki (silinen-arsiv.sql, `to_jsonb(OLD)`) satırlar olduğu gibi tabloya
//      geri yazılır (upsert). Satır bütün sütunlarıyla saklandığı için fiş numarası, sürüm, ek alanlar aynen döner.
//      Üst tablo önce (üretim → iş ataması, ürün → hareket): alt satır üstü olmadan yazılamaz (FK).
// Bulut sayımı ve geri yükleme yalnız Yönetici'ye açık (Tanımlar › Bakım). Geri yükleme kullanıcı onayıyla ve günlüğe
// yazarak yapılır; sonra sayfa yenilenir — ekrandaki (eksik) hâlle yazmaya devam etmek, geri geleni yine silebilirdi.
// =============================================================================================

// Sayım tabloları ve sıralama: üst tablolar önce (geri yükleme sırası da bu).
const SAYIM_TABLOLARI = [
  "urunler", "varyantlar", "stok_hareketleri", "cariler", "cari_hareketleri", "siparisler", "siparis_kalemleri",
  "uretim", "uretim_atamalari", "stok_rezervasyonlari", "onaylar", "cop",
];
const ARSIV_GERI_YUKLEME_SIRASI = [
  "urunler", "cariler", "siparisler", "uretim",
  "varyantlar", "stok_hareketleri", "cari_hareketleri", "siparis_kalemleri", "uretim_atamalari",
  "stok_rezervasyonlari", "onaylar", "cop",
];

// Ekrandaki (bu cihaz) kayıt sayıları — saf.
function cihazSayimlari({ stok, cariler, siparisler, uretim, stokRezervasyonlari, onaylar, cop } = {}) {
  const topla = (liste, cikar) => (liste || []).reduce((t, k) => t + (k ? cikar(k).length : 0), 0);
  return {
    urunler: (stok || []).length,
    varyantlar: topla(stok, (u) => u.variants || []),
    stok_hareketleri: topla(stok, (u) => u.hareketler || []),
    cariler: (cariler || []).length,
    cari_hareketleri: topla(cariler, (c) => c.hareketler || []),
    siparisler: (siparisler || []).length,
    siparis_kalemleri: topla(siparisler, (s) => s.kalemler || []),
    // Üretim listesi verilmediyse (v1.729.1 öncesi Tanımlar) 0 değil "bilinmiyor": sahte "bulutta fazla" çıkmasın.
    uretim: Array.isArray(uretim) ? uretim.length : null,
    uretim_atamalari: Array.isArray(uretim) ? topla(uretim, (u) => (u.prosesIlerleme || []).flatMap((p) => (p && p.atamalar) || [])) : null,
    stok_rezervasyonlari: (stokRezervasyonlari || []).length,
    onaylar: (onaylar || []).length,
    cop: (cop || []).length,
  };
}

// Cihaz / bulut / arşiv sayılarını satırlara çevirir — saf. `bulut[t]` sayı ya da null (okunamadı).
function sayimKarsilastir(cihaz, bulut, arsiv30) {
  return SAYIM_TABLOLARI.map((tablo) => {
    const cHam = (cihaz || {})[tablo];
    const c = Number(cHam) || 0;
    const bHam = (bulut || {})[tablo];
    const b = bHam == null ? null : Number(bHam) || 0;
    const a = Number((arsiv30 || {})[tablo]) || 0;
    let durum = "okunamadı";
    if (cHam === null) durum = "bu cihazın sayısı bu ekranda bilinmiyor";
    else if (b != null) {
      if (b === c) durum = "aynı";
      else if (b > c) durum = `bulutta ${b - c} fazla — bu cihaz eksik/bayat, sayfayı yenileyin`;
      else durum = `cihazda ${c - b} fazla — bulutta silinmiş olabilir${a > 0 ? ` (arşivde ${a} silinmiş satır var)` : ""}`;
    }
    return { tablo, ad: ARSIV_TABLO_ADLARI[tablo] || tablo, cihaz: cHam === null ? null : c, bulut: b, arsiv30: a, durum };
  });
}

// Content-Range: "0-0/1234" ya da "*/0". Sayı sondaki parça.
function contentRangeSayisi(deger) {
  const m = String(deger || "").match(/\/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

// Tabloyu indirmeden satır sayısı. HEAD + count=exact; Range 0-0 ile tek satırlık pencere.
async function supabaseSatirSayisi(tablo, sorgu = "select=id") {
  const yanit = await fetch(`${SUPABASE_URL}/rest/v1/${tablo}?${sorgu}`, {
    method: "HEAD",
    headers: { ...(await yetkiBasliklari()), Prefer: "count=exact", Range: "0-0" },
  });
  if (!yanit.ok && yanit.status !== 206) throw new Error(`${tablo}: HTTP ${yanit.status}`);
  const n = contentRangeSayisi(yanit.headers.get("content-range"));
  if (n == null) throw new Error(`${tablo}: sayı okunamadı`);
  return n;
}

// SÜTUNU FARKLI TABLOLAR (v1.729.0 — kullanıcı, 29 Ekim ekran görüntüsü: "Ürün varyantı · okunamadı — varyantlar: HTTP 400").
// Stok v2 geçişinden sonra `varyantlar` bir görünüm ve `id` sütunu yok (varyantın kimliği ürün + renk + beden); `select=id`
// PostgREST'te 400 döner. Sayım yalnız satır sayar, hangi sütunun istendiği önemsiz — var olan bir sütun yeter.
const SAYIM_SORGUSU = { varyantlar: "select=urun_id" };

// HANGİ KAYIT FARKLI (v1.729.0 — kullanıcı, 29 Ekim: "Üretim · bu cihaz 0, bulut 1 · İş ataması 0 / 2"; "bu sorun son
// güncellemelerden önce de vardı"). Sayı farkı "bir şey ters" der ama neyin ters olduğunu söylemez; kod okumasıyla kesin
// sebep bulunamadı. Ana tablolarda fark varsa buluttaki kimlikler (ve okunur bir ad) indirilir, bu cihazdakilerle karşılaştırılır:
//   · bulutta olup bu cihazda olmayan kayıt — ve bu cihazın bekleyen kayıt defterinde (025) o kayıt için "sil" var mı
//     (cihaz silmiş, silme buluta gitmemiş) ya da yok mu (cihaz hiç görmemiş / okurken düşürmüş),
//   · bu cihazda olup bulutta olmayan kayıt.
// Yalnız okur, hiçbir şeyi düzeltmez — sebep görünür olsun diye. Saf karşılaştırma `sayimKimlikFarki` (birim-bulut-sayim).
const SAYIM_KIMLIK_TABLOLARI = { urunler: "ad", cariler: "unvan", siparisler: "siparis_no", uretim: "siparis_no" };
function sayimKimlikFarki(cihazKayitlari, bulutSatirlari, adSutunu, bekleyenDefter) {
  const cihazIdler = new Set((cihazKayitlari || []).filter(Boolean).map((k) => String(k.id)));
  const bulutIdler = new Set((bulutSatirlari || []).filter(Boolean).map((r) => String(r.id)));
  const ana = (bekleyenDefter && bekleyenDefter.ana) || {};
  const cihazAd = (k) => k.siparisNo || k.ad || k.unvan || "";
  return {
    yalnizBulutta: (bulutSatirlari || []).filter((r) => r && !cihazIdler.has(String(r.id)))
      .map((r) => ({ id: String(r.id), ad: r[adSutunu] || "", bekleyen: ana[String(r.id)] || null })),
    yalnizCihazda: (cihazKayitlari || []).filter((k) => k && !bulutIdler.has(String(k.id)))
      .map((k) => ({ id: String(k.id), ad: cihazAd(k), bekleyen: ana[String(k.id)] || null })),
  };
}
async function sayimFarkAyrintisi(tablolar, cihazListeleri) {
  const sonuc = {};
  const defter = typeof bekleyenKayitlariOku === "function" ? bekleyenKayitlariOku() : {};
  await Promise.all(tablolar.filter((t) => SAYIM_KIMLIK_TABLOLARI[t] && cihazListeleri && cihazListeleri[t]).map(async (t) => {
    try {
      const satirlar = await supabaseTumSatirlar(t, `select=id,${SAYIM_KIMLIK_TABLOLARI[t]}`);
      sonuc[t] = sayimKimlikFarki(cihazListeleri[t], satirlar, SAYIM_KIMLIK_TABLOLARI[t], defter[t]);
    } catch (e) { sonuc[t] = { hata: String((e && e.message) || e).slice(0, 120) }; }
  }));
  return sonuc;
}

// Bütün sayım tablolarının bulut ve arşiv (son 30 gün, DELETE) sayıları. Okunamayan tablo null.
async function bulutSayimiAl(gunOnce = 30) {
  const esik = new Date(Date.now() - gunOnce * 24 * 60 * 60 * 1000).toISOString();
  const bulut = {};
  const arsiv30 = {};
  const hatalar = [];
  await Promise.all(SAYIM_TABLOLARI.map(async (tablo) => {
    try { bulut[tablo] = await supabaseSatirSayisi(tablo, SAYIM_SORGUSU[tablo]); }
    catch (e) { bulut[tablo] = null; hatalar.push(`${tablo}: ${String((e && e.message) || e).slice(0, 80)}`); }
    try {
      arsiv30[tablo] = await supabaseSatirSayisi("silinen_arsiv",
        `select=id&islem=eq.DELETE&tablo=eq.${encodeURIComponent(tablo)}&zaman=gte.${encodeURIComponent(esik)}`);
    } catch (e) { arsiv30[tablo] = null; }
  }));
  return { bulut, arsiv30, hatalar };
}

// Arşiv satırlarını geri yüklemeye hazırlar — saf. Yalnız DELETE satırları; aynı kayıt birden çok kez silinmişse en
// yenisi (liste zaman sırasına göre yeniden eskiye verilir); varyant gibi kimliksiz tabloda anahtar sütun değerleri.
function arsivSatirlariniHazirla(tablo, satirlar) {
  const anahtarSutunlari = arsivCakismaSutunlari(tablo);
  const anahtar = (veri) => (anahtarSutunlari
    ? anahtarSutunlari.map((s) => String(veri[s] == null ? "" : veri[s])).join("|")
    : String(veri.id == null ? "" : veri.id));
  const gorulen = new Set();
  const sonuc = [];
  (satirlar || []).forEach((a) => {
    if (!a || a.islem !== "DELETE" || a.tablo !== tablo || !a.veri || typeof a.veri !== "object") return;
    const k = anahtar(a.veri);
    if (!k || gorulen.has(k)) return;
    gorulen.add(k);
    sonuc.push(a.veri);
  });
  return sonuc;
}
// Bileşik anahtarlı alt tablo (varyantlar: urun_id+renk+beden) şemadan okunur; `id`li tablolarda null.
function arsivCakismaSutunlari(tablo) {
  for (const sema of Object.values(TABLO_SEMA || {})) {
    for (const cocuk of (sema && sema.cocuklar) || []) {
      if (cocuk.tablo === tablo && cocuk.cakisma) return cocuk.cakisma.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return null;
}
// Geri yükleme sırası: üst tablolar önce — saf.
function arsivGeriYuklemeSirasi(tablolar) {
  const sira = new Map(ARSIV_GERI_YUKLEME_SIRASI.map((t, i) => [t, i]));
  return [...new Set(tablolar || [])].sort((a, b) => (sira.has(a) ? sira.get(a) : 99) - (sira.has(b) ? sira.get(b) : 99));
}

// Hazırlanmış satırları tabloya geri yazar (100'lük parçalar, upsert). Döner: yazılan satır sayısı.
// v2 GEÇİŞİNDEN SONRA (v1.730.1 — baştan aşağı denetim, kullanıcı: "yeni değişiklik ile baştan aşağı kontrol et"). Geri yükleme
// satırları tabloya DOĞRUDAN POST ediyordu; geçişten sonra bazı adlar görünüm (yazılamaz) ya da doğrudan yazmaya kapalı:
//   · cari_hareketleri (cari v2) → `car_yaz` (arşivdeki satır bugünkü sütun adlarıyla, car_yaz bunu okur; iptal edilmişse açar),
//   · siparis_kalemleri / uretim_atamalari (alt v2) → `alt_yaz` (tablonun kendi tipine çevirir),
//   · varyantlar / stok_hareketleri (stok v2) → GERİ YÜKLENEMEZ: v2'de renk/beden kimliğe bağlı, eski satır biçimi doğrudan
//     yazılamaz; v2'de stok hareketi zaten silinmez (iptal edilir), arşivdekiler geçiş ÖNCESİ silinenlerdir. Ekran bunu söyler.
// Saf karar: null → bugünkü yol (doğrudan POST). Bayraklar 045'ten.
function arsivV2Yolu(tablo) {
  // v2'nin kendi tabloları (stk_*, car_*, kas_*, lst_*) — doğrudan yazmaya kapalı; geri yükleme işlemlerden geçmeli.
  if (/^(stk|car|kas|lst)_/.test(String(tablo))) {
    return { engel: "Bu, yeni yapının (v2) iç tablosu: doğrudan geri yüklenemez. Silinen kayıtlar v2'de iptal edilir, kaybolmaz; "
      + "gerekirse bildirin." };
  }
  if ((tablo === "varyantlar" || tablo === "stok_hareketleri") && typeof stokV2Aktif === "function" && stokV2Aktif()) {
    return { engel: "Stok v2'ye geçildi: varyant ve stok hareketi bu ekrandan geri yüklenemez. v2'de silinen stok hareketi iptal edilir, "
      + "kaydı kaybolmaz; arşivdekiler geçişten ÖNCE silinmiş satırlar. Gerekirse eksik stok Bağımsız Stok Girişi (sayım fişi) ile düzeltilir." };
  }
  if (tablo === "cari_hareketleri" && typeof cariV2Aktif === "function" && cariV2Aktif()) {
    return { rpc: "car_yaz", p: (parca) => ({ satirlar: parca, iptal: [] }) };
  }
  if ((tablo === "siparis_kalemleri" || tablo === "uretim_atamalari") && typeof altV2Aktif === "function" && altV2Aktif()) {
    return { rpc: "alt_yaz", p: (parca) => ({ [tablo]: { satirlar: parca, sil: [] } }) };
  }
  return null;
}

async function arsivSatirlariniGeriYukle(tablo, satirlar) {
  const v2 = arsivV2Yolu(tablo);
  if (v2 && v2.engel) throw new Error(v2.engel);
  const cakisma = arsivCakismaSutunlari(tablo);
  const yol = cakisma ? `${tablo}?on_conflict=${cakisma.join(",")}` : tablo;
  let yazilan = 0;
  for (let i = 0; i < satirlar.length; i += 100) {
    const parca = satirlar.slice(i, i + 100);
    if (v2) {
      await supabaseIstek(`rpc/${v2.rpc}`, { method: "POST", body: JSON.stringify({ p: v2.p(parca) }) });
      yazilan += parca.length;
      continue;
    }
    await supabaseIstek(yol, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(satirlariEsitle(parca)),
    });
    yazilan += parca.length;
  }
  return yazilan;
}

// ---------------------------------------------------------------------------------------------
// BULUT SAYIMI BÖLÜMÜ (Tanımlar › Bakım, yalnız Yönetici)
function BulutSayimiBolumu({ cihaz, kayitlar }) {
  const [satirlar, setSatirlar] = useState(null);
  const [durum, setDurum] = useState("");
  const [ayrinti, setAyrinti] = useState(null);
  const yukle = async () => {
    if (!supabaseAcikMi()) { setDurum("Bulut bağlı değil."); return; }
    setDurum("Sayılıyor…");
    try {
      const { bulut, arsiv30, hatalar } = await bulutSayimiAl(30);
      const s = sayimKarsilastir(cihaz, bulut, arsiv30);
      setSatirlar(s);
      setDurum(hatalar.length ? `Okunamayan: ${hatalar.join("; ")}` : "");
      // Farklı ana tablolarda hangi kayıt (alt tablo farkı — iş ataması gibi — üst tablonun farkından okunur).
      const farkliAna = s.filter((x) => x.bulut != null && x.durum !== "aynı").map((x) => x.tablo);
      setAyrinti(farkliAna.length ? await sayimFarkAyrintisi(farkliAna, kayitlar) : null);
    } catch (e) {
      setDurum(`Sayım alınamadı: ${String((e && e.message) || e).slice(0, 160)}`);
    }
  };
  const farkli = (satirlar || []).filter((s) => s.durum !== "aynı");
  return (
    <div data-bulut-sayimi="1" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <Database size={15} color="var(--erp-brown)" />
        <b style={{ fontSize: 13 }}>Bulut sayımı</b>
        <span style={{ fontSize: 11, color: "var(--erp-text-3)", flex: 1, minWidth: 200 }}>
          Her tablonun bu cihazdaki ve buluttaki kayıt sayısı, yanında son 30 günde sunucu arşivine düşen (silinen) satır sayısı.
          "Veri gitti mi, bu cihaz mı eksik okudu?" sorusunun cevabı burada.
        </span>
        <button type="button" className="btn-ghost" data-bulut-sayimi-al="1" style={{ padding: "5px 10px", fontSize: 11 }} onClick={yukle}>
          <RefreshCw size={12} /> {satirlar ? "Yeniden say" : "Bulutu say"}
        </button>
      </div>
      {durum && <div className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 8 }}>{durum}</div>}
      {satirlar && (
        <div style={{ overflowX: "auto" }}>
          <table className="mono" style={{ borderCollapse: "collapse", fontSize: 11, minWidth: 520 }}>
            <thead>
              <tr style={{ color: "var(--erp-text-3)", textAlign: "left" }}>
                <th style={{ padding: "3px 8px" }}>Tablo</th>
                <th style={{ padding: "3px 8px", textAlign: "right" }}>Bu cihaz</th>
                <th style={{ padding: "3px 8px", textAlign: "right" }}>Bulut</th>
                <th style={{ padding: "3px 8px", textAlign: "right" }}>Arşiv (30 gün)</th>
                <th style={{ padding: "3px 8px" }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s) => (
                <tr key={s.tablo} data-sayim-tablo={s.tablo} style={{ borderTop: "1px solid var(--erp-line-soft)", background: s.durum === "aynı" ? "transparent" : "var(--erp-orange-bg)" }}>
                  <td style={{ padding: "3px 8px" }}>{s.ad}</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>{s.cihaz == null ? "—" : s.cihaz}</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>{s.bulut == null ? "—" : s.bulut}</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>{s.arsiv30}</td>
                  <td style={{ padding: "3px 8px", color: s.durum === "aynı" ? "var(--erp-text-3)" : "var(--erp-warn)", fontWeight: s.durum === "aynı" ? 400 : 700 }}>{s.durum}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {farkli.length === 0 && <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginTop: 6 }}>Bu cihaz ile bulut birebir aynı.</div>}
          {ayrinti && Object.keys(ayrinti).length > 0 && (
            <div data-sayim-ayrinti="1" className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", marginTop: 8, lineHeight: 1.6 }}>
              {Object.entries(ayrinti).map(([t, a]) => (
                <div key={t}>
                  <b>{ARSIV_TABLO_ADLARI[t] || t}:</b>{" "}
                  {a.hata ? `ayrıntı okunamadı (${a.hata})` : (
                    <>
                      {a.yalnizBulutta.map((x) => (
                        <div key={`b-${x.id}`} data-sayim-yalniz-bulutta={x.id}>
                          · bulutta var, bu cihazda yok: {x.ad || "—"} ({x.id}) — {x.bekleyen === "sil"
                            ? "bu cihaz SİLMİŞ, silme buluta gitmemiş (bekleyen kayıt defterinde)"
                            : "bu cihazda bekleyen silme yok: cihaz bu kaydı hiç almamış ya da okurken düşürmüş"}
                        </div>
                      ))}
                      {a.yalnizCihazda.map((x) => (
                        <div key={`c-${x.id}`} data-sayim-yalniz-cihazda={x.id}>
                          · bu cihazda var, bulutta yok: {x.ad || "—"} ({x.id}){x.bekleyen === "yaz" ? " — bekleyen yazma (henüz gönderilmedi)" : ""}
                        </div>
                      ))}
                      {a.yalnizBulutta.length === 0 && a.yalnizCihazda.length === 0 && "kayıt kimlikleri aynı (fark alt kayıtlarda)"}
                    </>
                  )}
                </div>
              ))}
              <div style={{ marginTop: 4, color: "var(--erp-text-3)" }}>Bu satırların ekran görüntüsü sebebi bulmaya yeter.</div>
            </div>
          )}
          {farkli.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginTop: 6, lineHeight: 1.5 }}>
              Bulutta silinmiş görünen satırlar <b>Çöp Kutusu</b> sekmesinin altındaki <b>Sunucu arşivi</b>nden tablo seçilip geri yüklenebilir. Günlük'te
              "silindi" ve "TOPLU SİLME" araması hangi cihazın ne zaman sildiğini gösterir.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
