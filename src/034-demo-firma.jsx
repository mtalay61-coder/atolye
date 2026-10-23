// =============================================================================================
// DEMO FİRMA (v1.645.0 — pazarlama yol haritasının 3. adımı; kullanıcı: "Demo firma")
//
// Satışta en güçlü cümle "deneyin": müşteri adayı kendi telefonunda dolu bir atölyeyi gezebilmeli. Ayrı bir Supabase
// projesi AÇILMADI — bilerek:
//   · Her deneyen kendi kopyasını görür; biri ötekinin denemesini bozamaz, "demo verisi çöpe döndü" sorunu olmaz.
//   · Sunucuya hiçbir şey gitmez: ne gerçek firmaların verisi tehlikeye girer, ne de sahte kayıtlar bir yere birikir.
//   · Bakım yok: veri uygulamanın içinde, sürümle birlikte güncellenir.
// Nasıl: firma kodu "demo" (ya da firma ekranındaki "Demoyu dene") → `firma:secim = {demo:true}` → 030 bulutu kapatır
// (SUPABASE_URL boş), depo-koprusu "atolye-depo@demo" veritabanını açar. İlk açılışta `DemoKapisi` örnek veriyi o
// depoya yazar. Ekranın altında DEMO şeridi: Sıfırla (örnek veriye dön) · Çık (firma kodu ekranına).
//
// KURAL NOTU: "İnternetsiz kayıt girilmez" (v1.557) GERÇEK firmalar için — kayıt buluta gitmezse kaybolabilir. Demoda
// bulut hiç yok ve veri gerçek değil; kilit (100 `kilitli`) zaten yalnız bulut açıkken devreye giriyor.
//
// ÖRNEK VERİ TUTARLI: stok miktarları açılış fişiyle (076 `acilisFisleriUret`) hareket karşılığı taşır — "fişsiz hareket
// olmaz" kuralı demoda da geçerli, tutarlılık denetimi temiz başlar.
// =============================================================================================
const DEMO_HAZIR_ANAHTARI = "demo:kuruldu";

