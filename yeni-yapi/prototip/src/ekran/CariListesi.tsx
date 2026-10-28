// LİSTE KALIBI — Cariler. Rol çipleri · süzgeç satırı · bakiye (işaretli, tek renk kuralı) · toplamlar.
import { useEffect, useMemo, useState } from "react";
import { AracCubugu, BosDurum, Cip, Ikon, Menu, Rozet, SilOnayi, useSagTik } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";
import { kaynak, PROTOTIP_NOTU } from "../veri/kaynak";
import { bakiyeSinifi, bakiyeYaz } from "../veri/hesap";
import type { Cari } from "../veri/tipler";

const SUZGECLER: { id: string; ad: string; uyar: (c: Cari) => boolean }[] = [
  { id: "tumu", ad: "Tümü", uyar: (c) => !c.pasif },
  { id: "musteri", ad: "Müşteri", uyar: (c) => !c.pasif && c.roller.includes("Müşteri") },
  { id: "tedarikci", ad: "Tedarikçi", uyar: (c) => !c.pasif && c.roller.includes("Tedarikçi") },
  { id: "fason", ad: "Fasoncu · personel", uyar: (c) => !c.pasif && (c.roller.includes("Fasoncu") || c.roller.includes("Personel")) },
  { id: "borclu", ad: "Bize borçlu", uyar: (c) => !c.pasif && c.bakiye > 0 },
  { id: "pasif", ad: "Pasif", uyar: (c) => !!c.pasif },
];

