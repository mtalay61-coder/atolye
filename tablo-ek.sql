-- ŞEMA DIŞI ALANLAR — ÜRÜN, ÜRETİM, İŞ ATAMASI (1 Ekim, v1.546.0)
--
-- Bu tablolarda sütunu OLMAYAN alanlar (ürünün renk başlığı, üretimin ve atamanın sonradan eklenen
-- bilgileri…) buluta gitmiyor, başka cihazda ve yeniden açılışta kayboluyordu. Artık `ek` sütununa
-- yazılıyor. Cari, cari hareketi ve stok hareketinde `ek` zaten vardı (SQL gerekmez).
-- Supabase > SQL Editor'de bir kez çalıştırın; tekrar çalıştırmak güvenli.

alter table urunler add column if not exists ek jsonb;
alter table uretim add column if not exists ek jsonb;
alter table uretim_atamalari add column if not exists ek jsonb;
