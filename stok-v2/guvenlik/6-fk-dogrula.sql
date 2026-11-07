-- YABANCI ANAHTAR DOĞRULAMASI (4 Kasım; YAZAR — ayrı onayla). F2'de NOT VALID kurulan iki anahtarı doğrular (karar K5).
-- Ön koşul: 4-fk-durum-salt-okur.sql iki anahtarda ihlal_eden = 0 (canlı 4 Kasım: 0 / 0). Veriye dokunmaz; mevcut satırların
-- kurala uyduğunu bir kez denetleyip anahtarı "doğrulanmış" işaretler. Takılan satır olursa hata verir, hiçbir şey değişmez.
--
-- KİLİT: VALIDATE stk_hareket'te SHARE UPDATE EXCLUSIVE, siparis_kalemleri'nde ROW SHARE alır. Normal okuma / ekleme / güncelleme /
-- silme (fiş kesme, teslim, iptal) bununla ÇAKIŞMAZ, beklemez. Bekleyebileceği tek şey aynı tabloda o an süren yapı değişikliği
-- (ALTER / CREATE INDEX / VACUUM FULL) ya da başka bir VALIDATE. TEK İFADE (DO bloğu) içinde:
--   lock_timeout 5 sn  → kilit 5 sn içinde alınamazsa "lock timeout" (55P03) ile DURUR, hiçbir şey değişmez; sonra yeniden denenir.
--   statement_timeout 120 sn → tarama beklenmedik uzun sürerse durur (işlem tablolarında satır az; saniyeler sürer).
-- İki anahtar aynı işlemde: ya ikisi doğrulanır ya hiçbiri. Tekrar çalıştırmak zararsız (doğrulanmış anahtarda anında biter).
-- Geri alma GEREKMEZ: davranış değişmez (anahtar yeni ve değişen satırda zaten zorlanıyordu), yalnız eski satırların da uyduğu kayda
-- geçer. Yine de istenirse: alter table public.stk_hareket drop constraint <ad>, add constraint <ad> foreign key (…) references
-- public.siparis_kalemleri(id) deferrable initially deferred not valid;  (fis-defteri.sql'deki tanım)
do $$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('statement_timeout', '120s', true);
  execute 'alter table public.stk_hareket validate constraint stk_hareket_kalem_fk';
  execute 'alter table public.stk_hareket validate constraint stk_hareket_gecmis_kalem_fk';
  raise notice 'Yabancı anahtar doğrulaması tamam: stk_hareket_kalem_fk, stk_hareket_gecmis_kalem_fk';
end $$;
