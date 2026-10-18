// ================= KULLANIM KILAVUZU (v1.698) =================
// Kullanıcı: "Kullanım kılavuzu yapabilir miyiz" — karar: uygulamanın İÇİNDE (sürümle birlikte güncel kalır), çalışan ve
// yönetici için ayrı bölümler; kullanıcının rolüne göre ilgili bölüm önde açılır. İçerik veri olarak (KILAVUZ) tutulur:
// yeni bir ekran ya da iş akışı eklenince buraya bir madde eklemek yeter. Arama başlık + adım + ipucu metninde yapılır.
// Ekran adları menüdeki adlarla AYNI yazılır (kullanıcı ekranda aradığını burada da aynı adla bulsun).
const KILAVUZ = [
  // ---------------- ÇALIŞAN ----------------
  { b: "calisan", baslik: "Ekran düzeni ve temel kurallar", adimlar: [
    "Üstte ana menü var: Anasayfa, Depo, Üretim, Planlama, Siparişler, Finans. Açtığınız her ekran altta sekme olarak durur; sekmenin × işaretiyle kapanır.",
    "Sağ üstteki ikonlar: Sohbet (görevler ve mesajlar), Günlük (yalnız yetkililer), Uyarılar, Tanımlar (dişli) ve kullanıcı menüsü.",
    "İnternet yokken uygulama kilitlenir ve kayıt girilmez — yarım kayıt olmasın diye. Bağlantı gelince kendiliğinden açılır.",
    "\"Buluta yazılamadı\" uyarısı çıkarsa veri bu cihazda saklanmıştır; bağlantı düzelince yeniden gönderilir. Uyarıya dokunursanız hata metnini görürsünüz.",
    "Listelerdeki başlıkların altındaki küçük kutular süzgeçtir: yazdıkça liste daralır. Tarih için gg.aa, tutar için >1000, <500 ya da 100-500 yazabilirsiniz.",
  ] },
  { b: "calisan", baslik: "Sipariş girmek", adimlar: [
    "Siparişler › Sipariş › Yeni Sipariş. Form tam ekran açılır.",
    "Müşteri kutusuna ünvan, kod ya da telefon yazıp listeden seçin. Sipariş ve teslim tarihini girin.",
    "Kalem Ekle: ürünü (model) arayıp seçin, rengi seçin.",
    "Asorti varsa asortiyi ve set sayısını seçip \"Uygula\"ya basın — beden miktarları dolar. Asortisiz girişte miktarları beden kutularına tek tek yazın.",
    "Birim fiyat ve KDV'yi kontrol edip \"Ekle\"ye basın. Başka renk/model için aynı adımları tekrarlayın.",
    "Bitince üstteki \"Siparişi Kaydet\". Kaydedilen sipariş listede \"Bekliyor\" durumunda görünür.",
  ], ipucu: "Barkod okut · kamera · ses · fotoğraf bölümünden ürünü okutarak da kalem ekleyebilirsiniz." },
  { b: "calisan", baslik: "Üretimde iş vermek", adimlar: [
    "Üretim ekranında üretim kartını açın; Prosesler sekmesinde sıradaki proses (ör. Kesim) açık gelir.",
    "Beden kutularına bu personele verilecek miktarları yazın (boş bırakılan beden kalanın tamamı sayılır).",
    "Verilen hammadde tablosunda verdiğiniz malzemeyi kontrol edin; boş bırakırsanız reçete kadar verilmiş sayılır.",
    "\"Kime\" kutusundan personeli seçip yanındaki \"İşi Ver\"e basın.",
  ] },
  { b: "calisan", baslik: "Üretimde işi teslim almak", adimlar: [
    "Üretim kartında verilmiş prosesin satırını açın, teslim alınan miktarları beden beden girin.",
    "Hurda ya da tamir varsa ilgili kutulara yazın; hurdaya ücret yazılmaz.",
    "Artan ya da eksik malzeme varsa tabloda düzeltin — fark stoğa işlenir.",
    "Teslimle birlikte fason personelin carisine işçilik alacağı yazılır; atölye içi bölüme bağlı proseste cariye yazılmaz.",
  ] },
  { b: "calisan", baslik: "Sevkiyat ve satış fişi", adimlar: [
    "Depo › Sevkiyat: siparişin \"Sevk et\" düğmesi kalanı renk × beden tablosunda ve stokla birlikte gösterir.",
    "Sevk fişinde \"Siparişten seç\" listesi açık gelir; satırdaki Ekle ile koli, asorti ya da beden olarak ekleyin. \"Stoktakilerle doldur\" kısayolu da var.",
    "Depo › Alış / Satış: cariyi seçip fiş açın; carinin açık siparişleri listelenir, aynı şekilde eklenir.",
    "Kaydedilen fiş cariye borç/alacak, stoğa çıkış/giriş olarak işlenir.",
  ] },
  { b: "calisan", baslik: "Tahsilat ve ödeme", adimlar: [
    "Finans › Ödeme & Tahsilat: cariyi seçin, tutarı ve ödeme şeklini (nakit, kart, havale, çek) girin.",
    "Kasa ya da banka hesabını seçip kaydedin; fiş numarası (THS-/ODM-) kendiliğinden verilir.",
    "Çekle tahsilatta çek bilgilerini doldurun; çek, Çek & Senet ekranında portföye girer.",
  ] },
  { b: "calisan", baslik: "Stok giriş / çıkış (sayım, fire)", adimlar: [
    "Depo › Stok ya da Ürün Stok › Stok Girişi: ürünü ve rengi seçin, yönü (Giriş / Çıkış) seçip beden miktarlarını girin.",
    "Not alanına sebebini yazın (sayım farkı, fire, numune…). Kaydedilen fiş MNL- numarası alır.",
  ], ipucu: "Siparişe ya da cariye bağlı olmayan stok hareketleri yalnız bu yolla girilir; doğrudan miktar değiştirilmez." },

  // ---------------- YÖNETİCİ ----------------
  { b: "yonetici", baslik: "Tanımlar — nerede ne var", adimlar: [
    "Tanımlar (sağ üstteki dişli). Sekmeler: Firma, Ürün, Üretim, Kullanıcılar ve diğerleri. Başlıklar kapalı gelir, dokununca açılır.",
    "Ürün sekmesi: Renkler, Bedenler & Boyutlar, Birimler, Asortiler, Atölye İçi Bölümler, Fiyat Grupları, Özel Kod Alanları.",
    "Üretim sekmesi: Prosesler (sıra, barkod başlangıcı, gider kartı), Ara Prosesler (ücret, gider kartı), Reçete şablonları.",
    "Renklerde \"Ürün Stok\" işaretli olanlar mamul (ürün) kartında renk olarak çıkar; açıklama alanına not düşebilirsiniz.",
  ] },
  { b: "yonetici", baslik: "Kullanıcılar, yetkiler ve görünürlük", adimlar: [
    "Tanımlar › Kullanıcılar ve Yetkiler: kullanıcı ekleyin, rol şablonu seçin (Üretim, Muhasebe, Panel…) ya da modül yetkilerini tek tek işaretleyin.",
    "\"Görebileceği bilgiler\" kutuları: işaretlenmezse kullanıcı Finans raporlarını, Gelir/Gider'i ve anasayfadaki alacak/kasa özetlerini görmez.",
    "Onay sistemi varsayılan kapalıdır: yetkisi olmayan kullanıcı ilgili düğmeyi (sil, düzenle) hiç görmez. \"Yetkisiz işlem yönetici onayına gitsin\" işaretlenirse eski onay yöntemi döner.",
  ] },
  { b: "yonetici", baslik: "Fason üretim ve atölye içi bölüm (maaşlı personel)", adimlar: [
    "Fason: prosesi yapan dışarıdaki ustadır; teslimde proses ücreti × adet ustanın carisine alacak yazılır ve prosesin işçilik gider kartına düşer.",
    "İç üretim: Tanımlar › Ürün › Atölye İçi Bölümler'de bölüm açın (ör. Kesimhane), bağlı prosesleri işaretleyin, personeli ve aylık maaşını ekleyin.",
    "Bölüme bağlı prosesin teslimi cariye yazılmaz; tutar bölüm tahakkuku olur. Her ay başı maaşlar personel carisine \"Maaş\" olarak yazılır ve bölümün \"<Bölüm> işçiliği\" gider kartına düşer.",
    "Finans › Gelir / Gider › Kâr / Zarar'da her bölüm için tahakkuk − maaş farkı (bölümün kârı/zararı) görünür.",
  ] },
  { b: "yonetici", baslik: "Ürün kartı, reçete ve maliyet", adimlar: [
    "Ürün kartında stok kodu (değiştirilebilir) ve barkoddaki stok no (değişmez) ayrıdır.",
    "Reçete sekmesinde proses seçip hammaddeyi ekleyin; renk eşleştirme kutularında arama yapabilirsiniz. Geçmişten gelen öneriler kırmızı işaretlidir — kontrol edin.",
    "Hammaddeye sonradan renk eklenirse reçete kartında uyarı çıkar; \"Aynı adlıları eşle\" ile hızla bağlayın.",
    "Maliyet sekmesinde fiyatı 0 olan satırlar kırmızıdır; fiyatını girmeden maliyet eksik çıkar.",
  ] },
  { b: "yonetici", baslik: "Cari kartlar ve cari tipleri", adimlar: [
    "Cari › Cari Ekle: tip seçicisinde \"+ Yeni tip…\" ile kendi tipinizi açabilirsiniz (ör. Fasoncu); hangi ana tip gibi davranacağını seçin.",
    "Özel tip cari listesinde kendi sekmesinde görünür; sipariş ve fişlerde ana tipi gibi çalışır.",
  ] },
  { b: "yonetici", baslik: "Gelir / Gider kartları ve fişlerin karşılığı", adimlar: [
    "Finans › Gelir / Gider: kira, elektrik gibi alışı olmayan giderler kartlara yazılır; kasa/banka hareketinde karşı taraf olarak kart seçilir.",
    "\"Fişlerin gelir / gider karşılığı\" panelinde her fiş türünün kartı görünür: proses işçilikleri, bölüm maaşları, hammadde çıkışı, bağımsız stok giriş/çıkış, satış ve alış fişleri.",
    "Panel başlığındaki \"karşılıksız fiş\" uyarısı, bir karta bağlanmamış fiş olduğunu söyler; ilgili satırdan kart seçin.",
    "Kâr / Zarar sekmesinde dönem seçip satış geliri, satılan malın maliyeti, işçilik ve gider gruplarını görürsünüz.",
  ] },
  { b: "yonetici", baslik: "Finans raporu ve gün sonu", adimlar: [
    "Finans › Finans Raporu: varlıklar, alacak/borç, stok değeri; Görünüm › Gün Sonu ile günün hareketleri.",
    "Gün sonu raporu her akşam sunucudan e-postayla gönderilir (uygulama kapalı olsa da); \"Sunucudan şimdi gönder\" ile deneme yapılabilir.",
  ] },
  { b: "yonetici", baslik: "Güvenlik: günlük, çöp ve yedek", adimlar: [
    "Günlük (sağ üstte): kim, ne zaman, ne yaptı.",
    "Silinen kayıtlar Çöp'e gider; 30 gün içinde geri alınabilir.",
    "Tanımlar › Veri Yedekleme: tüm veriyi dosya olarak indirin; düzenli aralıklarla almanız önerilir.",
    "Yeni sürüm çıkınca uygulama kendiliğinden geçer; çalışırken üstte şerit görünür.",
  ] },
];

