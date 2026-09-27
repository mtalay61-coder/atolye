-- KDV ORANI (27 Eylül, v1.496.0)
--
-- Ürüne özel KDV oranı (ör. ayakkabı %10, deri %20). Boş bırakılan ürün Tanımlar > Firma'daki
-- varsayılan orandan (mamul / diğer) hesaplanır — o varsayılanlar Tanımlar kaydında durur, SQL istemez.
--
-- Bu sütun açılmadan ürün kartında "KDV oranı" SEÇİLEN ürünün bulut kaydı yazılamaz (diğer ürünler
-- etkilenmez: alan yalnız oranı olan üründe gönderiliyor). Supabase > SQL Editor'de bir kez çalıştırın.

alter table urunler add column if not exists kdv_orani numeric;
