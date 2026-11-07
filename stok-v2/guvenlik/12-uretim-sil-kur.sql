-- 12 — ÜRETİM SİLME TEK İŞLEM (YAZAR — ayrı onayla; 4 Kasım). 1.744.8 ile birlikte; 1.744.7 de bununla çalışır.
-- Ne yapar: uretim_sil sunucu işlemini, üretim silme korumasını (geçerli hareketi olan üretim silinemez) ve silinmiş üretime
-- hareket yazılmasını önleyen kilidi kurar. VERİYE DOKUNMAZ: hiçbir satır silinmez, iptal edilmez, dönüştürülmez; yalnız SONRAKİ
-- silmelerin yarım kalmamasını sağlar. Kaynağı stok-v2/fis-defteri.sql (aynı metin); tekrar çalıştırmak zararsız.
-- Etki (7 Kasım): 1.744.7 cihazların üretim silme yolu İLK yazan adımında durur (KR012) — ilk fiş iptali ya da planlama bağının
-- boşaltılması; hiçbir kayıt değişmez, ekran "Üretim SİLİNMEDİ / YARIM KALDI" der, cihaz yenilenince 1.744.8 ile silinir. Ayrıca geçerli
-- hareketi kalmış üretimi SUNUCU silmez (KR010) — eski istemcide "üretim yok, hareket geçerli" hâli oluşmaz.
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
--      danışma kilidi; silme özel, hareket yazımı paylaşımlı) sıraya sokar. Önce fiş: silme bekler, araya giren fişi görür ve KR010
--      ile reddedilir (hiçbir şey değişmez). Önce silme: fiş bekler, üretimin silindiğini (iz tablosu) görür ve KR010 ile reddedilir. Var olmayan / henüz eşitlenmemiş üretime yazma
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
--
-- YETKİ: security definer (tablolara uygulama yetkisi gerekmez), sabit search_path; çağıran giriş yapmış olmalı ve Üretim modülünde
-- SİLME yetkisi taşımalı (stk_yetki); fis_iptal_toplu fiş iptali için ayrıca denetler. anon / PUBLIC çalıştıramaz.
-- KİLİT SIRASI (kilitlenme olmasın — fis_kes ve doğrudan silmeyle AYNI sıra):
--   1) iptal edilecek fişlerin kalem / çek / kasa hesabı / fiş başlığı kilitleri (fis_iptal_toplu'nun sırası: kalem → çek → kasa →
--      fiş). fis_kes de önce kalem / kasa kilitlerini alır, üretim kilidini satır yazarken (uretim_bag_koru) ister;
--   2) üretim satırı (FOR UPDATE) — doğrudan REST silme de önce satırı kilitler;
--   3) üretim danışma kilidi (özel) — uretim_silme_koru ve uretim_bag_koru (paylaşımlı) ile aynı anahtar.
--   Kilitler alındıktan SONRA fiş kümesi yeniden hesaplanır; 1)'de kilitlenmemiş yeni bir fiş çıktıysa (başka cihaz o arada yazdı)
--   KR010 ile reddedilir — yeni kilit istemek sırayı bozardı.
-- HATA: işlemin her adımı aynı veritabanı işleminde; herhangi bir raise (KR010, fis_iptal_toplu hatası, silme koruması, sürüm
--   kapısı AT001) işlemi TAMAMEN geri alır — fiş iptalleri dahil.
create or replace function public.uretim_sil(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_id text := nullif(btrim(coalesce(p ->> 'id', '')), '');
  v_stk text[] := array(select jsonb_array_elements_text(public.stk_dizi(p -> 'stokIdler')));
  v_car text[] := array(select jsonb_array_elements_text(public.stk_dizi(p -> 'cariIdler')));
  v_kilitli text[];
  v_fisler text[];
  v_kalemler text[];
  v_fissiz text;
  v_yabanci text;
  v_iptal jsonb := null;
  kid text;
begin
  perform public.stk_yetki(array['uretim'], 'silme');
  if v_id is null then raise exception 'Üretim kimliği yok' using errcode = '22023'; end if;
  -- 1) fiş kilitleri — fis_iptal_toplu'nun sırasıyla (hedef + bağlı fiş)
  select array_agg(distinct x order by x) into v_kilitli from (
    select fis_id as x from public.stk_hareket where not iptal and (uretim_id = v_id or id = any(v_stk))
    union select fis_id from public.car_hareket where not iptal and fis_id is not null and (uretim_id = v_id or id = any(v_car))
    union select id from public.stk_fis where not iptal and uretim_id = v_id) a;
  select array_agg(distinct x order by x) into v_kilitli from (
    select unnest(coalesce(v_kilitli, '{}')) as x
    union select bagli_fis from public.stk_fis where id = any(coalesce(v_kilitli, '{}')) and bagli_fis is not null) a;
  v_kilitli := coalesce(v_kilitli, '{}');
  select array_agg(distinct coalesce(kalem_id, gecmis_kalem_id) order by coalesce(kalem_id, gecmis_kalem_id)) into v_kalemler
    from public.stk_hareket where fis_id = any(v_kilitli) and coalesce(kalem_id, gecmis_kalem_id) is not null;
  perform public.fis_kalem_kilitle(v_kalemler);
  for kid in select distinct cek_id from public.fis_cek_iz where fis_id = any(v_kilitli) order by cek_id loop
    perform pg_advisory_xact_lock(hashtextextended('kas_cek:' || kid, 0));
  end loop;
  perform public.kas_hesap_kilitle(jsonb_build_object('hesaplar', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'tur', a.tur, 'veri', a.veri)), '[]'::jsonb)
    from public.kas_hesap a where a.id in (select hesap_id from public.kas_hareket where fis_id = any(v_kilitli)))));
  perform 1 from public.stk_fis where id = any(v_kilitli) order by id for update;
  -- 2) üretim satırı, 3) üretim danışma kilidi
  perform 1 from public.uretim where id = v_id for update;
  if not found then return jsonb_build_object('silindi', false, 'zatenYok', true, 'fisler', '[]'::jsonb); end if;
  perform pg_advisory_xact_lock(hashtextextended('uretim:' || v_id, 0));
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
  -- Kilitler alınırken araya yeni fiş girdiyse (kilitlenmemiş) — yeni kilit istemek sırayı bozar: reddet.
  select string_agg(x, ', ' order by x) into v_yabanci from unnest(coalesce(v_fisler, '{}')) x where not x = any(v_kilitli);
  if v_yabanci is not null then
    raise exception 'KR010: Silme sırasında üretime yeni fiş yazıldı (%) — sayfayı yenileyip yeniden deneyin; hiçbir kayıt değişmedi', v_yabanci using errcode = 'KR010';
  end if;
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
  -- işlem içi işaret: uretim_eski_silme_koru bu işlemin kendi fiş iptallerini eski istemci yolundan ayırır (yalnız bu işlem)
  perform set_config('uretim.sil_islemi', v_id, true);
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

