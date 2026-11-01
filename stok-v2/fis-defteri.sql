-- =====================================================================================================================
--  fis-defteri.sql — TEK FİŞ DEFTERİ (FIS-DEFTERI-PLAN.md, kullanıcı onayı 30 Ekim: "Önerilerin hepsi uygun, başla")
-- =====================================================================================================================
--
--  KURAL (kullanıcı): "Fiş defterinden her işlem geçmesi lazım ve her yerin burayı okuması gerek. Para hareketi de fiş
--  oluştursun. Fatura gibi düşün: mal alıp borçlanıyoruz fatura girişinde, para verip borcumuz azalıyor karşılığında."
--
--  1. Fiş başlığı `stk_fis` (stok v2'den) iki aileye genişler: STOK fişi (mal) ve PARA fişi (makbuz). Genel / Resmi
--     fişin özelliğidir (`defter`). Fişin kalemleri (faturanın satırları) başlıkta (`kalemler`).
--  2. Hareket fişin SATIRIDIR: stok (`stk_hareket`, bağ zaten zorunlu), cari (`car_hareket.fis_id`) ve kasa/banka
--     (`kas_hareket.fis_id`) satırları fişe bağlıdır.
--  3. Tek kapı `fis_kes`: başlık + satırlar (+ bağlı makbuz, + sipariş/üretim satırı güncellemesi) TEK İŞLEMDE. Fiş
--     numarasını SUNUCU verir (önek + yıl-ay-gün + sıra); uygulama her denemeye bir istek kimliği koyar — ağda düşüp yeniden
--     gönderilen fiş ikinci kez yazılmaz, ilk yazılanın numarası döner.
--  4. Fiş silinmez: `fis_iptal` fişi ve bütün satırlarını (bağlı makbuzla birlikte) iptal eder; düzeltme = iptal + yeni fiş.
--  5. KURALLAR VERİTABANINDA (tetikleyiciler): hareket tablolarına yalnız fis_kes / fis_iptal yazar; satır silinmez ve
--     iptal dışında değişmez; fiş başlığı silinmez; satırsız fiş kalmaz (işlem sonunda denetlenir).
--     Kurallar `stk_ayar.fis_aktif` açılınca işler (`fis_kural_ac()`): önce bu dosya kurulur (bugünkü uygulama çalışmaya
--     devam eder), fiş defterli uygulama yayınlanır, sonra kurallar açılır. Açıldıktan sonra eski yoldan (stk_yaz,
--     car_yaz, kas_yaz ile doğrudan hareket) yazan istek REDDEDİLİR — yanlış kayıt yerine hata.
--  Okuma: `fis_listesi` (fiş defteri ekranı, eski defter kaydı biçiminde). Stok, cari ve kasa bakiyesi bugünkü
--  görünümlerden (iptal edilmemiş satırların toplamı).
--  KİLİT SIRASI (v1.743.0, F1 — VERI-TUTARLILIGI-F0.md § 4): her izlenen tablonun AFTER STATEMENT `degisiklik_izle` tetikleyicisi
--  TEK satırı günceller (degisiklik.id = 'tekil'); yazan her işlem bu satırı İLK YAZMA deyiminin sonunda kilitler ve işlem bitene
--  kadar tutar. 'tekil'den SONRA yeni bir satır kilidi alan işlem, o satırı önceden tutup 'tekil'i bekleyen işlemle kilitlenir
--  (t-kilit.js G1/G2 ölçüldü). KURAL: birden çok deyim yazan sunucu işlemi ihtiyaç duyacağı satır kilitlerini İLK YAZMADAN ÖNCE alır:
--    (1) istek kilidi (pg_advisory_xact_lock)  (2) sipariş kalemleri, KİMLİK SIRASIYLA (fis_kalem_kilitle)  (3) iptal edilen fiş
--    satırı (stk_fis … for update)  → sonra yazmalar (fis_sayac, stk_fis, satırlar, alt_yaz; ilk yazmayla 'tekil').
--    Kalem fişten ÖNCE: fis_iptal kalem kilidini beklerken fiş satırını TUTMAZ — aynı siparişin fis_bag_coz'u (önce hareketler →
--    sonra fiş başlığı) o arada bitebilir (t-f1.js G4: fiş önce kilitlendiğinde deadlock ölçüldü). fis_bag_coz ile fis_iptal arasındaki
--    ters sıra (hareket ↔ fiş) 1.742.3'te de vardı; dar pencere olarak kalır — F4 (siparis_iptal) kapatır.
--  'tekil' alındıktan sonra yeni satır kilidi ALINMAZ: karşılanan hesabı (fis_kalem_karsilanan_yenile) yalnız önceden kilitlenmiş
--  (ya da bu işlemin eklediği) kalemlere yazar. alt_yaz kalemleri zaten kimlik sırasıyla yazar (distinct on … order by id).
--  Supabase SQL Editor kuralı (editor-icin.py): yalnız düz çift-dolar gövde, iç içe yok, başka yerde dolar işareti yok.
--  Önce stok-v2.sql, cari-v2.sql, alt-v2.sql, kasa-v2.sql kurulmuş olmalı.
-- =====================================================================================================================

begin;

-- 1) FİŞ BAŞLIĞI genişler
alter table public.stk_fis add column if not exists aile text not null default 'stok';
alter table public.stk_fis add column if not exists onek text;
alter table public.stk_fis add column if not exists istek text;
alter table public.stk_fis add column if not exists defter text;
alter table public.stk_fis add column if not exists kasa_hesap_id text;
alter table public.stk_fis add column if not exists para_birimi text;
alter table public.stk_fis add column if not exists kur numeric;
alter table public.stk_fis add column if not exists tutar numeric;
alter table public.stk_fis add column if not exists kdv numeric;
alter table public.stk_fis add column if not exists kalemler jsonb not null default '[]'::jsonb;
alter table public.stk_fis add column if not exists bagli_fis text;
create unique index if not exists stk_fis_istek on public.stk_fis (istek) where istek is not null;
create index if not exists stk_fis_cari on public.stk_fis (cari_id);

alter table public.stk_ayar add column if not exists fis_aktif boolean not null default false;
alter table public.stk_ayar add column if not exists fis_aktif_zamani timestamptz;

-- 2) SATIR BAĞLARI — varsayılan değer fis_kes'in o an kestiği fiş: car_yaz / kas_yaz değişmeden fişe bağlı satır yazar.
alter table public.car_hareket add column if not exists fis_id text references public.stk_fis(id);
alter table public.car_hareket alter column fis_id set default nullif(current_setting('fis.aktif', true), '');
create index if not exists car_hareket_fis_id on public.car_hareket (fis_id);
alter table public.kas_hareket add column if not exists fis_id text references public.stk_fis(id);
alter table public.kas_hareket alter column fis_id set default nullif(current_setting('fis.aktif', true), '');
create index if not exists kas_hareket_fis_id on public.kas_hareket (fis_id);

-- GEÇMİŞ SİPARİŞ BAĞI (F1.1, kullanıcı kuralı 2 Kasım: "geçmiş bağlantı ile geçerli teslim bağlantısı birbirinden açıkça
-- ayrılmalı"). Sipariş iptalinde (fis_bag_coz) GEÇERLİ bağ (siparis_id / kalem_id) boşalır, eski değerler BURAYA taşınır — bir kez.
-- Geçerli bağ: "bu hareket bu kalemin açık teslimidir" (planlama, rezervasyon, kalan). Geçmiş bağ: "iptal edilmiş şu siparişin
-- şu kalemine teslim edilmişti" — yalnız teslim geçmişi ve karşılanan hesabı (fis_kalem_hesap) için. Yalnız fis_bag_coz yazar;
-- fis_bag_iz_koru tetikleyicisi (kurallar kapalıyken de) başka her yazmayı reddeder; aynı satırda iki bağ birden olamaz (kısıt,
-- fis_kurulum_tamamla). F1.1'den ÖNCE bağı çözülmüş satırlarda bu sütunlar BOŞTUR ve tahminle doldurulmaz (kural 8; denetim D5c).
alter table public.stk_hareket add column if not exists gecmis_siparis_id text;
alter table public.stk_hareket add column if not exists gecmis_kalem_id text;
alter table public.stk_hareket add column if not exists bag_cozum_zamani timestamptz;
create index if not exists stk_hareket_gecmis_kalem on public.stk_hareket (gecmis_kalem_id) where gecmis_kalem_id is not null;
create index if not exists stk_hareket_gecmis_siparis on public.stk_hareket (gecmis_siparis_id) where gecmis_siparis_id is not null;   -- F2: sipariş silme koruması
create index if not exists stk_hareket_kalem on public.stk_hareket (kalem_id) where kalem_id is not null;   -- F2: kalem koruması (siparis_id'siz eşleşme)

-- 3) FİŞ NUMARASI — önek + yıl-ay-gün (İstanbul saati) + günün sırası: AF-261030001. Aynı gün aynı önekle iki cihaz aynı
--    numarayı alamaz (sayaç satırı kilitlenir). 999'dan sonra hane büyür (kesilmez).
create table if not exists public.fis_sayac (
  onek  text not null,
  gun   text not null,
  son   int  not null default 0,
  primary key (onek, gun)
);

-- KARŞILANAN İZİ (v1.743.0, F1 — kullanıcı kararı 1 Kasım: "önceden var olan farkların işlem sırasında sessizce değişmesi
-- ayrıca raporlanmalı"; "hayalet karşılanan otomatik sıfırlanmayacak"). Bir fiş işlemi, kalemin ÖNCEDEN hareketlerle uyuşmayan
-- karşılananını değiştirdiğinde (`onceden_fark`) ya da hareketsiz (hayalet) karşılananı korunarak bu işlemin değişimi eklendiğinde
-- (`hayalet_korundu`) bir satır düşer. Yalnız sunucu işlemleri yazar; gece denetimi okur (fis_gece_denetimi `karsilanan`).
create table if not exists public.fis_karsilanan_iz (
  id                 bigserial primary key,
  zaman              timestamptz not null default now(),
  eposta             text,
  islem              text not null,     -- fis_kes / fis_iptal
  fis_no             text,
  kalem_id           text not null,
  tur                text not null,     -- onceden_fark / hayalet_korundu
  onceki_karsilanan  numeric,
  onceki_hesap       numeric,           -- işlemden ÖNCE geçerli hareketlerden hesaplanan
  yeni_karsilanan    numeric
);
create index if not exists fis_karsilanan_iz_zaman on public.fis_karsilanan_iz (zaman);

create or replace function public.fis_no_al(p_onek text) returns text
language plpgsql security definer set search_path = public as $$
declare
  g text := to_char(now() at time zone 'Europe/Istanbul', 'YYMMDD');
  n int;
begin
  if p_onek is null or length(p_onek) not between 2 and 4 or p_onek <> upper(p_onek) or p_onek ~ '[^A-ZÇĞİÖŞÜ]' then
    raise exception 'Fiş öneki geçersiz: % (2-4 büyük harf)', coalesce(p_onek, '(yok)') using errcode = '22023';
  end if;
  insert into public.fis_sayac as s (onek, gun, son) values (p_onek, g, 1)
  on conflict (onek, gun) do update set son = s.son + 1
  returning son into n;
  return p_onek || '-' || g || case when n < 1000 then lpad(n::text, 3, '0') else n::text end;
end $$;

-- 4) KURALLAR
create or replace function public.fis_kural_aktif() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select fis_aktif from public.stk_ayar where id = 'tekil'), false)
$$;

