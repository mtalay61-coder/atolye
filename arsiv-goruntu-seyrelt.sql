-- ARŞİV GÖRÜNTÜLERİNİ SEYRELT (v1.634.2 — 10 Ekim 2026)
--
-- Sorun: `silinen_arsiv` 10 günde 25 MB oldu; 24 MB'ı `tanimlar`ın eski hâl kopyaları (GORUNTU, 45 kopya × ~530 KB).
-- Tek satırlık tablolar (tanimlar, modeller, muhasebe…) her değiştiğinde SAATTE BİR tam kopya alınıp 90 gün
-- saklanıyordu; bu hızla 90 günde ~200 MB'a çıkıp ücretsiz planın 500 MB sınırını zorlardı.
-- Yeni kural: tablo başına GÜNDE EN ÇOK BİR kopya, 30 gün saklama. Silinen kayıtların (DELETE) kopyaları
-- değişmiyor: 1 yıl kalmaya devam ediyor. Yalnız okur/siler; uygulama verisine dokunmaz.
-- Supabase > SQL Editor'da bir kez çalıştırın. Tekrar çalıştırmak zararsızdır.

-- 1) Tetikleyici fonksiyonu: saatlik → günlük, 90 gün → 30 gün.
create or replace function public.arsive_kopyala_goruntu()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if OLD.veri is distinct from NEW.veri and not exists (
    select 1 from public.silinen_arsiv
    where tablo = TG_TABLE_NAME and islem = 'GORUNTU' and zaman > now() - interval '24 hours'
  ) then
    insert into public.silinen_arsiv (tablo, islem, satir_id, veri)
    values (TG_TABLE_NAME, 'GORUNTU', to_jsonb(OLD) ->> 'id', to_jsonb(OLD));
    delete from public.silinen_arsiv where islem = 'GORUNTU' and zaman < now() - interval '30 days';
  end if;
  return NEW;
end $$;

revoke all on function public.arsive_kopyala_goruntu() from public, anon, authenticated;

-- 2) Mevcut kopyaları seyrelt: her tablo için HER GÜNÜN EN SON kopyası kalır, diğerleri silinir;
--    30 günden eskiler de silinir.
delete from public.silinen_arsiv a
where a.islem = 'GORUNTU'
  and (
    a.zaman < now() - interval '30 days'
    or exists (
      select 1 from public.silinen_arsiv b
      where b.islem = 'GORUNTU' and b.tablo = a.tablo
        and date_trunc('day', b.zaman) = date_trunc('day', a.zaman)
        and b.zaman > a.zaman
    )
  );

-- 3) Kontrol: kalan kopyalar.
select tablo, islem, count(*) as adet, pg_size_pretty(sum(pg_column_size(veri))::bigint) as boyut
from public.silinen_arsiv group by tablo, islem order by sum(pg_column_size(veri)) desc;
