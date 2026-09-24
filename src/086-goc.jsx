// ================= SUPABASE GÖÇÜ VE DEFTER ONARIMI =================
//
// 19 Eylül (2. madde, 8. tur): App'ten çıkarılan sekizinci parça.
//
// `supabaseyeGoc`: yerelde duran veriyi buluta taşıyan TEK SEFERLİK iş. Adım adım ilerliyor ve
// her adımın sonucunu ayrı sayıyor — yarıda kalırsa nerede kaldığı görünsün diye. Bir adım
// patlarsa sonrakilere geçilmiyor: yarım göç, hiç göç etmemekten kötüdür (iki yerde iki farklı
// gerçek olur).
//
// `defterTopluOnar`: fiş defterindeki kayıttan stok hareketlerini birebir geri yazar (Adım 2,
// 23. bölüm). Tahmin değil kopyalama — kaynak kesin olduğu için.
function useGocVeOnarim(d) {
  const { cariler, showToast, siparisler, stok, stokRezervasyonlari, tanimlar, uretim, setStok,
    setGocDurumu } = d;

const supabaseyeGoc = useCallback(async () => {
  if (!supabaseAcikMi()) {
    showToast("Supabase bağlantısı tanımlı değil");
    return;
  }
  setGocDurumu({ calisiyor: true, adim: "Başlıyor…", hata: null });

  // Göç, normal yazmanın TAM OLARAK aynı yolunu kullanır (TABLO_SEMA + supabaseTabloEsitle).
  // İki ayrı alan eşlemesi tutmak, birinde yapılan düzeltmenin diğerine taşınmamasına yol
  // açardı — nitekim ilk sürümde tam olarak bu oldu.
  //
  // Fark belleği sıfırlanır ki her kayıt "yeni" sayılsın ve tamamı gönderilsin.
  const adimlar = [
    { ad: "Tanımlar", calistir: async () => {
        await supabaseIstek("tanimlar", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify([{ id: "tekil", veri: tanimlar }]),
        });
      } },
    { ad: "Cariler", tablo: "cariler", veri: cariler },
    { ad: "Ürünler ve stok", tablo: "urunler", veri: stok },
    { ad: "Siparişler", tablo: "siparisler", veri: siparisler },
    { ad: "Üretim", tablo: "uretim", veri: uretim },
    { ad: "Rezervasyonlar", tablo: "stok_rezervasyonlari", veri: stokRezervasyonlari },
  ];

  const ozet = {};
  try {
    for (const adim of adimlar) {
      setGocDurumu({ calisiyor: true, adim: adim.ad, hata: null });
      if (adim.calistir) { await adim.calistir(); continue; }
      // Bu tablonun fark belleğini sıfırla: tamamı gönderilsin.
      tabloBaslangic(adim.tablo, []);
      (TABLO_SEMA[adim.tablo].cocuklar || []).forEach((c) => tabloBaslangic(`${adim.tablo}::${c.tablo}`, []));
      await supabaseTabloEsitle(adim.tablo, adim.veri || []);
      ozet[adim.tablo] = (adim.veri || []).length;
    }
    setGocDurumu({ calisiyor: false, adim: "Tamamlandı", hata: null, ozet });
    showToast(
      `Göç tamam — ${ozet.urunler || 0} ürün, ${ozet.cariler || 0} cari, ` +
      `${ozet.siparisler || 0} sipariş, ${ozet.uretim || 0} üretim aktarıldı`
    );
  } catch (e) {
    const mesaj = String(e && e.message || e);
    setGocDurumu({ calisiyor: false, adim: "Hata", hata: mesaj });
    showToast(`Göç durdu: ${mesaj}`);
  }
}, [tanimlar, cariler, stok, siparisler, uretim, stokRezervasyonlari, showToast]);

// Birden çok ürünün defterini tek seferde onarır. Mantık ürün kartındakiyle AYNI olmalı;
// iki ayrı hesap tutmak, birinde yapılan düzeltmenin diğerine taşınmamasına yol açardı.
const defterTopluOnar = useCallback((urunIdler) => {
  const hedef = new Set(urunIdler || []);
  const zaman = new Date().toISOString();
  let toplamHareket = 0;

  const next = stok.map((urun) => {
    if (!hedef.has(urun.id)) return urun;

    const hareketNeti = {};
    (urun.hareketler || []).forEach((h) => {
      const a = `${h.renk}|${h.beden}`;
      hareketNeti[a] = stokYuvarla((hareketNeti[a] || 0) + (h.miktar || 0));
    });

    const yeniler = [];
    (urun.variants || []).forEach((v) => {
      const a = `${v.renk}|${v.beden}`;
      const fark = stokYuvarla((v.miktar || 0) - (hareketNeti[a] || 0));
      if (Math.abs(fark) < 0.000001) return;
      yeniler.push({
        id: uid("hrk"), tarih: zaman, renk: v.renk, beden: v.beden, miktar: fark,
        kaynak: "Manuel", cariId: null, fisNo: `ACILIS-${zaman.slice(0, 10)}`,
        aciklama: "Açılış / defter düzeltmesi — kayıtlı stok ile hareket geçmişi eşitlendi",
      });
    });
    // Varyantı silinmiş ama hareketi kalmış renk/bedenler de sıfırlanır.
    Object.entries(hareketNeti).forEach(([a, net]) => {
      const [renk, beden] = a.split("|");
      const varyantVar = (urun.variants || []).some((v) => v.renk === renk && v.beden === beden);
      if (varyantVar || Math.abs(net) < 0.000001) return;
      yeniler.push({
        id: uid("hrk"), tarih: zaman, renk, beden, miktar: -net,
        kaynak: "Manuel", cariId: null, fisNo: `ACILIS-${zaman.slice(0, 10)}`,
        aciklama: "Defter düzeltmesi — bu renk/beden artık üründe tanımlı değil",
      });
    });

    if (yeniler.length === 0) return urun;
    toplamHareket += yeniler.length;
    // variants BİLEREK değiştirilmiyor: kayıtlı stok doğru kabul edilir, eksik olan geçmiştir.
    return { ...urun, hareketler: [...yeniler, ...(urun.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI) };
  });

  setStok(next);
  yazimiIzle(tabloYaz("stok:items", "urunler", next), "Stok kartları", next);
  showToast(`${hedef.size} üründe ${toplamHareket} düzeltme hareketi yazıldı — stok miktarları değişmedi`);
}, [stok, showToast]);

// Akışı bölmeden cari oluşturur.
//
// Ürün açarken tedarikçi listede yoksa kullanıcı Cari modülüne gidip cari açmak, sonra geri
// dönüp formu baştan doldurmak zorundaydı. Yarım kalan form da kayboluyordu.
//
// Dönüş: oluşturulan carinin kimliği — çağıran onu doğrudan seçili hale getirebilsin.
  return { supabaseyeGoc, defterTopluOnar };
}
