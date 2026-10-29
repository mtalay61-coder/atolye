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

-- Hatasız sayı / doğru-yanlış çevirisi (göç, bugünkü JSON'dan okurken): boş ya da bozuk değer NULL — tek bozuk kayıt
-- bütün geçişi durdurmasın (28 Ekim: tek tutarsız fiş defteri kaydı geçişi durdurdu).
create or replace function public.stk_sayi(x text) returns numeric
language plpgsql immutable as $$
begin
  if x is null or btrim(x) = '' then return null; end if;
  return replace(btrim(x), ',', '.')::numeric;
exception when others then
  return null;
end $$;
-- Dizi olmayan JSON (bozuk ya da eski biçimli alan) boş dizi sayılır: jsonb_array_elements hata vermesin.
create or replace function public.stk_dizi(j jsonb) returns jsonb
language sql immutable as $$
  select case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end
$$;
create or replace function public.stk_mantik(x text) returns boolean
language sql immutable as $$
  select lower(btrim(coalesce(x, ''))) in ('true', 't', '1', 'evet', 'yes')
$$;

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
  ek                       jsonb not null default '{}'::jsonb,
  -- SATIR İPTALİ: bugünkü uygulama tek bir hareketi de silebiliyor (bağlantısız hareket temizliği, üretim silme, fiş geri
  -- al). Satır SİLİNMEZ, iptal işaretlenir; stoktan düşer, iz kalır.
  iptal                    boolean not null default false,
  iptal_zamani             timestamptz,
  iptal_eden               text
);
alter table public.stk_hareket add column if not exists iptal boolean not null default false;
alter table public.stk_hareket add column if not exists iptal_zamani timestamptz;
alter table public.stk_hareket add column if not exists iptal_eden text;
create index if not exists stk_hareket_fis on public.stk_hareket (fis_id);
create index if not exists stk_hareket_varyant on public.stk_hareket (varyant_id);
create index if not exists stk_hareket_urun on public.stk_hareket (urun_id);
create index if not exists stk_hareket_siparis on public.stk_hareket (siparis_id, kalem_id);

-- STOK — tek kaynak: iptal edilmemiş fişlerin hareket toplamı. Kırpılmaz (eksi stok = girdi eksik).
create or replace view public.stk_stok with (security_invoker = true) as
select v.id as varyant_id, v.urun_id, v.renk_id, r.ad as renk_ad, v.olcu_id, o.ad as olcu_ad, v.min_stok, v.aktif,
       coalesce(sum(h.miktar) filter (where not f.iptal and not h.iptal), 0) as miktar
from public.stk_varyant v
left join public.stk_renk r on r.id = v.renk_id
left join public.stk_olcu o on o.id = v.olcu_id
left join public.stk_hareket h on h.varyant_id = v.id
left join public.stk_fis f on f.id = h.fis_id
group by v.id, r.ad, o.ad;

-- GEÇİŞ AYARI — uygulama açılışta okur: aktif ise stok yazmaları `stk_yaz` işlemine gider (src/041 köprüsü).
create table if not exists public.stk_ayar (
  id          text primary key default 'tekil' check (id = 'tekil'),
  aktif       boolean not null default false,
  gecis       timestamptz,
  geri_donus  timestamptz
);
insert into public.stk_ayar (id) values ('tekil') on conflict (id) do nothing;

