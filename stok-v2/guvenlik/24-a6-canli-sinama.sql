-- =====================================================================================================================
--  24-a6-canli-sinama.sql — A6 DÜZELTMESİNDEN SONRA CANLIDA DOĞRULAMA (18 Kasım 2026)
--  YALNIZ 24-a6-tanim-kimligi.sql uygulandıktan sonra, onayla. SQL Editor › tamamı › Run.
--  HESAP AÇMAZ: "listede olmayan" kişi için sahte oturum kimliği (JWT iddiası) kullanılır; Yönetici için Tanımlar listesindeki
--  İLK Yönetici'nin e-postası İÇERİDE okunur (çıktıya yazılmaz). Her deneme, PostgREST'in yaptığı gibi `authenticated` rolü +
--  JWT iddialarıyla AYRI bir alt işlemde çalışır ve sonuç ne olursa olsun GERİ ALINIR — veride iz kalmaz (yalnız sayaçlar /
--  diziler ilerleyebilir). Beklenmeyen hata BAŞARISIZ sayılır (yalnız beklenen hata kodu "UYGUN").
--  Kişisel veri / sır dönmez: çıktıda e-posta, ad, kimlik yok.
--  Beklenen (düzeltme sonrası): L1–L4 ve Y4 UYGUN (ret), Y1–Y3 UYGUN (izin) · ÖZET "AÇIK: 0 · BAŞARISIZ: 0".
--  (Düzeltme ÖNCESİ çalıştırılsaydı L1 / L2 / Y4 AÇIK çıkardı — yerelde ölçüldü; canlıda öncesi bilerek çalıştırılmaz.)
-- =====================================================================================================================
create temp table if not exists a6_canli_sinama (sira text, kim text, deneme text, beklenen text, sonuc text, durum text);
truncate a6_canli_sinama;
do $$
declare
  yon_eposta text; yon_id text;
  t record; q text; n bigint; s text; d text; izin boolean; kod text;
