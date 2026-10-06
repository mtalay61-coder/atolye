#!/usr/bin/env bash
# TARAYICI TESTLERİ — src/ değiştikten sonra `./yap.sh` ile birlikte çalıştırılır.
# Altın çıktı yöntemi: senaryolar gerçek Chromium'da çalışır, sonuç normalleştirilip
# `altin-*.txt` ile karşılaştırılır. Fark = davranış değişti demektir.
set -e
KOK="$(cd "$(dirname "$0")" && pwd)"
cd "$KOK"
node derle.js
node paket-test.js
HATA=0
node birim-fisyaz-gerial.js || HATA=1
node birim-ambalaj.js || HATA=1
node birim-fiyat-kurali.js || HATA=1
node birim-satir-esitle.js || HATA=1
node birim-cari-yon.js || HATA=1
node birim-fisno.js || HATA=1
node birim-banka.js || HATA=1
node birim-barkod.js || HATA=1
node birim-atolye-barkod.js || HATA=1
node birim-stok-durumu.js || HATA=1
node birim-hareket-etiketi.js || HATA=1
node birim-barkod-semasi.js || HATA=1
node birim-gorsel-eslestirme.js || HATA=1
node birim-ozel-kod.js || HATA=1
node birim-defter.js || HATA=1
node birim-cek.js || HATA=1
node birim-recete-gerceklesme.js || HATA=1
node birim-tutar-yaziyla.js || HATA=1
node birim-harici-barkod.js || HATA=1
node birim-siparis-ek.js || HATA=1
node birim-cop.js || HATA=1
node birim-fiyat-listesi.js || HATA=1
node birim-maliyet-onay.js || HATA=1
node birim-tanim-birlestir.js || HATA=1
node birim-bekleyen-kayit.js || HATA=1
node birim-recete-sablon.js || HATA=1
node birim-yeni-renk-recete.js || HATA=1
node birim-finans-rapor.js || HATA=1
node birim-finans-ek.js || HATA=1
node birim-ara-proses.js || HATA=1
node birim-gecmis-renk.js || HATA=1
node birim-renksiz.js || HATA=1
node birim-kdv.js || HATA=1
node birim-vergino.js || HATA=1
node birim-karzarar.js || HATA=1
node birim-alis-ortalama.js || HATA=1
node birim-efatura.js || HATA=1
node birim-mamul-depo.js || HATA=1
node birim-gorsel-depo.js || HATA=1
node birim-acilis-fisi.js || HATA=1
node birim-cek-bag.js || HATA=1
node birim-rapor.js || HATA=1
node birim-bayat-denetim.js || HATA=1
node birim-code128-cozucu.js || HATA=1
node birim-son-alis.js || HATA=1
node birim-siparis-ciktisi.js || HATA=1
node birim-siparis-iptal.js || HATA=1
node birim-ekran-duzeni.js || HATA=1
node birim-kasa-aciklama.js || HATA=1
node birim-surum.js || HATA=1
# SENARYOLAR PARALEL (15 Eylül: "neden artık yavaşladın?"). Sıralı koşu senaryo sayısı arttıkça
# doğrusal uzuyordu (62 senaryo ≈ 13 dk). Her senaryo kendi Chromium'unu açıyor ve birbirinden
# bağımsız; dördü aynı anda çalışınca süre dörtte bire iniyor. İŞ SAYISI: bellek sınırı yüzünden 4;
# artırmak isterseniz KOSU_IS değişkeniyle (ör. KOSU_IS=6 ./kosu.sh).
IS=${KOSU_IS:-4}
SENARYOLAR="fis siparis silme uretim cari-kart recete-oneri cikis-fisi cok-modelli-fis onay-duzenleme fis-ozet cari-bakiye gorsel-secici hata-paneli depo-koprusu geri-donus son-islemler bakiye-renk cek-girisi paketleme sevkiyat barkod-atolye mamul-depo satin-alma-sutunu satin-al-dugmesi barkod-siparis katalog sekmeler ozel-kod-ekle siparis-duzenle gorsel-depo acilis-fisi pesin-tahsilat kur-cevirici cek-ciro cek-gorsel eksi-stok-ihtiyac verilen-hammadde recete-gerceklesme fis-ihtiyactan cek-bag cek-iade-tahsil bulut-giris bulut-on-giris bulut-kullanici recete-sil-onay pencere-sekmeleri rapor-siparis hazir-urunler tedarik-girisleri koli-uretim-siniri json-yedek renk-kodu renk-gocu yoneticisiz siparisten-sec gorevler sohbet surum-duyuru beden-adi beden-grubu mobil-gorunum stok-matris bekleyen-yazma fis-defteri oturum stok-turetme kasa-cari-yon kasa-islemler teknik-cizim modelhane gider-kartlari menu-gruplari kullanici-rolleri olcu-secimi kar-zarar anasayfa-alacak siparis-matris-sabit asorti-koli karsilanan-turetme karsiliksiz-para genel-gider kaynaksiz-hareket gider-gruplari urun-maliyeti kart-eylemleri sil-onayi maliyet-dokumu fiyat-grubu fiyat-grubu-duzenle oturum-dustu maliyet-duzenle maliyet-renk-fiyati maliyet-satis-uyari maliyet-renk-beden stok-arama-ayri ozel-kod-mevcut fiyat-grubu-marj recete-standart-kart sapma-silinen-uretim recete-duzen recete-sablon gelir-gider fis-defteri-bayat bayat-efekt iscilik-yonu uretim-iade yazma-hatasi surum-otomatik yenileme-ekran renk-arama depo-okut beden-etiketi github-yayin depo-sevkiyat siparis-koli-sevk koli-satir-gruplama siparisten-koli-sec alis-tek-ekran renksiz-malzeme iscilik-gorunum ekstre-sade standart-gizli siparis-kamera foto-ile-urun siparis-yazdir siparise-urun-ekle mamul-stok finans-menu cek-kur-geri-al cek-yazdir cek-ozet cek-kayip-fis finans-rapor finans-yaslandirma finans-uretim model-rengi-arama renk-kodu-standart siparis-renk-resim siparis-form-duzen malzeme-tipi-renk standart-form finans-ek proses-notu ara-proses renksiz-alis gecmis-renk fiyat-pb olcu-fiyat fiyat-grup fiyat-grup-secici barkod-otomatik model-rengi-barkod katalog-fiyatlar kesimhane tanim-basliklari renksiz-recete renk-basligi renk-basligi-uretim kdv-fis vergi-no maliyet-son-alis efatura siparis-kdv sevkiyat-kdv standart-kart siparis-iptal siparis-satir-fiyat siparis-satir-ekle cari-liste-toplam boyut-ayari ekran-duzeni urun-karti-duzeni cari-karti-duzeni siparis-karti-duzeni toplu-planlama kasa-duzeni kismi-teslim cek-defter harici-barkod defter-secimi cop-guvenlik fiyat-listesi fiyat-birim maliyet-onay tanim-birlestir fiyat-listesi-suzgec renk-ac-sorusu kayip-hammadde cevrimdisi-kilit"
printf '%s\n' $SENARYOLAR | xargs -P "$IS" -I{} sh -c 'node "senaryo-{}.js" > "/tmp/yeni-{}.txt" 2>&1; echo {} > /dev/null'
for s in $SENARYOLAR; do
  if diff -q "altin-$s.txt" "/tmp/yeni-$s.txt" > /dev/null 2>&1; then
    echo "  senaryo $s ................. AYNI"
  else
    echo "  senaryo $s ................. FARKLI  (diff altin-$s.txt /tmp/yeni-$s.txt)"
    HATA=1
  fi
done
[ $HATA -eq 0 ] && echo "── tarayıcı testleri temiz ──" || echo "── DAVRANIŞ DEĞİŞTİ ──"
exit $HATA
