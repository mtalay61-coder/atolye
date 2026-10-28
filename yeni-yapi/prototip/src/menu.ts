// Yan menü: her öğe yapı şemasındaki bir modüldür (kod ile bağlı). Ekranı çizilmiş modül kendi
// adresine gider; çizilmemiş modül "Planlanan" sayfasında şemadaki amacını ve kılavuz adımlarını gösterir.
// Menü adları kullanıcının gördüğü addır; modülün şemadaki adı kılavuzda ve Planlanan sayfasında durur.
export type MenuGrubu = { ad: string; ogeler: { kod: string; ad: string; adres?: string }[] };

export const MENU: MenuGrubu[] = [
  { ad: "Satış", ogeler: [{ kod: "SIP", ad: "Siparişler", adres: "siparisler" }, { kod: "TEK", ad: "Teklifler" }, { kod: "CAR", ad: "Cariler", adres: "cariler" }] },
  { ad: "Depo", ogeler: [{ kod: "URN", ad: "Ürünler ve stok" }, { kod: "DEP", ad: "Depo ve sevk" }, { kod: "STN", ad: "Satınalma" }] },
  { ad: "Üretim", ogeler: [{ kod: "PLN", ad: "Planlama" }, { kod: "URT", ad: "Üretim" }, { kod: "REC", ad: "Reçeteler" }, { kod: "MDL", ad: "Modelhane" }] },
  { ad: "Finans", ogeler: [{ kod: "KAS", ad: "Kasa ve banka" }, { kod: "FAT", ad: "Faturalar" }, { kod: "MAL", ad: "Maliyet ve gider" }, { kod: "BEL", ad: "Belgeler" }] },
  { ad: "Rapor", ogeler: [{ kod: "RAP", ad: "Raporlar" }] },
  { ad: "Sistem", ogeler: [{ kod: "TAN", ad: "Tanımlar", adres: "tanimlar" }, { kod: "CEK", ad: "Kullanıcılar" }, { kod: "BAK", ad: "Bakım" }, { kod: "PRT", ad: "Web portalı" }] },
];

export const ogeAdresi = (o: { kod: string; adres?: string }) => o.adres ?? "modul-" + o.kod;

// Adresten menüde hangi öğenin etkin olduğu (alt sayfalar üst öğeyi yakar).
export function etkinKod(adres: string): string | null {
  if (adres.startsWith("siparis")) return "SIP";
  if (adres.startsWith("cari")) return "CAR";
  if (adres.startsWith("tanimlar")) return "TAN";
  if (adres.startsWith("modul-")) return adres.slice(6);
  return null;
}