-- BUGÜNKÜ BİÇİMDE OKUMA (geçişte `varyantlar` / `stok_hareketleri` adları bunlara bağlanır — stk_gecis). Uygulamanın,
-- gün sonu raporunun, bulut sayımının okuduğu sütunlar birebir aynı: okuyan hiçbir yer değişmeden v2'den okur.
--  · Renk/ölçü adı kimlikten gelir (ad değişince burada da değişir). Yok = "Standart" (bugünkü yer tutucu).
--  · renk_id bugünkü anlamıyla: Tanımlar'daki hammadde renginin kimliği (model/serbest renkte boş).
--  · Aynı adı taşıyan iki varyant (ör. birleşmemiş serbest renk) tek satıra toplanır: bugünkü anahtar urun_id+renk+beden.
--  · Pasif ve stoğu sıfır varyant görünmez (ürün kartından kaldırılmış).
--  · tarih uygulamanın yazdığı biçimde (ISO, UTC, milisaniye): okunan hâl ekrandakiyle aynı kalsın.
create or replace view public.stk_eski_varyantlar_g with (security_invoker = true) as
select s.urun_id, coalesce(s.renk_ad, 'Standart') as renk,
       max(case when r.tur = 'renk' then s.renk_id end) as renk_id,
       coalesce(s.olcu_ad, 'Standart') as beden, sum(s.miktar) as miktar, max(s.min_stok) as min_stok
from public.stk_stok s
left join public.stk_renk r on r.id = s.renk_id
where s.aktif or s.miktar <> 0
group by s.urun_id, coalesce(s.renk_ad, 'Standart'), coalesce(s.olcu_ad, 'Standart');

create or replace view public.stk_eski_hareketler_g with (security_invoker = true) as
select h.id, h.urun_id, coalesce(r.ad, 'Standart') as renk, coalesce(o.ad, 'Standart') as beden, h.miktar, h.kaynak,
       to_char(h.tarih at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as tarih,
       h.fis_id as fis_no,   -- göçte fişsiz eski hareket "ESKI-<id>" fişini aldı: uygulama yeniden numaralamasın
       h.siparis_no, h.cari_id, h.uretim_id, h.siparis_id, h.kalem_id, h.rezervasyon_siparis_id, h.fazla_gonderim,
       h.aciklama, h.ek
from public.stk_hareket h
join public.stk_fis f on f.id = h.fis_id
join public.stk_varyant v on v.id = h.varyant_id
left join public.stk_renk r on r.id = v.renk_id
left join public.stk_olcu o on o.id = v.olcu_id
where not h.iptal and not f.iptal;

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
  from jsonb_array_elements(public.stk_dizi(t -> 'renkler')) r
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
           select string_agg(coalesce((select btrim(r ->> 'ad') from jsonb_array_elements(public.stk_dizi(t -> 'renkler')) r
                                       where r ->> 'id' = ri.v), '?'), '/' order by ri.n)
           from jsonb_array_elements_text(public.stk_dizi(k -> 'renkIdler')) with ordinality as ri(v, n)),
         'model', k ->> 'kod', k ->> 'barkodKodu', true, now()
  from jsonb_array_elements(public.stk_dizi(t -> 'renkKombinasyonlari')) k
  where coalesce(k ->> 'id', '') <> '' and coalesce(k ->> 'kod', '') <> ''
  order by k ->> 'id'
  on conflict (id) do update set ad = excluded.ad, tur = 'model', kod = excluded.kod, barkod_kodu = excluded.barkod_kodu,
    aktif = true, guncelleme = now()
  where (stk_renk.ad, stk_renk.tur, stk_renk.kod, stk_renk.barkod_kodu, stk_renk.aktif)
    is distinct from (excluded.ad, 'model', excluded.kod, excluded.barkod_kodu, true);
  -- Tanımdan düşen renk/model renkleri pasif
  update public.stk_renk s set aktif = false, guncelleme = now()
  where s.aktif and s.tur in ('renk', 'model')
    and not exists (select 1 from jsonb_array_elements(public.stk_dizi(t -> 'renkler')) r where r ->> 'id' = s.id)
    and not exists (select 1 from jsonb_array_elements(public.stk_dizi(t -> 'renkKombinasyonlari')) k where k ->> 'id' = s.id);
  -- Ölçüler
  insert into public.stk_olcu (id, ad, tur, aktif, guncelleme)
  select distinct on (b ->> 'id') b ->> 'id', btrim(b ->> 'ad'), coalesce(b ->> 'tip', 'Beden'), true, now()
  from jsonb_array_elements(public.stk_dizi(t -> 'bedenler')) b
  where coalesce(b ->> 'id', '') <> '' and coalesce(btrim(b ->> 'ad'), '') <> ''
  order by b ->> 'id'
  on conflict (id) do update set ad = excluded.ad, tur = excluded.tur, aktif = true, guncelleme = now()
  where (stk_olcu.ad, stk_olcu.tur, stk_olcu.aktif) is distinct from (excluded.ad, excluded.tur, true);
  update public.stk_olcu s set aktif = false, guncelleme = now()
  where s.aktif and s.tur <> 'serbest'
    and not exists (select 1 from jsonb_array_elements(public.stk_dizi(t -> 'bedenler')) b where b ->> 'id' = s.id);
  -- Tanımsız adla açılmış (serbest) renk/ölçü artık tanımda varsa ona bağlanır.
  perform public.stk_serbest_birlestir();
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

