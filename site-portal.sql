-- MÜŞTERİ PORTALI — newdiamond.com.tr koleksiyonu müşteriye özel kodla (v1.646.0).
--
-- Kullanıcı: "Site için üyelik sistemi yapabilir miyiz? Herkes koleksiyonumuzu görmesin." · "Müşteri sipariş de
-- verebilsin, ona özel fiyatlar ve modeller listelensin." Kararlar (soru-cevap): müşteriye özel kod; model = sitede
-- işaretli VE müşterinin fiyatı olan; sipariş ERP'ye TALEP olarak düşer, onayla siparişe çevrilir; asorti ya da beden
-- beden giriş.
--
-- NEDEN SUPABASE ÜYELİĞİ (auth) DEĞİL: rls-kimlik.sql giriş yapmış HER hesaba her tabloda tam yetki veriyor. Siteden
-- kaydolan müşteri ERP'nin bütün verisini okuyabilirdi. Kod yolu hiçbir hesap açmaz: site anonim kalır ve yalnız
-- aşağıdaki fonksiyonları çağırabilir; tablolar anonim role kapalı kalır.
--
-- GİRİŞ (v1.649.0): kullanıcı adı + şifre → oturum anahtarı (§2, §10). v1.646'daki cari `siteKodu` artık kullanılmıyor.
--
-- Çalıştırma: Supabase › SQL Editor › yapıştır › Run. Tekrar çalıştırmak zararsız. vitrin.sql'in YERİNE geçer:
-- kodsuz eski `vitrin()` kaldırılır (koleksiyon artık kodsuz görünmez).

