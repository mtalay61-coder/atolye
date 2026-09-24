// Teslim alma formu: sağlam / tamir / hurda. Ayrı bileşen, çünkü üretim kartı zaten büyük ve
// bu formun kendi durumu var (beden başına üç sayı + tamir ayrıntıları).
function TeslimAlmaFormu({ atama, prosesler, buProses, hammaddeler, iadeAdaylari, fireSebepleri, personeller, onKaydet }) {
  const bedenler = Object.keys(atama.bedenMiktarlari || {}).filter((b) => atama.bedenMiktarlari[b] > 0);
  const [satirlar, setSatirlar] = useState(() => {
    const bas = {};
    bedenler.forEach((b) => { bas[b] = { saglam: String(atama.bedenMiktarlari[b]), tamir: "", hurda: "" }; });
    return bas;
  });
  // Tamir ayrıntıları beden bazında: hangi prosese döner, sebep, hangi hammaddeler yeniden çıkar, ücret.
  const [tamirDetay, setTamirDetay] = useState({});
  // Artan hammadde: { "urunId|renk|beden": miktarDizesi }. İşaretlenmemiş olan girilmemiş sayılır.
  // ARTAN, VERİLEN − REÇETE FARKINDAN ÖN DOLUYOR (kullanıcı, 6 Eylül: "arkada otomatik 90
  // getirsin, az veya fazla varsa kullanıcı girsin").
  //
  // `atama.verilenHammaddeler` verirken kaydedildi: 390 desi verilmiş, reçete 300 diyor → artan 90.
  // Fark yoksa (reçete kadar verildiyse) kutu boş kalıyor; sıfır yazmak "artan yok" demenin
  // gürültülü hâli olurdu.
  // EK ALINAN HAMMADDE (kullanıcı, 20 Eylül: "malzeme yetmeyince kullanıcı fazla malzeme
  // alabilir; bunu girmek için çıkışta bildirmesi gerek — teslim ederken artan malzeme ve eksik
  // kalan malzeme olarak girilebilsin").
  //
  // Girişte ne verildiği yazılıyordu ama iş sırasında depodan EK malzeme alınırsa bunun kaydı
  // hiçbir yerde yoktu: stok fiilen azalıyor, kayıt azalmıyordu. Artık teslimde iki yön de
  // girilebiliyor — artan geri döner, ek alınan stoktan çıkar.
  const [ekAlinanlar, setEkAlinanlar] = useState({});
  const [iadeler, setIadeler] = useState(() => {
    const bas = {};
    Object.entries(atama.verilenHammaddeler || {}).forEach(([anahtar, v]) => {
      const fark = stokYuvarla((v.verilen || 0) - (v.beklenen || 0));
      if (fark > 0) bas[anahtar] = String(fark);
    });
    return bas;
  });
  const [hurdaSebep, setHurdaSebep] = useState({});

  const sayi = (x) => parseFloat(x) || 0;
  const satirToplam = (b) => sayi(satirlar[b].saglam) + sayi(satirlar[b].tamir) + sayi(satirlar[b].hurda);
  const toplamSaglam = bedenler.reduce((t, b) => t + sayi(satirlar[b].saglam), 0);
  const toplamTamir = bedenler.reduce((t, b) => t + sayi(satirlar[b].tamir), 0);
  const toplamHurda = bedenler.reduce((t, b) => t + sayi(satirlar[b].hurda), 0);
  // KISMİ TESLİM serbesttir: usta 8 çiftin 5'ini bitirip getirebilir, kalanı sonra teslim eder.
  // Hata yalnızca verilenden FAZLA olduğunda — olmayan çift teslim edilemez.
  const hataliBedenler = bedenler.filter((b) => satirToplam(b) - atama.bedenMiktarlari[b] > 0.001);
  const teslimToplami = bedenler.reduce((t, b) => t + satirToplam(b), 0);
  const kalanToplam = stokYuvarla(atama.miktar - teslimToplami);

  // Tamirde geri dönülebilecek prosesler: bu prosesin KENDİSİ ve ÖNCEKİLERİ. Sonraki bir prosese
  // "geri" göndermek anlamsız olurdu.
  const buIndex = prosesler.findIndex((p) => p === buProses);
  const geriProsesler = prosesler.slice(0, buIndex + 1);

  function kaydet() {
    if (hataliBedenler.length > 0) return;
    if (teslimToplami <= 0) return;
    const saglam = {};
    const tamir = [];
    const hurda = [];
    bedenler.forEach((b) => {
      const s = sayi(satirlar[b].saglam);
      if (s > 0) saglam[b] = s;
      const t = sayi(satirlar[b].tamir);
      if (t > 0) {
        const d = tamirDetay[b] || {};
        tamir.push({
          beden: b, miktar: t,
          hedefProses: d.hedefProses || buProses,
          sebep: d.sebep || "",
          hammaddeler: d.hammaddeler || [],
          ucret: parseFloat(d.ucret) || 0,
          // Seçilmediyse (undefined) işi yapan kişi varsayılır; boş string seçildiyse "sonra atanacak".
          personelId: d.personelId === undefined ? (atama.personelId || null) : (d.personelId || null),
        });
      }
      const h = sayi(satirlar[b].hurda);
      if (h > 0) hurda.push({ beden: b, miktar: h, sebep: hurdaSebep[b] || "" });
    });
    // Artan hammadde stoğa geri döner. Tüketim reçeteye göre yazılmaya devam eder; iade AYRI bir
    // giriş hareketi olur. Böylece hem "ne verildi" hem "ne geri geldi" kayıtta durur —
    // tüketimi doğrudan azaltmak, fire hesabını ve geçmişi izlenemez hale getirirdi.
    const iadeListesi = [];
    (iadeAdaylari || []).forEach((h2) => {
      const anahtar = `${h2.urunId}|${h2.renk}|${h2.beden}`;
      const m = parseFloat(iadeler[anahtar]) || 0;
      if (m > 0) iadeListesi.push({ urunId: h2.urunId, ad: h2.ad, renk: h2.renk, beden: h2.beden, miktar: m, birim: h2.birim });
    });
    // EK ALINAN: iadenin tersi — stoktan ÇIKAR, ayrı hareket olur. Tüketimi doğrudan artırmak
    // yerine ayrı kayıt: "ne verildi, ne ek alındı, ne geri geldi" üçü de görünür kalsın.
    const ekAlinanListesi = [];
    (iadeAdaylari || []).forEach((h2) => {
      const anahtar = `${h2.urunId}|${h2.renk}|${h2.beden}`;
      const m = parseFloat(ekAlinanlar[anahtar]) || 0;
      if (m > 0) ekAlinanListesi.push({ urunId: h2.urunId, ad: h2.ad, renk: h2.renk, beden: h2.beden, miktar: m, birim: h2.birim });
    });
    onKaydet({ saglam, tamir, hurda, iadeler: iadeListesi, ekAlinanlar: ekAlinanListesi });
  }

  const kutu = (b, alan, renk) => (
    <input
      type="number" min="0" step="1"
      value={satirlar[b][alan]}
      onChange={(e) => setSatirlar({ ...satirlar, [b]: { ...satirlar[b], [alan]: e.target.value } })}
      style={{
        width: 58, padding: "4px 6px", fontSize: 12, textAlign: "center", fontWeight: 700,
        border: `1px solid ${renk}66`, borderRadius: "var(--erp-r-sm)", color: renk, background: "#fff",
      }}
    />
  );

  return (
    // width:100% — kap flex+wrap olduğu için form kendi satırına iner, personelin yanına sıkışmaz.
    <div style={{ width: "100%", background: "var(--erp-panel)", border: "1.5px solid #4E6B4E", borderRadius: "var(--erp-r-md)", padding: 12, marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-primary)", marginBottom: 8 }}>
        Teslim Al · {atama.miktar} adet verilmişti
      </div>

      <div style={{ overflowX: "auto" }}>
        {/* MATRİS DÜZENİ — bedenler SÜTUN, sonuç türleri SATIR.
            Önceki düzende her beden bir satırdı: beş bedenlik bir işte altı satır, kırk bedenlik
            bir işte kırk bir satır. Ekran boyunca kaydırmak gerekiyordu ve toplamları görmek
            için hepsini gözle toplamak zorundaydınız.
            Matris düzeninde satır sayısı SABİT (verilen, sağlam, tamir, hurda) — beden sayısı
            arttıkça yalnızca yatayda genişler. Uygulamanın diğer matrisleriyle de aynı dil. */}
        <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
          <thead>
            <tr>
              <th style={{ fontSize: 11, padding: "4px 8px", color: "var(--erp-text-2)", textAlign: "left" }}>BEDEN</th>
              {bedenler.map((b) => {
                const hatali = satirToplam(b) - atama.bedenMiktarlari[b] > 0.001;
                return (
                  <th
                    key={b}
                    className="mono"
                    style={{
                      fontSize: 14, fontWeight: 700, padding: "4px 6px", textAlign: "center",
                      color: hatali ? "var(--erp-warn)" : "#221B14", whiteSpace: "nowrap",
                    }}
                  >
                    {b}
                  </th>
                );
              })}
              <th className="mono" style={{ fontSize: 11, padding: "4px 10px", color: "var(--erp-text-2)", textAlign: "right" }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: "1px solid #E4D8C0" }}>
              <td style={{ fontSize: 11, padding: "5px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>VERİLEN</td>
              {bedenler.map((b) => (
                <td key={b} className="mono" style={{ fontSize: 13, padding: "5px 6px", textAlign: "center", color: "var(--erp-text-2)" }}>
                  {atama.bedenMiktarlari[b]}
                </td>
              ))}
              <td className="mono" style={{ fontSize: 13, fontWeight: 700, padding: "5px 10px", textAlign: "right", color: "var(--erp-text-2)" }}>
                {atama.miktar}
              </td>
            </tr>
            {[
              { anahtar: "saglam", etiket: "SAĞLAM", renk: "var(--erp-primary)" },
              { anahtar: "tamir", etiket: "TAMİR", renk: "#B8860B" },
              { anahtar: "hurda", etiket: "HURDA", renk: "var(--erp-warn)" },
            ].map((satir) => (
              <tr key={satir.anahtar} style={{ borderTop: "1px solid #E4D8C0" }}>
                <td style={{ fontSize: 11, fontWeight: 700, padding: "5px 8px", color: satir.renk, whiteSpace: "nowrap" }}>
                  {satir.etiket}
                </td>
                {bedenler.map((b) => (
                  <td key={b} style={{ padding: "5px 6px", textAlign: "center" }}>{kutu(b, satir.anahtar, satir.renk)}</td>
                ))}
                <td className="mono" style={{ fontSize: 13, fontWeight: 700, padding: "5px 10px", textAlign: "right", color: satir.renk }}>
                  {bedenler.reduce((t, b) => t + (parseFloat((satirlar[b] || {})[satir.anahtar]) || 0), 0) || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tamir ayrıntıları — yalnızca tamir girilen bedenler için. */}
      {bedenler.filter((b) => sayi(satirlar[b].tamir) > 0).map((b) => {
        const d = tamirDetay[b] || {};
        const guncelle = (alan, deger) => setTamirDetay({ ...tamirDetay, [b]: { ...d, [alan]: deger } });
        return (
          <div key={b} style={{ background: "#FDF6E3", border: "1px solid #B8860B55", borderRadius: "var(--erp-r-md)", padding: 8, marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#B8860B", marginBottom: 6 }}>
              Tamir · {b} bedeni · {sayi(satirlar[b].tamir)} çift
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>Hangi prosese dönsün</span>
                <select value={d.hedefProses || buProses} onChange={(e) => guncelle("hedefProses", e.target.value)} style={{ ...inputStyle, width: 140, padding: "5px 7px", fontSize: 12 }}>
                  {geriProsesler.map((pr) => <option key={pr} value={pr}>{pr}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>Sebep</span>
                <select value={d.sebep || ""} onChange={(e) => guncelle("sebep", e.target.value)} style={{ ...inputStyle, width: 150, padding: "5px 7px", fontSize: 12 }}>
                  <option value="">Belirtilmedi</option>
                  {fireSebepleri.map((sb) => <option key={sb} value={sb}>{sb}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Tamiri BAŞKA biri yapabilir: hatayı yapan usta uzaktaysa, yakındaki bir ustaya
                    yaptırılıp ücret ona ödenir. Bu yüzden personel burada serbestçe seçilir —
                    varsayılan olarak işi yapan kişi gelir ama değiştirilebilir. */}
                <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>Tamiri kim yapacak</span>
                <select
                  value={d.personelId === undefined ? (atama.personelId || "") : d.personelId}
                  onChange={(e) => guncelle("personelId", e.target.value)}
                  style={{ ...inputStyle, width: 150, padding: "5px 7px", fontSize: 12 }}
                >
                  <option value="">Sonra atanacak</option>
                  {(personeller || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.unvan}{c.id === atama.personelId ? " (işi yapan)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Ücret DEĞİŞKEN: hatayı yapan usta bedelsiz düzeltebilir (0), başka birine
                    yaptırılırsa ona ödenir. Reçetedeki proses ücretiyle ilgisi yoktur. */}
                <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>Tamir ücreti (₺/adet)</span>
                <input
                  type="number" min="0" step="0.01"
                  value={d.ucret || ""}
                  onChange={(e) => guncelle("ucret", e.target.value)}
                  placeholder="0 = ücretsiz"
                  title="Boş ya da 0 bırakılırsa tamir için ödeme yapılmaz"
                  style={{ ...inputStyle, width: 120, padding: "5px 7px", fontSize: 12 }}
                />
              </label>
            </div>
            {hammaddeler.length > 0 && (
              <div style={{ marginTop: 7 }}>
                <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>Tamirde yeniden çıkacak hammaddeler (seçmeli)</span>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                  {hammaddeler.map((h) => {
                    const secili = (d.hammaddeler || []).includes(h.id);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => guncelle("hammaddeler", secili ? (d.hammaddeler || []).filter((x) => x !== h.id) : [...(d.hammaddeler || []), h.id])}
                        style={{
                          padding: "3px 9px", borderRadius: "var(--erp-r-pill)", fontSize: 10, fontWeight: 600, cursor: "pointer",
                          border: `1.5px solid ${secili ? "#B8860B" : "var(--erp-border-2)"}`,
                          background: secili ? "#B8860B" : "#fff",
                          color: secili ? "var(--erp-panel-2)" : "var(--erp-text-2)",
                        }}
                      >
                        {h.ad}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ---- ARTAN HAMMADDE ----
          Kesimde deri artar, ambalajda kutu artar; bu malzeme çöp değil, stoğa geri dönmeli.
          Beklenen miktar yanında gösteriliyor: kullanıcı neye göre değerlendireceğini bilmeli. */}
      {(iadeAdaylari || []).length > 0 && (
        <div style={{ marginTop: 10, background: "#F0F5EE", border: "1px solid #8FA888", borderRadius: "var(--erp-r-md)", padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
            <Layers size={14} color="var(--erp-primary)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-primary)" }}>Artan ve eksik malzeme</span>
          </div>
          {/* SÜTUN BAŞLIKLARI (kullanıcı, 20 Eylül: "üzerine açıklama yaz, artan ve eksik malzeme
              olarak başlık yap"). İki kutu yan yana durunca hangisinin ne olduğu ancak
              başlıkla anlaşılıyor; renk tek başına yetmez. */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--erp-primary)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "var(--erp-r-sm)", border: "1px solid #8FA888", background: "#fff" }} />
              <b>Artan</b> — işten geriye kalan, stoğa geri döner
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--erp-warn)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "var(--erp-r-sm)", border: "1px solid #C97B3D", background: "#FFF8F2" }} />
              <b>Ek alınan</b> — malzeme yetmeyince depodan fazladan alınan, stoktan düşer
            </span>
          </div>
          {(() => {
            // MATRİS: malzeme satır, beden sütun (proje kuralı). Önce "giriş kutuları hücreye
            // sıkışır" diye muaf tutulmuştu; o gerekçe yanlıştı — hemen üstteki "Teslim Al"
            // tablosu zaten beden sütunlu ve içinde giriş kutuları var. Düz liste, beş bedenli
            // bir tabanı beş kez yazıyordu.
            const satirIndex = {};
            const iadeSatirlari = [];
            (iadeAdaylari || []).forEach((h2) => {
              const a = `${h2.urunId}|${h2.renk}`;
              if (!(a in satirIndex)) {
                satirIndex[a] = iadeSatirlari.length;
                iadeSatirlari.push({ ad: h2.ad, renk: h2.renk, birim: h2.birim, hucreler: {} });
              }
              iadeSatirlari[satirIndex[a]].hucreler[h2.beden] = h2;
            });
            const matrisSatirlari = iadeSatirlari.filter((r) => Object.keys(r.hucreler).length > 1);
            const tekilSatirlar = iadeSatirlari.filter((r) => Object.keys(r.hucreler).length <= 1);
            const iadeBedenleri = bedenSirala(
              Array.from(new Set(matrisSatirlari.flatMap((r) => Object.keys(r.hucreler))))
            );

            // Tek hücre çizici: matriste de tekil satırda da aynı kutu kullanılıyor ki
            // ikisi zamanla ayrışmasın.
            const iadeKutusu = (h2, dar) => {
              if (!h2) return <span style={{ color: "var(--erp-border)" }}>–</span>;
              const anahtar = `${h2.urunId}|${h2.renk}|${h2.beden}`;
              const deger = iadeler[anahtar] || "";
              // AŞIM ÖLÇÜSÜ GERÇEKTE VERİLEN (20 Eylül): reçeteye göre ölçmek yanlıştı — 1200
              // verilmişken 1300 iade girilebiliyor, uyarı çıkmıyordu (reçete 1560 olduğu için).
              // Verilenden fazlasını iade etmek fiziksel olarak mümkün değil.
              const _v = (atama.verilenHammaddeler || {})[anahtar];
              const _gercekVerilen = _v && _v.verilen != null ? _v.verilen : h2.beklenen;
              const asiyorMu = (parseFloat(deger) || 0) > _gercekVerilen;
              return (
                // YAN YANA (kullanıcı, 20 Eylül: "ek kullanılan ve artan malzeme yan yana olsunlar,
                // şu an iç içe geçmiş"). Alt alta dizilince hangi kutunun hangi satıra ait olduğu
                // kaybolmuştu — üstteki "0" ile alttaki "+ek" tek bir kutu gibi okunuyordu.
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number" min="0" step="any"
                    data-iade-kutusu={anahtar}
                    placeholder="artan"
                    value={deger}
                    onChange={(e) => setIadeler({ ...iadeler, [anahtar]: e.target.value })}
                    placeholder="0"
                    title={(() => {
                      const v = (atama.verilenHammaddeler || {})[anahtar];
                      // GERÇEKTE VERİLEN ile REÇETE ayrı ayrı yazılı: kullanıcı artanı neye göre
                      // değerlendireceğini görmeden karar veremez.
                      return v && v.verilen !== v.beklenen
                        ? `Verilen ${v.verilen} ${h2.birim} · reçete ${h2.beklenen} ${h2.birim} → artan ${stokYuvarla(v.verilen - v.beklenen)}`
                        : `Reçeteye göre ${h2.beklenen} ${h2.birim} kullanılacak`;
                    })()}
                    style={{
                      width: dar ? 66 : 82, padding: "4px 6px", fontSize: 12, fontWeight: 700, textAlign: "right",
                      border: `1px solid ${asiyorMu ? "var(--erp-warn)" : "#8FA888"}`, borderRadius: "var(--erp-r-sm)",
                      color: asiyorMu ? "var(--erp-warn)" : "var(--erp-primary)", background: "#fff",
                    }}
                  />
                  {/* Verilen miktar kutunun hemen yanında: kullanıcı neye göre değerlendireceğini
                      görmeden "artan ne kadar" sorusunu cevaplayamaz. */}
                  {/* GERÇEKTE VERİLEN GÖSTERİLİYOR (kullanıcı, 20 Eylül: "1560 yazan adet, aslında
                      verirken 1200 verdim; verirken adet değişmişse değişen adeti göstersin").
                      Buradaki sayı reçete miktarıydı; kullanıcı elle 1200 verdiğinde ekranda hâlâ
                      1560 yazıyor ve artan yanlış hesaplanıyordu. Artık VERİLEN yazıyor; reçeteden
                      farklıysa reçete küçük punto ile yanında duruyor — ikisi de gerekli, biri
                      "ne verdim", diğeri "ne vermem gerekirdi". */}
                  {(() => {
                    const v = (atama.verilenHammaddeler || {})[anahtar];
                    const gercek = v && v.verilen != null ? v.verilen : h2.beklenen;
                    const farkli = Math.abs(gercek - h2.beklenen) > 0.001;
                    return (
                      <span className="mono" style={{ fontSize: 9, color: farkli ? "var(--erp-warn)" : "var(--erp-text-2)", whiteSpace: "nowrap" }}>
                        /{gercek}{farkli ? ` (reçete ${h2.beklenen})` : ""}
                      </span>
                    );
                  })()}
                  {/* EK ALINAN (20 Eylül): iş sırasında depodan fazladan alınan malzeme. Artan
                      kutusunun hemen altında, çünkü ikisi aynı sorunun iki yönü: "fazla mı kaldı,
                      eksik mi geldi". Ayrı bir bölüme koymak, teslim eden kişinin onu görmeden
                      formu kapatmasına yol açardı. */}
                  <input
                    type="number" min="0" step="any"
                    data-ek-alinan-kutusu={anahtar}
                    value={ekAlinanlar[anahtar] || ""}
                    onChange={(e) => setEkAlinanlar({ ...ekAlinanlar, [anahtar]: e.target.value })}
                    placeholder="ek"
                    title="İş sırasında depodan fazladan alınan miktar — stoktan ayrıca düşülür"
                    style={{
                      width: dar ? 60 : 76, padding: "4px 6px", fontSize: 12, fontWeight: 700, textAlign: "right",
                      border: "1px solid #C97B3D", borderRadius: "var(--erp-r-sm)", color: "var(--erp-warn)", background: "#FFF8F2",
                    }}
                  />
                </span>
              );
            };

            return (
              <div style={{ display: "grid", gap: 8 }}>
                {matrisSatirlari.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-primary)", textAlign: "left", padding: "2px 6px" }}>MALZEME</th>
                          {iadeBedenleri.map((b) => (
                            <th key={b} className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-primary)", textAlign: "center", padding: "2px 4px" }}>{b}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matrisSatirlari.map((r, ri) => (
                          <tr key={ri}>
                            <td style={{ fontSize: 12, fontWeight: 600, padding: "3px 6px", whiteSpace: "nowrap" }}>
                              {r.ad}
                              <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-2)", fontWeight: 400 }}> · {r.renk} · {r.birim}</span>
                            </td>
                            {iadeBedenleri.map((b) => (
                              <td key={b} style={{ padding: "2px 3px", textAlign: "center" }}>{iadeKutusu(r.hucreler[b], true)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {tekilSatirlar.length > 0 && (
                  <div style={{ display: "grid", gap: 5 }}>
                    {tekilSatirlar.map((r, ri) => {
                      const h2 = Object.values(r.hucreler)[0];
                      return (
                        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ flex: "1 1 160px", minWidth: 130, fontSize: 12, fontWeight: 600 }}>
                            {r.ad}
                            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 400 }}> · {r.renk}</span>
                          </span>
                          {iadeKutusu(h2, false)}
                          <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", minWidth: 34 }}>{r.birim}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
          {(iadeAdaylari || []).some((h2) => (parseFloat(iadeler[`${h2.urunId}|${h2.renk}|${h2.beden}`]) || 0) > h2.beklenen) && (
            <div style={{ fontSize: 10, color: "var(--erp-warn)", marginTop: 7, lineHeight: 1.6 }}>
              Bir kalemde iade, verilen miktarı aşıyor. Yanlışlıkla girilmiş olabilir — kayıt yine de
              yapılabilir ama stok fazla görünür.
            </div>
          )}
        </div>
      )}

      {/* Hurda sebepleri */}
      {bedenler.filter((b) => sayi(satirlar[b].hurda) > 0).map((b) => (
        <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-warn)" }}>Hurda · {b} · {sayi(satirlar[b].hurda)} çift</span>
          <select value={hurdaSebep[b] || ""} onChange={(e) => setHurdaSebep({ ...hurdaSebep, [b]: e.target.value })} style={{ ...inputStyle, width: 170, padding: "5px 7px", fontSize: 12 }}>
            <option value="">Sebep belirtilmedi</option>
            {fireSebepleri.map((sb) => <option key={sb} value={sb}>{sb}</option>)}
          </select>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 11 }}>
          Sağlam <b style={{ color: "var(--erp-primary)" }}>{toplamSaglam}</b>
          {toplamTamir > 0 && <> · Tamir <b style={{ color: "#B8860B" }}>{toplamTamir}</b></>}
          {toplamHurda > 0 && <> · Hurda <b style={{ color: "var(--erp-warn)" }}>{toplamHurda}</b></>}
        </span>
        {hataliBedenler.length > 0 && (
          <span style={{ fontSize: 11, color: "var(--erp-warn)", fontWeight: 600 }}>
            {hataliBedenler.join(", ")} bedeninde verilenden fazla giriş var
          </span>
        )}
        {/* Kısmi teslim uyarı değil, BİLGİ: kalan miktar ustada durur. */}
        {hataliBedenler.length === 0 && kalanToplam > 0 && (
          <span style={{ fontSize: 11, color: "#8A6A2E", fontWeight: 600 }}>
            {kalanToplam} çift ustada kalıyor — sonra teslim edilebilir
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            className="btn-primary"
            data-teslim-al="1"
            style={{ padding: "5px 13px", fontSize: 12, opacity: (hataliBedenler.length > 0 || teslimToplami <= 0) ? 0.5 : 1 }}
            disabled={hataliBedenler.length > 0 || teslimToplami <= 0}
            onClick={kaydet}
          >
            <Check size={13} /> Teslim Al
          </button>
        </span>
      </div>

      {toplamHurda > 0 && (
        <div style={{ fontSize: 10, color: "#7A3B22", marginTop: 7, lineHeight: 1.6, background: "var(--erp-orange-bg)", borderRadius: "var(--erp-r-sm)", padding: 7 }}>
          <b>{toplamHurda} çift hurda:</b> bu aşamanın ücreti o adetler için ödenmez, harcanan hammadde
          kayıp sayılır. Sipariş eksik kalmasın diye aynı miktarda yeniden üretim başlatmanız gerekir.
        </div>
      )}
    </div>
  );
}

