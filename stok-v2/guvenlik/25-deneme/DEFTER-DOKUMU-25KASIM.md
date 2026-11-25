# Deneme projesi — defter dökümü ve plan dışı kayıtlar (25 Kasım, salt okur `deneme-defter-dokum-salt-okur.sql` 6d356111…)

## Başlangıç (kontrol listesinden ÖNCE, 18 Kasım — deneme projesinde önceden vardı)

| Kayıt | Değer |
|---|---|
| Fişler | 3: MNL Giriş (08:43) · TH Tahsilat 150 ₺ Deneme Müşteri (08:45) · MNL Giriş (11:34) |
| Stok | Deneme Bot (eski, G-25 dışı) +3 +2 = **5** |
| Cari | Deneme Müşteri Alacak **150** |
| Deneme Usta / Deneme Maaşlı Personel / Deneme Bot G25 / Deneme Hammadde G25 | yoktu (25 Kasım eklendi) |

## 25 Kasım fişleri (zaman sırası) — PLAN İÇİ / PLAN DIŞI

| # | Zaman | Fiş | Tutar | Kim | Adım | Plan |
|---|---|---|---|---|---|---|
| 4 | 13:41:13 | ÜRT 10001 | 350 | Yönetici | Test 1–2 için açılan iş Yönetici ile teslim alındı | **PLAN DIŞI** (PARA yolu; ödeme defterine girmedi) |
| 5 | 14:08:32 | ÜRT 10002 | 350 | Yönetici | ikinci deneme işi; Yönetici teslimi | **PLAN DIŞI** — 14:08:40 Yönetici "Geri Al" ile İPTAL |
| 6 | 14:08:47 | ÜRT 10002 | 350 | Yönetici | aynı işin yeniden teslimi; **artan iade 10 girildi** | **PLAN DIŞI** (defterde yok) |
| 7 | 14:34:53 | MAŞ | 30 000 | DenemeMuhasebe | Test 6 başında "Maaş tahakkuku bekliyor" şeridinde Onayla | **PLAN DIŞI** |
| 8 | 14:35:08 | MS | 2 000 | DenemeMuhasebe | Test 6 mesai onayı (133,33 × 10 × 1,5) | plan içi |
| 9 | 14:40:53 | ÜRT 10003 | 210 | DenemeUretim | Test 8 kısmi 6 | plan içi |
| 10 | 14:42:07 | ÜRT 10003 | 140 | DenemeUretim | Test 9 kalan 4 (+ Test 10 çift basış) | plan içi — 14:49:05 Yönetici Geri Al ile İPTAL (Test 11) |
| 11 | 15:06:56 | ÜRT 10003 | 140 | DenemeUretim | Test 11 yeniden teslim | plan içi |
| 12 | 17:56:48 | ÜRT 10004 | 350 | Yönetici | Test 12 2. döngüde, onay mühürlüyken Yönetici teslimi | **PLAN DIŞI** (PARA yolu; defterde yok) |
| 13 | 18:14:00 | ÜRT 10005 | 350 | DenemeUretim | Test 12 3. döngü, yeniden onaydan sonra (8 sağlam + 2 tamir) | plan içi |
| 14 | 18:17:52 | ÜRT 10005 | 20 | DenemeUretim | Test 7 tamir 2 × 10 | plan içi |

## Sonuç hesapları (döküm anı) ve mutabakat

| Hesap | Döküm | Hesaplanan | Açıklama |
|---|---|---|---|
| Deneme Usta (Alacak, geçerli) | **1 770** · 7 geçerli · 2 iptal | 350 + 350 + 210 + 140 + 350 + 350 + 20 = 1 770 | 10001, 10002, 10004 (plan dışı Yönetici) = 1 050; plan içi 720. İptaller: 10002 ilk, 10003 ilk 140 |
| Deneme Maaşlı Personel | **32 000** | 30 000 (MAŞ, plan dışı) + 2 000 (MS) | |
| Deneme Müşteri | 150 | başlangıçla aynı | dokunulmadı |
| Deneme Bot G25 (mamul) | **+50** | 10 + 10 + 6 + 4 + 10 + 8 + 2 | iptal edilen 10002 / 10003 girişleri iptal işaretli |
| Deneme Hammadde G25 | **−40** | 5 işin çıkışı −50 (10001, 10002, 10003, 10004, 10005 — her biri −10, 10002'nin iptal edilen −10'u hariç) + 10002 artan iade +10 | aşağıda |
| Deneme Bot (eski) | 5 | başlangıçla aynı | dokunulmadı |

## "10 adet artan iade" ve eksi hammadde — kaynak ayrımı

- **Artan iade 10 (10002, 14:08:48) — GİRİŞTEN, uygulamanın otomatik dolumundan DEĞİL.** "Artan" kutusu iş verilirken kaydedilen
  `verilen − beklenen` farkıyla ön dolar (`src/305-teslimalma.jsx:27-34`); 10002'de kayıtlı değer `verilen 10 / beklenen 10` → fark 0 → kutu
  BOŞ gelir. Geri Al bu kaydı değiştirmez (10002 atamasında hâlâ 10 / 10). Dolayısıyla 10 elle girildi (kullanıcı: ilk teslimde "adet 0"
  girildi, düzeltirken adet girildi — iade kutusu adet sanılmış olabilir). Uygulama hatası değil; ama ayrı bir **doğrulama eksikliği**:
  10 sağlam çift teslim edilirken verilen hammaddenin TAMAMI (10 / 10) "artan" olarak geri alınabildi (fiziksel olarak tutarsız: 10 çift
  hammaddesiz üretilmiş sayıldı). Form yalnız "verilenden fazla iade" uyarısı veriyor. G-25 dışı; öneri: teslim edilen adedin reçete
  tüketiminden fazlası artan girilirse uyarı.
- **Eksi hammadde (−40) — TEST VERİSİNDEN.** `Deneme Hammadde G25` için hiç alış / giriş fişi kesilmedi (C bölümünde tek pozitif hareket
  artan iade). Her teslim reçete kadar (1 / çift × 10) düşer; proje kuralı eksi stoğu kırpmaz. Tüketim hesabı tutarlı: 10003'ün kalan 4'ü
  hammaddesiz (kısmi teslimde hammadde ilk parçada düşer — tasarım), 10005'in tamir 2'si hammaddesiz.
- Hiçbir kayıt silinmedi, bakiye elle düzeltilmedi.

## Ödeme defteri (isc_odeme) ile ilişki

Defterde OLMAYAN geçerli işçilik: 10001 (10), 10002 (10), 10004 (10) — hepsi Yönetici teslimi. 25c uygulanırsa bunlar `g25_gecmis_iscilik`
ile proses tavanına sayılır (yerel L / D sınamaları); kayıtlar DEĞİŞTİRİLMEZ.
