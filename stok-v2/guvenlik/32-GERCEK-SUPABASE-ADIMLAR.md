# Gerçek Supabase sınaması — yeni yalıtılmış proje, tek liste

**Yalnız YENİ, boş bir projede.** Ana proje (`mqdgucoomgqcvhvgixbl`) ve G-25 deneme projesi (`drtmnovafswzcmpacubl`) bu işte
kullanılmaz; `korumali-sunucu.js` ikisinin adresini reddeder. Bütün kayıtlar DENEME adlıdır. Gizli (secret / service_role) anahtar
hiçbir adımda gerekmez, istenmez, bir yere yazılmaz. Bir adım beklenen sonucu vermezse DUR ve çıktıyı gönder.

Ayrıntı ve gerekçeler: `27-b4-deneme/PAKET-B4-YALITILMIS-DENEME.md`, `30-BIRLIKTE-KURULUM.md`.

## Dosyalar (kullanmadan önce özetini karşılaştır)

| Dosya | SHA-256 |
|---|---|
| `b4-deneme-yapi.sql` (depoda değil; sana gönderildi) | `d777fb7ebcffa21ba57843f10fe306a21cbb8ca64eed4d6eb14a92c3ce328819` |
| `27-b4-deneme/ilk-yonetici-uygula.sql` | `e6b0afd59cafae6445d913b67c6d801a8c7e773dfd4b7260926b8230a38ca8d7` |
| `27-b4-deneme/deneme-hesaplar-salt-okur.sql` | `066741c15ec41eab6d0701a394458498be600b340774ba6b3eba1df8a2a0b1bb` |
| `27-b4-onkosul-salt-okur.sql` | `76c5c3c4c4194db10bc61c68f367aef9964d280bc5b9ec8406620653140f1bba` |
| `27-b4-uygula.sql` | `f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d` |
| `28-b3a-uygula.sql` | `15f1051d5c9f652ac99d091fb329aea67ef35ef10adb82fee1cbe31ba3d38250` |
| `29-b3a2-uygula.sql` | `e67eef17c9f40addc6ccb2b22b5166ba8e16284a5ec4f8a468acd2396cfcaef1` |
| `31-yetki-ileti-uygula.sql` | `b3a48e5ab1461d9c6b18aec8f925e38769b1e57684bfdf48facbb40c1724acaf` |
| `atolye-erp-v1.744.37.html` (yayındaki) | `bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a` |
| `atolye-erp-v1.744.44.html` (aday; dal `claude/aday-birlesik`) | `b87afc137406202b5e6180c3b97f31139581d3e79238eda51b0cb4252418a7e8` |

## Adımlar

**Kurulum**

1. Supabase'de yeni, boş proje aç (ör. "atolye-deneme-2"). Proje kimliğini (20 karakter) ve **publishable** anahtarını not et.
2. Her SQL adımından önce adres çubuğundaki proje kimliğine bak: yeni projeninki olmalı.
3. SQL Editor → `b4-deneme-yapi.sql` (tamamı, Run). Beklenen: tablo 44 · görünüm 18 · fonksiyon 115 · tetikleyici 117 · politika 36 ·
   `stk_ayar` satırı 1 · diğer tablolarda veri satırı 0. *Bilinmeyen: Editor 300 KB'lık tek ifadeyi kabul etmeyebilir; hata verirse iletiyi gönder.*
4. `25-canli-tam-yapi-salt-okur.sql` (dal `claude/guvenlik-inceleme`) → Export CSV → bana gönder. Yapı farkını ben raporlarım; fark
   raporu gelmeden devam etme.
5. Panel › Authentication › Users › Add user (Auto Confirm işaretli): `denemeyonetici@atolye.local`, `denemestok@atolye.local`.
   Şifreleri sen belirle; kimseye ve depoya yazma. Authentication › Sign In / Providers: yeni kayıt KAPALI.
