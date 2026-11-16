# 22 — Site kayıt onayı tek sunucu işlemi + eski ERP'nin boşta cari açması engeli (16 Kasım 2026)

Durum: **geliştirme dalında hazır (`claude/site-yonetim-yetki`, PR #360), canlıya UYGULANMADI.** Canlı SQL çalıştırılmadı, sürüm
numarası ve yayın dosyaları değişmedi. Tasarım: `21-ATOMIK-ONAY-TASARIM.md` (B seçeneği; §3 uygulamada değişti, aşağıda).

## Dosyalar

| Dosya | Ne |
|---|---|
| `site-portal.sql` — "22 BAŞLANGIÇ / BİTİŞ" bölümü | TEK KAYNAK: `islenme` sütunu, `site_kayit_onayla_yeni_cari`, değişen `site_kayit_onayla` / `site_kayit_reddet`, `site_cari_ekleme_koru` tetikleyicisi, iki yardımcı |
| `22-site-onay-atomik.sql` | Canlıya uygulama — ÜRETİLMİŞ; önkoşul + yedek + değişiklik + doğrulama TEK do bloğunda (SQL Editor ifadeleri ayrı gönderse de ya hepsi ya hiçbiri) |
| `22-site-onay-atomik-geri-al.sql` | Geri alma — ÜRETİLMİŞ; tek do bloğu; açılmış cari / hesaplara dokunmaz |
| `22-onkosul-salt-okur.sql` | Canlı önkoşul / durum — ÜRETİLMİŞ; **tek select, hiçbir şey yazmaz**; GENEL satırı HAZIR / UYGULANMIŞ / DUR |
| `22-uret.py`, `22-kaynak/*.sablon.sql` | Üretici: bölümün gövdelerini tek tırnaklı dizgeye çevirir (Editor iç içe dolar tırnağını bozuyor), gövde özetlerini gömer; `--denetle` |
| `src/266-site-erisim.jsx`, `src/100-app.jsx`, `src/260-cari.jsx` | ERP: yeni cari yolu tek RPC, cari yerelde açılmaz, buluttan tazeleme, yarım onay + "Tamamla" |

## Davranış

- **Yeni cariyle onay** — `site_kayit_onayla_yeni_cari(talep, cariId)`: kapı → kimlik biçimi → talep `FOR UPDATE` → aynı kimlikle
  onaylanmışsa `zaten` (yazmaz) → 'yeni' değilse "işlenmiş" → kullanıcı adı / kimlik çakışması → talep `onaylandi, cari_id` →
  cari TALEPTEKİ bilgilerden sunucuda (yalnız tabloda olan sütunlar; `kod` boş, `surum` 1) → hesap. Tek işlem.
- **ERP:** cariId isteğe çıkmadan önce `localStorage`'a (`site:yarim-onay`) yazılır; ERP cariyi yerelde AÇMAZ, buluta yazmaz; sonuçta
  carileri buluttan tazeler (bekleyen cari yazması ya da son 12 sn'de kendi yazması varsa atlar, değişiklik sayacı getirir). Kesin ret
  (iş kuralı, yetki, KR) → yarım kayıt silinir, "hiçbir kayıt açılmadı". Sonucu bilinmeyen hata (ağ) → yarım kayıt kalır, düğme
  "Tamamla" olur ve AYNI kimlikle sorar. Talep listeden düşmüşse (başkası ya da kaybolan cevap bitirdi) yarım kayıt temizlenir.
- **Mevcut cariye bağlama** — `site_kayit_onayla`: tek işlem; aynı cariyle tekrar sessiz; başka cariyle "işlenmiş".
- **Ret** — `site_kayit_reddet`: onaylanmış talep "onaylanmış; reddedilemez"; bulunamayan / zaten reddedilmiş sessiz (19 sınaması aynı).
- **Eski ERP engeli** — `site_cari_ekleme_koru` (cariler BEFORE INSERT): uygulamadan gelen, tabloda olmayan kimlikle, bekleyen ya da son
  1 günde işlenmiş bir talebin ünvan + telefonunu taşıyan cari → `KR013`. İstisna yalnız bir talebin `onaylandi, cari_id = bu kimlik`
  olması (fonksiyon cariyi eklemeden önce yapar; talep tablosuna istemci yazamaz). Not alanına, `siteOdemeSor`'a (her yeni müşteri
  carisinde var), sürüm başlığına bakılmaz. Var olan kimliğin upsert'i, JWT'siz ve service_role yazması serbest.

## Testler (16 Kasım, yerel / yalıtılmış; canlıya dokunulmadı)

| Test | Sonuç |
|---|---|
| `stok-v2/test/guvenlik/t22/test22.sh` — PostgreSQL 16, 19 sonrası canlı (ad02222) + 22 | **82/82** |
| `stok-v2/test/guvenlik/t19/test19.sh` (19'un "yeni kurulum" kontrolü 19 kaynağıyla; güncel depoda 18'in FARKLI'sı yalnız onayla / reddet) | **139/139** |
| `stok-v2/test/guvenlik/t21/test21.sh` (aynı cariyle ikinci onay artık "zaten", başka cariyle "işlenmiş") | **39/39** |
| `test/birim-sunucu-carisi.js` (yeni; uygulamanın gerçek işlevleri) | temiz (10 kontrol) |
| `test/senaryo-site-yonetim-yetki.js` (güncellendi) + ilgili 20 senaryo | 21/21 AYNI |
| `birim-degisiklik`, `birim-kullanici-damga`, `kontrol.sh`, `oludenetim.sh` | temiz |
| `test/kosu.sh` tam takım, `kos-guvenlik.sh` | **çalıştırılmadı** (istenmedi) |

t22'nin istenen beş noktası:
1. **Eşzamanlı onay, farklı kimlikler:** iki Yönetici 0,4 sn arayla (ilki işlemi 1,5 sn açık tutar) → biri `onaylandi`, öteki kilitte
   bekleyip "işlenmiş"; 6 oturum aynı anda → 1 / 5. Her ikisinde cari 1, hesap 1.
2. **Onay–ret yarışı:** onay önde → ret "onaylanmış; reddedilemez", sonuç onaylandi · 1/1; ret önde → onay "işlenmiş", sonuç
   reddedildi · 0/0; yeni cari ile mevcut cariye bağlama yarışında tek hesap.
3. **Kaybolan cevap:** aynı kimlikle tekrar `zaten`, tablolar aynı (bağlama yolunda da). Commit'ten önce kopan bağlantı → hiçbir şey
   yazılmadı; ikinci Yönetici onayladı; ilk cihazın "Tamamla"sı "işlenmiş"; tek cari. Senaryoda: cevap tamamen kaybolunca "Tamamla"
   görünür ve aynı kimlikle sorar (5 çağrı, 1 kimlik) → tek cari; tek kopmada ERP'nin kendi ağ yeniden denemesi aynı gövdeyle sorup
   `zaten` alır.
4. **Diğer cihazlarda korunma (birim, gerçek işlevler):** bayat cihazın yazması sunucu carisini silmez; bekleyen yazmalı açılışta ekran
   yerel + sunucu carisi, ilk yazma onu ne siler ne yeniden gönderir; bu cihazın bilerek sildiği kayıt silinir, sunucu carisi kalır;
   ayrıntısız eski defterde de korunur; sayaç bekleyen yazma varken erteler ama "görüldü" saymaz; tazelemeden sonra kod ataması
   güncellemedir. (Kod kanıtları: `21-ATOMIK-ONAY-TASARIM.md` §4.)
5. **Eski ERP engeli:** 1.744.21 (`ad02222`) ve `7c6ec2e` paketleri kaynaktan derlenip tarayıcıda gerçekten "Onayla — cari aç" ile
   çalıştırıldı; buluta gönderdikleri istek yakalandı (`t22/eski-*.json`: tek satır, `merge-duplicates`, `x-atolye-surum: 1.744.21`) ve
   PostgreSQL'de PostgREST gibi oynatıldı → **KR013, satır yok**; ardından eski onay "Cari bulunamadı"; tablolar aynı. Not ve
   siteOdemeSor silinse, ünvan büyük harf / fazla boşluk, telefon biçimi farklı olsa, sürüm başlığı sahte (9.9.9) olsa, Yönetici olmasa
   da KR013. Talep başka Yöneticiyle yeni yoldan onaylanmışken eski paketin yazması (yarış) → KR013, sunucu carisi tek. İstisna
   taklit edilemez (talep tablosuna güncelleme / ekleme → izin yok). İlgisiz cari, upsert, service_role, JWT'siz yazma geçer; 1 günden
   eski ret engellemez.

Ayrıca: biçim — sunucunun açtığı cari, eski ERP'nin aynı talep için yazdığı satırla aynı (kimlik, kod, sürüm hariç); vergi no kuralı
uygulamanın `vergiNoKaydedilecek`'iyle 10 girdide aynı. Kapı: Personel → YETKI_YOK, tablolar aynı; anon ve yardımcılar → izin yok.
Geri alma 19 hâline döner (özetler), açılmış cari / hesap sayısı korunur, yeniden uygulanır; Editor taklidiyle uygula / geri al;
önkoşul tutmazsa hiçbir şey değişmez; ikinci uygulama reddedilir.

## Sınırlar ve kalanlar

- **Eski paket testi kaynaktan derlenen paketle yapıldı.** Yayındaki HTML'ler esm.sh'tan React yüklüyor (bu ortamda ağ yok). Depo
  sığ (1.744.21'den eski geçmiş yok); `siteKayitCarisi` + "önce cari, sonra onay" sırası erişilebilen her sürümde aynı. Tetikleyici
  yalnız ünvan + telefona baktığı için talepten cari kuran daha eski sürümleri de yakalar.
- **Eski ERP'nin kendi cihazında yerel kopya:** KR013'ten sonra o cihazın ekranında cari yerel olarak görünür ve "inceleme gerekiyor"a
  düşer (1.744.0+ kalıcı ret davranışı); buluta yazılmaz. Uygulama yenilenince kaybolur.
- **Elle açılış:** bekleyen ya da son 1 günde işlenmiş talebin ünvan + telefonuyla elle yeni cari KR013 alır (talepten onaylanmalı).
- **Türkçe harf:** eşleşme `lower()` kullanır; canlı veritabanı yerel ayarı C ise ASCII dışı harflerde büyük / küçük ayrımı katlanmaz
  (aynen gelen ünvan yine eşleşir — eski ERP talepteki ünvanı aynen yazar). 22-onkosul bunu ölçmez.
- **Sunucunun açtığı cari diğer cihazlara** değişiklik sayacıyla (8 sn) gelir; canlıda `cariler`de `degisiklik_izle` olmalı —
  22-onkosul 10. satır ölçer (UYARI).
- **Yayın sırası:** önce 22 (salt-okur önkoşul HAZIR ise), sonra yeni ERP sürümü. 22'den sonra eski ERP yeni cariyle onay yapamaz
  (bulutta cari oluşmaz), mevcut cariye bağlama ve ret çalışır. Yeni ERP 22'siz sunucuda yeni cariyle onayda "fonksiyon yok" alır,
  eski yola düşmez.
- 22'den sonra `19-durum-salt-okur.sql` ve `18-…salt-okur.sql` onayla / reddet'te "FARKLI" der (bilerek değişti); durum için 22-onkosul.