-- GERİ DÖNÜŞTEN SONRA v2 YAZMASI YOK (v1.730.1 — baştan aşağı denetim). Uygulama geçiş bayrağını yalnız açılışta okuyor; bir
-- modülde `…_geri_don()` çalıştırılınca açık cihazlar v2 tablolarına yazmayı SÜRDÜRÜYOR, çağrı başarılı dönüyor ama okunan artık
-- eski tablo — yazılan kaybolurdu (sonraki geçişin göçü de siler). Geri dönülmüş modülde (aktif değil VE geri dönüş zamanı var)
-- yazma 55000 ile reddedilir: uygulama bekleyen deftere alır, yeniden açılışta eski yoldan gönderir. Geçişten ÖNCE (hiç geri
-- dönülmemiş) yazma serbest — deneme ve sınama için. Sütunlar modüle göre: stok `aktif` / `geri_donus`, öteki `<modül>_aktif` /
-- `<modül>_geri_donus` (to_jsonb: sütun henüz eklenmemiş kurulumda da çalışır).
create or replace function public.v2_yazma_acik(p_modul text) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  a jsonb;
  on_ek text := case when p_modul = 'stok' then '' else p_modul || '_' end;
begin
  select to_jsonb(s) into a from public.stk_ayar s where s.id = 'tekil';
  if a is null then return; end if;
  if not coalesce((a ->> (on_ek || 'aktif'))::boolean, false) and (a ->> (on_ek || 'geri_donus')) is not null then
    raise exception '% v2 kapalı (geri dönüldü) — uygulamayı yenileyin; kayıt bekleyenlerde, yenileyince eski yoldan gönderilir', p_modul
      using errcode = '55000';
  end if;
end $$;
revoke all on function public.v2_yazma_acik(text) from public, anon, authenticated;   -- yalnız v2 işlemlerinin içinden

-- Yetki: bugünkü kural (rls-yazma.sql `yetki_var_mi`) kuruluysa o; değilse giriş yapmış herkes. SQL Editor (jwt yok) serbest.
create or replace function public.stk_yetki(moduller text[], islem text) returns void
language plpgsql security definer set search_path = public as $$
declare
  ok boolean := true;
begin
  if auth.jwt() is null then return; end if;
  -- Doğrudan çağrı: PL/pgSQL çağrıyı çalışırken çözer, fonksiyon yoksa bu dala hiç girilmez.
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'yetki_var_mi') then
    ok := public.yetki_var_mi(moduller, islem);
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

-- Varyantı BUL (açmadan): kaldırma ve karşılaştırma için. Ad hiçbir renge uymuyorsa yeni renk AÇILMAZ, NULL döner.
create or replace function public.stk_varyant_bul(p_urun_id text, p_renk_id text, p_renk text, p_olcu_id text, p_olcu text)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  rid text;
  oid_ text;
  v text;
