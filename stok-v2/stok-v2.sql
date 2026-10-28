-- =====================================================================================================================
--  stok-v2.sql — STOK MODÜLÜNÜN YENİ VERİTABANI YAPISI (stok v2, 1. aşama)
-- =====================================================================================================================
--
--  NEDEN (kullanıcı, 28 Ekim: "Uygulama düzgün çalışmıyor, sürekli hata ve yanlış yapıyor, sil baştan kurgulamamız lazım"
--  → karar: "Modül modül kuralım, veriyi taşı, stokla başla"). Bugünkü yapıda:
--    · "Fiş" diye bir kayıt yok — aynı fiş numarasını taşıyan hareketlerin grubu; fiş defteri (fis_defteri) tek satırlık
--      bir JSON listesi olarak ayrıca tutuluyor.
--    · Varyant renk ve beden ADIYLA tutuluyor (anahtar urun_id+renk+beden): ad değişimi binlerce satırı silip yeniden yazıyor.
--    · Stok miktarı varyantta ayrıca saklanıyor; hareket toplamıyla ayrışabiliyor ("Defter onarımı", "açılış farkı").
--    · Bir fiş stok, cari, sipariş, koli, kasa ve fiş defterine 6–7 AYRI istekle yazılıyor; biri düşerse kayıt yarım kalıyor.
--    · Cihaz bütün listeyi bellekte tutup farkı gönderiyor; eski listeli cihaz başkasının kaydını silebiliyor.
--
--  YENİ YAPI — dört ilke:
--    1. KİMLİK: renk, ölçü, varyant, fiş ve hareket kimlikle bağlanır. Renk adını değiştirmek tek satırlık güncellemedir.
--    2. FİŞ GERÇEK KAYIT: `stk_fis` başlık, `stk_hareket` satırları. Hareket fişsiz OLAMAZ (fis_id NOT NULL) — "fişsiz hareket
--       olmaz" kuralı artık veritabanının kendisinde.
--    3. STOK TEK KAYNAKTAN: miktar saklanmaz; `stk_stok` görünümü iptal edilmemiş hareketleri toplar. "Hareketsiz stok olmaz"
--       ve "eksi stok kırpılmaz" kendiliğinden doğru (toplam ne çıkarsa o; sıfıra kırpılmaz).
--    4. YAZMA YALNIZ SUNUCU İŞLEMİYLE: uygulama tablolara doğrudan yazamaz (RLS: yalnız okuma). Fiş kaydı, fiş iptali, varyant
--       açma/kaldırma birer veritabanı işlemidir (RPC) — ya hepsi yazılır ya hiçbiri. Fiş kimliği istemcide üretilir: ağda
--       düşüp yeniden gönderilen fiş İKİNCİ KEZ yazılmaz (aynı kimlik → "zaten var").
--
--  1. AŞAMA KAPSAMI: renk/ölçü kimlikleri, varyant, fiş, hareket, stok görünümü ve bunları yazan işlemler + bugünkü veriden
--  göç (`stk_goc`). Ürün kartı (urunler: ad, fiyat, reçete, görsel…) yerinde kalır; renk/ölçü TANIMLARI da şimdilik Tanımlar'da
--  (tanimlar.veri) kalır ve bir tetikleyiciyle `stk_renk` / `stk_olcu`'ya aynalanır. Cari, sipariş, üretim sonraki modüller.
--
--  ÇALIŞTIRMA (onaydan sonra): Supabase › SQL Editor › bu dosyanın tamamı › Run. Bugünkü tablolara DOKUNMAZ (yalnız `stk_`
--  ile başlayan yeni tablolar ve tanimlar'a bir aynalama tetikleyicisi ekler). Tekrar çalıştırmak zararsız.
--  Ardından göç: `select public.stk_goc();` — tekrar çalıştırılabilir (geçişe kadar), sonuç raporu döner.
--  Yerel sınama: stok-v2/test/kos.sh (yerel PostgreSQL; Supabase'e dokunmaz).
-- =====================================================================================================================

begin;

-- ---------------------------------------------------------------------------------------------------------------------
-- 0) YARDIMCILAR
-- ---------------------------------------------------------------------------------------------------------------------

-- Ad karşılaştırma anahtarı: Türkçe büyük/küçük harf, baş/son boşluk ve çoklu boşluk farkı yok sayılır.
-- (`lower` C yereli altında İ/I'yı doğru çevirmez; önce elle çevrilir.)
create or replace function public.stk_nrm(x text) returns text
language sql immutable as $$
  select nullif(lower(translate(regexp_replace(btrim(coalesce(x, '')), '\s+', ' ', 'g'), 'İIĞÜŞÖÇ', 'iığüşöç')), '')
$$;

-- "Standart" ve boş: renk/ölçü YOK demek (bugünkü yer tutucu; 012 `stokAnahtarNrm`).
create or replace function public.stk_yer_tutucu_mu(x text) returns boolean
language sql immutable as $$
  select public.stk_nrm(x) is null or public.stk_nrm(x) = 'standart'
$$;

-- Hatasız zaman çevirisi: bugünkü tabloda tarih metin de olabilir, zaman damgası da.
create or replace function public.stk_zaman(x text) returns timestamptz
language plpgsql immutable as $$
begin
  if x is null or btrim(x) = '' then return null; end if;
  return x::timestamptz;
exception when others then
  return null;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 1) TABLOLAR
-- ---------------------------------------------------------------------------------------------------------------------

-- RENK — hem hammadde rengi (tanimlar.renkler) hem model rengi (tanimlar.renkKombinasyonlari, "1058 - Taba Süet") hem de
-- tanımda karşılığı olmayan eski adlar (tur = 'serbest', göçte açılır). Görünen ad `ad`; varyantlar kimliğe bağlıdır.
create table if not exists public.stk_renk (
  id           text primary key,
  ad           text not null,
  tur          text not null check (tur in ('renk', 'model', 'serbest')),
  kod          text,
  barkod_kodu  text,
  renk_kodu    text,
  aktif        boolean not null default true,
  guncelleme   timestamptz not null default now()
);

-- ÖLÇÜ — beden / boyut (tanimlar.bedenler) ve tanımsız eski adlar (tur = 'serbest').
create table if not exists public.stk_olcu (
  id           text primary key,
  ad           text not null,
  tur          text not null default 'Beden',
  aktif        boolean not null default true,
  guncelleme   timestamptz not null default now()
);

-- VARYANT — ürün × renk × ölçü. Renk ya da ölçü yoksa NULL ("Standart"). Miktar YOK: stok hareketlerden hesaplanır.
create table if not exists public.stk_varyant (
  id           text primary key default ('vry-' || replace(gen_random_uuid()::text, '-', '')),
  -- urunler'e yabancı anahtar YOK (bilerek): geçiş döneminde bugünkü uygulama ürün siliyor; bağ olsaydı hareketli ürünün
  -- silinmesi veritabanında reddedilir, bugünkü ekran bozulurdu. Ürünün varlığını işlemler denetler (stk_varyant_coz);
  -- ürün modülü v2'ye geçince silme yerine pasife alma gelecek ve bağ o zaman eklenecek.
  urun_id      text not null,
  renk_id      text references public.stk_renk(id),
  olcu_id      text references public.stk_olcu(id),
  min_stok     numeric not null default 0,
  aktif        boolean not null default true,
  olusturma    timestamptz not null default now()
);
create unique index if not exists stk_varyant_tekil on public.stk_varyant (urun_id, coalesce(renk_id, ''), coalesce(olcu_id, ''));
create index if not exists stk_varyant_urun on public.stk_varyant (urun_id);

-- FİŞ — başlık. Kimlik = fiş numarası (bugünkü fiş defteri de fiş no ile anahtarlı). İptal edilen fiş SİLİNMEZ: iz kalır,
-- hareketleri stoktan düşer.
create table if not exists public.stk_fis (
  id             text primary key,
  tur            text not null,                    -- Giriş / Çıkış / Alış / Satış / Üretim / Açılış / Manuel / Numune / Sayım / Fire / Transfer / Göç
  kaynak         text,                             -- bugünkü `kaynak` (Satınalma, Satış, Üretim, Açılış, Manuel, Numune…)
  tarih          timestamptz not null default now(),
  cari_id        text,
  siparis_id     text,
  siparis_no     text,
  uretim_id      text,
  aciklama       text,
  kullanici      text,
  olusturan      text,                             -- bulut kimliği (e-posta) — sunucu doldurur
  olusturma      timestamptz not null default now(),
  iptal          boolean not null default false,
  iptal_zamani   timestamptz,
  iptal_eden     text,
  iptal_sebebi   text,
  goc            boolean not null default false,   -- bugünkü veriden taşındı (stk_goc)
  ek             jsonb not null default '{}'::jsonb
);
create index if not exists stk_fis_tarih on public.stk_fis (tarih);
create index if not exists stk_fis_siparis on public.stk_fis (siparis_id);
create index if not exists stk_fis_uretim on public.stk_fis (uretim_id);

-- HAREKET — fiş satırı. Miktar işaretli: + giriş, − çıkış.
create table if not exists public.stk_hareket (
  id                       text primary key,
  fis_id                   text not null references public.stk_fis(id),
  varyant_id               text not null references public.stk_varyant(id),
  urun_id                  text not null,           -- sorgu kolaylığı (varyanttan türetilir; işlem doldurur)
  miktar                   numeric not null check (miktar <> 0),
  kaynak                   text,
  tarih                    timestamptz not null default now(),
  siparis_id               text,
  siparis_no               text,
  kalem_id                 text,
  cari_id                  text,
  uretim_id                text,
  rezervasyon_siparis_id   text,
  fazla_gonderim           boolean not null default false,
  aciklama                 text,
  ek                       jsonb not null default '{}'::jsonb
);
create index if not exists stk_hareket_fis on public.stk_hareket (fis_id);
create index if not exists stk_hareket_varyant on public.stk_hareket (varyant_id);
create index if not exists stk_hareket_urun on public.stk_hareket (urun_id);
create index if not exists stk_hareket_siparis on public.stk_hareket (siparis_id, kalem_id);

-- STOK — tek kaynak: iptal edilmemiş fişlerin hareket toplamı. Kırpılmaz (eksi stok = girdi eksik).
create or replace view public.stk_stok with (security_invoker = true) as
select v.id as varyant_id, v.urun_id, v.renk_id, r.ad as renk_ad, v.olcu_id, o.ad as olcu_ad, v.min_stok, v.aktif,
       coalesce(sum(h.miktar) filter (where not f.iptal), 0) as miktar
from public.stk_varyant v
left join public.stk_renk r on r.id = v.renk_id
left join public.stk_olcu o on o.id = v.olcu_id
left join public.stk_hareket h on h.varyant_id = v.id
left join public.stk_fis f on f.id = h.fis_id
group by v.id, r.ad, o.ad;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2) RENK / ÖLÇÜ AYNASI — Tanımlar şimdilik tanimlar.veri'de; her yazmada stk_renk / stk_olcu güncellenir.
--    Tanımdan çıkan renk SİLİNMEZ (varyant bağlı olabilir), pasife alınır. 'serbest' renkler (göçte açılan tanımsız adlar)
--    tanımda olmadığı için pasife alınmaz.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.stk_tanim_esitle(t jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if t is null then return; end if;
  -- Hammadde renkleri
  insert into public.stk_renk (id, ad, tur, kod, barkod_kodu, renk_kodu, aktif, guncelleme)
  select distinct on (r ->> 'id') r ->> 'id', btrim(r ->> 'ad'), 'renk', r ->> 'kod', r ->> 'barkodKodu', r ->> 'renkKodu', true, now()
  from jsonb_array_elements(coalesce(t -> 'renkler', '[]'::jsonb)) r
  where coalesce(r ->> 'id', '') <> '' and coalesce(btrim(r ->> 'ad'), '') <> ''
  order by r ->> 'id'
  on conflict (id) do update set ad = excluded.ad, tur = 'renk', kod = excluded.kod, barkod_kodu = excluded.barkod_kodu,
    renk_kodu = excluded.renk_kodu, aktif = true, guncelleme = now()
  where (stk_renk.ad, stk_renk.tur, stk_renk.kod, stk_renk.barkod_kodu, stk_renk.renk_kodu, stk_renk.aktif)
    is distinct from (excluded.ad, 'renk', excluded.kod, excluded.barkod_kodu, excluded.renk_kodu, true);
  -- Model renkleri: etiket "KOD - Ad1/Ad2" (uygulamanın etiketiyle aynı, 100 `kombinasyonOlusturGlobal`)
  insert into public.stk_renk (id, ad, tur, kod, barkod_kodu, aktif, guncelleme)
  select distinct on (k ->> 'id') k ->> 'id',
         (k ->> 'kod') || ' - ' || (
           select string_agg(coalesce((select btrim(r ->> 'ad') from jsonb_array_elements(coalesce(t -> 'renkler', '[]'::jsonb)) r
                                       where r ->> 'id' = ri.v), '?'), '/' order by ri.n)
           from jsonb_array_elements_text(coalesce(k -> 'renkIdler', '[]'::jsonb)) with ordinality as ri(v, n)),
         'model', k ->> 'kod', k ->> 'barkodKodu', true, now()
  from jsonb_array_elements(coalesce(t -> 'renkKombinasyonlari', '[]'::jsonb)) k
  where coalesce(k ->> 'id', '') <> '' and coalesce(k ->> 'kod', '') <> ''
  order by k ->> 'id'
  on conflict (id) do update set ad = excluded.ad, tur = 'model', kod = excluded.kod, barkod_kodu = excluded.barkod_kodu,
    aktif = true, guncelleme = now()
  where (stk_renk.ad, stk_renk.tur, stk_renk.kod, stk_renk.barkod_kodu, stk_renk.aktif)
    is distinct from (excluded.ad, 'model', excluded.kod, excluded.barkod_kodu, true);
  -- Tanımdan düşen renk/model renkleri pasif
  update public.stk_renk s set aktif = false, guncelleme = now()
  where s.aktif and s.tur in ('renk', 'model')
    and not exists (select 1 from jsonb_array_elements(coalesce(t -> 'renkler', '[]'::jsonb)) r where r ->> 'id' = s.id)
    and not exists (select 1 from jsonb_array_elements(coalesce(t -> 'renkKombinasyonlari', '[]'::jsonb)) k where k ->> 'id' = s.id);
  -- Ölçüler
  insert into public.stk_olcu (id, ad, tur, aktif, guncelleme)
  select distinct on (b ->> 'id') b ->> 'id', btrim(b ->> 'ad'), coalesce(b ->> 'tip', 'Beden'), true, now()
  from jsonb_array_elements(coalesce(t -> 'bedenler', '[]'::jsonb)) b
  where coalesce(b ->> 'id', '') <> '' and coalesce(btrim(b ->> 'ad'), '') <> ''
  order by b ->> 'id'
  on conflict (id) do update set ad = excluded.ad, tur = excluded.tur, aktif = true, guncelleme = now()
  where (stk_olcu.ad, stk_olcu.tur, stk_olcu.aktif) is distinct from (excluded.ad, excluded.tur, true);
  update public.stk_olcu s set aktif = false, guncelleme = now()
  where s.aktif and s.tur <> 'serbest'
    and not exists (select 1 from jsonb_array_elements(coalesce(t -> 'bedenler', '[]'::jsonb)) b where b ->> 'id' = s.id);
end $$;

create or replace function public.stk_tanim_tetik() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Ayna hata verirse Tanımlar kaydı DÜŞMEMELİ (bugünkü uygulama her renk/beden değişikliğinde bu satırı yazıyor):
  -- hata uyarıya çevrilir, ayna bir sonraki Tanımlar kaydında ya da elle `select stk_tanim_esitle(...)` ile tamamlanır.
  if new.id = 'tekil' then
    begin
      perform public.stk_tanim_esitle(new.veri);
    exception when others then
      raise warning 'stok v2 tanım aynası güncellenemedi: %', sqlerrm;
    end;
  end if;
  return null;
end $$;
drop trigger if exists stk_tanim_aynasi on public.tanimlar;
create trigger stk_tanim_aynasi after insert or update of veri on public.tanimlar
  for each row execute function public.stk_tanim_tetik();

-- ---------------------------------------------------------------------------------------------------------------------
-- 3) ÇÖZÜCÜLER — istemci renk/ölçüyü kimlikle ya da (geçiş döneminde, eski ekranlardan) adla verir.
-- ---------------------------------------------------------------------------------------------------------------------

