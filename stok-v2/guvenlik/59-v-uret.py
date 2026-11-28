#!/usr/bin/env python3
# PAKET V üretici (28 Kasım): 59-v-uygula.sql / 59-v-geri-al.sql / 59-v-durum-salt-okur.sql. Kural: tek do bloğu, yalnız düz `$$`.
import os, re
D = os.path.dirname(os.path.abspath(__file__))
def q(g): return "'" + g.strip("\n").replace("'", "''") + "'"
GOVDE = """
declare
  ra text; oa text; w record; u text;
begin
  -- İKİZ VARYANT: sunucu renk / ölçü ADINI bütün kayıtlar içinde arar (stk_renk_coz, stk_olcu_coz: etkin olan önce). Ürünün o adla
  -- bir varyantı BAŞKA bir renk / ölçü kaydına bağlıysa (pasif kayıt, aynı adlı ikinci kayıt, Beden / Boyut grubunda aynı ad) eşleşme
  -- bulunamıyor ve AYNI ADLA İKİNCİ bir varyant sessizce açılıyordu: sayılan stok eskisinde kalıyor, tüketim yenisinde eksiye
  -- düşüyordu (ölçüm: ekran-recete-renk-tuketim). Ekranda ikisi aynı adla göründüğü için fark edilmiyor.
  -- Kural: bir üründe aynı renk adı + aynı ölçü adı tek varyantta olur. İkincisi açılmaz; işlem bütünüyle reddedilir, hangi kaydın
  -- doğru olduğuna SUNUCU KARAR VERMEZ. Var olan varyantlara ve stoklarına dokunulmaz. Jetonsuz (yönetim) bağlantı serbest.
  if auth.jwt() is null then return new; end if;
  select public.stk_nrm(coalesce((select r.ad from public.stk_renk r where r.id = new.renk_id), '')),
         public.stk_nrm(coalesce((select o.ad from public.stk_olcu o where o.id = new.olcu_id), '')) into ra, oa;
  select v.id, v.renk_id, v.olcu_id, v.aktif,
         (select r.ad || case when r.aktif then '' else ' — pasif renk kaydı' end from public.stk_renk r where r.id = v.renk_id) as renk,
         (select o.ad || ' [' || o.tur || ']' from public.stk_olcu o where o.id = v.olcu_id) as olcu into w
    from public.stk_varyant v
   where v.urun_id = new.urun_id
     and public.stk_nrm(coalesce((select r.ad from public.stk_renk r where r.id = v.renk_id), '')) = ra
     and public.stk_nrm(coalesce((select o.ad from public.stk_olcu o where o.id = v.olcu_id), '')) = oa
     and (coalesce(v.renk_id, '') <> coalesce(new.renk_id, '') or coalesce(v.olcu_id, '') <> coalesce(new.olcu_id, ''))
   order by v.aktif desc, v.id limit 1;
  if not found then return new; end if;
  select ad into u from public.urunler where id = new.urun_id;
  raise exception 'KR060: "%" ürününde "%" / "%" adlı varyant zaten var ama başka bir renk ya da ölçü kaydına bağlı — aynı adla ikinci varyant açılmadı, hiçbir şey kaydedilmedi. Önce renk / ölçü kaydı düzeltilmeli.',
    coalesce(u, new.urun_id), coalesce(w.renk, '-'), coalesce(w.olcu, '-') using errcode = 'KR060';
end
"""
BASLIK = """-- =====================================================================================================================
--  59-v-%s.sql — ÜRETİLDİ (stok-v2/guvenlik/59-v-uret.py; ELLE DÜZENLENMEZ).
--  PAKET V — %s
--  SQL Editor: dosyanın TAMAMINI yapıştırıp bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur.
-- =====================================================================================================================
"""
DURUM = """with ikiz as (
  select v.urun_id, public.stk_nrm(coalesce(r.ad, '')) as ra, public.stk_nrm(coalesce(o.ad, '')) as oa, count(*) as n
    from public.stk_varyant v left join public.stk_renk r on r.id = v.renk_id left join public.stk_olcu o on o.id = v.olcu_id
   group by 1, 2, 3 having count(*) > 1),
k(no, kontrol, beklenen, bulunan) as (
  select 1, 'koruma fonksiyonu (v_ikiz_varyant_koru)', '1', (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'v_ikiz_varyant_koru')
  union all select 2, 'etkin tetikleyici (stk_varyant, kayıt eklenirken)', '1', (select count(*)::text from pg_trigger g where not g.tgisinternal and g.tgenabled = 'O' and g.tgname = 'v_ikiz_varyant_koru')
  union all select 3, 'fonksiyon authenticated / anon tarafından doğrudan çağrılamaz', 'evet',
     case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'v_ikiz_varyant_koru'
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))) then 'HAYIR' else 'evet' end
)
select no, kontrol, beklenen, bulunan, case when bulunan = beklenen then 'tamam' else 'EKSİK' end as durum from k
union all select 90, 'BİLGİ · bugün aynı üründe aynı adla birden çok varyant (paket bunlara dokunmaz)', '', (select count(*)::text || ' ad · ' || coalesce(sum(n), 0)::text || ' varyant' from ikiz), 'bilgi'
union all select 99, 'GENEL', '', '', case when (select bool_and(bulunan = beklenen) from k) then 'KURULU' when (select bool_and(bulunan in ('0', 'evet')) from k) then 'KURULU DEĞİL' else 'YARIM — sonucu gönder' end
order by 1;
"""
KAPI = "  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then\n    raise exception 'Paket V postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;\n  end if;\n"
def uygula():
    s = BASLIK % ("uygula", "ikiz varyant koruması: bir üründe aynı renk adı + ölçü adıyla, başka renk / ölçü kaydına bağlı İKİNCİ varyant açılmaz.\n--  Var olan varyantlara, stoklara, renk ve ölçü kayıtlarına dokunmaz; yalnız YENİ varyant açılırken denetler.")
    s += "do $$\nbegin\n" + KAPI
    s += "  if to_regclass('public.stk_varyant') is null or to_regprocedure('public.stk_nrm(text)') is null then\n    raise exception 'Paket V önkoşulu eksik. Hiçbir şey değişmedi.';\n  end if;\n"
    s += f"  create or replace function public.v_ikiz_varyant_koru() returns trigger language plpgsql security definer set search_path = public as {q(GOVDE)};\n"
    s += "  revoke all on function public.v_ikiz_varyant_koru() from public, anon, authenticated;\n"
    s += "  drop trigger if exists v_ikiz_varyant_koru on public.stk_varyant;\n  create trigger v_ikiz_varyant_koru before insert on public.stk_varyant for each row execute function public.v_ikiz_varyant_koru();\n"
    return s + "end $$;\n" + DURUM
def geri():
    s = BASLIK % ("geri-al", "GERİ ALMA (AYRI ONAYLA): tetikleyici ve fonksiyon kalkar. Veriye dokunmaz.")
    s += "do $$\nbegin\n" + KAPI + "  drop trigger if exists v_ikiz_varyant_koru on public.stk_varyant;\n  drop function if exists public.v_ikiz_varyant_koru();\n"
    return s + "end $$;\n" + DURUM
for ad, ic in (("59-v-uygula.sql", uygula()), ("59-v-geri-al.sql", geri()), ("59-v-durum-salt-okur.sql", "-- PAKET V DURUMU — SALT OKUR. Hiçbir şey yazmaz.\n" + DURUM)):
    assert len(re.findall(r"\$", ic)) in (0, 4), (ad, "dolar")
    open(os.path.join(D, ad), "w", encoding="utf8", newline="\n").write(ic); print(ad, len(ic), "bayt")
