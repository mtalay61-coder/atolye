-- =====================================================================================================================
--  yetki-sinama.sql — YETKİSİZ İŞLEM SINAMASI, A6 SÜRÜMÜ (18 Kasım 2026; ÜRETİLMİŞ: yetki-sinama-uret.py)
--  YALNIZ DENEME PROJESİNDE çalıştırın (Supabase › SQL Editor › tamamı › Run). Ana projede ÇALIŞTIRMAYIN.
--  Her deneme ayrı bir alt işlemde, PostgREST'in yaptığı gibi `authenticated` rolü + kullanıcının JWT iddialarıyla
--  (request.jwt.claims: sub, email) çalışır; sonuç ne olursa olsun alt işlem GERİ ALINIR — veritabanında iz kalmaz
--  (yalnız sayaçlar/diziler ilerleyebilir). Sürüm kapısı yanıltmasın diye x-atolye-surum başlığı da verilir.
--  Kişiler: personel@atolye.local (Tanımlar'da Personel, hiçbir modül yetkisi yok — adım 8a/8b) ve
--  listedeyok@atolye.local (giriş hesabı olan ama Tanımlar listesinde OLMAYAN biri; "Allow new users to sign up" açıksa herkes böyle olur).
--  ' ;; ' içeren deneme iki ifadedir (ilki uygulanır, ikincisinin sonucu ölçülür; ikisi aynı alt işlemde, birlikte geri alınır).
--  Beklenen: RET:<kod> = YALNIZ o hata koduyla ret (başka hata = BAŞARISIZ) · BIR = 1 dönmeli · IZIN = yönetici işlemi geçmeli
--  (eski sürümde her hata başarılı ret sayılıyordu — 18 Kasım düzeltildi) · RET = hata vermeli · SIFIR = hata ya da 0 · TASARIM-OKUMA / TASARIM-YAZMA = bugünkü tasarımda izinli (rapor).
--  durum: UYGUN · AÇIK (beklenmeyen izin — güvenlik bulgusu) · BİLİNEN AÇIK (tasarım gereği izin, raporlanır)
-- =====================================================================================================================
create temp table if not exists yetki_sinama (sira text, kim text, deneme text, beklenen text, sonuc text, durum text);
truncate yetki_sinama;
do $$
declare
  per_id uuid; yon_id uuid; kod text;
  urun text; cari text; hesap text;
  t record; q text; n bigint; s text; d text; izin boolean;
begin
  select id into per_id from auth.users where lower(email) = 'personel@atolye.local';
  if per_id is null then raise exception 'ÖNCE personel@atolye.local giriş hesabını açın (A6-DENEME.md)'; end if;
  if not exists (select 1 from public.tanimlar, jsonb_array_elements(veri->'kullanicilar') e where id = 'tekil' and lower(e->>'eposta') = 'personel@atolye.local') then
    raise exception 'ÖNCE personel@atolye.local kullanıcısını Tanımlar listesine Personel olarak ekleyin (A6-DENEME.md)';
  end if;
  select id into urun from public.urunler order by id limit 1;
  select id into cari from public.cariler order by id limit 1;
  select id into hesap from public.kas_hesap order by id limit 1;
  for t in select * from (values
    ('A1', 'per', 'Kendi rolünü ''Yönetici'' yapmak (tanimlar.kullanicilar)', 'RET:42501', 'with x as (update public.tanimlar set veri = jsonb_set(veri, ''{kullanicilar}'', (select jsonb_agg(case when lower(e->>''eposta'') = ''personel@atolye.local'' then e || ''{"rol": "Yönetici"}''::jsonb else e end) from jsonb_array_elements(veri->''kullanicilar'') e)) where id = ''tekil'' returning 1) select count(*) from x'),
    ('A2', 'per', 'Listeye kendini yeni bir Yönetici olarak eklemek', 'RET:42501', 'with x as (update public.tanimlar set veri = jsonb_set(veri, ''{kullanicilar}'', (veri->''kullanicilar'') || jsonb_build_array(jsonb_build_object(''id'',''sizma'',''ad'',''Sizma'',''kullaniciAdi'',''sizma'',''rol'',''Yönetici'',''yetkiler'',''{}''::jsonb,''eposta'',''personel@atolye.local''))) where id = ''tekil'' returning 1) select count(*) from x'),
    ('A3', 'per', 'Giriş sistemini kapatmak (girisAktifMi = false → herkese tam yetki)', 'RET:42501', 'with x as (update public.tanimlar set veri = veri || ''{"girisAktifMi": false}''::jsonb where id = ''tekil'' returning 1) select count(*) from x'),
    ('A4', 'per', 'Tanımlar satırını silmek', 'RET:42501', 'with x as (delete from public.tanimlar where id = ''tekil'' returning 1) select count(*) from x'),
    ('A5', 'per', 'Tanımlara ikinci bir satır eklemek', 'RET:42501', 'with x as (insert into public.tanimlar (id, veri) values (''ikinci'', ''{}''::jsonb) returning 1) select count(*) from x'),
    ('A6', 'per', 'Tanımlar satırının kimliğini değiştirmek (''tekil'' → başka)', 'RET:42501', 'with x as (update public.tanimlar set id = ''ele-gecir'' where id = ''tekil'' returning 1) select count(*) from x'),
    ('A6b', 'per', 'A6''nın ardından yetki denetimi: yetki_var_mi(muhasebe, kaydetme) (1 = bütün yetkiler açıldı)', 'SIFIR', 'update public.tanimlar set id = ''ele-gecir'' where id = ''tekil'' ;; select case when public.yetki_var_mi(array[''muhasebe''], ''kaydetme'') then 1 else 0 end'),
    ('A7', 'per', 'Kendini platform yöneticisi yapmak (platform_yoneticileri)', 'RET:42501', 'with x as (insert into public.platform_yoneticileri (kullanici, ad) values (:per_id::uuid, ''sizma'') returning 1) select count(*) from x'),
    ('A8', 'per', 'yonetici_mi() (1 = yönetici sanıldı)', 'SIFIR', 'select case when public.yonetici_mi() then 1 else 0 end'),
    ('A9', 'per', 'platform_yonetici_mi() (1 = platform yöneticisi sanıldı)', 'SIFIR', 'select case when public.platform_yonetici_mi() then 1 else 0 end'),
    ('A10', 'per', 'Tanımlar tablosunu TRUNCATE ile boşaltmak', 'RET:42501', 'truncate public.tanimlar ;; select 0::bigint'),
    ('B1', 'per', 'Giriş hesaplarını okumak (auth.users)', 'RET:42501', 'select count(*) from auth.users'),
    ('B2', 'per', 'Kurulum dosyası üretmek (kurulum_betigi; yalnız Yönetici)', 'RET:42501', 'select length(public.kurulum_betigi())::bigint'),
    ('C1', 'per', 'Fiş tablosuna doğrudan yazmak (stk_fis)', 'RET:42501', 'with x as (insert into public.stk_fis (id, tur) values (''SIZMA-1'', ''Giriş'') returning 1) select count(*) from x'),
    ('C2', 'per', 'Kasa hareketine doğrudan yazmak (kas_hareket)', 'RET:42501', 'with x as (insert into public.kas_hareket (id, hesap_id, veri) values (''sizma'', :hesap, ''{}''::jsonb) returning 1) select count(*) from x'),
    ('C3', 'per', 'Kasa hareketini doğrudan silmek', 'SIFIR', 'with x as (delete from public.kas_hareket returning 1) select count(*) from x'),
    ('C4', 'per', 'Stok ayarını değiştirmek (stk_ayar)', 'SIFIR', 'with x as (update public.stk_ayar set fis_aktif = false returning 1) select count(*) from x'),
    ('C5', 'per', 'Yetkisiz stok girişi (fis_kes; personelin hiçbir modül yetkisi yok)', 'RET:42501', 'select length(public.fis_kes(jsonb_build_object(''istek'', ''sizma-istek-1'', ''fis'', jsonb_build_object(''aile'', ''stok'', ''tur'', ''Giriş'', ''onek'', ''MNL'', ''kaynak'', ''Manuel'', ''defter'', ''Genel'', ''kalemler'', jsonb_build_array(jsonb_build_object(''urunId'', :urun, ''renk'', ''Siyah'', ''miktar'', 5))), ''stok'', jsonb_build_object(''satirlar'', jsonb_build_array(jsonb_build_object(''id'', ''sizma-h-1'', ''urunId'', :urun, ''renk'', ''Siyah'', ''olcu'', ''40'', ''miktar'', 5, ''kaynak'', ''Manuel'')))))::text)::bigint'),
    ('C6', 'per', 'Yetkisiz kasa hareketi (kas_yaz)', 'RET:42501', 'select length(public.kas_yaz(jsonb_build_object(''hareketler'', jsonb_build_array(jsonb_build_object(''id'', ''sizma-k-1'', ''hesap_id'', :hesap, ''veri'', jsonb_build_object(''id'', ''sizma-k-1'', ''tarih'', ''2026-11-18'', ''yon'', ''Çıkış'', ''tutar'', 1000)))))::text)::bigint'),
    ('D1', 'per', 'Denetim günlüğünü silmek (gunluk)', 'RET:42501', 'with x as (delete from public.gunluk returning 1) select count(*) from x'),
    ('D2', 'per', 'Silinenler arşivini silmek (silinen_arsiv)', 'SIFIR', 'with x as (delete from public.silinen_arsiv returning 1) select count(*) from x'),
    ('E1', 'per', 'Carileri okumak', 'TASARIM-OKUMA', 'select count(*) from public.cariler'),
    ('E2', 'per', 'Cari eklemek (doğrudan tablo)', 'TASARIM-YAZMA', 'with x as (insert into public.cariler (id, unvan) values (''sizma-cari'', ''Sizma'') returning 1) select count(*) from x'),
    ('E3', 'per', 'Cari değiştirmek (doğrudan tablo)', 'TASARIM-YAZMA', 'with x as (update public.cariler set unvan = ''Degisti'' where id = :cari returning 1) select count(*) from x'),
    ('E4', 'per', 'Cari silmek (doğrudan tablo)', 'TASARIM-YAZMA', 'with x as (delete from public.cariler where id = :cari returning 1) select count(*) from x'),
    ('E5', 'per', 'Ürün silmek (doğrudan tablo)', 'TASARIM-YAZMA', 'with x as (delete from public.urunler where id = :urun returning 1) select count(*) from x'),
    ('E6', 'per', 'Tanımlarda kullanıcı dışı alanı değiştirmek (renkler)', 'TASARIM-YAZMA', 'with x as (update public.tanimlar set veri = jsonb_set(veri, ''{renkler}'', ''[]''::jsonb) where id = ''tekil'' returning 1) select count(*) from x'),
    ('E7', 'per', 'Silinenler arşivini okumak', 'TASARIM-OKUMA', 'select count(*) from public.silinen_arsiv'),
    ('F1', 'yab', 'LİSTEDE OLMAYAN hesap: tanımları (kullanıcı listesi dahil) okumak', 'TASARIM-OKUMA', 'select count(*) from public.tanimlar'),
    ('F2', 'yab', 'LİSTEDE OLMAYAN hesap: carileri okumak', 'TASARIM-OKUMA', 'select count(*) from public.cariler'),
    ('F3', 'yab', 'LİSTEDE OLMAYAN hesap: cari silmek', 'TASARIM-YAZMA', 'with x as (delete from public.cariler where id = :cari returning 1) select count(*) from x'),
    ('F4', 'yab', 'LİSTEDE OLMAYAN hesap: kendini Yönetici olarak eklemek', 'RET:42501', 'with x as (update public.tanimlar set veri = jsonb_set(veri, ''{kullanicilar}'', (veri->''kullanicilar'') || jsonb_build_array(jsonb_build_object(''id'',''sizma2'',''ad'',''Sizma'',''kullaniciAdi'',''sizma2'',''rol'',''Yönetici'',''yetkiler'',''{}''::jsonb,''eposta'',''listedeyok@atolye.local''))) where id = ''tekil'' returning 1) select count(*) from x'),
    ('F5', 'yab', 'LİSTEDE OLMAYAN hesap: stok girişi (fis_kes)', 'RET:42501', 'select length(public.fis_kes(jsonb_build_object(''istek'', ''sizma-istek-2'', ''fis'', jsonb_build_object(''aile'', ''stok'', ''tur'', ''Giriş'', ''onek'', ''MNL'', ''kaynak'', ''Manuel'', ''defter'', ''Genel'', ''kalemler'', jsonb_build_array(jsonb_build_object(''urunId'', :urun, ''renk'', ''Siyah'', ''miktar'', 5))), ''stok'', jsonb_build_object(''satirlar'', jsonb_build_array(jsonb_build_object(''id'', ''sizma-h-2'', ''urunId'', :urun, ''renk'', ''Siyah'', ''olcu'', ''40'', ''miktar'', 5, ''kaynak'', ''Manuel'')))))::text)::bigint'),
    ('Y1', 'yon', 'YÖNETİCİ: tanımlarda renkleri değiştirmek', 'IZIN', 'with x as (update public.tanimlar set veri = jsonb_set(veri, ''{renkler}'', ''["Siyah", "Beyaz"]''::jsonb) where id = ''tekil'' returning 1) select count(*) from x'),
    ('Y2', 'yon', 'YÖNETİCİ: listeye yeni kullanıcı eklemek', 'IZIN', 'with x as (update public.tanimlar set veri = jsonb_set(veri, ''{kullanicilar}'', (veri->''kullanicilar'') || jsonb_build_array(jsonb_build_object(''id'',''yeni-k'',''ad'',''Yeni'',''kullaniciAdi'',''yeni'',''rol'',''Personel'',''yetkiler'',''{}''::jsonb,''eposta'',''yeni@atolye.local''))) where id = ''tekil'' returning 1) select count(*) from x'),
    ('Y3', 'yon', 'YÖNETİCİ: uygulamanın upsert yolu (insert … on conflict do update)', 'IZIN', 'with x as (insert into public.tanimlar (id, veri) select ''tekil'', veri from public.tanimlar where id = ''tekil'' on conflict (id) do update set veri = excluded.veri returning 1) select count(*) from x'),
    ('Y4', 'yon', 'YÖNETİCİ: yonetici_mi() = 1', 'BIR', 'select case when public.yonetici_mi() then 1 else 0 end'),
    ('Y5', 'yon', 'YÖNETİCİ: yetki_var_mi(muhasebe, kaydetme) = 1', 'BIR', 'select case when public.yetki_var_mi(array[''muhasebe''], ''kaydetme'') then 1 else 0 end'),
    ('Y6', 'yon', 'YÖNETİCİ: giriş ayarını değiştirmek (girisAktifMi true → true, yazma geçmeli)', 'IZIN', 'with x as (update public.tanimlar set veri = veri || ''{"girisAktifMi": true}''::jsonb where id = ''tekil'' returning 1) select count(*) from x'),
    ('Y7', 'yon', 'YÖNETİCİ: tanımlar satırının kimliğini değiştirmek (uygulama yapmaz; düzeltmeden sonra herkes için RET)', 'RET:42501', 'with x as (update public.tanimlar set id = ''yonetici-tasidi'' where id = ''tekil'' returning 1) select count(*) from x')
  ) v(sira, kim, deneme, beklenen, sql) loop
    q := replace(replace(replace(replace(t.sql, ':per_id', quote_literal(per_id::text)), ':urun', quote_nullable(urun)), ':cari', quote_nullable(cari)), ':hesap', quote_nullable(hesap));
    kod := null;
    begin
      execute 'set local role authenticated';
      perform set_config('request.jwt.claims', json_build_object('sub', case t.kim when 'per' then per_id::text when 'yon' then yon_id::text else '00000000-0000-4000-8000-000000000099' end,
        'email', case t.kim when 'per' then 'personel@atolye.local' when 'yon' then 'deneme@atolye.local' else 'listedeyok@atolye.local' end, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
      perform set_config('request.headers', '{"x-atolye-surum": "1.744.25"}', true);
      if position(' ;; ' in q) > 0 then execute split_part(q, ' ;; ', 1); execute split_part(q, ' ;; ', 2) into n; else execute q into n; end if;
      raise exception using errcode = 'ZZ001', message = coalesce(n, 0)::text;
    exception
      when sqlstate 'ZZ001' then n := sqlerrm::bigint; izin := true; s := 'İZİN · ' || n || ' (geri alındı)';
      when others then izin := false; n := null; kod := sqlstate; s := 'RET ' || sqlstate || ': ' || left(sqlerrm, 110);
    end;
    -- SINIFLAMA (18 Kasım düzeltmesi): beklenmeyen hata ASLA "UYGUN" sayılmaz — eski sürüm her hatayı başarılı ret sayıyordu.
    d := case
      when t.beklenen like 'RET:%' then case
        when izin and coalesce(n, 0) > 0 then 'AÇIK'
        when izin then 'BAŞARISIZ (ret bekleniyordu, etkisiz geçti)'
        when kod = split_part(t.beklenen, ':', 2) then 'UYGUN'
        else 'BAŞARISIZ (beklenmeyen hata)' end
      when t.beklenen = 'SIFIR' then case
        when izin and coalesce(n, 0) > 0 then 'AÇIK'
        when izin or kod = '42501' then 'UYGUN'
        else 'BAŞARISIZ (beklenmeyen hata)' end
      when t.beklenen = 'BIR' then case when izin and n = 1 then 'UYGUN' when izin then 'BAŞARISIZ (0 döndü)' else 'BAŞARISIZ (hata)' end
      when t.beklenen = 'IZIN' then case when izin and coalesce(n, 0) > 0 then 'UYGUN' when izin then 'BAŞARISIZ (etkisiz)' else 'BAŞARISIZ (izin bekleniyordu)' end
      when t.beklenen = 'TASARIM-OKUMA' then case when izin then 'BİLİNEN AÇIK (okuma)' when kod = '42501' then 'UYGUN' else 'BAŞARISIZ (beklenmeyen hata)' end
      else case when izin and coalesce(n, 0) > 0 then 'BİLİNEN AÇIK (yazma)' when kod = '42501' then 'UYGUN' when izin then 'BAŞARISIZ (etkisiz)' else 'BAŞARISIZ (beklenmeyen hata)' end
    end;
    insert into yetki_sinama values (t.sira, case t.kim when 'per' then 'personel' when 'yon' then 'yönetici' else 'listede yok' end, t.deneme, t.beklenen, s, d);
  end loop;
end $$;
select sira, kim, deneme, beklenen, sonuc, durum from yetki_sinama
union all
select 'ZZ', 'ÖZET', 'AÇIK: ' || count(*) filter (where durum = 'AÇIK') || ' · BAŞARISIZ: ' || count(*) filter (where durum like 'BAŞARISIZ%')
       || ' · BİLİNEN AÇIK: ' || count(*) filter (where durum like 'BİLİNEN%') || ' · UYGUN: ' || count(*) filter (where durum like 'UYGUN%'), '', '', ''
  from yetki_sinama
order by 1;