-- Renk: kimlik varsa o; yoksa ad (önce tanımlı renk, sonra model, sonra serbest); hiç yoksa yeni 'serbest' renk açılır.
-- Yer tutucu ("Standart"/boş) → NULL.
create or replace function public.stk_renk_coz(p_id text, p_ad text) returns text
language plpgsql security definer set search_path = public as $$
declare
  r text;
begin
  if coalesce(p_id, '') <> '' then
    select id into r from public.stk_renk where id = p_id;
    if r is not null then return r; end if;
  end if;
  if public.stk_yer_tutucu_mu(p_ad) then return null; end if;
  select id into r from public.stk_renk
   where public.stk_nrm(ad) = public.stk_nrm(p_ad)
   order by aktif desc, case tur when 'model' then 0 when 'renk' then 1 else 2 end, id
   limit 1;
  if r is not null then return r; end if;
  r := 'srenk-' || substr(md5(public.stk_nrm(p_ad)), 1, 12);
  insert into public.stk_renk (id, ad, tur) values (r, btrim(regexp_replace(p_ad, '\s+', ' ', 'g')), 'serbest')
  on conflict (id) do nothing;
  return r;
end $$;

create or replace function public.stk_olcu_coz(p_id text, p_ad text) returns text
language plpgsql security definer set search_path = public as $$
declare
  r text;
