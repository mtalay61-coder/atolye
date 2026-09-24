// ⚠ YEDEK KAYNAK (24 Eylül, v1.444.0 oturumu): Bu parça gelen src zip'inde YOKTU. Yayındaki
// atolye-erp-v1.444.0.html içinden DERLENMİŞ hâliyle (React.createElement) geri çıkarıldı —
// davranış birebir aynı, ama JSX biçimi kayıp. Asıl .jsx bulunursa bununla DEĞİŞTİRİLMELİ.
// ================= GITHUB'A YAYINLA (22 Eylül, v1.414.0) =================
//
// Kullanıcı: "uygulamanın içine dosyayı yükleyecek yer yapsak ve bizim uygulamadan yüklesek?"
//
// Yayın GitHub Pages'te (bkz. DEVAM-NOTU): her sürümde iki dosya gerekiyor — sürümlü HTML ve
// `surum.json`. Bunu GitHub sitesinde elle yapmak iki ayrı yükleme + commit demekti. Burada tek
// ekrandan, tek commit'le yapılıyor.
//
// NEDEN GIT DATA API (blob → tree → commit → ref) ve "contents" API DEĞİL:
//   · Contents API dosya başına ayrı commit atar; iki dosya = iki commit = arada YARIM DURUM
//     (yeni surum.json, henüz yüklenmemiş HTML → herkes 404 alır). Git Data API'de tek ağaç, tek
//     commit: ya ikisi birden yayına girer ya hiçbiri.
//   · Contents API'nin dosya boyutu sınırı belirsiz; uygulama 3,4 MB. Blob API 100 MB'a kadar net.
//
// ANAHTAR (token) YALNIZ BU TARAYICIDA: `localStorage`. Tanımlara yazılsaydı buluta gider ve
// veritabanını görebilen herkes depoya yazabilirdi. Anahtar "fine-grained", yalnız bu depoya ve
// yalnız Contents: Read and write yetkisiyle oluşturulmalı — kaybolursa zararı o depoyla sınırlı.
const GH_ANAHTAR_KEY = "github:token";
const GH_AYAR_KEY = "github:ayar";
const GH_VARSAYILAN = { sahip: "mtalay61-coder", depo: "atolye", dal: "main" };
function ghAnahtarOku() {
    try {
        return window.localStorage.getItem(GH_ANAHTAR_KEY) || "";
    }
    catch (e) {
        return "";
    }
}
// ANAHTAR İKİ YERE (22 Eylül, v1.418.0 — kullanıcı: "kayıtlı kalması gerekmiyor muydu?"):
// `localStorage` Android'de site verisi temizlenince ya da kısıtlı modda yazamıyor ve anahtar
// sessizce kayboluyordu. Asıl yer artık uygulamanın kendi yerel deposu (`window.storage`,
// IndexedDB); localStorage yedek olarak kalıyor. PAYLAŞIMSIZ yazılıyor (`false`): bu anahtar
// buluta ASLA gitmemeli — giderse veritabanını görebilen herkes depoya yazabilirdi.
async function ghAnahtarYaz(deger) {
    let oldu = false;
    try {
        if (deger)
            await window.storage.set(GH_ANAHTAR_KEY, deger, false);
        else
            await window.storage.delete(GH_ANAHTAR_KEY, false);
        oldu = true;
    }
    catch (e) {
        oldu = false;
    }
    try {
        if (deger)
            window.localStorage.setItem(GH_ANAHTAR_KEY, deger);
        else
            window.localStorage.removeItem(GH_ANAHTAR_KEY);
        oldu = true;
    }
    catch (e) { /* yalnız yedek */ }
    return oldu;
}
// Depodan okuma (localStorage boşsa): anahtar yoksa hata fırlatabilir, sessizce boş dönülür.
async function ghAnahtarDepodanOku() {
    try {
        const r = await window.storage.get(GH_ANAHTAR_KEY, false);
        return (r && r.value) || "";
    }
    catch (e) {
        return "";
    }
}
function ghAyarOku() {
    try {
        return { ...GH_VARSAYILAN, ...(JSON.parse(window.localStorage.getItem(GH_AYAR_KEY) || "{}") || {}) };
    }
    catch (e) {
        return { ...GH_VARSAYILAN };
    }
}
function ghAyarYaz(ayar) {
    try {
        window.localStorage.setItem(GH_AYAR_KEY, JSON.stringify(ayar));
    }
    catch (e) { /* yerel depo kapalı olabilir */ }
}
// Dosya adından sürüm: "atolye-erp-v1.413.0.html" → "1.413.0". Bulamazsa "".
function ghDosyadanSurum(ad) {
    const m = String(ad || "").match(/v?(\d+\.\d+\.\d+)/);
    return m ? m[1] : "";
}
function ghHataMesaji(durum, govde) {
    const mesaj = (govde && govde.message) || "";
    if (durum === 401)
        return "Anahtar geçersiz ya da süresi dolmuş — GitHub'da yeni anahtar oluşturun.";
    if (durum === 403)
        return `Yetki yok (${mesaj}). Anahtarın bu depoya "Contents: Read and write" izni olmalı.`;
    if (durum === 404)
        return "Depo ya da dal bulunamadı. Kullanıcı adı, depo adı ve dal adını kontrol edin (büyük/küçük harf önemli).";
    if (durum === 409 || durum === 422)
        return `GitHub isteği reddetti (${mesaj}). Dal adı doğru mu?`;
    return `GitHub hatası ${durum}${mesaj ? " — " + mesaj : ""}`;
}
async function ghIstek(yol, { token, yontem = "GET", govde } = {}) {
    const y = await fetch(`https://api.github.com${yol}`, {
        method: yontem,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(govde ? { "Content-Type": "application/json" } : {}),
        },
        body: govde ? JSON.stringify(govde) : undefined,
    });
    let veri = null;
    try {
        veri = await y.json();
    }
    catch (e) {
        veri = null;
    }
    if (!y.ok) {
        const h = new Error(ghHataMesaji(y.status, veri));
        h.durum = y.status;
        throw h;
    }
    return veri;
}
// Dosyaları TEK COMMIT'le yayınlar. `dosyalar`: [{ yol, base64 }]. Döner: { commitSha, url }.
async function ghYayinla({ token, sahip, depo, dal, dosyalar, mesaj, ilerleme }) {
    const kok = `/repos/${sahip}/${depo}`;
    const adim = (m) => { if (ilerleme)
        ilerleme(m); };
    adim("Dal okunuyor…");
    const ref = await ghIstek(`${kok}/git/ref/heads/${encodeURIComponent(dal)}`, { token });
    const sonCommit = ref.object.sha;
    adim("Son commit okunuyor…");
    const commit = await ghIstek(`${kok}/git/commits/${sonCommit}`, { token });
    const agacGirdileri = [];
    for (let i = 0; i < dosyalar.length; i++) {
        const d = dosyalar[i];
        adim(`Dosya gönderiliyor (${i + 1}/${dosyalar.length}): ${d.yol}`);
        const blob = await ghIstek(`${kok}/git/blobs`, { token, yontem: "POST", govde: { content: d.base64, encoding: "base64" } });
        agacGirdileri.push({ path: d.yol, mode: "100644", type: "blob", sha: blob.sha });
    }
    adim("Ağaç kuruluyor…");
    const agac = await ghIstek(`${kok}/git/trees`, { token, yontem: "POST", govde: { base_tree: commit.tree.sha, tree: agacGirdileri } });
    adim("Commit atılıyor…");
    const yeniCommit = await ghIstek(`${kok}/git/commits`, { token, yontem: "POST", govde: { message: mesaj, tree: agac.sha, parents: [sonCommit] } });
    // Dal SON adımda oynuyor: buraya kadar her şey depoda ama YAYINDA DEĞİL. Bu adım başarısızsa
    // yayın eski sürümde kalır, yarım bir hâl oluşmaz.
    adim("Yayına alınıyor…");
    await ghIstek(`${kok}/git/refs/heads/${encodeURIComponent(dal)}`, { token, yontem: "PATCH", govde: { sha: yeniCommit.sha } });
    return { commitSha: yeniCommit.sha, url: `https://github.com/${sahip}/${depo}/commit/${yeniCommit.sha}` };
}
// Metni (UTF-8) base64'e çevirir — `btoa` tek başına Türkçe harflerde patlar.
function ghMetinBase64(metin) {
    const bayt = new TextEncoder().encode(metin);
    let ikili = "";
    bayt.forEach((b) => { ikili += String.fromCharCode(b); });
    return btoa(ikili);
}
// Dosyayı base64'e çevirir (veri: ön ekini atarak).
function ghDosyaBase64(dosya) {
    return new Promise((coz, red) => {
        const o = new FileReader();
        o.onload = () => { const s = String(o.result || ""); coz(s.slice(s.indexOf(",") + 1)); };
        o.onerror = () => red(new Error("Dosya okunamadı"));
        o.readAsDataURL(dosya);
    });
}
function GitHubYayin({ showToast, onSurumYayinla, yayinSurum }) {
    const [anahtar, setAnahtar] = useState(ghAnahtarOku());
    const [kayitli, setKayitli] = useState(!!ghAnahtarOku());
    const [ayar, setAyar] = useState(ghAyarOku());
    const [dosya, setDosya] = useState(null);
    const [surum, setSurum] = useState("");
    const [durum, setDurum] = useState(""); // ilerleme metni
    const [mesgul, setMesgul] = useState(false);
    const [sonuc, setSonuc] = useState(null);
    const [ayarAcik, setAyarAcik] = useState(false);
    // localStorage temizlenmiş olabilir: asıl kayıt yerel depoda.
    useEffect(() => {
        let iptal = false;
        if (!anahtar) {
            ghAnahtarDepodanOku().then((d) => { if (!iptal && d) {
                setAnahtar(d);
                setKayitli(true);
            } });
        }
        return () => { iptal = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- yalnız açılışta
    const sayfaKoku = `https://${ayar.sahip}.github.io/${ayar.depo}/`;
    // DOSYA SEÇİCİ FİLTRESİZ (22 Eylül, v1.417.0 — kullanıcı: "telefondan yüklemek için dosyayı
    // açmıyor"). `accept=".html,text/html"` Android'de indirilen dosyayı GİZLİYOR: indirilen HTML
    // çoğu cihazda `application/octet-stream` türüyle duruyor, seçici onu listelemiyordu. Filtre
    // kalktı; doğrulama burada, İÇERİĞE bakarak yapılıyor — yanlış dosya yine yayınlanamıyor.
    const dosyaSec = async (f) => {
        setSonuc(null);
        if (!f) {
            setDosya(null);
            setSurum("");
            return;
        }
        const bas = await f.slice(0, 400).text().catch(() => "");
        const htmlMi = /<!doctype html|<html[\s>]/i.test(bas);
        if (!htmlMi) {
            setDosya(null);
            setSurum("");
            showToast(`Bu bir HTML dosyası değil (${f.name}) — uygulamanın .html dosyasını seçin`);
            return;
        }
        setDosya(f);
        // Sürüm no önce dosya adından, olmazsa dosyanın <title>'ından ("Atölye ERP 1.416.0").
        const basliktan = (bas.match(/Atölye ERP ([\d.]+)/) || [])[1] || "";
        setSurum(ghDosyadanSurum(f.name) || basliktan || "");
    };
    const yayinla = async () => {
        if (!anahtar.trim())
            return showToast("Önce GitHub anahtarını kaydedin");
        if (!dosya)
            return showToast("Yüklenecek HTML dosyasını seçin");
        const no = (surum || "").trim();
        if (!/^\d+\.\d+\.\d+$/.test(no))
            return showToast("Sürüm no 1.413.0 biçiminde olmalı");
        const dosyaAdi = `atolye-erp-v${no}.html`;
        // Bekleme ÖNCESİ sabitlenir (denetim 18/B): yükleme sürerken kullanıcı anahtarı ya da depo
        // ayarını değiştirebilir; iş, başladığı ayarla bitmeli.
        const tokenSimdi = anahtar.trim();
        const ayarSimdi = { ...ayar };
        const kokSimdi = `https://${ayarSimdi.sahip}.github.io/${ayarSimdi.depo}/`;
        setMesgul(true);
        setSonuc(null);
        try {
            setDurum("Dosya hazırlanıyor…");
            const base64 = await ghDosyaBase64(dosya);
            const url = `${kokSimdi}${dosyaAdi}`;
            // surum.json ile HTML AYNI COMMIT'te: başlatıcı hiçbir an olmayan bir dosyaya yönlendirmesin.
            const surumJson = JSON.stringify({ surum: no, url }, null, 2) + "\n";
            const dosyalar = [
                { yol: dosyaAdi, base64 },
                { yol: "surum.json", base64: ghMetinBase64(surumJson) },
            ];
            const r = await ghYayinla({
                token: tokenSimdi, sahip: ayarSimdi.sahip, depo: ayarSimdi.depo, dal: ayarSimdi.dal,
                dosyalar, mesaj: `Sürüm ${no}`, ilerleme: setDurum,
            });
            // Uygulama içindeki "yeni sürüm var" kaydı da tazelensin (açık duran ekranlar görsün).
            if (onSurumYayinla) {
                // Not sürüm geçmişinden (015-sabitler): kullanıcı "yeni sürüm var" şeridinde ne değiştiğini görür.
                try {
                    await onSurumYayinla({ surum: no, url, not: surumNotuKur(no), zaman: new Date().toISOString() });
                }
                catch (e) { /* yayın yine de yapıldı */ }
            }
            setSonuc({ no, url, commit: r.url });
            setDurum("");
            showToast(`Sürüm ${no} yayınlandı — GitHub 1-2 dakika içinde yayına alır`);
        }
        catch (e) {
            setDurum("");
            showToast(`Yayınlanamadı: ${(e && e.message) || e}`);
        }
        setMesgul(false);
    };
    return (React.createElement("div", { "data-github-yayin": "1", style: { border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14, background: "#fff" } },
        React.createElement("div", { style: { fontSize: 12, fontWeight: 700, marginBottom: 4 } }, "GitHub'a yay\u0131nla"),
        React.createElement("div", { style: { fontSize: 11, color: "var(--erp-text-2)", marginBottom: 8 } },
            "Yeni HTML dosyas\u0131n\u0131 se\u00E7in; uygulama dosyay\u0131 ve ",
            React.createElement("b", { className: "mono" }, "surum.json"),
            "'u TEK i\u015Flemde depoya yazar. Adres: ",
            React.createElement("b", { className: "mono" }, sayfaKoku),
            " \u00B7 \u015Eu anki s\u00FCr\u00FCm ",
            React.createElement("b", { className: "mono" }, SURUM),
            yayinSurum && yayinSurum.surum ? React.createElement(React.Fragment, null,
                " \u00B7 yay\u0131nda ",
                React.createElement("b", { className: "mono" }, yayinSurum.surum)) : null),
        !anahtar && (React.createElement("div", { style: { fontSize: 11, color: "var(--erp-text-2)", background: "var(--erp-panel)", border: "1px solid #E4D8C0",
                borderRadius: "var(--erp-r-md)", padding: 8, marginBottom: 8 } },
            React.createElement("b", null, "Anahtar nas\u0131l al\u0131n\u0131r:"),
            " GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token. Repository access: ",
            React.createElement("b", null, "Only select repositories"),
            " \u2192 ",
            React.createElement("b", { className: "mono" }, ayar.depo),
            ". Permissions > Repository permissions > ",
            React.createElement("b", null, "Contents: Read and write"),
            ". \u00C7\u0131kan anahtar\u0131 buraya yap\u0131\u015Ft\u0131r\u0131n \u2014 GitHub onu bir daha g\u00F6stermez. Anahtar yaln\u0131z bu taray\u0131c\u0131da saklan\u0131r, buluta g\u00F6nderilmez.")),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 8 } },
            React.createElement(Field, { label: "GitHub anahtar\u0131 (token)" },
                React.createElement("input", { type: "password", value: anahtar, "data-gh-token": "1", placeholder: "github_pat_\u2026", onChange: (e) => setAnahtar(e.target.value), style: { minWidth: 220 } })),
            React.createElement("button", { type: "button", className: "btn-ghost", "data-gh-token-kaydet": "1", style: { padding: "5px 12px", fontSize: 12 }, onClick: async () => {
                    const deger = anahtar.trim();
                    const oldu = await ghAnahtarYaz(deger);
                    setKayitli(oldu && !!deger);
                    showToast(oldu ? (deger ? "Anahtar bu cihaza kaydedildi" : "Anahtar silindi") : "Anahtar kaydedilemedi — tarayıcı depoya yazamıyor");
                } },
                React.createElement(Save, { size: 13 }),
                " Anahtar\u0131 kaydet"),
            React.createElement("span", { "data-gh-token-durum": kayitli ? "kayitli" : "yok", style: { fontSize: 11, color: kayitli ? "var(--erp-ok, #4A6B3E)" : "var(--erp-text-3)" } }, kayitli ? "✓ anahtar bu cihazda kayıtlı" : "anahtar kayıtlı değil"),
            React.createElement("button", { type: "button", className: "btn-ghost", style: { padding: "5px 10px", fontSize: 11 }, onClick: () => setAyarAcik((a) => !a) }, "Depo ayarlar\u0131")),
        ayarAcik && (React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 8 } }, [["sahip", "Kullanıcı adı"], ["depo", "Depo adı"], ["dal", "Dal"]].map(([k, etiket]) => (React.createElement(Field, { key: k, label: etiket },
            React.createElement("input", { value: ayar[k], "data-gh-ayar": k, onChange: (e) => { const y = { ...ayar, [k]: e.target.value.trim() }; setAyar(y); ghAyarYaz(y); } })))))),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" } },
            React.createElement(Field, { label: "Yeni s\u00FCr\u00FCm dosyas\u0131 (.html)" },
                React.createElement("input", { type: "file", "data-gh-dosya": "1", onChange: (e) => dosyaSec(e.target.files && e.target.files[0]) })),
            React.createElement(Field, { label: "S\u00FCr\u00FCm no" },
                React.createElement("input", { value: surum, "data-gh-surum": "1", onChange: (e) => setSurum(e.target.value), placeholder: "1.413.0", style: { width: 110 } })),
            React.createElement("button", { type: "button", className: "btn-primary", "data-gh-yayinla": "1", disabled: mesgul, style: { padding: "6px 14px", fontSize: 12 }, onClick: yayinla },
                React.createElement(Upload, { size: 13 }),
                " ",
                mesgul ? "Yayınlanıyor…" : "Yayınla"),
            dosya && React.createElement("span", { style: { fontSize: 11, color: "var(--erp-text-3)" } },
                dosya.name,
                " \u00B7 ",
                Math.round(dosya.size / 1024),
                " KB")),
        durum && React.createElement("div", { "data-gh-durum": "1", style: { fontSize: 11, color: "var(--erp-text-2)", marginTop: 6 } }, durum),
        sonuc && (React.createElement("div", { "data-gh-sonuc": "1", style: { fontSize: 11, marginTop: 8, padding: 8, background: "var(--erp-panel)", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)" } },
            React.createElement("b", null,
                "S\u00FCr\u00FCm ",
                sonuc.no,
                " yay\u0131nland\u0131."),
            " GitHub yay\u0131n\u0131 1-2 dakikada yeniler; sonra",
            " ",
            React.createElement("span", { className: "mono" }, sayfaKoku),
            " adresi yeni s\u00FCr\u00FCm\u00FC a\u00E7ar.",
            React.createElement("div", { style: { color: "var(--erp-text-3)", marginTop: 2 } },
                "Dosya: ",
                React.createElement("span", { className: "mono" }, sonuc.url))))));
}
// ================= SÜRÜM GEÇMİŞİ EKRANI (23 Eylül, v1.421.0) =================
function surumNotuKur(no) {
    const k = SURUM_GECMISI.find((x) => x.surum === no);
    if (!k)
        return "";
    const parca = [];
    if (k.eklenen.length)
        parca.push("Yeni: " + k.eklenen.join("; "));
    if (k.degisen.length)
        parca.push("Değişen: " + k.degisen.join("; "));
    if (k.duzeltilen.length)
        parca.push("Düzeltilen: " + k.duzeltilen.join("; "));
    return parca.join(" · ");
}
function SurumGecmisi() {
    const [acik, setAcik] = useState(() => new Set(SURUM_GECMISI.slice(0, 3).map((k) => k.surum)));
    const bolum = (baslik, liste, renk, isaret) => liste.length > 0 && (React.createElement("div", { style: { marginTop: 4 } },
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: renk } }, baslik),
        React.createElement("ul", { style: { margin: "2px 0 0", paddingLeft: 18, fontSize: 12 } }, liste.map((m, i) => React.createElement("li", { key: i, "data-surum-madde": isaret }, m)))));
    return (React.createElement("div", { "data-surum-gecmisi": "1", style: { display: "grid", gap: 8, maxWidth: 820 } },
        React.createElement("div", { style: { fontSize: 12, color: "var(--erp-text-3)" } },
            "Her s\u00FCr\u00FCmde neler eklendi, neler de\u011Fi\u015Fti, hangi hatalar d\u00FCzeltildi. Kulland\u0131\u011F\u0131n\u0131z s\u00FCr\u00FCm: ",
            React.createElement("b", { className: "mono" }, SURUM),
            "."),
        SURUM_GECMISI.map((k) => {
            const acikMi = acik.has(k.surum);
            const toplam = k.eklenen.length + k.degisen.length + k.duzeltilen.length;
            return (React.createElement("div", { key: k.surum, "data-surum-kaydi": k.surum, style: { border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", background: "#fff", padding: "8px 12px" } },
                React.createElement("button", { type: "button", onClick: () => setAcik((o) => { const n = new Set(o); if (n.has(k.surum))
                        n.delete(k.surum);
                    else
                        n.add(k.surum); return n; }), style: { display: "flex", gap: 10, alignItems: "center", width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" } },
                    React.createElement("b", { className: "mono", style: { fontSize: 13 } },
                        "v",
                        k.surum),
                    React.createElement("span", { style: { fontSize: 11, color: "var(--erp-text-3)" } }, k.tarih),
                    k.surum === SURUM && React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: "var(--erp-ok, #4A6B3E)" } }, "bu s\u00FCr\u00FCm"),
                    React.createElement("span", { style: { fontSize: 11, color: "var(--erp-text-3)", marginLeft: "auto" } },
                        k.eklenen.length ? `${k.eklenen.length} yeni · ` : "",
                        k.degisen.length ? `${k.degisen.length} değişen · ` : "",
                        k.duzeltilen.length ? `${k.duzeltilen.length} düzeltme` : "",
                        toplam === 0 ? "—" : "")),
                acikMi && (React.createElement(React.Fragment, null,
                    bolum("Yeni", k.eklenen, "var(--erp-ok, #4A6B3E)", "yeni"),
                    bolum("Değişen", k.degisen, "var(--erp-text-2)", "degisen"),
                    bolum("Düzeltilen", k.duzeltilen, "var(--erp-danger)", "duzeltilen")))));
        })));
}
