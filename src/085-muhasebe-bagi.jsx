// ================= MUHASEBE BAĞI TEMİZLEME =================
//
// 19 Eylül (2. madde, 8. tur): bir fiş silindiğinde onun kasa/banka ayağını da temizleyen iş.
//
// NEDEN AYRI BİR İŞ: fiş iki tarafa birden yazılıyor (cari + kasa). Yalnız cari tarafını silmek,
// kasada karşılıksız bir hareket bırakıyordu — ilk denemede tam olarak bu oldu: cari hareketi
// silindi, kasa kaydı yerinde durdu ve kasa bakiyesi gerçeği söylemez hale geldi.
function useMuhasebeBagiTemizle(d) {
  const { muhasebe, setMuhasebe, cariler, showToast } = d;

const muhasebeBaglariniTemizle = useCallback(async (bagIdler, temel) => {
  if (!bagIdler || bagIdler.length === 0) return null;
  const kume = new Set(bagIdler);
  const kaynak = temel || muhasebe;
  const temizle = (liste) => (liste || []).map((h) => ({
    ...h,
    hareketler: (h.hareketler || []).filter((x) => !kume.has(x.muhasebeBagId)),
  }));
  const yeni = { ...kaynak, kasalar: temizle(kaynak.kasalar), bankalar: temizle(kaynak.bankalar) };
  setMuhasebe(yeni);
  return tekilYaz("muhasebe:data", "muhasebe", yeni);
}, [muhasebe]);
  return muhasebeBaglariniTemizle;
}
