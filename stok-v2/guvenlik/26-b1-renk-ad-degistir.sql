-- B1 — RENK ADI DEĞİŞİKLİĞİ SUNUCUDA TEK İŞLEM (27 Kasım, kapsamlı inceleme 25 bulgusu B1). HAZIRLIK — canlıya UYGULANMADI.
--
-- SORUN (kanıt: test/inceleme/ekran-ad-bag.js): sipariş kalemi, üretim, rezervasyon, koli, reçete, renk resmi ve harici barkod
-- varyanta renk ADIYLA bağlı. Ad değişikliğini istemci (082 hammaddeRenkAdDegistir) kendi BELLEĞİNDEKİ listelerden çevirip 5–6 ayrı
-- yazmayla gönderiyordu: başka cihazın az önce eklediği ve bu cihazın henüz görmediği kalem eski adda kalıyor, bağı kopuyordu. Önce
-- tazelemek çözüm değil: tazelemeden hemen sonra başka cihaz yine yazabilir (kullanıcı, 27 Kasım).
--
-- ÇÖZÜM — üç parça:
--   1. `tanim_renk_ad_degistir(p)`: Tanımlar satırını FOR UPDATE, adın geçtiği tabloları EXCLUSIVE kilitler (yalnız okuma serbest; o
--      tablolara yazan her işlem — fis_kes dahil — bu işlem bitene kadar bekler, bu işlem de başladıktan sonra kimseyi beklemez →
--      kilitlenme yok), Tanımlar'daki adı ve BÜTÜN metin bağlarını aynı işlemde günceller. Eşleme istemcideki 046
--      `renkAdVaryantReceteUygula` ile aynı: rengin kendi adı kimlikle (damgalıysa) ya da adla; kombinasyon etiketi YALNIZ adla.
--      Değişen satırların sürümü artar (siparisler / urunler tetikleyiciyle, uretim / stok_rezervasyonlari elle) → bayat cihazın o
--      satırlara sürüm koşullu yazması çakışma alır, eski adı geri yazamaz.
--   2. `tanim_ad_gecmisi`: her eski ad → renk kimliği. İşlemle birlikte yazılır.
--   3. `tanim_ad_guncelle_tetik`: siparis_kalemleri / uretim / stok_rezervasyonlari / koliler'e EKLENEN ya da renk alanı değişen
--      satırda renk, şu an hiçbir etkin rengin adı değilse ve geçmişte bir rengin eski adıysa, o rengin GÜNCEL adına çevrilir. Böylece
--      ad değişikliğinden SONRA bayat cihazın eski adla gönderdiği yeni kayıt da bağlı kalır. Eski ad sonradan başka bir renge verilmişse
--      (etkin renk adı) dokunulmaz.
-- İstek tekrarı: aynı istek ikinci kez gelirse (yanıt kaybı) ad zaten yeni addır → `zaten: true`, hiçbir şey yazılmaz.
-- Yetki: listede olmayan hesap ve Tanımlar "düzenleme" yetkisi olmayan hesap reddedilir (42501). Jetonsuz çağrı (SQL Editor) serbest.
-- Kurallar (KR…): KR020 renk yok · KR021 ad bu arada değişmiş (bayat istek) · KR022 aynı ad başka renkte · KR023 boş ad · KR024 yeni
--   kombinasyon etiketi başka etkin renkle çakışıyor.
-- Kapsam dışı (ayrı iş): beden adı değişikliği (082 olcuAdDegistir) aynı kalıpla sonra; teklifler (082 de çevirmiyordu).

create table if not exists public.tanim_ad_gecmisi (
  id bigserial primary key,
  renk_id text not null,
  eski_ad text not null,
  eski_nrm text not null,
  yeni_ad text not null,
  zaman timestamptz not null default now(),
  eposta text
);
create index if not exists tanim_ad_gecmisi_nrm on public.tanim_ad_gecmisi (eski_nrm, zaman desc);
alter table public.tanim_ad_gecmisi enable row level security;
revoke all on public.tanim_ad_gecmisi from anon, authenticated;
grant select on public.tanim_ad_gecmisi to authenticated;
drop policy if exists tanim_ad_gecmisi_okuma on public.tanim_ad_gecmisi;
create policy tanim_ad_gecmisi_okuma on public.tanim_ad_gecmisi for select to authenticated using (true);

