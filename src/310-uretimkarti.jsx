// ÜRETİM (ANA) ETİKETİ — 6 cm × 4 cm.
//
// İşin BAŞINDA basılan etiket bu: bölünme olmadığı sürece bütün prosesler boyunca aynı kod
// kullanılıyor, yani bu tek etiket işin sonuna kadar yetiyor. Bölünme olursa parçalar kendi
// etiketlerini alıyor (aşağıdaki `parcaEtiketiYazdir`).
function uretimEtiketiYazdir(uretim, stok) {
  const urun = (stok || []).find((x) => x.id === uretim.urunId);
  const bedenler = ((uretim.bedenMiktarlari || []).length
    ? uretim.bedenMiktarlari
    : [{ beden: uretim.beden || "", miktar: uretim.adet || 0 }])
    .filter((b) => (b.miktar || 0) > 0)
    .map((b) => `${b.beden}: ${b.miktar}`).join("   ");
  const adet = ((uretim.bedenMiktarlari || []).length
    ? uretim.bedenMiktarlari.reduce((t, b) => t + (b.miktar || 0), 0)
    : uretim.adet || 0);
  const kod = uretim.takipKodu || uretim.siparisNo;
  etiketYazdir([`
    <div style="font-size:12px;font-weight:700;line-height:1.2">${(urun && urun.ad) || uretim.model || ""}</div>
    <div style="font-size:11px">${uretim.renk || ""}</div>
    ${barkodSvg(kod, { birim: 2, yukseklik: 28 })}
    <div style="font-size:10px;line-height:1.3">${bedenler}</div>
    <div style="font-size:11px;font-weight:700">${adet} çift</div>
  `], { genislikMM: 60, yukseklikMM: 40 });
}

// PARÇA ETİKETİ — 6 cm × 4 cm, kutu etiketiyle aynı boy.
//
// Bölünmüş bir iş kendi koduyla ("1000-2") yoluna devam ediyor; kalfanın elindeki bohçaya
// yapıştırılan etiket bu. Barkod yalnızca kodu taşır — hangi üretim, hangi proses ve hangi
// bedenler olduğu gözle okunacak şekilde ayrıca basılıyor, çünkü okuyucu bozulduğunda ya da
// etiket başka bohçaya karıştığında tek dayanak yazı oluyor.
function parcaEtiketiYazdir(uretim, adim, atama, stok) {
  const urun = (stok || []).find((x) => x.id === uretim.urunId);
  const bedenler = Object.entries(atama.bedenMiktarlari || {})
    .map(([b, m]) => `${b}: ${m}`).join("   ");
  const adet = Object.values(atama.bedenMiktarlari || {}).reduce((t, m) => t + (m || 0), 0);
  etiketYazdir([`
    <div style="font-size:12px;font-weight:700;line-height:1.2">${(urun && urun.ad) || uretim.model || ""}</div>
    <div style="font-size:11px">${uretim.renk || ""} · ${adim.proses}</div>
    ${barkodSvg(atama.barkod, { birim: 2, yukseklik: 26 })}
    <div style="font-size:10px;line-height:1.3">${bedenler}</div>
    <div style="font-size:11px;font-weight:700">${adet} çift</div>
  `], { genislikMM: 60, yukseklikMM: 40 });
}

