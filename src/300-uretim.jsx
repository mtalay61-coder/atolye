function UretimModule({ panelKipi, orders, onSave, showToast, stok, tanimlar, onHurdaTelafi, onProsesTamamla, onProsesVer, onProsesVerGeriAl, onProsesTeslimGeriAl, onRemoveOrder, cariler, onGoToCari, siparisler, onGoToSiparis, hedefUretimId, onHedefTuketildi, onAsortiOlustur, onPencereAc, aktifPencereId, onPencereKapat, onPencereKucult, acikUretimIdleri }) {
  // TAM EKRAN ÜRETİM PENCERESİ.
  //
  // Üretim kartı uzun ve üzerinde uzun süre çalışılıyor: iş ver, teslim al, fire gir. Bu sırada
  // stok bakmak ya da sipariş açmak gerektiğinde kartı kaybetmemek lazımdı. Sipariş ve ürün
  // kartlarında zaten olan pencere sistemi buraya da bağlandı: küçültünce üst sekme çubuğunda
  // kalıyor, başka modüle geçip geri dönülebiliyor.
  // TAM EKRAN ÜRETİMLER — tek kaynak pencere yöneticisi (bkz. StokModule, kullanıcı 11 Eylül:
  // "üst sekmeler düzgün çalışmıyor"). Eskiden tek `tamEkranUretimId` vardı; iki üretim sekmesi
  // açıkken şeritten öncekine dönülünce kart çizilmiyordu.
  const [showForm, setShowForm] = useState(false);
  const [urunId, setUrunId] = useState("");
  const [renk, setRenk] = useState("");
  const [bedenMiktarlar, setBedenMiktarlar] = useState({});
  const [termin, setTermin] = useState("");
  const [not, setNot] = useState("");
  const [uretimSekmeFiltre, setUretimSekmeFiltre] = useState("Tümü");
  const [uretimArama, setUretimArama] = useState("");
  const [uretimTarihFiltre, setUretimTarihFiltre] = useState("Tümü"); // "Tümü" | "Bugün" | "Bu Hafta" | "Bu Ay"
  const [barkodAtolyeAcik, setBarkodAtolyeAcik] = useState(panelKipi === "barkod");
  // Listede AÇIK olan tek kart. Hepsinin birden açık kalması listede gezinmeyi imkânsızlaştırıyordu.
  const [acikKartId, setAcikKartId] = useState(null);
  // PANEL KULLANICISI (17 Eylül): rolü Panel olan kişide ilgili ekran AÇILMIŞ gelir ve kapatma
  // düğmesi çalışmaz — cihaz o ekrana kilitli. Atölyedeki ortak tablet için: kalfa barkodunu
  // okutur, iş listesini görür; menüye, fişlere, cariye hiç ulaşmaz.
  const [atolyeEkraniAcik, setAtolyeEkraniAcik] = useState(panelKipi === "atolye");

  const mamulUrunler = (stok || []).filter((p) => p.kategori === "Mamul");
  const seciliUrun = mamulUrunler.find((p) => p.id === urunId);
  const renkSecenekleri = seciliUrun ? Array.from(new Set(seciliUrun.variants.map((v) => v.renk))) : [];
  const bedenSecenekleri = seciliUrun
    ? bedenSirala(Array.from(new Set(seciliUrun.variants.filter((v) => v.renk === renk).map((v) => v.beden))))
    : [];
  const personelListesi = (cariler || []).filter((c) => c.tip === "Personel" || c.tip === "Her İkisi");

  function resetForm() {
    setUrunId(""); setRenk(""); setBedenMiktarlar({}); setTermin(""); setNot("");
  }

  // Ürünün reçetesinde bu renk için tanımlı prosesleri, tanımlı proses sırasına göre bulur.
  // Reçetede hiç proses belirtilmemişse tek adımlı "Üretim" akışına düşer.
  function prosesIlerlemeOlustur(urun, renk) {
    const siraMap = {};
    (tanimlar.prosesler || []).forEach((p) => { siraMap[p.ad] = p.sira ?? 999; });
    const kullanilanProsesler = Array.from(
      new Set((urun.recete || []).filter((r) => r.mamulRenk === renk && r.proses).map((r) => r.proses))
    );
    if (kullanilanProsesler.length === 0) {
      return [{ proses: "Üretim", sira: 0, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null, atamalar: [] }];
    }
    const siraliAsilProsesler = kullanilanProsesler
      .map((p) => ({ proses: p, sira: siraMap[p] ?? 999, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null, atamalar: [] }))
      .sort((a, b) => a.sira - b.sira);

    // Her asıl prosesin ardına (varsa) bağlı Ara Proses eklenir. Ara proses, kendisinden SONRAKİ asıl
    // proses işe verildiğinde otomatik tamamlanacağı için kendi personel/verme/tamamlama alanları
    // başlangıçta boş kalır, sadece hangi ara proses olduğu ve sabit cariId'si işaretlenir.
    const araEklentileri = urun.araProsesEklentileri || {};
    const araProsesTanimlari = tanimlar.araProsesler || [];
    const sonuc = [];
    siraliAsilProsesler.forEach((adim) => {
      sonuc.push(adim);
      const araId = araEklentileri[adim.proses];
      if (!araId) return;
      const araTanim = araProsesTanimlari.find((ap) => ap.id === araId);
      if (!araTanim) return;
      sonuc.push({
        proses: araTanim.ad, sira: adim.sira + 0.5, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null,
        araProsesMi: true, araProsesId: araTanim.id, araProsesCariId: araTanim.cariId,
      });
    });
    return sonuc;
  }

  function addOrder() {
    if (!seciliUrun) return showToast("Ürün seçin");
    if (!renk) return showToast("Renk seçin");
    const bedenMiktarlari = bedenSecenekleri
      .map((b) => ({ beden: b, miktar: parseFloat(bedenMiktarlar[b]) || 0 }))
      .filter((x) => x.miktar > 0);
    if (bedenMiktarlari.length === 0) return showToast("En az bir ölçüye miktar girin");
    const toplamAdet = bedenMiktarlari.reduce((s, b) => s + b.miktar, 0);
    const bedenOzet = bedenMiktarlari.map((b) => `${b.beden}:${b.miktar}`).join(", ");

    const order = {
      id: uid("uretim"),
      siparisNo: String(1000 + orders.length + 1),
      takipKodu: String(1000 + orders.length + 1),
      model: seciliUrun.ad,
      urunId: seciliUrun.id,
      renk,
      bedenMiktarlari,
      adet: toplamAdet,
      beden: `${renk} · ${bedenOzet}`,
      termin, not: not.trim(),
      asama: "Planlandı",
      stogaEklendiMi: false,
      prosesIlerleme: prosesIlerlemeOlustur(seciliUrun, renk),
      olusturuldu: new Date().toISOString(),
    };
    onSave([order, ...orders]);
    resetForm();
    setShowForm(false);
    showToast("Üretim siparişi oluşturuldu");
  }

  return (
    <div>
      {/* TAM EKRAN ÜRETİM PENCERESİ — sipariş ve ürün kartlarındaki sistemin aynısı.
          Sol menü görünür kalır (left: var(--menu-genislik)), böylece pencere açıkken
          başka modüle geçilebilir; küçültülürse üst sekme çubuğunda bekler. */}
      {(acikUretimIdleri || []).map((tamEkranUretimId) => {
        const o = (orders || []).find((x) => x.id === tamEkranUretimId);
        if (!o) return null;
        // Etkin olmayan kart KURULU KALIYOR, yalnız gizli: içindeki yarım girişler korunuyor.
        const gorunur = aktifPencereId === `uretim-${tamEkranUretimId}`;
        return (
          <div
            key={tamEkranUretimId}
            data-uretim-karti={tamEkranUretimId}
            style={{
              position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
              background: "var(--erp-panel-2)", zIndex: 200, overflowY: "auto",
              display: gorunur ? undefined : "none",
            }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "14px 20px",
                background: "#4B3625", color: "var(--erp-panel-2)", position: "sticky", top: 0, zIndex: 5,
              }}
            >
              <Hammer size={22} />
              <span>
                <span className="mono" style={{ fontSize: 11, letterSpacing: 1, opacity: 0.75, display: "block" }}>ÜRETİM</span>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{o.model}</span>
                <span className="mono" style={{ fontSize: 13, opacity: 0.8, display: "block" }}>
                  {o.siparisNo} · {o.renk}
                </span>
              </span>
              <button
                className="btn-ghost"
                style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12, background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.35)", color: "var(--erp-panel-2)" }}
                onClick={() => onPencereKucult && onPencereKucult()}
                title="Küçült — sekme çubuğunda kalır"
              >
                <ChevronDown size={14} /> Küçült
              </button>
              <button
                className="btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12, background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.35)", color: "var(--erp-panel-2)" }}
                onClick={() => { onPencereKapat && onPencereKapat(`uretim-${tamEkranUretimId}`); }}
              >
                <X size={14} /> Kapat
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <UretimSiparisKarti
                order={o}
                baslangicAcik
                stok={stok}
                cariler={cariler}
                personelListesi={personelListesi}
                tanimlarFireSebepleri={(tanimlar && tanimlar.fireSebepleri) || []}
                tanimlarProsesler={(tanimlar && tanimlar.prosesler) || []}
                onHurdaTelafi={onHurdaTelafi}
                tumUretimler={orders}
                onGoToCari={onGoToCari}
                onProsesTamamla={onProsesTamamla}
                onProsesVer={onProsesVer}
                onProsesVerGeriAl={onProsesVerGeriAl}
                onProsesTeslimGeriAl={onProsesTeslimGeriAl}
                onRemove={onRemoveOrder}
                siparisler={siparisler}
                onGoToSiparis={onGoToSiparis}
                asortiler={(tanimlar && tanimlar.asortiler) || []}
              />
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
        {/* Atölye ekranı: okuma yazma bilmeyen personelin kendi başına kullanabileceği,
            dokunmatik ve görsel ekran. Ofis ekranından ayrı tutuluyor çünkü ikisinin
            kullanıcısı ve gereksinimleri farklı. */}
        <button
          className="btn-primary"
          onClick={() => setAtolyeEkraniAcik(true)}
          style={{ background: "var(--erp-primary)" }}
        >
          <Hammer size={15} /> Atölye Ekranı
        </button>
        {/* BARKOD OKUTMA TEK EKRANDA.
            Önce iki ayrı ekran vardı: "Barkod Okut" (usta iş dağıtıyor) ve "Barkodla Atölye"
            (kalfa işi kendi alıyor/teslim ediyor). İkisi de personel barkodu okutup iş listesi
            gösteriyordu; hangisinin ne yaptığı ancak açınca anlaşılıyordu ve elinde okuyucu olan
            kişi yanlış ekranda "neden çalışmıyor" diye kalıyordu. Tek ekran kaldı. */}
        <button
          className="btn-ghost"
          onClick={() => setBarkodAtolyeAcik(true)}
          style={{ borderColor: "var(--erp-brown)", color: "var(--erp-brown)" }}
        >
          <ScanLine size={15} /> Barkod Okut
        </button>
        <button
                          data-yeni-uretim="1"
          className="btn-primary"
          onClick={() => {
            if (mamulUrunler.length === 0) {
              showToast("Önce Stok ekranından Mamul bir ürün ekleyin");
              return;
            }
            setShowForm((s) => !s);
          }}
        >
          <Plus size={15} /> Yeni Üretim Siparişi
        </button>
      </div>

      {atolyeEkraniAcik && (
        <AtolyeEkrani
          cariler={cariler}
          orders={orders}
          stok={stok}
          onProsesTamamla={onProsesTamamla}
          onProsesVer={onProsesVer}
          onClose={() => setAtolyeEkraniAcik(false)}
        />
      )}

      {barkodAtolyeAcik && (
        <BarkodAtolyeEkrani
          cariler={cariler}
          uretim={orders}
          stok={stok}
          onProsesVer={onProsesVer}
          onProsesTamamla={onProsesTamamla}
          onClose={() => setBarkodAtolyeAcik(false)}
        />
      )}


      {showForm && (
        <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 16, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 10 }}>
            <Field label="Ürün (Mamul)">
              <select
                value={urunId}
                onChange={(e) => { setUrunId(e.target.value); setRenk(""); setBedenMiktarlar({}); }}
                style={inputStyle}
              >
                <option value="">Seçin…</option>
                {secilebilirler(mamulUrunler, urunId).map((p) => <option key={p.id} value={p.id}>{secenekEtiketi(p, p.ad)}</option>)}
              </select>
            </Field>
            <Field label="Termin Tarihi">
              <input type="date" value={termin} onChange={(e) => setTermin(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Not">
              <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Opsiyonel" style={inputStyle} />
            </Field>
          </div>

          {seciliUrun && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>Renk</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {renkSecenekleri.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setRenk(r); setBedenMiktarlar({}); }}
                    style={{
                      padding: "6px 12px", borderRadius: "var(--erp-r-pill)", border: `1.5px solid ${renk === r ? "var(--erp-orange)" : "var(--erp-border)"}`,
                      background: renk === r ? "var(--erp-orange-bg)" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {renk && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--erp-text-2)" }}>
              {(() => {
                const p = prosesIlerlemeOlustur(seciliUrun, renk);
                return p[0].proses === "Üretim" && p.length === 1
                  ? "Bu ürünün reçetesinde proses tanımlanmamış — tek adımlı üretim akışı uygulanacak."
                  : `Bu üretim şu proseslerden geçecek: ${p.map((x) => x.proses).join(" → ")}`;
              })()}
            </div>
          )}

          {renk && bedenSecenekleri.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
                Ölçülere göre üretilecek miktarı girin
              </div>
              <AsortiUygulaKontrolu
                asortiler={tanimlar.asortiler || []}
                bedenSecenekleri={bedenSecenekleri}
                olcuTipi={seciliUrun && seciliUrun.olcuTipi}
                onUygula={(sonuc) => setBedenMiktarlar({ ...bedenMiktarlar, ...sonuc })}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {bedenSecenekleri.map((b) => (
                  <label key={b} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text)" }}>{b}</span>
                    <input
                      type="number"
                      min="0"
                      value={bedenMiktarlar[b] || ""}
                      onChange={(e) => setBedenMiktarlar({ ...bedenMiktarlar, [b]: e.target.value })}
                      style={{ ...inputStyle, width: 60, textAlign: "center", padding: "6px" }}
                    />
                  </label>
                ))}
              </div>
              <AsortiOlusturTeklifi
                degerler={bedenMiktarlar}
                bedenSecenekleri={bedenSecenekleri}
                asortiler={tanimlar.asortiler || []}
                onOlustur={onAsortiOlustur}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn-primary" onClick={addOrder}>Oluştur</button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); resetForm(); }}><X size={14} /> Vazgeç</button>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState text="Henüz üretim siparişi yok. Yeni sipariş oluşturarak takibe başlayın." />
      ) : (() => {
        // Bir siparişin "mevcut aşaması": ilk tamamlanmamış proses adımının adı, hepsi tamamlandıysa "Tamamlandı".
        function mevcutAsama(o) {
          const pi = o.prosesIlerleme || [];
          if (pi.length === 0) return "Tamamlandı";
          const ilkTamamlanmamis = pi.find((p) => !p.tamamlandiMi);
          return ilkTamamlanmamis ? ilkTamamlanmamis.proses : "Tamamlandı";
        }
        // Bir siparişin "referans tarihi": tamamlanmışsa en son tamamlanan adımın tarihi, değilse oluşturulma tarihi.
        // Tarih filtresi (Bugün/Bu Hafta/Bu Ay) bu tarihe göre uygulanır.
        function referansTarih(o) {
          const pi = o.prosesIlerleme || [];
          if (mevcutAsama(o) === "Tamamlandı" && pi.length > 0) {
            const tarihler = pi.map((p) => p.tamamlanmaTarihi).filter(Boolean).map((t) => new Date(t).getTime());
            if (tarihler.length > 0) return new Date(Math.max(...tarihler));
          }
          return o.olusturuldu ? new Date(o.olusturuldu) : null;
        }
        function tarihFiltresineUyar(o) {
          if (uretimTarihFiltre === "Tümü") return true;
          const t = referansTarih(o);
          if (!t) return false;
          const simdi = new Date();
          if (uretimTarihFiltre === "Bugün") {
            return t.toDateString() === simdi.toDateString();
          }
          if (uretimTarihFiltre === "Bu Hafta") {
            const gun = simdi.getDay() || 7; // Pazartesi=1 ... Pazar=7
            const haftaBasi = new Date(simdi); haftaBasi.setDate(simdi.getDate() - gun + 1); haftaBasi.setHours(0, 0, 0, 0);
            return t >= haftaBasi;
          }
          if (uretimTarihFiltre === "Bu Ay") {
            return t.getFullYear() === simdi.getFullYear() && t.getMonth() === simdi.getMonth();
          }
          return true;
        }
        function aramayaUyar(o) {
          const q = uretimArama.trim().toLocaleLowerCase("tr-TR");
          if (!q) return true;
          const bagliSatis = (siparisler || []).find((s) =>
            s.tip === "Satış" && s.kalemler.some((k) => k.planlama && k.planlama.tip === "Üretim" && k.planlama.referansNo === o.siparisNo)
          );
          const musteriAdi = bagliSatis ? (((cariler || []).find((c) => c.id === bagliSatis.cariId) || {}).unvan || "") : "";
          const parcalar = [o.model, o.siparisNo, o.renk, o.not || "", musteriAdi];
          return parcalar.join(" ").toLocaleLowerCase("tr-TR").includes(q);
        }

        // Bir siparişin, SON prosesten geçip (teslim alınıp) fiilen stoğa eklenmiş adedini hesaplar —
        // sipariş henüz tamamen bitmemiş olsa bile (örn. 56 adetlik siparişin 32'si son prosesten
        // geçtiyse), bu 32 adet artık "tamamlanan" sayılır; kalan 24 adet "devam eden" olarak kalır.
        // Böylece kısmi üretim ilerlemesi, alt özet toplamlarına da doğru şekilde yansır.
        function siparisTamamlananAdet(o) {
          if (mevcutAsama(o) === "Tamamlandı") return o.adet || 0;
          const pi = o.prosesIlerleme || [];
          if (pi.length === 0) return 0;
          const sonAdim = pi[pi.length - 1];
          if (sonAdim.araProsesMi) return 0;
          return (sonAdim.atamalar || []).filter((a) => a.tamamlandiMi).reduce((s, a) => s + a.miktar, 0);
        }

        const asamaSayaci = {};
        orders.forEach((o) => {
          const a = mevcutAsama(o);
          asamaSayaci[a] = (asamaSayaci[a] || 0) + 1;
        });
        // Sekme sırası: proses tanımlarındaki sıraya göre, "Tamamlandı" en sona.
        const prosesSiraMap = {};
        (tanimlar.prosesler || []).forEach((p) => { prosesSiraMap[p.ad] = p.sira ?? 999; });
        const asamalar = Object.keys(asamaSayaci)
          .filter((a) => a !== "Tamamlandı")
          .sort((a, b) => (prosesSiraMap[a] ?? 999) - (prosesSiraMap[b] ?? 999));
        if (asamaSayaci["Tamamlandı"]) asamalar.push("Tamamlandı");

        // uretimSekmeFiltre artık VAR OLMAYAN bir aşamada (örn. tüm siparişler bitip o aşama hiç
        // kalmadığında) takılı kalmışsa, "hiç veri yok" gibi görünen ama aslında sadece yanlış
        // sekmede olan bir ekranla karşılaşılır — bu durumda otomatik olarak "Tümü"ye döner.
        //
        // BAYAT OKUMA (22 Eylül, denetim 18): set çağrıldıktan sonra bu çizimde `uretimSekmeFiltre`
        // hâlâ ESKİ değeri veriyordu; liste bir kare boş çiziliyor, sonra düzeliyordu. Bu çizim
        // artık GEÇERLİ sekmeyle çiziliyor (`gecerliSekme`); set yalnız state'i ona eşitliyor.
        const sekmeGecersiz = uretimSekmeFiltre !== "Tümü" && uretimSekmeFiltre !== "Proses" && !asamalar.includes(uretimSekmeFiltre);
        const gecerliSekme = sekmeGecersiz ? "Tümü" : uretimSekmeFiltre;
        if (sekmeGecersiz) {
          setUretimSekmeFiltre("Tümü");
        }

        const sekmeliOrders = gecerliSekme === "Tümü" ? orders : orders.filter((o) => mevcutAsama(o) === gecerliSekme);
        const filtreliOrders = sekmeliOrders.filter((o) => tarihFiltresineUyar(o) && aramayaUyar(o));
        const toplamAdet = filtreliOrders.reduce((s, o) => s + (o.adet || 0), 0);
        // Alt özet için: sekme seçiminden bağımsız olarak (sadece arama+tarih filtresine göre),
        // Tamamlanan ve Devam Eden toplamlarını ayrı ayrı hesapla — ARTIK BİRİM (adet) bazında,
        // aynı siparişin içindeki kısmen tamamlanmış kısmı da "Tamamlanan"a dahil ederek.
        const tamamlananToplam = filtreliOrders.reduce((s, o) => s + siparisTamamlananAdet(o), 0);
        const devamEdenToplam = filtreliOrders.reduce((s, o) => s + Math.max(0, (o.adet || 0) - siparisTamamlananAdet(o)), 0);
        const tamamlananSiparisSayisi = filtreliOrders.filter((o) => mevcutAsama(o) === "Tamamlandı").length;
        const devamEdenSiparisSayisi = filtreliOrders.filter((o) => mevcutAsama(o) !== "Tamamlandı").length;

        return (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 340 }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: 9, color: "var(--erp-text-3)" }} />
                <input
                  value={uretimArama}
                  onChange={(e) => setUretimArama(e.target.value)}
                  placeholder="Model, sipariş no, renk ara…"
                  style={{
                    width: "100%", padding: "7px 10px 7px 32px", borderRadius: "var(--erp-r-md)",
                    border: "1px solid var(--erp-line)", background: "var(--erp-panel)", fontSize: 13,
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {["Tümü", "Bugün", "Bu Hafta", "Bu Ay"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setUretimTarihFiltre(d)}
                    style={{
                      padding: "6px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: `1.5px solid ${uretimTarihFiltre === d ? "var(--erp-orange)" : "var(--erp-border)"}`,
                      background: uretimTarihFiltre === d ? "var(--erp-orange-bg)" : "#fff",
                      color: uretimTarihFiltre === d ? "var(--erp-orange)" : "var(--erp-text-2)",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {asamalar.length >= 1 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                {["Tümü", ...asamalar, "Proses"].map((a) => {
                  const aktif = gecerliSekme === a;
                  const renkA = a === "Proses" ? "var(--erp-purple)" : a === "Tamamlandı" ? "var(--erp-primary)" : a === "Tümü" ? "var(--erp-text)" : "var(--erp-brown)";
                  const sayi = a === "Proses" ? null : a === "Tümü" ? orders.length : (asamaSayaci[a] || 0);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setUretimSekmeFiltre(a)}
                      style={{
                        padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        border: `1.5px solid ${aktif ? renkA : "var(--erp-border)"}`,
                        background: aktif ? alfaEkle(renkA, "1A") : "#fff",
                        color: aktif ? renkA : "var(--erp-text-2)",
                      }}
                    >
                      {a} {sayi !== null && <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {gecerliSekme === "Proses" ? (() => {
              // Her proses türü için: o proseste bekleyen (henüz o adımı tamamlamamış) siparişlerin
              // sayısı ve toplam adedi, ayrıca "verilmiş ama teslim alınmamış" olanların ayrı sayısı.
              const prosesAdlari = Array.from(new Set(
                orders.flatMap((o) => (o.prosesIlerleme || []).map((p) => p.proses))
              )).sort((a, b) => (prosesSiraMap[a] ?? 999) - (prosesSiraMap[b] ?? 999));
              return (
                <div style={{ display: "grid", gap: 10 }}>
                  {prosesAdlari.length === 0 ? (
                    <EmptyState text="Henüz proses tanımlı bir üretim siparişi yok." />
                  ) : (
                    prosesAdlari.map((prosesAdi) => {
                      const buProsesteBekleyen = orders.filter((o) => {
                        const p = (o.prosesIlerleme || []).find((x) => x.proses === prosesAdi);
                        return p && !p.tamamlandiMi;
                      });
                      const verilmis = buProsesteBekleyen.filter((o) => {
                        const p = o.prosesIlerleme.find((x) => x.proses === prosesAdi);
                        return p.verildiMi;
                      });
                      const henuzVerilmemis = buProsesteBekleyen.length - verilmis.length;
                      const toplamAdetBu = buProsesteBekleyen.reduce((s, o) => s + (o.adet || 0), 0);
                      return (
                        <div key={prosesAdi} style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)" }}>{prosesAdi}</span>
                            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-purple)" }}>
                              {toplamAdetBu.toLocaleString("tr-TR")} adet
                              <span style={{ fontWeight: 400, color: "var(--erp-text-3)", fontSize: 12 }}> ({buProsesteBekleyen.length} sipariş)</span>
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--erp-text-2)" }}>
                            <span>
                              Verildi (rezerve):{" "}
                              <span className="mono" style={{ fontWeight: 700, color: "#8A6A2E" }}>{verilmis.length} sipariş</span>
                            </span>
                            <span>
                              Henüz verilmedi:{" "}
                              <span className="mono" style={{ fontWeight: 700, color: "var(--erp-text-3)" }}>{henuzVerilmemis} sipariş</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })() : (
            <>
            {filtreliOrders.length === 0 ? (
              <EmptyState text="Bu filtrelerle eşleşen üretim siparişi yok." />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filtreliOrders.map((o) => (
                  <UretimSiparisKarti
                    key={o.id}
                    order={o}
                    // AKORDEON: aynı anda tek kart açık. Bir kartı açmak diğerini kapatıyor.
                    acikDisaridan={acikKartId === o.id}
                    onAcKapa={(deger) => setAcikKartId(deger ? o.id : null)}
                    onTamEkran={() => { onPencereAc && onPencereAc("uretim", o.id, `Üretim: ${o.siparisNo}`, {}); }}
                    stok={stok}
                    cariler={cariler}
                    personelListesi={personelListesi}
                    tanimlarFireSebepleri={(tanimlar && tanimlar.fireSebepleri) || []}
                    tanimlarProsesler={(tanimlar && tanimlar.prosesler) || []}
                    onHurdaTelafi={onHurdaTelafi}
                    tumUretimler={orders}
                    onGoToCari={onGoToCari}
                    onProsesTamamla={onProsesTamamla}
                    onProsesVer={onProsesVer}
                    onProsesVerGeriAl={onProsesVerGeriAl}
                    onProsesTeslimGeriAl={onProsesTeslimGeriAl}
                    onRemove={onRemoveOrder}
                    siparisler={siparisler}
                    onGoToSiparis={onGoToSiparis}
                    hedefli={o.id === hedefUretimId}
                    onHedefGoruldu={o.id === hedefUretimId ? onHedefTuketildi : undefined}
                    asortiler={tanimlar.asortiler || []}
                  />
                ))}
              </div>
            )}
            </>
            )}

            {gecerliSekme !== "Proses" && (
            <div
              style={{
                marginTop: 18, padding: "12px 16px", borderRadius: "var(--erp-r-md)",
                background: "#F0F5EE", border: "1px solid #8FA888",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--erp-text)" }}>
                  {gecerliSekme === "Tümü" ? "Bu görünümdeki toplam" : gecerliSekme}
                  {uretimTarihFiltre !== "Tümü" ? ` · ${uretimTarihFiltre}` : ""}
                  {uretimArama.trim() ? ` · "${uretimArama.trim()}"` : ""}
                </span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--erp-primary)" }}>
                  {toplamAdet.toLocaleString("tr-TR")} adet
                  <span style={{ fontWeight: 400, color: "var(--erp-text-2)", fontSize: 12 }}> ({filtreliOrders.length} sipariş)</span>
                </span>
              </div>
              <div style={{ display: "flex", gap: 20, paddingTop: 8, borderTop: "1px solid #C9D9C4", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                  Tamamlanan{uretimTarihFiltre !== "Tümü" ? ` (${uretimTarihFiltre})` : ""}:{" "}
                  <span className="mono" style={{ fontWeight: 700, color: "var(--erp-primary)" }}>
                    {tamamlananToplam.toLocaleString("tr-TR")} adet
                  </span>
                  <span style={{ color: "var(--erp-text-3)" }}> ({tamamlananSiparisSayisi} sipariş)</span>
                </span>
                <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                  Devam Eden:{" "}
                  <span className="mono" style={{ fontWeight: 700, color: "var(--erp-brown)" }}>
                    {devamEdenToplam.toLocaleString("tr-TR")} adet
                  </span>
                  <span style={{ color: "var(--erp-text-3)" }}> ({devamEdenSiparisSayisi} sipariş)</span>
                </span>
              </div>
            </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

