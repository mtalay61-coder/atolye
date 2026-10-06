// ================= TANIMLAR — BİRLEŞTİREREK YAZ + MODEL RENGİ ONARIMI (3 Ekim, v1.552.0) =================
//
// Kullanıcı (Paketleme ekran görüntüsü): "75 renk/bedende çift barkodu kurulamıyor — Tanımlar'da yok: renk:
// 1017 - Beyaz Deri/Gümüş · 1018 - Kahve Süet/Yılan Deri … 1025". "Kodlar ile alakalı sıkıntı var, kontrol et."
//
// TEŞHİS: ürünlerin varyant rengi "1017 - Beyaz Deri/Gümüş" bir MODEL RENGİ etiketi; barkodun renk kodu
// `tanimlar.renkKombinasyonlari`ndaki 1017 kodlu kombinasyondan geliyor. O kombinasyonlar tanımlarda YOK.
// Tanımlar TEK SATIR (tekil, `{ id: "tekil", veri }`) ve her kayıt cihazdaki BÜTÜN tanımları yazıyor:
//   1. Cihaz A açık; cihaz B (ya da aynı cihazda başka sekme) yeni model renkleri açıyor (1016…1025).
//   2. A'da herhangi bir tanım değişiyor (renk, ayar, fiyat grubu…) → A'nın ELİNDEKİ liste — B'nin açtıkları
//      yok — buluta tümüyle yazılıyor → B'nin açtıkları siliniyor. Ürünlerde etiketler kalıyor, kod kayboluyor.
//   3. Aynısı açılışta: tanımlarda BEKLEYEN yazma varsa (090 `yerelKazansin`) yerel kopya esas alınıp bulutun
//      üstüne yazılıyordu.
//
// ÇÖZÜM:
//   a) YAZMADAN ÖNCE BİRLEŞTİR: buluttaki tanımlar okunur; bulutta olup bu cihazda olmayan kimlikli öğeler
//      (renk, beden, model rengi, proses, kullanıcı…) — BU CİHAZDA SİLİNMEDİYSE — korunur. "Bu cihazda
//      silindi" bilgisi yerel bir defterde (`tanim:silinenler`, 120 gün); silme 100'deki `tanimSilinenleriCopeAt`
//      anında yazılır. Böylece silinen geri gelmez, başkasının eklediği kaybolmaz.
//   b) ONARIM: kaybolmuş model renkleri ürünlerin kendi etiketlerinden geri kurulur ("1017 - Beyaz Deri/Gümüş"
//      → kod 1017 + renkler Beyaz Deri, Gümüş). Kod AYNI kalır, basılmış barkodlar geçerli kalır.

const TANIM_SILINEN_ANAHTAR = "tanim:silinenler";
const TANIM_SILINEN_GUN = 120;

function tanimSilinenleriOku() {
  try {
    const d = JSON.parse(window.localStorage.getItem(TANIM_SILINEN_ANAHTAR) || "{}");
    return d && typeof d === "object" ? d : {};
  } catch (e) { return {}; }
}
// Bu cihazda silinen tanım öğelerinin kimliklerini deftere yazar (eskiler budanır).
function tanimSilinenleriKaydet(idler) {
  if (!idler || idler.length === 0) return;
  try {
    const d = tanimSilinenleriOku();
    const simdi = Date.now();
    idler.forEach((id) => { if (id) d[id] = simdi; });
    Object.keys(d).forEach((id) => { if (simdi - d[id] > TANIM_SILINEN_GUN * 864e5) delete d[id]; });
    window.localStorage.setItem(TANIM_SILINEN_ANAHTAR, JSON.stringify(d));
  } catch (e) { /* depo yoksa defter de yok — birleştirme yine çalışır, yalnız silinen geri gelebilir */ }
}