-- ---------- 1) Siteden gelen sipariş talepleri ----------
create table if not exists public.site_talepleri (
  id text primary key default gen_random_uuid()::text,
  cari_id text not null,
  cari_unvan text,
  olusturma timestamptz not null default now(),
  durum text not null default 'yeni',          -- 'yeni' | 'reddedildi' (siparişe çevrilen, siparişin siteTalepId'sinden bilinir)
  not_metni text,
  kalemler jsonb not null default '[]'::jsonb, -- [{urunId, urunAd, renk, beden, miktar, birimFiyat, paraBirimi}]
  toplam_cift integer not null default 0
);
-- v1.652.0: müşterinin seçtiği ödeme şekli {tip, vadeGun} (ERP fiyat/indirim belirlerken görür).
alter table public.site_talepleri add column if not exists odeme jsonb;
alter table public.site_talepleri enable row level security;
drop policy if exists "giris_yapmis_hersey" on public.site_talepleri;
create policy "giris_yapmis_hersey" on public.site_talepleri for all to authenticated using (true) with check (true);
revoke all on public.site_talepleri from anon;

-- ---------- 2) Müşteri hesabı: kullanıcı adı + şifre → oturum → cari (v1.649.0) ----------
-- Kullanıcı: "Müşteri giriş yaparken kullanıcı adı ve şifre ile girsin." (v1.646'daki tek kod yerine.)
-- Hesaplar ERP'nin cari kaydında DEĞİL, ayrı tabloda: cari `ek`i ERP her kayıtta baştan yazıyor, şifre özeti orada
-- ezilirdi. Şifre düz tutulmaz: pgcrypto bcrypt (`crypt`/`gen_salt('bf')`). Giriş başarılıysa 30 günlük rastgele
-- OTURUM ANAHTARI döner; site onu saklar ve bütün çağrılara (portal, portal_siparis, portal_hesap) `p_kod` diye geçer —
-- fonksiyonların imzası değişmedi. 5 hatalı denemede hesap 15 dk kilitlenir.
-- İki tablo da anonim role KAPALI; ERP (authenticated) yalnız aşağıdaki fonksiyonlarla dokunur — şifre özeti hiçbir
-- yoldan okunmaz.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.site_hesaplari (
  cari_id text primary key,
  kullanici text not null unique,           -- küçük harf
  sifre_ozeti text not null,
  olusturma timestamptz not null default now(),
  son_giris timestamptz,
  hatali_deneme integer not null default 0,
  kilit_bitis timestamptz
);
alter table public.site_hesaplari enable row level security;
revoke all on public.site_hesaplari from anon, authenticated;

create table if not exists public.site_oturumlari (
  anahtar text primary key,
  cari_id text not null,
  bitis timestamptz not null
);
alter table public.site_oturumlari enable row level security;
revoke all on public.site_oturumlari from anon, authenticated;

-- Oturum anahtarı → cari. (Adı eski: v1.646'da kod çözüyordu; çağıranlar değişmesin diye korundu.)
create or replace function public.site_kod_cari(p_kod text)
returns table (id text, unvan text, ek jsonb)
language sql stable security definer set search_path = public
as $$
  select c.id::text, c.unvan::text, coalesce(c.ek, '{}'::jsonb)
  from site_oturumlari o
  join site_hesaplari h on h.cari_id = o.cari_id
  join cariler c on c.id::text = o.cari_id
  where o.anahtar = coalesce(p_kod, '') and o.bitis > now()
    and not coalesce(c.pasif, false)
  limit 1;
$$;
revoke all on function public.site_kod_cari(text) from public, anon, authenticated;

-- Para birimi koda: ürün kartında "₺/$/€" de yazılmış olabilir.
create or replace function public.site_pb(p text)
returns text language sql immutable as $$
  select case coalesce(nullif(trim(p), ''), 'TRY')
    when '₺' then 'TRY' when 'TL' then 'TRY' when '$' then 'USD' when '€' then 'EUR' else upper(trim(p)) end;
$$;

-- ---------- 3) Müşterinin modelleri ve fiyatları ----------
-- Fiyat, ERP'deki fiyatBul ile aynı öncelik (renk/beden kırılımsız): cariye özel → carinin fiyat grubu.
-- GÖRÜNÜRLÜK (v1.652.0 — kullanıcı: "fiyatı olmayan ürünler de listelensin … toplu gruplama olsun, müşteriyi o gruplamaya
-- dahil edip listelensin"; karar: YALNIZ GRUBU): model sitede yayında (sitedeGoster) VE müşterinin dahil olduğu bir site
-- grubunda (`tanimlar.siteGruplari[].urunIdleri / cariIdleri`). Gruba dahil olmayan müşteri hiçbir model görmez.
-- Fiyatı yoksa da listelenir (fiyat NULL → sitede "Fiyat onayda"; fiyatı ERP sipariş onayında belirler).
create or replace function public.site_modeller(p_cari_id text, p_grup text)
returns table (id text, ad text, tip text, sezon text, sezon_yili text, renkler jsonb, bedenler jsonb,
               renk_resimleri jsonb, kapak_resmi text, fiyat numeric, para_birimi text)
language sql stable security definer set search_path = public
as $$
  with f as (
    select u.*,
      coalesce(
        (select k from jsonb_array_elements(coalesce(u.fiyat_kurallari::jsonb, '[]'::jsonb)) k
          where k->>'tip' = 'Satış' and k->>'kapsam' = 'cari' and k->>'deger' = p_cari_id
            and coalesce(k->>'renk', '') = '' and coalesce(k->>'beden', '') = ''
            and jsonb_typeof(k->'fiyat') = 'number' and (k->>'fiyat')::numeric > 0 limit 1),
        (select k from jsonb_array_elements(coalesce(u.fiyat_kurallari::jsonb, '[]'::jsonb)) k
          where p_grup is not null and k->>'tip' = 'Satış' and k->>'kapsam' = 'fiyatGrubu' and k->>'deger' = p_grup
            and coalesce(k->>'renk', '') = '' and coalesce(k->>'beden', '') = ''
            and jsonb_typeof(k->'fiyat') = 'number' and (k->>'fiyat')::numeric > 0 limit 1)
      ) as kural
    from urunler u
    where coalesce(u.ek->>'sitedeGoster', 'false') = 'true'
      and not coalesce(u.pasif, false)
      and u.kategori = 'Mamul'
      and exists (select 1 from tanimlar t, jsonb_array_elements(coalesce(t.veri->'siteGruplari', '[]'::jsonb)) g
                  where t.id = 'tekil' and coalesce(g->'cariIdleri', '[]'::jsonb) ? p_cari_id and coalesce(g->'urunIdleri', '[]'::jsonb) ? u.id::text)
  )
  select f.id::text, f.ad::text, f.mamul_tipi::text,
    coalesce(f.ek->>'sezon', '')::text, coalesce(f.sezon_yili::text, ''),
    coalesce((select jsonb_agg(distinct v.renk) from varyantlar v where v.urun_id::text = f.id::text and coalesce(v.renk, '') <> ''), '[]'::jsonb),
    coalesce((select jsonb_agg(distinct v.beden) from varyantlar v where v.urun_id::text = f.id::text and coalesce(v.beden, '') <> ''), '[]'::jsonb),
    coalesce(f.renk_resimleri::jsonb, '{}'::jsonb),
    f.kapak_resmi::text,
    (f.kural->>'fiyat')::numeric,
    public.site_pb(coalesce(f.kural->>'paraBirimi', f.satis_para_birimi))
  from f
  order by f.ad;
$$;
revoke all on function public.site_modeller(text, text) from public, anon, authenticated;

-- ---------- 4) Sitenin çağırdığı: giriş + koleksiyon ----------
-- Kod geçersizse HATA (site "kod geçersiz" der). Dönen: müşteri adı, asortiler (Tanımlar'dan) ve modeller.
create or replace function public.portal(p_kod text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  c record;
begin
  select * into c from public.site_kod_cari(p_kod);
  if c.id is null then
    raise exception 'GECERSIZ_KOD' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'unvan', c.unvan,
    'asortiler', coalesce((select t.veri->'asortiler' from tanimlar t where t.id = 'tekil'), '[]'::jsonb),
    'modeller', coalesce((select jsonb_agg(to_jsonb(m)) from public.site_modeller(c.id, nullif(c.ek->>'fiyatGrubuId', '')) m), '[]'::jsonb),
    -- KAYIT ÇEVİRİLERİ (v1.651.0 — "stok, renk, beden vs. de dil değişimi"): renk / mamul tipi / asorti adı sözlüğü
    -- (`tanimlar.ceviriler`) ve model adlarının çevirisi — yalnız bu müşterinin görebildiği modeller ile sipariş ettikleri.
    'ceviriler', coalesce((select t.veri->'ceviriler' from tanimlar t where t.id = 'tekil'), '{}'::jsonb),
    'urunCevirileri', coalesce((select jsonb_object_agg(u.id::text, u.ek->'ceviriler') from urunler u
      where jsonb_typeof(u.ek->'ceviriler') = 'object'
        and (u.id::text in (select m.id from public.site_modeller(c.id, nullif(c.ek->>'fiyatGrubuId', '')) m)
             or u.id::text in (select k.urun_id::text from siparis_kalemleri k join siparisler s on s.id = k.siparis_id where s.cari_id = c.id))), '{}'::jsonb)
  );
end;
$$;
revoke all on function public.portal(text) from public;
grant execute on function public.portal(text) to anon, authenticated;

-- ---------- 5) Sipariş talebi ----------
-- Siteden gelen hiçbir şeye güvenilmez: model müşteriye görünür olmalı, renk/beden modelde olmalı, miktar tam sayı
-- 1..5000; FİYAT SUNUCUDA yeniden bulunur (sitenin gönderdiği fiyat yok sayılır; fiyatsız modelde NULL — ERP onaylarken
-- belirler). Günde en çok 20 talep.
-- ÖDEME (v1.652.0 — kullanıcı: "ödeme aşamasında nakit, çek hangi tip ödeme ile olacak ise müşteri belirlesin; o bilgileri
-- görüp indirim tanımlar ve fiyat belirleriz"): p_odeme = {tip, vadeGun}; tip listeden, vade 0..365 gün.
drop function if exists public.portal_siparis(text, jsonb, text);
create or replace function public.portal_siparis(p_kod text, p_kalemler jsonb, p_not text, p_odeme jsonb default null)
returns text
language plpgsql volatile security definer set search_path = public
as $$
declare
  c record;
  k jsonb;
  m record;
  temiz jsonb := '[]'::jsonb;
  toplam integer := 0;
  adet integer;
  yeni_id text;
  odeme jsonb := null;
  vade integer;
begin
  select * into c from public.site_kod_cari(p_kod);
  if c.id is null then raise exception 'GECERSIZ_KOD' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then raise exception 'BOS_SIPARIS'; end if;
  if jsonb_array_length(p_kalemler) > 500 then raise exception 'COK_KALEM'; end if;
  if (select count(*) from site_talepleri t where t.cari_id = c.id and t.olusturma > now() - interval '1 day') >= 20 then
    raise exception 'GUNLUK_SINIR';
  end if;
  if p_odeme is not null and jsonb_typeof(p_odeme) = 'object' then
    if coalesce(p_odeme->>'tip', '') not in ('Nakit', 'Havale/EFT', 'Kredi kartı', 'Çek', 'Senet', 'Açık hesap') then raise exception 'GECERSIZ_ODEME'; end if;
    vade := case when jsonb_typeof(p_odeme->'vadeGun') = 'number' then (p_odeme->>'vadeGun')::numeric else null end;
    if vade is not null and (vade < 0 or vade > 365) then raise exception 'GECERSIZ_ODEME'; end if;
    odeme := jsonb_build_object('tip', p_odeme->>'tip', 'vadeGun', vade);
  end if;

  for k in select * from jsonb_array_elements(p_kalemler) loop
    select * into m from public.site_modeller(c.id, nullif(c.ek->>'fiyatGrubuId', '')) x where x.id = k->>'urunId';
    if m.id is null then raise exception 'GECERSIZ_MODEL'; end if;
    if not coalesce(m.renkler ? (k->>'renk'), false) or not coalesce(m.bedenler ? (k->>'beden'), false) then raise exception 'GECERSIZ_RENK_BEDEN'; end if;
    if jsonb_typeof(k->'miktar') <> 'number' then raise exception 'GECERSIZ_MIKTAR'; end if;
    adet := (k->>'miktar')::numeric;
    if adet < 1 or adet > 5000 or adet <> (k->>'miktar')::numeric then raise exception 'GECERSIZ_MIKTAR'; end if;
    toplam := toplam + adet;
    temiz := temiz || jsonb_build_array(jsonb_build_object(
      'urunId', m.id, 'urunAd', m.ad, 'renk', k->>'renk', 'beden', k->>'beden', 'miktar', adet,
      'birimFiyat', m.fiyat, 'paraBirimi', m.para_birimi));
  end loop;

  insert into site_talepleri (cari_id, cari_unvan, not_metni, kalemler, toplam_cift, odeme)
  values (c.id, c.unvan, left(nullif(trim(coalesce(p_not, '')), ''), 1000), temiz, toplam, odeme)
  returning id into yeni_id;
  return yeni_id;
end;
$$;
revoke all on function public.portal_siparis(text, jsonb, text, jsonb) from public;
grant execute on function public.portal_siparis(text, jsonb, text, jsonb) to anon, authenticated;

-- ---------- 6) Kodsuz eski vitrin kapanır ----------
drop function if exists public.vitrin();

-- ---------- 7) ERP: talebi reddet ----------
-- Yalnız giriş yapmış ERP kullanıcısı; yalnız hâlâ 'yeni' olan talep (iki cihaz aynı anda basarsa ikincisi etkisiz).
create or replace function public.site_talep_reddet(p_id text)
returns void
language sql volatile security invoker set search_path = public
as $$
  update site_talepleri set durum = 'reddedildi' where id = p_id and durum = 'yeni';
