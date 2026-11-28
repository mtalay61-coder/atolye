#!/usr/bin/env python3
# PAKET K üretici (28 Kasım): 52-k-uygula.sql ve 52-k-geri-al.sql'i üretir. Kural: SQL Editor'e tek yapıştırma; ilk ifade TEK do bloğu
# (hepsi ya da hiçbiri), dosyada yalnız düz `$$` — fonksiyon gövdeleri tek tırnaklı metin (içteki tırnaklar ikilenir).
import os, re
D = os.path.dirname(os.path.abspath(__file__))
def q(govde): return "'" + govde.strip("\n").replace("'", "''") + "'"

FONKSIYONLAR = {
"k_cari_silme_koru": ("trigger", """
declare
  v text[] := '{}';
  n bigint;
begin
  -- Jetonsuz bağlantı (SQL Editor, servis rolü) serbest: bakım işleri bu kuralın dışında (öteki korumalarla aynı sözleşme).
  if auth.jwt() is null then return old; end if;
  -- SATIR KİLİDİ: bu andan sonra bu cariye bağlanan yeni kayıt (yabancı anahtar FOR KEY SHARE ister) silme bitene kadar bekler;
  -- kilitten ÖNCE yazılıp işlenmiş kayıtlar aşağıdaki sorgularda görünür (READ COMMITTED: her ifade yeni görüntü).
  perform 1 from public.cariler where id = old.id for update;
  select count(*) into n from public.car_hareket where cari_id = old.id;            if n > 0 then v := v || (n || ' cari hareketi'); end if;
  select count(*) into n from public.stk_fis where cari_id = old.id;                if n > 0 then v := v || (n || ' fiş'); end if;
  select count(*) into n from public.stk_hareket where cari_id = old.id;            if n > 0 then v := v || (n || ' stok hareketi'); end if;
  select count(*) into n from public.siparisler where cari_id = old.id;             if n > 0 then v := v || (n || ' sipariş'); end if;
  select count(*) into n from public.uretim_atamalari where personel_id = old.id;   if n > 0 then v := v || (n || ' üretim ataması'); end if;
  select count(*) into n from public.kas_hareket where veri ->> 'cariId' = old.id;  if n > 0 then v := v || (n || ' kasa / banka hareketi'); end if;
  select count(*) into n from public.kas_cek where veri ->> 'cariId' = old.id;      if n > 0 then v := v || (n || ' çek / senet'); end if;
  select count(*) into n from public.site_hesaplari where cari_id = old.id;         if n > 0 then v := v || 'site hesabı'::text; end if;
  select count(*) into n from public.site_talepleri where cari_id = old.id;         if n > 0 then v := v || (n || ' site talebi'); end if;
  if cardinality(v) > 0 then
    raise exception 'KR050: "%" silinemez — bağlı kayıt var: %. Geçmiş korunur; cariyi pasife alabilirsiniz.', old.unvan, array_to_string(v, ', ') using errcode = 'KR050';
  end if;
  return old;
end
"""),
"k_siparis_cari_koru": ("trigger", """
declare
  n bigint;
begin
  if auth.jwt() is null or new.cari_id is not distinct from old.cari_id then return new; end if;
  select (select count(*) from public.stk_fis f where f.siparis_id = old.id and not coalesce(f.iptal, false) and f.cari_id is not null and f.cari_id is distinct from new.cari_id)
       + (select count(*) from public.stk_hareket h where h.siparis_id = old.id and not coalesce(h.iptal, false) and h.cari_id is not null and h.cari_id is distinct from new.cari_id)
    into n;
  if n > 0 then
    raise exception 'KR051: sipariş % için kesilmiş fiş / stok hareketi başka caride (% kayıt) — siparişin carisi değiştirilemez; önce fişler iptal edilmeli', old.siparis_no, n using errcode = 'KR051';
  end if;
  return new;
end
"""),
"k_uretim_urun_koru": ("trigger", """
begin
  -- ÜRETİMİN ÜRÜNÜ DEĞİŞMEZ. Uygulamada üretimin ürününü değiştiren ekran yok (ürün planlamada bir kez yazılır); değişiklik ancak
  -- bayat bir kaydın ya da doğrudan API çağrısının işi olabilir. "İşlem görmüşse değiştirilemez" kuralı yarışa açıktı: ürün değişikliği
  -- işlenmeden hemen önce başlayan teslim eski ürüne giriş yazabiliyordu (bag-risk E7). Bu yüzden kural koşulsuz: dolu ürün değişmez.
  -- Boş ürünün doldurulması serbest (ürünü silinmiş eski kaydın elle düzeltilmesi).
  if auth.jwt() is null or old.urun_id is null or new.urun_id is not distinct from old.urun_id then return new; end if;
  raise exception 'KR052: üretim % başka ürüne çevrilemez — üretimin ürünü değişmez (gerekirse üretim iptal edilip yenisi açılır)', old.siparis_no using errcode = 'KR052';
end
"""),
"k_kasa_cari_koru": ("trigger", """
declare
  c text := nullif(new.veri ->> 'cariId', '');
begin
  -- Kasa / banka hareketi ve çekte cari kimliği JSON içinde (yabancı anahtar kurulamaz). Yeni kayıtta ya da cari DEĞİŞTİĞİNDE bakılır;
  -- carisi zaten olmayan eski kaydın başka alanı düzeltilebilsin. FOR KEY SHARE: o cari aynı anda siliniyorsa silme bitene kadar bekler.
  if auth.jwt() is null or c is null then return new; end if;
  if tg_op = 'UPDATE' and c is not distinct from nullif(old.veri ->> 'cariId', '') then return new; end if;
  perform 1 from public.cariler where id = c for key share;
  if not found then
    raise exception 'KR054: kayıttaki cari bulunamadı (%) — silinmiş olabilir; kayıt yazılmadı', c using errcode = 'KR054';
  end if;
  return new;
end
"""),
"k_fis_siparis_koru": ("trigger", """
declare
  sc text;
begin
  -- FİŞ ↔ SİPARİŞ CARİSİ YARIŞI. `k_siparis_cari_koru` yalnız İŞLENMİŞ fişleri görür; cari değişikliği ile fiş kesme aynı anda olursa
  -- ikisi de geçip fiş başka caride kalabiliyordu. Burada fiş yazılırken siparişin satırı PAYLAŞIMLI kilitlenir (cari değişikliği bu
  -- işlem bitene kadar bekler; değişiklik önce başladıysa bu ifade onu bekler) ve kilitten SONRA okunan cariyle karşılaştırılır.
  -- Uygulama sipariş fişinde cariyi siparişten alır (081); farklıysa istemcinin bildiği sipariş bayattır.
  if auth.jwt() is null or new.siparis_id is null or new.cari_id is null or coalesce(new.iptal, false) then return new; end if;
  select s.cari_id into sc from public.siparisler s where s.id = new.siparis_id for share;
  if found and sc is not null and sc <> new.cari_id then
    raise exception 'KR056: siparişin carisi bu arada değişmiş — fiş kesilmedi; ekranı yenileyip tekrar deneyin' using errcode = 'KR056';
  end if;
  return new;
end
"""),
"k_urun_silme_koru": ("trigger", """
declare
  v text[] := '{}';
  n bigint;
begin
  -- Siparişi olan ürünü mevcut kural (KR003) zaten korur; siparişi olmayıp STOK HAREKETİ olan ürün silinebiliyordu (hareket ürünsüz
  -- kalıyordu). Satır kilidi: yabancı anahtarlı yeni hareket silme bitene kadar bekler.
  if auth.jwt() is null then return old; end if;
  perform 1 from public.urunler where id = old.id for update;
  select count(*) into n from public.stk_hareket where urun_id = old.id;        if n > 0 then v := v || (n || ' stok hareketi'); end if;
  select count(*) into n from public.siparis_kalemleri where urun_id = old.id;  if n > 0 then v := v || (n || ' sipariş kalemi'); end if;
  select count(*) into n from public.uretim where urun_id = old.id;             if n > 0 then v := v || (n || ' üretim'); end if;
  if cardinality(v) > 0 then
    raise exception 'KR055: "%" silinemez — bağlı kayıt var: %. Geçmiş korunur; ürünü pasife alabilirsiniz.', old.ad, array_to_string(v, ', ') using errcode = 'KR055';
  end if;
  return old;
end
"""),
"k_eski_hesap_silme_koru": ("trigger", """
declare
  n bigint;
begin
  -- Eski `hesaplar` tablosu (uygulama kullanmıyor; canlıda 28 Kasım'da boş). Yabancı anahtarı hareketleri TOPLUCA siliyor; iz bırakmadan
  -- silinmesin diye hareketi olan hesabın silinmesi reddedilir. Yabancı anahtara dokunulmaz.
  select count(*) into n from public.hesap_hareketleri where hesap_id = old.id;
  if n > 0 then raise exception 'KR053: hesabın % hareketi var — silinemez', n using errcode = 'KR053'; end if;
  return old;
end
"""),
}
TETIKLER = [  # ad, tablo, zamanlama, fonksiyon
  ("k_cari_silme_koru", "cariler", "before delete", "k_cari_silme_koru"),
  ("k_siparis_cari_koru", "siparisler", "before update of cari_id", "k_siparis_cari_koru"),
  ("k_uretim_urun_koru", "uretim", "before update of urun_id", "k_uretim_urun_koru"),
  ("k_kasa_cari_koru", "kas_hareket", "before insert or update of veri", "k_kasa_cari_koru"),
  ("k_kasa_cari_koru", "kas_cek", "before insert or update of veri", "k_kasa_cari_koru"),
  ("k_urun_silme_koru", "urunler", "before delete", "k_urun_silme_koru"),
  ("k_fis_siparis_koru", "stk_fis", "before insert", "k_fis_siparis_koru"),
  ("k_eski_hesap_silme_koru", "hesaplar", "before delete", "k_eski_hesap_silme_koru"),
]
# Yabancı anahtarlar DOĞRULANMADAN (NOT VALID) eklenir: mevcut yetim satırlara dokunmaz, onları reddetmez; YENİ yazılan ya da
# cari kimliği değişen satırı denetler ve eşzamanlı cari silmeye karşı satır kilidi sağlar. Doğrulama (VALIDATE) ayrı karardır.
YABANCI = [("car_hareket", "cari_id", "k_car_hareket_cari_fk", "cariler"), ("stk_fis", "cari_id", "k_stk_fis_cari_fk", "cariler"), ("stk_hareket", "cari_id", "k_stk_hareket_cari_fk", "cariler"),
           ("site_talepleri", "cari_id", "k_site_talepleri_cari_fk", "cariler"), ("site_hesaplari", "cari_id", "k_site_hesaplari_cari_fk", "cariler"),
           ("stk_hareket", "urun_id", "k_stk_hareket_urun_fk", "urunler")]

