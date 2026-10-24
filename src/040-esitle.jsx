// Kimlik listesiyle silme. Kimlikler URL'ye gömüldüğü için KAÇIŞ ŞART:
// içinde nokta, virgül, eğik çizgi ya da parantez geçen bir kimlik sorguyu bozar ve
// PostgREST'in yanlış satırları hedeflemesine — ya da isteğin tamamen başarısız olmasına — yol açar.
//
// Ayrıca liste uzun olabilir: URL uzunluk sınırına takılmamak için parçalara bölünür.
async function supabaseSil(tablo, idler) {
  const parcaBoyu = 100;
  for (let i = 0; i < idler.length; i += parcaBoyu) {
    const parca = idler.slice(i, i + parcaBoyu);
    const liste = parca
      .map((id) => encodeURIComponent(`"${String(id).replace(/"/g, '\\"')}"`))
      .join(",");
    await supabaseIstek(`${tablo}?id=in.(${liste})`, { method: "DELETE" });
  }
}

// BİLEŞİK ANAHTARLI SİLME — kimliği tek bir `id` sütunu OLMAYAN tablolar için.
//
// `varyantlar`ın kimliği urun_id+renk+beden'dir; uygulamanın ürettiği `urun_id|renk|beden`
// dizesi yalnızca fark hesabı için var, veritabanında böyle bir sütun YOK. Bu yüzden
// `id=in.(...)` ile silmek hiçbir satıra denk gelmez — eskiden bu tablolar silmeden tamamen
// muaf tutuluyordu (`!cocuk.cakisma`) ve silinen renk/beden buluttan hiç kalkmıyordu.
//
// Satır satır gidiyor: bir istekte birleştirmek `or=(and(...),...)` mantık ağacı gerektirir ve
// oradaki tırnak kuralları `eq.`ten farklıdır. Bu projede tam o fark yüzünden HİÇBİR güncelleme
// buluta gitmemişti (v1.11–v1.18); eşleşmeyen bir DELETE de aynı biçimde sessiz kalırdı.
// Varyant silme seyrek bir işlem, istek sayısı sorun değil.
//
// KOŞUL BİÇİMİ `in.("deger")`, `eq.deger` DEĞİL. İkisi de çalışabilirdi ama `in.()` bu projede
// ZATEN KANITLANMIŞ yol (`supabaseSil` onu kullanıyor) ve tırnak kuralı orada nettir: ayırıcı
// sayılıp soyulur. Böylece virgül, parantez ve nokta içeren renk adları da güvenle geçer,
// bedensiz malzemenin boş dizesi (`in.("")`) de belirsizlik bırakmaz. `eq.` tarafında tırnak
// değerin PARÇASI sayılır — bu proje tam o yüzden yedi sürüm boyunca buluta hiç yazamadı.
// GRUPLU (v1.724.1 — kullanıcı, telefonda 305 renk · 57 ürün dönüştürürken "Failed to fetch"): yeniden adlandırma binlerce
// varyantı siliyor; satır başına bir istek telefon bağlantısında kopuyordu. Son alan dışındaki alanları aynı olan satırlar
// tek istekte gider: `urun_id=in.("X")&renk=in.("R")&beden=in.("40","41",…)` — filtreler VE'lenir, son alan listede olanlar
// tam o satırlardır (çapraz çarpım yok; ürün+renk grubu içinde beden listesi). Son alanı NULL olan satır listeye giremez
// (`is.null` gerekir), o satır tek başına gider. Liste 100'er parça (URL uzunluğu).
async function supabaseSilBilesik(tablo, alanlar, kayitlar) {
  const kosul = (alan, deger) => {
    // Yazarken alan hiç gönderilmediyse sütun NULL'dır; eşitlik NULL'a denk gelmez, `is.null` gelir.
    if (deger === null || deger === undefined) return `${alan}=is.null`;
    return `${alan}=in.(${encodeURIComponent(`"${String(deger).replace(/"/g, '\\"')}"`)})`;
  };
  const sonAlan = alanlar[alanlar.length - 1];
  const onAlanlar = alanlar.slice(0, -1);
  const gruplar = new Map();   // ön alanların koşul dizesi → son alan değerleri
  const tekler = [];           // son alanı NULL olanlar
  for (const k of kayitlar) {
    if (k[sonAlan] === null || k[sonAlan] === undefined) { tekler.push(k); continue; }
    const anahtar = onAlanlar.map((a) => kosul(a, k[a])).join("&");
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, []);
    gruplar.get(anahtar).push(String(k[sonAlan]));
  }
  for (const [onKosul, degerler] of gruplar) {
    for (let i = 0; i < degerler.length; i += 100) {
      const liste = degerler.slice(i, i + 100).map((d) => encodeURIComponent(`"${d.replace(/"/g, '\\"')}"`)).join(",");
      await supabaseIstek(`${tablo}?${onKosul ? `${onKosul}&` : ""}${sonAlan}=in.(${liste})`, { method: "DELETE" });
    }
  }
  for (const k of tekler) {
    await supabaseIstek(`${tablo}?${alanlar.map((a) => kosul(a, k[a])).join("&")}`, { method: "DELETE" });
  }
}

