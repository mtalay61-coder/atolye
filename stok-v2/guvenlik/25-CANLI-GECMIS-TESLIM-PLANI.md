# G-25 — CANLIYA GEÇİŞTE GEÇMİŞ TESLİMLER (PLAN; uygulanmadı — canlı ayrı onay)

Durum: HAZIRLANDI (25 Kasım). Canlıya, main'e, yayına DOKUNULMADI.

## Sorun (deneme projesi + yerel ölçüm)

Ödeme defteri (`isc_odeme`) G-25 ile başlar. Ondan önceki bütün üretim teslimleri ve 25c'den önce PARA yetkilisinin (Yönetici dahil) teslimleri
defterde YOK, ama geçerli ÜRT fişi ve cari işçilik satırı VAR. Bunları "kayıtsız" saymak çift ödemeye yol açar:

- Yerel (deneme durumu: eski paket + 25b): geçmiş teslimli iş, fiş iptal edilmeden `alt_yaz` ile yeniden "tamamlanmadı" yapıldı
  (üretim kaydetme yetkisi yeter); Üretim kullanıcısıyla ve Yönetici ile yeniden teslim GEÇTİ → **fiş 3, cari 1.050 ₺** (10 adetlik iş).
- Deneme projesinde 10001, 10002 (geçerli fişi), 10004 Yönetici teslimleri defterde yok (DEĞİŞTİRİLMEDİ).

## Çözüm (25c ile kaynakta)

1. **Çalışma anında geçmişi say:** `g25_gecmis_iscilik(üretim, proses)` — geçerli ÜRT fişindeki, istek kimliği defterde OLMAYAN geçerli Alacak
   işçilik miktarı (tamir ücreti hariç; proses fişin `ek.proses`'inden, eski fişte açıklamadan). Hem Üretim kullanıcısının yolu
   (`g25_uretim_bagi`) hem PARA yolu (`g25_uretim_butunluk`) proses tavanında `defter + geçmiş + yeni ≤ üretim adedi` uygular.
   Yerel: L2 / L3 ret, defterler değişmedi; geçmiş fiş İPTAL edilince (Geri Al) iş bir kez yeniden ödenir (L5, tek fiş / tek ödeme).
2. **PARA yetkilisi defteri atlamaz:** 25c'den sonra Yönetici teslimi de deftere girer; tamamlanmış / ödenmiş işe ikinci teslim KR016.
3. **Geçmiş kayıtlara dokunulmaz:** geriye dönük defter satırı (backfill) YAZILMAZ — fiş → atama eşlemesi eski kayıtlarda kesin değil
   (aynı kişiye aynı proseste birden çok parça); yanlış eşleme meşru teslimi engellerdi. Koruma proses düzeyinde, eşleme gerektirmez.

## Kalan sınırlar (bilinçli)

- **Tamir işleri:** geçmiş tamir ücreti satırları proses tavanına sayılmaz (tamir ayrı iştir); geçmiş tamir zincirinin yeniden ödenmesi
  defter dışı tamir için atama düzeyinde yakalanmaz. Atama tamamlanmışsa (yeniden açılmadıkça) teslim edilemez; yeniden açma `alt_yaz` ile
  mümkün. Envanter 2. satırı canlıdaki defter dışı tamir miktarını SAYAR — sıfır değilse ayrı karar.
- **Elle işçilik (atamaya bağlı olmayan PARA satırı):** bugünkü gibi serbest; proses tavanına sayılır (geçerli ÜRT fişindeyse).
- **`alt_yaz` ile yeniden açma:** fiş iptal edilmeden atama "tamamlanmadı" yapılabiliyor (G-25'in değiştirmediği fonksiyon). Ödeme artık
  engelli; yeniden açmanın kendisini kapatmak (Geri Al dışında) ayrı bir karar / iş.

## Canlı sırası (her adım ayrı onay; bu dalda YAPILMADI)

1. Salt okur: `25-gecmis-teslim-envanteri-salt-okur.sql` (G-25'ten ÖNCE de çalışır) → defter dışı satır / tutar, **proses adedi zaten
   aşılmış** üretimler (3–4. satır: geçmişte fazla ödenmiş görünen işler — muhasebe incelemesi; G-25 bunları düzeltmez, yalnız yenisini
   engeller), tamamlanmamış ama tam ödenmiş atamalar (5. satır).
2. 3. veya 5. satır sıfır değilse: listeyi muhasebeyle gözden geçir; G-25'ten sonra bu işlerde yeni teslim işçilik ALAMAZ (proses tavanı) —
   meşru bir ek ödeme gerekiyorsa PARA yetkilisi elle işçilikle (atamaya bağlamadan) yazar.
3. Tam paket `25-cari-yetki-uygula.sql` (25b + 25c dahil) → `25-sonra-dogrula-salt-okur.sql` TAMAM, `25-onkosul-salt-okur.sql` UYGULANMIŞ.
4. Envanteri yeniden çalıştır: 7. satır `true · true`; 1. satırda "defterde" bundan sonra artar, "defter dışı" sabit kalır.
