-- B4 YALITILMIŞ DENEME — ORTAM VE HESAP / YETKİ DOĞRULAMASI — SALT OKUR (30 Kasım). Hiçbir şey yazmaz. Yeni projede; kurulumdan ve
-- ilk-yonetici-uygula.sql'den SONRA, sınamalardan ÖNCE çalıştırılır. Son satır "YALITILMIŞ DENEME ORTAMI: EVET" değilse sınama YAPILMAZ.
-- Yalnız deneme hesaplarının kullanıcı adı / rolü yazılır (şifre, anahtar, jeton yok).
with t as (select veri from public.tanimlar where id = 'tekil'),
k as (select u, lower(coalesce(nullif(u ->> 'eposta', ''), '')) as eposta from t, jsonb_array_elements(t.veri -> 'kullanicilar') u),
s(no, kontrol, bulunan, iyi) as (
  select 1, 'G-25 nesnesi (0 olmalı — bu proje G-25 denemesi DEĞİL)',
         (select count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname like 'g25%'),
         not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'g25%')
  union all
  select 2, 'ERP kullanıcıları (hepsi "Deneme…" olmalı): ad · rol · auth hesabı var mı',
         coalesce((select string_agg((u ->> 'kullaniciAdi') || ' · ' || (u ->> 'rol') || ' · ' ||
                    case when exists (select 1 from auth.users a where lower(a.email) = k.eposta) then 'var' else 'YOK' end, ' | ' order by u ->> 'kullaniciAdi') from k), '(yok)'),
         (select count(*) > 0 and bool_and((u ->> 'kullaniciAdi') ilike 'deneme%' and exists (select 1 from auth.users a where lower(a.email) = k.eposta)) from k)
  union all
  select 3, 'ERP listesinde OLMAYAN auth hesabı sayısı (0 olmalı)',
         (select count(*)::text from auth.users a where not exists (select 1 from k where k.eposta = lower(a.email))),
         not exists (select 1 from auth.users a where not exists (select 1 from k where k.eposta = lower(a.email)))
  union all
  select 4, 'giriş sistemi açık (girisAktifMi = true)', coalesce((select veri ->> 'girisAktifMi' from t), 'satır yok'),
         coalesce((select (veri ->> 'girisAktifMi') = 'true' from t), false)
  union all
  select 5, 'DenemeYonetici: rol Yönetici', coalesce((select u ->> 'rol' from k where u ->> 'kullaniciAdi' = 'DenemeYonetici'), 'yok'),
         exists (select 1 from k where u ->> 'kullaniciAdi' = 'DenemeYonetici' and u ->> 'rol' = 'Yönetici')
  union all
  select 6, 'DenemeStok yetkileri (beklenen: stok=gdk uretim=gdk siparis=g fisler=g; silme ve para modülleri YOK)',
         coalesce((select string_agg(m.key || '=' || (case when (m.value ->> 'goruntuleme')::boolean then 'g' else '' end) || (case when (m.value ->> 'duzenleme')::boolean then 'd' else '' end)
                     || (case when (m.value ->> 'kaydetme')::boolean then 'k' else '' end) || (case when (m.value ->> 'silme')::boolean then 's' else '' end), ' ' order by m.key)
                     from k, jsonb_each(k.u -> 'yetkiler') m
                    where k.u ->> 'kullaniciAdi' = 'DenemeStok' and ((m.value ->> 'goruntuleme')::boolean or (m.value ->> 'duzenleme')::boolean or (m.value ->> 'kaydetme')::boolean or (m.value ->> 'silme')::boolean)), 'yok'),
         coalesce((select string_agg(m.key || '=' || (case when (m.value ->> 'goruntuleme')::boolean then 'g' else '' end) || (case when (m.value ->> 'duzenleme')::boolean then 'd' else '' end)
                     || (case when (m.value ->> 'kaydetme')::boolean then 'k' else '' end) || (case when (m.value ->> 'silme')::boolean then 's' else '' end), ' ' order by m.key)
                     from k, jsonb_each(k.u -> 'yetkiler') m
                    where k.u ->> 'kullaniciAdi' = 'DenemeStok' and ((m.value ->> 'goruntuleme')::boolean or (m.value ->> 'duzenleme')::boolean or (m.value ->> 'kaydetme')::boolean or (m.value ->> 'silme')::boolean)), '')
           = 'fisler=g siparis=g stok=gdk uretim=gdk'
  union all
  select 7, 'DENEME dışı kayıt (ürün adı / cari unvanı "DENEME" ile başlamayan; 0 · 0 olmalı)',
         (select count(*)::text from public.urunler where ad not ilike 'deneme%') || ' · ' || (select count(*)::text from public.cariler where unvan not ilike 'deneme%'),
         not exists (select 1 from public.urunler where ad not ilike 'deneme%') and not exists (select 1 from public.cariler where unvan not ilike 'deneme%')
  union all
  select 8, 'bilgi: ürün · cari · üretim · geçerli fiş',
         (select count(*)::text from public.urunler) || ' · ' || (select count(*)::text from public.cariler) || ' · ' || (select count(*)::text from public.uretim)
           || ' · ' || (select count(*)::text from public.stk_fis where not iptal), true
)
select no, kontrol, bulunan, case when iyi then 'tamam' else 'UYMUYOR' end as durum from s
union all
select 99, 'YALITILMIŞ DENEME ORTAMI', '', case when (select bool_and(iyi) from s) then 'EVET' else 'HAYIR — sınama YAPILMAZ' end
order by 1;
