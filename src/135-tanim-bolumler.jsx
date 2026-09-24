// Otomatik yedeklerin durumu ve geri yükleme. Geri yükleme İKİ AŞAMALI onay ister: mevcut verinin
// tamamını değiştiren bir işlem, tek tıkla yapılmamalı.
// Kaydetme hatalarının sebebini GÖRÜNÜR kılar. "Kaydedilemedi" mesajı tek başına çıkmaz sokak:
// kullanıcı neyin fazla yer kapladığını bilmeden hiçbir şey yapamaz. Burada her anahtarın boyutu ve
// en çok yer kaplayan ürünler listelenir, böylece hangi görselin küçültüleceği belli olur.
// Bulut bağlantısı ve göç — Genel sekmesinde, yedekleme/depolama bölümlerinin yanında.
// Renk ve beden tanımlarının arasına koymak yanlıştı: bu bir VERİ ALTYAPISI ayarı, atölye tanımı değil.
function SupabaseBolumu({ supabaseBagli, gocDurumu, onSupabaseyeGoc }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #E4D8C0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>Bulut Veritabanı</span>
        <span
          className="mono"
          style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
            background: supabaseBagli ? "#2F6B4F22" : "#9B8B7222",
            color: supabaseBagli ? "#2F6B4F" : "var(--erp-text-2)",
          }}
        >
          {supabaseBagli ? "BAĞLI" : "KAPALI"}
        </span>
        {supabaseBagli && (
          <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
            {SUPABASE_URL.replace("https://", "")}
          </span>
        )}
      </div>

      {!supabaseBagli ? (
        <div style={{ fontSize: 12, color: "var(--erp-text-2)", lineHeight: 1.7 }}>
          Bağlantı tanımlı değil. Uygulama tarayıcı deposuyla çalışıyor — veriler yalnızca bu
          bilgisayarda duruyor ve başka kullanıcılar göremiyor.
          <div style={{ marginTop: 8, background: "var(--erp-panel)", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 10 }}>
            Bağlamak için kodun başındaki <b className="mono">SUPABASE_URL</b> ve{" "}
            <b className="mono">SUPABASE_ANAHTAR</b> alanlarını Supabase panelindeki{" "}
            <b>Settings → API Keys</b> değerleriyle doldurun.
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px", lineHeight: 1.7 }}>
            Her değişiklikte yalnızca <b>değişen kayıtlar</b> buluta yazılır. Tarayıcı kopyası da
            tutulmaya devam eder: internet kesildiğinde uygulama son bilinen hâlle açılabilir.
          </p>

          {/* Göç TEK SEFERLİKTİR ama tekrarı zarar vermez: kayıtlar id üzerinden upsert edilir. */}
          <div style={{ background: "var(--erp-panel)", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", marginBottom: 6 }}>
              Mevcut veriyi buluta taşı
            </div>
            <p style={{ fontSize: 11, color: "var(--erp-text-2)", margin: "0 0 10px", lineHeight: 1.6 }}>
              Bu bilgisayardaki ürün, stok, cari, sipariş ve üretim kayıtlarını Supabase'e aktarır.
              Bir kez çalıştırmak yeterli; tekrar çalıştırmak kayıtları çoğaltmaz.
              <b> Önce yedek almanız önerilir.</b>
            </p>
            <button
              className="btn-primary"
              disabled={!!(gocDurumu && gocDurumu.calisiyor)}
              onClick={onSupabaseyeGoc}
              style={{ background: "#2F6B4F" }}
            >
              {gocDurumu && gocDurumu.calisiyor ? `Aktarılıyor — ${gocDurumu.adim}…` : "Buluta Aktar"}
            </button>

            {gocDurumu && gocDurumu.ozet && (
              <div style={{ marginTop: 10, fontSize: 11, color: "#2F6B4F", lineHeight: 1.7 }}>
                ✓ {gocDurumu.ozet.urunler || 0} ürün · {gocDurumu.ozet.cariler || 0} cari ·{" "}
                {gocDurumu.ozet.siparisler || 0} sipariş · {gocDurumu.ozet.uretim || 0} üretim ·{" "}
                {gocDurumu.ozet.stok_rezervasyonlari || 0} rezervasyon
                <div style={{ color: "var(--erp-text-2)", marginTop: 3 }}>
                  Varyantlar, stok hareketleri, kalemler ve atamalar da ilgili tablolara aktarıldı.
                </div>
              </div>
            )}
            {gocDurumu && gocDurumu.hata && (
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--erp-warn)", lineHeight: 1.6 }}>
                Durdu: {gocDurumu.hata}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Defteri tutmayan ürünleri topluca düzeltir.
//
// Ürün ürün gezip düğmeye basmak, 50 ürünlük bir stokta yapılabilir bir iş değil. Üstelik hangi
// ürünün bozuk olduğunu bulmak için hepsini tek tek açmak gerekiyordu.
function DefterOnarimBolumu({ stok, onOnar }) {
  const [calisiyor, setCalisiyor] = useState(false);

  // Bozuk ürünler: kayıtlı stok ile hareket neti tutmayanlar.
  const bozuklar = (stok || []).map((u) => {
    const hareketNet = stokYuvarla((u.hareketler || []).reduce((t, h) => t + (h.miktar || 0), 0));
    const bakiye = stokYuvarla((u.variants || []).reduce((t, v) => t + (v.miktar || 0), 0));
    return { urun: u, fark: stokYuvarla(bakiye - hareketNet), bakiye, hareketNet };
  }).filter((x) => Math.abs(x.fark) > 0.000001);

  if (bozuklar.length === 0) return null;

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #E4D8C0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <AlertTriangle size={14} color="var(--erp-warn)" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>Defter Onarımı</span>
        <span className="mono" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: "#B85C2E22", color: "var(--erp-warn)" }}>
          {bozuklar.length} ürün
        </span>
      </div>
      <p style={{ fontSize: 11, color: "var(--erp-text-2)", margin: "0 0 10px", lineHeight: 1.6 }}>
        Bu ürünlerde kayıtlı stok ile hareket geçmişi tutmuyor. Sebebi genelde ürün açılırken
        girilen başlangıç miktarının hareket üretmemesi. <b>Stok miktarları DEĞİŞMEZ</b> — yalnızca
        farkı açıklayan açılış hareketleri yazılır, böylece geçmiş tutarlı hale gelir.
      </p>

      <div style={{ display: "grid", gap: 4, marginBottom: 10, maxHeight: 160, overflowY: "auto" }}>
        {bozuklar.map((x) => (
          <div key={x.urun.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, minWidth: 130 }}>{x.urun.ad}</span>
            <span className="mono" style={{ color: "var(--erp-text-2)" }}>
              stok {x.bakiye} · hareket {x.hareketNet} ·{" "}
              <b style={{ color: "var(--erp-warn)" }}>{x.fark > 0 ? "+" : ""}{x.fark}</b> {x.urun.birim || ""}
            </span>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        disabled={calisiyor}
        style={{ background: "var(--erp-brown)" }}
        onClick={() => {
          setCalisiyor(true);
          try { onOnar(bozuklar.map((x) => x.urun.id)); } finally { setCalisiyor(false); }
        }}
      >
        {calisiyor ? "Onarılıyor…" : `${bozuklar.length} ürünü onar`}
      </button>
    </div>
  );
}

function DepolamaDurumuBolumu({ stok, cariler, tanimlar }) {
  const [acik, setAcik] = useState(false);

  const stokBayt = veriBoyutu(stok || []);
  const cariBayt = veriBoyutu(cariler || []);
  const tanimBayt = veriBoyutu(tanimlar || {});

  // Ürün başına görsel yükü: kapak görseli + renk görselleri. Hareketler ayrı sayılır çünkü çözümü
  // farklıdır (görsel küçültülür, hareket geçmişi ise arşivlenir).
  const urunler = (stok || []).map((p) => {
    const gorselBayt = veriBoyutu(p.kapakResmi || "") + veriBoyutu(p.renkResimleri || {});
    const hareketBayt = veriBoyutu(p.hareketler || []);
    return { ad: p.ad, gorselBayt, hareketBayt, toplam: veriBoyutu(p), hareketSayisi: (p.hareketler || []).length };
  }).sort((a, b) => b.toplam - a.toplam);

  const toplamGorsel = urunler.reduce((s, u) => s + u.gorselBayt, 0);
  const doluluk = Math.min(100, Math.round((stokBayt / DEPO_SINIRI) * 100));
  const tehlikede = stokBayt > DEPO_UYARI_ESIGI;

  // TARAYICI DEPOSUNUN GERÇEK DOLULUĞU.
  //
  // Yukarıdaki hesaplar tek tek KAYITLARI kendi sınırlarına (DEPO_SINIRI) göre ölçüyor. Ama
  // tarayıcının TOPLAM bir sınırı da var (çoğunda ~5 MB) ve bütün kayıtlar onu paylaşıyor.
  // Bildirilen hata tam buradan geldi: stok kaydı 523 KB (yani kendi sınırının %10'u, panel yemyeşil)
  // olmasına rağmen depo başka kayıtlarla dolduğu için yazılamadı. Kendi sınırına bakan bir panel,
  // dolu bir depoyu "boş" gösteriyordu.
  const kullanim = depoKullanimi();
  const karakterYuku = depoKarakterYuku();
  const [kota, setKota] = useState(null);
  useEffect(() => { let iptal = false; depoKotasi().then((k) => { if (!iptal) setKota(k); }); return () => { iptal = true; }; }, []);
  // Tarayıcının kendi rakamı asenkron geliyor; gelene kadar panel yalnızca ölçebildiğini gösterir.


  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #E4D8C0" }}>
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>Depolama Durumu</span>
        <span
          className="mono"
          style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
            background: tehlikede ? "var(--erp-warn)" : doluluk > 60 ? "#C9A06322" : "#4E6B4E1A",
            color: tehlikede ? "#fff" : doluluk > 60 ? "var(--erp-brown)" : "var(--erp-primary)",
          }}
        >
          stok %{doluluk} dolu
        </span>
        {acik ? <ChevronUp size={14} color="var(--erp-text-3)" /> : <ChevronDown size={14} color="var(--erp-text-3)" />}
      </button>

      {tehlikede && (
        <div style={{ marginTop: 8, background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 10, fontSize: 12, color: "#7A3B22", lineHeight: 1.6 }}>
          <b style={{ color: "var(--erp-warn)" }}>Stok verisi kayıt sınırına ulaştı ({boyutMetni(stokBayt)} / {boyutMetni(DEPO_SINIRI)}).</b>
          {" "}Bu durumda hiçbir stok değişikliği kaydedilemez — silme yaparsınız, ekrandan gider, sayfa
          yenilenince geri gelir. Aşağıdaki listeden en çok yer kaplayan ürünlerin görsellerini silin
          ya da daha küçük görsellerle değiştirin.
        </div>
      )}

      {acik && kullanim && (
        <div style={{ marginTop: 10, border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
          <div style={{ background: "var(--erp-panel)", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "var(--erp-text)" }}>
            Tarayıcı deposu — kayıt bazında ({boyutMetni(kullanim.toplam)})
          </div>
          {/* DOLULUK KARAKTER ÜZERİNDEN. `navigator.storage.estimate()` localStorage'ı KAPSAMIYOR —
              bildirilen olayda "0 B / 10240 MB" döndürdü, yani depo dolmuşken bomboş gösterdi.
              O yüzden buradaki ölçü tarayıcının rakamı değil, bizim saydığımız karakter. */}
          <div style={{ padding: "8px 10px", fontSize: 11, color: "var(--erp-text)", borderTop: "1px solid #F0E7D5", lineHeight: 1.7 }}>
            {/* ASIL DEPO ARTIK INDEXEDDB. Kotası localStorage'ınkiyle kıyaslanamayacak kadar büyük
                ve `estimate()` onu doğru ölçüyor. Aşağıdaki localStorage bölümü yalnızca ESKİ
                kayıtlar ve başka uygulamalar için duruyor. */}
            {kota && (
              <div style={{ fontWeight: 700, color: "var(--erp-primary)" }}>
                Uygulama deposu (IndexedDB): {boyutMetni(kota.kullanilan)} kullanılıyor,
                {" "}{boyutMetni(kota.kota)} ayrılmış
              </div>
            )}
            {karakterYuku != null && (() => {
              const yuzde = Math.min(100, Math.round((karakterYuku / LOCALSTORAGE_KARAKTER_SINIRI) * 100));
              return (
                <div style={{ color: yuzde >= 90 ? "var(--erp-warn)" : "var(--erp-text-2)" }}>
                  Eski depo (localStorage): %{yuzde} dolu — {(karakterYuku / 1024 / 1024).toFixed(2)} / ~5 milyon karakter.
                  {kullanim.bizim === 0 && " Bu uygulamanın verisi buradan taşındı."}
                </div>
              );
            })()}
            <div>
              Bu uygulama: <b className="mono">{boyutMetni(kullanim.bizim)}</b>
              {kullanim.yabanci > 0 && (
                <> · Başka uygulamalar: <b className="mono" style={{ color: "var(--erp-warn)" }}>{boyutMetni(kullanim.yabanci)}</b></>
              )}
            </div>
            {kullanim.yabanci > kullanim.bizim && (
              <div style={{ marginTop: 4, color: "#7A3B22" }}>
                Deponun çoğunu <b>başka bir uygulama</b> kullanıyor. Dosyadan açılan sayfalar aynı
                tarayıcı deposunu paylaşır; bu uygulamadan görsel silmek yer açmaz. Aşağıda
                "başka uygulama" işaretli kaydı, ait olduğu uygulamadan temizlemeniz gerekir.
              </div>
            )}
          </div>
          {kullanim.kayitlar.slice(0, 8).map((k) => (
            <div key={k.anahtar} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 10px", fontSize: 11, borderTop: "1px solid #F0E7D5" }}>
              <span className="mono" style={{ color: k.bizeAitMi ? "var(--erp-text)" : "var(--erp-warn)" }}>
                {k.anahtar}
                {!k.bizeAitMi && <span style={{ fontSize: 9, marginLeft: 6, fontWeight: 700 }}>başka uygulama</span>}
              </span>
              <span className="mono" style={{ color: "var(--erp-text-2)", fontWeight: 600 }}>{boyutMetni(k.bayt)}</span>
            </div>
          ))}
          <div style={{ padding: "6px 10px", fontSize: 10, color: "var(--erp-text-2)", borderTop: "1px solid #F0E7D5", lineHeight: 1.5 }}>
            <b>cop</b> çöp kutusudur — silinen kayıtların tam kopyasını tutar ve en hızlı yer açılan
            yerdir (Tanımlar &gt; Çöp Kutusu). <b>stok</b> içindeki yükün çoğu ürün görselleridir.
          </div>
        </div>
      )}

      {acik && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
            {[
              { ad: "Stok", bayt: stokBayt, sinirli: true },
              { ad: "Cari", bayt: cariBayt, sinirli: true },
              { ad: "Tanımlar", bayt: tanimBayt, sinirli: true },
              { ad: "— bunun görseller kısmı", bayt: toplamGorsel, sinirli: false },
            ].map((x) => (
              <div key={x.ad}>
                <div style={{ fontSize: 10, color: "var(--erp-text-3)", fontWeight: 600 }}>{x.ad}</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: x.sinirli && x.bayt > DEPO_UYARI_ESIGI ? "var(--erp-warn)" : "var(--erp-text)" }}>
                  {boyutMetni(x.bayt)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>
            En çok yer kaplayan ürünler
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, textAlign: "left", padding: "3px 8px", color: "var(--erp-text-2)" }}>Ürün</th>
                  <th style={{ fontSize: 10, textAlign: "right", padding: "3px 8px", color: "var(--erp-text-2)" }}>Görseller</th>
                  <th style={{ fontSize: 10, textAlign: "right", padding: "3px 8px", color: "var(--erp-text-2)" }}>Hareketler</th>
                  <th style={{ fontSize: 10, textAlign: "right", padding: "3px 8px", color: "var(--erp-text-2)" }}>Toplam</th>
                </tr>
              </thead>
              <tbody>
                {urunler.slice(0, 12).map((u, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #E4D8C0" }}>
                    <td style={{ fontSize: 11, padding: "4px 8px", overflowWrap: "anywhere" }}>{u.ad}</td>
                    <td className="mono" style={{ fontSize: 11, padding: "4px 8px", textAlign: "right", color: u.gorselBayt > 200 * 1024 ? "var(--erp-warn)" : "var(--erp-text-2)" }}>
                      {u.gorselBayt > 0 ? boyutMetni(u.gorselBayt) : "—"}
                    </td>
                    <td className="mono" style={{ fontSize: 11, padding: "4px 8px", textAlign: "right", color: "var(--erp-text-2)" }}>
                      {u.hareketSayisi > 0 ? `${boyutMetni(u.hareketBayt)} (${u.hareketSayisi})` : "—"}
                    </td>
                    <td className="mono" style={{ fontSize: 11, padding: "4px 8px", textAlign: "right", fontWeight: 700 }}>{boyutMetni(u.toplam)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 8, lineHeight: 1.6 }}>
            Her kayıt anahtarı en fazla {boyutMetni(DEPO_SINIRI)} tutabilir. Ürün görselleri stok kaydının
            içinde base64 olarak saklandığı için sınıra en hızlı yaklaşan anahtar "stok"tur.
          </div>
        </div>
      )}
    </div>
  );
}

function OtomatikYedekBolumu({ sonYedekTarihi, onSimdiYedekle, onGeriYukle }) {
  const [yedekler, setYedekler] = useState(null); // null = henüz listelenmedi
  const [yukleniyor, setYukleniyor] = useState(false);
  const [secili, setSecili] = useState("");
  const [onayAsamasi, setOnayAsamasi] = useState(0);

  async function yedekleriListele() {
    setYukleniyor(true);
    try {
      const r = await window.storage.list("yedek:", true);
      const liste = (r && r.keys ? r.keys : [])
        .filter((k) => k.startsWith("yedek:"))
        .map((k) => k.slice(6))
        .sort()
        .reverse();
      setYedekler(liste);
    } catch (e) {
      setYedekler([]);
    } finally {
      setYukleniyor(false);
    }
  }

  const bugun = bugunYerel();
  const bugunAlindiMi = sonYedekTarihi === bugun;

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #E4D8C0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>Otomatik Yedek</span>
        <span
          className="mono"
          style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
            background: bugunAlindiMi ? "#4E6B4E1A" : "#C9A0631A",
            color: bugunAlindiMi ? "var(--erp-primary)" : "var(--erp-brown)",
          }}
        >
          {sonYedekTarihi ? `son: ${sonYedekTarihi}` : "henüz yedek yok"}
        </span>
        <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={onSimdiYedekle}>
          <Save size={12} /> Şimdi yedekle
        </button>
        <button
          className="btn-ghost"
          style={{ padding: "5px 10px", fontSize: 11 }}
          onClick={() => { yedekleriListele(); setOnayAsamasi(0); }}
          disabled={yukleniyor}
        >
          <RefreshCw size={12} /> Yedekleri listele
        </button>
      </div>
      <div style={{ fontSize: 11, color: "var(--erp-text-3)", lineHeight: 1.6 }}>
        Uygulama her gün açıldığında otomatik yedek alır; son 3 gün saklanır (yedekler tam veri kopyasıdır, fazlası tarayıcı deposunu doldurur). Bu yedekler uygulamanın
        kendi deposunda tutulur — <b>dış kopya değildir</b>. Bilgisayarınıza indirilen JSON yedeği,
        depo tamamen kaybolursa elinizde kalan tek kopyadır; onu almayı bırakmayın.
        <br />
        Otomatik yedeklere <b>ürün görselleri dahil edilmez</b> (boyut sınırı nedeniyle); geri yüklerken
        mevcut görseller olduğu gibi korunur.
      </div>

      {yedekler !== null && (
        <div style={{ marginTop: 10 }}>
          {yedekler.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Kayıtlı yedek bulunamadı.</div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={secili}
                onChange={(e) => { setSecili(e.target.value); setOnayAsamasi(0); }}
                style={{ ...inputStyle, width: 220, fontSize: 12 }}
              >
                <option value="">Geri yüklenecek yedeği seçin…</option>
                {yedekler.map((t) => (
                  <option key={t} value={t}>{t === "geri-yukleme-oncesi" ? "Son geri yükleme öncesi hâl" : t}</option>
                ))}
              </select>
              {secili && onayAsamasi === 0 && (
                <button className="btn-ghost" style={{ padding: "6px 11px", fontSize: 11, borderColor: "#9C3D3D", color: "#9C3D3D" }} onClick={() => setOnayAsamasi(1)}>
                  <AlertTriangle size={12} /> Bu yedeği geri yükle
                </button>
              )}
              {secili && onayAsamasi === 1 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: "6px 10px" }}>
                  <span style={{ fontSize: 11, color: "var(--erp-warn)", fontWeight: 700 }}>
                    Mevcut tüm veriler {secili} tarihli hâlle DEĞİŞTİRİLECEK. Emin misiniz?
                  </span>
                  <button className="btn-primary" style={{ padding: "5px 10px", fontSize: 11, background: "#9C3D3D" }} onClick={() => { onGeriYukle(secili); setOnayAsamasi(0); }}>
                    Evet, geri yükle
                  </button>
                  <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setOnayAsamasi(0)}>Vazgeç</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VeritabaniSifirlaBolumu({ onVeritabaniSifirla, supabaseBagli }) {
  const [acik, setAcik] = useState(false);
  const [yazi, setYazi] = useState("");

  return (
    <div style={{ marginTop: 32, border: "1.5px solid #9C3D3D", borderRadius: "var(--erp-r-md)", padding: 14, background: "#FCEAEA" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#9C3D3D", marginBottom: 4 }}>Tehlikeli Bölge</div>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px" }}>
        Bu işlem stok, sipariş, üretim, cari hesap ve tanımların TAMAMINI kalıcı olarak siler. Geri alınamaz.
      </p>
      {!acik ? (
        <button className="btn-ghost" style={{ borderColor: "#9C3D3D", color: "#9C3D3D" }} onClick={() => setAcik(true)}>
          <Trash2 size={14} /> Veritabanını Sıfırla
        </button>
      ) : (
        <div>
          {/* Ne silineceği AÇIKÇA yazılır. "Veritabanını sıfırla" ifadesi, tanımların da
              (renkler, bedenler, prosesler, firma bilgileri) gideceğini yeterince anlatmıyordu. */}
          <div style={{ fontSize: 11, color: "#7A3B22", lineHeight: 1.7, marginBottom: 10, background: "#FBF0E2", border: "1px solid #C9A063", borderRadius: "var(--erp-r-md)", padding: 9 }}>
            Silinecekler: <b>ürünler ve stok hareketleri</b>, <b>cariler ve hareketleri</b>,{" "}
            <b>siparişler</b>, <b>üretim emirleri</b>, <b>rezervasyonlar</b>, <b>çöp kutusu</b> ve{" "}
            <b>tüm tanımlar</b> (renkler, bedenler, prosesler, birimler, fire sebepleri, firma
            bilgileri ve logo).
            {supabaseBagli && <div style={{ marginTop: 5 }}>Bulut veritabanı da temizlenir.</div>}
            <div style={{ marginTop: 5 }}>Muhasebe kayıtları ve alınmış yedekler korunur.</div>
          </div>
          <p style={{ fontSize: 12, color: "var(--erp-text)", marginBottom: 8 }}>
            Onaylamak için aşağıya <b>SIFIRLA</b> yazın:
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={yazi}
              onChange={(e) => setYazi(e.target.value)}
              placeholder="SIFIRLA"
              style={{ ...inputStyle, width: 160, borderColor: "#9C3D3D" }}
            />
            <button
              className="btn-primary"
              style={{ background: "#9C3D3D" }}
              disabled={yazi !== "SIFIRLA"}
              onClick={() => onVeritabaniSifirla()}
            >
              Kalıcı Olarak Sil
            </button>
            <button className="btn-ghost" onClick={() => { setAcik(false); setYazi(""); }}>Vazgeç</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RenkKombinasyonBolumu({ hammaddeRenkleri, kombinasyonlar, onEkle, onSil, kullanimGetir }) {
  const [renkSayisi, setRenkSayisi] = useState(1);
  const [pozisyonSecimleri, setPozisyonSecimleri] = useState({}); // { [pozisyon]: renkId }

  function renkAdiGetir(id) {
    return (hammaddeRenkleri.find((r) => r.id === id) || {}).ad || "?";
  }

  function renkKoduGetir(id) {
    const r = hammaddeRenkleri.find((r) => r.id === id) || {};
    return r.kod || r.ad || "?";
  }

  const secili = Array.from({ length: renkSayisi }, (_, i) => pozisyonSecimleri[i + 1]).filter(Boolean);
  const tumPozisyonlarDolu = Array.from({ length: renkSayisi }, (_, i) => i + 1).every((poz) => pozisyonSecimleri[poz]);

  function kaydet() {
    if (!tumPozisyonlarDolu) return;
    const renkIdler = Array.from({ length: renkSayisi }, (_, i) => pozisyonSecimleri[i + 1]);
    onEkle(renkIdler);
    setPozisyonSecimleri({});
  }

  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Model Rengi</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
        Tek bir hammadde renginden (örn. sadece Siyah) ya da birden fazla renkten oluşan modeller için
        (örn. Siyah-Beyaz-Kırmızı deri kombinasyonu) uzun ismi tekrarlamak yerine otomatik kısa bir kod atanır.
        Stokta ürüne renk eklerken bu model rengini tek seçenek olarak seçebilirsiniz.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>Kaç renkten oluşuyor?</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { setRenkSayisi(n); setPozisyonSecimleri({}); }}
                style={{
                  width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${renkSayisi === n ? "var(--erp-primary)" : "var(--erp-border)"}`,
                  background: renkSayisi === n ? "#E5EEE3" : "#fff", color: renkSayisi === n ? "var(--erp-primary)" : "var(--erp-text-2)",
                  cursor: "pointer", fontSize: 12, fontWeight: 700,
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {Array.from({ length: renkSayisi }, (_, i) => i + 1).map((poz) => {
              // Not: 2+ renkli kombinasyonlarda AYNI renk birden fazla pozisyonda tekrar edebilir
              // (örn. 1. Renk=Siyah, 2. Renk=Kahve, 3. Renk=Siyah geçerli, FARKLI bir modeldir) —
              // bu yüzden pozisyonlar arasında bir kısıtlama YOK. Sadece TEK renkli (N=1) modunda,
              // zaten TEK BAŞINA bir Model Rengi olarak tanımlanmış renkler listeden çıkarılır —
              // aksi halde seçilip "Model Rengi Ekle" denince zaten var olduğu için reddediliyordu.
              const tekBasinaZatenTanimli = renkSayisi === 1
                ? kombinasyonlar.filter((k) => k.renkIdler.length === 1).map((k) => k.renkIdler[0])
                : [];
              return (
                <label key={poz} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>{poz}. Renk</span>
                  <select
                    value={pozisyonSecimleri[poz] || ""}
                    onChange={(e) => setPozisyonSecimleri({ ...pozisyonSecimleri, [poz]: e.target.value })}
                    style={{ ...inputStyle, width: 150 }}
                  >
                    <option value="">Seçin…</option>
                    {hammaddeRenkleri.filter((r) => !tekBasinaZatenTanimli.includes(r.id)).map((r) => (
                      <option key={r.id} value={r.id}>{r.ad}{r.kod ? ` (${r.kod})` : ""}</option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>

          {secili.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--erp-text)", marginBottom: 10 }}>
              Seçilenler: <b>{secili.map((id) => renkKoduGetir(id)).join("-")}</b>
              {" "}({secili.map((id) => renkAdiGetir(id)).join(" / ")})
            </div>
          )}
          <button className="btn-primary" onClick={kaydet} disabled={!tumPozisyonlarDolu}>
            <Plus size={14} /> Model Rengi Ekle (kod otomatik atanır)
          </button>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>Tanımlı model renkleri:</div>
          {kombinasyonlar.length === 0 ? (
            <EmptyState text="Henüz model rengi tanımlanmadı." />
          ) : (() => {
            // Asıl ihtiyaç: kombinasyonlar "kaç renkli" olduğuna göre AYRIŞMIŞ görünsün — Stok'ta renk
            // eklerken de seçim tam olarak bu sayıya göre filtrelendiği için, burada da aynı gruplama
            // kullanılıyor; bir bakışta "2 renkli"lerin hepsini bir arada görebilirsiniz.
            const gruplar = {};
            kombinasyonlar.forEach((k) => {
              const n = k.renkIdler.length;
              if (!gruplar[n]) gruplar[n] = [];
              gruplar[n].push(k);
            });
            const sayilar = Object.keys(gruplar).map(Number).sort((a, b) => a - b);
            return (
              <div style={{ display: "grid", gap: 14 }}>
                {sayilar.map((n) => (
                  <div key={n}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span
                        className="mono"
                        style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: "#4E6B4E22", color: "var(--erp-primary)" }}
                      >
                        {n} Renkli
                      </span>
                      <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>({gruplar[n].length})</span>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {gruplar[n].map((k) => {
                        // Aynı renk seti AYNI SIRAYLA (index index) bu gruptaki BAŞKA bir kombinasyonda
                        // daha önce (daha küçük kod ile) tanımlıysa, bu kayıt bir MÜKERRERDİR. Farklı
                        // sırayla aynı renkleri kullanan (örn. Siyah/Kahve/Siyah ile Kahve/Siyah/Siyah)
                        // kombinasyonlar FARKLI modeller kabul edilir, mükerrer sayılmaz.
                        const ayniSetIlkKayit = gruplar[n].find(
                          (d) => d.renkIdler.length === k.renkIdler.length && d.renkIdler.every((id, i) => id === k.renkIdler[i])
                        );
                        const mukerrer = ayniSetIlkKayit && ayniSetIlkKayit.id !== k.id;
                        return (
                        <div
                          key={k.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            border: `1px solid ${mukerrer ? "var(--erp-warn)" : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-md)", padding: "8px 10px",
                            background: mukerrer ? "#FCEAEA" : "var(--erp-panel)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>{k.kod}</span>
                            <div style={{ display: "flex" }}>
                              {k.renkIdler.map((id, i) => (
                                <span
                                  key={id}
                                  title={renkAdiGetir(id)}
                                  style={{
                                    width: 14, height: 14, borderRadius: "50%",
                                    background: ((hammaddeRenkleri.find((r) => r.id === id) || {}).renkKodu) || "var(--erp-border)",
                                    border: "1px solid #fff", marginLeft: i === 0 ? 0 : -5,
                                  }}
                                />
                              ))}
                            </div>
                            <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                              {k.renkIdler.map((id) => renkAdiGetir(id)).join(" / ")}
                            </span>
                            {mukerrer && (
                              <span
                                className="mono"
                                style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: "var(--erp-r-pill)", background: "#B85C2E22", color: "var(--erp-warn)" }}
                                title={`Bu renk seti zaten "${ayniSetIlkKayit.kod}" kodunda tanımlı — güvenle silebilirsiniz`}
                              >
                                mükerrer · {ayniSetIlkKayit.kod} ile aynı
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {kullanimGetir && <KullanimGosterge urunler={kullanimGetir(k.id)} />}
                            <button
                              onClick={() => onSil(k.id)}
                              style={{ border: "none", background: "none", color: "#A6957A", cursor: "pointer", display: "flex", padding: 4 }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