begin
  if coalesce(p_renk_id, '') <> '' and exists (select 1 from public.stk_renk where id = p_renk_id) then
    rid := p_renk_id;
  elsif not public.stk_yer_tutucu_mu(p_renk) then
    select id into rid from public.stk_renk where public.stk_nrm(ad) = public.stk_nrm(p_renk)
     order by aktif desc, case tur when 'model' then 0 when 'renk' then 1 else 2 end, id limit 1;
    if rid is null then return null; end if;
  end if;
  if coalesce(p_olcu_id, '') <> '' and exists (select 1 from public.stk_olcu where id = p_olcu_id) then
    oid_ := p_olcu_id;
  elsif not public.stk_yer_tutucu_mu(p_olcu) then
    select id into oid_ from public.stk_olcu where public.stk_nrm(ad) = public.stk_nrm(p_olcu) order by aktif desc, id limit 1;
    if oid_ is null then return null; end if;
  end if;
  select id into v from public.stk_varyant
   where urun_id = p_urun_id and coalesce(renk_id, '') = coalesce(rid, '') and coalesce(olcu_id, '') = coalesce(oid_, '');
  return v;
end $$;

-- SERBEST RENK/ÖLÇÜ BİRLEŞTİRME. Tanımsız bir adla açılan renk (göçte eski ad, ya da Tanımlar kaydı buluta varmadan
-- fişe giren yeni renk) aynı adla Tanımlar'a girince ona bağlanır: varyantlar tanımlı renge taşınır, aynı varyant
-- zaten varsa hareketler ona aktarılır ve serbest kopya kalkar. Böylece aynı ad için iki ayrı stok kalmaz.
create or replace function public.stk_serbest_birlestir() returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v record;
  hedef_v text;
  n int := 0;
begin
  for r in
    select s.id as serbest, (select t.id from public.stk_renk t
                              where t.tur <> 'serbest' and t.aktif and public.stk_nrm(t.ad) = public.stk_nrm(s.ad)
                              order by case t.tur when 'model' then 0 else 1 end, t.id limit 1) as hedef
    from public.stk_renk s where s.tur = 'serbest'
  loop
    continue when r.hedef is null;
    for v in select * from public.stk_varyant where renk_id = r.serbest loop
      select id into hedef_v from public.stk_varyant
       where urun_id = v.urun_id and renk_id = r.hedef and coalesce(olcu_id, '') = coalesce(v.olcu_id, '');
      if hedef_v is null then
        update public.stk_varyant set renk_id = r.hedef where id = v.id;
      else
        update public.stk_hareket set varyant_id = hedef_v where varyant_id = v.id;
        update public.stk_varyant set min_stok = greatest(min_stok, v.min_stok), aktif = aktif or v.aktif where id = hedef_v;
        delete from public.stk_varyant where id = v.id;
      end if;
    end loop;
    delete from public.stk_renk where id = r.serbest;
    n := n + 1;
  end loop;
  for r in
    select s.id as serbest, (select t.id from public.stk_olcu t
                              where t.tur <> 'serbest' and t.aktif and public.stk_nrm(t.ad) = public.stk_nrm(s.ad)
                              order by t.id limit 1) as hedef
    from public.stk_olcu s where s.tur = 'serbest'
  loop
    continue when r.hedef is null;
    for v in select * from public.stk_varyant where olcu_id = r.serbest loop
      select id into hedef_v from public.stk_varyant
       where urun_id = v.urun_id and olcu_id = r.hedef and coalesce(renk_id, '') = coalesce(v.renk_id, '');
      if hedef_v is null then
        update public.stk_varyant set olcu_id = r.hedef where id = v.id;
      else
        update public.stk_hareket set varyant_id = hedef_v where varyant_id = v.id;
        update public.stk_varyant set min_stok = greatest(min_stok, v.min_stok), aktif = aktif or v.aktif where id = hedef_v;
        delete from public.stk_varyant where id = v.id;
      end if;
    end loop;
    delete from public.stk_olcu where id = r.serbest;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Hareket kaynağından fiş türü (bugünkü `kaynak` → fiş başlığı).
create or replace function public.stk_kaynak_tur(k text) returns text
language sql immutable as $$
  select case k when 'Satınalma' then 'Alış' when 'Satış' then 'Satış' when 'Üretim' then 'Üretim' when 'Açılış' then 'Açılış'
                when 'Numune' then 'Numune' when 'Manuel' then 'Manuel' when 'Sayım' then 'Sayım' when 'Fire' then 'Fire'
                when 'Transfer' then 'Transfer'
                else coalesce(nullif(k, ''), 'Manuel') end
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

