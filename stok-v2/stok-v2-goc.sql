-- =====================================================================================================================
--  stok-v2-goc.sql — BUGÜNKÜ STOK VERİSİNİ STOK v2'YE TAŞIYAN GÖÇ (stok-v2.sql'den SONRA çalıştırılır)
-- =====================================================================================================================
--
--  NE YAPAR: urunler / varyantlar / stok_hareketleri / fis_defteri / tanimlar'ı OKUR (hiçbirine yazmaz), stk_* tablolarını
--  baştan kurar ve bir rapor döner. Geçişe kadar istendiği kadar tekrar çalıştırılabilir: her seferinde stk_* boşaltılıp
--  yeniden doldurulur. stk_fis'e uygulamadan YENİ fiş yazıldıktan sonra (geçişten sonra) çalışmaz — yanlışlıkla yeni kayıtları
--  silmesin (`p_zorla => true` yalnız bilerek).
--
--  KURALLAR:
--   · Renk: varyantın renk kimliği tanımdaki adla tutuyorsa o; tutmuyorsa ad ile (model rengi "1058 - Taba Süet", hammadde
--     rengi "Siyah"); tanımda hiç yoksa 'serbest' renk açılır ve raporda listelenir. "Standart"/boş = renksiz.
--   · Ölçü: adla (tanimlar.bedenler); tanımsızsa 'serbest' ölçü. "Standart"/boş = ölçüsüz.
--   · Fiş: aynı fiş numarasını taşıyan hareketler tek fiş olur; başlık bilgisi (tip, kullanıcı, zaman) fiş defterinden
--     tamamlanır. Fiş numarası olmayan eski hareket kendi fişini alır ("ESKI-<hareket>").
--   · İptal edilmiş fişler (fiş defterinde iptal) satırlarıyla birlikte taşınır ama stoğa SAYILMAZ — iz kalır.
--   · Stok farkı: bugün ekranda görünen miktar (varyantlar.miktar) hareket toplamından farklıysa, fark TEK bir göç fişiyle
--     ("GOC-ACILIS-<tarih>", tür Açılış) kapatılır; böylece geçişten sonra her ürünün stoğu bugünküyle aynı kalır ve fark
--     raporda satır satır görünür. İstenmezse `p_fark_fisi => false`.
--
--  KULLANIM: Supabase › SQL Editor:  select jsonb_pretty(public.stk_goc());
-- =====================================================================================================================

