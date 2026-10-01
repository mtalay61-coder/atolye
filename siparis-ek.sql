-- SİPARİŞ EK ALANLARI (1 Ekim, v1.545.0)
--
-- Sipariş ve sipariş kaleminde tabloda sütunu OLMAYAN alanlar (kalemin KDV oranı ve notları, siparişin iptal
-- zamanı / iptal eden, rezervasyon zinciri…) buluta hiç gitmiyordu; başka cihazda ve yeniden açılışta
-- kayboluyordu. Artık hepsi `ek` sütununa yazılıyor. Supabase > SQL Editor'de bir kez çalıştırın; tekrar
-- çalıştırmak güvenli.
--
-- Bu sütunlar açılmadan, KDV'li ya da notlu kalemi olan siparişin bulut kaydı yazılamaz (diğerleri etkilenmez).

alter table siparisler add column if not exists ek jsonb;
alter table siparis_kalemleri add column if not exists ek jsonb;
