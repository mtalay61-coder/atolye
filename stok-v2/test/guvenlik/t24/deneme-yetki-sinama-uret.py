# deneme-yetki-sinama.sql üreticisi: SQL Editor kuralı (yalnız düz $$) yüzünden dinamik SQL'ler tek tırnaklı yazılır;
# tırnak ikilemeyi elle yapmamak için buradan üretilir.
import sys
P = "personel@atolye.local"; Y = "listede-yok@ornek.test"
def k(s): return "'" + s.replace("'", "''") + "'"
T = [
 # (sıra, kim, deneme, beklenen, sql)  — sql tek bir sayı döndürür; :urun :cari :hesap :per_id yer tutucu
 ("A1","per","Kendi rolünü 'Yönetici' yapmak (tanimlar.kullanicilar)","RET",
  "with x as (update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (select jsonb_agg(case when lower(e->>'eposta') = '"+P+"' then e || '{\"rol\": \"Yönetici\"}'::jsonb else e end) from jsonb_array_elements(veri->'kullanicilar') e)) where id = 'tekil' returning 1) select count(*) from x"),
 ("A2","per","Listeye kendini yeni bir Yönetici olarak eklemek","RET",
  "with x as (update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (veri->'kullanicilar') || jsonb_build_array(jsonb_build_object('id','sizma','ad','Sizma','kullaniciAdi','sizma','rol','Yönetici','yetkiler','{}'::jsonb,'eposta','"+P+"'))) where id = 'tekil' returning 1) select count(*) from x"),
 ("A3","per","Giriş sistemini kapatmak (girisAktifMi = false → herkese tam yetki)","RET",
  "with x as (update public.tanimlar set veri = veri || '{\"girisAktifMi\": false}'::jsonb where id = 'tekil' returning 1) select count(*) from x"),
 ("A4","per","Tanımlar satırını silmek","RET","with x as (delete from public.tanimlar where id = 'tekil' returning 1) select count(*) from x"),
 ("A5","per","Tanımlara ikinci bir satır eklemek","RET","with x as (insert into public.tanimlar (id, veri) values ('ikinci', '{}'::jsonb) returning 1) select count(*) from x"),
 ("A6","per","Tanımlar satırının kimliğini değiştirmek ('tekil' → başka)","RET",
  "with x as (update public.tanimlar set id = 'ele-gecir' where id = 'tekil' returning 1) select count(*) from x"),
 ("A6b","per","A6'nın ardından yetki denetimi: yetki_var_mi(muhasebe, kaydetme) (1 = bütün yetkiler açıldı)","SIFIR",
  "update public.tanimlar set id = 'ele-gecir' where id = 'tekil' ;; select case when public.yetki_var_mi(array['muhasebe'], 'kaydetme') then 1 else 0 end"),
 ("A7","per","Kendini platform yöneticisi yapmak (platform_yoneticileri)","RET",
  "with x as (insert into public.platform_yoneticileri (kullanici, ad) values (:per_id::uuid, 'sizma') returning 1) select count(*) from x"),
 ("A8","per","yonetici_mi() (1 = yönetici sanıldı)","SIFIR","select case when public.yonetici_mi() then 1 else 0 end"),
 ("A9","per","platform_yonetici_mi() (1 = platform yöneticisi sanıldı)","SIFIR","select case when public.platform_yonetici_mi() then 1 else 0 end"),
 ("B1","per","Giriş hesaplarını okumak (auth.users)","RET","select count(*) from auth.users"),
 ("B2","per","Kurulum dosyası üretmek (kurulum_betigi; yalnız Yönetici)","RET","select length(public.kurulum_betigi())::bigint"),
 ("C1","per","Fiş tablosuna doğrudan yazmak (stk_fis)","RET","with x as (insert into public.stk_fis (id, tur) values ('SIZMA-1', 'Giriş') returning 1) select count(*) from x"),
 ("C2","per","Kasa hareketine doğrudan yazmak (kas_hareket)","RET","with x as (insert into public.kas_hareket (id, hesap_id, veri) values ('sizma', :hesap, '{}'::jsonb) returning 1) select count(*) from x"),
 ("C3","per","Kasa hareketini doğrudan silmek","SIFIR","with x as (delete from public.kas_hareket returning 1) select count(*) from x"),
 ("C4","per","Stok ayarını değiştirmek (stk_ayar)","SIFIR","with x as (update public.stk_ayar set fis_aktif = false returning 1) select count(*) from x"),
 ("C5","per","Yetkisiz stok girişi (fis_kes; personelin hiçbir modül yetkisi yok)","RET",
  "select length(public.fis_kes(jsonb_build_object('istek', 'sizma-istek-1', 'fis', jsonb_build_object('aile', 'stok', 'tur', 'Giriş', 'onek', 'MNL', 'kaynak', 'Manuel', 'defter', 'Genel', 'kalemler', jsonb_build_array(jsonb_build_object('urunId', :urun, 'renk', 'Siyah', 'miktar', 5))), 'stok', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'sizma-h-1', 'urunId', :urun, 'renk', 'Siyah', 'olcu', '40', 'miktar', 5, 'kaynak', 'Manuel')))))::text)::bigint"),
 ("C6","per","Yetkisiz kasa hareketi (kas_yaz)","RET",
  "select length(public.kas_yaz(jsonb_build_object('hareketler', jsonb_build_array(jsonb_build_object('id', 'sizma-k-1', 'hesap_id', :hesap, 'veri', jsonb_build_object('id', 'sizma-k-1', 'tarih', '2026-11-18', 'yon', 'Çıkış', 'tutar', 1000)))))::text)::bigint"),
 ("D1","per","Denetim günlüğünü silmek (gunluk)","RET","with x as (delete from public.gunluk returning 1) select count(*) from x"),
 ("D2","per","Silinenler arşivini silmek (silinen_arsiv)","SIFIR","with x as (delete from public.silinen_arsiv returning 1) select count(*) from x"),
 ("E1","per","Carileri okumak","TASARIM-OKUMA","select count(*) from public.cariler"),
 ("E2","per","Cari eklemek (doğrudan tablo)","TASARIM-YAZMA","with x as (insert into public.cariler (id, unvan) values ('sizma-cari', 'Sizma') returning 1) select count(*) from x"),
 ("E3","per","Cari değiştirmek (doğrudan tablo)","TASARIM-YAZMA","with x as (update public.cariler set unvan = 'Degisti' where id = :cari returning 1) select count(*) from x"),
 ("E4","per","Cari silmek (doğrudan tablo)","TASARIM-YAZMA","with x as (delete from public.cariler where id = :cari returning 1) select count(*) from x"),
 ("E5","per","Ürün silmek (doğrudan tablo)","TASARIM-YAZMA","with x as (delete from public.urunler where id = :urun returning 1) select count(*) from x"),
 ("E6","per","Tanımlarda kullanıcı dışı alanı değiştirmek (renkler)","TASARIM-YAZMA","with x as (update public.tanimlar set veri = jsonb_set(veri, '{renkler}', '[]'::jsonb) where id = 'tekil' returning 1) select count(*) from x"),
 ("E7","per","Silinenler arşivini okumak","TASARIM-OKUMA","select count(*) from public.silinen_arsiv"),
 ("F1","yab","LİSTEDE OLMAYAN hesap: tanımları (kullanıcı listesi dahil) okumak","TASARIM-OKUMA","select count(*) from public.tanimlar"),
 ("F2","yab","LİSTEDE OLMAYAN hesap: carileri okumak","TASARIM-OKUMA","select count(*) from public.cariler"),
 ("F3","yab","LİSTEDE OLMAYAN hesap: cari silmek","TASARIM-YAZMA","with x as (delete from public.cariler where id = :cari returning 1) select count(*) from x"),
 ("F4","yab","LİSTEDE OLMAYAN hesap: kendini Yönetici olarak eklemek","RET",
  "with x as (update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (veri->'kullanicilar') || jsonb_build_array(jsonb_build_object('id','sizma2','ad','Sizma','kullaniciAdi','sizma2','rol','Yönetici','yetkiler','{}'::jsonb,'eposta','"+Y+"'))) where id = 'tekil' returning 1) select count(*) from x"),
 ("F5","yab","LİSTEDE OLMAYAN hesap: stok girişi (fis_kes)","RET",
  "select length(public.fis_kes(jsonb_build_object('istek', 'sizma-istek-2', 'fis', jsonb_build_object('aile', 'stok', 'tur', 'Giriş', 'onek', 'MNL', 'kaynak', 'Manuel', 'defter', 'Genel', 'kalemler', jsonb_build_array(jsonb_build_object('urunId', :urun, 'renk', 'Siyah', 'miktar', 5))), 'stok', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'sizma-h-2', 'urunId', :urun, 'renk', 'Siyah', 'olcu', '40', 'miktar', 5, 'kaynak', 'Manuel')))))::text)::bigint"),
]
satirlar = ",\n    ".join("(" + ", ".join([k(a), k(b), k(c), k(d), k(e)]) + ")" for a, b, c, d, e in T)
print(f"""-- =====================================================================================================================
--  deneme-yetki-sinama.sql — YÖNETİCİ OLMAYAN KULLANICI İLE YETKİSİZ İŞLEM SINAMASI (18 Kasım 2026)
--  YALNIZ DENEME PROJESİNDE çalıştırın (Supabase › SQL Editor › tamamı › Run). Ana projede ÇALIŞTIRMAYIN.
--  Her deneme ayrı bir alt işlemde, PostgREST'in yaptığı gibi `authenticated` rolü + kullanıcının JWT iddialarıyla
--  (request.jwt.claims: sub, email) çalışır; sonuç ne olursa olsun alt işlem GERİ ALINIR — veritabanında iz kalmaz
--  (yalnız sayaçlar/diziler ilerleyebilir). Sürüm kapısı yanıltmasın diye x-atolye-surum başlığı da verilir.
--  Kişiler: {P} (Tanımlar'da Personel, hiçbir modül yetkisi yok — adım 8a/8b) ve
--  {Y} (giriş hesabı olan ama Tanımlar listesinde OLMAYAN biri; "Allow new users to sign up" açıksa herkes böyle olur).
--  ' ;; ' içeren deneme iki ifadedir (ilki uygulanır, ikincisinin sonucu ölçülür; ikisi aynı alt işlemde, birlikte geri alınır).
--  Beklenen: RET = hata vermeli · SIFIR = hata ya da 0 · TASARIM-OKUMA / TASARIM-YAZMA = bugünkü tasarımda izinli (rapor).
--  durum: UYGUN · AÇIK (beklenmeyen izin — güvenlik bulgusu) · BİLİNEN AÇIK (tasarım gereği izin, raporlanır)
-- =====================================================================================================================
create temp table if not exists yetki_sinama (sira text, kim text, deneme text, beklenen text, sonuc text, durum text);
truncate yetki_sinama;
do $$
declare
  per_id uuid;
  urun text; cari text; hesap text;
  t record; q text; n bigint; s text; d text; izin boolean;
begin
  select id into per_id from auth.users where lower(email) = '{P}';
  if per_id is null then raise exception 'ÖNCE {P} giriş hesabını açın (DENEME-PROJESI.md adım 8a)'; end if;
  if not exists (select 1 from public.tanimlar, jsonb_array_elements(veri->'kullanicilar') e where id = 'tekil' and lower(e->>'eposta') = '{P}') then
    raise exception 'ÖNCE {P} kullanıcısını Tanımlar listesine Personel olarak ekleyin (adım 8b)';
  end if;
  select id into urun from public.urunler order by id limit 1;
  select id into cari from public.cariler order by id limit 1;
  select id into hesap from public.kas_hesap order by id limit 1;
  for t in select * from (values
    {satirlar}
  ) v(sira, kim, deneme, beklenen, sql) loop
    q := replace(replace(replace(replace(t.sql, ':per_id', quote_literal(per_id::text)), ':urun', quote_nullable(urun)), ':cari', quote_nullable(cari)), ':hesap', quote_nullable(hesap));
    begin
      execute 'set local role authenticated';
      perform set_config('request.jwt.claims', json_build_object('sub', case when t.kim = 'per' then per_id::text else '00000000-0000-4000-8000-000000000099' end,
        'email', case when t.kim = 'per' then '{P}' else '{Y}' end, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
      perform set_config('request.headers', '{{"x-atolye-surum": "1.744.25"}}', true);
      if position(' ;; ' in q) > 0 then execute split_part(q, ' ;; ', 1); execute split_part(q, ' ;; ', 2) into n; else execute q into n; end if;
      raise exception using errcode = 'ZZ001', message = coalesce(n, 0)::text;
    exception
      when sqlstate 'ZZ001' then n := sqlerrm::bigint; izin := true; s := 'İZİN · ' || n || ' (geri alındı)';
      when others then izin := false; n := null; s := 'RET ' || sqlstate || ': ' || left(sqlerrm, 110);
    end;
    d := case
      when t.beklenen = 'RET' then case when izin and coalesce(n, 0) > 0 then 'AÇIK' when izin then 'UYGUN (etkisiz)' else 'UYGUN' end
      when t.beklenen = 'SIFIR' then case when izin and coalesce(n, 0) > 0 then 'AÇIK' else 'UYGUN' end
      when t.beklenen = 'TASARIM-OKUMA' then case when izin then 'BİLİNEN AÇIK (okuma)' else 'UYGUN' end
      else case when izin and coalesce(n, 0) > 0 then 'BİLİNEN AÇIK (yazma)' when izin then 'UYGUN (etkisiz)' else 'UYGUN' end end;
    insert into yetki_sinama values (t.sira, case when t.kim = 'per' then 'personel' else 'listede yok' end, t.deneme, t.beklenen, s, d);
  end loop;
end $$;
select sira, kim, deneme, beklenen, sonuc, durum from yetki_sinama order by sira;
""")