function UretimSiparisKarti({ order: o, onTamEkran, baslangicAcik, acikDisaridan, onAcKapa, tumUretimler, stok, cariler, personelListesi, tanimlarFireSebepleri, tanimlarProsesler, onHurdaTelafi, onGoToCari, onProsesTamamla, onProsesVer, onProsesVerGeriAl, onProsesTeslimGeriAl, onRemove, siparisler, onGoToSiparis, hedefli, onHedefGoruldu, asortiler }) {
  const [seciliPersonel, setSeciliPersonel] = useState({}); // { [proses]: personelId }
  // GERÇEKTE VERİLEN HAMMADDE — "urunId|renk|beden" -> girilen dize.
  //
  // Kullanıcı (6 Eylül): "Deri bölünmez; ihtiyaç 300 desi ama bir kanat 390 desi var. Kesiciye
  // bunu verip artanı almamız gerekiyor." Reçete beklentisi ile GERÇEKTE VERİLEN farklı olabilir
  // ve artan ancak bu fark bilinirse hesaplanabilir. Boş bırakılan hücre "reçete kadar verdim"
  // demek — en sık durum bu.
  const [verilenGirisleri, setVerilenGirisleri] = useState({});
  // Kart içi sekme: prosesler | hammadde | fire
  const [kartSekme, setKartSekme] = useState("prosesler");
  const [silOnayGoster, setSilOnayGoster] = useState(false);
  const [acikDetay, setAcikDetay] = useState(null); // açık olan tamamlanmış prosesin adı
  const [vurgulu, setVurgulu] = useState(false);
  // Tam ekran pencerede kart HER ZAMAN açık başlar: pencereyi açıp bir de kartı açmak
  // gereksiz bir tıklama olurdu.
  // AÇIK/KAPALI DURUM DIŞARIDAN YÖNETİLEBİLİR.
  //
  // Kullanıcı: "Üretimde fiş açtığımızda, diğer fişe tıklayınca bir önceki detay kapansın."
  // Her kart kendi durumunu tutarken hepsi birden açık kalabiliyordu; uzun kartlarda listede
  // gezinmek imkânsız hale geliyordu. Liste artık tek bir "açık kart" tutuyor (akordeon) ve
  // kart o durumu dışarıdan alıyor.
  //
  // İç state KORUNUYOR: kart tam ekran pencerede ya da tek başına da kullanılıyor; orada
  // dışarıdan yöneten bir liste yok.
  const [icAcik, setIcAcik] = useState(!!hedefli || !!baslangicAcik);
  const disKontrolVar = typeof onAcKapa === "function";
  const acik = disKontrolVar ? !!acikDisaridan : icAcik;
  const setAcik = (yeni) => {
    const deger = typeof yeni === "function" ? yeni(acik) : yeni;
    if (disKontrolVar) onAcKapa(deger);
    else setIcAcik(deger);
  };
  const kartRef = React.useRef(null);
  const prosesIlerleme = o.prosesIlerleme || [];
  const tamamlandi = prosesIlerleme.length > 0 && prosesIlerleme.every((p) => p.tamamlandiMi);
  const renkKartCizgi = tamamlandi ? "var(--erp-primary)" : ASAMA_RENK[o.asama] || "var(--erp-text-3)";
  const urun = uretimUrunu(o, stok);
  const urunGorseli = urun ? ((urun.renkResimleri || {})[o.renk] || urun.kapakResmi) : null;

  useEffect(() => {
    if (hedefli && kartRef.current) {
      setAcik(true);
      kartRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setVurgulu(true);
      const t = setTimeout(() => setVurgulu(false), 2200);
      if (onHedefGoruldu) onHedefGoruldu();
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedefli]);

  // Bir prosesin fişine (siparisNo-prosesAdi) bağlı hammadde tüketimlerini tüm stok ürünlerinden toplar.
  // ÖNEMLİ: fişNo, o proseste birden fazla atama varsa "-1", "-2" gibi bir SIRA EKİ taşıyabilir (bkz.
  // uretimProsesAtamaTeslimAl) — bu ekin TAM olarak neyi olduğunu burada yeniden hesaplamaya kalkışmak
  // KIRILGANDIR (atama sayısı zamanla değişebilir, o anki hesaplamayla şimdiki hesaplama uyuşmayabilir).
  // Bunun yerine SAĞLAM iki kriterle eşleştirilir: (1) hareketin `uretimId` alanı bu üretimin id'sine
  // eşit olmalı (kesin, formülden bağımsız bir bağ), (2) fişNo bu prosesin ÖN EKİYLE (eşit ya da "-N"
  // ile devam eden) başlamalı — böylece tek atamalı ("Kesim") ve çok atamalı ("Kesim-1", "Kesim-2")
  // durumların HEPSİ doğru yakalanır.
  // Hangi atama için teslim alma formu açık.

  // Tamirde yeniden çıkabilecek hammaddeler: bu mamulün reçetesindeki hammaddeler.
  // Tümünü değil, gerçekten kullanılanları listelemek seçimi anlamlı kılar.
  const hammaddeSecenekleri = (() => {
    const urun = uretimUrunu(o, stok);
    if (!urun || !Array.isArray(urun.recete)) return [];
    const gorulen = new Map();
    urun.recete
      .filter((r) => r.mamulRenk === o.renk)
      .forEach((r) => { if (!gorulen.has(r.hammaddeUrunId)) gorulen.set(r.hammaddeUrunId, { id: r.hammaddeUrunId, ad: r.hammaddeAd }); });
    return Array.from(gorulen.values());
  })();

  // Bir ATAMANIN belirli bir proseste tüketeceği hammaddeler ve beklenen miktarları.
  // Teslim alırken "ne kadar artı" sorulabilmesi için önce "ne kadar verildi" bilinmeli;
  // beklenen miktar gösterilmezse kullanıcı artanı neye göre değerlendireceğini bilemez.
  //
  // Hesap, üretim tüketimindeki mantığın AYNISI: reçete satırları × atamanın gerçek beden
  // dağılımı, kutu tercihi uygulanmış renkle. Farklı hesaplamak, "beklenen" ile "çıkan"ın
  // birbirini tutmamasına yol açardı.
  function atamaHammaddeleri(atama, prosesAdi) {
    const urun = uretimUrunu(o, stok);
    if (!urun || !Array.isArray(urun.recete)) return [];
    const toplamAdet = Object.values(atama.bedenMiktarlari || {}).reduce((t, x) => t + (x || 0), 0);
    const index = {};
    const liste = [];
    urun.recete
      .filter((r) => r.mamulRenk === o.renk && (r.proses || "") === prosesAdi)
      .forEach((r) => {
        const adet = r.mamulBeden === "Tüm Bedenler"
          ? toplamAdet
          : ((atama.bedenMiktarlari || {})[r.mamulBeden] || 0);
        if (!adet) return;
        const etkinRenk = ambalajRengiUygula(r, o, stok);
        const anahtar = `${r.hammaddeUrunId}|${etkinRenk}|${r.beden}`;
        if (!(anahtar in index)) {
          index[anahtar] = liste.length;
          liste.push({
            urunId: r.hammaddeUrunId, ad: r.hammaddeAd, renk: etkinRenk, beden: r.beden,
            birim: hammaddeBirimi(r.hammaddeUrunId, stok, r.birim), beklenen: 0,
          });
        }
        liste[index[anahtar]].beklenen = stokYuvarla(liste[index[anahtar]].beklenen + r.miktar * adet);
      });
    return liste;
  }

  // Fire sebepleri Tanımlar'dan gelir; tanımlanmamışsa makul bir varsayılan liste kullanılır —
  // sebep seçememek, fire raporunu "neden" boyutundan yoksun bırakırdı.
  const fireSebepleri = (tanimlarFireSebepleri && tanimlarFireSebepleri.length > 0)
    ? tanimlarFireSebepleri.map((x) => (typeof x === "string" ? x : x.ad))
    : ["Malzeme hatası", "İşçilik hatası", "Kalıp / ölçü", "Makine arızası", "İkinci kalite"];

  function buProseseAitMi(h, prosesAdi) {
    const on = `${o.siparisNo}-${prosesAdi}`;
    const onekEslesiyor = h.fisNo === on || (h.fisNo && h.fisNo.startsWith(on + "-"));
    if (!onekEslesiyor) return false;
    // uretimId alanı VARSA (yeni kayıtlarda hep var) kesin doğrulama için de kontrol edilir — yanlış
    // eşleşme riskini sıfırlar. Bu alan YOKSA (bu özellik eklenmeden önce oluşmuş eski kayıtlar), sadece
    // fişNo ön ek eşleşmesi yeterli sayılır — aksi halde eski üretimlerde hammadde/işçilik detayı hiç
    // görünmez hale gelirdi.
    if (h.uretimId) return h.uretimId === o.id;
    return true;
  }
  function hammaddeDetayiGetir(prosesAdi) {
    const gruplar = [];
    const index = {};
    (stok || []).forEach((p) => {
      (p.hareketler || []).filter((h) => buProseseAitMi(h, prosesAdi)).forEach((h) => {
        if (!(p.id in index)) {
          index[p.id] = gruplar.length;
          gruplar.push({ urunId: p.id, urunAd: p.ad, renkResimleri: p.renkResimleri || {}, hareketler: [] });
        }
        gruplar[index[p.id]].hareketler.push(h);
      });
    });
    return gruplar;
  }

  // Bu üretim için reçeteye göre BEKLENEN toplam tüketim. Gerçekleşenle karşılaştırmak, eksik
  // düşen hammaddeyi (reçete kapsamı eksikse ya da bir atama teslim alınmadıysa) görünür kılar.
  // Sadece sonucu değil hesabı da taşır: hangi bedenden kaç adet, hangi oranla çarpıldı.
  // İŞ EMRİ — A4, personele verilen kâğıt.
  //
  // Kullanıcı: "Üretim barkodunun içerisinde reçetedeki gibi proses bazlı hammadde ihtiyacı
  // yazması gerekiyor, en üstte model resim, müşteri, stok bilgileri… personele detay vermemiz
  // gerekiyor."
  //
  // BU, BARKOD ETİKETİ DEĞİL. 6×4 cm'lik etikete reçete tablosu sığmaz; sığdırılmaya çalışılsa
  // hem barkod hem yazı okunmaz olurdu. İki ayrı belge var ve ikisi de gerekli:
  //   - barkod etiketi (6×4)  → bohçaya yapışır, okutulur
  //   - iş emri (A4)          → personele verilir, ne yapacağını anlatır
  // Barkod iş emrinin de üstünde: kâğıdı eline alan kişi doğrudan okutabilsin.
  function isEmriYazdir() {
    const kod = o.takipKodu || o.siparisNo;
    const bedenler = ((o.bedenMiktarlari || []).length
      ? o.bedenMiktarlari
      : [{ beden: o.beden || "", miktar: o.adet || 0 }]).filter((b) => (b.miktar || 0) > 0);
    const toplamAdet = bedenler.reduce((t, b) => t + (b.miktar || 0), 0);
    const musteri = bagliSatisSiparisi
      ? (cariler || []).find((c) => c.id === bagliSatisSiparisi.cariId)
      : null;

    const bedenSatiri = bedenler.map((b) => `<b>${b.beden}</b>: ${b.miktar}`).join(" &nbsp; ");

    // PROSES BAZLI HAMMADDE — MATRİS.
    //
    // Önce her hammadde × beden ayrı satırdı; 5 bedenli bir modelde tek hammadde 5 satır
    // kaplıyordu ve tablo A4'e sığmıyordu. Artık uygulamanın her yerindeki düzen: satır =
    // hammadde, sütun = beden. Aynı bilgi, beşte bir yer.
    const isEmriBedenleri = bedenler.map((b) => b.beden);
    const prosesBloklari = (o.prosesIlerleme || []).map((p, i) => {
      const satirlar = isEmriHammaddeMatrisi(p.proses, isEmriBedenleri);
      const govde = satirlar.length === 0
        ? `<tr><td colspan="${isEmriBedenleri.length + 3}" style="color:#555">Bu proseste hammadde çıkışı yok</td></tr>`
        : satirlar.map((k) => `<tr>
            <td style="text-align:left">${k.ad}${k.tekBeden ? ` <span style="color:#555">(${k.tekBeden})</span>` : ""}</td>
            <td style="text-align:left">${k.renk || "—"}</td>
            ${isEmriBedenleri.map((bd) => {
              if (!k.adetler[bd]) return `<td style="text-align:center">·</td>`;
              // Beden-beden eşleşmesinde hammaddenin bedeni miktarın YANINDA: aynı satırda ikisi de görünür.
              // PARANTEZ ŞART. Parantezsiz "20 41" iki ayrı sayı gibi okunuyordu; "20 (41)" ise
              // "20 adet, 41 numara" diye tek bakışta anlaşılıyor.
              const hb = k.bedenDegisken && k.hbedenler[bd] ? ` <span style="color:#555;font-size:9px">(${k.hbedenler[bd]})</span>` : "";
              return `<td style="text-align:center">${k.adetler[bd]}${hb}</td>`;
            }).join("")}
            <td style="text-align:right;border-left:0.2mm solid #999"><b>${k.toplam}</b> ${k.birim || ""}</td>
          </tr>`).join("");
      return `
        <div style="margin-top:3mm;page-break-inside:avoid">
          <div style="font-size:12px;font-weight:700;border-bottom:0.4mm solid #000;padding-bottom:1mm">
            ${i + 1}. ${p.proses}${p.tamamlandiMi ? " · tamamlandı" : ""}
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:1mm">
            <thead><tr style="border-bottom:0.2mm solid #999">
              <th style="text-align:left">Hammadde</th><th style="text-align:left">Renk</th>
              ${isEmriBedenleri.map((bd) => `<th style="text-align:center">${bd}</th>`).join("")}
              <th style="text-align:right;border-left:0.2mm solid #999">Toplam</th>
            </tr></thead>
            <tbody>${govde}</tbody>
          </table>
        </div>`;
    }).join("");

    etiketYazdir([`
      <div style="display:flex;gap:4mm;align-items:flex-start;border-bottom:0.6mm solid #000;padding-bottom:3mm">
        ${urunGorseli ? `<img src="${urunGorseli}" style="width:28mm;height:28mm;object-fit:cover;border:0.3mm solid #000" />` : ""}
        <div style="flex:1">
          <div style="font-size:20px;font-weight:700;line-height:1.1">${o.model || (urun && urun.ad) || ""}</div>
          <div style="font-size:15px;font-weight:700">${o.renk || ""}</div>
          <div style="font-size:12px;margin-top:1mm">${bedenSatiri} &nbsp;·&nbsp; <b>${toplamAdet} çift</b></div>
          <div style="font-size:11px;margin-top:1mm">
            ${musteri ? `Müşteri: <b>${musteri.unvan}</b><br/>` : ""}
            ${bagliSatisSiparisi ? `Sipariş: ${bagliSatisSiparisi.siparisNo}` : ""}
            ${o.teslimTarihi ? ` · Teslim: ${o.teslimTarihi}` : ""}
          </div>
        </div>
        <div style="text-align:center">
          ${barkodSvg(kod, { birim: 2, yukseklik: 40 })}
        </div>
      </div>
      ${prosesBloklari}
    `], { genislikMM: 210, yukseklikMM: 297, ustHizali: true });
  }

  // İŞ EMRİ HAMMADDE MATRİSİ: satır = hammadde (+renk), sütun = mamul bedeni.
  //
  // `beklenenTuketim` beden kırılımını TOPLAYIP tek sayı veriyor; iş emrinde ise personelin hangi
  // bedene ne kadar malzeme alacağını görmesi gerekiyor. İki hesap da aynı reçeteden ve aynı
  // ambalaj renk kuralından besleniyor — ayrı bir "gerçek" üretmiyor, yalnızca kırılımı koruyor.
  function isEmriHammaddeMatrisi(prosesAdi, mamulBedenleri) {
    const urunKaydi = uretimUrunu(o, stok);
    if (!urunKaydi || !Array.isArray(urunKaydi.recete)) return [];
    const satirlar = [];
    const yuvarla = (n) => Math.round(n * 1000) / 1000;
    urunKaydi.recete
      .filter((r) => r.proses === prosesAdi && r.mamulRenk === o.renk)
      .forEach((r) => {
        const etkinRenk = ambalajRengiUygula(r, o, stok);
        // ANAHTARDA HAMMADDE BEDENİ YOK.
        //
        // Beden-beden eşleşmesinde (mamul 40 → taban 40, mamul 41 → taban 41) hammaddenin bedeni
        // her satırda değişiyor; anahtara katılınca her beden AYRI SATIR oluyordu ve matris yine
        // aşağı doğru uzuyordu — kullanıcının bildirdiği durum buydu. Artık hammadde tek satır,
        // hammaddenin bedeni HÜCRENİN İÇİNDE yazılıyor: "1 (40)".
        const anahtar = `${r.hammaddeUrunId}|${etkinRenk}`;
        let satir = satirlar.find((x) => x.anahtar === anahtar);
        if (!satir) {
          satir = { anahtar, ad: r.hammaddeAd, renk: etkinRenk, birim: r.birim, adetler: {}, hbedenler: {}, toplam: 0 };
          satirlar.push(satir);
        }
        (mamulBedenleri || []).forEach((bd) => {
          // "Tüm Bedenler" satırı HER bedene uygulanır; beden adı yazılı satır yalnızca kendine.
          if (r.mamulBeden !== "Tüm Bedenler" && r.mamulBeden !== bd) return;
          const bm = (o.bedenMiktarlari || []).find((x) => x.beden === bd);
          const adet = bm ? bm.miktar || 0 : 0;
          if (!adet) return;
          const m = yuvarla((r.miktar || 0) * adet);
          satir.adetler[bd] = yuvarla((satir.adetler[bd] || 0) + m);
          if (r.beden) satir.hbedenler[bd] = r.beden;
          satir.toplam = yuvarla(satir.toplam + m);
        });
      });
    // Hammadde bedeni BÜTÜN hücrelerde aynıysa satır adının yanında bir kez yazılır; değişiyorsa
    // (beden-beden eşleşmesi) her hücrede kendi bedeni görünür. Aynı bilgiyi her hücrede tekrar
    // etmek tabloyu gereksiz kalabalıklaştırırdı.
    satirlar.forEach((satir) => {
      const farkli = Array.from(new Set(Object.values(satir.hbedenler)));
      satir.tekBeden = farkli.length === 1 ? farkli[0] : "";
      satir.bedenDegisken = farkli.length > 1;
    });
    return satirlar;
  }

  function beklenenTuketim(prosesAdi) {
    const urun = uretimUrunu(o, stok);
    if (!urun || !Array.isArray(urun.recete)) return [];
    const index = {};
    const liste = [];
    urun.recete
      .filter((r) => r.proses === prosesAdi && r.mamulRenk === o.renk)
      .forEach((r) => {
        const toplamAdet = (o.bedenMiktarlari || []).reduce((s, bm) => s + (bm.miktar || 0), 0);
        const bm = (o.bedenMiktarlari || []).find((x) => x.beden === r.mamulBeden);
        const adet = r.mamulBeden === "Tüm Bedenler" ? toplamAdet : (bm ? bm.miktar : 0);
        if (!adet) return;
        // Beklenen tüketim de GERÇEK çıkış rengi üzerinden gösterilir (kutu tercihi uygulanmış).
        // Aksi halde "beklenen"de Standart, "çıkan"da Tergan görünür ve ikisi hiç eşleşmezdi.
        const etkinRenk = ambalajRengiUygula(r, o, stok);
        const anahtar = `${r.hammaddeUrunId}|${etkinRenk}|${r.beden}`;
        if (!(anahtar in index)) {
          index[anahtar] = liste.length;
          liste.push({ ad: r.hammaddeAd, renk: etkinRenk, beden: r.beden, birim: r.birim, toplam: 0, parcalar: [] });
        }
        const k = liste[index[anahtar]];
        k.toplam = Math.round((k.toplam + r.miktar * adet) * 1000) / 1000;
        k.parcalar.push(`${r.miktar}×${adet}${r.mamulBeden === "Tüm Bedenler" ? "" : ` (${r.mamulBeden})`}`);
      });
    return liste;
  }


  // Tedarik Planlama üzerinden bu üretim siparişine bağlı bir Satış siparişi (ve dolayısıyla müşteri) var mı?
  const bagliSatisSiparisi = (siparisler || []).find((s) =>
    s.tip === "Satış" && s.kalemler.some((k) => k.planlama && k.planlama.tip === "Üretim" && k.planlama.referansNo === o.siparisNo)
  );
  const bagliMusteri = bagliSatisSiparisi ? (cariler || []).find((c) => c.id === bagliSatisSiparisi.cariId) : null;

  return (
    <div
      ref={kartRef}
      style={{
        background: "var(--erp-panel)", border: `1px solid ${vurgulu ? "var(--erp-orange)" : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-md)", padding: 14,
        borderLeft: `4px solid ${renkKartCizgi}`,
        boxShadow: vurgulu ? "0 0 0 3px #FCE7DA" : "none",
        transition: "box-shadow .3s, border-color .3s",
      }}
    >
      <div
        onClick={() => setAcik((v) => !v)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: acik ? 10 : 0, cursor: "pointer" }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <ColorSwatch src={urunGorseli} editable={false} size={40} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {o.model} <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 500 }}>{o.siparisNo}</span>
              {/* ÜRETİM BARKODU BURADAN BASILIYOR. İşin başında bir kez basılıyor ve bölünme
                  olmadığı sürece bütün prosesler boyunca aynı etiket kullanılıyor. Bölünen
                  parçaların etiketleri aşağıda, kendi satırlarında. */}
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "2px 8px", fontSize: 11 }}
                title="Bu üretimin barkod etiketini bas (6×4 cm) — bohçaya yapıştırılır"
                onClick={(e) => { e.stopPropagation(); uretimEtiketiYazdir(o, stok); }}
              >
                <Printer size={11} /> Barkod
              </button>
              {/* İŞ EMRİ, barkod etiketinden AYRI bir belge: reçete tablosu 6×4 cm'ye sığmaz.
                  Etiket bohçaya yapışır, iş emri personelin eline verilir. */}
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "2px 8px", fontSize: 11 }}
                title="İş emri (A4): model görseli, müşteri, beden dağılımı ve proses bazlı hammadde ihtiyacı"
                onClick={(e) => { e.stopPropagation(); isEmriYazdir(); }}
              >
                <FileText size={11} /> İş Emri
              </button>
            </div>
            {bagliSatisSiparisi && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onGoToSiparis && onGoToSiparis(bagliSatisSiparisi.id); }}
                className="mono"
                style={{
                  display: "flex", alignItems: "center", gap: 4, marginTop: 2, fontSize: 12, fontWeight: 600,
                  color: "var(--erp-info)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline",
                }}
                title="Bağlı satış siparişini aç"
              >
                <Truck size={11} /> {bagliMusteri ? bagliMusteri.unvan : "—"} · {bagliSatisSiparisi.siparisNo}
              </button>
            )}
            <div style={{ fontSize: 13, color: "var(--erp-text-2)", marginTop: 2 }}>
              {o.adet} çift{o.beden ? ` · ${o.beden}` : ""}{o.termin ? ` · Termin: ${o.termin}` : ""}
            </div>
            {o.not && <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginTop: 2 }}>{o.not}</div>}
            {o.stogaEklendiMi && (
              <div style={{ fontSize: 11, color: "var(--erp-primary)", fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <PackageCheck size={12} /> Stoğa eklendi
              </div>
            )}
            {!acik && (
              <div style={{ fontSize: 11, color: renkKartCizgi, fontWeight: 700, marginTop: 4 }}>
                {tamamlandi ? "Tamamlandı" : `Aşama: ${o.asama || "—"}`}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* TAM EKRAN — üretim üzerinde uzun süre çalışılıyor (iş ver, teslim al, fire gir).
              Bu sırada stok bakmak ya da sipariş açmak gerektiğinde kartı kaybetmemek için
              pencereye alınabiliyor; küçültünce üst sekme çubuğunda kalıyor. */}
          {onTamEkran && (
            <button
              className="btn-ghost"
              onClick={(e) => { e.stopPropagation(); onTamEkran(); }}
              title="Tam ekran aç — başka modüle geçerken açık kalır"
            >
              <Maximize2 size={13} />
            </button>
          )}
          <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setSilOnayGoster(true); }}><Trash2 size={13} /></button>
          {acik ? <ChevronUp size={16} color="var(--erp-text-3)" /> : <ChevronDown size={16} color="var(--erp-text-3)" />}
        </div>
      </div>

      {silOnayGoster && (() => {
        // Bir adımın kendisi tam tamamlanmamış olsa bile (örn. 100 adetlik işin sadece 30'u teslim
        // alınmış, 70'i hâlâ bekliyor), o KISMİ atama zaten hammadde düşüp cari hareketi oluşturmuş
        // olabilir — bu yüzden sadece "adım tamamlandiMi" değil, İÇİNDEKİ herhangi bir atamanın
        // tamamlanmış olup olmadığına da bakılır. Aksi halde silme "işlem görmemiş" sanılıp bu
        // hareketler geride (fişlerde "boşa düşen" kayıtlar olarak) kalırdı.
        // Bayraklar tek başına yetmiyor (bkz. uretimSil içindeki `gercekEtkiVar` yorumu):
        // bayrak temiz görünürken hareket yerinde durabiliyor. Uyarı metni de gerçeğe baksın,
        // yoksa kullanıcı "yan etkisi yok" diye onaylayıp arkada kayıt siliniyor olur.
        const bayrakIlerlemis = (o.prosesIlerleme || []).some(
          (p) => p.tamamlandiMi || (p.atamalar || []).some((a) => a.tamamlandiMi)
        );
        const hareketVar = (stok || []).some((pr) =>
          (pr.hareketler || []).some((h) => h.kaynak === "Üretim" && h.uretimId === o.id)
        );
        const ilerlemisMi = bayrakIlerlemis || hareketVar;
        return (
          <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 10 }}>
            {ilerlemisMi ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 8 }}>
                  ⚠ Bu üretim siparişi ilerlemiş — bazı prosesler tamamlanmış, hammadde stoktan düşülmüş
                  ve/veya personele işçilik cari hesabına işlenmiş. Silindiğinde bu etkiler de (cari ve stok kaydı dahil) geri alınacak.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { onRemove(o.id, true); setSilOnayGoster(false); }}>
                    Evet, Sil (cari/stok kayıtları dahil)
                  </button>
                  <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setSilOnayGoster(false)}>
                    Vazgeç
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 8 }}>
                  Bu üretim siparişini silmek istediğinize emin misiniz?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { onRemove(o.id, false); setSilOnayGoster(false); }}>
                    Evet, Sil
                  </button>
                  <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setSilOnayGoster(false)}>
                    Vazgeç
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* HURDA ÖZETİ — bu üretimde hurdaya çıkan çiftler ve telafi. Kart açılmadan da görünür,
          çünkü hurda siparişin eksik kalması demektir ve gözden kaçmamalı. */}
      {(() => {
        const hurdaHarita = {};
        let toplamHurda = 0;
        (o.prosesIlerleme || []).forEach((p) => {
          (p.atamalar || []).filter((a) => a.tamamlandiMi).forEach((a) => {
            atamaSonucu(a).hurda.forEach((h) => {
              hurdaHarita[h.beden] = (hurdaHarita[h.beden] || 0) + (h.miktar || 0);
              toplamHurda += h.miktar || 0;
            });
          });
        });
        if (toplamHurda === 0) return null;
        // Telafi zaten açılmışsa tekrar önerme — aynı hurda için iki üretim açmak siparişi şişirir.
        const telafiVar = (tumUretimler || []).some((x) => x.hurdaTelafisiMi && x.hurdaKaynakUretimNo === o.siparisNo);
        return (
          <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 10, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <AlertTriangle size={14} color="var(--erp-warn)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)" }}>
                {toplamHurda} çift hurda
              </span>
              <span className="mono" style={{ fontSize: 11, color: "#7A3B22" }}>
                {Object.entries(hurdaHarita).map(([b, m]) => `${b}: ${m}`).join(" · ")}
              </span>
              {telafiVar ? (
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--erp-primary)" }}>
                  ✓ telafi üretimi açıldı
                </span>
              ) : onHurdaTelafi ? (
                <button
                  className="btn-primary"
                  style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 11 }}
                  title="Hurda adedi kadar, ilk prosesten başlayan yeni bir üretim emri açar"
                  onClick={() => onHurdaTelafi(o.id, hurdaHarita)}
                >
                  <Plus size={12} /> Telafi üretimi aç
                </button>
              ) : null}
            </div>
            <div style={{ fontSize: 10, color: "#7A3B22", marginTop: 5, lineHeight: 1.6 }}>
              Harcanan hammadde kayıp sayıldı ve bu adetler için işçilik ödenmedi. Sipariş eksik
              kalmasın diye aynı miktarda üretim yeniden başlatılmalı.
            </div>
          </div>
        );
      })()}


      {/* KART SEKMELERİ — sipariş kartındaki ile aynı düzen.
          Üretim kartı uzun: prosesler, her prosesin atamaları, teslim formları alt alta.
          Hammadde ihtiyacını görmek için sonuna kadar kaydırmak, fire özetini görmek için
          yukarı dönmek gerekiyordu. Sekmeler her bölümü tek tıkla erişilebilir yapıyor. */}
      {acik && (() => {
        const sekmeler = [
          { key: "prosesler", ad: "Prosesler", renk: "var(--erp-orange)", ikon: <Hammer size={12} /> },
          { key: "hammadde", ad: "Hammadde İhtiyacı", renk: "var(--erp-brown)", ikon: <Layers size={12} /> },
        ];
        // Fire sekmesi yalnızca fire VARSA çıkar; boş bir sekme, "acaba bir şey mi kaçırdım"
        // sorusu doğurur.
        const fireVar = (o.prosesIlerleme || []).some((p2) =>
          (p2.atamalar || []).some((a) => {
            const s2 = atamaSonucu(a);
            return s2.hurda.length > 0 || s2.tamir.length > 0;
          })
        );
        if (fireVar) sekmeler.push({ key: "fire", ad: "Fire ve Tamir", renk: "var(--erp-warn)", ikon: <AlertTriangle size={12} /> });

        return (
          <>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {sekmeler.map((x) => {
                const aktif = kartSekme === x.key;
                return (
                  <button
                    key={x.key}
                    type="button"
                    onClick={() => setKartSekme(x.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${aktif ? x.renk : "var(--erp-border-2)"}`,
                      background: aktif ? x.renk : "#fff",
                      color: aktif ? "#fff" : "var(--erp-text-2)",
                    }}
                  >
                    {x.ikon} {x.ad}
                  </button>
                );
              })}
            </div>
            {kartSekme === "prosesler" && (
      <div style={{ display: "grid", gap: 6 }}>
        {prosesIlerleme.map((p, i) => {
          // Artık bir sonraki proses, öncekinin TAMAMEN bitmesini beklemek zorunda değil — önceki
          // adımdan kısmen teslim alınmış (biten) miktar kadar iş dağıtılabilir.
          const mevcutBedenlerBu = oncekiAdimdanMevcutBedenler(prosesIlerleme, i, o.bedenMiktarlari);
          const bedenDurumu = adimBedenDurumu(p, o.bedenMiktarlari, mevcutBedenlerBu);
          const atamalar = p.atamalar || [];
          // "akisVarMi": bu adıma YENİ iş verilebilecek kapasite var mı (dağıtım formunu göstermek için).
          // "siradaki": bu adımın aktif/güncel adım olarak VURGULANIP vurgulanmayacağı — adımın kendisi
          // TAMAMEN dağıtılmış olsa bile (artık yeni iş verilemez), üzerinde zaten çalışılan (atama
          // yapılmış) bir adımın "kapalı" gibi soluk görünmesi yanlış olur; bu yüzden atamalar varsa da
          // (henüz teslim alınmamış olsa bile) siradaki=true kalır.
          const akisVarMi = bedenDurumu.some((bd) => bd.kalan > 0);
          const siradaki = !p.araProsesMi && !p.tamamlandiMi && (akisVarMi || atamalar.length > 0);
          const toplamAdet = o.bedenMiktarlari.reduce((s, bm) => s + bm.miktar, 0);
          const dagitilanToplam = atamalar.reduce((s, a) => s + a.miktar, 0);
          const kalanMiktar = toplamAdet - dagitilanToplam;
          const detayAcik = acikDetay === p.proses;
          return (
            <div key={p.proses}>
              <div
                onClick={p.tamamlandiMi ? () => setAcikDetay(detayAcik ? null : p.proses) : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                  padding: "8px 10px", borderRadius: "var(--erp-r-md)",
                  background: p.tamamlandiMi ? "#F0F5EE" : p.araProsesMi ? "#F2E7F5" : siradaki ? "#fff" : "var(--erp-panel-2)",
                  border: `1px solid ${p.tamamlandiMi ? "#8FA888" : p.araProsesMi ? "#B79ACB" : siradaki ? "var(--erp-orange)" : "var(--erp-border-2)"}`,
                  opacity: !p.tamamlandiMi && !siradaki && !p.araProsesMi ? 0.6 : 1,
                  cursor: p.tamamlandiMi ? "pointer" : "default",
                }}
              >
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-3)", width: 16 }}>{i + 1}.</span>
                {/* Proses ikonu, adın solunda ve prosesin kendi renginde. Atölyede ekrana uzaktan
                    bakıldığında adı okumadan hangi adımda olunduğu anlaşılsın diye. */}
                <span style={{ display: "flex", alignItems: "center", color: prosesRengi(p.proses, i), flexShrink: 0 }}>
                  <ProsesIkonu proses={p.proses} tanimlarProsesler={tanimlarProsesler} size={16} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 90 }}>{p.proses}</span>

                {p.tamamlandiMi ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--erp-primary)", fontWeight: 600 }}>
                    <Check size={13} /> Tamamlandı
                    {p.araProsesMi && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-purple)", background: "#F2E7F5", padding: "1px 6px", borderRadius: "var(--erp-r-pill)" }}>Ara Proses · Otomatik</span>}
                    {p.araProsesMi && p.personelId && ` · ${((cariler || []).find((c) => c.id === p.personelId) || {}).unvan || ""}`}
                    {!p.araProsesMi && atamalar.length > 0 && ` · ${atamalar.length} personel arasında paylaştırıldı`}
                    {p.tamamlanmaTarihi && (
                      <span className="mono" style={{ color: "var(--erp-text-3)", fontWeight: 400 }}>
                        {new Date(p.tamamlanmaTarihi).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </span>
                ) : p.araProsesMi ? (
                  <span style={{ fontSize: 12, color: "var(--erp-purple)", fontWeight: 600 }}>
                    Otomatik — sıradaki asıl proses verilince tamamlanacak
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: siradaki ? "var(--erp-text-2)" : "var(--erp-text-3)", marginLeft: "auto" }}>
                    {dagitilanToplam} / {toplamAdet} adet dağıtıldı
                  </span>
                )}
                {p.tamamlandiMi && (
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    {/* Detayın içinde hammadde çıkışı ve geri alma düğmesi var; kapalıyken orada bir
                        şey olduğu belli değildi ve kullanıcı "geri alma yok" sanıyordu. */}
                    {!detayAcik && (
                      <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>detay / geri al</span>
                    )}
                    {detayAcik ? <ChevronDown size={14} color="var(--erp-text-3)" /> : <ChevronRight size={14} color="var(--erp-text-3)" />}
                  </span>
                )}
              </div>

              {/* Gerçek (ara olmayan) prosesin atama listesi + yeni atama ekleme formu — sadece
                  tamamlanmamışken ve sıradaki adımken gösterilir. */}
              {!p.araProsesMi && !p.tamamlandiMi && siradaki && (
                <div style={{ padding: "6px 10px 6px 34px", display: "grid", gap: 6 }}>
                  {atamalar.map((a) => {
                    const personelAdi = ((cariler || []).find((c) => c.id === a.personelId) || {}).unvan || "—";
                    return (
                      <div
                        key={a.id}
                        // Tamir atamaları görsel olarak ayrılır: normal iş akışının parçası değil,
                        // bir hatanın düzeltilmesi. Karıştırılırsa "bu iş neden iki kez verilmiş?"
                        // sorusu doğar.
                        style={{
                          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                          padding: "6px 10px", borderRadius: "var(--erp-r-md)",
                          background: a.tamirMi ? "#FDF6E3" : a.tamamlandiMi ? "#F0F5EE" : "#FCF3E3",
                          border: `1px solid ${a.tamirMi ? "#B8860B" : a.tamamlandiMi ? "#8FA888" : "#D9A441"}`,
                          borderLeft: a.tamirMi ? "4px solid #B8860B" : undefined,
                        }}
                      >
                        {a.tamirMi && (
                          <span
                            className="mono"
                            title={
                              `${a.tamirKaynakProses || "?"} prosesinden tamire gönderildi` +
                              (a.tamirSebep ? ` · ${a.tamirSebep}` : "") +
                              (a.tamirUcret > 0 ? ` · ${a.tamirUcret} ₺/adet` : " · ücretsiz")
                            }
                            style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: "var(--erp-r-pill)", background: "#B8860B", color: "var(--erp-panel-2)" }}
                          >
                            TAMİR
                          </span>
                        )}
                        {/* PARÇA BARKODU VE ETİKET BASMA.
                            Bölünmüş bir işin parçası kendi koduyla yoluna devam ediyor; kalfanın
                            elindeki bohçaya yapıştırılacak etiket buradan basılıyor. Etiket
                            hangi üretim, hangi proses, hangi bedenler olduğunu da taşıyor —
                            barkodun kendisi yalnızca kodu taşır, geri kalanı gözle okunur. */}
                        {a.barkod && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-brown)", background: "var(--erp-hover)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "1px 6px" }}>
                              {a.barkod}
                            </span>
                            <button
                              className="btn-ikon"
                              title="Bu parçanın barkod etiketini bas"
                              onClick={() => parcaEtiketiYazdir(o, p, a, stok)}
                            >
                              <Printer size={12} />
                            </button>
                          </span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{personelAdi}</span>
                        {a.tamirMi && a.tamirSebep && (
                          <span style={{ fontSize: 10, color: "#8A6A2E" }}>{a.tamirSebep}</span>
                        )}
                        <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                          {a.miktar} adet
                          {a.bedenMiktarlari && (
                            <span style={{ color: "var(--erp-text-3)", fontWeight: 400 }}>
                              {" "}({Object.entries(a.bedenMiktarlari).map(([b, m]) => `${b}:${m}`).join(", ")})
                            </span>
                          )}
                        </span>
                        {a.tamamlandiMi ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--erp-primary)", fontWeight: 600, marginLeft: "auto" }}>
                            <Check size={12} /> Teslim Alındı
                            <button
                              className="btn-ghost"
                              style={{ padding: "3px 8px", fontSize: 10, marginLeft: 6 }}
                              title="Yanlış personele verilip teslim alınmışsa — hammadde ve işçilik etkisini geri alır"
                              onClick={() => onProsesTeslimGeriAl(o.id, p.proses, a.id)}
                            >
                              Geri Al
                            </button>
                          </span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                            <span
                              title="Bu atama için gereken hammadde ve işçilik rezerve edildi"
                              style={{ fontSize: 10, fontWeight: 700, color: "#8A6A2E", background: "#F2E0B8", padding: "1px 6px", borderRadius: "var(--erp-r-pill)" }}
                            >
                              Rezerve
                            </span>
                            <button
                              className="btn-ghost"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              title="Yanlış personele/miktarla verildiyse — hiçbir stok/cari etkisi olmadan geri alır"
                              onClick={() => onProsesVerGeriAl(o.id, p.proses, a.id)}
                            >
                              Geri Al
                            </button>
                          </span>
                        )}
                        {/* Teslim alma formu — bekleyen atamalarda DOĞRUDAN açık.
                            Önceden bir "Teslim Al" düğmesine basmak gerekiyordu; ama iş verilmiş bir
                            atamada zaten yapılacak tek şey teslim almaktır. Araya düğme koymak
                            fazladan bir tıklama ve "nerede bu ekran" sorusu doğuruyordu.
                            Tam genişlikte, personel satırının altında durur. */}
                        {a.verildiMi && !a.tamamlandiMi && (
                          <TeslimAlmaFormu
                            atama={a}
                            prosesler={(o.prosesIlerleme || []).map((x) => x.proses)}
                            buProses={p.proses}
                            hammaddeler={hammaddeSecenekleri}
                            iadeAdaylari={atamaHammaddeleri(a, p.proses)}
                            fireSebepleri={fireSebepleri}
                            personeller={personelListesi}
                            onKaydet={(sonuc) => onProsesTamamla(o.id, p.proses, a.id, sonuc)}
                          />
                        )}
                      </div>
                    );
                  })}

                  {kalanMiktar > 0 && (() => {
                    const secim = seciliPersonel[p.proses] || {};
                    const bedenGirisleri = secim.bedenMiktarlar || {};
                    const kalanBedenler = bedenDurumu.filter((bd) => bd.kalan > 0);
                    const bedenSecenekleri = kalanBedenler.map((bd) => bd.beden);
                    // VERİLECEK HAMMADDE: teslim alma ekranındaki `iadeAdaylari` ile AYNI hesap
                    // (`atamaHammaddeleri`), yalnız girdisi henüz oluşmamış atama yerine ekranda
                    // dağıtılmakta olan miktarlar. İki ekran aynı listeyi görsün diye aynı
                    // fonksiyondan geçiyor.
                    const dagitilanMiktarlar = {};
                    kalanBedenler.forEach((bd) => {
                      const m = bedenGirisleri[bd.beden] ?? bd.kalan;
                      if (m > 0) dagitilanMiktarlar[bd.beden] = m;
                    });
                    const verilecekHammaddeler = atamaHammaddeleri({ bedenMiktarlari: dagitilanMiktarlar }, p.proses);
                    // Bu prosese "Bağlı Prosesler" olarak tanımlı personel öncelikli listelenir; hiç
                    // kimse bu prosese bağlı değilse (henüz tanımlanmamışsa) tüm personel gösterilir —
                    // böylece sistem hiçbir zaman kilitlenip iş dağıtımını engellemez.
                    const bagliPersonel = personelListesi.filter((per) => (per.bagliProsesler || []).includes(p.proses));
                    const secilebilirPersonel = bagliPersonel.length > 0 ? bagliPersonel : personelListesi;
                    // Bu proseste, ÖNCEKİ adımdan henüz akmış (kısmen dahi olsa teslim alınmış) ama bu
                    // adıma henüz dağıtılmamış bir miktar yoksa, kalanBedenler boş çıkar — bu, bedenlerin
                    // "kaldırıldığı" anlamına gelmez, sadece şu an dağıtılacak yeni birim olmadığı
                    // anlamına gelir (önceki proses daha fazla teslim aldıkça burada tekrar görünürler).
                    if (kalanBedenler.length === 0) {
                      return (
                        <div style={{ fontSize: 11, color: "var(--erp-text-3)", padding: "6px 0", fontStyle: "italic" }}>
                          Şu an bu prosese dağıtılabilecek yeni birim yok — önceki proses daha fazla teslim aldıkça burada görünecek.
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: "grid", gap: 6, padding: "6px 0" }}>
                        {/* Asorti ile hızlı doldurma (varsa) */}
                        {(asortiler || []).length > 0 && (
                          <AsortiUygulaKontrolu
                            asortiler={asortiler}
                            bedenSecenekleri={bedenSecenekleri}
                            olcuTipi={urunOlcuTipi(stok, o.urunId)}
                            onUygula={(sonuc) => setSeciliPersonel({ ...seciliPersonel, [p.proses]: { ...secim, bedenMiktarlar: sonuc } })}
                          />
                        )}

                        {/* Beden bazlı miktar girişi */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {kalanBedenler.map((bd) => (
                            <label key={bd.beden} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                              <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-2)", fontWeight: 700 }}>{bd.beden}</span>
                              <input
                                type="number" min="0" max={bd.kalan}
                                value={bedenGirisleri[bd.beden] ?? bd.kalan}
                                onChange={(e) => setSeciliPersonel({
                                  ...seciliPersonel,
                                  [p.proses]: { ...secim, bedenMiktarlar: { ...bedenGirisleri, [bd.beden]: e.target.value } },
                                })}
                                className="mono"
                                style={{ width: 52, padding: "4px 5px", fontSize: 11, textAlign: "center", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                              />
                              <span className="mono" style={{ fontSize: 9, color: "var(--erp-text-3)" }}>kalan {bd.kalan}</span>
                            </label>
                          ))}
                        </div>

                        {/* KİME VERİLECEK — miktarların ALTINDA ve belirgin.
                            Üstte, küçük bir açılır liste olarak durduğunda gözden kaçıyordu ve iş
                            yanlışlıkla personelsiz veriliyordu. Sıra da mantıksızdı: önce "kaç tane",
                            sonra "kime" — kullanıcı zaten miktarları girdikten sonra karar veriyor. */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--erp-line-soft)" }}>
                          {personelListesi.length > 0 ? (
                            <>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)" }}>Kime:</span>
                              <select
                                value={secim.personelId || ""}
                                onChange={(e) => setSeciliPersonel({ ...seciliPersonel, [p.proses]: { ...secim, personelId: e.target.value } })}
                                style={{
                                  ...inputStyle, width: 210, padding: "8px 10px", fontSize: 14, fontWeight: 700,
                                  border: `2px solid ${secim.personelId ? "var(--erp-primary)" : "var(--erp-orange)"}`,
                                  color: secim.personelId ? "var(--erp-text)" : "var(--erp-warn)",
                                }}
                              >
                                <option value="">⚠ Personel seçin</option>
                                {secilebilirPersonel.map((per) => <option key={per.id} value={per.id}>{per.unvan}</option>)}
                              </select>
                            </>
                          ) : (
                            <button type="button" className="btn-ghost" onClick={onGoToCari} style={{ fontSize: 11 }}>
                              Personel ekle
                            </button>
                          )}
                          {/* VERİLEN HAMMADDE — teslim alma ekranındaki "artan" tablosunun eşi.
                              Aynı hammaddeler, aynı düzen: kullanıcı verirken ne verdiğini yazıyor,
                              teslim alırken fark kendiliğinden geliyor. */}
                          {verilecekHammaddeler.length > 0 && (
                            <div style={{ flexBasis: "100%", background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
                                <Layers size={13} color="var(--erp-brown)" />
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-brown)" }}>Verilen hammadde</span>
                                <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>
                                  boş bırakırsanız reçete kadar verilmiş sayılır — artan teslim alırken hesaplanır
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {verilecekHammaddeler.map((h2) => {
                                  const anahtar = `${h2.urunId}|${h2.renk}|${h2.beden}`;
                                  const deger = verilenGirisleri[anahtar];
                                  return (
                                    <label key={anahtar} style={{ display: "grid", gap: 2, fontSize: 11, color: "var(--erp-text-2)" }}>
                                      <span>{h2.ad} · {h2.renk}{h2.beden ? ` · ${h2.beden}` : ""}</span>
                                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <input
                                          type="number" min="0" step="any"
                                          value={deger === undefined ? "" : deger}
                                          onChange={(e) => setVerilenGirisleri({ ...verilenGirisleri, [anahtar]: e.target.value })}
                                          placeholder={String(h2.beklenen)}
                                          title={`Reçeteye göre ${h2.beklenen} ${h2.birim} gerekiyor`}
                                          className="mono"
                                          style={{ width: 84, padding: "4px 6px", fontSize: 12, fontWeight: 700, textAlign: "right", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                                        />
                                        <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>/{h2.beklenen} {h2.birim}</span>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <button
                            className="btn-primary"
                            style={{ marginLeft: "auto", padding: "8px 20px", fontSize: 14, fontWeight: 700 }}
                            onClick={() => {
                              // Kullanıcı hiç dokunmamış (state'te değeri olmayan) bedenler için, ekranda
                              // zaten varsayılan olarak GÖSTERİLEN "kalan" miktarı gönderilir — böylece
                              // "tümünü dağıt" için tek tek her kutuyu doldurmaya gerek kalmaz.
                              const tamamlanmisMiktarlar = {};
                              kalanBedenler.forEach((bd) => {
                                tamamlanmisMiktarlar[bd.beden] = bedenGirisleri[bd.beden] ?? bd.kalan;
                              });
                              // GERÇEKTE VERİLEN HAMMADDE. Dokunulmayan hücrede reçete beklentisi
                              // gönderiliyor: en sık durum "reçete kadar verdim".
                              const verilen = {};
                              verilecekHammaddeler.forEach((h2) => {
                                const anahtar = `${h2.urunId}|${h2.renk}|${h2.beden}`;
                                const girilen = verilenGirisleri[anahtar];
                                verilen[anahtar] = {
                                  urunId: h2.urunId, ad: h2.ad, renk: h2.renk, beden: h2.beden, birim: h2.birim,
                                  beklenen: h2.beklenen,
                                  verilen: girilen === undefined || girilen === "" ? h2.beklenen : (parseFloat(girilen) || 0),
                                };
                              });
                              onProsesVer(o.id, p.proses, secim.personelId || null, tamamlanmisMiktarlar, undefined, verilen);
                              setVerilenGirisleri({});
                              setSeciliPersonel({ ...seciliPersonel, [p.proses]: { personelId: "", bedenMiktarlar: {} } });
                            }}
                          >
                            <Check size={15} /> İşi Ver
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {p.tamamlandiMi && detayAcik && (() => {
                const hammaddeGruplari = hammaddeDetayiGetir(p.proses);
                const beklenenler = beklenenTuketim(p.proses);
                return (
                  <div style={{ padding: "8px 10px 8px 34px", fontSize: 12 }}>
                    {/* BEKLENEN vs GERÇEKLEŞEN — reçeteye göre bu proseste ne kadar hammadde
                        çıkması gerektiğini ve gerçekte ne kadar çıktığını yan yana gösterir.
                        Bu karşılaştırma olmadan eksik tüketim (reçete kapsamı eksikse ya da bir
                        atama henüz teslim alınmadıysa) hiçbir yerde görünmüyordu. */}
                    {beklenenler.length > 0 && (
                      <div style={{ marginBottom: 10, background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 8 }}>
                        <span style={{ color: "var(--erp-text-2)", fontWeight: 600, fontSize: 11 }}>
                          Reçeteye göre beklenen (tüm sipariş için):
                        </span>
                        <div style={{ display: "grid", gap: 3, marginTop: 5 }}>
                          {beklenenler.map((b, i) => {
                            // Gerçekleşen: bu hammadde+renk+beden için bu proseste düşülmüş toplam.
                            const grup = hammaddeGruplari.find((g) => g.urunAd === b.ad);
                            const gerceklesen = grup
                              ? Math.abs(grup.hareketler
                                  .filter((h) => h.renk === b.renk && h.beden === b.beden)
                                  .reduce((s, h) => s + h.miktar, 0))
                              : 0;
                            const yuvarlanan = Math.round(gerceklesen * 1000) / 1000;
                            const eksikMi = yuvarlanan + 0.0001 < b.toplam;
                            return (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
                                <span className="mono" style={{ fontWeight: 700, color: "var(--erp-text)", minWidth: 110 }}>{b.ad}</span>
                                <span className="mono" style={{ color: "var(--erp-text-3)", fontSize: 10 }}>
                                  {b.parcalar.slice(0, 5).join(" + ")}{b.parcalar.length > 5 ? " + …" : ""}
                                </span>
                                <span className="mono" style={{ fontWeight: 700, color: "var(--erp-text)" }}>= {b.toplam} {b.birim}</span>
                                <span className="mono" style={{ fontWeight: 700, color: eksikMi ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                                  · çıkan: {yuvarlanan} {b.birim}
                                </span>
                                {eksikMi && (
                                  <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-warn)", background: "#B85C2E18", padding: "1px 6px", borderRadius: "var(--erp-r-pill)" }}>
                                    {Math.round((b.toplam - yuvarlanan) * 1000) / 1000} eksik
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 5, lineHeight: 1.5 }}>
                          Eksik varsa: ya bu prosesin bir kısmı henüz teslim alınmadı, ya da reçete bazı
                          bedenleri kapsamıyor (Ürün kartı &gt; Reçete sekmesindeki uyarıya bakın).
                        </div>
                      </div>
                    )}
                    {hammaddeGruplari.length > 0 ? (
                      <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
                        <span style={{ color: "var(--erp-text-2)", fontWeight: 600, fontSize: 11 }}>Çıkan Hammadde:</span>
                        {hammaddeGruplari.map((g) => {
                          const renkler = Array.from(new Set(g.hareketler.map((h) => h.renk)));
                          const bedenler = Array.from(new Set(g.hareketler.map((h) => h.beden)));
                          return (
                            <div key={g.urunId} style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 8 }}>
                              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{g.urunAd}</div>
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "auto", minWidth: "100%" }}>
                                  <thead>
                                    <tr>
                                      <th style={{ fontSize: 10 }}>{matrisKoseBasligi(renkler, bedenler)}</th>
                                      {bedenler.map((b) => (
                                        <th key={b} className="mono" style={{ fontSize: 10, textAlign: "center" }}>{olcuGoster(b, "Miktar")}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {renkler.map((r) => (
                                      // Bu blok ÜRETİM çıkışlarını gösterir; satırlar uygulamanın üretim
                                      // rengiyle (KAYNAK_RENK.Üretim) işaretlenir. Böylece aynı hareket,
                                      // stok ekstresinde göründüğü renkte burada da görünür.
                                      <tr key={r} style={kaynakRenkStili("Üretim")}>
                                        <td style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", padding: "3px 6px" }}>
                                          <ColorSwatch src={g.renkResimleri[r]} editable={false} size={18} /> {olcuGoster(r)}
                                        </td>
                                        {bedenler.map((b) => {
                                          // HATA DÜZELTMESİ: burada `find` kullanılıyordu ve aynı renk/beden için
                                          // birden fazla hareket varsa YALNIZCA İLKİ gösteriliyordu.
                                          //
                                          // Bu durum kural dışı değil, olağan: reçetede her mamul beden için ayrı
                                          // satır bulunur ve tüketim satır satır işlenir. Bedensiz bir hammadde
                                          // (tek renk/beden varyantı) 5 mamul bedeni için kullanıldığında AYNI
                                          // varyanta 5 ayrı hareket yazılır. Ekranda bunlardan biri (−1) görünüyor,
                                          // gerçekte düşülen ise toplamıydı (−8) — stok doğru düşüyordu, GÖSTERİM
                                          // yanlıştı. Artık hepsi toplanır.
                                          const eslesenler = g.hareketler.filter((x) => x.renk === r && x.beden === b);
                                          const toplam = Math.round(eslesenler.reduce((s, x) => s + x.miktar, 0) * 1000) / 1000;
                                          return (
                                            <td key={b} style={{ textAlign: "center" }}>
                                              {eslesenler.length > 0 ? (
                                                <span
                                                  className="mono"
                                                  title={
                                                    eslesenler.length > 1
                                                      ? `${eslesenler.length} hareketin toplamı: ${eslesenler.map((x) => x.miktar).join(" + ")}`
                                                      : undefined
                                                  }
                                                  style={{ fontSize: 11, fontWeight: 700, color: toplam < 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}
                                                >
                                                  {toplam > 0 ? "+" : ""}{toplam}
                                                  {eslesenler.length > 1 && (
                                                    <span style={{ fontSize: 9, fontWeight: 400, color: "var(--erp-text-3)" }}> ({eslesenler.length})</span>
                                                  )}
                                                </span>
                                              ) : (
                                                <span className="mono" style={{ fontSize: 11, color: "var(--erp-border)" }}>—</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: "var(--erp-text-3)", fontSize: 11 }}>Bu proses için reçetede hammadde tanımlı değildi.</div>
                    )}
                    {!p.araProsesMi && atamalar.length > 0 && (() => {
                      // TAMAMLANMIŞ bir prosesin atamaları burada, açılan detayda listelenir.
                      // Geri alma düğmesi eskiden YALNIZCA "tamamlanmamış ve sıradaki" adımda
                      // çiziliyordu; bir proses bittiği anda liste kapanıyor ve geri alma yolu
                      // kalmıyordu. Oysa geri alma mantığı (uretimProsesAtamaTeslimGeriAl)
                      // tamamlanmış adımları da destekliyor — eksik olan yalnızca düğmeydi.
                      //
                      // Kural: sonraki adımların hiçbiri başlamamış olmalı. Başlamışsa düğme yerine
                      // SEBEBİ yazılır; düğmeyi gösterip tıklandığında reddetmek, nedenini ancak
                      // deneyince öğreten bir tasarım olurdu.
                      const sonrakilerBaslamamis = prosesIlerleme
                        .slice(i + 1)
                        .every((x) => !x.verildiMi && !x.tamamlandiMi && (!x.atamalar || x.atamalar.length === 0));
                      return (
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={{ color: "var(--erp-text-2)", fontWeight: 600, fontSize: 11 }}>Atamalar:</span>
                          {atamalar.map((a) => {
                            const personelAdi = ((cariler || []).find((c) => c.id === a.personelId) || {}).unvan || "—";
                            const urun2 = (stok || []).find((s) => s.id === o.urunId);
                            const ucret2 = urun2 && urun2.prosesUcretleri ? (urun2.prosesUcretleri[p.proses] || 0) : 0;
                            return (
                              <div key={a.id} style={{ color: "var(--erp-purple)", fontWeight: 600, fontSize: 11, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span>{personelAdi} · {a.miktar} adet × {ucret2} ₺ = {(a.miktar * ucret2).toLocaleString("tr-TR")} ₺</span>
                                {a.tamamlandiMi && (
                                  sonrakilerBaslamamis ? (
                                    <button
                                      className="btn-ghost"
                                      style={{ padding: "2px 8px", fontSize: 10, marginLeft: "auto" }}
                                      title="Bu atamayı geri alır — düşülen hammadde stoğa döner, işçilik cariden silinir"
                                      onClick={(e) => { e.stopPropagation(); onProsesTeslimGeriAl(o.id, p.proses, a.id); }}
                                    >
                                      Geri Al
                                    </button>
                                  ) : (
                                    <span
                                      style={{ marginLeft: "auto", fontSize: 10, fontWeight: 400, color: "var(--erp-text-3)" }}
                                      title="Geri almak için önce sonraki proseslerdeki atamaları geri almalısınız"
                                    >
                                      sonraki proses başladı
                                    </span>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {p.araProsesMi && prosesIlerleme.slice(i + 1).every((x) => !x.verildiMi && !x.tamamlandiMi && (!x.atamalar || x.atamalar.length === 0)) && (
                      <button
                        className="btn-ghost"
                        style={{ padding: "4px 10px", fontSize: 11, marginTop: 8 }}
                        title="Bu ara prosesin otomatik tamamlanmasını geri alır"
                        onClick={(e) => { e.stopPropagation(); onProsesTeslimGeriAl(o.id, p.proses, null); }}
                      >
                        Bu Ara Prosesi Geri Al
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
            )}

            {/* HAMMADDE İHTİYACI — bu üretimin reçeteye göre tüketeceği malzemeler.
                Prosesler sekmesinde her atamanın altında parça parça görünüyordu; bütünü
                görmek için hepsini açmak gerekiyordu. */}
            {kartSekme === "hammadde" && (() => {
              const urun = (stok || []).find((p2) => p2.id === o.urunId);
              if (!urun || !(urun.recete || []).length) {
                return <div style={{ fontSize: 12, color: "var(--erp-text-3)", padding: "10px 2px" }}>Bu ürünün reçetesi yok.</div>;
              }
              // Reçete × üretim adedi. Beden bazlı satırlar ilgili bedenin adediyle,
              // "Tüm Bedenler" satırları toplam adetle çarpılır.
              const toplamAdet = (o.bedenMiktarlari || []).reduce((t, bm) => t + bm.miktar, 0);
              const index = {};
              const liste = [];
              (urun.recete || [])
                .filter((r) => r.mamulRenk === o.renk)
                .forEach((r) => {
                  const adet = r.mamulBeden === "Tüm Bedenler"
                    ? toplamAdet
                    : ((o.bedenMiktarlari || []).find((bm) => bm.beden === r.mamulBeden) || {}).miktar || 0;
                  if (!adet) return;
                  const etkinRenk = ambalajRengiUygula(r, o, stok);
                  const anahtar = `${r.hammaddeUrunId}|${etkinRenk}|${r.beden}|${r.proses || ""}`;
                  if (!(anahtar in index)) {
                    index[anahtar] = liste.length;
                    liste.push({
                      ad: r.hammaddeAd, renk: etkinRenk, beden: r.beden, proses: r.proses || "",
                      birim: hammaddeBirimi(r.hammaddeUrunId, stok, r.birim), miktar: 0,
                      // HESABIN PARÇALARI: sonuç tek başına doğrulanamıyor. "88 Desi" doğru mu
                      // yanlış mı anlamak için reçetedeki birim miktarı ve üretilen adedi
                      // bilmek gerekiyor; ikisini de taşıyoruz ki ekranda "8 × 11 = 88" yazsın.
                      // `birimMiktar` yalnızca TEK bir reçete satırından geliyorsa anlamlı:
                      // aynı hammadde farklı bedenlerde farklı miktarda kullanılabiliyor, o
                      // durumda tek bir çarpan yoktur ve gösterilmez.
                      birimMiktar: null, adet: 0, satirSayisi: 0,
                    });
                  }
                  const kayit = liste[index[anahtar]];
                  kayit.miktar = stokYuvarla(kayit.miktar + r.miktar * adet);
                  kayit.adet += adet;
                  kayit.satirSayisi += 1;
                  // İlk satırda çarpanı al; sonraki satırlar farklı çarpan getirirse iptal et.
                  if (kayit.satirSayisi === 1) kayit.birimMiktar = r.miktar;
                  else if (kayit.birimMiktar !== r.miktar) kayit.birimMiktar = null;
                });
              if (liste.length === 0) {
                return <div style={{ fontSize: 12, color: "var(--erp-text-3)", padding: "10px 2px" }}>Bu renk için reçete satırı yok.</div>;
              }
              // Matris görünümü ayrı bir bileşende: aynı düzen sipariş kartında ve ihtiyaç
              // planlamada da kullanılıyor, üç yerde kopyalanan bir tablo üçe ayrışır.
              return <IhtiyacMatrisi kalemler={liste} tanimlarProsesler={tanimlarProsesler} />;
            })()}

            {/* FİRE VE TAMİR — hangi proseste, kim, kaç çift, hangi sebeple. */}
            {kartSekme === "fire" && (() => {
              const satirlar = [];
              (o.prosesIlerleme || []).forEach((p2) => {
                (p2.atamalar || []).forEach((a) => {
                  const s2 = atamaSonucu(a);
                  const kisi = (cariler || []).find((c) => c.id === a.personelId);
                  s2.hurda.forEach((h) => satirlar.push({ tur: "Hurda", proses: p2.proses, kisi: kisi ? kisi.unvan : "—", beden: h.beden, miktar: h.miktar, sebep: h.sebep || "—" }));
                  s2.tamir.forEach((t) => satirlar.push({ tur: "Tamir", proses: p2.proses, kisi: kisi ? kisi.unvan : "—", beden: t.beden, miktar: t.miktar, sebep: t.sebep || "—" }));
                });
              });
              if (satirlar.length === 0) {
                return <div style={{ fontSize: 12, color: "var(--erp-text-3)", padding: "10px 2px" }}>Bu üretimde fire yok.</div>;
              }
              return (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ fontSize: 11, textAlign: "left", padding: "5px 8px", color: "var(--erp-text-2)" }}>TÜR</th>
                        <th style={{ fontSize: 11, textAlign: "left", padding: "5px 8px", color: "var(--erp-text-2)" }}>PROSES</th>
                        <th style={{ fontSize: 11, textAlign: "left", padding: "5px 8px", color: "var(--erp-text-2)" }}>PERSONEL</th>
                        <th style={{ fontSize: 11, textAlign: "center", padding: "5px 8px", color: "var(--erp-text-2)" }}>BEDEN</th>
                        <th style={{ fontSize: 11, textAlign: "right", padding: "5px 8px", color: "var(--erp-text-2)" }}>ADET</th>
                        <th style={{ fontSize: 11, textAlign: "left", padding: "5px 8px", color: "var(--erp-text-2)" }}>SEBEP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {satirlar.map((x, xi) => (
                        <tr key={xi} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                          <td style={{ padding: "6px 8px" }}>
                            <span className="mono" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: x.tur === "Hurda" ? "#B85C2E22" : "#B8860B22", color: x.tur === "Hurda" ? "var(--erp-warn)" : "#B8860B" }}>
                              {x.tur}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, padding: "6px 8px" }}>{x.proses}</td>
                          <td style={{ fontSize: 12, padding: "6px 8px" }}>{x.kisi}</td>
                          <td className="mono" style={{ fontSize: 12, textAlign: "center", padding: "6px 8px" }}>{x.beden}</td>
                          <td className="mono" style={{ fontSize: 13, fontWeight: 700, textAlign: "right", padding: "6px 8px" }}>{x.miktar}</td>
                          <td style={{ fontSize: 12, color: "var(--erp-text-2)", padding: "6px 8px" }}>{x.sebep}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </>
        );
      })()}
    </div>
  );
}

