# FormAlani

Etiketi üstte, genişliği içeriğe göre SABİT giriş alanı; alanlar ekrana yayılmaz, dar ekranda alt satıra sarar.

- Genişlikler sabittir: ürün `erp-w-urun` 190, renk 130, ölçü 130, miktar 80, fiyat 120, tarih 150, belge no 160, ödeme şekli 140 px.
- Etiket `etiket` stilinde BÜYÜK HARF. Zorunlu alan yıldızla değil, boş bırakılınca altındaki hata metniyle belli olur.
- Hata metni alanın altında, `erp-accent-press` renginde, neyin eksik olduğunu söyler: "Fiyat gerekli".
- Sayı alanı sağa yaslı; Türkçe biçim (1.240,00) kabul edilir.
- Seçim listeleri yazarak aranır (aramalı seçici); kayıtlı değer listede yoksa "(listede yok)" seçeneği eklenir, ilk seçeneğe düşülmez.
- Belge numarası kullanıcıya yazdırılmaz, sunucu verir.
