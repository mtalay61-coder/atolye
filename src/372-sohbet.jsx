// ================= SOHBET =================
//
// Kullanıcı (14 Eylül): "Sohbet de olsun, kullanıcıyla aynı bu ekrandan devam etsin. Sohbete görev
// ekleme gibi hepsi sohbetin parçası olsun."
//
// TASARIM: sohbet ANA akış. Görev, sohbetin içinde verilen bir mesaj türü — ayrı bir ekrana
// gitmeye gerek yok. Görev mesajı akışta KART olarak duruyor (durum, atanan, bitiş); durum
// düğmeleri kartın üstünde, "Görevi aç" Görevler modülüne götürüyor. Görevler modülü aynı kayıtla
// çalışmaya devam ediyor (liste/süzgeç/kontrol orada); iki ekran tek veriyi gösteriyor.
//
// KANALLAR:
//   - "ekip": herkesin okuduğu tek akış.
//   - kişi kimliği: iki kişilik özel akış (mesajın `kanal`ı iki kimliğin sıralı birleşimi —
//     "k1|k2" hep aynı sırada, kim yazarsa yazsın aynı kanal).
//
// KAYIT (tekil tablo `mesajlar`, koliler/görevler kalıbı):
//   { id, kanal, kullaniciId, kullaniciAd, metin, zaman, hedef: {tip,id,etiket}|null, gorevId|null }
function mesajKanali(aId, bId) {
  if (!aId || !bId) return "ekip";
  return [aId, bId].sort().join("|");
}

// Kişinin okumadığı mesaj sayısı: son okuma damgası `okumalar[kanal]` (kullanıcı kaydında değil,
// yerelde tutulmuyor — mesajın kendi zamanı ile karşılaştırılıyor; okuma damgası tanımlarda).
function okunmamisSayisi(mesajlar, kanal, sonOkuma, benId) {
  return (mesajlar || []).filter((m) => m.kanal === kanal && m.kullaniciId !== benId
    && (!sonOkuma || m.zaman > sonOkuma)).length;
}