$$;
revoke all on function public.site_talep_reddet(text) from public, anon;
grant execute on function public.site_talep_reddet(text) to authenticated;

-- ---------- 8) Sitenin yazıları ve iletişim bilgileri (v1.647.0) ----------
-- ERP › Tanımlar › Firma › Web Sitesi (`tanimlar.siteAyarlari`). Herkese açık: yalnız bu nesne (+ "firma logosunu
-- kullan" seçiliyse firma logosu) döner; Tanımlar'ın kalanı (kullanıcılar, e-posta sunucusu…) seçilmez.
create or replace function public.site_ayarlari()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(t.veri->'siteAyarlari', '{}'::jsonb)
    || case when coalesce(t.veri->'siteAyarlari'->>'firmaLogosu', 'false') = 'true'
            then jsonb_build_object('logo', t.veri->'firmaBilgileri'->'logo') else '{}'::jsonb end
  from tanimlar t where t.id = 'tekil';
$$;
revoke all on function public.site_ayarlari() from public;
grant execute on function public.site_ayarlari() to anon, authenticated;

-- ---------- 9) Müşteri hesabı: bakiye, ekstre, siparişler, çekler (v1.648.0) ----------
-- Kullanıcı: "Carinin de ekranı olsun, hesaplarını ve siparişlerini de kontrol edebileceği." Kararlar: defter cariye
-- göre (cari kartı › Web sitesi erişimi: Genel / Resmi / ikisi — `ek->>'siteDefter'`, boşsa Genel); bakiye + ekstre +
-- siparişler + çekler. Kural ERP'deki gibi: "Muhasebe" defterindeki kayıt hem Genel'e hem Resmi'ye girer
-- (defterKapsar); bakiye = Borç − Alacak, para birimi başına (cariBakiyeleri).
-- Teslim edilen miktar ERP gibi STOK HAREKETLERİNDEN türetilir (013 siparisKarsilananlariHesapla); hareketi hiç
-- olmayan eski siparişte kalemdeki sayı kullanılır.
create or replace function public.portal_hesap(p_kod text, p_baslangic date default null, p_bitis date default null)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  c record;
  defterler text[];
  d text;
  bas date := coalesce(p_baslangic, (current_date - interval '3 months')::date);
  bit date := coalesce(p_bitis, current_date);
  hesap jsonb := '[]'::jsonb;
  sonuc jsonb;
