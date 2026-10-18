// ÜRETİM RAPORU (v1.706.0 — kullanıcı: "Üretim için rapor tasarlayalım: anlık üretim durumu, açık siparişlerin
// gerçekleşen üretimleri proses ayrımı olarak, personelin günlük üretimi. Aynı tablo haftalık ve aylık olarak da
// güncellenebilir olsun, proseslerin hedefleri ve gerçekleşen durumu detaylı").
// Kararlar (kullanıcı seçti): Üretim menüsünde ayrı sekme; hedef = Tanımlar › Kapasite'de prosese elle girilen günlük
// hedef, yoksa makine kapasitesinden; personel üretimi = TESLİM ALINAN sağlam çift (tamamlanan atamanın tarihinde).
//
// KAYNAK: üretim kayıtlarındaki atamalar — { personelId, miktar, verilmeTarihi, tamamlandiMi, tamamlanmaTarihi,
// sonuc: { saglam: {beden: n}, tamir: [...], hurda: [...] } }. Sağlam yoksa (eski kayıt) atama miktarı sayılır.
// Ara proses adımları (fasoncu, kendiliğinden tamamlanır) rapora girmez — ölçülecek bir iş yok.
// İŞ GÜNÜ: pazartesi–cumartesi (pazar çalışılmaz; proses planlamasıyla aynı kural).

// Dönem: { tur: "gun"|"hafta"|"ay", bas, son, gunler: [Date] } — seçilen tarihi içeren gün/hafta (Pzt–Paz)/ay.
function uretimRaporDonemi(tur, tarih) {
  const t = new Date(tarih || Date.now());
  const g = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  let bas = g, son = g;
  if (tur === "hafta") { const fark = (g.getDay() + 6) % 7; bas = new Date(g.getFullYear(), g.getMonth(), g.getDate() - fark); son = new Date(bas.getFullYear(), bas.getMonth(), bas.getDate() + 6); }
  if (tur === "ay") { bas = new Date(g.getFullYear(), g.getMonth(), 1); son = new Date(g.getFullYear(), g.getMonth() + 1, 0); }
  const gunler = [];
  for (let d = new Date(bas); d <= son; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) gunler.push(d);
  return { tur, bas, son: new Date(son.getFullYear(), son.getMonth(), son.getDate(), 23, 59, 59), gunler };
}

const gunAnahtari = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function atamaSaglam(a) {
  const s = a && a.sonuc && a.sonuc.saglam;
  if (s && typeof s === "object") return Object.values(s).reduce((t, v) => t + (Number(v) || 0), 0);
  return Number(a && a.miktar) || 0;
}
function atamaHurda(a) {
  const h = (a && a.sonuc && a.sonuc.hurda) || [];
  return (Array.isArray(h) ? h : []).reduce((t, x) => t + (Number(x && (x.miktar ?? x.adet)) || 0), 0);
}

// Prosesin günlük hedefi: elle girilen (tanimlar.kapasite.prosesHedefleri[proses]) yoksa makinelerin kalıpsız hızı ×
// günlük saat × adet toplamı. İkisi de yoksa 0 ("hedef yok").
function prosesGunlukHedef(tanimlar, proses) {
  const kt = kapasiteTanimi(tanimlar);
  const elle = sayiYa((((tanimlar || {}).kapasite || {}).prosesHedefleri || {})[proses]);
  if (elle) return { hedef: elle, kaynak: "elle" };
  const kap = kt.makineler.filter((m) => (m.prosesler || []).includes(proses))
    .reduce((t, m) => t + sayiYa(m.saatlikAdet) * (sayiYa(m.gunlukSaat) || 8) * Math.max(1, sayiYa(m.adet) || 1), 0);
  return { hedef: Math.round(kap), kaynak: kap ? "kapasite" : "" };
}

