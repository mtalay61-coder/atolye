// ⚠ YEDEK KAYNAK (24 Eylül, v1.444.0 oturumu): Bu parça gelen src zip'inde YOKTU. Yayındaki
// atolye-erp-v1.444.0.html içinden DERLENMİŞ hâliyle (React.createElement) geri çıkarıldı —
// davranış birebir aynı, ama JSX biçimi kayıp. Asıl .jsx bulunursa bununla DEĞİŞTİRİLMELİ.
// ================= DEPO OKUT — SORGULA (22 Eylül, v1.411.0) =================
//
// Kullanıcı: "Depoda barkod okutma nasıl olacak?" → karar: önce SORGULA, sonra SAY (sayım);
// cihaz TELEFON KAMERASI.
//
// SORGULA SALT OKUMADIR: hiçbir veriye yazmaz. Yanlış okutmanın bedeli yalnız yanlış bir ekrandır.
// Okutulan barkodun seviyesine göre (ürün / renk / beden / asorti) o malın depodaki hâli:
//   mamul    → beden matrisi: stok, kolide, serbest, üretimde, talep, açık + bekleyen siparişler
//   hammadde → renk/beden satırları: stok, rezerve, serbest, yolda
//   ikisi    → son hareketler, ürün kartına git
//
// KAMERA: önce tarayıcının `BarcodeDetector`ı (Android Chrome — hızlı); yoksa (iPhone Safari)
// kendi Code128 çözücümüz (`kameraKaresiCoz`, 077-barkod). İkisinde de sonuç `urunBarkoduCoz`dan
// geçer; tanınmayan kod ürün göstermez. Aynı kod 2 sn içinde tekrar gelirse yok sayılır (kamera
// aynı etiketi her karede görür). Elle yazma kutusu da var: USB/Bluetooth okuyucu klavye gibi yazar.
// ORTAK BARKOD GİRDİSİ (23 Eylül, v1.422.0 — kullanıcı: "koli barkodu yazınca tepki vermiyor").
// `onKeyDown` Enter'ı Android klavyesinde çoğu zaman GÖRMÜYOR: Gboard yazımı "composition" olarak
// gönderiyor, keydown `key` değeri "Unidentified"/"Process" geliyor. Form gönderimi ise hem
// klavyenin "Git/Bitti" tuşuyla hem USB/Bluetooth okuyucunun Enter'ıyla tetikleniyor. Ayrıca açık
// bir "Ekle" düğmesi var: hiçbir klavye davranışına bağımlı kalmasın. Üç yerde aynı bileşen
// (Depo Okut, Depo Sevkiyat, satış fişi) — biri düzelince hepsi düzelsin.
function BarkodGirdisi({ onKod, placeholder, ikon: Ikon, veriAdi, dugme = "Ekle", style }) {
    const [deger, setDeger] = useState("");
    const gonder = (e) => {
        if (e)
            e.preventDefault();
        const kod = deger.trim();
        if (!kod)
            return;
        onKod(kod);
        setDeger("");
    };
    return (React.createElement("form", { onSubmit: gonder, style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", ...style } },
        Ikon && React.createElement(Ikon, { size: 16, style: { color: "var(--erp-text-3)" } }),
        React.createElement("input", { ...(veriAdi ? { [veriAdi]: "1" } : {}), value: deger, onChange: (e) => setDeger(e.target.value), placeholder: placeholder, inputMode: "text", autoComplete: "off", autoCorrect: "off", autoCapitalize: "off", spellCheck: false, enterKeyHint: "go", style: { flex: "1 1 220px", maxWidth: 380, padding: "7px 10px" } }),
        React.createElement("button", { type: "submit", className: "btn-ghost", "data-barkod-ekle": "1", style: { padding: "6px 12px", fontSize: 12 } }, dugme)));
}
function KameraOkuyucu({ onKod }) {
    const videoRef = useRef(null);
    const tuvalRef = useRef(null);
    const akisRef = useRef(null);
    const sonRef = useRef({ kod: "", zaman: 0 });
    const onKodRef = useRef(onKod);
    onKodRef.current = onKod;
    const [durum, setDurum] = useState("kapali"); // kapali | aciliyor | acik | hata
    const [hata, setHata] = useState("");
    const [yontem, setYontem] = useState("");
    const kapat = useCallback(() => {
        if (akisRef.current) {
            akisRef.current.getTracks().forEach((t) => t.stop());
            akisRef.current = null;
        }
        setDurum("kapali");
    }, []);
    useEffect(() => () => { if (akisRef.current)
        akisRef.current.getTracks().forEach((t) => t.stop()); }, []);
    // GÜVENLİ ADRES ŞARTI (22 Eylül, v1.412.0 — kullanıcının telefonunda görüldü): indirilen HTML
    // Chrome'da `content://media/...` adresiyle açılıyor; tarayıcı bu sayfaya kamera iznini SORMADAN
    // reddediyor ve "izin verilmedi" mesajı yanıltıyordu (ayarlarda verilecek bir izin yok). Kamera
    // yalnız https (ya da yerel file://) sayfada çalışır; öyle değilse denemeden ne yapılacağı söylenir.
    const guvensizAdres = () => {
        const p = window.location.protocol;
        return p === "content:" || (window.isSecureContext === false && p !== "file:");
    };
    const ADRES_MESAJI = (window.location.protocol === "content:"
        ? "Uygulama indirilen dosyadan açılmış (content://). "
        : "Uygulama güvenli olmayan bir adresten açılmış (" + window.location.protocol + "//). ") + "Telefon tarayıcıları " +
        "kamerayı yalnız https adresinden açılan sayfaya verir. Uygulamayı kendi bağlantısından (baslat.html / " +
        "Storage adresi, https://…) açın; o bağlantıyı ana ekrana ekleyebilirsiniz.";
    const ac = async () => {
        setHata("");
        if (guvensizAdres()) {
            setDurum("hata");
            setHata(ADRES_MESAJI);
            return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setDurum("hata");
            setHata(ADRES_MESAJI);
            return;
        }
        setDurum("aciliyor");
        try {
            const akis = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
            });
            akisRef.current = akis;
            const v = videoRef.current;
            v.srcObject = akis;
            await v.play();
            setDurum("acik");
        }
        catch (e) {
            setDurum("hata");
            setHata(/NotAllowed|Permission/i.test(String(e && e.name))
                ? (window.location.protocol !== "https:" && window.location.protocol !== "file:"
                    ? ADRES_MESAJI
                    : "Kamera izni verilmedi. Adres çubuğundaki kilit simgesi > İzinler > Kamera: İzin ver, sonra tekrar deneyin.")
                : `Kamera açılamadı: ${(e && e.message) || e}`);
        }
    };
    // Okuma döngüsü — kamera açıkken saniyede ~6 kare.
    useEffect(() => {
        if (durum !== "acik")
            return undefined;
        let dedektor = null;
        let iptal = false;
        (async () => {
            try {
                if (typeof window.BarcodeDetector !== "undefined") {
                    const bicimler = await window.BarcodeDetector.getSupportedFormats();
                    if (bicimler.includes("code_128"))
                        dedektor = new window.BarcodeDetector({ formats: ["code_128"] });
                }
            }
            catch (e) {
                dedektor = null;
            }
            if (!iptal)
                setYontem(dedektor ? "cihaz" : "yerlesik");
        })();
        let mesgul = false;
        const z = setInterval(async () => {
            const v = videoRef.current;
            if (mesgul || !v || v.readyState < 2 || !v.videoWidth)
                return;
            mesgul = true;
            try {
                let kod = null;
                if (dedektor) {
                    const bulunan = await dedektor.detect(v);
                    if (bulunan && bulunan[0])
                        kod = bulunan[0].rawValue;
                }
                else {
                    const t = tuvalRef.current;
                    const g = Math.min(960, v.videoWidth);
                    const y = Math.round((v.videoHeight / v.videoWidth) * g);
                    t.width = g;
                    t.height = y;
                    const c = t.getContext("2d", { willReadFrequently: true });
                    c.drawImage(v, 0, 0, g, y);
                    kod = kameraKaresiCoz(c.getImageData(0, 0, g, y));
                }
                if (kod) {
                    const simdi = Date.now();
                    if (!(kod === sonRef.current.kod && simdi - sonRef.current.zaman < 2000)) {
                        if (navigator.vibrate)
                            navigator.vibrate(60);
                        onKodRef.current(kod);
                    }
                    sonRef.current = { kod, zaman: simdi };
                }
            }
            catch (e) { /* tek karelik hata — sonraki kare */ }
            mesgul = false;
        }, 160);
        return () => { iptal = true; clearInterval(z); };
    }, [durum]);
    return (React.createElement("div", { "data-kamera-okuyucu": "1", style: { display: "grid", gap: 6 } },
        React.createElement("div", { style: { position: "relative", width: "100%", maxWidth: 520, aspectRatio: "16 / 9", background: "#1C1A17",
                borderRadius: "var(--erp-r-md)", overflow: "hidden", display: durum === "acik" || durum === "aciliyor" ? "block" : "none" } },
            React.createElement("video", { ref: videoRef, playsInline: true, muted: true, style: { width: "100%", height: "100%", objectFit: "cover" } }),
            React.createElement("div", { style: { position: "absolute", left: "8%", right: "8%", top: "50%", height: 2, background: "rgba(220,60,40,0.85)" } }),
            React.createElement("div", { style: { position: "absolute", left: "8%", right: "8%", top: "30%", bottom: "30%", border: "2px solid rgba(255,255,255,0.6)", borderRadius: 6 } })),
        React.createElement("canvas", { ref: tuvalRef, style: { display: "none" } }),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
            durum === "acik" || durum === "aciliyor" ? (React.createElement("button", { type: "button", className: "btn-ghost", "data-kamera-kapat": "1", onClick: kapat },
                React.createElement(X, { size: 14 }),
                " Kameray\u0131 kapat")) : (React.createElement("button", { type: "button", className: "btn-primary", "data-kamera-ac": "1", onClick: ac },
                React.createElement(Camera, { size: 14 }),
                " Kamerayla okut")),
            durum === "acik" && (React.createElement("span", { style: { fontSize: 11, color: "var(--erp-text-3)" } },
                "Barkodu k\u0131rm\u0131z\u0131 \u00E7izgiye yatay tutun",
                yontem === "yerlesik" ? " · yerleşik okuyucu" : yontem === "cihaz" ? " · cihaz okuyucusu" : ""))),
        hata && React.createElement("div", { "data-kamera-hata": "1", style: { fontSize: 12, color: "var(--erp-danger)" } }, hata)));
}
// Okutulan barkodun depodaki hâli (salt okuma). Döner: null (tanınmadı) ya da görüntülenecek özet.
function depoOkutSonucu(kod, { stok, siparisler, uretim, koliler, cariler, stokRezervasyonlari, tanimlar }) {
    const cozum = urunBarkoduCoz(kod, stok, tanimlar);
    if (!cozum)
        return null;
    const { urun, seviye } = cozum;
    const renkler = seviye === "stok"
        ? [...new Set((urun.variants || []).map((v) => v.renk))]
        : [cozum.renk];
    const vurguBedenler = seviye === "beden" ? [cozum.beden]
        : seviye === "asorti" ? (cozum.dagilim || []).map((d) => d.beden)
            : [];
    const mamulMu = urun.kategori === "Mamul";
    const bolumler = renkler.map((renk) => {
        const varyantlar = (urun.variants || []).filter((v) => v.renk === renk);
        const bedenler = bedenSirala(varyantlar.map((v) => v.beden));
        if (mamulMu) {
            const satir = mamulDeposuDurumu([urun], siparisler, uretim, koliler).find((s) => s.renk === renk);
            const hucreler = bedenler.map((b) => ({ beden: b, ...((satir && satir.hucreler[b]) || { stok: 0, kolide: 0, serbest: 0, uretimde: 0, talep: 0, acik: 0 }) }));
            return { renk, hucreler, toplam: satir ? satir.toplam : null };
        }
        const hucreler = bedenler.map((b) => {
            const d = stokDurumu(urun.id, renk, b, siparisler, stokRezervasyonlari, stok);
            return { beden: b, stok: d.stok, rezerve: d.rezerve, serbest: d.serbest, yolda: d.yoldaToplamAlim };
        });
        return { renk, hucreler };
    });
    // Bekleyen satış siparişleri — bu ürün/renk (beden okutulduysa o beden) için karşılanmamış kalan.
    const bekleyenSiparisler = [];
    if (mamulMu) {
        (siparisler || []).forEach((sp) => {
            if (sp.tip !== "Satış" || sp.durum === "İptal")
                return;
            (sp.kalemler || []).forEach((k) => {
                if (k.urunId !== urun.id || !renkler.includes(k.renk))
                    return;
                if (vurguBedenler.length && !vurguBedenler.includes(k.beden))
                    return;
                const kalan = stokYuvarla((k.miktar || 0) - (k.karsilanan || 0));
                if (kalan <= 0)
                    return;
                const cari = (cariler || []).find((c) => c.id === sp.cariId);
                bekleyenSiparisler.push({ siparisNo: sp.siparisNo, siparisId: sp.id, cari: cari ? cari.unvan : "—",
                    renk: k.renk, beden: k.beden, kalan, termin: sp.termin || sp.teslimTarihi || "" });
            });
        });
    }
    const sonHareketler = (urun.hareketler || [])
        .filter((h) => renkler.includes(h.renk) && (!vurguBedenler.length || vurguBedenler.includes(h.beden)))
        .slice()
        .sort((a, b) => String(b.zaman || b.tarih || "").localeCompare(String(a.zaman || a.tarih || "")))
        .slice(0, 6);
    return { kod, cozum, urun, seviye, mamulMu, bolumler, vurguBedenler, bekleyenSiparisler, sonHareketler };
}
const DEPO_OKUT_SEVIYE = { stok: "Ürün", renk: "Renk", beden: "Beden", asorti: "Asorti" };
function DepoOkut({ stok, siparisler, uretim, koliler, cariler, stokRezervasyonlari, tanimlar, onGoToUrun, showToast }) {
    const [kod, setKod] = useState("");
    const [gecmis, setGecmis] = useState([]);
    // FOTOĞRAFTAN ÜRÜN BULMA (24 Eylül, v1.439.0 — kullanıcı: "bunu depoda da kullanabiliriz").
    // Barkodu olmayan / etiketi düşmüş malın durumunu sorgulamak için: fotoğraf kayıtlı ürün
    // görselleriyle cihaz içinde eşleştiriliyor (118-gorsel-eslestirme), seçilen ürünün RENK
    // BARKODU kurulup (`urunBarkoduKur`) normal sorgulama yolundan geçiriliyor — ikinci bir
    // sorgulama mantığı yok, okutmuşuz gibi davranıyor.
    const [fotoAcik, setFotoAcik] = useState(false);
    const okut = useCallback((ham) => {
        const temiz = String(ham || "").trim();
        if (!temiz)
            return;
        setKod(temiz);
        setGecmis((g) => [temiz, ...g.filter((x) => x !== temiz)].slice(0, 8));
    }, []);
    const sonuc = kod ? depoOkutSonucu(kod, { stok, siparisler, uretim, koliler, cariler, stokRezervasyonlari, tanimlar }) : null;
    const birim = sonuc ? (sonuc.urun.birim || (sonuc.mamulMu ? "çift" : "")) : "";
    const tanimsizSebep = (k) => {
        if (/^K-/.test(k))
            return "Bu bir KOLİ barkodu. Koliyi Paketleme ekranında okutun; depoda ürün etiketini okutun.";
        if (/^\d+-\d+$/.test(k))
            return "Bu bir ÜRETİM PARÇASI barkodu. Atölye ekranında okutun; depoda ürün etiketini okutun.";
        if (!/^90\d+$/.test(k))
            return "Bu barkod bizim ürün etiketimiz değil (ürün barkodları 90 ile başlar).";
        return "Barkod ürün şemasına uyuyor ama bu kodda bir ürün/renk/beden yok — ürün silinmiş ya da etiket eski olabilir.";
    };
    const sayi = (n) => (n ? stokYuvarla(n).toLocaleString("tr-TR") : "·");
    const hucreStil = (vurgulu) => ({ padding: "4px 6px", textAlign: "right", fontFamily: "var(--erp-mono, monospace)", fontSize: 12,
        background: vurgulu ? "#F2E0B8" : undefined, fontWeight: vurgulu ? 700 : 400 });
    // Havuz: depoda aranabilecek her ürün+renk (mamul ve hammadde birlikte — depoda ikisi de var).
    const fotoHavuzu = (stok || []).flatMap((u) => Array.from(new Set((u.variants || []).map((v) => v.renk))).map((renk) => ({
        urunId: u.id, renk, urunAd: u.ad, etiket: "",
        gorsel: (u.renkResimleri || {})[renk] || u.kapakResmi || null,
    })));
    function fotoSecimi(secim) {
        setFotoAcik(false);
        const urun = (stok || []).find((u) => u.id === secim.urunId);
        const renkKod = ((tanimlar && tanimlar.renkler) || []).find((r) => r.ad === secim.renk);
        const kodu = urun && renkKod ? urunBarkoduKur("renk", { stokNo: urun.stokNo, renkKod: renkKod.barkodKodu }) : "";
        // Kod kurulamıyorsa (ürüne/renge kod atanmamış) SESSİZ KALMIYORUZ: sebebi söyleniyor,
        // yoksa kullanıcı fotoğrafın tanınmadığını sanır.
        if (!kodu) {
            showToast(`${secim.urunAd} · ${secim.renk} bulundu ama barkod kodu atanmamış — Paketleme'de "Eksik kodları ata"`);
            return;
        }
        okut(kodu);
    }
    return (React.createElement("div", { "data-depo-okut": "1", style: { display: "grid", gap: 12, maxWidth: 900 } },
        React.createElement(GorselIleBul, { havuz: fotoHavuzu, acikMi: fotoAcik, onKapat: () => setFotoAcik(false), onSec: fotoSecimi, showToast: showToast, altBilgi: (React.createElement("div", { style: { fontSize: 12, color: "#2E5670", marginBottom: 8 } }, "Depodaki t\u00FCm \u00FCr\u00FCnler aran\u0131yor \u2014 kay\u0131tl\u0131 \u00FCr\u00FCn g\u00F6rselleriyle kar\u015F\u0131la\u015Ft\u0131r\u0131l\u0131yor, d\u0131\u015Far\u0131ya hi\u00E7bir \u015Fey g\u00F6nderilmiyor.")) }),
        React.createElement(KameraOkuyucu, { onKod: okut }),
        React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } },
            React.createElement(BarkodGirdisi, { onKod: okut, placeholder: "Barkod okuyucu ya da elle yaz\u0131n", ikon: ScanLine, veriAdi: "data-depo-okut-girdi", dugme: "Sorgula" }),
            React.createElement("button", { type: "button", className: "btn-ghost", "data-foto-ac": "1", style: { padding: "5px 12px", fontSize: 12 }, onClick: () => setFotoAcik(true), title: "\u00DCr\u00FCn\u00FCn foto\u011Fraf\u0131n\u0131 \u00E7ekip kay\u0131tl\u0131 g\u00F6rsellerle e\u015Fle\u015Ftir" },
                React.createElement(Camera, { size: 13 }),
                " Foto\u011Fraftan bul"),
            gecmis.length > 1 && (React.createElement("span", { style: { display: "flex", gap: 4, flexWrap: "wrap" } }, gecmis.slice(1).map((g) => (React.createElement("button", { key: g, type: "button", className: "btn-ghost", style: { padding: "2px 8px", fontSize: 11 }, onClick: () => okut(g) }, g)))))),
        kod && !sonuc && (React.createElement("div", { "data-depo-okut-tanimsiz": "1", style: { padding: 10, border: "1px solid #E4B8A8", background: "#FBEFEA", borderRadius: "var(--erp-r-md)", fontSize: 13 } },
            React.createElement("b", { className: "mono" }, kod),
            " \u2014 ",
            tanimsizSebep(kod))),
        sonuc && (React.createElement("div", { "data-depo-okut-sonuc": sonuc.urun.id, style: { border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", background: "#fff", padding: 12, display: "grid", gap: 10 } },
            React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
                (sonuc.urun.renkResimleri || {})[sonuc.bolumler[0] && sonuc.bolumler[0].renk] || sonuc.urun.kapakResmi ? (React.createElement("img", { alt: "", src: (sonuc.urun.renkResimleri || {})[sonuc.bolumler[0].renk] || sonuc.urun.kapakResmi, style: { width: 48, height: 48, objectFit: "cover", borderRadius: 6 } })) : React.createElement(Package, { size: 28, style: { color: "var(--erp-text-3)" } }),
                React.createElement("div", { style: { flex: 1, minWidth: 160 } },
                    React.createElement("div", { style: { fontWeight: 700, fontSize: 15 }, "data-depo-okut-urun": "1" }, sonuc.urun.ad),
                    React.createElement("div", { style: { fontSize: 12, color: "var(--erp-text-3)" } },
                        React.createElement("span", { className: "mono" }, sonuc.kod),
                        " \u00B7 ",
                        DEPO_OKUT_SEVIYE[sonuc.seviye],
                        " barkodu",
                        sonuc.seviye !== "stok" && ` · ${sonuc.cozum.renk}`,
                        sonuc.seviye === "beden" && ` · ${sonuc.cozum.beden}`,
                        sonuc.seviye === "asorti" && sonuc.cozum.asorti && ` · ${sonuc.cozum.asorti.ad}`,
                        " · ",
                        sonuc.mamulMu ? "Mamul" : (sonuc.urun.kategori || "Hammadde"))),
                onGoToUrun && (React.createElement("button", { type: "button", className: "btn-ghost", "data-depo-okut-karta-git": "1", onClick: () => onGoToUrun(sonuc.urun.id) }, "\u00DCr\u00FCn kart\u0131"))),
            sonuc.bolumler.map((b) => (React.createElement("div", { key: b.renk, style: { overflowX: "auto" } },
                sonuc.bolumler.length > 1 && React.createElement("div", { style: { fontWeight: 600, fontSize: 12, marginBottom: 4 } }, b.renk),
                React.createElement("table", { "data-depo-okut-tablo": b.renk, style: { borderCollapse: "collapse", minWidth: "100%" } },
                    React.createElement("thead", null,
                        React.createElement("tr", { style: { fontSize: 10, color: "var(--erp-text-3)", textAlign: "right" } },
                            React.createElement("th", { style: { textAlign: "left", padding: "2px 6px" } }, sonuc.urun.olcuTipi === "Boyut" ? "Boyut" : "Beden"),
                            sonuc.mamulMu
                                ? ["Stok", "Kolide", "Serbest", "Üretimde", "Talep", "Açık"].map((x) => React.createElement("th", { key: x, style: { padding: "2px 6px" } }, x))
                                : ["Stok", "Rezerve", "Serbest", "Yolda"].map((x) => React.createElement("th", { key: x, style: { padding: "2px 6px" } }, x)))),
                    React.createElement("tbody", null, b.hucreler.map((h) => {
                        const v = sonuc.vurguBedenler.includes(h.beden);
                        return (React.createElement("tr", { key: h.beden, "data-depo-okut-satir": h.beden, style: { borderTop: "1px solid #F0E8D8" } },
                            React.createElement("td", { style: { ...hucreStil(v), textAlign: "left" } }, h.beden || "—"),
                            (sonuc.mamulMu
                                ? [h.stok, h.kolide, h.serbest, h.uretimde, h.talep, h.acik]
                                : [h.stok, h.rezerve, h.serbest, h.yolda]).map((n, i) => (React.createElement("td", { key: i, style: { ...hucreStil(v), color: sonuc.mamulMu && i === 5 && n > 0 ? "var(--erp-danger)" : undefined } }, sayi(n))))));
                    }))),
                birim && React.createElement("div", { style: { fontSize: 10, color: "var(--erp-text-3)", marginTop: 2 } },
                    "Birim: ",
                    birim)))),
            sonuc.mamulMu && (React.createElement("div", null,
                React.createElement("div", { style: { fontWeight: 600, fontSize: 12, marginBottom: 4 } }, "Bekleyen sipari\u015Fler"),
                sonuc.bekleyenSiparisler.length === 0
                    ? React.createElement("div", { style: { fontSize: 12, color: "var(--erp-text-3)" } }, "Bu mal i\u00E7in bekleyen sat\u0131\u015F sipari\u015Fi yok.")
                    : sonuc.bekleyenSiparisler.map((s, i) => (React.createElement("div", { key: i, "data-depo-okut-siparis": s.siparisNo, style: { fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap" } },
                        React.createElement("span", { className: "mono" }, s.siparisNo),
                        React.createElement("span", null, s.cari),
                        React.createElement("span", { style: { color: "var(--erp-text-3)" } },
                            s.renk,
                            s.beden ? ` · ${s.beden}` : ""),
                        React.createElement("b", null,
                            sayi(s.kalan),
                            " ",
                            birim),
                        s.termin && React.createElement("span", { style: { color: "var(--erp-text-3)" } },
                            "termin ",
                            s.termin)))))),
            React.createElement("div", null,
                React.createElement("div", { style: { fontWeight: 600, fontSize: 12, marginBottom: 4 } }, "Son hareketler"),
                sonuc.sonHareketler.length === 0
                    ? React.createElement("div", { style: { fontSize: 12, color: "var(--erp-text-3)" } }, "Hareket yok.")
                    : sonuc.sonHareketler.map((h, i) => (React.createElement("div", { key: h.id || i, style: { fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap" } },
                        React.createElement("span", { style: { color: "var(--erp-text-3)" } }, String(h.tarih || "").slice(0, 10)),
                        React.createElement("span", { className: "mono" }, h.fisNo || "—"),
                        React.createElement("span", null, h.beden || ""),
                        React.createElement("b", { style: { color: h.miktar < 0 ? "var(--erp-danger)" : undefined } },
                            h.miktar > 0 ? "+" : "",
                            sayi(h.miktar)),
                        React.createElement("span", { style: { color: "var(--erp-text-3)" } }, h.aciklama || ""))))))),
        !kod && (React.createElement("div", { style: { fontSize: 12, color: "var(--erp-text-3)" } }, "\u00DCr\u00FCn, renk, beden ya da asorti etiketini okutun: depodaki durumu, bekleyen sipari\u015Fler ve son hareketler burada g\u00F6r\u00FCn\u00FCr. Bu ekran hi\u00E7bir kayd\u0131 de\u011Fi\u015Ftirmez."))));
}
