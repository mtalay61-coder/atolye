-- PAKET K DURUMU — SALT OKUR. Hiçbir şey yazmaz.
with k(no, kontrol, beklenen, bulunan) as (
  select 1, 'koruma fonksiyonları (k_*)', '6', (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
     and p.proname in ('k_cari_silme_koru', 'k_siparis_cari_koru', 'k_uretim_urun_koru', 'k_kasa_cari_koru', 'k_eski_hesap_silme_koru', 'k_urun_silme_koru'))
  union all select 2, 'etkin tetikleyiciler (cariler, siparisler, uretim, urunler, kas_hareket, kas_cek, hesaplar)', '7',
     (select count(*)::text from pg_trigger g where not g.tgisinternal and g.tgenabled = 'O' and g.tgname in ('k_cari_silme_koru', 'k_siparis_cari_koru', 'k_uretim_urun_koru', 'k_kasa_cari_koru', 'k_eski_hesap_silme_koru', 'k_urun_silme_koru'))
  union all select 3, 'yabancı anahtarlar (cari: car_hareket, stk_fis, stk_hareket, site_talepleri, site_hesaplari; ürün: stk_hareket)', '6',
     (select count(*)::text from pg_constraint where contype = 'f' and conname in ('k_car_hareket_cari_fk', 'k_stk_fis_cari_fk', 'k_stk_hareket_cari_fk', 'k_site_talepleri_cari_fk', 'k_site_hesaplari_cari_fk', 'k_stk_hareket_urun_fk'))
  union all select 4, 'koruma fonksiyonları authenticated / anon tarafından doğrudan çağrılamaz', 'evet',
     case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and left(p.proname, 2) = 'k_' and p.proname like '%_koru'
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))) then 'HAYIR' else 'evet' end
)
select no, kontrol, beklenen, bulunan, case when bulunan = beklenen then 'tamam' else 'EKSİK' end as durum from k
union all select 99, 'GENEL', '', '', case when (select bool_and(bulunan = beklenen) from k) then 'KURULU'
  when (select bool_and(bulunan in ('0', 'evet')) from k) then 'KURULU DEĞİL' else 'YARIM — sonucu gönder' end
order by 1;