// Saf rapor hesabı.
function uretimRaporuHesapla(uretim, cariler, tanimlar, donem) {
  const isGunu = donem.gunler.filter((d) => d.getDay() !== 0).length;
  const icinde = (iso) => { if (!iso) return false; const d = new Date(iso); return d >= donem.bas && d <= donem.son; };
  const ad = (id) => ((cariler || []).find((c) => c.id === id) || {}).unvan || "?";
  const sira = {}; ((tanimlar || {}).prosesler || []).forEach((p) => { sira[p.ad] = p.sira ?? 999; });
  const proses = {};      // ad → { gerceklesen, hurda, uzerinde, bekleyen }
  const personel = {};    // id → { ad, toplam, gun: {anahtar: n}, prosesler: {ad: n} }
  const P = (p) => (proses[p] = proses[p] || { gerceklesen: 0, hurda: 0, uzerinde: 0, bekleyen: 0 });
  const acik = [];
  (uretim || []).forEach((o) => {
    if (o.iptal) return;
    const bitti = o.asama === "Tamamlandı";
    const satir = bitti ? null : { id: o.id, siparisNo: o.siparisNo, model: o.model, renk: o.renk, adet: Number(o.adet) || 0, prosesler: {} };
    (o.prosesIlerleme || []).forEach((adim) => {
      if (adim.araProsesMi) return;
      const pr = P(adim.proses);
      let biten = 0;
      (adim.atamalar || []).forEach((a) => {
        if (a.tamamlandiMi) {
          const n = atamaSaglam(a);
          biten += n;
          if (icinde(a.tamamlanmaTarihi)) {
            pr.gerceklesen += n; pr.hurda += atamaHurda(a);
            const k = a.personelId || "?";
            const ps = (personel[k] = personel[k] || { id: k, ad: ad(k), toplam: 0, gun: {}, prosesler: {} });
            ps.toplam += n;
            const g = gunAnahtari(new Date(a.tamamlanmaTarihi));
            ps.gun[g] = (ps.gun[g] || 0) + n;
            ps.prosesler[adim.proses] = (ps.prosesler[adim.proses] || 0) + n;
          }
        } else if (!bitti) pr.uzerinde += Number(a.miktar) || 0;
      });
      if (!bitti && !adim.tamamlandiMi && !(adim.atamalar || []).length) pr.bekleyen += Number(o.adet) || 0;
      if (satir) satir.prosesler[adim.proses] = { biten: adim.tamamlandiMi ? Math.max(biten, satir.adet) : biten, tamam: !!adim.tamamlandiMi };
    });
    if (satir) acik.push(satir);
  });
  const prosesSatirlari = Object.keys(proses).sort((a, b) => (sira[a] ?? 999) - (sira[b] ?? 999)).map((p) => {
    const h = prosesGunlukHedef(tanimlar, p);
    const hedef = h.hedef * isGunu;
    return { proses: p, ...proses[p], gunlukHedef: h.hedef, hedefKaynak: h.kaynak, hedef, oran: hedef ? Math.round((proses[p].gerceklesen / hedef) * 100) : null };
  });
  return {
    isGunu,
    prosesler: prosesSatirlari,
    personel: Object.values(personel).sort((a, b) => b.toplam - a.toplam),
    acik,
    ozet: {
      acikUretim: acik.length,
      acikCift: acik.reduce((t, s) => t + s.adet, 0),
      gerceklesen: prosesSatirlari.reduce((t, s) => t + s.gerceklesen, 0),
      uzerinde: prosesSatirlari.reduce((t, s) => t + s.uzerinde, 0),
    },
  };
}

