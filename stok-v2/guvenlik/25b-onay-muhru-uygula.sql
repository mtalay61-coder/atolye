-- =====================================================================================================================
--  25b-onay-muhru-uygula.sql — G-25 EK: ONAY GEÇERSİZLİK MÜHRÜ (YAZAR; YALNIZ G-25'İ ZATEN UYGULANMIŞ veritabanı için)
--  G-25 — car_yaz YETKİ GENİŞLİĞİ (stok-v2/guvenlik/25-G25-TASARIM.md). ÜRETİLMİŞ DOSYA — elle düzenlenmez:
--  python3 stok-v2/guvenlik/25-uret.py (kaynak: 25-kaynak/yeni.sql + editor/15-duzeltme.sql car_yaz + editor/18-fis-defteri.sql
--  fis_kes / fis_iptal). Gövde özetleri Faz 0.4 envanterinin formülüyle (yorum / boşluk normalize, md5).
--  NEDEN (deneme projesi, 25 Kasım, Test 12): onay geçerliliği "onaylanan özet == güncel özet" idi. Ürünün Kesim ücreti 35 → 40 → 35
--  yapılınca 40'ta onay düşüyor, 35'e dönünce ESKİ ONAY KENDİLİĞİNDEN CANLANIYORDU (yeni muhasebe onayı olmadan teslim geçerdi).
--  NE YAPAR: ucr_onay'a `gecersiz` sütunu; ücretin / işin kaynağı değişen işlemin sonunda (ertelenmiş kısıt tetikleyicileri
--  g25_onay_degisim_urunler, g25_onay_degisim_uretim, g25_onay_degisim_atama, g25_onay_degisim_tanimlar) özeti artık güncel olmayan onaylar KALICI düşer; g25_onayli mühürlü onayı geçersiz sayar;
--  ucret_onayla yeni onayda mührü kaldırır. Meşru kısmi teslim (aynı işlemde 10 → 6 + 4) mühür basmaz. Veri silmez; var olan onaylara
--  dokunmaz (şu an geçerli olan geçerli kalır, geçersiz olan geçersiz kalır).
--  ÖNKOŞUL (biri tutmazsa HATA, hiçbir şey değişmez): postgres; G-25 uygulanmış (guvenlik.g25_yedek, ucr_onay); mühür henüz yok.
--  Tam paket (25-cari-yetki-uygula.sql) bu eki ZATEN içerir — yeni kurulumda ayrıca çalıştırılmaz. Geri alma: 25-cari-yetki-geri-al.sql
--  (G-25'in tamamını geri alır; yalnız mührü geri alan ayrı dosya yok).
--  Çalıştırma: Supabase › SQL Editor (postgres) › dosyanın TAMAMI › Run. Tek do bloğu (ya hepsi ya hiçbiri).
-- =====================================================================================================================
begin;

do $$
begin
  if current_user <> 'postgres' then
    raise exception 'Bu dosya postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('guvenlik.g25_yedek') is null or to_regclass('public.ucr_onay') is null then
    raise exception 'G-25 uygulanmamış — önce 25-cari-yetki-uygula.sql (mührü zaten içerir). Hiçbir şey değişmedi.';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ucr_onay' and column_name = 'gecersiz')
     or to_regprocedure('public.g25_onay_degisim()') is not null or exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_urunler') or exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_uretim') or exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_atama') or exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_tanimlar') then
    raise exception 'Onay mührü zaten var (kısmen ya da tamamen) — sessizce değiştirilmez. Hiçbir şey değişmedi.';
  end if;

  alter table public.ucr_onay add column gecersiz jsonb;
  create or replace function public.g25_onayli(p_anahtar text) returns boolean
  language sql stable security definer set search_path = public as '
    select exists (select 1 from public.ucr_onay o where o.anahtar = p_anahtar and o.gecersiz is null and o.ozet = public.g25_ucret_guncel(p_anahtar)
                    and not coalesce((o.ozet ->> ''karisik'')::boolean, false))
  ';
  create or replace function public.g25_onay_degisim() returns trigger
  language plpgsql security definer set search_path = public as '
  declare
    v_uretimler text[];
    v_urun text;
  begin
    if TG_TABLE_NAME = ''uretim_atamalari'' then
      v_uretimler := array_remove(array[case when TG_OP <> ''DELETE'' then NEW.uretim_id::text end, case when TG_OP <> ''INSERT'' then OLD.uretim_id::text end], null);
    elsif TG_TABLE_NAME = ''uretim'' then
      v_uretimler := array[case when TG_OP = ''DELETE'' then OLD.id::text else NEW.id::text end];
    elsif TG_TABLE_NAME = ''urunler'' then
      v_urun := case when TG_OP = ''DELETE'' then OLD.id::text else NEW.id::text end;
      select coalesce(array_agg(u.id::text), ''{}'') into v_uretimler from public.uretim u where u.urun_id::text = v_urun;
    end if;
    update public.ucr_onay o
       set gecersiz = jsonb_build_object(''zaman'', now(), ''kaynak'', TG_TABLE_NAME, ''guncel'', public.g25_ucret_guncel(o.anahtar))
     where o.gecersiz is null
       and ((o.tur = ''atama'' and o.ozet ->> ''uretim'' = any (coalesce(v_uretimler, ''{}'')))
            or (o.tur = ''ara'' and (TG_TABLE_NAME = ''tanimlar'' or (v_urun is not null and split_part(o.anahtar, ''|'', 2) = v_urun))))
       and o.ozet is distinct from public.g25_ucret_guncel(o.anahtar);
    return null;
  end ';
  revoke all on function public.g25_onay_degisim() from public, anon, authenticated;
  create constraint trigger g25_onay_degisim_urunler after update or delete on public.urunler deferrable initially deferred for each row execute function public.g25_onay_degisim();
  create constraint trigger g25_onay_degisim_uretim after update or delete on public.uretim deferrable initially deferred for each row execute function public.g25_onay_degisim();
  create constraint trigger g25_onay_degisim_atama after insert or update or delete on public.uretim_atamalari deferrable initially deferred for each row execute function public.g25_onay_degisim();
  create constraint trigger g25_onay_degisim_tanimlar after update on public.tanimlar deferrable initially deferred for each row execute function public.g25_onay_degisim();
  create or replace function public.ucret_onayla(p jsonb) returns jsonb
  language plpgsql security definer set search_path = public as '
  declare
    k jsonb; v_anahtar text; v_tur text; v_guncel jsonb; v_gorulen jsonb; v_yeni numeric; sonuc jsonb := ''[]''::jsonb; v_kok text;
    eposta text := lower(coalesce(auth.jwt() ->> ''email'', ''yonetim''));
  begin
    perform public.g25_yetki_iste(array[''cari'', ''muhasebe''], ''kaydetme'', ''işçilik ücreti onayı'');
    if jsonb_typeof(p -> ''kalemler'') <> ''array'' or jsonb_array_length(p -> ''kalemler'') = 0 then
      raise exception ''Onaylanacak kalem yok'' using errcode = ''22023'';
    end if;
    for k in select x from jsonb_array_elements(p -> ''kalemler'') x loop
      v_anahtar := coalesce(k ->> ''anahtar'', '''');
      v_tur := split_part(v_anahtar, ''|'', 1);
      if v_tur not in (''atama'', ''ara'') then raise exception ''Bilinmeyen onay anahtarı: %'', v_anahtar using errcode = ''22023''; end if;
      if v_tur = ''atama'' then
        v_kok := split_part(v_anahtar, ''|'', 2);
        if public.g25_atama_koku(v_kok) is distinct from v_kok then
          raise exception ''Onay zincirin köküne verilir (%, kök %)'', v_anahtar, public.g25_atama_koku(v_kok) using errcode = ''22023'';
        end if;
        perform pg_advisory_xact_lock(hashtextextended(''g25_isc:zincir:'' || v_kok, 0));
      else
        perform pg_advisory_xact_lock(hashtextextended(''g25_onay:'' || v_anahtar, 0));
      end if;
      v_gorulen := k -> ''ozet'';
      v_yeni := public.stk_sayi(k ->> ''yeniUcret'');
      if v_yeni is not null then
        if v_tur <> ''atama'' or not coalesce((public.g25_ucret_guncel(v_anahtar) ->> ''tamir'')::boolean, false) then
          raise exception ''Ücret burada yalnız tamir işinde belirlenir (%): ürün kartından / Tanımlar''''dan değiştirip onaylayın'', v_anahtar using errcode = ''22023'';
        end if;
        if v_yeni < 0 then raise exception ''Tamir ücreti eksi olamaz'' using errcode = ''22023''; end if;
        if exists (select 1 from public.isc_odeme o join public.stk_fis fs on fs.istek = o.istek where o.kok = v_kok and not fs.iptal) then
          raise exception ''Bu tamir işinde ödeme başlamış — ücret değiştirilemez (%)'', v_anahtar using errcode = ''KR015'';
        end if;
        with recursive zincir as (
          select a.id from public.uretim_atamalari a where a.id::text = v_kok
          union select a.id from public.uretim_atamalari a join zincir z on a.ek ->> ''kismiKalanKaynak'' = z.id::text)
        update public.uretim_atamalari set tamir_ucret = v_yeni where id in (select id from zincir) and not coalesce(tamamlandi_mi, false);
        v_gorulen := jsonb_set(coalesce(v_gorulen, ''{}''::jsonb), ''{ucret}'', to_jsonb(v_yeni));
      end if;
      v_guncel := public.g25_ucret_guncel(v_anahtar);
      if v_guncel is null then raise exception ''Onaylanacak değer yok (kaynak silinmiş ya da ücret tanımsız): %'', v_anahtar using errcode = ''P0002''; end if;
      if coalesce((v_guncel ->> ''karisik'')::boolean, false) then
        raise exception ''İş zinciri tutarsız (farklı proses / tamir ücreti ya da ücret tanımsız): % — önce düzeltin'', v_anahtar using errcode = ''22023'';
      end if;
      if v_gorulen is distinct from v_guncel then
        raise exception ''Onaylanan değer güncel değil (%): ekranda % — sunucuda %. Listeyi yenileyip yeniden onaylayın'', v_anahtar, v_gorulen, v_guncel using errcode = ''KR015'';
      end if;
      insert into public.ucr_onay (anahtar, tur, ozet, onaylayan, onay_zamani)
      values (v_anahtar, v_tur, v_guncel, eposta, now())
      on conflict (anahtar) do update set onceki = jsonb_build_object(''ozet'', ucr_onay.ozet, ''onaylayan'', ucr_onay.onaylayan, ''zaman'', ucr_onay.onay_zamani),
        ozet = excluded.ozet, onaylayan = excluded.onaylayan, onay_zamani = excluded.onay_zamani, gecersiz = null;   -- yeni onay mührü kaldırır
      sonuc := sonuc || jsonb_build_object(''anahtar'', v_anahtar, ''ozet'', v_guncel);
    end loop;
    return jsonb_build_object(''onaylanan'', sonuc);
  end ';

  if not (exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_urunler' and tgrelid = 'public.urunler'::regclass and tgenabled = 'O') and exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_uretim' and tgrelid = 'public.uretim'::regclass and tgenabled = 'O') and exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_atama' and tgrelid = 'public.uretim_atamalari'::regclass and tgenabled = 'O') and exists (select 1 from pg_trigger where tgname = 'g25_onay_degisim_tanimlar' and tgrelid = 'public.tanimlar'::regclass and tgenabled = 'O')) then
    raise exception 'mühür tetikleyicileri kurulmadı';
  end if;
  if has_function_privilege('authenticated', 'public.g25_onay_degisim()', 'execute') or has_function_privilege('anon', 'public.g25_onay_degisim()', 'execute') then
    raise exception 'g25_onay_degisim dışarıya açık kaldı';
  end if;
  if not has_function_privilege('authenticated', 'public.ucret_onayla(jsonb)', 'execute') or has_function_privilege('anon', 'public.ucret_onayla(jsonb)', 'execute') then
    raise exception 'ucret_onayla yetkisi değişti';
  end if;
  create table if not exists guvenlik.g25b_sonuc (sira int primary key, kontrol text not null, deger text not null);
  revoke all on guvenlik.g25b_sonuc from public, anon, authenticated;
  delete from guvenlik.g25b_sonuc;
  insert into guvenlik.g25b_sonuc values
    (1, 'ucr_onay.gecersiz sütunu', 'eklendi'),
    (2, 'g25_onayli / ucret_onayla', 'mührü dikkate alıyor'),
    (3, 'mühür tetikleyicileri (4)', 'kuruldu, etkin'),
    (4, 'şu an geçerli onay sayısı (değişmemeli)', (select count(*)::text from public.ucr_onay o where public.g25_onayli(o.anahtar))),
    (99, 'GENEL', 'UYGULANDI — 25-sonra-dogrula-salt-okur.sql ve 25-onkosul-salt-okur.sql ile doğrulayın');
end $$;

select sira, kontrol, deger from guvenlik.g25b_sonuc order by sira;

commit;
