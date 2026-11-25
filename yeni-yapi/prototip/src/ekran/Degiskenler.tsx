// HAMMADDE DEĞİŞKENLERİ — hammaddeyi çeşitlendiren değer: deride renk, başka deride kalınlık, fermuarda boy.
// "Renk" sabit yazılmaz: her değer bir TÜRE bağlıdır (Deri rengi, Deri kalınlığı…) ve türün ETİKETİ
// (Renk, Kalınlık, Boy) hammadde kartında, seçicide ve matriste görünen addır. Görseli "renk" olan türde
// değerin hex'i ve resmi tutulur, RenkKutusu gösterilir; "yok" olanda yalnız kod ve ad.
import { useEffect, useMemo, useState } from "react";
import { Alan, AramaliSecici, BosDurum, Cip, Ikon, KartBasligi, KaydetSorusu, Menu, RenkKutusu, Rozet, SatirEylemleri, Sekmeler, SilOnayi, useSagTik } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";
import { kaynak, PROTOTIP_NOTU } from "../veri/kaynak";
import { degiskenDenetle, sonrakiDegiskenKodu, turDenetle } from "../veri/renk";
import type { Degisken, DegiskenTuru } from "../veri/tipler";
import { TanimSayfasi, tanimDurumu } from "./TanimSayfasi";

const degerSilBilgisi = (d: Degisken, tur?: DegiskenTuru): { tur: "sil" | "pasif" | "yok"; aciklama: string } =>
  d.kullanim > 0
    ? (d.pasif ? { tur: "yok", aciklama: "Değer zaten pasif" } : { tur: "pasif", aciklama: `${d.kullanim} hammadde varyantında kullanılıyor; silinmez, pasife alınır. Seçim listelerinden çıkar, eski kayıtlarda görünür.` })
    : { tur: "sil", aciklama: `Hiçbir hammaddede kullanılmıyor; bu ${tur?.etiket.toLocaleLowerCase("tr") ?? "değer"} kalıcı olarak silinir.` };

function DegerSilOnayi({ d, tur, onayla, vazgec }: { d: Degisken; tur?: DegiskenTuru; onayla: () => void; vazgec: () => void }) {
  const b = degerSilBilgisi(d, tur);
  return <SilOnayi soru={`${tur?.ad ?? ""} · ${d.ad} ${b.tur === "sil" ? "silinsin mi" : "pasife alınsın mı"}?`} dugme={b.tur === "sil" ? "Sil" : "Pasife al"} aciklama={b.aciklama} onayla={onayla} vazgec={vazgec} />;
}

// Hammadde kartında nasıl görüneceği: türün etiketi alan adı olur.
const KartOnizleme = ({ tur, deger }: { tur: DegiskenTuru; deger?: string }) => (
  <p className="kucuk" style={{ margin: 0 }}><span className="soluk">Hammadde kartında:</span> <span className="erp-renk-hucre__baslik">{tur.etiket || "?"}</span> {deger || <span className="soluk">…</span>} <span className="soluk">· matriste sütun başlığı "{tur.etiket || "?"}"</span></p>
);