// PARÇALI EKLEME/GÜNCELLEME (v1.724.1, aynı olay): binlerce satır tek POST gövdesinde (birkaç MB) gidince telefonda
// istek düşüyordu. Satırlar `satirlariEsitle`den sonra 400'erlik parçalarla sırayla gönderilir; merge-duplicates
// olduğu için yarıda kalan bir parça bir sonraki denemede yeniden gönderilebilir.
const POST_PARCA_BOYU = 400;
async function supabasePostParcali(yol, satirlar) {
  const esit = satirlariEsitle(satirlar);
  for (let i = 0; i < esit.length; i += POST_PARCA_BOYU) {
    await supabaseIstek(yol, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(esit.slice(i, i + POST_PARCA_BOYU)),
    });
  }
}

// Bir tablonun ana ve alt kayıtlarını buluta yazar.
// =============================================================================================
// TABLO BAŞINA YAZMA KUYRUĞU
//
// SORUN: aynı tabloya iki yazma zaman içinde ÖRTÜŞÜRSE ikisi de farkı aynı anda hesaplıyor ve
// ikisi de aynı `surum=eq.N` koşulunu gönderiyor. Birincisi geçiyor, sunucudaki sürüm N+1
// oluyor; ikincisi sıfır satır alıp "başka bilgisayar değiştirdi" diyor. Oysa çakıştığı taraf
// KENDİSİ. Kullanıcıya yalan söylenmiş, işi de boşa gitmiş oluyor.
//
// Bu, iyimser kilitlemenin klasik tuzağı: kilit ancak yazmalar sıralıysa doğru cevap verir.
// Fark hesabı da kuyruğun İÇİNDE kalmalı — dışarıda kalsaydı ikinci yazma yine bayat sürümle
// hesaplanırdı ve kuyruk hiçbir şey çözmezdi.
//
// Kuyruk yalnızca AYNI tablo için bekletir; farklı tablolar paralel gitmeye devam eder.
// AD NOTU: `_yazmaKuyrugu` adı zaten alınmış (aşağıda, localStorage yazmalarını sıraya sokan
// kuyruk). Aynı adı ikinci kez tanımlamak modülü komple çökertiyor ve uygulama hiç açılmıyor —
// bir kez yaşandı. Bulut kuyruğu ayrı bir adla duruyor.
const _bulutYazmaKuyrugu = {};
function tabloKuyrugunaAl(tablo, is) {
  const onceki = _bulutYazmaKuyrugu[tablo] || Promise.resolve();
  // Önceki yazma hata verse de kuyruk ilerlemeli: `then(is, is)` her iki dalda da devam eder.
  const yeni = onceki.then(is, is);
  // Kuyruk referansı hatayı yutan bir sözle tutuluyor, yoksa bir hata tüm sırayı kilitlerdi.
  _bulutYazmaKuyrugu[tablo] = yeni.then(() => {}, () => {});
  return yeni;
}

// TOPLU YAZMADA ALAN KÜMELERİ EŞİT OLMALI (v1.602.0 — kullanıcı, çoklu cihaza geçince: "Yeniden dene tıklayınca
// sayı artıyor", Supabase 400 PGRST102 "All object keys must match"). PostgREST tek istekte birden çok satır
// alırken her satırın AYNI anahtarları taşımasını ister. Bizim satırlar `semaDisiAlanlar` yüzünden farklı
// çıkabiliyor: şema dışı alanı olan kayıt `ek` taşır, olmayan taşımaz. Tek kayıtlı yazmalarda görünmez; iki
// cihazdan arka arkaya girilen siparişler aynı pakete düşünce (10 kalemden 3'ünde ek alan var) istek
// reddediliyor ve bekleyen defter her denemede büyüyor. Çözüm: paketteki bütün anahtarların birleşimi alınır,
// eksik olan anahtar `null` ile doldurulur. Yalnız pakette ZATEN olan anahtarlar eklenir — olmayan bir sütun
// uydurulmaz. Saf; birim testi `birim-satir-esitle`.
function satirlariEsitle(satirlar) {
  const anahtarlar = [];
  const gorulen = new Set();
  (satirlar || []).forEach((r) => Object.keys(r || {}).forEach((k) => { if (!gorulen.has(k)) { gorulen.add(k); anahtarlar.push(k); } }));
  return (satirlar || []).map((r) => {
    const s = {};
    anahtarlar.forEach((k) => { s[k] = r && r[k] !== undefined ? r[k] : null; });
    return s;
  });
}

