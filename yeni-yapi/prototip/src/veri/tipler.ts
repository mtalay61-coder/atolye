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

// ---- Renkler (karar k-08): ürün renkleri ile hammadde değişkenleri AYRI yapılardır; hepsi kimlikle bağlı, ad anahtar değil.
// Ürün rengi (urun_renk + urun_renk_bilesen). bilesenler boşsa 1 renkli temel renktir (kendi hex'i ve resmi var);
// doluysa sıralı hücrelerdir (1. renk ana renk) ve her biri 1 renkli bir ürün renginin kimliğidir.
// Renk sayısı saklanmaz, bileşen sayısından okunur. kullanim: kaç varyantta geçtiği (görünümden; kod ve hücre kilidi buna bakar).
export type UrunRenk = { id: string; kod: string; ad: string; hex?: string; resim?: string; bilesenler: string[]; kullanim: number; pasif?: boolean };
// Hammadde değişken türü: Deri rengi, Taban rengi, Deri kalınlığı… etiket hammadde kartında görünen addır (Renk, Kalınlık, Boy).
// gorsel "renk" ise değerlerde hex ve resim tutulur ve RenkKutusu gösterilir; "yok" ise yalnız kod ve ad.
export type DegiskenTuru = { id: string; ad: string; etiket: string; gorsel: "renk" | "yok"; pasif?: boolean };
export type Degisken = { id: string; turId: string; kod: string; ad: string; hex?: string; resim?: string; kullanim: number; pasif?: boolean };
