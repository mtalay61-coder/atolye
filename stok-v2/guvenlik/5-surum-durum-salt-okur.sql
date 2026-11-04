-- CİHAZ SÜRÜMÜ ÖN KOŞULU (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. Fiş kuralları (19-fis-kural-ac.sql) ve sürüm kapısı
-- (min_istemci_surum) açılmadan önce: eski uygulama hâlâ yazıyor mu?
-- stk_istemci_iz yalnız SÜRÜM BAŞLIĞI GÖNDERMEYEN uygulama yazmasını kaydeder (1.743'ten eski; canlıda 1.742.1). Canlı 1.742.1'den
-- doğrudan 1.744.4'e geçti (3 Kasım) → geçişten sonra satır yoksa eski uygulamayla yazan cihaz yok. SINIR: hiç yazmamış (yalnız açık
-- duran) eski sekme burada görünmez — o sekme açılışta / 10 dk arka plan dönüşünde yeni sürüme kendiliğinden geçer.
select 'mevcut_ayar' as bolum, 'min_istemci_surum = ' || coalesce(min_istemci_surum, 'NULL') || ' · fiş kuralları açık = ' || public.fis_kural_aktif()::text as deger
  from public.stk_ayar where id = 'tekil'
union all
select 'eski_uygulama_yazmasi_son_7_gun', coalesce(to_char(date_trunc('day', zaman), 'YYYY-MM-DD') || ' · ' || tablo || ' · ' || islem || ' · ' || count(*)::text, '—')
  from public.stk_istemci_iz where zaman > now() - interval '7 days' group by date_trunc('day', zaman), tablo, islem
union all
select 'eski_uygulama_son_yazma', coalesce(max(zaman)::text, 'hiç yok') from public.stk_istemci_iz
order by 1, 2;