-- ESKİ İSTEMCİNİN ÜRETİM SİLME YOLU — İLK YAZMADAN ÖNCE DUR (7 Kasım; yayın öncesi son kontrol, t-istemci-uretim-sil). 1.744.7 üretimi
-- birkaç ayrı istekle siler: (1) üretimin sunucu fişlerini TEK TEK fis_iptal (sebep "Üretim <no> silindi"), (2) ürün / cari ana satırları,
-- (3) sipariş başlığı + kalemin planlama bağını boşaltan alt_yaz, (4) iş atamalarını silen alt_yaz, (5) üretimi REST DELETE. 12 son adımı
-- reddeder (uretim_silme_koru) ama önceki adımlar ayrı işlemlerde kalıcıydı: bayat ekranda / eski hareketli üretimde fiş iptal edilmiş,
-- planlama bağı silinmiş, üretim duruyor (KISMİ). İki koruma o yolu İLK yazan adımda durdurur; hiçbir kayıt değişmez:
--   a) uretim_eski_silme_koru (stk_fis, iptal) — fiş, DURAN bir üretime ait (stk_fis.uretim_id) ve iptal sebebi üretim silme sebebi
--      ("Üretim … silindi") ise ve iptal uretim_sil işleminin İÇİNDEN gelmiyorsa (uretim_sil işlem içi işaret koyar) → KR012.
--      Teslim geri alma ("Üretim teslimi geri alındı …"), hareket silme, Fişler ekranından iptal ve uretim_sil'in kendi iptali etkilenmez.
--   b) uretim_planlama_koru (siparis_kalemleri, planlama) — kalemin "Üretim" planlama bağı, bağlı üretim HÂLÂ DURURKEN boşaltılamaz
--      → KR012. Uygulamada bağı boşaltan öteki yollar: üretim silindikten sonra (1.744.8 uretim_sil önce siler), referansı geçersiz
--      (kayıt silinmiş) bağın temizliği, alış siparişi iptali (Satınalma bağı) — hiçbiri duran üretimin bağını boşaltmaz.
-- Karar istemcinin bildirdiği SÜRÜME dayanmaz (başlık / istemci alanı okunmaz): sunucu durumuna (üretim duruyor mu, işlem içi mi) ve
-- isteğin kendisine (iptal sebebi, planlama değişikliği) bakar. Ret mesajı satır kimliği taşımaz → 1.744.7 (040) tabloyu ayırıp
-- kalanı göndermez, adımı başarısız sayar ve sonraki adımlara geçmez. SQL Editor / bakım oturumu (jwt yok) muaf.
create or replace function public.uretim_eski_silme_koru() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if auth.jwt() is null then return new; end if;
  if new.iptal and not coalesce(old.iptal, false) and new.uretim_id is not null
     and coalesce(new.iptal_sebebi, '') like 'Üretim % silindi'
     and coalesce(current_setting('uretim.sil_islemi', true), '') is distinct from new.uretim_id
     and exists (select 1 from public.uretim u where u.id = new.uretim_id) then
    raise exception 'KR012: Üretim artık tek işlemle silinir; bu cihazdaki uygulama eski — sayfayı yenileyip (1.744.8) yeniden deneyin. Hiçbir kayıt değişmedi'
      using errcode = 'KR012';
  end if;
  return new;