6. SQL Editor → `ilk-yonetici-uygula.sql`. Beklenen: iki satır, `auth_hesabi_var` ikisinde `true`. (DenemeYonetici = Yönetici;
   DenemeStok = üretim + stok görüntüleme / düzenleme / kaydetme, silme yok.)
7. `deneme-hesaplar-salt-okur.sql` → her satır `tamam`, son satır **YALITILMIŞ DENEME ORTAMI: EVET**. Çıktıyı gönder.

**1. tur — öncelikli paket: B4/B5, yayındaki istemciyle**

8. `27-b4-onkosul-salt-okur.sql` → **99 GENEL: HAZIR**.
9. İstemciyi korumalı sunucuyla aç (iki pencere = iki cihaz, portlar 8790 ve 8791):
   ```bash
   DENEME_REF=<yeni-proje-kimliği> DENEME_ANAHTAR=sb_publishable_… node korumali-sunucu.js atolye-erp-v1.744.37.html bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a 8790
   ```
   DenemeYonetici ile gir; DENEME verisini kur (deneme paketindeki adım 4: DENEME ürün, usta carileri, üretim kayıtları).
10. **Kurulumdan ÖNCE** açığı üret (yalnız bu projede): iki cihazdan aynı işi teslim al → fazla stok ve çift işçilik oluştuğunu kaydet.
11. `27-b4-uygula.sql` → `GENEL | KURULU`.
12. Aynı adımları yinele (taze DENEME üretim kayıtlarıyla): iki cihazdan tam ve kısmi teslim; teslim → Geri Al → yeniden teslim →
    eski cihazdan tekrar Geri Al; iki cihazdan İşi Ver. Beklenen: tek teslim geçer, diğeri "zaten teslim alınmış" der; stok ve usta
    bakiyesi tek kat. Ekran görüntüsü ya da bildirim metinlerini gönder.

**2. tur — yetki paketleri ve aday istemci**

13. `28-b3a-uygula.sql` → `GENEL | KURULU`. Sonra `29-b3a2-uygula.sql` → `GENEL | KURULU`. Sonra `31-yetki-ileti-uygula.sql` → `GENEL | KURULU`.
14. **Açık kalmış eski sekme:** 9. adımdaki 1.744.37 penceresini kapatmadan, DenemeStok ile (ikinci pencerede) şunları dene:
    açılışta hata bildirimi çıkıyor mu; bir DENEME ürününün adını değiştirip kaydet (geçmeli); satış fiyatını değiştirip kaydet
    (reddedilmeli, fiyat değişmemeli). Bildirim metnini gönder.
15. Aday istemciyi aç:
    ```bash
    DENEME_REF=<yeni-proje-kimliği> DENEME_ANAHTAR=sb_publishable_… node korumali-sunucu.js atolye-erp-v1.744.44.html b87afc137406202b5e6180c3b97f31139581d3e79238eda51b0cb4252418a7e8 8792
    ```
16. DenemeStok ile (1.744.44): fiyat kutuları kapalı mı; ürün adını kaydet; İşi Ver ve teslim; teslimden sonra **Geri Al düğmesi
    görünmemeli** (silme yetkisi yok).
17. DenemeYonetici ile (1.744.44): fiyat değiştir; teslim → Geri Al → yeniden teslim; başka cihazda zaten geri alınmış teslimi
    geri almayı dene (ileti "geri alındı" dememeli).
18. `deneme-hesaplar-salt-okur.sql`'i bir kez daha çalıştır; çıktıyı gönder.

**Bana gönderilecekler:** 4. adımın CSV'si; 3, 6, 7, 8, 11, 13, 18. adımların sonuç tabloları; 10, 12, 14, 16, 17. adımların bildirim
metinleri ya da ekran görüntüleri. Şifre, anahtar ya da jeton gönderme.

**Geri alma (istersen, yalnız bu projede):** `31-yetki-ileti-geri-al.sql`, `29-b3a2-geri-al.sql`, `28-b3a-geri-al.sql`,
`27-b4-geri-al.sql`. İş bitince projeyi silebilirsin.
