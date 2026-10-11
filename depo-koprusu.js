// --- window.storage köprüsü (IndexedDB üzerine, localStorage'dan otomatik göçle) ---
//
// NEDEN INDEXEDDB
// Önce localStorage kullanılıyordu ve sınırı ~5 MB. Bu, birkaç yüz ürün ve görselle dolan bir
// sınır: kullanıcı bir ay sonra yine tıkanırdı. Üstelik localStorage aynı kaynaktaki BAŞKA
// uygulamalarla paylaşılıyor — bildirilen olayda deponun %70'ini alakasız bir uygulama doldurmuştu
// ve bu uygulamanın yapabileceği hiçbir şey yoktu.
//
// IndexedDB'nin kotası kıyaslanamayacak kadar büyük: aynı cihazda `navigator.storage.estimate()`
// 10 GB bildirdi. Arayüz aynı kaldığı için uygulama kodunun tek satırı değişmiyor.
//
// GÖÇ TEK YÖNLÜ VE DOĞRULANIR
// İlk açılışta localStorage'daki `atolye:` kayıtları IndexedDB'ye kopyalanır, HER KAYIT GERİ
// OKUNARAK doğrulanır, ancak ondan sonra localStorage'dan silinir. Doğrulanamayan kayıt
// localStorage'da BIRAKILIR — yarım bir göçte veriyi silmektense iki kopya bırakmak yeğdir.
// Silme aynı zamanda o ~5 MB'ı boşaltır; diğer uygulamalar da rahatlar.
//
// GERİ DÜŞÜŞ
// IndexedDB açılamazsa (çok eski tarayıcı, gizli sekme kısıtı) köprü localStorage'a döner.
// Uygulama çalışmaya devam eder, yalnızca eski sınırla.
//
// FİRMA BAŞINA AYRI DEPO (v1.642.0): uygulama birden çok firmaya satılıyor ve her firmanın ayrı Supabase projesi
// var (030 FİRMA BAĞLANTISI). Aynı cihazda iki firma açılırsa yerel kopyalar KARIŞMAMALI — biri ötekinin stok
// kaydını "yerel yedek" sanıp kendi bulutuna yazabilirdi. Seçili firmanın proje kimliği (adresin alt alan adı)
// veritabanı adına ve yedek önekine eklenir. VARSAYILAN firma (seçim yok ya da ilk sahibin projesi) için adlar
// ESKİSİ GİBİ — mevcut cihazlardaki veri yerinde kalır, göç gerekmez. Geçerlilik kuralı 030'daki
// `firmaBaglantisiGecerli` ile aynı tutulmalı (adres https://<ref>.supabase.co, gizli anahtar asla).
(function () {
  const VARSAYILAN_REF = "mqdgucoomgqcvhvgixbl";
  const FIRMA_EK = (function () {
    try {
      const f = JSON.parse(localStorage.getItem("firma:secim") || "null");
      // DEMO FİRMA (v1.645.0): bulutsuz, kendi deposu — gerçek firmanın yerel kopyasına asla karışmaz.
      if (f && f.demo === true) return "demo";
      const m = f && /^https:\/\/([a-z0-9]{8,40})\.supabase\.co$/.exec(String(f.url || ""));
      const anahtar = String((f && f.anahtar) || "").trim();
      const anahtarAcik = /^sb_publishable_/.test(anahtar) || anahtar.split(".").length === 3;
      return m && anahtarAcik && m[1] !== VARSAYILAN_REF ? m[1] : "";
    } catch (e) { return ""; }
  })();
  const ON = FIRMA_EK ? "atolye:@" + FIRMA_EK + ":" : "atolye:";
  const VT_AD = FIRMA_EK ? "atolye-depo@" + FIRMA_EK : "atolye-depo";
  const DEPO = "kv";
  const GOC_ISARETI = "__goc_tamam";

  // --- localStorage tabanlı yedek köprü (hem geri düşüş hem göç kaynağı) ---
  const yerel = {
    oku(anahtar) {
      return localStorage.getItem(ON + anahtar);
    },
    yaz(anahtar, deger) {
      localStorage.setItem(ON + anahtar, String(deger));
    },
    sil(anahtar) {
      localStorage.removeItem(ON + anahtar);
    },
    anahtarlar(onEk = "") {
      const k = [];
      for (let i = 0; i < localStorage.length; i++) {
        const h = localStorage.key(i);
        // Varsayılan önek ("atolye:") öteki firmaların önekini ("atolye:@ref:") de kapsıyor — onlar atlanır.
        if (h && h.startsWith(ON + onEk) && (FIRMA_EK || !h.startsWith("atolye:@"))) k.push(h.slice(ON.length));
      }
      return k;
    },
  };

  let vtSozu = null;
  function vtAc() {
    if (vtSozu) return vtSozu;
    vtSozu = new Promise((coz, ret) => {
      if (!window.indexedDB) { ret(new Error("indexedDB yok")); return; }
      let istek;
      try { istek = indexedDB.open(VT_AD, 1); } catch (e) { ret(e); return; }
      istek.onupgradeneeded = () => {
        const vt = istek.result;
        if (!vt.objectStoreNames.contains(DEPO)) vt.createObjectStore(DEPO);
      };
      istek.onsuccess = () => coz(istek.result);
      istek.onerror = () => ret(istek.error || new Error("indexedDB açılamadı"));
      // Bazı tarayıcılarda başka sekme kilitliyse "blocked" gelir ve hiç sonuçlanmaz;
      // sonsuza kadar beklememek için süre sınırı var.
      istek.onblocked = () => ret(new Error("indexedDB başka sekme tarafından kilitli"));
    });
    return vtSozu;
  }

  function islem(mod, isYap) {
    return vtAc().then((vt) => new Promise((coz, ret) => {
      let t;
      try { t = vt.transaction(DEPO, mod); } catch (e) { ret(e); return; }
      const d = t.objectStore(DEPO);
      let sonuc;
      try { isYap(d, (v) => { sonuc = v; }); } catch (e) { ret(e); return; }
      t.oncomplete = () => coz(sonuc);
      t.onerror = () => ret(t.error);
      t.onabort = () => ret(t.error);
    }));
  }

  const idb = {
    oku: (a) => islem("readonly", (d, ver) => { const r = d.get(a); r.onsuccess = () => ver(r.result); }),
    yaz: (a, v) => islem("readwrite", (d) => { d.put(String(v), a); }),
    sil: (a) => islem("readwrite", (d) => { d.delete(a); }),
    anahtarlar: () => islem("readonly", (d, ver) => { const r = d.getAllKeys(); r.onsuccess = () => ver(r.result || []); }),
  };

  // --- GÖÇ ---
  async function gocEt() {
    if (await idb.oku(GOC_ISARETI)) return;
    let tasinan = 0;
    let kalan = 0;
    for (const anahtar of yerel.anahtarlar()) {
      const deger = yerel.oku(anahtar);
      if (deger === null) continue;
      try {
        await idb.yaz(anahtar, deger);
        // DOĞRULAMA: geri okunan değer birebir aynı değilse localStorage'daki kopya SİLİNMEZ.
        const geri = await idb.oku(anahtar);
        if (geri === deger) { yerel.sil(anahtar); tasinan++; } else { kalan++; }
      } catch (e) {
        kalan++;
      }
    }
    await idb.yaz(GOC_ISARETI, JSON.stringify({ zaman: new Date().toISOString(), tasinan, kalan }));
    if (kalan > 0) console.warn("Depo göçü yarım kaldı — " + kalan + " kayıt localStorage'da bırakıldı");
  }

  // IndexedDB kullanılabilir mi? Bir kez denenir; olmuyorsa localStorage'a düşülür.
  let hazir = (async () => {
    try {
      await vtAc();
      await gocEt();
      return true;
    } catch (e) {
      console.warn("IndexedDB kullanılamıyor, localStorage'a dönülüyor:", e && e.message);
      return false;
    }
  })();

  window.storage = {
    async get(anahtar) {
      const idbVar = await hazir;
      const d = idbVar ? await idb.oku(anahtar) : yerel.oku(anahtar);
      // Göç yarım kaldıysa kayıt hâlâ localStorage'da olabilir; oraya da bakılır.
      const deger = d === undefined || d === null ? yerel.oku(anahtar) : d;
      if (deger === null || deger === undefined) throw new Error("bulunamadı: " + anahtar);
      return { key: anahtar, value: String(deger), shared: true };
    },
    async set(anahtar, deger) {
      const idbVar = await hazir;
      if (idbVar) await idb.yaz(anahtar, String(deger));
      else yerel.yaz(anahtar, deger);
      return { key: anahtar, value: String(deger), shared: true };
    },
    async delete(anahtar) {
      const idbVar = await hazir;
      if (idbVar) await idb.sil(anahtar);
      // Yarım göç ihtimaline karşı yereldeki kopya da temizlenir; aksi halde silinen kayıt
      // bir sonraki okumada geri gelirdi.
      yerel.sil(anahtar);
      return { key: anahtar, deleted: true, shared: true };
    },
    async list(onEk = "") {
      const idbVar = await hazir;
      const hepsi = new Set(yerel.anahtarlar(onEk));
      if (idbVar) {
        for (const a of await idb.anahtarlar()) {
          if (typeof a === "string" && a !== GOC_ISARETI && a.startsWith(onEk)) hepsi.add(a);
        }
      }
      return { keys: [...hepsi], prefix: onEk, shared: true };
    },
  };
})();
