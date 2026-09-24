// =============================================================================================
// MATRİS KURALI — bu projede varsayılan liste düzeni
//
// KURAL: bir listede tek değişken boyut BEDEN ise ve hücrede tek bir sayı duruyorsa,
// o liste MATRİS olarak çizilir. Malzeme satır, beden sütun. Düz liste yazılmaz.
//
// GEREKÇE: düz liste aynı malzemeyi her beden için tekrar yazıyor. Beş bedenli bir modelde tek
// bir taban beş satır kaplıyor, ekranda aynı ad beş kez alt alta görünüyor. Kalem sayısı arttıkça
// okunacak bilgi azalıyor: asıl soru ("hangi malzemeden hangi bedende ne kadar") tekrarın altında
// kayboluyor. Matriste aynı bilgi tek satırda ve yan yana karşılaştırılabilir duruyor.
//
// KULLANIMI (üç satır):
//     <IhtiyacMatrisi
//       kalemler={liste}                        // [{ ad, renk, beden, birim, miktar, proses }]
//       tanimlarProsesler={tanimlar.prosesler}  // yoksa [] geçilebilir
//     />
// Hücrede sayıdan fazlası gerekiyorsa `hucreCiz` verilir (bkz. sipariş kartı: eksik miktarı
// hücrede, stok/rezerve ipucunda).
//
// KURALIN DIŞINDA KALANLAR — her biri satırında `matris-muaf:` etiketiyle GEREKÇESİNİ yazar.
// 11 numaralı denetleyici etiketsiz istisnayı yakalar; yani kuralı atlamak mümkün ama sessizce
// atlamak mümkün değil.
// =============================================================================================

// =============================================================================================
// İHTİYAÇ MATRİSİ
//
// Düz liste aynı malzemeyi her beden için ayrı satıra yazıyordu: beş bedenli bir taban beş satır
// kaplıyor, ekranda "1723 Çelikli Taban" beş kez alt alta görünüyordu. Kalem sayısı arttıkça
// okunacak şey azalıyor — asıl bilgi (hangi malzemeden hangi bedende kaç tane) tekrarın altında
// kayboluyordu.
//
// Matriste malzeme SATIR, beden SÜTUN. Aynı bilgi tek satırda ve yan yana karşılaştırılabilir.
//
// Bedensiz malzemeler (yapıştırıcı, kutu — tek "Standart" bedeni olanlar) matrise SOKULMAZ:
// onlar için beş boş sütun açmak tam da kaçınmak istediğimiz gürültüyü üretirdi. Altta ayrı,
// sade bir listede dururlar.
function ihtiyacSatirlariniTopla(kalemler) {
  const index = {};
  const satirlar = [];
  (kalemler || []).forEach((x) => {
    const anahtar = `${x.ad}|${x.renk}`;
    if (!(anahtar in index)) {
      index[anahtar] = satirlar.length;
      satirlar.push({
        ad: x.ad, renk: x.renk, birim: x.birim, hucreler: {}, kaynaklar: {}, toplam: 0,
        birimMiktar: x.birimMiktar === undefined ? null : x.birimMiktar, adet: 0, cakisti: false,
      });
    }
    const st = satirlar[index[anahtar]];
    st.hucreler[x.beden] = stokYuvarla((st.hucreler[x.beden] || 0) + x.miktar);
    st.toplam = stokYuvarla(st.toplam + x.miktar);
    // Hücrenin KAYNAK kaydı da saklanır: sipariş kartı hücrede yalnızca gerekeni değil
    // stok/eksik durumunu da göstermek istiyor. Sayıyı saklayıp kaydı atmak, o ekranı
    // matrise çevirirken bilgi kaybettirirdi.
    st.kaynaklar[x.beden] = x;
    st.adet += x.adet || 0;
    // Aynı malzeme farklı bedenlerde farklı çarpanla kullanılıyorsa tek bir "× birim" yazılamaz.
    if (x.birimMiktar == null || (st.birimMiktar != null && st.birimMiktar !== x.birimMiktar)) {
      st.cakisti = true;
    }
    if (!st.birim) st.birim = x.birim;
  });
  return satirlar;
}

// Beden sıralaması: 36 < 37 < ... sayısalsa sayıya göre, değilse alfabetik. Metin sıralaması
// kullanılsaydı "10" bedeni "9"dan önce gelirdi.
function bedenSirala(liste) {
  return [...liste].sort((a, b) => {
    const na = parseFloat(a), nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b), "tr");
  });
}

