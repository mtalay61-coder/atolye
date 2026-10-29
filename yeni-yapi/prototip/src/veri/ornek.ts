// ÖRNEK VERİ — gerçek kayıt değildir. Ekranların dolu hâlini görmek için.
import type { Cari, CariHareket, Degisken, DegiskenTuru, Kalem, Siparis, Urun, UrunRenk } from "./tipler";

export const BEDENLER = ["39", "40", "41", "42", "43"];

export const CARILER: Cari[] = [
  { id: "c1", kod: "CAR-0012", ad: "Çevik Deri Ltd. Şti.", il: "İstanbul", roller: ["Tedarikçi"], bakiye: 0, paraBirimi: "TRY" },
  { id: "c2", kod: "CAR-0019", ad: "Talay Ayakkabı San. Tic.", il: "Konya", roller: ["Müşteri"], bakiye: 0, paraBirimi: "TRY" },
  { id: "c3", kod: "CAR-0031", ad: "Işık Mağazaları", il: "İzmir", roller: ["Müşteri"], bakiye: 0, paraBirimi: "TRY" },
  { id: "c4", kod: "CAR-0042", ad: "Kardeşler Deri Saraciye", il: "İstanbul", roller: ["Müşteri"], bakiye: 0, paraBirimi: "TRY" },
  { id: "c5", kod: "CAR-0057", ad: "Ege Toptan Ayakkabı", il: "Manisa", roller: ["Müşteri"], bakiye: 0, paraBirimi: "TRY" },
  { id: "c6", kod: "CAR-0063", ad: "Yıldız Mağazaları", il: "Ankara", roller: ["Müşteri"], bakiye: 0, paraBirimi: "TRY" },
  { id: "c7", kod: "CAR-0071", ad: "Deri Dünyası Tekstil", il: "Bursa", roller: ["Müşteri", "Tedarikçi"], bakiye: 0, paraBirimi: "TRY" },
  { id: "c8", kod: "CAR-0080", ad: "Hüseyin Kaya (Kalfa)", il: "Konya", roller: ["Fasoncu"], bakiye: 0, paraBirimi: "TRY" },
];

