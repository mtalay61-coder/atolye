// ================= ÜRÜN MALİYETİ — TEK HESAP + "MALİYET OK" (3 Ekim, v1.551.0) =================
//
// Kullanıcı: "Reçete maliyetten maliyet de çeksin. Maliyette maliyet ok düğmesi olsun — maliyette eksik bir
// şey yok anlamında — ve son maliyet güncelleme tarihi ile beraber. Ayrı bir grupta seçince reçete maliyeti
// gibi üzerine kâr koyup satış fiyatı belirleyelim; dışarıdan aldığımız ürünlerin alış fiyatından satış
// fiyatı yapalım."
//
// Ürün kartının Maliyet sekmesindeki hesap (160) ve Maliyet Yazdır (275) kendi içlerinde satır satır
// hesaplıyor; fiyat listesi (157) yüzlerce ürünün maliyetini tek bakışta istiyor. Hesap BURADA saf bir
// işlev olarak, kartla AYNI kurallarla: reçetesi olan rengin hammaddeleri (`hammaddeBirimFiyati` — son
// alış önce), ana + ara proses işçiliği, çift başı genel gider (ürüne özel ya da defter ÷ aylık hedef).
// Reçetesi olmayan (dışarıdan alınan) ürünün maliyeti ALIŞ FİYATI (kurla TL).
//
// `eksikler`: maliyeti eksik/yanlış gösterebilecek her şey (fiyatı olmayan hammadde, girilmemiş kur,
// işçiliği olmayan reçete…). "Maliyet OK" kullanıcının bunlara bakıp "tamam" demesi; kayıt `maliyetOnay`.

// Döner: { tur: "recete" | "alis" | "yok", hammadde, iscilik, genel, tamTL (null = hesaplanamadı), eksikler: [] }
function urunMaliyetHesabi(urun, ctx = {}) {
  const eksikler = [];
  if (!urun) return { tur: "yok", hammadde: 0, iscilik: 0, genel: 0, tamTL: null, eksikler: ["ürün yok"] };
  const kurlar = ctx.kurlar || {};
  const recete = urun.recete || [];
  if (recete.length === 0) {
    const f = parseFloat(urun.alisFiyati) || 0;
    if (!(f > 0)) return { tur: "yok", hammadde: 0, iscilik: 0, genel: 0, tamTL: null, eksikler: ["reçete de alış fiyatı da yok"] };
    const pb = alisPbKodu(urun);
    const kur = pb === "TRY" ? 1 : parseFloat(kurlar[pb]) || 0;
    if (!kur) return { tur: "alis", hammadde: 0, iscilik: 0, genel: 0, tamTL: null, alisFiyati: f, paraBirimi: pb, eksikler: [`${pb} kuru girilmemiş`] };
    const tl = Math.round(f * kur * 100) / 100;
    return { tur: "alis", hammadde: 0, iscilik: 0, genel: 0, tamTL: tl, alisFiyati: f, paraBirimi: pb, eksikler };
  }
  // Kartla aynı: ilk reçetesi olan varyant rengi.
  const renkler = Array.from(new Set((urun.variants || []).map((v) => v.renk)));
  const receteRengi = renkler.find((mr) => recete.some((r) => r.mamulRenk === mr));
  let hammadde = 0;
  if (!receteRengi) eksikler.push("reçete hiçbir renge bağlı değil");
  else {
    const ilgili = maliyetTemsiliSatirlar(recete.filter((r) => r.mamulRenk === receteRengi));   // v1.568: tek beden
    receteProsesGrupla(ilgili, ctx.tanimlarProsesler || [], urun.receteProsesSirasiOverride).forEach((pg) => {
      receteMaliyetGrupla(pg.satirlar).forEach((g) => {
        const s = g.satirlar[0];
        const hm = (ctx.tumUrunler || []).find((p) => p.id === s.hammaddeUrunId);
        const ad = hm ? hm.ad : (s.hammaddeAd || "?");
        if (!hm) { eksikler.push(`${ad}: stok kartı bulunamadı`); return; }
        const bf = hammaddeBirimFiyati(hm, s.renk, s.beden, kurlar, { cariler: ctx.cariler || [], kurGecmisi: ctx.kurGecmisi || [] });
        if (!(bf.kendiFiyat > 0)) eksikler.push(`${ad}${s.renk ? ` · ${s.renk}` : ""}: fiyatı yok`);
        else if (bf.pb !== "TRY" && !(parseFloat(kurlar[bf.pb]) > 0)) eksikler.push(`${bf.pb} kuru girilmemiş (${ad})`);
        hammadde += (s.miktar || 0) * bf.tl;
      });
    });
  }
  const ana = Object.values(urun.prosesUcretleri || {}).reduce((t, u) => t + (u || 0), 0);
  const ara = araProsesCiftleri(urun).reduce((t, [, apId]) => {
    if (!apId) return t;
    const ozel = (urun.araProsesUcretleri || {})[apId];
    if (ozel != null) return t + ozel;
    const ap = (ctx.tanimlarAraProsesler || []).find((x) => x.id === apId);
    return t + (ap ? (ap.ucret || 0) : 0);
  }, 0);
  const iscilik = ana + ara;
  if (!(iscilik > 0)) eksikler.push("işçilik ücreti girilmemiş");
  const hedefAdet = parseFloat(ctx.aylikUretimHedefi) || 0;
  const aylikGenel = (ctx.genelGiderler || []).reduce((t, k) => t + (parseFloat(k.aylikTutar) || 0), 0);
  const ozelGenel = urun.genelGiderCiftBasi != null && urun.genelGiderCiftBasi !== "" ? parseFloat(urun.genelGiderCiftBasi) : null;
  const genel = ozelGenel != null && !Number.isNaN(ozelGenel) ? ozelGenel : (hedefAdet > 0 ? aylikGenel / hedefAdet : 0);
  if (ozelGenel == null && aylikGenel > 0 && !(hedefAdet > 0)) eksikler.push("genel gider var ama aylık üretim hedefi girilmemiş");
  const tamTL = Math.round((hammadde + iscilik + genel) * 100) / 100;
  return { tur: "recete", hammadde, iscilik, genel, tamTL: tamTL > 0 ? tamTL : null, eksikler };
}

