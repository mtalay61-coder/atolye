// VERİ KATMANI — ekranlar veriyi YALNIZ buradan alır.
// Prototipte örnek veri döner ve hiçbir şey kaydedilmez. Bağlama zamanı yalnız bu dosya değişir:
// okumalar Supabase görünümlerinden (v_…), yazmalar komut fonksiyonlarından (rpc) gelir; ekranlara dokunulmaz.
import { CARILER, SIPARISLER, URUNLER } from "./ornek";
import type { Cari, Siparis, Urun } from "./tipler";

const bekle = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 60));

export const kaynak = {
  cariler: () => bekle<Cari[]>(CARILER),
  urunler: () => bekle<Urun[]>(URUNLER),
  siparisler: () => bekle<Siparis[]>(SIPARISLER),
  siparis: (no: string) => bekle<Siparis | undefined>(SIPARISLER.find((s) => s.no === no)),
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
};

// Bildirimin sonuna eklenir: kullanıcı işlemin gerçekte yapılmadığını bilsin.
export const PROTOTIP_NOTU = " (prototip: gerçekte yapılmadı)";