begin
  select lower(e ->> 'eposta') into yon_eposta
    from public.tanimlar, jsonb_array_elements(veri -> 'kullanicilar') with ordinality x(e, i)
   where id = 'tekil' and e ->> 'rol' = 'Yönetici' and nullif(e ->> 'eposta', '') is not null order by i limit 1;
  if yon_eposta is null then raise exception 'Tanımlar listesinde e-postası olan Yönetici yok — sınama yapılamadı'; end if;
  select id::text into yon_id from auth.users where lower(email) = yon_eposta;
  if yon_id is null then raise exception 'Listedeki ilk Yönetici''nin giriş hesabı yok — sınama yapılamadı'; end if;
  for t in select * from (values
    ('L1', 'yok', 'Listede olmayan hesap: tanımlar satırının kimliğini değiştirmek (A6)', 'RET:42501',
     'with x as (update public.tanimlar set id = ''a6-canli-sinama'' where id = ''tekil'' returning 1) select count(*) from x'),
    ('L2', 'yok', 'Listede olmayan hesap: kimlik değişikliği ardından yetki_var_mi (1 = bütün yetkiler açıldı)', 'SIFIR',
     'update public.tanimlar set id = ''a6-canli-sinama'' where id = ''tekil'' ;; select case when public.yetki_var_mi(array[''muhasebe''], ''kaydetme'') then 1 else 0 end'),
    ('L3', 'yok', 'Listede olmayan hesap: kendini Yönetici olarak eklemek', 'RET:42501',
     'with x as (update public.tanimlar set veri = jsonb_set(veri, ''{kullanicilar}'', (veri -> ''kullanicilar'') || jsonb_build_array(jsonb_build_object(''id'', ''a6-sizma'', ''ad'', ''Sizma'', ''kullaniciAdi'', ''a6sizma'', ''rol'', ''Yönetici'', ''yetkiler'', ''{}''::jsonb, ''eposta'', ''a6-canli-sinama@ornek.invalid''))) where id = ''tekil'' returning 1) select count(*) from x'),
    ('L4', 'yok', 'Listede olmayan hesap: yetki_var_mi(muhasebe, kaydetme) (1 = yetkili sanıldı)', 'SIFIR',
     'select case when public.yetki_var_mi(array[''muhasebe''], ''kaydetme'') then 1 else 0 end'),
    ('Y1', 'yon', 'YÖNETİCİ: tanımları aynı değerle güncellemek (uygulamanın tanım yazması)', 'IZIN',
     'with x as (update public.tanimlar set veri = veri where id = ''tekil'' returning 1) select count(*) from x'),
    ('Y2', 'yon', 'YÖNETİCİ: yonetici_mi() = 1', 'BIR', 'select case when public.yonetici_mi() then 1 else 0 end'),
    ('Y3', 'yon', 'YÖNETİCİ: yetki_var_mi(muhasebe, kaydetme) = 1', 'BIR',
     'select case when public.yetki_var_mi(array[''muhasebe''], ''kaydetme'') then 1 else 0 end'),
    ('Y4', 'yon', 'YÖNETİCİ: tanımlar satırının kimliğini değiştirmek (düzeltmeden sonra herkes için ret)', 'RET:42501',
     'with x as (update public.tanimlar set id = ''a6-canli-sinama'' where id = ''tekil'' returning 1) select count(*) from x')
  ) v(sira, kim, deneme, beklenen, sql) loop
    kod := null;
    begin
      execute 'set local role authenticated';
      perform set_config('request.jwt.claims', json_build_object('sub', case t.kim when 'yon' then yon_id else '00000000-0000-4000-8000-0000000000a6' end,
        'email', case t.kim when 'yon' then yon_eposta else 'a6-canli-sinama@ornek.invalid' end, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
      perform set_config('request.headers', '{"x-atolye-surum": "1.744.22"}', true);
      if position(' ;; ' in t.sql) > 0 then execute split_part(t.sql, ' ;; ', 1); execute split_part(t.sql, ' ;; ', 2) into n; else execute t.sql into n; end if;
      raise exception using errcode = 'ZZ001', message = coalesce(n, 0)::text;
    exception
      when sqlstate 'ZZ001' then n := sqlerrm::bigint; izin := true; s := 'İZİN · ' || n || ' (geri alındı)';
      when others then izin := false; n := null; kod := sqlstate; s := 'RET ' || sqlstate || ': ' || left(sqlerrm, 90);
    end;
    d := case
      when t.beklenen like 'RET:%' then case when izin and coalesce(n, 0) > 0 then 'AÇIK' when izin then 'BAŞARISIZ (ret bekleniyordu, etkisiz geçti)'
                                             when kod = split_part(t.beklenen, ':', 2) then 'UYGUN' else 'BAŞARISIZ (beklenmeyen hata)' end
      when t.beklenen = 'SIFIR' then case when izin and coalesce(n, 0) > 0 then 'AÇIK' when izin or kod = '42501' then 'UYGUN' else 'BAŞARISIZ (beklenmeyen hata)' end
      when t.beklenen = 'BIR' then case when izin and n = 1 then 'UYGUN' when izin then 'BAŞARISIZ (0 döndü)' else 'BAŞARISIZ (hata)' end
      else case when izin and coalesce(n, 0) > 0 then 'UYGUN' when izin then 'BAŞARISIZ (etkisiz)' else 'BAŞARISIZ (izin bekleniyordu)' end
    end;
    insert into a6_canli_sinama values (t.sira, case t.kim when 'yon' then 'yönetici' else 'listede yok' end, t.deneme, t.beklenen, s, d);
  end loop;
end $$;
select sira, kim, deneme, beklenen, sonuc, durum from a6_canli_sinama
union all
select 'ZZ', 'ÖZET', 'AÇIK: ' || count(*) filter (where durum = 'AÇIK') || ' · BAŞARISIZ: ' || count(*) filter (where durum like 'BAŞARISIZ%')
       || ' · UYGUN: ' || count(*) filter (where durum like 'UYGUN%') || ' · tanımlar satırı: '
       || (select string_agg(id, ',') from public.tanimlar), '', '', ''
  from a6_canli_sinama
order by 1;