function supabaseTabloEsitle(tablo, kayitlar, secenek) {
  return tabloKuyrugunaAl(tablo, () => _tabloEsitleUygula(tablo, kayitlar, secenek));
}

// =============================================================================================
// TOPLU SİLME KİLİDİ (v1.712.0 — kullanıcı, 19 Ekim: "Üretim fişleri silindi … çok sıkı kontrol etmemiz
// gerekiyor, bu çok önemli. Bunun yüzünden hâlâ kullanmaya başlamadım!")
//
// Fark katmanı "bellekteki eski hâlde olup yeni hâlde olmayan" her kaydı SİLİNECEK sayar ve buluta DELETE
// gönderir. Bu, tek kaydın silinmesi için doğru; ama ekrandaki liste bir sebeple EKSİK ya da BAYAT gelmişse
// (eski bir JSON yedeği, bekleyen yazması olan eski bir yerel kopya, yarım okunmuş bir tablo) aynı mekanizma
// buluttaki bütün üretimleri / hareketleri sessizce siler — ve bunu "N silindi" diye günlüğe yazıp geçer.
// Kullanıcının hiçbir işlemi "bütün üretimleri sil" demek değildir; o ölçekte silme ancak sıfırlama ya da
// çöp boşaltma gibi AÇIKÇA izin verilen yollardan gelebilir.
//
// Kural (saf, birim testi `birim-toplu-silme-kilidi`): bir yazmada bir tablodan (ana ya da alt) silinecek kayıt
// sayısı hem TOPLU_SILME_ESIGI'ne ulaşıyor hem de bellekteki eski hâlin yarısından azı kalmıyorsa yazma
// DURUR — hiçbir istek gitmez, bellek geri alınır, bekleyen deftere YAZILMAZ (yazılsaydı açılışta yeniden
// denenirdi), günlüğe "TOPLU SİLME ENGELLENDİ" düşer ve kullanıcıya şerit çıkar. Tek siparişin 40 kalemi,
// bir üretimin 60 hareketi (tablonun küçük bir yüzdesi) geçer; tablonun yarısını götüren yazma geçmez.
// Yeni kurulumdaki küçük tablolarda (20 kayıttan az) kilit devreye girmez — eşik mutlak sayıyla da korunur.
const TOPLU_SILME_ESIGI = 20;
function topluSilmeEngeliMi(silinenSayisi, oncekiSayi) {
  const silinen = Number(silinenSayisi) || 0;
  const onceki = Number(oncekiSayi) || 0;
  return silinen >= TOPLU_SILME_ESIGI && silinen * 2 >= onceki;
}
// Yazma öncesi bütün ana/alt farkları ölçer; engel varsa ilkini döner, yoksa null.
function topluSilmeEngeliBul(tablo, fark, cocukFarklari, bellekYedegi) {
  const boy = (ad) => (bellekYedegi && bellekYedegi[ad] ? bellekYedegi[ad].size : 0);
  if (topluSilmeEngeliMi((fark.silinen || []).length, boy(tablo))) {
    return { tablo, silinen: fark.silinen.length, onceki: boy(tablo) };
  }
  for (const { cocuk, cFark } of cocukFarklari || []) {
    const ad = `${tablo}::${cocuk.tablo}`;
    if (topluSilmeEngeliMi((cFark.silinen || []).length, boy(ad))) {
      return { tablo: cocuk.tablo, silinen: cFark.silinen.length, onceki: boy(ad) };
    }
  }
  return null;
}

