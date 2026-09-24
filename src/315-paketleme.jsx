// ================= PAKETLEME (KOLİ) =================
//
// NEDEN AYRI BİR EKRAN
// Kullanıcı: "Müşteri koli bazında sipariş veriyor, koli içi genelde asortili. Bazen kırık asorti
// veriyor, koli içine başka stok da koyabiliyoruz — aynı kolide X ve Y ürünü olabilir."
//
// Bu yüzden koli, bir üretimin ya da bir siparişin ALT KIRILIMI değil; kendi başına bir kayıt.
// Koliyi üretim kartında kurmak (a seçeneği) tek üretimin mamulleriyle sınırlardı; satış fişinde
// kurmak (c) kolilemeyi sevkiyat anına sıkıştırırdı. Ayrı ekran ikisini de kapsıyor: koli önceden
// hazırlanır, sevkiyatta yalnızca okutulur.
//
// KOLİ YENİ BİR DEFTERDİR — notun başındaki değişmez kural geçerli: yazma, geri alma, çöp ve
// silme testi birlikte gelir. Sevkiyat bağlantısı (koli barkodunu okutup fişe kalem ekleme) ve
// `fisGeriAl` bağı bir SONRAKİ adımda; bu sürümde koli kurma ve etiket basma var.
function PaketlemeModule({
  koliler, stok, siparisler, cariler, uretim, asortiler, tanimlar,
  onKoliEkle, onKoliEkleCoklu, onKoliSil, onKodlariAta, showToast, onKolileriElleKapat,
}) {
  const [acikForm, setAcikForm] = useState(false);
  const [form, setForm] = useState({ siparisId: "", cariId: "", uretimId: "", not: "" });
  // Toplu yazdırma için seçili koliler (19 Eylül).
  const [seciliKoliler, setSeciliKoliler] = useState([]);
  // KOLİ İÇİ DOĞRUDAN GİRİŞLERDEN TÜRETİLİYOR.
  //
  // Önce beden kutuları `onBlur` ile listeye ekliyordu ve şu hata çıktı: adedi yazıp doğrudan
  // "Koliyi Kaydet"e basınca İLK TIKLAMA KAYBOLUYORDU. Sebep, tıklamanın önce odağı taşıması:
  // `onBlur` çalışıyor, React yeniden çiziyor, düğme yenileniyor ve tıklama tamamlanamıyor.
  // Kullanıcı iki kez basmak zorunda kalırdı. Girişleri doğrudan state'te tutmak bu bağımlılığı
  // tamamen kaldırıyor — kutunun içindeki değer zaten kolinin içeriği.
  const [girisler, setGirisler] = useState({});      // { "urunId|renk|beden": adet }
  const [kaynakGirisi, setKaynakGirisi] = useState("");
  const [kaynakMesaji, setKaynakMesaji] = useState("");
  // SERBEST MOD: kaynaksız, bütün stoktan koli kurma. Varsayılan DEĞİL — personelin önüne
  // bütün stoğu dökmek, aradığı iki satırı bulmasını zorlaştırıyordu.
  const [serbestMod, setSerbestMod] = useState(false);
  const [fotoAcik, setFotoAcik] = useState(false);
  // Havuz varsayılan olarak DAR: üretimi ya da bekleyen siparişi olan modeller. Kullanıcının kendi
  // tespiti bu — "üretimden gelmiş ise üretimi olan modeller içerisinde eleme yaparsa daha az
  // arama yapar". Bulunamazsa geniş havuza geçiliyor, ama önce dar olan deneniyor.
  const [genisHavuz, setGenisHavuz] = useState(false);
  const [filtre, setFiltre] = useState("Hazır");

  const mamuller = (stok || []).filter((u) => u.kategori === "Mamul" && !u.pasif);
  const gorselBul = (urunId, r) => {
    const u = (stok || []).find((x) => x.id === urunId);
    return u ? ((u.renkResimleri || {})[r] || u.kapakResmi || "") : "";
  };

  // FOTOĞRAFLA BULMA HAVUZU.
  //
  // Fişi kaybolmuş, kodu bilinmeyen bir mal için aranacak yer. DAR havuz = ortada bir işi olan
  // modeller: stoğa girmiş üretimler + bekleyen satış siparişlerinin kalemleri. Bunlar zaten
  // "paketlenmeyi bekleyen" kümesi; 400 model yerine burada aramak hem hızlı hem isabetli.
  //
  // Aday birimi ÜRÜN+RENK: paketlemede seçilen şey model değil, modelin bir rengi. Görsel de
  // renk bazında saklanıyor (`renkResimleri`).
  const fotoHavuzu = (() => {
    const harita = new Map();
    const ekle = (urunId, renk, etiket, kaynak) => {
      if (!urunId || !renk) return;
      const anahtar = `${urunId}|${renk}`;
      if (harita.has(anahtar)) return;
      const urun = (stok || []).find((u) => u.id === urunId);
      harita.set(anahtar, {
        urunId, renk, etiket,
        urunAd: (urun && urun.ad) || "?",
        gorsel: gorselBul(urunId, renk),
        ...kaynak,
      });
    };
    if (!genisHavuz) {
      (uretim || []).filter((u) => u.stogaEklendiMi).forEach((u) => {
        ekle(u.urunId, u.renk, `üretim ${u.siparisNo}`, { uretimId: u.id });
      });
      (siparisler || []).filter((sp) => sp.tip === "Satış" && (sp.durum || "") !== "Tamamlandı").forEach((sp) => {
        (sp.kalemler || []).forEach((k) => ekle(k.urunId, k.renk, `sipariş ${sp.siparisNo}`, { siparisId: sp.id }));
      });
    } else {
      mamuller.forEach((u) => {
        Array.from(new Set((u.variants || []).map((v) => v.renk))).forEach((r) => ekle(u.id, r, "", {}));
      });
    }
    return Array.from(harita.values());   // sirasiz-tamam
  })();

  // SEÇİM SONRASI: mümkünse KAYNAĞA bağlan. Kullanıcının derdi "fişi kaybolmuş" — modeli bulmak
  // yarısı, kayıp fişi geri bulmak diğer yarısı. Üretim ya da sipariş bulunursa normal kaynak
  // seçme yolundan geçiliyor (aynı doğrulamalar, aynı kalan hesabı). Yoksa serbest moda düşüp
  // SEBEBİ söyleniyor; sessizce serbest moda düşmek, personelin siparişe bağlamayı unutması demek.
  function fotoSecimi(secim) {
    setFotoAcik(false);
    if (secim.uretimId) { uretimSec(secim.uretimId); showToast(`${secim.urunAd} · ${secim.renk} — ${secim.etiket} getirildi`); return; }
    if (secim.siparisId) { siparisSec(secim.siparisId); showToast(`${secim.urunAd} · ${secim.renk} — ${secim.etiket} getirildi`); return; }
    setSerbestMod(true);
    setForm({ ...form, siparisId: "", uretimId: "" });
    setKaynakMesaji(`${secim.urunAd} · ${secim.renk}: bağlı üretim/sipariş bulunamadı — serbest kolileme açıldı`);
  }

  // HAZIR KOLİLERDE BEKLEYEN ADETLER.
  //
  // Kullanıcı aynı siparişten ÜÇ KEZ 8'lik koli kurdu ve uygulama hiçbir şey demedi: sipariş 8
  // çiftlikti, kolilerde 24 çift birikti. Sebep, "kalan" hesabının yalnızca `karsilanan`a
  // bakmasıydı — `karsilanan` fiş kesilince artıyor, koli kurulunca değil. Kurulmuş ama henüz
  // sevk edilmemiş koliler görünmez bir taahhüttü.
  //
  // Sevk edilmiş koliler burada SAYILMAZ: onların adedi zaten `karsilanan`a yansıdı, iki kez
  // saymak kalanı olduğundan az gösterirdi.
  const paketlenmisAdet = (siparisId) => {
    const harita = {};
    (koliler || []).forEach((k) => {
      if (k.siparisId !== siparisId) return;
      if ((k.durum || "Hazır") !== "Hazır") return;
      (k.kalemler || []).forEach((x) => {
        const a = `${x.urunId}|${x.renk}|${x.beden}`;
        harita[a] = (harita[a] || 0) + (x.adet || 0);
      });
    });
    return harita;
  };

  // ÜRETİMDEN KOLİLENEN ADETLER (kullanıcı, 13 Eylül: "25 çift için 4 tane 8'li koli kurdum, hâlâ
  // koli kurdurabiliyor"). Sipariş kaynağında yukarıdaki kontrol vardı; ÜRETİM kaynağında ("Paketlemeyi
  // bekleyen üretimler" → Aç) kalan hep üretimin tamamı gösteriliyordu, koliler düşülmüyordu ve
  // kayıtta sınır yoktu. Üretim kaynağında HAZIR + SEVK EDİLMİŞ bütün koliler sayılır: üretim adedi
  // sabittir, sevk edilen koli de o üretimden çıkmıştır (siparişteki gibi `karsilanan`a yansıyan bir
  // ikinci sayaç yok).
  const uretimdenKolilenen = (uretimId) => {
    const harita = {};
    (koliler || []).forEach((k) => {
      if (k.uretimId !== uretimId) return;
      (k.kalemler || []).forEach((x) => {
        const a = `${x.urunId}|${x.renk}|${x.beden}`;
        harita[a] = (harita[a] || 0) + (x.adet || 0);
      });
    });
    return harita;
  };

  // KAYNAĞIN İÇİNDEKİLER. Sipariş seçiliyse siparişin BEKLEYEN kalemleri, üretim seçiliyse o
  // üretimin renk/bedenleri. Serbest modda bütün mamuller. Kaynak yoksa hiçbir şey — personel
  // ekranı boş bir stok listesiyle karşılaşmıyor.
  const kaynakKalemleri = (() => {
    const grupla = (kayitlar) => {
      const satirlar = [];
      kayitlar.forEach((k) => {
        const anahtar = `${k.urunId}|${k.renk}`;
        let satir = satirlar.find((x) => x.anahtar === anahtar);
        if (!satir) {
          satir = { anahtar, urunId: k.urunId, urunAd: k.urunAd, renk: k.renk, gorsel: gorselBul(k.urunId, k.renk), bedenler: [] };
          satirlar.push(satir);
        }
        if (!satir.bedenler.some((b) => b.beden === k.beden)) satir.bedenler.push({ beden: k.beden, kalan: k.kalan });
      });
      satirlar.forEach((r) => r.bedenler.sort((a, b) => String(a.beden).localeCompare(String(b.beden), "tr", { numeric: true })));
      return satirlar;
    };

    if (form.siparisId) {
      const sp = (siparisler || []).find((x) => x.id === form.siparisId);
      if (!sp) return [];
      const bekleyen = paketlenmisAdet(sp.id);
      // ALIŞ SİPARİŞİNDE ÖLÇÜ TERSİNE (kullanıcı, 19 Eylül: "satın alma yaptığımız ürünler için de
      // paketleme olsun").
      //
      // Satışta paketlenecek olan HENÜZ TESLİM EDİLMEMİŞ kalandır. Alışta ise tam tersi:
      // paketlenecek olan TESLİM ALINMIŞ maldır — gelmemiş malı kolileyemezsiniz. Aynı formül
      // ikisine de uygulanınca alış siparişinde hiç satır çıkmıyordu.
      const alisMi = sp.tip === "Alış";
      return grupla((sp.kalemler || [])
        .map((k) => ({
          urunId: k.urunId, urunAd: k.urunAd, renk: k.renk, beden: k.beden,
          kalan: alisMi
            ? (k.karsilanan || 0) - (bekleyen[`${k.urunId}|${k.renk}|${k.beden}`] || 0)
            : k.miktar - (k.karsilanan || 0) - (bekleyen[`${k.urunId}|${k.renk}|${k.beden}`] || 0),
        }))
        // Kalanı bitmiş beden listeye HİÇ girmiyor: personelin önünde yalnızca yapılacak iş kalsın.
        .filter((k) => k.kalan > 0));
    }
    if (form.uretimId) {
      const ur = (uretim || []).find((x) => x.id === form.uretimId);
      if (!ur) return [];
      const urun = (stok || []).find((u) => u.id === ur.urunId);
      const bedenler = (ur.bedenMiktarlari || []).length
        ? ur.bedenMiktarlari
        : [{ beden: ur.beden || "", miktar: ur.adet || 0 }];
      const kolilenen = uretimdenKolilenen(ur.id);
      // Kolilenmiş adet düşülür; kalanı bitmiş beden listeye girmez (sipariş kaynağıyla aynı kural).
      return grupla(bedenler.map((b) => ({
        urunId: ur.urunId, urunAd: (urun && urun.ad) || ur.model || "?",
        renk: ur.renk, beden: b.beden,
        kalan: (b.miktar || 0) - (kolilenen[`${ur.urunId}|${ur.renk}|${b.beden}`] || 0),
      })).filter((k) => k.kalan > 0));
    }
    if (serbestMod) {
      return grupla(mamuller.flatMap((u) => (u.variants || []).map((v) => ({
        urunId: u.id, urunAd: u.ad, renk: v.renk, beden: v.beden, kalan: null,
      }))));
    }
    return [];
  })();

  // Kodu eksik varyant varsa etiket basılamaz; kullanıcı bunu ETİKETE BASMADAN ÖNCE bilmeli.
  // Barkod üç koddan kuruluyor (stok no + renk kodu + ölçü kodu) — hangisi eksikse kod boş çıkar.
  const barkodsuzSayisi = mamuller.reduce(
    (t, u) => t + (u.variants || []).filter((v) => !varyantinBarkodu(u, v, tanimlar)).length, 0);
  // SEBEBİ de gerekiyor: "kod atanmamış" düğmeyle çözülür, "renk hiç tanımlı değil" çözülmez.
  // İkisini ayırmadan tek bir düğme göstermek, basınca hiçbir şeyin değişmediği bir düğme olurdu.
  const barkodEksik = barkodEksikleri(mamuller, tanimlar);

  const anahtarla = (urunId, r, b) => `${urunId}|${r}|${b}`;

  const girisAyarla = (urunId, r, b, deger) => {
    setGirisler((onceki) => ({ ...onceki, [anahtarla(urunId, r, b)]: deger }));
  };

  function siparisSec(siparisId) {
    const sp = (siparisler || []).find((x) => x.id === siparisId);
    // Sipariş seçilince cari kendiliğinden geliyor ve üretim bağı temizleniyor: iki kaynak birden
    // seçili olsaydı hangisinin içeriği gösterildiği belirsiz kalırdı.
    setForm({ ...form, siparisId, uretimId: "", cariId: sp ? sp.cariId : form.cariId });
    setSerbestMod(false);
    setKaynakMesaji(sp ? `${sp.siparisNo} getirildi` : "");
    if (sp) {
      const bekleyen = paketlenmisAdet(sp.id);
      const kalanToplam = (sp.kalemler || []).reduce((t, k) =>
        t + Math.max(0, k.miktar - (k.karsilanan || 0) - (bekleyen[`${k.urunId}|${k.renk}|${k.beden}`] || 0)), 0);
      // Kalan yoksa bunu AÇIKÇA söylüyoruz: boş bir liste "veri gelmedi" gibi de okunabilirdi.
      if (kalanToplam === 0) {
        setKaynakMesaji(`${sp.siparisNo}: paketlenecek kalem kalmadı — hepsi kolilenmiş ya da sevk edilmiş`);
      }
    }
  }

  function uretimSec(uretimId) {
    const ur = (uretim || []).find((x) => x.id === uretimId);
    // ÜRETİMİN ARKASINDAKİ SİPARİŞ VE CARİ (kullanıcı, 19 Eylül: "paketlemede sipariş no,
    // siparişi veren cari gibi bilgiler de görünsün").
    //
    // Personel elinde üretim numarasıyla geliyor ama koliyi hangi müşteri için hazırladığını
    // bilmiyordu; etiketi basınca cari adı boş çıkıyor, koli rafta "kimin bu" diye kalıyordu.
    // Üretim bir satış siparişinden doğduysa cari oradan geliyor.
    const kaynakSiparis = ur
      ? (siparisler || []).find((x) => x.tip === "Satış"
          && (x.kalemler || []).some((k) => k.planlama && k.planlama.referansNo === ur.siparisNo))
      : null;
    setForm({
      ...form, uretimId, siparisId: "",
      cariId: kaynakSiparis ? kaynakSiparis.cariId : form.cariId,
    });
    setSerbestMod(false);
    setKaynakMesaji(ur ? `Üretim ${ur.siparisNo} getirildi` : "");
  }

  // OKUTMA: sipariş no da üretim no da aynı kutuya yazılıyor. Personelin hangi numaranın nereye
  // yazılacağını bilmesi gerekmesin diye ikisi de burada aranıyor.
  function kaynakOkut(kod) {
    const temiz = String(kod || "").trim();
    if (!temiz) return;
    // Alış siparişi de okutulabiliyor (19 Eylül): satın alınan mal da kolileniyor.
    const sp = (siparisler || []).find((x) => x.siparisNo === temiz);
    if (sp) { siparisSec(sp.id); setKaynakGirisi(""); return; }
    const ur = (uretim || []).find((x) => x.siparisNo === temiz || x.takipKodu === temiz);
    if (ur) { uretimSec(ur.id); setKaynakGirisi(""); return; }
    setKaynakMesaji(`Bulunamadı: ${temiz} — sipariş no ya da üretim no okutun`);
  }

  // Koli kalemleri: girişlerden türetiliyor, ayrı bir liste tutulmuyor. İki yerde tutulan bir
  // içerik, ikisinin ayrışması demekti.
  const kalemler = Object.entries(girisler)
    .map(([a, adet]) => {
      const [urunId, r, b] = a.split("|");
      const urun = mamuller.find((u) => u.id === urunId);
      return { urunId, urunAd: urun ? urun.ad : "?", renk: r, beden: b, adet: parseFloat(adet) || 0 };
    })
    .filter((k) => k.adet > 0);

  const toplamAdet = kalemler.reduce((t, k) => t + k.adet, 0);

  // ASORTİLİ KOLİLER (kullanıcı, 19 Eylül: "koli kur içinde toplu koli kurma yanlış mantık oldu;
  // şu anda kalanların hepsini tek koliye koyuyor, aslında asorti şeklinde kolilere koyması
  // gerekli").
  //
  // v1.354.0'da "tüm adetleri asortile" TEK koliye N setlik toplu miktar yazıyordu. Ama asorti
  // koli demek: her koli BİR SET. 3 set çıkıyorsa 3 ayrı koli kurulmalı — koli açan kişi içinde
  // bir set bulmalı, üç setlik yığın değil.
  function asortiliKolilerKur(satir, setAdedi, oranlar) {
    if (!setAdedi || setAdedi <= 0) return;
    const kalemler = Object.entries(oranlar)
      .map(([beden, adet]) => ({
        urunId: satir.urunId, urunAd: satir.urunAd, renk: satir.renk, beden,
        adet: parseFloat(adet) || 0,
      }))
      .filter((k) => k.adet > 0);
    if (kalemler.length === 0) return;
    // TEK YAZMADA N KOLİ: `onKoliEkle`yi döngüde çağırmak işe yaramıyordu — her çağrı aynı koli
    // listesini görüp sonuncusu diğerlerini eziyor, üç set için tek koli kaydediliyordu.
    onKoliEkleCoklu(setAdedi, { ...form, kalemler });
    setGirisler({});
    showToast(`${setAdedi} asortili koli kuruldu — artan adetler boşta bırakıldı`);
  }

  function koliKaydet() {
    if (kalemler.length === 0) { showToast("Koli boş — önce içine ürün ekleyin"); return; }

    // SİPARİŞİ AŞAN KOLİ REDDEDİLİR. Uyarı yetmez: fazla koli kurulup etiketleri basıldıktan sonra
    // fark edilirse iş çoktan yapılmış olur. Hangi bedende ne kadar fazla olduğu tek tek yazılıyor —
    // "sipariş aşıldı" demek kullanıcıya nereyi düzelteceğini söylemiyordu.
    if (form.siparisId) {
      const sp = (siparisler || []).find((x) => x.id === form.siparisId);
      const bekleyen = paketlenmisAdet(form.siparisId);
      const asimlar = [];
      kalemler.forEach((k) => {
        const kalem = ((sp && sp.kalemler) || []).find((x) => x.urunId === k.urunId && x.renk === k.renk && x.beden === k.beden);
        if (!kalem) { asimlar.push(`${k.urunAd} ${k.renk} ${k.beden}: siparişte yok`); return; }
        const kalan = kalem.miktar - (kalem.karsilanan || 0) - (bekleyen[`${k.urunId}|${k.renk}|${k.beden}`] || 0);
        if (k.adet > kalan) asimlar.push(`${k.urunAd} ${k.renk} ${k.beden}: kalan ${kalan}, girilen ${k.adet}`);
      });
      if (asimlar.length > 0) {
        showToast(`Sipariş aşılıyor — ${asimlar.join(" · ")}`);
        return;
      }
    }
    // ÜRETİMİ AŞAN KOLİ DE REDDEDİLİR (13 Eylül): 25 çiftlik üretimden 4 tane 8'li koli (32) kurulabiliyordu.
    if (form.uretimId) {
      const ur = (uretim || []).find((x) => x.id === form.uretimId);
      const kolilenen = uretimdenKolilenen(form.uretimId);
      const bedenler = ur ? ((ur.bedenMiktarlari || []).length ? ur.bedenMiktarlari : [{ beden: ur.beden || "", miktar: ur.adet || 0 }]) : [];
      const asimlar = [];
      kalemler.forEach((k) => {
        const b = bedenler.find((x) => String(x.beden || "") === String(k.beden || ""));
        if (!ur || k.urunId !== ur.urunId || k.renk !== ur.renk || !b) { asimlar.push(`${k.urunAd} ${k.renk} ${k.beden}: üretimde yok`); return; }
        const kalan = (b.miktar || 0) - (kolilenen[`${k.urunId}|${k.renk}|${k.beden}`] || 0);
        if (k.adet > kalan) asimlar.push(`${k.urunAd} ${k.renk} ${k.beden}: kalan ${kalan}, girilen ${k.adet}`);
      });
      if (asimlar.length > 0) {
        showToast(`Üretim aşılıyor — ${asimlar.join(" · ")}`);
        return;
      }
    }
    // SERBEST PAKETLEMEDE STOK KONTROLÜ (kullanıcı, 19 Eylül: "paketlenen ürünü tekrar
    // paketlememek için kontrol koyalım").
    //
    // Sipariş ve üretim kaynağında aşım zaten reddediliyordu; serbest modda hiçbir kontrol yoktu
    // ve aynı mal iki kez kolilenebiliyordu. Ölçü MAMUL STOĞU: depoda 10 çift varken 15 çiftlik
    // koli kurmak, olmayan malı paketlenmiş göstermekti. Sevk edilmemiş kolilerdeki adetler de
    // düşülüyor — onlar fiziken zaten kutuda.
    if (serbestMod) {
      const kolideBekleyen = {};
      (koliler || []).forEach((k) => {
        if ((k.durum || "Hazır") === "Sevk edildi") return;
        (k.kalemler || []).forEach((x) => {
          const a2 = `${x.urunId}|${x.renk}|${x.beden}`;
          kolideBekleyen[a2] = (kolideBekleyen[a2] || 0) + (x.adet || 0);
        });
      });
      const asimlar = [];
      kalemler.forEach((k) => {
        const urun = (stok || []).find((u) => u.id === k.urunId);
        const v = urun && (urun.variants || []).find((x) => (x.renk || "") === (k.renk || "") && (x.beden || "") === (k.beden || ""));
        const mevcut = v ? (v.miktar || 0) : 0;
        const zatenKoli = kolideBekleyen[`${k.urunId}|${k.renk}|${k.beden}`] || 0;
        const serbest = mevcut - zatenKoli;
        if (k.adet > serbest) {
          asimlar.push(`${k.urunAd} ${k.renk} ${k.beden}: stok ${mevcut}, kolide bekleyen ${zatenKoli}, girilen ${k.adet}`);
        }
      });
      if (asimlar.length > 0) {
        showToast(`Stok yetmiyor — ${asimlar.join(" · ")}`);
        return;
      }
    }
    onKoliEkle({ ...form, kalemler });
    setGirisler({});
    setForm({ siparisId: "", cariId: "", uretimId: "", not: "" });
    setKaynakMesaji("");
    setSerbestMod(false);
    setAcikForm(false);
  }

  // "Depoda" = paketlenmiş ama henüz sevk edilmemiş koliler. Ayrı bir durum alanı tutulmuyor:
  // bir koli kurulduğu anda paketlenmiş ve depodadır; sevk edilince çıkar. İkinci bir alan
  // tutmak, iki yerde iki gerçek demek olurdu.
  const gorunen = (koliler || []).filter((k) => {
    const durum = k.durum || "Hazır";
    if (filtre === "Tümü") return true;
    if (filtre === "Depoda") return durum !== "Sevk edildi";
    return durum === filtre;
  });

  // DEPODAKİ ÖZET: aynı üretimden çıkan koliler "adet × koli" diye toplanıyor (kullanıcı:
  // "adet × koli sayısı şeklinde çıkabilir, aynı üretimden çıkanlar için").
  const depoOzeti = (() => {
    const gruplar = {};
    (koliler || []).forEach((k) => {
      if ((k.durum || "Hazır") === "Sevk edildi") return;
      const adet = (k.kalemler || []).reduce((t, x) => t + (x.adet || 0), 0);
      const ur = (uretim || []).find((u) => u.id === k.uretimId);
      const anahtar = `${k.uretimId || "serbest"}|${adet}`;
      if (!gruplar[anahtar]) {
        gruplar[anahtar] = {
          anahtar, adet, koliSayisi: 0,
          etiket: ur ? `Üretim ${ur.siparisNo} · ${ur.model || ""} ${ur.renk || ""}`.trim() : "Serbest paketleme",
        };
      }
      gruplar[anahtar].koliSayisi += 1;
    });
    return Object.values(gruplar).sort((a, b) => b.koliSayisi - a.koliSayisi);
  })();

  const [uretimListesiAcik, setUretimListesiAcik] = useState(false);
  // Stoğa eklenmiş, yani mamulü hazır olan üretimler. Paketlemeyi bekleyen iş listesi bu.
  // ÜRETİMİN KALAN BEDENLERİ (kullanıcı, 13 Eylül: "koli kurulan ürün yukarıdaki listeden düşsün; 25'in
  // 16'sı kolilendiyse yukarıda 25 toplam · kalan 9 görünsün; tamamı kolilenince listeden silinsin;
  // yukarıda yalnız koli kurulacak ürünler listelensin"). Kolilenen adet `uretimdenKolilenen` ile
  // (8z) düşülüyor; kutu etiketleri de KALAN için basılıyor — kolilenenlerin etiketi kolinin
  // kendisinden basılıyor, iki kez basmak aynı çifte iki etiket demek.
  const uretimKalanBedenleri = (u) => {
    const bedenler = (u.bedenMiktarlari || []).length ? u.bedenMiktarlari : [{ beden: u.beden || "", miktar: u.adet || 0 }];
    const kolilenen = uretimdenKolilenen(u.id);
    return bedenler.map((b) => ({ beden: b.beden, miktar: b.miktar || 0, kalan: (b.miktar || 0) - (kolilenen[`${u.urunId}|${u.renk}|${b.beden}`] || 0) }));
  };
  const hazirUretimler = (uretim || [])
    .filter((u) => u.stogaEklendiMi)
    .map((u) => { const bedenler = uretimKalanBedenleri(u); return { u, toplam: bedenler.reduce((t, b) => t + b.miktar, 0), kalan: bedenler.reduce((t, b) => t + Math.max(0, b.kalan), 0) }; })
    .filter((x) => x.kalan > 0);

  // Üretimin kendi renk/beden dağılımından doğrudan kutu etiketi basar — koli kurmaya gerek yok.
  function uretimBarkoduBas(u) {
    const urun = (stok || []).find((x) => x.id === u.urunId);
    const bedenler = (u.bedenMiktarlari || []).length
      ? u.bedenMiktarlari
      : [{ beden: u.beden || "", miktar: u.adet || 0 }];
    // Yalnız KALAN çiftler (kolilenenin etiketi koliden basılır).
    const kalanlar = uretimKalanBedenleri(u);
    kutuEtiketleriYazdir({
      kalemler: kalanlar
        .filter((b) => b.kalan > 0)
        .map((b) => ({ urunId: u.urunId, urunAd: (urun && urun.ad) || u.model || "?", renk: u.renk, beden: b.beden, adet: b.kalan })),
    }, stok, tanimlar);
  }

  return (
    <div>
      {/* Modül başlığı üst şeritte (TAB_TITLES); burada ikinci kez basılmıyor (12 Eylül). */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
          Koli kur, içindekileri belirle, koli ve kutu etiketlerini bas.
        </span>
        <button
                          data-yeni-koli="1" className="btn-primary" style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12 }} onClick={() => setAcikForm(!acikForm)}>
          <Plus size={14} /> {acikForm ? "Vazgeç" : "Yeni Koli"}
        </button>
      </div>

      {barkodsuzSayisi > 0 && (
        <div style={{ border: "1px solid #C9A063", background: "#FBF0E2", borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 12, fontSize: 12, color: "#7A3B22", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Etiket basmadan önce uyarı: barkodsuz varyantın kutu etiketi basılamaz. */}
          <div style={{ width: "100%" }}>
            <b>{barkodsuzSayisi} renk/bedende çift barkodu kurulamıyor.</b>{" "}
            Barkod stok no + renk kodu + ölçü kodundan kuruluyor; üçünden biri eksik.
          </div>
          {barkodEksik.tanimsiz.length > 0 && (
            // TANIMSIZ renk/ölçü düğmeyle çözülmez: kod tanımdan geliyor, tanım yoksa kod da yok.
            // Hangisinin eksik olduğu YAZILIYOR — "bir yerlerde eksik var" demek, kullanıcıyı
            // aramaya bırakmaktır.
            <div style={{ width: "100%", fontSize: 12 }}>
              <b>Tanımlar'da yok</b> (önce tanımlanmalı):{" "}
              <span className="mono">{barkodEksik.tanimsiz.join(" · ")}</span>
            </div>
          )}
          {barkodEksik.stokNosuz.length > 0 && (
            <div style={{ width: "100%", fontSize: 12 }}>
              <b>Stok no atanmamış:</b>{" "}
              <span className="mono">{barkodEksik.stokNosuz.join(" · ")}</span>
            </div>
          )}
          {barkodEksik.atamaCozer && (
            <button className="btn-ghost" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12 }} onClick={onKodlariAta}>
              Eksik kodları ata
            </button>
          )}
        </div>
      )}

      <GorselIleBul
        havuz={fotoHavuzu}
        acikMi={fotoAcik}
        onKapat={() => setFotoAcik(false)}
        onSec={fotoSecimi}
        showToast={showToast}
        altBilgi={(
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 12, color: "#2E5670" }}>
            <span>
              {genisHavuz
                ? "Tüm mamuller aranıyor."
                : "Yalnız üretimi ya da bekleyen siparişi olan modeller aranıyor — daha az aday, daha isabetli sonuç."}
            </span>
            <button type="button" className="btn-ghost" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => setGenisHavuz(!genisHavuz)}>
              {genisHavuz ? "Dar havuza dön" : "Bulamadım, tüm mamullerde ara"}
            </button>
          </div>
        )}
      />

      {acikForm && (
        <div style={{ border: "1.5px solid #8A5A38", borderRadius: "var(--erp-r-md)", background: "#F5EDE3", padding: 12, marginBottom: 14 }}>
          {/* KAYNAK SEÇİMİ — ÜÇ YOL, TEK SONUÇ.
              Bu ekranı personel kullanıyor: önüne bütün stok listesi değil, YALNIZCA o siparişin
              ya da o üretimin içindekiler çıkmalı. Kaynak seçilmeden ürün listesi hiç açılmıyor.
              Üç yol da aynı yere varıyor: barkod/no okutma, sipariş listesi, üretim listesi. */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
            <label style={{ display: "grid", gap: 3, flex: 1, minWidth: 220 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7A3B22" }}>Sipariş no ya da üretim no okut</span>
              <input
                value={kaynakGirisi}
                onChange={(e) => setKaynakGirisi(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); kaynakOkut(kaynakGirisi); } }}
                placeholder="Okutun ya da yazıp Enter"
                title="Sipariş / üretim no"
                style={{ ...inputStyle, fontFamily: "monospace" }}
              />
            </label>
            <button
              data-kaynak-getir="1" type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => kaynakOkut(kaynakGirisi)}>
              <Search size={13} /> Getir
            </button>
            {/* NUMARASI OLMAYAN İÇİN ÜÇÜNCÜ YOL. Okutma ve liste, numarayı BİLMEYİ gerektiriyor;
                fişi kaybolmuş bir malda ikisi de işe yaramıyor. */}
            <button type="button" className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setFotoAcik(!fotoAcik)}>
              <Camera size={13} /> Fotoğrafla Bul
            </button>
            <Field label="Sipariş">
              <select
                value={form.siparisId}
                onChange={(e) => siparisSec(e.target.value)}
                style={{ ...inputStyle, minWidth: 170 }}
              >
                <option value="">— Seç —</option>
                {/* ALIŞ SİPARİŞLERİ DE LİSTEDE (19 Eylül): satın alınan mal da kolileniyor.
                    Alışta yalnız TESLİM ALINMIŞ kalemler paketlenebiliyor (bkz. satır hesabı). */}
                {(siparisler || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siparisNo}{s.tip === "Alış" ? " (alış)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Üretim">
              <select value={form.uretimId} onChange={(e) => uretimSec(e.target.value)} style={{ ...inputStyle, minWidth: 170 }}>
                <option value="">— Seç —</option>
                {(uretim || []).map((u) => <option key={u.id} value={u.id}>{u.siparisNo} · {u.model || ""}</option>)}
              </select>
            </Field>
          </div>

          {/* KAYNAK KÜNYESİ (19 Eylül): hangi sipariş, hangi müşteri — koliyi kuran kişi bunu
              görmeden etiketi basıyordu. */}
          {(form.siparisId || form.uretimId) && (() => {
            const sp = (siparisler || []).find((x) => x.id === form.siparisId);
            const ur = (uretim || []).find((x) => x.id === form.uretimId);
            const kaynakSiparis = sp || (ur
              ? (siparisler || []).find((x) => x.tip === "Satış"
                  && (x.kalemler || []).some((k) => k.planlama && k.planlama.referansNo === ur.siparisNo))
              : null);
            const cari = (cariler || []).find((c) => c.id === form.cariId
              || (kaynakSiparis && c.id === kaynakSiparis.cariId));
            return (
              <div data-paketleme-kunye="1" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
                background: "#F3F7F1", border: "1px solid #C9DCC4", borderRadius: "var(--erp-r-md)", padding: "6px 10px", marginBottom: 8 }}>
                {ur && (
                  <span className="mono" style={{ fontSize: 12, color: "var(--erp-brown)", fontWeight: 700 }}>
                    Üretim {ur.siparisNo}
                  </span>
                )}
                {kaynakSiparis && (
                  <span className="mono" style={{ fontSize: 12, color: "var(--erp-info)", fontWeight: 700 }}>
                    Sipariş {kaynakSiparis.siparisNo}
                  </span>
                )}
                {cari && (
                  <span style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 700 }}>{cari.unvan}</span>
                )}
                {kaynakSiparis && kaynakSiparis.teslimTarihi && (
                  <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
                    Teslim: {tarihYaz(kaynakSiparis.teslimTarihi)}
                  </span>
                )}
                {!kaynakSiparis && ur && (
                  <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Siparişe bağlı değil (stok için üretim)</span>
                )}
              </div>
            );
          })()}

          {kaynakMesaji && (
            <div style={{ fontSize: 11, color: "#7A3B22", background: "#FBF0E2", border: "1px solid #C9A063", borderRadius: "var(--erp-r-sm)", padding: "5px 8px", marginBottom: 8 }}>
              {kaynakMesaji}
            </div>
          )}

          {kaynakKalemleri.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--erp-text-2)", padding: "10px 2px" }}>
              Sipariş ya da üretim seçin — koliye girecek ürünler buradan gelir.
              {" "}Bütün stoktan serbest koli kurmak için{" "}
              <button type="button" className="btn-ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setSerbestMod(true)}>
                serbest paketleme
              </button>
              {" "}kullanın.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {/* HER ÜRÜN+RENK BİR SATIR, BEDENLER YAN YANA. Personelin tıklaması gereken şey yok:
                  kaynak seçilir seçilmez içerik önüne dökülüyor, sadece adetleri yazıyor. */}
              {kaynakKalemleri.map((satir) => (
                <div key={satir.anahtar} style={{ border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", background: "#fff", padding: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    {satir.gorsel
                      ? <img src={satir.gorsel} alt="" style={{ width: 26, height: 26, objectFit: "cover", borderRadius: "var(--erp-r-sm)", border: "1px solid #E4D8C0" }} />
                      : <span style={{ width: 26, height: 26, borderRadius: "var(--erp-r-sm)", background: "#F0E7D5" }} />}
                    <b style={{ fontSize: 13, color: "var(--erp-text)" }}>{satir.urunAd}</b>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text-2)" }}>{satir.renk}</span>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 11 }}
                      onClick={() => satir.bedenler.forEach((b) => girisAyarla(satir.urunId, satir.renk, b.beden, b.kalan))}
                      title="Bu rengin kalan adetlerini kutulara yazar"
                    >
                      Kalanı doldur
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {satir.bedenler.map((b) => (
                      <label key={b.beden} style={{ display: "grid", gap: 2 }}>
                        <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)" }}>
                          {b.beden || "—"}
                          {b.kalan != null && <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}> /{b.kalan}</span>}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          title="Koliye eklenecek adet"
                          value={girisler[anahtarla(satir.urunId, satir.renk, b.beden)] || ""}
                          onChange={(e) => girisAyarla(satir.urunId, satir.renk, b.beden, e.target.value)}
                          style={{ ...inputStyle, width: 66, padding: "4px 6px", textAlign: "center" }}
                        />
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {/* Asorti satırın KENDİ bedenlerine uygulanıyor; koli içi genelde asortili. */}
                    <AsortiUygulaKontrolu
                      asortiler={asortiler}
                      bedenSecenekleri={satir.bedenler.map((b) => b.beden)}
                      olcuTipi={urunOlcuTipi(stok, satir.urunId)}
                      // KALAN ADETLER (19 Eylül): "tüm adetleri asortile" düğmesi bunlara bakıp
                      // kaç tam set çıktığını hesaplıyor.
                      kalanlar={satir.bedenler.reduce((o, b) => { o[b.beden] = b.kalan; return o; }, {})}
                      onBilgi={showToast}
                      // Her set AYRI koli olur (19 Eylül düzeltmesi).
                      onAsortiliKoliler={(setAdedi, birSetinOranlari) => asortiliKolilerKur(satir, setAdedi, birSetinOranlari)}
                      onUygula={(sonuc) => {
                        Object.entries(sonuc).forEach(([beden, adet]) => {
                          const a = anahtarla(satir.urunId, satir.renk, beden);
                          setGirisler((onceki) => ({ ...onceki, [a]: (parseFloat(onceki[a]) || 0) + (parseFloat(adet) || 0) }));
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {kalemler.length > 0 && (
            <div style={{ marginTop: 10, border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", background: "#fff" }}>
              {kalemler.map((k, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", fontSize: 12, borderTop: i ? "1px solid #F0E7D5" : "none" }}>
                  <span style={{ fontWeight: 600 }}>{k.urunAd}</span>
                  <span className="mono" style={{ color: "var(--erp-text-2)" }}>{k.renk} {k.beden}</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{k.adet} çift</span>
                  <button className="btn-ikon" title="Çıkar" style={{ marginLeft: "auto" }} onClick={() => girisAyarla(k.urunId, k.renk, k.beden, 0)}>
                    <X size={13} />
                  </button>
                </div>
              ))}
              <div style={{ padding: "6px 8px", borderTop: "1px solid #E4D8C0", fontSize: 12, fontWeight: 700, color: "var(--erp-text)" }}>
                Koli içi toplam: {toplamAdet} çift · {kalemler.length} kalem
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
                          data-koli-kaydet="1" className="btn-primary btn-save" onClick={koliKaydet}><Save size={14} /> Koliyi Kaydet</button>
            <button className="btn-ghost" onClick={() => { setGirisler({}); setAcikForm(false); }}><X size={14} /> Vazgeç</button>
            <input
              value={form.not}
              onChange={(e) => setForm({ ...form, not: e.target.value })}
              placeholder="Not (opsiyonel)"
              style={{ ...inputStyle, maxWidth: 220 }}
            />
            {form.cariId && (
              <span style={{ fontSize: 12, color: "var(--erp-info)" }}>
                {(cariler || []).find((c) => c.id === form.cariId)?.unvan}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ÜRETİLMİŞ (STOĞA EKLENMİŞ) ÜRÜNLER — koli kurmadan da barkod basılabilsin.
          Personel çoğu zaman önce etiketleri basıp kutulara yapıştırıyor, koliyi sonra kuruyor.
          Buradaki iki düğme o iki yolu da açıyor: doğrudan barkod ya da bu üretimden koli kur. */}
      {hazirUretimler.length > 0 && (
        <div style={{ border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", background: "#fff", marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setUretimListesiAcik(!uretimListesiAcik)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <Hammer size={14} color="var(--erp-brown)" />
            <b style={{ fontSize: 13, color: "var(--erp-text)" }}>Paketlemeyi bekleyen üretimler</b>
            <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{hazirUretimler.length} üretim</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--erp-text-2)" }}>
              {uretimListesiAcik ? "Kapat" : "Aç"}
            </span>
          </button>
          {uretimListesiAcik && (
            <div style={{ borderTop: "1px solid #E4D8C0" }}>
              {hazirUretimler.map(({ u, toplam, kalan }) => {
                const urun = (stok || []).find((x) => x.id === u.urunId);
                const gorsel = gorselBul(u.urunId, u.renk);
                return (
                  <div key={u.id} data-bekleyen-uretim={u.siparisNo} data-toplam={toplam} data-kalan={kalan} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderTop: "1px solid #F0E7D5", flexWrap: "wrap" }}>
                    {gorsel
                      ? <img src={gorsel} alt="" style={{ width: 24, height: 24, objectFit: "cover", borderRadius: "var(--erp-r-sm)", border: "1px solid #E4D8C0" }} />
                      : <span style={{ width: 24, height: 24, borderRadius: "var(--erp-r-sm)", background: "#F0E7D5" }} />}
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{u.siparisNo}</span>
                    <span style={{ fontSize: 12, color: "var(--erp-text)" }}>{(urun && urun.ad) || u.model || "?"}</span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{u.renk}</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                      {toplam} çift{kalan < toplam && <span style={{ fontWeight: 400, color: "var(--erp-warn)" }}> · kalan {kalan}</span>}
                    </span>
                    <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button className="btn-ghost" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => uretimBarkoduBas(u)} title="Yalnız henüz kolilenmemiş çiftlerin kutu etiketi">
                        <Printer size={11} /> Kutu Etiketleri ({kalan})
                      </button>
                      <button className="btn-ghost" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => { setAcikForm(true); uretimSec(u.id); }}>
                        <Plus size={11} /> Koli Kur
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {/* "DEPODA" (kullanıcı, 19 Eylül: "paketlenmiş ürünleri paketlendi ve depoya girmiş diye
            ekleyelim... bunun sayesinde paketlendiği ve depoda olduğu belli olsun, hem depo
            stoğumuz olur"). Hazır koliler = paketlenmiş ve depoda bekleyen mal. Sevk edilenler
            depodan çıktığı için bu görünüme girmiyor. */}
        {["Hazır", "Depoda", "Sevk edildi", "Tümü"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltre(f)}
            style={{
              fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: "var(--erp-r-pill)", cursor: "pointer",
              border: `1px solid ${filtre === f ? "var(--erp-brown)" : "var(--erp-border)"}`,
              background: filtre === f ? "var(--erp-brown)" : "#fff",
              color: filtre === f ? "#fff" : "var(--erp-text-2)",
            }}
          >
            {f} ({f === "Tümü" ? (koliler || []).length : (koliler || []).filter((k) => (k.durum || "Hazır") === f).length})
          </button>
        ))}
      </div>

      {/* DEPODAKİ MAL ÖZETİ: "120 çift × 3 koli" biçiminde. */}
      {filtre === "Depoda" && depoOzeti.length > 0 && (
        <div data-depo-ozeti="1" style={{ background: "#F3F7F1", border: "1px solid #4E6B4E", borderRadius: "var(--erp-r-md)",
          padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-primary-2)", marginBottom: 6 }}>
            Paketlenmiş ve depoda
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {depoOzeti.map((g) => (
              <span key={g.anahtar} className="mono" style={{ fontSize: 12, background: "#fff", border: "1px solid #C9DCC4",
                borderRadius: "var(--erp-r-pill)", padding: "3px 10px", color: "var(--erp-primary-2)" }}>
                {g.etiket}: <b>{g.adet} × {g.koliSayisi} koli</b> = {g.adet * g.koliSayisi}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TOPLU YAZDIRMA ÇUBUĞU (19 Eylül): koli seçilince çıkıyor. Asortili koli kurunca bir
          seferde 3-10 koli oluşuyor; etiketleri tek tek bastırmak aynı işi onlarca kez yapmaktı. */}
      {gorunen.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <button type="button" className="btn-ghost" data-koli-tumunu-sec="1"
            style={{ fontSize: 12, padding: "5px 12px" }}
            onClick={() => setSeciliKoliler(seciliKoliler.length === gorunen.length ? [] : gorunen.map((k) => k.id))}>
            {seciliKoliler.length === gorunen.length ? "Seçimi bırak" : "Tümünü seç"}
          </button>
          {seciliKoliler.length > 0 && (
            <>
              <span className="mono" style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 700 }}>
                {seciliKoliler.length} koli seçili
              </span>
              <button type="button" className="btn-primary" data-toplu-yazdir="1"
                style={{ fontSize: 12, padding: "5px 12px" }}
                onClick={() => koliEtiketleriYazdir(
                  gorunen.filter((k) => seciliKoliler.includes(k.id)), stok, cariler, siparisler, tanimlar)}>
                <Printer size={12} /> Koli etiketlerini yazdır ({seciliKoliler.length})
              </button>
              {/* ELLE KAPAT (23 Eylül, v1.423.0): malı koli okutmadan düz satırla satılmış koliler
                  "Hazır" kalıyor, depo "serbest −N" gösteriyordu (kullanıcının 152 çiftlik vakası).
                  Stoğa ve cariye DOKUNMAZ; yalnız koli durumu "Sevk edildi" olur, sebep ve kullanıcı
                  koliye ve günlüğe yazılır. Doğru yol koliyi fişte okutmak — bu yalnız düzeltme. */}
              {onKolileriElleKapat && (
                <button type="button" className="btn-ghost" data-koli-elle-kapat="1"
                  style={{ fontSize: 12, padding: "5px 12px" }}
                  onClick={() => {
                    const secili = gorunen.filter((k) => seciliKoliler.includes(k.id) && (k.durum || "Hazır") !== "Sevk edildi");
                    if (!secili.length) return showToast("Seçili kolilerin hepsi zaten sevk edilmiş");
                    const sebep = window.prompt(
                      `${secili.length} koli "Sevk edildi" olarak kapatılacak. Stok ve cari DEĞİŞMEZ.\n` +
                      "Sebep (ör. hangi fişle çıktığı):", "Koli okutulmadan satıldı");
                    if (sebep === null) return;
                    onKolileriElleKapat(secili.map((k) => k.id), (sebep || "").trim() || "Elle kapatıldı");
                    setSeciliKoliler([]);
                  }}>
                  Elle kapat — sevk edildi say ({seciliKoliler.length})
                </button>
              )}
            </>
          )}
        </div>
      )}

      {gorunen.length === 0 ? (
        <EmptyState mesaj="Bu filtrede koli yok." />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {gorunen.map((k) => {
            const kSecili = seciliKoliler.includes(k.id);
            const cari = (cariler || []).find((c) => c.id === k.cariId);
            const sip = (siparisler || []).find((s) => s.id === k.siparisId);
            const ur = (uretim || []).find((u) => u.id === k.uretimId);
            const adet = (k.kalemler || []).reduce((t, x) => t + (x.adet || 0), 0);
            const sevkEdildi = (k.durum || "Hazır") === "Sevk edildi";
            return (
              <div key={k.id} style={{ border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", background: "#fff", padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <input type="checkbox" checked={kSecili} data-koli-sec={k.kod}
                    onChange={() => setSeciliKoliler(kSecili
                      ? seciliKoliler.filter((x) => x !== k.id)
                      : [...seciliKoliler, k.id])}
                    style={{ width: 16, height: 16, cursor: "pointer" }} />
                  <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: "var(--erp-text)" }}>{k.kod}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: "var(--erp-r-pill)", color: sevkEdildi ? "var(--erp-primary)" : "var(--erp-brown)", background: alfaEkle((sevkEdildi ? "var(--erp-primary)" : "var(--erp-brown)"), "1A"), border: `1px solid ${(sevkEdildi ? "var(--erp-primary)" : "var(--erp-brown)")}44` }}>
                    {k.durum || "Hazır"}
                  </span>
                  {cari && <span style={{ fontSize: 12, color: "var(--erp-info)" }}>{cari.unvan}</span>}
                  {sip && <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{sip.siparisNo}</span>}
                  {ur && <span className="mono" style={{ fontSize: 11, color: "var(--erp-brown)" }}>üretim {ur.siparisNo}</span>}
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{adet} çift</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => koliEtiketiYazdir(k, stok, cariler, siparisler, tanimlar)}>
                      <Printer size={12} /> Koli Etiketi (15×10)
                    </button>
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => kutuEtiketleriYazdir(k, stok, tanimlar)}>
                      <Printer size={12} /> Kutu Etiketleri ({adet} sayfa · 6×4)
                    </button>
                    {!sevkEdildi && <SilOnayButonu onConfirm={() => onKoliSil(k.id)} boyut={12} />}
                  </span>
                </div>
                {/* MATRİS: düz liste koli büyüdükçe okunmaz oluyordu, asorti dağılımı görünmüyordu. */}
                {(() => {
                  const { satirlar, bedenler } = koliMatrisi(k, stok, tanimlar);
                  return (
                    <div style={{ marginTop: 6, overflowX: "auto" }}>
                      <table style={{ borderCollapse: "collapse", minWidth: 320 }}>
                        <thead>
                          <tr style={{ background: "var(--erp-panel)" }}>
                            <th style={{ fontSize: 10, textAlign: "left", padding: "3px 6px" }}>Ürün / Renk</th>
                            {bedenler.map((b) => (
                              <th key={b} className="mono" style={{ fontSize: 10, padding: "3px 8px" }}>{b}</th>
                            ))}
                            <th className="mono" style={{ fontSize: 10, padding: "3px 8px", borderLeft: "1px dashed #C9B99A" }}>Top.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {satirlar.map((r) => (
                            <tr key={r.anahtar} style={{ borderTop: "1px solid #F0E7D5" }}>
                              <td style={{ padding: "3px 6px", fontSize: 12, whiteSpace: "nowrap" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  {r.gorsel
                                    ? <img src={r.gorsel} alt="" style={{ width: 22, height: 22, objectFit: "cover", borderRadius: "var(--erp-r-sm)", border: "1px solid #E4D8C0" }} />
                                    : <span style={{ width: 22, height: 22, borderRadius: "var(--erp-r-sm)", background: "#F0E7D5", display: "inline-block" }} />}
                                  <b>{r.urunAd}</b>
                                  <span className="mono" style={{ color: "var(--erp-text-2)" }}>{r.renk}</span>
                                </span>
                              </td>
                              {bedenler.map((b) => (
                                <td key={b} className="mono" style={{ padding: "3px 8px", textAlign: "center", fontSize: 12, fontWeight: r.adetler[b] ? 700 : 400, color: r.adetler[b] ? "#221B14" : "var(--erp-border)" }}>
                                  {r.adetler[b] || "·"}
                                </td>
                              ))}
                              <td className="mono" style={{ padding: "3px 8px", textAlign: "center", fontSize: 12, fontWeight: 700, borderLeft: "1px dashed #C9B99A" }}>{r.toplam}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// KOLİ ETİKETİ — koli barkodu + içindekiler listesi.
// "Koli barkodu içerisinde koli içi detay açılmış olacak": barkodun KENDİSİ veri taşımıyor
// (Code128'e sığmaz ve okunmaz olurdu), yalnızca koli kodunu taşıyor. İçerik kayıtta duruyor;
// etikette de gözle okunacak şekilde basılıyor. Okutulunca kayıttan açılıyor.
// KOLİ İÇERİĞİNİ MATRİSE ÇEVİR: satır = ürün+renk, sütun = beden.
//
// Düz liste ("Bot Siyah 40 × 3, Bot Siyah 41 × 2, …") koli büyüdükçe okunmaz oluyordu; asorti
// dağılımı ancak satırları gözle toplayınca görülüyordu. Uygulamanın her yerinde renk × beden
// matrisi kullanılıyor, koli de aynı dili konuşsun.
function koliMatrisi(koli, stok, tanimlar) {
  const satirlar = [];
  const bedenler = [];
  (koli.kalemler || []).forEach((k) => {
    if (k.beden && !bedenler.includes(k.beden)) bedenler.push(k.beden);
    const anahtar = `${k.urunId}|${k.renk}`;
    let satir = satirlar.find((x) => x.anahtar === anahtar);
    if (!satir) {
      const urun = (stok || []).find((u) => u.id === k.urunId);
      satir = {
        anahtar, urunAd: k.urunAd, renk: k.renk, adetler: {}, toplam: 0,
        // Görsel önce RENGE ait olan, yoksa ürünün kapağı: aynı modelin siyahı ile bejini
        // ayırt etmek etikette en çok işe yarayan şey.
        gorsel: urun ? ((urun.renkResimleri || {})[k.renk] || urun.kapakResmi || "") : "",
        barkodlar: {},
      };
      satirlar.push(satir);
    }
    satir.adetler[k.beden] = (satir.adetler[k.beden] || 0) + k.adet;
    satir.toplam += k.adet;
    const urun = (stok || []).find((u) => u.id === k.urunId);
    const v = urun ? (urun.variants || []).find((x) => x.renk === k.renk && x.beden === k.beden) : null;
    const kod = varyantinBarkodu(urun, v, tanimlar);
    if (kod) satir.barkodlar[k.beden] = kod;
  });
  bedenler.sort((a, b) => String(a).localeCompare(String(b), "tr", { numeric: true }));
  return { satirlar, bedenler };
}

// KOLİ ETİKETİ — 15 cm × 10 cm, tek sayfa.
const KOLI_ETIKET = { genislikMM: 150, yukseklikMM: 100 };

// TOPLU YAZDIRMA (kullanıcı, 19 Eylül: "toplu paketlenen ürünleri yazdırmak için toplu yazdırma
// ekleyelim, ürünleri seçip toplu şekilde yazdırması için").
//
// Asortili koli kurunca bir seferde 3-10 koli çıkıyor ve her birinin etiketini tek tek bastırmak
// aynı işi onlarca kez yapmak demekti. Etiket İÇERİĞİ ile YAZDIRMA ayrıldı: içerik üreten
// fonksiyon tek koli için çalışıyor, yazdırma listeyi alıyor.
function koliEtiketleriYazdir(koliler, stok, cariler, siparisler, tanimlar) {
  const etiketler = (koliler || []).map((k) => koliEtiketiIcerigi(k, stok, cariler, siparisler, tanimlar));
  if (etiketler.length === 0) return;
  etiketYazdir(etiketler, KOLI_ETIKET);
}

function koliEtiketiYazdir(koli, stok, cariler, siparisler, tanimlar) {
  koliEtiketleriYazdir([koli], stok, cariler, siparisler, tanimlar);
}

function koliEtiketiIcerigi(koli, stok, cariler, siparisler, tanimlar) {
  const { satirlar, bedenler } = koliMatrisi(koli, stok, tanimlar);
  const adet = (koli.kalemler || []).reduce((t, x) => t + (x.adet || 0), 0);
  const cari = (cariler || []).find((c) => c.id === koli.cariId);
  const sip = (siparisler || []).find((x) => x.id === koli.siparisId);

  const basliklar = bedenler.map((b) => `<th>${b}</th>`).join("");
  const govde = satirlar.map((r) => `
    <tr>
      <td style="text-align:left;width:9mm">${r.gorsel ? `<img src="${r.gorsel}" style="width:8mm;height:8mm;object-fit:cover;border:0.3mm solid #000" />` : ""}</td>
      <td style="text-align:left;font-weight:700;font-size:11px">${r.urunAd}</td>
      <td style="text-align:left;font-weight:700;font-size:12px">${r.renk}</td>
      ${bedenler.map((b) => `<td style="font-size:12px;font-weight:700">${r.adetler[b] || "·"}</td>`).join("")}
      <td style="font-weight:700;font-size:12px">${r.toplam}</td>
    </tr>`).join("");

  return `
    <!-- MÜŞTERİ VE SİPARİŞ NO EN ÜSTTE: koli sevkiyata çıkarken ilk bakılan bilgi bu. -->
    <div style="width:100%;text-align:left;font-size:15px;font-weight:700;line-height:1.2">
      ${cari ? cari.unvan : "—"}
    </div>
    <div style="width:100%;display:flex;justify-content:space-between;font-size:11px;margin-bottom:1mm">
      <span>${sip ? `Sipariş: ${sip.siparisNo}` : (koli.not || "")}</span>
      <span style="font-weight:700">${adet} çift</span>
    </div>
    ${barkodSvg(koli.kod, { birim: 2, yukseklik: 52 })}
    <table style="margin-top:1mm">
      <thead><tr style="border-bottom:0.4mm solid #000">
        <th></th><th style="text-align:left">Ürün</th><th style="text-align:left">Renk</th>
        ${basliklar}<th>Top.</th>
      </tr></thead>
      <tbody>${govde}</tbody>
    </table>
  `;
}

// KUTU ETİKETİ — 6 cm × 4 cm, HER ÇİFT İÇİN AYRI SAYFA.
// "Koli 8 çift ise 8 sayfa": barkod yazıcısı etiketleri tek tek besliyor; alt alta dizilmiş bir
// sayfa etiketlerin kayarak yarım basılmasına yol açıyordu.
const KUTU_ETIKET = { genislikMM: 60, yukseklikMM: 40 };

function kutuEtiketleriYazdir(koli, stok, tanimlar) {
  const etiketler = [];
  (koli.kalemler || []).forEach((k) => {
    const urun = (stok || []).find((u) => u.id === k.urunId);
    const v = urun ? (urun.variants || []).find((x) => x.renk === k.renk && x.beden === k.beden) : null;
    const kod = varyantinBarkodu(urun, v, tanimlar);
    const gorsel = urun ? ((urun.renkResimleri || {})[k.renk] || urun.kapakResmi || "") : "";
    // Adet kadar TEKRAR: aynı beden 3 çiftse aynı barkod 3 ayrı etikete basılıyor.
    for (let i = 0; i < (k.adet || 0); i++) {
      etiketler.push(`
        <!-- ÜRÜN, RENK ve BEDEN BELİRGİN: etiket rafta metrelerce uzaktan okunuyor; barkod
             okuyucunun işi ayrı, gözün işi ayrı. Görsel de aynı işi görüyor — aynı modelin
             siyahı ile bejini yazıya bakmadan ayırt ettiriyor. -->
        <div style="display:flex;align-items:center;gap:1.5mm;width:100%">
          ${gorsel ? `<img src="${gorsel}" style="width:11mm;height:11mm;object-fit:cover;border:0.3mm solid #000;flex:none" />` : ""}
          <div style="text-align:left;overflow:hidden">
            <div style="font-size:13px;font-weight:700;line-height:1.15">${k.urunAd}</div>
            <div style="font-size:12px;font-weight:700;line-height:1.15">${k.renk}</div>
          </div>
          <div style="margin-left:auto;font-size:20px;font-weight:700;line-height:1;flex:none">${k.beden || "—"}</div>
        </div>
        ${kod
          ? barkodSvg(kod, { birim: 2, yukseklik: 28 })
          : '<div style="font-size:9px;font-weight:700">BARKOD YOK</div>'}
      `);
    }
  });
  if (etiketler.length === 0) return;
  etiketYazdir(etiketler, KUTU_ETIKET);
}
