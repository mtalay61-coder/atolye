-- 12 — ÜRETİM SİLME TEK İŞLEM (YAZAR — ayrı onayla; 4 Kasım). 1.744.8 ile birlikte; 1.744.7 de bununla çalışır.
-- Ne yapar: uretim_sil sunucu işlemini, üretim silme korumasını (geçerli hareketi olan üretim silinemez) ve silinmiş üretime
-- hareket yazılmasını önleyen kilidi kurar. VERİYE DOKUNMAZ: hiçbir satır silinmez, iptal edilmez, dönüştürülmez; yalnız SONRAKİ
-- silmelerin yarım kalmamasını sağlar. Kaynağı stok-v2/fis-defteri.sql (aynı metin); tekrar çalıştırmak zararsız.
-- Etki: 1.744.7 cihazlar üretim silerken fişleri yine tek tek iptal eder, sonra üretimi REST ile siler — geçerli hareketi kalmış
-- üretimi artık SUNUCU reddeder (KR010), yani eski istemcide de "üretim yok, hareket geçerli" hâli oluşmaz (ekran yenileyince düzelir).
-- 1.744.8 silmeyi tek işlemde yapar; eski hareket / görünmeyen hareket varsa hiçbir kayıt değişmeden reddeder.
-- Sonra: 12-sonra-dogrula.sql. Geri alma: 12-geri-al.sql.
-- ÜRETİM SİLME — HEPSİ YA DA HİÇBİRİ (4 Kasım; kural provası bulgusu, senaryo-sapma-silinen-uretim). Fiş defteri kuruluyken üretim
-- silinince fis_kes ile kesilmemiş (eski) hareketlerin iptali istemcide ağa çıkmadan durduruluyor, üretim kaydı ise ayrı REST
-- isteğiyle siliniyordu: sunucuda üretim YOK, hareketleri GEÇERLİ kalıyordu (stok / cari etkisi geri alınmadı). Üç katman:
--   1) uretim_sil — TEK İŞLEM: üretimin geçerli hareketleri toplanır (sunucu bağı uretim_id + istemcinin eşleştirdiği satır
--      kimlikleri); fişsiz eski satır varsa ya da bir eski fiş başka kayıt da taşıyorsa KR010 ile REDDEDİLİR (hiçbir şey değişmez);
--      değilse bütün fişler fis_iptal_toplu ile iptal edilir, son denetimden sonra üretim silinir. Herhangi bir adımda hata → hepsi
--      geri alınır.
--   2) uretim_silme_koru — üretim kaydı (hangi yoldan olursa olsun: eski istemci, REST) geçerli stok / cari hareketi varken
--      SİLİNEMEZ. SQL Editor / bakım oturumu (jwt yok) muaftır.
--   3) uretim_bag_koru + uretim_silinen — yarış: silme ile aynı üretime yeni fiş aynı anda gelirse işlem kilidi (üretim başına
--      danışma kilidi; silme özel, hareket yazımı paylaşımlı) sıraya sokar. Önce fiş: silme bekler ve yeni fişi de görür. Önce silme:
--      fiş bekler, üretimin silindiğini (iz tablosu) görür ve KR010 ile reddedilir. Var olmayan / henüz eşitlenmemiş üretime yazma
--      ENGELLENMEZ — yalnız SİLİNMİŞ üretime (çöpten geri yükleme izi kaldırır).
create table if not exists public.uretim_silinen (
  id text primary key,
  zaman timestamptz not null default now()
);
alter table public.uretim_silinen enable row level security;
revoke all on public.uretim_silinen from public, anon, authenticated;