// SAF BİRLEŞTİRME. `yerel` esas (bu cihazdaki son hâl; aynı kimlikte yerel kazanır), bulutta olup yerelde
// olmayan kimlikli öğeler eklenir — `silinenler` (kimlik kümesi/nesnesi) içindekiler hariç. Yalnız "her öğesi
// kimlikli nesne" olan listelere dokunulur; düz değer listeleri ve nesneler yerelden aynen.
// Döner: { tanimlar, eklenen: [{ alan, id, ad }] }
// ORTAK SİLİNENLER (v1.569.0, denetim — çok cihaz): "bu cihazda silindi" defteri yalnız yereldi; B'de silinen renk,
// A'nın listesinde durduğu için A'nın ilk tanım kaydında buluta geri yazılıyordu. Silinenler artık tanımların İÇİNDE de
// taşınıyor (`__silinenler`: { id: zaman }, 120 gün): birleştirme iki tarafın birleşimini tutar, bulutta olup bu cihazda
// olmayan silinmişi geri getirmez, BAŞKA cihazda silinmiş olup bu cihazın listesinde kalanı da çıkarır.
// Döner: { tanimlar, eklenen, cikarilan }.
function tanimlariBirlestir(yerel, bulut, silinenler) {
  const simdi = Date.now();
  const tas = { ...((bulut && bulut.__silinenler) || {}), ...((yerel && yerel.__silinenler) || {}) };
  if (silinenler && !(silinenler instanceof Set)) Object.entries(silinenler).forEach(([id, z]) => { if (!tas[id] || tas[id] < z) tas[id] = z; });
  if (silinenler instanceof Set) silinenler.forEach((id) => { if (!tas[id]) tas[id] = simdi; });
  Object.keys(tas).forEach((id) => { if (!(simdi - Number(tas[id]) <= TANIM_SILINEN_GUN * 864e5)) delete tas[id]; });
  const sil = new Set(Object.keys(tas));
  const sonuc = { ...(yerel || {}) };
  const eklenen = [];
  const cikarilan = [];
  if (Object.keys(tas).length) sonuc.__silinenler = tas;
  // Başka yerde silinmiş, bu cihazın listesinde kalmış kimlikli öğeler çıkarılır.
  Object.keys(sonuc).forEach((alan) => {
    const y = sonuc[alan];
    if (!Array.isArray(y) || !y.length || !y.every((x) => x && typeof x === "object" && x.id)) return;
    const kalan = y.filter((x) => !sil.has(x.id));
    if (kalan.length === y.length) return;
    y.filter((x) => sil.has(x.id)).forEach((x) => cikarilan.push({ alan, id: x.id, ad: x.ad || x.kod || x.id }));
    sonuc[alan] = kalan;
  });
  if (!bulut || typeof bulut !== "object") return { tanimlar: sonuc, eklenen, cikarilan };
  Object.keys(bulut).forEach((alan) => {
    const b = bulut[alan];
    const y = (yerel || {})[alan];
    if (alan === "__silinenler" || !Array.isArray(b) || b.length === 0) return;
    if (!b.every((x) => x && typeof x === "object" && x.id)) return;
    if (y != null && !(Array.isArray(y) && y.every((x) => x && typeof x === "object" && x.id))) return;
    const yerelIdler = new Set(((sonuc[alan]) || []).map((x) => x.id));
    const eksik = b.filter((x) => !yerelIdler.has(x.id) && !sil.has(x.id));
    if (eksik.length === 0) return;
    sonuc[alan] = [...(sonuc[alan] || []), ...eksik];
    eksik.forEach((x) => eklenen.push({ alan, id: x.id, ad: x.ad || x.kod || x.kullaniciAdi || x.id }));
  });
  return { tanimlar: sonuc, eklenen, cikarilan };
}