begin
  if coalesce(p_id, '') <> '' then
    select id into r from public.stk_olcu where id = p_id;
    if r is not null then return r; end if;
  end if;
  if public.stk_yer_tutucu_mu(p_ad) then return null; end if;
  select id into r from public.stk_olcu where public.stk_nrm(ad) = public.stk_nrm(p_ad) order by aktif desc, id limit 1;
  if r is not null then return r; end if;
  r := 'solcu-' || substr(md5(public.stk_nrm(p_ad)), 1, 12);
  insert into public.stk_olcu (id, ad, tur) values (r, btrim(regexp_replace(p_ad, '\s+', ' ', 'g')), 'serbest')
  on conflict (id) do nothing;
  return r;
end $$;

-- Varyant: ürün + renk + ölçü; yoksa açılır.
create or replace function public.stk_varyant_coz(p_urun_id text, p_renk_id text, p_renk text, p_olcu_id text, p_olcu text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  rid text := public.stk_renk_coz(p_renk_id, p_renk);
  oid_ text := public.stk_olcu_coz(p_olcu_id, p_olcu);
  v text;
begin
  if not exists (select 1 from public.urunler where id = p_urun_id) then
    raise exception 'Ürün bulunamadı: %', p_urun_id using errcode = 'P0002';
  end if;
  select id into v from public.stk_varyant
   where urun_id = p_urun_id and coalesce(renk_id, '') = coalesce(rid, '') and coalesce(olcu_id, '') = coalesce(oid_, '');
  if v is null then
    insert into public.stk_varyant (urun_id, renk_id, olcu_id) values (p_urun_id, rid, oid_)
    on conflict do nothing
    returning id into v;
    if v is null then   -- aynı anda başka işlem açtı
      select id into v from public.stk_varyant
       where urun_id = p_urun_id and coalesce(renk_id, '') = coalesce(rid, '') and coalesce(olcu_id, '') = coalesce(oid_, '');
    end if;
  end if;
  return v;
end $$;

-- Yetki: bugünkü kural (rls-yazma.sql `yetki_var_mi`) kuruluysa o; değilse giriş yapmış herkes. SQL Editor (jwt yok) serbest.
create or replace function public.stk_yetki(moduller text[], islem text) returns void
language plpgsql security definer set search_path = public as $$
declare
  ok boolean := true;
begin
  if auth.jwt() is null then return; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'yetki_var_mi') then
    execute 'select public.yetki_var_mi($1, $2)' into ok using moduller, islem;
  end if;
  if not coalesce(ok, false) then
    raise exception 'Bu işlem için yetkiniz yok (stok: %)', islem using errcode = '42501';
  end if;