begin
  select * into c from public.site_kod_cari(p_kod);
  if c.id is null then raise exception 'GECERSIZ_KOD' using errcode = 'P0001'; end if;
  if bit < bas or bit - bas > 3700 then raise exception 'GECERSIZ_TARIH'; end if;
  defterler := case coalesce(c.ek->>'siteDefter', 'Genel') when 'Resmi' then array['Resmi'] when 'Ikisi' then array['Genel', 'Resmi'] else array['Genel'] end;

  foreach d in array defterler loop
    hesap := hesap || jsonb_build_array(jsonb_build_object(
      'defter', d,
      'bakiye', coalesce((select jsonb_object_agg(pb, t) from (
          select coalesce(h.para_birimi, 'TRY') pb, round(sum(case when h.yon = 'Borç' then h.tutar else -h.tutar end)::numeric, 2) t
          from cari_hareketleri h where h.cari_id = c.id and coalesce(h.defter, 'Genel') in (d, 'Muhasebe')
          group by 1 having round(sum(case when h.yon = 'Borç' then h.tutar else -h.tutar end)::numeric, 2) <> 0) x), '{}'::jsonb),
      'devir', coalesce((select jsonb_object_agg(pb, t) from (
          select coalesce(h.para_birimi, 'TRY') pb, round(sum(case when h.yon = 'Borç' then h.tutar else -h.tutar end)::numeric, 2) t
          from cari_hareketleri h where h.cari_id = c.id and coalesce(h.defter, 'Genel') in (d, 'Muhasebe') and h.tarih < bas
          group by 1) x), '{}'::jsonb),
      'hareketler', coalesce((select jsonb_agg(jsonb_build_object(
          'tarih', h.tarih, 'fisNo', h.fis_no, 'siparisNo', h.siparis_no, 'aciklama', h.aciklama, 'urunAd', h.urun_ad,
          'renk', h.renk, 'yon', h.yon, 'tutar', h.tutar, 'paraBirimi', coalesce(h.para_birimi, 'TRY'),
          'odemeSekli', h.odeme_sekli, 'vade', h.vade) order by h.tarih, h.zaman nulls first, h.id)
        from (select * from cari_hareketleri h where h.cari_id = c.id and coalesce(h.defter, 'Genel') in (d, 'Muhasebe')
              and h.tarih between bas and bit order by h.tarih, h.zaman nulls first limit 2000) h), '[]'::jsonb)
    ));
  end loop;

  sonuc := jsonb_build_object(
    'unvan', c.unvan, 'baslangic', bas, 'bitis', bit, 'hesap', hesap,
    'siparisler', coalesce((select jsonb_agg(x order by x->>'tarih' desc) from (
      select jsonb_build_object(
        'siparisNo', s.siparis_no, 'tarih', s.tarih, 'teslimTarihi', s.teslim_tarihi, 'durum', s.durum,
        'belgeNo', s.ek->>'belgeNo', 'siteden', (s.ek->>'siteTalepId') is not null,
        -- KAPORA / ÖDENEN (kullanıcı: "siparişe dayalı kapora var ise o da görünsün"): ERP'deki siparisOdemeOzeti (320) ile
        -- aynı kural — carinin `siparisId`'si bu sipariş olan TAHSİLAT hareketleri (tip: islemTipi alanı, yoksa THS- fiş
        -- öneki, yoksa "tahsilat…" açıklaması), para birimi başına. Karşılaştırma KDV DAHİL toplamla (teslim fişi cariye KDV
        -- dahil yazılıyor; kalemin oranı `ek->>'kdvOrani'`).
        'odenen', coalesce((select jsonb_object_agg(pb, t) from (
            select coalesce(h.para_birimi, 'TRY') pb, round(sum(h.tutar)::numeric, 2) t from cari_hareketleri h
            where h.cari_id = c.id and h.ek->>'siparisId' = s.id::text
              and coalesce(h.ek->>'islemTipi', case when h.fis_no like 'THS-%' then 'Tahsilat' when h.aciklama ilike 'tahsilat%' then 'Tahsilat' end) = 'Tahsilat'
            group by 1) o), '{}'::jsonb),
        'kdvDahil', coalesce((select jsonb_object_agg(pb, t) from (
            select public.site_pb(k.para_birimi) pb, round(sum(k.miktar * coalesce(k.fiyat, 0) * (1 + coalesce(nullif(k.ek->>'kdvOrani', '')::numeric, 0) / 100))::numeric, 2) t
            from siparis_kalemleri k where k.siparis_id = s.id group by 1) v), '{}'::jsonb),
        -- FİYAT + TUTAR (v1.650 — kullanıcı: "sipariş fiyat ve tutar da görünsün"): beden fiyatı farklı olabilir; satırda
        -- tutar = Σ miktar×fiyat, birim fiyat = tutar ÷ miktar (ortalama). Para birimi ayrı grup.
        'kalemler', coalesce((select jsonb_agg(jsonb_build_object('urunId', g.urun_id, 'urunAd', g.urun_ad, 'renk', g.renk, 'miktar', g.miktar, 'teslim', least(g.teslim, g.miktar),
            'tutar', round(g.tutar, 2), 'fiyat', case when g.miktar > 0 then round(g.tutar / g.miktar, 2) else 0 end, 'paraBirimi', g.pb,
            -- BEDEN DAĞILIMI (kullanıcı: "sipariş asorti de görünsün"): beden → çift; site asortiye denk geliyorsa "n koli <asorti>" yazar.
            'bedenler', (select jsonb_object_agg(z.b, z.m) from (select coalesce(k2.beden, '') b, sum(k2.miktar) m from siparis_kalemleri k2
                          where k2.siparis_id = s.id and k2.urun_id is not distinct from g.urun_id and k2.renk is not distinct from g.renk
                            and public.site_pb(k2.para_birimi) = g.pb group by 1) z)) order by g.urun_ad, g.renk)
          from (select k.urun_id, k.urun_ad, k.renk, public.site_pb(k.para_birimi) pb, sum(k.miktar) miktar, sum(k.miktar * coalesce(k.fiyat, 0))::numeric tutar,
                  sum(case when exists (select 1 from stok_hareketleri sh where sh.siparis_id = s.id)
                           then greatest(coalesce((select -sum(sh.miktar) from stok_hareketleri sh where sh.siparis_id = s.id and sh.kalem_id = k.id), 0), 0)
                           else coalesce(k.karsilanan, 0) end) teslim
                from siparis_kalemleri k where k.siparis_id = s.id group by k.urun_id, k.urun_ad, k.renk, public.site_pb(k.para_birimi)) g), '[]'::jsonb)
      ) x
      from siparisler s
      where s.cari_id = c.id and s.tip = 'Satış' and coalesce(s.durum, '') <> 'İptal'
      order by s.tarih desc nulls last limit 200) y), '[]'::jsonb),
    'talepler', coalesce((select jsonb_agg(jsonb_build_object('tarih', t.olusturma, 'durum', t.durum, 'toplamCift', t.toplam_cift, 'not', t.not_metni, 'odeme', t.odeme,
          'kalemler', (select coalesce(jsonb_agg(jsonb_build_object('urunId', g.u, 'urunAd', g.a, 'renk', g.r, 'miktar', g.m, 'tutar', round(g.t, 2), 'paraBirimi', g.pb) order by g.a, g.r), '[]'::jsonb)
                       from (select k->>'urunId' u, k->>'urunAd' a, k->>'renk' r, coalesce(k->>'paraBirimi', 'TRY') pb, sum((k->>'miktar')::numeric) m,
                                    sum((k->>'miktar')::numeric * coalesce((k->>'birimFiyat')::numeric, 0)) t
                             from jsonb_array_elements(t.kalemler) k group by 1, 2, 3, 4) g)) order by t.olusturma desc)
      from site_talepleri t
      where t.cari_id = c.id and t.olusturma > now() - interval '60 days'
        and not exists (select 1 from siparisler s where s.ek->>'siteTalepId' = t.id)), '[]'::jsonb),
    'cekler', coalesce((select jsonb_agg(jsonb_build_object('cekNo', k->>'cekNo', 'banka', k->>'banka', 'tutar', k->'tutar',
          'paraBirimi', coalesce(k->>'paraBirimi', 'TRY'), 'vade', k->>'vadeTarihi', 'durum', coalesce(k->>'durum', 'Portföyde'), 'tip', coalesce(k->>'tip', 'Alınan'))
        order by k->>'vadeTarihi')
      from muhasebe m, jsonb_array_elements(coalesce(m.veri->'cekler', '[]'::jsonb)) k
      where k->>'cariId' = c.id and coalesce(k->>'defter', 'Genel') = any (defterler || array['Muhasebe'])
        and coalesce(k->>'durum', 'Portföyde') not in ('İade Edildi')), '[]'::jsonb)
  );
  -- ÜRÜN RESİMLERİ (v1.650.0 — kullanıcı: "sitede ürün resimleri de olsun, sipariş verilen için"): siparişlerde ve
  -- taleplerde geçen her model+renk için BİR KEZ (rengin resmi, yoksa kapak). Resimler satırlara gömülmez: aynı model
  -- onlarca siparişte tekrar eder, görsel başına ~50 KB. Anahtar "urunId|renk".
  sonuc := sonuc || jsonb_build_object('resimler', coalesce((
    select jsonb_object_agg(x.u || '|' || x.r, x.src) from (
      select distinct on (mr.u, mr.r) mr.u, mr.r, coalesce(nullif(u.renk_resimleri::jsonb->>mr.r, ''), nullif(u.kapak_resmi, '')) src
      from (select k->>'urunId' u, coalesce(k->>'renk', '') r
              from jsonb_array_elements(sonuc->'siparisler') s, jsonb_array_elements(s->'kalemler') k
            union
            select k->>'urunId', coalesce(k->>'renk', '')
              from jsonb_array_elements(sonuc->'talepler') t, jsonb_array_elements(t->'kalemler') k) mr
      join urunler u on u.id::text = mr.u
    ) x where x.src is not null), '{}'::jsonb));
  return sonuc;