create or replace function public.fis_kapi_acik() returns boolean
language sql volatile as $$
  select coalesce(current_setting('fis.kapi', true), '') = 'acik'
$$;

-- Hareket satırı (stok, cari, kasa): silinmez; yalnız fiş kesilirken eklenir ve fiş iptal edilirken iptal işaretlenir.
create or replace function public.fis_satir_koru() returns trigger
language plpgsql as $$
declare
  duzen text := coalesce(current_setting('fis.duzen', true), '');
  yeni_j jsonb;
  eski_j jsonb;
begin
  if not public.fis_kural_aktif() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Hareket silinmez — fişi iptal edin (% %)', tg_table_name, old.id using errcode = '42501';
  end if;
  if not public.fis_kapi_acik() then
    raise exception 'Hareket yalnız fiş kesilerek yazılır (% %) — eski yazma yolu kapalı', tg_table_name, new.id using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.fis_id is null then
      raise exception 'Fişsiz hareket yazılamaz (% %)', tg_table_name, new.id using errcode = '23502';
    end if;
    return new;
  end if;
  -- Güncelleme: yalnız iptal alanları değişebilir (ve kayıt zamanı).
  -- DAR DÜZEN KİPLERİ (v1.742.0, kullanıcı kararı 31 Ekim): iki sunucu işlemi satırın YALNIZ belirli alanlarına dokunur; kip
  -- (`fis.duzen`) yalnız o işlemlerin içinde açılır, işlem sonunda kapanır. Miktar, tutar, ürün, tarih hiçbir kipte değişmez.
  -- (Fiş defterinden önceki eski fişler için ayrı yol YOK — kullanıcı: veriler kurallar açılmadan sıfırlanır.)
  --   bag     (fis_bag_coz): sipariş iptalinde sipariş bağı çözülür — siparis_id / kalem_id / rezervasyon_siparis_id boşalır,
  --           eski değerler geçmiş sütunlara geçer (F1.1; geçişin doğruluğunu fis_bag_iz_koru denetler),
  --           siparis_no "(iptal)" eki alır; cari satırında `ek`ten yalnız siparisId / kalemId / rezervasyonSiparisId düşer.
  --   varyant (stk_renk_tasi): renk kodlamada hedef varyant zaten varsa hareket o varyanta taşınır (renk adı değişir, stok aynı).
  yeni_j := to_jsonb(new) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'guncelleme';
  eski_j := to_jsonb(old) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'guncelleme';
  if yeni_j is distinct from eski_j then
    if duzen = 'bag'
       and (yeni_j - 'siparis_id' - 'siparis_no' - 'kalem_id' - 'rezervasyon_siparis_id' - 'ek' - 'gecmis_siparis_id' - 'gecmis_kalem_id' - 'bag_cozum_zamani')
         = (eski_j - 'siparis_id' - 'siparis_no' - 'kalem_id' - 'rezervasyon_siparis_id' - 'ek' - 'gecmis_siparis_id' - 'gecmis_kalem_id' - 'bag_cozum_zamani')
       and ((yeni_j -> 'ek') is not distinct from (eski_j -> 'ek')
         or (yeni_j -> 'ek') is not distinct from ((eski_j -> 'ek') - 'siparisId' - 'kalemId' - 'rezervasyonSiparisId')
         or (yeni_j -> 'ek') is not distinct from ((eski_j -> 'ek') - 'siparisId' - 'kalemId')
         or (yeni_j -> 'ek') is not distinct from ((eski_j -> 'ek') - 'rezervasyonSiparisId')) then
      return new;
    end if;
    if duzen = 'varyant' and tg_table_name = 'stk_hareket' and (yeni_j - 'varyant_id') = (eski_j - 'varyant_id') then
      return new;
    end if;
    raise exception 'Hareket değiştirilemez — fişi iptal edip yeniden kesin (% %)', tg_table_name, new.id using errcode = '42501';
  end if;
  if old.iptal and not new.iptal then
    raise exception 'İptal edilmiş hareket geri açılamaz — yeni fiş kesin (% %)', tg_table_name, new.id using errcode = '42501';
  end if;
  return new;
end $$;

-- KURAL REDDİ KODLARI (F2, kullanıcı kararı 2 Kasım): sunucunun veri kuralı redleri `KRnnn` SQLSTATE'iyle döner — 42501 ("yetki yok")
-- DEĞİL: istemci 42501'i "giriş yapılmamış" diye çeviriyordu ve kalıcı reddi bekleyen defterde dakikada bir yeniden gönderiyordu.
-- 1.744.0 istemcisi KR kodunu KALICI RET sayar (otomatik tekrar yok, "inceleme gerekiyor"); eski istemci ham Türkçe metni gösterir.
--   KR001 bağı çözülmüş hareket yeniden bağlanamaz / geçmiş bağ değiştirilemez (F1.1)
--   KR002 teslim geçmişi olan kalem / sipariş silinemez (birleştirme dahil)      KR003 teslimli kalemin ürün / renk / beden / siparişi değişmez
--   KR004 miktar teslim edilenin altına inemez                                   KR005 var olmayan kaleme hareket bağlanamaz
-- GEÇMİŞ BAĞ KORUMASI (F1.1) — kurallardan BAĞIMSIZ (canlıda kurallar kapalıyken eski stk_yaz yolu da açık): geçmiş sütunları
-- yalnız fis_bag_coz (`fis.duzen` = bag) ve yalnız tek geçişle yazar: hiç çözülmemiş satır → geçerli bağ boşalır, eski değerler
-- geçmişe, çözüm zamanı dolar. Çözülmüş satır geçerli bağa yeniden bağlanamaz (eski bir cihazın bayat satırı bağı diriltmesin).
create or replace function public.fis_bag_iz_koru() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.gecmis_siparis_id is not null or new.gecmis_kalem_id is not null or new.bag_cozum_zamani is not null then
      raise exception 'Geçmiş sipariş bağı yalnız sipariş iptalinde yazılır (stk_hareket %)', new.id using errcode = 'KR001';
    end if;
    return new;
  end if;
  if old.bag_cozum_zamani is null and new.bag_cozum_zamani is not null then
    if coalesce(current_setting('fis.duzen', true), '') <> 'bag'
       or new.gecmis_siparis_id is distinct from old.siparis_id or new.gecmis_kalem_id is distinct from old.kalem_id
       or old.gecmis_siparis_id is not null or old.gecmis_kalem_id is not null
       or new.siparis_id is not null or new.kalem_id is not null then
      raise exception 'Geçmiş sipariş bağı yalnız sipariş iptalinde, eski geçerli bağdan yazılır (stk_hareket %)', new.id using errcode = 'KR001';
    end if;
    return new;
  end if;
  if new.gecmis_siparis_id is distinct from old.gecmis_siparis_id or new.gecmis_kalem_id is distinct from old.gecmis_kalem_id
     or new.bag_cozum_zamani is distinct from old.bag_cozum_zamani then
    raise exception 'Geçmiş sipariş bağı değiştirilemez (stk_hareket %)', new.id using errcode = 'KR001';
  end if;
  if old.bag_cozum_zamani is not null and (new.siparis_id is not null or new.kalem_id is not null) then
    raise exception 'Bağı çözülmüş (iptal edilmiş siparişin) hareketi yeniden siparişe bağlanamaz (stk_hareket %)', new.id using errcode = 'KR001';
  end if;
  return new;
end $$;

-- TESLİM GEÇMİŞİ OLAN SİPARİŞ KALEMİ (F2, kullanıcı hedefi 2 Kasım: "hiçbir fiş ya da stok hareketi sahipsiz kalmamalı").
-- Teslim geçmişi = kalemi gösteren herhangi bir stok hareketi: geçerli bağ (kalem_id) ya da geçmiş bağ (gecmis_kalem_id, F1.1);
-- iptal edilmiş satırlar DAHİL (karar K1: yalnız iptal edilmiş hareketi olan kalem de silinemez — satır var olmayan kalemi
-- göstermesin). Kurallardan BAĞIMSIZ (canlıda kurallar kapalı; köprü, REST ve sipariş silmede cascade aynı korumaya takılır).
create or replace function public.fis_kalem_hareket_var(p_kalem text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stk_hareket h where h.kalem_id = p_kalem)
      or exists (select 1 from public.stk_hareket h where h.gecmis_kalem_id = p_kalem)
$$;

