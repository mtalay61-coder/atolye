#!/usr/bin/env node
// F1.1 — SİPARİŞ İPTALİNDE TESLİM BAĞININ İZİ: başarısızlık testleri (F1-1-BAG-IZI-TASARIM.md § 8). 1.743.0 SQL'inde
// KIRMIZI beklenir (beklenen-f11.txt). Uygulamanın KENDİ akışları: teslim yükü (081), sipariş iptali (087/088 + fis_bag_coz),
// fiş iptali (100: fisGeriAl cihazın yerel verisiyle). Kullanıcı kuralları (2 Kasım):
//   1) eski sipariş / kalem kimliği saklanır; GEÇMİŞ bağ ile GEÇERLİ teslim bağı açıkça ayrı (ayrı sütunlar)
//   2) fiş iptalinde geçmiş bağ korunur; iptal edilmiş hareket karşılanana girmez
//   3) S1 (sipariş iptali → fiş iptali) ve eşzamanlı (S2) ayrı ayrı
//   8) eski, izsiz kayıtta tahminle bağ kurulmaz
// Kilit sırası (kural 4) ayrıca t-f11-kilit.js'te; burada yalnız S2'nin veri sonucu.
const F = require("./f11-ortak.js");
const { ON, E } = F;
const TEKRAR = Number(process.env.F11_TEKRAR || 3);   // zorlanmış S2a tekrarı
const DOGAL = Number(process.env.F11_DOGAL || 10);    // doğal S2 tekrarı (kilit dosyasında N=100)
const korumasiz = (sql) => F.psql(`set session_replication_role = replica;\n${sql}\nset session_replication_role = origin;`);
const teslim = (s, k, adet, ekran, istek) => F.rpc("fis_kes", F.teslimYuku({ s, kalemId: k, adet, ekran, istek }));
const sutunYok = "sütun yok";

