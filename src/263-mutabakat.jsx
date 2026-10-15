// ================= FİNANS › CARİ MUTABAKAT MEKTUBU (v1.673.0) =================
//
// Kullanıcı: "Cari mutabakat mektubu da hazırlayalım, ay sonunda otomatik mail atsın; tabi mail şifre vs halletmek
// lazım." Seçilen yol (kullanıcı kararı): AY BAŞINDA TEK TIKLA — ayın ilk günlerinde anasayfada "mutabakat
// mektupları hazır" kartı çıkar; Yönetici listeyi görür, tek düğmeyle hepsini PDF ekli gönderir. Tam otomatik
// (kimse açmadan) gönderim sunucuda ayrı bakiye hesabı gerektirirdi; uygulamadaki bakiyeyle birebir olsun diye
// hesap BURADA, aynı fonksiyonla (`cariBakiyeleri` kuralı) yapılıyor.
//
// GÖNDERİM: mevcut `eposta` fonksiyonu (supabase-eposta-fonksiyonu.ts) + Tanımlar › Firma › E-posta ayarları;
// şifre Supabase sırrında (SMTP_SIFRE) — koda ve Tanımlar'a girmez. SMTP kurulu değilse toplu gönderim kapalıdır,
// tek tek Yazdır / PDF / paylaş (WhatsApp, posta uygulaması) çalışır.
//
// KAYIT: gönderilen her mektup carinin `mutabakatlar` listesine { donem, tarih, bakiye, kanal } yazılır (şema dışı →
// `ek`). Böylece hangi cariye hangi dönemin mektubu gittiği görülür ve ay başı hatırlatıcısı kendiliğinden kapanır.