-- Bir renk metninin GÜNCEL karşılığı: etkin bir rengin adıysa kendisi; değilse en son eski adı olduğu rengin bugünkü adı; yoksa kendisi.
create or replace function public.tanim_ad_guncel(x text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n text := public.stk_nrm(x);
  g text;
begin
  if n is null then return x; end if;
  if exists (select 1 from public.stk_renk s where s.aktif and public.stk_nrm(s.ad) = n) then return x; end if;
  select s.ad into g
    from public.tanim_ad_gecmisi h join public.stk_renk s on s.id = h.renk_id and s.aktif
   where h.eski_nrm = n
   order by h.zaman desc, h.id desc
   limit 1;
  return coalesce(g, x);
end $$;

create or replace function public.tanim_ad_guncelle_tetik()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Liste v2 (lst_kayit): her koli ayrı satır, veri = koli nesnesi.
  if tg_table_name = 'lst_kayit' then
    if new.tablo = 'koliler' and jsonb_typeof(new.veri -> 'kalemler') = 'array' then
      new.veri := jsonb_set(new.veri, '{kalemler}', (
        select coalesce(jsonb_agg(case when x ? 'renk' and jsonb_typeof(x -> 'renk') = 'string'
                                       then jsonb_set(x, '{renk}', to_jsonb(public.tanim_ad_guncel(x ->> 'renk'))) else x end
                                  order by o), '[]'::jsonb)
          from jsonb_array_elements(new.veri -> 'kalemler') with ordinality as kk(x, o)));
    end if;
    return new;
  end if;
  -- Liste v2'ye geçmemiş kurulum: koliler TABLOSU, veri = koli dizisi.
  if tg_table_name = 'koliler' then
    if jsonb_typeof(new.veri) = 'array' then
      new.veri := (
        select coalesce(jsonb_agg(
                 case when jsonb_typeof(k -> 'kalemler') = 'array' then
                   jsonb_set(k, '{kalemler}', (
                     select coalesce(jsonb_agg(case when x ? 'renk' and jsonb_typeof(x -> 'renk') = 'string'
                                                    then jsonb_set(x, '{renk}', to_jsonb(public.tanim_ad_guncel(x ->> 'renk'))) else x end
                                               order by o), '[]'::jsonb)
                       from jsonb_array_elements(k -> 'kalemler') with ordinality as kk(x, o)))
                 else k end order by i), '[]'::jsonb)
          from jsonb_array_elements(new.veri) with ordinality as e(k, i));
    end if;
    return new;
  end if;
  if new.renk is not null then
    new.renk := public.tanim_ad_guncel(new.renk);
  end if;
  return new;
end $$;

drop trigger if exists tanim_ad_guncelle on public.siparis_kalemleri;
create trigger tanim_ad_guncelle before insert or update of renk on public.siparis_kalemleri
  for each row execute function public.tanim_ad_guncelle_tetik();
drop trigger if exists tanim_ad_guncelle on public.uretim;
create trigger tanim_ad_guncelle before insert or update of renk on public.uretim
  for each row execute function public.tanim_ad_guncelle_tetik();
drop trigger if exists tanim_ad_guncelle on public.stok_rezervasyonlari;
create trigger tanim_ad_guncelle before insert or update of renk on public.stok_rezervasyonlari
  for each row execute function public.tanim_ad_guncelle_tetik();
-- Koliler: liste v2'de lst_kayit (tablo = 'koliler'); geçmemiş kurulumda koliler TABLOSU. Hangisi varsa ona.
do $$
begin
  if to_regclass('public.lst_kayit') is not null then
    execute 'drop trigger if exists tanim_ad_guncelle on public.lst_kayit';
    execute 'create trigger tanim_ad_guncelle before insert or update of veri on public.lst_kayit for each row execute function public.tanim_ad_guncelle_tetik()';
  end if;
  if exists (select 1 from pg_class where oid = to_regclass('public.koliler') and relkind = 'r') then
    execute 'drop trigger if exists tanim_ad_guncelle on public.koliler';
    execute 'create trigger tanim_ad_guncelle before insert or update of veri on public.koliler for each row execute function public.tanim_ad_guncelle_tetik()';
  end if;
end $$;

create or replace function public.tanim_renk_ad_degistir(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := p ->> 'renk_id';
  v_yeni text := btrim(regexp_replace(coalesce(p ->> 'yeni_ad', ''), '\s+', ' ', 'g'));
  v_beklenen text := p ->> 'eski_ad';
  t jsonb;
  v_sira int;
  v_eski text;
  v_kombi jsonb;
  v_eposta text := lower(coalesce(auth.jwt() ->> 'email', ''));
  n_kalem int := 0; n_siparis int := 0; n_uretim int := 0; n_rez int := 0; n_koli int := 0; n_urun int := 0; n_celiski int := 0;
begin
  if auth.jwt() is not null and not public.yetki_var_mi(array['tanimlar'], 'duzenleme') then
    raise exception 'Bu işlem için yetkiniz yok (tanimlar: duzenleme)' using errcode = '42501';
  end if;
  if v_id is null or v_id = '' then raise exception 'KR020: renk kimliği yok' using errcode = 'P0001'; end if;
  if v_yeni = '' then raise exception 'KR023: yeni ad boş olamaz' using errcode = 'P0001'; end if;
  perform set_config('lock_timeout', '10s', true);

  select veri into t from public.tanimlar where id = 'tekil' for update;
  if t is null then raise exception 'KR020: Tanımlar satırı yok' using errcode = 'P0001'; end if;
  lock table public.siparis_kalemleri, public.siparisler, public.uretim, public.stok_rezervasyonlari, public.urunler in exclusive mode;
  if to_regclass('public.lst_kayit') is not null then execute 'lock table public.lst_kayit in exclusive mode'; end if;
  if exists (select 1 from pg_class where oid = to_regclass('public.koliler') and relkind = 'r') then
    execute 'lock table public.koliler in exclusive mode';
  end if;

  select (o - 1)::int, r ->> 'ad' into v_sira, v_eski
    from jsonb_array_elements(coalesce(t -> 'renkler', '[]'::jsonb)) with ordinality as e(r, o)
   where r ->> 'id' = v_id;
  if v_sira is null then raise exception 'KR020: renk Tanımlar''da yok (%)', v_id using errcode = 'P0001'; end if;

  -- İstek tekrarı / bayat istek
  if v_eski = v_yeni then
    return jsonb_build_object('zaten', true, 'renk_id', v_id, 'ad', v_eski);
  end if;
  if v_beklenen is not null and v_beklenen <> v_eski then
    raise exception 'KR021: renk adı bu arada değişmiş (şimdi "%", istekte "%") — ekranı yenileyip tekrar deneyin', v_eski, v_beklenen using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(t -> 'renkler', '[]'::jsonb)) r
              where r ->> 'id' <> v_id and public.stk_nrm(r ->> 'ad') = public.stk_nrm(v_yeni)) then
    raise exception 'KR022: "%" adında bir renk zaten var — iki rengi birleştirmek ad değiştirmekle yapılmaz', v_yeni using errcode = 'P0001';
  end if;

  -- Eşleşmeler: rengin kendi adı (duz) + bu rengi içeren her kombinasyonun eski / yeni etiketi.
  create temp table _esl (eski text, eski_nrm text, yeni text, duz boolean, kid text) on commit drop;
  insert into _esl values (v_eski, public.stk_nrm(v_eski), v_yeni, true, v_id);
  for v_kombi in select k from jsonb_array_elements(coalesce(t -> 'renkKombinasyonlari', '[]'::jsonb)) k
                  where k -> 'renkIdler' ? v_id loop
    insert into _esl
    select (v_kombi ->> 'kod') || ' - ' || string_agg(coalesce((select r ->> 'ad' from jsonb_array_elements(t -> 'renkler') r where r ->> 'id' = ri.v), '?'), '/' order by ri.n),
           null,
           (v_kombi ->> 'kod') || ' - ' || string_agg(case when ri.v = v_id then v_yeni
                                                       else coalesce((select r ->> 'ad' from jsonb_array_elements(t -> 'renkler') r where r ->> 'id' = ri.v), '?') end, '/' order by ri.n),
           false, v_kombi ->> 'id'
      from jsonb_array_elements_text(v_kombi -> 'renkIdler') with ordinality as ri(v, n);
  end loop;
  update _esl set eski_nrm = public.stk_nrm(eski) where eski_nrm is null;
  if exists (select 1 from _esl e join public.stk_renk s on s.aktif and s.id <> e.kid and public.stk_nrm(s.ad) = public.stk_nrm(e.yeni)) then
    raise exception 'KR024: yeni ad bir kombinasyon etiketini başka bir renkle aynı yapıyor' using errcode = 'P0001';
  end if;

  -- 1. Tanımlar (tetikleyici stk_renk'i aynı işlemde günceller)
  update public.tanimlar set veri = jsonb_set(veri, array['renkler', v_sira::text, 'ad'], to_jsonb(v_yeni)) where id = 'tekil';
  insert into public.tanim_ad_gecmisi (renk_id, eski_ad, eski_nrm, yeni_ad, eposta)
  select kid, eski, eski_nrm, yeni, nullif(v_eposta, '') from _esl;

  -- 2. Sipariş kalemleri + başlık sürümü (bayat cihaz bu siparişi sürüm koşuluyla yazamaz)
  create temp table _sip (id text) on commit drop;
  with u as (
    update public.siparis_kalemleri k set renk = e.yeni
      from _esl e where public.stk_nrm(k.renk) = e.eski_nrm and k.renk is distinct from e.yeni
    returning k.siparis_id),
  i as (insert into _sip select distinct siparis_id from u)
  select count(*) into n_kalem from u;
  update public.siparisler s set surum = s.surum where s.id in (select id from _sip);
  get diagnostics n_siparis = row_count;

  -- 3. Üretim, rezervasyon (sürüm elle: bu tablolarda sürüm tetikleyicisi yok, istemci koşullu yazar)
  update public.uretim u set renk = e.yeni, surum = coalesce(u.surum, 0) + 1
    from _esl e where public.stk_nrm(u.renk) = e.eski_nrm and u.renk is distinct from e.yeni;
  get diagnostics n_uretim = row_count;
  update public.stok_rezervasyonlari r set renk = e.yeni, surum = coalesce(r.surum, 0) + 1
    from _esl e where public.stk_nrm(r.renk) = e.eski_nrm and r.renk is distinct from e.yeni;
  get diagnostics n_rez = row_count;

  -- 4. Koliler (tetikleyici kalem renklerini güncel ada çevirir — tanim_ad_gecmisi az önce yazıldı)
  if to_regclass('public.lst_kayit') is not null then
    update public.lst_kayit l set veri = l.veri
     where l.tablo = 'koliler' and jsonb_typeof(l.veri -> 'kalemler') = 'array'
       and exists (select 1 from jsonb_array_elements(l.veri -> 'kalemler') x join _esl e on e.eski_nrm = public.stk_nrm(x ->> 'renk'));
    get diagnostics n_koli = row_count;
  end if;
  if exists (select 1 from pg_class where oid = to_regclass('public.koliler') and relkind = 'r') then
    execute 'update public.koliler set veri = veri where jsonb_typeof(veri) = ''array''';
  end if;

  -- 5. Ürünler: reçete (046 kuralı), renk resmi anahtarı, harici barkod
  with yeni as (
    select z.id,
      case when jsonb_typeof(z.recete) = 'array' then (
        select coalesce(jsonb_agg(
                 r
                 || case when m.yeni is not null then jsonb_build_object('mamulRenk', m.yeni) || case when m.duz then jsonb_build_object('mamulRenkId', v_id) else '{}'::jsonb end else '{}'::jsonb end
                 || case when h.yeni is not null then jsonb_build_object('renk', h.yeni) || case when h.duz then jsonb_build_object('renkId', v_id) else '{}'::jsonb end else '{}'::jsonb end
               order by o), '[]'::jsonb)
          from jsonb_array_elements(z.recete) with ordinality as rr(r, o)
          -- AD ŞART: kimlik damgası tek başına yetmez. Damgası bu renk ama adı başka olan satır (26 Kasım E: renkId yanlış damgalı reçete
          -- satırları) DEĞİŞMEZ — istemcinin 046 kuralı bunları kimliğe güvenip yeniden adlandırıyordu. Damgası BAŞKA renk olan satır da
          -- düz adla eşleşmez. Kombinasyon etiketi yalnız adla.
          left join lateral (select e.yeni, e.duz from _esl e
                              where public.stk_nrm(r ->> 'mamulRenk') = e.eski_nrm
                                and (not e.duz or coalesce(r ->> 'mamulRenkId', '') in ('', v_id))
                              limit 1) m on true
          left join lateral (select e.yeni, e.duz from _esl e
                              where public.stk_nrm(r ->> 'renk') = e.eski_nrm
                                and (not e.duz or coalesce(r ->> 'renkId', '') in ('', v_id))
                              limit 1) h on true)
      else z.recete end as recete,
      case when jsonb_typeof(z.renk_resimleri) = 'object' then (
        select coalesce(jsonb_object_agg(coalesce(e.yeni, k.key), k.value), '{}'::jsonb)
          from jsonb_each(z.renk_resimleri) k left join _esl e on e.eski_nrm = public.stk_nrm(k.key))
      else z.renk_resimleri end as renk_resimleri,
      case when jsonb_typeof(z.harici_barkodlar) = 'array' then (
        select coalesce(jsonb_agg(case when e.yeni is not null then b || jsonb_build_object('renk', e.yeni) else b end order by o), '[]'::jsonb)
          from jsonb_array_elements(z.harici_barkodlar) with ordinality as bb(b, o)
          left join _esl e on e.eski_nrm = public.stk_nrm(b ->> 'renk'))
      else z.harici_barkodlar end as harici_barkodlar
    from public.urunler z)
  update public.urunler z set recete = y.recete, renk_resimleri = y.renk_resimleri, harici_barkodlar = y.harici_barkodlar
    from yeni y
   where y.id = z.id
     and (y.recete is distinct from z.recete or y.renk_resimleri is distinct from z.renk_resimleri or y.harici_barkodlar is distinct from z.harici_barkodlar);
  get diagnostics n_urun = row_count;
  -- Bilgi: damgası bu renk olup adı başka olan reçete satırları (dokunulmadı).
  select count(*) into n_celiski
    from public.urunler z, jsonb_array_elements(case when jsonb_typeof(z.recete) = 'array' then z.recete else '[]'::jsonb end) r
   where (r ->> 'mamulRenkId' = v_id and public.stk_nrm(r ->> 'mamulRenk') is distinct from public.stk_nrm(v_yeni))
      or (r ->> 'renkId' = v_id and public.stk_nrm(r ->> 'renk') is distinct from public.stk_nrm(v_yeni));

  return jsonb_build_object('zaten', false, 'renk_id', v_id, 'eski', v_eski, 'yeni', v_yeni,
    'eslesme', (select count(*) from _esl), 'kalem', n_kalem, 'siparis', n_siparis, 'uretim', n_uretim, 'rezervasyon', n_rez,
    'koli', n_koli, 'urun', n_urun, 'celiskili_recete_satiri', n_celiski);
end $$;

revoke all on function public.tanim_renk_ad_degistir(jsonb) from public, anon;
grant execute on function public.tanim_renk_ad_degistir(jsonb) to authenticated;
revoke all on function public.tanim_ad_guncel(text) from public, anon;
grant execute on function public.tanim_ad_guncel(text) to authenticated;
revoke all on function public.tanim_ad_guncelle_tetik() from public, anon, authenticated;
