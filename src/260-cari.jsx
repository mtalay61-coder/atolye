function CariModule({ onFiseGitNo, muhasebe, kurlar, onMuhasebeHareketi, cariler, onSave, showToast, onFisSil, siparisler, onGoToSiparis, stok, firmaBilgileri, tanimlarProsesler, tanimlarAraProsesler, onCopaAt, onStokFisiAc, tanimlarFiyatGruplari, onPencereAc, onCekEkle }) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [cariTipSekme, setCariTipSekme] = useState("Tümü");
  // AYNI ANDA TEK KART AÇIK. Her kart kendi açıklık durumunu tutunca birkaç kart üst üste
  // açılıyor ve liste okunamaz hale geliyordu — cari kartı uzun (hareketler, prosesler, formlar).
  // Açık kartın kimliği burada tutulur; yeni bir kart açılınca öncekinin durumu kendiliğinden
  // kapanır. Aynı karta tekrar tıklamak onu kapatır.
  const [acikCariId, setAcikCariId] = useState(null);
  const [pasifSekme, setPasifSekme] = useState(false);
  const [personelProsesSekme, setPersonelProsesSekme] = useState("Tümü");
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    // PARA BİRİMİ FORMDA SORULUYOR (kullanıcı, 9 Eylül: "cari açılışta varsayılan para birimi
    // seçmiyoruz ki, bilgiyi neden alıyor?").
    //
    // Haklıydı: alan formda HİÇ YOKTU. Cari sessizce "TRY" olarak kaydediliyor, kullanıcı ancak
    // kartını açıp düzenlerse fark ediyordu. v1.210.0'da hareket ve fiş formları bu alanı
    // varsayılan olarak kullanmaya başladı — yani sorulmayan bir bilgi karar veriyordu.
    //
    // Varsayılan yine TRY: çoğu cari TL, her seferinde seçtirmek gereksiz. Ama artık GÖRÜNÜR ve
    // değiştirilebilir; sessiz bir varsayım değil.
    return { unvan: "", tip: "Müşteri", telefon: "", vergiNo: "", adres: "", notlar: "", paraBirimi: "TRY" };
  }

  function addCari() {
    if (!form.unvan.trim()) return showToast("Cari unvanı gerekli");
    const cari = {
      id: uid("cari"),
      unvan: form.unvan.trim(),
      tip: form.tip,
      telefon: form.telefon.trim(),
      vergiNo: form.vergiNo.trim(),
      adres: form.adres.trim(),
      notlar: form.notlar.trim(),
      paraBirimi: form.paraBirimi || "TRY",
      hareketler: [],
    };
    onSave([cari, ...cariler]);
    setForm(emptyForm());
    setShowForm(false);
    showToast("Cari eklendi");
  }

  // Ürün silmedeki politikanın CARİ karşılığı: geçmişi olan cari silinmez, onayla da silinmez.
  // Eskiden "Hareketleri de Sil ve Cariyi Sil" seçeneği vardı; bu, carinin tüm borç/alacak geçmişini
  // ve o hareketlere bağlı stok/sipariş etkilerini birlikte götürüyordu. Cari hareketi bir muhasebe
  // kaydıdır — silinmesi bakiyeyi değiştirir, mutabakatı bozar ve karşı taraftaki kasa/banka
  // kayıtlarını yetim bırakır. Bir tıkla geri alınamaz bir zincir başlıyordu.
  function removeCari(id) {
    const cari = cariler.find((c) => c.id === id);
    if (!cari) return;

    // Bu cariye ait bir sipariş varsa (Alış/Satış) — silme kesinlikle engellenir. Cariyi silmek,
    // bu siparişleri "sahipsiz" (var olmayan bir cariye bağlı) bırakır, bu asla izin verilmemeli.
    const bagliSiparis = (siparisler || []).find((s) => s.cariId === id);
    if (bagliSiparis) {
      showToast(`"${cari.unvan}" silinemiyor — bu cariye ait "${bagliSiparis.siparisNo}" siparişi var. Önce o siparişi silin/başka cariye taşıyın.`);
      return;
    }

    // Bu cariye ait bir stok giriş/çıkış hareketi varsa (örn. bu cariden alınan/bu cariye satılan
    // ürün hareketleri) — silme engellenir, aksi halde stok geçmişinde "sahipsiz" bir kayıt kalır.
    const bagliStokHareketi = (stok || []).some((p) => (p.hareketler || []).some((h) => h.cariId === id));
    if (bagliStokHareketi) {
      showToast(`"${cari.unvan}" silinemiyor — bu cariye ait stok giriş/çıkış hareketi var.`);
      return;
    }

    const hareketSayisi = (cari.hareketler || []).length;
    if (hareketSayisi > 0) {
      const borcSayisi = (cari.hareketler || []).filter((h) => h.yon === "Borç").length;
      const alacakSayisi = hareketSayisi - borcSayisi;
      showToast(
        `"${cari.unvan}" silinemez — ${hareketSayisi} hareket kayıtlı (${borcSayisi} borç, ${alacakSayisi} alacak). ` +
        "Geçmişi olan cari silinmez; kullanımdan kaldırmak için yeni işlem girmeyin."
      );
      return;
    }
    // Hareketsiz cari doğrudan siliniyor — çöp kaydı burada alınır (cascade yolunda zaten alınıyor).
    if (onCopaAt) {
      onCopaAt("cari", cari.unvan, cari, {
        ozet: `${cari.tip || "Cari"} — hareketsiz`,
        yanEtkiliMi: false,
      });
    }
    onSave(cariler.filter((c) => c.id !== id));
    showToast("Cari silindi — Tanımlar > Çöp Kutusu'ndan geri alınabilir");
  }

  // hareket tekil bir obje ya da (Muhasebe defterinde olduğu gibi) bir dizi olabilir — hepsi TEK seferde eklenir.
  function addHareket(cariId, hareketVeyaDizi) {
    const gelenler = Array.isArray(hareketVeyaDizi) ? hareketVeyaDizi : [hareketVeyaDizi];
    // TEK ÇAĞRI = TEK FİŞ. Muhasebe defterinde aynı işlem Genel+Resmi olarak iki kayıt üretiyor;
    // numarayı kayıt başına üretmek onlara AYRI numaralar verir ve tek işlem iki fiş gibi görünürdü.
    const yeniNo = fisNoSiradaki(fisOnEki((gelenler[0] || {}).islemTipi), tumFisNumaralari(cariler));
    const eklenecekler = gelenler
      // SON SAVUNMA HATTI — bkz. addCariHareketFromStok. Fişsiz hareket buradan da geçemez.
      // SON SAVUNMA HATTI — bkz. addCariHareketFromStok.
      .map((h) => ({
        ...h, id: h.id || uid("hrk"),
        // Sıra numarası mevcut numaralardan hesaplanıyor; aynı çağrıda birden çok hareket varsa
        // (Muhasebe defterinin Genel+Resmi çifti) hepsi AYNI numarayı alır — onlar tek fiştir.
        fisNo: h.fisNo || yeniNo,
        zaman: h.zaman || new Date().toISOString(),
        // `islemTipi` yalnızca numarayı seçmek için taşındı; kayda yazılmıyor.
        islemTipi: undefined,
      }));
    const next = cariler.map((c) =>
      c.id === cariId ? { ...c, hareketler: [...eklenecekler, ...(c.hareketler || [])] } : c
    );
    onSave(next);
    showToast("Hareket eklendi");
  }



  function updateCariField(cariId, field, value) {
    const next = cariler.map((c) => (c.id === cariId ? { ...c, [field]: value } : c));
    onSave(next);
  }

  // Birden fazla alanı TEK seferde (atomik) günceller — iki ayrı updateCariField çağrısı aynı anda
  // yapılırsa ikincisi birincinin değişikliğini görmeyip üzerine yazabilir, bu yüzden ayrı bir fonksiyon.
  function updateCariFields(cariId, fields) {
    const next = cariler.map((c) => (c.id === cariId ? { ...c, ...fields } : c));
    onSave(next);
  }

  // Bir personelin "Bağlı Prosesler" seçimini değiştirir — SADECE ekler/çıkarır, barkod koduna dokunmaz.
  function bagliProsesToggle(cariId, prosesAdi) {
    const cari = cariler.find((c) => c.id === cariId);
    if (!cari) return;
    const mevcutBagli = cari.bagliProsesler || [];
    const seciliMi = mevcutBagli.includes(prosesAdi);
    const yeniBagli = seciliMi ? mevcutBagli.filter((x) => x !== prosesAdi) : [...mevcutBagli, prosesAdi];
    updateCariField(cariId, "bagliProsesler", yeniBagli);
  }

  // Açıkça seçilen BİR proses için, o prosesin sırasında kalan bir sonraki barkod kodunu hesaplayıp
  // atar (Kesim: 1000, 1001, 1002... gibi) — proses tanımındaki "Başlangıç No"dan başlar, o prosese
  // zaten bağlı personellerin kodlarının en büyüğünün bir fazlasını kullanır. Personel bu prosese
  // henüz bağlı değilse otomatik olarak bağlı prosesler listesine de eklenir.
  function barkodOtomatikAta(cariId, prosesAdi) {
    if (!prosesAdi) {
      showToast("Önce bir proses seçin");
      return;
    }
    const cari = cariler.find((c) => c.id === cariId);
    if (!cari) return;

    const prosesTanim = (tanimlarProsesler || []).find((p) => p.ad === prosesAdi);
    const baslangic = prosesTanim ? (prosesTanim.baslangicNo ?? 1000) : 1000;
    // Kodun hesabı "kim bu prosese etiketli" diye bakmak yerine, doğrudan bu prosesin sayı ARALIĞINA
    // (bandına, örn. Kesim=1000-1999, Saya=2000-2999) hangi kodların düştüğüne bakar. Bu, bir
    // personelin bağlı proses etiketleri karışık/eksik olsa bile SAYININ KENDİSİNİN her zaman doğru
    // prosesin aralığından gelmesini garanti eder — barkod numarasına bakarak hangi prosese ait
    // olduğu her zaman doğru anlaşılır.
    const bandGenisligi = 1000;
    const bandSonu = baslangic + bandGenisligi - 1;
    const buBanttakiKodlar = cariler
      .filter((c) => c.id !== cariId && c.barkodKodu && /^\d+$/.test(c.barkodKodu))
      .map((c) => parseInt(c.barkodKodu, 10))
      .filter((kod) => kod >= baslangic && kod <= bandSonu);
    const yeniKod = buBanttakiKodlar.length > 0 ? Math.max(...buBanttakiKodlar) + 1 : baslangic;

    const mevcutBagli = cari.bagliProsesler || [];
    const yeniBagli = mevcutBagli.includes(prosesAdi) ? mevcutBagli : [...mevcutBagli, prosesAdi];

    updateCariFields(cariId, { bagliProsesler: yeniBagli, barkodKodu: String(yeniKod) });
    showToast(`"${prosesAdi}" için barkod kodu atandı: ${yeniKod}`);
  }

  // Sekme sayıları ile listenin AYNI temele oturması şart. Önceden sayılar ham `cariler`
  // listesinden hesaplanıyordu; liste ise pasif ve arama süzgeçlerinden geçiyordu.
  // Sonuç: "Tümü (9)" yazarken liste boş çıkabiliyordu — kullanıcı için "tutarsız çalışıyor".
  //
  // Ortak taban: aktif/pasif ayrımı ve arama uygulanmış hâl. Tip sekmeleri bunun ÜZERİNE biner,
  // sayılar da bu tabandan sayılır.
  const cariTaban = cariler
    .filter((c) => (pasifSekme ? !!c.pasif : !c.pasif))
    .filter((c) =>
      // KOD DA ARANIYOR: kodun görünür olmasının tek anlamı onunla bulunabilmesi.
      `${c.unvan} ${c.telefon} ${c.vergiNo} ${cariKodMetni(c)}`.toLowerCase().includes(query.toLowerCase())
    );

  const filtered = cariTaban
    .filter((c) => cariTipSekme === "Tümü" || c.tip === cariTipSekme)
    .filter((c) =>
      cariTipSekme !== "Personel" || personelProsesSekme === "Tümü" || (c.bagliProsesler || []).includes(personelProsesSekme)
    );

  // defter verilmezse tüm hareketleri (Genel + Resmi) toplar; "Genel" ya da "Resmi" verilirse sadece o deftere aittir.
  const pasifCariSayisi = cariler.filter((c) => c.pasif).length;

  // ÖZET DE PARA BİRİMİ BAZINDA: farklı para birimlerindeki alacakları toplayıp tek sembolle
  // yazmak, yapılmamış bir kur çevrimini yapılmış gibi gösteriyordu.
  const toplamAlacak = {};
  const toplamBorc = {};
  cariler.forEach((c) => {
    Object.entries(cariBakiyeleri(c)).forEach(([pb, t]) => {
      if (t > 0) toplamAlacak[pb] = (toplamAlacak[pb] || 0) + t;
      else if (t < 0) toplamBorc[pb] = (toplamBorc[pb] || 0) - t;
    });
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {/* PASİF SEKMESİ — pasife alınan kartlar buradan görülür ve geri alınabilir.
            Sayı sıfırsa sekme hiç gösterilmez: hiç pasif kaydı olmayan bir kullanıcıya boş bir
            sekme sunmak, arayüzü sebepsiz kalabalıklaştırırdı. */}
        {pasifCariSayisi > 0 && (
          <button
            type="button"
            onClick={() => setPasifSekme((v) => !v)}
            style={{
              padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: "none", background: "transparent", marginLeft: "auto",
              color: pasifSekme ? "var(--erp-purple)" : "var(--erp-text-3)",
              borderBottom: pasifSekme ? "2px solid #6B4E8A" : "2px solid transparent",
            }}
          >
            Pasifler ({pasifCariSayisi})
          </button>
        )}
        {["Tümü", ...CARI_TIPLERI.filter((t) => t !== "Her İkisi")].map((t) => {
          const aktif = cariTipSekme === t;
          const renkT = t === "Tümü" ? "var(--erp-text)" : (CARI_TIP_RENK[t] || "var(--erp-text-2)");
          const sayi = t === "Tümü" ? cariTaban.length : cariTaban.filter((c) => c.tip === t).length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setCariTipSekme(t)}
              // HER SEKME KENDİ RENGİNDE (kullanıcı, 6 Eylül). Önceden renk YALNIZ seçiliyken
              // görünüyordu; seçili olmayanların hepsi aynı griydi, yani renk "hangi tip" değil
              // "hangisi seçili" bilgisini taşıyordu — zaten dolgudan anlaşılan bir şey.
              //
              // Şimdi renk TİPİ söylüyor, DOLGU seçimi: seçili olan koyu zemin + açık yazı,
              // diğerleri kendi renginde ama soluk. İkisi farklı iki soruya cevap veriyor.
              style={{
                padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${aktif ? renkT : alfaEkle(renkT, "66")}`,
                background: aktif ? renkT : alfaEkle(renkT, "14"),
                color: aktif ? "var(--erp-panel)" : renkT,
              }}
            >
              {t} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
            </button>
          );
        })}
      </div>

      {cariTipSekme === "Personel" && (tanimlarProsesler || []).length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12, paddingLeft: 8 }}>
          {/* Ara prosesler de sekme olarak listelenir: yalnızca ara prosese bağlı bir personel,
              aksi halde hiçbir proses sekmesinde görünmez ve "Tümü" dışında bulunamazdı. */}
          {["Tümü", ...tanimlarProsesler.map((p) => p.ad), ...(tanimlarAraProsesler || []).map((p) => p.ad)].map((t) => {
            const aktif = personelProsesSekme === t;
            // Sayılar da ortak tabandan: aktif/pasif ve arama uygulanmış hâl.
            const sayi = t === "Tümü"
              ? cariTaban.filter((c) => c.tip === "Personel").length
              : cariTaban.filter((c) => c.tip === "Personel" && (c.bagliProsesler || []).includes(t)).length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setPersonelProsesSekme(t)}
                style={{
                  padding: "4px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  border: `1.5px solid ${aktif ? "var(--erp-purple)" : "var(--erp-border)"}`,
                  background: aktif ? "#6B4E8A1A" : "#fff",
                  color: aktif ? "var(--erp-purple)" : "var(--erp-text-3)",
                }}
              >
                {t} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--erp-text-3)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari, telefon veya vergi no ara…"
            style={{
              width: "100%", padding: "8px 10px 8px 32px", borderRadius: "var(--erp-r-md)",
              border: "1px solid var(--erp-line)", background: "var(--erp-panel)", fontSize: 14,
            }}
          />
        </div>
        {cariler.length > 0 && (
          <>
            <span className="mono" style={{ fontSize: 13, color: "var(--erp-primary)", fontWeight: 600 }}>
              Alacak: {bakiyeMetni(toplamAlacak, false)}
            </span>
            <span className="mono" style={{ fontSize: 13, color: "var(--erp-warn)", fontWeight: 600 }}>
              Borç: {bakiyeMetni(toplamBorc, false)}
            </span>
          </>
        )}
        <button className="btn-primary" style={{ marginLeft: "auto" }} onClick={() => setShowForm((s) => !s)}>
          <Plus size={15} /> Cari Ekle
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 16, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 10 }}>
            <Field label="Unvan / Ad Soyad">
              <input value={form.unvan} onChange={(e) => setForm({ ...form, unvan: e.target.value })} placeholder="Örn. Deniz Ayakkabıcılık" style={inputStyle} />
            </Field>
            <Field label="Tip">
              <select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })} style={inputStyle}>
                {CARI_TIPLERI.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Telefon">
              <input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} placeholder="05xx xxx xx xx" style={inputStyle} />
            </Field>
            <Field label="Vergi No">
              <input value={form.vergiNo} onChange={(e) => setForm({ ...form, vergiNo: e.target.value })} placeholder="Opsiyonel" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <Field label="Adres">
              <input value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} placeholder="Opsiyonel" style={inputStyle} />
            </Field>
            <Field label="Not">
              <input value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} placeholder="Opsiyonel" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            {/* Bu carinin alış/satış ve tahsilat formları bu para birimiyle açılacak (v1.210.0).
                Kullanıcı her işlemde yine değiştirebilir. */}
            <Field label="Para Birimi">
              <select
                value={form.paraBirimi}
                onChange={(e) => setForm({ ...form, paraBirimi: e.target.value })}
                title="Bu cariyle yapılan işlemlerde varsayılan para birimi"
                style={inputStyle}
              >
                {MUHASEBE_PARA_BIRIMLERI.map((pb) => (
                  <option key={pb} value={pb}>{pb} {PARA_SEMBOLU[pb] || ""}</option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn-primary btn-save" onClick={addCari}><Save size={14} /> Kaydet</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}><X size={14} /> Vazgeç</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState text={cariler.length === 0 ? "Henüz cari kaydı yok. İlk cariyi ekleyerek başlayın." : "Aramanızla eşleşen cari yok."} />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((c) => (
            <CariCard
              onFiseGitNo={onFiseGitNo}
              muhasebe={muhasebe}
              kurlar={kurlar}
              onMuhasebeHareketi={onMuhasebeHareketi}
              showToast={showToast}
              key={c.id}
              cari={c}
              acik={acikCariId === c.id}
              onAcKapa={() => setAcikCariId((onceki) => (onceki === c.id ? null : c.id))}
              onCekEkle={onCekEkle}
              bakiye={cariBakiyeleri(c)}
              genelBakiye={cariBakiyeleri(c, "Genel")}
              resmiBakiye={cariBakiyeleri(c, "Resmi")}
              onAddHareket={addHareket}
              onFisSil={onFisSil}
              onRemove={removeCari}
              onFieldChange={updateCariField}
              onFieldsChange={updateCariFields}
              siparisler={siparisler}
              onGoToSiparis={onGoToSiparis}
              stok={stok}
              firmaBilgileri={firmaBilgileri}
              tanimlarProsesler={tanimlarProsesler}
              tanimlarAraProsesler={tanimlarAraProsesler}
              onBagliProsesToggle={bagliProsesToggle}
              onBarkodOtomatikAta={barkodOtomatikAta}
              tumCariler={cariler}
              onStokFisiAc={onStokFisiAc}
              tanimlarFiyatGruplari={tanimlarFiyatGruplari}
              onPencereAc={onPencereAc}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Cari hareketlerini fiş no'ya göre gruplar (fiş no yoksa her hareket kendi tekil grubu olur).
function cariHareketleriGrupla(hareketler) {
  const gruplar = [];
  const index = {};
  hareketler.forEach((h) => {
    const key = h.fisNo ? `fis__${h.fisNo}` : `tek__${h.id}`;
    if (!(key in index)) {
      index[key] = gruplar.length;
      // `zaman` DA TAŞINIYOR: ekstre sıralaması gün içinde saate bakıyor (bkz. 265-carikart).
      // Yalnız `tarih` taşınırken aynı günün kayıtları rastgele sırada görünüyordu.
      gruplar.push({ key, fisNo: h.fisNo, tarih: h.tarih, zaman: h.zaman || null, yon: h.yon, odemeSekli: h.odemeSekli, vade: h.vade, hareketler: [] });
    }
    gruplar[index[key]].hareketler.push(h);
  });
  return gruplar;
}


// FİŞ KALEM MATRİSİ — malzeme SATIR, beden SÜTUN (MATRİS KURALI).
//
// Fiş kalemleri iki ekranda gösteriliyor: Fişler modülü ve cari ekstresi. İkisi ayrı ayrı
// yazılmıştı ve zamanla ayrıştılar — biri beden rozetleri, diğeri başka bir düzen. Aynı fiş
// iki ekranda iki farklı şekilde görününce "hangisi doğru" sorusu doğuyordu. Artık TEK bileşen.
//
// Düz liste yerine matris: beş bedenli bir alışta düz liste tek malzemeyi beş satıra yayardı.
//
// BR. FİYAT sütunu kayıt para biriminde; kalem başka parada girildiyse KUR sütunu ham fiyatı ve
// kullanılan kuru gösterir. Yalnızca çevrilmiş fiyatı yazmak "bu 2.000 ₺ nereden çıktı"
// sorusunu cevapsız bırakıyordu.
function FisKalemMatrisi({ urunGruplari, stok, kompakt }) {
  if (!urunGruplari || urunGruplari.length === 0) return null;

  // Sütunlar tüm satırların bedenlerinin birleşimi; bir satırda olmayan beden "—" ile geçilir.
  const tumBedenler = bedenSirala(Array.from(new Set(
    urunGruplari.flatMap((ug) => (ug.items || []).map((h) => h.beden)).filter((b) => b != null && b !== "")
  )));
  // Ölçüsüz malzemede (kilo, desi) beden sütunu hiç açılmaz — boş bir sütun başlığı gürültüdür.
  const bedenliMi = tumBedenler.length > 0;
  const kurVarMi = urunGruplari.some((ug) => (ug.items || []).some((h) => h.kalemParaBirimi));

  const yazi = kompakt ? 10 : 11;
  const bh = { fontSize: yazi - 1, fontWeight: 700, color: "var(--erp-text-2)", padding: "3px 6px", whiteSpace: "nowrap" };
  const td = { fontSize: yazi, padding: "4px 6px", whiteSpace: "nowrap" };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...bh, textAlign: "left" }}>ÜRÜN</th>
            <th style={{ ...bh, textAlign: "left" }}>RENK</th>
            {bedenliMi && tumBedenler.map((b) => (
              <th key={b} className="mono" style={{ ...bh, textAlign: "center" }}>{olcuGoster(b, "Miktar")}</th>
            ))}
            <th style={{ ...bh, textAlign: "right", borderLeft: "1px dashed var(--erp-line)" }}>TOPLAM</th>
            <th style={{ ...bh, textAlign: "right" }}>BR. FİYAT</th>
            {kurVarMi && <th style={{ ...bh, textAlign: "right" }}>KUR</th>}
            <th style={{ ...bh, textAlign: "right" }}>TUTAR</th>
          </tr>
        </thead>
        <tbody>
          {urunGruplari.map((ug) => {
            const items = ug.items || [];
            const miktarVar = items.some((h) => h.miktar != null);
            const toplamAdet = stokYuvarla(items.reduce((t, h) => t + (h.miktar || 0), 0));
            // TUTAR önce kaydın KENDİ tutarından okunur; miktar × fiyat yalnızca tutarı olmayan
            // satırlarda (stok hareketleri) hesaplanır. Her zaman yeniden çarpsaydık, eski
            // kayıtlarda miktar/fiyat eksik olduğu için tutar 0 görünürdü — cariye gerçekten
            // yazılmış rakam varken ekranda sıfır göstermek en yanıltıcı hata olurdu.
            const tutarBilinen = items.some((h) => h.tutar != null);
            const toplamTutar = stokYuvarla(items.reduce(
              (t, h) => t + (h.tutar != null ? h.tutar : (h.miktar || 0) * (h.birimFiyat || 0)), 0));
            const pb = (items[0] || {}).paraBirimi || "TRY";
            const sembol = PARA_SEMBOLU[pb] || pb;
            const cevrimli = items.find((h) => h.kalemParaBirimi);

            // BR. FİYAT sütununda KULLANICININ GİRDİĞİ fiyat, girdiği para biriminde durur.
            // Önce çevrilmiş fiyat yazılıyordu: kullanıcı 0,25 $ girip ekranda 12,03 ₺ görüyor,
            // kendi girdiği rakamı hiçbir yerde bulamıyordu. Çevrim KUR sütununda anlatılıyor.
            //
            // ESKİ KAYITLAR: `hamBirimFiyat`/`kur` alanları sonradan eklendi. O alanları taşımayan
            // kayıtlarda ham fiyat uydurulmaz — kayıtta ne varsa o gösterilir, kur "?" kalır.
            const girilenler = Array.from(new Set(items.map((h) =>
              (h.kalemParaBirimi && h.hamBirimFiyat != null) ? h.hamBirimFiyat : h.birimFiyat
            ).filter((f) => f != null)));
            const tekGirilen = girilenler.length === 1 ? girilenler[0] : null;
            const hamVarMi = !!(cevrimli && cevrimli.hamBirimFiyat != null);
            const girilenPB = hamVarMi ? cevrimli.kalemParaBirimi : pb;
            const girilenSembol = PARA_SEMBOLU[girilenPB] || girilenPB;
            // Çevrilmiş birim fiyat: kur sütununda "= X ₺" olarak gösterilir.
            const cevrilmisBirim = Array.from(new Set(items.map((h) => h.birimFiyat).filter((f) => f != null)));
            const tekCevrilmis = cevrilmisBirim.length === 1 ? cevrilmisBirim[0] : null;
            const urun = (stok || []).find((p) => p.ad === ug.urunAd);
            const gorsel = urun ? ((urun.renkResimleri || {})[ug.renk] || urun.kapakResmi) : null;
            // Miktarı OLMAYAN kayıt hücreye 0 yazdırmaz: eski kayıtlarda miktar hiç saklanmamış,
            // "0 aldım" ile "kaç aldığım kayıtlı değil" apayrı şeyler.
            const bedenIndex = {};
            items.forEach((h) => {
              if (h.miktar == null) return;
              bedenIndex[h.beden] = (bedenIndex[h.beden] || 0) + h.miktar;
            });
            return (
              <tr key={ug.key} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                <td style={{ ...td, fontWeight: 600 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <ColorSwatch src={gorsel} editable={false} size={kompakt ? 16 : 20} />
                    {ug.urunAd}
                  </span>
                </td>
                <td className="mono" style={{ ...td, color: "var(--erp-text-2)" }}>{olcuGoster(ug.renk)}</td>
                {bedenliMi && tumBedenler.map((b) => {
                  const m = bedenIndex[b];
                  if (m == null) return <td key={b} style={{ ...td, textAlign: "center", color: "var(--erp-line-soft)" }}>—</td>;
                  return (
                    <td key={b} className="mono" style={{ ...td, textAlign: "center", fontWeight: 700, color: m < 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                      {stokYuvarla(m)}
                    </td>
                  );
                })}
                <td className="mono" style={{ ...td, textAlign: "right", fontWeight: 700, borderLeft: "1px dashed var(--erp-line)" }}>
                  {miktarVar
                    ? <>{toplamAdet} <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}>{ug.birim || ""}</span></>
                    : <span style={{ fontWeight: 400, color: "var(--erp-line-soft)" }} title="Bu eski kayıtta miktar bilgisi saklanmamış">—</span>}
                </td>
                {/* GİRİLEN fiyat, girildiği para biriminde. */}
                <td className="mono" style={{ ...td, textAlign: "right" }}>
                  {tekGirilen != null
                    ? `${tekGirilen.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} ${girilenSembol}`
                    : girilenler.length > 1
                      ? <span style={{ color: "var(--erp-warn)" }} title="Bedenler farklı birim fiyatta">farklı</span>
                      : <span style={{ color: "var(--erp-line-soft)" }} title="Bu eski kayıtta birim fiyat saklanmamış">—</span>}
                </td>
                {/* İŞLEM AÇIKÇA YAZILIR: "× 48,1 = 12,03 ₺". Kur sözleşmesi "1 yabancı = X TRY"
                    olduğu için yabancıdan TL'ye ÇARPILIR, TL'den yabancıya BÖLÜNÜR; iki yabancı
                    arasında ikisi birden yapılır. Hep "×" yazmak, bölme yapılan durumda yanlış
                    bir işlem göstermek olurdu. */}
                {kurVarMi && (
                  <td className="mono" style={{ ...td, textAlign: "right", color: "var(--erp-text-2)" }}>
                    {cevrimli ? (
                      <span title={`Kalem ${cevrimli.kalemParaBirimi} olarak girildi, ${pb} karşılığına çevrildi`}>
                        {(cevrimli.kur || cevrimli.kurHedef) ? (
                          <>
                            {cevrimli.kur ? `× ${cevrimli.kur.toLocaleString("tr-TR", { maximumFractionDigits: 4 })}` : ""}
                            {cevrimli.kurHedef ? `${cevrimli.kur ? " " : ""}÷ ${cevrimli.kurHedef.toLocaleString("tr-TR", { maximumFractionDigits: 4 })}` : ""}
                          </>
                        ) : (
                          <span style={{ color: "var(--erp-warn)" }} title="Bu eski kayıtta kullanılan kur saklanmamış">kur yok</span>
                        )}
                        {tekCevrilmis != null && (
                          <span style={{ color: "var(--erp-text-3)" }}>
                            {" = "}{tekCevrilmis.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} {sembol}
                          </span>
                        )}
                      </span>
                    ) : "—"}
                  </td>
                )}
                <td className="mono" style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                  {(tutarBilinen || toplamTutar > 0)
                    ? <>{toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembol}</>
                    : <span style={{ fontWeight: 400, color: "var(--erp-line-soft)" }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Bir fiş grubu içindeki hareketleri ürün+renk bazında toplar (yapılandırılmış ürün bilgisi olanlar için).
function urunRenkGrupla(hareketler) {
  const g = [];
  const idx = {};
  hareketler.forEach((h) => {
    if (!h.urunAd) return;
    const key = `${h.urunAd}__${h.renk}`;
    if (!(key in idx)) {
      idx[key] = g.length;
      g.push({ key, urunAd: h.urunAd, renk: h.renk, birim: h.birim, items: [] });
    }
    g[idx[key]].items.push(h);
  });
  return g;
}