--  DELETE (kalem silme, birleştirmede silinen kalem, sipariş silmenin cascade'i) → KR002
--  UPDATE: ürün / renk / beden / sipariş değişimi (renk ve beden büyük-küçük harf ve boşluk duyarsız, karar K4) → KR003;
--          miktar AZALIRKEN teslim edilenin (fis_kalem_hesap: geçerli + geçmiş bağ, iptal sayılmaz) altına inerse → KR004.
--          Miktar değişmiyorsa serbest (fazla teslimli kalemin fiyatı düzenlenebilir). Teslimsiz kalem bütün düzenlemelere açık.
create or replace function public.fis_kalem_teslim_koru() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  teslim numeric;
begin
  if tg_op = 'DELETE' then
    if public.fis_kalem_hareket_var(old.id::text) then
      raise exception 'Teslim geçmişi olan sipariş kalemi silinemez ya da başka kalemle birleştirilemez (kalem %: % %, teslim edilen %) — kalem kalmalı; gerekirse siparişi iptal edin',
        old.id, coalesce(old.urun_ad, old.urun_id, ''), coalesce(old.renk, ''), public.fis_kalem_hesap(old.id::text) using errcode = 'KR002';
    end if;
    return old;
  end if;
  if (new.urun_id is distinct from old.urun_id
      or lower(btrim(coalesce(new.renk, ''))) <> lower(btrim(coalesce(old.renk, '')))
      or lower(btrim(coalesce(new.beden, ''))) <> lower(btrim(coalesce(old.beden, '')))
      or new.siparis_id is distinct from old.siparis_id)
     and public.fis_kalem_hareket_var(old.id::text) then
    raise exception 'Teslim geçmişi olan kalemin ürünü, rengi, bedeni ya da siparişi değiştirilemez (kalem %: % % → % %) — yeni kalem ekleyin',
      old.id, coalesce(old.renk, ''), coalesce(old.beden, ''), coalesce(new.renk, ''), coalesce(new.beden, '') using errcode = 'KR003';
  end if;
  if coalesce(new.miktar, 0) < coalesce(old.miktar, 0) then
    teslim := public.fis_kalem_hesap(old.id::text);
    if coalesce(new.miktar, 0) < teslim then
      raise exception 'Sipariş miktarı teslim edilenin altına indirilemez (kalem %: istenen %, teslim edilen %)', old.id, new.miktar, teslim
        using errcode = 'KR004';
    end if;
  end if;
  return new;
end $$;

-- Sipariş silme: kalemsiz bağlı hareket (yalnız siparis_id) ya da geçmiş sipariş bağı da korunur; kalemli olanı cascade'deki
-- fis_kalem_teslim_koru yakalar. İptal edilmiş sipariş (F1.1: teslimi geçmiş bağda) silinemez, "İptal" durumunda kalır.
create or replace function public.fis_siparis_teslim_koru() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.stk_hareket h where h.siparis_id = old.id::text)
     or exists (select 1 from public.stk_hareket h where h.gecmis_siparis_id = old.id::text) then
    raise exception 'Teslim geçmişi olan sipariş silinemez (sipariş % %) — iptal edilmiş olarak kalır', old.id, coalesce(old.siparis_no, '')
      using errcode = 'KR002';
  end if;
  return old;
end $$;

-- Fiş başlığı: silinmez; yalnız fis_kes / fis_iptal / fis_bilgi yazar; tutar ve satır bilgisi kesildikten sonra değişmez.
create or replace function public.fis_baslik_koru() returns trigger
language plpgsql as $$
begin
  if not public.fis_kural_aktif() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Fiş silinmez — iptal edin (%)', old.id using errcode = '42501';
  end if;
  if not public.fis_kapi_acik() then
    raise exception 'Fiş yalnız fis_kes ile kesilir (%) — eski yazma yolu kapalı', new.id using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'iptal_sebebi' - 'aciklama' - 'ek' - 'bagli_fis')
       is distinct from (to_jsonb(old) - 'iptal' - 'iptal_zamani' - 'iptal_eden' - 'iptal_sebebi' - 'aciklama' - 'ek' - 'bagli_fis') then
      raise exception 'Kesilmiş fiş değiştirilemez — iptal edip yeniden kesin (%)', new.id using errcode = '42501';
    end if;
    if old.iptal and not new.iptal then
      raise exception 'İptal edilmiş fiş geri açılamaz — yeni fiş kesin (%)', new.id using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Satırsız fiş kalmaz: işlem sonunda (ertelenmiş) denetlenir.
create or replace function public.fis_satirsiz_denetle() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f public.stk_fis;
begin
  if not public.fis_kural_aktif() then return null; end if;
  select * into f from public.stk_fis where id = new.id;
  if not found then return null; end if;
  if f.aile = 'stok' and not exists (select 1 from public.stk_hareket where fis_id = f.id) then
    raise exception 'Stok fişi % satırsız kalamaz — en az bir stok hareketi gerekli', f.id using errcode = '23514';
  end if;
  if f.aile = 'para' and not exists (select 1 from public.car_hareket where fis_id = f.id)
                     and not exists (select 1 from public.kas_hareket where fis_id = f.id) then
    raise exception 'Para fişi % satırsız kalamaz — en az bir cari ya da kasa hareketi gerekli', f.id using errcode = '23514';
  end if;
  return null;
end $$;

-- 5) FİŞ KES — tek fiş (iç işlev; dışarıdan fis_kes çağrılır)
--  f = { aile, tur, onek, kaynak, defter, tarih, cariId, kasaHesapId, siparisId, siparisNo, uretimId, paraBirimi, kur, tutar,
--        kdv, aciklama, kullanici, kalemler, ek }
--  stok = { satirlar: [stk_yaz satırı — fisId sunucu koyar], varyantAc: [...] }
--  cari = { satirlar: [car_yaz satırı — fis_no / fis_id sunucu koyar] }
--  kasa = { hareketler: [kas_yaz hareketi — veri.fisNo sunucu koyar], cekler: [...] }
drop function if exists public.fis_tek_kes(jsonb, jsonb, jsonb, jsonb, text);

-- NUMARA YER TUTUCUSU: uygulama numarayı bilmeden açıklama yazar ("Alış fişi · «FIS»", peşin makbuzda "Ödeme · «ANAFIS»");
-- sunucu numarayı verince bütün metinde değiştirir. Uygulama aynı değişikliği kendi kopyasında yapar.
create or replace function public.fis_yer_tutucu(j jsonb, p_fis text, p_ana text) returns jsonb
language sql immutable as $$
  select case when j is null then null
              else replace(replace(j::text, '«ANAFIS»', coalesce(p_ana, p_fis)), '«FIS»', p_fis)::jsonb end
$$;

