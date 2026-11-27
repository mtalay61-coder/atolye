-- AD GERİ YAZMA TANISI — SALT OKUR (27 Kasım). Hiçbir şey yazmaz, hiçbir şeyi onarmaz.
-- 1.744.46 hatası: renk adı sunucuda değiştikten sonra aynı cihazın (sayfa yenilenmeden yaptığı) sonraki Tanımlar kaydı eski adı
-- Tanımlar'a geri yazabiliyordu; sipariş kalemleri yeni adda kaldığı için bağ kopuyordu. Bu sorgu o izi arar:
--   1 = eski ad defterindeki SON ad ile rengin / model renginin ŞİMDİKİ adı farklı (ad defter dışında değişmiş)
--   2 = Tanımlar'daki ad ile stok tarafındaki ad aynı kimlikte farklı
--   3 = adı defterde geçen sipariş kalemi, ürününün hiçbir varyant adıyla birebir eşleşmiyor (kopuk)
--   4 = adı defterde geçen üretim / rezervasyon kaydı, şimdiki hiçbir etkin renk / model rengi adı değil
-- Beklenen: hiç satır yok, son satır GENEL "TEMİZ". Satır çıkarsa bir şey değiştirmeden sonucu gönder.
with
son as (select distinct on (h.renk_id) h.renk_id, h.yeni_ad, h.zaman from public.tanim_ad_gecmisi h order by h.renk_id, h.id desc),
defter_ad as (select public.stk_nrm(h.eski_ad) as n from public.tanim_ad_gecmisi h union select public.stk_nrm(h.yeni_ad) from public.tanim_ad_gecmisi h),
etkin as (select s.ad from public.stk_renk s where s.aktif),
b(no, bulgu, ayrinti, sayi) as (
  select 1, 'defterdeki son ad ≠ şimdiki ad (kimlik: defterdeki son ad → şimdiki ad)',
         s.renk_id || ': ' || s.yeni_ad || ' → ' || coalesce(r.ad, '(kayıt yok)') || case when r.aktif is false then ' (pasif)' else '' end, 1::numeric
    from son s left join public.stk_renk r on r.id = s.renk_id where r.ad is distinct from s.yeni_ad
  union all
  select 2, 'Tanımlar''daki ad ≠ stok tarafındaki ad (kimlik: Tanımlar → stok)', x ->> 'id' || ': ' || (x ->> 'ad') || ' → ' || r.ad, 1
    from public.tanimlar t, jsonb_array_elements(coalesce(t.veri -> 'renkler', '[]'::jsonb)) x join public.stk_renk r on r.id = x ->> 'id'
   where t.id = 'tekil' and r.ad is distinct from x ->> 'ad'
  union all
  select 3, 'KOPUK sipariş kalemi (ürün · kalemdeki ad)', k.urun_id || ' · ' || k.renk, count(*)
    from public.siparis_kalemleri k
   where public.stk_nrm(k.renk) in (select n from defter_ad)
     and not exists (select 1 from public.varyantlar v where v.urun_id = k.urun_id and v.renk = k.renk)
   group by k.urun_id, k.renk
  union all
  select 4, 'üretim kaydı şimdiki bir ad değil (kayıttaki ad)', u.renk, count(*)
    from public.uretim u where public.stk_nrm(u.renk) in (select n from defter_ad) and u.renk not in (select ad from etkin) group by u.renk
  union all
  select 4, 'rezervasyon kaydı şimdiki bir ad değil (kayıttaki ad)', z.renk, count(*)
    from public.stok_rezervasyonlari z where public.stk_nrm(z.renk) in (select n from defter_ad) and z.renk not in (select ad from etkin) group by z.renk
)
select no, bulgu, ayrinti, sayi from b
union all
select 90, 'bilgi: defterdeki kayıt sayısı · adı değişmiş kimlik sayısı · son değişiklik', (select count(*)::text from public.tanim_ad_gecmisi) || ' · ' || (select count(*)::text from son)
       || ' · ' || coalesce((select to_char(max(zaman) at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI') from public.tanim_ad_gecmisi), '-'), null
union all
select 99, 'GENEL', case when exists (select 1 from b) then 'İNCELE — yukarıdaki satırlar; bir şey değiştirmeden sonucu gönder' else 'TEMİZ — ad geri yazma izi yok' end, null
order by 1, 3;
