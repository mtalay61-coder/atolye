// Ekranların gördüğü kayıt biçimleri. Yapı şemasındaki tablolarla aynı adları taşır;
// bağlama zamanı görünümler (v_siparis_durum, v_cari_bakiye, v_stok) bu biçimi döndürür.
export type CariRolu = "Müşteri" | "Tedarikçi" | "Fasoncu" | "Personel";
// bakiye: v_cari_bakiye'den gelir (borç − alacak). Artı: cari bize borçlu; eksi: biz cariye borçluyuz.
export type Cari = {
  id: string; kod: string; ad: string; il: string; roller: CariRolu[]; bakiye: number;
  telefon?: string; eposta?: string; yetkili?: string; vergiDairesi?: string; vergiNo?: string; adres?: string;
  fiyatGrubu?: string; paraBirimi: "TRY" | "USD" | "EUR"; not?: string; pasif?: boolean;
};
// Ekstre satırı: cari_hareket defterinden; her satır bir belgeye bağlı.
export type CariHareket = { id: string; cariId: string; tarih: string; belge: string; aciklama: string; borc: number; alacak: number };
export type Urun = { id: string; kod: string; ad: string; tip: "Mamul" | "Hammadde"; renk?: string; stok: number; fiyat: number; olcuSeti?: string[] };
export type Kalem = { id: string; urunId: string; urunAd: string; renk: string; bedenler: Record<string, number>; sevk: Record<string, number>; fiyat: number };
export type SiparisDurumu = "Taslak" | "Bekliyor" | "Üretimde" | "Kısmi sevk" | "Tamamlandı" | "İptal";
export type Siparis = { id: string; no: string; cariId: string; tarih: string; teslim: string; durum: SiparisDurumu; kalemler: Kalem[]; not?: string };