create or replace function public.fis_tek_kes(f jsonb, p_stok jsonb, p_cari jsonb, p_kasa jsonb, p_istek text, p_ana text default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  aile text := coalesce(nullif(f ->> 'aile', ''), '');
  fid text;
begin
  if aile not in ('stok', 'para') then
    raise exception 'Fiş ailesi stok ya da para olmalı (%)', aile using errcode = '22023';
  end if;
  if coalesce(f ->> 'tur', '') = '' then
    raise exception 'Fiş türü yok' using errcode = '22023';
  end if;
  fid := public.fis_no_al(f ->> 'onek');
  f := public.fis_yer_tutucu(f, fid, p_ana);
  p_stok := public.fis_yer_tutucu(p_stok, fid, p_ana);
  p_cari := public.fis_yer_tutucu(p_cari, fid, p_ana);
  p_kasa := public.fis_yer_tutucu(p_kasa, fid, p_ana);
  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.aktif', fid, true);
  insert into public.stk_fis (id, aile, onek, istek, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, aciklama,
                              kullanici, olusturan, ek, defter, kasa_hesap_id, para_birimi, kur, tutar, kdv, kalemler)
  values (fid, aile, f ->> 'onek', p_istek, f ->> 'tur', f ->> 'kaynak', coalesce(public.stk_zaman(f ->> 'tarih'), now()),
          nullif(f ->> 'cariId', ''), nullif(f ->> 'siparisId', ''), nullif(f ->> 'siparisNo', ''), nullif(f ->> 'uretimId', ''),
          f ->> 'aciklama', f ->> 'kullanici', lower(auth.jwt() ->> 'email'),
          case when jsonb_typeof(f -> 'ek') = 'object' then f -> 'ek' else '{}'::jsonb end,
          coalesce(nullif(f ->> 'defter', ''), 'Genel'), nullif(f ->> 'kasaHesapId', ''), nullif(f ->> 'paraBirimi', ''),
          public.stk_sayi(f ->> 'kur'), public.stk_sayi(f ->> 'tutar'), public.stk_sayi(f ->> 'kdv'),
          case when jsonb_typeof(f -> 'kalemler') = 'array' then f -> 'kalemler' else '[]'::jsonb end);

  if jsonb_array_length(public.stk_dizi(p_stok -> 'satirlar')) > 0 or jsonb_array_length(public.stk_dizi(p_stok -> 'varyantAc')) > 0 then
    perform public.stk_yaz(jsonb_build_object(
      'varyantAc', public.stk_dizi(p_stok -> 'varyantAc'),
      'satirlar', (select coalesce(jsonb_agg(x || jsonb_build_object('fisId', fid)), '[]'::jsonb)
                   from jsonb_array_elements(public.stk_dizi(p_stok -> 'satirlar')) x)));
  end if;
  if jsonb_array_length(public.stk_dizi(p_cari -> 'satirlar')) > 0 then
    perform public.car_yaz(jsonb_build_object(
      'satirlar', (select coalesce(jsonb_agg(x || jsonb_build_object('fis_no', fid)), '[]'::jsonb)
                   from jsonb_array_elements(public.stk_dizi(p_cari -> 'satirlar')) x)));
  end if;
  if jsonb_array_length(public.stk_dizi(p_kasa -> 'hareketler')) > 0 or jsonb_array_length(public.stk_dizi(p_kasa -> 'cekler')) > 0 then
    perform public.kas_yaz(jsonb_build_object(
      'hareketler', (select coalesce(jsonb_agg(x || jsonb_build_object('veri', coalesce(x -> 'veri', '{}'::jsonb) || jsonb_build_object('fisNo', fid))), '[]'::jsonb)
                     from jsonb_array_elements(public.stk_dizi(p_kasa -> 'hareketler')) x),
      'cekler', public.stk_dizi(p_kasa -> 'cekler')));
  end if;

  -- Ailenin satırı hemen denetlenir (işlem sonundaki ertelenmiş denetim de var): hata fişin numarasıyla döner.
  if aile = 'stok' and not exists (select 1 from public.stk_hareket where fis_id = fid) then
    raise exception 'Stok fişinde stok satırı yok (%)', f ->> 'tur' using errcode = '23514';
  end if;
  if aile = 'para' and not exists (select 1 from public.car_hareket where fis_id = fid)
                   and not exists (select 1 from public.kas_hareket where fis_id = fid) then
    raise exception 'Para fişinde cari ya da kasa satırı yok (%)', f ->> 'tur' using errcode = '23514';
  end if;
  perform set_config('fis.aktif', '', true);
  return fid;
end $$;

-- FİŞ KES — tek kapı (uygulama). p = { istek, fis, stok, cari, kasa, bagli: { fis, stok, cari, kasa }, alt }
--  `bagli`: aynı işlemin öteki ailesi (peşin satışın tahsilat makbuzu, peşin alışın ödeme makbuzu) — iki fiş birbirine bağlı,
--  biri iptal edilince öteki de. `alt`: sipariş kalemi karşılanan / üretim ataması (alt_yaz) — aynı işlemde.
--  Dönüş: { fisNo, bagliFisNo, zatenVar } — aynı istek ikinci kez gelirse yazmaz, ilk numaraları döner.
-- KARŞILANAN DEĞİŞİMİ (v1.742.2 — R1, teknik analiz 31 Ekim): sipariş kaleminin karşılananı istemcide ekrandaki (bayat olabilir)
-- değerden hesaplanıp MUTLAK yazılıyordu; iki kullanıcı aynı kaleme aynı anda teslim edince ikincisi birincinin artışını eziyordu
-- (yerel sınamada: stoktan 10 çıktı, karşılanan 5 — stok-v2/test/r1-yaris.js). İstemci artık DEĞİŞİMİ de gönderir:
--   alt.siparis_kalemleri.artis = [{ id, miktar }]   (teslim +, iptal −)
-- Sunucu değişimi satır kilidi altında GÜNCEL değere ekler (aynı kalemi güncelleyen ikinci işlem birincinin bitmesini bekler ve
-- onun yazdığı değeri görür). Alt sınır 0. ÜST SINIR YOK (v1.742.3, kontrol raporu madde 4): miktarı aşan eşzamanlı teslimde
-- (20'lik kaleme 24) fazla adet sipariş kaydında da görünsün — stok hareketleri 24, karşılanan 24 (uygulamanın türetme tanımı 013
-- de kırpmaz). Önce 20'ye kırpılıyordu, fazla 4 adet sipariş tarafında sessizce kayboluyordu.
-- GERİYE UYUM: `artis` olan kalemin satırındaki mutlak `karsilanan` yazılmaz (alt_yaz'dan önce çıkarılır) — eski istemci (yalnız
-- mutlak değer gönderen) bugünkü gibi çalışır, yeni istemci eski sunucuda da bugünkü davranışı alır; hiçbir sırada çift ekleme olmaz.
create or replace function public.fis_alt_artissiz(p_alt jsonb) returns jsonb
language sql immutable as $$
  select case
    when jsonb_typeof(p_alt) <> 'object' or jsonb_typeof(p_alt -> 'siparis_kalemleri' -> 'artis') <> 'array' then p_alt
    else jsonb_set(p_alt, '{siparis_kalemleri,satirlar}', coalesce((
      select jsonb_agg(case when x ->> 'id' in (select a ->> 'id' from jsonb_array_elements(p_alt -> 'siparis_kalemleri' -> 'artis') a)
                            then x - 'karsilanan' else x end)
      from jsonb_array_elements(public.stk_dizi(p_alt -> 'siparis_kalemleri' -> 'satirlar')) x), '[]'::jsonb))
  end
$$;

create or replace function public.fis_kalem_artis(p_alt jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  n int := 0;
begin
  if jsonb_typeof(p_alt) <> 'object' or jsonb_typeof(p_alt -> 'siparis_kalemleri' -> 'artis') <> 'array' then return 0; end if;
  update public.siparis_kalemleri k
     set karsilanan = greatest(0, coalesce(k.karsilanan, 0) + a.miktar)
    from (select x ->> 'id' as id, sum(public.stk_sayi(x ->> 'miktar')) as miktar
            from jsonb_array_elements(p_alt -> 'siparis_kalemleri' -> 'artis') x
           where coalesce(x ->> 'id', '') <> '' group by x ->> 'id') a
   where k.id::text = a.id and coalesce(a.miktar, 0) <> 0;
  get diagnostics n = row_count;
  return n;
end $$;

-- KARŞILANANIN TEK YAZARI SUNUCU (v1.742.3 — R1b, kontrol raporu 31 Ekim). Fiş sistemi açıkken (bütün v2 modülleri etkin) sipariş
-- kaleminin karşılananı yalnız fis_kes / fis_iptal içinde değişir (`fis.kalem` = 'acik'). Köprüden gelen kalem satırı (sipariş
-- düzenleme, planlama, uygulamanın karşılanan türetme efekti — canlıdaki ESKİ sürüm de çalıştırıyor) EKRANDAKİ eski değeri taşır;
-- yerel sınamada başka kullanıcının teslimini ezdi (10 → 5, düzenlemede 10 → 0). Satırın öteki alanları yazılır, karşılanan
-- ESKİ değerinde kalır (hata verilmez — düzenleme kaydı düşmesin). Yeni kalem (ekleme) serbest. Fiş sistemi kapalıyken dokunmaz.
create or replace function public.fis_kalem_karsilanan_koru() returns trigger
language plpgsql as $$
begin
  if new.karsilanan is distinct from old.karsilanan
     and coalesce(current_setting('fis.kalem', true), '') <> 'acik'
     and exists (select 1 from public.stk_ayar a where a.id = 'tekil' and a.aktif and a.cari_aktif and a.alt_aktif and a.kasa_aktif) then
    new.karsilanan := old.karsilanan;
  end if;
  return new;
end $$;

-- KARŞILANAN HESABI (v1.743.0, F1 — D1; F1.1: geçerli VE geçmiş bağ): kaleme bağlı GEÇERLİ hareketlerin (satır ve fişi iptal değil) toplamı; satışta çıkış
-- (−), alışta giriş (+); pozitif (013 siparisKarsilananlariHesapla ile aynı kural). Kalem / sipariş yoksa 0.
create or replace function public.fis_kalem_hesap(p_kalem text) returns numeric
language sql stable security definer set search_path = public as $$
  select trim_scale(round(greatest(0, case when coalesce((select s.tip from public.siparisler s join public.siparis_kalemleri k on k.siparis_id::text = s.id::text
                                                where k.id::text = p_kalem), '') = 'Alış' then t.toplam else -t.toplam end), 3))
    from (select coalesce(sum(x.miktar), 0) as toplam from (
            -- GEÇERLİ bağ
            select h.miktar from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id
             where h.kalem_id = p_kalem and not h.iptal and not f.iptal
            union all
            -- GEÇMİŞ bağ (F1.1): siparişi iptal edilmiş teslim kalemde kalır (karar A); hareket ya da fişi iptalse SAYILMAZ (kural 2).
            -- `kalem_id is null` kısıtla zaten doğru; açık yazıldı: bir satır iki bağdan birden sayılamaz.
            select h.miktar from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id
             where h.gecmis_kalem_id = p_kalem and h.kalem_id is null and not h.iptal and not f.iptal) x) t
$$;

-- Yükte geçen sipariş kalemleri: stok satırlarının `kalemId`si (bağlı fiş dahil) + alt.siparis_kalemleri satırları
create or replace function public.fis_kalem_idleri(p jsonb) returns text[]
language sql immutable as $$
  select coalesce(array_agg(distinct x order by x), '{}'::text[]) from (
    select s ->> 'kalemId' as x from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) s
    union all select s ->> 'kalemId' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) s
    union all select s ->> 'id' from jsonb_array_elements(public.stk_dizi(p -> 'alt' -> 'siparis_kalemleri' -> 'satirlar')) s
  ) y where coalesce(x, '') <> ''
$$;

-- Fiş işleminde kalem satırından karşılanan HER ZAMAN çıkar (tek yazar fis_kalem_karsilanan_yenile); `artis` yok sayılır.
create or replace function public.fis_alt_karsilanansiz(p_alt jsonb) returns jsonb
language sql immutable as $$
  select case
    -- coalesce ŞART: anahtar yoksa jsonb_typeof NULL döner, `<>` NULL olur ve case else'e düşüp (jsonb_set NULL) bütün alt'ı
    -- (üretim atamaları dahil) NULL yapardı — uctan-uca-fis 6 / 8 bunu yakaladı.
    when coalesce(jsonb_typeof(p_alt), '') <> 'object' or coalesce(jsonb_typeof(p_alt -> 'siparis_kalemleri'), '') <> 'object' then p_alt
    else jsonb_set(p_alt, '{siparis_kalemleri}', ((p_alt -> 'siparis_kalemleri') - 'artis') || jsonb_build_object('satirlar', coalesce((
      select jsonb_agg(x - 'karsilanan') from jsonb_array_elements(public.stk_dizi(p_alt -> 'siparis_kalemleri' -> 'satirlar')) x), '[]'::jsonb)))
  end
$$;