end $$;
revoke all on function public.uretim_eski_silme_koru() from public, anon, authenticated;
drop trigger if exists uretim_eski_silme_koru on public.stk_fis;
create trigger uretim_eski_silme_koru before update of iptal on public.stk_fis for each row execute function public.uretim_eski_silme_koru();

create or replace function public.uretim_planlama_koru() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_no text;
begin
  if auth.jwt() is null then return new; end if;
  if jsonb_typeof(old.planlama) = 'object' and old.planlama ->> 'tip' = 'Üretim' then
    v_no := nullif(btrim(coalesce(old.planlama ->> 'referansNo', '')), '');
    if v_no is not null and (new.planlama is null or jsonb_typeof(new.planlama) <> 'object' or nullif(btrim(coalesce(new.planlama ->> 'referansNo', '')), '') is null)
       and exists (select 1 from public.uretim u where u.siparis_no = v_no) then
      raise exception 'KR012: Bağlı üretim % duruyor — planlama bağı üretim silinmeden kaldırılamaz; sayfayı yenileyip (1.744.8) yeniden deneyin. Hiçbir kayıt değişmedi', v_no
        using errcode = 'KR012';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.uretim_planlama_koru() from public, anon, authenticated;
drop trigger if exists uretim_planlama_koru on public.siparis_kalemleri;
create trigger uretim_planlama_koru before update of planlama on public.siparis_kalemleri for each row execute function public.uretim_planlama_koru();

-- Sürüm kapısı tetikleyicisi (fis-defteri.sql'de dosya sonundaki döngü kurar; burada yalnız yeni tablo için)
drop trigger if exists stk_istemci_koru on public.uretim_silinen;
create trigger stk_istemci_koru before insert or update or delete on public.uretim_silinen for each row execute function public.stk_istemci_koru();
