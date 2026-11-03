# F5 — tam geri yükleme için ilk istemci koruması

Dal: `codex/f5-guvenli-geri-yukleme`, başlangıç: F2 `1a42e48`.
Geliştirme sürümü 1.744.1; yayın paketi üretilmedi. Canlı Supabase, main, deploy ve surum.json değişmedi.

## Sorun ve değişiklik

Tam geri yükleme stok, sipariş, cari ve muhasebeyi ayrı ayrı yazıyordu. Fiş sistemi varken bu işlem yarıda kalabilir veya fiş-hareket bütünlüğünü bozabilirdi. `yedegiUygula` artık fiş defteri kurulu olduğunda ilk yerel değişiklikten, yedek yazmasından ve bulut isteğinden önce false döndürür. JSON ve tarihli yedek aynı girişten geçer. `fisKesYolu()` bağlantıya ve modül bayraklarına bağlı olduğundan koruma onun yerine kurulu fiş defteri bilgisine bakar. Fiş kuralları kapalı olsa da engel sürer. Bağlı sunucunun ayarı okunamamışsa da geri yükleme başlamaz.

Fişsiz eski sistemde geri yükleme ve JSON yedek indirme korunur. Yeni SQL yok.

## Doğrulama

- Gerçek geri yükleme callback'ini çalıştıran yeni birim testi düzeltmeden önce ilk yan etkiye ulaşarak başarısız oldu.
- Düzeltmeden sonra dört durum geçti: fiş kurulu, bağlantı kapalı ama fiş kurulu, sunucu ayarı bilinmiyor, fişsiz eski sistem.
- İki Chromium kontrolü geçti: fis_aktif=false ve true. Onaylı boş/eski JSON yüklenirken yerel stok/sipariş/cari/muhasebe ve geri yükleme öncesi yedek değişmedi; buluta yazma isteği gitmedi. Sunucu taklit edildi, canlı kullanılmadı.
- Mevcut senaryo-json-yedek çıktısı altın dosyayla aynı.
- 90 birim dosyası: 1.633 başarılı kontrol, 0 başarısız; süreç çıkışı 0.
- Kaynak/test derlemesi ve kontrol.sh temiz; git diff --check temiz.

## Sınır ve devam

Bu F5'in tamamlandığı anlamına gelmez. Eski istemci veya doğrudan eski yazma RPC'leri bu istemci engelini aşabilir. Sunucuda güvenli içe aktarma/geri yükleme işlemi, referans kontrolü ve kısmi yazmayı engelleyen tasarım ayrıca gerekir. F0'daki Y.tam-* kırmızı beklentiler değişmedi. Tek kart/tanım içe aktarma da ayrı incelenmeli.

F4 sipariş iptali/teslim yarışı, fazla teslim, çek/senet eşzamanlılığı ve F8 eski yazma yolları açık. Bu değişiklik sistemi genel olarak güvenli ilan etmez. Canlı geçiş yalnız kullanıcının açık onayıyla.
