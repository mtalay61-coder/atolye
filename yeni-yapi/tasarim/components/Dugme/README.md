# Dugme

Yazılı düğme; yalnız onay ve soru pencerelerinin dibinde ve ikonu olmayan özel işlemlerde (İşlemler, Kalemlere ekle, Siparişe çevir) kullanılır. Kaydet, Düzenle, Sil, Kapat ekranda hiçbir zaman yazılı düğme olmaz; onlar `IkonDugme`dir.

- Sağlanan: fiil kipinde ad ("Siparişe çevir"), isteğe bağlı ikon.
- `erp-btn--primary` (`erp-accent-hover` zemin, beyaz yazı 4,74:1) bir alanda tek; `erp-btn--danger` (`erp-accent-press`) yalnız silme onayında.
- Pencerede sıra: sağa yaslı, birincil en sağda: **Vazgeç · Sil**, **Kaydetmeden çık · Kaydet**.
- "Tamam", "Evet", "Gönder" yazılmaz.
