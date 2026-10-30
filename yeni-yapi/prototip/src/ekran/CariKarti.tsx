// KART KALIBI — Cari kartı; aynı bileşen yeni cari formudur.
// Okuma kipinde alan = etiket + değer; düzenlemede AYNI yerde giriş kutusu (yer değişmez).
// Başlık: ‹ sıra › ┆ Düzenle · İşlemler · Pasife al ┆ Kapat. Düzenlemede: Kaydet ┆ Kapat (vazgeç), gezgin pasif.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alan, AramaliSecici, BosDurum, CariIsareti, Cip, Ikon, KartBasligi, KaydetSorusu, Menu, Rozet, Sekmeler, SilOnayi } from "../bilesen/temel";
import { cariRengi, resmiUnvan, vergiTuru } from "../veri/cari";
import { useUygulama } from "../bilesen/uygulama";
import { kaynak, PROTOTIP_NOTU } from "../veri/kaynak";
import { FIYAT_GRUPLARI, ILLER } from "../veri/ornek";
import { bakiyeSinifi, bakiyeYaz, siparisCift, siparisTutar, sayi, tl } from "../veri/hesap";
import type { Cari, CariHareket, CariRolu, EFaturaDurumu, Siparis } from "../veri/tipler";

const ROLLER: CariRolu[] = ["Müşteri", "Tedarikçi", "Fasoncu", "Personel"];
const BOS: Cari = { id: "", kod: "", ad: "", il: "", roller: ["Müşteri"], bakiye: 0, paraBirimi: "TRY" };
const E_FATURA: EFaturaDurumu[] = ["Bilinmiyor", "e-Fatura mükellefi", "e-Arşiv"];
let sonSekme = "genel";

type Hatalar = Partial<Record<"ad" | "roller" | "vergiNo" | "eposta" | "telefon" | "whatsapp" | "webGiris", string>>;
function denetle(t: Cari): Hatalar {
  const h: Hatalar = {};
  if (!t.ad.trim()) h.ad = "Ünvan gerekli";
  if (!t.roller.length) h.roller = "En az bir rol seç";
  const vn = (t.vergiNo ?? "").replace(/\s/g, "");
  if (vn && !/^\d{10}$|^\d{11}$/.test(vn)) h.vergiNo = "Vergi no 10, TC kimlik no 11 hane";
  if (t.eposta && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t.eposta)) h.eposta = "E-posta biçimi yanlış";
  if (t.telefon && t.telefon.replace(/\D/g, "").length < 10) h.telefon = "Telefon en az 10 hane";
  if (t.whatsapp && t.whatsapp.replace(/\D/g, "").length < 10) h.whatsapp = "WhatsApp en az 10 hane";
  // Portal girişinde kullanıcı adı e-postadır: e-postasız giriş açılmaz.
  if (t.webGiris && !t.eposta?.trim()) h.webGiris = "Web girişi için önce e-posta yaz";
  return h;
}