function SohbetModule({ mesajlar, gorevler, kullanicilar, aktifKullanici, onMesajKaydet, onGorevKaydet,
  okumalar, onOkumaKaydet, showToast, siparisler, uretim, stok, onKaydaGit, onGoreveGit, aktifMi }) {
  const benId = aktifKullanici ? aktifKullanici.id : null;
  const [kanal, setKanal] = useState("ekip");
  const [metin, setMetin] = useState("");
  const [hedef, setHedef] = useState(null);
  const [gorevModu, setGorevModu] = useState(false);
  const [gorevAtanan, setGorevAtanan] = useState("");
  const [gorevBitis, setGorevBitis] = useState("");
  const akisRef = useRef(null);

  const digerKullanicilar = (kullanicilar || []).filter((k) => k.id !== benId);
  const kanalAdi = (k) => {
    if (k === "ekip") return "Ekip";
    const digerId = k.split("|").find((x) => x !== benId);
    return ((kullanicilar || []).find((x) => x.id === digerId) || {}).ad || "Kişi";
  };
  const kanalMesajlari = (mesajlar || []).filter((m) => m.kanal === kanal)
    .sort((a, b) => (a.zaman || "").localeCompare(b.zaman || ""));

  // Kanal açılınca en alta kaydır ve okundu damgası at.
  // `aktifMi` ŞART: modül gizli sekmede de monte kalıyor (sekmeler `display:none` ile duruyor).
  // Şart olmadan uygulama açılır açılmaz "ekip" kanalı okundu sayılıyor, okunmamış sayacı eksik
  // gösteriyordu (14 Eylül, senaryoda yakalandı).
  useEffect(() => {
    if (!aktifMi) return;
    if (akisRef.current) akisRef.current.scrollTop = akisRef.current.scrollHeight;
    const son = kanalMesajlari.length ? kanalMesajlari[kanalMesajlari.length - 1].zaman : null;
    if (son && onOkumaKaydet && (!okumalar || okumalar[kanal] !== son)) onOkumaKaydet(kanal, son);
  }, [aktifMi, kanal, kanalMesajlari.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function gonder() {
    const t = metin.trim();
    if (!t) return;
    if (!benId) return showToast("Mesaj göndermek için giriş yapılmalı");
    const zaman = new Date().toISOString();
    let gorevId = null;
    // GÖREV MODU: mesaj hem göreve hem akışa düşüyor. Atanan seçilmemişse kişisel kanalda
    // karşı taraf, ekip kanalında uyarı (göreve sahipsiz atama yapmak, kimsenin yapmaması demek).
    if (gorevModu) {
      const atanan = gorevAtanan || (kanal !== "ekip" ? kanal.split("|").find((x) => x !== benId) : "");
      if (!atanan) { showToast("Görevi kime vereceğinizi seçin"); return; }
      gorevId = uid("gorev");
      const g = {
        id: gorevId, baslik: t, aciklama: "", atananId: atanan, atayanId: benId,
        durum: "Yapılacak", oncelik: "Normal", bitisTarihi: gorevBitis || "",
        olusturma: zaman, guncelleme: zaman, tamamlanma: "",
        hedef: hedef || null, yorumlar: [], kanal,
      };
      onGorevKaydet([g, ...(gorevler || [])]);
    }
    const m = {
      id: uid("mesaj"), kanal, kullaniciId: benId, kullaniciAd: (aktifKullanici && aktifKullanici.ad) || "—",
      metin: t, zaman, hedef: hedef || null, gorevId,
    };
    onMesajKaydet([...(mesajlar || []), m]);
    setMetin(""); setHedef(null); setGorevModu(false); setGorevAtanan(""); setGorevBitis("");
  }

  // Görev kartındaki durum değişimi — Görevler modülündeki kuralın aynısı (kontrol adımı).
  function durumDegistir(g, yeni) {
    if (yeni === "Tamamlandı" && !gorevOnaylayabilirMi(g, aktifKullanici)) {
      return showToast("Tamamlandı'ya yalnız görevi veren ya da Yönetici alabilir");
    }
    const not = {
      id: uid("gyorum"), kullaniciId: benId, kullaniciAd: (aktifKullanici && aktifKullanici.ad) || "—",
      metin: `durum: ${g.durum} → ${yeni}`, zaman: new Date().toISOString(), sistem: true,
    };
    onGorevKaydet((gorevler || []).map((x) => (x.id === g.id
      ? { ...x, durum: yeni, guncelleme: not.zaman, tamamlanma: yeni === "Tamamlandı" ? not.zaman : "", yorumlar: [...(x.yorumlar || []), not] }
      : x)));
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* KANALLAR */}
      <div style={{ flex: "0 0 200px", minWidth: 170, display: "grid", gap: 4 }}>
        {[{ k: "ekip", ad: "Ekip" }, ...digerKullanicilar.map((u) => ({ k: mesajKanali(benId, u.id), ad: u.ad }))].map((x) => {
          const okunmamis = okunmamisSayisi(mesajlar, x.k, (okumalar || {})[x.k], benId);
          const aktif = kanal === x.k;
          return (
            <button key={x.k} type="button" data-sohbet-kanal={x.k} onClick={() => setKanal(x.k)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: "var(--erp-r-md)", cursor: "pointer",
                border: `1px solid ${aktif ? "var(--erp-text)" : "var(--erp-border-2)"}`, background: aktif ? "var(--erp-panel-2)" : "#fff",
                fontSize: 12, fontWeight: aktif ? 700 : 600, color: "var(--erp-text)", textAlign: "left" }}>
              {x.k === "ekip" ? <Users size={13} /> : <MessageCircle size={13} />}
              {x.ad}
              {okunmamis > 0 && (
                <span className="mono" data-sohbet-okunmamis={okunmamis} style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "0 6px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-warn)", color: "#fff" }}>{okunmamis}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* AKIŞ */}
      <div style={{ flex: "1 1 380px", minWidth: 280, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", background: "#fff", display: "grid", gridTemplateRows: "auto 1fr auto", maxHeight: 560 }}>
        <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--erp-line-soft)", fontSize: 12, fontWeight: 700 }}>
          {kanalAdi(kanal)}
          <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}> · {kanalMesajlari.length} mesaj</span>
        </div>

        <div ref={akisRef} data-sohbet-akis={kanal} style={{ overflowY: "auto", padding: 10, display: "grid", gap: 6, alignContent: "start" }}>
          {kanalMesajlari.length === 0 && <EmptyState text="Henüz mesaj yok — ilk yazan siz olun." />}
          {kanalMesajlari.map((m) => {
            const benim = m.kullaniciId === benId;
            const g = m.gorevId ? (gorevler || []).find((x) => x.id === m.gorevId) : null;
            return (
              <div key={m.id} data-sohbet-mesaj={m.id} data-mesaj-gorev={m.gorevId || ""}
                style={{ justifySelf: benim ? "end" : "start", maxWidth: "85%", background: benim ? "#EAF0F4" : "var(--erp-panel)",
                  border: `1px solid ${benim ? "#C3D3DE" : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-md)", padding: "6px 10px" }}>
                <div style={{ fontSize: 10, color: "var(--erp-text-3)" }}>
                  <b style={{ color: "var(--erp-text-2)" }}>{m.kullaniciAd}</b> · <span className="mono">{tarihYaz(m.zaman, true)}</span>
                </div>
                <div style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "var(--erp-text)" }}>{m.metin}</div>
                {m.hedef && (
                  <button type="button" data-mesaj-hedef={m.hedef.tip} onClick={() => onKaydaGit && onKaydaGit(m.hedef)}
                    title="Bağlı kaydı aç"
                    style={{ marginTop: 3, border: "none", background: "none", cursor: "pointer", padding: 0, fontSize: 11, color: "var(--erp-info)", textDecoration: "underline dotted" }}>
                    {m.hedef.tip === "siparis" ? "Sipariş" : m.hedef.tip === "uretim" ? "Üretim" : "Ürün"}: {m.hedef.etiket}
                  </button>
                )}
                {/* GÖREV KARTI: mesaj bir görev doğurduysa durumu burada görünür ve değiştirilebilir. */}
                {g && (
                  <div data-sohbet-gorev={g.id} data-sohbet-gorev-durum={g.durum}
                    style={{ marginTop: 5, borderTop: "1px dashed var(--erp-line)", paddingTop: 5, display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 11, color: "var(--erp-text-2)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: GOREV_DURUM_RENK[g.durum] }}>GÖREV · {g.durum}</span>
                      <span>{((kullanicilar || []).find((k) => k.id === g.atananId) || {}).ad || "—"}</span>
                      {g.bitisTarihi && <span className="mono">bitiş {tarihYaz(g.bitisTarihi)}</span>}
                      <button type="button" data-sohbet-goreve-git={g.id} onClick={() => onGoreveGit && onGoreveGit(g.id)}
                        style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer", fontSize: 11, color: "var(--erp-purple)", textDecoration: "underline dotted", padding: 0 }}>
                        Görevi aç
                      </button>
                      {/* WHATSAPP (kullanıcı, 17 Eylül: "sohbette görevleri whatsapptan gönder
                          olsun"). Atölyede herkes uygulamaya bakmıyor; görev atanınca WhatsApp'tan
                          yollamak en kestirme yol. Numara atanan kişinin kartından geliyor; yoksa
                          WhatsApp kişi seçme ekranı açılıyor (numara uydurmaktan iyi). */}
                      <a
                        data-gorev-whatsapp={g.id}
                        href={(() => {
                          const kisi = (kullanicilar || []).find((k) => k.id === g.atananId) || {};
                          const numara = whatsappNumarasi(kisi.whatsapp || kisi.telefon || "");
                          const metin = encodeURIComponent([
                            `GÖREV: ${g.baslik || m.metin}`,
                            g.bitisTarihi ? `Bitiş: ${tarihYaz(g.bitisTarihi)}` : "",
                            m.hedef && m.hedef.etiket ? `İlgili: ${m.hedef.etiket}` : "",
                            `Veren: ${m.kullaniciAd || ""}`,
                          ].filter(Boolean).join("\n"));
                          return numara ? `https://wa.me/${numara}?text=${metin}` : `https://wa.me/?text=${metin}`;
                        })()}
                        target="_blank" rel="noopener noreferrer"
                        title="Görevi WhatsApp'tan gönder"
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: 11,
                          color: "#25806B", fontWeight: 700, textDecoration: "none" }}
                      >
                        WhatsApp
                      </a>
                    </div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {GOREV_DURUMLARI.filter((d) => d !== "İptal").map((d) => (
                        <button key={d} type="button" data-sohbet-durum={d} disabled={d === g.durum}
                          onClick={() => durumDegistir(g, d)}
                          style={{ padding: "1px 7px", borderRadius: "var(--erp-r-pill)", fontSize: 10, fontWeight: 600, cursor: d === g.durum ? "default" : "pointer",
                            border: `1px solid ${d === g.durum ? GOREV_DURUM_RENK[d] : "var(--erp-border-2)"}`,
                            background: d === g.durum ? `${alfaEkle(GOREV_DURUM_RENK[d], "1A")}` : "#fff",
                            color: d === g.durum ? GOREV_DURUM_RENK[d] : "var(--erp-text-2)" }}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* YAZMA ALANI: kayıt bağla · görev olarak ver · gönder */}
        <div style={{ borderTop: "1px solid var(--erp-line-soft)", padding: 8, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <KayitSecici siparisler={siparisler} uretim={uretim} stok={stok} secili={hedef} onSec={setHedef} />
            <button type="button" className="btn-ghost" data-sohbet-gorev-modu={gorevModu ? "acik" : "kapali"}
              onClick={() => setGorevModu(!gorevModu)}
              title="Bu mesajı görev olarak ver — akışta görev kartı olarak durur"
              style={{ padding: "3px 9px", fontSize: 11, borderColor: gorevModu ? "var(--erp-purple)" : undefined, color: gorevModu ? "var(--erp-purple)" : undefined }}>
              <ClipboardList size={11} /> Görev olarak ver
            </button>
            {gorevModu && (
              <>
                <select value={gorevAtanan} data-sohbet-gorev-atanan="1" onChange={(e) => setGorevAtanan(e.target.value)}
                  style={{ ...inputStyle, width: 150, padding: "3px 6px", fontSize: 11 }}>
                  <option value="">{kanal === "ekip" ? "Kime…" : `${kanalAdi(kanal)} (varsayılan)`}</option>
                  {(kullanicilar || []).map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
                </select>
                <input type="date" value={gorevBitis} data-sohbet-gorev-bitis="1" onChange={(e) => setGorevBitis(e.target.value)}
                  title="Bitiş tarihi" style={{ ...inputStyle, width: 140, padding: "3px 6px", fontSize: 11 }} />
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <textarea value={metin} data-sohbet-kutusu="1" onChange={(e) => setMetin(e.target.value)} rows={2}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); gonder(); } }}
              placeholder={gorevModu ? "Görev ne olsun? (Enter ile ver)" : "Mesaj yazın… (Enter ile gönder, Shift+Enter alt satır)"}
              style={{ ...inputStyle, flex: 1, resize: "vertical", fontSize: 12 }} />
            <button className="btn-primary" data-sohbet-gonder="1" style={{ padding: "6px 14px" }} onClick={gonder}>
              {gorevModu ? "Görevi Ver" : "Gönder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