function UretimRaporu({ uretim, cariler, tanimlar, onSave, onGoToUretim }) {
  const [tur, setTur] = useState("gun");
  const [tarih, setTarih] = useState(bugunYerel());
  const donem = uretimRaporDonemi(tur, tarih);
  const r = uretimRaporuHesapla(uretim, cariler, tanimlar, donem);
  const prosesSirasi = r.prosesler.map((p) => p.proses);
  const kaydir = (yon) => {
    const d = new Date(tarih);
    if (tur === "gun") d.setDate(d.getDate() + yon); else if (tur === "hafta") d.setDate(d.getDate() + 7 * yon); else d.setMonth(d.getMonth() + yon);
    setTarih(gunAnahtari(d));
  };
  const hedefYaz = (p, v) => onSave && onSave({ ...tanimlar, kapasite: { ...(tanimlar.kapasite || {}),
    prosesHedefleri: { ...(((tanimlar.kapasite || {}).prosesHedefleri) || {}), [p]: v } } });
  const kart = { border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", background: "var(--erp-panel)", padding: 12, overflowX: "auto" };
  const th = { textAlign: "left", fontSize: 11, color: "var(--erp-text-3)", fontWeight: 700, padding: "6px 8px", borderBottom: "1px solid var(--erp-line-soft)", whiteSpace: "nowrap" };
  const td = { padding: "6px 8px", borderBottom: "1px solid var(--erp-line-soft)", fontSize: 13, whiteSpace: "nowrap" };
  const sag = { ...td, textAlign: "right" };
  const gunBasligi = (d) => (tur === "ay" ? String(d.getDate()) : d.toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit" }));
  const donemYazi = tur === "gun" ? donem.bas.toLocaleDateString("tr-TR", { dateStyle: "full" })
    : `${donem.bas.toLocaleDateString("tr-TR")} – ${donem.son.toLocaleDateString("tr-TR")}`;
  const cubuk = (oran) => (
    <div style={{ width: 90, height: 8, background: "var(--erp-line-soft)", borderRadius: 4, overflow: "hidden", display: "inline-block", verticalAlign: "middle" }}>
      <div style={{ width: `${Math.min(100, oran || 0)}%`, height: "100%", background: (oran || 0) >= 100 ? "var(--erp-ok)" : (oran || 0) >= 70 ? "var(--erp-warn)" : "var(--erp-danger, #B23B3B)" }} />
    </div>
  );
  return (
    <div data-uretim-raporu style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[["gun", "Günlük"], ["hafta", "Haftalık"], ["ay", "Aylık"]].map(([k, a]) => (
          <button key={k} type="button" data-rapor-donem={k} onClick={() => setTur(k)}
            style={{ padding: "6px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${tur === k ? "var(--erp-accent)" : "var(--erp-border)"}`, background: tur === k ? "var(--erp-accent-tint)" : "#fff",
              color: tur === k ? "var(--erp-accent)" : "var(--erp-text)" }}>{a}</button>
        ))}
        <button type="button" className="btn-ghost" onClick={() => kaydir(-1)}><ChevronLeft size={14} /></button>
        <input type="date" value={tarih} onChange={(e) => e.target.value && setTarih(e.target.value)} style={{ ...inputStyle, width: 150 }} />
        <button type="button" className="btn-ghost" onClick={() => kaydir(1)}><ChevronRight size={14} /></button>
        <span style={{ fontSize: 13, color: "var(--erp-text-2)" }}>{donemYazi} · {r.isGunu} iş günü</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {[["Açık üretim", r.ozet.acikUretim, "acik"], ["Açık üretimde çift", r.ozet.acikCift, "acikCift"],
          ["Dönemde teslim alınan", r.ozet.gerceklesen, "gerceklesen"], ["Şu an personelde", r.ozet.uzerinde, "uzerinde"]].map(([a, v, k]) => (
          <div key={k} style={{ ...kart, padding: 10 }}>
            <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{a}</div>
            <div data-rapor-ozet={k} style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={kart}>
        <TanimBasligi ad="Proses hedef ve gerçekleşen" />
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>{["Proses", "Günlük hedef", "Dönem hedefi", "Gerçekleşen", "Oran", "Hurda", "Personelde", "Bekleyen"].map((b) => <th key={b} style={th}>{b}</th>)}</tr></thead>
          <tbody>
            {r.prosesler.map((p) => (
              <tr key={p.proses} data-rapor-proses={p.proses}>
                <td style={{ ...td, fontWeight: 700 }}>{p.proses}</td>
                <td style={sag}>
                  <input inputMode="numeric" data-proses-hedef={p.proses} defaultValue={(((tanimlar.kapasite || {}).prosesHedefleri) || {})[p.proses] ?? ""}
                    placeholder={p.hedefKaynak === "kapasite" ? `${p.gunlukHedef} (kap.)` : "—"} disabled={!onSave}
                    onBlur={(e) => hedefYaz(p.proses, e.target.value)} style={{ ...inputStyle, width: 90, textAlign: "right", padding: "3px 6px" }} />
                </td>
                <td style={sag}>{p.hedef || "—"}</td>
                <td style={{ ...sag, fontWeight: 700 }} data-rapor-gerceklesen={p.proses}>{p.gerceklesen}</td>
                <td style={sag}>{p.oran != null ? <>{cubuk(p.oran)} <b>%{p.oran}</b></> : "—"}</td>
                <td style={{ ...sag, color: p.hurda ? "var(--erp-danger, #B23B3B)" : undefined }}>{p.hurda || "—"}</td>
                <td style={sag}>{p.uzerinde || "—"}</td>
                <td style={sag}>{p.bekleyen || "—"}</td>
              </tr>
            ))}
            {r.prosesler.length === 0 && <tr><td colSpan={8} style={{ ...td, color: "var(--erp-text-3)" }}>Üretim kaydı yok.</td></tr>}
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginTop: 6 }}>
          Günlük hedef boşsa Tanımlar › Kapasite'deki makinelerden hesaplanır "(kap.)". Gerçekleşen = dönemde teslim alınan sağlam çift.
        </div>
      </div>

      <div style={kart}>
        <TanimBasligi ad="Personel üretimi" />
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>
            <th style={th}>Personel</th><th style={th}>Prosesler</th>
            {tur !== "gun" && donem.gunler.map((d) => <th key={gunAnahtari(d)} style={{ ...th, textAlign: "right", color: d.getDay() === 0 ? "var(--erp-text-3)" : undefined }}>{gunBasligi(d)}</th>)}
            <th style={{ ...th, textAlign: "right" }}>Toplam</th>{tur !== "gun" && <th style={{ ...th, textAlign: "right" }}>Gün ort.</th>}
          </tr></thead>
          <tbody>
            {r.personel.map((ps) => (
              <tr key={ps.id} data-rapor-personel={ps.ad}>
                <td style={{ ...td, fontWeight: 700 }}>{ps.ad}</td>
                <td style={{ ...td, fontSize: 12, color: "var(--erp-text-2)" }}>{Object.entries(ps.prosesler).map(([p, n]) => `${p} ${n}`).join(" · ")}</td>
                {tur !== "gun" && donem.gunler.map((d) => <td key={gunAnahtari(d)} style={sag}>{ps.gun[gunAnahtari(d)] || ""}</td>)}
                <td style={{ ...sag, fontWeight: 700 }} data-rapor-personel-toplam={ps.ad}>{ps.toplam}</td>
                {tur !== "gun" && <td style={sag}>{r.isGunu ? Math.round(ps.toplam / r.isGunu) : "—"}</td>}
              </tr>
            ))}
            {r.personel.length === 0 && <tr><td colSpan={4} style={{ ...td, color: "var(--erp-text-3)" }}>Bu dönemde teslim alınan iş yok.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={kart}>
        <TanimBasligi ad="Açık üretimler — proses ilerlemesi" />
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>
            {["No", "Model", "Renk", "Çift"].map((b) => <th key={b} style={th}>{b}</th>)}
            {prosesSirasi.map((p) => <th key={p} style={{ ...th, textAlign: "center" }}>{p}</th>)}
          </tr></thead>
          <tbody>
            {r.acik.map((s) => (
              <tr key={s.id} data-rapor-acik={s.siparisNo}>
                <td style={td}>{onGoToUretim ? <button type="button" className="btn-ghost mono" style={{ padding: "2px 6px" }} onClick={() => onGoToUretim(s.id)}>{s.siparisNo}</button> : s.siparisNo}</td>
                <td style={td}>{s.model}</td><td style={td}>{s.renk}</td><td style={sag}>{s.adet}</td>
                {prosesSirasi.map((p) => {
                  const x = s.prosesler[p];
                  if (!x) return <td key={p} style={{ ...td, textAlign: "center", color: "var(--erp-text-3)" }}>·</td>;
                  const oran = s.adet ? Math.min(100, Math.round((x.biten / s.adet) * 100)) : 0;
                  return (
                    <td key={p} style={{ ...td, textAlign: "center", background: x.tamam ? "#E8F1E4" : oran > 0 ? "#FBF3E0" : undefined }}>
                      {x.tamam ? "✓" : `${x.biten}/${s.adet}`}
                    </td>
                  );
                })}
              </tr>
            ))}
            {r.acik.length === 0 && <tr><td colSpan={4 + prosesSirasi.length} style={{ ...td, color: "var(--erp-text-3)" }}>Açık üretim yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
