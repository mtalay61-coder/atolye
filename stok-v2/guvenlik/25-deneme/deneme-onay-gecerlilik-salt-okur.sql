-- =====================================================================================================================
--  25-deneme/deneme-onay-gecerlilik-salt-okur.sql — SALT OKUR (SQL Editor / postgres). Deneme Bot G25 işlerinin ücret onaylarının
--  ŞU AN geçerli olup olmadığını sunucunun kendi denetimiyle (g25_onayli — teslim bunu sorar) ve onaylanan / güncel özetle gösterir.
--  Test 12 (35 → 40 → 35): 40'ta "false" beklenir; 35'e dönünce de false beklenir (true ise eski onay KENDİLİĞİNDEN canlanmış = bulgu).
-- =====================================================================================================================
with ure as (select u.id, u.siparis_no from public.uretim u join public.urunler p on p.id = u.urun_id where p.ad = 'Deneme Bot G25')
select (select siparis_no from ure where ure.id::text = o.ozet ->> 'uretim') as uretim, o.anahtar,
       public.g25_onayli(o.anahtar) as su_an_gecerli,
       o.ozet ->> 'ucret' as onaylanan_ucret, public.g25_ucret_guncel(o.anahtar) ->> 'ucret' as guncel_ucret,
       o.ozet ->> 'miktar' as onaylanan_miktar, public.g25_ucret_guncel(o.anahtar) ->> 'miktar' as guncel_miktar,
       o.onaylayan, to_char(o.onay_zamani, 'HH24:MI:SS') as onay_saati,
       (select p.proses_ucretleri ->> 'Kesim' from public.urunler p where p.ad = 'Deneme Bot G25') as urun_kesim_ucreti
from public.ucr_onay o where o.ozet ->> 'uretim' in (select id::text from ure)
order by o.onay_zamani;