export function DegiskenListesi({ sekme, sec: sekmeSec }: { sekme: string; sec: (s: string) => void }) {
  const u = useUygulama();
  const [turler, setTurler] = useState<DegiskenTuru[]>([]);
  const [tum, setTum] = useState<Degisken[] | null>(null);
  const [turId, setTurIdIc] = useState(tanimDurumu.tur);
  const setTurId = (t: string) => { tanimDurumu.tur = t; setTurIdIc(t); setSecili(null); };
  const [pasifler, setPasifler] = useState(false);
  const [ara, setAra] = useState("");
  const [adSuz, setAdSuz] = useState("");
  const [secili, setSecili] = useState<string | null>(() => u.gezinti.degisken?.son ?? null);
  const [silSor, setSilSor] = useState<Degisken | null>(null);
  const sagTik = useSagTik<Degisken>();
  const yukle = () => { kaynak.degiskenTurleri().then(setTurler); kaynak.degiskenler().then(setTum); };
  useEffect(yukle, []);
  const tur = turler.find((t) => t.id === turId);
  const satirlar = useMemo(() => (tum ?? []).filter((d) => d.turId === turId && !!d.pasif === pasifler && (!ara || window.Atolye.eslesme(ara, [d.kod])) && (!adSuz || window.Atolye.eslesme(adSuz, [d.ad]))).sort((a, b) => a.kod.localeCompare(b.kod, "tr", { numeric: true })), [tum, turId, pasifler, ara, adSuz]);
  useEffect(() => { if (tum) u.gezintiAyarla("degisken", { liste: satirlar.map((d) => d.id) }); }, [satirlar, tum]); // eslint-disable-line react-hooks/exhaustive-deps
  const sec = satirlar.find((d) => d.id === secili) ?? null;
  const ac = (id: string) => u.git("degisken-" + id);
  const duzenleAc = (id: string) => { degerDuzenlemede = true; ac(id); };
  const renkli = tur?.gorsel === "renk";
  const sil = (d: Degisken) => {
    const b = degerSilBilgisi(d, tur);
    kaynak.komut(b.tur === "sil" ? "degisken_sil" : "degisken_pasife_al", d).then((x) => {
      setSilSor(null);
      u.bildir(`${d.kod} · ${x.mesaj.toLowerCase()}${PROTOTIP_NOTU}`, { ikon: b.tur === "sil" ? "i-trash" : "i-ban", geriAl: () => u.bildir("Geri alındı" + PROTOTIP_NOTU, { ikon: "i-undo" }) });
    });
  };

  return (
    <TanimSayfasi sekme={sekme} sec={sekmeSec} eylemler={{
      yeni: { onClick: () => u.git("degisken-yeni-" + turId), pasif: !tur ? "Önce bir tür seç" : tur.pasif ? "Pasif türe değer eklenmez" : undefined },
      sil: { onClick: () => sec && setSilSor(sec), pasif: !sec ? "Önce bir değer seç" : degerSilBilgisi(sec, tur).tur === "yok" ? "Değer zaten pasif" : undefined },
      ara: { onClick: () => document.getElementById("suz-deger")?.focus() },
      filtre: { onClick: () => { setAra(""); setAdSuz(""); setPasifler(false); } },
      yenile: { onClick: () => { setTum(null); yukle(); } },
      yazdir: { pasif: "Prototipte yazdırma yok" },
      excel: { pasif: "Prototipte Excel yok; ekrandaki tablonun aynısı olacak" },
    }} ust={
      <div style={{ display: "grid", gap: 8 }}>
        <div className="cipler" role="group" aria-label="Değişken türü">
          {turler.map((t) => <Cip key={t.id} secili={t.id === turId} onClick={() => setTurId(t.id)}>{t.ad} <b>{(tum ?? []).filter((d) => d.turId === t.id && !d.pasif).length}</b></Cip>)}
          <button type="button" className="erp-btn" onClick={() => u.git("degisken-turu-yeni")}><Ikon ad="i-plus" />Yeni tür</button>
        </div>
        {tur && (
          <div className="erp-form-satir" style={{ alignItems: "center", gap: 12 }}>
            <span className="kucuk"><span className="soluk">Etiket</span> <b>{tur.etiket}</b> · <span className="soluk">Görsel</span> {renkli ? "renk kutusu" : "yok"}</span>
            <button type="button" className="erp-btn" onClick={() => u.git("degisken-turu-" + tur.id)}>Türü aç</button>
            <Cip secili={pasifler} onClick={() => setPasifler(!pasifler)}>Pasifler <b>{(tum ?? []).filter((d) => d.turId === turId && d.pasif).length}</b></Cip>
          </div>
        )}
      </div>
    }>
      {tum === null || !tur ? <p className="soluk">Yükleniyor…</p> : (
        <div className="erp-table-kap erp-table-kap--kaydir">
          <table className="erp-table">
            <thead>
              <tr><th>Kod</th><th>{tur.etiket}</th><th className="erp-sayi">Kullanım</th><th className="erp-satir-eylem"><span className="gizli">Eylem</span></th></tr>
              <tr className="erp-suzgec">
                <th><input id="suz-deger" placeholder="Kod" aria-label="Kodda süz" value={ara} onChange={(e) => setAra(e.target.value)} /></th>
                <th><input placeholder={tur.etiket} aria-label={tur.etiket + " süz"} value={adSuz} onChange={(e) => setAdSuz(e.target.value)} /></th><th /><th className="erp-satir-eylem" />
              </tr>
            </thead>
            <tbody>
              {satirlar.map((d) => (
                <tr key={d.id} aria-selected={secili === d.id} tabIndex={0}
                  onClick={() => setSecili(d.id)} onDoubleClick={() => ac(d.id)}
                  onPointerUp={(e) => { if (e.pointerType === "touch") ac(d.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter") ac(d.id); }}
                  onContextMenu={(e) => { setSecili(d.id); sagTik.ac(e, d); }}>
                  <td style={{ whiteSpace: "nowrap" }}>{renkli && <><RenkKutusu dilimler={d.hex ? [d.hex] : []} resim={d.resim} /> </>}<b>{d.kod}</b></td>
                  <td>{d.ad}{d.pasif && <> <Rozet durum="Pasif" /></>}</td>
                  <td className="erp-sayi">{d.kullanim ? `${d.kullanim} varyant` : <span className="soluk">—</span>}</td>
                  <SatirEylemleri duzenle={() => duzenleAc(d.id)} sil={() => { setSecili(d.id); setSilSor(d); }}
                    duzenleNeden={u.cevrimdisi ? "İnternet yok: kayıt girilemez" : undefined}
                    silNeden={u.cevrimdisi ? "İnternet yok: kayıt girilemez" : degerSilBilgisi(d, tur).tur === "yok" ? "Değer zaten pasif" : undefined}
                    silAd={degerSilBilgisi(d, tur).tur === "sil" ? "Sil" : "Pasife al"} />
                </tr>
              ))}
            </tbody>
            {satirlar.length > 0 && <tfoot><tr><td colSpan={4}>{satirlar.length} {tur.ad.toLocaleLowerCase("tr")} değeri</td></tr></tfoot>}
          </table>
          {satirlar.length === 0 && <BosDurum baslik={pasifler ? "Pasif değer yok" : `${tur.ad} için değer yok`} aciklama={`Yeni ile ilk ${tur.etiket.toLocaleLowerCase("tr")} değerini ekle.`} />}
        </div>
      )}
      <p className="soluk kucuk" style={{ margin: 0 }}><Ikon ad="i-info" /> Hammadde kartı bir tür seçer; değişkenin adı türün etiketidir (deride Renk, başka deride Kalınlık, fermuarda Boy). Ürün renkleri ayrı sekmededir.</p>
      {sagTik.menu && (
        <Menu konum={sagTik.menu} kapat={sagTik.kapat} ogeler={[
          { tur: "duzenle", ad: "Aç", ikon: "i-edit", kisayol: "Enter", onClick: () => ac(sagTik.menu!.kayit.id) },
          { tur: "sil", ad: degerSilBilgisi(sagTik.menu.kayit, tur).tur === "sil" ? "Sil" : "Pasife al", pasif: u.cevrimdisi ? "İnternet yok: kayıt girilemez" : degerSilBilgisi(sagTik.menu.kayit, tur).tur === "yok" ? "Değer zaten pasif" : undefined, onClick: () => setSilSor(sagTik.menu!.kayit) },
        ]} />
      )}
      {silSor && <DegerSilOnayi d={silSor} tur={tur} onayla={() => sil(silSor)} vazgec={() => setSilSor(null)} />}
    </TanimSayfasi>
  );
}

// ---------------------------------------------------------------- Değer kartı
// Satırdaki Düzenle: kart düzenleme kipinde açılır.
let degerDuzenlemede = false;
const Deger = ({ children }: { children: React.ReactNode }) => <div className="cari-deger">{children || <span className="soluk">—</span>}</div>;
const zorunluMu = (m?: string) => !!m && /gerekli|seç$/i.test(m);

export function DegiskenKarti({ id, yeniTur }: { id: string | null; yeniTur?: string }) {
  const u = useUygulama();
  const yeni = id === null;
  const [turler, setTurler] = useState<DegiskenTuru[]>([]);
  const [tum, setTum] = useState<Degisken[]>([]);
  const [kayit, setKayit] = useState<Degisken | null | undefined>(undefined);
  const bos: Degisken = { id: "", turId: yeniTur ?? "", kod: "", ad: "", kullanim: 0 };
  const [taslak, setTaslak] = useState<Degisken>(bos);
  const [duzenle, setDuzenle] = useState(() => yeni || degerDuzenlemede);
  useEffect(() => { degerDuzenlemede = false; }, []);
  const [denendi, setDenendi] = useState(false);
  const [silSor, setSilSor] = useState(false);
  const [cikisSor, setCikisSor] = useState<null | (() => void)>(null);
  useEffect(() => {
    kaynak.degiskenTurleri().then(setTurler);
    kaynak.degiskenler().then((t) => {
      setTum(t);
      if (yeni) { setKayit(null); return; }
      const d = t.find((x) => x.id === id) ?? null;
      setKayit(d); if (d) setTaslak(d);
    });
    if (!yeni) u.gezintiAyarla("degisken", { son: id! });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const tur = turler.find((t) => t.id === taslak.turId);
  const etkinTurler = useMemo(() => turler.filter((t) => !t.pasif), [turler]);
  const hata = useMemo(() => degiskenDenetle(taslak, tum, tur), [taslak, tum, tur]);
  const hataVar = Object.values(hata).some(Boolean);
  const g = (m?: string) => (duzenle && (denendi || !zorunluMu(m)) ? m : undefined);
  const ilk = yeni ? bos : kayit;
  const degisti = JSON.stringify(taslak) !== JSON.stringify(ilk);
  const liste = u.gezinti.degisken?.liste;
  const gezListe = liste && id && liste.includes(id) ? liste : tum.filter((x) => x.turId === taslak.turId && !x.pasif).map((x) => x.id);
  // Yeni değerin kodu türün sıradaki 3 haneli numarasıdır; tür seçilince/değişince yeniden tahmin edilir.
  useEffect(() => { if (yeni && tum.length) setTaslak((t) => ({ ...t, kod: t.turId ? sonrakiDegiskenKodu(tum, t.turId) ?? "" : "" })); }, [yeni, tum, taslak.turId]);
  const kapat = () => { if (tur) tanimDurumu.tur = tur.id; tanimDurumu.sekme = "degiskenler"; u.git("tanimlar"); };
  const kaydet = () => {
    setDenendi(true);
    if (hataVar) return;
    kaynak.komut("degisken_kaydet", taslak).then((x) => {
      u.bildir(`${taslak.kod} · ${x.mesaj.toLowerCase()}${PROTOTIP_NOTU}`);
      setCikisSor(null);
      if (yeni) { kapat(); return; }
      setKayit(taslak); setDuzenle(false); setDenendi(false);
    });
  };
  const vazgec = () => {
    const cik = () => { setCikisSor(null); setDenendi(false); if (yeni) kapat(); else { setTaslak(kayit!); setDuzenle(false); } };
    if (degisti) setCikisSor(() => cik); else cik();
  };
  if (kayit === undefined || !turler.length) return <div className="sayfa-govde soluk">Yükleniyor…</div>;
  if (!yeni && kayit === null) return <div className="sayfa-govde"><BosDurum baslik="Değer bulunamadı" aciklama="Bu değer yok ya da silinmiş." dugme={<button className="erp-btn" onClick={kapat}>Tanımlara dön</button>} /></div>;
  const etiket = tur?.etiket ?? "Ad";
  const silBilgi = kayit ? degerSilBilgisi(kayit, tur) : null;

  return (
    <div className="sayfa-govde">
      <div className="erp-card">
        <KartBasligi kod={yeni ? `Yeni · ${tur?.ad ?? "değer"}` : kayit!.kod} baslik={yeni ? etiket : `${tur?.ad} · ${duzenle ? taslak.ad || kayit!.ad : kayit!.ad}`}
          durum={!yeni && kayit!.pasif && <Rozet durum="Pasif" />}
          gezgin={yeni ? undefined : { liste: gezListe, mevcut: id!, git: (x) => u.git("degisken-" + x) }}
          duzenle={{ onClick: () => setDuzenle(true) }}
          sil={{ onClick: () => setSilSor(true), pasif: silBilgi?.tur === "yok" ? silBilgi.aciklama : undefined }}
          kapat={kapat} duzenlemede={duzenle} kaydet={{ onClick: kaydet, pasif: denendi && hataVar ? "Önce kırmızı alanları düzelt" : undefined }} vazgec={vazgec} />
        <div className="erp-card__body" style={{ display: "grid", gap: 16 }}>
          <div className="erp-form-satir ust-hizali">
            <Alan etiket="Tür" id="d-tur" genislik="erp-w-urun" hata={g(hata.tur)} yardim={duzenle ? (yeni ? "Kayıttan sonra değişmez" : "Tür değişmez") : undefined}>
              {duzenle && yeni
                ? <AramaliSecici<DegiskenTuru> id="d-tur" kaynak={etkinTurler} etiket="tür" secili={tur ?? null} alanlar={(t) => [t.ad, t.etiket]} alt={(t) => t.etiket} sec={(t) => setTaslak({ ...taslak, turId: t?.id ?? "" })} ipucu="Yaz: tür" />
                : <Deger>{tur?.ad}</Deger>}
            </Alan>
            <Alan etiket="Kod" id="d-kod" genislik="erp-w-renk" hata={g(hata.kod)} yardim={duzenle ? (yeni ? "Kaydedince verilir (3 hane)" : "Kod değişmez") : undefined}>
              {duzenle ? <input id="d-kod" className="erp-input" value={taslak.kod} disabled /> : <Deger><b>{taslak.kod}</b></Deger>}
            </Alan>
            <Alan etiket={etiket} id="d-ad" genislik="erp-w-urun" hata={g(hata.ad)} yardim={duzenle && tur?.gorsel === "yok" ? `Ör. ${tum.find((x) => x.turId === tur.id)?.ad ?? ""}` : undefined}>
              {duzenle ? <input id="d-ad" className="erp-input" value={taslak.ad} onChange={(e) => setTaslak({ ...taslak, ad: e.target.value })} autoFocus /> : <Deger>{taslak.ad}</Deger>}
            </Alan>
          </div>
          {tur?.gorsel === "renk" && (
            <div className="erp-form-satir ust-hizali" style={{ alignItems: "flex-start", gap: 16 }}>
              <RenkKutusu buyuk dilimler={/^#[0-9a-f]{6}$/i.test(taslak.hex ?? "") ? [taslak.hex!] : []} resim={taslak.resim} />
              <Alan etiket="Görsel renk" id="d-hex" genislik="erp-w-fisno" hata={g(hata.hex)} yardim={duzenle ? "#RRGGBB" : undefined}>
                {duzenle ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="color" aria-label="Renk seç" value={/^#[0-9a-f]{6}$/i.test(taslak.hex ?? "") ? taslak.hex : "#000000"} onChange={(e) => setTaslak({ ...taslak, hex: e.target.value })} style={{ width: 36, height: 30, padding: 0, border: "none", background: "none" }} />
                    <input id="d-hex" className="erp-input" style={{ width: 110 }} value={taslak.hex ?? ""} placeholder="#1D1D1D" onChange={(e) => setTaslak({ ...taslak, hex: e.target.value.trim() || undefined })} />
                  </div>
                ) : <Deger>{taslak.hex?.toUpperCase()}</Deger>}
              </Alan>
              <Alan etiket="Resim" id="d-resim" yardim={duzenle ? "İsteğe bağlı: deri dokusu" : undefined}>
                {duzenle ? <input id="d-resim" type="file" accept="image/*" className="kucuk" onChange={(e) => { const f = e.target.files?.[0]; if (f) setTaslak({ ...taslak, resim: URL.createObjectURL(f) }); }} /> : <Deger>{taslak.resim ? "Var" : null}</Deger>}
              </Alan>
            </div>
          )}
          {tur && <KartOnizleme tur={tur} deger={taslak.ad} />}
          {!yeni && <p className="soluk kucuk" style={{ margin: 0 }}>{kayit!.kullanim ? `${kayit!.kullanim} hammadde varyantında kullanılıyor.` : "Henüz hiçbir hammaddede kullanılmıyor."}</p>}
        </div>
      </div>
      {silSor && kayit && <DegerSilOnayi d={kayit} tur={tur} vazgec={() => setSilSor(false)}
        onayla={() => { setSilSor(false); u.bildir(`${kayit.kod} · ${silBilgi?.tur === "sil" ? "değer silindi" : "değer pasife alındı"}${PROTOTIP_NOTU}`, { ikon: silBilgi?.tur === "sil" ? "i-trash" : "i-ban", geriAl: () => u.bildir("Geri alındı" + PROTOTIP_NOTU, { ikon: "i-undo" }) }); }} />}
      {cikisSor && <KaydetSorusu kaydet={kaydet} at={cikisSor} don={() => setCikisSor(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- Tür kartı
export function DegiskenTuruKarti({ id }: { id: string | null }) {
  const u = useUygulama();
  const yeni = id === null;
  const bos: DegiskenTuru = { id: "", ad: "", etiket: "", gorsel: "yok" };
  const [turler, setTurler] = useState<DegiskenTuru[]>([]);
  const [degerler, setDegerler] = useState<Degisken[]>([]);
  const [kayit, setKayit] = useState<DegiskenTuru | null | undefined>(undefined);
  const [taslak, setTaslak] = useState<DegiskenTuru>(bos);
  const [duzenle, setDuzenle] = useState(yeni);
  const [denendi, setDenendi] = useState(false);
  const [sekme, setSekme] = useState("genel");
  const [silSor, setSilSor] = useState(false);
  const [cikisSor, setCikisSor] = useState<null | (() => void)>(null);
  useEffect(() => {
    kaynak.degiskenler().then((d) => setDegerler(d.filter((x) => x.turId === id)));
    kaynak.degiskenTurleri().then((t) => {
      setTurler(t);
      if (yeni) { setKayit(null); return; }
      const k = t.find((x) => x.id === id) ?? null;
      setKayit(k); if (k) setTaslak(k);
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const hata = turDenetle(taslak, turler);
  const hataVar = Object.values(hata).some(Boolean);
  const g = (m?: string) => (duzenle && (denendi || !zorunluMu(m)) ? m : undefined);
  const degisti = JSON.stringify(taslak) !== JSON.stringify(yeni ? bos : kayit);
  const kapat = () => { if (!yeni) tanimDurumu.tur = id!; tanimDurumu.sekme = "degiskenler"; u.git("tanimlar"); };
  const kaydet = () => {
    setDenendi(true);
    if (hataVar) return;
    kaynak.komut("degisken_turu_kaydet", taslak).then((x) => {
      u.bildir(`${taslak.ad} · ${x.mesaj.toLowerCase()}${PROTOTIP_NOTU}`);
      setCikisSor(null);
      if (yeni) { kapat(); return; }
      setKayit(taslak); setDuzenle(false); setDenendi(false);
    });
  };
  const vazgec = () => {
    const cik = () => { setCikisSor(null); setDenendi(false); if (yeni) kapat(); else { setTaslak(kayit!); setDuzenle(false); } };
    if (degisti) setCikisSor(() => cik); else cik();
  };
  if (kayit === undefined) return <div className="sayfa-govde soluk">Yükleniyor…</div>;
  if (!yeni && kayit === null) return <div className="sayfa-govde"><BosDurum baslik="Tür bulunamadı" aciklama="Bu tür yok." dugme={<button className="erp-btn" onClick={kapat}>Tanımlara dön</button>} /></div>;
  // Değeri olan tür silinmez, pasife alınır; boş tür silinir.
  const silTur = degerler.length ? (kayit?.pasif ? "yok" : "pasif") : "sil";
  const hexli = degerler.filter((d) => d.hex).length;

  return (
    <div className="sayfa-govde">
      <div className="erp-card">
        <KartBasligi kod={yeni ? "Yeni tür" : "Değişken türü"} baslik={yeni ? "Hammadde değişkeni" : (duzenle ? taslak.ad || kayit!.ad : kayit!.ad)}
          durum={!yeni && kayit!.pasif && <Rozet durum="Pasif" />}
          gezgin={yeni ? undefined : { liste: turler.map((t) => t.id), mevcut: id!, git: (x) => u.git("degisken-turu-" + x) }}
          duzenle={{ onClick: () => { setDuzenle(true); setSekme("genel"); } }}
          sil={{ onClick: () => setSilSor(true), pasif: silTur === "yok" ? "Tür zaten pasif" : undefined }}
          kapat={kapat} duzenlemede={duzenle} kaydet={{ onClick: kaydet, pasif: denendi && hataVar ? "Önce kırmızı alanları düzelt" : undefined }} vazgec={vazgec} />
        {!yeni && <Sekmeler secili={sekme} sec={(s) => { if (!duzenle) setSekme(s); }} sekmeler={[{ id: "genel", ad: "Genel" }, { id: "degerler", ad: "Değerler", sayi: degerler.length }]} />}
        <div className="erp-card__body" style={{ display: "grid", gap: 16 }}>
          {(sekme === "genel" || yeni) && (<>
            <div className="erp-form-satir ust-hizali">
              <Alan etiket="Tür adı" id="t-ad" genislik="erp-w-urun" hata={g(hata.ad)} yardim={duzenle ? "Ör. Deri rengi, Deri kalınlığı, Fermuar boyu" : undefined}>
                {duzenle ? <input id="t-ad" className="erp-input" value={taslak.ad} onChange={(e) => setTaslak({ ...taslak, ad: e.target.value })} autoFocus={yeni} /> : <Deger>{taslak.ad}</Deger>}
              </Alan>
              <Alan etiket="Etiket" id="t-etiket" genislik="erp-w-urun" hata={g(hata.etiket)} yardim={duzenle ? "Kartta görünen ad: Renk, Kalınlık, Boy" : undefined}>
                {duzenle ? <input id="t-etiket" className="erp-input" value={taslak.etiket} onChange={(e) => setTaslak({ ...taslak, etiket: e.target.value })} /> : <Deger>{taslak.etiket}</Deger>}
              </Alan>
            </div>
            <Alan etiket="Görsel" id="t-gorsel" yardim={duzenle && kayit?.gorsel === "renk" && taslak.gorsel === "yok" && hexli ? `${hexli} değerin renk kodu silinmez, yalnız gösterilmez` : undefined}>
              {duzenle ? (
                <div className="cipler" role="group" aria-label="Görsel">
                  <Cip secili={taslak.gorsel === "renk"} onClick={() => setTaslak({ ...taslak, gorsel: "renk" })}>Renk kutusu (kod + resim)</Cip>
                  <Cip secili={taslak.gorsel === "yok"} onClick={() => setTaslak({ ...taslak, gorsel: "yok" })}>Yok (yalnız kod ve ad)</Cip>
                </div>
              ) : <Deger>{taslak.gorsel === "renk" ? "Renk kutusu" : "Yok"}</Deger>}
            </Alan>
            <KartOnizleme tur={taslak} deger={degerler[0]?.ad} />
          </>)}
          {sekme === "degerler" && !yeni && (degerler.length ? (
            <div className="erp-table-kap">
              <table className="erp-table">
                <thead><tr><th>Kod</th><th>{kayit!.etiket}</th><th className="erp-sayi">Kullanım</th></tr></thead>
                <tbody>{degerler.map((d) => (
                  <tr key={d.id} tabIndex={0} onDoubleClick={() => u.git("degisken-" + d.id)} onKeyDown={(e) => { if (e.key === "Enter") u.git("degisken-" + d.id); }}>
                    <td>{kayit!.gorsel === "renk" && <><RenkKutusu dilimler={d.hex ? [d.hex] : []} /> </>}<b>{d.kod}</b></td><td>{d.ad}{d.pasif && <> <Rozet durum="Pasif" /></>}</td><td className="erp-sayi">{d.kullanim ? `${d.kullanim} varyant` : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <BosDurum baslik="Değer yok" aciklama="Tanımlar › Hammadde değişkenleri'nde bu türü seç, Yeni ile değer ekle." />)}
        </div>
      </div>
      {silSor && <SilOnayi soru={`${kayit?.ad} ${silTur === "sil" ? "silinsin mi" : "pasife alınsın mı"}?`} dugme={silTur === "sil" ? "Sil" : "Pasife al"}
        aciklama={silTur === "sil" ? "Bu türün değeri yok; kalıcı olarak silinir." : `${degerler.length} değeri var; tür silinmez, pasife alınır. Yeni hammaddede seçilemez, değerleri eski kayıtlarda kalır.`}
        vazgec={() => setSilSor(false)} onayla={() => { setSilSor(false); u.bildir(`${kayit?.ad} · ${silTur === "sil" ? "tür silindi" : "tür pasife alındı"}${PROTOTIP_NOTU}`, { ikon: "i-ban" }); }} />}
      {cikisSor && <KaydetSorusu kaydet={kaydet} at={cikisSor} don={() => setCikisSor(null)} />}
    </div>
  );
}
