-- YABANCI ANAHTAR DOĞRULAMASI (4 Kasım; YAZAR — ayrı onayla). F2'de NOT VALID kurulan iki anahtarı doğrular (karar K5).
-- Ön koşul: 4-fk-durum-salt-okur.sql iki anahtarda ihlal_eden = 0 (canlı 4 Kasım: 0 / 0). Veriye dokunmaz; yalnız mevcut satırların
-- kurala uyduğunu bir kez denetleyip anahtarı "doğrulanmış" işaretler. Takılan satır olursa hata verir ve hiçbir şey değişmez.
-- VALIDATE, tabloyu yazmaya kapatmayan hafif bir kilit alır (SHARE UPDATE EXCLUSIVE); işlem tablolarında satır az, saniyeler sürer.
-- Geri alma: "alter table public.stk_hareket drop constraint …; add constraint … not valid" — gerek yok: doğrulama davranış
-- değiştirmez (anahtar zaten yeni ve değişen her satırda zorlanıyordu), yalnız eski satırların da uyduğunu kayda geçirir.
alter table public.stk_hareket validate constraint stk_hareket_kalem_fk;
alter table public.stk_hareket validate constraint stk_hareket_gecmis_kalem_fk;
-- Kontrol: iki satır, dogrulanmis = true
select conname as anahtar, convalidated as dogrulanmis from pg_constraint
 where conrelid = 'public.stk_hareket'::regclass and conname in ('stk_hareket_kalem_fk', 'stk_hareket_gecmis_kalem_fk') order by 1;
