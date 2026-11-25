#!/usr/bin/env node
// G-25 YETKİ MATRİSİ (23 Kasım). Yalnız YEREL PostgreSQL; Supabase'e bağlanmaz. Bütün istekler test/gercek-pg-kopru.js ile, kullanıcının
// JWT'siyle `authenticated` rolünde (Supabase'teki oturumlu istek gibi; jetonsuz / SQL Editor başarısı kullanıcı başarısı SAYILMAZ —
// stk_yetki jetonsuz çağrıyı denetlemez). Fiş yükleri uygulamanın 1.744.36'da gönderdiğiyle aynı biçimde (23 Kasım yük derlemi).
// Kullanım: node matris.js <veritabanı> <etiket> [--beklenen]   → satır satır sonuç; --beklenen: tasarım § 6 beklentileri (A1–A8)
// denetlenir, tutmayan satır "✗" ve çıkış 1. Her retten sonra stok / cari / kasa satırı, fiş başlığı ve sayaç ölçülür (A5).
const path = require("path");
const { kopruKur } = require(path.join(__dirname, "../../../../test/gercek-pg-kopru.js"));
const DB = process.argv[2], ETIKET = process.argv[3] || "", BEKLENEN = process.argv.includes("--beklenen");
const FIS = "«FIS»", ANA = "«ANAFIS»";
const URL = "http://yerel.test/rest/v1/";
const KUL = { Ali: "ali", Muhasip: "muhasip", Uretimci: "uretimci", Ayse: "ayse", Stokcu: "stokcu", Uretsil: "uretsil", Carici: "carici",
  Muhasebeci: "muhasebeci", Fisci: "fisci", Veli: "veli", Deniz: "deniz" };
const eposta = (k) => `${KUL[k]}@atolye.local`;
let sira = 0; const yeniId = (on) => `g25-${on}-${process.pid}-${++sira}`;
const bugun = new Date().toISOString().slice(0, 10);

const cariSatir = (cari, yon, tutar, ek = {}, alan = {}) => ({ id: alan.id || yeniId("c"), cari_id: cari, tarih: bugun, zaman: new Date().toISOString(),
  yon, tutar, para_birimi: "TRY", odeme_sekli: "Nakit", vade: null, defter: "Genel", fis_no: FIS, siparis_no: null, uretim_id: alan.uretim_id || null,
  urun_ad: null, renk: null, aciklama: "G-25 sınaması", ek: { kullanici: "G25", ...ek }, ...alan });
const stokSatir = (id, miktar, cari, alan = {}) => ({ id, fisId: FIS, urunId: "ekr-bot", renkId: null, renk: "Siyah", olcuId: null, olcu: "40",
  miktar, kaynak: "G25", tarih: new Date().toISOString(), siparisId: null, siparisNo: null, kalemId: null, cariId: cari, uretimId: null,
  rezervasyonSiparisId: null, fazlaGonderim: false, aciklama: "G-25 sınaması", ek: {}, ...alan });
const kasa = (yon, tutar) => ({ id: yeniId("k"), hesap_id: "K1", veri: { id: null, tarih: bugun, yon, tutar, aciklama: "G-25 sınaması", fisNo: FIS, defter: "Genel" } });
const fis = (onek, aile, tur, alan = {}) => ({ aile, tur, onek, kaynak: "G25", defter: "Genel", tarih: new Date().toISOString(), cariId: null,
  paraBirimi: "TRY", tutar: null, kalemler: [], ...alan });
