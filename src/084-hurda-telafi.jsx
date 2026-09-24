// ================= HURDA TELAFİ ÜRETİMİ =================
//
// 19 Eylül (2. madde, 8. tur): üretimde hurdaya çıkan adetlerin yerine açılan telafi üretimi.
//
// KURAL: telafi, kaynak üretimin KENDİSİNİ değiştirmez — ayrı bir üretim siparişi olarak açılır ve
// kaynağına bağlanır. Kaynağın adedini artırmak, "kaç çift yapıldı" ile "kaç çift satıldı"
// arasındaki farkı gizlerdi; fire de görünmez olurdu.
function useHurdaTelafi(d) {
  const { uretim, setUretim, stok, showToast, tanimlar, cop } = d;

const hurdaTelafiUretimiAc = useCallback((kaynakUretimId, bedenMiktarlari) => {
  const kaynak = uretim.find((o) => o.id === kaynakUretimId);
  if (!kaynak) return;
  const satirlar = Object.entries(bedenMiktarlari || {})
    .map(([beden, miktar]) => ({ beden, miktar: Number(miktar) || 0 }))
    .filter((x) => x.miktar > 0);
  if (satirlar.length === 0) return;

  // Silinen üretimlerin numaraları da sayılıyor (bkz. `enBuyukUretimNo`): bir numara bir kez
  // kullanıldıysa bir daha verilmiyor.
  const uretimNo = String(enBuyukUretimNo(uretim, cop) + 1);

  const urun = stok.find((p) => p.id === kaynak.urunId);
  const siraMap = {};
  (tanimlar.prosesler || []).forEach((p) => { siraMap[p.ad] = p.sira ?? 999; });
  const kullanilanProsesler = urun
    ? Array.from(new Set((urun.recete || []).filter((r) => r.mamulRenk === kaynak.renk && r.proses).map((r) => r.proses)))
    : [];
  const prosesIlerleme = kullanilanProsesler.length > 0
    ? kullanilanProsesler
        .map((p) => ({ proses: p, sira: siraMap[p] ?? 999, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null }))
        .sort((a, b) => a.sira - b.sira)
    : [{ proses: "Üretim", sira: 0, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null }];

  const toplam = satirlar.reduce((s, x) => s + x.miktar, 0);
  const yeni = {
    id: uid("uretim"),
    siparisNo: uretimNo,
    takipKodu: uretimNo,
    rezervasyonSiparisId: kaynak.rezervasyonSiparisId || null,
    ambalaj: kaynak.ambalaj || null,
    model: kaynak.model,
    adet: toplam,
    beden: `${kaynak.renk} · ${satirlar.map((x) => `${x.beden}:${x.miktar}`).join(", ")}`,
    urunId: kaynak.urunId,
    renk: kaynak.renk,
    bedenMiktarlari: satirlar,
    stogaEklendiMi: false,
    prosesIlerleme,
    termin: kaynak.termin || "",
    // Telafi olduğu kayıtta durur: rapor ve maliyet analizinde normal üretimden ayrılabilmeli.
    hurdaTelafisiMi: true,
    hurdaKaynakUretimNo: kaynak.siparisNo,
    not: `Hurda telafisi — ${kaynak.siparisNo}`,
    asama: "Planlandı",
    olusturuldu: new Date().toISOString(),
  };

  const nextUretim = [yeni, ...uretim];
  setUretim(nextUretim);
  yazimiIzle(tabloYaz("uretim:siparisler", "uretim", nextUretim), "Üretim", nextUretim);
  showToast(`Hurda telafisi için ${uretimNo} numaralı üretim açıldı — ${toplam} çift, ilk prosesten başlıyor`);
}, [uretim, stok, tanimlar, showToast, cop]);
  return hurdaTelafiUretimiAc;
}
