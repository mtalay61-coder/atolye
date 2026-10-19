// PROSES PLANLAMA (v1.704.0 — kullanıcı: "Planlamayı proses proses ayıralım, her prosesin planlaması ayrı olsun";
// "çerçeve içine alıp aşağı kayan şekilde olsun, alta aynı şekilde planlananları atsın"; "planlamayı makine/kalıp
// kapasitesi üzerinden yapacağız"). Seçim (kullanıcı): her proses ayrı sekme; üstte BEKLEYEN, altta PLANLANAN çerçeve,
// tikle toplu planla, günlük kapasiteye göre kaç gün sürdüğü görünür.
//
// BEKLEYEN: açık üretimlerin bu prosesteki adımı — henüz kimseye VERİLMEMİŞ ve tamamlanmamış. "Hazır" = önceki asıl
//   adımların hepsi tamamlandı (iş şimdi bu proseste); hazır olmayan da listelenir (öne planlanabilsin), soluk görünür.
// PLANLANAN: üretim kaydında `prosesPlani[proses] = { sira, tarih }`. Sıra kuyruğun sırası; süre kapasiteden
//   (`isYukuHesapla`, 273) birikimli toplanır, bitiş tahmini pazarları atlayarak iş günü sayılır.
// Plan yalnız SIRA bilgisidir: stok/cari/fiş hareketi YOKTUR (iş verme yine üretim kartından, "İşi Ver" ile). Adım
// verilince ya da tamamlanınca kuyruktan kendiliğinden düşer; plan kaydı üretimde kalır ama zararsızdır.

function prosesAdimDurumu(o, proses) {
  const ilerleme = o.prosesIlerleme || [];
  const i = ilerleme.findIndex((p) => p.proses === proses);
  if (i === -1) return null;
  const adim = ilerleme[i];
  if (adim.tamamlandiMi || (adim.atamalar || []).length > 0) return null;
  const hazir = ilerleme.slice(0, i).filter((p) => !p.araProsesMi).every((p) => p.tamamlandiMi);
  return { adim, hazir };
}

// Bu prosesin kuyruğu: [{ o, hazir, plan }] — iptal/tamamlanmış üretimler hariç.
function prosesKuyrugu(uretim, proses) {
  return (uretim || [])
    .filter((o) => !o.iptal && o.asama !== "Tamamlandı")
    .map((o) => { const d = prosesAdimDurumu(o, proses); return d ? { o, hazir: d.hazir, plan: ((o.prosesPlani || {})[proses]) || null } : null; })
    .filter(Boolean);
}

// Bugünden itibaren `gun` iş günü sonrası (pazar atlanır). Yarım gün aynı güne düşer: 0.4 gün → bugün.
function isGunuEkle(bugun, gun) {
  const d = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate());
  let kalan = Math.max(0, Math.ceil(gun - 1e-9) - 1);
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  while (kalan > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) kalan--; }
  return d;
}

