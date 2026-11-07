-- SİTE GİRİŞİNİ ONAR (3 Kasım). rls-kimlik.sql (geçişin son adımı) girişsiz kullanıcının (anon) BÜTÜN fonksiyon yetkilerini
-- alıyor; sitenin kullandığı 8 fonksiyon da kapandı → müşteri girişi, kayıt ve vitrin "Bağlantı kurulamadı" diyor.
-- Bu dosya yalnız site-portal.sql'in zaten verdiği yetkileri geri verir; başka hiçbir şeye dokunmaz. Tekrar çalıştırmak zararsız.
grant execute on function
  public.herkese_acik_vitrin(), public.site_ayarlari(), public.site_kayit_ol(jsonb, text, text),
  public.portal_giris(text, text), public.portal(text), public.portal_hesap(text, date, date),
  public.portal_siparis(text, jsonb, text, jsonb), public.portal_cikis(text)
to anon, authenticated;

-- Kontrol: 8 satırın hepsinde girissiz_calistirir = true olmalı.
select p.oid::regprocedure::text as fonksiyon, has_function_privilege('anon', p.oid, 'execute') as girissiz_calistirir
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('herkese_acik_vitrin','site_ayarlari','site_kayit_ol','portal_giris','portal','portal_hesap','portal_siparis','portal_cikis')
order by 1;
