// Tasarım sisteminin bileşenleri, React kılığında. Görünüm bundle.css sınıflarından, kurallar
// (araç çubuğu sırası, kısayollar, ikonlar, arama) window.Atolye'den gelir; burada yeniden yazılmaz.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUygulama } from "./uygulama";

const A = () => window.Atolye;

export function Ikon({ ad }: { ad: string }) {
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: A().ikon(ad) }} />;
}

// ---------------- Araç çubuğu ----------------
export type EylemTanimi = { onClick?: () => void; pasif?: string };
export type Eylemler = Partial<Record<string, EylemTanimi>>;
const YAZAN = new Set(["yeni", "kaydet", "duzenle", "kopyala", "sil"]);

// Kısayollar en son açılan çubuğa gider (kart açıkken listenin Del'i çalışmasın).
const cubukYigini: { current: Eylemler }[] = [];
function kisayolYakala(e: KeyboardEvent) {
  const ust = cubukYigini[cubukYigini.length - 1];
  if (!ust) return;
  const yazida = (e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable]");
  let tus = e.key;
  if ((e.ctrlKey || e.metaKey) && /^[sn]$/i.test(e.key)) tus = "Ctrl+" + e.key.toUpperCase();
  const tur = A().KISAYOLLAR[tus];
  if (!tur || (yazida && ["Delete", "Escape", "PageUp", "PageDown"].includes(tus))) return;
  const e2 = ust.current[tur];
  if (!e2 || !e2.onClick || e2.pasif) return;
  e.preventDefault();
  e2.onClick();
}
if (typeof window !== "undefined") window.addEventListener("keydown", kisayolYakala);

export function useCevrimdisiEylemler(eylemler: Eylemler): Eylemler {
  const { cevrimdisi } = useUygulama();
  if (!cevrimdisi) return eylemler;
  const o: Eylemler = {};
  for (const [k, v] of Object.entries(eylemler)) o[k] = YAZAN.has(k) ? { ...v, pasif: "İnternet yok: kayıt girilemez" } : v;
  return o;
}

export function AracCubugu({ baslik, eylemler, sag }: { baslik?: ReactNode; eylemler: Eylemler; sag?: ReactNode }) {
  const etkin = useCevrimdisiEylemler(eylemler);
  const ref = useRef(etkin);
  ref.current = etkin;
  useEffect(() => {
    cubukYigini.push(ref);
    return () => { cubukYigini.splice(cubukYigini.indexOf(ref), 1); };
  }, []);
  let sonGrup = 0;
  const parcalar: ReactNode[] = [];
  A().EYLEMLER.forEach((e) => {
    if (!(e.tur in etkin)) return;
    const d = etkin[e.tur] || {};
    if (sonGrup && e.grup !== sonGrup) parcalar.push(<span key={"a" + e.tur} className={e.grup === 3 ? "erp-toolbar__gap" : "erp-toolbar__sep"} />);
    sonGrup = e.grup;
    parcalar.push(
      <button key={e.tur} type="button" data-eylem={e.tur} aria-label={e.ad}
        className={"erp-ib" + (e.birincil ? " erp-ib--primary" : "") + (e.tehlike ? " erp-ib--danger" : "")}
        title={d.pasif || e.ad + (e.kisayol ? " · " + e.kisayol : "")} disabled={!!d.pasif} onClick={d.onClick}>
        <Ikon ad={e.ikon} />
      </button>,
    );
  });
  if (sonGrup && sonGrup < 3) parcalar.push(<span key="bosluk" className="erp-toolbar__gap" />);
  return (
    <div className="erp-toolbar">
      {baslik && <span className="erp-toolbar__baslik">{baslik}</span>}
      {parcalar}
      {sag}
    </div>
  );
}

