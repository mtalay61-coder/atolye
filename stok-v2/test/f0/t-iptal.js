#!/usr/bin/env node
// F0 / D5 — SİPARİŞ İPTALİ VE DURUM. Kullanıcı kararı (1 Kasım, A seçeneği): iptalde teslim geçmişi ve fiş bağlantıları KORUNUR.
// Bugün (1.742.0+): 087 siparisKapat → fis_bag_coz hareketlerin sipariş/kalem bağını boşaltır; durum istemcinin yerel hesabıyla
// REST'ten yazılır. NOT: başlık satırı yerel sınamada TAKLİT (ortak.js — yalnız `durum` uygulanır).
const T = require("./ortak.js");
const { ON, E } = T;

(async () => {
  console.log(`F0 / D5 iptal ve durum · önek ${ON}`);

  // D5.iptal-bag-korunur — 20'lik kalem 4 teslim; sipariş iptal (uygulama yolu: fis_bag_coz + siparisBaglariniCoz sonucu köprüden)
  {
    const A = `${ON}-i-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-si`, [T.kalemObj(A, 20, 0)]));
    const t = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 4, ekran: 0, istek: `${ON}-ii1` }));
    const ekran = { ...s, durum: "Kısmi Teslim", kalemler: [T.kalemObj(A, 20, 4)] };
    const once = { durum: T.sipDb(s.id).durum, karsilanan: T.kalemDb(A).karsilanan, bagliTeslim: T.teslimDb(A), fis: T.fisDb(t.sonuc.fisNo) };
    const bc = T.rpc("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo });
    const d = E.siparisBaglariniCoz({ siparisler: [ekran], stok: [], cariler: [], uretim: [], koliler: [], stokRezervasyonlari: [], fisDefteri: [] }, s.id, { sil: false, kullanici: "Ali" });
    await T.kaydet("siparisler", [ekran], d.siparisler);
    const sonra = { durum: T.sipDb(s.id).durum, karsilanan: T.kalemDb(A).karsilanan, bagliTeslim: T.teslimDb(A), fis: T.fisDb(t.sonuc.fisNo), bagCoz: bc.ok ? bc.sonuc : bc.hata };
    T.kontrol("D5.iptal-bag-korunur", "iptalde 4 teslim tarihsel kalem bağında korunur; geçerli bağ çözülür", { once, sonra,
      gercek: [sonra.durum, sonra.karsilanan, sonra.bagliTeslim, sonra.fis.bagliSatir, Number(T.psql(`select coalesce(sum(-miktar),0) from public.stk_hareket where gecmis_kalem_id='${A}' and not iptal`))], beklenen: ["İptal", 4, 0, 0, 4] });

    // D5.iptal-siparise-teslim — iptal edilmiş siparişe yeni teslim sunucuda reddedilir
    const r = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 2, ekran: 4, istek: `${ON}-ii2` }));
    T.kontrol("D5.iptal-siparise-teslim", "iptal edilmiş siparişe teslim reddedilir", { sonra: { kabul: r.ok, durum: T.sipDb(s.id).durum }, gercek: r.ok, beklenen: false });
  }

  // D5.durum-eszamanli — 20'lik kalem 10 teslim; iki cihaz (ekranında 10) 5'er teslim eder, ikisi de kendi hesabıyla "Kısmi Teslim" yazar
  {
    const A = `${ON}-u-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-su`, [T.kalemObj(A, 20, 0)]));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 10, ekran: 0, istek: `${ON}-iu0` }));
    const ekran = { ...s, durum: "Kısmi Teslim", kalemler: [T.kalemObj(A, 20, 10)] };
    await T.kaydet("siparisler", [s], [ekran]);
    const once = { durum: T.sipDb(s.id).durum, teslim: T.teslimDb(A) };
    const p1 = T.rpcAyri("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 10, istek: `${ON}-iu1` }), { bekleSn: 0.5 }); await T.uyu(150);
    await Promise.all([p1, T.rpcAyri("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 10, istek: `${ON}-iu2` }))]);
    // 081:316 — her cihaz başlığı kendi yerel hesabıyla yazar (10 + 5 = 15 < 20 → Kısmi Teslim)
    const yerel = { ...ekran, durum: "Kısmi Teslim", kalemler: [T.kalemObj(A, 20, 15)] };
    await T.kaydet("siparisler", [ekran], [yerel]); await T.kaydet("siparisler", [ekran], [yerel]);
    const sonra = { durum: T.jsonSorgu(`select durum from public.siparisler_okuma where id='${s.id}'`)[0].durum, baslikOnbellek: T.sipDb(s.id).durum, teslim: T.teslimDb(A), karsilanan: T.kalemDb(A).karsilanan };
    T.kontrol("D5.durum-eszamanli", "20 / 20 teslimde durum Tamamlandı (sunucu hesaplar)", { once, sonra, gercek: sonra.durum, beklenen: "Tamamlandı" });
  }

  const d = T.denetim();
  // F1.1: bağı çözülmüş teslim iki kategoride — izli (D5a, F1.1 sunucusu) ya da izsiz (D5c, 1.742.x sunucusu / eski kayıt)
  const d5 = (d.D5a_bagi_cozulmus_teslim || 0) + (d.D5c_bagi_cozulmus_izsiz || 0);
  T.kontrol("D5.denetim-yakalar", "denetim tarihsel teslimi ve eski başlık önbelleği farkını görüyor; yetkili durum okuma görünümünde", { sonra: { D5a: d.D5a_bagi_cozulmus_teslim, D5c: d.D5c_bagi_cozulmus_izsiz, D5b: d.D5b_durum_teslimle_celisiyor },
    gercek: [d5 > 0, d.D5b_durum_teslimle_celisiyor > 0], beklenen: [true, true] });
  T.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