// MALİYET OK DURUMU. `urun.maliyetOnay = { tarih, kim, tamTL, tur }` — kullanıcı "Maliyet OK" dediği an.
// Onaydan SONRA maliyet değiştiyse (hammadde fiyatı, işçilik, kur…) onay "eskidi" sayılır: tarih hâlâ
// gösterilir ama kullanıcı yeniden bakmalı. Eşik %0,5 ve 1 kuruş — kur kıpırtısı her gün onayı düşürmesin.
function maliyetOnayDurumu(urun, hesap) {
  const o = urun && urun.maliyetOnay;
  if (!o || !o.tarih) return { durum: "yok", tarih: null, kim: "" };
  const simdi = hesap ? hesap.tamTL : null;
  const fark = simdi != null && o.tamTL != null ? Math.abs(simdi - o.tamTL) : 0;
  const eskidi = simdi == null || (fark > 0.01 && fark > Math.abs(o.tamTL) * 0.005);
  return { durum: eskidi ? "eskidi" : "ok", tarih: o.tarih, kim: o.kim || "", onayTL: o.tamTL, simdiTL: simdi };
}

// Kayıt nesnesi (saf; zaman ve kim dışarıdan).
function maliyetOnayKaydi(hesap, kim, zaman) {
  return { tarih: zaman || new Date().toISOString(), kim: kim || "", tamTL: hesap ? hesap.tamTL : null, tur: hesap ? hesap.tur : null,
    eksikSayisi: hesap ? hesap.eksikler.length : 0 };
}

// Ürün kartı › Maliyet sekmesinin başındaki kutu: eksikler, onay durumu ve "Maliyet OK" düğmesi.
function MaliyetOnayKutusu({ urun, hesap, onUrunGuncelle }) {
  const d = maliyetOnayDurumu(urun, hesap);
  const tarihYazi = d.tarih ? new Date(d.tarih).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "";
  const tl = (v) => `${(Math.round((v || 0) * 100) / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
  const renk = d.durum === "ok" ? "var(--erp-ok)" : d.durum === "eskidi" ? "var(--erp-warn)" : "var(--erp-text-2)";
  // Kart aktif kullanıcıyı almıyor; günlüğün kullanıcısı (girişte ayarlanır) yeterli. Ayarlanmamışsa boş.
  const gk = (typeof _gunlukKullanici !== "undefined" && _gunlukKullanici && _gunlukKullanici.ad) || "";
  const kim = gk === "Bilinmeyen" ? "" : gk;
  return (
    <div data-maliyet-onay={d.durum} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "10px 12px",
      border: `1px solid ${d.durum === "ok" ? "#8FA888" : "var(--erp-line-soft)"}`, borderRadius: "var(--erp-r-md)",
      background: d.durum === "ok" ? "#F0F5EE" : "var(--erp-panel)" }}>
      <div style={{ flex: 1, minWidth: 220, fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: renk }}>
          {d.durum === "ok" && <>✓ Maliyet OK · {tarihYazi}{d.kim ? ` · ${d.kim}` : ""}</>}
          {d.durum === "eskidi" && <>⚠ Maliyet onaydan sonra değişti ({tl(d.onayTL)} → {d.simdiTL != null ? tl(d.simdiTL) : "hesaplanamıyor"}) · onay {tarihYazi}</>}
          {d.durum === "yok" && <>Maliyet henüz onaylanmadı</>}
        </div>
        <div style={{ color: "var(--erp-text-2)", marginTop: 2 }}>
          {hesap.tur === "alis" ? "Dışarıdan alınan ürün — maliyet alış fiyatı" : "Reçete maliyeti"}: <b className="mono" data-maliyet-onay-tutar="1">{hesap.tamTL != null ? tl(hesap.tamTL) : "—"}</b>
        </div>
        {hesap.eksikler.length > 0 && (
          <ul data-maliyet-eksikler={hesap.eksikler.length} style={{ margin: "4px 0 0", paddingLeft: 18, color: "var(--erp-warn)" }}>
            {hesap.eksikler.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
      </div>
      <button type="button" className="btn-primary btn-save" data-maliyet-ok="1" disabled={hesap.tamTL == null}
        title={hesap.eksikler.length ? "Eksikler var — yine de onaylarsanız fiyat listesinde 'OK' görünür" : "Maliyette eksik yok — onayla"}
        onClick={() => onUrunGuncelle(urun.id, { maliyetOnay: maliyetOnayKaydi(hesap, kim) })}
        style={{ padding: "7px 14px" }}>
        <Check size={14} /> Maliyet OK
      </button>
    </div>
  );
}
