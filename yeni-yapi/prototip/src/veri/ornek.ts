// ÖRNEK VERİ — gerçek kayıt değildir. Ekranların dolu hâlini görmek için.
import type { Cari, Kalem, Siparis, Urun } from "./tipler";

export const BEDENLER = ["39", "40", "41", "42", "43"];

export const CARILER: Cari[] = [
  { id: "c1", kod: "CAR-0012", ad: "Çevik Deri Ltd. Şti.", il: "İstanbul", roller: ["Tedarikçi"], bakiye: -12450 },
  { id: "c2", kod: "CAR-0019", ad: "Talay Ayakkabı San. Tic.", il: "Konya", roller: ["Müşteri"], bakiye: 38600 },
  { id: "c3", kod: "CAR-0031", ad: "Işık Mağazaları", il: "İzmir", roller: ["Müşteri"], bakiye: 0 },
  { id: "c4", kod: "CAR-0042", ad: "Kardeşler Deri Saraciye", il: "İstanbul", roller: ["Müşteri"], bakiye: 7440 },
  { id: "c5", kod: "CAR-0057", ad: "Ege Toptan Ayakkabı", il: "Manisa", roller: ["Müşteri"], bakiye: -1200 },
  { id: "c6", kod: "CAR-0063", ad: "Yıldız Mağazaları", il: "Ankara", roller: ["Müşteri"], bakiye: 9300 },
  { id: "c7", kod: "CAR-0071", ad: "Deri Dünyası Tekstil", il: "Bursa", roller: ["Müşteri", "Tedarikçi"], bakiye: 2150 },
  { id: "c8", kod: "CAR-0080", ad: "Hüseyin Kaya (Kalfa)", il: "Konya", roller: ["Fasoncu"], bakiye: -3600 },
];

export const URUNLER: Urun[] = [
  { id: "u1", kod: "8690000100586", ad: "Bot", renk: "1058 - Taba Süet", tip: "Mamul", stok: 36, fiyat: 155, olcuSeti: BEDENLER },
  { id: "u2", kod: "8690000100036", ad: "Bot", renk: "1003 - Siyah", tip: "Mamul", stok: -4, fiyat: 150, olcuSeti: BEDENLER },
  { id: "u3", kod: "8690000100593", ad: "Çizme", renk: "1058 - Taba Süet", tip: "Mamul", stok: 12, fiyat: 210, olcuSeti: BEDENLER },
  { id: "u4", kod: "8690000100609", ad: "Çizme", renk: "1003 - Siyah", tip: "Mamul", stok: 20, fiyat: 205, olcuSeti: BEDENLER },
  { id: "u5", kod: "8690000200111", ad: "Deri", renk: "Siyah Floter", tip: "Hammadde", stok: 212, fiyat: 14 },
  { id: "u6", kod: "8690000200128", ad: "Deri", renk: "Taba Süet", tip: "Hammadde", stok: 88, fiyat: 16 },
  { id: "u7", kod: "8690000300015", ad: "Taban", renk: "Kauçuk", tip: "Hammadde", stok: 140, fiyat: 22 },
];

const k = (id: string, u: Urun, b: number[], s: number[] = [0, 0, 0, 0, 0]): Kalem => ({
  id, urunId: u.id, urunAd: u.ad, renk: u.renk ?? "", fiyat: u.fiyat,
  bedenler: Object.fromEntries(BEDENLER.map((x, i) => [x, b[i]])),
  sevk: Object.fromEntries(BEDENLER.map((x, i) => [x, s[i]])),
});

export const SIPARISLER: Siparis[] = [
  { id: "s1", no: "SAT-2026-000118", cariId: "c2", tarih: "20.10.2026", teslim: "30.10.2026", durum: "Üretimde", kalemler: [k("k1", URUNLER[0], [12, 24, 24, 12, 0]), k("k2", URUNLER[1], [8, 16, 16, 8, 0])] },
  { id: "s2", no: "SAT-2026-000121", cariId: "c4", tarih: "22.10.2026", teslim: "02.11.2026", durum: "Kısmi sevk", kalemler: [k("k3", URUNLER[0], [6, 12, 12, 6, 0], [6, 12, 6, 0, 0]), k("k4", URUNLER[2], [0, 6, 6, 0, 0])], not: "Kutu etiketleri müşterinin barkoduyla." },
  { id: "s3", no: "SAT-2026-000122", cariId: "c6", tarih: "23.10.2026", teslim: "05.11.2026", durum: "Bekliyor", kalemler: [k("k5", URUNLER[3], [6, 12, 12, 6, 6]), k("k6", URUNLER[1], [4, 6, 6, 4, 0])] },
  { id: "s4", no: "SAT-2026-000123", cariId: "c1", tarih: "25.10.2026", teslim: "06.11.2026", durum: "Taslak", kalemler: [k("k7", URUNLER[0], [6, 12, 12, 6, 0])] },
  { id: "s5", no: "SAT-2026-000124", cariId: "c5", tarih: "15.10.2026", teslim: "25.10.2026", durum: "Tamamlandı", kalemler: [k("k8", URUNLER[2], [12, 18, 18, 12, 12], [12, 18, 18, 12, 12])] },
  { id: "s6", no: "SAT-2026-000125", cariId: "c3", tarih: "18.10.2026", teslim: "28.10.2026", durum: "İptal", kalemler: [] },
  { id: "s7", no: "SAT-2026-000126", cariId: "c7", tarih: "27.10.2026", teslim: "12.11.2026", durum: "Bekliyor", kalemler: [k("k9", URUNLER[3], [4, 8, 8, 4, 0]), k("k10", URUNLER[0], [6, 6, 6, 6, 0])] },
];
