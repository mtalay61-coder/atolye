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
async function supabaseSilBilesik(tablo, alanlar, kayitlar) {
  for (const k of kayitlar) {
    const kosullar = alanlar.map((alan) => {
      const deger = k[alan];
      // Yazarken alan hiç gönderilmediyse sütun NULL'dır; eşitlik NULL'a denk gelmez, `is.null` gelir.
      if (deger === null || deger === undefined) return `${alan}=is.null`;
      const tirnakli = `"${String(deger).replace(/"/g, '\\"')}"`;
      return `${alan}=in.(${encodeURIComponent(tirnakli)})`;
    }).join("&");
    await supabaseIstek(`${tablo}?${kosullar}`, { method: "DELETE" });
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

function supabaseTabloEsitle(tablo, kayitlar) {
  return tabloKuyrugunaAl(tablo, () => _tabloEsitleUygula(tablo, kayitlar));
}

async function _tabloEsitleUygula(tablo, kayitlar) {
  const sema = TABLO_SEMA[tablo];
  if (!sema) return;

  // 1) ANA KAYITLAR
  // Fark belleğinin ÖNCEKİ hâli saklanıyor: çakışma çıkarsa geri alınacak. tabloFarki belleği
  // çağrıldığı anda güncelliyor, yani "yazıldı" diye işaretliyor — yazılmadıysa bu yalan olur
  // ve kayıt bir daha hiç denenmez.
  const oncekiBellek = _sonHal[tablo] ? new Map(_sonHal[tablo]) : null;
  const fark = tabloFarki(tablo, kayitlar);
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
    await supabaseIstek(tablo, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(yeniler.map((k) => (
        surumDesteklenmiyor ? sema.satir(k) : { ...sema.satir(k), surum: 1 }
      ))),
    });
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
  const _sayim = { eklenen: fark.eklenen.length, guncellenen: fark.guncellenen.length, silinen: fark.silinen.length };

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
    if (oncekiBellek) _sonHal[tablo] = oncekiBellek;

    // SUNUCUYA SOR: çakışma gerçek mi? Beklediğimiz sürümle sunucudakini karşılaştırmadan
    // "başkası değiştirdi" demek tahmindir. Sunucudaki sürüm beklediğimizden BİR fazlaysa,
    // değişikliği büyük olasılıkla BU bilgisayar yaptı (örtüşen ikinci yazma) — sahte çakışma.
    // Kullanıcıya olmayan bir "başka bilgisayar"ı suçlamak, hatayı aramasını da zorlaştırır.
    let teshis = [];
    try {
      const liste = cakisanlar.map((id) => encodeURIComponent(`"${String(id).replace(/"/g, '\\"')}"`)).join(",");
      const guncel = await supabaseIstek(`${tablo}?id=in.(${liste})&select=id,surum`);
      teshis = (guncel || []).map((r) => ({ id: r.id, sunucu: r.surum, beklenen: surumMap.get(r.id) }));
    } catch (e) {
      console.warn("Çakışma teşhisi okunamadı:", e && e.message);
    }
    // Sürümü tazele ki bir sonraki deneme doğru koşulla gitsin; kullanıcı aynı duvara ikinci
    // kez toslamasın.
    teshis.forEach((t) => { if (t.sunucu != null) surumMap.set(t.id, t.sunucu); });

    gunlukYaz(`Sürüm çakışması: ${tablo}`, "veri", { tablo, adet: cakisanlar.length, teshis });
    surumCakismasiBildir(tablo, cakisanlar, teshis);

    // ÇAKIŞMA BİR BAŞARISIZLIKTIR. Eskiden buradan normal dönülüyor, `tabloYaz` da { ok: true }
    // üretiyordu; sonuçta üstte "kaydedilmedi" şeridi çıkarken altta "silindi" yazıyordu.
    return { __cakisma: true, sayim: _sayim, teshis };
  }

  // 2) ALT KAYITLAR — hepsi düzleştirilip kendi tablosu gibi fark alınır.
  // Böylece 500 hareketi olan bir üründe tek hareket eklendiğinde yalnızca o satır gider.
  for (const cocuk of sema.cocuklar) {
    const duz = [];
    (kayitlar || []).forEach((k) => { cocuk.cikar(k).forEach((c) => duz.push(c)); });
    const kimlikli = duz.map((c) => ({ ...c, __k: cocuk.anahtar(c) }));
    const cFark = tabloFarki(`${tablo}::${cocuk.tablo}`, kimlikli.map((c) => ({ ...c, id: c.__k })));

    const cYaz = [...cFark.eklenen, ...cFark.guncellenen].map(({ id, __k, ...temiz }) =>
      // Varyantta `id` yapay bir anahtardır, sütun değil — çıkarılır.
      // Hareket gibi gerçek kimliği olan tablolarda geri konur.
      cocuk.cakisma ? temiz : { ...temiz, id: __k }
    );
    if (cYaz.length > 0) {
      const yol = cocuk.cakisma ? `${cocuk.tablo}?on_conflict=${cocuk.cakisma}` : cocuk.tablo;
      await supabaseIstek(yol, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(cYaz),
      });
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
  }
  return _sayim;
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

function tabloYaz(anahtar, tablo, kayitlar, yerelKayitlar) {
  const yerel = guvenliYaz(anahtar, JSON.stringify(yerelKayitlar || kayitlar), true);
  if (!supabaseAcikMi() || !TABLO_SEMA[tablo]) {
    if (!TABLO_SEMA[tablo]) tabloFarki(tablo, kayitlar); // fark belleği yine de güncellensin
    return Promise.resolve(yerel).then(() => ({ ok: true, bulut: false }));
  }
  return Promise.all([
    yerel,
    supabaseTabloEsitle(tablo, kayitlar).then(
      (sayim) => {
        // Çakışma: yazma OLMADI. Başarı gibi raporlamak çağıranın "silindi" demesine yol açıyordu.
        if (sayim && sayim.__cakisma) {
          return { ok: false, bulut: true, cakisma: true, hata: "sürüm çakışması — buluta yazılmadı" };
        }
        bekleyenYazmaSil(anahtar);   // gitti — defterdeyse çık
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
        bekleyenYazmaEkle(anahtar, tablo, mesaj);   // yerel güncel, bulut değil: açılışta yerel kazansın
        if (typeof window !== "undefined" && window.__supabaseHataBildir) {
          window.__supabaseHataBildir(tablo, mesaj);
        }
        return { ok: false, bulut: true, hata: mesaj };
      }
    ),
  ]).then(([, sonuc]) => sonuc);
}

