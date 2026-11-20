-- =====================================================================================================================
--  24-faz04-koruma-envanteri-salt-okur.sql — FAZ 0.4: CANLI KORUMA ENVANTERİ (SALT OKUR; tek select, hiçbir şey yazmaz)
--  Supabase › SQL Editor › New query › tamamı › Run → sonuç tablosunun sağ üstünden "Download CSV" → dosyayı sohbete yükleyin.
--  KİŞİSEL VERİ / SIR DÖNMEZ: yalnız nesne adları, türleri, tetikleyici tanımları, yetki adları, kod özetleri (md5) ve
--  stk_ayar'ın v2 bayrakları. Fonksiyon gövdeleri ve satır verisi dönmez.
--  Bölümler (sütunlar: bolum · sira · nesne · deger):
--    R  public'teki her ilişki: tür (tablo / görünüm / …), RLS, authenticated ve anon'un YAZMA yetkileri (I U D T)
--    T  public'teki her kullanıcı tetikleyicisi: fonksiyon(argümanlar) · zaman · olaylar · düzey · etkinlik (O etkin, D kapalı,
--       R yalnız replica, A her zaman)
--    F  tetikleyicilerin çağırdığı ve yetkiyi denetleyen fonksiyonlar: gövde md5 (yorum / boşluk normalize — A6 dosyalarıyla
--       aynı kural), security definer, search_path, authenticated çalıştırabilir mi
--    G  görünüme çevrilmiş eski tablolar (muhasebe, faturalar, …): görünüm mü, doğrudan yazılabilir mi (information_schema),
--       INSTEAD OF tetikleyicisi, authenticated yazma yetkisi; yerine geçen sunucu yolunun yetki denetimi (kas_yaz, lst_yaz)
--    S  stk_ayar v2 bayrakları (kasa / liste geçişi yapıldı mı, hangi listeler taşındı)
--    Z  özet md5'leri (yerel kaynakla tek satırda karşılaştırma için; sıralama collate "C" — Supabase en_US.UTF-8)
-- =====================================================================================================================
with
iliski as (
  select c.oid, c.relname as ad,
         case c.relkind when 'r' then 'tablo' when 'p' then 'bölümlü tablo' when 'v' then 'görünüm' when 'm' then 'somut görünüm'
                        when 'f' then 'dış tablo' else c.relkind::text end as tur,
         c.relrowsecurity as rls, c.relforcerowsecurity as rls_zorunlu
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'f')
),
yazma(oid, rol, harfler) as (
  select i.oid, r.rol,
         coalesce(nullif(concat(case when has_table_privilege(r.rol, i.oid, 'INSERT') then 'I' end,
                                case when has_table_privilege(r.rol, i.oid, 'UPDATE') then 'U' end,
                                case when has_table_privilege(r.rol, i.oid, 'DELETE') then 'D' end,
                                case when has_table_privilege(r.rol, i.oid, 'TRUNCATE') then 'T' end), ''), '-')
    from iliski i cross join (values ('authenticated'), ('anon')) r(rol)
),
tetik as (
  select g.oid, c.relname as tablo, g.tgname as ad, g.tgfoid,
         p.proname as fonksiyon,
         rtrim(replace(encode(g.tgargs, 'escape'), '\000', ','), ',') as arg,   -- dolarsız (SQL Editor kuralı)
         case when g.tgtype & 64 = 64 then 'INSTEAD OF' when g.tgtype & 2 = 2 then 'BEFORE' else 'AFTER' end as zaman,
         concat_ws(',', case when g.tgtype & 4 = 4 then 'INSERT' end, case when g.tgtype & 16 = 16 then 'UPDATE' end,
                        case when g.tgtype & 8 = 8 then 'DELETE' end, case when g.tgtype & 32 = 32 then 'TRUNCATE' end) as olay,
         case when g.tgtype & 1 = 1 then 'satır' else 'ifade' end as duzey,
         g.tgenabled::text as etkin
    from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_proc p on p.oid = g.tgfoid
   where c.relnamespace = 'public'::regnamespace and not g.tgisinternal
),
fonk as (
  select distinct p.oid, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as ad
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and (p.oid in (select tgfoid from tetik)
          or p.proname in ('yetki_var_mi', 'stk_yetki', 'yonetici_mi', 'platform_yonetici_mi', 'kas_yaz', 'lst_yaz', 'fis_kes',
                           'v2_yazma_acik', 'yazma_yetkisi_koruma', 'tanimlar_kullanici_koruma'))
),
fonk_bilgi as (
  select f.ad,
         md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) as govde_md5,
         p.prosecdef as definer, coalesce(array_to_string(p.proconfig, ' '), '(yol yok)') as ayar,
         has_function_privilege('authenticated', p.oid, 'execute') as auth_calistirir
    from fonk f join pg_proc p on p.oid = f.oid
),
gorunum(ad) as (
  values ('muhasebe'), ('faturalar'), ('teklifler'), ('koliler'), ('gorevler'), ('modeller'), ('fis_defteri'), ('mesajlar'),
         ('varyantlar'), ('stok_hareketleri'), ('cari_hareketleri')
),
govde(ad, metin) as (
  select p.proname, regexp_replace(p.prosrc, '\s+', ' ', 'g') from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname in ('kas_yaz', 'lst_yaz', 'stk_yetki')
),
satir(bolum, sira, nesne, deger) as (
  -- R: ilişkiler
  select 'R', 1, i.ad,
         i.tur || ' · rls ' || case when i.tur like '%tablo' then (case when i.rls then 'açık' else 'kapalı' end) || (case when i.rls_zorunlu then '/zorunlu' else '' end) else '-' end
         || ' · auth ' || (select harfler from yazma y where y.oid = i.oid and y.rol = 'authenticated')
         || ' · anon ' || (select harfler from yazma y where y.oid = i.oid and y.rol = 'anon')
    from iliski i
  -- T: tetikleyiciler
  union all
  select 'T', 2, t.tablo || '.' || t.ad,
         t.fonksiyon || '(' || t.arg || ') · ' || t.zaman || ' · ' || t.olay || ' · ' || t.duzey || ' · ' || t.etkin
    from tetik t
  -- F: fonksiyonlar
  union all
  select 'F', 3, b.ad,
         b.govde_md5 || ' · definer ' || b.definer::text || ' · ' || b.ayar || ' · auth çalıştırır ' || b.auth_calistirir::text
    from fonk_bilgi b
  -- G: görünüme çevrilen tablolar ve yerine geçen yazma yolu
  union all
  select 'G', 4, g.ad,
         coalesce((select i.tur from iliski i where i.ad = g.ad), 'YOK')
         || ' · eski_' || g.ad || ': ' || coalesce((select i.tur from iliski i where i.ad = 'eski_' || g.ad), 'yok')
         || ' · doğrudan yazılabilir: ' || coalesce((select v.is_insertable_into || '/' || v.is_updatable from information_schema.views v
                                                      where v.table_schema = 'public' and v.table_name = g.ad), '-')
         || ' · INSTEAD OF: ' || (select count(*) from tetik t where t.tablo = g.ad and t.zaman = 'INSTEAD OF')
         || ' · auth yazma: ' || coalesce((select y.harfler from yazma y join iliski i on i.oid = y.oid where i.ad = g.ad and y.rol = 'authenticated'), '-')
    from gorunum g
  union all
  select 'G', 5, 'kas_yaz (muhasebe yerine)',
         coalesce((select 'var · stk_yetki(muhasebe|fisler|cari, kaydetme): '
                   || (position('stk_yetki(array[''muhasebe'', ''fisler'', ''cari''], ''kaydetme'')' in metin) > 0)::text
                   || ' · yalnız kur serbest: ' || (position('if not yalniz_kur then' in metin) > 0)::text
                   || ' · v2_yazma_acik(kasa): ' || (position('v2_yazma_acik(''kasa'')' in metin) > 0)::text
                   from govde where ad = 'kas_yaz'), 'YOK')
  union all
  select 'G', 5, 'lst_yaz (faturalar yerine)',
         coalesce((select 'var · faturalar → stk_yetki(fisler|muhasebe, kaydetme): '
                   || (position('if t = ''faturalar'' then perform public.stk_yetki(array[''fisler'', ''muhasebe''], ''kaydetme'')' in metin) > 0)::text
                   || ' · v2_yazma_acik(liste): ' || (position('v2_yazma_acik(''liste'')' in metin) > 0)::text
                   from govde where ad = 'lst_yaz'), 'YOK')
  union all
  select 'G', 5, 'stk_yetki (ortak denetim)',
         coalesce((select 'var · jetonsuz serbest: ' || (position('if auth.jwt() is null then return; end if;' in metin) > 0)::text
                   || ' · yetki_var_mi çağırır: ' || (position('public.yetki_var_mi(moduller, islem)' in metin) > 0)::text
                   from govde where ad = 'stk_yetki'), 'YOK')
  -- S: v2 bayrakları
  union all
  select 'S', 6, 'stk_ayar',
         coalesce((select 'kasa_aktif ' || coalesce(a.kasa_aktif::text, '-') || ' · liste_aktif ' || coalesce(a.liste_aktif::text, '-')
                          || ' · liste_tablolari ' || coalesce(array_to_string(a.liste_tablolari, ','), '-')
                     from public.stk_ayar a where a.id = 'tekil'), 'yok')
)
select bolum, nesne, deger from (
  select bolum, sira, nesne, deger from satir
  union all
  select 'Z', 9, 'özet: ilişki türleri (' || (select count(*) from iliski) || ')',
         (select md5(string_agg(ad || ':' || tur, ',' order by ad collate "C")) from iliski)
  union all
  select 'Z', 9, 'özet: tetikleyiciler (' || (select count(*) from tetik) || ')',
         (select md5(string_agg(tablo || '.' || ad || ':' || fonksiyon || '(' || arg || '):' || zaman || ':' || olay || ':' || duzey || ':' || etkin, ','
                                order by tablo collate "C", ad collate "C")) from tetik)
  union all
  select 'Z', 9, 'özet: fonksiyon gövdeleri (' || (select count(*) from fonk_bilgi) || ')',
         (select md5(string_agg(ad || ':' || govde_md5, ',' order by ad collate "C")) from fonk_bilgi)
) x
order by sira, nesne collate "C";
