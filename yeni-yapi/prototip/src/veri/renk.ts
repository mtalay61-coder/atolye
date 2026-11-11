// RENK KURALLARI — ürün rengi ve hammadde değişkeninin bütün mantığı burada, ekranlardan bağımsız ve saf.
// Bağlama zamanı aynı kurallar veritabanında da durur (benzersiz indeksler, check, komut fonksiyonu); buradaki
// denetim kullanıcıya erken ve anlaşılır söylemek içindir, tek kapı değildir.
import type { Degisken, DegiskenTuru, UrunRenk } from "./tipler";

export const EN_COK_RENK = 6;
const A = () => window.Atolye;
const ayni = (a: string, b: string) => A().katla(a.trim()) === A().katla(b.trim());

// Renk sayısı saklanmaz: 1 renkli rengin hücresi yoktur, çok renklide hücre sayısıdır.
export const renkSayisi = (r: Pick<UrunRenk, "bilesenler">) => Math.max(1, r.bilesenler.length);
export const temelMi = (r: Pick<UrunRenk, "bilesenler">) => r.bilesenler.length === 0;

// Kutunun dilimleri: 1 renklide kendi hex'i, çok renklide hücrelerin hex'i (sırasıyla).
export function dilimler(r: Pick<UrunRenk, "hex" | "bilesenler">, tum: UrunRenk[]): string[] {
  if (!r.bilesenler.length) return r.hex ? [r.hex] : [];
  return r.bilesenler.map((id) => tum.find((x) => x.id === id)?.hex ?? "").filter(Boolean);
}

// KOD NUMARASI (kullanıcı kararı): ürün rengi 4 haneli, 1000'den; hammadde değişkeni 3 haneli, 001'den ve her tür
// kendi içinde sayar (Deri rengi 001, 002…; Deri kalınlığı 001…). Kodu kullanıcı yazmaz: kayıtta sunucudaki numaratör
// verir (aynı anda iki kişi kaydederse çakışmasın). Ekrandaki numara tahmindir, "Kaydedince verilir" yazar.
// Kod hiç değişmez; ad değişebilir. Hane dolarsa (9999 / 999) yeni kayıt açılmaz, nedeni söylenir.
export const KOD_KURALI = { urunRenk: { hane: 4, ilk: 1000 }, degisken: { hane: 3, ilk: 1 } } as const;
export function sonrakiKod(kodlar: string[], kural: { hane: number; ilk: number }): string | null {
  const sayilar = kodlar.filter((k) => /^\d+$/.test(k) && k.length === kural.hane).map(Number);
  const n = Math.max(kural.ilk - 1, ...sayilar) + 1;
  return String(n).length > kural.hane ? null : String(n).padStart(kural.hane, "0");
}
export const sonrakiUrunRenkKodu = (tum: UrunRenk[]) => sonrakiKod(tum.map((x) => x.kod), KOD_KURALI.urunRenk);
export const sonrakiDegiskenKodu = (tum: Degisken[], turId: string) => sonrakiKod(tum.filter((x) => x.turId === turId).map((x) => x.kod), KOD_KURALI.degisken);

// Ad önerisi: hücrelerin adları sırayla, tireyle (Siyah-Beyaz). Kullanıcı adı elle değiştirmediyse öneri hücreleri izler.
export function adOnerisi(hucreler: (string | null)[], tum: UrunRenk[]): string | null {
  const r = hucreler.map((id) => tum.find((x) => x.id === id));
  if (r.length < 2 || r.some((x) => !x)) return null;
  return r.map((x) => x!.ad).join("-");
}

// Bir 1 renkli rengin hücre olarak geçtiği kombinasyonlar.
export const kombinasyonlari = (id: string, tum: UrunRenk[]) => tum.filter((x) => x.bilesenler.includes(id));

// Kilit: varyantta kullanılan rengin hücreleri değişmez (stok ve barkodun anlamı korunur). Kod zaten hiç değişmez.
// 1 renkli bir renk bir kombinasyonda hücreyse çok renkliye çevrilemez (kombinasyonun içi değişirdi).
export function kilit(r: UrunRenk | null, tum: UrunRenk[]): { hucre?: string } {
  if (!r || !r.id) return {};
  const k: { hucre?: string } = {};
  if (r.kullanim > 0) {
    k.hucre = `${r.kullanim} varyantta kullanılıyor: renk sayısı ve hücreler değişmez. Farklı bir kombinasyon için yeni renk aç`;
  } else if (temelMi(r) && kombinasyonlari(r.id, tum).length) {
    k.hucre = `${kombinasyonlari(r.id, tum).length} kombinasyonda hücre: çok renkliye çevrilemez`;
  }
  return k;
}