-- ÖN KİLİT (KİLİT SIRASI 3): kalemler KİMLİK SIRASIYLA kilitlenir; işlem öncesi fotoğraf döner:
-- { kalemId: { karsilanan, hesap (önceki geçerli hareketlerden), hareketVar (iptal edilmiş dahil herhangi bir hareket; F1.1: geçmiş bağ dahil) } }
-- YAZMA YAPMAZ (degisiklik.tekil'e dokunmaz) — ilk yazmadan önce çağrılır.
create or replace function public.fis_kalem_kilitle(p_idler text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  sonuc jsonb := '{}'::jsonb;
begin
  if coalesce(array_length(p_idler, 1), 0) = 0 then return sonuc; end if;
  -- KİLİT SIRASI 2 (F2): kalemlerin SİPARİŞ satırları önce, kimlik sırasıyla, FOR KEY SHARE. Sipariş silme (DELETE siparisler) önce
  -- sipariş satırını, sonra cascade ile kalemleri kilitler; fiş işlemi ise kalemi tutup alt_yaz'daki yabancı anahtar denetiminde
  -- sipariş satırını istiyordu — ters sıra (t-f2-kilit Q3: doğal ×100'de 28 kilitlenme). KEY SHARE, durum güncellemesiyle (REST
  -- başlık yazması, NO KEY UPDATE) çakışmaz; yalnız silmeyi sıraya koyar.
  perform 1 from public.siparisler s
   where s.id::text in (select k.siparis_id::text from public.siparis_kalemleri k where k.id::text = any(p_idler))
   order by s.id for key share;
  for r in select k.id::text as id, coalesce(k.karsilanan, 0) as karsilanan
             from public.siparis_kalemleri k where k.id::text = any(p_idler) order by k.id for update of k loop
    sonuc := sonuc || jsonb_build_object(r.id, jsonb_build_object('karsilanan', r.karsilanan, 'hesap', public.fis_kalem_hesap(r.id),
      'hareketVar', exists (select 1 from public.stk_hareket h where h.kalem_id = r.id or h.gecmis_kalem_id = r.id)));
  end loop;
  return sonuc;
end $$;

-- KARŞILANANIN TEK YAZARI (v1.743.0, F1): işlem yazmalarından SONRA, ön kilitli (ya da bu işlemde eklenen) kalemler için.
--  * Hareketi olan / karşılananı 0 olan kalem: karşılanan := hesap. Önceden fark varsa (önceki karşılanan ≠ önceki hesap) ve değer
--    değişiyorsa iz: `onceden_fark` (kullanıcı kararı 2).
--  * HAYALET (işlemden önce hiç hareketi yok, karşılanan > 0): SIFIRLANMAZ (karar 4) — bu işlemin değişimi eklenir
--    (önceki + (yeni hesap − önceki hesap)); iz: `hayalet_korundu`.
--  * İşlemden önce olmayan (bu işlemde eklenen) kalem: karşılanan := hesap, iz yok.
-- Yeni satır kilidi ALMAZ (KİLİT SIRASI): yalnız p_once'deki (kilitli) ya da bu işlemin eklediği kalemleri günceller.
-- Döner: { kalemler: [{id, karsilanan}], duzeltme: [{id, tur, onceki, hesap, yeni}] }
create or replace function public.fis_kalem_karsilanan_yenile(p_idler text[], p_once jsonb, p_islem text, p_fis text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  kid text;
  o jsonb;
  eski numeric;
  hesap_once numeric;
  hesap numeric;
  simdiki numeric;
  yeni numeric;
  tur text;
  kalemler jsonb := '[]'::jsonb;
  duzeltme jsonb := '[]'::jsonb;
  eposta text := lower(auth.jwt() ->> 'email');
begin
  perform set_config('fis.kalem', 'acik', true);
  foreach kid in array coalesce(p_idler, '{}'::text[]) loop
    select coalesce(k.karsilanan, 0) into simdiki from public.siparis_kalemleri k where k.id::text = kid;
    if not found then continue; end if;                     -- kalem yok (sahipsiz hareket) — denetim D2a raporlar
    hesap := public.fis_kalem_hesap(kid);
    o := p_once -> kid;
    tur := null;
    if o is null then
      yeni := hesap;                                         -- bu işlemde eklenen kalem
    else
      eski := (o ->> 'karsilanan')::numeric;
      hesap_once := (o ->> 'hesap')::numeric;
      if not (o ->> 'hareketVar')::boolean and eski > 0 then
        yeni := greatest(0, eski + (hesap - hesap_once));
        tur := 'hayalet_korundu';
      else
        yeni := hesap;
        if abs(eski - hesap_once) > 0.0005 then tur := 'onceden_fark'; end if;
      end if;
    end if;
    if yeni is distinct from simdiki then
      update public.siparis_kalemleri set karsilanan = yeni where id::text = kid;
    end if;
    if tur is not null and yeni is distinct from eski then
      insert into public.fis_karsilanan_iz (eposta, islem, fis_no, kalem_id, tur, onceki_karsilanan, onceki_hesap, yeni_karsilanan)
      values (eposta, p_islem, p_fis, kid, tur, eski, hesap_once, yeni);
      duzeltme := duzeltme || jsonb_build_array(jsonb_build_object('id', kid, 'tur', tur, 'onceki', eski, 'hesap', hesap_once, 'yeni', yeni));
    end if;
    kalemler := kalemler || jsonb_build_array(jsonb_build_object('id', kid, 'karsilanan', yeni));
  end loop;
  perform set_config('fis.kalem', '', true);
  return jsonb_build_object('kalemler', kalemler, 'duzeltme', duzeltme);
end $$;

-- Yanıt için okunan güncel değerler (kilitsiz; zatenVar / zatenIptal tekrarında)
create or replace function public.fis_kalem_durumlari(p_idler text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', k.id::text, 'karsilanan', coalesce(k.karsilanan, 0)) order by k.id::text), '[]'::jsonb)
    from public.siparis_kalemleri k where k.id::text = any(coalesce(p_idler, '{}'::text[]))
$$;

create or replace function public.fis_kes(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_istek text := nullif(btrim(coalesce(p ->> 'istek', '')), '');
  mevcut public.stk_fis;
  fid text;
  bid text;
  v_idler text[];
  v_once jsonb;
  v_kalem jsonb;
  v_eksik text;
begin
  if v_istek is null then
    raise exception 'İstek kimliği yok (yeniden gönderimde çift fiş olmasın diye zorunlu)' using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'fis') <> 'object' then
    raise exception 'Fiş bilgisi yok' using errcode = '22023';
  end if;
  -- KİLİT SIRASI 1 — AYNI İSTEK EŞZAMANLI (v1.742.2): ikincisi birincinin bitmesini bekler, sonra ilk numarayı alır.
  perform pg_advisory_xact_lock(hashtext('fis_kes:' || v_istek));
  v_idler := public.fis_kalem_idleri(p);
  select * into mevcut from public.stk_fis f where f.istek = v_istek;
  if found then
    return jsonb_build_object('fisNo', mevcut.id, 'bagliFisNo', mevcut.bagli_fis, 'zatenVar', true,
      'kalemler', public.fis_kalem_durumlari(v_idler), 'karsilananDuzeltme', '[]'::jsonb);
  end if;
  -- KİLİT SIRASI 3 — kalemler kimlik sırasıyla, İLK YAZMADAN ÖNCE (v1.743.0, F1)
  v_once := public.fis_kalem_kilitle(v_idler);
  -- F2: stok satırının kalemi var olmalı (aynı yükte yeni yazılan kalem hariç — yabancı anahtar işlem sonunda denetler) → KR005
  select string_agg(distinct x, ', ') into v_eksik from (
    select s ->> 'kalemId' as x from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) s
    union all select s ->> 'kalemId' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) s) y
   where coalesce(x, '') <> '' and not (v_once ? x)
     and not exists (select 1 from jsonb_array_elements(public.stk_dizi(p -> 'alt' -> 'siparis_kalemleri' -> 'satirlar')) a where a ->> 'id' = x);
  if v_eksik is not null then
    raise exception 'Var olmayan sipariş kalemine teslim yazılamaz (kalem %) — sipariş silinmiş ya da değişmiş olabilir; siparişi yenileyip yeniden deneyin', v_eksik
      using errcode = 'KR005';
  end if;
  -- F2: kaleme bağlı stok satırının ÜRÜNÜ ve RENGİ kalemle aynı olmalı (harf / boşluk duyarsız) → KR003. Uygulama satırı kalemden
  -- kurar (081); fark yalnız bayat ekranda olur: başka cihaz teslimsiz kalemin rengini değiştirmiş, bu cihaz eski renkle teslim
  -- ediyor (t-f2-kilit Q4: hareket Siyah, kalem Taba). BEDEN karşılaştırılmaz: stok fişi (255) kalemi bedensiz tutup satırı
  -- beden beden yazabiliyor — açık risk (VERI-TUTARLILIGI-F2.md).
  select string_agg(distinct x.kalem || ' (' || coalesce(x.urun, '') || ' ' || coalesce(x.renk, '') || ' ≠ kalem ' || coalesce(k.urun_id::text, '') || ' ' || coalesce(k.renk, '') || ')', ', ')
    into v_eksik
    from (select s ->> 'kalemId' as kalem, s ->> 'urunId' as urun, s ->> 'renk' as renk from jsonb_array_elements(public.stk_dizi(p -> 'stok' -> 'satirlar')) s
          union all select s ->> 'kalemId', s ->> 'urunId', s ->> 'renk' from jsonb_array_elements(public.stk_dizi(p -> 'bagli' -> 'stok' -> 'satirlar')) s) x
    join public.siparis_kalemleri k on k.id::text = x.kalem
   where (x.urun is not null and k.urun_id is not null and x.urun <> k.urun_id::text)
      or (x.renk is not null and k.renk is not null and lower(btrim(x.renk)) <> lower(btrim(k.renk)));
  if v_eksik is not null then
    raise exception 'Teslim edilen ürün / renk sipariş kalemiyle uyuşmuyor: % — sipariş başka cihazda değişmiş olabilir; yenileyip yeniden deneyin', v_eksik
      using errcode = 'KR003';
  end if;

  fid := public.fis_tek_kes(p -> 'fis', p -> 'stok', p -> 'cari', p -> 'kasa', v_istek);
  if jsonb_typeof(p -> 'bagli') = 'object' then
    bid := public.fis_tek_kes(p -> 'bagli' -> 'fis', p -> 'bagli' -> 'stok', p -> 'bagli' -> 'cari', p -> 'bagli' -> 'kasa', v_istek || ':bagli', fid);
    update public.stk_fis set bagli_fis = bid where id = fid;
    update public.stk_fis set bagli_fis = fid where id = bid;
  end if;
  if jsonb_typeof(p -> 'alt') = 'object' then
    -- Kalem satırının öteki alanları (planlama, rezervasyon…) yazılır; karşılanan ÇIKAR (v1.743.0: tek yazar aşağıda), artis yok sayılır.
    perform set_config('fis.kalem', 'acik', true);
    perform public.alt_yaz(public.fis_alt_karsilanansiz(p -> 'alt'));
    perform set_config('fis.kalem', '', true);
  end if;
  v_kalem := public.fis_kalem_karsilanan_yenile(v_idler, v_once, 'fis_kes', fid);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', fid, 'bagliFisNo', bid, 'zatenVar', false,
    'kalemler', v_kalem -> 'kalemler', 'karsilananDuzeltme', v_kalem -> 'duzeltme');
end $$;

-- FİŞ İPTAL — fiş ve bütün satırları (bağlı makbuzla birlikte) iptal; silme yok. Tekrar çağrı zararsız.
--  p = { no, sebep, alt } — `alt`: geri alınan sipariş karşılananı / üretim ataması, aynı işlemde.
create or replace function public.fis_iptal(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  no text := nullif(btrim(coalesce(p ->> 'no', '')), '');
  eposta text := lower(auth.jwt() ->> 'email');
  f public.stk_fis;
  hedefler text[];
  h text;
  n int := 0;
  v_idler text[];
  v_once jsonb;
  v_kalem jsonb;
  v_bagli text;
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'silme');
  -- KİLİT SIRASI 2 — fişin (ve bağlı fişin) hareketlerindeki + alt satırlarındaki kalemler, kimlik sırasıyla, FİŞ SATIRINDAN ve
  -- İLK YAZMADAN ÖNCE (v1.743.0, F1). Kimlikler kilitsiz okunur: fis_bag_coz geçerli bağı geçmişe taşırken iki sütundan biri dolu
  -- kalır (coalesce) — eşzamanlı sipariş iptalinin önünde ya da arkasında aynı kalem bulunur; bağlı fiş başlıktan okunur.
  select coalesce(array_agg(distinct x order by x), '{}'::text[]) into v_idler from (
    -- F1.1: geçmiş bağ da (sipariş iptalinden sonra iptal edilen fişin kalemi — S1; uygulama o anda alt göndermez)
    select coalesce(hh.kalem_id, hh.gecmis_kalem_id) as x from public.stk_hareket hh
     where hh.fis_id in (select ff.id from public.stk_fis ff where ff.id = no union select ff.bagli_fis from public.stk_fis ff where ff.id = no)
       and coalesce(hh.kalem_id, hh.gecmis_kalem_id) is not null
    union all select unnest(public.fis_kalem_idleri(jsonb_build_object('alt', p -> 'alt')))) y;
  v_once := public.fis_kalem_kilitle(v_idler);
  -- KİLİT SIRASI 3 — iptal edilen fiş VE bağlı fişi, KİMLİK SIRASIYLA, ilk yazmadan önce (F1.1). Önceden yalnız X kilitlenip bağlı
  -- fiş yazma sırasında kilitleniyordu: aynı anda ana fişi ve makbuzu iptal eden iki cihaz ters sırayla kilitleniyordu
  -- (t-f11-kilit P6b: siparişsiz peşin satışta kalem kilidi ikisini sıralamıyor). Bağlı fiş kimliği kesilirken yazılır, değişmez.
  select ff.bagli_fis into v_bagli from public.stk_fis ff where ff.id = no;
  perform 1 from public.stk_fis ff where ff.id = no or ff.id = v_bagli order by ff.id for update;
  select * into f from public.stk_fis where id = no;
  if not found then
    raise exception 'Fiş bulunamadı: %', coalesce(no, '(yok)') using errcode = 'P0002';
  end if;
  hedefler := array[f.id] || case when f.bagli_fis is not null then array[f.bagli_fis] else '{}'::text[] end;

  perform set_config('fis.kapi', 'acik', true);
  foreach h in array hedefler loop
    update public.stk_fis set iptal = true, iptal_zamani = now(), iptal_eden = eposta, iptal_sebebi = p ->> 'sebep'
     where id = h and not iptal;
    get diagnostics n = row_count;
    update public.stk_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta where fis_id = h and not iptal;
    update public.car_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
    update public.kas_hareket set iptal = true, iptal_zamani = now(), iptal_eden = eposta, guncelleme = now() where fis_id = h and not iptal;
  end loop;
  -- Kalem satırının öteki alanları yazılır; karşılanan ÇIKAR, artis yok sayılır (v1.743.0): değer hareketlerden hesaplanır —
  -- zaten iptal edilmiş fişe gelen tekrar (yanıtı kaybolmuş istek, eski istemcinin mutlak değeri) karşılananı DEĞİŞTİREMEZ.
  if jsonb_typeof(p -> 'alt') = 'object' then
    perform set_config('fis.kalem', 'acik', true);
    perform public.alt_yaz(public.fis_alt_karsilanansiz(p -> 'alt'));
    perform set_config('fis.kalem', '', true);
  end if;
  v_kalem := public.fis_kalem_karsilanan_yenile(v_idler, v_once, 'fis_iptal', f.id);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', f.id, 'bagliFisNo', f.bagli_fis, 'zatenIptal', f.iptal,
    'kalemler', v_kalem -> 'kalemler', 'karsilananDuzeltme', v_kalem -> 'duzeltme');
