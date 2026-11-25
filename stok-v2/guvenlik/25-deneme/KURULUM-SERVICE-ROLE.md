# Kurulum bulgusu — yeni projede `service_role` tablo / fonksiyon yetkileri kurulmuyor (25 Kasım, deneme projesinde görüldü)

Durum: BULGU + ÖNERİ. Kaynak (`kurulum-betigi.sql`) DEĞİŞTİRİLMEDİ: `kurulum_betigi()` canlı veritabanında çalışan bir fonksiyon;
düzeltmesi canlıya SQL çalıştırmayı gerektirir (bu işin kapsamı dışında, ayrı karar).

## Belirti

Deneme projesinde (`drtmnovafswzcmpacubl`) Tanımlar › Kullanıcılar › Yeni kullanıcı: "Kullanıcı EKLENMEDİ: bulut hesabı açılamadı.
Tanımlar okunamadı: permission denied for table tanimlar". `kullanici` sunucu fonksiyonu çağıranın rolünü `tanimlar`'dan
`SUPABASE_SERVICE_ROLE_KEY` ile okur. Teşhis: `service_role` tanimlar SELECT **false**; yetki listesi
`postgres=arwdDxtm/postgres authenticated=arwdxt/postgres` — service_role (ve anon) hiç yok. Rol RLS'i atlıyor (bypassrls true),
şema kullanımı var; eksik olan yalnız tablo yetkisi.

## Neden (kaynaktan)

`kurulum-betigi.sql`, 8. adım (yetkiler), satır 161–192 ve 8b (varsayılan yetkiler), satır 195–211:
- Önce `revoke all … from anon, authenticated` yazar, sonra canlıdaki yetkileri **yalnız `anon`, `authenticated` (ve `public`)
  için** yeniden üretir (`pg_get_userbyid(acl.grantee) in ('anon', 'authenticated')`). `service_role` satırları hiç taşınmaz.
- Fonksiyonlarda da aynı: `revoke all on all functions … from public, anon, authenticated` + yalnız anon / authenticated / public
  için `grant execute`. Canlıda yalnız `service_role`'e AÇIKÇA verilmiş fonksiyon (ör. `fis_gece_denetimi`, `lst_belge`,
  guvenlik/2-sikilastir.sql'in `servis_once` korudukları) yeni projede PUBLIC'ten de alındığı için service_role'e kapalı kalabilir.
- Varsayım şuydu (yorum, satır 161): "Supabase yeni tabloya … varsayılan yetki veriyor". Eskiden Supabase public şemadaki yeni
  tablolara anon / authenticated / service_role için varsayılan yetki verirdi; betik service_role'ü bu varsayılana bırakmış.
  Deneme projesinde tablolarda service_role'ün HİÇ olmaması bu varsayılanın orada işlemediğini gösteriyor (tablolar betikteki
  `create table` ile postgres tarafından açılıyor; postgres'in public varsayılan yetkilerinde service_role yoksa yetki gelmez).
  Hangi Supabase ayarı / sürümüyle böyle olduğu ÖLÇÜLMEDİ; ölçülen yalnız sonuç.
- Deneme projesinin bu betikle kurulduğu belgelerde yazılı değil; ACL deseni (yalnız postgres + authenticated, anon alınmış)
  betiğin çıktısıyla birebir uyuşuyor.

## Etki (yeni firma kurulumunda)

Sunucu fonksiyonları `service_role` ile şunlara erişir (kaynaklardan sayıldı):

| Fonksiyon | Erişim |
|---|---|
| `kullanici` | `tanimlar` (select) — yoksa hiçbir kullanıcı açılamaz (deneme projesinde görüldü) |
| `gun-sonu` | `tanimlar`, `muhasebe`, `gun_sonu_gonderim` (okuma + yazma), `rpc fis_gece_denetimi` |
| `eposta` | `tanimlar` |
| `site-bildirim` | `tanimlar`, `site_talepleri`, `site_kayit_talepleri`, `site_bildirim_kaydi` |
| `kur` | veritabanına erişmez |

`yeni-firma-kurulum.md` kontrol listesindeki "Tanımlar › Kullanıcılar'dan yeni kullanıcı açılabiliyor" maddesi bu hatayı yakalar,
ama gün sonu / e-posta / site bildirimi için böyle bir madde yok.
Kapsamı deneme projesinde ölçen salt okur sorgu: `sonra-kullanici-ve-kapsam-salt-okur.sql` satır 3–6.

## Öneri (uygulanmadı; ayrı onay — canlıdaki `kurulum_betigi()` fonksiyonunu değiştirir)

1. `kurulum-betigi.sql` 8. adım: `service_role`'ü de taşı — tablo / dizi / fonksiyon döngülerindeki rol süzgecine `'service_role'`
   ekle ve baştaki `revoke`'lara dahil ETME (yeni projede Supabase'in verdiği fazladan yetki kalsın, eksik olan tamamlansın);
   8b'de de `service_role` varsayılan yetkilerini taşı. Böylece canlıda service_role'ün ne yetkisi varsa yeni projede de olur.
2. `yeni-firma-kurulum.md` kontrol listesine salt okur bir satır: "public tablolar: service_role SELECT YOK = 0" (sorgu 3. satır) ve
   gün sonu / e-posta / site bildirimi fonksiyonları için birer çağrı denemesi.
3. Faz 4 ("canlıdan üretilen kurulum dosyasının boş projede doğrulanması") sınamasına bu ölçüyü ekle.

Deneme projesinde yalnız `tanimlar` SELECT verildi (kullanıcı onayı, 25 Kasım); diğer tablolar / fonksiyonlar ölçülür ama
yetki verilmez.

## Deneme projesinde ölçülen kapsam (25 Kasım, salt okur)

- Tablolar: 49'un **35**'inde service_role SELECT yok. Olan 14 tablo, stok-v2 kurulum SQL'lerinin service_role'e AÇIKÇA
  `grant select` verdikleri (ör. 1-kurulum, 4-cari, 9-kasa, 18-fis-defteri) — yani yetki yalnız elle verildiği yerde var.
- Varsayılan yetkiler: postgres'in public tablo varsayılanında service_role **yok** (`postgres=arwdDxtm authenticated=arwdDxt`).
  Bu yüzden sonradan açılan tablolar da (G-25'in `isc_odeme`, `mes_bildirim`'i dahil) service_role'e kapalı doğuyor. Betiğin 8b'si
  service_role varsayılanını ne kaldırıyor ne ekliyor; yokluğu projenin kendi başlangıç varsayılanından geliyor (hangi Supabase
  ayarı olduğu ölçülmedi).
- Fonksiyonlar: 140'ın **0**'ında service_role EXECUTE eksik → fonksiyon tarafı bu projede SORUN DEĞİL (yukarıdaki fonksiyon
  uyarısı yalnız olasılıktı; deneme projesinde gerçekleşmemiş).
- Sunucu fonksiyonlarına etkisi: `tanimlar` artık okunuyor (onaylı tek yetki). `gun-sonu` (`muhasebe`, `gun_sonu_gonderim`) ve
  `site-bildirim` (`site_*`) tablolarının durumu ilk 15'te görünmüyor; bu deneme işinin kapsamında değiller, ölçülmedi.
