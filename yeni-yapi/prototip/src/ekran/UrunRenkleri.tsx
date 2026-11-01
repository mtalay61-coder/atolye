// ÜRÜN RENKLERİ — Tanımlar sekmesi (liste) ve renk kartı (okuma · düzenleme · yeni aynı bileşen).
// Yapı (karar k-08): 1 renkli temel renkler kendi görsel kodunu (hex) ve resmini taşır; 2, 3… renkli renk,
// renk sayısı kadar SIRALI hücreden kurulur ve her hücre 1 renkli bir renktir. Kod ve ad hücrelerden önerilir.
// Bütün kurallar ../veri/renk.ts'te; bu dosya yalnız gösterir ve kullanıcıya erken söyler.
import { useEffect, useMemo, useState } from "react";
import { Alan, AramaliSecici, BosDurum, Cip, Ikon, KartBasligi, KaydetSorusu, Menu, RenkKutusu, Rozet, SatirEylemleri, Sekmeler, SilOnayi, useSagTik } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";
import { kaynak, PROTOTIP_NOTU } from "../veri/kaynak";
import { adOnerisi, dilimler, EN_COK_RENK, hataVarMi, kilit, kombinasyonlari, renkSayisi, sonrakiUrunRenkKodu, temelMi, urunRengiDenetle, type UrunRenkTaslak } from "../veri/renk";
import type { UrunRenk } from "../veri/tipler";
import { TanimSayfasi, tanimDurumu } from "./TanimSayfasi";

const SUZGECLER: { id: string; ad: string; uyar: (r: UrunRenk) => boolean }[] = [
  { id: "tumu", ad: "Tümü", uyar: (r) => !r.pasif },
  { id: "tek", ad: "1 renkli", uyar: (r) => !r.pasif && temelMi(r) },
  { id: "cok", ad: "Çok renkli", uyar: (r) => !r.pasif && !temelMi(r) },
  { id: "bos", ad: "Kullanılmayan", uyar: (r) => !r.pasif && r.kullanim === 0 },
  { id: "pasif", ad: "Pasif", uyar: (r) => !!r.pasif },
];
const sayiAdi = (n: number) => `${n} renkli`;

// Silmek mi pasife almak mı: kullanılan ya da bir kombinasyonda hücre olan renk silinmez (eski kayıtlar kimlikle bağlı).
export function silmeBilgisi(r: UrunRenk, tum: UrunRenk[]): { tur: "sil" | "pasif" | "yok"; aciklama: string } {
  const komb = kombinasyonlari(r.id, tum);
  if (r.kullanim > 0 || komb.length) {
    if (r.pasif) return { tur: "yok", aciklama: "Renk zaten pasif" };
    const neden = r.kullanim > 0 ? `${r.kullanim} varyantta kullanılıyor` : `${komb.map((x) => x.ad).join(", ")} kombinasyonunda hücre`;
    return { tur: "pasif", aciklama: `${neden}; silinmez, pasife alınır. Seçim listelerinden çıkar, eski kayıtlarda ve kombinasyonlarda görünmeye devam eder.` };
  }
  return { tur: "sil", aciklama: "Hiçbir üründe ve kombinasyonda kullanılmıyor; kalıcı olarak silinir." };
}

function Hucreler({ r, tum }: { r: UrunRenk; tum: UrunRenk[] }) {
  if (temelMi(r)) return <span className="soluk">temel renk</span>;
  return <>{r.bilesenler.map((id, i) => { const b = tum.find((x) => x.id === id); return <span key={i}>{i ? " · " : ""}<span className="soluk">{i + 1}.</span> {b?.ad ?? "?"}</span>; })}</>;
}

// Kopyala: yeni renk kaynağın hücreleri (ya da görsel kodu) ile açılır; kod ve ad yeniden önerilir.
let kopyaKaynagi: UrunRenk | null = null;
// Satırdaki Düzenle: kart düzenleme kipinde açılır (F2'ye basılmış gibi).
let kartDuzenlemede = false;