end $$;

-- FİŞ BİLGİSİ — kesilmiş fişe yalnız açıklama ve ek bilgi (irsaliye no gibi); tutar ve satırlar değişmez.
create or replace function public.fis_bilgi(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  no text := nullif(btrim(coalesce(p ->> 'no', '')), '');
begin
  perform public.stk_yetki(array['stok', 'fisler', 'siparis', 'uretim', 'cari', 'muhasebe'], 'kaydetme');
  if not exists (select 1 from public.stk_fis where id = no) then
    raise exception 'Fiş bulunamadı: %', coalesce(no, '(yok)') using errcode = 'P0002';
  end if;
  perform set_config('fis.kapi', 'acik', true);
  update public.stk_fis
     set aciklama = case when p ? 'aciklama' then p ->> 'aciklama' else aciklama end,
         ek = ek || case when jsonb_typeof(p -> 'ek') = 'object' then p -> 'ek' else '{}'::jsonb end
   where id = no;
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('fisNo', no);
end $$;

-- SİPARİŞ BAĞINI ÇÖZ (v1.742.0, kullanıcı kararı 31 Ekim: "Yalnız bağ alanları sunucuda"). Sipariş iptalinde (087 siparisKapat,
-- 088 siparisBaglariniCoz) fişler silinmez, bağımsız kalır: satırın sipariş bağı çözülür — miktar / tutar / ürün DEĞİŞMEZ. Satır
-- eşleşmesi uygulamayla aynı (088 siparisHareketiMi): kimlikli satırda kimlik, kimliksiz eskide numara. Değerleri istemci
-- VERMEZ, sunucu hesaplar ("(iptal)" eki, düşen anahtarlar) — bu işlemle başka alan değiştirilemez. Fiş başlığına not düşer.
-- F1.1 (2 Kasım): geçerli bağ geçmiş sütunlara taşınır (bir kez); kalem ve fiş satırları önden, kimlik sırasıyla kilitlenir;
-- tekrar çağrı güvenli (izi ve fiş notunun zamanını değiştirmez). Dönüş: { stok, cari, zincir, kalemler: [{id, karsilanan}] }.
-- p = { siparisId, siparisNo }
create or replace function public.fis_bag_coz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  sid text := nullif(btrim(coalesce(p ->> 'siparisId', '')), '');
  sno text := nullif(btrim(coalesce(p ->> 'siparisNo', '')), '');
  ino text;
  n_stok int := 0;
  n_cari int := 0;
  n_zincir int := 0;
  n int;
  v_idler text[];
begin
  perform public.stk_yetki(array['siparis', 'stok', 'cari'], 'kaydetme');
  if sid is null then raise exception 'Sipariş kimliği yok' using errcode = '22023'; end if;
  ino := case when sno is null then null else sno || ' (iptal)' end;
  -- KİLİT SIRASI 2 (F1.1) — siparişin kalemleri ve bağlı hareketlerin kalemleri, kimlik sırasıyla, İLK YAZMADAN ÖNCE. Önceden hiç
  -- kalem kilidi yoktu ve hareketler yazıldıktan ('tekil' alındıktan) SONRA fiş başlığı güncelleniyordu: aynı siparişin fiş
  -- iptaliyle (kalem → fiş → hareket) ters sıra — %30–70 kilitlenme (1 Kasım matrisi, t-f11-kilit P1). Yazma yapmaz.
  select coalesce(array_agg(distinct x order by x), '{}'::text[]) into v_idler from (
    select k.id::text as x from public.siparis_kalemleri k where k.siparis_id::text = sid
    union all select h.kalem_id from public.stk_hareket h
     where h.kalem_id is not null and (h.siparis_id = sid or (h.siparis_id is null and sno is not null and h.siparis_no = sno))) y;
  perform public.fis_kalem_kilitle(v_idler);
  -- KİLİT SIRASI 3 (F1.1) — bu işlemin dokunacağı BÜTÜN fiş başlıkları (başlıktan ve bağı çözülecek stok / cari satırlarından),
  -- kimlik sırasıyla. fis_iptal de kalem → fiş (kimlik sırasıyla) → yazma sırasını izler.
  perform 1 from public.stk_fis ff where ff.id in (
      select f.id from public.stk_fis f where f.siparis_id = sid or (f.siparis_id is null and sno is not null and f.siparis_no = sno)
      union select h.fis_id from public.stk_hareket h
       where h.siparis_id = sid or (h.siparis_id is null and sno is not null and h.siparis_no = sno) or h.rezervasyon_siparis_id = sid
      union select c.fis_id from public.car_hareket c
       where c.fis_id is not null and not c.iptal
         and ((c.ek ->> 'siparisId') = sid or ((c.ek ->> 'siparisId') is null and sno is not null and c.siparis_no = sno)
              or (c.ek ->> 'rezervasyonSiparisId') = sid))
    order by ff.id for update;

  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.duzen', 'bag', true);
  -- GEÇERLİ bağ → GEÇMİŞ bağ (F1.1, kural 1): eski sipariş / kalem kimliği AYRI sütunlara, BİR KEZ (çözülmüş satır eşleşmez:
  -- kimliği boş, numarası "(iptal)" ekli — tekrar çağrı izi bozmaz, kural 3). İptal edilmiş satır DAHİL (geçerli bağ hiçbir
  -- satırda kalmaz); iptal satır karşılanana yine girmez (fis_kalem_hesap, kural 2). Karşılanan DEĞİŞMEZ: aynı hareketler bu kez
  -- geçmiş bağdan sayılır (karar A: teslim geçmişi kalemde kalır).
  update public.stk_hareket
     set gecmis_siparis_id = siparis_id, gecmis_kalem_id = kalem_id, bag_cozum_zamani = now(),
         siparis_id = null, kalem_id = null, siparis_no = ino
   where bag_cozum_zamani is null and (siparis_id = sid or (siparis_id is null and sno is not null and siparis_no = sno));
  get diagnostics n_stok = row_count;
  update public.stk_hareket set rezervasyon_siparis_id = null where not iptal and rezervasyon_siparis_id = sid;
  get diagnostics n_zincir = row_count;
  update public.car_hareket set siparis_no = ino, ek = ek - 'siparisId' - 'kalemId', guncelleme = now()
   where not iptal and ((ek ->> 'siparisId') = sid or ((ek ->> 'siparisId') is null and sno is not null and siparis_no = sno));
  get diagnostics n_cari = row_count;
  update public.car_hareket set ek = ek - 'rezervasyonSiparisId', guncelleme = now()
   where not iptal and (ek ->> 'rezervasyonSiparisId') = sid;
  get diagnostics n = row_count; n_zincir := n_zincir + n;
  update public.stk_fis set ek = ek || jsonb_build_object('siparisIptal', jsonb_build_object('no', sno, 'zaman', now()))
   where (siparis_id = sid or (siparis_id is null and sno is not null and siparis_no = sno)) and not (coalesce(ek, '{}'::jsonb) ? 'siparisIptal');
  perform set_config('fis.duzen', '', true);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('stok', n_stok, 'cari', n_cari, 'zincir', n_zincir, 'kalemler', public.fis_kalem_durumlari(v_idler));
end $$;

-- RENK TAŞI (v1.742.0, kullanıcı kararı 31 Ekim: "Varyant düzeyinde"). Tanımlar › Bakım › Kodsuz Mamul Renkleri ("Siyah" →
-- "1003 - Siyah"): satırın rengi tek tek değişmez — VARYANTIN rengi değişir, hareketler aynı varyanta bağlı kalır (stok, geçmiş,
-- fişler aynen). Hedef varyant zaten varsa (aynı ürün, yeni renk, aynı ölçü) hareketler ona taşınır ve eski varyant kalkar
-- (stk_serbest_birlestir ile aynı yol). Yeni renk Tanımlar'a henüz varmadıysa serbest renk açılır, Tanımlar gelince birleşir.
-- p = { eslesmeler: [{ urunId, eski, yeni }] }
create or replace function public.stk_renk_tasi(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  v record;
  hedef_renk text;
  hedef_v text;
  n_varyant int := 0;
  n_tasinan int := 0;
  n int;
begin
  perform public.stk_yetki(array['stok', 'tanimlar'], 'kaydetme');
  perform set_config('fis.kapi', 'acik', true);
  perform set_config('fis.duzen', 'varyant', true);
  for e in select * from jsonb_array_elements(public.stk_dizi(p -> 'eslesmeler')) loop
    continue when coalesce(e ->> 'urunId', '') = '' or coalesce(e ->> 'yeni', '') = ''
                  or public.stk_nrm(e ->> 'eski') = public.stk_nrm(e ->> 'yeni');
    hedef_renk := public.stk_renk_coz(null, e ->> 'yeni');
    for v in select sv.* from public.stk_varyant sv join public.stk_renk r on r.id = sv.renk_id
              where sv.urun_id = e ->> 'urunId' and public.stk_nrm(r.ad) = public.stk_nrm(e ->> 'eski') and sv.renk_id <> hedef_renk loop
      select id into hedef_v from public.stk_varyant
       where urun_id = v.urun_id and renk_id = hedef_renk and coalesce(olcu_id, '') = coalesce(v.olcu_id, '');
      if hedef_v is null then
        update public.stk_varyant set renk_id = hedef_renk where id = v.id;
      else
        update public.stk_hareket set varyant_id = hedef_v where varyant_id = v.id;
        get diagnostics n = row_count; n_tasinan := n_tasinan + n;
        update public.stk_varyant set min_stok = greatest(min_stok, v.min_stok), aktif = aktif or v.aktif where id = hedef_v;
        delete from public.stk_varyant where id = v.id;
      end if;
      n_varyant := n_varyant + 1;
    end loop;
  end loop;
  perform set_config('fis.duzen', '', true);
  perform set_config('fis.kapi', '', true);
  return jsonb_build_object('varyant', n_varyant, 'tasinanHareket', n_tasinan);
end $$;


-- ALT SATIR YAZMASI, KİLİT SIRALI (F2, 2 Kasım) — alt-v2.sql'deki alt_yaz'ın YERİNE geçer (bu dosya her zaman alt-v2.sql'den sonra
-- kurulur; canlıya F2 yalnız editor/18 ile gider). Gövde alt-v2.sql ile aynı, başına ön kilit geçişi eklendi. alt-v2.sql yeniden
-- çalıştırılırsa ön kilit kaybolur — bu dosya da yeniden çalıştırılmalı (geri-donus-1.742.1.sql alt-v2.sql metnine döner).
create or replace function public.alt_yaz(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t text;
  d jsonb;
  satirlar jsonb;
  sutunlar text;
  atamalar text;
  silinecek text[];
  n_yaz int;
  n_sil int;
  sonuc jsonb := '{}'::jsonb;
begin
  -- ÖN KİLİT (F2, KİLİT SIRASI 2–3): bütün tablolar için, İLK YAZMADAN ÖNCE — üst satırlar (sipariş / üretim) KEY SHARE, sonra
  -- yazılacak ve silinecek alt satırlar FOR UPDATE, kimlik sırasıyla. Önceden upsert deyimi 'tekil'i aldıktan SONRA silme deyimi
  -- silinecek kalemi bekliyordu (t-f2-kilit A: TERS SIRA; birleştirme ∥ teslim kilitleniyordu). Tablolar sabit sırayla.
  foreach t in array array['siparis_kalemleri', 'uretim_atamalari'] loop
    d := case when jsonb_typeof(p) = 'object' then p -> t end;
    continue when jsonb_typeof(d) <> 'object';
    satirlar := public.stk_dizi(d -> 'satirlar');
    if t = 'siparis_kalemleri' then
      perform 1 from public.siparisler s where s.id::text in (
          select x ->> 'siparis_id' from jsonb_array_elements(satirlar) x
          union select k.siparis_id::text from public.siparis_kalemleri k
           where k.id::text in (select x ->> 'id' from jsonb_array_elements(satirlar) x union select jsonb_array_elements_text(public.stk_dizi(d -> 'sil'))))
        order by s.id for key share;
      perform 1 from public.siparis_kalemleri k
       where k.id::text in (select x ->> 'id' from jsonb_array_elements(satirlar) x union select jsonb_array_elements_text(public.stk_dizi(d -> 'sil')))
       order by k.id for update;
    else
      perform 1 from public.uretim u where u.id::text in (
          select x ->> 'uretim_id' from jsonb_array_elements(satirlar) x
          union select a.uretim_id::text from public.uretim_atamalari a
           where a.id::text in (select x ->> 'id' from jsonb_array_elements(satirlar) x union select jsonb_array_elements_text(public.stk_dizi(d -> 'sil'))))
        order by u.id for key share;
      perform 1 from public.uretim_atamalari a
       where a.id::text in (select x ->> 'id' from jsonb_array_elements(satirlar) x union select jsonb_array_elements_text(public.stk_dizi(d -> 'sil')))
       order by a.id for update;
    end if;
  end loop;
  for t, d in select key, value from jsonb_each(case when jsonb_typeof(p) = 'object' then p else '{}'::jsonb end) loop
    if t not in ('siparis_kalemleri', 'uretim_atamalari') then
      raise exception 'Bu tablo alt_yaz ile yazılamaz: %', t using errcode = '42501';
    end if;
    perform public.stk_yetki(array[case t when 'siparis_kalemleri' then 'siparis' else 'uretim' end, 'fisler', 'stok', 'cari'], 'kaydetme');
    satirlar := public.stk_dizi(d -> 'satirlar');
    n_yaz := 0;
    n_sil := 0;
    if jsonb_array_length(satirlar) > 0 then
      if exists (select 1 from jsonb_array_elements(satirlar) x where coalesce(x ->> 'id', '') = '') then
        raise exception '% satırında kimlik yok', t using errcode = '22023';
      end if;
      select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position),
             string_agg(case when c.column_name <> 'id' then quote_ident(c.column_name) || ' = excluded.' || quote_ident(c.column_name) end, ', ')
        into sutunlar, atamalar
      from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = t
        and c.column_name in (select distinct jsonb_object_keys(x) from jsonb_array_elements(satirlar) x where jsonb_typeof(x) = 'object');
      execute format(
        'insert into public.%I as h (%s) select %s from (select distinct on (r.id) r.* from jsonb_array_elements(%L::jsonb) with ordinality as e(x, n), '
        || 'jsonb_populate_record(null::public.%I, e.x) r order by r.id, e.n desc) s '
        || 'on conflict (id) do ' || case when atamalar is null then 'nothing' else 'update set ' || atamalar end,
        t, sutunlar, sutunlar, satirlar::text, t);
      get diagnostics n_yaz = row_count;
    end if;
    silinecek := array(select jsonb_array_elements_text(public.stk_dizi(d -> 'sil')));
    if array_length(silinecek, 1) > 0 then
      execute format('delete from public.%I where id::text = any(%L::text[])', t, silinecek);
      get diagnostics n_sil = row_count;
    end if;
    sonuc := sonuc || jsonb_build_object(t, jsonb_build_object('yazilan', n_yaz, 'silinen', n_sil));
  end loop;
  return sonuc;
end $$;

-- 6) FİŞ DEFTERİ OKUMASI — her fiş bir satır, eski defter kaydı biçiminde (uygulama ekranları bu biçimi okuyor).
create or replace view public.fis_listesi with (security_invoker = true) as
select f.id, f.olusturma, f.iptal,
  jsonb_build_object(
    'id', f.id, 'fisNo', f.id, 'aile', f.aile, 'tip', f.tur, 'kaynak', f.kaynak, 'onek', f.onek,
    'cariId', f.cari_id, 'siparisId', f.siparis_id, 'siparisNo', f.siparis_no, 'uretimId', f.uretim_id,
    'zaman', f.olusturma, 'tarih', f.tarih, 'defter', f.defter, 'kullanici', f.kullanici, 'olusturan', f.olusturan,
    'kasaHesapId', f.kasa_hesap_id, 'paraBirimi', f.para_birimi, 'kur', f.kur, 'tutar', f.tutar, 'kdv', f.kdv,
    'aciklama', f.aciklama, 'ek', f.ek, 'kalemler', f.kalemler, 'bagliFis', f.bagli_fis,
    'iptal', f.iptal, 'iptalZamani', f.iptal_zamani, 'iptalEden', f.iptal_eden, 'iptalSebebi', f.iptal_sebebi,
    'stokHareketleri', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'urunId', h.urun_id, 'varyantId', h.varyant_id,
        'renk', coalesce(r.ad, 'Standart'), 'beden', coalesce(o.ad, 'Standart'),
        'miktar', h.miktar, 'kaynak', h.kaynak, 'tarih', h.tarih, 'siparisId', h.siparis_id, 'kalemId', h.kalem_id,
        'cariId', h.cari_id, 'uretimId', h.uretim_id, 'iptal', h.iptal, 'ek', h.ek) order by h.id)
      from public.stk_hareket h
      join public.stk_varyant v on v.id = h.varyant_id
      left join public.stk_renk r on r.id = v.renk_id
      left join public.stk_olcu o on o.id = v.olcu_id
      where h.fis_id = f.id), '[]'::jsonb),
    'cariHareketleri', coalesce((select jsonb_agg(to_jsonb(c) - 'olusturan' - 'goc' order by c.id)
      from public.car_hareket c where c.fis_id = f.id), '[]'::jsonb),
    'kasaHareketleri', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'hesapId', k.hesap_id, 'iptal', k.iptal) || k.veri order by k.id)
      from public.kas_hareket k where k.fis_id = f.id), '[]'::jsonb)
  ) as veri