create or replace function public.uretim_silme_koru() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if auth.jwt() is null then return case when tg_op = 'DELETE' then old else new end; end if;   -- SQL Editor / bakım
  if tg_op = 'INSERT' then   -- çöpten geri yükleme: aynı kimlik yeniden yazılabilir
    delete from public.uretim_silinen where id = new.id;
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('uretim:' || old.id, 0));
  if exists (select 1 from public.stk_hareket where uretim_id = old.id and not iptal)
     or exists (select 1 from public.car_hareket where uretim_id = old.id and not iptal) then
    raise exception 'KR010: Üretimin geçerli stok / cari hareketi var (%) — üretim silinmedi; önce fişleri iptal edilmeli', old.id using errcode = 'KR010';
  end if;
  insert into public.uretim_silinen (id) values (old.id) on conflict (id) do update set zaman = now();
  return old;
end $$;
revoke all on function public.uretim_silme_koru() from public, anon, authenticated;
drop trigger if exists uretim_silme_koru on public.uretim;
create trigger uretim_silme_koru before delete on public.uretim for each row execute function public.uretim_silme_koru();
drop trigger if exists uretim_geri_yukle on public.uretim;
create trigger uretim_geri_yukle after insert on public.uretim for each row execute function public.uretim_silme_koru();

create or replace function public.uretim_bag_koru() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if new.uretim_id is null or auth.jwt() is null then return new; end if;
  if tg_op = 'UPDATE' and new.uretim_id is not distinct from old.uretim_id then return new; end if;
  perform pg_advisory_xact_lock_shared(hashtextextended('uretim:' || new.uretim_id, 0));
  if exists (select 1 from public.uretim_silinen where id = new.uretim_id)
     and not exists (select 1 from public.uretim where id = new.uretim_id) then
    raise exception 'KR010: Üretim silinmiş (%) — bu üretime hareket yazılamaz; sayfayı yenileyin', new.uretim_id using errcode = 'KR010';
  end if;
  return new;
end $$;
revoke all on function public.uretim_bag_koru() from public, anon, authenticated;
drop trigger if exists uretim_bag_koru on public.stk_hareket;
create trigger uretim_bag_koru before insert or update of uretim_id on public.stk_hareket for each row execute function public.uretim_bag_koru();
drop trigger if exists uretim_bag_koru on public.car_hareket;
create trigger uretim_bag_koru before insert or update of uretim_id on public.car_hareket for each row execute function public.uretim_bag_koru();