// KAYIP MODEL RENKLERİ. Ürünlerde kullanılan "KOD - Renk1/Renk2" etiketlerinden tanımlarda kombinasyonu
// olmayanları bulur ve geri kurulacak kombinasyonları üretir. Renk adı "/" içerebilir ("A/B" adlı bir renk):
// parçalar soldan, tanımlı en uzun ada göre eşlenir. Tanımda olmayan renk YENİ renk olarak önerilir
// (kodu `kodlariAta` verir). Saf; kimlik üretici dışarıdan.
// Döner: { kombinasyonlar: [...yeni], renkler: [...yeni], etiketler: [...kurulan etiket] }
function kayipModelRenkleri(stok, tanimlar, yeniId) {
  const kombiler = (tanimlar && tanimlar.renkKombinasyonlari) || [];
  const renkler = [...((tanimlar && tanimlar.renkler) || [])];
  const varKod = new Set(kombiler.map((k) => String(k.kod)));
  const yeniRenkler = []; const yeniKombiler = []; const etiketler = [];
  const renkBul = (ad) => renkler.find((r) => kodEsit(r.ad, ad));
  const etiketlerTumu = new Set();
  (stok || []).forEach((u) => (u.variants || []).forEach((v) => { if (v.renk) etiketlerTumu.add(String(v.renk).trim()); }));
  Array.from(etiketlerTumu).sort().forEach((etiket) => {   // sirasiz-tamam: sıralı, kararlı
    const m = etiket.match(/^(\d+)\s*-\s*(.+)$/);
    if (!m || varKod.has(m[1])) return;
    const parcalar = m[2].split("/").map((p) => p.trim());
    const adlar = [];
    let i = 0;
    while (i < parcalar.length) {
      // En uzun tanımlı eşleşme: "A/B" adlı renk varsa iki parça birleşir.
      let j = parcalar.length;
      while (j > i + 1 && !renkBul(parcalar.slice(i, j).join("/"))) j--;
      adlar.push(parcalar.slice(i, j).join("/"));
      i = j;
    }
    const renkIdler = adlar.map((ad) => {
      let r = renkBul(ad);
      if (!r) {
        r = { id: yeniId("renk"), ad, tip: "Hammadde", renkKodu: "#C9B99A", malzemeTipleri: [] };
        renkler.push(r); yeniRenkler.push(r);
      }
      return r.id;
    });
    yeniKombiler.push({ id: yeniId("kombi"), kod: m[1], renkIdler, onarim: true });
    varKod.add(m[1]);
    etiketler.push(etiket);
  });
  return { kombinasyonlar: yeniKombiler, renkler: yeniRenkler, etiketler };
}

// DERİN BİRLEŞTİRME (v1.556.0) — tek parça (tekil) tablolar için: Kasa & Banka (muhasebe), koliler, faturalar,
// modeller, mesajlar, görevler, fiş defteri. İnternetsizken yazılan kayıt "bekleyen" kalınca açılışta BULUT
// kopyası esas alınıyor, otomatik yeniden gönderme de ekrandaki (bulut) hâli yazıyordu: internetsiz girilen kasa
// fişi KALICI kayboluyordu. Artık bekleyen varsa yerel esas, buluttaki yeniler eklenir. Kural:
//   · iki taraf da "her öğesi kimlikli nesne" dizisi → kimliğe göre birleş (ortak kimlikte içe doğru), buluttaki
//     yeni öğeler sona;
//   · iki taraf da düz nesne → anahtar birleşimi, içe doğru;
//   · diğer her şey (sayı, metin, kimliksiz dizi) → YEREL kazanır.
// Bilinen bedel: bu cihazda İNTERNETSİZKEN silinen öğe bulutta duruyorsa geri gelir (kaybolmaktansa). Saf.
function derinBirlestir(yerel, bulut) {
  if (yerel === undefined) return bulut;
  if (bulut === undefined || bulut === null) return yerel;
  const kimlikliDizi = (d) => Array.isArray(d) && d.every((x) => x && typeof x === "object" && !Array.isArray(x) && x.id !== undefined);
  if (Array.isArray(yerel) && Array.isArray(bulut)) {
    if (!kimlikliDizi(yerel) || !kimlikliDizi(bulut)) return yerel;
    const bulutHarita = new Map(bulut.map((x) => [x.id, x]));
    const yerelIdler = new Set(yerel.map((x) => x.id));
    return [...yerel.map((x) => (bulutHarita.has(x.id) ? derinBirlestir(x, bulutHarita.get(x.id)) : x)),
      ...bulut.filter((x) => !yerelIdler.has(x.id))];
  }
  const duzNesne = (o) => o && typeof o === "object" && !Array.isArray(o);
  if (duzNesne(yerel) && duzNesne(bulut)) {
    const sonuc = { ...bulut, ...yerel };
    Object.keys(yerel).forEach((k) => { if (k in bulut) sonuc[k] = derinBirlestir(yerel[k], bulut[k]); });
    return sonuc;
  }
  return yerel;
}

