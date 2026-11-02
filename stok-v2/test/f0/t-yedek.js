#!/usr/bin/env node
// F0 / YEDEK — YEDEKTEN GERİ YÜKLEME AKTİF FİŞLERLE ÇELİŞİRSE KISMİ İŞLEM YAPILMAZ. Kullanıcı kararı (1 Kasım): fiş sistemi açıkken
// güvenli olduğu kanıtlanmamış TAM geri yükleme kapalı; kart / tanım geri yüklemesi de referans bütünlüğü denetiminden geçer.
// Uygulamanın sırası (093 yedegiUygula): önce stok (urunler, hareketlerle), sonra siparişler — her biri ayrı köprü yazması.
// Kurallar KAPALI (canlının 19. adımdan önceki hâli) ve AÇIK ayrı ayrı. Test sonunda kurallar her durumda AÇIK bırakılır.
const T = require("./ortak.js");
const { ON } = T;

// stok yedeği / şimdiki hâl: uygulamanın gördüğü biçim (ortak.js stokOku ile aynı, yalnız u-yeni)
const stokOku = () => {
  const v = T.jsonSorgu("select * from public.varyantlar where urun_id = 'u-yeni'");
  const h = T.jsonSorgu("select * from public.stok_hareketleri where urun_id = 'u-yeni' order by tarih desc, id");
  const u = T.jsonSorgu("select id, ad, kategori from public.urunler where id = 'u-yeni'")[0];
  return [{ ...u, variants: v.map((x) => ({ renk: x.renk, renkId: x.renk_id || null, beden: x.beden, miktar: Number(x.miktar), minStok: 0 })),
    hareketler: h.map((x) => ({ ...(x.ek || {}), id: x.id, renk: x.renk, beden: x.beden, miktar: Number(x.miktar), kaynak: x.kaynak, tarih: x.tarih,
      fisNo: x.fis_no, siparisNo: x.siparis_no, cariId: x.cari_id, siparisId: x.siparis_id, kalemId: x.kalem_id })) }];
};

async function tamGeriYukleme(etiket, kurallarAcik) {
  T.kurallariAyarla(kurallarAcik);
  const A = `${ON}-${etiket}-A`;
  const s = T.siparisKur(T.sipObj(`${ON}-${etiket}`, [T.kalemObj(A, 20, 0)]));
  const yedekStok = stokOku(), yedekSip = [s];                        // YEDEK (T0)
  const t = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 3, ekran: 0, istek: `${ON}-${etiket}-i1` }));   // yedekten SONRA teslim
  const simdiSip = [{ ...s, durum: "Kısmi Teslim", kalemler: [T.kalemObj(A, 20, 3, { birimFiyat: 150 })] }];
  await T.kaydet("siparisler", yedekSip, simdiSip);                  // yedekten sonra fiyat da değişti (150)
  const once = { fis: T.fisDb(t.sonuc.fisNo), karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A), fiyat: Number(T.psql(`select fiyat from public.siparis_kalemleri where id = '${A}';`)) };
  // Eski istemci sunucuya sürüm başlığı taşımıyor. Desteklenen yeni istemci tam geri yüklemeyi zaten ilk adımda durdurur.
  T.psql("update public.stk_ayar set min_istemci_surum='1.744.3' where id='tekil';");
  let r1,r2;
  try {
    r1 = await T.kaydet("urunler", stokOku(), yedekStok, { topluSilmeIzni: true });
    r2 = await T.kaydet("siparisler", simdiSip, yedekSip, { topluSilmeIzni: true });
  } finally { T.psql("update public.stk_ayar set min_istemci_surum=null where id='tekil';"); }
  const sonra = { fis: T.fisDb(t.sonuc.fisNo), karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A), fiyat: Number(T.psql(`select fiyat from public.siparis_kalemleri where id = '${A}';`)),
    stokYazmasi: r1.hata ? "RED" : "kabul", siparisYazmasi: r2.hata ? "RED" : "kabul" };
  return { once, sonra };
}

