#!/usr/bin/env node
// F0 / D1 — KARŞILANAN = GEÇERLİ STOK HAREKETLERİNİN TOPLAMI (her koşulda, her istemci sürümünde).
// Bugün (1.742.3): yeni istemci (artis) doğru; ESKİ istemci (1.742.1, artis yok) mutlak değer yazar → koparır.
const T = require("./ortak.js");
const { ON } = T;

(async () => {
  console.log(`F0 / D1 karşılanan · önek ${ON} · kurallar açık: ${T.kurallarAcik()}`);

  // D1.eski-eszamanli — iki 1.742.1 istemcisi aynı kaleme aynı anda 5'er (ikisinin ekranında 0)
  {
    const s = T.siparisKur(T.sipObj(`${ON}-s1`, [T.kalemObj(`${ON}-k1`, 20, 0)]));
    const once = { karsilanan: T.kalemDb(`${ON}-k1`).karsilanan, teslim: T.teslimDb(`${ON}-k1`) };
    const a = T.teslimYuku({ s, kalemId: `${ON}-k1`, adet: 5, ekran: 0, istek: `${ON}-i1a`, eski: true });
    const b = T.teslimYuku({ s, kalemId: `${ON}-k1`, adet: 5, ekran: 0, istek: `${ON}-i1b`, eski: true });
    const pa = T.rpcAyri("fis_kes", a, { bekleSn: 0.8 }); await T.uyu(250);
    const [ra, rb] = await Promise.all([pa, T.rpcAyri("fis_kes", b)]);
    const sonra = { karsilanan: T.kalemDb(`${ON}-k1`).karsilanan, teslim: T.teslimDb(`${ON}-k1`), fisler: [ra.ok, rb.ok] };
    T.kontrol("D1.eski-eszamanli", "iki eski istemci eşzamanlı 5'er → karşılanan = teslim = 10", { once, sonra, gercek: [sonra.karsilanan, sonra.teslim], beklenen: [10, 10] });

    void ra; void rb;
  }

  // D1.eski-tekrar-iptal — tutarlı başlangıç (iki yeni istemci 5'er → 10 / 10). Eski istemci A'nın fişini iptal eder (ekranında 10 →
  // mutlak 5); arada başka kullanıcı 3 teslim eder (8 / 8); eski istemcinin yanıtı kaybolmuş iptali TEKRAR gelir (aynı yük: mutlak 5).
  {
    const s = T.siparisKur(T.sipObj(`${ON}-s5`, [T.kalemObj(`${ON}-k5`, 20, 0)]));
    const ra = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-k5`, adet: 5, ekran: 0, istek: `${ON}-i5a` }));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-k5`, adet: 5, ekran: 5, istek: `${ON}-i5b` }));
    const ip = T.iptalYuku({ s, kalemId: `${ON}-k5`, fisNo: ra.sonuc.fisNo, adet: 5, ekran: 10, eski: true });
    const r1 = T.rpc("fis_iptal", ip);
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-k5`, adet: 3, ekran: 5, istek: `${ON}-i5c` }));
    const once = { karsilanan: T.kalemDb(`${ON}-k5`).karsilanan, teslim: T.teslimDb(`${ON}-k5`) };
    const r2 = T.rpc("fis_iptal", ip);
    const sonra = { karsilanan: T.kalemDb(`${ON}-k5`).karsilanan, teslim: T.teslimDb(`${ON}-k5`), iptal: [r1.ok, r2.ok && r2.sonuc.zatenIptal] };
    T.kontrol("D1.eski-tekrar-iptal", "eski istemcinin tekrar gelen iptali karşılananı ezmez (8 / 8)", { once, sonra, gercek: [sonra.karsilanan, sonra.teslim], beklenen: [8, 8] });
  }

  // D1.karisik-yeni-once — yeni istemci (artis) kilidi önce alır, eski istemci arkasından (ikisinin ekranında 0)
  {
    const s = T.siparisKur(T.sipObj(`${ON}-s2`, [T.kalemObj(`${ON}-k2`, 20, 0)]));
    const once = { karsilanan: T.kalemDb(`${ON}-k2`).karsilanan, teslim: T.teslimDb(`${ON}-k2`) };
    const yeni = T.teslimYuku({ s, kalemId: `${ON}-k2`, adet: 5, ekran: 0, istek: `${ON}-i2y` });
    const eski = T.teslimYuku({ s, kalemId: `${ON}-k2`, adet: 5, ekran: 0, istek: `${ON}-i2e`, eski: true });
    const p1 = T.rpcAyri("fis_kes", yeni, { bekleSn: 0.8 }); await T.uyu(250);
    await Promise.all([p1, T.rpcAyri("fis_kes", eski)]);
    const sonra = { karsilanan: T.kalemDb(`${ON}-k2`).karsilanan, teslim: T.teslimDb(`${ON}-k2`) };
    T.kontrol("D1.karisik-yeni-once", "yeni önce, eski arkasından → 10 / 10", { once, sonra, gercek: [sonra.karsilanan, sonra.teslim], beklenen: [10, 10] });
  }

  // D1.yeni-eszamanli — iki 1.742.3 istemcisi (artis) — BUGÜN YEŞİL olmalı (gerileme koruması)
  {
    const s = T.siparisKur(T.sipObj(`${ON}-s3`, [T.kalemObj(`${ON}-k3`, 20, 0)]));
    const once = { karsilanan: T.kalemDb(`${ON}-k3`).karsilanan, teslim: T.teslimDb(`${ON}-k3`) };
    const a = T.teslimYuku({ s, kalemId: `${ON}-k3`, adet: 5, ekran: 0, istek: `${ON}-i3a` });
    const b = T.teslimYuku({ s, kalemId: `${ON}-k3`, adet: 5, ekran: 0, istek: `${ON}-i3b` });
    const pa = T.rpcAyri("fis_kes", a, { bekleSn: 0.8 }); await T.uyu(250);
    const [ra] = await Promise.all([pa, T.rpcAyri("fis_kes", b)]);
    const sonra = { karsilanan: T.kalemDb(`${ON}-k3`).karsilanan, teslim: T.teslimDb(`${ON}-k3`) };
    T.kontrol("D1.yeni-eszamanli", "iki yeni istemci eşzamanlı 5'er → 10 / 10", { once, sonra, gercek: [sonra.karsilanan, sonra.teslim], beklenen: [10, 10] });
    // D1.yeni-iptal-tekrar — yeni istemci iptal + tekrar → 5 / 5 (YEŞİL)
    const ip = T.iptalYuku({ s, kalemId: `${ON}-k3`, fisNo: ra.sonuc.fisNo, adet: 5, ekran: 10 });
    T.rpc("fis_iptal", ip); T.rpc("fis_iptal", ip);
    const sonra2 = { karsilanan: T.kalemDb(`${ON}-k3`).karsilanan, teslim: T.teslimDb(`${ON}-k3`) };
    T.kontrol("D1.yeni-iptal-tekrar", "yeni istemci iptal + tekrar → 5 / 5", { once: sonra, sonra: sonra2, gercek: [sonra2.karsilanan, sonra2.teslim], beklenen: [5, 5] });
  }

  // D1.alis-eski-eszamanli — ALIŞ siparişinde iki eski istemci aynı anda 5'er teslim alır (giriş hareketi)
  {
    const s = T.siparisKur(T.sipObj(`${ON}-s4`, [T.kalemObj(`${ON}-k4`, 20, 0)], { tip: "Alış" }));
    const once = { karsilanan: T.kalemDb(`${ON}-k4`).karsilanan, teslim: T.teslimDb(`${ON}-k4`, "Alış") };
    const a = T.teslimYuku({ s, kalemId: `${ON}-k4`, adet: 5, ekran: 0, istek: `${ON}-i4a`, eski: true });
    const b = T.teslimYuku({ s, kalemId: `${ON}-k4`, adet: 5, ekran: 0, istek: `${ON}-i4b`, eski: true });
    const pa = T.rpcAyri("fis_kes", a, { bekleSn: 0.8 }); await T.uyu(250);
    const [ra, rb] = await Promise.all([pa, T.rpcAyri("fis_kes", b)]);
    const sonra = { karsilanan: T.kalemDb(`${ON}-k4`).karsilanan, teslim: T.teslimDb(`${ON}-k4`, "Alış"), fisler: [ra.ok, rb.ok] };
    T.kontrol("D1.alis-eski-eszamanli", "alışta iki eski istemci → 10 / 10", { once, sonra, gercek: [sonra.karsilanan, sonra.teslim], beklenen: [10, 10] });
  }

  // Denetim bu koşunun D1 sonucunu doğru yansıtıyor: D1a sayısı = bu koşuda karşılananı teslimden farklı kalan kalem sayısı.
  // (F1'den önce "sayı > 0" diye yazılmıştı — hatanın varlığına bağlıydı; F1'de fark kalmayınca anlamsızlaştı. 1 Kasım, raporda.)
  const d = T.denetim();
  const kalemler = ["k1", "k2", "k3", "k4", "k5"].map((x) => `${ON}-${x}`);
  const farkli = kalemler.filter((id) => { const k = T.kalemDb(id); return k.var && Math.abs(k.karsilanan - T.teslimDb(id, id.endsWith("k4") ? "Alış" : "Satış")) > 0.005; }).length;
  T.kontrol("D1.denetim-yakalar", "denetim D1a = bu koşuda karşılananı teslimden farklı kalem sayısı", { sonra: { D1a: d.D1a_karsilanan_hareketten_farkli, farkliKalem: farkli },
    gercek: d.D1a_karsilanan_hareketten_farkli, beklenen: farkli });
  T.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
