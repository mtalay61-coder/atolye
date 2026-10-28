// LİSTE KALIBI — Siparişler. Araç çubuğu · süzgeç çipleri · tablo (süzgeç satırı, seçim, sağ tık) · toplam.
import { useEffect, useMemo, useState } from "react";
import { AracCubugu, BosDurum, Cip, Ikon, Menu, Rozet, SilOnayi, useSagTik } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";
import { kaynak, PROTOTIP_NOTU } from "../veri/kaynak";
import { siparisCift, siparisSevk, siparisTutar, sayi, tl } from "../veri/hesap";
import type { Cari, Siparis } from "../veri/tipler";

const SUZGECLER: { id: string; ad: string; uyar: (s: Siparis) => boolean }[] = [
  { id: "acik", ad: "Açık", uyar: (s) => !["Tamamlandı", "İptal"].includes(s.durum) },
  { id: "hafta", ad: "Bu hafta teslim", uyar: (s) => ["30.10.2026", "02.11.2026"].includes(s.teslim) },
  { id: "tumu", ad: "Tümü", uyar: () => true },
];

export function SiparisListesi() {
  const u = useUygulama();
  const [siparisler, setSiparisler] = useState<Siparis[] | null>(null);
  const [cariler, setCariler] = useState<Cari[]>([]);
  const [suzgec, setSuzgec] = useState("acik");
  const [noSuz, setNoSuz] = useState("");
  const [cariSuz, setCariSuz] = useState("");
  const [secili, setSecili] = useState<string | null>(null);
  const [silinecek, setSilinecek] = useState<Siparis | null>(null);
  const sagTik = useSagTik<Siparis>();
  useEffect(() => { kaynak.siparisler().then(setSiparisler); kaynak.cariler().then(setCariler); }, []);
  const cariAdi = (id: string) => cariler.find((c) => c.id === id)?.ad ?? "";

  const satirlar = useMemo(() => {
    const s = SUZGECLER.find((x) => x.id === suzgec)!;
    const A = window.Atolye;
    return (siparisler ?? []).filter((x) => s.uyar(x) && (!noSuz || A.eslesme(noSuz, [x.no])) && (!cariSuz || A.eslesme(cariSuz, [cariAdi(x.cariId)])));
  }, [siparisler, suzgec, noSuz, cariSuz, cariler]); // eslint-disable-line react-hooks/exhaustive-deps

  const seciliSiparis = satirlar.find((x) => x.no === secili) ?? null;
  const secimGerekli = seciliSiparis ? undefined : "Önce bir sipariş seç";
  const ac = (no: string) => u.git("siparis-" + no);
  const kopyala = (s: Siparis) => kaynak.komut("siparis_kopyala", s).then((r) => u.bildir(r.mesaj + PROTOTIP_NOTU, { ikon: "i-copy" }));
  const iptal = (s: Siparis) => kaynak.komut("siparis_iptal", s).then((r) => { setSilinecek(null); u.bildir(`${s.no} ${r.mesaj.toLowerCase()}${PROTOTIP_NOTU}`, { ikon: "i-trash", geriAl: () => u.bildir("Geri alındı" + PROTOTIP_NOTU, { ikon: "i-undo" }) }); });

  return (
    <>
      <AracCubugu baslik="Siparişler" eylemler={{
        yeni: { onClick: () => u.git("siparis-yeni") },
        kopyala: { onClick: () => seciliSiparis && kopyala(seciliSiparis), pasif: secimGerekli },
        sil: { onClick: () => seciliSiparis && setSilinecek(seciliSiparis), pasif: secimGerekli ?? (seciliSiparis?.durum === "İptal" ? "Sipariş zaten iptal" : undefined) },
        ara: { onClick: () => document.getElementById("suz-no")?.focus() },
        filtre: { onClick: () => setSuzgec("tumu") },
        yenile: { onClick: () => { setSiparisler(null); kaynak.siparisler().then(setSiparisler); } },
        yazdir: { pasif: "Prototipte yazdırma yok; çıktı ekrandaki tablonun aynısı olacak" },
        excel: { pasif: "Prototipte Excel yok; ekrandaki tablonun aynısı olacak" },
      }} />
      <div className="sayfa-govde">
        <div className="cipler">
          {SUZGECLER.map((s) => <Cip key={s.id} secili={suzgec === s.id} onClick={() => setSuzgec(s.id)}>{s.ad} <b>{(siparisler ?? []).filter(s.uyar).length}</b></Cip>)}
        </div>
        {siparisler === null ? <p className="soluk">Yükleniyor…</p> : (
          <div className="erp-table-kap">
            <table className="erp-table">
              <thead>
                <tr><th>Sipariş</th><th>Müşteri</th><th>Teslim</th><th>Durum</th><th className="erp-sayi">Çift</th><th className="erp-sayi">Sevk</th><th className="erp-sayi">Tutar</th></tr>
                <tr className="erp-suzgec">
                  <th><input id="suz-no" placeholder="Süz" aria-label="Sipariş noda süz" value={noSuz} onChange={(e) => setNoSuz(e.target.value)} /></th>
                  <th><input placeholder="Süz" aria-label="Müşteride süz" value={cariSuz} onChange={(e) => setCariSuz(e.target.value)} /></th>
                  <th /><th /><th /><th /><th />
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s) => (
                  <tr key={s.no} aria-selected={secili === s.no} tabIndex={0}
                    onClick={() => setSecili(s.no)} onDoubleClick={() => ac(s.no)}
                    onPointerUp={(e) => { if (e.pointerType === "touch") ac(s.no); }}
                    onKeyDown={(e) => { if (e.key === "Enter") ac(s.no); }}
                    onContextMenu={(e) => { setSecili(s.no); sagTik.ac(e, s); }}>
                    <td>{s.no}</td><td>{cariAdi(s.cariId)}</td><td>{s.teslim}</td><td><Rozet durum={s.durum} /></td>
                    <td className="erp-sayi">{sayi(siparisCift(s))}</td><td className="erp-sayi">{sayi(siparisSevk(s))}</td><td className="erp-sayi">{tl(siparisTutar(s))}</td>
                  </tr>
                ))}
              </tbody>
              {satirlar.length > 0 && (
                <tfoot><tr><td colSpan={4}>{satirlar.length} sipariş</td><td className="erp-sayi">{sayi(satirlar.reduce((a, s) => a + siparisCift(s), 0))}</td><td className="erp-sayi">{sayi(satirlar.reduce((a, s) => a + siparisSevk(s), 0))}</td><td className="erp-sayi">{tl(satirlar.reduce((a, s) => a + siparisTutar(s), 0))}</td></tr></tfoot>
              )}
            </table>
            {satirlar.length === 0 && (
              <BosDurum baslik="Bu süzgeçle sipariş yok" aciklama="Süzgeci temizle ya da Yeni ile sipariş aç."
                dugme={<button className="erp-btn" onClick={() => { setNoSuz(""); setCariSuz(""); setSuzgec("tumu"); }}><Ikon ad="i-filter" />Süzgeci temizle</button>} />
            )}
          </div>
        )}
        <p className="soluk kucuk">Satıra tıkla: seçilir. Çift tık ya da Enter: açılır (dokunmatikte tek dokunuş). Sağ tık: araç çubuğunun aynısı.</p>
      </div>
      {sagTik.menu && (
        <Menu konum={sagTik.menu} kapat={sagTik.kapat} ogeler={[
          { tur: "duzenle", ad: "Aç", ikon: "i-edit", kisayol: "Enter", onClick: () => ac(sagTik.menu!.kayit.no) },
          { tur: "kopyala", pasif: u.cevrimdisi ? "İnternet yok: kayıt girilemez" : undefined, onClick: () => kopyala(sagTik.menu!.kayit) },
          { tur: "sil", ad: "İptal et", pasif: u.cevrimdisi ? "İnternet yok: kayıt girilemez" : sagTik.menu.kayit.durum === "İptal" ? "Sipariş zaten iptal" : undefined, onClick: () => setSilinecek(sagTik.menu!.kayit) },
          "-",
          { tur: "yazdir", pasif: "Prototipte yazdırma yok" },
        ]} />
      )}
      {silinecek && (
        <SilOnayi soru={`${silinecek.no} iptal edilsin mi?`} dugme="İptal et"
          aciklama="Onaylı sipariş silinmez, iptal edilir: kayıt geçmişte kalır, bağlı rezervasyon ve ihtiyaçlar düşer."
          onayla={() => iptal(silinecek)} vazgec={() => setSilinecek(null)} />
      )}
    </>
  );
}