-- p = { id, sebep?, stokIdler?, cariIdler? } — satır kimlikleri istemcinin eşleştirdiği eski satırlar (uretim_id taşımayan eski
-- kayıtta bağ yalnız fiş numarasında olabilir). Liste verilirse listede olmayan geçerli hareket reddedilir (görünmeyen hareket).
-- Dönüş: { silindi, zatenYok?, fisler }.
create or replace function public.uretim_sil(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_id text := nullif(btrim(coalesce(p ->> 'id', '')), '');
  v_stk text[] := array(select jsonb_array_elements_text(public.stk_dizi(p -> 'stokIdler')));
  v_car text[] := array(select jsonb_array_elements_text(public.stk_dizi(p -> 'cariIdler')));
  v_fisler text[];
  v_fissiz text;
  v_yabanci text;
  v_iptal jsonb := null;
begin
  perform public.stk_yetki(array['uretim'], 'silme');
  if v_id is null then raise exception 'Üretim kimliği yok' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('uretim:' || v_id, 0));
  perform 1 from public.uretim where id = v_id for update;
  if not found then return jsonb_build_object('silindi', false, 'zatenYok', true, 'fisler', '[]'::jsonb); end if;
  -- Fişsiz eski satır (yalnız cari / kasa'da olabilir; stk_hareket.fis_id zorunlu): sunucuda iptal yolu YOK → reddet.
  select string_agg(id, ', ' order by id) into v_fissiz from public.car_hareket
   where not iptal and fis_id is null and (uretim_id = v_id or id = any(v_car));
  if v_fissiz is not null then
    raise exception 'KR010: Üretimin fiş kesilmeden yazılmış eski cari hareketi var (%) — üretim silinemez; hiçbir kayıt değişmedi', v_fissiz using errcode = 'KR010';
  end if;
  -- GÖRÜNMEYEN HAREKET (eşzamanlılık): istemci satır listesini verdiyse, ekranında olmayan geçerli bir hareket (başka cihazın az önce
  -- yazdığı teslim) sessizce iptal edilmez — reddedilir, kullanıcı yeniler ve yeniden karar verir.
  if p ? 'stokIdler' or p ? 'cariIdler' then
    select string_agg(id, ', ' order by id) into v_yabanci from (
      select id from public.stk_hareket where uretim_id = v_id and not iptal and not id = any(v_stk)
      union all select id from public.car_hareket where uretim_id = v_id and not iptal and not id = any(v_car)) g;
    if v_yabanci is not null then
      raise exception 'KR010: Üretimin bu ekranda görünmeyen hareketi var (%) — sayfayı yenileyip yeniden deneyin; hiçbir kayıt değişmedi', v_yabanci using errcode = 'KR010';
    end if;
  end if;
  select array_agg(distinct x order by x) into v_fisler from (
    select fis_id as x from public.stk_hareket where not iptal and (uretim_id = v_id or id = any(v_stk))
    union select fis_id from public.car_hareket where not iptal and fis_id is not null and (uretim_id = v_id or id = any(v_car))
    union select id from public.stk_fis where not iptal and uretim_id = v_id) a;
  -- Fişin TAMAMI iptal edilir: üretime ait olduğu fiş başlığından (sunucu fişi: stk_fis.uretim_id) ya da bütün geçerli satırlarından
  -- (eski fiş) kesin değilse reddet — başka bir kaydın satırı birlikte iptal edilmesin.
  select string_agg(f.id, ', ' order by f.id) into v_yabanci from public.stk_fis f
   where f.id = any(coalesce(v_fisler, '{}')) and not (f.istek is not null and f.uretim_id is not distinct from v_id) and (
     exists (select 1 from public.stk_hareket h where h.fis_id = f.id and not h.iptal and h.uretim_id is distinct from v_id and not h.id = any(v_stk))
     or exists (select 1 from public.car_hareket c where c.fis_id = f.id and not c.iptal and c.uretim_id is distinct from v_id and not c.id = any(v_car))
     or exists (select 1 from public.kas_hareket k where k.fis_id = f.id and not k.iptal));
  if v_yabanci is not null then
    raise exception 'KR010: % fişi bu üretimden başka kayıt da taşıyor — üretim silinemez; hiçbir kayıt değişmedi', v_yabanci using errcode = 'KR010';
  end if;
  if coalesce(cardinality(v_fisler), 0) > 0 then
    v_iptal := public.fis_iptal_toplu(jsonb_build_object('fisler', to_jsonb(v_fisler), 'sebep', coalesce(nullif(p ->> 'sebep', ''), 'Üretim silindi')));
  end if;
  if exists (select 1 from public.stk_hareket where not iptal and (uretim_id = v_id or id = any(v_stk)))
     or exists (select 1 from public.car_hareket where not iptal and (uretim_id = v_id or id = any(v_car))) then
    raise exception 'KR010: Fiş iptalinden sonra üretimin geçerli hareketi kaldı (%) — hiçbir kayıt değişmedi', v_id using errcode = 'KR010';
  end if;
  delete from public.uretim where id = v_id;   -- uretim_silme_koru: hareket kalmadığını bir kez daha denetler, izi yazar
  return jsonb_build_object('silindi', true, 'fisler', coalesce(to_jsonb(v_fisler), '[]'::jsonb), 'iptal', v_iptal);
end $$;
revoke all on function public.uretim_sil(jsonb) from public, anon;
grant execute on function public.uretim_sil(jsonb) to authenticated;

-- Sürüm kapısı tetikleyicisi (fis-defteri.sql'de dosya sonundaki döngü kurar; burada yalnız yeni tablo için)
drop trigger if exists stk_istemci_koru on public.uretim_silinen;
create trigger stk_istemci_koru before insert or update or delete on public.uretim_silinen for each row execute function public.stk_istemci_koru();