end;
$$;
revoke all on function public.portal_hesap(text, date, date) from public;
grant execute on function public.portal_hesap(text, date, date) to anon, authenticated;


-- ---------- 10) Giriş / çıkış (site) ve hesap yönetimi (ERP) — v1.649.0 ----------
create or replace function public.portal_giris(p_kullanici text, p_sifre text)
returns text
language plpgsql volatile security definer set search_path = public, extensions
as $$
declare
  h record;
  anahtar text;
begin
  select * into h from site_hesaplari where kullanici = lower(trim(coalesce(p_kullanici, '')));
  -- Kullanıcı yoksa da aynı hata: hangi adların var olduğu dışarıdan sınanamasın.
  -- Hatalı girişte HATA FIRLATILMAZ, boş döner: hata işlemi geri alır ve hatalı deneme sayacı hiç artmazdı (kilit
  -- çalışmazdı). Site boş cevabı "kullanıcı adı ya da şifre hatalı" diye gösterir.
  if h.cari_id is null then perform pg_sleep(0.3); return null; end if;
  if h.kilit_bitis is not null and h.kilit_bitis > now() then raise exception 'HESAP_KILITLI' using errcode = 'P0001'; end if;
  if h.sifre_ozeti <> crypt(coalesce(p_sifre, ''), h.sifre_ozeti) then
    update site_hesaplari set hatali_deneme = hatali_deneme + 1,
      kilit_bitis = case when hatali_deneme + 1 >= 5 then now() + interval '15 minutes' else null end
    where cari_id = h.cari_id;
    return null;
  end if;
  if exists (select 1 from cariler c where c.id::text = h.cari_id and coalesce(c.pasif, false)) then return null; end if;
  anahtar := encode(gen_random_bytes(32), 'hex');
  delete from site_oturumlari where bitis < now();
  insert into site_oturumlari values (anahtar, h.cari_id, now() + interval '30 days');
  update site_hesaplari set son_giris = now(), hatali_deneme = 0, kilit_bitis = null where cari_id = h.cari_id;
  return anahtar;