// Dönem = ayın son günü ("2026-09-30"). Varsayılan: içinde bulunulan aydan bir önceki ay.
function mutabakatVarsayilanDonem() {
  const d = new Date(`${bugunYerel()}T00:00:00`);
  const son = new Date(d.getFullYear(), d.getMonth(), 0);
  return `${son.getFullYear()}-${String(son.getMonth() + 1).padStart(2, "0")}-${String(son.getDate()).padStart(2, "0")}`;
}
function mutabakatDonemAdi(donem) {
  const d = new Date(`${donem}T00:00:00`);
  return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

// Dönem sonu bakiyesi — cariBakiyeleri (200) ile aynı kural, yalnız tarih ≤ dönem sonu.
function cariMutabakatBakiyesi(cari, donem, defter) {
  const toplam = {};
  cariDefterHareketleri((cari && cari.hareketler) || [], defter)
    .filter((h) => String(h.tarih || "").slice(0, 10) <= donem)
    .forEach((h) => {
      const pb = h.paraBirimi || "TRY";
      toplam[pb] = (toplam[pb] || 0) + (h.yon === "Borç" ? (h.tutar || 0) : -(h.tutar || 0));
    });
  Object.keys(toplam).forEach((pb) => { if (stokYuvarla(toplam[pb]) === 0) delete toplam[pb]; });
  return toplam;
}

function mutabakatMektubuHTML(cari, firma, donem, bakiye) {
  const e = htmlKacis;
  const f = firma || {};
  const satirlar = Object.entries(bakiye || {}).map(([pb, t]) => {
    const yon = t > 0 ? "BORÇ" : "ALACAK";
    return `<tr><td>${e(PARA_SEMBOLU[pb] || pb)} (${e(pb)})</td><td style="text-align:right;font-weight:700">${Math.abs(t).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${yon}</td></tr>`;
  }).join("") || `<tr><td colspan="3">Bakiye yoktur (0,00)</td></tr>`;
  return `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.5;max-width:720px">
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:8px">
  <div>${f.logo ? `<img src="${f.logo}" style="max-height:56px"><br>` : ""}<b>${e(f.unvan || "")}</b><br>${e(f.adres || "")}<br>${f.vergiDairesi || f.vergiNo ? `V.D.: ${e(f.vergiDairesi || "")} ${e(f.vergiNo || "")}` : ""}</div>
  <div style="text-align:right">Tarih: ${e(tarihYaz(bugunYerel()))}</div>
</div>
<h2 style="text-align:center;margin:18px 0">CARİ HESAP MUTABAKAT MEKTUBU</h2>
<p><b>Sayın ${e(cariResmiAdi(cari))}</b>${cari.vergiNo ? `<br>V.D./No: ${e(cari.vergiDairesi || "")} ${e(cari.vergiNo)}` : ""}</p>
<p>Şirketimiz kayıtlarına göre <b>${e(tarihYaz(donem))}</b> tarihi itibarıyla cari hesabınızın bakiyesi aşağıdadır.
(BORÇ: firmanızın şirketimize borcu · ALACAK: şirketimizin firmanıza borcu)</p>
<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:60%;margin:10px 0">
<thead><tr><th>Para birimi</th><th>Tutar</th><th>Bakiye</th></tr></thead><tbody>${satirlar}</tbody></table>
<p>Kayıtlarınızla karşılaştırarak mutabık olup olmadığınızı en geç 15 gün içinde bildirmenizi rica ederiz. Bu süre içinde
yanıt alınmazsa bakiye mutabık kabul edilecektir. Mutabık değilseniz hesap ekstrenizi göndermenizi rica ederiz.</p>
<p>Saygılarımızla,<br><b>${e(f.unvan || "")}</b></p>
<div style="margin-top:28px;border-top:1px dashed #999;padding-top:10px">
<b>CEVAP</b> — ${e(tarihYaz(donem))} tarihli bakiye için:<br><br>
☐ Mutabıkız &nbsp;&nbsp;&nbsp;&nbsp; ☐ Mutabık değiliz — bizim kayıtlarımızdaki bakiye: ........................<br><br>
Firma kaşesi ve yetkili imza: ...........................................
</div></div>`;
}

async function mutabakatGonderTek({ cari, firma, donem, bakiye, yol, showToast }) {
  const ad = `Mutabakat ${donem} - ${cari.unvan}`;
  return belgeyiPaylas(yol, {
    govdeHTML: mutabakatMektubuHTML(cari, firma, donem, bakiye), dosyaAdi: ad, cari, firmaBilgileri: firma, showToast,
    konu: `Cari hesap mutabakatı — ${tarihYaz(donem)} — ${(firma && firma.unvan) || ""}`.trim(),
    ozet: `Sayın ${cariResmiAdi(cari)}, ${tarihYaz(donem)} itibarıyla cari hesap bakiyeniz: ${bakiyeMetni(bakiye, false)}. Mutabakat mektubu ektedir; mutabık olup olmadığınızı bildirmenizi rica ederiz.`,
  });
}

function MutabakatEkrani({ cariler, firmaBilgileri, onCarilerKaydet, showToast }) {
  const [donem, setDonem] = useState(mutabakatVarsayilanDonem());
  const [defter, setDefter] = useState("Resmi");
  const [tip, setTip] = useState("Tümü");
  const [secili, setSecili] = useState({});
  const [gonderiliyor, setGonderiliyor] = useState(null);
  const smtp = (firmaBilgileri && firmaBilgileri.eposta) || {};
  const smtpVar = !!(smtp.sunucu && smtp.kullanici);

  const satirlar = React.useMemo(() => (cariler || [])
    .filter((c) => !c.pasif && c.tip !== "Personel" && (tip === "Tümü" || c.tip === tip || c.tip === "Her İkisi"))
    .map((c) => ({ c, bakiye: cariMutabakatBakiyesi(c, donem, defter), gonderim: ((c.mutabakatlar || []).filter((m) => m.donem === donem).slice(-1)[0]) || null }))
    .filter((x) => Object.keys(x.bakiye).length > 0)
    .sort((a, b) => a.c.unvan.localeCompare(b.c.unvan, "tr")), [cariler, donem, defter, tip]);

  const seciliMi = (x) => (secili[x.c.id] != null ? secili[x.c.id] : !x.gonderim && !!x.c.eposta);
  // Toplu gönderim dakikalar sürebilir; arada başka cari kaydı değişebilir — kayıt EN GÜNCEL listeye yazılır.
  const carilerRef = useRef(cariler);
  carilerRef.current = cariler;
  const kaydetGonderim = (idler, kanal, gDonem = donem) => {
    const zaman = new Date().toISOString();
    onCarilerKaydet((carilerRef.current || []).map((c) => {
      if (!idler.includes(c.id)) return c;
      const bakiye = cariMutabakatBakiyesi(c, gDonem, defter);
      return { ...c, mutabakatlar: [...(c.mutabakatlar || []), { donem: gDonem, defter, tarih: zaman, bakiye, kanal }] };
    }));
  };
  const tek = async (x, yol) => {
    const sonuc = await mutabakatGonderTek({ cari: x.c, firma: firmaBilgileri, donem, bakiye: x.bakiye, yol, showToast });
    if (sonuc === "gonderildi" || sonuc === "paylasildi") kaydetGonderim([x.c.id], yol);
  };
  const topluGonder = async () => {
    const gDonem = donem;   // gönderim başladığındaki dönem — kullanıcı arada değiştirse de bu parti aynı dönemle biter
    const liste = satirlar.filter((x) => seciliMi(x) && x.c.eposta);
    if (liste.length === 0) { showToast("E-postası olan seçili cari yok"); return; }
    const basarili = []; const hatali = [];
    for (let i = 0; i < liste.length; i++) {
      const x = liste[i];
      setGonderiliyor(`${i + 1} / ${liste.length} — ${x.c.unvan}`);
      const blob = await htmldenPdfBlob(mutabakatMektubuHTML(x.c, firmaBilgileri, gDonem, x.bakiye));
      if (!blob) { hatali.push(`${x.c.unvan} (PDF)`); continue; }
      const base64 = await new Promise((coz, red) => { const r = new FileReader(); r.onload = () => coz(String(r.result).split(",")[1]); r.onerror = red; r.readAsDataURL(blob); });
      const sonuc = await epostaGonder({
        kime: x.c.eposta, konu: `Cari hesap mutabakatı — ${tarihYaz(gDonem)} — ${firmaBilgileri.unvan || ""}`.trim(),
        metin: `Sayın ${cariResmiAdi(x.c)},\n\n${tarihYaz(gDonem)} tarihi itibarıyla cari hesap bakiyeniz: ${bakiyeMetni(x.bakiye, false)} (${Object.values(x.bakiye)[0] > 0 ? "borç" : "alacak"}).\nMutabakat mektubu ektedir. Mutabık olup olmadığınızı bildirmenizi rica ederiz.\n\nSaygılarımızla,\n${firmaBilgileri.unvan || ""}`,
        dosyaAdi: `Mutabakat ${gDonem}.pdf`, pdfBase64: base64,
      });
      if (sonuc.tamam) basarili.push(x.c.id); else hatali.push(`${x.c.unvan} (${sonuc.hata})`);
    }
    setGonderiliyor(null);
    if (basarili.length) kaydetGonderim(basarili, "eposta", gDonem);
    showToast(`${basarili.length} mektup gönderildi${hatali.length ? ` · ${hatali.length} gönderilemedi: ${hatali.slice(0, 3).join(", ")}` : ""}`);
  };

  const kutu = { border: "1.5px solid var(--hrk-renk)", borderRadius: 10, padding: 12, background: "#fff", marginBottom: 12 };
  const secilenSay = satirlar.filter((x) => seciliMi(x) && x.c.eposta).length;
  return (
    <div data-mutabakat="1" className="renkli-form" style={{ "--hrk-renk": "#2F6B4F" }}>
      <div style={{ ...kutu, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 3 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Dönem sonu</span>
          <input type="date" data-mutabakat-donem="1" value={donem} onChange={(e) => e.target.value && setDonem(e.target.value)} /></label>
        <label style={{ display: "grid", gap: 3 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Defter</span>
          <select value={defter} onChange={(e) => setDefter(e.target.value)}>{["Resmi", "Genel", "Tümü"].map((d) => <option key={d}>{d}</option>)}</select></label>
        <label style={{ display: "grid", gap: 3 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Cari tipi</span>
          <select value={tip} onChange={(e) => setTip(e.target.value)}>{["Tümü", "Müşteri", "Tedarikçi"].map((d) => <option key={d}>{d}</option>)}</select></label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {gonderiliyor && <span style={{ fontSize: 12 }}>Gönderiliyor: {gonderiliyor}</span>}
          <button className="btn-primary" data-mutabakat-toplu="1" disabled={!smtpVar || !!gonderiliyor || secilenSay === 0} onClick={topluGonder}
            title={smtpVar ? "Seçili carilere PDF ekli e-posta" : "Önce Tanımlar › Firma › E-posta gönderim ayarlarını girin"}>
            Seçilenlere e-posta gönder ({secilenSay})
          </button>
        </div>
        {!smtpVar && (
          <div data-mutabakat-smtp-yok="1" style={{ width: "100%", fontSize: 12, color: "var(--erp-warn)" }}>
            Toplu e-posta için: Tanımlar › Firma › E-posta gönderim ayarları (sunucu, port, kullanıcı) ve Supabase › Edge Functions › Secrets'ta
            <span className="mono"> SMTP_SIFRE</span> (Gmail'de "uygulama şifresi"). O zamana kadar tek tek Yazdır / PDF / paylaş kullanılabilir.
          </div>
        )}
      </div>
      <div style={{ ...kutu, overflowX: "auto" }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{mutabakatDonemAdi(donem)} sonu · bakiyesi olan {satirlar.length} cari</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ textAlign: "left", color: "var(--erp-text-2)", fontSize: 11 }}>
            <th style={{ padding: 4 }}></th><th style={{ padding: 4 }}>Cari</th><th style={{ padding: 4 }}>E-posta</th>
            <th style={{ padding: 4, textAlign: "right" }}>Dönem sonu bakiye</th><th style={{ padding: 4 }}>Gönderim</th><th style={{ padding: 4 }}></th></tr></thead>
          <tbody>{satirlar.map((x) => (
            <tr key={x.c.id} data-mutabakat-satir={x.c.unvan} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
              <td style={{ padding: 4 }}><input type="checkbox" data-renk-koru="1" disabled={!x.c.eposta} checked={seciliMi(x)} onChange={(e) => setSecili((o) => ({ ...o, [x.c.id]: e.target.checked }))} /></td>
              <td style={{ padding: 4 }}><b>{x.c.unvan}</b>{x.c.resmiUnvan && <div style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{x.c.resmiUnvan}</div>}</td>
              <td style={{ padding: 4, color: x.c.eposta ? undefined : "var(--erp-text-3)" }}>{x.c.eposta || "yok"}</td>
              <td className="mono" style={{ padding: 4, textAlign: "right", fontWeight: 700, color: bakiyeRengi(Object.values(x.bakiye)[0] || 0) }}>{bakiyeMetni(x.bakiye)}</td>
              <td style={{ padding: 4, fontSize: 11, color: x.gonderim ? "var(--erp-primary)" : "var(--erp-text-3)" }}>
                {x.gonderim ? `✓ ${tarihYaz(x.gonderim.tarih.slice(0, 10))} · ${x.gonderim.kanal}` : "gönderilmedi"}</td>
              <td style={{ padding: 4, whiteSpace: "nowrap" }}>
                <button className="btn-ghost" onClick={() => tek(x, "yazdir")}>Yazdır</button>
                <button className="btn-ghost" onClick={() => tek(x, "pdf")}>PDF</button>
                <button className="btn-ghost" onClick={() => tek(x, "whatsapp")}>WhatsApp</button>
                <button className="btn-ghost" data-mutabakat-eposta={x.c.unvan} onClick={() => tek(x, "eposta")}>E-posta</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {satirlar.length === 0 && <EmptyState text="Bu dönem sonunda bakiyesi olan cari yok." />}
      </div>
    </div>
  );
}

// AY BAŞI HATIRLATICISI: ayın ilk 10 günü, geçen ay için hiç mektup gönderilmemiş ve bakiyesi olan cari varsa sayı döner.
function mutabakatHatirlatmaSayisi(cariler) {
  if (Number(bugunYerel().slice(8, 10)) > 10) return 0;
  const donem = mutabakatVarsayilanDonem();
  return (cariler || []).filter((c) => !c.pasif && c.tip !== "Personel"
    && !(c.mutabakatlar || []).some((m) => m.donem === donem)
    && Object.keys(cariMutabakatBakiyesi(c, donem, "Resmi")).length > 0).length;
}
