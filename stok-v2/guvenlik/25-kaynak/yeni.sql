-- G-25 YENİ NESNELER (kaynak). Üretici: stok-v2/guvenlik/25-uret.py → 25-cari-yetki-uygula.sql / -geri-al.sql.
-- Her ifade "-- @@" satırıyla ayrılır (üretici böler, her birini uygulama dosyasında execute eder).
-- Tasarım: stok-v2/guvenlik/25-G25-TASARIM.md. Gruplar: PARA = cari, muhasebe · STOK = stok, fisler, siparis, uretim ·
-- ÜRETİM = uretim, stok, fisler, siparis. yetki_var_mi (A6): Yönetici her zaman; jetonsuz çağrı yönetim işidir.

-- Yetki yoksa anlaşılır iletiyle 42501 (stk_yetki'nin iletisi modül adını hep "stok" yazıyor).
create or replace function public.g25_yetki_iste(p_moduller text[], p_islem text, p_ne text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.jwt() is null then return; end if;
  if not coalesce(public.yetki_var_mi(p_moduller, p_islem), false) then
    raise exception 'Bu işlem için yetkiniz yok: % (% yetkisi gerekir)', p_ne,
      array_to_string(p_moduller, ' / ') || ' ' || case p_islem when 'silme' then 'silme' when 'goruntuleme' then 'görüntüleme' else 'kaydetme' end
      using errcode = '42501';
  end if;
end $$;
-- @@
-- STOK BAĞLANTISI (K4): cari satırları fişin gerçek stok satırlarının aynası mı? Döner: null (bağlı) ya da gerekçe.
create or replace function public.g25_stok_bagi(f jsonb, p_stok jsonb, p_cari jsonb, p_kasa jsonb) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  stoklar jsonb := public.stk_dizi(p_stok -> 'satirlar');
  satirlar jsonb := public.stk_dizi(p_cari -> 'satirlar');
  onek text := coalesce(f ->> 'onek', '');
  tur text := coalesce(f ->> 'tur', '');
  cari text := nullif(f ->> 'cariId', '');
  pb text := nullif(f ->> 'paraBirimi', '');
  c jsonb; s jsonb; e jsonb;
  sm numeric; m numeric; b numeric; t numeric; matrah numeric; kdv numeric; oran numeric;
begin
  if jsonb_array_length(public.stk_dizi(p_kasa -> 'hareketler')) > 0 or jsonb_array_length(public.stk_dizi(p_kasa -> 'cekler')) > 0 then
    return 'stok fişinde kasa / çek satırı var';
  end if;
  if not ((onek = 'AF' and tur = 'Alış') or (onek = 'SF' and tur = 'Satış')) then
    return format('önek %s ile tür %s uyuşmuyor', onek, tur);
  end if;
  if cari is null then return 'fişin carisi yok'; end if;
  if (select count(*) from jsonb_array_elements(satirlar) x) <> (select count(distinct x ->> 'id') from jsonb_array_elements(satirlar) x) then
    return 'aynı cari satırı iki kez';
  end if;
  for c in select x from jsonb_array_elements(satirlar) x loop
    select x into s from jsonb_array_elements(stoklar) x where x ->> 'id' = c ->> 'id' limit 1;
    if s is null then return format('cari satırı %s bir stok satırına bağlı değil', c ->> 'id'); end if;
    e := case when jsonb_typeof(c -> 'ek') = 'object' then c -> 'ek' else '{}'::jsonb end;
    if coalesce(c ->> 'cari_id', '') <> cari then return format('cari satırı %s başka cariye yazılıyor', c ->> 'id'); end if;
    if coalesce(s ->> 'cariId', '') <> '' and s ->> 'cariId' <> cari then return format('stok satırı %s başka carinin', s ->> 'id'); end if;
    if coalesce(c ->> 'yon', '') <> (case tur when 'Alış' then 'Alacak' else 'Borç' end) then
      return format('cari satırı %s yönü %s türüne uymuyor', c ->> 'id', tur);
    end if;
    sm := public.stk_sayi(s ->> 'miktar');
    if sm is null or (tur = 'Alış' and sm <= 0) or (tur = 'Satış' and sm >= 0) then
      return format('stok satırı %s miktarı %s türüne uymuyor', s ->> 'id', tur);
    end if;
    if coalesce(e ->> 'islemTipi', '') not in ('', tur) then
      return format('cari satırı %s işlem tipi %s', c ->> 'id', e ->> 'islemTipi');
    end if;
    m := public.stk_sayi(e ->> 'miktar'); b := public.stk_sayi(e ->> 'birimFiyat'); t := public.stk_sayi(c ->> 'tutar');
    if m is null or b is null or t is null or b < 0 or t < 0 then return format('cari satırı %s miktar / fiyat / tutar eksik', c ->> 'id'); end if;
    if abs(m - abs(sm)) > 0.000001 then return format('cari satırı %s miktarı stok satırından farklı', c ->> 'id'); end if;
    oran := public.stk_sayi(e ->> 'kdvOrani');
    if oran is not null then
      matrah := public.stk_sayi(e ->> 'matrah'); kdv := public.stk_sayi(e ->> 'kdvTutari');
      if matrah is null or kdv is null or abs(matrah * oran / 100 - kdv) > 0.011 or abs(matrah + kdv - t) > 0.011 then
        return format('cari satırı %s KDV tutarı tutarsız', c ->> 'id');
      end if;
    else
      matrah := t;
    end if;
    if abs(m * b - matrah) > 0.011 + 0.000001 * abs(matrah) then
      return format('cari satırı %s tutarı miktar × birim fiyattan farklı', c ->> 'id');
    end if;
    if pb is not null and coalesce(c ->> 'para_birimi', '') <> pb then
      return format('cari satırı %s para birimi fişten farklı', c ->> 'id');
    end if;
  end loop;
  if (select count(distinct coalesce(x ->> 'para_birimi', '')) from jsonb_array_elements(satirlar) x) > 1 then
    return 'cari satırlarının para birimleri farklı';
  end if;
  return null;
end $$;
-- @@
-- ÜCRET ONAY DEFTERİ (K4 / P1–P3, 24 Kasım). İşçilik ücretinin dayanağı "değer bir yerde kayıtlı" DEĞİL, "cari / muhasebe yetkilisi bu
-- değeri onayladı"dır. Bir satır = bir anahtarın ONAYLANAN özeti; özet o anki değerle birebir aynı değilse (ücret, cari, miktar
-- değiştiyse) onay geçersizdir — yeniden onay gerekir. Anahtarlar (g25_ucret_guncel hesaplar):
--   proses|<ürün>|<proses>     ürün kartındaki proses ücreti            {ucret}
--   numune|<üretim>|<proses>   numune üretiminde üretim kaydındaki ücret {ucret}
--   ara|<ürün>|<ara proses>    ürüne göre çözülmüş ara proses carisi + ücreti {cari, ucret}
--   tamir|<atama>              tamir ataması {uretim, proses, personel, miktar, ucret}
--   cari|<cari>                "Her İkisi" (müşteri + tedarikçi) kartının işçilik alıcısı olarak onayı {cari, tip}
-- Doğrudan erişim yok (RLS açık, yetki yok); okuma ucret_onaylari, yazma ucret_onayla ile.
create table public.ucr_onay (
  anahtar text primary key,
  tur text not null check (tur in ('proses', 'numune', 'ara', 'tamir', 'cari')),
  ozet jsonb not null,
  onaylayan text not null,
  onay_zamani timestamptz not null default now(),
  onceki jsonb
)
-- @@
alter table public.ucr_onay enable row level security
-- @@
revoke all on public.ucr_onay from public, anon, authenticated
-- @@
-- İŞÇİLİK ÖDEME KAYDI: her atama (ya da üretimin her ara proses adımı) en çok BİR geçerli işçilik ödemesi alır. ÜRT bağ denetimi fiş
-- yazılmadan önce aynı işlemde satır ekler (fiş düşerse geri alınır); fiş iptal edilirse satır geçersiz sayılır (istek → stk_fis).
create table public.isc_odeme (
  id text primary key,                    -- 'atama:<id>' | 'ara:<üretim>:<ara proses>'
  uretim_id text not null,
  proses text,
  tamir boolean not null default false,
  cari_id text not null,
  miktar numeric not null,
  ucret numeric not null,
  istek text,
  zaman timestamptz not null default now()
)
-- @@
alter table public.isc_odeme enable row level security
-- @@
revoke all on public.isc_odeme from public, anon, authenticated
-- @@
-- Anahtarın ŞU ANKİ özeti (sunucudaki kayıtlardan; istemciden hiçbir şey okunmaz). Kaynak yoksa null.
create or replace function public.g25_ucret_guncel(p_anahtar text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  par text[] := string_to_array(p_anahtar, '|');
  ur jsonb; ue jsonb; u jsonb; a jsonb; ap jsonb; c jsonb;
  v numeric; v_cari text;
begin
  if par[1] = 'proses' then
    select to_jsonb(x) into ur from public.urunler x where x.id::text = par[2];
    if ur is null then return null; end if;
    ue := case when jsonb_typeof(ur -> 'ek') = 'object' then ur -> 'ek' else '{}'::jsonb end;
    v := coalesce(public.stk_sayi(case when jsonb_typeof(ur -> 'proses_ucretleri') = 'object' then ur -> 'proses_ucretleri' ->> par[3] end),
                  public.stk_sayi(case when jsonb_typeof(ue -> 'prosesUcretleri') = 'object' then ue -> 'prosesUcretleri' ->> par[3] end),
                  public.stk_sayi(ur -> 'veri' -> 'prosesUcretleri' ->> par[3]));
    return case when v is null then null else jsonb_build_object('ucret', v) end;
  elsif par[1] = 'numune' then
    select to_jsonb(x) into u from public.uretim x where x.id::text = par[2];
    v := public.stk_sayi(u -> 'ek' -> 'prosesUcretleri' ->> par[3]);
    return case when v is null then null else jsonb_build_object('ucret', v) end;
  elsif par[1] = 'ara' then
    select to_jsonb(x) into ur from public.urunler x where x.id::text = par[2];
    select x into ap from public.tanimlar t, jsonb_array_elements(case when jsonb_typeof(t.veri -> 'araProsesler') = 'array' then t.veri -> 'araProsesler' else '[]'::jsonb end) x
     where t.id = 'tekil' and x ->> 'id' = par[3];
    if ur is null or ap is null then return null; end if;
    ue := case when jsonb_typeof(ur -> 'ek') = 'object' then ur -> 'ek' else '{}'::jsonb end;
    v_cari := coalesce(nullif(ue -> 'araProsesCariOverride' ->> par[3], ''), nullif(ap ->> 'cariId', ''));
    v := coalesce(public.stk_sayi(ue -> 'araProsesUcretleri' ->> par[3]), public.stk_sayi(ap ->> 'ucret'));
    return case when v is null or v_cari is null then null else jsonb_build_object('cari', v_cari, 'ucret', v) end;
  elsif par[1] = 'tamir' then
    select to_jsonb(x) into a from public.uretim_atamalari x where x.id::text = par[2];
    if a is null or not coalesce((a ->> 'tamir_mi')::boolean, false) then return null; end if;
    return jsonb_build_object('uretim', a ->> 'uretim_id', 'proses', a ->> 'proses', 'personel', a ->> 'personel_id',
      'miktar', public.stk_sayi(a ->> 'miktar'), 'ucret', coalesce(public.stk_sayi(a ->> 'tamir_ucret'), 0));
  elsif par[1] = 'cari' then
    select to_jsonb(x) into c from public.cariler x where x.id::text = par[2];
    return case when c is null then null else jsonb_build_object('cari', c ->> 'id', 'tip', c ->> 'tip') end;
  end if;
  return null;
end $$;
-- @@
-- Onay GEÇERLİ mi: onaylanan özet şu anki özetle birebir aynı (jsonb sayı karşılaştırması sayısaldır: 35 = 35.0).
create or replace function public.g25_onayli(p_anahtar text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ucr_onay o where o.anahtar = p_anahtar and o.ozet = public.g25_ucret_guncel(p_anahtar))
$$;
-- @@
-- TAMİR ONAYI: tamir|<atama> onaylı; değilse kısmi teslimden kalan atama (ek.kismiKalanKaynak) kaynağın onayını kullanır — kişi, ücret,
-- proses, üretim AYNI ve miktar onaylanandan büyük değil (kalan parça küçülür, büyüyemez).
create or replace function public.g25_tamir_onayli(p_atama text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  g jsonb := public.g25_ucret_guncel('tamir|' || p_atama);
  v_kaynak text; k jsonb;
begin
  if g is null then return false; end if;
  if public.g25_onayli('tamir|' || p_atama) then return true; end if;
  select nullif(x.ek ->> 'kismiKalanKaynak', '') into v_kaynak from public.uretim_atamalari x where x.id::text = p_atama;
  if v_kaynak is null then return false; end if;
  select o.ozet into k from public.ucr_onay o where o.anahtar = 'tamir|' || v_kaynak;
  return k is not null and k ->> 'personel' is not distinct from g ->> 'personel' and k ->> 'proses' is not distinct from g ->> 'proses'
     and k ->> 'uretim' is not distinct from g ->> 'uretim' and (k ->> 'ucret')::numeric = (g ->> 'ucret')::numeric
     and (g ->> 'miktar')::numeric <= (k ->> 'miktar')::numeric;
end $$;
-- @@
-- İŞÇİLİK CARİSİ (madde 2): sunucudaki cari kartından. Müşteri ASLA (alacak, müşterinin borcunu düşürür); "Her İkisi" yalnız açık
-- onayla (ara / tamir onayının özetinde bu cari varsa ya da cari|<id> onayı); tipsiz / bilinmeyen tip ret; atölye içi bölüm
-- personeli (maaşlı, Fasoncu değil) ya da bölüme bağlı proses → ret (istemci 015 iscilikBolumu: oraya cariye işçilik yazılmaz).
create or replace function public.g25_iscilik_carisi(p_cari text, p_proses text, p_onayda_cari boolean) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  c jsonb; tip text; fasoncu boolean; tan jsonb;
begin
  select to_jsonb(x) into c from public.cariler x where x.id::text = p_cari;
  if c is null then return format('cari %s yok', p_cari); end if;
  if coalesce((c ->> 'pasif')::boolean, false) then return format('cari %s pasif', p_cari); end if;
  tip := coalesce(c ->> 'tip', '');
  fasoncu := coalesce(c -> 'ek' ->> 'altTip', '') = 'Fasoncu';
  if tip = 'Müşteri' then return format('cari %s müşteri — müşteriye işçilik alacağı yazılmaz', p_cari); end if;
  if tip = 'Her İkisi' and not p_onayda_cari and not public.g25_onayli('cari|' || p_cari) then
    return format('cari %s hem müşteri hem tedarikçi — işçilik alıcısı olarak cari / muhasebe onayı gerekir', p_cari);
  end if;
  if tip not in ('Personel', 'Tedarikçi', 'Her İkisi') then return format('cari %s tipi (%s) işçilik alamaz', p_cari, tip); end if;
  if not fasoncu then
    select veri into tan from public.tanimlar where id = 'tekil';
    if exists (select 1 from jsonb_array_elements(case when jsonb_typeof(tan -> 'bolumler') = 'array' then tan -> 'bolumler' else '[]'::jsonb end) bo,
                      jsonb_array_elements(case when jsonb_typeof(bo -> 'personel') = 'array' then bo -> 'personel' else '[]'::jsonb end) pe
                where pe ->> 'cariId' = p_cari)
       or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(tan -> 'bolumler') = 'array' then tan -> 'bolumler' else '[]'::jsonb end) bo
                   where p_proses is not null and jsonb_typeof(bo -> 'prosesler') = 'array' and bo -> 'prosesler' ? p_proses) then
      return format('cari %s atölye içi bölüm personeli ya da proses bölüme bağlı — cariye işçilik yazılmaz', p_cari);
    end if;
  end if;
  return null;
end $$;
-- @@
-- ÜRETİM BAĞLANTISI (K4 + P1, 24 Kasım). İstekten YALNIZ hangi atamanın teslim edildiği alınır (alt'ta sunucuda kayıtlı, tamamlanmamış
-- bir atama "tamamlandı" yapılıyor); personel, miktar, ücret SUNUCUDAKİ atamadan ve ONAY DEFTERİNDEN okunur. Aynı istekte gelen
-- atama / ücret hiçbir şeyin dayanağı değildir (R1). Her satır için:
--   (a) ATAMA TESLİMİ: teslim edilen atamanın kayıtlı personeli = satırın carisi; miktar ≤ kayıtlı atama miktarı; ücret = onaylı ücret
--       (normal: proses|ürün|proses ya da numune|üretim|proses; tamir: tamir|atama — kısmi teslimden kalan tamir ataması kaynağının
--       onayını, kişi / ücret / proses aynı ve miktar onaylanandan küçük-eşitken kullanır)
--   (b) ARA PROSES: ara|ürün|ara proses onaylı ve onaydaki cari / ücret satırınkiyle aynı; miktar ≤ üretim adedi
--   (c) cari g25_iscilik_carisi'nden geçer; normal proseste o üretim + proses için ödenen toplam ≤ üretim adedi
--   (d) her atama / ara proses adımı bir kez: isc_odeme (kilitli; fişi iptal edilmişse yeniden açılır)
create or replace function public.g25_uretim_bagi(f jsonb, p_cari jsonb, p_kasa jsonb, p_alt jsonb) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  satirlar jsonb := public.stk_dizi(p_cari -> 'satirlar');
  uid_ text := nullif(f ->> 'uretimId', '');
  v_istek text := nullif(f ->> '__istek', '');
  u jsonb; adet numeric; c jsonb; e jsonb; m numeric; b numeric; t numeric;
  a jsonb; ap jsonb; v_ozet jsonb; v_anahtar text; v_hata text; v_id text; v_proses text;
  kullanilan text[] := '{}'; v_toplam numeric; v_numune boolean;
begin
  if jsonb_array_length(public.stk_dizi(p_kasa -> 'hareketler')) > 0 or jsonb_array_length(public.stk_dizi(p_kasa -> 'cekler')) > 0 then
    return 'üretim fişinde kasa / çek satırı var';
  end if;
  if uid_ is null then return 'fişin üretim kaydı yok'; end if;
  select to_jsonb(x) into u from public.uretim x where x.id::text = uid_;
  if u is null then return format('üretim kaydı %s sunucuda yok', uid_); end if;
  adet := coalesce(public.stk_sayi(u ->> 'adet'), public.stk_sayi(u -> 'ek' ->> 'adet'));
  for c in select x from jsonb_array_elements(satirlar) x loop
    e := case when jsonb_typeof(c -> 'ek') = 'object' then c -> 'ek' else '{}'::jsonb end;
    if coalesce(c ->> 'uretim_id', '') <> uid_ then return format('işçilik satırı %s başka üretim kaydına bağlı', c ->> 'id'); end if;
    if coalesce(e ->> 'islemTipi', '') <> 'İşçilik' then return format('cari satırı %s işçilik değil', c ->> 'id'); end if;
    if coalesce(c ->> 'yon', '') <> 'Alacak' then return format('işçilik satırı %s yönü Alacak değil', c ->> 'id'); end if;
    if coalesce(c ->> 'para_birimi', 'TRY') <> 'TRY' then return format('işçilik satırı %s TL değil', c ->> 'id'); end if;
    m := public.stk_sayi(e ->> 'miktar'); b := public.stk_sayi(e ->> 'birimFiyat'); t := public.stk_sayi(c ->> 'tutar');
    if m is null or b is null or t is null or m <= 0 or b <= 0 then return format('işçilik satırı %s miktar / ücret eksik', c ->> 'id'); end if;
    if abs(m * b - t) > 0.011 then return format('işçilik satırı %s tutarı miktar × ücretten farklı', c ->> 'id'); end if;
    if adet is not null and m > adet + 0.000001 then return format('işçilik satırı %s miktarı üretim adedinden (%s) büyük', c ->> 'id', adet); end if;
    v_hata := null; v_id := null; a := null;
    -- (a) Teslim edilen atama: alt'taki satır sunucuda KAYITLI, bu üretimin, tamamlanmamış ve istek onu tamamlıyor; kişi satırın carisi.
    --     Değerler KAYITLI satırdan. Kilit atama başına: eşzamanlı iki teslimden ikincisi birincinin sonucunu görür.
    for a in select to_jsonb(s) from public.uretim_atamalari s
              where s.uretim_id::text = uid_ and s.personel_id::text = c ->> 'cari_id' and not coalesce(s.tamamlandi_mi, false)
                and s.id::text in (select x ->> 'id' from jsonb_array_elements(public.stk_dizi(p_alt -> 'uretim_atamalari' -> 'satirlar')) x
                                    where coalesce((x ->> 'tamamlandi_mi')::boolean, false))
                and not (s.id::text = any (kullanilan))
              order by s.id loop
      perform pg_advisory_xact_lock(hashtextextended('g25_isc:atama:' || (a ->> 'id'), 0));
      if exists (select 1 from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek
                  where o.id = 'atama:' || (a ->> 'id') and not fs.iptal) then
        v_hata := format('atama %s için işçilik zaten ödenmiş', a ->> 'id'); continue;
      end if;
      if m > coalesce(public.stk_sayi(a ->> 'miktar'), 0) + 0.000001 then
        v_hata := format('işçilik miktarı (%s) atamanın kayıtlı miktarından (%s) büyük', m, a ->> 'miktar'); continue;
      end if;
      v_proses := a ->> 'proses';
      if coalesce((a ->> 'tamir_mi')::boolean, false) then
        v_anahtar := 'tamir|' || (a ->> 'id');
        v_ozet := public.g25_ucret_guncel(v_anahtar);
        if not public.g25_tamir_onayli(a ->> 'id') then
          v_hata := format('tamir ücreti (%s ₺) cari / muhasebe onayı bekliyor ya da onaydan sonra değişti', v_ozet ->> 'ucret'); continue;
        end if;
        if abs((v_ozet ->> 'ucret')::numeric - b) > 0.000001 then
          v_hata := format('ücret %s onaylı tamir ücretinden (%s) farklı', b, v_ozet ->> 'ucret'); continue;
        end if;
      else
        v_numune := public.stk_sayi(u -> 'ek' -> 'prosesUcretleri' ->> v_proses) is not null;
        v_anahtar := case when v_numune then 'numune|' || uid_ || '|' || v_proses else 'proses|' || (u ->> 'urun_id') || '|' || v_proses end;
        v_ozet := public.g25_ucret_guncel(v_anahtar);
        if not public.g25_onayli(v_anahtar) then
          v_hata := format('%s ücreti (%s ₺) cari / muhasebe onayı bekliyor ya da onaydan sonra değişti', v_proses, coalesce(v_ozet ->> 'ucret', 'tanımsız')); continue;
        end if;
        if abs((v_ozet ->> 'ucret')::numeric - b) > 0.000001 then
          v_hata := format('ücret %s onaylı %s ücretinden (%s) farklı', b, v_proses, v_ozet ->> 'ucret'); continue;
        end if;
        select coalesce(sum(o.miktar), 0) into v_toplam from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek
         where o.uretim_id = uid_ and o.proses = v_proses and not o.tamir and not fs.iptal;
        if adet is not null and v_toplam + m > adet + 0.000001 then
          v_hata := format('%s için ödenen işçilik (%s + %s) üretim adedini (%s) aşıyor', v_proses, v_toplam, m, adet); continue;
        end if;
      end if;
      v_hata := public.g25_iscilik_carisi(c ->> 'cari_id', v_proses, coalesce((a ->> 'tamir_mi')::boolean, false));
      if v_hata is not null then continue; end if;
      v_id := 'atama:' || (a ->> 'id');
      kullanilan := kullanilan || (a ->> 'id');
      delete from public.isc_odeme where id = v_id;
      insert into public.isc_odeme (id, uretim_id, proses, tamir, cari_id, miktar, ucret, istek)
      values (v_id, uid_, v_proses, coalesce((a ->> 'tamir_mi')::boolean, false), c ->> 'cari_id', m, b, v_istek);
      exit;
    end loop;
    if v_id is not null then continue; end if;
    -- (b) Ara proses: onaylı (ürün, ara proses) çözümünde cari ve ücret satırınkiyle aynı.
    for ap in select x from public.tanimlar t, jsonb_array_elements(case when jsonb_typeof(t.veri -> 'araProsesler') = 'array' then t.veri -> 'araProsesler' else '[]'::jsonb end) x
               where t.id = 'tekil' loop
      v_anahtar := 'ara|' || (u ->> 'urun_id') || '|' || (ap ->> 'id');
      v_ozet := public.g25_ucret_guncel(v_anahtar);
      if v_ozet is null or v_ozet ->> 'cari' is distinct from c ->> 'cari_id' or abs((v_ozet ->> 'ucret')::numeric - b) > 0.000001 then continue; end if;
      if not public.g25_onayli(v_anahtar) then
        v_hata := format('%s ara proses ücreti / carisi cari / muhasebe onayı bekliyor ya da onaydan sonra değişti', ap ->> 'ad'); continue;
      end if;
      v_hata := public.g25_iscilik_carisi(c ->> 'cari_id', ap ->> 'ad', true);
      if v_hata is not null then continue; end if;
      v_id := 'ara:' || uid_ || ':' || (ap ->> 'id');
      perform pg_advisory_xact_lock(hashtextextended('g25_isc:' || v_id, 0));
      if exists (select 1 from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.id = v_id and not fs.iptal) then
        v_hata := format('%s ara prosesinin işçiliği bu üretim için zaten ödenmiş', ap ->> 'ad'); v_id := null; continue;
      end if;
      delete from public.isc_odeme where id = v_id;
      insert into public.isc_odeme (id, uretim_id, proses, tamir, cari_id, miktar, ucret, istek)
      values (v_id, uid_, ap ->> 'ad', false, c ->> 'cari_id', m, b, v_istek);
      exit;
    end loop;
    if v_id is null then
      return coalesce(v_hata, format('işçilik satırı %s için cari %s teslim edilen kayıtlı bir atamaya ya da onaylı bir ara prosese bağlı değil', c ->> 'id', c ->> 'cari_id'));
    end if;
  end loop;
  return null;
end $$;
-- @@
-- ONAY LİSTESİ (görüntüleme: üretim / stok / fişler / sipariş / cari / muhasebe). Kapsam: 'acik' (varsayılan) = tamamlanmamış
-- atamaları olan üretimlerin proses / numune / tamir / ara proses anahtarları + Her İkisi tipindeki personeller; 'tum' = ayrıca bütün
-- ürünlerin proses ücretleri ve ara prosesleri (ilk toplu onay için). Her kalem: anahtar, tür, açıklama, şu anki özet, onaylı mı,
-- son onaylanan özet / kim / ne zaman. Para tutarı üretim kullanıcısına da görünür (ürün kartında zaten görüyor).
create or replace function public.ucret_onaylari(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  kapsam text := coalesce(p ->> 'kapsam', 'acik');
begin
  perform public.g25_yetki_iste(array['uretim', 'stok', 'fisler', 'siparis', 'cari', 'muhasebe'], 'goruntuleme', 'ücret onayları');
  return coalesce((
    with acik as (
      select distinct u.id::text as uid, u.urun_id::text as urun, u.siparis_no, a.id::text as aid, a.proses, a.personel_id::text as personel,
             coalesce(a.tamir_mi, false) as tamir, coalesce(public.stk_sayi(a.tamir_ucret::text), 0) as tamir_ucret,
             public.stk_sayi(u.ek -> 'prosesUcretleri' ->> a.proses) as numune
        from public.uretim u join public.uretim_atamalari a on a.uretim_id::text = u.id::text
       where not coalesce(a.tamamlandi_mi, false)),
    araproses as (
      select x ->> 'id' as id, x ->> 'ad' as ad from public.tanimlar t,
             jsonb_array_elements(case when jsonb_typeof(t.veri -> 'araProsesler') = 'array' then t.veri -> 'araProsesler' else '[]'::jsonb end) x
       where t.id = 'tekil'),
    anahtarlar as (
      select distinct case when numune is not null then 'numune|' || uid || '|' || proses else 'proses|' || urun || '|' || proses end as anahtar,
             case when numune is not null then 'numune' else 'proses' end as tur, urun, uid, siparis_no, proses
        from acik where not tamir
      union select 'tamir|' || aid, 'tamir', urun, uid, siparis_no, proses from acik where tamir and tamir_ucret > 0
      union select distinct 'ara|' || acik.urun || '|' || ap.id, 'ara', acik.urun, null, null, ap.ad from acik cross join araproses ap
      union select distinct 'cari|' || c.id::text, 'cari', null, null, null, null from acik join public.cariler c on c.id::text = acik.personel where c.tip = 'Her İkisi'
      union select 'proses|' || x.id::text || '|' || k.key, 'proses', x.id::text, null, null, k.key
        from public.urunler x, jsonb_each(case when jsonb_typeof(to_jsonb(x) -> 'proses_ucretleri') = 'object' then to_jsonb(x) -> 'proses_ucretleri' else '{}'::jsonb end) k
       where kapsam = 'tum'
      union select 'ara|' || x.id::text || '|' || ap.id, 'ara', x.id::text, null, null, ap.ad from public.urunler x cross join araproses ap
       where kapsam = 'tum' and (to_jsonb(x) -> 'ek' -> 'araProsesEklentileri')::text like '%"' || ap.id || '"%')
    select jsonb_agg(jsonb_build_object('anahtar', k.anahtar, 'tur', k.tur, 'urunId', k.urun,
             'urunAd', (select x.ad from public.urunler x where x.id::text = k.urun), 'uretimId', k.uid, 'siparisNo', k.siparis_no, 'proses', k.proses,
             'guncel', g.ozet, 'onayli', case when k.tur = 'tamir' then public.g25_tamir_onayli(split_part(k.anahtar, '|', 2)) else o.ozet is not null and o.ozet = g.ozet end, 'onaylanan', o.ozet, 'onaylayan', o.onaylayan, 'onayZamani', o.onay_zamani)
           order by (o.ozet is not null and o.ozet = g.ozet), k.tur, k.anahtar)
      from anahtarlar k
      cross join lateral (select public.g25_ucret_guncel(k.anahtar) as ozet) g
      left join public.ucr_onay o on o.anahtar = k.anahtar
     where g.ozet is not null and (k.tur <> 'ara' or (g.ozet ->> 'ucret')::numeric > 0)), '[]'::jsonb);
end $$;
-- @@
-- ONAYLA (cari / muhasebe kaydetme). p.kalemler: [{anahtar, ozet, yeniUcret?}] — TEK işlem, hepsi ya da hiçbiri.
-- `ozet`: onaylayanın EKRANDA GÖRDÜĞÜ özet; şu anki özetle aynı olmalı (arada biri ücreti / miktarı değiştirdiyse ret — eski görüntü
-- onaylanmaz). `yeniUcret` yalnız tamirde: yetkili ücreti kendisi belirler (atamanın tamir ücreti güncellenir, sonra onaylanır;
-- tamamlanmış atamada olmaz). Proses / ara proses ücretini değiştirmek için ürün kartı / Tanımlar kullanılır, sonra onaylanır.
create or replace function public.ucret_onayla(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  k jsonb; v_anahtar text; v_tur text; v_guncel jsonb; v_gorulen jsonb; v_yeni numeric; sonuc jsonb := '[]'::jsonb;
  eposta text := lower(coalesce(auth.jwt() ->> 'email', 'yonetim'));
begin
  perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'kaydetme', 'işçilik ücreti onayı');
  if jsonb_typeof(p -> 'kalemler') <> 'array' or jsonb_array_length(p -> 'kalemler') = 0 then
    raise exception 'Onaylanacak kalem yok' using errcode = '22023';
  end if;
  for k in select x from jsonb_array_elements(p -> 'kalemler') x loop
    v_anahtar := coalesce(k ->> 'anahtar', '');
    v_tur := split_part(v_anahtar, '|', 1);
    if v_tur not in ('proses', 'numune', 'ara', 'tamir', 'cari') then raise exception 'Bilinmeyen onay anahtarı: %', v_anahtar using errcode = '22023'; end if;
    perform pg_advisory_xact_lock(hashtextextended('g25_onay:' || v_anahtar, 0));
    v_gorulen := k -> 'ozet';
    v_yeni := public.stk_sayi(k ->> 'yeniUcret');
    if v_yeni is not null then
      if v_tur <> 'tamir' then raise exception 'Ücret burada yalnız tamirde belirlenir (%): ürün kartından / Tanımlar''dan değiştirip onaylayın', v_anahtar using errcode = '22023'; end if;
      if v_yeni < 0 then raise exception 'Tamir ücreti eksi olamaz' using errcode = '22023'; end if;
      update public.uretim_atamalari set tamir_ucret = v_yeni
       where id::text = split_part(v_anahtar, '|', 2) and coalesce(tamir_mi, false) and not coalesce(tamamlandi_mi, false);
      if not found then raise exception 'Tamir ataması yok ya da tamamlanmış: %', v_anahtar using errcode = 'P0002'; end if;
      v_gorulen := jsonb_set(coalesce(v_gorulen, '{}'::jsonb), '{ucret}', to_jsonb(v_yeni));
    end if;
    v_guncel := public.g25_ucret_guncel(v_anahtar);
    if v_guncel is null then raise exception 'Onaylanacak değer yok (kaynak silinmiş ya da ücret tanımsız): %', v_anahtar using errcode = 'P0002'; end if;
    if v_gorulen is distinct from v_guncel then
      raise exception 'Onaylanan değer güncel değil (%): ekranda % — sunucuda %. Listeyi yenileyip yeniden onaylayın', v_anahtar, v_gorulen, v_guncel using errcode = 'KR015';
    end if;
    insert into public.ucr_onay (anahtar, tur, ozet, onaylayan, onay_zamani)
    values (v_anahtar, v_tur, v_guncel, eposta, now())
    on conflict (anahtar) do update set onceki = jsonb_build_object('ozet', ucr_onay.ozet, 'onaylayan', ucr_onay.onaylayan, 'zaman', ucr_onay.onay_zamani),
      ozet = excluded.ozet, onaylayan = excluded.onaylayan, onay_zamani = excluded.onay_zamani;
    sonuc := sonuc || jsonb_build_object('anahtar', v_anahtar, 'ozet', v_guncel);
  end loop;
  return jsonb_build_object('onaylanan', sonuc);
end $$;
-- @@
revoke all on function public.ucret_onaylari(jsonb), public.ucret_onayla(jsonb) from public, anon
-- @@
grant execute on function public.ucret_onaylari(jsonb), public.ucret_onayla(jsonb) to authenticated
-- @@
revoke all on function public.g25_ucret_guncel(text), public.g25_onayli(text), public.g25_tamir_onayli(text), public.g25_iscilik_carisi(text, text, boolean) from public, anon, authenticated
-- @@
-- MESAİ ANAHTARI — 1.744.36 015 mesaiFisNo ile aynı: MESAI-YYYY-MM-<cari kodu (sayısal, > 0) 4 haneye tamamlanmış | cari kimliği>.
-- Aynı personel + ay için tahakkuk bu anahtarla tektir (cari kartından eski yol da, mesai_onayla da aynı anahtarı taşır).
create or replace function public.g25_mesai_anahtari(p_cari text, p_ay text) returns text
language sql stable security definer set search_path = public as $$
  select 'MESAI-' || p_ay || '-' || coalesce((
    select case when k ~ '^[0-9]+\Z' and k::numeric > 0 then case when length(k) >= 4 then k else lpad(k, 4, '0') end end
      from (select btrim(coalesce(to_jsonb(c) ->> 'kod', '')) as k from public.cariler c where c.id::text = p_cari) x), p_cari)
$$;
-- @@
-- Geçerli (iptal edilmemiş satır, fişi iptal edilmemiş) mesai tahakkuku var mı → fiş no.
create or replace function public.g25_mesai_tahakkuku(p_cari text, p_anahtar text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(h.fis_no, h.id::text) from public.car_hareket h left join public.stk_fis f on f.id = h.fis_no
   where h.cari_id::text = p_cari and not h.iptal and not coalesce(f.iptal, false)
     and (h.ek ->> 'mesaiAnahtari' = p_anahtar or h.fis_no = p_anahtar)
   limit 1
$$;
-- @@
-- Bildirilen saatlerin tutarı — 1.744.36 015 mesaiHesapla ile aynı: saat ücreti = maaş ÷ aylık saat (personelin; yoksa mesaiAyar;
-- yoksa 225); tutar = saat ücreti × (hafta içi × kat + Cumartesi × kat + Pazar × kat), kuruşa yuvarlı. Maaş yoksa null.
create or replace function public.g25_mesai_tutari(p_cari text, p_saatler jsonb) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare
  t jsonb; pe jsonb; ayar jsonb; maas numeric; saat numeric;
begin
  select veri into t from public.tanimlar where id = 'tekil';
  select x into pe from jsonb_array_elements(case when jsonb_typeof(t -> 'bolumler') = 'array' then t -> 'bolumler' else '[]'::jsonb end) bo,
                        jsonb_array_elements(case when jsonb_typeof(bo -> 'personel') = 'array' then bo -> 'personel' else '[]'::jsonb end) x
   where x ->> 'cariId' = p_cari limit 1;
  maas := public.stk_sayi(pe ->> 'maas');
  if maas is null or maas <= 0 then return null; end if;
  ayar := '{"aylikSaat": 225, "haftaIci": 1.5, "cumartesi": 1.5, "pazar": 2}'::jsonb
          || coalesce(case when jsonb_typeof(t -> 'mesaiAyar') = 'object' then jsonb_strip_nulls(t -> 'mesaiAyar') end, '{}'::jsonb);
  saat := coalesce(nullif(public.stk_sayi(pe ->> 'aylikSaat'), 0), public.stk_sayi(ayar ->> 'aylikSaat'));
  if saat is null or saat <= 0 then saat := 225; end if;
  return round(maas / saat * (coalesce(public.stk_sayi(p_saatler ->> 'haftaIci'), 0) * public.stk_sayi(ayar ->> 'haftaIci')
                            + coalesce(public.stk_sayi(p_saatler ->> 'cumartesi'), 0) * public.stk_sayi(ayar ->> 'cumartesi')
                            + coalesce(public.stk_sayi(p_saatler ->> 'pazar'), 0) * public.stk_sayi(ayar ->> 'pazar')), 2);
end $$;
-- @@
-- KAYDETME DENETİMİ — tek fiş (ana ya da bağlı). Cari satırı yoksa kural yok; PARA yetkilisi (Yönetici dahil) bugünkü gibi geçer.
create or replace function public.g25_fis_cari_yetki_tek(f jsonb, p_stok jsonb, p_cari jsonb, p_kasa jsonb, p_alt jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  onek text := coalesce(f ->> 'onek', '');
  ne text := coalesce(nullif(f ->> 'tur', ''), onek, 'fiş');
  grup text;
  hata text;
  c jsonb; v_anahtar text; v_var text;
begin
  if jsonb_array_length(public.stk_dizi(p_cari -> 'satirlar')) = 0 then return; end if;
  -- MESAİ ÇİFT TAHAKKUK (K2, bütünlük — yetkiden bağımsız): aynı personel + ay anahtarıyla geçerli tahakkuk varsa ikinci MS yazılmaz.
  -- Anahtar başına kilit: iki eşzamanlı istek (eski yoldan cari kartı + mesai_onayla, ya da iki onay) sırayla denetlenir.
  if onek = 'MS' then
    for c in select x from jsonb_array_elements(public.stk_dizi(p_cari -> 'satirlar')) x loop
      v_anahtar := nullif(c -> 'ek' ->> 'mesaiAnahtari', '');
      if v_anahtar is not null then
        perform pg_advisory_xact_lock(hashtextextended('g25_mesai:' || (c ->> 'cari_id') || ':' || v_anahtar, 0));
        v_var := public.g25_mesai_tahakkuku(c ->> 'cari_id', v_anahtar);
        if v_var is not null then
          raise exception 'Bu personelin bu ayki mesaisi zaten tahakkuk etmiş (%) — ikinci kez yazılmaz', v_var using errcode = 'KR014';
        end if;
      end if;
    end loop;
  end if;
  if auth.jwt() is null then return; end if;
  if coalesce(public.yetki_var_mi(array['cari', 'muhasebe'], 'kaydetme'), false) then return; end if;
  grup := case when onek in ('AF', 'SF') and coalesce(f ->> 'aile', '') = 'stok' and jsonb_array_length(public.stk_dizi(p_stok -> 'satirlar')) > 0 then 'stok'
               when onek = 'ÜRT' then 'uretim' else 'para' end;
  if grup = 'para' then
    perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'kaydetme', ne || ' (cari hareketi)');
  elsif grup = 'stok' then
    perform public.g25_yetki_iste(array['stok', 'fisler', 'siparis', 'uretim'], 'kaydetme', ne);
    hata := public.g25_stok_bagi(f, p_stok, p_cari, p_kasa);
  else
    perform public.g25_yetki_iste(array['uretim', 'stok', 'fisler', 'siparis'], 'kaydetme', ne);
    if nullif(f ->> '__istek', '') is null then raise exception 'Üretim fişinde istek kimliği yok' using errcode = '22023'; end if;
    hata := public.g25_uretim_bagi(f, p_cari, p_kasa, p_alt);
  end if;
  if hata is not null then
    raise exception 'Cari hareketi gerçek bir % işlemine bağlı değil (%) — bu kayıt için cari veya muhasebe kaydetme yetkisi gerekir',
      case grup when 'stok' then 'stok' else 'üretim' end, hata using errcode = '42501';
  end if;
end $$;
-- @@
create or replace function public.g25_fis_cari_yetki(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- İstek kimliği ÜRT ödeme kaydına (isc_odeme → stk_fis.istek) bağ olur: fiş iptal edilince ödeme geçersiz sayılır.
  perform public.g25_fis_cari_yetki_tek(coalesce(p -> 'fis', '{}'::jsonb) || jsonb_build_object('__istek', p ->> 'istek'), p -> 'stok', p -> 'cari', p -> 'kasa', p -> 'alt');
  if jsonb_typeof(p -> 'bagli') = 'object' then
    perform public.g25_fis_cari_yetki_tek(p -> 'bagli' -> 'fis', p -> 'bagli' -> 'stok', p -> 'bagli' -> 'cari', p -> 'bagli' -> 'kasa', null);
  end if;
end $$;
-- @@
-- İPTAL DENETİMİ (K5): grup KAYITLI fişin içeriğinden (istemcinin gönderdiğinden değil); ana fiş + bağlı fiş.
create or replace function public.g25_fis_iptal_yetki(p_no text) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  fis public.stk_fis;
  h text;
  stoklu boolean; carili boolean; kasali boolean; grup text;
begin
  if auth.jwt() is null then return; end if;
  for h in select x from unnest(array[p_no, (select ff.bagli_fis from public.stk_fis ff where ff.id = p_no)]) x where x is not null loop
    select * into fis from public.stk_fis where id = h;
    if not found then continue; end if;
    stoklu := exists (select 1 from public.stk_hareket where fis_id = h);
    carili := exists (select 1 from public.car_hareket where fis_no = h);
    kasali := exists (select 1 from public.kas_hareket where fis_id = h) or exists (select 1 from public.fis_cek_iz where fis_id = h);
    if kasali then
      perform public.g25_yetki_iste(array['muhasebe', 'fisler', 'cari'], 'silme', 'kasa / banka / çek satırlı fişin iptali (' || h || ')');
    end if;
    if carili and not coalesce(public.yetki_var_mi(array['cari', 'muhasebe'], 'silme'), false) then
      grup := case
        when fis.onek in ('AF', 'SF') and fis.aile = 'stok' and stoklu
             and not exists (select 1 from public.car_hareket c where c.fis_no = h
                              and not exists (select 1 from public.stk_hareket s where s.fis_id = h and s.id::text = c.id::text)) then 'stok'
        when fis.onek = 'ÜRT'
             and not exists (select 1 from public.car_hareket c where c.fis_no = h and coalesce(c.ek ->> 'islemTipi', '') <> 'İşçilik') then 'uretim'
        else 'para' end;
      if grup = 'stok' then
        perform public.g25_yetki_iste(array['stok', 'fisler', 'siparis', 'uretim'], 'silme', 'stok fişinin iptali (' || h || ')');
      elsif grup = 'uretim' then
        perform public.g25_yetki_iste(array['uretim', 'stok', 'fisler', 'siparis'], 'silme', 'üretim fişinin iptali (' || h || ')');
      else
        perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'silme', 'cari hareketli fişin iptali (' || h || ')');
      end if;
    end if;
  end loop;
end $$;
-- @@
-- MESAİ BİLDİRİMİ (K2): saat — para değil. Onay (mesai_onayla) MS fişini keser.
create table public.mes_bildirim (
  id text primary key,
  cari_id text not null,
  ay text not null check (ay ~ '^[0-9]{4}-(0[1-9]|1[0-2])\Z'),
  saatler jsonb not null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'onaylandi', 'iptal')),
  giren text,
  giris_zamani timestamptz not null default now(),
  guncelleme timestamptz,
  onaylayan text,
  onay_zamani timestamptz,
  fis_no text
)
-- @@
create unique index mes_bildirim_acik on public.mes_bildirim (cari_id, ay) where durum <> 'iptal'
-- @@
alter table public.mes_bildirim enable row level security
-- @@
revoke all on public.mes_bildirim from public, anon, authenticated
-- @@
create or replace function public.mesai_bildir(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cari text := nullif(btrim(coalesce(p ->> 'cariId', '')), '');
  v_ay text := coalesce(p ->> 'ay', '');
  v_saat jsonb;
  k text; n numeric; v_var text;
  b public.mes_bildirim;
  eposta text := lower(auth.jwt() ->> 'email');
begin
  perform public.g25_yetki_iste(array['uretim', 'cari', 'muhasebe'], 'kaydetme', 'mesai saati bildirimi');
  if v_ay !~ '^[0-9]{4}-(0[1-9]|1[0-2])\Z' then raise exception 'Ay YYYY-AA olmalı' using errcode = '22023'; end if;
  if v_cari is null or not exists (
      select 1 from public.tanimlar t, jsonb_array_elements(case when jsonb_typeof(t.veri -> 'bolumler') = 'array' then t.veri -> 'bolumler' else '[]'::jsonb end) bo,
                    jsonb_array_elements(case when jsonb_typeof(bo -> 'personel') = 'array' then bo -> 'personel' else '[]'::jsonb end) pe
       where t.id = 'tekil' and pe ->> 'cariId' = v_cari) then
    raise exception 'Mesai yalnız bir bölümün personeline bildirilir' using errcode = '22023';
  end if;
  v_saat := '{}'::jsonb;
  foreach k in array array['haftaIci', 'cumartesi', 'pazar'] loop
    n := coalesce(public.stk_sayi(p -> 'saatler' ->> k), 0);
    if n < 0 or n > 744 then raise exception 'Mesai saati 0–744 arası olmalı (%)', k using errcode = '22023'; end if;
    v_saat := v_saat || jsonb_build_object(k, n);
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('mes_bildirim:' || v_cari || ':' || v_ay, 0));
  v_var := public.g25_mesai_tahakkuku(v_cari, public.g25_mesai_anahtari(v_cari, v_ay));
  if v_var is not null then
    raise exception 'Bu ayın mesaisi tahakkuk etmiş (fiş %) — değiştirilemez', v_var using errcode = 'KR014';
  end if;
  select * into b from public.mes_bildirim where cari_id = v_cari and ay = v_ay and durum <> 'iptal' for update;
  if found then
    -- onaylıydı ama fişi iptal edilmişse (tahakkuk yok — yukarıda denetlendi) bildirim yeniden bekler
    update public.mes_bildirim set saatler = v_saat, giren = eposta, guncelleme = now(), durum = 'bekliyor', onaylayan = null, onay_zamani = null, fis_no = null
     where id = b.id returning * into b;
  else
    insert into public.mes_bildirim (id, cari_id, ay, saatler, giren) values ('mes-' || gen_random_uuid()::text, v_cari, v_ay, v_saat, eposta)
    returning * into b;
  end if;
  return jsonb_build_object('id', b.id, 'cariId', b.cari_id, 'ay', b.ay, 'saatler', b.saatler, 'durum', b.durum);
end $$;
-- @@
create or replace function public.mesai_bildirimleri(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.g25_yetki_iste(array['uretim', 'cari', 'muhasebe'], 'goruntuleme', 'mesai bildirimleri');
  return coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'cariId', b.cari_id, 'ay', b.ay, 'saatler', b.saatler, 'durum', b.durum,
      'giren', b.giren, 'girisZamani', b.giris_zamani, 'onaylayan', b.onaylayan, 'onayZamani', b.onay_zamani, 'fisNo', b.fis_no,
      'anahtar', public.g25_mesai_anahtari(b.cari_id, b.ay),
      'hesaplananTutar', case when auth.jwt() is null or coalesce(public.yetki_var_mi(array['cari', 'muhasebe'], 'goruntuleme'), false)
                              then public.g25_mesai_tutari(b.cari_id, b.saatler) end) order by b.ay desc, b.cari_id)
    from public.mes_bildirim b
   where (nullif(p ->> 'ay', '') is null or b.ay = p ->> 'ay') and (nullif(p ->> 'durum', '') is null or b.durum = p ->> 'durum')), '[]'::jsonb);