function KilavuzEkrani({ aktifKullanici, tanimlar }) {
  const yonetici = !tanimlar || !tanimlar.girisAktifMi || (aktifKullanici && aktifKullanici.rol === "Yönetici");
  const [bolum, setBolum] = useState(yonetici ? "yonetici" : "calisan");
  const [ara, setAra] = useState("");
  const [acik, setAcik] = useState({});
  const nrm = (x) => String(x || "").toLocaleLowerCase("tr-TR");
  const q = nrm(ara.trim());
  const liste = KILAVUZ.filter((m) => (q ? true : m.b === bolum))
    .filter((m) => !q || nrm([m.baslik, ...(m.adimlar || []), m.ipucu].join(" ")).includes(q));
  return (
    <div data-kilavuz style={{ maxWidth: 900 }}>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 4px" }}>Kullanım Kılavuzu</h2>
      <p style={{ fontSize: 13, color: "var(--erp-text-2)", margin: "0 0 12px" }}>Adım adım nasıl yapılır. Aradığınız işi yazın ya da bölüm seçin.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {[{ k: "calisan", ad: "Çalışan" }, { k: "yonetici", ad: "Yönetici" }].map((x) => (
          <button key={x.k} type="button" data-kilavuz-bolum={x.k} onClick={() => { setBolum(x.k); setAra(""); }}
            style={{ padding: "7px 16px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${bolum === x.k && !q ? "var(--erp-primary)" : "var(--erp-border)"}`,
              background: bolum === x.k && !q ? "var(--erp-primary)" : "#fff", color: bolum === x.k && !q ? "#fff" : "var(--erp-text-2)" }}>
            {x.ad}
          </button>
        ))}
        <input data-kilavuz-ara value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ara: sipariş, maaş, sevkiyat…"
          style={{ ...inputStyle, flex: "1 1 220px", maxWidth: 360, fontSize: 13 }} />
      </div>
      {liste.length === 0 && <EmptyState text="Bu aramayla eşleşen konu yok." />}
      <div style={{ display: "grid", gap: 8 }}>
        {liste.map((m) => {
          const ac = q ? true : !!acik[m.baslik];
          return (
            <div key={m.baslik} data-kilavuz-konu={m.baslik} style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", background: "#fff" }}>
              <button type="button" onClick={() => setAcik({ ...acik, [m.baslik]: !acik[m.baslik] })}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
                {ac ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--erp-text)" }}>{m.baslik}</span>
                {q && <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{m.b === "yonetici" ? "Yönetici" : "Çalışan"}</span>}
              </button>
              {ac && (
                <div style={{ padding: "0 14px 12px 36px" }}>
                  <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 13, lineHeight: 1.5, color: "var(--erp-text)" }}>
                    {m.adimlar.map((a, i) => <li key={i}>{a}</li>)}
                  </ol>
                  {m.ipucu && <div style={{ marginTop: 8, fontSize: 12, color: "var(--erp-text-2)", background: "var(--erp-panel)", borderRadius: "var(--erp-r-sm)", padding: "6px 10px" }}>💡 {m.ipucu}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
