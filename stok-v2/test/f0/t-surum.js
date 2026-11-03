#!/usr/bin/env node
// F0 / SÜRÜM — ESKİ İSTEMCİ YENİ SUNUCUYA ARTIŞ BİLGİSİZ FİŞ GÖNDERİNCE SESSİZCE YANLIŞ KAYIT OLUŞMAZ.
// Tasarım (VERI-TUTARLILIGI-F0.md § 1): her yazma `istemci: {surum, yetenekler}` taşır; stk_ayar.min_istemci_surum doluysa altındaki
// ya da sürümsüz yük `AT001` ile reddedilir; zorlama kapalıyken sürümsüz çağrılar stk_istemci_iz'e düşer. Bugün hiçbiri yok.
const T = require("./ortak.js");
const { ON } = T;

(async () => {
  console.log(`F0 / SÜRÜM · önek ${ON}`);
  const sutun = T.psql("select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'stk_ayar' and column_name = 'min_istemci_surum';") === "1";
  const iz = T.psql("select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'stk_istemci_iz';") === "1";
  T.kontrol("S.mekanizma-var", "stk_ayar.min_istemci_surum ve stk_istemci_iz var", { sonra: { minIstemciSurum: sutun, izTablosu: iz }, gercek: [sutun, iz], beklenen: [true, true] });

  // S.eski-yuk-red — zorlama AÇIK (min 1.743.0) iken 1.742.1 biçimi (sürümsüz, artis yok) teslim yükü reddedilir, hiçbir şey yazılmaz
  const A = `${ON}-v-A`;
  const s = T.siparisKur(T.sipObj(`${ON}-sv`, [T.kalemObj(A, 20, 0)]));
  const once = { karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A) };
  let r;
  if (sutun) {
    T.psql("update public.stk_ayar set min_istemci_surum = '1.743.0' where id = 'tekil';");
    try { r = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 0, istek: `${ON}-iv1`, eski: true })); }
    finally { T.psql("update public.stk_ayar set min_istemci_surum = null where id = 'tekil';"); }
  } else {
    r = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 0, istek: `${ON}-iv1`, eski: true }));
  }
  const sonra = { karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A), kabul: r.ok, hata: r.hata || null, zorlama: sutun ? "açık" : "mekanizma yok — yük doğrudan gönderildi" };
  T.kontrol("S.eski-yuk-red", "zorlama açıkken sürümsüz eski yük AT001 ile reddedilir (0 / 0)", { once, sonra,
    gercek: [sonra.kabul, /AT001/.test(sonra.hata || ""), sonra.teslim], beklenen: [false, true, 0] });
  T.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
