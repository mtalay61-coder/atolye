// Ekranı henüz çizilmemiş modül: yapı şemasındaki amacı, kestiği belgeler ve kılavuz adımları.
// Yani menüdeki her öğe bir şey gösterir ve ne yapacağı şemadan okunur.
import { AracCubugu, BosDurum } from "../bilesen/temel";
import sema from "../veri/sema.json";
import { MENU } from "../menu";

type SemaModul = { kod: string; ad: string; amac?: string; durum?: string; faz?: number | null };
type SemaKonu = { baslik: string; modul: string; sira?: number | null; ozet?: string; adimlar?: string[]; ipuclari?: string; belgeler?: string[] };
type SemaBelge = { kod: string; ad: string; stok?: string; cari?: string; kasa?: string; kaynaklar?: string[] };

export function Planlanan({ kod }: { kod: string }) {
  const moduller = sema.moduller as Record<string, SemaModul>;
  const mid = Object.keys(moduller).find((k) => moduller[k].kod === kod);
  const m = mid ? moduller[mid] : undefined;
  const menuAdi = MENU.flatMap((g) => g.ogeler).find((o) => o.kod === kod)?.ad ?? kod;
  if (!m || !mid) return <BosDurum baslik="Böyle bir ekran yok" aciklama="Menüden bir ekran seç." />;
  const konular = Object.values(sema.kilavuz as Record<string, SemaKonu>).filter((k) => k.modul === mid).sort((a, b) => (a.sira ?? 99) - (b.sira ?? 99));
  const belgeler = sema.belgeler as Record<string, SemaBelge>;
  return (
    <>
      <AracCubugu baslik={menuAdi} eylemler={{ yenile: { pasif: "Ekranı henüz çizilmedi" } }} />
      <div className="sayfa-govde planlanan">
        <div className="erp-serit erp-serit--uyari" style={{ borderRadius: "var(--erp-r-md)" }}>Bu ekran henüz çizilmedi. Aşağıdakiler yapı şemasından: modül {m.kod} · {m.ad}{m.faz != null ? ` · Faz ${m.faz}` : ""}.</div>
        {m.amac && <p className="planlanan-amac">{m.amac}</p>}
        {konular.length === 0 && <p className="soluk">Bu modülün kılavuz konusu henüz yazılmadı.</p>}
        {konular.map((k) => (
          <section key={k.baslik} className="erp-card planlanan-konu">
            <div className="erp-card__head"><span className="erp-card__title">{k.baslik}</span></div>
            <div className="erp-card__body" style={{ display: "grid", gap: 10 }}>
              {k.ozet && <p style={{ margin: 0 }}>{k.ozet}</p>}
              {!!k.adimlar?.length && <ol className="planlanan-adimlar">{k.adimlar.map((a) => <li key={a}>{a}</li>)}</ol>}
              {k.ipuclari && <div className="soluk kucuk">{k.ipuclari}</div>}
              {(k.belgeler ?? []).map((bid) => belgeler[bid]).filter(Boolean).map((b) => (
                <div key={b.kod} className="kucuk"><b>{b.kod}</b> {b.ad} · stok {b.stok || "—"} · cari {b.cari || "—"} · kasa {b.kasa || "—"}</div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
