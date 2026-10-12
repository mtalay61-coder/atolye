-- VİTRİN — web sitesinin (newdiamond.com.tr) ürün koleksiyonu (v1.645.15).
--
-- Kullanıcı: "Ürün kataloğu sitede ERP'den canlı gelsin." Site giriş yapmadan (anon) okur; bu yüzden tablolar
-- açılmaz — yalnız bu fonksiyon açılır ve yalnız GÖSTERİLMESİ İSTENEN alanları döndürür:
--   · yalnız ERP'de ürün kartında "Sitede göster" işaretli (ek->>'sitedeGoster' = 'true'), pasif olmayan MAMUL ürünler
--   · ad, mamul tipi, sezon, renkler, renk resimleri, kapak resmi
--   · FİYAT, STOK, MALİYET, REÇETE, TEDARİKÇİ, CARİ YOK.
-- SECURITY DEFINER: fonksiyon tabloları sahibinin yetkisiyle okur; anon kullanıcı tablolara hiçbir yoldan erişemez
-- (rls-* kuralları aynen geçerli). Çalıştırma: Supabase › SQL Editor › yapıştır › Run. Tekrar çalıştırmak zararsız.

create or replace function public.vitrin()
returns table (
  id text, ad text, tip text, sezon text, sezon_yili text,
  renkler jsonb, renk_resimleri jsonb, kapak_resmi text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id::text,
    u.ad::text,
    u.mamul_tipi::text,
    coalesce(u.ek->>'sezon', '')::text,
    coalesce(u.sezon_yili::text, ''),
    coalesce((select jsonb_agg(distinct v.renk) from varyantlar v where v.urun_id::text = u.id::text and coalesce(v.renk, '') <> ''), '[]'::jsonb),
    coalesce(u.renk_resimleri::jsonb, '{}'::jsonb),
    u.kapak_resmi::text
  from urunler u
  where coalesce(u.ek->>'sitedeGoster', 'false') = 'true'
    and not coalesce(u.pasif, false)
    and u.kategori = 'Mamul'
  order by u.ad;
$$;

revoke all on function public.vitrin() from public;
grant execute on function public.vitrin() to anon, authenticated;
