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
  const sayac = async () => JSON.stringify((await k.sorgu(`select (select count(*) from public.stk_fis) f, (select count(*) from public.stk_hareket) s,
    (select count(*) from public.car_hareket) c, (select count(*) from public.kas_hareket) k, (select coalesce(sum(son), 0) from public.fis_sayac) n,
    (select count(*) from public.uretim_atamalari) a`))[0]);
  const satirlar = []; let kirmizi = 0;
  const yaz = (anahtar, sonuc, beklenen) => {
    const durum = sonuc.ok ? "geçti" : `ret ${sonuc.kod}${sonuc.atomik === false ? " · SATIR KALDI" : ""}`;
    let isaret = "";
    if (BEKLENEN && beklenen !== undefined) {
      const tutar = beklenen === "geçti" ? sonuc.ok : (!sonuc.ok && (beklenen === "ret" || durum.startsWith(beklenen)) && sonuc.atomik !== false);
      isaret = tutar ? " ✓" : ` ✗ (beklenen ${beklenen})`;
      if (!tutar) kirmizi += 1;
    }
    satirlar.push(`${anahtar} · ${durum}${isaret}`);
    console.log(`${anahtar} · ${durum}${isaret}${!sonuc.ok && sonuc.mesaj && process.env.T25_AYRINTI ? `  [${sonuc.mesaj}]` : ""}`);
  };
  const dene = async (kul, yol, govde) => {
    const once = await sayac();
    const r = await istek(kul, yol, govde);
    if (!r.ok) r.atomik = (await sayac()) === once;
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

  // A8: mesai (ÖNCE'de fonksiyonlar yok — ret kodu kaydedilir)
  const ay = "2026-11";
  await k.sorgu("delete from public.mes_bildirim where cari_id = 'g25-p'").catch(() => {});
  const bildir = { p: { cariId: "g25-p", ay, saatler: { haftaIci: 10, cumartesi: 2, pazar: 0 } } };
  yaz("A8 · mesai_bildir · Veli", await dene("Veli", "rpc/mesai_bildir", bildir), "ret 42501");
  const b1 = await dene("Uretimci", "rpc/mesai_bildir", bildir);
  yaz("A8 · mesai_bildir · Uretimci", b1, "geçti");
  const bid = b1.ok && b1.govde && b1.govde.id;
  const msYuk = () => { const p = ISLEMLER.MS(); p.fis.ek = { mesaiAnahtari: `MESAI-${ay}-g25-p` }; return p; };
  yaz("A8 · mesai_onayla · Uretimci", await dene("Uretimci", "rpc/mesai_onayla", { p: { bildirimId: bid, fis: msYuk() } }), "ret 42501");
  const onay = await dene("Muhasip", "rpc/mesai_onayla", { p: { bildirimId: bid, fis: msYuk() } });
  if (onay.ok) {
    const d = (await k.sorgu("select durum, fis_no from public.mes_bildirim where id = $1", [bid]))[0] || {};
    const c = (await k.sorgu("select count(*) as n from public.car_hareket where fis_no = $1 and cari_id = 'g25-p'", [d.fis_no]))[0].n;
    if (d.durum !== "onaylandi" || Number(c) !== 1) onay.ok = false, onay.kod = `DURUM ${d.durum} / satır ${c}`;
  }
  yaz("A8 · mesai_onayla · Muhasip (MS fişi + onay tek işlem)", onay, "geçti");
  yaz("A8 · onaylı ayı yeniden bildirme · Uretimci", await dene("Uretimci", "rpc/mesai_bildir", bildir), "ret KR014");
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

  console.log(`── ${satirlar.length} satır${BEKLENEN ? ` · ${kirmizi ? kirmizi + " ✗" : "hepsi beklenen"}` : ""} ──`);
  await k.kapat();
  process.exit(BEKLENEN && kirmizi ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
