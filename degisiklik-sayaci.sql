-- DEĞİŞİKLİK SAYACI (7 Ekim 2026, v1.611.0) — başka cihazın yazdığını ANINDA görmek için.
--
-- Kullanıcı: "Başka kullanıcıların yaptığı işlemler geç düşüyor, anında nasıl görebiliriz?" Uygulama buluttaki
-- değişiklikleri yalnız açılışta okuyordu. Şimdi sekme açıkken birkaç saniyede bir bu TEK SATIRI okur (küçük istek);
-- bir tablonun sayacı artmışsa yalnız o tabloyu buluttan yeniden çeker ve ekrana sessizce işler.
--
-- Her uygulama tablosuna AFTER ... FOR EACH STATEMENT tetikleyici: bir yazma (kaç satır olursa olsun) o tablonun
-- sayacını 1 artırır. Tetikleyici `security definer`: yazan kullanıcının `degisiklik` tablosunda UPDATE yetkisi
-- olmasına gerek yok. Uygulama yalnız okur.
--
-- Supabase > SQL Editor'da BİR KEZ çalıştırın. Yeniden çalıştırmak güvenlidir (if not exists / drop+create).
-- Not (7 Ekim): ilk sürümdeki `do $$ ... foreach ... array[...]` bloğu Supabase SQL düzenleyicisinde
-- "syntax error at or near )" verdi; PostgreSQL 16'da sorunsuz çalışıyordu. Düzenleyicinin betik bölme/`$$`
-- işlemesine takılmamak için do-bloğu ve köşeli parantez kaldırıldı: kurulum, adlı dolar tırnaklı
-- (`$kur$`) yardımcı bir fonksiyon + düz `select` çağrılarıyla yapılıyor.

create table if not exists public.degisiklik (
  id text primary key default 'tekil',
  sayaclar jsonb not null default '{}'::jsonb,
  zaman timestamptz not null default now()
);

insert into public.degisiklik (id) values ('tekil') on conflict (id) do nothing;

create or replace function public.degisiklik_bump() returns trigger
language plpgsql security definer set search_path = public as $bump$
begin
  update public.degisiklik
     set sayaclar = jsonb_set(coalesce(sayaclar, '{}'::jsonb), string_to_array(TG_TABLE_NAME, ''),
                              to_jsonb(coalesce((sayaclar ->> TG_TABLE_NAME)::bigint, 0) + 1), true),
         zaman = now()
   where id = 'tekil';
  return null;
end
$bump$;

-- Yardımcı: tablo varsa tetikleyiciyi (yeniden) kurar, yoksa atlar. Dönen metin kurulum raporu.
create or replace function public.degisiklik_izle_kur(t text) returns text
language plpgsql security definer set search_path = public as $kur$
begin
  if to_regclass('public.' || t) is null then
    return t || ': tablo yok, atlandi';
  end if;
  execute format('drop trigger if exists degisiklik_izle on public.%I', t);
  execute format('create trigger degisiklik_izle after insert or update or delete on public.%I for each statement execute function public.degisiklik_bump()', t);
  return t || ': kuruldu';
end
$kur$;

select public.degisiklik_izle_kur('tanimlar');
select public.degisiklik_izle_kur('cariler');
select public.degisiklik_izle_kur('cari_hareketleri');
select public.degisiklik_izle_kur('urunler');
select public.degisiklik_izle_kur('varyantlar');
select public.degisiklik_izle_kur('stok_hareketleri');
select public.degisiklik_izle_kur('siparisler');
select public.degisiklik_izle_kur('siparis_kalemleri');
select public.degisiklik_izle_kur('uretim');
select public.degisiklik_izle_kur('uretim_atamalari');
select public.degisiklik_izle_kur('stok_rezervasyonlari');
select public.degisiklik_izle_kur('onaylar');
select public.degisiklik_izle_kur('cop');
select public.degisiklik_izle_kur('muhasebe');
select public.degisiklik_izle_kur('koliler');
select public.degisiklik_izle_kur('gorevler');
select public.degisiklik_izle_kur('mesajlar');
select public.degisiklik_izle_kur('faturalar');
select public.degisiklik_izle_kur('fis_defteri');
select public.degisiklik_izle_kur('cek_gorselleri');
select public.degisiklik_izle_kur('modeller');

-- Okuma yetkisi: rls-kimlik.sql ile aynı desen — giriş yapmış kullanıcı okur. Yazma yalnız tetikleyiciden.
alter table public.degisiklik enable row level security;
drop policy if exists giris_yapmis_hersey on public.degisiklik;
create policy giris_yapmis_hersey on public.degisiklik for select to authenticated using (true);
grant select on public.degisiklik to authenticated;

-- DOĞRULAMA: select sayaclar, zaman from degisiklik;  → bir kayıt değiştirince ilgili tablonun sayısı artmalı.
