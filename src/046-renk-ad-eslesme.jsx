// ================= RENK ADI DEĞİŞİNCE VARYANT VE REÇETE EŞLEŞMESİ (v1.744.37) =================
// 082 `hammaddeRenkAdDegistir` her eşleşme (kombinasyon etiketi ya da rengin kendi adı) için bunu çağırır. Saf olduğu için
// birim testi (test/birim-renk-ad-kombinasyon.js) doğrudan sınar.
//
// KİMLİK ÖNCELİKLİ EŞLEŞTİRME yalnız rengin KENDİ adında (`duz`): kayıt damgalanmışsa kimlikle bulunur ve adı tazelenir,
// damgasızsa ada düşülür. Kombinasyon etiketi ("1054 - KAHVE SÜET/VİZON YILAN") YALNIZ ADLA eşleşir, kimlik damgalanmaz.
function renkAdVaryantReceteUygula(variants, recete, { eskiEtiket, yeniEtiket, duz }, renkId) {
  const normalize = (x) => String(x || "").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
  const es = (deger) => normalize(deger) === normalize(eskiEtiket);
  let degisti = false;
  let nextVariants = variants || [];
  let nextRecete = recete;
  // KOMBİNASYON RENKLERİ ÇÖKÜYORDU (v1.744.37 — kullanıcı, 26 Kasım: "bu modelde 2 renk eklemiştik, hatta sipariş de girdik,
  // sonradan renklerin büyük küçük harf değişikliği yaptık örn: VİZON YILAN : Vizon Yılan diye, şimdi sanki modelde tek renk
  // eklemişiz gibi oldu diğer renkler kayboldu"). Eskiden kombinasyon etiketiyle eşleşen varyant da rengin KİMLİĞİYLE
  // damgalanıyordu ({ renkId: renkId }). Sonraki eşleşmeler kimlikle baktığı için "1054 - KAHVE SÜET/VİZON YILAN" varyantı
  // bir sonraki kombinasyonun ("1055 - …") etiketine, en sonda da rengin düz adına ("Vizon Yılan") çevriliyordu: modelin bütün
  // kombinasyon renkleri TEK renge çöküyor, bulutta eski varyantlar kaldırılıyordu (stok-v2 stk_yaz varyantKaldir). Sipariş /
  // üretim adla eşleştiği için doğru kalıyor, stokla bağı kopuyordu. Şimdi: kimlik YALNIZ rengin kendi adında (duz) kullanılır
  // ve damgalanır; kombinasyon etiketi YALNIZ adla eşleşir, kimliği değişmez.
  const kimlikEs = (v) => (duz ? (v.renkId ? v.renkId === renkId : es(v.renk)) : es(v.renk));
  
  if (nextVariants.some((v) => kimlikEs(v))) {
    degisti = true;
    nextVariants = nextVariants.map((v) =>
      kimlikEs(v) ? (duz ? { ...v, renk: yeniEtiket, renkId: renkId } : { ...v, renk: yeniEtiket }) : v
    );
  }
  // Reçetede renk İKİ ALANDA geçiyor: mamulRenk (hangi model rengi için) ve
  // renk (hangi hammadde rengi kullanılacak). İkincisi atlanınca üretim, adı
  // değişmiş hammaddeyi bulamıyordu.
  // Reçetede iki ayrı renk alanı var; her biri kendi kimliğiyle eşleştirilir.
  // Aynı çöküş reçetede de vardı (mamulRenk kombinasyon etiketiyken mamulRenkId damgalanıyordu): aynı kural.
  const receteHamEs = (r) => (duz ? (r.renkId ? r.renkId === renkId : es(r.renk)) : es(r.renk));
  const receteMamulEs = (r) => (duz ? (r.mamulRenkId ? r.mamulRenkId === renkId : es(r.mamulRenk)) : es(r.mamulRenk));
  if ((nextRecete || []).some((r) => receteMamulEs(r) || receteHamEs(r))) {
    degisti = true;
    nextRecete = nextRecete.map((r) => ({
      ...r,
      mamulRenk: receteMamulEs(r) ? yeniEtiket : r.mamulRenk,
      mamulRenkId: receteMamulEs(r) && duz ? renkId : r.mamulRenkId,
      renk: receteHamEs(r) ? yeniEtiket : r.renk,
      renkId: receteHamEs(r) && duz ? renkId : r.renkId,
    }));
  }
  return { degisti, variants: nextVariants, recete: nextRecete };
}