end $$;
-- @@
create or replace function public.mesai_bildirim_iptal(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.mes_bildirim;
begin
  perform public.g25_yetki_iste(array['uretim', 'cari', 'muhasebe'], 'kaydetme', 'mesai bildiriminin iptali');
  select * into b from public.mes_bildirim where id = p ->> 'id' for update;
  if not found or b.durum <> 'bekliyor' then raise exception 'Bekleyen bildirim bulunamadı' using errcode = 'P0002'; end if;
  update public.mes_bildirim set durum = 'iptal', guncelleme = now() where id = b.id;
  return jsonb_build_object('id', b.id, 'durum', 'iptal');
end $$;
-- @@
-- ONAY (K2): PARA kaydetme. Bekleyen bildirim kilitlenir, MS fişi kesilir, bildirim onaylanır — tek işlem.
create or replace function public.mesai_onayla(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.mes_bildirim;
  fp jsonb := p -> 'fis';
  satirlar jsonb;
  v_satir jsonb;
  v_anahtar text;
  v_tutar numeric;
  r jsonb;
begin
  perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'kaydetme', 'mesai tahakkukunun onayı');
  select * into b from public.mes_bildirim where id = p ->> 'bildirimId' for update;
  if not found or b.durum = 'iptal' then raise exception 'Mesai bildirimi bulunamadı' using errcode = 'P0002'; end if;
  v_anahtar := public.g25_mesai_anahtari(b.cari_id, b.ay);
  -- İkinci / eşzamanlı onay: ilki işlemi bitirene kadar FOR UPDATE'te bekler, sonra onaylı + geçerli fişi görür → yeni fiş YOK.
  if b.durum = 'onaylandi' and public.g25_mesai_tahakkuku(b.cari_id, v_anahtar) is not null then
    return jsonb_build_object('fisNo', b.fis_no, 'zatenVar', true, 'bildirimId', b.id);
  end if;
  satirlar := public.stk_dizi(fp -> 'cari' -> 'satirlar');
  if coalesce(fp -> 'fis' ->> 'onek', '') <> 'MS' or jsonb_array_length(satirlar) <> 1
     or satirlar -> 0 ->> 'cari_id' is distinct from b.cari_id or coalesce(fp -> 'fis' ->> 'cariId', b.cari_id) <> b.cari_id
     or coalesce(satirlar -> 0 ->> 'yon', '') <> 'Alacak' or coalesce(satirlar -> 0 ->> 'para_birimi', 'TRY') <> 'TRY'
     or jsonb_array_length(public.stk_dizi(fp -> 'stok' -> 'satirlar')) > 0 or jsonb_array_length(public.stk_dizi(fp -> 'kasa' -> 'hareketler')) > 0
     or jsonb_typeof(fp -> 'bagli') = 'object' then
    raise exception 'Mesai onayı tek satırlık (Alacak, TRY) MS fişi olmalı ve bildirimin personeline yazılmalı' using errcode = '22023';
  end if;
  -- TUTAR bildirilen saatlerden sunucuda hesaplanır; onaylanan tutar onunla aynı olmalı (onaylanan saat ↔ para bağı).
  v_tutar := public.g25_mesai_tutari(b.cari_id, b.saatler);
  if v_tutar is null then raise exception 'Personelin maaşı tanımlı değil — mesai tutarı hesaplanamaz' using errcode = '22023'; end if;
  if abs(coalesce(public.stk_sayi(satirlar -> 0 ->> 'tutar'), -1) - v_tutar) > 0.011 then
    raise exception 'Mesai tutarı bildirilen saatlerden hesaplanan % ₺ ile aynı değil (gelen %)', v_tutar, satirlar -> 0 ->> 'tutar' using errcode = '22023';
  end if;
  -- Anahtar ve bildirim bağı SUNUCUDAN (istemcinin yazdığı değil): çift tahakkuk denetimi fis_kes içinde bu anahtarla yapılır.
  v_satir := jsonb_set(satirlar -> 0, '{ek}', coalesce(case when jsonb_typeof(satirlar -> 0 -> 'ek') = 'object' then satirlar -> 0 -> 'ek' end, '{}'::jsonb)
             || jsonb_build_object('mesaiAnahtari', v_anahtar, 'mesaiBildirimId', b.id, 'islemTipi', 'Mesai'));
  fp := jsonb_set(fp, '{cari,satirlar}', jsonb_build_array(v_satir));
  fp := jsonb_set(fp, '{fis,ek}', coalesce(case when jsonb_typeof(fp -> 'fis' -> 'ek') = 'object' then fp -> 'fis' -> 'ek' end, '{}'::jsonb)
             || jsonb_build_object('mesaiAnahtari', v_anahtar, 'mesaiBildirimId', b.id));
  r := public.fis_kes(fp);
  update public.mes_bildirim set durum = 'onaylandi', onaylayan = lower(auth.jwt() ->> 'email'), onay_zamani = now(),
         fis_no = r ->> 'fisNo', guncelleme = now() where id = b.id;
  return r || jsonb_build_object('bildirimId', b.id, 'tutar', v_tutar);
end $$;
-- @@
revoke all on function public.mesai_bildir(jsonb), public.mesai_bildirimleri(jsonb), public.mesai_bildirim_iptal(jsonb), public.mesai_onayla(jsonb) from public, anon
-- @@
grant execute on function public.mesai_bildir(jsonb), public.mesai_bildirimleri(jsonb), public.mesai_bildirim_iptal(jsonb), public.mesai_onayla(jsonb) to authenticated
-- @@
revoke all on function public.g25_yetki_iste(text[], text, text), public.g25_stok_bagi(jsonb, jsonb, jsonb, jsonb),
  public.g25_uretim_bagi(jsonb, jsonb, jsonb, jsonb), public.g25_fis_cari_yetki_tek(jsonb, jsonb, jsonb, jsonb, jsonb),
  public.g25_fis_cari_yetki(jsonb), public.g25_fis_iptal_yetki(text), public.g25_mesai_anahtari(text, text),
  public.g25_mesai_tahakkuku(text, text), public.g25_mesai_tutari(text, jsonb) from public, anon, authenticated
-- @@
-- ÜCRET KORUMASI (K2): personel maaşı / aylık saati ve mesai katları yalnız PARA kaydetme ile değişir.
create or replace function public.g25_ucret_ozeti(t jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'personel', coalesce((select jsonb_object_agg(pe ->> 'cariId', jsonb_build_object('maas', pe -> 'maas', 'aylikSaat', pe -> 'aylikSaat'))
        from jsonb_array_elements(case when jsonb_typeof(t -> 'bolumler') = 'array' then t -> 'bolumler' else '[]'::jsonb end) bo,
             jsonb_array_elements(case when jsonb_typeof(bo -> 'personel') = 'array' then bo -> 'personel' else '[]'::jsonb end) pe
       where coalesce(pe ->> 'cariId', '') <> ''), '{}'::jsonb),
    'mesaiAyar', coalesce(t -> 'mesaiAyar', 'null'::jsonb))
$$;
-- @@
create or replace function public.g25_tanimlar_ucret_koruma() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  onceki jsonb;
begin
  if auth.jwt() is null or coalesce(new.id, '') <> 'tekil' then return new; end if;
  -- UPSERT (24 Kasım): istemci tanımları "insert … on conflict do update" ile yazar; önce BEFORE INSERT çalışır. INSERT'te eski hâl
  -- satır zaten VARSA odur ({} değil) — yoksa PARA'sız kullanıcının maaşa dokunmayan her tanım kaydı reddedilirdi (ekran ölçümü yakaladı).
  if tg_op = 'INSERT' then
    select t.veri into onceki from public.tanimlar t where t.id = new.id;
    onceki := coalesce(onceki, '{}'::jsonb);
  else
    onceki := old.veri;
  end if;
  if public.g25_ucret_ozeti(onceki) is not distinct from public.g25_ucret_ozeti(new.veri) then
    return new;
  end if;
  perform public.g25_yetki_iste(array['cari', 'muhasebe'], 'kaydetme', 'maaş, aylık çalışma saati ya da mesai katı değişikliği');
  return new;
end $$;
-- @@
revoke all on function public.g25_ucret_ozeti(jsonb), public.g25_tanimlar_ucret_koruma() from public, anon, authenticated
-- @@
create trigger g25_tanimlar_ucret_koruma before insert or update on public.tanimlar for each row execute function public.g25_tanimlar_ucret_koruma()
