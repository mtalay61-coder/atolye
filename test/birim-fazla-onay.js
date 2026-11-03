// BİRİM — SATIŞ SİPARİŞİ FAZLASI, YÖNETİCİ ONAYI (v1.744.4, F3). Sunucu (fis_satis_teslim_koru) onaysız fazlayı KR007 ile
// reddeder ve yetkiyi kendisi doğrular; burada istemcinin kimden / nasıl onay aldığı ve yüke ne koyduğu sınanır.
const E = require("./erp.cjs");
let hata = 0;
const bak = (ad, gercek, beklenen) => { const ok = JSON.stringify(gercek) === JSON.stringify(beklenen); if (!ok) hata = 1;
  console.log(`  ${ok ? "✓" : "✗"} ${ad}${ok ? "" : `\n      beklenen: ${JSON.stringify(beklenen)}\n      çıkan:    ${JSON.stringify(gercek)}`}`); };
const satis = { id: "s1", tip: "Satış" }, alis = { id: "a1", tip: "Alış" };
const bul = (k) => (k._siparisId === "a1" ? alis : k._siparisId === "s1" ? satis : null);
const kalemler = [
  { kalemId: "k1", _siparisId: "s1", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 5, kalan: 3 },   // satış, 2 fazla
  { kalemId: "k2", _siparisId: "s1", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 2, kalan: 4 },   // fazla değil
  { kalemId: "k3", _siparisId: "a1", urunAd: "Deri", renk: "Taba", beden: "", miktar: 9, kalan: 1 },     // alış: kurala girmez
  { kalemId: "k4", _siparisId: "s1", urunAd: "Bot", renk: "Taba", beden: "39", miktar: 1, fazlaGonderim: true }, // 255 işareti
  { _siparisId: "s1", urunAd: "Serbest", miktar: 99, kalan: 0 },                                           // kalemsiz: kurala girmez
];
bak("fazla satırlar: yalnız satış, kalemli, kalanı aşan (255 işareti dahil)", E.fazlaTeslimKalemleri(kalemler, bul),
  [{ ad: "Bot", renk: "Siyah", beden: "40", fazla: 2 }, { ad: "Bot", renk: "Taba", beden: "39", fazla: null }]);
bak("fazla yoksa onay adımı atlanır", E.fazlaTeslimOnayiAl([], { rol: "Yönetici" }, () => {}), undefined);
const toastlar = []; const toast = (m) => toastlar.push(m);
const fazlalar = E.fazlaTeslimKalemleri(kalemler, bul);
let soruldu = 0;
bak("Yönetici değil: soru sorulmaz, durur", E.fazlaTeslimOnayiAl(fazlalar, { rol: "Depo" }, toast, () => { soruldu++; return "x"; }), null);
bak("Yönetici değil: uyarı fazlayı ve kuralı söyler", [soruldu, /Bot Siyah 40: 2 fazla/.test(toastlar[0]), /yalnız yönetici onayıyla/.test(toastlar[0])], [0, true, true]);
bak("girişsiz (kullanıcı yok): durur", E.fazlaTeslimOnayiAl(fazlalar, null, toast, () => "x"), null);
bak("Yönetici, gerekçe boş: durur", E.fazlaTeslimOnayiAl(fazlalar, { rol: "Yönetici" }, toast, () => "   "), null);
bak("Yönetici, vazgeçti (null): durur", E.fazlaTeslimOnayiAl(fazlalar, { rol: "Yönetici" }, toast, () => null), null);
bak("Yönetici, gerekçe: onay nesnesi (sunucunun beklediği biçim)", E.fazlaTeslimOnayiAl(fazlalar, { rol: "Yönetici" }, toast, () => "  Müşteri ek istedi "),
  { onay: true, gerekce: "Müşteri ek istedi" });
bak("gerekçe 500 karakterle sınırlı", E.fazlaTeslimOnayiAl(fazlalar, { rol: "Yönetici" }, toast, () => "a".repeat(800)).gerekce.length, 500);
// Teslim yükü: onay üst düzey `fazlaTeslimOnayi` alanına gider; onaysız yükte alan YOK (sunucu sahte imzayı zaten atar)
const ortak = { siparis: { id: "s1", tip: "Satış", siparisNo: "SAT-1", cariId: "c1", kalemler: [] }, fisGovdesi2: { kaynak: "Satış", defter: "Genel", stokTarihi: "2026-11-02" },
  sonuc: { stok: [], cariHareketleri: [], kimlikler: new Map() }, islenenler: [], defterKaydi: null, oncekiSiparisler: [], nextSiparisler: [],
  etkilenenIdler: [], yeniSayac: 1, kullaniciAd: "Ali", zaman: "2026-11-02T10:00:00Z", istek: "fis-1" };
bak("teslim yükü: onaysız → alan yok", "fazlaTeslimOnayi" in E.siparisTeslimSunucuYuku(ortak).yuk, false);
bak("teslim yükü: onaylı → üst düzey alan", E.siparisTeslimSunucuYuku({ ...ortak, fazlaOnayi: { onay: true, gerekce: "g" } }).yuk.fazlaTeslimOnayi, { onay: true, gerekce: "g" });
// Tek ekran fişi (089): satır işareti değil, KAYIT ANINDAKİ miktar; aynı kaleme iki satır toplanır
const siparisler = [{ id: "s1", tip: "Satış", kalemler: [{ id: "k1", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 2, karsilanan: 0 }] }];
const fisSatirlari = [{ kalemId: "k1", siparis: { id: "s1" }, miktar: 2 }, { kalemId: "k1", miktar: 1 }, { urunAd: "Serbest", miktar: 5 }];
bak("fiş kalemleri: kaleme göre toplanır, kalan siparişten", E.fisKalemlerininKalani(fisSatirlari, siparisler),
  [{ kalemId: "k1", _siparisId: "s1", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 3, kalan: 2 }]);
bak("işaretsiz ama elle büyütülmüş satır fazla sayılır", E.fazlaTeslimKalemleri(E.fisKalemlerininKalani(fisSatirlari, siparisler), (k) => siparisler.find((s) => s.id === k._siparisId)),
  [{ ad: "Bot", renk: "Siyah", beden: "40", fazla: 1 }]);
bak("kalan kadar teslim fazla değil", E.fazlaTeslimKalemleri(E.fisKalemlerininKalani([{ kalemId: "k1", miktar: 2 }], siparisler), (k) => siparisler.find((s) => s.id === k._siparisId)), []);
process.exit(hata);
