-- =====================================================================================================================
--  31-yetki-ileti-uygula-satirsonu.sql (YAPIŞTIRMAYA DAYANIKLI: metin CRLF ile yapıştırılsa da gövde aynı kurulur)
--  31-yetki-ileti-uygula.sql — 27 Kasım 2026. HAZIRLIK; canlıya UYGULANMADI.
--  YETKİ RET İLETİSİ: stk_yetki artık her işlemde "(stok: …)" demez; çağıran işlemi ve gereken modülleri söyler.
--  KURAL DEĞİŞMEZ: yetki_var_mi çağrısı, modül listeleri, hata kodu (42501) aynı. Yalnız ret İLETİSİ değişir.
--  SQL Editor: dosyanın TAMAMI, bir kez Run. İlk ifade ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
declare
  v text := (select md5(prosrc) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki');
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception '31 postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if v is null or v not in ('32844b94ccc2421fddcf7851907ab88c', '4de398638778b6b961b9ca410f5c7a4e') then
    raise exception '31 önkoşulu: stk_yetki gövdesi beklenen iki hâlden biri değil (%). Hiçbir şey değişmedi.', coalesce(v, 'yok');
  end if;
  execute 'create or replace function public.stk_yetki(moduller text[], islem text) returns void language plpgsql security definer set search_path to ''public'' as ' || quote_literal(replace('declare
  ok boolean := true;
  v_ctx text;
  v_fn text;
  v_is text;
  v_mod text;
begin
  if auth.jwt() is null then return; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = ''public'' and p.proname = ''yetki_var_mi'') then
    ok := public.yetki_var_mi(moduller, islem);
  end if;
  if not coalesce(ok, false) then
    -- İLETİ (31, 27 Kasım): eski metin her işlemde "(stok: <işlem>)" diyordu — modül listesi ne olursa olsun. Artık çağıran işlem
    -- (çağrı yığınından) ve gerçekten gereken modüller yazılır. KURAL DEĞİŞMEDİ: yalnız ileti. Hata kodu aynı (42501).
    get diagnostics v_ctx = pg_context;
    v_fn := (regexp_match(substr(v_ctx, position(chr(10) in v_ctx) + 1), ''PL/pgSQL function (?:public\.)?([a-z_0-9]+)\(''))[1];
    v_is := case coalesce(v_fn, '''')
      when ''fis_iptal'' then ''fiş iptali''
      when ''fis_iptal_toplu'' then ''fiş iptali (Geri Al)''
      when ''stk_fis_iptal'' then ''stok fişi iptali''
      when ''stk_fis_kaydet'' then ''stok fişi kaydı''
      when ''stk_yaz'' then ''stok hareketi yazma''
      when ''car_yaz'' then ''cari hareketi yazma''
      when ''kas_yaz'' then ''kasa hareketi yazma''
      when ''lst_yaz'' then ''liste kaydı yazma''
      when ''alt_yaz'' then ''bağlı kayıt yazma (sipariş / üretim satırları)''
      when ''fis_bag_coz'' then ''fiş bağını çözme''
      when ''fis_bilgi'' then ''fiş bilgisi okuma''
      when ''stk_min_stok'' then ''asgari stok ayarı''
      when ''stk_renk_tasi'' then ''renk taşıma''
      when ''stk_varyant_ac'' then ''renk / beden açma''
      when ''stk_varyant_kaldir'' then ''renk / beden kaldırma''
      when ''uretim_sil'' then ''üretim kaydı silme''
      else ''bu işlem'' end;
    select string_agg(case m when ''stok'' then ''stok'' when ''fisler'' then ''fişler'' when ''siparis'' then ''sipariş'' when ''uretim'' then ''üretim''
                             when ''cari'' then ''cari'' when ''muhasebe'' then ''muhasebe'' when ''tanimlar'' then ''tanımlar'' else m end, '', '' order by sira)
      into v_mod from unnest(moduller) with ordinality as u(m, sira);
    raise exception ''Bu işlem için yetkiniz yok: % (gereken: % modüllerinden birinde %)'', v_is, coalesce(v_mod, ''—''),
      case islem when ''goruntuleme'' then ''görüntüleme'' when ''duzenleme'' then ''düzenleme'' when ''kaydetme'' then ''kaydetme'' when ''silme'' then ''silme'' else islem end
      using errcode = ''42501'';
  end if;
end ', chr(13), ''));
  if (select md5(prosrc) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki') <> '4de398638778b6b961b9ca410f5c7a4e' then
    raise exception '31 doğrulama tutmadı — kurulum GERİ ALINDI';
  end if;
end $$;
select 'stk_yetki gövdesi' as kontrol, case md5(prosrc) when '4de398638778b6b961b9ca410f5c7a4e' then 'YENİ İLETİ (31)' when '32844b94ccc2421fddcf7851907ab88c' then 'ESKİ (canlıdaki)' else 'BEKLENMEYEN: ' || md5(prosrc) end as durum
  from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki'
union all
select 'GENEL', case (select md5(prosrc) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'stk_yetki') when '4de398638778b6b961b9ca410f5c7a4e' then 'KURULU' when '32844b94ccc2421fddcf7851907ab88c' then 'KURULU DEĞİL' else 'BEKLENMEYEN — DUR' end;
