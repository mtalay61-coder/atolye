#!/usr/bin/env python3
# PAKET F (sunucu) üretici (28 Kasım): 54-f-uygula.sql / 54-f-geri-al.sql / 54-f-durum-salt-okur.sql. Kural: tek do bloğu, yalnız düz `$$`.
import os, re
D = os.path.dirname(os.path.abspath(__file__))
ISTEMCI = "1.744.50"   # fason alanını bilen ilk istemci
def q(g): return "'" + g.strip("\n").replace("'", "''") + "'"
F = {
"f_eski_istemci": ("()", "boolean", "stable", """
declare
  b jsonb; s text;
begin
  -- İstemci sürümü (`x-atolye-surum` başlığı; stk_istemci_koru ile aynı kaynak). Başlık yok / biçimsiz = eski sayılır.
  begin b := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb; exception when others then b := '{}'::jsonb; end;
  s := b ->> 'x-atolye-surum';
  if coalesce(s, '') !~ '\\A[0-9]{1,5}\\.[0-9]{1,5}\\.[0-9]{1,5}\\Z' then return true; end if;
  return string_to_array(s, '.')::int[] < string_to_array('%s', '.')::int[];
end
""" % ISTEMCI),
"f_cari_fason": ("(t jsonb, tip_id text, tip_ad text)", "boolean", "immutable", """
declare
  x jsonb;
begin
  -- İstemcideki `cariFasonMu` ile AYNI kural: tip kimlikle, yoksa adla bulunur; tipte açık `fason` alanı varsa o, yoksa eski kural
  -- (adı tam "Fasoncu"); tip kaydı bulunamazsa carinin kendi tip adı.
  if coalesce(tip_id, '') = '' and coalesce(tip_ad, '') = '' then return false; end if;
  select e into x from jsonb_array_elements(case when jsonb_typeof(t -> 'cariTipleri') = 'array' then t -> 'cariTipleri' else '[{"ad":"Fasoncu","temel":"Personel"}]'::jsonb end) e
   where coalesce(tip_id, '') <> '' and e ->> 'id' = tip_id limit 1;
  if x is null then
    select e into x from jsonb_array_elements(case when jsonb_typeof(t -> 'cariTipleri') = 'array' then t -> 'cariTipleri' else '[{"ad":"Fasoncu","temel":"Personel"}]'::jsonb end) e
     where e ->> 'ad' = tip_ad limit 1;
  end if;
  if x is null then return coalesce(tip_ad, '') = 'Fasoncu'; end if;
  if jsonb_typeof(x -> 'fason') = 'boolean' then return (x ->> 'fason')::boolean; end if;
  return x ->> 'ad' = 'Fasoncu';
end
"""),
"f_fason_yetkisi": ("()", "boolean", "stable", """
begin
  -- Ödeme yönünü değiştiren işlem: Yönetici ya da muhasebe düzenleme yetkisi.
  return public.yonetici_mi() or public.yetki_var_mi(array['muhasebe'], 'duzenleme');
end
"""),
"f_tanim_cari_tipi_koru": ("()", "trigger", "", """
declare
  e jsonb; o jsonb; eski jsonb; yeni jsonb;
begin
  if auth.jwt() is null then return new; end if;
  eski := case when jsonb_typeof(old.veri -> 'cariTipleri') = 'array' then old.veri -> 'cariTipleri' else '[]'::jsonb end;
  yeni := case when jsonb_typeof(new.veri -> 'cariTipleri') = 'array' then new.veri -> 'cariTipleri' else '[]'::jsonb end;
  if (new.veri -> 'cariTipleri') is not distinct from (old.veri -> 'cariTipleri') then return new; end if;
  -- ESKİ İSTEMCİ cari tiplerini değiştiremez: tip kaydını yalnız ad + ana tip olarak yazar, kimliği ve fason alanını SİLER; tipin adını
  -- değiştirince de ödeme yönü dönerdi. (Tanımlar'ın başka bölümünü kaydetmesi serbest: cari tipleri aynı kaldıkça buraya gelmez.)
  if public.f_eski_istemci() then
    raise exception 'AT001: Uygulama eski — cari tipleri bu sürümden değiştirilemez (en az %s gerekiyor); uygulamayı yenileyin. Hiçbir şey kaydedilmedi.' using errcode = 'AT001';
  end if;
  for e in select x from jsonb_array_elements(yeni) x loop
    select x into o from jsonb_array_elements(eski) x where coalesce(e ->> 'id', '') <> '' and x ->> 'id' = e ->> 'id' limit 1;
    if o is null then select x into o from jsonb_array_elements(eski) x where x ->> 'ad' = e ->> 'ad' and coalesce(x ->> 'id', '') in ('', coalesce(e ->> 'id', '')) limit 1; end if;
    -- açık alan bir kez yazıldıysa silinemez (alanı bilmeyen bir yazma davranışı ada geri bağlamasın)
    if o is not null and jsonb_typeof(o -> 'fason') = 'boolean' and jsonb_typeof(e -> 'fason') is distinct from 'boolean' then
      raise exception 'KR057: "%%" tipinin fason işareti kayıttan düşürülemez — hiçbir şey kaydedilmedi', e ->> 'ad' using errcode = 'KR057';
    end if;
    -- geçerli fason değeri değişiyorsa (ya da yeni tip fason olarak açılıyorsa) yetki gerekir
    if (case when jsonb_typeof(e -> 'fason') = 'boolean' then (e ->> 'fason')::boolean else e ->> 'ad' = 'Fasoncu' end)
       is distinct from (case when o is null then false when jsonb_typeof(o -> 'fason') = 'boolean' then (o ->> 'fason')::boolean else o ->> 'ad' = 'Fasoncu' end)
       and not public.f_fason_yetkisi() then
      raise exception 'Bu işlem için yetkiniz yok: cari tipinin fason işareti — işçiliğin cariye mi bölüme mi yazılacağını belirler (gereken: muhasebe: düzenleme)' using errcode = '42501';
    end if;
  end loop;
  return new;
end
""" % ISTEMCI),
"f_cari_fason_koru": ("()", "trigger", "", """
declare
  t jsonb; eo boolean; en boolean;
begin
  if auth.jwt() is null then return new; end if;
  if (new.ek ->> 'altTip') is not distinct from (old.ek ->> 'altTip') and (new.ek ->> 'altTipId') is not distinct from (old.ek ->> 'altTipId') then return new; end if;
  select veri into t from public.tanimlar where id = 'tekil';
  eo := public.f_cari_fason(t, old.ek ->> 'altTipId', old.ek ->> 'altTip');
  en := public.f_cari_fason(t, new.ek ->> 'altTipId', new.ek ->> 'altTip');
  if eo is not distinct from en then return new; end if;
  -- Kişinin ödeme yönü değişiyor (fason ↔ fason değil).
  if eo and public.f_eski_istemci() then
    raise exception 'AT001: Uygulama eski — "%%" fason tipinden çıkarılamaz (en az %s gerekiyor); uygulamayı yenileyin. Hiçbir şey kaydedilmedi.', old.unvan using errcode = 'AT001';
  end if;
  if not public.f_fason_yetkisi() then
    raise exception 'Bu işlem için yetkiniz yok: "%%" için fason durumu değişiyor — işçiliğin cariye mi bölüme mi yazılacağını belirler (gereken: muhasebe: düzenleme)', old.unvan using errcode = '42501';
  end if;
  return new;
end
""" % ISTEMCI),
"f_uretim_tahakkuk_koru": ("()", "trigger", "", """
declare
  t jsonb; x jsonb; c record;
begin
  -- İŞÇİLİĞİN YÖNÜNÜ İSTEMCİ BELİRLER (teslimde ya carinin hareketi ya üretimin bölüm tahakkuku yazılır). Eski / bayat bir istemci,
  -- kendi ekranındaki eski tip adına bakıp FASON kişinin işçiliğini bölüm tahakkukuna yazabiliyordu (ekran-fason-teslim, eski istemci).
  -- Sunucu burada YENİ eklenen bölüm tahakkuklarına bakar: kişi sunucudaki kayda göre fason ise yazma reddedilir. Teslim tek işlem
  -- olduğu için fiş, stok ve atama da geri alınır — yarım teslim kalmaz. Var olan (eski) tahakkuklara dokunulmaz.
  if auth.jwt() is null or jsonb_typeof(new.ek -> 'bolumTahakkuklari') is distinct from 'array' then return new; end if;
  if tg_op = 'UPDATE' and (new.ek -> 'bolumTahakkuklari') is not distinct from (old.ek -> 'bolumTahakkuklari') then return new; end if;
  select veri into t from public.tanimlar where id = 'tekil';
  for x in select e from jsonb_array_elements(new.ek -> 'bolumTahakkuklari') e
            where coalesce(e ->> 'personelId', '') <> '' and (tg_op = 'INSERT' or not exists (
              select 1 from jsonb_array_elements(case when jsonb_typeof(old.ek -> 'bolumTahakkuklari') = 'array' then old.ek -> 'bolumTahakkuklari' else '[]'::jsonb end) o where o ->> 'id' = e ->> 'id')) loop
    select k.unvan, k.ek into c from public.cariler k where k.id = x ->> 'personelId';
    if found and public.f_cari_fason(t, c.ek ->> 'altTipId', c.ek ->> 'altTip') then
      raise exception 'KR058: "%" fason çalışıyor — işçiliği bölüme değil kendi carisine yazılır. Bu cihazdaki kayıt eski görünüyor; sayfayı yenileyip tekrar deneyin. Hiçbir şey kaydedilmedi.', c.unvan using errcode = 'KR058';
    end if;
  end loop;
  return new;
end
"""),
"f_fis_teslim_koru": ("()", "trigger", "", """
declare
  c record;
begin
  -- ESKİ İSTEMCİ FASON KİŞİNİN TESLİMİNİ ALAMAZ. Teslim iki ayrı istektir (fiş: fis_kes; üretim satırı: ayrı yazma) ve işçiliğin yönünü
  -- istemci seçer. Eski istemci yönü kendi ekranındaki tip ADINA göre seçtiği için fason kişinin işçiliğini bölüme yazmaya kalkabiliyor;
  -- f_uretim_tahakkuk_koru bunu reddediyor ama fiş o sırada kesilmiş oluyordu (yarım teslim: mamul stokta, işçilik hiçbir yerde).
  -- Bu yüzden ret FİŞ düzeyinde verilir: fiş, stok, atama, cari — hiçbiri yazılmaz. Yeni istemci ve fason olmayan kişiler etkilenmez.
  if auth.jwt() is null or new.uretim_id is null or coalesce(new.ek ->> 'proses', '') = '' or not public.f_eski_istemci() then return new; end if;
  select k.unvan into c from public.uretim_atamalari a join public.cariler k on k.id = a.personel_id
   where a.uretim_id = new.uretim_id and a.proses = new.ek ->> 'proses' and not coalesce(a.tamamlandi_mi, false)
     and public.f_cari_fason((select veri from public.tanimlar where id = 'tekil'), k.ek ->> 'altTipId', k.ek ->> 'altTip') limit 1;
  if found then
    raise exception 'AT001: Uygulama eski — "%%" fason çalışıyor, teslimi bu sürümden alınamaz (en az %s gerekiyor); uygulamayı yenileyin. Hiçbir şey kaydedilmedi.', c.unvan using errcode = 'AT001';
  end if;
  return new;
end
""" % ISTEMCI),
}
TET = [("f_fis_teslim_koru", "stk_fis", "before insert"), ("f_tanim_cari_tipi_koru", "tanimlar", "before update of veri"), ("f_cari_fason_koru", "cariler", "before update of ek"),
       ("f_uretim_tahakkuk_koru", "uretim", "before insert or update of ek")]
