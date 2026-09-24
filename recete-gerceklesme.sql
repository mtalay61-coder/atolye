-- REÇETE GERÇEKLEŞMESİ
--
-- Ürünün reçetesi bir TAHMİNDİR: "bu bottan bir çift için 30 desi deri gider". Gerçekte ne
-- harcandığı ancak iş bitince belli olur — prosese verilen hammaddeden artan geri gelir ve
-- aradaki fark gerçek tüketimdir.
--
-- Bu sütun, o farkın ÖZETİNİ tutar. Her üretimin her hammaddesi için ayrı satır tutmak ürün
-- kaydını sürekli şişirirdi; burada hammadde başına yalnız "kaç ölçüm" ve "toplam tüketim"
-- duruyor, ortalama ikisinden hesaplanıyor.
--
-- Biçim:
--   { "<hammaddeUrunId>|<renk>|<beden>": { olcum, toplam, planlanan, sonTarih } }
--
-- Neden ürün üzerinde: gerçekleşme MAMULE aittir ("bu modelden bir çift kaç desi yiyor"),
-- hammaddeye değil. Aynı deri başka modelde başka miktarda kullanılır.

alter table urunler add column if not exists recete_gerceklesme jsonb default '{}'::jsonb;
