-- PAKET Ö DURUMU — SALT OKUR. Hiçbir şey yazmaz.
with cel as (select u.id, u.ad, coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') as tip, o.tur, count(*) as n, string_agg(o.ad, ', ' order by o.ad) as olculer
   from public.stk_varyant v join public.urunler u on u.id = v.urun_id join public.stk_olcu o on o.id = v.olcu_id
  where coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden') in ('Beden', 'Boyut') and o.tur in ('Beden', 'Boyut') and o.tur <> coalesce(nullif(btrim(u.olcu_tipi), ''), 'Beden')
  group by u.id, u.ad, u.olcu_tipi, o.tur)
select 1 as no, 'stk_varyant_coz gövdesi' as kontrol, case md5(btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g'))) when '8420a7f901793cc7441eb9f895c46698' then 'YENİ — ölçü ürünün grubunda çözülür (Paket Ö KURULU)' when 'c4356478fc7cb2346bf8ca4e0cacbed2' then 'ESKİ — ölçü yalnız ada göre çözülür (Paket Ö KURULU DEĞİL)' else 'BEKLENMEYEN GÖVDE — sonucu gönder' end as durum
  from pg_proc p where p.oid = to_regprocedure('public.stk_varyant_coz(text,text,text,text,text)')
union all select 2, 'fonksiyon authenticated / anon tarafından doğrudan çağrılamaz', case when has_function_privilege('authenticated', to_regprocedure('public.stk_varyant_coz(text,text,text,text,text)'), 'execute') or has_function_privilege('anon', to_regprocedure('public.stk_varyant_coz(text,text,text,text,text)'), 'execute') then 'HAYIR' else 'evet' end
union all select 3, 'BİLGİ · ölçü tipi ile varyantının ölçü grubu ÇELİŞEN ürün (Paket Ö kuruluyken bu ürünlerde işlem AÇIK HATA verir)', (select count(*)::text || ' ürün' || coalesce(' — ' || string_agg(ad || ' [ürün ' || tip || ', varyant ' || tur || ' ×' || n || ']', ' ; '), '') from cel)
order by 1;