BASLIK = """-- =====================================================================================================================
--  54-f-%s.sql — ÜRETİLDİ (stok-v2/guvenlik/54-f-uret.py; ELLE DÜZENLENMEZ).
--  PAKET F (sunucu) — %s
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
"""
DURUM = """with k(no, kontrol, beklenen, bulunan) as (
  select 1, 'fonksiyonlar (f_eski_istemci, f_cari_fason, f_fason_yetkisi, f_tanim_cari_tipi_koru, f_cari_fason_koru, f_uretim_tahakkuk_koru, f_fis_teslim_koru)', '7',
     (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('f_eski_istemci', 'f_cari_fason', 'f_fason_yetkisi', 'f_tanim_cari_tipi_koru', 'f_cari_fason_koru', 'f_uretim_tahakkuk_koru', 'f_fis_teslim_koru'))
  union all select 2, 'etkin tetikleyiciler (tanimlar, cariler, uretim, stk_fis)', '4', (select count(*)::text from pg_trigger g where not g.tgisinternal and g.tgenabled = 'O' and g.tgname in ('f_tanim_cari_tipi_koru', 'f_cari_fason_koru', 'f_uretim_tahakkuk_koru', 'f_fis_teslim_koru'))
  union all select 3, 'fonksiyonlar authenticated / anon tarafından doğrudan çağrılamaz', 'evet',
     case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('f_eski_istemci', 'f_cari_fason', 'f_fason_yetkisi', 'f_tanim_cari_tipi_koru', 'f_cari_fason_koru', 'f_uretim_tahakkuk_koru', 'f_fis_teslim_koru')
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))) then 'HAYIR' else 'evet' end
)
select no, kontrol, beklenen, bulunan, case when bulunan = beklenen then 'tamam' else 'EKSİK' end as durum from k
union all select 99, 'GENEL', '', '', case when (select bool_and(bulunan = beklenen) from k) then 'KURULU' when (select bool_and(bulunan in ('0', 'evet')) from k) then 'KURULU DEĞİL' else 'YARIM — sonucu gönder' end
order by 1;
"""
def uygula():
    s = BASLIK % ("uygula", "fason işareti ve ödeme yönü sunucuda korunur: eski istemci cari tiplerini değiştiremez, işaret kayıttan\n--  düşürülemez, fason durumunu değiştirmek Yönetici ya da muhasebe düzenleme yetkisi ister. Veriye dokunmaz, tahakkukları değiştirmez.")
    s += "do $$\nbegin\n  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then\n    raise exception 'Paket F kurulumu postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;\n  end if;\n"
    s += "  if to_regprocedure('public.yonetici_mi()') is null or to_regprocedure('public.yetki_var_mi(text[],text)') is null then\n    raise exception 'Paket F önkoşulu eksik (yetki fonksiyonları). Hiçbir şey değişmedi.';\n  end if;\n"
    for ad, (arg, don, oyn, govde) in F.items():
        s += f"  create or replace function public.{ad}{arg} returns {don} language plpgsql {oyn} security definer set search_path = public as {q(govde)};\n"
        s += f"  revoke all on function public.{ad}{arg} from public, anon, authenticated;\n"
    for ad, tablo, zaman in TET:
        s += f"  drop trigger if exists {ad} on public.{tablo};\n  create trigger {ad} {zaman} on public.{tablo} for each row execute function public.{ad}();\n"
    return s + "end $$;\n" + DURUM
def geri():
    s = BASLIK % ("geri-al", "GERİ ALMA (AYRI ONAYLA): tetikleyiciler ve fonksiyonlar kalkar. Veriye dokunmaz; tiplerdeki fason alanı ve kimlikler KALIR.")
    s += "do $$\nbegin\n  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then\n    raise exception 'Paket F geri alma postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;\n  end if;\n"
    for ad, tablo, zaman in TET: s += f"  drop trigger if exists {ad} on public.{tablo};\n"
    for ad, (arg, don, oyn, govde) in F.items(): s += f"  drop function if exists public.{ad}{arg};\n"
    return s + "end $$;\n" + DURUM
for ad, ic in (("54-f-uygula.sql", uygula()), ("54-f-geri-al.sql", geri()), ("54-f-durum-salt-okur.sql", "-- PAKET F (sunucu) DURUMU — SALT OKUR. Hiçbir şey yazmaz.\n" + DURUM)):
    assert len(re.findall(r"\$", ic)) in (0, 4), (ad, "dolar")
    open(os.path.join(D, ad), "w", encoding="utf8", newline="\n").write(ic); print(ad, len(ic), "bayt")