// hucreCiz / satirSonu: sipariş kartı hücrede eksik durumunu, sağda stok özetini gösteriyor.
// Verilmezse sade sayı çizilir — üretim kartının ihtiyacı bu kadar.
function IhtiyacMatrisi({ kalemler, tanimlarProsesler, hucreCiz, satirSonuBaslik, satirSonuCiz }) {
  if (!kalemler || kalemler.length === 0) return null;

  // Prosese göre grupla — atölyede sorulan soru "toplam ne tüketilecek" değil, "kesime ne çıkacak".
  const gruplar = [];
  const grupIndex = {};
  kalemler.forEach((x) => {
    const a = x.proses || "";
    if (!(a in grupIndex)) { grupIndex[a] = gruplar.length; gruplar.push({ proses: a, satirlar: [] }); }
    gruplar[grupIndex[a]].satirlar.push(x);
  });
  const siraMap = {};
  (tanimlarProsesler || []).forEach((pr, pi) => { siraMap[pr.ad] = pi; });
  gruplar.sort((a, b) => (a.proses ? (siraMap[a.proses] ?? 900) : 999) - (b.proses ? (siraMap[b.proses] ?? 900) : 999));

  const hucreStil = { fontSize: 13, padding: "5px 8px", textAlign: "center", borderLeft: "1px solid #EFE5D2", whiteSpace: "nowrap" };
  const baslikStil = { fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", padding: "4px 8px", textAlign: "center", borderLeft: "1px solid #EFE5D2", whiteSpace: "nowrap" };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {gruplar.map((g) => {
        const renk = g.proses ? prosesRengi(g.proses, siraMap[g.proses]) : "var(--erp-warn)";
        const toplananlar = ihtiyacSatirlariniTopla(g.satirlar);
        const matris = toplananlar.filter((r) => Object.keys(r.hucreler).length > 1);
        const tekil = toplananlar.filter((r) => Object.keys(r.hucreler).length <= 1);
        const bedenler = bedenSirala(
          Array.from(new Set(matris.flatMap((r) => Object.keys(r.hucreler))))
        );
        return (
          <div key={g.proses || "yok"} style={{ border: `1px solid ${renk}44`, borderLeft: `4px solid ${renk}`, borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: alfaEkle(renk, "12") }}>
              {g.proses ? (
                <>
                  <span style={{ display: "flex", color: renk }}>
                    <ProsesIkonu proses={g.proses} tanimlarProsesler={tanimlarProsesler} size={15} />
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: renk }}>{g.proses}</span>
                </>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-warn)" }}>⚠ Prosesi belirtilmemiş</span>
              )}
              <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", marginLeft: "auto" }}>
                {toplananlar.length} malzeme
              </span>
            </div>

            {matris.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--erp-panel)" }}>
                      <th style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", textAlign: "left", padding: "4px 10px" }}>MALZEME</th>
                      <th style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", textAlign: "left", padding: "4px 8px" }}>RENK</th>
                      {bedenler.map((b) => <th key={b} className="mono" style={baslikStil}>{b}</th>)}
                      <th className="mono" style={{ ...baslikStil, textAlign: "right", borderLeft: "2px solid #E4D8C0" }}>TOPLAM</th>
                      {satirSonuBaslik && <th style={{ ...baslikStil, textAlign: "right" }}>{satirSonuBaslik}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {matris.map((r, ri) => (
                      <tr key={ri} style={{ borderTop: "1px solid #E4D8C0" }}>
                        <td style={{ fontSize: 13, fontWeight: 600, padding: "5px 10px" }}>{r.ad}</td>
                        <td className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)", padding: "5px 8px" }}>{r.renk}</td>
                        {bedenler.map((b) => (
                          <td key={b} className="mono" style={{
                            ...hucreStil,
                            // Boş hücre "0" değil, "bu bedende bu malzeme kullanılmıyor" demektir.
                            // Sıfır yazmak ikisini karıştırır; tire ise soluk ve sessiz kalır.
                            color: r.hucreler[b] === undefined ? "#CFC2A8" : "#221B14",
                            fontWeight: r.hucreler[b] === undefined ? 400 : 600,
                          }}>
                            {r.hucreler[b] === undefined
                              ? "–"
                              : (hucreCiz ? hucreCiz(r.kaynaklar[b], r.hucreler[b]) : r.hucreler[b])}
                          </td>
                        ))}
                        <td className="mono" style={{ ...hucreStil, textAlign: "right", borderLeft: "2px solid #E4D8C0", fontWeight: 700, fontSize: 14 }}>
                          {!r.cakisti && r.birimMiktar != null && r.adet > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}>
                              {r.adet} × {r.birimMiktar} ={" "}
                            </span>
                          )}
                          {r.toplam} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}>{r.birim}</span>
                        </td>
                        {satirSonuCiz && (
                          <td className="mono" style={{ ...hucreStil, textAlign: "right" }}>{satirSonuCiz(r)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tekil.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {tekil.map((r, ri) => {
                    const tekBeden = Object.keys(r.hucreler)[0];
                    return (
                      <tr key={ri} style={{ borderTop: "1px solid #E4D8C0" }}>
                        <td style={{ fontSize: 13, fontWeight: 600, padding: "5px 10px" }}>{r.ad}</td>
                        <td className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)", padding: "5px 8px" }}>
                          {r.renk}{tekBeden && tekBeden !== "Standart" ? ` · ${tekBeden}` : ""}
                        </td>
                        <td className="mono" style={{ fontSize: 14, fontWeight: 700, textAlign: "right", padding: "5px 10px", color: "#221B14", whiteSpace: "nowrap" }}>
                          {/* HESABI GÖSTER: "88 Desi" tek başına doğrulanamaz; "8 × 11 = 88 Desi"
                              yanlışsa hangi çarpanın hatalı olduğu anlaşılır. Çarpan bedene göre
                              değişiyorsa (cakisti) gösterilmiyor — tek bir çarpan yok, uydurmak
                              yanıltıcı olur. */}
                          {!r.cakisti && r.birimMiktar != null && r.adet > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}>
                              {r.adet} × {r.birimMiktar} ={" "}
                            </span>
                          )}
                          {r.toplam} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-2)" }}>{r.birim}</span>
                        </td>
                        {satirSonuCiz && (
                          <td className="mono" style={{ fontSize: 12, textAlign: "right", padding: "5px 10px", whiteSpace: "nowrap" }}>{satirSonuCiz(r)}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

