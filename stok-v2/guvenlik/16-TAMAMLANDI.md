# 16 — Yeni fonksiyonlar anon'a açık doğmasın: TAMAMLANDI (canlı, 16 Kasım 2026)

Durum: **canlıda uygulandı; hedeflenen kapsamda başarılı.** Tek istisna `storage` şeması (aşağıda) — belgelendi, değiştirilmedi.

## Uygulanan sürüm

- Commit: `9194a51b23513b823d07102a927804eac43df26f` (dal `claude/guvenlik-16-19-20-site-erisim`, PR #359; `b5be401` ile uzlaştırılmış hâl).
- Dosya: `stok-v2/guvenlik/16-varsayilan-yetki-kapat.sql` — 205 satır, sha256 `a1f7d753fd4b6bd31cab6ad331492e353fae11fc35e33b124bae44b23f78247c`.
- Çalıştıran: kullanıcı, Supabase SQL Editor (postgres), dosyanın tamamı. Claude'un canlı erişimi yok; sonuç kullanıcının paylaştığı
  tablodur.
- Değişiklik (yalnız postgres'in GLOBAL fonksiyon varsayılanı): `revoke execute on functions from public` +
  `grant execute on functions to authenticated, service_role`. Var olan fonksiyonların yetkileri ve şemaya özgü kayıtlar değişmedi.

## Canlı sonuç

| adım | kayıt | değer | durum |
|---|---|---|---|
| önce (yedek) | public | {postgres=X, authenticated=X, service_role=X} | bilgi |
| önce (yedek) | storage | {postgres=X, anon=X, authenticated=X, service_role=X} | bilgi |
| önce (yedek) | kayıt sayısı | 2 (global kayıt YOKTU → yerleşik varsayılan: PUBLIC açık) | bilgi |
| sonra | (global) | {postgres=X, authenticated=X, service_role=X} | bilgi |
| sonra | public | {postgres=X, authenticated=X, service_role=X} (değişmedi) | bilgi |
| sonra | storage | {postgres=X, anon=X, authenticated=X, service_role=X} (değişmedi) | bilgi |
| birleşik (önce) | kaydı olmayan her şema / public / storage | anon ✓ · authenticated ✓ · service_role ✓ | bilgi |
| birleşik (sonra) | şemaya özgü kaydı olmayan her şema | anon ✗ · authenticated ✓ · service_role ✓ | tamam |
| birleşik (sonra) | public | anon ✗ · authenticated ✓ · service_role ✓ | tamam |
| birleşik (sonra) | storage | anon ✓ · authenticated ✓ · service_role ✓ | FARKLI |
| kapsam | postgres'in fonksiyonu olan şemalar | extensions (49), public (110) | bilgi |
| sınama (public) | yeni fonksiyon (gerçek deneme, silindi) | anon ✗ · authenticated ✓ · service_role ✓ | tamam |
| sınama (public) | anon'un çalıştırabildiği VAR OLAN fonksiyon sayısı | 9 (değişmedi) | tamam |

Değerlendirme: postgres'in bundan sonra `public`, `extensions` ve şemaya özgü kaydı olmayan her şemada oluşturacağı fonksiyonlar
anon / PUBLIC'e kapalı, authenticated + service_role'e açık doğar. Mevcut anon fonksiyon sayısı 9 kaldı. 'sonra' kaydı yazıldı;
geri alma (`16-varsayilan-yetki-geri-al.sql`, aynı commit, sha256 `dad06a1bdcef6e8a…`) gerekirse canlıyı bu kayıtla karşılaştırıp
yedekten birebir kurar. Geri alma arada oluşturulmuş fonksiyonların izinlerini değiştirmez, yalnız varsayılanları geri getirir.

## İstisna: `storage` şeması (belgelendi, DEĞİŞTİRİLMEDİ)

- postgres için `storage` şemasına özgü bir varsayılan kayıt var ve anon'a EXECUTE veriyor. 16'dan ÖNCE de vardı (yedekte görünüyor).
- Şemaya özgü kayıt yalnız EKLER; global kaydı daraltmak onu kapatmaz. Bu yüzden postgres'in `storage` şemasında oluşturacağı YENİ bir
  fonksiyon anon'a açık doğar. 16'nın tasarımı şemaya özgü kayıtlara dokunmaz (dosya başlığı: "o şemaya özgü kayıt ayrıca bir şey
  eklemiyorsa").
- Bugünkü pratik etki: kapsam satırına göre postgres'in `storage` şemasında fonksiyonu YOK (yalnız `extensions` ve `public`).
- Kaydın kaynağı bu çıktıdan KESİNLEŞMEZ. Supabase'in Storage kurulumunun bıraktığı bir varsayılan olması muhtemeldir, ama bu
  doğrulanmadı. Bu yüzden değiştirilmedi: değiştirmek Storage'ın beklediği yetkileri bozabilir. Değiştirilmesi ayrı inceleme ve ayrı
  onay gerektirir; o zamana kadar postgres olarak `storage` şemasında fonksiyon oluşturulmamalı (oluşturulursa yetkisi açıkça daraltılmalı).

## İlgili

- PR #359 (taslak): 16 / 18 / 19 / 20 kaynakları ve testleri; uzlaştırma `9194a51`; `t16` 44/44 (psql -f + Editor taklidi).
- 19: `stok-v2/guvenlik/19-TAMAMLANDI.md` · Authentication: `stok-v2/guvenlik/20-AUTH-AYAR-KAYDI.md`.
- Bu kayıt için yeni test çalıştırılmadı.
