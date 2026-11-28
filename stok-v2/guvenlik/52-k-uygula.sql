-- =====================================================================================================================
--  52-k-uygula.sql — ÜRETİLDİ (stok-v2/guvenlik/52-k-uret.py; ELLE DÜZENLENMEZ).
--  PAKET K — üst kayıt korumaları: bağlı geçmişi olan cari silinemez; fişli siparişin carisi, işlem görmüş üretimin ürünü
--  değiştirilemez; var olmayan cariye bağlantı reddedilir. Var olan satırlara ve mevcut kurallara dokunmaz.
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
do $$
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'Paket K kurulumu postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regclass('public.cariler') is null or to_regclass('public.car_hareket') is null or to_regclass('public.stk_fis') is null or to_regclass('public.kas_hareket') is null then
    raise exception 'Paket K önkoşulu eksik (tablolar). Hiçbir şey değişmedi.';
  end if;
  create or replace function public.k_cari_silme_koru() returns trigger language plpgsql security definer set search_path = public as 'declare
  v text[] := ''{}'';
  n bigint;
begin
  -- Jetonsuz bağlantı (SQL Editor, servis rolü) serbest: bakım işleri bu kuralın dışında (öteki korumalarla aynı sözleşme).
  if auth.jwt() is null then return old; end if;
  -- SATIR KİLİDİ: bu andan sonra bu cariye bağlanan yeni kayıt (yabancı anahtar FOR KEY SHARE ister) silme bitene kadar bekler;
  -- kilitten ÖNCE yazılıp işlenmiş kayıtlar aşağıdaki sorgularda görünür (READ COMMITTED: her ifade yeni görüntü).
  perform 1 from public.cariler where id = old.id for update;
  select count(*) into n from public.car_hareket where cari_id = old.id;            if n > 0 then v := v || (n || '' cari hareketi''); end if;
  select count(*) into n from public.stk_fis where cari_id = old.id;                if n > 0 then v := v || (n || '' fiş''); end if;
  select count(*) into n from public.stk_hareket where cari_id = old.id;            if n > 0 then v := v || (n || '' stok hareketi''); end if;
  select count(*) into n from public.siparisler where cari_id = old.id;             if n > 0 then v := v || (n || '' sipariş''); end if;
  select count(*) into n from public.uretim_atamalari where personel_id = old.id;   if n > 0 then v := v || (n || '' üretim ataması''); end if;
  select count(*) into n from public.kas_hareket where veri ->> ''cariId'' = old.id;  if n > 0 then v := v || (n || '' kasa / banka hareketi''); end if;
  select count(*) into n from public.kas_cek where veri ->> ''cariId'' = old.id;      if n > 0 then v := v || (n || '' çek / senet''); end if;
  select count(*) into n from public.site_hesaplari where cari_id = old.id;         if n > 0 then v := v || ''site hesabı''::text; end if;
  select count(*) into n from public.site_talepleri where cari_id = old.id;         if n > 0 then v := v || (n || '' site talebi''); end if;
  if cardinality(v) > 0 then
    raise exception ''KR050: "%" silinemez — bağlı kayıt var: %. Geçmiş korunur; cariyi pasife alabilirsiniz.'', old.unvan, array_to_string(v, '', '') using errcode = ''KR050'';
  end if;
  return old;
end';
  revoke all on function public.k_cari_silme_koru() from public, anon, authenticated;
  create or replace function public.k_siparis_cari_koru() returns trigger language plpgsql security definer set search_path = public as 'declare
  n bigint;
begin
  if auth.jwt() is null or new.cari_id is not distinct from old.cari_id then return new; end if;
  select (select count(*) from public.stk_fis f where f.siparis_id = old.id and not coalesce(f.iptal, false) and f.cari_id is not null and f.cari_id is distinct from new.cari_id)
       + (select count(*) from public.stk_hareket h where h.siparis_id = old.id and not coalesce(h.iptal, false) and h.cari_id is not null and h.cari_id is distinct from new.cari_id)
    into n;
  if n > 0 then
    raise exception ''KR051: sipariş % için kesilmiş fiş / stok hareketi başka caride (% kayıt) — siparişin carisi değiştirilemez; önce fişler iptal edilmeli'', old.siparis_no, n using errcode = ''KR051'';
  end if;
  return new;
