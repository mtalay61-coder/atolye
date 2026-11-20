// VERİ KATMANI — ekranlar veriyi YALNIZ buradan alır.
// Prototipte örnek veri döner ve hiçbir şey kaydedilmez. Bağlama zamanı yalnız bu dosya değişir:
// okumalar Supabase görünümlerinden (v_…), yazmalar komut fonksiyonlarından (rpc) gelir; ekranlara dokunulmaz.
import { CARI_HAREKETLERI, CARILER, DEGISKEN_TURLERI, DEGISKENLER, SIPARISLER, URUN_RENKLERI, URUNLER } from "./ornek";
import type { Cari, CariHareket, Degisken, DegiskenTuru, Siparis, Urun, UrunRenk } from "./tipler";

const bekle = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 60));

export const kaynak = {
  // Seçiciler pasif carileri göstermez; liste ekranı "Pasif" süzgeciyle görür.
  cariler: (pasifDahil = false) => bekle<Cari[]>(CARILER.filter((c) => pasifDahil || !c.pasif)),
  cari: (kod: string) => bekle<Cari | undefined>(CARILER.find((c) => c.kod === kod)),
  cariHareketleri: (cariId: string) => bekle<CariHareket[]>(CARI_HAREKETLERI.filter((x) => x.cariId === cariId)),
  cariSiparisleri: (cariId: string) => bekle<Siparis[]>(SIPARISLER.filter((x) => x.cariId === cariId)),
  sonrakiCariKodu: () => bekle<string>("CAR-" + String(Math.max(...CARILER.map((c) => +c.kod.slice(4))) + 1).padStart(4, "0")),
  urunler: () => bekle<Urun[]>(URUNLER),
  siparisler: () => bekle<Siparis[]>(SIPARISLER),
  siparis: (no: string) => bekle<Siparis | undefined>(SIPARISLER.find((s) => s.no === no)),
  // Renkler: listeler pasifleri de döndürür (tekillik denetimi pasif kayda da bakar); seçiciler kendisi süzer.
  urunRenkleri: () => bekle<UrunRenk[]>(URUN_RENKLERI),
  degiskenTurleri: () => bekle<DegiskenTuru[]>(DEGISKEN_TURLERI),
  degiskenler: () => bekle<Degisken[]>(DEGISKENLER),
  // Yazma komutları: prototipte hiçbir şey yazılmaz. Dönen nesne ekranın ne göstereceğini söyler.
  komut: async (ad: string, _veri: unknown) => {
    await bekle(null);
    return { prototip: true as const, mesaj: KOMUT_MESAJI[ad] ?? "Yapıldı" };
  },
};

const KOMUT_MESAJI: Record<string, string> = {
  siparis_kaydet: "Sipariş kaydedildi",
  siparis_iptal: "Sipariş iptal edildi",
  siparis_kopyala: "Sipariş kopyalandı",
  teklif_siparise_cevir: "Siparişe çevrildi",
  cari_kaydet: "Cari kaydedildi",
  cari_pasife_al: "Cari pasife alındı",
  cari_etkinlestir: "Cari yeniden etkin",
  urun_renk_kaydet: "Renk kaydedildi",
  urun_renk_sil: "Renk silindi",
  urun_renk_pasife_al: "Renk pasife alındı",
  degisken_kaydet: "Değer kaydedildi",
  degisken_sil: "Değer silindi",
  degisken_pasife_al: "Değer pasife alındı",
  degisken_turu_kaydet: "Tür kaydedildi",
};

// Bildirimin sonuna eklenir: kullanıcı işlemin gerçekte yapılmadığını bilsin.
export const PROTOTIP_NOTU = " (prototip: gerçekte yapılmadı)";