export function CariKarti({ kod }: { kod: string | null }) {
  const u = useUygulama();
  const yeni = kod === null;
  const [cari, setCari] = useState<Cari | null | undefined>(yeni ? { ...BOS } : null);
  const [taslak, setTaslak] = useState<Cari>({ ...BOS });
  const [duzenle, setDuzenle] = useState(yeni);
  const [denendi, setDenendi] = useState(false);
  const [sekme, setSekmeIc] = useState(yeni ? "genel" : sonSekme);
  const setSekme = (s: string) => { sonSekme = s; setSekmeIc(s); };
  const [hareketler, setHareketler] = useState<CariHareket[]>([]);
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [tumCariler, setTumCariler] = useState<Cari[]>([]);
  const [varsayilan, setVarsayilan] = useState<string[]>([]);
  const [islemler, setIslemler] = useState(false);
  const [pasifSor, setPasifSor] = useState(false);
  const [cikisSor, setCikisSor] = useState<null | (() => void)>(null);

  useEffect(() => {
    kaynak.cariler(true).then(setTumCariler);
    if (yeni) { kaynak.sonrakiCariKodu().then((k) => setTaslak({ ...BOS, kod: k })); return; }
    kaynak.cari(kod!).then((c) => { setCari(c); if (c) { setTaslak(c); kaynak.cariHareketleri(c.id).then(setHareketler); kaynak.cariSiparisleri(c.id).then(setSiparisler); } });
    u.gezintiAyarla("cari", { son: kod! });
  }, [kod]); // eslint-disable-line react-hooks/exhaustive-deps
  const liste = u.gezinti.cari?.liste;
  useEffect(() => { if (!liste && !yeni) kaynak.cariler().then((x) => setVarsayilan(x.map((c) => c.kod))); }, [liste, yeni]);
  const gezListe = liste && kod && liste.includes(kod) ? liste : varsayilan;

  const hatalar = useMemo(() => denetle(taslak), [taslak]);
  const hataVar = Object.keys(hatalar).length > 0;
  const degisti = JSON.stringify(taslak) !== JSON.stringify(yeni ? { ...BOS, kod: taslak.kod } : cari);
  // Aynı ünvan ya da vergi no ile başka cari: engellemez, uyarır (eski uygulamada mükerrer cari çoktu).
  const benzer = useMemo(() => {
    const A = window.Atolye;
    const ad = A.katla(taslak.ad.trim()), vn = (taslak.vergiNo ?? "").replace(/\s/g, "");
    if (!duzenle || (!ad && !vn)) return null;
    return tumCariler.find((c) => c.kod !== taslak.kod && ((ad.length > 3 && A.katla(c.ad) === ad) || (vn && c.vergiNo === vn))) ?? null;
  }, [taslak, tumCariler, duzenle]);

  const set = <K extends keyof Cari>(k: K, v: Cari[K]) => setTaslak((t) => ({ ...t, [k]: v }));
  const kaydet = () => {
    setDenendi(true);
    if (hataVar) { setSekme("genel"); return; }
    kaynak.komut("cari_kaydet", taslak).then((r) => {
      u.bildir(`${taslak.kod} · ${r.mesaj.toLowerCase()}${PROTOTIP_NOTU}`);
      setCikisSor(null);
      if (yeni) u.git("cariler"); else { setDuzenle(false); setDenendi(false); }
    });
  };
  const vazgec = () => {
    const cik = () => { setCikisSor(null); setDenendi(false); if (yeni) u.git("cariler"); else { setTaslak(cari!); setDuzenle(false); } };
    if (degisti) setCikisSor(() => cik); else cik();
  };
  const kapat = () => u.git("cariler");

  if (cari === null) return <div className="sayfa-govde soluk">Yükleniyor…</div>;
  if (cari === undefined) return <div className="sayfa-govde"><BosDurum baslik="Cari bulunamadı" aciklama={`${kod} kodlu cari yok.`} dugme={<button className="erp-btn" onClick={kapat}>Carilere dön</button>} /></div>;

  const g = (alan: keyof Hatalar) => (denendi || alan === "vergiNo" || alan === "eposta" || alan === "webGiris") && duzenle ? hatalar[alan] : undefined;
  // WhatsApp alanı boşsa telefonla aynı sayılır (ayrı numara yazılınca ayrışır).
  const waAyni = taslak.whatsapp === undefined;
  const turkiye = !taslak.ulke || window.Atolye.katla(taslak.ulke) === window.Atolye.katla("Türkiye");
  // Okuma kipinde değer, düzenlemede giriş: aynı ızgara hücresi.
  const Deger = ({ children }: { children: ReactNode }) => <div className="cari-deger">{children || <span className="soluk">—</span>}</div>;
  const metin = (k: "telefon" | "eposta" | "yetkili" | "vergiDairesi" | "vergiNo", etiket: string, genislik: string, ipucu?: string) => (
    <Alan etiket={etiket} id={"c-" + k} genislik={genislik} hata={g(k as keyof Hatalar)}>
      {duzenle ? <input id={"c-" + k} className="erp-input" value={taslak[k] ?? ""} placeholder={ipucu} onChange={(e) => set(k, e.target.value)} inputMode={k === "telefon" || k === "vergiNo" ? "numeric" : undefined} /> : <Deger>{taslak[k]}</Deger>}
    </Alan>
  );
  const ozel = !yeni && (
    <span style={{ position: "relative" }}>
      <button className="erp-btn" aria-haspopup="menu" onClick={() => setIslemler(!islemler)}>İşlemler</button>
      {islemler && (
        <Menu kapat={() => setIslemler(false)} ogeler={[
          { ad: "Tahsilat al", ikon: "i-plus", pasif: cari.pasif ? "Pasif cari" : u.cevrimdisi ? "İnternet yok" : undefined, onClick: () => u.bildir("Tahsilat ekranı Kasa modülünde çizilecek" + PROTOTIP_NOTU, { ikon: "i-info" }) },
          { ad: "Ödeme yap", ikon: "i-export", pasif: cari.pasif ? "Pasif cari" : u.cevrimdisi ? "İnternet yok" : undefined, onClick: () => u.bildir("Ödeme ekranı Kasa modülünde çizilecek" + PROTOTIP_NOTU, { ikon: "i-info" }) },
          { ad: "Mahsup", ikon: "i-copy", pasif: u.cevrimdisi ? "İnternet yok" : undefined, onClick: () => u.bildir("Mahsup (MHS) belgesi çizilecek" + PROTOTIP_NOTU, { ikon: "i-info" }) },
          { ad: "Yeni sipariş", ikon: "i-draft", pasif: !cari.roller.includes("Müşteri") ? "Müşteri rolü yok" : undefined, onClick: () => u.git("siparis-yeni") },
          // Web girişi: yoksa oluştur, varsa şifre sıfırla. Geçici şifre yalnız bir kez gösterilir, hiçbir yerde saklanmaz.
          cari.webGiris
            ? { ad: "Web girişi: şifre sıfırla", ikon: "i-refresh", pasif: u.cevrimdisi ? "İnternet yok" : undefined, onClick: () => u.bildir("Geçici şifre oluşturuldu; bir kez gösterilecek" + PROTOTIP_NOTU, { ikon: "i-info" }) }
            : { ad: "Web giriş bilgisi oluştur", ikon: "i-plus", pasif: !cari.roller.includes("Müşteri") ? "Müşteri rolü yok" : !cari.eposta ? "Önce e-posta yaz (kullanıcı adı e-postadır)" : u.cevrimdisi ? "İnternet yok" : undefined, onClick: () => u.bildir("Giriş bilgisi oluşturuldu" + PROTOTIP_NOTU) },
          "-",
          { ad: "Ekstre yazdır", ikon: "i-print", pasif: "Prototipte yazdırma yok" },
          ...(cari.pasif ? ["-" as const, { ad: "Yeniden etkinleştir", ikon: "i-check", onClick: () => u.bildir(`${cari.kod} · cari yeniden etkin${PROTOTIP_NOTU}`) }] : []),
        ]} />
      )}
    </span>
  );

  return (
    <div className="sayfa-govde">
      <div className="erp-card">
        <KartBasligi kod={taslak.kod} baslik={yeni ? "Yeni cari" : (duzenle ? taslak.ad || cari.ad : cari.ad) + (duzenle && !yeni ? " · düzenleniyor" : "")}
          durum={!yeni && <>{cari.pasif && <Rozet durum="Pasif" />}<span className={"cari-bakiye " + bakiyeSinifi(cari.bakiye)} title={cari.bakiye > 0 ? "Cari bize borçlu" : cari.bakiye < 0 ? "Biz cariye borçluyuz" : "Bakiye sıfır"}>{bakiyeYaz(cari.bakiye, cari.paraBirimi)}</span></>}
          gezgin={yeni ? undefined : { liste: gezListe, mevcut: kod!, git: (x) => u.git("cari-" + x) }}
          duzenle={{ onClick: () => { setDuzenle(true); setSekme("genel"); } }}
          sil={{ onClick: () => setPasifSor(true), pasif: cari.pasif ? "Cari zaten pasif" : undefined }}
          ozel={ozel} kapat={kapat}
          duzenlemede={duzenle} kaydet={{ onClick: kaydet, pasif: denendi && hataVar ? "Önce kırmızı alanları düzelt" : undefined }} vazgec={vazgec} />
        {!yeni && (
          <Sekmeler secili={sekme} sec={(s) => { if (!duzenle) setSekme(s); }} sekmeler={[
            { id: "genel", ad: "Genel" }, { id: "hareketler", ad: "Hareketler", sayi: hareketler.length },
            { id: "siparisler", ad: "Siparişler", sayi: siparisler.length }, { id: "notlar", ad: "Notlar" },
          ]} />
        )}
        <div className="erp-card__body">
          {(sekme === "genel" || yeni) && (
            // Bütün bilgiler tek sayfada, konulara ayrılmış; yeni caride de hepsi baştan açık (eski uygulamada çoğu
            // ancak kayıttan sonra "Bilgiler"de giriliyordu). Zorunlu yalnız ünvan ve rol; gerisi boş bırakılabilir.
            <div style={{ display: "grid", gap: 16 }}>
              {benzer && (
                <div className="erp-serit erp-serit--uyari" style={{ borderRadius: "var(--erp-r-md)" }}><Ikon ad="i-alert" />
                  Benzer cari var: <a href={"#cari-" + benzer.kod}>{benzer.kod} · {benzer.ad}</a>{benzer.pasif ? " (pasif)" : ""}. Aynı firmaysa onu kullan.
                </div>
              )}

              <section className="erp-bolum" aria-labelledby="b-kimlik">
                <h3 className="erp-bolum__baslik" id="b-kimlik">Kimlik</h3>
                <div className="erp-form-satir ust-hizali">
                  <Alan etiket="Kod" id="c-kod" genislik="erp-w-fisno" yardim={duzenle ? "Kaydedince verilir" : undefined}>{duzenle ? <input id="c-kod" className="erp-input" value={taslak.kod} disabled /> : <Deger>{taslak.kod}</Deger>}</Alan>
                  <Alan etiket="Ünvan" id="c-ad" hata={g("ad")} yardim={duzenle ? "Listelerde görünen ad" : undefined}>{duzenle ? <input id="c-ad" className="erp-input cari-unvan" value={taslak.ad} onChange={(e) => set("ad", e.target.value)} autoFocus /> : <Deger><b>{taslak.ad}</b></Deger>}</Alan>
                </div>
                <div className="erp-form-satir ust-hizali">
                  <Alan etiket="Rol" id="c-rol" hata={g("roller")}>
                    {duzenle ? (
                      <div className="cipler" role="group" aria-label="Rol">
                        {ROLLER.map((r) => <Cip key={r} secili={taslak.roller.includes(r)} onClick={() => set("roller", taslak.roller.includes(r) ? taslak.roller.filter((x) => x !== r) : [...taslak.roller, r])}>{r}</Cip>)}
                      </div>
                    ) : <Deger>{taslak.roller.join(", ")}</Deger>}
                  </Alan>
                  <Alan etiket="Para birimi" id="c-pb" genislik="erp-w-miktar" yardim={duzenle && !yeni && hareketler.length ? "Hareketi olan caride değişmez" : undefined}>
                    {duzenle
                      ? <select id="c-pb" className="erp-input" value={taslak.paraBirimi} disabled={!yeni && hareketler.length > 0} onChange={(e) => set("paraBirimi", e.target.value as Cari["paraBirimi"])}><option>TRY</option><option>USD</option><option>EUR</option></select>
                      : <Deger>{taslak.paraBirimi}</Deger>}
                  </Alan>
                  {taslak.roller.includes("Müşteri") && (
                    <Alan etiket="Fiyat grubu" id="c-fg" genislik="erp-w-renk" yardim={duzenle ? "Siparişte fiyat buna göre önerilir" : undefined}>
                      {duzenle
                        ? <select id="c-fg" className="erp-input" value={taslak.fiyatGrubu ?? ""} onChange={(e) => set("fiyatGrubu", e.target.value || undefined)}><option value="">Yok</option>{FIYAT_GRUPLARI.map((f) => <option key={f}>{f}</option>)}</select>
                        : <Deger>{taslak.fiyatGrubu}</Deger>}
                    </Alan>
                  )}
                </div>
                {duzenle && (taslak.roller.includes("Fasoncu") || taslak.roller.includes("Personel")) && (
                  <p className="soluk kucuk" style={{ margin: 0 }}><Ikon ad="i-info" /> Kaydedince bu kişiye ait sanal depo açılır; verilen malzeme orada görünür.</p>
                )}
              </section>

              <section className="erp-bolum" aria-labelledby="b-iletisim">
                <h3 className="erp-bolum__baslik" id="b-iletisim">İletişim</h3>
                <div className="erp-form-satir ust-hizali">
                  {metin("yetkili", "Yetkili", "erp-w-urun")}
                  {metin("telefon", "Telefon", "erp-w-fisno", "0332 …")}
                  <Alan etiket="WhatsApp" id="c-whatsapp" genislik="erp-w-fisno" hata={g("whatsapp")}>
                    {duzenle ? (
                      <div style={{ display: "grid", gap: 3 }}>
                        <input id="c-whatsapp" className="erp-input" inputMode="numeric" placeholder="05xx…" value={waAyni ? taslak.telefon ?? "" : taslak.whatsapp ?? ""} disabled={waAyni} onChange={(e) => set("whatsapp", e.target.value)} />
                        <label className="kucuk soluk" style={{ display: "flex", gap: 4, alignItems: "center", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>
                          <input type="checkbox" checked={waAyni} onChange={(e) => set("whatsapp", e.target.checked ? undefined : taslak.telefon ?? "")} /> Telefonla aynı
                        </label>
                      </div>
                    ) : <Deger>{taslak.whatsapp || (taslak.telefon ? <span>{taslak.telefon} <span className="soluk kucuk">(telefonla aynı)</span></span> : null)}</Deger>}
                  </Alan>
                  {metin("eposta", "E-posta", "cari-w-eposta", "ad@firma.com")}
                </div>
              </section>

              <section className="erp-bolum" aria-labelledby="b-resmi">
                <h3 className="erp-bolum__baslik" id="b-resmi">Resmi bilgiler</h3>
                <div className="erp-form-satir ust-hizali">
                  <Alan etiket="Resmi ünvan" id="c-resmi" yardim={duzenle ? "Fatura ve resmi belgede yazılır; boşsa ünvan kullanılır" : undefined}>
                    {duzenle ? <input id="c-resmi" className="erp-input cari-unvan" value={taslak.resmiUnvan ?? ""} placeholder={taslak.ad} onChange={(e) => set("resmiUnvan", e.target.value || undefined)} /> : <Deger>{resmiUnvan(taslak)}</Deger>}
                  </Alan>
                </div>
                <div className="erp-form-satir ust-hizali">
                  {metin("vergiDairesi", "Vergi dairesi", "erp-w-urun")}
                  <Alan etiket="Vergi no / TC kimlik no" id="c-vergiNo" genislik="erp-w-tarih" hata={g("vergiNo")} yardim={duzenle ? (vergiTuru(taslak.vergiNo) || "Firma 10 hane, şahıs 11 hane") : undefined}>
                    {duzenle ? <input id="c-vergiNo" className="erp-input" inputMode="numeric" value={taslak.vergiNo ?? ""} onChange={(e) => set("vergiNo", e.target.value)} /> : <Deger>{taslak.vergiNo && <>{taslak.vergiNo} <span className="soluk kucuk">{vergiTuru(taslak.vergiNo)}</span></>}</Deger>}
                  </Alan>
                  <Alan etiket="e-Fatura" id="c-efatura" genislik="erp-w-tarih">
                    {duzenle
                      ? <select id="c-efatura" className="erp-input" value={taslak.eFatura ?? "Bilinmiyor"} onChange={(e) => set("eFatura", e.target.value as EFaturaDurumu)}>{E_FATURA.map((x) => <option key={x}>{x}</option>)}</select>
                      : <Deger>{taslak.eFatura ?? "Bilinmiyor"}</Deger>}
                  </Alan>
                </div>
              </section>

              <section className="erp-bolum" aria-labelledby="b-adres">
                <h3 className="erp-bolum__baslik" id="b-adres">Adres</h3>
                <Alan etiket="Adres" id="c-adres">{duzenle ? <textarea id="c-adres" className="erp-input cari-adres" value={taslak.adres ?? ""} onChange={(e) => set("adres", e.target.value)} /> : <Deger>{taslak.adres}</Deger>}</Alan>
                <div className="erp-form-satir ust-hizali">
                  <Alan etiket="İlçe" id="c-ilce" genislik="erp-w-urun">{duzenle ? <input id="c-ilce" className="erp-input" value={taslak.ilce ?? ""} onChange={(e) => set("ilce", e.target.value || undefined)} /> : <Deger>{taslak.ilce}</Deger>}</Alan>
                  <Alan etiket="İl" id="c-il" genislik="erp-w-urun">
                    {duzenle
                      ? (turkiye
                        ? <AramaliSecici<string> id="c-il" kaynak={ILLER} etiket="il" secili={taslak.il || null} alanlar={(x) => [x]} sec={(x) => set("il", x ?? "")} ipucu="Yaz: il" />
                        : <input id="c-il" className="erp-input" value={taslak.il} placeholder="Şehir" onChange={(e) => set("il", e.target.value)} />)
                      : <Deger>{taslak.il}</Deger>}
                  </Alan>
                  <Alan etiket="Ülke" id="c-ulke" genislik="erp-w-urun" yardim={duzenle && !turkiye ? "Yurt dışı: il serbest yazılır" : undefined}>
                    {duzenle ? <input id="c-ulke" className="erp-input" value={taslak.ulke ?? ""} placeholder="Türkiye" onChange={(e) => set("ulke", e.target.value || undefined)} /> : <Deger>{taslak.ulke || "Türkiye"}</Deger>}
                  </Alan>
                </div>
              </section>

              <section className="erp-bolum" aria-labelledby="b-gorunum">
                <h3 className="erp-bolum__baslik" id="b-gorunum">Görünüm</h3>
                <div className="erp-form-satir ust-hizali" style={{ alignItems: "flex-start", gap: 16 }}>
                  <CariIsareti cari={taslak} buyuk />
                  <Alan etiket="Logo" id="c-logo" yardim={duzenle ? "Sipariş listesinde adın yanında görünür" : undefined}>
                    {duzenle ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <input id="c-logo" type="file" accept="image/*" className="kucuk" onChange={(e) => { const f = e.target.files?.[0]; if (f) set("logo", URL.createObjectURL(f)); }} />
                        {taslak.logo && <button type="button" className="erp-btn" onClick={() => set("logo", undefined)}>Logoyu kaldır</button>}
                      </div>
                    ) : <Deger>{taslak.logo ? "Var" : null}</Deger>}
                  </Alan>
                  <Alan etiket="Renk" id="c-renk" yardim={duzenle ? (taslak.renk ? "Logo yoksa baş harflerin zemini" : "Otomatik: koddan seçildi") : undefined}>
                    {duzenle ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input id="c-renk" type="color" aria-label="Cari rengi" value={cariRengi(taslak)} onChange={(e) => set("renk", e.target.value)} style={{ width: 36, height: 30, padding: 0, border: "none", background: "none" }} />
                        {taslak.renk && <button type="button" className="erp-btn" onClick={() => set("renk", undefined)}>Otomatik</button>}
                      </div>
                    ) : <Deger>{taslak.renk ? taslak.renk.toUpperCase() : "Otomatik"}</Deger>}
                  </Alan>
                </div>
              </section>

              {taslak.roller.includes("Müşteri") && (
                <section className="erp-bolum" aria-labelledby="b-web">
                  <h3 className="erp-bolum__baslik" id="b-web">Web sitesi girişi</h3>
                  {duzenle && !(cari.webGiris && !yeni) ? (
                    <Alan etiket="Giriş bilgisi" id="c-web" hata={g("webGiris")}>
                      <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input id="c-web" type="checkbox" checked={!!taslak.webGiris} onChange={(e) => set("webGiris", e.target.checked || undefined)} />
                        Kaydedince giriş bilgisi oluştur
                      </label>
                    </Alan>
                  ) : <Deger>{cari.webGiris ? <><Rozet durum="Onaylı" metin="Giriş var" /> <span className="soluk kucuk">Şifre sıfırlama İşlemler menüsünde</span></> : null}</Deger>}
                  <p className="soluk kucuk" style={{ margin: 0 }}>Giriş bilgisi olmayan müşteri sitedeki koleksiyonu ve hesabını göremez. Kullanıcı adı e-postadır; geçici şifre kayıttan sonra bir kez gösterilir.</p>
                </section>
              )}
            </div>
          )}

          {sekme === "hareketler" && !yeni && (hareketler.length ? (
            <div className="erp-table-kap">
              <table className="erp-table">
                <thead><tr><th>Tarih</th><th>Belge</th><th>Açıklama</th><th className="erp-sayi">Borç</th><th className="erp-sayi">Alacak</th><th className="erp-sayi">Bakiye</th></tr></thead>
                <tbody>
                  {hareketler.reduce<{ satirlar: ReactNode[]; b: number }>((acc, x) => {
                    const b = acc.b + x.borc - x.alacak;
                    acc.satirlar.push(<tr key={x.id}><td>{x.tarih}</td><td>{x.belge}</td><td>{x.aciklama}</td><td className="erp-sayi">{x.borc ? tl(x.borc) : ""}</td><td className="erp-sayi">{x.alacak ? tl(x.alacak) : ""}</td><td className={"erp-sayi " + bakiyeSinifi(b)}>{bakiyeYaz(b, cari.paraBirimi)}</td></tr>);
                    return { satirlar: acc.satirlar, b };
                  }, { satirlar: [], b: 0 }).satirlar}
                </tbody>
                <tfoot><tr><td colSpan={3}>{hareketler.length} hareket</td><td className="erp-sayi">{tl(hareketler.reduce((a, x) => a + x.borc, 0))}</td><td className="erp-sayi">{tl(hareketler.reduce((a, x) => a + x.alacak, 0))}</td><td className={"erp-sayi " + bakiyeSinifi(cari.bakiye)}>{bakiyeYaz(cari.bakiye, cari.paraBirimi)}</td></tr></tfoot>
              </table>
            </div>
          ) : <BosDurum baslik="Hareket yok" aciklama="Satış, alış, tahsilat ve ödeme belgeleri kesildikçe ekstre burada oluşur." />)}

          {sekme === "siparisler" && !yeni && (siparisler.length ? (
            <div className="erp-table-kap">
              <table className="erp-table">
                <thead><tr><th>Sipariş</th><th>Tarih</th><th>Teslim</th><th>Durum</th><th className="erp-sayi">Çift</th><th className="erp-sayi">Tutar</th></tr></thead>
                <tbody>
                  {siparisler.map((s) => (
                    <tr key={s.no} tabIndex={0} onDoubleClick={() => { u.gezintiAyarla("siparis", { liste: siparisler.map((x) => x.no) }); u.git("siparis-" + s.no); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { u.gezintiAyarla("siparis", { liste: siparisler.map((x) => x.no) }); u.git("siparis-" + s.no); } }}>
                      <td>{s.no}</td><td>{s.tarih}</td><td>{s.teslim}</td><td><Rozet durum={s.durum} /></td><td className="erp-sayi">{sayi(siparisCift(s))}</td><td className="erp-sayi">{tl(siparisTutar(s))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <BosDurum baslik="Sipariş yok" aciklama={cari.roller.includes("Müşteri") ? "Bu müşterinin siparişleri burada listelenir." : "Müşteri rolü olmayan cariye satış siparişi açılmaz."} />)}
          {sekme === "siparisler" && siparisler.length > 0 && <p className="soluk kucuk">Çift tık: siparişi açar; orada ‹ › bu müşterinin siparişleri arasında gezer.</p>}

          {sekme === "notlar" && !yeni && (duzenle
            ? <textarea className="erp-input" style={{ height: 120, width: "min(560px, 100%)", paddingTop: 6 }} value={taslak.not ?? ""} onChange={(e) => set("not", e.target.value)} />
            : <p style={{ margin: 0, maxWidth: "70ch" }}>{cari.not ?? <span className="soluk">Not yok.</span>}</p>)}
        </div>
      </div>
      {!duzenle && <p className="soluk kucuk"><Ikon ad="i-info" /> ‹ › ya da PageUp/PageDown: önceki/sonraki cari. F2: düzenle. Esc: listeye döner.</p>}
      {pasifSor && (
        <SilOnayi soru={`${cari.ad} pasife alınsın mı?`} dugme="Pasife al"
          aciklama="Cari silinmez: hareketleri ve belgeleri kalır, yalnız seçim listelerinden çıkar. Pasif süzgecinden geri açılabilir."
          onayla={() => { setPasifSor(false); u.bildir(`${cari.kod} · cari pasife alındı${PROTOTIP_NOTU}`, { ikon: "i-ban", geriAl: () => u.bildir("Geri alındı" + PROTOTIP_NOTU, { ikon: "i-undo" }) }); }}
          vazgec={() => setPasifSor(false)} />
      )}
      {cikisSor && <KaydetSorusu kaydet={kaydet} at={cikisSor} don={() => setCikisSor(null)} />}
    </div>
  );
}
