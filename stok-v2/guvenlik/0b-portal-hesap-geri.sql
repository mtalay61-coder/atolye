-- GERİ ALMA: site_pb ve portal_hesap'in 3 Kasım düzeltmesinden ÖNCEKİ tanımları (main dalındaki site-portal.sql = canlıdaki). Hatalı
-- (42883 / 22023) hâle döndürür; yalnız düzeltme beklenmedik bir soruna yol açarsa. site_pb'nin yolu da eski hâline (boş) döner.
create or replace function public.site_pb(p text)
returns text language sql immutable as $$
  select case coalesce(nullif(trim(p), ''), 'TRY')
    when '₺' then 'TRY' when 'TL' then 'TRY' when '$' then 'USD' when '€' then 'EUR' else upper(trim(p)) end;
$$;

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
                            and public.site_pb(k2.para_birimi) = g.pb group by 1) z),
            -- ÜRETİMDE (v1.660.0 — kullanıcı: "siparişe çevrilen stoklar sipariş durumuna göre güncellensin: üretimde,
            -- bekliyor, sevk edildi"): bu siparişe bağlı (rezervasyon kimliği ya da sipariş no) o model+renkte bitmemiş
            -- üretim var mı. Site satır durumunu teslim + bu bayraktan kurar.
            'uretimde', exists (select 1 from uretim e where (e.rezervasyon_siparis_id::text = s.id::text or e.siparis_no = s.siparis_no)
                and e.urun_id::text is not distinct from g.urun_id::text and e.renk is not distinct from g.renk
                and not coalesce(e.stoga_eklendi_mi, false) and coalesce(e.asama, '') not in ('Tamamlandı', 'Üretildi (stokta)'))) order by g.urun_ad, g.renk)
          from (select k.urun_id, k.urun_ad, k.renk, public.site_pb(k.para_birimi) pb, sum(k.miktar) miktar, sum(k.miktar * coalesce(k.fiyat, 0))::numeric tutar,
                  sum(case when exists (select 1 from stok_hareketleri sh where sh.siparis_id = s.id)
                           then greatest(coalesce((select -sum(sh.miktar) from stok_hareketleri sh where sh.siparis_id = s.id and sh.kalem_id = k.id), 0), 0)
                           else coalesce(k.karsilanan, 0) end) teslim
                from siparis_kalemleri k where k.siparis_id = s.id group by k.urun_id, k.urun_ad, k.renk, public.site_pb(k.para_birimi)) g), '[]'::jsonb)
      ) x
      from siparisler s
      where s.cari_id = c.id and s.tip = 'Satış' and coalesce(s.durum, '') <> 'İptal'
      order by s.tarih desc nulls last limit 200) y), '[]'::jsonb),
    -- v1.658.0: siparişe çevrilen talep de listede kalır ('siparis' + sipariş no); reddedilende sebep (`red_sebebi`).
    'talepler', coalesce((select jsonb_agg(jsonb_build_object('tarih', t.olusturma, 'toplamCift', t.toplam_cift, 'not', t.not_metni, 'odeme', t.odeme,
          'durum', case when sp.siparis_no is not null then 'siparis' else t.durum end, 'siparisNo', sp.siparis_no, 'redSebebi', t.red_sebebi,
          'kalemler', (select coalesce(jsonb_agg(jsonb_build_object('urunId', g.u, 'urunAd', g.a, 'renk', g.r, 'miktar', g.m, 'tutar', round(g.t, 2), 'paraBirimi', g.pb) order by g.a, g.r), '[]'::jsonb)
                       from (select k->>'urunId' u, k->>'urunAd' a, k->>'renk' r, coalesce(k->>'paraBirimi', 'TRY') pb, sum((k->>'miktar')::numeric) m,
                                    sum((k->>'miktar')::numeric * coalesce((k->>'birimFiyat')::numeric, 0)) t
                             from jsonb_array_elements(t.kalemler) k group by 1, 2, 3, 4) g)) order by t.olusturma desc)
      from site_talepleri t
      left join lateral (select s.siparis_no from siparisler s where s.ek->>'siteTalepId' = t.id limit 1) sp on true
      where t.cari_id = c.id and t.olusturma > now() - interval '60 days'), '[]'::jsonb),
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
