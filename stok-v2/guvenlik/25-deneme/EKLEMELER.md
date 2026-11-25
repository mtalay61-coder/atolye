# Deneme projesi — kullanıcı ve veri EKLEMELERİ (yalnız ekleme; silme / sıfırlama YOK)

Durum: HAZIRLANDI, UYGULANMADI. SQL ile değil, uygulamanın kendi ekranlarından (1.745.1, korumalı yerel sunucu, deneme projesi),
mevcut **Yönetici** kullanıcıyla girilir. Şifreleri kullanıcı girer; bu belgede ve sohbette şifre yok. Var olan kayıtlara dokunulmaz.
Sıra: G-25 SQL uygulanıp doğrulandıktan SONRA (onaylar G-25 nesnelerine yazar).

## 1. Kullanıcılar — Tanımlar › Kullanıcılar › Yeni kullanıcı

| Kullanıcı adı | Rol | Yetkiler (görüntüleme / kaydetme / silme) | Ne sınanır |
|---|---|---|---|
| `DenemeMuhasebe` | Kullanıcı | cari g/k/s · muhasebe g/k/s · fişler g/k · sipariş g · üretim g | Onaylar (iş / tamir / mesai), maaş şeridi, iptal |
| `DenemeUretim` | Kullanıcı | üretim g/k · stok g/k · sipariş g · fişler g (cari YOK) | mesai bildirimi, teslim, kısmi teslim, tamir talebi |
| `DenemeSef` | Kullanıcı | cari g · üretim g/k · stok g/k · fişler g/k · sipariş g | cari kartında "Mesaiyi onaya gönder"; maaş ve para düğmeleri kapalı |

Her birine giriş hesabı (şifre) kullanıcı tarafından verilir. Not: uygulama giriş hesabını `functions/v1/kullanici` sunucu
fonksiyonuyla açar; deneme projesinde bu fonksiyon kurulu değilse hesap açılmaz — o durumda ne görüldüğü bildirilir (SQL ile hesap
AÇILMAZ).

## 2. Cariler — Cari › Yeni cari

| Ünvan | Tip | Not |
|---|---|---|
| `Deneme Maaşlı Personel` | Personel | bölüme eklenecek (maaşlı; mesai denemesi) |
| `Deneme Usta` | Personel | bölümde DEĞİL (parça başı; işçilik ona yazılır) |

## 3. Bölüm — Tanımlar › Üretim › Atölye İçi Bölümler (Yönetici; G-25 sonrası maaş cari / muhasebe yetkisi ister)

`Deneme Bölüm` → personel: `Deneme Maaşlı Personel`, aylık maaş **30.000**. Bağlı proses SEÇİLMEZ (Kesim işçiliği cariye yazılsın).

## 3b. Proses — Tanımlar › Üretim › Prosesler (kullanıcı onayı 25 Kasım: yalnız deneme, bir kez)

`Kesim` (deneme projesinde hiç proses yoktu). Uygulama yeni prosese "Kesim işçiliği" gider kartını kendiliğinden açıp bağlar
(v1.693) — rutin bağımlılık, aynı kapsamda.

## 4. Mamul — Stok › Yeni ürün (Mamul)

`Deneme Bot G25` · renk `Siyah` · beden `40` · reçetede proses `Kesim` (hammaddesiz proses olabilir) · proses ücreti **Kesim 35 ₺**.
Ad neden "G25": deneme projesinde proses ücreti boş bir `Deneme Bot` önceden vardı (25 Kasım ölçümü); ona DOKUNULMAZ
(kullanıcı kararı, 25 Kasım) — deneme bu ayrı mamulle yürür.

## 4b. Reçete kapısı (25 Kasım, ekranda görüldü — rutin bağımlılık)

Yeni üretim "reçete tamamlanmadan üretim açılamaz — Reçetede hiç hammadde yok" ile reddedildi (055 `receteEksikleri`: en az bir
hammadde satırı, model renklerini kapsama, miktar > 0; ve reçete ONAYI). Hammaddesiz reçete üretim açamaz. Bu yüzden:
`Deneme Hammadde G25` (Stok › Yeni ürün, kategori Hammadde, birim adet, renksiz / ölçüsüz) → `Deneme Bot G25` reçetesinde Kesim
altında, Siyah için 1 adet / çift → "Reçeteyi onayla". İş verilince bu hammadde stoktan 10 düşer; stok 0 olduğu için −10 olur
(proje kuralı: eksi stok kırpılmaz). Yalnız bu deneme hammaddesini etkiler; G-25 akışına etkisi yok (işçilik ücret / teslim).

## 5. Üretim — Üretim › Yeni Üretim Siparişi

`Deneme Bot G25` · Siyah · 40 × **10** → Kesim adımında **iş ver**: `Deneme Usta`, 10 adet.
(Kontrol listesinin teslim / kısmi teslim / tamir / iptal adımları bu iş üzerinde; gerekirse ikinci bir üretim aynı biçimde.)

## Beklenen sonrası (salt okur `durum-salt-okur.sql` ve `deneme-verisi-salt-okur.sql` ile ölçülür)

`deneme-verisi-salt-okur.sql`: 4. satır `1 · 1 · 1 · 1` · 5. satır `30000 · false` · 6. satır `35` · 7. satır `1 · 10` · 8. satır `Kesim · Deneme Usta · 10 · true · false`.

4. satır: toplam 5 · Yönetici 1 · cari/muhasebe ≥ 1 · üretim ≥ 1 · 6. satır auth hesabı ≥ 6 · 7. satır 1 · 1 · 1 · 8. satır Personel 2 ·
9. satır ≥ 1 · 10. satır üretim 1 · açık atama 1.
