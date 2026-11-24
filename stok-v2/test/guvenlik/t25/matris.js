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
const urt = (cari, miktar, ucret, opt = {}) => yuk(fis("ÜRT", "para", "Üretim", { cariId: cari, uretimId: opt.uretimId || "g25-u1" }),
  { cari: [cariSatir(cari, "Alacak", miktar * ucret, { islemTipi: "İşçilik", miktar, birimFiyat: ucret }, { uretim_id: opt.uretimId || "g25-u1" })] });
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
  URT_teslim: () => urt("g25-p", 3, 35),
  URT_ara: () => urt("g25-f", 3, 2),
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
  h_urt_atanmamis_cari: () => urt("g25-m", 3, 35),
  i_urt_ucret_yok: () => urt("g25-p", 3, 1000),
  j_urt_adet_asimi: () => urt("g25-p", 11, 35),
  k_bilinmeyen_onek: () => para("XX", "Bilinmeyen", "g25-m", "Borç", 5),
  l_urt_kayit_yok: () => urt("g25-p", 3, 35, { uretimId: "yok-uretim" }),
};

(async () => {
  const k = kopruKur({ veritabani: DB });
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
    if (PARA.includes(kul)) return "geçti";
    if (["Veli", "Deniz"].includes(kul)) return "ret 42501";
    const stokMu = ["AF_stok", "SF_stok", "URT_teslim", "URT_ara", "MNL"].includes(is);
    if (stokMu) return "geçti";
    if (is === "VRM") return kul === "Fisci" ? "geçti" : "ret 42501";
    return "ret 42501";
  };
  console.log(`── G-25 yetki matrisi · ${DB} · ${ETIKET}`);
  for (const is of Object.keys(ISLEMLER)) {
    for (const kul of ["Ali", "Muhasip", "Carici", "Muhasebeci", "Uretimci", "Ayse", "Fisci", "Veli", "Deniz"]) {
      yaz(`A · ${is} · ${kul}`, await dene(kul, "rpc/fis_kes", { p: ISLEMLER[is]() }), beklenen(kul, is));
    }
  }
  // A7: car_yaz fiş dışından
  for (const kul of ["Ali", "Muhasip", "Ayse", "Uretimci", "Fisci"]) {
    yaz(`A7 · car_yaz satır · ${kul}`, await dene(kul, "rpc/car_yaz", { p: { satirlar: [{ ...cariSatir("g25-m", "Borç", 1), fis_no: null }] } }),
      ["Ali", "Muhasip"].includes(kul) ? "geçti" : "ret 42501");
  }
  // A4: sahtecilik
  for (const [ad, f] of Object.entries(SAHTE)) {
    for (const kul of ["Ayse", "Uretimci"]) yaz(`A4 · ${ad} · ${kul}`, await dene(kul, "rpc/fis_kes", { p: f() }), "ret 42501");
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
      const kes = await istek("Ali", "rpc/fis_kes", { p: IPTAL[is]() });
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

  // AÇIK RİSK — G-25 KAPATMAZ (24 Kasım; kullanıcı: "Proses ücretini değiştirerek işçilik tutarını yükseltme yolunu açık risk olarak koru;
  // 'K4 tamamen kapandı' deme"). ÜRETİM bağlantısı (g25_uretim_bagi) işçilik ücretini doğrular ama ücretin KAYNAKLARI üretim / stok /
  // tanımlar yetkilisinin yazabildiği yerlerdedir. Beklenti YAZILMAZ (davranış ölçülür); geçen her satırda yazılan tutar gösterilir.
  // Uretimci = Üretim rolü (üretim + stok kaydetme, PARA yok). g25-u1: adet 10, Kesim ücreti 35 → meşru üst sınır 10 × 35 = 350 ₺.
  {
    const yazilan = async (r) => { if (!r.ok || !r.govde) return "";
      const t = (await k.sorgu("select string_agg(cari_id || ' ' || yon || ' ' || tutar::text, ', ') t from public.car_hareket where fis_no = $1", [r.govde.fisNo]))[0].t;
      return ` → yazılan: ${t}`; };
    const atama = (alan) => ({ id: yeniId("a"), uretim_id: "g25-u1", proses: "Kesim", personel_id: "g25-p", beden_miktarlari: { 40: 10 }, miktar: 10,
      verildi_mi: true, tamamlandi_mi: false, tamir_mi: true, tamir_ucret: 5000, ek: {}, ...alan });
    const risk = async (ad, r) => { const y = await yazilan(r); satirlar.push(`AÇIK RİSK · ${ad} · ${r.ok ? "geçti" : `ret ${r.kod}`}${y}`);
      console.log(`AÇIK RİSK · ${ad} · ${r.ok ? "geçti" : `ret ${r.kod}`}${y}${!r.ok && r.mesaj ? `  [${r.mesaj}]` : ""}`); };
    // R1: aynı istekte tamir ataması (keyfi ücret) + işçilik — tek adım
    { const p = urt("g25-p", 10, 5000); p.alt = { uretim_atamalari: { satirlar: [atama()] } };
      await risk("R1 tek istekte tamir ataması 5.000 ₺ + işçilik 10 × 5.000 · Uretimci", await istek("Uretimci", "rpc/fis_kes", { p })); }
    // R1b: aynı, ama tamir ataması MÜŞTERİ carisine (personel olmayan cariye işçilik alacağı)
    { const p = urt("g25-m", 10, 5000); p.alt = { uretim_atamalari: { satirlar: [atama({ personel_id: "g25-m" })] } };
      await risk("R1b tek istekte müşteri carisine tamir ataması + işçilik · Uretimci", await istek("Uretimci", "rpc/fis_kes", { p })); }
    // R2: ürün kartında proses ücreti 35 → 500 (urunler yazması), sonra işçilik 10 × 500
    { const u = await istek("Uretimci", "urunler?id=eq.ekr-bot", { proses_ucretleri: { Kesim: 500 } }, "PATCH", { prefer: "return=minimal" });
      await risk("R2a ürün proses ücreti 35 → 500 · Uretimci", u);
      await risk("R2b işçilik 10 × 500 (ürün kartındaki yeni ücret) · Uretimci", await istek("Uretimci", "rpc/fis_kes", { p: urt("g25-p", 10, 500) }));
      await k.sorgu(`update public.urunler set proses_ucretleri = '{"Kesim": 35}'::jsonb where id = 'ekr-bot'`); }
    // R3: ürüne özel ara proses carisi + ücreti (urunler.ek) → müşteri carisine 10 × 900
    { const ek = ((await k.sorgu("select ek from public.urunler where id = 'ekr-bot'"))[0] || {}).ek || {};
      const u = await istek("Uretimci", "urunler?id=eq.ekr-bot", { ek: { ...ek, araProsesCariOverride: { "ap-g25": "g25-m" }, araProsesUcretleri: { "ap-g25": 900 } } }, "PATCH", { prefer: "return=minimal" });
      await risk("R3a ürüne özel ara proses carisi → müşteri, ücreti → 900 · Uretimci", u);
      await risk("R3b ara proses işçiliği müşteri carisine 10 × 900 · Uretimci", await istek("Uretimci", "rpc/fis_kes", { p: urt("g25-m", 10, 900) }));
      await k.sorgu("update public.urunler set ek = $1 where id = 'ekr-bot'", [ek]); }
    // R4: Tanımlar'da ara proses ücreti 2 → 700 (tanimlar yazması), sonra fasoncuya 10 × 700
    { const r = await tanimYaz("Uretimci", (v) => { v.araProsesler.find((a) => a.id === "ap-g25").ucret = 700; });
      await risk("R4a Tanımlar ara proses ücreti 2 → 700 · Uretimci", r);
      await risk("R4b ara proses işçiliği 10 × 700 · Uretimci", await istek("Uretimci", "rpc/fis_kes", { p: urt("g25-f", 10, 700) }));
      await k.sorgu(`update public.tanimlar set veri = jsonb_set(veri, '{araProsesler}', (select jsonb_agg(case when a ->> 'id' = 'ap-g25' then jsonb_set(a, '{ucret}', '2') else a end)
        from jsonb_array_elements(veri -> 'araProsesler') a)) where id = 'tekil'`); }
    // R5: üretim kaydında (numune ücreti) Kesim → 800 (uretim yazması), sonra 10 × 800
    { const ek = ((await k.sorgu("select ek from public.uretim where id = 'g25-u1'"))[0] || {}).ek || {};
      const u = await istek("Uretimci", "uretim?id=eq.g25-u1", { ek: { ...ek, prosesUcretleri: { Kesim: 800 } } }, "PATCH", { prefer: "return=minimal" });
      await risk("R5a üretim kaydında proses ücreti → 800 · Uretimci", u);
      await risk("R5b işçilik 10 × 800 (üretim kaydındaki ücret) · Uretimci", await istek("Uretimci", "rpc/fis_kes", { p: urt("g25-p", 10, 800) }));
      await k.sorgu("update public.uretim set ek = $1 where id = 'g25-u1'", [ek]); }
  }

  console.log(`── ${satirlar.length} satır${BEKLENEN ? ` · ${kirmizi ? kirmizi + " ✗" : "hepsi beklenen"}` : ""} ──`);
  await k.kapat();
  process.exit(BEKLENEN && kirmizi ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
