// Ekranda gösterilen türetilmiş sayılar. Prototipte burada hesaplanır; gerçek uygulamada
// bu değerler görünümlerden (v_siparis_durum) hazır gelir ve bu dosya kalkar.
import type { Kalem, Siparis } from "./tipler";

export const topla = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + (b || 0), 0);
export const kalemCift = (k: Kalem) => topla(k.bedenler);
export const kalemTutar = (k: Kalem) => kalemCift(k) * k.fiyat;
export const siparisCift = (s: Siparis) => s.kalemler.reduce((a, k) => a + kalemCift(k), 0);
export const siparisSevk = (s: Siparis) => s.kalemler.reduce((a, k) => a + topla(k.sevk), 0);
export const siparisTutar = (s: Siparis) => s.kalemler.reduce((a, k) => a + kalemTutar(k), 0);
export const tl = (n: number) => window.Atolye.sayiYaz(n, 2) + " ₺";
export const sayi = (n: number) => window.Atolye.sayiYaz(n);