export function CariListesi() {
  const u = useUygulama();
  const [cariler, setCariler] = useState<Cari[] | null>(null);
  const [suzgec, setSuzgec] = useState("tumu");
  const [adSuz, setAdSuz] = useState("");
  const [ilSuz, setIlSuz] = useState("");
  const [secili, setSecili] = useState<string | null>(() => u.gezinti.cari?.son ?? null);
  const [pasifSor, setPasifSor] = useState<Cari | null>(null);
  const sagTik = useSagTik<Cari>();
  useEffect(() => { kaynak.cariler(true).then(setCariler); }, []);

  const satirlar = useMemo(() => {
    const s = SUZGECLER.find((x) => x.id === suzgec)!;
    const A = window.Atolye;
    return (cariler ?? []).filter((c) => s.uyar(c) && (!adSuz || A.eslesme(adSuz, [c.ad, c.kod, c.yetkili ?? "", c.telefon ?? "", c.vergiNo ?? ""])) && (!ilSuz || A.eslesme(ilSuz, [c.il])));
  }, [cariler, suzgec, adSuz, ilSuz]);
  useEffect(() => { if (cariler) u.gezintiAyarla("cari", { liste: satirlar.map((c) => c.kod) }); }, [satirlar, cariler]); // eslint-disable-line react-hooks/exhaustive-deps

  const sec = satirlar.find((c) => c.kod === secili) ?? null;
  const secimGerekli = sec ? undefined : "Önce bir cari seç";
  const ac = (kod: string) => u.git("cari-" + kod);
  const pasifeAl = (c: Cari) => kaynak.komut("cari_pasife_al", c).then((r) => {
    setPasifSor(null);
    u.bildir(`${c.kod} · ${r.mesaj.toLowerCase()}${PROTOTIP_NOTU}`, { ikon: "i-ban", geriAl: () => u.bildir("Geri alındı" + PROTOTIP_NOTU, { ikon: "i-undo" }) });
  });
  // Toplam yalnız Türk lirası carileri toplar; dövizli bakiye liraya karışmaz, ayrıca sayılır.
  const tl = satirlar.filter((c) => c.paraBirimi === "TRY");
  const alacak = tl.filter((c) => c.bakiye > 0).reduce((a, c) => a + c.bakiye, 0);
  const borc = tl.filter((c) => c.bakiye < 0).reduce((a, c) => a + c.bakiye, 0);
  const dovizli = satirlar.length - tl.length;

  return (
    <>
      <AracCubugu baslik="Cariler" eylemler={{
        yeni: { onClick: () => u.git("cari-yeni") },
        kopyala: { onClick: () => sec && u.bildir(`${sec.kod} kopyalandı${PROTOTIP_NOTU}`, { ikon: "i-copy" }), pasif: secimGerekli },
        sil: { onClick: () => sec && setPasifSor(sec), pasif: secimGerekli ?? (sec?.pasif ? "Cari zaten pasif" : undefined) },
        ara: { onClick: () => document.getElementById("suz-ad")?.focus() },
        filtre: { onClick: () => setSuzgec("tumu") },
        yenile: { onClick: () => { setCariler(null); kaynak.cariler(true).then(setCariler); } },
        yazdir: { pasif: "Prototipte yazdırma yok; çıktı ekrandaki tablonun aynısı olacak" },
        excel: { pasif: "Prototipte Excel yok; ekrandaki tablonun aynısı olacak" },
      }} />
      <div className="sayfa-govde">
        <div className="cipler">
          {SUZGECLER.map((s) => <Cip key={s.id} secili={suzgec === s.id} onClick={() => setSuzgec(s.id)}>{s.ad} <b>{(cariler ?? []).filter(s.uyar).length}</b></Cip>)}
        </div>
        {cariler === null ? <p className="soluk">Yükleniyor…</p> : (
          <div className="erp-table-kap">
            <table className="erp-table">
              <thead>
                <tr><th>Kod</th><th>Ünvan</th><th>Rol</th><th>İl</th><th>Telefon</th><th className="erp-sayi">Bakiye</th></tr>
                <tr className="erp-suzgec">
                  <th /><th><input id="suz-ad" placeholder="Ad, kod, yetkili, telefon, vergi no" aria-label="Ünvanda süz" value={adSuz} onChange={(e) => setAdSuz(e.target.value)} /></th>
                  <th /><th><input placeholder="Süz" aria-label="İlde süz" value={ilSuz} onChange={(e) => setIlSuz(e.target.value)} /></th><th /><th />
                </tr>
              </thead>
              <tbody>
                {satirlar.map((c) => (
                  <tr key={c.kod} aria-selected={secili === c.kod} tabIndex={0}
                    onClick={() => setSecili(c.kod)} onDoubleClick={() => ac(c.kod)}
                    onPointerUp={(e) => { if (e.pointerType === "touch") ac(c.kod); }}
                    onKeyDown={(e) => { if (e.key === "Enter") ac(c.kod); }}
                    onContextMenu={(e) => { setSecili(c.kod); sagTik.ac(e, c); }}>
                    <td>{c.kod}</td>
                    <td>{c.ad}{c.pasif && <> <Rozet durum="Pasif" /></>}</td>
                    <td className="soluk">{c.roller.join(", ")}</td>
                    <td>{c.il}</td><td>{c.telefon}</td>
                    <td className={"erp-sayi " + bakiyeSinifi(c.bakiye)}>{bakiyeYaz(c.bakiye, c.paraBirimi)}</td>
                  </tr>
                ))}
              </tbody>
              {satirlar.length > 0 && (
                <tfoot><tr><td colSpan={3}>{satirlar.length} cari</td><td colSpan={2} className="erp-sayi soluk">Bize borçlu <span className="erp-arti">{bakiyeYaz(alacak)}</span> · Borcumuz <span className="erp-eksi">{bakiyeYaz(borc)}</span></td><td className={"erp-sayi " + bakiyeSinifi(alacak + borc)}>{bakiyeYaz(alacak + borc)}</td></tr></tfoot>
              )}
            </table>
            {satirlar.length === 0 && (
              <BosDurum baslik="Bu süzgeçle cari yok" aciklama="Süzgeci temizle ya da Yeni ile cari aç."
                dugme={<button className="erp-btn" onClick={() => { setAdSuz(""); setIlSuz(""); setSuzgec("tumu"); }}><Ikon ad="i-filter" />Süzgeci temizle</button>} />
            )}
          </div>
        )}
        <p className="soluk kucuk">Bakiye: <span className="erp-arti">+ yeşil</span> cari bize borçlu, <span className="erp-eksi">− kırmızı</span> biz borçluyuz. Toplamlar Türk lirası carileri içindir{dovizli ? ` (${dovizli} dövizli cari toplama girmedi)` : ""}.</p>
      </div>
      {sagTik.menu && (
        <Menu konum={sagTik.menu} kapat={sagTik.kapat} ogeler={[
          { tur: "duzenle", ad: "Aç", ikon: "i-edit", kisayol: "Enter", onClick: () => ac(sagTik.menu!.kayit.kod) },
          { tur: "kopyala", pasif: u.cevrimdisi ? "İnternet yok: kayıt girilemez" : undefined, onClick: () => u.bildir(`${sagTik.menu!.kayit.kod} kopyalandı${PROTOTIP_NOTU}`, { ikon: "i-copy" }) },
          { tur: "sil", ad: "Pasife al", pasif: u.cevrimdisi ? "İnternet yok: kayıt girilemez" : sagTik.menu.kayit.pasif ? "Cari zaten pasif" : undefined, onClick: () => setPasifSor(sagTik.menu!.kayit) },
          "-",
          { tur: "yazdir", ad: "Ekstre yazdır", pasif: "Prototipte yazdırma yok" },
        ]} />
      )}
      {pasifSor && (
        <SilOnayi soru={`${pasifSor.ad} pasife alınsın mı?`} dugme="Pasife al"
          aciklama="Cari silinmez: hareketleri ve belgeleri kalır, yalnız seçim listelerinden çıkar. Pasif süzgecinden geri açılabilir."
          onayla={() => pasifeAl(pasifSor)} vazgec={() => setPasifSor(null)} />
      )}
    </>
  );
}
