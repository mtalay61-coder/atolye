// Tasarım sisteminin bundle.js'i (window.Atolye) için tipler. Davranış orada; prototip yalnız çağırır.
export {};

declare global {
  interface AtolyeEylem {
    tur: string;
    ad: string;
    ikon: string;
    kisayol: string | null;
    grup: number;
    birincil?: boolean;
    tehlike?: boolean;
  }
  interface AtolyeSeciciAyar<T> {
    kaynak: T[];
    alanlar: (k: T) => string[];
    kod?: (k: T) => string;
    alt?: (k: T) => string;
    ek?: (k: T) => string;
    etiket?: string;
    ipucu?: string;
    id?: string;
    son?: T[];
    secili?: T | null;
    enCok?: number;
    yeni?: (yazilan: string) => void;
    sec?: (k: T | null) => void;
    barkodlaSec?: boolean;
  }
  interface AtolyeSecici<T> {
    sec: (k: T) => void;
    deger: () => T | null;
    odak: () => void;
  }
  type AtolyeMenuOge = "-" | { baslik: string } | { tur?: string; ad?: string; ikon?: string; kisayol?: string; pasif?: string; tehlike?: boolean };
  interface Window {
    Atolye: {
      EYLEMLER: AtolyeEylem[];
      KISAYOLLAR: Record<string, string>;
      TEMALAR: { id: string; ad: string; aciklama: string }[];
      ikon: (ad: string) => string;
      rozet: (durum: string, metin: string) => string;
      bildirimSuresi: (metin: string, geriAl?: boolean) => number;
      katla: (s: string) => string;
      eslesme: (sorgu: string, alanlar: string[], kod?: string | null) => { puan: number; vurgular: number[][] } | null;
      sayiYaz: (n: number, ondalik?: number) => string;
      aramaliSecici: <T>(kok: HTMLElement, ayar: AtolyeSeciciAyar<T>) => AtolyeSecici<T>;
      temaUygula: (id: string) => string;
      menuHtml: (ogeler: AtolyeMenuOge[]) => string;
    };
  }
}
