// ⚠ YEDEK KAYNAK (24 Eylül, v1.444.0 oturumu): Bu parça gelen src zip'inde YOKTU. Yayındaki
// atolye-erp-v1.444.0.html içinden DERLENMİŞ hâliyle (React.createElement) geri çıkarıldı —
// davranış birebir aynı, ama JSX biçimi kayıp. Asıl .jsx bulunursa bununla DEĞİŞTİRİLMELİ.
// ================= DEPO > SEVKİYAT (22 Eylül, v1.415.0) =================
//
// Kullanıcı: "depoya sevkiyat ekleyelim, depodan sevk etmek için, hem barkod okuyucuyu kullanarak,
// kolilenmiş ürünler vs okutarak sevk ederiz; sevkiyat logosu kamyonet olsun."
//
// BUGÜNE KADAR sevkiyat SİPARİŞTEN başlıyordu: sipariş kartı → fiş oluştur → koli barkodunu okut →
// kaydet. Depoda duran kişinin elinde ise sipariş değil KOLİ var. Bu ekran yönü tersine çeviriyor:
// koliyi okut, sipariş kendiliğinden bulunsun.
//
// STOK VE SİPARİŞ KAYITLARINI BU EKRAN YAZMIYOR. Okutulan koliler siparişe göre gruplanıp aynı
// kapıdan (`siparisGerceklestir`) geçiyor: fiş defteri, stok hareketi, cari hareketi, karşılanan
// sayacı ve kolinin "Sevk edildi" durumu hep o kapının işi. İkinci bir yazma yolu açmak, iki ayrı
// sevkiyat mantığı demekti (biri fişsiz sevk eder, fark aylar sonra denetimde çıkardı).
//
// KOLİ, SİPARİŞSİZ OLABİLİR (paketlemede sipariş seçilmeden kurulmuş). Böyle koli BU EKRANDAN sevk
// edilmiyor: hangi siparişin karşılandığı belli değilken fiş kesmek, karşılanan sayacını yanlış
// yere yazmak demek. Ekran bunu söylüyor ve koliyi ayrı başlıkta gösteriyor.
// GRUPLAMA CARİYE GÖRE (23 Eylül, v1.420.0 — kullanıcı: "koli okutulunca direkt cariyi seçsin;
// farklı müşterilerin kolileri varsa ayrı fişler atsın"). v1.415/416 siparişe göre gruplayıp
// siparişsiz koliyi reddediyordu; oysa koli cariyi ve üretimi taşıyor, sipariş oradan çözülüyor
// (237-koli-fis). Şimdi: her cari bir fiş; satırlar çözülen siparişe bağlı, çözülemeyen serbest.
function sevkiyatGruplari(okutulanIdler, koliler, siparisler, cariler, uretim, stok) {
    const gruplar = new Map();
    const carisizler = [];
    okutulanIdler.forEach((id) => {
        const koli = (koliler || []).find((k) => k.id === id);
        if (!koli || (koli.durum || "Hazır") === "Sevk edildi")
            return; // fişte kaydedildi → listeden düşer
        const cariId = koliCarisiniCoz(koli, siparisler, uretim);
        if (!cariId) {
            carisizler.push(koli);
            return;
        }
        if (!gruplar.has(cariId))
            gruplar.set(cariId, { cariId, cari: (cariler || []).find((c) => c.id === cariId), koliler: [], satirlar: [], uyarilar: [], siparisler: new Set() });
        const g = gruplar.get(cariId);
        const { satirlar, siparis, uyarilar } = koliKalemleriniFisSatirinaCevir(koli, { siparisler, uretim, stok, mevcutKalemler: g.satirlar });
        g.koliler.push(koli);
        g.satirlar.push(...satirlar);
        g.uyarilar.push(...uyarilar.map((u) => `${koli.kod}: ${u}`));
        if (siparis)
            g.siparisler.add(siparis.siparisNo);
    });
    return { gruplar: [...gruplar.values()], carisizler };
}
function SevkiyatEkrani({ koliler, siparisler, cariler, stok, tanimlar, uretim, onFisAc, showToast, onGoToSiparis }) {
    const [okutulan, setOkutulan] = useState([]); // koli id'leri, okutma sırasıyla
    const [sonGonderi, setSonGonderi] = useState(null);
    const okut = useCallback((ham) => {
        const kod = String(ham || "").trim();
        if (!kod)
            return;
        const koli = (koliler || []).find((k) => (k.kod || "").toLocaleUpperCase("tr") === kod.toLocaleUpperCase("tr"));
        if (!koli) {
            // Ürün etiketi okutulmuş olabilir: sebebini söyle, sessiz kalma.
            const urunMu = /^90\d+$/.test(kod) && urunBarkoduCoz(kod, stok, tanimlar);
            showToast(urunMu
                ? "Bu bir ÜRÜN etiketi — sevkiyatta koli barkodu okutulur (Paketleme'de koli kurun ya da sipariş kartından fiş kesin)"
                : `Koli bulunamadı: ${kod}`);
            return;
        }
        if ((koli.durum || "Hazır") === "Sevk edildi") {
            showToast(`${koli.kod} zaten sevk edilmiş${koli.sevkFisNo ? ` (${koli.sevkFisNo})` : ""}`);
            return;
        }
        setOkutulan((o) => {
            if (o.includes(koli.id)) {
                showToast(`${koli.kod} zaten listede`);
                return o;
            }
            showToast(`${koli.kod} eklendi`);
            return [...o, koli.id];
        });
    }, [koliler, stok, tanimlar, showToast]);
    const { gruplar, carisizler } = sevkiyatGruplari(okutulan, koliler, siparisler, cariler, uretim, stok);
    const toplamCift = gruplar.reduce((t, g) => t + g.satirlar.reduce((x, s) => x + s.miktar, 0), 0);
    // KÖPRÜ (23 Eylül, v1.422.0 — kullanıcı: "satış ekranı tek olsun; depodan da siparişten de
    // cariden de satış deyince tek ekran açılsın, farklı yerler yalnız köprü olsun"). Bu ekran artık
    // fiş KAYDETMİYOR: okutulan kolilerin satırlarıyla cari SATIŞ FİŞİ penceresini açıyor
    // (`stokFisiAc`, cari kartındaki "Satış Fişi" ile aynı pencere, aynı kayıt kapısı). Kullanıcı
    // fiyat, ödeme, peşin, açıklama gibi alanları orada görüp kaydediyor. Koli listeden pencere
    // açılınca düşer; fiş kaydedilmezse koli "Hazır" kaldığı için yeniden okutulabilir.
    const grubuFiseTasi = (g) => {
        if (!g.satirlar.length)
            return showToast("Sevk edilecek satır yok");
        onFisAc(g.cariId, "Satış", (g.cari && g.cari.unvan) || "", g.satirlar);
        const idler = g.koliler.map((k) => k.id);
        setOkutulan((o) => o.filter((id) => !idler.includes(id)));
        setSonGonderi({ cari: (g.cari && g.cari.unvan) || "—", koli: g.koliler.length, cift: g.satirlar.reduce((x, s) => x + s.miktar, 0) });
    };
    const hepsiniSevkEt = () => {
        gruplar.forEach(grubuFiseTasi); // her cari kendi fiş penceresini alır
    };
    const sayi = (n) => stokYuvarla(n || 0).toLocaleString("tr-TR");
    return (React.createElement("div", { "data-sevkiyat": "1", style: { display: "grid", gap: 12, maxWidth: 900 } },
        React.createElement(KameraOkuyucu, { onKod: okut }),
        React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } },
            React.createElement(BarkodGirdisi, { onKod: okut, placeholder: "Koli barkodu okutun ya da yaz\u0131n", ikon: Truck, veriAdi: "data-sevk-girdi" }),
            okutulan.length > 0 && (React.createElement(React.Fragment, null,
                React.createElement("span", { style: { fontSize: 12, color: "var(--erp-text-2)" } },
                    React.createElement("b", null, okutulan.length),
                    " koli \u00B7 ",
                    React.createElement("b", null, sayi(toplamCift)),
                    " \u00E7ift"),
                React.createElement("button", { type: "button", className: "btn-ghost", style: { padding: "4px 10px", fontSize: 12 }, onClick: () => setOkutulan([]) }, "Listeyi temizle"),
                gruplar.length > 1 && (React.createElement("button", { type: "button", className: "btn-primary", "data-sevk-hepsi": "1", style: { padding: "5px 12px", fontSize: 12 }, onClick: hepsiniSevkEt },
                    React.createElement(Truck, { size: 13 }),
                    " Hepsinin fi\u015Fini a\u00E7 (",
                    gruplar.length,
                    " cari)"))))),
        sonGonderi && (React.createElement("div", { "data-sevk-sonuc": "1", style: { fontSize: 12, padding: 8, background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)" } },
            React.createElement("b", null, sonGonderi.cari),
            " i\u00E7in sat\u0131\u015F fi\u015Fi a\u00E7\u0131ld\u0131 \u00B7 ",
            sonGonderi.koli,
            " koli \u00B7 ",
            sayi(sonGonderi.cift),
            " \u00E7ift. Fi\u015Fi kontrol edip kaydedin; kaydedilmezse koliler \"Haz\u0131r\" kal\u0131r, yeniden okutabilirsiniz.")),
        gruplar.map((g) => {
            const grupCift = g.satirlar.reduce((x, s) => x + s.miktar, 0);
            const bagli = g.satirlar.filter((s) => s.kalemId).length;
            return (React.createElement("div", { key: g.cariId, "data-sevk-grup": (g.cari && g.cari.unvan) || g.cariId, style: { border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", background: "#fff", padding: 10, display: "grid", gap: 8 } },
                React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
                    React.createElement("b", { style: { fontSize: 14 } }, (g.cari && g.cari.unvan) || "—"),
                    [...g.siparisler].map((no) => React.createElement("span", { key: no, className: "mono", style: { fontSize: 11, color: "var(--erp-text-2)" } }, no)),
                    React.createElement("span", { style: { fontSize: 12, color: "var(--erp-text-3)" } },
                        g.koliler.length,
                        " koli \u00B7 ",
                        sayi(grupCift),
                        " \u00E7ift \u00B7 ",
                        bagli,
                        "/",
                        g.satirlar.length,
                        " sat\u0131r sipari\u015Fe ba\u011Fl\u0131"),
                    React.createElement("button", { type: "button", className: "btn-primary", "data-sevk-et": (g.cari && g.cari.unvan) || g.cariId, style: { marginLeft: "auto", padding: "5px 12px", fontSize: 12 }, onClick: () => grubuFiseTasi(g) },
                        React.createElement(Truck, { size: 13 }),
                        " Sat\u0131\u015F fi\u015Fini a\u00E7")),
                React.createElement("div", { style: { fontSize: 11, color: "var(--erp-text-3)" } },
                    "Koliler: ",
                    g.koliler.map((k) => k.kod).join(", ")),
                React.createElement("div", { style: { overflowX: "auto" } },
                    React.createElement("table", { style: { borderCollapse: "collapse", minWidth: "100%" } },
                        React.createElement("thead", null,
                            React.createElement("tr", { style: { fontSize: 10, color: "var(--erp-text-3)" } },
                                React.createElement("th", { style: { textAlign: "left", padding: "2px 6px" } }, "KOL\u0130"),
                                React.createElement("th", { style: { textAlign: "left", padding: "2px 6px" } }, "\u00DCR\u00DCN"),
                                React.createElement("th", { style: { textAlign: "left", padding: "2px 6px" } }, "RENK"),
                                React.createElement("th", { style: { textAlign: "left", padding: "2px 6px" } }, "BEDEN"),
                                React.createElement("th", { style: { textAlign: "right", padding: "2px 6px" } }, "SEVK"),
                                React.createElement("th", { style: { textAlign: "left", padding: "2px 6px" } }, "S\u0130PAR\u0130\u015E"))),
                        React.createElement("tbody", null, g.satirlar.map((s) => (React.createElement("tr", { key: s.id, "data-sevk-satir": `${s.koliKod}|${s.beden}`, style: { borderTop: "1px solid #F0E8D8" } },
                            React.createElement("td", { className: "mono", style: { padding: "3px 6px", fontSize: 11 } }, s.koliKod),
                            React.createElement("td", { style: { padding: "3px 6px", fontSize: 12 } }, s.urunAd),
                            React.createElement("td", { style: { padding: "3px 6px", fontSize: 12 } }, s.renk),
                            React.createElement("td", { style: { padding: "3px 6px", fontSize: 12 } }, s.beden),
                            React.createElement("td", { className: "mono", style: { padding: "3px 6px", fontSize: 12, textAlign: "right", fontWeight: 700 } }, sayi(s.miktar)),
                            React.createElement("td", { className: "mono", style: { padding: "3px 6px", fontSize: 11, color: s.siparis ? "var(--erp-text-2)" : "var(--erp-warn)" } }, s.siparis ? s.siparis.siparisNo : "serbest"))))))),
                g.uyarilar.length > 0 && (React.createElement("div", { style: { fontSize: 11, color: "var(--erp-warn)" } },
                    "\u26A0 ",
                    g.uyarilar.join(" · ")))));
        }),
        carisizler.length > 0 && (React.createElement("div", { "data-sevk-carisiz": "1", style: { border: "1px solid #E4B8A8", background: "#FBEFEA", borderRadius: "var(--erp-r-md)", padding: 10, fontSize: 12 } },
            React.createElement("b", null, "Carisi belli olmayan koliler:"),
            " ",
            carisizler.map((k) => k.kod).join(", "),
            ". Kolide ne m\u00FC\u015Fteri ne sipari\u015F ne \u00FCretim ba\u011F\u0131 var. Cari kart\u0131ndan sat\u0131\u015F fi\u015Fi a\u00E7\u0131p orada okutun (koli o cariye yaz\u0131l\u0131r) ya da Paketleme'de koliyi ba\u011Flay\u0131n.",
            carisizler.map((k) => (React.createElement("button", { key: k.id, type: "button", className: "btn-ghost", style: { marginLeft: 8, padding: "2px 8px", fontSize: 11 }, onClick: () => setOkutulan((o) => o.filter((x) => x !== k.id)) },
                k.kod,
                " listeden \u00E7\u0131kar"))))),
        okutulan.length === 0 && (React.createElement("div", { style: { fontSize: 12, color: "var(--erp-text-3)" } }, "Sevk edilecek kolileri okutun. Koliler m\u00FC\u015Fterisine g\u00F6re gruplan\u0131r; her m\u00FC\u015Fteri i\u00E7in ayr\u0131 sat\u0131\u015F fi\u015Fi kesilir. Sat\u0131rlar kolinin sipari\u015Fine ba\u011Flan\u0131r (koli \u203A \u00FCretim \u203A sipari\u015F); sipari\u015F bulunamazsa serbest yaz\u0131l\u0131r. \"Sat\u0131\u015F fi\u015Fini a\u00E7\" cari kart\u0131ndaki sat\u0131\u015F fi\u015Fi penceresini a\u00E7ar \u2014 kay\u0131t orada, tek yerden."))));
}