create or replace function public.stk_goc(p_fark_fisi boolean default true, p_zorla boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t jsonb;
  r record;
  vid text;
  rid text;
  oid_ text;
  fark_fis text := 'GOC-ACILIS-' || to_char(now(), 'YYYYMMDD');
  atlanan jsonb := '[]'::jsonb;
  tutarsiz_iptal jsonb := '[]'::jsonb;
  defter jsonb;
  d jsonb;
  s jsonb;
  n_fark int := 0;
  sonuc jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Göç yalnız Supabase SQL Editor''den çalıştırılır' using errcode = '42501';
  end if;
  -- Geçişten sonra `varyantlar` / `stok_hareketleri` v2'nin görünümüdür: göç kendi çıktısını okuyup silerdi.
  if exists (select 1 from public.stk_ayar where aktif) then
    raise exception 'Stok v2 etkin (geçiş yapıldı) — göç yeniden çalıştırılamaz; geri dönmek için stk_geri_don()' using errcode = '55000';
  end if;
  if not p_zorla and exists (select 1 from public.stk_fis where not goc) then
    raise exception 'stk_fis''te uygulamadan yazılmış fiş var — göç yeniden çalıştırılırsa silinirdi (bilerek: p_zorla => true)'
      using errcode = '55000';
  end if;

  -- 0) Temizle, tanımları yeniden aynala
  -- TRUNCATE: satır satır silme arşive (silinen_arsiv) binlerce göç satırı yazardı; göç kendi ürettiğini siliyor.
  truncate public.stk_hareket, public.stk_fis, public.stk_varyant;
  delete from public.stk_renk where tur = 'serbest';
  delete from public.stk_olcu where tur = 'serbest';
  select veri into t from public.tanimlar where id = 'tekil';
  perform public.stk_tanim_esitle(t);
  select veri into defter from public.fis_defteri where id = 'tekil';
  defter := case when jsonb_typeof(defter) = 'array' then defter else '[]'::jsonb end;

  -- 1) Eski satırlar — sütun tipinden bağımsız okunur (to_jsonb)
  drop table if exists _ev, _eh, _vm, _fark;
  create temp table _ev on commit drop as
    select j ->> 'urun_id' as urun_id, j ->> 'renk' as renk, j ->> 'renk_id' as renk_id, coalesce(j ->> 'beden', '') as beden,
           coalesce(public.stk_sayi(j ->> 'miktar'), 0) as miktar, coalesce(public.stk_sayi(j ->> 'min_stok'), 0) as min_stok
    from (select to_jsonb(v) as j from public.varyantlar v) x;
  create temp table _eh on commit drop as
    select j ->> 'id' as id, j ->> 'urun_id' as urun_id, j ->> 'renk' as renk, coalesce(j ->> 'beden', '') as beden,
           public.stk_sayi(j ->> 'miktar') as miktar, j ->> 'kaynak' as kaynak,
           coalesce(public.stk_zaman(j ->> 'tarih'), now()) as tarih,
           coalesce(nullif(btrim(j ->> 'fis_no'), ''), 'ESKI-' || (j ->> 'id')) as fis_id,
           j ->> 'siparis_no' as siparis_no, j ->> 'cari_id' as cari_id, j ->> 'uretim_id' as uretim_id,
           j ->> 'siparis_id' as siparis_id, j ->> 'kalem_id' as kalem_id, j ->> 'rezervasyon_siparis_id' as rezervasyon_siparis_id,
           public.stk_mantik(j ->> 'fazla_gonderim') as fazla_gonderim, j ->> 'aciklama' as aciklama,
           coalesce(j -> 'ek', '{}'::jsonb) as ek
    from (select to_jsonb(h) as j from public.stok_hareketleri h) x;

  -- 2) Varyant eşleme tablosu: (ürün, renk kimliği, renk adı, ölçü adı) → yeni varyant
  create temp table _vm (urun_id text, renk_id text, renk_nrm text, beden_nrm text, varyant_id text, eski_miktar numeric) on commit drop;

  for r in
    select urun_id, renk_id, renk, beden, sum(miktar) as miktar, max(min_stok) as min_stok, bool_or(true) as varyanttan
    from _ev group by urun_id, renk_id, renk, beden
    union all
    select distinct h.urun_id, null, h.renk, h.beden, null::numeric, 0, false
    from _eh h
    where not exists (select 1 from _ev e where e.urun_id = h.urun_id and public.stk_nrm(e.renk) is not distinct from public.stk_nrm(h.renk)
                                            and public.stk_nrm(e.beden) is not distinct from public.stk_nrm(h.beden))
  loop
    if not exists (select 1 from public.urunler where id = r.urun_id) then
      atlanan := atlanan || jsonb_build_object('neden', 'ürün yok', 'urunId', r.urun_id, 'renk', r.renk, 'beden', r.beden);
      continue;
    end if;
    -- Renk kimliği adla tutuyorsa kimlik; değilse ad.
    rid := null;
    if coalesce(r.renk_id, '') <> '' and exists (select 1 from public.stk_renk where id = r.renk_id and public.stk_nrm(ad) = public.stk_nrm(r.renk)) then
      rid := r.renk_id;
    end if;
    rid := public.stk_renk_coz(rid, r.renk);
    oid_ := public.stk_olcu_coz(null, r.beden);
    vid := public.stk_varyant_coz(r.urun_id, rid, null, oid_, null);
    update public.stk_varyant set min_stok = greatest(min_stok, coalesce(r.min_stok, 0)) where id = vid;
    insert into _vm values (r.urun_id, r.renk_id, public.stk_nrm(case when public.stk_yer_tutucu_mu(r.renk) then '' else r.renk end),
                            public.stk_nrm(case when public.stk_yer_tutucu_mu(r.beden) then '' else r.beden end), vid, r.miktar);
  end loop;

  -- 3) Fiş başlıkları (canlı hareketlerden) + fiş defterinden tamamlama
  insert into public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, aciklama, kullanici, goc, ek)
  select g.fis_id,
         coalesce(nullif(dx ->> 'tip', ''),
                  public.stk_kaynak_tur(g.kaynak)),
         g.kaynak,
         coalesce(public.stk_zaman(dx ->> 'stokTarihi'), public.stk_zaman(dx ->> 'zaman'), g.tarih),
         coalesce(dx ->> 'cariId', g.cari_id), coalesce(dx ->> 'siparisId', g.siparis_id), coalesce(dx ->> 'siparisNo', g.siparis_no),
         coalesce(dx ->> 'uretimId', g.uretim_id), null, dx ->> 'kullanici', true,
         case when dx is null then '{}'::jsonb else jsonb_build_object('defter', dx ->> 'defter', 'otomatik', dx -> 'otomatik') end
  from (
    select fis_id, min(tarih) as tarih, (array_agg(kaynak order by tarih, id))[1] as kaynak,
           max(cari_id) as cari_id, max(siparis_id) as siparis_id, max(siparis_no) as siparis_no, max(uretim_id) as uretim_id
    from _eh h
    where coalesce(h.miktar, 0) <> 0 and exists (select 1 from _vm m where m.urun_id = h.urun_id)   -- yazılacak satırı olan fiş
    group by fis_id
  ) g
  left join lateral (select x from jsonb_array_elements(defter) x where coalesce(x ->> 'id', x ->> 'fisNo') = g.fis_id limit 1) dd(dx) on true;

  -- Canlı hareketi olan ama defterde İPTAL görünen fiş: bugün stokta sayılıyor → iptal SAYILMAZ, raporlanır.
  select coalesce(jsonb_agg(f.id), '[]'::jsonb) into tutarsiz_iptal
  from public.stk_fis f
  where exists (select 1 from jsonb_array_elements(defter) x where coalesce(x ->> 'id', x ->> 'fisNo') = f.id and public.stk_mantik(x ->> 'iptal'));

  -- 4) Hareketler
  insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, siparis_no, kalem_id, cari_id,
                                  uretim_id, rezervasyon_siparis_id, fazla_gonderim, aciklama, ek)
  select h.id, h.fis_id, m.varyant_id, h.urun_id, h.miktar, h.kaynak, h.tarih, h.siparis_id, h.siparis_no, h.kalem_id, h.cari_id,
         h.uretim_id, h.rezervasyon_siparis_id, h.fazla_gonderim, h.aciklama, h.ek
  from _eh h
  join lateral (select varyant_id from _vm m
                where m.urun_id = h.urun_id
                  and m.renk_nrm is not distinct from public.stk_nrm(case when public.stk_yer_tutucu_mu(h.renk) then '' else h.renk end)
                  and m.beden_nrm is not distinct from public.stk_nrm(case when public.stk_yer_tutucu_mu(h.beden) then '' else h.beden end)
                limit 1) m on true
  where coalesce(h.miktar, 0) <> 0;
  select atlanan || coalesce(jsonb_agg(jsonb_build_object('neden', case when coalesce(h.miktar, 0) = 0 then 'miktar sıfır' else 'ürün yok' end,
                                                          'hareketId', h.id, 'fisNo', h.fis_id)), '[]'::jsonb)
    into atlanan
  from _eh h where not exists (select 1 from public.stk_hareket x where x.id = h.id);

  -- 5) İptal edilmiş fişler (canlıda hareketi yok, defterde iptal): satırlarıyla, stoğa sayılmadan.
  -- AYNI FİŞ DEFTERDE BİRDEN ÇOK KEZ olabilir (canlı veride görüldü, 28 Ekim: "10032-Saya" iki iptal kaydı → stk_fis_pkey
  -- çakışması, geçiş durdu). Döngü fiş numarası başına BİR kez döner; başlık ilk kayıttan, satırlar o numaranın BÜTÜN
  -- kayıtlarından (aynı satır kimliği bir kez). Döngü sorgusu başlarken alınan görüntüyle çalışır — içeride eklenen başlığı
  -- görmez; bu yüzden "zaten var mı" süzgeci yetmiyordu.
  for d in select distinct on (coalesce(x ->> 'id', x ->> 'fisNo')) x
           from jsonb_array_elements(defter) with ordinality as e(x, sira)
           where public.stk_mantik(x ->> 'iptal')
             and coalesce(x ->> 'id', x ->> 'fisNo', '') <> ''
             and not exists (select 1 from public.stk_fis f where f.id = coalesce(x ->> 'id', x ->> 'fisNo'))
             and jsonb_array_length(public.stk_dizi(x -> 'stokHareketleri')) > 0
           order by coalesce(x ->> 'id', x ->> 'fisNo'), sira
  loop
    -- Yazılacak satırı olmayan iptal fişi (ürünü silinmiş, miktar 0, satırı canlıda zaten var) başlık da açmaz.
    continue when not exists (
      select 1 from jsonb_array_elements(defter) x, jsonb_array_elements(public.stk_dizi(x -> 'stokHareketleri')) y
      where coalesce(x ->> 'id', x ->> 'fisNo') = coalesce(d ->> 'id', d ->> 'fisNo')
        and public.stk_mantik(x ->> 'iptal')
        and coalesce(y ->> 'id', '') <> '' and coalesce(public.stk_sayi(y ->> 'miktar'), 0) <> 0
        and not exists (select 1 from public.stk_hareket h where h.id = y ->> 'id')
        and exists (select 1 from public.urunler u where u.id = y ->> 'urunId'));
    insert into public.stk_fis (id, tur, kaynak, tarih, cari_id, siparis_id, siparis_no, uretim_id, kullanici, iptal, iptal_zamani, goc)
    values (coalesce(d ->> 'id', d ->> 'fisNo'), coalesce(nullif(d ->> 'tip', ''), 'Manuel'), d ->> 'kaynak',
            coalesce(public.stk_zaman(d ->> 'stokTarihi'), public.stk_zaman(d ->> 'zaman'), now()),
            d ->> 'cariId', d ->> 'siparisId', d ->> 'siparisNo', d ->> 'uretimId', d ->> 'kullanici', true,
            public.stk_zaman(d ->> 'iptalZamani'), true)
    on conflict (id) do nothing;
    for s in select y from jsonb_array_elements(defter) x, jsonb_array_elements(public.stk_dizi(x -> 'stokHareketleri')) y
             where coalesce(x ->> 'id', x ->> 'fisNo') = coalesce(d ->> 'id', d ->> 'fisNo')
               and public.stk_mantik(x ->> 'iptal')
    loop
      continue when coalesce(s ->> 'id', '') = '' or coalesce(public.stk_sayi(s ->> 'miktar'), 0) = 0
                    or exists (select 1 from public.stk_hareket where id = s ->> 'id')
                    or not exists (select 1 from public.urunler where id = s ->> 'urunId');
      vid := public.stk_varyant_coz(s ->> 'urunId', null, s ->> 'renk', null, s ->> 'beden');
      insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, siparis_id, kalem_id, aciklama)
      values (s ->> 'id', coalesce(d ->> 'id', d ->> 'fisNo'), vid, s ->> 'urunId', public.stk_sayi(s ->> 'miktar'), s ->> 'kaynak',
              coalesce(public.stk_zaman(s ->> 'tarih'), now()), s ->> 'siparisId', s ->> 'kalemId', s ->> 'aciklama')
      on conflict (id) do nothing;
    end loop;
  end loop;

  -- 6) Stok farkı: varyantlar.miktar (bugün görünen) − hareket toplamı → tek göç fişi
  if p_fark_fisi then
    create temp table _fark on commit drop as
      select m.varyant_id, m.urun_id, sum(m.eski_miktar) as eski,
             (select miktar from public.stk_stok s where s.varyant_id = m.varyant_id) as yeni
      from _vm m where m.eski_miktar is not null
      group by m.varyant_id, m.urun_id;
    if exists (select 1 from _fark where eski <> yeni) then
      insert into public.stk_fis (id, tur, kaynak, tarih, aciklama, goc)
      values (fark_fis, 'Açılış', 'Açılış', now(), 'Göç: kayıtlı stok miktarı ile hareket toplamı arasındaki fark (stok v2 geçişi)', true);
      insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, aciklama)
      select 'goc-' || f.varyant_id, fark_fis, f.varyant_id, f.urun_id, f.eski - f.yeni, 'Açılış', now(), 'Göç farkı'
      from _fark f where f.eski <> f.yeni;
      get diagnostics n_fark = row_count;
    end if;
  end if;

  -- 7) Rapor
  select jsonb_build_object(
    'urun', (select count(distinct urun_id) from public.stk_varyant),
    'varyant', (select count(*) from public.stk_varyant),
    'fis', (select count(*) from public.stk_fis),
    'iptalFis', (select count(*) from public.stk_fis where iptal),
    'hareket', (select count(*) from public.stk_hareket),
    'eskiHareket', (select count(*) from _eh),
    'eskiVaryant', (select count(*) from _ev),
    'serbestRenk', (select coalesce(jsonb_agg(ad order by ad), '[]'::jsonb) from public.stk_renk where tur = 'serbest'),
    'serbestOlcu', (select coalesce(jsonb_agg(ad order by ad), '[]'::jsonb) from public.stk_olcu where tur = 'serbest'),
    'farkSatiri', n_fark,
    'farklar', case when p_fark_fisi then (
      select coalesce(jsonb_agg(jsonb_build_object('urun', u.ad, 'renk', s.renk_ad, 'olcu', s.olcu_ad, 'kayitli', f.eski, 'hareketToplami', f.yeni,
                                                   'fark', f.eski - f.yeni) order by u.ad, s.renk_ad, s.olcu_ad), '[]'::jsonb)
      from _fark f join public.stk_stok s on s.varyant_id = f.varyant_id left join public.urunler u on u.id = f.urun_id
      where f.eski <> f.yeni) else '[]'::jsonb end,
    'defterdeIptalAmaHareketiVar', tutarsiz_iptal,
    'atlanan', atlanan
  ) into sonuc;
  return sonuc;
