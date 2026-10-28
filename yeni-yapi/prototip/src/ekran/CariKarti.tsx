// KART KALIBI — Cari kartı; aynı bileşen yeni cari formudur.
// Okuma kipinde alan = etiket + değer; düzenlemede AYNI yerde giriş kutusu (yer değişmez).
// Başlık: ‹ sıra › ┆ Düzenle · İşlemler · Pasife al ┆ Kapat. Düzenlemede: Vazgeç · Kaydet, gezgin pasif.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alan, AramaliSecici, BosDurum, Cip, Ikon, KartBasligi, KaydetSorusu, Menu, Rozet, Sekmeler, SilOnayi } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";
import { kaynak, PROTOTIP_NOTU } from "../veri/kaynak";
import { FIYAT_GRUPLARI, ILLER } from "../veri/ornek";
import { bakiyeSinifi, bakiyeYaz, siparisCift, siparisTutar, sayi, tl } from "../veri/hesap";
import type { Cari, CariHareket, CariRolu, Siparis } from "../veri/tipler";

const ROLLER: CariRolu[] = ["Müşteri", "Tedarikçi", "Fasoncu", "Personel"];
const BOS: Cari = { id: "", kod: "", ad: "", il: "", roller: ["Müşteri"], bakiye: 0, paraBirimi: "TRY" };
let sonSekme = "genel";

type Hatalar = Partial<Record<"ad" | "roller" | "vergiNo" | "eposta" | "telefon", string>>;
function denetle(t: Cari): Hatalar {
  const h: Hatalar = {};
  if (!t.ad.trim()) h.ad = "Ünvan gerekli";
  if (!t.roller.length) h.roller = "En az bir rol seç";
  const vn = (t.vergiNo ?? "").replace(/\s/g, "");
  if (vn && !/^\d{10}$|^\d{11}$/.test(vn)) h.vergiNo = "Vergi no 10, TC kimlik no 11 hane";
  if (t.eposta && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t.eposta)) h.eposta = "E-posta biçimi yanlış";
  if (t.telefon && t.telefon.replace(/\D/g, "").length < 10) h.telefon = "Telefon en az 10 hane";
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

  const g = (alan: keyof Hatalar) => (denendi || alan === "vergiNo" || alan === "eposta") && duzenle ? hatalar[alan] : undefined;
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
            <div style={{ display: "grid", gap: 14 }}>
              {benzer && (
                <div className="erp-serit erp-serit--uyari" style={{ borderRadius: "var(--erp-r-md)" }}><Ikon ad="i-alert" />
                  Benzer cari var: <a href={"#cari-" + benzer.kod}>{benzer.kod} · {benzer.ad}</a>{benzer.pasif ? " (pasif)" : ""}. Aynı firmaysa onu kullan.
                </div>
              )}
              <div className="erp-form-satir ust-hizali">
                <Alan etiket="Kod" id="c-kod" genislik="erp-w-fisno" yardim={duzenle ? "Kaydedince verilir" : undefined}>{duzenle ? <input id="c-kod" className="erp-input" value={taslak.kod} disabled /> : <Deger>{taslak.kod}</Deger>}</Alan>
                <Alan etiket="Ünvan" id="c-ad" hata={g("ad")}>{duzenle ? <input id="c-ad" className="erp-input cari-unvan" value={taslak.ad} onChange={(e) => set("ad", e.target.value)} autoFocus /> : <Deger><b>{taslak.ad}</b></Deger>}</Alan>
              </div>
              <Alan etiket="Rol" id="c-rol" hata={g("roller")}>
                {duzenle ? (
                  <div className="cipler" role="group" aria-label="Rol">
                    {ROLLER.map((r) => <Cip key={r} secili={taslak.roller.includes(r)} onClick={() => set("roller", taslak.roller.includes(r) ? taslak.roller.filter((x) => x !== r) : [...taslak.roller, r])}>{r}</Cip>)}
                  </div>
                ) : <Deger>{taslak.roller.join(", ")}</Deger>}
              </Alan>
              {duzenle && (taslak.roller.includes("Fasoncu") || taslak.roller.includes("Personel")) && (
                <p className="soluk kucuk" style={{ margin: 0 }}><Ikon ad="i-info" /> Kaydedince bu kişiye ait sanal depo açılır; verilen malzeme orada görünür.</p>
              )}
              <div className="erp-form-satir ust-hizali">
                {metin("yetkili", "Yetkili", "erp-w-urun")}
                {metin("telefon", "Telefon", "erp-w-fisno", "0332 …")}
                {metin("eposta", "E-posta", "cari-w-eposta")}
              </div>
              <div className="erp-form-satir ust-hizali">
                {metin("vergiDairesi", "Vergi dairesi", "erp-w-urun")}
                {metin("vergiNo", "Vergi no / TC", "erp-w-fisno")}
                <Alan etiket="İl" id="c-il" genislik="erp-w-urun">
                  {duzenle
                    ? <AramaliSecici<string> id="c-il" kaynak={ILLER} etiket="il" secili={taslak.il || null} alanlar={(x) => [x]} sec={(x) => set("il", x ?? "")} ipucu="Yaz: il" />
                    : <Deger>{taslak.il}</Deger>}
                </Alan>
              </div>
              <Alan etiket="Adres" id="c-adres">{duzenle ? <textarea id="c-adres" className="erp-input cari-adres" value={taslak.adres ?? ""} onChange={(e) => set("adres", e.target.value)} /> : <Deger>{taslak.adres}</Deger>}</Alan>
              <div className="erp-form-satir ust-hizali">
                <Alan etiket="Fiyat grubu" id="c-fg" genislik="erp-w-renk" yardim={duzenle && taslak.roller.includes("Müşteri") ? "Siparişte fiyat buna göre önerilir" : undefined}>
                  {duzenle
                    ? <select id="c-fg" className="erp-input" value={taslak.fiyatGrubu ?? ""} onChange={(e) => set("fiyatGrubu", e.target.value || undefined)}><option value="">Yok</option>{FIYAT_GRUPLARI.map((f) => <option key={f}>{f}</option>)}</select>
                    : <Deger>{taslak.fiyatGrubu}</Deger>}
                </Alan>
                <Alan etiket="Para birimi" id="c-pb" genislik="erp-w-miktar" yardim={duzenle && !yeni && hareketler.length ? "Hareketi olan caride değişmez" : undefined}>
                  {duzenle
                    ? <select id="c-pb" className="erp-input" value={taslak.paraBirimi} disabled={!yeni && hareketler.length > 0} onChange={(e) => set("paraBirimi", e.target.value as Cari["paraBirimi"])}><option>TRY</option><option>USD</option><option>EUR</option></select>
                    : <Deger>{taslak.paraBirimi}</Deger>}
                </Alan>
              </div>
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
        {duzenle && (
          <div className="kart-dip">
            <button className="erp-btn" onClick={vazgec}>Vazgeç</button>
            <button className="erp-btn erp-btn--primary" onClick={kaydet} disabled={u.cevrimdisi} title={u.cevrimdisi ? "İnternet yok: kayıt girilemez" : "Kaydet · Ctrl+S"}><Ikon ad="i-save" />Kaydet</button>
          </div>
        )}
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