// ---------------- Kart başlığı ----------------
// Okuma: Düzenle · (özel) · Sil ┆ Kapat. Düzenleme: Kaydet ┆ Kapat. Hepsi aynı ikon düğme, her ekranda aynı yerde;
// düzenlemedeki Kapat vazgeçmektir (değişiklik varsa ekran sorar). Gövdeye ikinci Kaydet/Vazgeç konmaz.
export function KartBasligi(p: {
  kod?: string; baslik: ReactNode; durum?: ReactNode; pencere?: boolean;
  duzenle?: EylemTanimi; sil?: EylemTanimi; ozel?: ReactNode; kapat?: () => void;
  duzenlemede?: boolean; kaydet?: EylemTanimi; vazgec?: () => void;
  gezgin?: { liste: string[]; mevcut: string; git: (kimlik: string) => void };
}) {
  const g = p.gezgin ? A().gezgin(p.gezgin.liste, p.gezgin.mevcut) : null;
  const gezNeden = (yon: "onceki" | "sonraki") => !g ? "" : p.duzenlemede ? "Önce kaydet ya da vazgeç"
    : yon === "onceki" ? (g.onceki ? "Önceki kayıt · PageUp" : "İlk kayıt") : (g.sonraki ? "Sonraki kayıt · PageDown" : "Son kayıt");
  const gecis = (yon: "onceki" | "sonraki"): EylemTanimi | undefined => {
    if (!g || !p.gezgin) return undefined;
    const hedef = yon === "onceki" ? g.onceki : g.sonraki;
    return hedef && !p.duzenlemede ? { onClick: () => p.gezgin!.git(hedef) } : { pasif: gezNeden(yon) };
  };
  const e = useCevrimdisiEylemler({ duzenle: p.duzenle ?? {}, sil: p.sil ?? {}, kaydet: p.kaydet ?? {} });
  const ref = useRef<Eylemler>({});
  ref.current = p.duzenlemede
    ? { kaydet: e.kaydet, kapat: p.vazgec ? { onClick: p.vazgec } : undefined }
    : { duzenle: p.duzenle ? e.duzenle : undefined, sil: p.sil ? e.sil : undefined, kapat: p.kapat ? { onClick: p.kapat } : undefined,
        onceki: gecis("onceki"), sonraki: gecis("sonraki") };
  useEffect(() => {
    cubukYigini.push(ref);
    return () => { cubukYigini.splice(cubukYigini.indexOf(ref), 1); };
  }, []);
  return (
    <div className={"erp-card__head" + (p.pencere ? " erp-pencere-baslik" : "")}>
      <span className="erp-card__title">{p.kod && <span className="erp-card__kod">{p.kod}</span>}{p.baslik}</span>
      {p.durum}
      <span className="erp-card__actions">
        {g && (
          <>
            <span className="erp-gezgin">
              <button className="erp-ib" aria-label="Önceki kayıt" title={gezNeden("onceki")} disabled={!!gecis("onceki")?.pasif} onClick={gecis("onceki")?.onClick}><Ikon ad="i-back" /></button>
              <span className="erp-gezgin__sira">{g.sira} / {g.toplam}</span>
              <button className="erp-ib" aria-label="Sonraki kayıt" title={gezNeden("sonraki")} disabled={!!gecis("sonraki")?.pasif} onClick={gecis("sonraki")?.onClick}><Ikon ad="i-next" /></button>
            </span>
            <span className="erp-toolbar__sep" />
          </>
        )}
        {p.duzenlemede ? (
          <>
            <button className="erp-ib erp-ib--primary" aria-label="Kaydet" title={e.kaydet?.pasif || "Kaydet · Ctrl+S"} disabled={!!e.kaydet?.pasif} onClick={p.kaydet?.onClick}><Ikon ad="i-save" /></button>
            {p.vazgec && <><span className="erp-toolbar__sep" /><button className="erp-ib" aria-label="Kapat" title="Kapat · Esc (kaydedilmemiş değişiklik varsa sorar)" onClick={p.vazgec}><Ikon ad="i-close" /></button></>}
          </>
        ) : (
          <>
            {p.duzenle && <button className="erp-ib" aria-label="Düzenle" title={e.duzenle?.pasif || "Düzenle · F2"} disabled={!!e.duzenle?.pasif} onClick={p.duzenle.onClick}><Ikon ad="i-edit" /></button>}
            {p.ozel}
            {p.sil && <button className="erp-ib erp-ib--danger" aria-label="Sil" title={e.sil?.pasif || "Sil · Del"} disabled={!!e.sil?.pasif} onClick={p.sil.onClick}><Ikon ad="i-trash" /></button>}
            {p.kapat && <><span className="erp-toolbar__sep" /><button className="erp-ib" aria-label="Kapat" title="Kapat · Esc" onClick={p.kapat}><Ikon ad="i-close" /></button></>}
          </>
        )}
      </span>
    </div>
  );
}