function demoVerisi(bugun = bugunYerel()) {
  const bedenler = ["39", "40", "41", "42", "43"];
  const tanimlar = {
    renkler: [
      { id: "renk-demo-siyah", ad: "Siyah", tip: "Hammadde", renkKodu: "#1F1F1F", kod: "101" },
      { id: "renk-demo-taba", ad: "Taba", tip: "Hammadde", renkKodu: "#A8642E", kod: "102" },
      { id: "renk-demo-kahve", ad: "Kahve", tip: "Hammadde", renkKodu: "#6B4A2E", kod: "103" },
      { id: "renk-demo-beyaz", ad: "Beyaz", tip: "Hammadde", renkKodu: "#F5F5F2", kod: "104" },
    ],
    bedenler: bedenler.map((ad) => ({ id: `olcu-demo-${ad}`, ad, tip: "Beden" })),
    birimler: BIRIMLER.map((ad) => ({ id: `birim-${ad}`, ad })),
    prosesler: ["Kesim", "Saya", "Montaj", "Paketleme"].map((ad, i) => ({ id: `proses-demo-${i}`, ad, sira: i, baslangicNo: (i + 1) * 1000 })),
    asortiler: [], ozelKodAlanlari: [], renkKombinasyonlari: [], hammaddeTipleri: [], mamulTipleri: [], araProsesler: [],
    fiyatGruplari: [], fireSebepleri: [], kullanicilar: [],
    firmaBilgileri: { logo: "", unvan: "Demo Ayakkabı Atölyesi", telefon: "0212 000 00 00", adres: "Merter, İstanbul", email: "", website: "", vergiNo: "" },
    girisAktifMi: false,
    kurulumTamamlandi: true,
  };
  const varyant = (renkler, miktarlar) => renkler.flatMap((renk, r) => bedenler.map((beden, b) => ({ renk, beden, miktar: miktarlar[r][b] })));
  const deri = {
    id: "urun-demo-deri", ad: "Saya Derisi", kategori: "Hammadde", birim: "metre", olcuTipi: "Serbest",
    alisFiyati: 450, alisParaBirimi: "₺", satisFiyati: 0, satisParaBirimi: "₺",
    variants: [{ renk: "Siyah", beden: "", miktar: 42 }, { renk: "Taba", beden: "", miktar: 28 }, { renk: "Kahve", beden: "", miktar: 15 }],
    hareketler: [], recete: [],
  };
  const taban = {
    id: "urun-demo-taban", ad: "Kauçuk Taban", kategori: "Hammadde", birim: "çift", olcuTipi: "Beden",
    alisFiyati: 85, alisParaBirimi: "₺", satisFiyati: 0, satisParaBirimi: "₺",
    variants: varyant(["Siyah"], [[30, 45, 50, 40, 25]]), hareketler: [], recete: [],
  };
  const ip = {
    id: "urun-demo-ip", ad: "Dikiş İpi", kategori: "Hammadde", birim: "adet", olcuTipi: "Serbest",
    alisFiyati: 35, alisParaBirimi: "₺", satisFiyati: 0, satisParaBirimi: "₺",
    variants: [{ renk: "Siyah", beden: "", miktar: 60 }, { renk: "Beyaz", beden: "", miktar: 40 }], hareketler: [], recete: [],
  };
  const recete = (renkEsleri) => renkEsleri.flatMap(([mamulRenk, deriRengi, ipRengi]) => [
    { proses: "Kesim", hammaddeUrunId: deri.id, hammaddeAd: deri.ad, renk: deriRengi, beden: "", mamulRenk, mamulBeden: "Tüm Bedenler", miktar: 0.35, birim: "metre" },
    { proses: "Saya", hammaddeUrunId: ip.id, hammaddeAd: ip.ad, renk: ipRengi, beden: "", mamulRenk, mamulBeden: "Tüm Bedenler", miktar: 0.1, birim: "adet" },
    ...bedenler.map((beden) => ({ proses: "Montaj", hammaddeUrunId: taban.id, hammaddeAd: taban.ad, renk: "Siyah", beden, mamulRenk, mamulBeden: beden, miktar: 1, birim: "çift" })),
  ]);
  const bot = {
    id: "urun-demo-bot", ad: "Klasik Bot", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    alisFiyati: 0, alisParaBirimi: "₺", satisFiyati: 1450, satisParaBirimi: "₺",
    variants: varyant(["Siyah", "Taba"], [[4, 8, 10, 6, 2], [2, 5, 6, 4, 1]]), hareketler: [],
    recete: recete([["Siyah", "Siyah", "Siyah"], ["Taba", "Taba", "Beyaz"]]),
  };
  const loafer = {
    id: "urun-demo-loafer", ad: "Günlük Loafer", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    alisFiyati: 0, alisParaBirimi: "₺", satisFiyati: 1100, satisParaBirimi: "₺",
    variants: varyant(["Kahve", "Siyah"], [[3, 6, 7, 5, 2], [0, 3, 4, 3, 0]]), hareketler: [],
    recete: recete([["Kahve", "Kahve", "Siyah"], ["Siyah", "Siyah", "Siyah"]]),
  };
  let fisSayaci = 0;
  const { stok } = acilisFisleriUret([bot, loafer, deri, taban, ip], { fisNoUretici: () => `ACL-DEMO-${++fisSayaci}`, tarih: bugun });

  const cariler = [
    { id: "cari-demo-yildiz", unvan: "Yıldız Mağazaları", tip: "Müşteri", telefon: "0532 000 00 01", il: "İstanbul", paraBirimi: "TRY", hareketler: [] },
    { id: "cari-demo-adim", unvan: "Adım Ayakkabı", tip: "Müşteri", telefon: "0532 000 00 02", il: "Ankara", paraBirimi: "TRY", hareketler: [] },
    { id: "cari-demo-ege", unvan: "Ege Deri Ltd.", tip: "Tedarikçi", telefon: "0232 000 00 03", il: "İzmir", paraBirimi: "TRY", hareketler: [] },
    { id: "cari-demo-usta", unvan: "Usta Mehmet (Saya)", tip: "Personel", paraBirimi: "TRY", hareketler: [] },
  ];
  const kalem = (urun, renk, beden, miktar, birimFiyat) => ({
    id: `kalem-demo-${urun.id}-${renk}-${beden}`, urunId: urun.id, urunAd: urun.ad, renk, beden, miktar, karsilanan: 0,
    birim: urun.birim, birimFiyat, paraBirimi: "₺",
  });
  const siparisler = [
    { id: "sip-demo-1", siparisNo: "SAT-1", tip: "Satış", cariId: "cari-demo-yildiz", tarih: bugun, teslimTarihi: bugun, not: "Örnek sipariş",
      durum: "Bekliyor", olusturuldu: `${bugun}T09:00:00.000Z`,
      kalemler: [kalem(bot, "Siyah", "40", 6, 1450), kalem(bot, "Siyah", "41", 8, 1450), kalem(bot, "Siyah", "42", 6, 1450), kalem(loafer, "Kahve", "41", 4, 1100)] },
    { id: "sip-demo-2", siparisNo: "ALS-1", tip: "Alış", cariId: "cari-demo-ege", tarih: bugun, teslimTarihi: bugun, not: "",
      durum: "Bekliyor", olusturuldu: `${bugun}T10:00:00.000Z`,
      kalemler: [kalem(deri, "Siyah", "", 20, 450), kalem(deri, "Taba", "", 10, 450)] },
  ];
  return {
    "tanimlar:data": tanimlar,
    "stok:items": stok,
    "cari:data": cariler,
    "siparis:data": siparisler,
    "uretim:siparisler": [],
    "stokrez:data": [],
    "onaylar:data": [],
    "teklif:data": [],
    "cop:data": [],
    "muhasebe:data": { hesaplar: [], kasalar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 41, EUR: 48 } },
  };
}

