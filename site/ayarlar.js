// SİTE AYARLARI — iletişim bilgileri ve bağlantılar TEK YERDE. Değiştirmek için yalnız bu dosya düzenlenir.
// "[…]" ile başlayan değerler henüz doldurulmadı: firma bilgileri gelince yazılacak.
window.SITE = {
  firma: "New Diamond",
  slogan: "Ayakkabı üretiminde ustalık",
  telefon: "[telefon]",            // ör. "+90 5xx xxx xx xx"
  whatsapp: "",                    // yalnız rakam, ülke koduyla: "905xxxxxxxxx" — boşsa WhatsApp düğmesi gizlenir
  eposta: "[e-posta]",             // ör. "info@newdiamond.com.tr"
  adres: "[adres]",
  haritaSorgusu: "",               // Google Haritalar'da aranacak metin (ör. "New Diamond Ayakkabı İstanbul"); boşsa harita gizlenir
  instagram: "",                   // ör. "https://instagram.com/newdiamond"
  // CANLI KOLEKSİYON — ERP'nin Supabase projesi. YALNIZ publishable (herkese açık) anahtar; secret anahtar ASLA buraya girmez.
  // Site yalnız `vitrin()` fonksiyonunu çağırır: ERP'de "Web sitesinde göster" işaretli ürünlerin adı, renkleri, resimleri
  // (fiyat ve stok yok — bkz. vitrin.sql).
  supabaseUrl: "https://mqdgucoomgqcvhvgixbl.supabase.co",
  supabaseAnahtar: "sb_publishable_MKOjcTQ8Dod9Ofh-P-V-uA_3kKm_Ei2",
};
