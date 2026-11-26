-- =====================================================================================================================
--  28-b3a-uygula.sql — B3a: ERP TABLOLARINA DOĞRUDAN YAZMADA "LİSTEDE Mİ + YAZMA YETKİSİ VAR MI" (28 Kasım; HAZIRLIK — canlıya UYGULANMADI)
--  SQL Editor: dosyanın TAMAMI, bir kez Run. İlk ifade (do bloğu) ya bütünüyle uygulanır ya hiç; ikinci ifade salt okur doğrulama.
--  B4 / B5'ten (27-b4-*) BAĞIMSIZ: ayrı kurulur, ayrı sınanır, ayrı geri alınır (28-b3a-geri-al.sql).
-- =====================================================================================================================
--  SORUN (inceleme 25, B3a — kanıt test/inceleme/yetki-api.js, canlı yetki / politika / tetikleyicileriyle hizalı taban): ERP tablolarında
--  politika `giris_yapmis_hersey` (authenticated için USING true / WITH CHECK true) ve tablo yetkisi INSERT / UPDATE / DELETE. Oturum jetonu
--  olan, ERP kullanıcı listesinde OLMAYAN bir hesap (kayıt yeniden açılırsa, eski çalışan, panelden açılmış hesap) REST ile ürün adını /
--  sürümünü, cari unvanını değiştirebiliyor, Tanımlar'daki renkleri değiştirip HEPSİNİ silebiliyordu. Bugünkü üç hesabın Yönetici olması
--  bunu kapatmaz.
--  ÇÖZÜM: tablo başına DEYİM düzeyinde BEFORE tetikleyici `b3a_yazma_koru`: istek authenticated rolündeyse (jeton var, rol authenticated)
--  `yetki_var_mi(<7 modül>, kaydetme | duzenleme | silme)` doğru olmalı — yani hesap LİSTEDE ve en az bir modülde görüntüleme dışı yetkisi
--  var (Yönetici her zaman; giriş sistemi kapalıysa herkes — A6 kuralı aynen). Değilse 42501, hiçbir satır yazılmaz.
--  NEDEN TETİKLEYİCİ (politika değil): mevcut politikalara dokunmaz (geri alma = tetikleyiciyi kaldırmak), sunucu işlemlerinin (fis_kes vb.,
--  güvenlik tanımlı) içinde de aynı kuralı uygular — onlar zaten stk_yetki ile "herhangi bir modülde" yetki istiyor, yeni ret doğmaz.
--  KAPSAM: urunler, cariler, tanimlar, siparisler, siparis_kalemleri, uretim, uretim_atamalari, stok_rezervasyonlari, hesaplar,
--  hesap_hareketleri, cekler, cek_gorselleri, onaylar, cop. DIŞINDA: gunluk (salt okur kullanıcının uygulama günlüğü düşmesin), degisiklik
--  (tetikleyici sayacı), site / portal tabloları (site_talepleri, profil, medya, icerik), surum, gun_sonu_gonderim.
--  AÇIK KALAN (B3a-2, ayrı karar): yalnız stok yetkili personelin cari / Tanımlar yazması — uygulama bu tablolara başka modüllerden de
--  meşru yazıyor (hızlı cari ekleme, kod sayaçları, rapor / reçete şablonları); modül bazlı kural alan düzeyinde envanter ister.
do $$
declare
  t text;
  n int := 0;
  v_tablolar text[] := array['urunler', 'cariler', 'tanimlar', 'siparisler', 'siparis_kalemleri', 'uretim', 'uretim_atamalari',
    'stok_rezervasyonlari', 'hesaplar', 'hesap_hareketleri', 'cekler', 'cek_gorselleri', 'onaylar', 'cop'];
begin
  if current_user <> 'postgres' and not (select rolsuper from pg_roles where rolname = current_user) then
    raise exception 'B3a postgres rolüyle çalıştırılmalı (şu an: %). Hiçbir şey değişmedi.', current_user;
  end if;
  if to_regprocedure('public.yetki_var_mi(text[],text)') is null then
    raise exception 'B3a önkoşulu: yetki_var_mi(text[], text) yok. Hiçbir şey değişmedi.';
  end if;
  create or replace function public.b3a_yazma_koru()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as '
  declare
    v_mod text[] := array[''tanimlar'', ''stok'', ''uretim'', ''siparis'', ''cari'', ''fisler'', ''muhasebe''];
  begin
    if auth.jwt() is null or coalesce(auth.jwt() ->> ''role'', '''') <> ''authenticated'' then
      return null;
    end if;
    if public.yetki_var_mi(v_mod, ''kaydetme'') or public.yetki_var_mi(v_mod, ''duzenleme'') or public.yetki_var_mi(v_mod, ''silme'') then
      return null;
    end if;
    raise exception ''Bu işlem için yetkiniz yok: hesap ERP kullanıcı listesinde değil ya da hiçbir modülde yazma yetkisi yok (tablo %, %). Hiçbir şey değişmedi.'',
      tg_table_name, tg_op using errcode = ''42501'';
  end ';
  revoke all on function public.b3a_yazma_koru() from public, anon, authenticated;
  foreach t in array v_tablolar loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists b3a_yazma_koru on public.%I', t);
      execute format('create trigger b3a_yazma_koru before insert or update or delete on public.%I for each statement execute function public.b3a_yazma_koru()', t);
      n := n + 1;
    end if;
  end loop;
  if n < 10 or (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru' and tgenabled = 'O') <> n then
    raise exception 'B3a doğrulama: tetikleyici sayısı % — kurulum GERİ ALINDI', n;
  end if;
end $$;
select 'b3a_yazma_koru fonksiyonu' as kontrol, case when to_regprocedure('public.b3a_yazma_koru()') is null then 'yok' else 'var' end as durum
union all
select 'tetikleyici (etkin) — ' || coalesce(string_agg(c.relname, ', ' order by c.relname), ''), count(*)::text
  from pg_trigger g join pg_class c on c.oid = g.tgrelid where g.tgname = 'b3a_yazma_koru' and g.tgenabled = 'O'
union all
select 'GENEL', case when to_regprocedure('public.b3a_yazma_koru()') is not null
                      and (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru' and tgenabled = 'O') >= 10 then 'KURULU' else 'KURULU DEĞİL' end;