export function UrunRenkListesi({ sekme, sec: sekmeSec }: { sekme: string; sec: (s: string) => void }) {
  const u = useUygulama();
  const [tum, setTum] = useState<UrunRenk[] | null>(null);
  const [suzgec, setSuzgec] = useState("tumu");
  // Sütun süzgeçleri: kod/ad, renk sayısı, hücre rengi. Her kelime kaydın içinde herhangi bir yerde geçmeli.
  const [ara, setAra] = useState("");
  const [sayiSuz, setSayiSuz] = useState("");
  const [hucreSuz, setHucreSuz] = useState("");
  const [secili, setSecili] = useState<string | null>(() => u.gezinti.urunRenk?.son ?? null);
  const [silSor, setSilSor] = useState<UrunRenk | null>(null);
  const sagTik = useSagTik<UrunRenk>();
  useEffect(() => { kaynak.urunRenkleri().then(setTum); }, []);

  const satirlar = useMemo(() => {
    const s = SUZGECLER.find((x) => x.id === suzgec)!;
    const A = window.Atolye;
    const hucreAdlari = (r: UrunRenk) => r.bilesenler.map((id) => { const b = tum!.find((x) => x.id === id); return b ? b.kod + " " + b.ad : ""; });
    return (tum ?? []).filter((r) => s.uyar(r)
      && (!ara || A.eslesme(ara, [r.kod, r.ad]))
      && (!sayiSuz || String(renkSayisi(r)) === sayiSuz)
      && (!hucreSuz || A.eslesme(hucreSuz, hucreAdlari(r))))
      .sort((a, b) => a.kod.localeCompare(b.kod, "tr", { numeric: true }));
  }, [tum, suzgec, ara, sayiSuz, hucreSuz]);
  useEffect(() => { if (tum) u.gezintiAyarla("urunRenk", { liste: satirlar.map((r) => r.id) }); }, [satirlar, tum]); // eslint-disable-line react-hooks/exhaustive-deps

  const sec = satirlar.find((r) => r.id === secili) ?? null;
  const ac = (id: string) => u.git("urun-renk-" + id);
  const duzenleAc = (id: string) => { kartDuzenlemede = true; ac(id); };
  const silBilgi = sec && tum ? silmeBilgisi(sec, tum) : null;
  const kopyala = (r: UrunRenk) => { kopyaKaynagi = r; u.git("urun-renk-yeni"); };
  const sil = (r: UrunRenk) => {
    const b = silmeBilgisi(r, tum!);
    kaynak.komut(b.tur === "sil" ? "urun_renk_sil" : "urun_renk_pasife_al", r).then((x) => {
      setSilSor(null);
      u.bildir(`${r.kod} · ${x.mesaj.toLowerCase()}${PROTOTIP_NOTU}`, { ikon: b.tur === "sil" ? "i-trash" : "i-ban", geriAl: () => u.bildir("Geri alındı" + PROTOTIP_NOTU, { ikon: "i-undo" }) });
    });
  };

  return (
    <TanimSayfasi sekme={sekme} sec={sekmeSec} eylemler={{
      yeni: { onClick: () => { kopyaKaynagi = null; u.git("urun-renk-yeni"); } },
      kopyala: { onClick: () => sec && kopyala(sec), pasif: sec ? undefined : "Önce bir renk seç" },
      sil: { onClick: () => sec && setSilSor(sec), pasif: !sec ? "Önce bir renk seç" : silBilgi?.tur === "yok" ? silBilgi.aciklama : undefined },
      ara: { onClick: () => document.getElementById("suz-renk")?.focus() },
      filtre: { onClick: () => { setAra(""); setSayiSuz(""); setHucreSuz(""); setSuzgec("tumu"); } },
      yenile: { onClick: () => { setTum(null); kaynak.urunRenkleri().then(setTum); } },
      yazdir: { pasif: "Prototipte yazdırma yok" },
      excel: { pasif: "Prototipte Excel yok; ekrandaki tablonun aynısı olacak" },
    }} ust={
      <div className="cipler">
        {SUZGECLER.map((s) => <Cip key={s.id} secili={suzgec === s.id} onClick={() => setSuzgec(s.id)}>{s.ad} <b>{(tum ?? []).filter(s.uyar).length}</b></Cip>)}
      </div>
    }>
      {tum === null ? <p className="soluk">Yükleniyor…</p> : (
        <div className="erp-table-kap erp-table-kap--kaydir">
          <table className="erp-table">
            <thead>
              <tr><th>Kod</th><th>Ad</th><th>Renk sayısı</th><th>Hücreler</th><th className="erp-sayi">Kullanım</th><th className="erp-satir-eylem"><span className="gizli">Eylem</span></th></tr>
              <tr className="erp-suzgec">
                <th colSpan={2}><input id="suz-renk" placeholder="Kod ya da ad" aria-label="Kod ya da adda süz" value={ara} onChange={(e) => setAra(e.target.value)} /></th>
                <th><select aria-label="Renk sayısında süz" value={sayiSuz} onChange={(e) => setSayiSuz(e.target.value)} className="suzgec-secim"><option value="">Hepsi</option>{Array.from({ length: EN_COK_RENK }, (_, i) => <option key={i} value={i + 1}>{i + 1} renkli</option>)}</select></th>
                <th><input placeholder="Hücredeki renk" aria-label="Hücre renginde süz" value={hucreSuz} onChange={(e) => setHucreSuz(e.target.value)} /></th><th /><th className="erp-satir-eylem" />
              </tr>
            </thead>
            <tbody>
              {satirlar.map((r) => {
                const komb = temelMi(r) ? kombinasyonlari(r.id, tum).length : 0;
                return (
                  <tr key={r.id} aria-selected={secili === r.id} tabIndex={0}
                    onClick={() => setSecili(r.id)} onDoubleClick={() => ac(r.id)}
                    onPointerUp={(e) => { if (e.pointerType === "touch") ac(r.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter") ac(r.id); }}
                    onContextMenu={(e) => { setSecili(r.id); sagTik.ac(e, r); }}>
                    <td style={{ whiteSpace: "nowrap" }}><RenkKutusu dilimler={dilimler(r, tum)} resim={r.resim} /> <b>{r.kod}</b></td>
                    <td>{r.ad}{r.pasif && <> <Rozet durum="Pasif" /></>}</td>
                    <td>{sayiAdi(renkSayisi(r))}</td>
                    <td><Hucreler r={r} tum={tum} /></td>
                    <td className="erp-sayi">{r.kullanim ? `${r.kullanim} varyant` : <span className="soluk">—</span>}{komb ? <span className="soluk"> · {komb} kombinasyon</span> : null}</td>
                    <SatirEylemleri duzenle={() => duzenleAc(r.id)} sil={() => { setSecili(r.id); setSilSor(r); }}
                      silNeden={u.cevrimdisi ? "İnternet yok: kayıt girilemez" : silmeBilgisi(r, tum).tur === "yok" ? "Renk zaten pasif" : undefined}
                      duzenleNeden={u.cevrimdisi ? "İnternet yok: kayıt girilemez" : undefined} silAd={silmeBilgisi(r, tum).tur === "sil" ? "Sil" : "Pasife al"} />
                  </tr>
                );
              })}
            </tbody>
            {satirlar.length > 0 && <tfoot><tr><td colSpan={6}>{satirlar.length} renk · {satirlar.filter(temelMi).length} tek, {satirlar.filter((r) => !temelMi(r)).length} çok renkli</td></tr></tfoot>}
          </table>
          {satirlar.length === 0 && (
            <BosDurum baslik="Bu süzgeçle renk yok" aciklama="Süzgeci temizle ya da Yeni ile renk aç. Çok renkli renk için önce tek renkleri tanımla."
              dugme={<button className="erp-btn" onClick={() => { setAra(""); setSayiSuz(""); setHucreSuz(""); setSuzgec("tumu"); }}><Ikon ad="i-filter" />Süzgeci temizle</button>} />
          )}
        </div>
      )}
      <p className="soluk kucuk" style={{ margin: 0 }}><Ikon ad="i-info" /> Çok renkli renk tek renklerden kurulur: önce Siyah, Beyaz gibi 1 renkli renkleri aç, sonra Yeni › 2 renkli ile hücrelere seç. Kullanılan renk silinmez, pasife alınır.</p>
      {sagTik.menu && (
        <Menu konum={sagTik.menu} kapat={sagTik.kapat} ogeler={[
          { tur: "duzenle", ad: "Aç", ikon: "i-edit", kisayol: "Enter", onClick: () => ac(sagTik.menu!.kayit.id) },
          { tur: "kopyala", pasif: u.cevrimdisi ? "İnternet yok: kayıt girilemez" : undefined, onClick: () => kopyala(sagTik.menu!.kayit) },
          { tur: "sil", ad: silmeBilgisi(sagTik.menu.kayit, tum!).tur === "sil" ? "Sil" : "Pasife al", pasif: u.cevrimdisi ? "İnternet yok: kayıt girilemez" : silmeBilgisi(sagTik.menu.kayit, tum!).tur === "yok" ? "Renk zaten pasif" : undefined, onClick: () => setSilSor(sagTik.menu!.kayit) },
        ]} />
      )}
      {silSor && <RenkSilOnayi r={silSor} tum={tum!} onayla={() => sil(silSor)} vazgec={() => setSilSor(null)} />}
    </TanimSayfasi>
  );
}

function RenkSilOnayi({ r, tum, onayla, vazgec }: { r: UrunRenk; tum: UrunRenk[]; onayla: () => void; vazgec: () => void }) {
  const b = silmeBilgisi(r, tum);
  return <SilOnayi soru={b.tur === "sil" ? `${r.kod} · ${r.ad} silinsin mi?` : `${r.kod} · ${r.ad} pasife alınsın mı?`} dugme={b.tur === "sil" ? "Sil" : "Pasife al"} aciklama={b.aciklama} onayla={onayla} vazgec={vazgec} />;
}

// ---------------------------------------------------------------- Kart
const BOS_TASLAK: UrunRenkTaslak = { id: "", kod: "", ad: "", hex: "", sayi: 1, hucreler: [] };
const taslakYap = (r: UrunRenk): UrunRenkTaslak => ({ id: r.id, kod: r.kod, ad: r.ad, hex: r.hex ?? "", resim: r.resim, sayi: renkSayisi(r), hucreler: [...r.bilesenler] });
const tasliktan = (t: UrunRenkTaslak, eski?: UrunRenk): UrunRenk => ({ id: t.id, kod: t.kod.trim(), ad: t.ad.trim(), hex: t.sayi === 1 ? t.hex || undefined : undefined, resim: t.resim, bilesenler: t.sayi === 1 ? [] : (t.hucreler as string[]), kullanim: eski?.kullanim ?? 0, pasif: eski?.pasif });
// "gerekli / seçilmedi" hataları ilk Kaydet denemesinden sonra; tekillik ve çakışma hemen görünür.
const zorunluMu = (m?: string) => !!m && /gerekli|seçilmedi/.test(m);
let sonSekme = "genel";

export function UrunRenkKarti({ id }: { id: string | null }) {
  const u = useUygulama();
  const yeni = id === null;
  const [tum, setTum] = useState<UrunRenk[]>([]);
  const [renk, setRenk] = useState<UrunRenk | null | undefined>(yeni ? null : undefined);
  const [taslak, setTaslak] = useState<UrunRenkTaslak>(BOS_TASLAK);
  const [ilk, setIlk] = useState<UrunRenkTaslak>(BOS_TASLAK);
  const [duzenle, setDuzenle] = useState(() => yeni || kartDuzenlemede);
  useEffect(() => { kartDuzenlemede = false; }, []);
  const [denendi, setDenendi] = useState(false);
  const [adElle, setAdElle] = useState(false);
  const [sekme, setSekmeIc] = useState(yeni ? "genel" : sonSekme);
  const setSekme = (s: string) => { sonSekme = s; setSekmeIc(s); };
  const [silSor, setSilSor] = useState(false);
  const [cikisSor, setCikisSor] = useState<null | (() => void)>(null);

  useEffect(() => {
    kaynak.urunRenkleri().then((t) => {
      setTum(t);
      if (yeni) {
        const k = kopyaKaynagi; kopyaKaynagi = null;
        const ts = k ? { ...BOS_TASLAK, hex: k.hex ?? "", sayi: renkSayisi(k), hucreler: [...k.bilesenler] } : BOS_TASLAK;
        const o = adOnerisi(ts.hucreler, t);
        const ts2 = { ...ts, kod: sonrakiUrunRenkKodu(t) ?? "", ad: o ?? "" };
        setTaslak(ts2); setIlk(ts2);
        return;
      }
      const r = t.find((x) => x.id === id) ?? null;
      setRenk(r);
      if (r) {
        const ts = taslakYap(r);
        setTaslak(ts); setIlk(ts);
        setAdElle(adOnerisi(ts.hucreler, t) !== r.ad);
      }
    });
    if (!yeni) u.gezintiAyarla("urunRenk", { son: id! });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const liste = u.gezinti.urunRenk?.liste;
  const gezListe = liste && id && liste.includes(id) ? liste : tum.filter((x) => !x.pasif).map((x) => x.id);
  const temeller = useMemo(() => tum.filter((x) => temelMi(x) && !x.pasif && x.id !== taslak.id), [tum, taslak.id]);
  const hata = useMemo(() => urunRengiDenetle(taslak, tum), [taslak, tum]);
  const g = (m?: string) => (duzenle && (denendi || !zorunluMu(m)) ? m : undefined);
  const kl = kilit(renk ?? null, tum);
  const degisti = JSON.stringify(taslak) !== JSON.stringify(ilk);
  const o = adOnerisi(taslak.hucreler, tum);

  // Hücre değişince öneri, kullanıcının elle yazmadığı alanı izler.
  const hucreleriKoy = (h: (string | null)[], sayi: number) => setTaslak((t) => {
    const yo = sayi > 1 ? adOnerisi(h, tum) : null;
    return { ...t, sayi, hucreler: h, ad: yo && !adElle ? yo : t.ad };
  });
  const sayiSec = (n: number) => {
    if (kl.hucre || n === taslak.sayi) return;
    const eski = taslak;
    const h = n === 1 ? [] : Array.from({ length: n }, (_, i) => (eski.sayi > 1 ? eski.hucreler[i] ?? null : null));
    hucreleriKoy(h, n);
    const dusen = eski.sayi > 1 ? eski.hucreler.slice(n === 1 ? 0 : n).filter(Boolean) : [];
    if (dusen.length) u.bildir(`${dusen.map((x) => tum.find((y) => y.id === x)?.ad).join(", ")} hücreden çıkarıldı`, { ikon: "i-info", geriAl: () => setTaslak(eski) });
  };
  const kaydet = () => {
    setDenendi(true);
    if (hataVarMi(hata)) { setSekme("genel"); return; }
    kaynak.komut("urun_renk_kaydet", taslak).then((x) => {
      u.bildir(`${taslak.kod.trim()} · ${x.mesaj.toLowerCase()}${PROTOTIP_NOTU}`);
      setCikisSor(null);
      if (yeni) { u.git("tanimlar"); return; }
      setRenk(tasliktan(taslak, renk ?? undefined)); setIlk(taslak); setDuzenle(false); setDenendi(false);
    });
  };
  const vazgec = () => {
    const cik = () => { setCikisSor(null); setDenendi(false); if (yeni) u.git("tanimlar"); else { setTaslak(ilk); setDuzenle(false); } };
    if (degisti) setCikisSor(() => cik); else cik();
  };
  const kapat = () => { tanimDurumu.sekme = "urun-renkleri"; u.git("tanimlar"); };

  if (renk === undefined && !yeni) return <div className="sayfa-govde soluk">Yükleniyor…</div>;
  if (renk === null && !yeni) return <div className="sayfa-govde"><BosDurum baslik="Renk bulunamadı" aciklama="Bu renk yok ya da silinmiş." dugme={<button className="erp-btn" onClick={kapat}>Tanımlara dön</button>} /></div>;

  const gorunen = tasliktan(taslak, renk ?? undefined);
  const komb = renk && temelMi(renk) ? kombinasyonlari(renk.id, tum) : [];
  const silBilgi = renk ? silmeBilgisi(renk, tum) : null;
  const Deger = ({ children }: { children: React.ReactNode }) => <div className="cari-deger">{children || <span className="soluk">—</span>}</div>;

  return (
    <div className="sayfa-govde">
      <div className="erp-card">
        <KartBasligi kod={yeni ? "Yeni renk" : renk!.kod} baslik={yeni ? sayiAdi(taslak.sayi) + " ürün rengi" : (duzenle ? taslak.ad || renk!.ad : renk!.ad) + (duzenle ? " · düzenleniyor" : "")}
          durum={!yeni && renk!.pasif && <Rozet durum="Pasif" />}
          gezgin={yeni ? undefined : { liste: gezListe, mevcut: id!, git: (x) => u.git("urun-renk-" + x) }}
          duzenle={{ onClick: () => { setDuzenle(true); setSekme("genel"); } }}
          sil={{ onClick: () => setSilSor(true), pasif: silBilgi?.tur === "yok" ? silBilgi.aciklama : undefined }}
          kapat={kapat} duzenlemede={duzenle} kaydet={{ onClick: kaydet, pasif: denendi && hataVarMi(hata) ? "Önce kırmızı alanları düzelt" : undefined }} vazgec={vazgec} />
        {!yeni && (
          <Sekmeler secili={sekme} sec={(s) => { if (!duzenle) setSekme(s); }} sekmeler={[
            { id: "genel", ad: "Genel" }, { id: "kullanim", ad: "Kullanım", sayi: renk!.kullanim + komb.length },
          ]} />
        )}
        <div className="erp-card__body">
          {(sekme === "genel" || yeni) && (
            <div style={{ display: "grid", gap: 16 }}>
              <div className="erp-form-satir ust-hizali" style={{ alignItems: "flex-start", gap: 16 }}>
                <RenkKutusu buyuk dilimler={dilimler(gorunen, tum)} resim={taslak.resim} baslik="Önizleme" />
                <div style={{ display: "grid", gap: 6 }}>
                  <span className="erp-renk-hucre__baslik">Renk sayısı</span>
                  {duzenle ? (
                    <div className="cipler" role="group" aria-label="Renk sayısı" title={kl.hucre}>
                      {Array.from({ length: EN_COK_RENK }, (_, i) => i + 1).map((n) => (
                        <button key={n} type="button" className="erp-cip" aria-pressed={taslak.sayi === n} disabled={!!kl.hucre && taslak.sayi !== n} onClick={() => sayiSec(n)}>{n <= 3 ? sayiAdi(n) : n}</button>
                      ))}
                    </div>
                  ) : <Deger>{sayiAdi(taslak.sayi)}</Deger>}
                  {duzenle && kl.hucre && <span className="erp-field__yardim"><Ikon ad="i-info" /> {kl.hucre}</span>}
                </div>
              </div>

              {taslak.sayi > 1 && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="erp-renk-hucreler">
                    {taslak.hucreler.map((hid, i) => {
                      const b = tum.find((x) => x.id === hid) ?? null;
                      const hh = g(hata.hucreler?.[i]);
                      return (
                        <div key={i} className={"erp-renk-hucre" + (hh ? " erp-renk-hucre--hata" : "") + (!b ? " erp-renk-hucre--bos" : "")}>
                          <label className="erp-renk-hucre__baslik" htmlFor={"hucre-" + (i + 1)}>{i + 1}. renk{i === 0 ? " · ana renk" : ""}</label>
                          {duzenle && !kl.hucre ? (
                            <AramaliSecici<UrunRenk> id={"hucre-" + (i + 1)} kaynak={temeller} etiket="renk" secili={b}
                              alanlar={(x) => [x.ad, x.kod]} kod={(x) => x.kod} ek={(x) => window.Atolye.renkKutusu(dilimler(x, tum))}
                              sec={(x) => { const h = [...taslak.hucreler]; h[i] = x?.id ?? null; hucreleriKoy(h, taslak.sayi); }} ipucu="Yaz: kod ya da ad" />
                          ) : (
                            <div className="erp-renk-hucre__deger">{b ? <><RenkKutusu dilimler={dilimler(b, tum)} resim={b.resim} /><a href={"#urun-renk-" + b.id}><b>{b.kod}</b></a> {b.ad}{b.pasif && <Rozet durum="Pasif" />}</> : <span className="soluk">—</span>}</div>
                          )}
                          {hh && <span className="erp-field__hata">{hh}</span>}
                        </div>
                      );
                    })}
                  </div>
                  {duzenle && !kl.hucre && <span className="soluk kucuk">Hücrelere yalnız 1 renkli, etkin renkler gelir. Sıra anlamlıdır: Siyah-Beyaz ile Beyaz-Siyah ayrı renklerdir; reçetede "deri = 1. renk" bu sıraya bakar.</span>}
                  {hata.kombinasyon && duzenle && (
                    <div className="erp-serit erp-serit--uyari" style={{ borderRadius: "var(--erp-r-md)" }}><Ikon ad="i-alert" />
                      Bu kombinasyon zaten var: <a href={"#urun-renk-" + hata.kombinasyon.id}>{hata.kombinasyon.kod} · {hata.kombinasyon.ad}</a>{hata.kombinasyon.pasif ? " (pasif: onu yeniden etkinleştir)" : ""}. Aynı sırayla ikinci kez tanımlanamaz.
                    </div>
                  )}
                </div>
              )}

              <div className="erp-form-satir ust-hizali">
                <Alan etiket="Kod" id="r-kod" genislik="erp-w-renk" hata={g(hata.kod)} yardim={duzenle ? (yeni ? "Kaydedince verilir (4 hane)" : "Kod değişmez") : undefined}>
                  {duzenle ? <input id="r-kod" className="erp-input" value={taslak.kod} disabled /> : <Deger><b>{taslak.kod}</b></Deger>}
                </Alan>
                <Alan etiket="Ad" id="r-ad" hata={g(hata.ad)} yardim={duzenle && taslak.sayi > 1 && !adElle ? "Hücrelerden önerildi; istersen değiştir (ör. Denizci)" : undefined}>
                  {duzenle ? <input id="r-ad" className="erp-input cari-unvan" style={{ width: "min(320px, 80vw)" }} value={taslak.ad} onChange={(e) => { setAdElle(true); setTaslak({ ...taslak, ad: e.target.value }); }} autoFocus={taslak.sayi === 1} /> : <Deger>{taslak.ad}</Deger>}
                </Alan>
              </div>
              {duzenle && o && adElle && taslak.ad !== o && (
                <p className="kucuk" style={{ margin: 0 }}>
                  Önerilen ad: <b>{o}</b> <button type="button" className="erp-btn" style={{ marginLeft: 6 }} onClick={() => { setAdElle(false); setTaslak({ ...taslak, ad: o }); }}>Öneriyi kullan</button>
                </p>
              )}

              <div className="erp-form-satir ust-hizali">
                {taslak.sayi === 1 && (
                  <Alan etiket="Görsel renk" id="r-hex" genislik="erp-w-fisno" hata={g(hata.hex)} yardim={duzenle ? "Ekrandaki kutunun rengi; #RRGGBB" : undefined}>
                    {duzenle ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="color" aria-label="Renk seç" value={/^#[0-9a-f]{6}$/i.test(taslak.hex) ? taslak.hex : "#000000"} onChange={(e) => setTaslak({ ...taslak, hex: e.target.value })} style={{ width: 36, height: 30, padding: 0, border: "none", background: "none" }} />
                        <input id="r-hex" className="erp-input" style={{ width: 110 }} value={taslak.hex} placeholder="#1D1D1D" onChange={(e) => setTaslak({ ...taslak, hex: e.target.value.trim() })} />
                      </div>
                    ) : <Deger>{taslak.hex ? <><RenkKutusu dilimler={[taslak.hex]} /> <span style={{ marginLeft: 6 }}>{taslak.hex.toUpperCase()}</span></> : null}</Deger>}
                  </Alan>
                )}
                <Alan etiket="Resim" id="r-resim" yardim={duzenle ? (taslak.sayi > 1 ? "İsteğe bağlı; yoksa kutu hücrelerden dilimlenir" : "İsteğe bağlı: deri dokusu, süet…") : undefined}>
                  {duzenle ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input id="r-resim" type="file" accept="image/*" className="kucuk" onChange={(e) => { const f = e.target.files?.[0]; if (f) setTaslak({ ...taslak, resim: URL.createObjectURL(f) }); }} />
                      {taslak.resim && <button type="button" className="erp-btn" onClick={() => setTaslak({ ...taslak, resim: undefined })}>Resmi kaldır</button>}
                    </div>
                  ) : <Deger>{taslak.resim ? "Var" : null}</Deger>}
                </Alan>
              </div>
              {duzenle && taslak.resim?.startsWith("blob:") && <p className="soluk kucuk" style={{ margin: 0 }}>Prototipte resim yalnız bu ekranda görünür, kaydedilmez.</p>}
            </div>
          )}

          {sekme === "kullanim" && !yeni && (
            <div style={{ display: "grid", gap: 12 }}>
              <p style={{ margin: 0 }}>{renk!.kullanim ? <><b>{renk!.kullanim} varyantta</b> kullanılıyor. Kod ve hücreler bu yüzden kilitli; ad değişebilir.</> : "Henüz hiçbir üründe kullanılmıyor."} <span className="soluk kucuk">Ürün listesi Ürünler ve stok ekranıyla gelecek.</span></p>
              {temelMi(renk!) && (komb.length ? (
                <div className="erp-table-kap">
                  <table className="erp-table">
                    <thead><tr><th>Kombinasyon</th><th>Ad</th><th>Bu renk</th></tr></thead>
                    <tbody>{komb.map((k) => (
                      <tr key={k.id} tabIndex={0} onDoubleClick={() => u.git("urun-renk-" + k.id)} onKeyDown={(e) => { if (e.key === "Enter") u.git("urun-renk-" + k.id); }}>
                        <td><RenkKutusu dilimler={dilimler(k, tum)} /> <b>{k.kod}</b></td><td>{k.ad}{k.pasif && <> <Rozet durum="Pasif" /></>}</td><td>{k.bilesenler.indexOf(renk!.id) + 1}. renk</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <BosDurum baslik="Kombinasyonda yok" aciklama="Bu renk henüz hiçbir çok renkli rengin hücresi değil." />)}
            </div>
          )}
        </div>
      </div>
      {!duzenle && <p className="soluk kucuk"><Ikon ad="i-info" /> ‹ › ya da PageUp/PageDown: önceki/sonraki renk. F2: düzenle. Esc: Tanımlar'a döner.</p>}
      {silSor && renk && <RenkSilOnayi r={renk} tum={tum} vazgec={() => setSilSor(false)}
        onayla={() => { setSilSor(false); u.bildir(`${renk.kod} · ${silBilgi?.tur === "sil" ? "renk silindi" : "renk pasife alındı"}${PROTOTIP_NOTU}`, { ikon: silBilgi?.tur === "sil" ? "i-trash" : "i-ban", geriAl: () => u.bildir("Geri alındı" + PROTOTIP_NOTU, { ikon: "i-undo" }) }); }} />}
      {cikisSor && <KaydetSorusu kaydet={kaydet} at={cikisSor} don={() => setCikisSor(null)} />}
    </div>
  );
}