BASLIK = """-- =====================================================================================================================
--  52-k-%s.sql — ÜRETİLDİ (stok-v2/guvenlik/52-k-uret.py; ELLE DÜZENLENMEZ).
--  PAKET K — %s
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
"""
DURUM = """with k(no, kontrol, beklenen, bulunan) as (
  select 1, 'koruma fonksiyonları (k_*)', '7', (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
     and p.proname in ('k_cari_silme_koru', 'k_siparis_cari_koru', 'k_uretim_urun_koru', 'k_kasa_cari_koru', 'k_eski_hesap_silme_koru', 'k_urun_silme_koru', 'k_fis_siparis_koru'))
  union all select 2, 'etkin tetikleyiciler (cariler, siparisler, uretim, urunler, stk_fis, kas_hareket, kas_cek, hesaplar)', '8',
     (select count(*)::text from pg_trigger g where not g.tgisinternal and g.tgenabled = 'O' and g.tgname in ('k_cari_silme_koru', 'k_siparis_cari_koru', 'k_uretim_urun_koru', 'k_kasa_cari_koru', 'k_eski_hesap_silme_koru', 'k_urun_silme_koru', 'k_fis_siparis_koru'))
  union all select 3, 'yabancı anahtarlar (cari: car_hareket, stk_fis, stk_hareket, site_talepleri, site_hesaplari; ürün: stk_hareket)', '6',
     (select count(*)::text from pg_constraint where contype = 'f' and conname in ('k_car_hareket_cari_fk', 'k_stk_fis_cari_fk', 'k_stk_hareket_cari_fk', 'k_site_talepleri_cari_fk', 'k_site_hesaplari_cari_fk', 'k_stk_hareket_urun_fk'))
  union all select 4, 'koruma fonksiyonları authenticated / anon tarafından doğrudan çağrılamaz', 'evet',
     case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and left(p.proname, 2) = 'k_' and p.proname like '%%_koru'
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))) then 'HAYIR' else 'evet' end
)
select no, kontrol, beklenen, bulunan, case when bulunan = beklenen then 'tamam' else '%s' end as durum from k
union all select 99, 'GENEL', '', '', case when (select bool_and(bulunan = beklenen) from k) then 'KURULU'
  when (select bool_and(bulunan in ('0', 'evet')) from k) then 'KURULU DEĞİL' else 'YARIM — sonucu gönder' end
order by 1;
"""
def uygula():
    s = BASLIK % ("uygula", "üst kayıt korumaları: bağlı geçmişi olan cari silinemez; fişli siparişin carisi, işlem görmüş üretimin ürünü\n--  değiştirilemez; var olmayan cariye bağlantı reddedilir. Var olan satırlara ve mevcut kurallara dokunmaz.")
    s += "do $$\nbegin\n"
    s += "  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then\n    raise exception 'Paket K kurulumu postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;\n  end if;\n"
    s += "  if to_regclass('public.cariler') is null or to_regclass('public.car_hareket') is null or to_regclass('public.stk_fis') is null or to_regclass('public.kas_hareket') is null then\n    raise exception 'Paket K önkoşulu eksik (tablolar). Hiçbir şey değişmedi.';\n  end if;\n"
    for ad, (tur, govde) in FONKSIYONLAR.items():
        s += f"  create or replace function public.{ad}() returns {tur} language plpgsql security definer set search_path = public as {q(govde)};\n"
        s += f"  revoke all on function public.{ad}() from public, anon, authenticated;\n"
    for ad, tablo, zaman, fn in TETIKLER:
        s += f"  drop trigger if exists {ad} on public.{tablo};\n  create trigger {ad} {zaman} on public.{tablo} for each row execute function public.{fn}();\n"
    for tablo, sutun, ad, hedef in YABANCI:
        s += f"  if not exists (select 1 from pg_constraint where conname = '{ad}') then\n    alter table public.{tablo} add constraint {ad} foreign key ({sutun}) references public.{hedef} (id) not valid;\n  end if;\n"
    s += "end $$;\n" + (DURUM % "EKSİK")
    return s
