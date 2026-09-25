-- ÜRETİM PARÇA BARKODU — v1.94.0 (v1.89.0'ın yerini alır)
--
-- NEDEN GEREKLİ
-- Barkodla Atölye ekranında iş parçaları barkod taşıyor. Sütun yoksa yerel kopya çalışır ama
-- bulut yazması bu alanı düşürür; ikinci bilgisayarda parça barkodları kaybolur ve okutma
-- "tanınmayan barkod" der.
--
-- ÇALIŞTIRMA: Supabase > SQL Editor > yapıştır > Run. (v1.89.0'daki dosyayı çalıştırdıysanız da
-- bunu çalıştırın: aşağıda indeks KALDIRILIYOR.)

alter table public.uretim_atamalari
  add column if not exists barkod text;

-- TEKİLLİK İNDEKSİ KALDIRILIYOR.
--
-- v1.89.0'da her iş verme yeni bir kod alıyordu, kodlar tekildi. v1.94.0'dan itibaren BÖLÜNME
-- YOKSA parça üretimin kendi kodunu taşıyor: aynı bohça Kesim'de de Saya'da da "1000".
-- Numara MALI tanıyor, prosesi değil — etiket bir kez basılıp iş bitene kadar kullanılıyor.
-- Bu yüzden aynı kod aynı üretimin birden çok atamasında görünebilir ve tekillik kısıtı,
-- ikinci prosese iş vermeyi engellerdi.
--
-- Okutmada belirsizlik yok: ekran AÇIK (teslim edilmemiş) atamayı arıyor; bitmiş olanlar eşleşmez.
drop index if exists public.uretim_atamalari_barkod_tekil;