end;
$$;
revoke all on function public.portal_giris(text, text) from public;
grant execute on function public.portal_giris(text, text) to anon, authenticated;

create or replace function public.portal_cikis(p_kod text)
returns void language sql volatile security definer set search_path = public
as $$ delete from site_oturumlari where anahtar = p_kod; $$;
revoke all on function public.portal_cikis(text) from public;
grant execute on function public.portal_cikis(text) to anon, authenticated;

-- ERP: hesap bilgisi (şifre özeti DÖNMEZ).
create or replace function public.site_hesap_bilgi(p_cari_id text)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('kullanici', h.kullanici, 'olusturma', h.olusturma, 'sonGiris', h.son_giris,
    'kilitli', h.kilit_bitis is not null and h.kilit_bitis > now())
  from site_hesaplari h where h.cari_id = p_cari_id;
$$;
-- ERP: kullanıcı adı / şifre belirle. Şifre boşsa yalnız kullanıcı adı değişir (hesap varsa). Şifre değişince açık
-- oturumlar kapanır.
create or replace function public.site_hesap_kaydet(p_cari_id text, p_kullanici text, p_sifre text)
returns void language plpgsql volatile security definer set search_path = public, extensions
as $$
declare
  ad text := lower(trim(coalesce(p_kullanici, '')));