end $$;

-- Etkilenen varyantların güncel stoğu (işlemler bunu döner; ekran yeniden okumadan güncellenir).
create or replace function public.stk_bakiye_json(p_varyantlar text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('varyantId', s.varyant_id, 'urunId', s.urun_id, 'renkId', s.renk_id, 'renk', s.renk_ad,
                                               'olcuId', s.olcu_id, 'olcu', s.olcu_ad, 'miktar', s.miktar) order by s.varyant_id), '[]'::jsonb)
  from public.stk_stok s where s.varyant_id = any(p_varyantlar)
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4) İŞLEMLER (RPC) — tek veritabanı işleminde; hata olursa hiçbir şey yazılmaz.
-- ---------------------------------------------------------------------------------------------------------------------

-- FİŞ KAYDET.
--  p = { id (fiş no — zorunlu, istemci üretir), tur, kaynak, tarih, cariId, siparisId, siparisNo, uretimId, aciklama,
--        kullanici, ek,
--        satirlar: [{ id (hareket kimliği — zorunlu), urunId, renkId?, renk?, olcuId?, olcu?, miktar (işaretli, ≠ 0),
--                     kaynak?, tarih?, siparisId?, siparisNo?, kalemId?, cariId?, uretimId?, rezervasyonSiparisId?,
--                     fazlaGonderim?, aciklama?, ek? }] }
--  AYNI FİŞ YENİDEN GELİRSE (ağda düşüp tekrar gönderilen): satır kimlikleri ve miktarları aynıysa hiçbir şey yazılmaz,
--  "zatenVar: true" döner. Fiş no başka içerikle kullanılmışsa reddedilir.
--  Döner: { fisId, zatenVar, hareketler: [{ id, varyantId }], bakiye: [...] }
create or replace function public.stk_fis_kaydet(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  fid text := btrim(coalesce(p ->> 'id', ''));
  s jsonb;
  vid text;
  hareketler jsonb := '[]'::jsonb;
  varyantlar text[] := '{}';
  mevcut_imza text;
  yeni_imza text;
  m numeric;
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim'], 'kaydetme');
  if fid = '' then raise exception 'Fiş numarası yok' using errcode = '22023'; end if;
  if jsonb_typeof(p -> 'satirlar') <> 'array' or jsonb_array_length(p -> 'satirlar') = 0 then
    raise exception 'Fiş % boş: en az bir satır gerekli', fid using errcode = '22023';
  end if;
  -- Aynı kimlik daha önce yazıldı mı?
  if exists (select 1 from public.stk_fis where id = fid) then
    select string_agg(h.id || ':' || h.miktar::text, ',' order by h.id) into mevcut_imza from public.stk_hareket h where h.fis_id = fid;
    select string_agg((x ->> 'id') || ':' || ((x ->> 'miktar')::numeric)::text, ',' order by x ->> 'id') into yeni_imza
      from jsonb_array_elements(p -> 'satirlar') x;
    if mevcut_imza is not distinct from yeni_imza then
      select array_agg(distinct varyant_id) into varyantlar from public.stk_hareket where fis_id = fid;
      return jsonb_build_object('fisId', fid, 'zatenVar', true,
        'hareketler', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'varyantId', varyant_id) order by id), '[]'::jsonb) from public.stk_hareket where fis_id = fid),
        'bakiye', public.stk_bakiye_json(varyantlar));
    end if;
    raise exception 'Fiş numarası % başka bir fişte kullanılmış', fid using errcode = '23505';
  end if;

  insert into public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, aciklama, kullanici, olusturan, ek)
  values (fid, coalesce(nullif(p ->> 'tur', ''), 'Manuel'), p ->> 'kaynak', coalesce(public.stk_zaman(p ->> 'tarih'), now()),
          p ->> 'cariId', p ->> 'siparisId', p ->> 'siparisNo', p ->> 'uretimId', p ->> 'aciklama', p ->> 'kullanici',
          lower(auth.jwt() ->> 'email'), coalesce(p -> 'ek', '{}'::jsonb));

  for s in select * from jsonb_array_elements(p -> 'satirlar') loop
    if coalesce(s ->> 'id', '') = '' then raise exception 'Fiş % satırında hareket kimliği yok', fid using errcode = '22023'; end if;
    m := (s ->> 'miktar')::numeric;
    if m is null or m = 0 then raise exception 'Fiş % satırı %: miktar sıfır olamaz', fid, s ->> 'id' using errcode = '22023'; end if;
    vid := public.stk_varyant_coz(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, siparis_no, kalem_id,
                                    cari_id, uretim_id, rezervasyon_siparis_id, fazla_gonderim, aciklama, ek)
    values (s ->> 'id', fid, vid, s ->> 'urunId', m, coalesce(s ->> 'kaynak', p ->> 'kaynak'),
            coalesce(public.stk_zaman(s ->> 'tarih'), public.stk_zaman(p ->> 'tarih'), now()),
            coalesce(s ->> 'siparisId', p ->> 'siparisId'), coalesce(s ->> 'siparisNo', p ->> 'siparisNo'), s ->> 'kalemId',
            coalesce(s ->> 'cariId', p ->> 'cariId'), coalesce(s ->> 'uretimId', p ->> 'uretimId'), s ->> 'rezervasyonSiparisId',
            coalesce((s ->> 'fazlaGonderim')::boolean, false), s ->> 'aciklama', coalesce(s -> 'ek', '{}'::jsonb));
    hareketler := hareketler || jsonb_build_object('id', s ->> 'id', 'varyantId', vid);
    varyantlar := array_append(varyantlar, vid);
  end loop;

  return jsonb_build_object('fisId', fid, 'zatenVar', false, 'hareketler', hareketler, 'bakiye', public.stk_bakiye_json(varyantlar));
