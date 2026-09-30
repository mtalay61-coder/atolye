-- HARİCİ BARKOD (30 Eylül, v1.542.0)
--
-- Kutunun ya da tedarikçinin kendi etiketi (EAN vb.) ürün kartı › Barkodlar sekmesinde bir renk+bedene
-- bağlanır; siparişte, depoda ve sevkiyatta okutulunca o beden gibi tanınır. Liste ürün satırında:
-- [{ "kod": "999000016232", "renk": "Siyah", "beden": "38" }, ...]
--
-- Bu sütun açılmadan harici barkod GİRİLEN ürünün bulut kaydı yazılamaz (diğer ürünler etkilenmez: alan
-- yalnız harici barkodu olan üründe gönderiliyor). Supabase > SQL Editor'de bir kez çalıştırın.

alter table urunler add column if not exists harici_barkodlar jsonb not null default '[]'::jsonb;