const yuk = (f, { stok = [], cari = [], kasaH = [], bagli = null, alt = null } = {}) => {
  const p = { istek: yeniId("istek"), fis: f, cari: { satirlar: cari } };
  if (stok.length) p.stok = { satirlar: stok };
  if (kasaH.length) p.kasa = { hareketler: kasaH.map((k) => ({ ...k, veri: { ...k.veri, id: k.id } })) };
  if (bagli) p.bagli = bagli;
  if (alt) p.alt = alt;
  return p;
};
const af = (cari, opt = {}) => {   // stoklu alış: 5 × 12 = 60
  const id = yeniId("s");
  const c = cariSatir(opt.cariSatirCari || cari, opt.yon || "Alacak", opt.tutar ?? 60, { miktar: 5, birimFiyat: 12, ...(opt.ek || {}) }, { id: opt.cariId || id });
  return yuk(fis("AF", "stok", "Alış", { cariId: cari }), { stok: [stokSatir(id, opt.miktar ?? 5, cari)], cari: [c], kasaH: opt.kasaH || [] });
};
const sf = (cari, opt = {}) => {   // stoklu satış: 2 × 100 = 200
  const id = yeniId("s");
  const p = yuk(fis("SF", "stok", "Satış", { cariId: cari }), { stok: [stokSatir(id, -2, cari)],
    cari: [cariSatir(cari, opt.yon || "Borç", 200, { miktar: 2, birimFiyat: 100 }, { id })] });
  if (opt.pesin) p.bagli = { fis: fis("TH", "para", "Tahsilat", { cariId: cari }), cari: { satirlar: [cariSatir(cari, "Alacak", 200, { islemTipi: "Tahsilat" })] },
    kasa: { hareketler: [kasa("Giriş", 200)].map((k) => ({ ...k, veri: { ...k.veri, id: k.id } })) } };
  return p;
};
// ÜRETİM TESLİMİ (24 Kasım, P1): uygulama atamayı İŞ VERİRKEN sunucuya yazar; teslimde aynı atamayı alt'ta "tamamlandı" yapar ve
// işçilik satırını ekler. Her deneme için TAZE bir üretim + atama yönetim yetkisiyle (jetonsuz) kurulur — "önceden kayıtlı" hâl;
// atama bir kez ödenir, bu yüzden tekrar kullanılmaz. Meşru alıcı g25-q (Personel, bölümde DEĞİL — g25-p maaşlı bölüm personeli).
let K = null, ISTEK = null;
// İŞ ONAYI (25 Kasım, atama düzeyi): yetkili (Muhasip) işin ŞU ANKİ özetini (kişi, zincir toplam miktarı, ücret) onaylar. ÖNCE'de
// (G-25 yok) fonksiyon yok — onay atlanır. `onay: false` → onaysız iş.
const isiOnayla = async (kok, kul = "Muhasip") => {
  let oz = null;
  try { oz = (await K.sorgu("select public.g25_ucret_guncel($1) o", [`atama|${kok}`]))[0].o; } catch (e) { return { ok: false, kod: "G-25 yok" }; }
  return ISTEK(kul, "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: `atama|${kok}`, ozet: oz }] } });
};
const yeniAtama = async ({ personel = "g25-q", proses = "Kesim", miktar = 10, tamir = false, tamirUcret = 0, ek = {}, onay = true } = {}) => {
  const uid = yeniId("u"), aid = yeniId("a");
  await K.sorgu(`insert into public.uretim (id, siparis_no, urun_id, asama, ek, renk, adet, model) values ($1, $2, 'ekr-bot', $3, '{}'::jsonb, 'Siyah', 10, 'Ekran Bot')`, [uid, uid, proses]);
  await K.sorgu(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
    values ($1, $2, $3, $4, '{"40": 10}'::jsonb, $5, true, false, $6, $7, $8)`, [aid, uid, proses, personel, miktar, tamir, tamirUcret, ek]);
  if (onay) await isiOnayla(aid);
  return { uid, aid };
};
// KISMİ TESLİM YÜKÜ (istemci 079 gibi): teslim edilen atama `n`e iner ve tamamlanır; kalan (miktar − n) aynı kişiye yeni parça,
// ek.kismiKalanKaynak = teslim edilen atama. Zincir toplamı değişmez.
const kismiAlt = async (aid, n) => { const r = (await K.sorgu("select to_jsonb(a) j from public.uretim_atamalari a where id = $1", [aid]))[0].j;
  const kalanId = yeniId("a");
  return { kalanId, alt: { uretim_atamalari: { satirlar: [{ ...r, miktar: n, tamamlandi_mi: true, tamamlanma_tarihi: new Date().toISOString() },
    { ...r, id: kalanId, miktar: Number(r.miktar) - n, tamamlandi_mi: false, tamamlanma_tarihi: null, ek: { ...(r.ek || {}), kismiKalanKaynak: aid } }] } } }; };
const teslimAlt = async (aid) => { const r = (await K.sorgu("select to_jsonb(a) j from public.uretim_atamalari a where id = $1", [aid]))[0];
  return r ? { uretim_atamalari: { satirlar: [{ ...r.j, tamamlandi_mi: true, tamamlanma_tarihi: new Date().toISOString() }] } } : null; };
const urtYuk = (cari, miktar, ucret, uid, alt = null) => yuk(fis("ÜRT", "para", "Üretim", { cariId: cari, uretimId: uid }),
  { cari: [cariSatir(cari, "Alacak", miktar * ucret, { islemTipi: "İşçilik", miktar, birimFiyat: ucret }, { uretim_id: uid })], alt });
// atamayı kur, teslim yükünü döndür (opt.cari: satırın carisi atamanınkinden farklı olabilir — sahtecilik denemeleri)
const urt = async (miktar, ucret, opt = {}) => { const a = await yeniAtama(opt.atama || {});
  return urtYuk(opt.cari || (opt.atama && opt.atama.personel) || "g25-q", miktar, ucret, opt.uretimId || a.uid, await teslimAlt(a.aid)); };
// ara proses: atama yok; her deneme taze üretim (adım başına bir ödeme)
const urtAra = async (cari = "g25-f", miktar = 10, ucret = 2) => { const a = await yeniAtama(); return urtYuk(cari, miktar, ucret, a.uid); };
const para = (onek, tur, cari, yon, tutar, ek = {}, kasaH = []) => yuk(fis(onek, "para", tur, { cariId: cari }), { cari: [cariSatir(cari, yon, tutar, ek)], kasaH });

const ISLEMLER = {
  CVR: () => yuk(fis("CVR", "para", "Cari virmanı", { cariId: "g25-m", tutar: 100 }),
    { cari: [cariSatir("g25-m", "Borç", 100, { islemTipi: "Ödeme", odemeSekli: "Virman" }), cariSatir("g25-t", "Alacak", 100, { islemTipi: "Tahsilat" })] }),
  TH_nakit: () => para("TH", "Tahsilat", "g25-m", "Alacak", 50, { islemTipi: "Tahsilat" }, [kasa("Giriş", 50)]),
  CH_serbest: () => para("CH", "Cari hareketi", "g25-m", "Borç", 20),
  AF_urunsuz: () => para("AF", "Alış", "g25-t", "Alacak", 30, { islemTipi: "Alış" }),
  AF_demirbas: () => { const p = para("AF", "Alış", "g25-t", "Alacak", 40, { islemTipi: "Alış" }); p.fis.kaynak = "Demirbaş alımı"; return p; },
  MAS: () => para("MAŞ", "Maaş", "g25-p", "Alacak", 30000, { islemTipi: "Maaş" }),
  MS: () => para("MS", "Mesai", "g25-p", "Alacak", 500, { islemTipi: "Mesai" }),
  AF_stok: () => af("g25-t"),
  SF_stok: () => sf("g25-m"),
  SF_pesin: () => sf("g25-m", { pesin: true }),
  URT_teslim: () => urt(10, 35),
  URT_ara: () => urtAra(),
  VRM: () => yuk(fis("VRM", "para", "Virman", {}), { kasaH: [kasa("Çıkış", 10), kasa("Giriş", 10)] }),
  MNL: () => yuk(fis("MNL", "stok", "Giriş", {}), { stok: [stokSatir(yeniId("s"), 1, null)] }),
};
// SAHTECİLİK (A4) — stok / üretim yetkilisiyle
const SAHTE = {
  a_TH_stok_satiri: () => { const p = ISLEMLER.TH_nakit(); p.kasa = undefined; p.stok = { satirlar: [stokSatir(yeniId("s"), 1, "g25-m")] }; return p; },
  b_AF_tahsilat_tipi: () => af("g25-t", { ek: { islemTipi: "Tahsilat" } }),
  c_kimlik_uymuyor: () => af("g25-t", { cariId: yeniId("x") }),
  d_tutar_sisirme: () => af("g25-t", { tutar: 999 }),
  e_baska_cari: () => af("g25-t", { cariSatirCari: "g25-m" }),
  f_satis_yon_ters: () => sf("g25-m", { yon: "Alacak" }),
  g_stok_fisine_kasa: () => af("g25-t", { kasaH: [kasa("Çıkış", 60)] }),
  h_urt_atanmamis_cari: () => urt(3, 35, { cari: "g25-m" }),
  i_urt_ucret_yok: () => urt(3, 1000),
  j_urt_adet_asimi: () => urt(11, 35),
  k_bilinmeyen_onek: () => para("XX", "Bilinmeyen", "g25-m", "Borç", 5),
  l_urt_kayit_yok: () => urt(3, 35, { uretimId: "yok-uretim" }),
  m_urt_teslimsiz: async () => { const a = await yeniAtama(); return urtYuk("g25-q", 3, 35, a.uid); },   // atama tamamlanmıyor
  n_urt_bolum_personeli: () => urt(10, 35, { atama: { personel: "g25-p" } }),                       // maaşlı bölüm personeli
};

(async () => {
  const k = kopruKur({ veritabani: DB }); K = k;
  ISTEK = (...x) => istek(...x);
  const istek = async (kul, yol, govde, yontem = "POST", ek = {}) => {
    const y = await k.__yanitla({ url: () => URL + yol, method: () => yontem, postData: () => JSON.stringify(govde),
      headers: () => ({ authorization: `Bearer yerel-test:${eposta(kul)}`, "content-type": "application/json", "x-atolye-surum": "1.744.36", ...ek }) });
    let g = null; try { g = JSON.parse(y.body); } catch (e) { g = null; }
    return { ok: y.status < 300, kod: y.status < 300 ? null : ((g && g.code) || String(y.status)), mesaj: g && g.message, govde: g };
  };
  // ANLIK GÖRÜNTÜ (A5): satır SAYISI yetmez — her tablonun bütün satırlarının içerik özeti (md5, sıralı) + cari / kasa bakiyeleri + stok.
  // Ret sonrası birebir aynı olmalı: var olan bir satırın değişmesi (ör. iptal bayrağı, tutar, bildirim durumu) de yakalanır.
  const TABLOLAR = ["stk_fis", "stk_hareket", "car_hareket", "kas_hareket", "kas_cek", "fis_sayac", "uretim_atamalari", "siparis_kalemleri", "tanimlar", "cariler", "mes_bildirim"];
  const sayac = async () => {
    const icerik = {};
    for (const t of TABLOLAR) {
      const r = await k.sorgu(`select case when to_regclass('public.${t}') is null then 'yok' else
        (select count(*)::text || ':' || coalesce(md5(string_agg(x::text, '|' order by x::text)), '-') from (select to_jsonb(z) x from public.${t} z) y) end as v`).catch(() => [{ v: "yok" }]);
      icerik[t] = r[0].v;
    }
    const cari = await k.sorgu(`select h.cari_id, coalesce(h.para_birimi, 'TRY') pb, sum(case when h.yon = 'Borç' then h.tutar else -h.tutar end)::text b
      from public.car_hareket h left join public.stk_fis f on f.id = h.fis_no where not h.iptal and not coalesce(f.iptal, false) group by 1, 2 order by 1, 2`);
    const kasa = await k.sorgu(`select h.hesap_id, sum(case when h.veri ->> 'yon' = 'Giriş' then (h.veri ->> 'tutar')::numeric else -(h.veri ->> 'tutar')::numeric end)::text b
      from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where not h.iptal and not coalesce(f.iptal, false) group by 1 order by 1`);
    const stok = await k.sorgu(`select varyant_id, miktar::text from public.stk_stok order by 1`).catch(() => []);
    return JSON.stringify({ icerik, cari, kasa, stok });
  };
  const farkAdi = (a, b) => { const x = JSON.parse(a), y = JSON.parse(b);
    return [...Object.keys(x.icerik).filter((t) => x.icerik[t] !== y.icerik[t]), ...["cari", "kasa", "stok"].filter((t) => JSON.stringify(x[t]) !== JSON.stringify(y[t])).map((t) => `${t} bakiyesi`)].join(", "); };
  const satirlar = []; let kirmizi = 0;
  const yaz = (anahtar, sonuc, beklenen) => {
    const durum = sonuc.ok ? "geçti" : `ret ${sonuc.kod}${sonuc.atomik === false ? ` · DEĞİŞEN: ${sonuc.degisen}` : ""}`;
    let isaret = "";
    if (BEKLENEN && beklenen !== undefined) {
      const tutar = beklenen === "geçti" ? sonuc.ok : (!sonuc.ok && (beklenen === "ret" || durum.startsWith(beklenen)) && sonuc.atomik !== false);
      isaret = tutar ? " ✓" : ` ✗ (beklenen ${beklenen})`;
      if (!tutar) kirmizi += 1;
    }
    satirlar.push(`${anahtar} · ${durum}${isaret}`);
    console.log(`${anahtar} · ${durum}${isaret}${!sonuc.ok && sonuc.mesaj && process.env.T25_AYRINTI ? `  [${sonuc.mesaj}]` : ""}`);
  };
  const dene = async (kul, yol, govde, yontem = "POST", ek = {}) => {
    const once = await sayac();
    const r = await istek(kul, yol, govde, yontem, ek);
    if (!r.ok) { const sonra = await sayac(); r.atomik = sonra === once; if (!r.atomik) r.degisen = farkAdi(once, sonra); }
    return r;
  };

  // A1–A3, A7: kullanıcı × işlem
  const PARA = ["Ali", "Muhasip", "Carici", "Muhasebeci"];
  const beklenen = (kul, is) => {
    // Teslim atamayı da yazar (alt_yaz: stok / üretim grubu ister — G-25 öncesi de böyle, G-25 değiştirmez): yalnız muhasebe yetkilisi teslim alamaz.
    if (kul === "Muhasebeci" && is === "URT_teslim") return "ret 42501";
    if (PARA.includes(kul)) return "geçti";
    if (["Veli", "Deniz"].includes(kul)) return "ret 42501";
    const stokMu = ["AF_stok", "SF_stok", "URT_teslim", "URT_ara", "MNL"].includes(is);
    if (stokMu) return "geçti";
    if (is === "VRM") return kul === "Fisci" ? "geçti" : "ret 42501";
    return "ret 42501";
  };
  console.log(`── G-25 yetki matrisi · ${DB} · ${ETIKET}`);
  // C · İŞ / ÜCRET ONAYI (24–25 Kasım, K4): işçilik yalnız cari / muhasebe yetkilisinin ONAYLADIĞI işle (kişi, toplam miktar, ücret)
  // ödenir. Onay listesi → yetkisiz onay ret → ekrandaki eski değerle onay ret (KR015) → Muhasip onaylar; ara proses (g25-f, 2) de.
  const onayListesi = async (kul, kapsam = "acik") => { const r = await istek(kul, "rpc/ucret_onaylari", { p: { kapsam } }); return r.ok && Array.isArray(r.govde) ? r.govde : []; };
  const onayKalemi = async (anahtar) => (await onayListesi("Muhasip")).find((x) => x.anahtar === anahtar);
  { const a = await yeniAtama({ onay: false });
    const g = await onayKalemi(`atama|${a.aid}`);
    yaz("C · onay listesinde iş (g25-q, 10 adet × 35 ₺, onaysız) · Uretimci görür", { ok: !!(await onayListesi("Uretimci")).find((x) => x.anahtar === `atama|${a.aid}` && !x.onayli
      && Number(x.guncel.ucret) === 35 && Number(x.guncel.miktar) === 10 && JSON.stringify(x.guncel.personel) === '["g25-q"]'), kod: "listede yok" }, "geçti");
    yaz("C · iş onayı · Uretimci", await dene("Uretimci", "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: `atama|${a.aid}`, ozet: g && g.guncel }] } }), "ret 42501");
    yaz("C · eski görüntüyle onay (ekranda 9 adet) · Muhasip", await dene("Muhasip", "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: `atama|${a.aid}`, ozet: g && { ...g.guncel, miktar: 9 } }] } }), "ret KR015");
    const ara = await onayKalemi("ara|ekr-bot|ap-g25");
    yaz("C · iş onayı + Boya ara prosesi (g25-f, 2) · Muhasip", await dene("Muhasip", "rpc/ucret_onayla", { p: { kalemler: [
      { anahtar: `atama|${a.aid}`, ozet: g && g.guncel }, { anahtar: "ara|ekr-bot|ap-g25", ozet: ara && ara.guncel }] } }), "geçti"); }
  for (const is of Object.keys(ISLEMLER)) {
    for (const kul of ["Ali", "Muhasip", "Carici", "Muhasebeci", "Uretimci", "Ayse", "Fisci", "Veli", "Deniz"]) {
      yaz(`A · ${is} · ${kul}`, await dene(kul, "rpc/fis_kes", { p: await ISLEMLER[is]() }), beklenen(kul, is));
    }
  }
  const KURAL_ACIK = ((await k.sorgu("select public.fis_kural_aktif() a").catch(() => [{ a: false }]))[0] || {}).a === true;
  console.log(`── fiş kuralları: ${KURAL_ACIK ? "AÇIK" : "KAPALI"}`);
  // A7: car_yaz fiş dışından
  for (const kul of ["Ali", "Muhasip", "Ayse", "Uretimci", "Fisci"]) {
    yaz(`A7 · car_yaz satır · ${kul}`, await dene(kul, "rpc/car_yaz", { p: { satirlar: [{ ...cariSatir("g25-m", "Borç", 1), fis_no: null }] } }),
      // fiş kuralları AÇIKKEN fiş dışı satır herkese kapalı (fiş defteri kuralı — G-25'ten bağımsız; deneme projesinde kurallar açık)
      (["Ali", "Muhasip"].includes(kul) && !KURAL_ACIK) ? "geçti" : "ret 42501");
  }
  // A4: sahtecilik
  for (const [ad, f] of Object.entries(SAHTE)) {
    for (const kul of ["Ayse", "Uretimci"]) yaz(`A4 · ${ad} · ${kul}`, await dene(kul, "rpc/fis_kes", { p: await f() }), "ret 42501");
  }
  // GÖZLEM (beklenti yazılmaz): stoklu alışta küçük miktar, tutar tutarlı — gerçek stok hareketi
  { const id = yeniId("s"); const p = yuk(fis("AF", "stok", "Alış", { cariId: "g25-t" }), { stok: [stokSatir(id, 0.001, "g25-t")],
      cari: [cariSatir("g25-t", "Alacak", 0.012, { miktar: 0.001, birimFiyat: 12 }, { id })] });
    yaz("GÖZLEM · AF 0,001 × 12 (gerçek stok hareketi) · Ayse", await dene("Ayse", "rpc/fis_kes", { p })); }

  // A6: iptal — her deneme için Ali yeni fiş keser, sonra kullanıcı iptal dener
  const IPTAL = { AF_stok: ISLEMLER.AF_stok, SF_pesin: ISLEMLER.SF_pesin, CVR: ISLEMLER.CVR, VRM: ISLEMLER.VRM, URT_teslim: ISLEMLER.URT_teslim, TH_nakit: ISLEMLER.TH_nakit };
  const iptalBek = (kul, is) => {
    if (kul === "Ayse") return "ret 42501";                       // silme yetkisi yok
    if (kul === "Muhasip") return "geçti";
    if (kul === "Stokcu") return ["AF_stok", "URT_teslim"].includes(is) ? "geçti" : "ret 42501";
    if (kul === "Uretsil") return ["AF_stok", "URT_teslim"].includes(is) ? "geçti" : "ret 42501";
    return undefined;
  };
  for (const is of Object.keys(IPTAL)) {
    for (const kul of ["Stokcu", "Uretsil", "Muhasip", "Ayse"]) {
      const kes = await istek("Ali", "rpc/fis_kes", { p: await IPTAL[is]() });
      if (!kes.ok) { yaz(`A6 · iptal ${is} · ${kul}`, { ok: false, kod: `KESİLEMEDİ ${kes.kod}` }, iptalBek(kul, is)); continue; }
      const no = kes.govde.fisNo, bno = kes.govde.bagliFisNo;
      const r = await dene(kul, "rpc/fis_iptal", { p: { no, sebep: "G-25 sınaması" } });
      if (r.ok) {   // ana + bağlı fişin BÜTÜN satırları birlikte kapandı mı
        const acik = (await k.sorgu(`select (select count(*) from public.stk_hareket where fis_id = any($1) and not iptal) +
          (select count(*) from public.car_hareket where fis_no = any($1) and not iptal) + (select count(*) from public.kas_hareket where fis_id = any($1) and not iptal) +
          (select count(*) from public.stk_fis where id = any($1) and not iptal) as n`, [[no, bno].filter(Boolean)]))[0].n;
        if (Number(acik) !== 0) r.kod = `AÇIK SATIR ${acik}`, r.ok = false;
      }
      yaz(`A6 · iptal ${is}${bno ? " (+bağlı)" : ""} · ${kul}`, r, iptalBek(kul, is));
    }
  }

  // A8: MESAİ UÇTAN UCA (ÖNCE'de fonksiyonlar yok — ret kodu kaydedilir). Personel g25-p: maaş 30.000, aylık saat yok → 225;
  // katlar varsayılan (1,5 / 1,5 / 2). 10 saat hafta içi + 2 saat Cumartesi → 30000 / 225 × (15 + 3) = 2.400,00 ₺.
  const anahtar = (ay) => `MESAI-${ay}-g25-p`;   // g25-p'nin kodu yok → 1.744.36 mesaiFisNo gibi cari kimliği
  const msOnay = (tutar) => { const p = ISLEMLER.MS(); p.cari.satirlar[0].tutar = tutar; return p; };
  const gecerliMs = async (ay) => Number((await k.sorgu(`select count(*) n from public.car_hareket h left join public.stk_fis f on f.id = h.fis_no
    where h.cari_id = 'g25-p' and not h.iptal and not coalesce(f.iptal, false) and (h.ek ->> 'mesaiAnahtari' = $1 or h.fis_no = $1)`, [anahtar(ay)]).catch(() => [{ n: -1 }]))[0].n);
  const bildirim = async (id) => ((await k.sorgu("select durum, fis_no from public.mes_bildirim where id = $1", [id]).catch(() => []))[0] || {});
  const bildir = (ay, hi = 10, ct = 2) => ({ p: { cariId: "g25-p", ay, saatler: { haftaIci: hi, cumartesi: ct, pazar: 0 } } });
  yaz("A8 · mesai_bildir · Veli", await dene("Veli", "rpc/mesai_bildir", bildir("2026-11")), "ret 42501");
  const onceB = await sayac();
  const b1 = await dene("Uretimci", "rpc/mesai_bildir", bildir("2026-11"));
  if (b1.ok && farkAdi(onceB, await sayac()) !== "mes_bildirim") b1.ok = false, b1.kod = `PARA / BAŞKA TABLO DEĞİŞTİ: ${farkAdi(onceB, await sayac())}`;
  yaz("A8 · mesai_bildir · Uretimci (yalnız bildirim; cari / kasa / fiş değişmez)", b1, "geçti");
  const bid = b1.ok && b1.govde && b1.govde.id;
  const liste = async (kul) => { const r = await istek(kul, "rpc/mesai_bildirimleri", { p: { ay: "2026-11" } });
    const x = r.ok && Array.isArray(r.govde) ? r.govde.find((y) => y.id === bid) : null; return { ...r, ok: !!x, kod: r.kod || (x ? null : "listede yok"), x }; };
  { const l = await liste("Uretimci"); if (l.ok && l.x.hesaplananTutar != null) l.ok = false, l.kod = "Üretim tutarı görüyor";
    yaz("A8 · bildirimleri görme · Uretimci (tutar gösterilmez)", l, "geçti"); }
  { const l = await liste("Muhasip"); if (l.ok && Number(l.x.hesaplananTutar) !== 2400) l.ok = false, l.kod = `tutar ${l.x.hesaplananTutar}`;
    yaz("A8 · bildirimleri görme · Muhasip (sunucu tutarı 2.400)", l, "geçti"); }
  yaz("A8 · mesai_onayla · Uretimci", await dene("Uretimci", "rpc/mesai_onayla", { p: { bildirimId: bid, fis: msOnay(2400) } }), "ret 42501");
  yaz("A8 · mesai_onayla yanlış tutar (500) · Muhasip", await dene("Muhasip", "rpc/mesai_onayla", { p: { bildirimId: bid, fis: msOnay(500) } }), "ret 22023");
  const onay = await dene("Muhasip", "rpc/mesai_onayla", { p: { bildirimId: bid, fis: msOnay(2400) } });
  if (onay.ok) { const d = await bildirim(bid); const n = await gecerliMs("2026-11");
    const t = (await k.sorgu("select tutar::text t from public.car_hareket where fis_no = $1", [d.fis_no]))[0] || {};
    if (d.durum !== "onaylandi" || n !== 1 || Number(t.t) !== 2400) onay.ok = false, onay.kod = `bildirim ${d.durum} · geçerli MS ${n} · tutar ${t.t}`; }
  yaz("A8 · mesai_onayla · Muhasip (tek MS fişi 2.400 ₺ + bildirim onaylı, tek işlem)", onay, "geçti");
  { const once2 = await sayac(); const r = await istek("Muhasip", "rpc/mesai_onayla", { p: { bildirimId: bid, fis: msOnay(2400) } });
    const degismedi = (await sayac()) === once2;
    yaz("A8 · aynı bildirimi İKİNCİ kez onaylama · Muhasip (yeni fiş yok)", { ok: r.ok && r.govde && r.govde.zatenVar === true && degismedi,
      kod: r.ok ? (degismedi ? "zatenVar değil" : `DEĞİŞTİ: ${farkAdi(once2, await sayac())}`) : r.kod }, "geçti"); }
  // EŞZAMANLI ONAY: 5 ayrı ay; her birinde iki onay AYNI ANDA (iki ayrı bağlantı, farklı istek kimliği). Beklenen: her ayda tek geçerli
  // MS satırı, bir yanıt yeni fiş, öteki "zatenVar" (ikinci istek ilkinin kilidini bekleyip onaylı bildirimi görür).
  { const turlar = [];
    for (const ay of ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]) {
      const b2 = await istek("Uretimci", "rpc/mesai_bildir", bildir(ay));
      const bid2 = b2.ok && b2.govde && b2.govde.id;
      const [r1, r2] = await Promise.all([1, 2].map(() => istek("Muhasip", "rpc/mesai_onayla", { p: { bildirimId: bid2, fis: msOnay(2400) } })));
      const n = await gecerliMs(ay);
      const yeni = [r1, r2].filter((r) => r.ok && r.govde && !r.govde.zatenVar).length, zaten = [r1, r2].filter((r) => r.ok && r.govde && r.govde.zatenVar).length;
      turlar.push({ ay, n, yeni, zaten, ret: [r1, r2].filter((r) => !r.ok).map((r) => r.kod) });
    }
    const iyi = turlar.every((t) => t.n === 1 && t.yeni === 1 && t.zaten + t.ret.length === 1);
    yaz(`A8 · EŞZAMANLI iki onay × 5 ay · Muhasip (her ayda tek fiş) [${turlar.map((t) => `${t.ay.slice(5)}: MS ${t.n}, yeni ${t.yeni}, zatenVar ${t.zaten}${t.ret.length ? `, ret ${t.ret}` : ""}`).join(" · ")}]`,
      { ok: iyi, kod: "çift tahakkuk" }, "geçti"); }
  // ESKİ YOL ÇAKIŞMASI: 1.744.36 cari kartı aynı anahtarla doğrudan MS keser (PARA yetkilisi)
  { const p = msOnay(2400); p.cari.satirlar[0].ek.mesaiAnahtari = anahtar("2026-11");
    yaz("A8 · onaylı aya eski yoldan (cari kartı) ikinci MS · Muhasip", await dene("Muhasip", "rpc/fis_kes", { p }), "ret KR014"); }
  { const p = msOnay(800); p.cari.satirlar[0].ek.mesaiAnahtari = anahtar("2026-09");
    yaz("A8 · eski yoldan (cari kartı) MS 2026-09 · Muhasip", await dene("Muhasip", "rpc/fis_kes", { p }), "geçti");
    yaz("A8 · eski yolla tahakkuk etmiş aya bildirim · Uretimci", await dene("Uretimci", "rpc/mesai_bildir", bildir("2026-09")), "ret KR014"); }
  // YETKİSİZ DURUM DEĞİŞTİRME (onaylı bildirim)
  yaz("A8 · bildirimi tablodan 'bekliyor'a çevirme · Uretimci", await dene("Uretimci", `mes_bildirim?id=eq.${bid}`, { durum: "bekliyor", fis_no: null }, "PATCH", { prefer: "return=minimal" }), "ret");
  yaz("A8 · bildirimi tablodan silme · Veli", await dene("Veli", `mes_bildirim?id=eq.${bid}`, {}, "DELETE", { prefer: "return=minimal" }), "ret");
  yaz("A8 · onaylı bildirimi iptal · Uretimci", await dene("Uretimci", "rpc/mesai_bildirim_iptal", { p: { id: bid } }), "ret P0002");
  yaz("A8 · onaylı ayı yeniden bildirme · Uretimci", await dene("Uretimci", "rpc/mesai_bildir", bildir("2026-11", 5, 0)), "ret KR014");
  { const d = await bildirim(bid); yaz("A8 · bildirim hâlâ onaylı, fişi aynı", { ok: d.durum === "onaylandi" && !!d.fis_no, kod: `${d.durum}` }, "geçti"); }
  // ONAYLI FİŞ İPTAL EDİLİRSE: bildirim yeniden açılır, yeniden onay yine TEK geçerli fiş
  { const d = await bildirim(bid);
    yaz("A8 · onaylı MS fişinin iptali · Muhasip", await dene("Muhasip", "rpc/fis_iptal", { p: { no: d.fis_no, sebep: "G-25 sınaması" } }), "geçti");
    yaz("A8 · iptalden sonra yeniden bildirme (5 saat) · Uretimci", await dene("Uretimci", "rpc/mesai_bildir", bildir("2026-11", 5, 0)), "geçti");
    const r = await dene("Muhasip", "rpc/mesai_onayla", { p: { bildirimId: bid, fis: msOnay(1000) } });   // 30000/225 × 7,5 = 1.000
    const n = await gecerliMs("2026-11"); if (r.ok && n !== 1) r.ok = false, r.kod = `geçerli MS ${n}`;
    yaz("A8 · yeniden onay (1.000 ₺) · Muhasip (tek geçerli fiş)", r, "geçti"); }
  // ücret koruması (tanimlar'a doğrudan yazma, uygulamanın yaptığı gibi)
  const tanim = async () => (await k.sorgu("select veri from public.tanimlar where id = 'tekil'"))[0].veri;
  const tanimYaz = async (kul, degistir) => {
    const v = await tanim(); degistir(v);
    const once = JSON.stringify(await tanim());
    const r = await istek(kul, "tanimlar?id=eq.tekil", { veri: v }, "PATCH", { prefer: "return=minimal" });
    if (!r.ok) r.atomik = JSON.stringify(await tanim()) === once;
    return r;
  };
  const bolum = (v) => v.bolumler.find((b) => b.id === "bk-g25");
  yaz("A8 · maaş değiştirme · Uretimci", await tanimYaz("Uretimci", (v) => { bolum(v).personel[0].maas = 99999; }), "ret 42501");
  yaz("A8 · mesai katı değiştirme · Uretimci", await tanimYaz("Uretimci", (v) => { v.mesaiAyar = { haftaIci: 3 }; }), "ret 42501");
  yaz("A8 · bölüm adı değiştirme · Uretimci", await tanimYaz("Uretimci", (v) => { bolum(v).ad = "G25 Kesimhane " + sira; }), "geçti");
  yaz("A8 · maaş değiştirme · Muhasip", await tanimYaz("Muhasip", (v) => { bolum(v).personel[0].maas = 31000 + sira; }), "geçti");
  // UPSERT BİÇİMİ (24 Kasım): uygulama tanımları PATCH ile değil "insert … on conflict do update" ile yazar (önce BEFORE INSERT
  // tetiklenir). İlk sürüm tetikleyici bunu her kayıtta ret sayıyordu — ekran ölçümü yakaladı; bu satırlar o biçimi sınar.
  const tanimUpsert = async (kul, degistir) => {
    const v = await tanim(); degistir(v); const once = JSON.stringify(await tanim());
    const r = await istek(kul, "tanimlar?on_conflict=id", [{ id: "tekil", veri: v }], "POST", { prefer: "resolution=merge-duplicates,return=minimal" });
    if (!r.ok) r.atomik = JSON.stringify(await tanim()) === once;
    return r;
  };
  yaz("A8 · upsert: renk / bölüm adı (ücret aynı) · Uretimci", await tanimUpsert("Uretimci", (v) => { bolum(v).ad = "G25 Kesimhane u" + sira; }), "geçti");
  yaz("A8 · upsert: ücret aynı · Deniz (yalnız görüntüleme)", await tanimUpsert("Deniz", (v) => { bolum(v).ad = "G25 Kesimhane d" + sira; }), "geçti");
  yaz("A8 · upsert: maaş değiştirme · Uretimci", await tanimUpsert("Uretimci", (v) => { bolum(v).personel[0].maas = 77777; }), "ret 42501");
  yaz("A8 · upsert: maaş değiştirme · Muhasip", await tanimUpsert("Muhasip", (v) => { bolum(v).personel[0].maas = 32000 + sira; }), "geçti");

  // K4 — İŞÇİLİK KAPISI (24 Kasım; kullanıcı: "R1–R5 yollarının kapandığını, meşru üretim tesliminin çalıştığını ve tekrar / eşzamanlı
  // onayın çift fiş oluşturmadığını sına"). 23 Kasım'da bu yollar G-25 uygulanmışken GEÇİYORDU (AÇIK RİSK). Uretimci = Üretim rolü.
  // Her geçen satırda yazılan tutar gösterilir; her retten sonra içerik + bakiye anlık görüntüsü aynı olmalı (A5).
  {
    const yazilan = async (r) => { if (!r.ok || !r.govde || !r.govde.fisNo) return "";
      return " → " + (await k.sorgu("select string_agg(cari_id || ' ' || yon || ' ' || tutar::text, ', ') t from public.car_hareket where fis_no = $1", [r.govde.fisNo]))[0].t; };
    const K4 = async (ad, r, bek) => { if (r.ok && r.govde && r.govde.fisNo) r.kod = (await yazilan(r)).trim(); yaz(`K4 · ${ad}`, r, bek); return r; };
    const fisKes = (kul, p) => dene(kul, "rpc/fis_kes", { p });
    // R1: aynı istekte (sunucuda OLMAYAN) tamir ataması 5.000 ₺ + işçilik — istekteki atama dayanak değil
    { const a = await yeniAtama(); const p = urtYuk("g25-q", 10, 5000, a.uid, { uretim_atamalari: { satirlar: [{ id: yeniId("a"), uretim_id: a.uid, proses: "Kesim",
        personel_id: "g25-q", beden_miktarlari: { 40: 10 }, miktar: 10, verildi_mi: true, tamamlandi_mi: true, tamir_mi: true, tamir_ucret: 5000, ek: {} }] } });
      await K4("R1 istekte tamir ataması 5.000 ₺ + işçilik 10 × 5.000 · Uretimci", await fisKes("Uretimci", p), "ret 42501"); }
    // R1b: aynı, müşteri carisine
    { const a = await yeniAtama(); const p = urtYuk("g25-m", 10, 5000, a.uid, { uretim_atamalari: { satirlar: [{ id: yeniId("a"), uretim_id: a.uid, proses: "Kesim",
        personel_id: "g25-m", beden_miktarlari: { 40: 10 }, miktar: 10, verildi_mi: true, tamamlandi_mi: true, tamir_mi: true, tamir_ucret: 5000, ek: {} }] } });
      await K4("R1b istekte müşteri carisine tamir ataması + işçilik · Uretimci", await fisKes("Uretimci", p), "ret 42501"); }
    // R1c: KAYITLI ama onaysız tamir ataması (5.000) — kayıtlı olması yetmez
    { const a = await yeniAtama({ tamir: true, tamirUcret: 5000, onay: false });
      await K4("R1c kayıtlı, ONAYSIZ tamir ataması 10 × 5.000 · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 5000, a.uid, await teslimAlt(a.aid))), "ret 42501"); }
    // R1d: kayıtlı atamanın kişisini müşteriye çevirip teslim (atama yazmak üretimin işi; müşteriye işçilik yine yok)
    { const a = await yeniAtama({ personel: "g25-m" });
      await K4("R1d kayıtlı atama müşteri carisinde, işçilik 10 × 35 · Uretimci", await fisKes("Uretimci", urtYuk("g25-m", 10, 35, a.uid, await teslimAlt(a.aid))), "ret 42501"); }
    // R2: iş 35'ten ONAYLI; ürün proses ücreti 35 → 500 (yazma serbest — öneri): 500 ile de, onaylı 35 ile de ret (iş özeti değişti);
    // ücret 35'e dönünce eski onay CANLANMAZ (25 Kasım, deneme Test 12 — eskiden "yeniden geçerli" beklenirdi); yeni onayla geçer
    { const a = await yeniAtama();
      const u = await istek("Uretimci", "urunler?id=eq.ekr-bot", { proses_ucretleri: { Kesim: 500 } }, "PATCH", { prefer: "return=minimal" });
      yaz("K4 · R2a ürün proses ücreti 35 → 500 (öneri; yazma serbest) · Uretimci", u, "geçti");
      await K4("R2b işçilik 10 × 500 (onaysız yeni ücret) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 500, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await K4("R2c işçilik 10 × 35 (onay artık geçersiz — ücret değişti) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await k.sorgu(`update public.urunler set proses_ucretleri = '{"Kesim": 35}'::jsonb where id = 'ekr-bot'`);
      await K4("R2d ücret 35'e döndü, YENİ onay yok — eski onay canlanmaz: 10 × 35 · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await isiOnayla(a.aid);
      await K4("R2e yetkili yeniden onayladı: 10 × 35 · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "geçti"); }
    // R3: ürüne özel ara proses carisi → müşteri, ücreti → 900
    { const ek = ((await k.sorgu("select ek from public.urunler where id = 'ekr-bot'"))[0] || {}).ek || {};
      yaz("K4 · R3a ürüne özel ara proses carisi → müşteri, ücreti → 900 · Uretimci", await istek("Uretimci", "urunler?id=eq.ekr-bot",
        { ek: { ...ek, araProsesCariOverride: { "ap-g25": "g25-m" }, araProsesUcretleri: { "ap-g25": 900 } } }, "PATCH", { prefer: "return=minimal" }), "geçti");
      await K4("R3b ara proses işçiliği müşteri carisine 10 × 900 · Uretimci", await fisKes("Uretimci", await urtAra("g25-m", 10, 900)), "ret 42501");
      await k.sorgu("update public.urunler set ek = $1 where id = 'ekr-bot'", [ek]); }
    // R4: Tanımlar'da ara proses ücreti 2 → 700
    { yaz("K4 · R4a Tanımlar ara proses ücreti 2 → 700 · Uretimci", await tanimYaz("Uretimci", (v) => { v.araProsesler.find((a) => a.id === "ap-g25").ucret = 700; }), "geçti");
      await K4("R4b ara proses işçiliği 10 × 700 · Uretimci", await fisKes("Uretimci", await urtAra("g25-f", 10, 700)), "ret 42501");
      await k.sorgu(`update public.tanimlar set veri = jsonb_set(veri, '{araProsesler}', (select jsonb_agg(case when a ->> 'id' = 'ap-g25' then jsonb_set(a, '{ucret}', '2') else a end)
        from jsonb_array_elements(veri -> 'araProsesler') a)) where id = 'tekil'`);
      // R3 / R4 değerleri geri alındı; ara prosesin ESKİ onayı canlanmaz — yeniden onay gerekir (25 Kasım, deneme Test 12)
      await K4("R4c ara ücret / carisi eski hâline döndü, YENİ onay yok: 10 × 2 · Uretimci", await fisKes("Uretimci", await urtAra("g25-f", 10, 2)), "ret 42501");
      const araK = await onayKalemi("ara|ekr-bot|ap-g25");
      yaz("K4 · R4d ara prosesi (g25-f, 2) yeniden onay · Muhasip", await dene("Muhasip", "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: "ara|ekr-bot|ap-g25", ozet: araK && araK.guncel }] } }), "geçti"); }
    // R5: üretim kaydında numune ücreti → 800
    { const a = await yeniAtama();
      yaz("K4 · R5a üretim kaydında proses ücreti → 800 · Uretimci", await istek("Uretimci", `uretim?id=eq.${a.uid}`, { ek: { prosesUcretleri: { Kesim: 800 } } }, "PATCH", { prefer: "return=minimal" }), "geçti");
      await K4("R5b işçilik 10 × 800 (üretim kaydındaki onaysız ücret) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 800, a.uid, await teslimAlt(a.aid))), "ret 42501"); }
    // MEŞRU AKIŞLAR
    await K4("meşru teslim: onaylı Kesim 35, kayıtlı atama, 10 × 35 · Uretimci", await fisKes("Uretimci", await urt(10, 35)), "geçti");
    await K4("meşru kısmi teslim: atama 10, işçilik 6 × 35 · Uretimci", await fisKes("Uretimci", await urt(6, 35)), "geçti");
    await K4("meşru ara proses: onaylı Boya g25-f, 10 × 2 · Uretimci", await fisKes("Uretimci", await urtAra("g25-f", 10, 2)), "geçti");
    await K4("kayıtlı atama miktarından fazla (atama 4, işçilik 6) · Uretimci", await fisKes("Uretimci", await urt(6, 35, { atama: { miktar: 4 } })), "ret 42501");
    // TEKRAR: aynı atama ikinci kez (farklı istek) → ret; aynı ara proses adımı ikinci kez → ret
    { const a = await yeniAtama(); const alt = await teslimAlt(a.aid);
      await K4("aynı atama: ilk teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, alt)), "geçti");
      await K4("aynı atama: İKİNCİ teslim (yeni istek) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, alt)), "ret 42501");
      const ara1 = await urtAra("g25-f", 10, 2); await K4("aynı ara proses adımı: ilk · Uretimci", await fisKes("Uretimci", ara1), "geçti");
      const ara2 = urtYuk("g25-f", 10, 2, ara1.fis.uretimId); await K4("aynı ara proses adımı: İKİNCİ · Uretimci", await fisKes("Uretimci", ara2), "ret 42501"); }
    // EŞZAMANLI: aynı atamaya 5 teslim aynı anda → tek fiş
    { const a = await yeniAtama(); const alt = await teslimAlt(a.aid);
      const rr = await Promise.all([1, 2, 3, 4, 5].map(() => istek("Uretimci", "rpc/fis_kes", { p: urtYuk("g25-q", 10, 35, a.uid, alt) })));
      const n = Number((await k.sorgu(`select count(*) n from public.stk_fis where uretim_id = $1 and not iptal`, [a.uid]))[0].n);
      yaz(`K4 · EŞZAMANLI 5 teslim aynı atama · Uretimci [geçen ${rr.filter((r) => r.ok).length}, fiş ${n}]`, { ok: n === 1 && rr.filter((r) => r.ok).length === 1, kod: "çift ödeme" }, "geçti"); }
    // İPTAL SONRASI: fiş iptal edilince ödeme geçersiz; atama yeniden "tamamlanmamış" yapılırsa yeniden ödenebilir (tek geçerli fiş)
    { const a = await yeniAtama(); const alt = await teslimAlt(a.aid);
      const r1 = await istek("Uretimci", "rpc/fis_kes", { p: urtYuk("g25-q", 10, 35, a.uid, alt) });
      const ip = r1.ok ? await istek("Muhasip", "rpc/fis_iptal", { p: { no: r1.govde.fisNo, sebep: "G-25 sınaması" } }) : r1;
      await k.sorgu("update public.uretim_atamalari set tamamlandi_mi = false where id = $1", [a.aid]);
      const r2 = await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, alt));
      const n = Number((await k.sorgu(`select count(*) n from public.stk_fis where uretim_id = $1 and not iptal`, [a.uid]))[0].n);
      if (r2.ok && n !== 1) r2.ok = false, r2.kod = `geçerli fiş ${n}`;
      await K4(`iptal edilen teslimden sonra yeniden teslim (iptal ${ip.ok ? "tamam" : ip.kod}) · Uretimci`, r2, "geçti"); }
    // HER İKİSİ (müşteri + tedarikçi) kartı: onaysız iş ret; işi (kişi dahil) yetkili onaylayınca geçer
    await K4("Her İkisi kartına işçilik (iş onaysız) · Uretimci", await fisKes("Uretimci", await urt(10, 35, { atama: { personel: "g25-h", onay: false } })), "ret 42501");
    await K4("Her İkisi kartına işçilik (iş — kişi dahil — onaylı) · Uretimci", await fisKes("Uretimci", await urt(10, 35, { atama: { personel: "g25-h" } })), "geçti");
    // MİKTAR / KİŞİ ONAYI (25 Kasım; kullanıcı: "Onaylanan atamanın miktarı, carisi veya ücreti değişirse yeniden onay gereksin. Meşru
    // kısmi teslimler, onaylanan toplam miktar içinde çalışmaya devam etsin; eşzamanlı teslimler bu toplamı aşamasın")
    { const a = await yeniAtama();
      await k.sorgu("update public.uretim_atamalari set miktar = 12 where id = $1", [a.aid]);
      await K4("M1 onaylı iş (10) miktarı 12'ye büyütüldü, 10 × 35 teslim (yeniden onay gerekir) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await isiOnayla(a.aid);
      await K4("M1b yetkili 12'yi onayladı, 12 değil 10 × 35 teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "geçti"); }
    { const a = await yeniAtama();
      await k.sorgu("update public.uretim_atamalari set personel_id = 'g25-t' where id = $1", [a.aid]);
      await K4("M2 onaylı işin kişisi değişti (g25-q → g25-t), 10 × 35 · Uretimci", await fisKes("Uretimci", urtYuk("g25-t", 10, 35, a.uid, await teslimAlt(a.aid))), "ret 42501"); }
    { const a = await yeniAtama();
      const k1 = await kismiAlt(a.aid, 6);
      await K4("M3a meşru kısmi teslim 6 (kalan 4 yeni parça; zincir toplamı 10) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 6, 35, a.uid, k1.alt)), "geçti");
      const k2 = await kismiAlt(k1.kalanId, 3);
      await K4("M3b kalan parçadan kısmi 3 (kalan 1) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 3, 35, a.uid, k2.alt)), "geçti");
      await K4("M3c son parça 1 (zincirde toplam 10 ödendi) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 1, 35, a.uid, await teslimAlt(k2.kalanId))), "geçti");
      const odenen = Number((await k.sorgu(`select coalesce(sum(miktar), 0) n from public.isc_odeme o join public.stk_fis f on f.istek = o.istek where o.kok = $1 and not f.iptal`, [a.aid]).catch(() => [{ n: -1 }]))[0].n);
      yaz(`K4 · M3 zincirde ödenen toplam = onaylanan 10 [${odenen}]`, { ok: odenen === 10, kod: `ödenen ${odenen}` }, "geçti");
      // sahte kalan parça (kaynak = kök, 10 adet) → zincir toplamı 20 ≠ 10 → onay geçmez
      const sahte = yeniId("a");
      await k.sorgu(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
        values ($1, $2, 'Kesim', 'g25-q', '{"40": 10}'::jsonb, 10, true, false, false, 0, jsonb_build_object('kismiKalanKaynak', $3::text))`, [sahte, a.uid, a.aid]);
      await K4("M4 zincire sonradan eklenen 10'luk parça (toplam 20 ≠ onaylı 10) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(sahte))), "ret 42501"); }
    // M5 / M6 — DEĞER GERİ ALININCA ONAY CANLANMAZ (25 Kasım, deneme projesi Test 12; kullanıcı: "40'a çıkınca eski onay geçersizleşsin
    // ve teslim reddedilsin. 35'e geri dönünce de yeni muhasebe onayı verilmeden teslim geçmesin … Sistem eski onayı otomatik
    // canlandırıyorsa bunu başarılı sayma"). İlk sürümde onay = "onaylanan özet == güncel özet" idi: 35 → 40 → 35 eski onayı canlandırıyordu.
    // M5: üretimin kendi (numune) ücreti — yalnız bu işi etkiler. M6: ÜRÜNÜN proses ücreti (deneme projesindeki gerçek yol; ekr-bot'un
    // açık onaylarını düşürür — bu yüzden bölümün sonunda değil, yalnız kendi işiyle ölçülür ve ücret 35'e döner).
    const odemeSay = async (uid) => Number((await k.sorgu(`select count(*) n from public.isc_odeme o join public.stk_fis f on f.istek = o.istek where o.uretim_id = $1 and not f.iptal`, [uid]).catch(() => [{ n: -1 }]))[0].n);
    { const a = await yeniAtama();
      await k.sorgu(`update public.uretim set ek = jsonb_set(coalesce(ek, '{}'::jsonb), '{prosesUcretleri}', '{"Kesim": 40}'::jsonb) where id = $1`, [a.uid]);
      await K4("M5a onaydan sonra üretimin ücreti 35 → 40, 10 × 40 teslim (eski onay geçersiz) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 40, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await K4("M5a' aynı işte eski ücretle 10 × 35 teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await k.sorgu(`update public.uretim set ek = ek - 'prosesUcretleri' where id = $1`, [a.uid]);
      await K4("M5b ücret 35'e GERİ döndü, YENİ onay yok, 10 × 35 teslim (eski onay canlanmaz) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await isiOnayla(a.aid);
      await K4("M5c yetkili 35'i YENİDEN onayladı, 10 × 35 teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "geçti");
      const n = await odemeSay(a.uid);
      yaz(`K4 · M5 yeniden onaydan sonra geçerli ödeme TEK [${n}]`, { ok: n === 1, kod: `ödeme ${n}` }, "geçti"); }
    { const a = await yeniAtama();
      await k.sorgu(`update public.urunler set proses_ucretleri = '{"Kesim": 40}'::jsonb where id = 'ekr-bot'`);
      await K4("M6a ÜRÜNÜN ücreti 35 → 40, 10 × 40 teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 40, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await k.sorgu(`update public.urunler set proses_ucretleri = '{"Kesim": 35}'::jsonb where id = 'ekr-bot'`);
      await K4("M6b ürün ücreti 35'e GERİ döndü, YENİ onay yok, 10 × 35 teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await isiOnayla(a.aid);
      await K4("M6c yeniden onay, 10 × 35 teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "geçti");
      const n = await odemeSay(a.uid);
      yaz(`K4 · M6 yeniden onaydan sonra geçerli ödeme TEK [${n}]`, { ok: n === 1, kod: `ödeme ${n}` }, "geçti"); }
    // M7 — MEŞRU KISMİ TESLİM MÜHÜR BASMAZ: teslim (10 → 6 + kalan 4) aynı işlemde; işlem sonunda zincir toplamı yine 10. Kalan 4 geçer.
    { const a = await yeniAtama();
      const k1 = await kismiAlt(a.aid, 6);
      await K4("M7a kısmi 6 · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 6, 35, a.uid, k1.alt)), "geçti");
      const muhur = (await k.sorgu(`select gecersiz is not null m from public.ucr_onay where anahtar = $1`, [`atama|${a.aid}`]).catch(() => [{ m: null }]))[0];
      yaz(`K4 · M7 kısmi teslimden sonra onay mühürsüz [${muhur ? muhur.m : "satır yok"}]`, { ok: !!muhur && muhur.m === false, kod: `mühür ${muhur ? muhur.m : "yok"}` }, "geçti");
      await K4("M7b kalan 4 (onay geçerli) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 4, 35, a.uid, await teslimAlt(k1.kalanId))), "geçti"); }
    // P — PARA YETKİLİSİNİN TESLİMİ (25 Kasım, deneme: Yönetici teslimleri ödeme defterine yazılmıyordu; kullanıcı: "Yöneticiyle teslim → aynı
    // işe Üretim kullanıcısıyla tekrar teslim → iptal → yeniden teslim zincirini sına. Cari hareketi, ödeme defteri, stok ve fişleri birlikte
    // karşılaştır. Yetki nedeniyle onaydan muaf olmak, çift ödemeyi önleyen kaydı atlamak anlamına gelmemeli"). Ali = Yönetici (PARA).
    // Her adımdan sonra üretimin dört defteri: geçerli ÜRT fişi · cari işçilik toplamı (geçerli) · ödeme defteri (geçerli miktar) · stok (geçerli net).
    const defter = async (uid) => {
      const r = (await k.sorgu(`select
        (select count(*) from public.stk_fis where uretim_id::text = $1 and onek = 'ÜRT' and not iptal) fis,
        (select coalesce(sum(tutar), 0) from public.car_hareket where uretim_id::text = $1 and not coalesce(iptal, false)) cari,
        (select coalesce(sum(o.miktar), 0) from public.isc_odeme o join public.stk_fis f on f.istek = o.istek where o.uretim_id = $1 and not f.iptal) odeme,
        (select coalesce(sum(miktar), 0) from public.stk_hareket where uretim_id::text = $1 and not coalesce(iptal, false)) stok`, [uid]).catch((e) => [{ fis: "?", cari: e.message.slice(0, 40), odeme: "?", stok: "?" }]))[0];
      return `fiş ${r.fis} · cari ${Number(r.cari)} · ödeme ${Number(r.odeme)} · stok ${Number(r.stok)}`; };
    const Pdef = async (ad, uid, beklenen) => { const d = await defter(uid); yaz(`K4 · ${ad} [${d}]`, { ok: d === beklenen, kod: d }, "geçti"); };
    { const a = await yeniAtama();
      await K4("P1 Yönetici teslim 10 × 35 · Ali", await fisKes("Ali", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "geçti");
      const s1 = await defter(a.uid);
      yaz(`K4 · P1 Yönetici teslimi ödeme defterine girdi [${s1}]`, { ok: /ödeme 10 ·/.test(s1) && /^fiş 1 /.test(s1), kod: s1 }, "geçti");
      // aynı atamayı (sunucuda artık tamamlanmış) Üretim kullanıcısı yeniden teslim eder — tamamlanma bayrağı geri alınmış gibi yük
      const alt = { uretim_atamalari: { satirlar: [{ ...(await k.sorgu("select to_jsonb(a) j from public.uretim_atamalari a where id = $1", [a.aid]))[0].j, tamamlandi_mi: true }] } };
      await K4("P2 AYNI işe Üretim kullanıcısıyla ikinci teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, alt)), "ret 42501");
      await K4("P3 AYNI işe Yönetici ile ikinci teslim (yeni istek) · Ali", await fisKes("Ali", urtYuk("g25-q", 10, 35, a.uid, alt)), "ret KR016");
      await Pdef("P3 ikinci teslimlerden sonra defterler değişmedi", a.uid, s1);
      // iptal (üretim kartındaki "Geri Al" gibi: fiş iptal + atama yeniden açık) → Üretim kullanıcısı yeniden teslim eder (iş onaylı)
      const no = (await k.sorgu("select id from public.stk_fis where uretim_id::text = $1 and onek = 'ÜRT' and not iptal", [a.uid]))[0].id;
      const ip = await istek("Ali", "rpc/fis_iptal", { p: { no, sebep: "G-25 P sınaması" } });
      yaz("K4 · P4 Yönetici teslim fişinin iptali · Ali", ip, "geçti");
      await k.sorgu("update public.uretim_atamalari set tamamlandi_mi = false, tamamlanma_tarihi = null where id = $1", [a.aid]);
      await Pdef("P4 iptalden sonra (ödeme serbest, cari / stok geri)", a.uid, "fiş 0 · cari 0 · ödeme 0 · stok 0");
      await K4("P5 iptalden sonra Üretim kullanıcısıyla yeniden teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "geçti");
      await Pdef("P5 yeniden teslimden sonra TEK fiş / TEK ödeme", a.uid, s1); }
    // P6: karışık zincir — Yönetici kısmi 6 → Üretim kalan 4 (toplam 10) → Üretim fazladan 4 (sahte kalan parça) ret
    { const a = await yeniAtama();
      const k1 = await kismiAlt(a.aid, 6);
      await K4("P6a Yönetici kısmi teslim 6 · Ali", await fisKes("Ali", urtYuk("g25-q", 6, 35, a.uid, k1.alt)), "geçti");
      await K4("P6b kalan 4 · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 4, 35, a.uid, await teslimAlt(k1.kalanId))), "geçti");
      const d6 = await defter(a.uid);
      yaz(`K4 · P6 karışık zincir: ödenen 6 + 4 = 10 [${d6}]`, { ok: /^fiş 2 · cari 350 · ödeme 10 /.test(d6), kod: d6 }, "geçti"); }
    // L — GEÇMİŞ (G-25 ÖNCESİ / ödeme defterine girmemiş) TESLİM (25 Kasım, deneme: 10001 / 10002 / 10004 Yönetici teslimleri defterde yok;
    // kullanıcı: "tekrar ödenmesini neyin engellediğini yerel kopyada sına … geçmişteki tüm teslimleri kayıtsız varsayma"). Geçmiş teslim
    // sistem yoluyla (SQL Editor gibi: jwt yok → G-25 bağ denetimi ve defter YOK) kesilir: geçerli ÜRT fişi + işçilik 10 × 35, atama tamamlandı.
    // Sonra atama, fiş İPTAL EDİLMEDEN yeniden "tamamlanmadı" yapılır (uretim_atamalari'na üretim yetkisiyle REST yazımı — istemci de böyle
    // yazar) ve iş yeniden teslim edilir. Beklenen: ikinci ödeme YOK (geçmiş işçilik sayılır).
    const gecmisTeslim = async (a) => {
      const p = urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid)); p.fis.ek = { proses: "Kesim" };
      await k.sorgu("select public.fis_kes($1::jsonb)", [JSON.stringify(p)]);
      return (await k.sorgu("select count(*) n from public.isc_odeme where uretim_id = $1", [a.uid]))[0].n; };
    { const a = await yeniAtama();
      const n0 = await gecmisTeslim(a).catch((e) => `HATA ${e.message.slice(0, 60)}`);
      const d0 = await defter(a.uid);
      yaz(`K4 · L0 geçmiş teslim (sistem yolu, deftere girmez) [ödeme kaydı ${n0} · ${d0}]`, { ok: String(n0) === "0" && /^fiş 1 · cari 350 · ödeme 0 /.test(d0), kod: d0 }, "geçti");
      // tabloya doğrudan yazım authenticated'a kapalı (alt geçişi); istemcinin alt kayıt yolu alt_yaz (üretim kaydetme yetkisi) — fiş
      // iptal edilmeden atamayı yeniden "tamamlanmadı" yapabiliyor mu?
      const satir = (await k.sorgu("select to_jsonb(a) j from public.uretim_atamalari a where id = $1", [a.aid]))[0].j;
      const ac = await istek("Uretimci", "rpc/alt_yaz", { p: { uretim_atamalari: { satirlar: [{ ...satir, tamamlandi_mi: false, tamamlanma_tarihi: null }] } } });
      yaz("K4 · L1 tamamlanmış atamayı fiş iptal edilmeden yeniden açma (rpc/alt_yaz) · Uretimci", ac, ac.ok ? "geçti" : `ret ${ac.kod}`);
      if (ac.ok) {
        await isiOnayla(a.aid);
        await K4("L2 geçmişte ödenmiş işe Üretim kullanıcısıyla yeniden teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "ret 42501");
        await k.sorgu("update public.uretim_atamalari set tamamlandi_mi = false where id = $1", [a.aid]);
        await K4("L3 aynı işe Yönetici ile yeniden teslim · Ali", await fisKes("Ali", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "ret KR016");
        await Pdef("L3 geçmiş teslimden sonra defterler (tek geçerli ödeme: geçmiş fiş)", a.uid, d0);
        // geçmiş fiş İPTAL edilirse (Geri Al) iş yeniden ödenebilir — tek geçerli fiş
        const no = (await k.sorgu("select id from public.stk_fis where uretim_id::text = $1 and onek = 'ÜRT' and not iptal", [a.uid]))[0].id;
        yaz("K4 · L4 geçmiş fişin iptali · Ali", await istek("Ali", "rpc/fis_iptal", { p: { no, sebep: "G-25 L sınaması" } }), "geçti");
        await k.sorgu("update public.uretim_atamalari set tamamlandi_mi = false where id = $1", [a.aid]);
        await K4("L5 geçmiş fiş iptalinden sonra yeniden teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "geçti");
        await Pdef("L5 tek geçerli fiş / tek ödeme", a.uid, "fiş 1 · cari 350 · ödeme 10 · stok 0"); } }
    // D — GEÇMİŞ + DEFTER ÇİFT SAYILMAZ; KISMİ VE İPTAL DOĞRU (25 Kasım; kullanıcı: "Geçmiş işçilik ile ödeme defterinde bulunan aynı
    // hareketin iki kez sayılmadığını, kısmi teslim ve iptallerin doğru hesaplandığını da doğrula"). gecmis = g25_gecmis_iscilik (defter
    // dışı), defter = isc_odeme (geçerli fişli). Bir hareket ya birinde ya ötekinde sayılmalı; toplamı geçerli cari işçilik miktarına eşit.
    const sayim = async (uid) => { const r = (await k.sorgu(`select public.g25_gecmis_iscilik($1, 'Kesim') g,
        (select coalesce(sum(o.miktar), 0) from public.isc_odeme o join public.stk_fis f on f.istek = o.istek where o.uretim_id = $1 and not o.tamir and not f.iptal) d,
        (select coalesce(sum((h.ek ->> 'miktar')::numeric), 0) from public.car_hareket h join public.stk_fis f on f.id = h.fis_id
          where h.uretim_id::text = $1 and f.onek = 'ÜRT' and not f.iptal and not coalesce(h.iptal, false) and h.ek ->> 'islemTipi' = 'İşçilik') c`, [uid]).catch((e) => [{ g: "?", d: "?", c: e.message.slice(0, 30) }]))[0];
      return `geçmiş ${Number(r.g)} · defter ${Number(r.d)} · cari miktar ${Number(r.c)}`; };
    const Dsay = async (ad, uid, bek) => { const x = await sayim(uid); yaz(`K4 · ${ad} [${x}]`, { ok: x === bek, kod: x }, "geçti"); };
    { const a = await yeniAtama();
      await K4("D1 normal teslim 10 (deftere girer) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 35, a.uid, await teslimAlt(a.aid))), "geçti");
      await Dsay("D1 defterdeki hareket geçmişe SAYILMAZ", a.uid, "geçmiş 0 · defter 10 · cari miktar 10"); }
    { const a = await yeniAtama();
      // geçmiş KISMİ teslim 6 (sistem yolu, deftere girmez; kalan 4 açık parça) → Üretim kalan 4'ü teslim eder → toplam 10
      const k1 = await kismiAlt(a.aid, 6); const p6 = urtYuk("g25-q", 6, 35, a.uid, k1.alt); p6.fis.ek = { proses: "Kesim" };
      await k.sorgu("select public.fis_kes($1::jsonb)", [JSON.stringify(p6)]);
      await Dsay("D2 geçmiş kısmi 6", a.uid, "geçmiş 6 · defter 0 · cari miktar 6");
      await K4("D2b kalan 4 (geçmiş 6 + 4 = 10 ≤ adet) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 4, 35, a.uid, await teslimAlt(k1.kalanId))), "geçti");
      await Dsay("D2b geçmiş 6 + defter 4, hiçbiri iki kez sayılmadı", a.uid, "geçmiş 6 · defter 4 · cari miktar 10");
      // kalan parça alt_yaz ile yeniden açılıp tekrar teslim edilirse: 6 + 4 + 4 > 10 → ret
      const sat = (await k.sorgu("select to_jsonb(a) j from public.uretim_atamalari a where id = $1", [k1.kalanId]))[0].j;
      await istek("Uretimci", "rpc/alt_yaz", { p: { uretim_atamalari: { satirlar: [{ ...sat, tamamlandi_mi: false }] } } });
      await K4("D2c kalan parça yeniden açılıp tekrar 4 (6 + 4 + 4 > 10) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 4, 35, a.uid, await teslimAlt(k1.kalanId))), "ret 42501");
      // geçmiş 6'lık fiş İPTAL → geçmiş 0; kök parça yeniden açılıp 6 teslim edilebilir → toplam yine 10
      const no6 = (await k.sorgu("select f.id from public.stk_fis f join public.car_hareket h on h.fis_id = f.id where f.uretim_id::text = $1 and not f.iptal and (h.ek ->> 'miktar')::numeric = 6 limit 1", [a.uid]))[0].id;
      yaz("K4 · D3 geçmiş 6'lık fişin iptali · Ali", await istek("Ali", "rpc/fis_iptal", { p: { no: no6, sebep: "G-25 D sınaması" } }), "geçti");
      await Dsay("D3 iptalden sonra geçmiş düştü", a.uid, "geçmiş 0 · defter 4 · cari miktar 4");
      const kok = (await k.sorgu("select to_jsonb(a) j from public.uretim_atamalari a where id = $1", [a.aid]))[0].j;
      await istek("Uretimci", "rpc/alt_yaz", { p: { uretim_atamalari: { satirlar: [{ ...kok, tamamlandi_mi: false }] } } });
      await K4("D3b kök parça (6) yeniden teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 6, 35, a.uid, await teslimAlt(a.aid))), "geçti");
      await Dsay("D3b toplam yine 10 (defter 4 + 6)", a.uid, "geçmiş 0 · defter 10 · cari miktar 10");
      await Pdef("D3b dört defter", a.uid, "fiş 2 · cari 350 · ödeme 10 · stok 0"); }
    // T — B KURALI (25 Kasım; kullanıcı: "8 çift sağlam 2 çift tamir var, 8 çift ücret ödeyeceğine 10 çift ücret ödüyor … B seçeneğini
    // uygulayalım. İlk işçilik her çift için yalnız bir kez ödensin; tamire ayrılan çiftlerin ilk işçiliği sağlam dönüşe kadar beklesin.
    // Tamiri başka usta yaparsa ilk işçilik ve tamir ücretinin alıcıları doğru ayrılsın. Tamir ücreti ayrıca ve açıkça onaylansın").
    // İstemci 079 gibi: teslim satırında sonuç (sağlam / tamir / hurda), tamir işi AYNI istekte yeni atama (ek.tamirKaynakAtamaId).
    const teslimSonuclu = async (aid, saglam, tamir, hurda, tamirKisi, tamirUcret = 10) => {
      const r = (await k.sorgu("select to_jsonb(a) j from public.uretim_atamalari a where id = $1", [aid]))[0].j;
      const tid = yeniId("t");
      const satirlar = [{ ...r, tamamlandi_mi: true, tamamlanma_tarihi: new Date().toISOString(),
        sonuc: { saglam: saglam ? { 40: saglam } : {}, tamir: tamir ? [{ beden: "40", miktar: tamir, hedefProses: "Kesim" }] : [], hurda: hurda ? [{ beden: "40", miktar: hurda }] : [] } }];
      if (tamir) satirlar.push({ id: tid, uretim_id: r.uretim_id, proses: "Kesim", personel_id: tamirKisi, beden_miktarlari: { 40: tamir }, miktar: tamir,
        verildi_mi: true, tamamlandi_mi: false, tamir_mi: true, tamir_kaynak_proses: "Kesim", tamir_ucret: tamirUcret, ek: { tamirKaynakAtamaId: aid } });
      return { tid, alt: { uretim_atamalari: { satirlar } } }; };
    const ilkSatir = (cari, n, ucret, uid) => cariSatir(cari, "Alacak", n * ucret, { islemTipi: "İşçilik", miktar: n, birimFiyat: ucret, ilkIscilik: true }, { uretim_id: uid });
    const iscSatir = (cari, n, ucret, uid) => cariSatir(cari, "Alacak", n * ucret, { islemTipi: "İşçilik", miktar: n, birimFiyat: ucret }, { uretim_id: uid });
    const tYuk = (uid, satirlar, alt) => yuk(fis("ÜRT", "para", "Üretim", { cariId: satirlar[0].cari_id, uretimId: uid }), { cari: satirlar, alt });
    const cariTop = async (uid, cari) => Number((await k.sorgu("select coalesce(sum(tutar), 0) n from public.car_hareket where uretim_id::text = $1 and cari_id = $2 and not coalesce(iptal, false)", [uid, cari]))[0].n);
    // T1–T5: ilk iş g25-q, tamiri BAŞKA usta (g25-t)
    { const a = await yeniAtama();
      let t = await teslimSonuclu(a.aid, 8, 2, 0, "g25-t");
      await K4("T1 8 sağlam + 2 tamir, işçilik 10 × 35 (eski kural) · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-q", 10, 35, a.uid)], t.alt)), "ret 42501");
      t = await teslimSonuclu(a.aid, 8, 2, 0, "g25-t");
      await K4("T2 8 sağlam + 2 tamir, işçilik 8 × 35 · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-q", 8, 35, a.uid)], t.alt)), "geçti");
      await Pdef("T2 ilk teslim: yalnız 8 ödendi", a.uid, "fiş 1 · cari 280 · ödeme 8 · stok 0");
      const tid = t.tid;
      await K4("T3a tamir onaysız: tamir 2 × 10 + ilk 2 × 35 · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-t", 2, 10, a.uid), ilkSatir("g25-q", 2, 35, a.uid)], (await teslimSonuclu(tid, 2, 0, 0)).alt)), "ret 42501");
      const g = (await onayListesi("Muhasip")).find((x) => x.anahtar === `atama|${tid}`);
      yaz("K4 · T3b muhasebe tamir ücretini 10 → 15 belirleyip onaylar · Muhasip", await dene("Muhasip", "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: `atama|${tid}`, ozet: g && g.guncel, yeniUcret: 15 }] } }), "geçti");
      await K4("T3c tamir eski önerilen ücretle (2 × 10) · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-t", 2, 10, a.uid), ilkSatir("g25-q", 2, 35, a.uid)], (await teslimSonuclu(tid, 2, 0, 0)).alt)), "ret 42501");
      await K4("T3d ilk işçilik YANLIŞ alıcıya (tamir ustası g25-t) · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-t", 2, 15, a.uid), ilkSatir("g25-t", 2, 35, a.uid)], (await teslimSonuclu(tid, 2, 0, 0)).alt)), "ret 42501");
      await K4("T3 tamir sağlam 2: tamir 2 × 15 → g25-t, ilk 2 × 35 → g25-q · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-t", 2, 15, a.uid), ilkSatir("g25-q", 2, 35, a.uid)], (await teslimSonuclu(tid, 2, 0, 0)).alt)), "geçti");
      const q = await cariTop(a.uid, "g25-q"), u = await cariTop(a.uid, "g25-t");
      yaz(`K4 · T3 alıcılar ayrı: ilk usta 8 + 2 = 10 çift (350), tamir ustası 2 × 15 (30) [g25-q ${q} · g25-t ${u}]`, { ok: q === 350 && u === 30, kod: `${q}/${u}` }, "geçti");
      await Pdef("T3 dört defter (ilk 8 + ilk 2 + tamir 2)", a.uid, "fiş 2 · cari 380 · ödeme 12 · stok 0");
      // T4: tamir alt_yaz ile yeniden açılıp ilk işçilik ikinci kez
      const sat = (await k.sorgu("select to_jsonb(a) j from public.uretim_atamalari a where id = $1", [tid]))[0].j;
      await istek("Uretimci", "rpc/alt_yaz", { p: { uretim_atamalari: { satirlar: [{ ...sat, tamamlandi_mi: false }] } } });
      await K4("T4 aynı tamirin ilk işçiliği İKİNCİ kez (yeniden açılmış) · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [ilkSatir("g25-q", 2, 35, a.uid)], (await teslimSonuclu(tid, 2, 0, 0)).alt)), "ret 42501");
      await K4("T4b aynı işe Yönetici ile ilk işçilik ikinci kez · Ali", await fisKes("Ali", tYuk(a.uid, [ilkSatir("g25-q", 2, 35, a.uid)], (await teslimSonuclu(tid, 2, 0, 0)).alt)), "ret KR016"); }
    // T5: tamir HURDA çıkarsa ilk işçilik hiç ödenmez
    { const a = await yeniAtama(); const t = await teslimSonuclu(a.aid, 8, 2, 0, "g25-q");
      await K4("T5a 8 sağlam + 2 tamir (tamir aynı usta) · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-q", 8, 35, a.uid)], t.alt)), "geçti");
      const g = (await onayListesi("Muhasip")).find((x) => x.anahtar === `atama|${t.tid}`);
      await dene("Muhasip", "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: `atama|${t.tid}`, ozet: g && g.guncel, yeniUcret: 0 }] } });
      await K4("T5b tamir HURDA 2, ilk işçilik 2 × 35 · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [ilkSatir("g25-q", 2, 35, a.uid)], (await teslimSonuclu(t.tid, 0, 0, 2)).alt)), "ret 42501");
      await Pdef("T5 hurda: yalnız ilk 8", a.uid, "fiş 1 · cari 280 · ödeme 8 · stok 0"); }
    // T6: AYNI usta tamir eder (iki satır aynı cariye: tamir ücreti + ilk işçilik)
    { const a = await yeniAtama(); const t = await teslimSonuclu(a.aid, 8, 2, 0, "g25-q");
      await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-q", 8, 35, a.uid)], t.alt));
      const g = (await onayListesi("Muhasip")).find((x) => x.anahtar === `atama|${t.tid}`);
      await dene("Muhasip", "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: `atama|${t.tid}`, ozet: g && g.guncel, yeniUcret: 15 }] } });
      await K4("T6 aynı usta: tamir 2 × 15 + ilk 2 × 35 · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-q", 2, 15, a.uid), ilkSatir("g25-q", 2, 35, a.uid)], (await teslimSonuclu(t.tid, 2, 0, 0)).alt)), "geçti");
      await Pdef("T6 g25-q: 280 + 30 + 70", a.uid, "fiş 2 · cari 380 · ödeme 12 · stok 0"); }
    // T7: PARA yetkilisi de sağlamdan fazlasını ödeyemez
    { const a = await yeniAtama(); const t = await teslimSonuclu(a.aid, 8, 2, 0, "g25-q");
      await K4("T7 Yönetici 8 sağlam + 2 tamir, işçilik 10 × 35 · Ali", await fisKes("Ali", tYuk(a.uid, [iscSatir("g25-q", 10, 35, a.uid)], t.alt)), "ret KR016"); }
    // T8: ESKİ kuralla (geçmiş, defter dışı) 10 ödenmiş tamirli iş — tamir sağlam dönünce ilk işçilik İKİNCİ kez ödenmez
    { const a = await yeniAtama(); const t = await teslimSonuclu(a.aid, 8, 2, 0, "g25-q");
      const p = tYuk(a.uid, [iscSatir("g25-q", 10, 35, a.uid)], t.alt); p.fis.ek = { proses: "Kesim" };
      await k.sorgu("select public.fis_kes($1::jsonb)", [JSON.stringify(p)]);
      const g = (await onayListesi("Muhasip")).find((x) => x.anahtar === `atama|${t.tid}`);
      await dene("Muhasip", "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: `atama|${t.tid}`, ozet: g && g.guncel, yeniUcret: 15 }] } });
      await K4("T8 eski kuralla 10 ödenmiş iş: tamir 2 × 15 + ilk 2 × 35 · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-q", 2, 15, a.uid), ilkSatir("g25-q", 2, 35, a.uid)], (await teslimSonuclu(t.tid, 2, 0, 0)).alt)), "ret 42501");
      await K4("T8b yalnız tamir ücreti 2 × 15 (ilk işçilik zaten eski kuralla ödenmiş) · Uretimci", await fisKes("Uretimci", tYuk(a.uid, [iscSatir("g25-q", 2, 15, a.uid)], (await teslimSonuclu(t.tid, 2, 0, 0)).alt)), "geçti"); }
    // P7: Yönetici ÇİFT BASIŞ — aynı atamaya iki istek AYNI ANDA (farklı istek kimliği): biri geçer, öteki KR016; tek ödeme
    { const a = await yeniAtama(); const alt = await teslimAlt(a.aid);
      const [r1, r2] = await Promise.all([1, 2].map(() => istek("Ali", "rpc/fis_kes", { p: urtYuk("g25-q", 10, 35, a.uid, alt) })));
      const d = await defter(a.uid);
      yaz(`K4 · P7 Yönetici aynı işe EŞZAMANLI iki teslim · Ali [${r1.ok ? "kabul" : r1.kod}/${r2.ok ? "kabul" : r2.kod} · ${d}]`,
        { ok: [r1.ok, r2.ok].filter(Boolean).length === 1 && /^fiş 1 · cari 350 · ödeme 10 /.test(d), kod: d }, "geçti"); }
    // İSTENEN / KAYDEDİLEN (26 Kasım; kullanıcı: "Miktarı sessizce kırpma; sınırı aşan isteği açıkça reddet ve testte istenen / kaydedilen
    // miktarları ayrı göster"). Sunucu işçilik miktarını DEĞİŞTİRMEZ: satır olduğu gibi yazılır ya da istek bütünüyle 42501 ile düşer.
    // Kaydedilen = o fişin cari satırındaki miktar (ek.miktar); ret → 0. Her istek ayrı satır (sıralı — eşzamanlı sırası değişse de çıktı aynı).
    const kaydedilen = async (r) => (r.ok && r.govde && r.govde.fisNo) ? Number((await k.sorgu(`select coalesce(sum((h.ek ->> 'miktar')::numeric), 0) n
      from public.car_hareket h where h.fis_no = $1 and not h.iptal`, [r.govde.fisNo]))[0].n) : 0;
    const istekSatiri = async (on, parca, istenen, r) => `${on} · ${parca} · istenen ${istenen} · ${r.ok ? "kabul" : `ret ${r.kod}`} · kaydedilen ${await kaydedilen(r)}`
      + (!r.ok && r.mesaj ? `  [${String(r.mesaj).replace(/^Cari hareketi gerçek bir üretim işlemine bağlı değil \(/, "").replace(/\) — bu kayıt için.*$/, "")}]` : "");
    // O1: onaylı iş 10, kısmi 6 teslim edildi (kalan parça 4) — kalan parçaya 5 isteniyor → AÇIK ret, hiçbir şey yazılmaz; 4 → kabul, 4 yazılır
    { const a = await yeniAtama();
      const k1 = await kismiAlt(a.aid, 6);
      const r0 = await istek("Uretimci", "rpc/fis_kes", { p: urtYuk("g25-q", 6, 35, a.uid, k1.alt) });
      const r1 = await dene("Uretimci", "rpc/fis_kes", { p: urtYuk("g25-q", 5, 35, a.uid, await teslimAlt(k1.kalanId)) });
      const r2 = await istek("Uretimci", "rpc/fis_kes", { p: urtYuk("g25-q", 4, 35, a.uid, await teslimAlt(k1.kalanId)) });
      for (const [parca, ist, r] of [["kök (10 → kısmi)", 6, r0], ["kalan parça (4)", 5, r1], ["kalan parça (4)", 4, r2]]) {
        const sat = await istekSatiri("K4 · O1 istek", parca, ist, r); satirlar.push(sat); console.log(sat);
      }
      yaz("K4 · O1 kalan parçaya fazla istek (5 > 4) açıkça reddedildi, iz yok · Uretimci", r1, "ret 42501");
      const odenen = Number((await k.sorgu(`select coalesce(sum(miktar), 0) n from public.isc_odeme o join public.stk_fis f on f.istek = o.istek where o.kok = $1 and not f.iptal`, [a.aid]).catch(() => [{ n: -1 }]))[0].n);
      yaz(`K4 · O1 işte ödenen = 6 + 4 = 10 (kırpma yok) [${odenen}]`, { ok: odenen === 10 && r0.ok && r2.ok, kod: `ödenen ${odenen}` }, "geçti"); }
    // EŞZAMANLI: aynı işin iki AÇIK parçası (kök 5 + kalan 5, onaylı toplam 10) — 6 istek AYNI ANDA: kök için 5, 5, 6; kalan için 5, 5, 6.
    // Beklenen: her parçadan tam bir "5" kabul (5 yazılır), öteki "5"ler (zaten ödenmiş / tamamlanmış) ve "6"lar (parçadan büyük) AÇIK ret.
    { const a = await yeniAtama({ miktar: 5, onay: false });
      const p2 = yeniId("a");
      await k.sorgu(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
        values ($1, $2, 'Kesim', 'g25-q', '{"40": 5}'::jsonb, 5, true, false, false, 0, jsonb_build_object('kismiKalanKaynak', $3::text))`, [p2, a.uid, a.aid]);
      await isiOnayla(a.aid);
      const [alt1, alt2] = [await teslimAlt(a.aid), await teslimAlt(p2)];
      const plan = [["kök parça (5)", alt1, 5], ["kök parça (5)", alt1, 5], ["kök parça (5)", alt1, 6], ["kalan parça (5)", alt2, 5], ["kalan parça (5)", alt2, 5], ["kalan parça (5)", alt2, 6]];
      const rr = await Promise.all(plan.map(([, alt, m]) => istek("Uretimci", "rpc/fis_kes", { p: urtYuk("g25-q", m, 35, a.uid, alt) })));
      const sat = []; for (let x = 0; x < plan.length; x++) sat.push(await istekSatiri("K4 · EŞZAMANLI istek", plan[x][0], plan[x][2], rr[x]));
      sat.sort(); sat.forEach((x) => { satirlar.push(x); console.log(x); });
      const odenen = Number((await k.sorgu(`select coalesce(sum(miktar), 0) n from public.isc_odeme o join public.stk_fis f on f.istek = o.istek where o.kok = $1 and not f.iptal`, [a.aid]).catch(() => [{ n: -1 }]))[0].n);
      const fis = Number((await k.sorgu(`select count(*) n from public.stk_fis where uretim_id = $1 and not iptal`, [a.uid]))[0].n);
      let topKayit = 0; for (const r of rr) topKayit += await kaydedilen(r);
      const kabul = rr.map((r, x) => r.ok ? plan[x][2] : null).filter((x) => x != null).sort();
      yaz(`K4 · EŞZAMANLI 6 istek, iki parça (onaylı 10) · Uretimci [kabul edilen istekler ${JSON.stringify(kabul)}, fiş ${fis}, kaydedilen ${topKayit}, ödeme kaydı ${odenen}]`,
        { ok: JSON.stringify(kabul) === "[5,5]" && fis === 2 && topKayit === 10 && odenen === 10, kod: "toplam / kırpma" }, "geçti"); }
    // TAMİR TALEBİ → ONAY: Üretim talep eder (önerilen 5.000); yetkili ücreti 40 BELİRLER; 40 ile teslim geçer; onaydan sonra miktar
    // değişirse eski onay kullanılamaz; eşzamanlı iki onay tek onay kaydı
    { const a = await yeniAtama({ tamir: true, tamirUcret: 5000, onay: false });
      const g = (await onayListesi("Muhasip")).find((x) => x.anahtar === `atama|${a.aid}`);
      yaz("K4 · tamir talebi onay listesinde (onaysız, önerilen 5.000) · Muhasip görür", { ok: !!g && !g.onayli && g.guncel.tamir === true && Number(g.guncel.ucret) === 5000, kod: "listede yok" }, "geçti");
      yaz("K4 · tamir ücretini belirleme · Uretimci", await dene("Uretimci", "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: `atama|${a.aid}`, ozet: g && g.guncel, yeniUcret: 40 }] } }), "ret 42501");
      const [o1, o2] = await Promise.all([1, 2].map(() => istek("Muhasip", "rpc/ucret_onayla", { p: { kalemler: [{ anahtar: `atama|${a.aid}`, ozet: g && g.guncel, yeniUcret: 40 }] } })));
      const ucr = Number((await k.sorgu("select tamir_ucret u from public.uretim_atamalari where id = $1", [a.aid]))[0].u);
      const n = Number((await k.sorgu("select count(*) n from public.ucr_onay where anahtar = $1", [`atama|${a.aid}`]).catch(() => [{ n: -1 }]))[0].n);
      yaz(`K4 · tamir ücretini 40 belirleyip onaylama, EŞZAMANLI iki kez · Muhasip [${o1.ok ? "ok" : o1.kod}/${o2.ok ? "ok" : o2.kod}, atama ücreti ${ucr}, onay kaydı ${n}]`, { ok: o1.ok && o2.ok && ucr === 40 && n === 1, kod: "onay" }, "geçti");
      await K4("tamir: onaylanmamış eski ücretle (5.000) teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 5000, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await k.sorgu("update public.uretim_atamalari set miktar = 12 where id = $1", [a.aid]);
      await K4("tamir: onaydan sonra miktar 10 → 12, 10 × 40 teslim (eski onay geçersiz) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 40, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await k.sorgu("update public.uretim_atamalari set miktar = 10 where id = $1", [a.aid]);
      await K4("tamir: miktar 10'a döndü, YENİ onay yok — eski onay canlanmaz: 10 × 40 · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 40, a.uid, await teslimAlt(a.aid))), "ret 42501");
      await isiOnayla(a.aid);
      await K4("tamir: yeniden onaylı 10 × 40 teslim · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 10, 40, a.uid, await teslimAlt(a.aid))), "geçti"); }
    // Tamirde kısmi teslim: onaylı 10 × 40 → 6 teslim (kalan 4) → kalan 4; kalan parçanın ücreti 90'a çekilirse geçmez
    { const a = await yeniAtama({ tamir: true, tamirUcret: 40 });
      const k1 = await kismiAlt(a.aid, 6);
      await K4("tamir kısmi teslim 6 × 40 (kalan 4) · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 6, 40, a.uid, k1.alt)), "geçti");
      await k.sorgu("update public.uretim_atamalari set tamir_ucret = 90 where id = $1", [k1.kalanId]);
      await K4("tamir kalan parçanın ücreti 40 → 90 (zincir tutarsız) 4 × 90 · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 4, 90, a.uid, await teslimAlt(k1.kalanId))), "ret 42501");
      await k.sorgu("update public.uretim_atamalari set tamir_ucret = 40 where id = $1", [k1.kalanId]);
      await K4("tamir kalan ücret 40'a döndü (zincir tutarlı), YENİ onay yok: 4 × 40 · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 4, 40, a.uid, await teslimAlt(k1.kalanId))), "ret 42501");
      await isiOnayla(a.aid);
      await K4("tamir kalan 4 × 40 yeniden onaydan sonra · Uretimci", await fisKes("Uretimci", urtYuk("g25-q", 4, 40, a.uid, await teslimAlt(k1.kalanId))), "geçti"); }
  }

  console.log(`── ${satirlar.length} satır${BEKLENEN ? ` · ${kirmizi ? kirmizi + " ✗" : "hepsi beklenen"}` : ""} ──`);
  await k.kapat();
  process.exit(BEKLENEN && kirmizi ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
