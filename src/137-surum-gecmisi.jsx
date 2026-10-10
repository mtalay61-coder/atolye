// ⚠ YEDEK KAYNAK (24 Eylül, v1.444.0 oturumu): Bu parça gelen src zip'inde YOKTU. Yayındaki
// atolye-erp-v1.444.0.html içinden DERLENMİŞ hâliyle (React.createElement) geri çıkarıldı —
// davranış birebir aynı, ama JSX biçimi kayıp. Asıl .jsx bulunursa bununla DEĞİŞTİRİLMELİ.
//
// GITHUB'A YAYINLA KALDIRILDI (v1.636.0 — kullanıcı: "buna gerek kaldı mı? … gerek yok gibi" → "evet").
// Tanımlar > Yayın'daki bölüm (v1.414.0) sürüm HTML'ini kullanıcının GitHub anahtarıyla depoya yüklüyordu. Yayını
// artık Claude Code PR + birleştirme ile yapıyor; uygulama yeni sürüme `surum.json` üzerinden kendiliğinden geçiyor.
// Depoya YAZMA yetkili anahtarın tarayıcıda durması gereksiz risk olduğu için bölüm ve anahtar birlikte kalktı;
// `ghAnahtariTemizle` bu cihazda kalmış anahtarı/ayarı açılışta bir kez siler (100-app). Kullanıcıya anahtarı
// GitHub'dan da iptal etmesi söylendi.
function ghAnahtariTemizle() {
    try { window.localStorage.removeItem("github:token"); window.localStorage.removeItem("github:ayar"); } catch (e) { /* özel sekme */ }
    try { if (window.storage && window.storage.delete) window.storage.delete("github:token", false).catch(() => {}); } catch (e) { /* depo yok */ }
}
// ================= SÜRÜM GEÇMİŞİ EKRANI (23 Eylül, v1.421.0) =================
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
            return (React.createElement("div", { key: k.surum, "data-surum-kaydi": k.surum, style: { border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", background: "#fff", padding: "8px 12px" } },
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