-- STOK YAZ — GEÇİŞ DÖNEMİNİN TEK YAZMA KAPISI (src/041 köprüsü). Bugünkü uygulamanın bütün stok akışları (fiş, sipariş
-- sevki, üretim teslimi, numune, açılış, fiş geri al, ad değişikliği, onarımlar) tek bir geçitten yazıyor: bellekteki
-- ürün listesinin farkı. Köprü bu farkı tek bir istek yapar; burada TEK İŞLEMDE uygulanır — yarım kalmaz.
--  p = { varyantAc:     [{ urunId, renkId?, renk?, olcuId?, olcu?, minStok? }],
--        satirlar:      [{ id, fisId, urunId, renkId?, renk?, olcuId?, olcu?, miktar, kaynak, tarih, siparisId, siparisNo,
--                          kalemId, cariId, uretimId, rezervasyonSiparisId, fazlaGonderim, aciklama, ek }],
--        iptal:         [hareket kimliği, …],
--        varyantKaldir: [{ urunId, renkId?, renk?, olcuId?, olcu? }] }
--  HER PARÇA TEKRARA DAYANIKLI: satır kimliğiyle yazılır (aynı satır yeniden gelirse üzerine, değişmediyse dokunulmaz),
--  iptal zaten iptalse bir şey yapmaz, açık varyant yeniden açılmaz. Ağda düşüp yeniden gönderilen istek (bekleyen kayıt
--  defteri) stoğu İKİ KEZ değiştirmez.
--  Miktarı 0 olan satır yazılmaz (varsa iptal edilir) — yeni yapıda hareket ≠ 0.
--  Kaldırılan varyant: stoğu varsa dokunulmaz (raporlanır), hareketi varsa pasif, hiç yoksa silinir.
create or replace function public.stk_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  vid text;
  fid text;
  m numeric;
  f public.stk_fis;
  eposta text := lower(auth.jwt() ->> 'email');
  bakiye numeric;
  n_ac int := 0;
  n_satir int := 0;
  n_iptal int := 0;
  n_kaldir int := 0;
  n int;
  atlanan jsonb := '[]'::jsonb;
  acilan text[] := '{}';