export type UrunRenkTaslak = { id: string; kod: string; ad: string; hex: string; resim?: string; sayi: number; hucreler: (string | null)[] };
export type UrunRenkHata = { kod?: string; ad?: string; hex?: string; hucreler?: (string | undefined)[]; kombinasyon?: UrunRenk };

export function urunRengiDenetle(t: UrunRenkTaslak, tum: UrunRenk[]): UrunRenkHata {
  const h: UrunRenkHata = {};
  const digerleri = tum.filter((x) => x.id !== t.id);
  if (!t.kod) h.kod = "Kod numarası doldu (9999); yöneticiye haber ver";
  if (!t.ad.trim()) h.ad = "Ad gerekli";
  else { const x = digerleri.find((y) => ayni(y.ad, t.ad)); if (x) h.ad = `Bu ad ${x.kod} renginde${x.pasif ? " (pasif)" : ""}`; }
  if (t.sayi === 1) {
    if (t.hex && !/^#[0-9a-f]{6}$/i.test(t.hex)) h.hex = "#RRGGBB biçiminde yaz, ör. #1D1D1D";
    return h;
  }
  const hucre: (string | undefined)[] = t.hucreler.map((id, i) => {
    if (!id) return `${i + 1}. renk seçilmedi`;
    const once = t.hucreler.indexOf(id);
    if (once < i) return `Bu renk ${once + 1}. hücrede seçili`;
    const r = tum.find((x) => x.id === id);
    if (!r || !temelMi(r)) return "Yalnız 1 renkli renk seçilir";
    return undefined;
  });
  if (hucre.some(Boolean)) h.hucreler = hucre;
  // Aynı SIRALI kombinasyon ikinci kez tanımlanamaz; Siyah-Beyaz ile Beyaz-Siyah farklıdır (1. renk ana renk).
  else { const x = digerleri.find((y) => y.bilesenler.join() === t.hucreler.join()); if (x) h.kombinasyon = x; }
  // Kombinasyon zaten varsa önerilen ad da onunkiyle çakışır; aynı şeyi iki kez söylemeyelim.
  if (h.kombinasyon && h.ad && ayni(h.kombinasyon.ad, t.ad)) delete h.ad;
  return h;
}
export const hataVarMi = (h: UrunRenkHata) => !!(h.kod || h.ad || h.hex || h.hucreler || h.kombinasyon);

// ---- Hammadde değişkeni: kod ve ad TÜR İÇİNDE tekil; tür kayıttan sonra değişmez.
export type DegiskenHata = { kod?: string; ad?: string; hex?: string; tur?: string };
export function degiskenDenetle(t: Degisken, tum: Degisken[], tur: DegiskenTuru | undefined): DegiskenHata {
  const h: DegiskenHata = {};
  if (!tur) h.tur = "Tür seç";
  const ayniTur = tum.filter((x) => x.turId === t.turId && x.id !== t.id);
  if (tur && !t.kod) h.kod = `${tur.ad} için kod numarası doldu (999)`;
  if (!t.ad.trim()) h.ad = `${tur?.etiket ?? "Ad"} gerekli`;
  else { const x = ayniTur.find((y) => ayni(y.ad, t.ad)); if (x) h.ad = `Bu ${tur?.etiket.toLocaleLowerCase("tr") ?? "ad"} ${x.kod} değerinde`; }
  if (tur?.gorsel === "renk" && t.hex && !/^#[0-9a-f]{6}$/i.test(t.hex)) h.hex = "#RRGGBB biçiminde yaz";
  return h;
}

export type TurHata = { ad?: string; etiket?: string };
export function turDenetle(t: DegiskenTuru, tum: DegiskenTuru[]): TurHata {
  const h: TurHata = {};
  if (!t.ad.trim()) h.ad = "Tür adı gerekli";
  else { const x = tum.find((y) => y.id !== t.id && ayni(y.ad, t.ad)); if (x) h.ad = "Bu adla bir tür var"; }
  if (!t.etiket.trim()) h.etiket = "Etiket gerekli: kartta görünen ad (Renk, Kalınlık…)";
  return h;
}
