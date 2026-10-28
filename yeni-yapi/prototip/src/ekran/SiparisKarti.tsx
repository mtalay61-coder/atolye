// KART KALIBI — bir siparişin ayrıntısı. Başlık: Düzenle · İşlemler · Sil ┆ Kapat; gövde sekmeli.
import { useEffect, useState } from "react";
import { BosDurum, Ikon, KartBasligi, Menu, Rozet, Sekmeler, SilOnayi } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";
import { kaynak, PROTOTIP_NOTU } from "../veri/kaynak";
import { BEDENLER } from "../veri/ornek";
import { bakiyeSinifi, bakiyeYaz, kalemCift, kalemTutar, siparisCift, siparisSevk, siparisTutar, sayi, tl, topla } from "../veri/hesap";
import type { Cari, Siparis } from "../veri/tipler";

// Açık sekme kayıttan kayda geçerken korunur (kart her kayıtta yeniden kurulur).
let sonSekme = "kalemler";

export function SiparisKarti({ no }: { no: string }) {
  const u = useUygulama();
  const [s, setS] = useState<Siparis | null | undefined>(null);
  const [cari, setCari] = useState<Cari>();
  const [sekme, setSekmeIc] = useState(sonSekme);
  const setSekme = (s: string) => { sonSekme = s; setSekmeIc(s); };
  const [varsayilan, setVarsayilan] = useState<string[]>([]);
  const [islemler, setIslemler] = useState(false);
  const [iptalSor, setIptalSor] = useState(false);
  useEffect(() => {
    kaynak.siparis(no).then((x) => { setS(x); if (x) kaynak.cariler().then((c) => setCari(c.find((y) => y.id === x.cariId))); });
    u.gezintiAyarla("siparis", { son: no });
  }, [no]); // eslint-disable-line react-hooks/exhaustive-deps
  // Liste dışından açıldıysa (bağlantı, arama) gezgin modülün varsayılan listesini kullanır.
  const liste = u.gezinti.siparis?.liste;
  useEffect(() => { if (!liste) kaynak.siparisler().then((x) => setVarsayilan(x.map((y) => y.no))); }, [liste]);
  const gezListe = liste && liste.includes(no) ? liste : varsayilan;
  const kapat = () => u.git("siparisler");
  if (s === null) return <div className="sayfa-govde soluk">Yükleniyor…</div>;
  if (s === undefined) return <div className="sayfa-govde"><BosDurum baslik="Sipariş bulunamadı" aciklama={`${no} numaralı sipariş yok.`} dugme={<button className="erp-btn" onClick={kapat}>Siparişlere dön</button>} /></div>;
  const iptalMi = s.durum === "İptal";

  return (
    <div className="sayfa-govde">
      <div className="erp-card">
        <KartBasligi kod={s.no} baslik={cari?.ad ?? ""} durum={<Rozet durum={s.durum} />}
          duzenle={{ onClick: () => u.git("siparis-yeni"), pasif: iptalMi ? "İptal edilmiş sipariş düzenlenmez" : undefined }}
          sil={{ onClick: () => setIptalSor(true), pasif: iptalMi ? "Sipariş zaten iptal" : undefined }}
          ozel={
            <span style={{ position: "relative" }}>
              <button className="erp-btn" aria-haspopup="menu" onClick={() => setIslemler(!islemler)}>İşlemler</button>
              {islemler && (
                <Menu kapat={() => setIslemler(false)} ogeler={[
                  { ad: "Üretime gönder", ikon: "i-refresh", pasif: iptalMi ? "İptal edilmiş sipariş" : u.cevrimdisi ? "İnternet yok" : undefined, onClick: () => u.bildir("Planlamaya gönderildi" + PROTOTIP_NOTU) },
                  { ad: "Sevk et", ikon: "i-export", pasif: "Önce koli hazırlanmalı (Depo ve sevk)" },
                  { ad: "Müşteriye gönder", ikon: "i-print", onClick: () => u.bildir("Sipariş özeti hazırlandı" + PROTOTIP_NOTU) },
                  { tur: "kopyala", onClick: () => u.bildir("Sipariş kopyalandı" + PROTOTIP_NOTU, { ikon: "i-copy" }) },
                ]} />
              )}
            </span>
          }
          gezgin={{ liste: gezListe, mevcut: no, git: (x) => u.git("siparis-" + x) }}
          kapat={kapat} />
        <Sekmeler secili={sekme} sec={setSekme} sekmeler={[
          { id: "genel", ad: "Genel" }, { id: "kalemler", ad: "Kalemler", sayi: s.kalemler.length },
          { id: "sevk", ad: "Sevkler", sayi: siparisSevk(s) ? 1 : 0 }, { id: "notlar", ad: "Notlar" },
        ]} />
        <div className="erp-card__body">
          {sekme === "genel" && (
            <dl className="erp-ozellik" style={{ margin: 0 }}>
              <dt>Müşteri</dt><dd><a href={"#cari-" + cari?.kod}>{cari?.kod} · {cari?.ad}</a></dd>
              <dt>Bakiye</dt><dd className={bakiyeSinifi(cari?.bakiye ?? 0)}>{bakiyeYaz(cari?.bakiye ?? 0, cari?.paraBirimi)}</dd>
              <dt>Tarih</dt><dd>{s.tarih}</dd><dt>Teslim</dt><dd>{s.teslim}</dd>
              <dt>Çift</dt><dd>{sayi(siparisCift(s))} · sevk edilen {sayi(siparisSevk(s))}</dd>
              <dt>Tutar</dt><dd>{tl(siparisTutar(s))}</dd>
            </dl>
          )}
          {sekme === "kalemler" && (s.kalemler.length ? (
            <div className="erp-table-kap">
              <table className="erp-table erp-matrix">
                <thead><tr><th>Ürün · renk</th>{BEDENLER.map((b) => <th key={b} className="erp-beden">{b}</th>)}<th className="erp-sayi">Çift</th><th className="erp-sayi">Sevk</th><th className="erp-sayi">Fiyat</th><th className="erp-sayi">Tutar</th></tr></thead>
                <tbody>
                  {s.kalemler.map((k) => (
                    <tr key={k.id}>
                      <td>{k.urunAd} · {k.renk}</td>
                      {BEDENLER.map((b) => <td key={b} className={"erp-hucre" + (k.bedenler[b] ? "" : " erp-hucre--bos")} title={k.sevk[b] ? `${k.sevk[b]} sevk edildi` : undefined}>{k.bedenler[b] ? <>{k.bedenler[b]}{k.sevk[b] ? <sup className="sevk-isaret">{k.sevk[b]}</sup> : null}</> : "·"}</td>)}
                      <td className="erp-sayi">{sayi(kalemCift(k))}</td><td className="erp-sayi">{sayi(topla(k.sevk))}</td><td className="erp-sayi">{tl(k.fiyat)}</td><td className="erp-sayi">{tl(kalemTutar(k))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td>{s.kalemler.length} kalem</td>{BEDENLER.map((b) => <td key={b} className="erp-hucre">{s.kalemler.reduce((a, k) => a + (k.bedenler[b] || 0), 0) || "·"}</td>)}<td className="erp-sayi">{sayi(siparisCift(s))}</td><td className="erp-sayi">{sayi(siparisSevk(s))}</td><td /><td className="erp-sayi">{tl(siparisTutar(s))}</td></tr></tfoot>
              </table>
            </div>
          ) : <BosDurum baslik="Kalem yok" aciklama="Bu siparişte kalem yok." />)}
          {sekme === "kalemler" && siparisSevk(s) > 0 && <p className="soluk kucuk">Küçük sayı: o bedenden sevk edilen çift.</p>}
          {sekme === "sevk" && (siparisSevk(s)
            ? <div className="erp-table-kap"><table className="erp-table"><thead><tr><th>Belge</th><th>Tarih</th><th className="erp-sayi">Çift</th><th>Durum</th></tr></thead><tbody><tr><td>SAT-İRS-2026-000044</td><td>27.10.2026</td><td className="erp-sayi">{sayi(siparisSevk(s))}</td><td><Rozet durum="Onaylı" /></td></tr></tbody></table></div>
            : <BosDurum baslik="Henüz sevk yok" aciklama="Koliler hazırlanıp sevk edilince irsaliyeler burada görünür." />)}
          {sekme === "notlar" && <p style={{ margin: 0 }}>{s.not ?? <span className="soluk">Not yok.</span>}</p>}
        </div>
      </div>
      <p className="soluk kucuk"><Ikon ad="i-info" /> ‹ › ya da PageUp/PageDown: önceki/sonraki sipariş. Esc ya da Kapat: listeye döner. F2: düzenle. Del: iptal sorusu.</p>
      {iptalSor && (
        <SilOnayi soru={`${s.no} iptal edilsin mi?`} dugme="İptal et"
          aciklama="Onaylı sipariş silinmez, iptal edilir: kayıt geçmişte kalır, bağlı rezervasyon ve ihtiyaçlar düşer."
          onayla={() => { setIptalSor(false); u.bildir(`${s.no} iptal edildi${PROTOTIP_NOTU}`, { ikon: "i-trash", geriAl: () => u.bildir("Geri alındı" + PROTOTIP_NOTU, { ikon: "i-undo" }) }); }}
          vazgec={() => setIptalSor(false)} />
      )}
    </div>
  );
}