begin
  perform public.v2_yazma_acik('stok');
  -- Yetki (v1.730.1 genişledi): v1'de stok tablolarına yazma modül yetkisi istemiyordu (rls-yazma.sql); stok satırını cari
  -- kartından fiş kesen cari yetkilisi, peşin fişte muhasebe yetkilisi, Tanımlar'da renk birleştiren kullanıcı da yazar.
  -- Herhangi bir modülde "kaydetme" yeter; Tanımlar'da listede olmayan ya da hiç kaydetme yetkisi olmayan reddedilir.
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe', 'tanimlar'], 'kaydetme');

  -- 1) Varyant aç / min stok
  for s in select * from jsonb_array_elements(coalesce(p -> 'varyantAc', '[]'::jsonb)) loop
    vid := public.stk_varyant_coz(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    update public.stk_varyant set aktif = true, min_stok = coalesce((s ->> 'minStok')::numeric, min_stok)
     where id = vid and (not aktif or min_stok is distinct from coalesce((s ->> 'minStok')::numeric, min_stok));
    acilan := array_append(acilan, vid);
    n_ac := n_ac + 1;
  end loop;

  -- 2) Satırlar
  for s in select * from jsonb_array_elements(coalesce(p -> 'satirlar', '[]'::jsonb)) loop
    fid := nullif(btrim(coalesce(s ->> 'fisId', '')), '');
    if coalesce(s ->> 'id', '') = '' then raise exception 'Stok satırında hareket kimliği yok' using errcode = '22023'; end if;
    if fid is null then raise exception 'Hareket % fişsiz — fişsiz hareket yazılamaz', s ->> 'id' using errcode = '22023'; end if;
    m := coalesce((s ->> 'miktar')::numeric, 0);
    if m = 0 then
      update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta where id = s ->> 'id' and not iptal;
      continue;
    end if;
    select * into f from public.stk_fis where id = fid for update;
    if not found then
      insert into public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, kullanici, olusturan)
      values (fid, public.stk_kaynak_tur(s ->> 'kaynak'), s ->> 'kaynak', coalesce(public.stk_zaman(s ->> 'tarih'), now()),
              s ->> 'cariId', s ->> 'siparisId', s ->> 'siparisNo', s ->> 'uretimId', s -> 'ek' ->> 'kullanici', eposta);
    elsif f.iptal then
      -- İptal edilmiş fişe satır geldi (köprü fiş iptali kullanmaz; göçteki eski iptal fişi): fiş açılır, öteki satırları
      -- iptal kalır — stoğa sayılmayanlar sayılmaya başlamasın.
      update public.stk_hareket set iptal = true, iptal_zamani = coalesce(f.iptal_zamani, now()), iptal_eden = f.iptal_eden
       where fis_id = fid and not iptal and id <> s ->> 'id';
      update public.stk_fis set iptal = false where id = fid;
    end if;
    vid := public.stk_varyant_coz(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    insert into public.stk_hareket as h (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, siparis_no, kalem_id,
                                         cari_id, uretim_id, rezervasyon_siparis_id, fazla_gonderim, aciklama, ek)
    values (s ->> 'id', fid, vid, s ->> 'urunId', m, s ->> 'kaynak', coalesce(public.stk_zaman(s ->> 'tarih'), now()),
            s ->> 'siparisId', s ->> 'siparisNo', s ->> 'kalemId', s ->> 'cariId', s ->> 'uretimId', s ->> 'rezervasyonSiparisId',
            coalesce((s ->> 'fazlaGonderim')::boolean, false), s ->> 'aciklama', coalesce(s -> 'ek', '{}'::jsonb))
    on conflict (id) do update set
      fis_id = excluded.fis_id, varyant_id = excluded.varyant_id, urun_id = excluded.urun_id, miktar = excluded.miktar,
      kaynak = excluded.kaynak, tarih = excluded.tarih, siparis_id = excluded.siparis_id, siparis_no = excluded.siparis_no,
      kalem_id = excluded.kalem_id, cari_id = excluded.cari_id, uretim_id = excluded.uretim_id,
      rezervasyon_siparis_id = excluded.rezervasyon_siparis_id, fazla_gonderim = excluded.fazla_gonderim,
      aciklama = excluded.aciklama, ek = excluded.ek, iptal = false, iptal_zamani = null, iptal_eden = null
    where (h.fis_id, h.varyant_id, h.miktar, h.kaynak, h.tarih, h.siparis_id, h.siparis_no, h.kalem_id, h.cari_id, h.uretim_id,
           h.rezervasyon_siparis_id, h.fazla_gonderim, h.aciklama, h.ek, h.iptal)
      is distinct from (excluded.fis_id, excluded.varyant_id, excluded.miktar, excluded.kaynak, excluded.tarih, excluded.siparis_id,
           excluded.siparis_no, excluded.kalem_id, excluded.cari_id, excluded.uretim_id, excluded.rezervasyon_siparis_id,
           excluded.fazla_gonderim, excluded.aciklama, excluded.ek, false);
    n_satir := n_satir + 1;
  end loop;

  -- 3) Satır iptali (hareket silindi / geri alındı)
  update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta
   where id in (select jsonb_array_elements_text(coalesce(p -> 'iptal', '[]'::jsonb))) and not iptal;
  get diagnostics n_iptal = row_count;

  -- 4) Varyant kaldır
  for s in select * from jsonb_array_elements(coalesce(p -> 'varyantKaldir', '[]'::jsonb)) loop
    vid := public.stk_varyant_bul(s ->> 'urunId', s ->> 'renkId', s ->> 'renk', s ->> 'olcuId', coalesce(s ->> 'olcu', s ->> 'beden'));
    -- Aynı istekte açılan varyant kaldırılmaz: yeniden adlandırmada eski ad (Tanımlar henüz buluta varmadıysa) hâlâ aynı
    -- varyanta çıkar — "aç" ile "kaldır" aynı varyantı gösterir, kaldırmak açılanı pasife alırdı.
    continue when vid is null or vid = any(acilan);
    select miktar into bakiye from public.stk_stok where varyant_id = vid;
    if coalesce(bakiye, 0) <> 0 then
      atlanan := atlanan || jsonb_build_object('neden', 'stoğu var', 'varyantId', vid, 'miktar', bakiye);
    elsif exists (select 1 from public.stk_hareket where varyant_id = vid) then
      update public.stk_varyant set aktif = false where id = vid and aktif;
      n_kaldir := n_kaldir + 1;
    else
      delete from public.stk_varyant where id = vid;
      n_kaldir := n_kaldir + 1;
    end if;
  end loop;

  return jsonb_build_object('varyantAc', n_ac, 'satir', n_satir, 'iptal', n_iptal, 'varyantKaldir', n_kaldir, 'atlanan', atlanan);
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5) GÜVENLİK — tablolar yalnız okunur; yazma yalnız yukarıdaki işlemlerle (security definer).
--    Supabase SQL Editor metni kendi ayırıcısıyla ifadelere bölüyor ve yalnız düz çift-dolar tırnağını tanıyor: adlı ya da
--    iç içe tırnak, yorumdaki dolar işareti gövdeyi ortasından keser (28 Ekim: "syntax error at or near if … end if;"; 7 Ekim
--    do-bloğu hatası da buydu). Bu dosyada YALNIZ düz çift-dolar gövde, iç içe yok; do-bloğu yerine geçici kurulum fonksiyonu.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.stk_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $$
declare
  t text;
  f text;
  rapor text := '';