end $$;

revoke all on function public.stk_goc(boolean, boolean) from public, anon, authenticated;

-- DOĞRULAMA (göçten sonra, SQL Editor): bugünkü ekran stoğu ile v2 stoğu ürün × renk × ölçü bazında eşit olmalı.
--   select count(*) as fark from public.stk_goc_karsilastir() where fark <> 0;   → 0
create or replace function public.stk_goc_karsilastir()
returns table (urun_id text, renk text, beden text, eski numeric, yeni numeric, fark numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  -- Geçişten SONRA `varyantlar` v2'nin görünümü: v2'yi kendisiyle karşılaştırıp hep 0 fark verirdi (v1.730.1 denetim). Eski tablo
  -- (eski_varyantlar) varsa o okunur. PL/pgSQL tabloyu çalışırken çözer: hangi dal çalışmazsa o tablo olmasa da derlenir.
  if to_regclass('public.eski_varyantlar') is not null then
    return query
      with eski as (
        select j ->> 'urun_id' as urun_id,
               public.stk_nrm(case when public.stk_yer_tutucu_mu(j ->> 'renk') then '' else j ->> 'renk' end) as renk,
               public.stk_nrm(case when public.stk_yer_tutucu_mu(j ->> 'beden') then '' else j ->> 'beden' end) as beden,
               sum(coalesce(public.stk_sayi(j ->> 'miktar'), 0)) as miktar
        from (select to_jsonb(v) as j from public.eski_varyantlar v) x
        where exists (select 1 from public.urunler u where u.id = j ->> 'urun_id')
        group by 1, 2, 3
      ), yeni as (
        select s.urun_id, public.stk_nrm(s.renk_ad) as renk, public.stk_nrm(s.olcu_ad) as beden, sum(s.miktar) as miktar
        from public.stk_stok s group by 1, 2, 3
      )
      select coalesce(e.urun_id, y.urun_id), coalesce(e.renk, y.renk), coalesce(e.beden, y.beden),
             coalesce(e.miktar, 0), coalesce(y.miktar, 0), coalesce(e.miktar, 0) - coalesce(y.miktar, 0)
      from eski e full join yeni y on y.urun_id = e.urun_id and y.renk is not distinct from e.renk and y.beden is not distinct from e.beden;
  else
    return query
      with eski as (
        select j ->> 'urun_id' as urun_id,
               public.stk_nrm(case when public.stk_yer_tutucu_mu(j ->> 'renk') then '' else j ->> 'renk' end) as renk,
               public.stk_nrm(case when public.stk_yer_tutucu_mu(j ->> 'beden') then '' else j ->> 'beden' end) as beden,
               sum(coalesce(public.stk_sayi(j ->> 'miktar'), 0)) as miktar
        from (select to_jsonb(v) as j from public.varyantlar v) x
        where exists (select 1 from public.urunler u where u.id = j ->> 'urun_id')
        group by 1, 2, 3
      ), yeni as (
        select s.urun_id, public.stk_nrm(s.renk_ad) as renk, public.stk_nrm(s.olcu_ad) as beden, sum(s.miktar) as miktar
        from public.stk_stok s group by 1, 2, 3
      )
      select coalesce(e.urun_id, y.urun_id), coalesce(e.renk, y.renk), coalesce(e.beden, y.beden),
             coalesce(e.miktar, 0), coalesce(y.miktar, 0), coalesce(e.miktar, 0) - coalesce(y.miktar, 0)
      from eski e full join yeni y on y.urun_id = e.urun_id and y.renk is not distinct from e.renk and y.beden is not distinct from e.beden;
  end if;
end $$;
revoke all on function public.stk_goc_karsilastir() from public, anon, authenticated;

-- =====================================================================================================================
--  GEÇİŞ VE GERİ DÖNÜŞ (SQL Editor'dan; uygulama çağıramaz)
-- =====================================================================================================================
--
--  GEÇİŞ — `select jsonb_pretty(public.stk_gecis());`
--    1. Göç son kez çalışır (bugünkü veri → v2, rapor döner).
--    2. Bugünkü `varyantlar` / `stok_hareketleri` TABLOLARI silinmez, adları `eski_varyantlar` / `eski_stok_hareketleri`
--       olur. Aynı adlarla v2'yi bugünkü biçimde gösteren salt-okunur GÖRÜNÜMLER açılır: uygulama, gün sonu raporu ve
--       bulut sayımı okumaya değişmeden devam eder.
--    3. `stk_ayar.aktif` açılır: yeni sürüm (v1.726.0+) açılışta bunu görür, stok yazmalarını `stk_yaz`'a gönderir.
--       Eski sürümde kalmış bir cihaz görünüme YAZAMAZ (hata verir) — sessizce eski tabloya yazıp ayrışamaz.
--  GERİ DÖNÜŞ — `select jsonb_pretty(public.stk_geri_don());`
--    Görünümler kalkar, eski tablolar adlarına döner ve İÇERİKLERİ v2'nin o anki hâliyle yenilenir (geçişten sonra
--    girilen fişler kaybolmaz). `stk_ayar.aktif` kapanır; uygulama bir sonraki açılışta eski yola döner. v2 tabloları
--    yerinde kalır (yeniden geçişte göç onları baştan kurar).
create or replace function public.stk_gecis(p_fark_fisi boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  rapor jsonb;
begin
  if auth.jwt() is not null then
    raise exception 'Geçiş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if exists (select 1 from public.stk_ayar where aktif) then
    raise exception 'Stok v2 zaten etkin' using errcode = '55000';
  end if;
  if to_regclass('public.eski_varyantlar') is not null or to_regclass('public.eski_stok_hareketleri') is not null then
    raise exception 'eski_varyantlar / eski_stok_hareketleri zaten var — önceki geçiş yarım kalmış olabilir, elle bakın' using errcode = '55000';
  end if;
  rapor := public.stk_goc(p_fark_fisi, true);
  alter table public.varyantlar rename to eski_varyantlar;
  alter table public.stok_hareketleri rename to eski_stok_hareketleri;
  create view public.varyantlar with (security_invoker = true) as select * from public.stk_eski_varyantlar_g;
  create view public.stok_hareketleri with (security_invoker = true) as select * from public.stk_eski_hareketler_g;
  revoke all on public.varyantlar, public.stok_hareketleri from anon, authenticated;
  grant select on public.varyantlar, public.stok_hareketleri to authenticated;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.varyantlar, public.stok_hareketleri to service_role;
  end if;
  update public.stk_ayar set aktif = true, gecis = now() where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('gecis', 'tamam', 'goc', rapor);
end $$;

create or replace function public.stk_geri_yaz(p_tablo text, p_kaynak text) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  sutunlar text;
  n int;
begin
  -- İç içe dolar tırnağı yok (Supabase SQL Editor ayırıcısı tanımıyor): sorgu düz metinle kurulur.
  execute 'select string_agg(quote_ident(c.column_name), '', '' order by c.ordinal_position)'
       || ' from information_schema.columns c'
       || ' where c.table_schema = ''public'' and c.table_name = ' || quote_literal(p_tablo)
       || ' and c.column_name in (select jsonb_object_keys(j) from (select j from pg_temp.' || quote_ident(p_kaynak) || ' limit 1) x)'
    into sutunlar;
  if sutunlar is null then return 0; end if;   -- kaynak boş
  execute format('insert into public.%I (%s) select %s from pg_temp.%I k, jsonb_populate_record(null::public.%I, k.j) r',
                 p_tablo, sutunlar, (select string_agg('r.' || x, ', ') from unnest(string_to_array(sutunlar, ', ')) x), p_kaynak, p_tablo);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.stk_geri_don() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n_v int;
  n_h int;
begin
  if auth.jwt() is not null then
    raise exception 'Geri dönüş yalnız Supabase SQL Editor''den yapılır' using errcode = '42501';
  end if;
  if not exists (select 1 from public.stk_ayar where aktif) or to_regclass('public.eski_varyantlar') is null then
    raise exception 'Stok v2 etkin değil — geri dönülecek bir şey yok' using errcode = '55000';
  end if;
  -- v2'nin o anki hâli, bugünkü biçimde
  drop table if exists _gd_v, _gd_h;
  create temp table _gd_v on commit drop as select to_jsonb(x) as j from public.stk_eski_varyantlar_g x
    where exists (select 1 from public.urunler u where u.id = x.urun_id);
  create temp table _gd_h on commit drop as select to_jsonb(x) as j from public.stk_eski_hareketler_g x
    where exists (select 1 from public.urunler u where u.id = x.urun_id);
  drop view public.varyantlar;
  drop view public.stok_hareketleri;
  alter table public.eski_varyantlar rename to varyantlar;
  alter table public.eski_stok_hareketleri rename to stok_hareketleri;
  -- TRUNCATE: satır satır silme arşive binlerce satır yazardı; içerik hemen aşağıda v2'den yeniden yazılıyor.
  truncate public.varyantlar, public.stok_hareketleri;
  -- Yalnız görünümün taşıdığı sütunlar yazılır (tablonun başka sütunu varsa varsayılanını alır); jsonb_populate_record
  -- değeri tablodaki tipe çevirir (tarih metin mi zaman damgası mı, fark etmez).
  n_v := public.stk_geri_yaz('varyantlar', '_gd_v');
  n_h := public.stk_geri_yaz('stok_hareketleri', '_gd_h');
  update public.stk_ayar set aktif = false, geri_donus = now() where id = 'tekil';
  notify pgrst, 'reload schema';
  return jsonb_build_object('geriDonus', 'tamam', 'varyant', n_v, 'hareket', n_h);
end $$;

revoke all on function public.stk_gecis(boolean) from public, anon, authenticated;
revoke all on function public.stk_geri_don() from public, anon, authenticated;
revoke all on function public.stk_geri_yaz(text, text) from public, anon, authenticated;