// ---------------- Rozet, çip, sekme ----------------
export const DURUM_ROZETI: Record<string, [string, string]> = {
  "Taslak": ["info", "i-draft"], "Bekliyor": ["wait", "i-clock"], "Üretimde": ["info", "i-info"],
  "Kısmi sevk": ["wait", "i-clock"], "Tamamlandı": ["ok", "i-check"], "İptal": ["void", "i-alert"],
  "Pasif": ["idle", "i-ban"], "Onaylı": ["ok", "i-check"],
};
export function Rozet({ durum, metin }: { durum: string; metin?: string }) {
  const [tur, ikon] = DURUM_ROZETI[durum] || ["idle", "i-ban"];
  return <span className={"erp-badge" + (tur === "idle" ? "" : " erp-badge--" + tur)}><Ikon ad={ikon} />{metin ?? durum}</span>;
}
export function Cip({ secili, onClick, children }: { secili: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className="erp-cip" aria-pressed={secili} onClick={onClick}>{children}</button>;
}
export function Sekmeler({ sekmeler, secili, sec }: { sekmeler: { id: string; ad: string; sayi?: number }[]; secili: string; sec: (id: string) => void }) {
  return (
    <div className="erp-sekmeler" role="tablist">
      {sekmeler.map((s) => (
        <button key={s.id} className="erp-sekme" role="tab" aria-selected={s.id === secili} onClick={() => sec(s.id)}>
          {s.ad}{s.sayi != null && <span className="erp-sekme__sayi">{s.sayi}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------------- Menü (açılır / sağ tık / İşlemler): tek tasarım ----------------
export type MenuOge = "-" | { tur?: string; ad?: string; ikon?: string; kisayol?: string; pasif?: string; tehlike?: boolean; onClick?: () => void };
export function Menu({ ogeler, kapat, konum }: { ogeler: MenuOge[]; kapat: () => void; konum?: { x: number; y: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dis = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) kapat(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); kapat(); } };
    setTimeout(() => addEventListener("mousedown", dis));
    addEventListener("keydown", esc, true);
    ref.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    return () => { removeEventListener("mousedown", dis); removeEventListener("keydown", esc, true); };
  }, [kapat]);
  const gez = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const d = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
    const i = d.indexOf(document.activeElement as HTMLButtonElement);
    d[(i + (e.key === "ArrowDown" ? 1 : -1) + d.length) % d.length]?.focus();
  };
  return (
    <div ref={ref} className="erp-menu" role="menu" onKeyDown={gez}
      style={konum ? { position: "fixed", left: Math.min(konum.x, innerWidth - 230), top: Math.min(konum.y, innerHeight - 260) } : { position: "absolute", right: 0, top: "100%", marginTop: 4 }}>
      {ogeler.map((o, i) => {
        if (o === "-") return <div key={i} className="erp-menu__ayrac" role="separator" />;
        const t = o.tur ? A().EYLEMLER.find((x) => x.tur === o.tur) : undefined;
        const tehlike = o.tehlike || t?.tehlike;
        return (
          <button key={i} type="button" role="menuitem" disabled={!!o.pasif} title={o.pasif}
            className={"erp-menu__oge" + (tehlike ? " erp-menu__oge--tehlike" : "")}
            onClick={() => { kapat(); o.onClick?.(); }}>
            {o.ikon || t?.ikon ? <Ikon ad={(o.ikon || t?.ikon)!} /> : <span />}
            <span>{o.ad || t?.ad}</span>
            <span className="erp-menu__kisayol">{o.kisayol ?? t?.kisayol ?? ""}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------- Silme onayı ----------------
export function SilOnayi({ soru, aciklama, dugme = "Sil", onayla, vazgec }: { soru: string; aciklama?: string; dugme?: string; onayla: () => void; vazgec: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); vazgec(); } };
    addEventListener("keydown", esc, true);
    return () => removeEventListener("keydown", esc, true);
  }, [vazgec]);
  return (
    <div className="erp-perde" onMouseDown={(e) => { if (e.target === e.currentTarget) vazgec(); }}>
      <div className="erp-dialog" role="dialog" aria-modal="true" aria-labelledby="sil-soru">
        <h2 id="sil-soru">{soru}</h2>
        {aciklama && <p>{aciklama}</p>}
        <div className="erp-dialog__dip">
          <button ref={ref} className="erp-btn" onClick={vazgec}>Vazgeç</button>
          <button className="erp-btn erp-btn--danger" onClick={onayla}><Ikon ad="i-trash" />{dugme}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Aramalı seçici: tasarım sistemindeki tek uygulamayı bağlar ----------------
export function AramaliSecici<T>(p: AtolyeSeciciAyar<T> & { style?: React.CSSProperties }) {
  const kok = useRef<HTMLDivElement>(null);
  const son = useRef(p);
  son.current = p;
  useEffect(() => {
    if (!kok.current) return;
    A().aramaliSecici<T>(kok.current, { ...p, sec: (k) => son.current.sec?.(k), yeni: p.yeni ? (y) => son.current.yeni?.(y) : undefined });
    // Kaynak değişince yeniden kurulur; seçim dışarıdan `secili` ile gelir.
  }, [p.kaynak, p.secili]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={kok} style={p.style} />;
}

// ---------------- Boş durum, şerit, alan ----------------
export function BosDurum({ baslik, aciklama, dugme }: { baslik: string; aciklama: string; dugme?: ReactNode }) {
  return <div className="erp-bos"><Ikon ad="i-draft" /><b>{baslik}</b><span>{aciklama}</span>{dugme}</div>;
}
export function Alan({ etiket, id, genislik, hata, yardim, children }: { etiket: string; id?: string; genislik?: string; hata?: string; yardim?: string; children: ReactNode }) {
  return (
    <div className={"erp-field" + (genislik ? " " + genislik : "") + (hata ? " erp-field--hata" : "")}>
      <label htmlFor={id}>{etiket}</label>
      {children}
      {hata ? <span className="erp-field__hata">{hata}</span> : yardim ? <span className="erp-field__yardim">{yardim}</span> : null}
    </div>
  );
}
export function useSagTik<T>() {
  const [menu, setMenu] = useState<{ x: number; y: number; kayit: T } | null>(null);
  return { menu, ac: (e: React.MouseEvent, kayit: T) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, kayit }); }, kapat: () => setMenu(null) };
}

// ---------------- Kaydedilmemiş değişiklik sorusu ----------------
// Düzenlemede Vazgeç/Kapat'a basılınca: "Kaydet · Kaydetmeden çık · Düzenlemeye dön". Değişiklik sessizce kaybolmaz.
export function KaydetSorusu({ kaydet, at, don }: { kaydet: () => void; at: () => void; don: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); don(); } };
    addEventListener("keydown", esc, true);
    return () => removeEventListener("keydown", esc, true);
  }, [don]);
  return (
    <div className="erp-perde" onMouseDown={(e) => { if (e.target === e.currentTarget) don(); }}>
      <div className="erp-dialog" role="dialog" aria-modal="true" aria-labelledby="kaydet-soru">
        <h2 id="kaydet-soru">Değişiklikler kaydedilmedi</h2>
        <p>Kaydetmeden çıkarsan bu karttaki değişiklikler kaybolur.</p>
        <div className="erp-dialog__dip">
          <button ref={ref} className="erp-btn" onClick={don}>Düzenlemeye dön</button>
          <button className="erp-btn" onClick={at}>Kaydetmeden çık</button>
          <button className="erp-btn erp-btn--primary" onClick={kaydet}><Ikon ad="i-save" />Kaydet</button>
        </div>
      </div>
    </div>
  );
}