// Planlananlar sırayla, birikimli gün ve bitiş tahminiyle. Kapasitesi bilinmeyen iş süreye katılmaz, `eksik` taşır.
// PERSONEL (v1.708.0 — kullanıcı seçti: "planlanan işe kişi atansın, kişinin günlük saati/kapasitesine göre yük ve bitiş
// günü"): `plan.personelId`. Her kişinin kuyruğu AYRI birikir (aynı anda çalışırlar); atanmamış işler ortak kuyrukta.
// Süre: kişinin Tanımlar › Kapasite'de saatlik adedi ve çalışma saati varsa ondan (adet ÷ saatlik ÷ günlük saat), yoksa
// makine/kalıp kapasitesinden.
function prosesPlanTakvimi(uretim, stok, tanimlar, proses, bugun) {
  const birikimler = {};
  const elemanlar = kapasiteTanimi(tanimlar).elemanlar;
  return prosesKuyrugu(uretim, proses)
    .filter((x) => x.plan)
    .sort((a, b) => (a.plan.sira || 0) - (b.plan.sira || 0))
    .map((x) => {
      const urun = (stok || []).find((p) => p.id === x.o.urunId);
      const bedenAdet = {};
      (x.o.bedenMiktarlari || []).forEach((b) => { bedenAdet[b.beden] = (bedenAdet[b.beden] || 0) + (Number(b.miktar) || 0); });
      const pid = x.plan.personelId || "";
      const el = pid ? elemanlar.find((e) => e.cariId === pid) : null;
      const elSaat = el ? elemanGunlukSaat(el) : 0;
      const elHiz = el ? sayiYa(el.saatlikAdet) : 0;
      let yuk;
      if (elHiz && elSaat) {
        const saat = (Number(x.o.adet) || 0) / elHiz;
        yuk = { saat: Math.round(saat * 100) / 100, gun: Math.round((saat / elSaat) * 100) / 100, eksik: [], kaynak: "personel" };
      } else yuk = { ...isYukuHesapla(tanimlar, urun, proses, bedenAdet), kaynak: "makine" };
      birikimler[pid] = (birikimler[pid] || 0) + yuk.gun;
      const birikim = birikimler[pid];
      return { ...x, yuk, personelId: pid, birikimGun: Math.round(birikim * 100) / 100, bitis: yuk.gun > 0 ? isGunuEkle(bugun || new Date(), birikim) : null };
    });
}

// Saf: seçilenleri kuyruğun SONUNA ekler / plandan çıkarır / bir sıra kaydırır. Yeni üretim dizisi döner.
function prosesPlaniniDegistir(uretim, proses, islem, idler, yon) {
  const plan = (o) => (o.prosesPlani || {})[proses];
  const yaz = (o, p) => { const pp = { ...(o.prosesPlani || {}) }; if (p) pp[proses] = p; else delete pp[proses]; return { ...o, prosesPlani: pp }; };
  if (islem === "ekle") {
    let sira = Math.max(0, ...(uretim || []).map((o) => (plan(o) ? plan(o).sira || 0 : 0)));
    const tarih = new Date().toISOString();
    return uretim.map((o) => (idler.includes(o.id) && !plan(o) ? yaz(o, { sira: ++sira, tarih }) : o));
  }
  if (islem === "personel") return uretim.map((o) => (idler.includes(o.id) && plan(o) ? yaz(o, { ...plan(o), personelId: yon || null }) : o));
  if (islem === "cikar") return uretim.map((o) => (idler.includes(o.id) ? yaz(o, null) : o));
  if (islem === "kaydir") {
    const sirali = prosesKuyrugu(uretim, proses).filter((x) => x.plan).sort((a, b) => a.plan.sira - b.plan.sira);
    const i = sirali.findIndex((x) => x.o.id === idler[0]);
    const j = i + (yon < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= sirali.length) return uretim;
    const a = sirali[i], b = sirali[j];
    return uretim.map((o) => (o.id === a.o.id ? yaz(o, { ...a.plan, sira: b.plan.sira }) : o.id === b.o.id ? yaz(o, { ...b.plan, sira: a.plan.sira }) : o));
  }
  return uretim;
}