async function _tabloEsitleUygula(tablo, kayitlar, secenek = {}) {
  const sema = TABLO_SEMA[tablo];
  if (!sema) return;

  // BELLEK YEDEĞİ — ANA + ALT (v1.556.0). tabloFarki belleği çağrıldığı anda "yazıldı" diye işaretliyor.
  // Yazma DÜŞERSE (internet/elektrik kesintisi, sunucu hatası) bu yalan olur ve kayıt bir daha hiç
  // gönderilmez: kullanıcı (3 Ekim): "Jut stoğu açtım, reçeteye ekledim, silmedim ama stokta görünmüyor;
  // reçetede görünüyor — bir ara elektrik gitti, internetsiz çalıştım". Jut internetsiz açıldı → POST düştü
  // → bellek "Jut bulutta" dedi → internet gelince sıradaki yazma yalnız reçeteyi gönderdi, başarılı olunca
  // bekleyen yazma defteri de silindi → bir sonraki açılışta buluttan okununca Jut YOKTU.
  // Artık: hata/çakışmada ana ve alt belleklerin hepsi geri alınır; değişenler kalıcı deftere yazılır
  // (`bekleyenKayitEkle`) ki uygulama kapanıp açılsa da gönderilsin.
  const bellekAdlari = [tablo, ...(sema.cocuklar || []).map((c) => `${tablo}::${c.tablo}`)];
  const bellekYedegi = {};
  bellekAdlari.forEach((b) => { bellekYedegi[b] = _sonHal[b] ? new Map(_sonHal[b]) : null; });
  const bellegiGeriAl = () => bellekAdlari.forEach((b) => {
    if (bellekYedegi[b]) _sonHal[b] = bellekYedegi[b]; else delete _sonHal[b];
  });

  // 1) ANA KAYITLAR — ve ALT KAYIT FARKLARI ÖNCEDEN (ağa çıkmadan): yazma yarıda düşerse ne
  // gönderilecekti, tamamı bilinsin (deftere o yazılır).
  const fark = tabloFarki(tablo, kayitlar);
  const cocukFarklari = (sema.cocuklar || []).map((cocuk) => {
    const duz = [];
    (kayitlar || []).forEach((k) => { cocuk.cikar(k).forEach((c) => duz.push(c)); });
    const kimlikli = duz.map((c) => ({ ...c, __k: cocuk.anahtar(c) }));
    return { cocuk, cFark: tabloFarki(`${tablo}::${cocuk.tablo}`, kimlikli.map((c) => ({ ...c, id: c.__k }))) };
  });
  let _sayim = null;
  // TOPLU SİLME KİLİDİ — ağa çıkmadan önce (yukarıdaki yorum). `secenek.topluSilmeIzni` yalnız sıfırlama,
  // çöp boşaltma ve kullanıcının silinecek sayıyı görüp onayladığı yedek geri yüklemesinden gelir.
  const engel = secenek && secenek.topluSilmeIzni ? null : topluSilmeEngeliBul(tablo, fark, cocukFarklari, bellekYedegi);
  if (engel) {
    bellegiGeriAl();
    gunlukYaz(`TOPLU SİLME ENGELLENDİ: ${engel.tablo} — ${engel.silinen} kayıt silinecekti (eski hâlde ${engel.onceki})`, "guvenlik",
      { tablo: engel.tablo, anaTablo: tablo, silinen: engel.silinen, onceki: engel.onceki });
    const e = new Error(`Toplu silme engellendi: ${engel.tablo} tablosundan ${engel.silinen} kayıt (eldeki ${engel.onceki} kayıttan) `
      + `tek yazmada silinecekti; bu bir hata belirtisidir, buluta DOKUNULMADI. Sayfayı yenileyip buluttaki hâli yükleyin. `
      + `Silme gerçekten isteniyorsa Tanımlar › Bakım'dan (sıfırlama / çöp / yedek) açık onayla yapılır.`);
    e.topluSilmeEngeli = true;
    throw e;
  }
  try {
  if (!_surumler[tablo]) _surumler[tablo] = new Map();
  const surumMap = _surumler[tablo];
  const degisen = [...fark.eklenen, ...fark.guncellenen];

  // Ayrım "eklenen mi güncellenen mi"ye göre DEĞİL, sürümünü bilip bilmediğimize göre yapılır.
  // Fark belleği sıfırlandığında (göç, veritabanı sıfırlama) veritabanında zaten var olan
  // kayıtlar da "eklenen" görünüyor; onları INSERT saymak yinelenen anahtar hatası verirdi.
  const yeniler = [];
  const guncellemeler = [];
  degisen.forEach((k) => {
    if (!surumDesteklenmiyor && surumMap.has(k.id)) guncellemeler.push(k);
    else yeniler.push(k);
  });

  if (yeniler.length > 0) {
    await supabasePostParcali(tablo, yeniler.map((k) => (
      surumDesteklenmiyor ? sema.satir(k) : { ...sema.satir(k), surum: 1 }
    )));
    if (!surumDesteklenmiyor) yeniler.forEach((k) => surumMap.set(k.id, 1));
  }

  // Güncellemeler tek tek gider. Toplu upsert ile sürüm koşulu kurulamıyor: upsert "varsa üzerine
  // yaz" demektir, "sürümü buysa üzerine yaz" diyemez. Kaydın ezilmemesi, tek istekte bitmesinden
  // önemli — fark katmanı sayesinde bir işlemde genelde tek kayıt değişiyor zaten.
  const cakisanlar = [];
  if (guncellemeler.length > 0) {
    await sirayla(guncellemeler.map((k) => async () => {
      const beklenen = surumMap.get(k.id);
      const donen = await supabaseIstek(
        `${tablo}?id=eq.${pgKimlik(k.id)}&surum=eq.${beklenen}&select=id`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ ...sema.satir(k), surum: beklenen + 1 }),
        }
      );
      // Sıfır satır döndüyse koşul tutmadı: kaydı aradan başkası değiştirmiş.
      if (Array.isArray(donen) && donen.length === 0) cakisanlar.push(k.id);
      else surumMap.set(k.id, beklenen + 1);
    }));
  }
  _sayim = { eklenen: fark.eklenen.length, guncellenen: fark.guncellenen.length, silinen: fark.silinen.length };

  // ÇAKIŞMA VARSA BURADA DURULUR — alt kayıtlara hiç dokunulmaz.
  //
  // Kilit yalnızca ana satırın SÜTUNLARINI koruyor. Oysa bu uygulamada asıl veri alt tablolarda:
  // bir ürünün stok miktarı `variants`ta, defteri `hareketler`de. Çakışmadan sonra alt yazmaya
  // devam etmek, korunan ana satırın altından varyantı ezmek demekti.
  //
  // "Kampre Bezi" olayı tam olarak buydu: iki 0,8'lik kesim bir bilgisayarda işlendi, üçüncü
  // kesim o ikisini görmemiş bayat bir kopyada hesaplandı. Hareketler kimliğe göre birleştiği
  // için üçü de deftere düştü, varyant ise komple üzerine yazıldı — defter −14,8 derken stok
  // −13,2'de kaldı.
  //
  // Çakışma, elimizdeki tablonun bayat olduğunun kanıtıdır. Bayat veriyle yazmaya devam etmek
  // tahmin yürütmektir; doğru davranış durup kullanıcıyı yenilemeye yönlendirmektir.
  if (cakisanlar.length > 0) {
    bellegiGeriAl();

    // SUNUCUYA SOR: çakışma gerçek mi? Beklediğimiz sürümle sunucudakini karşılaştırmadan
    // "başkası değiştirdi" demek tahmindir. Sunucudaki sürüm beklediğimizden BİR fazlaysa,
    // değişikliği büyük olasılıkla BU bilgisayar yaptı (örtüşen ikinci yazma) — sahte çakışma.
    // Kullanıcıya olmayan bir "başka bilgisayar"ı suçlamak, hatayı aramasını da zorlaştırır.
    let teshis = [];
    let teshisOkundu = false;
    try {
      const liste = cakisanlar.map((id) => encodeURIComponent(`"${String(id).replace(/"/g, '\\"')}"`)).join(",");
      const guncel = await supabaseIstek(`${tablo}?id=in.(${liste})&select=id,surum`);
      teshis = (guncel || []).map((r) => ({ id: r.id, sunucu: r.surum, beklenen: surumMap.get(r.id) }));
      teshisOkundu = Array.isArray(guncel);
    } catch (e) {
      console.warn("Çakışma teşhisi okunamadı:", e && e.message);
    }
    // Sürümü tazele ki bir sonraki deneme doğru koşulla gitsin; kullanıcı aynı duvara ikinci
    // kez toslamasın.
    teshis.forEach((t) => { if (t.sunucu != null) surumMap.set(t.id, t.sunucu); });
    // SUNUCUDA HİÇ OLMAYAN kayıt (v1.568.0, denetim — kritik): silinip aynı oturumda geri yüklenen kaydın eski sürümü
    // bellekte kalıyordu; PATCH boş dönüyor, sahte çakışma tablonun SONRAKİ BÜTÜN yazmalarını (alt kayıtlar dahil)
    // durduruyordu. Teşhis okunabildiyse ve kayıt dönmediyse sürüm unutulur → bir sonraki deneme ekleme (POST).
    if (teshis.length || cakisanlar.length) {
      const donen = new Set(teshis.map((t) => t.id));
      if (teshisOkundu) cakisanlar.forEach((id) => { if (!donen.has(id)) surumMap.delete(id); });
    }

    gunlukYaz(`Sürüm çakışması: ${tablo}`, "veri", { tablo, adet: cakisanlar.length, teshis });
    surumCakismasiBildir(tablo, cakisanlar, teshis);

    // ÇAKIŞMA BİR BAŞARISIZLIKTIR. Eskiden buradan normal dönülüyor, `tabloYaz` da { ok: true }
    // üretiyordu; sonuçta üstte "kaydedilmedi" şeridi çıkarken altta "silindi" yazıyordu.
    return { __cakisma: true, sayim: _sayim, teshis };
  }

  // 2) ALT KAYITLAR — hepsi düzleştirilip kendi tablosu gibi fark alınır (fark yukarıda hesaplandı).
  // Böylece 500 hareketi olan bir üründe tek hareket eklendiğinde yalnızca o satır gider.
  for (const { cocuk, cFark } of cocukFarklari) {

    const cYaz = [...cFark.eklenen, ...cFark.guncellenen].map(({ id, __k, ...temiz }) =>
      // Varyantta `id` yapay bir anahtardır, sütun değil — çıkarılır.
      // Hareket gibi gerçek kimliği olan tablolarda geri konur.
      cocuk.cakisma ? temiz : { ...temiz, id: __k }
    );
    if (cYaz.length > 0) {
      const yol = cocuk.cakisma ? `${cocuk.tablo}?on_conflict=${cocuk.cakisma}` : cocuk.tablo;
      await supabasePostParcali(yol, cYaz);
    }
    // Silinen alt kayıtlar (kalem çıkarıldı, hareket geri alındı, renk/beden kaldırıldı)
    // veritabanından da düşer. Bileşik anahtarlı tablolarda `id` sütunu olmadığı için silme
    // sütun değerleriyle kurulur — eskiden bu tablolar silmeden büsbütün muaftı.
    if (cFark.silinen.length > 0) {
      if (cocuk.cakisma) {
        // Alan listesi `cakisma` dizesinden okunuyor: ikisini ayrı tutmak, birini
        // güncelleyip diğerini unutma riskiydi.
        const alanlar = cocuk.cakisma.split(",").map((a) => a.trim()).filter(Boolean);
        await supabaseSilBilesik(cocuk.tablo, alanlar, cFark.silinenKayitlar);
      } else {
        await supabaseSil(cocuk.tablo, cFark.silinen);
      }
    }
  }

  // 3) SİLİNEN ANA KAYITLAR — alt kayıtlar cascade ile birlikte gider.
  if (fark.silinen.length > 0) {
    await supabaseSil(tablo, fark.silinen);
    // Silinen kaydın sürümü unutulur (v1.568.0): aynı kimlik yeniden yazılırsa (Çöp'ten geri yükleme) PATCH değil
    // POST gitsin — yoksa sahte çakışma.
    fark.silinen.forEach((id) => surumMap.delete(id));
  }
  } catch (e) {
    // YAZMA DÜŞTÜ: bellek geri, gönderilemeyenler kalıcı deftere. Hata yukarı gider (tabloYaz bekleyen
    // yazma şeridini açar, çağıran "kaydedilemedi" der).
    bellegiGeriAl();
    bekleyenKayitEkle(tablo, fark, cocukFarklari);
    throw e;
  }
  // Hepsi gitti: defterdeki önceki bekleyenler de bu yazmayla gönderildi (tabanda yoklardı).
  bekleyenKayitTemizle(tablo);
  // YAZMA SONRASI DOĞRULAMA (v1.714.0, aşağıda): "yazdım" demekle "bulutta öyle duruyor" aynı şey değil.
  await yazmayiDogrula(tablo, sema, _sayim, cocukFarklari);
  return _sayim;
}