from public.stk_fis f;

-- 7) KURULUM (geçici işlev: Editor do-bloğunu bölüyor)
create or replace function public.fis_kurulum_tamamla() returns text
language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  -- Tetikleyiciler
  drop trigger if exists fis_satir_koru on public.stk_hareket;
  create trigger fis_satir_koru before insert or update or delete on public.stk_hareket for each row execute function public.fis_satir_koru();
  drop trigger if exists fis_satir_koru on public.car_hareket;
  create trigger fis_satir_koru before insert or update or delete on public.car_hareket for each row execute function public.fis_satir_koru();
  drop trigger if exists fis_satir_koru on public.kas_hareket;
  create trigger fis_satir_koru before insert or update or delete on public.kas_hareket for each row execute function public.fis_satir_koru();
  -- Geçmiş bağ (F1.1): koruma tetikleyicisi + aynı satırda iki bağ birden olmaz kısıtı (tekrar kurulumda zararsız)
  drop trigger if exists fis_bag_iz_koru on public.stk_hareket;
  create trigger fis_bag_iz_koru before insert or update on public.stk_hareket for each row execute function public.fis_bag_iz_koru();
  if not exists (select 1 from pg_constraint where conname = 'stk_hareket_tek_bag' and conrelid = 'public.stk_hareket'::regclass) then
    alter table public.stk_hareket add constraint stk_hareket_tek_bag check (gecmis_kalem_id is null or kalem_id is null);
  end if;
  -- Teslim geçmişi koruması (F2): kalem silme / kimlik / miktar ve sipariş silme
  drop trigger if exists fis_kalem_teslim_koru on public.siparis_kalemleri;
  create trigger fis_kalem_teslim_koru before update or delete on public.siparis_kalemleri for each row execute function public.fis_kalem_teslim_koru();
  drop trigger if exists fis_siparis_teslim_koru on public.siparisler;
  create trigger fis_siparis_teslim_koru before delete on public.siparisler for each row execute function public.fis_siparis_teslim_koru();
  drop trigger if exists fis_baslik_koru on public.stk_fis;
  create trigger fis_baslik_koru before insert or update or delete on public.stk_fis for each row execute function public.fis_baslik_koru();
  drop trigger if exists fis_kalem_karsilanan_koru on public.siparis_kalemleri;
  create trigger fis_kalem_karsilanan_koru before update on public.siparis_kalemleri for each row execute function public.fis_kalem_karsilanan_koru();
  drop trigger if exists fis_satirsiz_denetle on public.stk_fis;
  create constraint trigger fis_satirsiz_denetle after insert on public.stk_fis deferrable initially deferred
    for each row execute function public.fis_satirsiz_denetle();
  -- Fişsiz cari / kasa satırı: kurallar açıkken tetikleyici reddediyor; kural açılmadan yazılmış eski satırlar (fis_id boş)
  -- denetimde görünür (gece denetimi).

  -- Yetki: sayaç ve numara yalnız işlemlerden
  alter table public.fis_sayac enable row level security;
  revoke all on public.fis_sayac from anon, authenticated;
  revoke all on function public.fis_no_al(text) from public, anon, authenticated;
  revoke all on function public.fis_tek_kes(jsonb, jsonb, jsonb, jsonb, text, text) from public, anon, authenticated;
  revoke all on function public.fis_kalem_artis(jsonb) from public, anon, authenticated;
  revoke all on function public.fis_alt_artissiz(jsonb) from public, anon, authenticated;
  -- Karşılanan izi ve iç işlevler (v1.743.0, F1): yalnız sunucu işlemleri yazar; gece denetimi (security definer) okur
  alter table public.fis_karsilanan_iz enable row level security;
  revoke all on public.fis_karsilanan_iz from anon, authenticated;
  revoke all on sequence public.fis_karsilanan_iz_id_seq from anon, authenticated;
  revoke all on function public.fis_kalem_kilitle(text[]) from public, anon, authenticated;
  revoke all on function public.fis_kalem_karsilanan_yenile(text[], jsonb, text, text) from public, anon, authenticated;
  revoke all on function public.fis_kalem_hesap(text) from public, anon, authenticated;
  revoke all on function public.fis_kalem_hareket_var(text) from public, anon, authenticated;
  revoke all on function public.fis_kalem_durumlari(text[]) from public, anon, authenticated;
  foreach t in array array['fis_kes(jsonb)', 'fis_iptal(jsonb)', 'fis_bilgi(jsonb)', 'fis_bag_coz(jsonb)', 'stk_renk_tasi(jsonb)'] loop
    execute 'revoke all on function public.' || t || ' from public, anon';
    execute 'grant execute on function public.' || t || ' to authenticated';
  end loop;
  revoke all on public.fis_listesi from anon, authenticated;
  grant select on public.fis_listesi to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.fis_listesi to service_role;
  end if;
  return 'fiş defteri kuruldu (kurallar KAPALI — bütün işlemler fiş defterine taşınana kadar AÇMAYIN; açma adımı ayrıca verilecek)';
end $$;
select public.fis_kurulum_tamamla();
drop function public.fis_kurulum_tamamla();

-- KURALLARI AÇ / KAPAT (yalnız SQL Editor'den)
create or replace function public.fis_kural_ac() returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Yalnız Supabase SQL Editor''den' using errcode = '42501';
  end if;
  update public.stk_ayar set fis_aktif = true, fis_aktif_zamani = now() where id = 'tekil';
  return 'fiş defteri kuralları AÇIK: hareket yalnız fiş kesilerek yazılır';
end $$;
create or replace function public.fis_kural_kapat() returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.jwt() is not null then
    raise exception 'Yalnız Supabase SQL Editor''den' using errcode = '42501';
  end if;
  update public.stk_ayar set fis_aktif = false where id = 'tekil';
  return 'fiş defteri kuralları KAPALI';
end $$;
revoke all on function public.fis_kural_ac() from public, anon, authenticated;
revoke all on function public.fis_kural_kapat() from public, anon, authenticated;

commit;