// RENK / ÖLÇÜ / ASORTİ KODU ONARIMI (v1.556.0 — kullanıcı: "Renk kodları çakışıyor, burayı düzeltmiştik daha
// önce!" — ekranda iki renk "Renk kodu: 0044"). Barkod kodu her cihazda kendi sayacıyla veriliyor; tek cihazda
// `kodlariAta` var olanları atlıyor, çakışmıyor. Ama iki cihaz aynı anda yeni renk açınca ikisi de 44'ü verdi;
// tanım birleştirmesi (v1.552) ikisini de korudu → aynı kod iki renkte (okutulan etiket hangi renk?). Ayrıca bazı
// renkler 101'li ton kodu (`kod`) olmadan açılmıştı ("örn. 101" boş). Bu işlev:
//   · `barkodKodu` (renk, beden/ölçü, asorti): aynı kodu taşıyanlardan EN ESKİSİ (kimlikteki zaman damgası; yoksa
//     liste sırası) kodunu korur, diğerlerinin kodu silinip `kodlariAta` ile sıradaki boş kod verilir;
// Ton kodu (`kod`, "101") barkoda girmez ve kullanıcı değiştirebilir; çakışması Tanımlar'daki "Düzelt"le elle.
// Saf. Döner: { tanimlar, degisenler: [{ aile, ad, alan, eski, yeni }] } — değişiklik yoksa tanimlar aynı nesne.
function kimlikZamani(id) {
  const p = String(id || "").split("-");
  const n = p.length >= 3 ? parseInt(p[1], 36) : NaN;
  return Number.isFinite(n) ? n : 0;
}
// STOK NO ÇAKIŞMASI (v1.606.0 — kullanıcı, çoklu cihaz: Supabase 409 "duplicate key value violates unique constraint
// urunler_stok_no_tekil", 315 deneme). İki cihaz aynı sayaçtan numara üretince (v1.603 ile stok no artık kart açılır
// açılmaz veriliyor) aynı stok no iki ürüne düşüyor; bulut tekil dizin isteği reddediyor, bekleyen defter her denemede
// büyüyor ve HİÇBİR stok kaydı gitmiyor. Onarım `tanimKodlariniOnar` ile aynı ilke: EN ESKİ kayıt (kimlik zamanı,
// eşitse `olusturuldu`, eşitse liste sırası) numarasını korur — etiketi büyük ihtimalle o basıldı; diğeri sıradaki boş
// numarayı alır. `bulutKullanilan`: buluttaki { stokNo: urunId } — buradaki ürünün numarası bulutta BAŞKA bir üründeyse
// bu cihazdaki (daha yeni olan) ürün yeni numara alır: bulut kaynak. Sayaç yeni numaranın gerisinde kalmaz. Saf.
// Döner: { stok, tanimlar, degisenler: [{ id, ad, eski, yeni }] }.
function stokNoCakismalariniOnar(stok, tanimlar, bulutKullanilan) {
  const liste = stok || [];
  const t = tanimlar || {};
  const bulut = bulutKullanilan || {};
  const no = (u) => Number(u && u.stokNo) || 0;
  const sirali = liste.map((u, i) => ({ u, i })).sort((a, b) =>
    (kimlikZamani(a.u.id) - kimlikZamani(b.u.id)) || String(a.u.olusturuldu || "").localeCompare(String(b.u.olusturuldu || "")) || (a.i - b.i));
  const tutulan = new Set(Object.keys(bulut).map(Number).filter((v) => v > 0));
  const yenidenNumarala = new Set();
  sirali.forEach(({ u }) => {
    const v = no(u);
    if (!(v > 0)) return;
    // Bulutta aynı numara başka bir ürünün: bu ürün (kim daha eskiyse fark etmez, bulut kaynak) yeni numara alır.
    if (bulut[v] && bulut[v] !== u.id) { yenidenNumarala.add(u.id); return; }
    if (tutulan.has(v) && !(bulut[v] === u.id)) { yenidenNumarala.add(u.id); return; }
    tutulan.add(v);
  });
  if (yenidenNumarala.size === 0) return { stok: liste, tanimlar: t, degisenler: [] };
  const sayaclar = { ...(t.kodSayaclari || {}) };
  // Sayaç bilinen en büyük numaranın gerisindeyse (başka cihaz ilerletmiş) oradan devam: aynı çakışma tekrar doğmasın.
  sayaclar.stok = Math.max(Number(sayaclar.stok) || 0, ...Array.from(tutulan));
  const degisenler = [];
  const yeniStok = liste.map((u) => {
    if (!yenidenNumarala.has(u.id)) return u;
    const n = kodSayacIlerlet(sayaclar, "stok", tutulan);
    if (n === null) return u;
    degisenler.push({ id: u.id, ad: u.ad, eski: u.stokNo, yeni: n });
    return { ...u, stokNo: n };
  });
  return { stok: yeniStok, tanimlar: { ...t, kodSayaclari: sayaclar }, degisenler };
}