end';
  revoke all on function public.k_siparis_cari_koru() from public, anon, authenticated;
  create or replace function public.k_uretim_urun_koru() returns trigger language plpgsql security definer set search_path = public as 'declare
  v text[] := ''{}'';
  n bigint;
begin
  if auth.jwt() is null or new.urun_id is not distinct from old.urun_id then return new; end if;
  select count(*) into n from public.uretim_atamalari where uretim_id = old.id and coalesce(verildi_mi, false);          if n > 0 then v := v || (n || '' verilmiş iş''); end if;
  select count(*) into n from public.stk_hareket where uretim_id = old.id and not coalesce(iptal, false);                if n > 0 then v := v || (n || '' stok hareketi''); end if;
  select count(*) into n from public.car_hareket where uretim_id = old.id and not coalesce(iptal, false);                if n > 0 then v := v || (n || '' cari hareketi''); end if;
  select count(*) into n from public.stk_fis where uretim_id = old.id and not coalesce(iptal, false);                    if n > 0 then v := v || (n || '' fiş''); end if;
  if cardinality(v) > 0 then
    raise exception ''KR052: üretim % işlem görmüş (%) — ürünü değiştirilemez'', old.siparis_no, array_to_string(v, '', '') using errcode = ''KR052'';
  end if;
  return new;
