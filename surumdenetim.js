#!/usr/bin/env node
// DENETİM 10 — KOŞULSUZ ANA KAYIT GÜNCELLEMESİ
//
// İyimser kilitleme, ana kayıtların `surum=eq.N` koşuluyla güncellenmesine dayanıyor. Koşulu
// unutan tek bir PATCH ya da toplu upsert, kilitlemeyi o tablo için sessizce delik bırakır:
// kod çalışır, hata vermez, ama üzerine yazma geri gelir. Yeni bir tablo eklendiğinde ya da
// yazma yolu değiştirildiğinde en kolay atlanacak yer burası.
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const kaynak = fs.readFileSync(dosya, "utf8");
const satirNo = (p) => kaynak.slice(0, p).split("\n").length;
const bulgular = [];

// --- a) TABLO_SEMA'daki her ana tablo sürüm haritasına yükleniyor mu? ---
const semaBas = kaynak.indexOf("const TABLO_SEMA = {");
if (semaBas >= 0) {
  let d = 0, son = semaBas;
  for (let i = kaynak.indexOf("{", semaBas); i < kaynak.length; i++) {
    if (kaynak[i] === "{") d++;
    else if (kaynak[i] === "}") { d--; if (!d) { son = i; break; } }
  }
  const sema = kaynak.slice(semaBas, son + 1);
  const tablolar = [...sema.matchAll(/^\s{2}(\w+):\s*\{/gm)].map((m) => m[1]);
  tablolar.forEach((t) => {
    if (!new RegExp(`surumleriYukle\\("${t}"`).test(kaynak)) {
      bulgular.push(`TABLO_SEMA'da \`${t}\` var ama surumleriYukle("${t}", ...) çağrısı yok — ` +
        `bu tablonun sürümü hiç okunmaz, güncellemeleri koşulsuz INSERT yoluna düşer`);
    }
  });
}

// --- b) Ana tabloya koşulsuz PATCH var mı? ---
// Düzenli ifadeyle ileri doğru eşleştirmek İŞE YARAMIYOR: yol bir şablon dizesi ve içindeki
// `${pgKimlik(k.id)}` parantezleri karakter sınıfını kapatıyor. Bu yüzden `method: "PATCH"`
// bulunup GERİYE, çağrının açılışına kadar okunuyor.
{
  const patchKalip = /method:\s*"PATCH"/g;
  let m;
  while ((m = patchKalip.exec(kaynak))) {
    const oncesi = kaynak.slice(Math.max(0, m.index - 600), m.index);
    const cagriBas = oncesi.lastIndexOf("supabaseIstek(");
    if (cagriBas < 0) continue;              // supabaseIstek dışında bir PATCH; kapsam dışı
    const yol = oncesi.slice(cagriBas);
    if (!/surum=eq\./.test(yol)) {
      bulgular.push(`${dosya}:${satirNo(m.index)}  PATCH isteğinde \`surum=eq.\` koşulu yok — ` +
        `üzerine yazma engellenmez`);
    }
  }
}

// --- c) Sürüm koşullu güncelleme sonucu KONTROL EDİLİYOR mu? ---
// Koşul konulup dönen satır sayısına bakılmazsa çakışma sessizce yutulur: en tehlikeli hâl,
// çünkü kilitleme var sanılır.
if (/surum=eq\./.test(kaynak) && !/donen\.length === 0|length === 0\s*\)\s*cakisanlar/.test(kaynak)) {
  bulgular.push(`sürüm koşullu PATCH var ama dönen satır sayısı kontrol edilmiyor — ` +
    `çakışma sessizce yutulur`);
}

// --- d) Çakışma sonrası alt tablolara yazmaya devam ediliyor mu? ---
// Kilit ana satırın sütunlarını korur; veri ise alt tablolarda (variants, hareketler). Çakışma
// bildirilip alt döngüye devam edilirse korunan satırın ALTINDAN varyant ezilir — "Kampre Bezi"
// olayında olan buydu. Bildirimin ardından `return` şart.
{
  const bildir = kaynak.indexOf("surumCakismasiBildir(tablo, cakisanlar)");
  if (bildir >= 0) {
    const sonrasi = kaynak.slice(bildir, bildir + 200);
    if (!/return(;| _sayim;)/.test(sonrasi)) {
      bulgular.push(`${dosya}:${satirNo(bildir)}  çakışma bildiriliyor ama alt tablo yazımı ` +
        `durdurulmuyor — ana satır korunurken varyant ezilir`);
    }
  }
}

// --- d2) `eq.` koşuluna tırnak sızıyor mu? ---
// PostgREST'te `in.("a")` tırnakları AYIRICI sayıp soyar; `eq."a"` ise tırnağı DEĞERİN PARÇASI
// sayar. Tırnaklı bir eq koşulu hiçbir satıra denk gelmez, koşullu güncelleme sıfır satır
// günceller ve kilitleme bunu "başka bilgisayar değiştirdi" sanır. Kullanıcı hiçbir kaydı
// güncelleyemez hâle gelir ve sebebi görünmez. Bir kez yaşandı.
{
  if (/pgKimlik\(id\)[\s\S]{0,200}?return encodeURIComponent\(`"/.test(kaynak)) {
    bulgular.push("pgKimlik tırnak ekliyor — `eq.` koşulunda tırnak değerin parçası olur, " +
      "hiçbir satır eşleşmez ve her yazma sahte çakışma üretir");
  }
  [...kaynak.matchAll(/=eq\.\$\{[^}]*\}/g)].forEach((m) => {
    const kesit = kaynak.slice(m.index, m.index + 60);
    if (/%22|\\"/.test(kesit)) {
      bulgular.push(`${dosya}:${satirNo(m.index)}  eq. koşulunda tırnak var — eşleşme olmaz`);
    }
  });
}

// --- e) Sürüm sayacı uygulama kaydına sızıyor mu? ---
// Sızarsa fark hesabına girer ve her yazma kendi kendini tetikler.
if (!/if \(s === "surum"\) return;/.test(kaynak)) {
  bulgular.push(`kayitaCevir \`surum\` alanını ayıklamıyor — sayaç uygulama kaydına sızar ve ` +
    `her başarılı yazma yeni bir yazma tetikler`);
}

// --- c) SÜRÜM GEÇMİŞİ (23 Eylül, v1.421.0): en üst kayıt SURUM ile aynı olmalı ---
// Geçmişi yazmadan sürüm çıkarılamaz; kullanıcı her sürümde ne değiştiğini görmeli.
{
  const surum = (kaynak.match(/const SURUM = "([\d.]+)"/) || [])[1];
  const ilkKayit = (kaynak.match(/const SURUM_GECMISI = \[\s*\{ surum: "([\d.]+)"/) || [])[1];
  if (!ilkKayit) bulgular.push("SURUM_GECMISI yok ya da ilk kaydı okunamıyor (015-sabitler)");
  else if (ilkKayit !== surum) bulgular.push(`SURUM ${surum} ama sürüm geçmişinin en üst kaydı ${ilkKayit} — bu sürümün kaydını SURUM_GECMISI'nin başına ekleyin`);
}

if (!bulgular.length) console.log("  10   sürüm koşulu ............ TEMİZ");
else {
  bulgular.forEach((b) => console.log("  ✗ [10 sürüm koşulu] " + b));
  console.log(`  10   sürüm koşulu ............ ${bulgular.length} BULGU`);
}
process.exit(bulgular.length ? 1 : 0);