begin
  foreach t in array array['stk_renk', 'stk_olcu', 'stk_varyant', 'stk_fis', 'stk_hareket', 'stk_ayar'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists stk_okuma on public.%I', t);
    execute format('create policy stk_okuma on public.%I for select to authenticated using (true)', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  foreach t in array array['stk_stok', 'stk_eski_varyantlar_g', 'stk_eski_hareketler_g'] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  -- Gün sonu raporu (Edge Function, servis rolü) geçişten sonra `varyantlar` / `stok_hareketleri` görünümlerinden okur.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    foreach t in array array['stk_renk', 'stk_olcu', 'stk_varyant', 'stk_fis', 'stk_hareket', 'stk_ayar', 'stk_stok',
                             'stk_eski_varyantlar_g', 'stk_eski_hareketler_g'] loop
      execute format('grant select on public.%I to service_role', t);
    end loop;
  end if;

  -- İç yardımcılar dışarıdan çağrılamaz; uygulama yalnız beş işlemi çağırır.
  foreach f in array array['stk_nrm(text)', 'stk_yer_tutucu_mu(text)', 'stk_zaman(text)', 'stk_sayi(text)', 'stk_mantik(text)', 'stk_dizi(jsonb)',
                           'stk_tanim_esitle(jsonb)', 'stk_tanim_tetik()',
                           'stk_renk_coz(text,text)', 'stk_olcu_coz(text,text)', 'stk_varyant_coz(text,text,text,text,text)',
                           'stk_yetki(text[],text)', 'stk_bakiye_json(text[])', 'stk_varyant_bul(text,text,text,text,text)',
                           'stk_serbest_birlestir()', 'stk_kaynak_tur(text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['stk_fis_kaydet(jsonb)', 'stk_fis_iptal(text,text)', 'stk_varyant_ac(jsonb)', 'stk_varyant_kaldir(text)',
                           'stk_min_stok(text,numeric)', 'stk_yaz(jsonb)'] loop
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
end $$;
select public.stk_kurulum_tamamla();
drop function public.stk_kurulum_tamamla();

-- İlk aynalama: bugünkü tanımlar.
select public.stk_tanim_esitle((select veri from public.tanimlar where id = 'tekil'));

commit;