function ProsesPlanlamaSekmesi({ uretim, stok, tanimlar, cariler, onUretimKaydet, onGoToUretim }) {
  const prosesler = (tanimlar.prosesler || []).slice().sort((a, b) => (a.sira ?? 999) - (b.sira ?? 999)).map((p) => p.ad);
  const [proses, setProses] = useState(() => { try { const k = localStorage.getItem("proses-planlama-sekme"); if (k) return k; } catch (e) { /* yoksay */ } return null; });
  const aktif = prosesler.includes(proses) ? proses : prosesler[0];
  const [secili, setSecili] = useState([]);
  const sec = (p) => { setProses(p); setSecili([]); try { localStorage.setItem("proses-planlama-sekme", p); } catch (e) { /* yoksay */ } };
  if (!aktif) return <div style={{ color: "var(--erp-text-3)", fontSize: 13 }}>Tanımlar › Üretim'de proses yok.</div>;
  const kuyruk = prosesKuyrugu(uretim, aktif);
  const bekleyen = kuyruk.filter((x) => !x.plan).sort((a, b) => (b.hazir - a.hazir));
  const takvim = prosesPlanTakvimi(uretim, stok, tanimlar, aktif, new Date());
  // Toplam süre: kuyruklar paralel, en uzun kuyruk belirler.
  const kuyrukGunleri = {};
  takvim.forEach((x) => { kuyrukGunleri[x.personelId] = x.birikimGun; });
  const toplamGun = Math.max(0, ...Object.values(kuyrukGunleri));
  // Seçilebilir personel: Tanımlar › Kapasite'de bu prosese işaretlenenler; hiç yoksa tüm Personel tipi cariler.
  const tumPersonel = (cariler || []).filter((c) => c.tip === "Personel" && !c.pasif);
  const prosesElemanlari = kapasiteTanimi(tanimlar).elemanlar.filter((e) => (e.prosesler || []).includes(aktif)).map((e) => e.cariId);
  const personelSecenek = prosesElemanlari.length ? tumPersonel.filter((c) => prosesElemanlari.includes(c.id)) : tumPersonel;
  const personelAdi = (id) => ((cariler || []).find((c) => c.id === id) || {}).unvan || "Atanmamış";
  const degistir = (islem, idler, yon) => onUretimKaydet(prosesPlaniniDegistir(uretim, aktif, islem, idler, yon));
  const urunAdi = (o) => o.model || ((stok || []).find((p) => p.id === o.urunId) || {}).ad || "";
  const cerceve = { border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", background: "var(--erp-panel)", maxHeight: "42vh", overflowY: "auto" };
  const baslik = { position: "sticky", top: 0, zIndex: 1, background: "var(--erp-panel)", padding: "10px 12px", borderBottom: "1px solid var(--erp-line-soft)",
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontWeight: 700, fontSize: 14 };
  const satir = { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--erp-line-soft)", fontSize: 13, flexWrap: "wrap" };
  const bedenMetni = (o) => (o.bedenMiktarlari || []).map((b) => `${b.beden}:${b.miktar}`).join(" ");
  const yukMetni = (o) => {
    const urun = (stok || []).find((p) => p.id === o.urunId);
    const ba = {}; (o.bedenMiktarlari || []).forEach((b) => { ba[b.beden] = (ba[b.beden] || 0) + (Number(b.miktar) || 0); });
    const y = isYukuHesapla(tanimlar, urun, aktif, ba);
    return y.eksik.length ? <span style={{ color: "var(--erp-danger, #B23B3B)" }} title={y.eksik.join(", ")}>kapasite ?</span> : <span>{y.saat} saat · {y.gun} gün</span>;
  };
  const tarihMetni = (d) => (d ? d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", weekday: "short" }) : "—");
  return (
    <div data-proses-planlama style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {prosesler.map((p) => {
          const n = prosesKuyrugu(uretim, p).length;
          const on = p === aktif;
          return (
            <button key={p} type="button" data-proses-sekme={p} onClick={() => sec(p)}
              style={{ padding: "6px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${on ? "#B8860B" : "var(--erp-border)"}`, background: on ? "#B8860B1A" : "#fff", color: on ? "#B8860B" : "var(--erp-text)" }}>
              {p}{n ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      <div style={cerceve} data-proses-bekleyen>
        <div style={baslik}>
          Bekleyen <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}>{bekleyen.length} iş</span>
          <label style={{ fontWeight: 400, fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input type="checkbox" checked={bekleyen.length > 0 && bekleyen.every((x) => secili.includes(x.o.id))}
              onChange={(e) => setSecili(e.target.checked ? bekleyen.map((x) => x.o.id) : [])} /> tümü
          </label>
          <button type="button" className="btn-primary" data-proses-planla disabled={!secili.length} style={{ marginLeft: "auto" }}
            onClick={() => { degistir("ekle", secili); setSecili([]); }}>
            Seçilenleri planla{secili.length ? ` (${secili.length})` : ""}
          </button>
        </div>
        {bekleyen.length === 0 && <div style={{ padding: 16, color: "var(--erp-text-3)", fontSize: 13 }}>Bu proseste bekleyen iş yok.</div>}
        {bekleyen.map(({ o, hazir }) => (
          <label key={o.id} data-bekleyen-is={o.siparisNo} style={{ ...satir, opacity: hazir ? 1 : 0.6, cursor: "pointer" }}>
            <input type="checkbox" checked={secili.includes(o.id)} onChange={() => setSecili(secili.includes(o.id) ? secili.filter((x) => x !== o.id) : [...secili, o.id])} />
            <b className="mono">{o.siparisNo}</b>
            <span>{urunAdi(o)} · {o.renk}</span>
            <span className="mono" style={{ color: "var(--erp-text-2)" }}>{bedenMetni(o)}</span>
            <span style={{ fontWeight: 700 }}>{o.adet} çift</span>
            {!hazir && <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>önceki proseste</span>}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--erp-text-2)" }}>{yukMetni(o)}</span>
          </label>
        ))}
      </div>

      <div style={cerceve} data-proses-planlanan>
        <div style={baslik}>
          Planlanan <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}>{takvim.length} iş · toplam <b data-proses-toplam-gun>{toplamGun}</b> gün</span>
          {Object.keys(kuyrukGunleri).length > 1 && Object.entries(kuyrukGunleri).map(([pid, g]) => (
            <span key={pid || "yok"} data-personel-kuyruk={personelAdi(pid)} style={{ fontWeight: 400, fontSize: 12, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-line-soft)" }}>
              {personelAdi(pid)}: {g} gün
            </span>
          ))}
        </div>
        {takvim.length === 0 && <div style={{ padding: 16, color: "var(--erp-text-3)", fontSize: 13 }}>Planlanan iş yok — yukarıdan seçip planlayın.</div>}
        {takvim.map(({ o, hazir, yuk, birikimGun, bitis, personelId }, i) => (
          <div key={o.id} data-planlanan-is={o.siparisNo} style={satir}>
            <span style={{ width: 22, color: "var(--erp-text-3)" }}>{i + 1}.</span>
            <b className="mono">{o.siparisNo}</b>
            <span>{urunAdi(o)} · {o.renk}</span>
            <span style={{ fontWeight: 700 }}>{o.adet} çift</span>
            {!hazir && <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>önceki proseste</span>}
            <select data-plan-personel value={personelId || ""} onChange={(e) => degistir("personel", [o.id], e.target.value)}
              style={{ ...inputStyle, width: 160, padding: "3px 6px", fontSize: 12 }}>
              <option value="">Cari seçilmedi</option>
              {personelSecenek.map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
            </select>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--erp-text-2)" }} title={yuk.kaynak === "personel" ? "Kişinin saatlik adedi ve çalışma saatinden" : "Makine/kalıp kapasitesinden"}>
              {yuk.eksik.length ? <span style={{ color: "var(--erp-danger, #B23B3B)" }} title={yuk.eksik.join(", ")}>kapasite ?</span>
                : <>{yuk.gun} gün · bitiş <b>{tarihMetni(bitis)}</b> <span style={{ color: "var(--erp-text-3)" }}>({birikimGun})</span></>}
            </span>
            <button type="button" className="btn-ghost" title="Yukarı" disabled={i === 0} onClick={() => degistir("kaydir", [o.id], -1)}><ChevronUp size={14} /></button>
            <button type="button" className="btn-ghost" title="Aşağı" disabled={i === takvim.length - 1} onClick={() => degistir("kaydir", [o.id], 1)}><ChevronDown size={14} /></button>
            <button type="button" className="btn-ghost" data-plan-cikar title="Plandan çıkar" onClick={() => degistir("cikar", [o.id])}><X size={14} /></button>
            {onGoToUretim && <button type="button" className="btn-ghost" onClick={() => onGoToUretim(o.id)} title="Üretim kartını aç">Kart</button>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
        Süre, ürün kartı › Kapasite'de bu prosese bağlı makine ve kalıptan hesaplanır (pazar çalışılmaz sayılır). "kapasite ?"
        çıkan işin ürününe makine/kalıp bağlanmamış ya da o beden kalıpta tanımlı değil. Plan yalnız sıradır; iş, üretim kartından verilir.
      </div>
    </div>
  );
}
