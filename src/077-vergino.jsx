// ================= VERGİ NO / TC KİMLİK NO KONTROLÜ (27 Eylül, v1.497.0) =================
//
// Kullanıcı: "Cari açarken vergi no girip cari bilgilerinin otomatik çekilmesini sağlayabiliriz." GİB
// sorgu ekranları captcha/giriş istiyor, açık servisleri yok; otomatik çekme eFinans bağlantısıyla
// (Aşama 3) gelecek. Şimdilik DIŞARIYA HİÇBİR ŞEY GÖNDERMEDEN yapılabilen iki şey (kullanıcı onayı):
//   1. Numara kendi kontrol basamağıyla doğrulanır — yanlış yazılmış vergi no, e-faturanın reddedilmesinin
//      en sık nedeni; fatura kesilirken değil cari açılırken yakalanmalı.
//   2. Aynı numarayla ikinci cari açılırken uyarılır.
//
// Vergi No alanına şahıs firmalarda TC kimlik no yazılır (e-faturada da öyle): 10 hane → VKN, 11 hane →
// TCKN kuralıyla bakılır. Boşluk, nokta, tire yok sayılır (kâğıttan kopyalanan "123 456 78 90").
// ENGELLEMEZ, SORAR: yurt dışı cari ya da eski kayıt başka biçimde olabilir; karar kullanıcının.

function vergiNoNormal(s) {
  return String(s == null ? "" : s).replace(/[\s.\-]/g, "");
}

// GİB VKN algoritması: ilk 9 hanenin her biri (hane + 9 - sıra) mod 10, sonra 2^(9 - sıra) ile çarpılıp
// mod 9 (sıfır olmayan değer 0'a düşerse 9); toplamın 10'a tamamlayanı 10. hane.
function vknGecerliMi(s) {
  const n = vergiNoNormal(s);
  if (!/^\d{10}$/.test(n)) return false;
  let toplam = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (Number(n[i]) + 9 - i) % 10;
    let v = (tmp * Math.pow(2, 9 - i)) % 9;
    if (tmp !== 0 && v === 0) v = 9;
    toplam += v;
  }
  return (10 - (toplam % 10)) % 10 === Number(n[9]);
}

// TCKN: 11 hane, ilk hane 0 değil; 10. hane = (tekler×7 − çiftler) mod 10; 11. hane = ilk 10 toplamı mod 10.
function tcknGecerliMi(s) {
  const n = vergiNoNormal(s);
  if (!/^[1-9]\d{10}$/.test(n)) return false;
  const d = n.split("").map(Number);
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  if ((((tek * 7 - cift) % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

// Vergi No alanı için: boşsa sorun yok. Dönüş { gecerli, tur: "vkn"|"tckn"|null, mesaj }.
function vergiNoKontrol(s) {
  const n = vergiNoNormal(s);
  if (!n) return { gecerli: true, tur: null, mesaj: "" };
  if (!/^\d+$/.test(n)) return { gecerli: false, tur: null, mesaj: "Vergi no yalnız rakam olmalı" };
  if (n.length === 10) return vknGecerliMi(n)
    ? { gecerli: true, tur: "vkn", mesaj: "" }
    : { gecerli: false, tur: "vkn", mesaj: "Vergi no hatalı (kontrol basamağı tutmuyor)" };
  if (n.length === 11) return tcknGecerliMi(n)
    ? { gecerli: true, tur: "tckn", mesaj: "" }
    : { gecerli: false, tur: "tckn", mesaj: "TC kimlik no hatalı (kontrol basamağı tutmuyor)" };
  return { gecerli: false, tur: null, mesaj: `Vergi no 10, TC kimlik no 11 hane olmalı (${n.length} hane girildi)` };
}

// TC Kimlik No alanı için (yalnız 11 hane kabul).
function tcknKontrol(s) {
  const n = vergiNoNormal(s);
  if (!n) return { gecerli: true, mesaj: "" };
  return tcknGecerliMi(n) ? { gecerli: true, mesaj: "" } : { gecerli: false, mesaj: "TC kimlik no hatalı" };
}

// Aynı vergi no (ya da aynı TCKN) ile kayıtlı başka cariler. `haricId`: düzenlenen carinin kendisi.
// Silinmiş/pasif cari de sayılır — pasif bir cariyi yeniden açmak, ikinci kayıt açmaktan iyidir.
function ayniVergiNoluCariler(cariler, no, haricId) {
  const n = vergiNoNormal(no);
  if (!n) return [];
  return (cariler || []).filter((c) => c && c.id !== haricId
    && (vergiNoNormal(c.vergiNo) === n || vergiNoNormal(c.tckn) === n));
}

// Kaydetmeden önce sorulacak uyarılar (boş dizi → sorun yok).
function vergiNoUyarilari(cariler, no, haricId) {
  const uyarilar = [];
  const k = vergiNoKontrol(no);
  if (!k.gecerli) uyarilar.push(k.mesaj);
  const ayni = ayniVergiNoluCariler(cariler, no, haricId);
  if (ayni.length) uyarilar.push(`Bu numarayla kayıtlı cari var: ${ayni.map((c) => `${c.unvan} (${c.tip})`).join(", ")}`);
  return uyarilar;
}

// Kaydedilecek biçim: geçerli numara yalın rakam (e-faturada VKN/TCKN boşluksuz gider); geçersizse kullanıcının
// yazdığı olduğu gibi (kırpılmış) — onun ne kastettiğini bozmayalım, uyarı zaten görünüyor.
function vergiNoKaydedilecek(s) {
  const k = vergiNoKontrol(s);
  return k.gecerli && k.tur ? vergiNoNormal(s) : String(s == null ? "" : s).trim();
}