(async () => {
  console.log(`F0 / YEDEK geri yükleme · önek ${ON}`);
  try {
    // Y.tam-kurallar-kapali — yedekten sonra teslim var; tam geri yükleme
    {
      const { once, sonra } = await tamGeriYukleme("yk", false);
      T.kontrol("Y.tam-kurallar-kapali", "çelişen tam geri yükleme hiçbir şeyi değiştirmez (fiş satırı geçerli, 3 / 3, fiyat 150)", { once, sonra,
        gercek: [sonra.fis.gecerliSatir, sonra.karsilanan, sonra.teslim, sonra.fiyat], beklenen: [1, 3, 3, 150] });
    }
    // Y.tam-kurallar-acik — aynı geri yükleme kurallar açıkken: yarım işlem olmamalı
    {
      const { once, sonra } = await tamGeriYukleme("ya", true);
      T.kontrol("Y.tam-kurallar-acik", "kısmi işlem yok: stok reddedildiyse sipariş de değişmez (fiyat 150)", { once, sonra,
        gercek: [sonra.fis.gecerliSatir, sonra.karsilanan, sonra.teslim, sonra.fiyat], beklenen: [1, 3, 3, 150] });
    }
    // Y.kart-referans — yalnız sipariş kartı geri yüklenir; yedekte olmayan C kalemi yedekten sonra eklenip 2 teslim almış
    {
      T.kurallariAyarla(true);
      const A = `${ON}-yr-A`, C = `${ON}-yr-C`;
      const yedek = T.siparisKur(T.sipObj(`${ON}-yr`, [T.kalemObj(A, 20, 0)]));
      const simdi = { ...yedek, kalemler: [T.kalemObj(A, 20, 0), T.kalemObj(C, 5, 0)] };
      await T.kaydet("siparisler", [yedek], [simdi]);
      T.rpc("fis_kes", T.teslimYuku({ s: simdi, kalemId: C, adet: 2, ekran: 0, istek: `${ON}-yr-i1` }));
      const simdiTam = { ...simdi, durum: "Kısmi Teslim", kalemler: [T.kalemObj(A, 20, 0), T.kalemObj(C, 5, 2)] };
      const once = { C: T.kalemDb(C), teslimC: T.teslimDb(C) };
      const r = await T.kaydet("siparisler", [simdiTam], [yedek], { topluSilmeIzni: true });
      const sonra = { C: T.kalemDb(C), teslimC: T.teslimDb(C), yazma: r.hata ? "RED" : r.istekler };
      T.kontrol("Y.kart-referans", "teslimli kalemi silecek kart geri yüklemesi reddedilir (C durur, 2 / 2)", { once, sonra,
        gercek: [sonra.C.var, sonra.C.karsilanan, sonra.teslimC], beklenen: [true, 2, 2] });
    }
  } finally {
    T.kurallariAyarla(true);
  }
  const d = T.denetim();
  T.kontrol("Y.denetim-yakalar", "eski geri yükleme yeni fişi satırsız bırakamaz (D6a 0); sahipsiz hareket yok (D2a 0)", { sonra: { D6a: d.D6a_satirsiz_stok_fisi, D2a: d.D2a_sahipsiz_hareket_kalem_yok },
    // F8 (2 Kasım): eski stok geri yüklemesi fis_kes hareketini iptal edemez; satırsız fiş de oluşmaz.
    gercek: [d.D6a_satirsiz_stok_fisi || 0, d.D2a_sahipsiz_hareket_kalem_yok || 0], beklenen: [0, 0] });
  console.log(`  kurallar test sonunda açık: ${T.kurallarAcik()}`);
  T.bitir();
})().catch((e) => { try { T.kurallariAyarla(true); } catch (x) { /* */ } console.error(e); process.exit(2); });