(async () => {
  console.log(`F1.1 başarısızlık testleri · önek ${ON} · istemci ${process.env.F0_ERP ? "F0_ERP" : "bugünkü (test/erp.cjs)"} · iz sütunları ${F.izSutunlari()}/3`);

  // F11.iz-sutunlari — geçmiş bağ AYRI sütunlarda; aynı satırda iki bağ birden olamaz (kural 1)
  {
    const kisit = F.psql(`select count(*) from pg_constraint where conrelid = 'public.stk_hareket'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%gecmis_kalem_id%' and pg_get_constraintdef(oid) ilike '%kalem_id is null%';`);
    F.kontrol("F11.iz-sutunlari", "stk_hareket: gecmis_siparis_id, gecmis_kalem_id, bag_cozum_zamani + 'iki bağ birden yok' kısıtı",
      { sonra: { sutun: F.izSutunlari(), kisit: Number(kisit) }, gercek: [F.izSutunlari(), Number(kisit)], beklenen: [3, 1] });
  }

  // S1 — teslim 3 → sipariş İPTAL (uygulama akışı) → teslim fişi İPTAL (aynı cihaz, yerel veri güncel)
  {
    const k = `${F.ON}-s1k`, s = F.siparisKur(F.sipObj(`${F.ON}-s1`, [F.kalemObj(k, 20, 0)]));
    const fis = teslim(s, k, 3, 0, `${F.ON}-s1i`).sonuc.fisNo;
    const once = F.durum(k, fis);
    const ip = await F.siparisIptal(s, F.yerelOku(s));
    const sonra = F.durum(k, fis);
    const sat = (sonra.satirlar || [])[0] || {};
    // F11.bag-coz-iz-yazar — geçerli bağ boş, geçmiş bağ = eski kalem / sipariş, çözüm zamanı dolu
    F.kontrol("F11.bag-coz-iz-yazar", "fis_bag_coz: geçerli bağ boşalır, eski kalem ve sipariş GEÇMİŞ sütunlarda", { once: once.satirlar, sonra: { satirlar: sonra.satirlar, fisBagCoz: ip.bc },
      gercek: F.izVar() ? [sat.kalem, sat.siparis, sat.gecmisKalem, sat.gecmisSiparis, sat.cozum] : sutunYok, beklenen: [null, null, k, s.id, true] });
    // F11.S1-iptal-sonrasi — sipariş iptalinde teslim geçmişi kalemde kalır (karar A): karşılanan 3 = sunucu hesabı 3, hayalet değil
    const d1 = F.denetim(`${F.ON}-s1`);
    F.kontrol("F11.S1-iptal-sonrasi", "S1 sipariş iptalinden sonra: karşılanan 3 = hesap 3; hayalet (D1b) yok", { once: { karsilanan: once.karsilanan, hesap: once.hesap },
      sonra: { karsilanan: sonra.karsilanan, hesap: sonra.hesap, D1b: d1.D1b_hayalet_karsilanan || 0 },
      gercek: [sonra.karsilanan, sonra.hesap, d1.D1b_hayalet_karsilanan || 0], beklenen: [3, 3, 0] });
    // F11.iz-bir-kez — aynı siparişe ikinci fis_bag_coz (iki cihaz / tekrar) izi değiştirmez
    const z1 = F.izVar() ? F.psql(`select gecmis_kalem_id || '|' || bag_cozum_zamani from public.stk_hareket where fis_id = '${fis}';`) : null;
    const tekrar = F.rpc("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo });
    const z2 = F.izVar() ? F.psql(`select gecmis_kalem_id || '|' || bag_cozum_zamani from public.stk_hareket where fis_id = '${fis}';`) : null;
    F.kontrol("F11.iz-bir-kez", "ikinci fis_bag_coz: geçmiş bağ ve çözüm zamanı aynı kalır", { sonra: { ilk: z1, ikinci: z2, tekrar: tekrar.ok ? tekrar.sonuc : tekrar.hata },
      gercek: F.izVar() ? [z1 !== null && z1 === z2, tekrar.ok] : sutunYok, beklenen: [true, true] });
    // F11.S1-fis-iptali — fiş iptali: karşılanan 3 → 0; satır iptal, geçmiş bağ DURUYOR (kural 2); yanıt kalemi bildirir
    const fy = F.fisIptalYuku(fis, ip.yerel);
    const r = F.rpc("fis_iptal", fy.yuk);
    const son = F.durum(k, fis);
    const s2 = (son.satirlar || [])[0] || {};
    const d2 = F.denetim(`${F.ON}-s1`);
    F.kontrol("F11.S1-fis-iptali", "S1 fiş iptalinden sonra: karşılanan 0 = hesap 0, satır iptal, geçmiş bağ korunur, hayalet yok", {
      once: { karsilanan: sonra.karsilanan }, sonra: { karsilanan: son.karsilanan, hesap: son.hesap, satirlar: son.satirlar, D1b: d2.D1b_hayalet_karsilanan || 0,
        istemcininKalemDusumu: fy.kalemDusumu, gonderilenAlt: fy.yuk.alt || null, fisIptal: r.ok ? "tamam" : r.hata },
      gercek: [son.karsilanan, son.hesap, s2.iptal, F.izVar() ? s2.gecmisKalem : sutunYok, d2.D1b_hayalet_karsilanan || 0], beklenen: [0, 0, true, k, 0] });
    F.kontrol("F11.S1-yanit-kalemler", "fis_iptal yanıtı geçmiş bağlı kalemi de bildirir (istemci yerel karşılananı düzeltsin)", {
      sonra: { yanit: r.ok ? r.sonuc.kalemler : r.hata }, gercek: r.ok ? r.sonuc.kalemler : r.hata, beklenen: [{ id: k, karsilanan: 0 }] });
  }

  // S1k (kontrol) — önce fiş iptali, sonra sipariş iptali: bugün de doğru (0); F1.1 bozmamalı. İptal satırı da izini alır.
  {
    const k = `${F.ON}-kxk`, s = F.siparisKur(F.sipObj(`${F.ON}-kx`, [F.kalemObj(k, 20, 0)]));   // `-s1` önekine girmesin
    const fis = teslim(s, k, 3, 0, `${F.ON}-kxi`).sonuc.fisNo;
    const r = F.rpc("fis_iptal", F.fisIptalYuku(fis, F.yerelOku(s)).yuk);
    const ip = await F.siparisIptal(s, F.yerelOku(s));
    const son = F.durum(k, fis);
    F.kontrol("F11.S1k-kontrol", "kontrol (fiş iptali → sipariş iptali): karşılanan 0 = hesap 0", { sonra: { karsilanan: son.karsilanan, hesap: son.hesap, fisIptal: r.ok, fisBagCoz: ip.bc },
      gercek: [son.karsilanan, son.hesap], beklenen: [0, 0] });
    const sat = (son.satirlar || [])[0] || {};
    F.kontrol("F11.S1k-iptal-satiri-izi", "iptal edilmiş satır da sipariş iptalinde geçmişe taşınır (geçerli bağ kalmaz)", { sonra: { satirlar: son.satirlar },
      gercek: F.izVar() ? [sat.iptal, sat.kalem, sat.gecmisKalem] : sutunYok, beklenen: [true, null, k] });
  }

  // S2a — EŞZAMANLI, araya girme ZORLANIR: kalem 1 sn tutulur; A cihazı fiş iptali, B cihazı sipariş iptali. İki başlangıç sırası.
  for (const [kimlik, ilkIptal] of [["F11.S2a-eszamanli", true], ["F11.S2a-ters-sira", false]]) {
    const kayit = [];
    for (let i = 0; i < TEKRAR; i++) {
      const on = `${F.ON}-${ilkIptal ? "a" : "b"}${String(i).padStart(3, "0")}`;   // sabit genişlik (denetim öneki)
      const k = `${on}k`, s = F.siparisKur(F.sipObj(on, [F.kalemObj(k, 20, 0)]));
      const fis = teslim(s, k, 3, 0, `${on}i`).sonuc.fisNo;
      const fy = F.fisIptalYuku(fis, F.yerelOku(s));
      const tut = F.oturum(`begin; select id from public.siparis_kalemleri where id = '${k}' for update; select pg_sleep(1); commit;`);
      await F.uyu(200);
      const birinci = ilkIptal ? F.rpcAyri("fis_iptal", fy.yuk) : F.rpcAyri("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo });
      await F.uyu(300);
      const ikinci = ilkIptal ? F.rpcAyri("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo }) : F.rpcAyri("fis_iptal", fy.yuk);
      const [r1, r2] = await Promise.all([birinci, ikinci, tut]);
      const d = F.durum(k, fis);
      kayit.push({ ilk: F.kisa(r1), ikinci: F.kisa(r2), karsilanan: d.karsilanan, hesap: d.hesap, fisGecerli: d.fisGecerli, D1b: F.denetim(on).D1b_hayalet_karsilanan || 0 });
    }
    const ayri = [...new Set(kayit.map((x) => JSON.stringify(x)))].map((x) => JSON.parse(x));
    F.kontrol(kimlik, `S2a zorlanmış (${ilkIptal ? "fiş iptali önce" : "sipariş iptali önce"}) ×${TEKRAR}: ikisi tamam, karşılanan 0 = hesap 0, hayalet yok`, {
      sonra: ayri, gercek: ayri, beklenen: [{ ilk: "ok", ikinci: "ok", karsilanan: 0, hesap: 0, fisGecerli: false, D1b: 0 }] });
  }

  // S2 doğal zamanlama ×DOGAL — veri sonucu (kilitlenme oranı t-f11-kilit.js P1'de N=100 ile)
  {
    let kil = 0, bozuk = 0; const ornek = [];
    for (let i = 0; i < DOGAL; i++) {
      const on = `${F.ON}-n${String(i).padStart(3, "0")}`;
      const k = `${on}k`, s = F.siparisKur(F.sipObj(on, [F.kalemObj(k, 20, 0)]));
      const fis = teslim(s, k, 3, 0, `${on}i`).sonuc.fisNo;
      const fy = F.fisIptalYuku(fis, F.yerelOku(s));
      const [rI, rB] = await Promise.all([F.rpcAyri("fis_iptal", fy.yuk), F.rpcAyri("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo })]);
      kil += [rI, rB].filter(F.kilitlenmeMi).length;
      const d = F.durum(k, fis);
      const beklenenK = rI.ok ? 0 : 3;   // kahin: fiş iptali işlendiyse 0, yalnız sipariş iptali işlendiyse 3
      if (d.karsilanan !== beklenenK || d.hesap !== beklenenK) { bozuk += 1; if (ornek.length < 3) ornek.push({ iptal: F.kisa(rI), bagCoz: F.kisa(rB), ...d, satirlar: undefined }); }
    }
    F.kontrol("F11.S2-dogal", `S2 doğal ×${DOGAL}: kilitlenme 0, her denemede karşılanan = hesap = beklenen`, { sonra: { kilitlenme: kil, bozuk, ornek },
      gercek: [kil, bozuk], beklenen: [0, 0] });
  }

  // F11.izsiz-eski-kayit — F1.1'DEN ÖNCE bağı çözülmüş kayıt (eski fis_bag_coz'un etkisi, tetikleyicisiz kurulur): geçmiş sütun
  // boş KALIR (tahmin yok, kural 8), karşılanan değişmez (hayalet olarak raporlanır), denetimde D5c "izsiz"
  {
    const k = `${F.ON}-ezk`, s = F.siparisKur(F.sipObj(`${F.ON}-ez`, [F.kalemObj(k, 20, 0)]));
    const fis = teslim(s, k, 3, 0, `${F.ON}-ezi`).sonuc.fisNo;
    korumasiz(`update public.stk_hareket set siparis_id = null, kalem_id = null, siparis_no = '${s.siparisNo} (iptal)' where fis_id = '${fis}';
      update public.stk_fis set ek = ek || jsonb_build_object('siparisIptal', jsonb_build_object('no', '${s.siparisNo}', 'zaman', now())) where id = '${fis}';
      update public.siparisler set durum = 'İptal' where id = '${s.id}';`);
    const d = F.durum(k, fis); const sat = (d.satirlar || [])[0] || {};
    const den = F.denetim(`${F.ON}-ez`);
    F.kontrol("F11.izsiz-eski-kayit", "izsiz eski kayıt: geçmiş bağ BOŞ (tahmin yok), karşılanan 3 değişmez, denetimde D5c", {
      sonra: { satirlar: d.satirlar, karsilanan: d.karsilanan, denetim: den },
      gercek: [F.izVar() ? sat.gecmisKalem : sutunYok, d.karsilanan, den.D5c_bagi_cozulmus_izsiz === undefined ? "D5c yok" : den.D5c_bagi_cozulmus_izsiz],
      beklenen: [null, 3, 1] });
    // Bu fiş sonradan iptal edilirse: kalem bilinmiyor → karşılanan yine 3 (yeni hayalet de üretilmez, durum aynen raporlanır)
    const r = F.rpc("fis_iptal", F.fisIptalYuku(fis, F.yerelOku(s)).yuk);
    const d2 = F.durum(k, fis); const s2 = (d2.satirlar || [])[0] || {};
    F.kontrol("F11.izsiz-fis-iptali", "izsiz kaydın fişi iptal: karşılanan 3 kalır, geçmiş sütun hâlâ boş (kalem tahmin edilmez)", {
      sonra: { fisIptal: r.ok ? "tamam" : r.hata, karsilanan: d2.karsilanan, satirlar: d2.satirlar },
      gercek: [r.ok, d2.karsilanan, F.izVar() ? s2.gecmisKalem : sutunYok], beklenen: [true, 3, null] });
  }

  // F11.satir-korumasi — geçmiş sütunu yalnız fis_bag_coz yazar (boştan eski geçerli değere, bir kez)
  {
    const k = `${F.ON}-skk`, s = F.siparisKur(F.sipObj(`${F.ON}-sk`, [F.kalemObj(k, 20, 0)]));
    const yuk = F.teslimYuku({ s, kalemId: k, adet: 1, ekran: 0, istek: `${F.ON}-ski` });
    yuk.stok.satirlar = yuk.stok.satirlar.map((x) => ({ ...x, gecmisKalemId: "sahte", gecmis_kalem_id: "sahte", gecmisSiparisId: "sahte", gecmis_siparis_id: "sahte" }));
    const r = F.rpc("fis_kes", yuk);
    const hid = r.ok ? F.psql(`select id from public.stk_hareket where fis_id = '${r.sonuc.fisNo}' limit 1;`) : null;
    // "kabul" yalnız deyim hatasız VE satır gerçekten değiştiyse (RLS satırı sessizce gizleyebilir: 0 satır = red)
    const dene = (sql) => { try { return /N:1/.test(F.psql(sql)) ? "kabul" : "red"; } catch (e) { return "red"; } };
    const guncelle = (set) => `with u as (update public.stk_hareket set ${set} where id = '${hid}' returning 1) select 'N:' || count(*) from u;`;
    const iz = F.izVar();
    const a = iz && hid ? F.psql(`select coalesce(gecmis_kalem_id, '') || '|' || coalesce(gecmis_siparis_id, '') from public.stk_hareket where id = '${hid}';`) : sutunYok;
    // bag kipinde bile BAŞKA değer yazılamaz
    const b = iz ? dene(`begin; select set_config('fis.kapi', 'acik', true); select set_config('fis.duzen', 'bag', true);
      ${guncelle("gecmis_kalem_id = 'baska-kalem', kalem_id = null, siparis_id = null")} rollback;`) : sutunYok;
    // kip yokken (kapı açık) geçmiş sütun değişmez
    const c = iz ? dene(`begin; select set_config('fis.kapi', 'acik', true); ${guncelle(`gecmis_kalem_id = '${k}'`)} rollback;`) : sutunYok;
    // giriş yapmış kullanıcı doğrudan yazamaz
    const d = iz ? dene(`begin; select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', true); set local role authenticated;
      ${guncelle("gecmis_kalem_id = 'x'")} rollback;`) : sutunYok;
    // aynı satırda iki bağ birden: kısıt
    const e = iz ? dene(`begin; select set_config('fis.kapi', 'acik', true); select set_config('fis.duzen', 'bag', true);
      ${guncelle("gecmis_kalem_id = kalem_id")} rollback;`) : sutunYok;
    F.kontrol("F11.satir-korumasi", "geçmiş sütun: fis_kes yükünden yazılmaz; bag kipinde başka değer, kipsiz, kullanıcıdan ve iki bağ birden reddedilir", {
      sonra: { fisKes: r.ok, yuktenYazilan: a, bagKipiBaskaDeger: b, kipsiz: c, kullanici: d, ikiBag: e },
      gercek: [r.ok, a, b, c, d, e], beklenen: [true, "|", "red", "red", "red", "red"] });
  }

  F.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