// =============================================================================================
// YAZMA SONRASI DOĞRULAMA (v1.714.0 — kullanıcı: "Veri buluta giderken hâlâ korkularım var", seçtiği madde: 2)
//
// Yazma katmanı her isteğin HTTP cevabına bakıyor; ama "istek 2xx döndü" ile "tablo bizim elimizdeki hâlde" arasında
// boşluk var: sessiz bir RLS reddi (0 satır etkilenir, 2xx döner), yarıda kalmış parça, başka cihazın aynı anda sildiği
// satırlar. Artık kritik tablolarda yazma bitince tablonun BULUTTAKİ SATIR SAYISI geri okunur (HEAD + count=exact, 078
// `supabaseSatirSayisi`; satır inmez, tek başlık) ve elimizdeki sayıyla (fark belleği `_sonHal`, az önce yazılan hâl)
// karşılaştırılır. Yalnız BULUTTA EKSİK varsa alarm: bulutta fazla olması normaldir (başka cihaz eklemiş, biz henüz
// tazelemedik); eksik olması ise ya bizim yazmamızın yere inmediği ya da birinin sildiği anlamına gelir — ikisi de
// kullanıcının BİLMESİ gereken şey. Alarm yazmayı geri almaz (geri alınacak bir şey yok), günlüğe "YAZMA DOĞRULAMA" düşer
// ve üstte kırmızı şerit çıkar (100 `__yazmaDogrulamaBildir`); kullanıcı Bakım › Bulut sayımı'ndan ayrıntıya gider.
// Yalnız değişiklik olan yazmalarda ve yalnız kritik tablolarda (iş verisi; onaylar/çöp/çek görseli değil). Doğrulama
// okunamazsa (ağ) sessiz geçilir: yazma zaten tamamlandı. Köprü (`window.__yazmaDogrulamaBildir`) yoksa — birim testleri,
// sunucu — hiç çalışmaz. Kuyruğun İÇİNDE beklenir: aynı tablonun sıradaki yazması sayıyı değiştirmeden ölçülsün.
const DOGRULANAN_TABLOLAR = new Set(["urunler", "cariler", "siparisler", "uretim", "stok_rezervasyonlari"]);
// Saf: beklenen/bulut çiftlerinden eksik olanları döner. `bulut == null` (okunamadı) atlanır.
function yazmaDogrulamaEksikleri(olcumler) {
  return (olcumler || []).filter((o) => o && o.bulut != null && Number(o.bulut) < Number(o.beklenen))
    .map((o) => ({ tablo: o.tablo, beklenen: Number(o.beklenen), bulut: Number(o.bulut), eksik: Number(o.beklenen) - Number(o.bulut) }));
}
async function yazmayiDogrula(tablo, sema, sayim, cocukFarklari) {
  if (typeof window === "undefined" || typeof window.__yazmaDogrulamaBildir !== "function") return;
  if (!DOGRULANAN_TABLOLAR.has(tablo) || typeof supabaseSatirSayisi !== "function") return;
  const anaDegisti = sayim && (sayim.eklenen || sayim.guncellenen || sayim.silinen);
  const cocukDegisti = (cocukFarklari || []).some(({ cFark }) => cFark && (cFark.eklenen.length || cFark.guncellenen.length || cFark.silinen.length));
  if (!anaDegisti && !cocukDegisti) return;
  const hedefler = [{ tablo, bellek: tablo }, ...((sema && sema.cocuklar) || []).map((c) => ({ tablo: c.tablo, bellek: `${tablo}::${c.tablo}` }))];
  const olcumler = await Promise.all(hedefler.map(async (h) => {
    const beklenen = _sonHal[h.bellek] ? _sonHal[h.bellek].size : 0;
    let bulut = null;
    try { bulut = await supabaseSatirSayisi(h.tablo); } catch (e) { /* okunamadı: sessiz */ }
    return { tablo: h.tablo, beklenen, bulut };
  }));
  const eksikler = yazmaDogrulamaEksikleri(olcumler);
  if (eksikler.length === 0) return;
  gunlukYaz(`YAZMA DOĞRULAMA: ${eksikler.map((e) => `${e.tablo} bulutta ${e.eksik} eksik (elde ${e.beklenen}, bulut ${e.bulut})`).join("; ")}`, "guvenlik", { anaTablo: tablo, eksikler });
  try { window.__yazmaDogrulamaBildir(tablo, eksikler); } catch (e) { /* köprü hatası yazmayı etkilemesin */ }
}

