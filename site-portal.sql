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
-- KOD NEREDE: carinin `ek->>'siteKodu'` alanı (ERP › cari kartı › "Web sitesi erişimi"). Pasif cari ya da boş kod =
-- erişim yok. Kod 10 harf/rakam (≈50 bit), tahmin edilemez.
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
alter table public.site_talepleri enable row level security;
drop policy if exists "giris_yapmis_hersey" on public.site_talepleri;
create policy "giris_yapmis_hersey" on public.site_talepleri for all to authenticated using (true) with check (true);
revoke all on public.site_talepleri from anon;

-- ---------- 2) Kod → cari ----------
create or replace function public.site_kod_cari(p_kod text)
returns table (id text, unvan text, ek jsonb)
language sql stable security definer set search_path = public
as $$
  select c.id::text, c.unvan::text, coalesce(c.ek, '{}'::jsonb)
  from cariler c
  where length(trim(coalesce(p_kod, ''))) >= 6
    and upper(c.ek->>'siteKodu') = upper(trim(p_kod))
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
-- Fiyat, ERP'deki fiyatBul ile aynı öncelik (renk/beden kırılımsız): cariye özel → carinin fiyat grubu. İkisi de yoksa
-- model bu müşteriye GÖRÜNMEZ ("o grupta fiyatı boş bırakırsanız gizlenir").
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
  where f.kural is not null
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
    'modeller', coalesce((select jsonb_agg(to_jsonb(m)) from public.site_modeller(c.id, nullif(c.ek->>'fiyatGrubuId', '')) m), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.portal(text) from public;
grant execute on function public.portal(text) to anon, authenticated;

-- ---------- 5) Sipariş talebi ----------
-- Siteden gelen hiçbir şeye güvenilmez: model müşteriye görünür olmalı, renk/beden modelde olmalı, miktar tam sayı
-- 1..5000; FİYAT SUNUCUDA yeniden bulunur (sitenin gönderdiği fiyat yok sayılır). Günde en çok 20 talep.
create or replace function public.portal_siparis(p_kod text, p_kalemler jsonb, p_not text)
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
begin
  select * into c from public.site_kod_cari(p_kod);
  if c.id is null then raise exception 'GECERSIZ_KOD' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then raise exception 'BOS_SIPARIS'; end if;
  if jsonb_array_length(p_kalemler) > 500 then raise exception 'COK_KALEM'; end if;
  if (select count(*) from site_talepleri t where t.cari_id = c.id and t.olusturma > now() - interval '1 day') >= 20 then
    raise exception 'GUNLUK_SINIR';
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

  insert into site_talepleri (cari_id, cari_unvan, not_metni, kalemler, toplam_cift)
  values (c.id, c.unvan, left(nullif(trim(coalesce(p_not, '')), ''), 1000), temiz, toplam)
  returning id into yeni_id;
  return yeni_id;
end;
$$;
revoke all on function public.portal_siparis(text, jsonb, text) from public;
grant execute on function public.portal_siparis(text, jsonb, text) to anon, authenticated;

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

  return jsonb_build_object(
    'unvan', c.unvan, 'baslangic', bas, 'bitis', bit, 'hesap', hesap,
    'siparisler', coalesce((select jsonb_agg(x order by x->>'tarih' desc) from (
      select jsonb_build_object(
        'siparisNo', s.siparis_no, 'tarih', s.tarih, 'teslimTarihi', s.teslim_tarihi, 'durum', s.durum,
        'belgeNo', s.ek->>'belgeNo', 'siteden', (s.ek->>'siteTalepId') is not null,
        'kalemler', coalesce((select jsonb_agg(jsonb_build_object('urunAd', g.urun_ad, 'renk', g.renk, 'miktar', g.miktar, 'teslim', least(g.teslim, g.miktar)) order by g.urun_ad, g.renk)
          from (select k.urun_ad, k.renk, sum(k.miktar) miktar,
                  sum(case when exists (select 1 from stok_hareketleri sh where sh.siparis_id = s.id)
                           then greatest(coalesce((select -sum(sh.miktar) from stok_hareketleri sh where sh.siparis_id = s.id and sh.kalem_id = k.id), 0), 0)
                           else coalesce(k.karsilanan, 0) end) teslim
                from siparis_kalemleri k where k.siparis_id = s.id group by k.urun_ad, k.renk) g), '[]'::jsonb)
      ) x
      from siparisler s
      where s.cari_id = c.id and s.tip = 'Satış' and coalesce(s.durum, '') <> 'İptal'
      order by s.tarih desc nulls last limit 200) y), '[]'::jsonb),
    'talepler', coalesce((select jsonb_agg(jsonb_build_object('tarih', t.olusturma, 'durum', t.durum, 'toplamCift', t.toplam_cift, 'not', t.not_metni) order by t.olusturma desc)
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
end;
$$;
revoke all on function public.portal_hesap(text, date, date) from public;
grant execute on function public.portal_hesap(text, date, date) to anon, authenticated;