end';
  revoke all on function public.k_uretim_urun_koru() from public, anon, authenticated;
  create or replace function public.k_kasa_cari_koru() returns trigger language plpgsql security definer set search_path = public as 'declare
  c text := nullif(new.veri ->> ''cariId'', '''');
begin
  -- Kasa / banka hareketi ve çekte cari kimliği JSON içinde (yabancı anahtar kurulamaz). Yeni kayıtta ya da cari DEĞİŞTİĞİNDE bakılır;
  -- carisi zaten olmayan eski kaydın başka alanı düzeltilebilsin. FOR KEY SHARE: o cari aynı anda siliniyorsa silme bitene kadar bekler.
  if auth.jwt() is null or c is null then return new; end if;
  if tg_op = ''UPDATE'' and c is not distinct from nullif(old.veri ->> ''cariId'', '''') then return new; end if;
  perform 1 from public.cariler where id = c for key share;
  if not found then
    raise exception ''KR054: kayıttaki cari bulunamadı (%) — silinmiş olabilir; kayıt yazılmadı'', c using errcode = ''KR054'';
  end if;
  return new;
end';
  revoke all on function public.k_kasa_cari_koru() from public, anon, authenticated;
  create or replace function public.k_urun_silme_koru() returns trigger language plpgsql security definer set search_path = public as 'declare
  n bigint;
begin
  -- Siparişi olan ürünü mevcut kural (KR003) zaten korur; siparişi olmayıp STOK HAREKETİ olan ürün silinebiliyordu (hareket ürünsüz
  -- kalıyordu). Satır kilidi: yabancı anahtarlı yeni hareket silme bitene kadar bekler.
  if auth.jwt() is null then return old; end if;
  perform 1 from public.urunler where id = old.id for update;
  select count(*) into n from public.stk_hareket where urun_id = old.id;
  if n > 0 then
    raise exception ''KR055: "%" silinemez — % stok hareketi var. Geçmiş korunur; ürünü pasife alabilirsiniz.'', old.ad, n using errcode = ''KR055'';
  end if;
  return old;
end';
  revoke all on function public.k_urun_silme_koru() from public, anon, authenticated;
  create or replace function public.k_eski_hesap_silme_koru() returns trigger language plpgsql security definer set search_path = public as 'declare
  n bigint;
begin
  -- Eski `hesaplar` tablosu (uygulama kullanmıyor; canlıda 28 Kasım''da boş). Yabancı anahtarı hareketleri TOPLUCA siliyor; iz bırakmadan
  -- silinmesin diye hareketi olan hesabın silinmesi reddedilir. Yabancı anahtara dokunulmaz.
  select count(*) into n from public.hesap_hareketleri where hesap_id = old.id;
  if n > 0 then raise exception ''KR053: hesabın % hareketi var — silinemez'', n using errcode = ''KR053''; end if;
  return old;
end';
  revoke all on function public.k_eski_hesap_silme_koru() from public, anon, authenticated;
  drop trigger if exists k_cari_silme_koru on public.cariler;
  create trigger k_cari_silme_koru before delete on public.cariler for each row execute function public.k_cari_silme_koru();
  drop trigger if exists k_siparis_cari_koru on public.siparisler;
  create trigger k_siparis_cari_koru before update of cari_id on public.siparisler for each row execute function public.k_siparis_cari_koru();
  drop trigger if exists k_uretim_urun_koru on public.uretim;
  create trigger k_uretim_urun_koru before update of urun_id on public.uretim for each row execute function public.k_uretim_urun_koru();
  drop trigger if exists k_kasa_cari_koru on public.kas_hareket;
  create trigger k_kasa_cari_koru before insert or update of veri on public.kas_hareket for each row execute function public.k_kasa_cari_koru();
  drop trigger if exists k_kasa_cari_koru on public.kas_cek;
  create trigger k_kasa_cari_koru before insert or update of veri on public.kas_cek for each row execute function public.k_kasa_cari_koru();
  drop trigger if exists k_urun_silme_koru on public.urunler;
  create trigger k_urun_silme_koru before delete on public.urunler for each row execute function public.k_urun_silme_koru();
  drop trigger if exists k_eski_hesap_silme_koru on public.hesaplar;
  create trigger k_eski_hesap_silme_koru before delete on public.hesaplar for each row execute function public.k_eski_hesap_silme_koru();
  if not exists (select 1 from pg_constraint where conname = 'k_car_hareket_cari_fk') then
    alter table public.car_hareket add constraint k_car_hareket_cari_fk foreign key (cari_id) references public.cariler (id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'k_stk_fis_cari_fk') then
    alter table public.stk_fis add constraint k_stk_fis_cari_fk foreign key (cari_id) references public.cariler (id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'k_stk_hareket_cari_fk') then
    alter table public.stk_hareket add constraint k_stk_hareket_cari_fk foreign key (cari_id) references public.cariler (id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'k_site_talepleri_cari_fk') then
    alter table public.site_talepleri add constraint k_site_talepleri_cari_fk foreign key (cari_id) references public.cariler (id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'k_site_hesaplari_cari_fk') then
    alter table public.site_hesaplari add constraint k_site_hesaplari_cari_fk foreign key (cari_id) references public.cariler (id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'k_stk_hareket_urun_fk') then
    alter table public.stk_hareket add constraint k_stk_hareket_urun_fk foreign key (urun_id) references public.urunler (id) not valid;
  end if;
end $$;
with k(no, kontrol, beklenen, bulunan) as (
  select 1, 'koruma fonksiyonları (k_*)', '6', (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
     and p.proname in ('k_cari_silme_koru', 'k_siparis_cari_koru', 'k_uretim_urun_koru', 'k_kasa_cari_koru', 'k_eski_hesap_silme_koru', 'k_urun_silme_koru'))
  union all select 2, 'etkin tetikleyiciler (cariler, siparisler, uretim, urunler, kas_hareket, kas_cek, hesaplar)', '7',
     (select count(*)::text from pg_trigger g where not g.tgisinternal and g.tgenabled = 'O' and g.tgname in ('k_cari_silme_koru', 'k_siparis_cari_koru', 'k_uretim_urun_koru', 'k_kasa_cari_koru', 'k_eski_hesap_silme_koru', 'k_urun_silme_koru'))
  union all select 3, 'yabancı anahtarlar (cari: car_hareket, stk_fis, stk_hareket, site_talepleri, site_hesaplari; ürün: stk_hareket)', '6',
     (select count(*)::text from pg_constraint where contype = 'f' and conname in ('k_car_hareket_cari_fk', 'k_stk_fis_cari_fk', 'k_stk_hareket_cari_fk', 'k_site_talepleri_cari_fk', 'k_site_hesaplari_cari_fk', 'k_stk_hareket_urun_fk'))
  union all select 4, 'koruma fonksiyonları authenticated / anon tarafından doğrudan çağrılamaz', 'evet',
     case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and left(p.proname, 2) = 'k_' and p.proname like '%_koru'
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))) then 'HAYIR' else 'evet' end
)
select no, kontrol, beklenen, bulunan, case when bulunan = beklenen then 'tamam' else 'EKSİK' end as durum from k
union all select 99, 'GENEL', '', '', case when (select bool_and(bulunan = beklenen) from k) then 'KURULU'
  when (select bool_and(bulunan in ('0', 'evet')) from k) then 'KURULU DEĞİL' else 'YARIM — sonucu gönder' end
order by 1;