// Dizi tabanlı tablolar için tek giriş noktası.
// Yerel kopya HER ZAMAN yazılır: internet kesildiğinde uygulama son bilinen hâlle açılabilsin diye.
// SONUÇ DÖNDÜRÜR: { ok, bulut, hata }
//
// Eskiden hata burada yutulup çağırana hiçbir şey söylenmiyordu; çağıranların hepsi de
// `.catch(() => {})` yazdığı için o catch zaten hiç tetiklenmiyordu. Sonuç: bulut yazması
// başarısız olsa bile çağıran koda "oldu" gibi görünüyordu ve ekrana "silindi/kaydedildi"
// basılıyordu. YAPILDI DEYİP YAPILMAMAK, yapılmamaktan daha zararlı — kullanıcı yanlış bilgiyle
// bir sonraki adıma geçiyor.
//
// Artık söz her zaman çözülüyor (çağıranlar patlamasın) ama sonucun içinde ne olduğu yazıyor.
// Hata bildirimi ve şerit yine çalışıyor; çağıran isterse ek olarak kendi kararını verebilir.
// `yerelKayitlar`: yerele BAŞKA bir hâl yazılacaksa verilir. Tek kullanıcısı stok: görseller
// yerelde ürün başına ayrı anahtarlarda tutuluyor (bkz. 062-gorsel-depo), buluta ise ürünün kendi
// satırında gidiyor. Bulut satır bazında olduğu için orada sıkışma yok; sıkışan yerel tek anahtar.
// YAZIMI İZLE (22 Eylül, v1.410.0 — 13. denetimin borçları).
// `tabloYaz(...).catch(() => {})` YEREL yazma hatasını sessizce yutuyordu (depo dolu, boyut aşımı):
// değişiklik yalnız bellekte kalıyor, sayfa yenilenince kayboluyor, kimse haberdar olmuyordu.
// BULUT hatası zaten ayrı yoldan görünür (tabloYaz → `__supabaseHataBildir` şeridi + bekleyen
// yazma, kendiliğinden yeniden denenir); burada yalnız yerel ret ele alınıyor.
// Söz REDDEDİLMEZ, sonuç nesnesine çevrilir: çağıran `await` edip `yerel`/`ok`a bakabilir
// (çöpten geri yüklemede kaydı çöpten ancak yazma tuttuysa çıkarmak için).
// Bildirici App'ten köprüyle geliyor (`__kayitHatasiBildir` = kaydetmeHatasiBildir): kancalara
// parametre taşımak ve tanım sırası (TDZ) derdi yok.
function yazimiIzle(soz, etiket, veri) {
  return Promise.resolve(soz).then(
    (sonuc) => sonuc || { ok: true },
    (hata) => {
      console.error("Yerel yazma hatası:", etiket, hata);
      if (typeof window !== "undefined" && window.__kayitHatasiBildir) {
        window.__kayitHatasiBildir(hata, etiket, veri);
      }
      return { ok: false, yerel: true, hata: String((hata && hata.message) || hata) };
    }
  );
}