export const URUNLER: Urun[] = [
  { id: "u1", kod: "8690000100586", ad: "Bot", renk: "1002 - Taba Süet", tip: "Mamul", stok: 36, fiyat: 155, olcuSeti: BEDENLER },
  { id: "u2", kod: "8690000100036", ad: "Bot", renk: "1000 - Siyah", tip: "Mamul", stok: -4, fiyat: 150, olcuSeti: BEDENLER },
  { id: "u3", kod: "8690000100593", ad: "Çizme", renk: "1002 - Taba Süet", tip: "Mamul", stok: 12, fiyat: 210, olcuSeti: BEDENLER },
  { id: "u4", kod: "8690000100609", ad: "Çizme", renk: "1000 - Siyah", tip: "Mamul", stok: 20, fiyat: 205, olcuSeti: BEDENLER },
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

// ---- Cari ayrıntıları ve hareketleri (bakiye hareketlerden hesaplanır, elle yazılmaz) ----
const AYRINTI: Record<string, Partial<Cari>> = {
  c1: { telefon: "0212 555 41 12", eposta: "satis@cevikderi.com.tr", yetkili: "Murat Çevik", vergiDairesi: "Zeytinburnu", vergiNo: "2310045871", adres: "Kazlıçeşme Deri Sanayi Sitesi 4. Blok No: 12, Zeytinburnu", paraBirimi: "TRY" },
  c2: { telefon: "0332 342 18 90", eposta: "siparis@talayayakkabi.com", yetkili: "Kemal Talay", vergiDairesi: "Selçuk", vergiNo: "8150023344", adres: "Büsan Organize San. Bölgesi Fevzi Çakmak Mah. 10712 Sk. No: 8, Karatay", fiyatGrubu: "Bayi", paraBirimi: "TRY", not: "Ödemeler ay sonu havale; çek kabul etmiyor." },
  c3: { telefon: "0232 441 07 30", yetkili: "Selin Işık", vergiDairesi: "Konak", vergiNo: "4780012299", adres: "Kemeraltı Çarşısı Anafartalar Cad. No: 211, Konak", fiyatGrubu: "Perakende", paraBirimi: "TRY", pasif: true, not: "2026 başında kapandı." },
  c4: { telefon: "0212 638 22 70", eposta: "info@kardeslerderi.com", yetkili: "Hasan Kardeş", vergiDairesi: "Merter", vergiNo: "5320098812", adres: "Merter Keresteciler Sitesi Fatih Cad. No: 41, Güngören", fiyatGrubu: "Toptan", paraBirimi: "TRY" },
  c5: { telefon: "0236 233 55 10", yetkili: "Ayşe Ege", vergiDairesi: "Mesir", vergiNo: "3340077120", adres: "Yarhasanlar Mah. 1453 Sk. No: 3, Şehzadeler", fiyatGrubu: "Toptan", paraBirimi: "TRY" },
  c6: { telefon: "0312 418 90 00", eposta: "alim@yildizmagazalari.com.tr", yetkili: "Barış Yıldız", vergiDairesi: "Çankaya", vergiNo: "9870033215", adres: "Kızılay Atatürk Bulvarı No: 112, Çankaya", fiyatGrubu: "Bayi", paraBirimi: "TRY" },
  c7: { telefon: "0224 211 76 54", yetkili: "Okan Dünya", vergiDairesi: "Osmangazi", vergiNo: "6650014478", adres: "Deri Sanayi Sitesi C Blok No: 7, Osmangazi", fiyatGrubu: "Toptan", paraBirimi: "EUR" },
  c8: { telefon: "0533 412 87 66", vergiNo: "12345678950", adres: "Karatay, Konya", paraBirimi: "TRY", not: "Kalfa işçiliği; haftalık ödeme." },
};
CARILER.forEach((c) => Object.assign(c, { paraBirimi: "TRY" }, AYRINTI[c.id] ?? {}));

let hn = 0;
const h = (cariId: string, tarih: string, belge: string, aciklama: string, borc: number, alacak: number): CariHareket =>
  ({ id: "h" + ++hn, cariId, tarih, belge, aciklama, borc, alacak });
export const CARI_HAREKETLERI: CariHareket[] = [
  h("c1", "02.10.2026", "ALS-2026-000311", "Deri · Siyah Floter 400 ayak", 0, 5600),
  h("c1", "09.10.2026", "ODM-2026-000094", "Havale · Ziraat", 3200, 0),
  h("c1", "21.10.2026", "ALS-2026-000340", "Deri · Taba Süet 600 ayak", 0, 10050),
  h("c2", "05.10.2026", "SAT-2026-000097", "Bot · Taba Süet 120 çift", 22400, 0),
  h("c2", "12.10.2026", "THS-2026-000150", "Havale · İş Bankası", 0, 14000),
  h("c2", "24.10.2026", "SAT-2026-000112", "Bot · Siyah 192 çift", 30200, 0),
  h("c4", "11.10.2026", "SAT-2026-000101", "Bot · Taba Süet 48 çift", 7440, 0),
  h("c4", "27.10.2026", "SAT-2026-000121", "Kısmi sevk · 24 çift", 3720, 0),
  h("c4", "28.10.2026", "THS-2026-000171", "Nakit · Kasa", 0, 3720),
  h("c5", "14.10.2026", "SAT-2026-000124", "Çizme · Taba Süet 72 çift", 15120, 0),
  h("c5", "25.10.2026", "CEK-2026-000033", "Çek · Vakıfbank 15.12.2026", 0, 16320),
  h("c6", "18.10.2026", "SAT-2026-000105", "Çizme · Siyah 36 çift", 7380, 0),
  h("c6", "27.10.2026", "SAT-2026-000119", "Bot · Siyah 12 çift", 1920, 0),
  h("c7", "20.10.2026", "SAT-2026-000108", "Bot · Taba Süet 24 çift (EUR)", 2150, 0),
  h("c8", "17.10.2026", "IST-2026-000702", "Kalfa işçiliği · 120 çift", 0, 2400),
  h("c8", "24.10.2026", "IST-2026-000751", "Kalfa işçiliği · 96 çift", 0, 1920),
  h("c8", "25.10.2026", "ODM-2026-000101", "Nakit · Kasa", 720, 0),
];
// Bakiye görünümün (v_cari_bakiye) yapacağı iş: hareketlerin borç − alacak toplamı.
CARILER.forEach((c) => { c.bakiye = CARI_HAREKETLERI.filter((x) => x.cariId === c.id).reduce((a, x) => a + x.borc - x.alacak, 0); });

export const FIYAT_GRUPLARI = ["Perakende", "Toptan", "Bayi", "İhracat"];
export const ILLER = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt","Sinop","Sivas","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"];

// Ürün renkleri: önce 1 renkli temel renkler, sonra onlardan kurulan kombinasyonlar.
export const URUN_RENKLERI: UrunRenk[] = [
  { id: "r1", kod: "1000", ad: "Siyah", hex: "#1d1d1d", bilesenler: [], kullanim: 12 },
  { id: "r2", kod: "1001", ad: "Beyaz", hex: "#f4f1ea", bilesenler: [], kullanim: 4 },
  { id: "r3", kod: "1002", ad: "Taba Süet", hex: "#8a5a33", bilesenler: [], kullanim: 8 },
  { id: "r4", kod: "1003", ad: "Lacivert", hex: "#1f2a44", bilesenler: [], kullanim: 0 },
  { id: "r5", kod: "1004", ad: "Kırmızı", hex: "#a3242b", bilesenler: [], kullanim: 2 },
  { id: "r6", kod: "1005", ad: "Gri", hex: "#8c8c88", bilesenler: [], kullanim: 0 },
  { id: "r7", kod: "1006", ad: "Bej", hex: "#d8c3a5", bilesenler: [], kullanim: 0, pasif: true },
  { id: "r11", kod: "1010", ad: "Kahverengi", hex: "#4e3524", bilesenler: [], kullanim: 6 },
  { id: "r12", kod: "1011", ad: "Antrasit", hex: "#383a3c", bilesenler: [], kullanim: 3 },
  { id: "r13", kod: "1012", ad: "Haki", hex: "#6b6a3f", bilesenler: [], kullanim: 0 },
  { id: "r14", kod: "1013", ad: "Bordo", hex: "#5e1a24", bilesenler: [], kullanim: 2 },
  { id: "r15", kod: "1014", ad: "Vizon", hex: "#9a8574", bilesenler: [], kullanim: 4 },
  { id: "r16", kod: "1015", ad: "Krem", hex: "#efe4cc", bilesenler: [], kullanim: 1 },
  { id: "r17", kod: "1016", ad: "Pudra", hex: "#e3b9b0", bilesenler: [], kullanim: 0 },
  { id: "r18", kod: "1017", ad: "Hardal", hex: "#c2922c", bilesenler: [], kullanim: 0 },
  { id: "r19", kod: "1018", ad: "Gümüş", hex: "#b8b8b4", bilesenler: [], kullanim: 1 },
  { id: "r20", kod: "1019", ad: "Altın", hex: "#b88a3b", bilesenler: [], kullanim: 0 },
  { id: "r8", kod: "1007", ad: "Siyah-Beyaz", bilesenler: ["r1", "r2"], kullanim: 3 },
  { id: "r9", kod: "1008", ad: "Taba Süet-Siyah", bilesenler: ["r3", "r1"], kullanim: 0 },
  { id: "r10", kod: "1009", ad: "Denizci", bilesenler: ["r4", "r2", "r5"], kullanim: 1 },
  { id: "r21", kod: "1020", ad: "Kahverengi-Krem", bilesenler: ["r11", "r16"], kullanim: 2 },
  { id: "r22", kod: "1021", ad: "Siyah-Gümüş", bilesenler: ["r1", "r19"], kullanim: 0 },
  { id: "r23", kod: "1022", ad: "Vizon-Kahverengi-Krem", bilesenler: ["r15", "r11", "r16"], kullanim: 0 },
];

// Hammadde değişkenleri: türün etiketi kartta görünen addır. Kalınlık ve boy renk değildir, görseli yoktur.
export const DEGISKEN_TURLERI: DegiskenTuru[] = [
  { id: "dt1", ad: "Deri rengi", etiket: "Renk", gorsel: "renk" },
  { id: "dt2", ad: "Taban rengi", etiket: "Renk", gorsel: "renk" },
  { id: "dt3", ad: "Deri kalınlığı", etiket: "Kalınlık", gorsel: "yok" },
  { id: "dt4", ad: "Fermuar boyu", etiket: "Boy", gorsel: "yok" },
  { id: "dt5", ad: "İp rengi", etiket: "Renk", gorsel: "renk" },
];
export const DEGISKENLER: Degisken[] = [
  { id: "d1", turId: "dt1", kod: "001", ad: "Siyah Floter", hex: "#222222", kullanim: 6 },
  { id: "d2", turId: "dt1", kod: "002", ad: "Taba Süet", hex: "#8a5a33", kullanim: 4 },
  { id: "d3", turId: "dt1", kod: "003", ad: "Beyaz Napa", hex: "#f1ece2", kullanim: 0 },
  { id: "d4", turId: "dt2", kod: "001", ad: "Siyah", hex: "#1a1a1a", kullanim: 5 },
  { id: "d5", turId: "dt2", kod: "002", ad: "Beyaz", hex: "#f5f5f0", kullanim: 2 },
  { id: "d6", turId: "dt2", kod: "003", ad: "Naturel", hex: "#d9c49a", kullanim: 0 },
  { id: "d7", turId: "dt3", kod: "001", ad: "1,2 mm", kullanim: 3 },
  { id: "d8", turId: "dt3", kod: "002", ad: "1,4 mm", kullanim: 5 },
  { id: "d9", turId: "dt3", kod: "003", ad: "1,6 mm", kullanim: 0 },
  { id: "d10", turId: "dt4", kod: "001", ad: "15 cm", kullanim: 2 },
  { id: "d11", turId: "dt4", kod: "002", ad: "20 cm", kullanim: 0 },
  { id: "d12", turId: "dt5", kod: "001", ad: "Siyah ip", hex: "#202020", kullanim: 4 },
  { id: "d13", turId: "dt5", kod: "002", ad: "Bej ip", hex: "#cdb48e", kullanim: 0, pasif: true },
];