// Demo deposunu örnek veriyle doldurur (yalnız boşsa ya da `zorla`). window.storage — seçili firmanın (demo) deposu.
async function demoVerisiniYukle(zorla = false) {
  if (!zorla) {
    try { await window.storage.get(DEMO_HAZIR_ANAHTARI); return false; } catch (e) { /* yok: kurulacak */ }
  }
  const veri = demoVerisi();
  for (const [anahtar, deger] of Object.entries(veri)) await window.storage.set(anahtar, JSON.stringify(deger));
  await window.storage.set(DEMO_HAZIR_ANAHTARI, new Date().toISOString());
  return true;
}

// Demo deposunu boşaltıp yeniden doldurur. YALNIZ demo seçiliyken çalışır — gerçek firmanın deposuna dokunmasın.
async function demoyuSifirla() {
  if (!(firmaSecimiOku() || {}).demo) throw new Error("Demo seçili değil");
  const liste = await window.storage.list("");
  for (const a of (liste && liste.keys) || []) await window.storage.delete(a);
  await demoVerisiniYukle(true);
}

// Demodan çık: seçim ve demoya ait doğrudan anahtarlar silinir (oturum, tema önbelleği); demo deposu cihazda kalır,
// tekrar girilince kaldığı yerden devam eder. Bekleyen defter silinmez (demoda hiç oluşmaz; demoya geçerken ana
// firmanınki saklama kutusuna kalktı — firma kodu yeniden girilince 032 `firmaSaklamaKutusunuAc` geri koyar).
function demodanCik() {
  for (const a of FIRMAYA_OZEL_ANAHTARLAR) if (!/^bekleyen:/.test(a)) localStorage.removeItem(a);
  localStorage.removeItem(FIRMA_SECIM_ANAHTARI);
  location.reload();
}

// Kapı: demo deposu hazır olana kadar bekler (ilk açılışta örnek veri yazılır), sonra uygulamayı çizer.
function DemoKapisi({ children }) {
  const [hazir, setHazir] = useState(false);
  const [hata, setHata] = useState(null);
  useEffect(() => {
    let iptal = false;
    demoVerisiniYukle().then(() => { if (!iptal) setHazir(true); }).catch((e) => { if (!iptal) setHata(String((e && e.message) || e)); });
    return () => { iptal = true; };
  }, []);
  if (hata) return <div data-demo-hata="1" style={{ padding: 24, fontFamily: "sans-serif" }}>Demo hazırlanamadı: {hata}</div>;
  if (!hazir) return <div style={{ padding: 24, fontFamily: "sans-serif" }}>Demo hazırlanıyor…</div>;
  return children;
}

function DemoSeridi() {
  const [bekliyor, setBekliyor] = useState(false);
  return (
    <div data-demo-seridi="1" style={{ position: "fixed", left: 8, bottom: 72, zIndex: 520, display: "flex", gap: 6, alignItems: "center",
      background: "#5B3E96", color: "#fff", borderRadius: 999, padding: "5px 6px 5px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>
      <b>DEMO</b><span style={{ opacity: 0.85 }}>· veriler yalnız bu cihazda</span>
      <button type="button" data-demo-sifirla="1" disabled={bekliyor}
        style={{ border: 0, borderRadius: 999, padding: "3px 9px", fontSize: 12, cursor: "pointer", background: "rgba(255,255,255,.18)", color: "#fff" }}
        onClick={async () => {
          if (!window.confirm("Demo örnek verisine dönülsün mü? Bu cihazda demoda yaptığınız her şey silinir.")) return;
          setBekliyor(true);
          try { await demoyuSifirla(); location.reload(); } catch (e) { setBekliyor(false); alert(String((e && e.message) || e)); }
        }}>Sıfırla</button>
      <button type="button" data-demo-cik="1"
        style={{ border: 0, borderRadius: 999, padding: "3px 9px", fontSize: 12, cursor: "pointer", background: "#fff", color: "#5B3E96", fontWeight: 700 }}
        onClick={demodanCik}>Çık</button>
    </div>
  );
}
