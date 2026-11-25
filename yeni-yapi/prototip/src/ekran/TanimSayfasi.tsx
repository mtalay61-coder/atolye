// Tanımlar'ın ortak çerçevesi: araç çubuğu + sekmeli kart. Her sekme kendi araç çubuğu eylemlerini verir
// (Yeni o sekmenin kaydını açar), sekme satırı ve düzen her sekmede aynı kalır.
import type { ReactNode } from "react";
import { AracCubugu, Sekmeler, type Eylemler } from "../bilesen/temel";

export const TANIM_SEKMELERI = [
  { id: "urun-renkleri", ad: "Ürün renkleri" }, { id: "degiskenler", ad: "Hammadde değişkenleri" },
  { id: "olculer", ad: "Ölçüler" }, { id: "prosesler", ad: "Prosesler" }, { id: "depolar", ad: "Depolar" }, { id: "gorunum", ad: "Görünüm" },
];
// Karttan Kapat ile dönülünce aynı sekme açık gelir.
export const tanimDurumu = { sekme: "urun-renkleri", tur: "dt1" };

export function TanimSayfasi({ sekme, sec, eylemler, ust, children }: { sekme: string; sec: (s: string) => void; eylemler: Eylemler; ust?: ReactNode; children: ReactNode }) {
  return (
    <>
      <AracCubugu baslik="Tanımlar" eylemler={eylemler} />
      <div className="sayfa-govde">
        <div className="erp-card">
          <Sekmeler secili={sekme} sec={sec} sekmeler={TANIM_SEKMELERI} />
          <div className="erp-card__body" style={{ display: "grid", gap: 12 }}>{ust}{children}</div>
        </div>
      </div>
    </>
  );
}
