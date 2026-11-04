-- YABANCI ANAHTAR DURUMU (SALT-OKUR, 4 Kasım). Hiçbir şey yazmaz. F2'de NOT VALID kurulan iki anahtar (stk_hareket.kalem_id ve
-- gecmis_kalem_id → siparis_kalemleri.id) doğrulanmış mı ve doğrulansa hangi satırlar takılırdı. VALIDATE CONSTRAINT ayrı onayla
-- (karar K5); bu sorgu yalnız ön koşulu gösterir: ihlal_eden = 0 ise doğrulama güvenle yapılabilir.
select c.conname as anahtar, c.convalidated as dogrulanmis,
  case c.conname
    when 'stk_hareket_kalem_fk' then (select count(*) from public.stk_hareket h where h.kalem_id is not null
                                        and not exists (select 1 from public.siparis_kalemleri k where k.id::text = h.kalem_id))
    when 'stk_hareket_gecmis_kalem_fk' then (select count(*) from public.stk_hareket h where h.gecmis_kalem_id is not null
                                        and not exists (select 1 from public.siparis_kalemleri k where k.id::text = h.gecmis_kalem_id))
  end as ihlal_eden,
  pg_get_constraintdef(c.oid) as tanim
from pg_constraint c
where c.conrelid = 'public.stk_hareket'::regclass and c.contype = 'f'
order by 1;