// STOK YERELE GÖRSELSİZ (v1.548.0). `saveStok` yerel kopyayı `gorselleriAyir` ile görselsiz veriyordu; ama
// üretim teslimi, ara proses, ad değiştirme, silme zinciri, onarımlar… (25 çağrı) doğrudan `tabloYaz` çağırıp
// GÖRSELLİ listeyi yerel `stok:items`a yazıyordu — anahtar gereksiz büyüyor, görsel deposu kuralı deliniyordu.
// Kural artık tek yerde: yerel kopya verilmediyse burada ayrılır. Buluta yine görselli gider (ürün satırında).
// Görsel deposuna (`gorselleriYaz`) BURADAN yazılmıyor: listede olmayan ürünün görselini siliyor, görselsiz
// bir liste gelirse depo boşalırdı; depo zaten ürün kaydedilirken (`saveStok`) ve açılış göçünde güncelleniyor.
// `secenek.topluSilmeIzni` (v1.712.0): toplu silme kilidini yalnız bu yazma için açar — bkz. `topluSilmeEngeliMi`.
function tabloYaz(anahtar, tablo, kayitlar, yerelKayitlar, secenek) {
  if (!yerelKayitlar && tablo === "urunler" && Array.isArray(kayitlar)) yerelKayitlar = gorselleriAyir(kayitlar).stok;
  const yerel = guvenliYaz(anahtar, JSON.stringify(yerelKayitlar || kayitlar), true);
  if (!supabaseAcikMi() || !TABLO_SEMA[tablo]) {
    if (!TABLO_SEMA[tablo]) tabloFarki(tablo, kayitlar); // fark belleği yine de güncellensin
    return Promise.resolve(yerel).then(() => ({ ok: true, bulut: false }));
  }
  // Yoldaki yazma (v1.645.2, 030): bitene kadar değişiklik yoklaması bu tabloyu "bizim yazmamız" sayar.
  bulutYazmaBasladi(tablo);
  const bulutIsi = supabaseTabloEsitle(tablo, kayitlar, secenek);
  bulutIsi.then(() => bulutYazmaBitti(tablo), () => bulutYazmaBitti(tablo));
  return Promise.all([
    yerel,
    bulutIsi.then(
      (sayim) => {
        // Çakışma: yazma OLMADI. Başarı gibi raporlamak çağıranın "silindi" demesine yol açıyordu.
        if (sayim && sayim.__cakisma) {
          return { ok: false, bulut: true, cakisma: true, hata: "sürüm çakışması — buluta yazılmadı" };
        }
        bekleyenYazmaSil(anahtar);   // gitti — defterdeyse çık
        if (typeof window !== "undefined" && window.__supabaseBasariBildir) window.__supabaseBasariBildir(tablo);
        // OTOMATİK TABAN: her veri değişikliği, kimse çağırmayı unutmasa da unutsa da günlüğe
        // düşer. Değişiklik yoksa yazılmaz — yoksa günlük gürültüden okunmaz hâle gelir.
        if (sayim && (sayim.eklenen || sayim.guncellenen || sayim.silinen)) {
          const parcalar = [];
          if (sayim.eklenen) parcalar.push(`${sayim.eklenen} eklendi`);
          if (sayim.guncellenen) parcalar.push(`${sayim.guncellenen} güncellendi`);
          if (sayim.silinen) parcalar.push(`${sayim.silinen} silindi`);
          gunlukYaz(`${tablo}: ${parcalar.join(", ")}`, "veri", sayim);
        }
        return { ok: true, bulut: true };
      },
      (e) => {
        console.error("Supabase yazma hatası:", tablo, e);
        const mesaj = String((e && e.message) || e);
        supabaseSonHata = { tablo, mesaj, zaman: Date.now() };
        // TOPLU SİLME ENGELİ bekleyen yazma DEĞİLDİR: deftere düşerse açılışta "yerel kazanır" ve eksik liste
        // bulutun önüne geçer — korumanın engellediği şeyin ta kendisi. Yalnız şerit ve günlük.
        if (!(e && e.topluSilmeEngeli)) bekleyenYazmaEkle(anahtar, tablo, mesaj);   // yerel güncel, bulut değil: açılışta yerel kazansın
        if (typeof window !== "undefined" && window.__supabaseHataBildir) {
          window.__supabaseHataBildir(tablo, mesaj);
        }
        return { ok: false, bulut: true, hata: mesaj };
      }
    ),
  ]).then(([, sonuc]) => sonuc);
}