begin
  if ad !~ '^[a-z0-9._-]{3,40}$' then raise exception 'Kullanıcı adı 3-40 karakter: harf, rakam, nokta, tire, alt çizgi'; end if;
  if not exists (select 1 from cariler where id::text = p_cari_id) then raise exception 'Cari bulunamadı'; end if;
  if exists (select 1 from site_hesaplari where kullanici = ad and cari_id <> p_cari_id) then raise exception 'Bu kullanıcı adı başka bir caride kullanılıyor'; end if;
  if coalesce(p_sifre, '') = '' then
    if not exists (select 1 from site_hesaplari where cari_id = p_cari_id) then raise exception 'Şifre gerekli'; end if;
    update site_hesaplari set kullanici = ad where cari_id = p_cari_id;
    return;
  end if;
  if length(p_sifre) < 6 then raise exception 'Şifre en az 6 karakter olmalı'; end if;
  insert into site_hesaplari (cari_id, kullanici, sifre_ozeti) values (p_cari_id, ad, crypt(p_sifre, gen_salt('bf', 10)))
  on conflict (cari_id) do update set kullanici = excluded.kullanici, sifre_ozeti = excluded.sifre_ozeti, hatali_deneme = 0, kilit_bitis = null;
  delete from site_oturumlari where cari_id = p_cari_id;
end;
$$;
-- ERP: erişimi kapat (hesap ve oturumları silinir).
create or replace function public.site_hesap_sil(p_cari_id text)
returns void language sql volatile security definer set search_path = public
as $$
  delete from site_oturumlari where cari_id = p_cari_id;
  delete from site_hesaplari where cari_id = p_cari_id;
$$;
-- ERP'deki hesaplar listesi (cari kartlarında "hesabı var" göstermek için) — yalnız cari_id + kullanıcı adı.
create or replace function public.site_hesap_listesi()
returns table (cari_id text, kullanici text, son_giris timestamptz)
language sql stable security definer set search_path = public
as $$ select h.cari_id, h.kullanici, h.son_giris from site_hesaplari h; $$;
revoke all on function public.site_hesap_bilgi(text), public.site_hesap_kaydet(text, text, text), public.site_hesap_sil(text), public.site_hesap_listesi() from public, anon;
grant execute on function public.site_hesap_bilgi(text), public.site_hesap_kaydet(text, text, text), public.site_hesap_sil(text), public.site_hesap_listesi() to authenticated;