def geri():
    s = BASLIK % ("geri-al", "GERİ ALMA (AYRI ONAYLA): tetikleyiciler, fonksiyonlar ve doğrulanmamış yabancı anahtarlar kalkar. Veriye dokunmaz.")
    s += "do $$\nbegin\n"
    s += "  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then\n    raise exception 'Paket K geri alma postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;\n  end if;\n"
    for ad, tablo, zaman, fn in TETIKLER: s += f"  drop trigger if exists {ad} on public.{tablo};\n"
    for tablo, sutun, ad, hedef in YABANCI: s += f"  alter table public.{tablo} drop constraint if exists {ad};\n"
    for ad in FONKSIYONLAR: s += f"  drop function if exists public.{ad}();\n"
    s += "end $$;\n" + (DURUM % "yok")
    return s
for ad, icerik in (("52-k-uygula.sql", uygula()), ("52-k-geri-al.sql", geri()), ("52-k-durum-salt-okur.sql", "-- PAKET K DURUMU — SALT OKUR. Hiçbir şey yazmaz.\n" + (DURUM % "EKSİK"))):
    assert len(re.findall(r"\$", icerik)) in (0, 4), (ad, "dolar işareti")
    open(os.path.join(D, ad), "w", encoding="utf8", newline="\n").write(icerik)
    print(ad, len(icerik), "bayt")
