// ⚠ YEDEK KAYNAK (24 Eylül, v1.444.0 oturumu): Bu parça gelen src zip'inde YOKTU. Yayındaki
// atolye-erp-v1.444.0.html içinden DERLENMİŞ hâliyle (React.createElement) geri çıkarıldı —
// davranış birebir aynı, ama JSX biçimi kayıp. Asıl .jsx bulunursa bununla DEĞİŞTİRİLMELİ.
// ================= KOLİDEN FİŞ SATIRI (23 Eylül, v1.420.0) =================
//
// Kullanıcı: "Koliler siparişe bağlı aslında; hangi sipariş için yaptığımız belli. Koli üzerinde
// adı, hangi siparişten ve üretimden geldiği yazıyor — yapıyı buna göre kurmuştuk. Koli okutulunca
// direkt cariyi seçip koliyi eklesin; farklı müşterilerin kolileri varsa ayrı fişler atsın.
// 'Koliden ekle' mantığı cari içinden satış açınca da olsun, aynı yere çıksın."
//
// v1.415/416'daki sevkiyat ekranı siparişi yalnız `koli.siparisId`den arıyordu. Oysa koli
// üretimden kurulduğunda sipariş ÜRETİM üzerinden bellidir: üretim numarası, satış siparişinin
// planlama referansı (`kalem.planlama.referansNo`). Cari de kolide (`koli.cariId`). Bu dosya o
// zinciri TEK yerde çözüyor; cari fişi de depo sevkiyatı da buradan geçiyor.
//
// Çözüm sırası (ilk tutan kazanır):
//   1) koli.siparisId
//   2) koli.uretimId → üretim.siparisNo → satış siparişinde planlama.referansNo eşleşmesi
//   3) kolinin carisinin açık satış siparişleri içinde koli içeriğini (ürün+renk+beden) karşılayan
// Hiçbiri yoksa satırlar SERBEST yazılır: stok ve cari hareketi olur, sipariş sayacı işlemez.
// Bu da meşru bir sevk — müşteri sipariş açtırmadan gelip mal almış olabilir.
function satisPbKodu(urun) {
    const ham = String((urun && urun.satisParaBirimi) || "").trim();
    if (!ham || ham === "₺" || ham === "TL" || ham === "TRY")
        return "TRY";
    const esleme = { "$": "USD", "€": "EUR", "£": "GBP", USD: "USD", EUR: "EUR", GBP: "GBP" };
    return esleme[ham] || ham.toUpperCase();
}
function koliSiparisiniCoz(koli, siparisler, uretim) {
    const satis = (s) => s && s.tip === "Satış" && s.durum !== "İptal";
    const dogrudan = (siparisler || []).find((s) => s.id === koli.siparisId);
    if (satis(dogrudan))
        return { siparis: dogrudan, yol: "koli" };
    if (koli.uretimId) {
        const ur = (uretim || []).find((u) => u.id === koli.uretimId);
        if (ur) {
            const uzerinden = (siparisler || []).find((s) => satis(s)
                && (s.kalemler || []).some((k) => k.planlama && k.planlama.referansNo === ur.siparisNo));
            if (uzerinden)
                return { siparis: uzerinden, yol: "üretim" };
        }
    }
    if (koli.cariId) {
        const eslesen = (siparisler || []).filter((s) => satis(s) && s.cariId === koli.cariId)
            .map((s) => ({ s, puan: (koli.kalemler || []).reduce((t, k) => {
                const kalem = (s.kalemler || []).find((sk) => sk.urunId === k.urunId && sk.renk === k.renk && sk.beden === k.beden);
                return t + (kalem ? Math.min(k.adet || 0, stokYuvarla((kalem.miktar || 0) - (kalem.karsilanan || 0))) : 0);
            }, 0) }))
            .filter((x) => x.puan > 0).sort((a, b) => b.puan - a.puan);
        if (eslesen[0])
            return { siparis: eslesen[0].s, yol: "içerik" };
    }
    return { siparis: null, yol: "serbest" };
}
// Kolinin carisi: kolide yazılı, yoksa çözülen siparişten.
function koliCarisiniCoz(koli, siparisler, uretim) {
    if (koli.cariId)
        return koli.cariId;
    const { siparis } = koliSiparisiniCoz(koli, siparisler, uretim);
    return siparis ? siparis.cariId : "";
}
// Koli kalemlerini fiş satırlarına çevirir. Eşleşen sipariş satırı varsa satır ona bağlanır
// (`siparis` + `kalemId`, sipariş kartındaki "siparişten seç" ile aynı biçim); yoksa serbest.
// Fiyat: sipariş satırından; yoksa ürün kartının satış fiyatı.
function koliKalemleriniFisSatirinaCevir(koli, { siparisler, uretim, stok, mevcutKalemler = [] }) {
    const { siparis, yol } = koliSiparisiniCoz(koli, siparisler, uretim);
    const satirlar = [];
    const uyarilar = [];
    (koli.kalemler || []).forEach((k) => {
        const urun = (stok || []).find((u) => u.id === k.urunId);
        const kalem = siparis ? (siparis.kalemler || []).find((sk) => sk.urunId === k.urunId && sk.renk === k.renk && sk.beden === k.beden) : null;
        const zatenFiste = mevcutKalemler.some((m) => m.koliId === koli.id && m.urunId === k.urunId && m.renk === k.renk && m.beden === k.beden);
        if (zatenFiste)
            return;
        const kalan = kalem ? stokYuvarla((kalem.miktar || 0) - (kalem.karsilanan || 0)) : 0;
        if (siparis && !kalem)
            uyarilar.push(`${k.urunAd} · ${k.renk} · ${k.beden}: siparişte yok, serbest yazıldı`);
        if (kalem && (k.adet || 0) > kalan)
            uyarilar.push(`${k.urunAd} · ${k.renk} · ${k.beden}: siparişte kalan ${kalan}, kolide ${k.adet}`);
        satirlar.push({
            id: uid("fkalem"), koliId: koli.id, koliKod: koli.kod,
            urunId: k.urunId, urunAd: k.urunAd || (urun && urun.ad) || "", birim: (urun && urun.birim) || "çift",
            renk: k.renk || "", beden: k.beden || "", miktar: k.adet || 0,
            birimFiyat: kalem ? (kalem.birimFiyat || 0) : ((urun && (urun.satisFiyati || urun.birimFiyat)) || 0),
            // Ürün kartı para birimini SİMGEYLE tutuyor ("₺", "$"); fiş KOD ister ("TRY"). Simge geçseydi
            // kapı "Kur bulunamadı (₺ → TRY)" diye reddediyordu (senaryoda yakalandı).
            paraBirimi: kalem ? (kalem.paraBirimi || "TRY") : satisPbKodu(urun),
            ...(kalem ? { kalemId: kalem.id, siparis: { id: siparis.id, siparisNo: siparis.siparisNo, rezervasyonSiparisId: siparis.rezervasyonSiparisId || null } } : {}),
        });
    });
    return { satirlar, siparis, yol, uyarilar };
}