end $$;

-- FİŞ İPTAL (bugünkü "fiş geri al"). Fiş ve satırları SİLİNMEZ; iptal işaretlenir, stoktan düşer. Tekrar çağrı zararsız.
create or replace function public.stk_fis_iptal(p_fis_id text, p_sebep text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  f public.stk_fis;
  varyantlar text[];
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim'], 'silme');
  select * into f from public.stk_fis where id = p_fis_id for update;
  if not found then raise exception 'Fiş bulunamadı: %', p_fis_id using errcode = 'P0002'; end if;
  if not f.iptal then
    update public.stk_fis set iptal = true, iptal_zamani = now(), iptal_eden = lower(auth.jwt() ->> 'email'), iptal_sebebi = p_sebep
     where id = p_fis_id;
  end if;
  select array_agg(distinct varyant_id) into varyantlar from public.stk_hareket where fis_id = p_fis_id;
  return jsonb_build_object('fisId', p_fis_id, 'zatenIptal', f.iptal, 'bakiye', public.stk_bakiye_json(coalesce(varyantlar, '{}')));
end $$;

-- VARYANT AÇ (ürün kartında renk/ölçü ekleme). Varsa aynısını döner (pasifse etkinleştirir).
create or replace function public.stk_varyant_ac(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  vid text;
begin
  perform public.stk_yetki(array['stok'], 'kaydetme');
  vid := public.stk_varyant_coz(p ->> 'urunId', p ->> 'renkId', p ->> 'renk', p ->> 'olcuId', coalesce(p ->> 'olcu', p ->> 'beden'));
  update public.stk_varyant set aktif = true, min_stok = coalesce((p ->> 'minStok')::numeric, min_stok) where id = vid;
  return jsonb_build_object('varyantId', vid, 'bakiye', public.stk_bakiye_json(array[vid]));
end $$;

-- VARYANT KALDIR. Hareketi olan varyant silinmez (geçmiş korunur): pasife alınır. Hiç hareketi yoksa silinir.
create or replace function public.stk_varyant_kaldir(p_varyant_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  bakiye numeric;
begin
  perform public.stk_yetki(array['stok'], 'silme');
  select miktar into bakiye from public.stk_stok where varyant_id = p_varyant_id;
  if bakiye is null then raise exception 'Varyant bulunamadı: %', p_varyant_id using errcode = 'P0002'; end if;
  if bakiye <> 0 then
    raise exception 'Stokta % var — önce sayım/çıkış fişiyle sıfırlayın', bakiye using errcode = '23514';
  end if;
  if exists (select 1 from public.stk_hareket where varyant_id = p_varyant_id) then
    update public.stk_varyant set aktif = false where id = p_varyant_id;
    return jsonb_build_object('varyantId', p_varyant_id, 'sonuc', 'pasif');
  end if;
  delete from public.stk_varyant where id = p_varyant_id;
  return jsonb_build_object('varyantId', p_varyant_id, 'sonuc', 'silindi');
end $$;

-- MİNİMUM STOK.
create or replace function public.stk_min_stok(p_varyant_id text, p_min numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.stk_yetki(array['stok'], 'kaydetme');
  update public.stk_varyant set min_stok = coalesce(p_min, 0) where id = p_varyant_id;
  if not found then raise exception 'Varyant bulunamadı: %', p_varyant_id using errcode = 'P0002'; end if;
  return public.stk_bakiye_json(array[p_varyant_id]);
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5) GÜVENLİK — tablolar yalnız okunur; yazma yalnız yukarıdaki işlemlerle (security definer).
--    Not (degisiklik-sayaci.sql, 7 Ekim): Supabase SQL düzenleyicisi `do $$ … array[…]` bloğunda "syntax error at or near )"
--    verdi. Bu yüzden döngüler adlı dolar tırnaklı ($stk$) geçici bir kurulum fonksiyonunda; düz `select` ile çağrılıp silinir.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.stk_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $stk$
declare
  t text;
  f text;
  rapor text := '';
begin
  foreach t in array array['stk_renk', 'stk_olcu', 'stk_varyant', 'stk_fis', 'stk_hareket'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists stk_okuma on public.%I', t);
    execute format('create policy stk_okuma on public.%I for select to authenticated using (true)', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  revoke all on public.stk_stok from anon, authenticated;
  grant select on public.stk_stok to authenticated;

  -- İç yardımcılar dışarıdan çağrılamaz; uygulama yalnız beş işlemi çağırır.
  foreach f in array array['stk_nrm(text)', 'stk_yer_tutucu_mu(text)', 'stk_zaman(text)', 'stk_tanim_esitle(jsonb)', 'stk_tanim_tetik()',
                           'stk_renk_coz(text,text)', 'stk_olcu_coz(text,text)', 'stk_varyant_coz(text,text,text,text,text)',
                           'stk_yetki(text[],text)', 'stk_bakiye_json(text[])'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['stk_fis_kaydet(jsonb)', 'stk_fis_iptal(text,text)', 'stk_varyant_ac(jsonb)', 'stk_varyant_kaldir(text)',
                           'stk_min_stok(text,numeric)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;

  -- Değişiklik sayacı (başka cihaz anında görsün) ve silme arşivi — kuruluysa.
  if to_regprocedure('public.degisiklik_izle_kur(text)') is not null then
    foreach t in array array['stk_renk', 'stk_olcu', 'stk_varyant', 'stk_fis', 'stk_hareket'] loop
      perform public.degisiklik_izle_kur(t);
    end loop;
    rapor := rapor || 'değişiklik sayacı kuruldu; ';
  end if;
  if to_regprocedure('public.arsive_kopyala_silinen()') is not null then
    foreach t in array array['stk_varyant', 'stk_fis', 'stk_hareket'] loop
      execute format('drop trigger if exists arsiv_silinen on public.%I', t);
      execute format('create trigger arsiv_silinen before delete on public.%I for each row execute function public.arsive_kopyala_silinen()', t);
    end loop;
    rapor := rapor || 'silme arşivi kuruldu; ';
  end if;
  return rapor || 'stok v2 kuruldu';
end $stk$;
select public.stk_kurulum_tamamla();
drop function public.stk_kurulum_tamamla();

-- İlk aynalama: bugünkü tanımlar.
select public.stk_tanim_esitle((select veri from public.tanimlar where id = 'tekil'));

commit;
