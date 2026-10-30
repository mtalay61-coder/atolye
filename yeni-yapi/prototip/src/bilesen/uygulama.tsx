// Uygulama çapındaki durum: adres (hash), tema, oturum, çevrimdışı denemesi, bildirim.
// Hiçbiri kalıcı kayıt değildir; yalnız tema bu tarayıcıda hatırlanır (kişisel kolaylık).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const A = () => window.Atolye;

// ---- Adres: #siparisler, #siparis-SAT-2026-000121, #siparis-yeni, #tanimlar, #modul-SIP
// Yalnız harf, rakam ve tire: GitHub Pages'te de önizleme sayfasında da aynı çalışır.
export function useAdres(): [string, (a: string) => void] {
  const oku = () => decodeURIComponent(location.hash.replace(/^#/, ""));
  const [adres, setAdres] = useState(oku);
  useEffect(() => {
    const f = () => setAdres(oku());
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  const git = useCallback((a: string) => { location.hash = a; }, []);
  return [adres, git];
}

type Bildirim = { id: number; metin: string; ikon: string; geriAl?: () => void };
type Baglam = {
  tema: string;
  temaSec: (id: string) => void;
  cevrimdisi: boolean;
  cevrimdisiYap: (v: boolean) => void;
  kullanici: string | null;
  girisYap: (ad: string) => void;
  cikisYap: () => void;
  bildir: (metin: string, secenek?: { ikon?: string; geriAl?: () => void }) => void;
  git: (a: string) => void;
  // Kayıt gezgini için: her listenin o anki sırası ve son bakılan kayıt (tür: "siparis", "cari"…).
  gezinti: Record<string, { liste?: string[]; son?: string }>;
  gezintiAyarla: (tur: string, d: { liste?: string[]; son?: string }) => void;
};
const UygulamaBaglami = createContext<Baglam | null>(null);
export const useUygulama = () => {
  const b = useContext(UygulamaBaglami);
  if (!b) throw new Error("UygulamaSaglayici dışında");
  return b;
};

export function UygulamaSaglayici({ children, git }: { children: ReactNode; git: (a: string) => void }) {
  const [tema, setTema] = useState(() => {
    let k: string | null = null;
    try { k = localStorage.getItem("prototip-tema"); } catch { /* özel pencere */ }
    return A().temaUygula(k || "light");
  });
  const temaSec = useCallback((id: string) => {
    const g = A().temaUygula(id);
    setTema(g);
    try { localStorage.setItem("prototip-tema", g); } catch { /* yoksay */ }
  }, []);
  const [cevrimdisi, cevrimdisiYap] = useState(false);
  const [kullanici, setKullanici] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<Bildirim | null>(null);
  const zaman = useRef<number>();
  const bildir = useCallback((metin: string, s?: { ikon?: string; geriAl?: () => void }) => {
    clearTimeout(zaman.current);
    setBildirim({ id: Date.now(), metin, ikon: s?.ikon ?? "i-check", geriAl: s?.geriAl });
    zaman.current = window.setTimeout(() => setBildirim(null), A().bildirimSuresi(metin, !!s?.geriAl));
  }, []);
  const [gezinti, setGezinti] = useState<Baglam["gezinti"]>({});
  const gezintiAyarla = useCallback((tur: string, d: { liste?: string[]; son?: string }) => {
    setGezinti((g) => {
      const eski = g[tur] ?? {};
      const yeni = { ...eski, ...d };
      if (eski.son === yeni.son && (eski.liste === yeni.liste || (eski.liste && yeni.liste && eski.liste.join() === yeni.liste.join()))) return g;
      return { ...g, [tur]: yeni };
    });
  }, []);
  const deger: Baglam = {
    tema, temaSec, cevrimdisi, cevrimdisiYap, kullanici,
    girisYap: (ad) => { setKullanici(ad); git("siparisler"); },
    cikisYap: () => { setKullanici(null); git(""); },
    bildir, git, gezinti, gezintiAyarla,
  };
  return (
    <UygulamaBaglami.Provider value={deger}>
      {children}
      {bildirim && (
        <div className="erp-toast" role="status" key={bildirim.id} onClick={() => setBildirim(null)} title="Kapatmak için dokun">
          <span dangerouslySetInnerHTML={{ __html: A().ikon(bildirim.ikon) }} style={{ display: "contents" }} />
          <span className="erp-toast__metin">{bildirim.metin}</span>
          {bildirim.geriAl && (
            <button className="erp-toast__geri" onClick={(e) => { e.stopPropagation(); bildirim.geriAl?.(); setBildirim(null); }}>Geri al</button>
          )}
        </div>
      )}
    </UygulamaBaglami.Provider>
  );
}
