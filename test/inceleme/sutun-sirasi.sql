-- YEREL TEST TABANI: sütun SIRASI canlıya (27 Kasım). 25 sorgusu sütun sırasını vermiyor; canlıdaki siparisler_okuma görünümü
-- `jsonb_populate_record(NULL::siparisler, …) r(id, siparis_no, …)` ile sütunları SIRAYLA adlandırıyor — yerel sıra farklıyken görünüm yanlış
-- sütunları eşliyordu (durum ↔ tarih …). Sıra görünümün kendi listesinden: aşağıdaki sütunlar bu sırayla sona taşınır (tür, varsayılan, boş
-- olamaz korunur; bağımlı görünüm / tetikleyici / indeks cascade ile düşer — ardından canli-tam-hizala yeniden çalıştırılır).
create or replace function pg_temp.sona_tasi(t text, s text) returns void language plpgsql as '
declare tip text; df text; nn boolean;
begin
  select format_type(a.atttypid, a.atttypmod), pg_get_expr(d.adbin, d.adrelid), a.attnotnull into tip, df, nn
    from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where a.attrelid = (''public.'' || t)::regclass and a.attname = s;
  execute format(''alter table public.%I add column %I %s'', t, s || ''__y'', tip);
  execute format(''update public.%I set %I = %I'', t, s || ''__y'', s);
  execute format(''alter table public.%I drop column %I cascade'', t, s);
  execute format(''alter table public.%I rename column %I to %I'', t, s || ''__y'', s);
  if df is not null then execute format(''alter table public.%I alter column %I set default %s'', t, s, df); end if;
  if nn then execute format(''alter table public.%I alter column %I set not null'', t, s); end if;
end';
set session_replication_role = replica;
select pg_temp.sona_tasi('siparisler', c) from unnest(array['tarih', 'teslim_tarihi', 'durum', 'musteri_kodu', 'defter_tercihi',
  'kayit_para_birimi', 'kayit_kurlari', 'ambalaj', 'not_metni', 'surum', 'olusturma', 'olusturuldu', 'ek']) with ordinality u(c, n) order by n;
set session_replication_role = origin;