function tanimKodlariniOnar(tanimlar) {
  const t = tanimlar || {};
  const degisenler = [];
  let kirli = false;
  // Model rengi (kombinasyon) kodları renk barkod koduyla AYNI alanı paylaşıyor (077 `kodlariAta`): renkte o
  // numaralar baştan dolu sayılır — çakışırsa kombinasyon kodunu korur (basılmış model rengi etiketi), renk yeni kod alır.
  const kombiKodlari = (t.renkKombinasyonlari || []).map((k) => Number(k.kod)).filter((v) => v > 0);
  const temizle = (liste, aile) => {
    const sirali = (liste || []).map((x, i) => ({ x, i })).sort((a, b) => (kimlikZamani(a.x.id) - kimlikZamani(b.x.id)) || (a.i - b.i));
    const tutulan = new Set(aile === "renk" ? kombiKodlari : []);
    const sil = new Set();
    sirali.forEach(({ x }) => {
      const v = Number(x.barkodKodu);
      if (!(v > 0) || !x.id) return;
      if (tutulan.has(v)) sil.add(x.id); else tutulan.add(v);
    });
    if (sil.size === 0) return liste;
    kirli = true;
    return (liste || []).map((x) => {
      if (!sil.has(x.id)) return x;
      degisenler.push({ aile, ad: x.ad, alan: "barkodKodu", eski: x.barkodKodu, id: x.id });
      const { barkodKodu, ...kalan } = x;
      return kalan;
    });
  };
  const ara = { ...t, renkler: temizle(t.renkler, "renk"), bedenler: temizle(t.bedenler, "ölçü"), asortiler: temizle(t.asortiler, "asorti") };
  if (!kirli) return { tanimlar: t, degisenler: [] };
  const kodlu = kodlariAta([], ara).tanimlar;
  // Yeni barkod kodlarını rapora yaz.
  const yeniBarkod = (id) => {
    const r = [...(kodlu.renkler || []), ...(kodlu.bedenler || []), ...(kodlu.asortiler || [])].find((x) => x.id === id);
    return r ? r.barkodKodu : null;
  };
  degisenler.forEach((d) => { if (d.alan === "barkodKodu") d.yeni = yeniBarkod(d.id); });
  return { tanimlar: kodlu, degisenler };
}
