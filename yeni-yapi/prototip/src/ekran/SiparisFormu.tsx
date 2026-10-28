// BELGE KALIBI — Yeni sipariş. Üst bölge (müşteri, tarihler) · kalem ekleme (ürün, renk, beden matrisi) ·
// kalemler · not ve toplamlar · Kaydet. Hepsi bellekte; Kaydet kaydetmez, bildirim gösterir.
import { useEffect, useMemo, useState } from "react";
import { Alan, AramaliSecici, BosDurum, Ikon, KartBasligi } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";
import { kaynak, PROTOTIP_NOTU } from "../veri/kaynak";
import { BEDENLER } from "../veri/ornek";
import { bakiyeSinifi, bakiyeYaz, kalemCift, kalemTutar, sayi, tl } from "../veri/hesap";
import type { Cari, Kalem, Urun } from "../veri/tipler";

const bosBedenler = () => Object.fromEntries(BEDENLER.map((b) => [b, 0]));
const sayiOku = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
const tlHtml = (n: number) => `<span class="${bakiyeSinifi(n)}">${bakiyeYaz(n)}</span>`;

export function SiparisFormu() {
  const u = useUygulama();
  const [cariler, setCariler] = useState<Cari[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [cari, setCari] = useState<Cari | null>(null);
  const [urun, setUrun] = useState<Urun | null>(null);
  const [yeniBedenler, setYeniBedenler] = useState<Record<string, number>>(bosBedenler);
  const [fiyat, setFiyat] = useState("");
  const [kalemler, setKalemler] = useState<Kalem[]>([]);
  const [not, setNot] = useState("");
  const [denendi, setDenendi] = useState(false);
  useEffect(() => { kaynak.cariler().then(setCariler); kaynak.urunler().then(setUrunler); }, []);
  const musteriler = useMemo(() => cariler.filter((c) => c.roller.includes("Müşteri")), [cariler]);
  const mamuller = useMemo(() => urunler.filter((x) => x.tip === "Mamul"), [urunler]);

  const kalemHatasi = !urun ? "Önce ürün seç" : !Object.values(yeniBedenler).some((x) => x > 0) ? "En az bir bedene adet yaz" : !sayiOku(fiyat) ? "Fiyat gerekli" : undefined;
  const ekle = () => {
    if (kalemHatasi || !urun) return;
    setKalemler([...kalemler, { id: "y" + Date.now(), urunId: urun.id, urunAd: urun.ad, renk: urun.renk ?? "", bedenler: yeniBedenler, sevk: bosBedenler(), fiyat: sayiOku(fiyat) }]);
    setYeniBedenler(bosBedenler());
    setUrun(null);
    setFiyat("");
  };
  const araToplam = kalemler.reduce((a, k) => a + kalemTutar(k), 0);
  const kaydetHatasi = !cari ? "Önce müşteri seç" : !kalemler.length ? "En az bir kalem ekle" : undefined;
  const kaydet = () => {
    setDenendi(true);
    if (kaydetHatasi) return;
    kaynak.komut("siparis_kaydet", { cari, kalemler, not }).then((r) => {
      u.bildir("SAT-2026-000127 · " + r.mesaj.toLowerCase() + PROTOTIP_NOTU, { geriAl: () => u.bildir("Geri alındı" + PROTOTIP_NOTU, { ikon: "i-undo" }) });
      u.git("siparisler");
    });
  };

  return (
    <div className="sayfa-govde">
      <div className="erp-card">
        <KartBasligi pencere kod="SAT · yeni" baslik="Satış siparişi" duzenlemede
          kaydet={{ onClick: kaydet, pasif: kaydetHatasi }} vazgec={() => u.git("siparisler")} />
        <div className="erp-card__body" style={{ display: "grid", gap: 16 }}>
          <div className="erp-form-satir" style={{ justifyContent: "space-between" }}>
            <div className="erp-form-satir">
              <Alan etiket="Müşteri" id="musteri" hata={denendi && !cari ? "Müşteri gerekli" : undefined}>
                <AramaliSecici<Cari> style={{ width: 320 }} id="musteri" kaynak={musteriler} etiket="cari" secili={cari}
                  alanlar={(c) => [c.ad, c.il]} kod={(c) => c.kod} alt={(c) => c.il} ek={(c) => tlHtml(c.bakiye)}
                  son={musteriler.slice(0, 2)} sec={setCari} yeni={(y) => u.bildir(`"${y}" için cari kartı açılacak${PROTOTIP_NOTU}`, { ikon: "i-plus" })} />
              </Alan>
              <Alan etiket="Tarih" id="tarih" genislik="erp-w-tarih"><input id="tarih" className="erp-input" defaultValue="28.10.2026" /></Alan>
              <Alan etiket="Teslim" id="teslim" genislik="erp-w-tarih"><input id="teslim" className="erp-input" defaultValue="12.11.2026" /></Alan>
            </div>
            <div className="soluk kucuk">Para birimi <b>₺</b> · Defter <b>Genel</b></div>
          </div>

          <div className="kalem-ekle">
            <div className="erp-form-satir">
              <Alan etiket="Ürün" id="urun">
                <AramaliSecici<Urun> style={{ width: 320 }} id="urun" kaynak={mamuller} etiket="ürün" secili={urun}
                  alanlar={(x) => [`${x.ad} · ${x.renk ?? ""}`, x.tip]} kod={(x) => x.kod} alt={(x) => x.tip}
                  ek={(x) => `<span class="${x.stok < 0 ? "erp-eksi" : ""}">${window.Atolye.sayiYaz(x.stok)} stok</span>`}
                  sec={(x) => { setUrun(x); if (x) setFiyat(window.Atolye.sayiYaz(x.fiyat, 2)); }} />
              </Alan>
              <Alan etiket="Fiyat" id="fiyat" genislik="erp-w-fiyat"><input id="fiyat" className="erp-input erp-sayi" value={fiyat} onChange={(e) => setFiyat(e.target.value)} placeholder="0,00" /></Alan>
            </div>
            <div className="erp-table-kap" style={{ width: "fit-content", maxWidth: "100%" }}>
              <table className="erp-table erp-matrix">
                <thead><tr>{BEDENLER.map((b) => <th key={b} className="erp-beden">{b}</th>)}<th className="erp-sayi">Çift</th></tr></thead>
                <tbody><tr>
                  {BEDENLER.map((b) => (
                    <td key={b} className="erp-hucre"><input className="erp-hucre-gir" inputMode="numeric" aria-label={b + " beden adedi"} value={yeniBedenler[b] || ""}
                      onChange={(e) => setYeniBedenler({ ...yeniBedenler, [b]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      onKeyDown={(e) => { if (e.key === "Enter") ekle(); }} /></td>
                  ))}
                  <td className="erp-sayi">{sayi(Object.values(yeniBedenler).reduce((a, b) => a + b, 0))}</td>
                </tr></tbody>
              </table>
            </div>
            <button className="erp-btn" disabled={!!kalemHatasi} title={kalemHatasi} onClick={ekle}><Ikon ad="i-plus" />Kalemlere ekle</button>
          </div>

          {kalemler.length ? (
            <div className="erp-table-kap">
              <table className="erp-table erp-matrix">
                <thead><tr><th>Ürün · renk</th>{BEDENLER.map((b) => <th key={b} className="erp-beden">{b}</th>)}<th className="erp-sayi">Çift</th><th className="erp-sayi">Fiyat</th><th className="erp-sayi">Tutar</th></tr></thead>
                <tbody>
                  {kalemler.map((k) => (
                    <tr key={k.id}>
                      <td>{k.urunAd} · {k.renk}</td>
                      {BEDENLER.map((b) => <td key={b} className={"erp-hucre" + (k.bedenler[b] ? "" : " erp-hucre--bos")}>{k.bedenler[b] || "·"}</td>)}
                      <td className="erp-sayi">{sayi(kalemCift(k))}</td><td className="erp-sayi">{tl(k.fiyat)}</td><td className="erp-sayi">{tl(kalemTutar(k))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <BosDurum baslik="Henüz kalem yok" aciklama="Ürünü seç, bedenlere adet yaz, Kalemlere ekle. Barkod okutmak ürünü doğrudan seçer." />}
          {denendi && !kalemler.length && <span className="erp-field__hata">En az bir kalem gerekli</span>}

          <div className="erp-form-satir" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Alan etiket="Not" id="not"><textarea id="not" className="erp-input" style={{ height: 60, paddingTop: 6, width: "min(420px, 80vw)" }} value={not} onChange={(e) => setNot(e.target.value)} /></Alan>
            <dl className="erp-ozellik" style={{ margin: 0, minWidth: 240 }}>
              <dt>Ara toplam</dt><dd className="erp-sayi">{tl(araToplam)}</dd>
              <dt>KDV %10</dt><dd className="erp-sayi">{tl(araToplam * 0.1)}</dd>
              <dt><b>Genel toplam</b></dt><dd className="erp-sayi"><b>{tl(araToplam * 1.1)}</b></dd>
            </dl>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="erp-btn" onClick={() => u.git("siparisler")}>Vazgeç</button>
            <button className="erp-btn erp-btn--primary" onClick={kaydet} disabled={u.cevrimdisi} title={u.cevrimdisi ? "İnternet yok: kayıt girilemez" : "Kaydet · Ctrl+S"}><Ikon ad="i-save" />Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  );
}
