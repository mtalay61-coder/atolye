#!/usr/bin/env node
// F2 — TESLİM GEÇMİŞİ OLAN SİPARİŞ KALEMİ: başarısızlık testleri (F2-TESLIMLI-KALEM-TASARIM.md). Bu dalın SQL'inde (F1.1) KIRMIZI
// beklenenler hedef davranışı ister; YEŞİL olanlar korunacak davranıştır (teslimsiz kalemin normal düzenlemesi). beklenen-f2.txt.
// Kullanıcı hedefi (2 Kasım): "Teslim geçmişi bulunan sipariş kalemlerinin silinmesi, başka kalemle birleştirilmesi veya ürün/renk/
// beden kimliğinin değiştirilmesi sonucunda hiçbir fiş ya da stok hareketi sahipsiz kalmamalı." Geçerli (kalem_id) VE geçmiş
// (gecmis_kalem_id, F1.1) bağ birlikte değerlendirilir.
// Yazmalar uygulamanın gerçek köprüsünden (040 supabaseTabloEsitle → alt_yaz; sipariş silme → REST DELETE siparisler, kalemler
// FK cascade ile). İstemci: F0_ERP (yoksa bugünkü), birleştirme 075 bekleyenKalemleriBirlestir F0_KAYNAK'tan (yoksa bugünkü src).
const fs = require("fs");
const path = require("path");
const F = require("../f0/f11-ortak.js");
const { ON, E, psql } = F;
const KAYNAK = process.env.F0_KAYNAK || path.join(__dirname, "../../../src");
const k075 = fs.readFileSync(path.join(KAYNAK, "075-fis-ortak.jsx"), "utf8");
const bb = k075.indexOf("function bekleyenKalemleriBirlestir"), bs = k075.indexOf("\n}\n", bb) + 3;
const bekleyenKalemleriBirlestir = new Function(`${k075.slice(bb, bs)}; return bekleyenKalemleriBirlestir;`)();

// REST DELETE (sipariş / üretim silme) gerçek veritabanında, giriş yapmış kullanıcı olarak — ortak.js'in fetch'i REST silmeyi
// yalnız kaydediyordu. Hata olursa 400 döner (uygulama bekleyen deftere alır).
const KIM = `select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', false); set role authenticated;`;
const eskiFetch = global.fetch;
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const m = yol.match(/^(siparisler|uretim)\?id=in\.\(([^)]*)\)/);
  if (sec.method === "DELETE" && m) {
    const idler = decodeURIComponent(m[2]).split(",").map((x) => x.replace(/^"|"$/g, ""));
    try {
      psql(`${KIM} delete from public.${m[1]} where id in (${idler.map((i) => `'${i}'`).join(",")});`);
      F.giden.push({ ad: `REST DELETE ${m[1]}`, ok: true });
      return { ok: true, status: 204, json: async () => [], text: async () => "" };
    } catch (e) {
      const h = String(e.stderr || e.message).split("\n").filter((x) => /ERROR/.test(x)).join(" ");
      F.giden.push({ ad: `REST DELETE ${m[1]}`, ok: false, hata: h });
      return { ok: false, status: 400, json: async () => ({ message: h }), text: async () => h };
    }
  }
  return eskiFetch(url, sec);
};

const kd = (id) => F.jsonSorgu(`select coalesce(karsilanan, 0)::float as karsilanan, miktar::float as miktar, urun_id as urun, renk, beden from public.siparis_kalemleri where id = '${id}'`)[0] || "yok";
const teslim = (s, k, adet, ekran, istek) => F.rpc("fis_kes", F.teslimYuku({ s, kalemId: k, adet, ekran, istek, eski: !!process.env.F0_ERP }));
const sahipsiz = (on) => { const d = F.denetim(on); return { D2a: d.D2a_sahipsiz_hareket_kalem_yok || 0, D2b: d.D2b_sahipsiz_hareket_siparis_yok || 0, D2e: d.D2e_gecmis_bag_kalem_yok || 0 }; };
const temiz = { D2a: 0, D2b: 0, D2e: 0 };
const yaz = async (taban, yeni) => { const r = await F.kaydet("siparisler", taban, yeni); return r.hata ? `RED: ${r.hata.slice(0, 90)}` : r.istekler.join(","); };
const ekranS = (s, kalemler, durum = "Kısmi Teslim") => ({ ...s, durum, kalemler });

(async () => {
  console.log(`F2 başarısızlık testleri · önek ${ON} · istemci ${process.env.F0_ERP ? "F0_ERP" : "bugünkü"} · kurallar ${F.kurallarAcik() ? "açık" : "KAPALI"} · iz ${F.izSutunlari()}/3`);

  // ---- BİRLEŞTİRME (075 bekleyenKalemleriBirlestir: aynı ürün/renk/fiyat bekleyen kalemler tek kaleme; B silinir) ----
  {
    const on = `${ON}-m`, A = `${on}A`, B = `${on}B`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 10, 0), F.kalemObj(B, 10, 0)]));
    teslim(s, A, 3, 0, `${on}i1`); teslim(s, B, 4, 0, `${on}i2`);
    const ekran = ekranS(s, [F.kalemObj(A, 10, 3), F.kalemObj(B, 10, 4)]);
    const once = { A: kd(A), B: kd(B) };
    const y = await yaz([ekran], [{ ...ekran, kalemler: bekleyenKalemleriBirlestir(ekran.kalemler) }]);
    const sonra = { A: kd(A), B: kd(B), yazma: y, ...sahipsiz(on) };
    const topK = [sonra.A, sonra.B].filter((x) => x !== "yok").reduce((t, x) => t + x.karsilanan, 0);
    F.kontrol("F2.birlestirme-teslimli", "teslimli iki kalem birleştirilmez: B durur, toplam karşılanan 7, sahipsiz hareket yok", { once, sonra,
      gercek: [sonra.B !== "yok", topK, sonra.D2a], beklenen: [true, 7, 0] });
  }
  {
    const on = `${ON}-n`, A = `${on}A`, B = `${on}B`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 10, 0), F.kalemObj(B, 10, 0)]));
    const ekran = ekranS(s, [F.kalemObj(A, 10, 0), F.kalemObj(B, 10, 0)], "Bekliyor");
    const birlesik = bekleyenKalemleriBirlestir(ekran.kalemler);
    const y = await yaz([ekran], [{ ...ekran, kalemler: birlesik }]);
    const sonra = { A: kd(A), B: kd(B), yazma: y };
    F.kontrol("F2.birlestirme-teslimsiz", "KORUNACAK: teslimsiz iki kalem birleşir (tek kalem, miktar 20)", { sonra,
      gercek: [[sonra.A, sonra.B].filter((x) => x !== "yok").length, [sonra.A, sonra.B].filter((x) => x !== "yok").reduce((t, x) => t + x.miktar, 0)], beklenen: [1, 20] });
  }
  {   // teslimli + teslimsiz: istemci ikisini birleştirir (teslimsiz B, teslimli A'ya katılır ya da tersi)
    const on = `${ON}-o`, A = `${on}A`, B = `${on}B`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 10, 0), F.kalemObj(B, 10, 0)]));
    teslim(s, B, 2, 0, `${on}i1`);
    const ekran = ekranS(s, [F.kalemObj(A, 10, 0), F.kalemObj(B, 10, 2)]);
    const y = await yaz([ekran], [{ ...ekran, kalemler: bekleyenKalemleriBirlestir(ekran.kalemler) }]);
    const sonra = { A: kd(A), B: kd(B), yazma: y, ...sahipsiz(on) };
    F.kontrol("F2.birlestirme-karisik", "teslimli kalem (B) birleştirmede silinmez; sahipsiz hareket yok", { sonra,
      gercek: [sonra.B !== "yok", sonra.D2a], beklenen: [true, 0] });
  }

  // ---- SİLME ----
  {
    const on = `${ON}-d`, A = `${on}A`, C = `${on}C`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0), F.kalemObj(C, 10, 0, { renk: "Taba" })]));
    teslim(s, A, 5, 0, `${on}i1`);
    const ekran = ekranS(s, [F.kalemObj(A, 20, 5), F.kalemObj(C, 10, 0, { renk: "Taba" })]);
    const y = await yaz([ekran], [{ ...ekran, kalemler: [ekran.kalemler[1]] }]);
    const sonra = { A: kd(A), yazma: y, ...sahipsiz(on) };
    F.kontrol("F2.sil-teslimli", "teslimli kalem silinemez (A durur 5 / 5), sahipsiz hareket yok", { sonra, gercek: [sonra.A !== "yok", sonra.D2a], beklenen: [true, 0] });
    const e2 = ekranS(s, (sonra.A !== "yok" ? [F.kalemObj(A, 20, 5)] : []).concat([F.kalemObj(C, 10, 0, { renk: "Taba" })]));
    const y2 = await yaz([e2], [{ ...e2, kalemler: e2.kalemler.filter((k) => k.id !== C) }]);
    F.kontrol("F2.sil-teslimsiz", "KORUNACAK: teslimsiz kalem silinir", { sonra: { C: kd(C), yazma: y2 }, gercek: kd(C), beklenen: "yok" });
  }
  {   // teslimi yapılıp İPTAL edilmiş (yalnız iptal hareketi) kalem — karar maddesi: gözlem
    const on = `${ON}-x`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0), F.kalemObj(`${on}B`, 5, 0, { renk: "Taba" })]));
    const fis = teslim(s, A, 2, 0, `${on}i1`).sonuc.fisNo;
    F.rpc("fis_iptal", F.iptalYuku({ s, kalemId: A, fisNo: fis, adet: 2, ekran: 2, eski: !!process.env.F0_ERP }));
    const ekran = ekranS(s, [F.kalemObj(A, 20, 0), F.kalemObj(`${on}B`, 5, 0, { renk: "Taba" })], "Bekliyor");
    const y = await yaz([ekran], [{ ...ekran, kalemler: [ekran.kalemler[1]] }]);
    const iptalSatir = Number(psql(`select count(*) from public.stk_hareket where kalem_id = '${A}';`));
    F.gozlem("F2.sil-yalniz-iptal-hareketli", "yalnız iptal edilmiş hareketi olan kalem silinince", { A: kd(A), yazma: y, kalemiGosterenIptalSatiri: iptalSatir, karar: "§ 9 karar 1" });
  }
  {   // iptal edilmiş sipariş (F1.1: teslim GEÇMİŞ bağda) uygulamadan silinir: 087 siparisKapat zatenIptal → SİL → REST DELETE → cascade
    const on = `${ON}-g`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    const fis = teslim(s, A, 3, 0, `${on}i1`).sonuc.fisNo;
    const ip = await F.siparisIptal(s, F.yerelOku(s));
    const iptalS = { ...ip.yerel.siparisler[0], durum: "İptal" };
    const r = await F.kaydet("siparisler", [iptalS], []);
    const sonra = { siparis: F.jsonSorgu(`select durum from public.siparisler where id = '${s.id}'`)[0] || "yok", A: kd(A), yazma: r.hata ? `RED: ${r.hata.slice(0, 90)}` : r.istekler.join(","),
      gecmisBag: psql(`select gecmis_kalem_id from public.stk_hareket where fis_id = '${fis}';`), ...sahipsiz(on) };
    F.kontrol("F2.sil-iptal-siparis-gecmis-bag", "teslim geçmişi olan İPTAL siparişi silinemez (kalem durur), geçmiş bağ sahipsiz kalmaz (D2e 0)", { sonra,
      gercek: [sonra.A !== "yok", sonra.D2e], beklenen: [true, 0] });
  }
  {   // bayat cihaz: teslimi görmeden siparişi "fiş girişi yok" sanıp siler (087 sil yolu) — kalemler cascade ile gider
    const on = `${ON}-b`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    teslim(s, A, 4, 0, `${on}i1`);
    const bayat = { ...s, durum: "Bekliyor", kalemler: [F.kalemObj(A, 20, 0)] };
    const r = await F.kaydet("siparisler", [bayat], []);
    const sonra = { siparis: F.jsonSorgu(`select durum from public.siparisler where id = '${s.id}'`)[0] || "yok", A: kd(A), yazma: r.hata ? `RED: ${r.hata.slice(0, 90)}` : r.istekler.join(","), ...sahipsiz(on) };
    F.kontrol("F2.sil-bayat-siparis", "teslimli sipariş bayat cihazdan silinemez; sahipsiz hareket yok", { sonra,
      gercek: [sonra.siparis !== "yok", sonra.A !== "yok", sonra.D2a, sonra.D2b], beklenen: [true, true, 0, 0] });
  }
  {   // teslimsiz sipariş silinir (KORUNACAK)
    const on = `${ON}-t`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    const r = await F.kaydet("siparisler", [{ ...s, kalemler: [F.kalemObj(A, 20, 0)] }], []);
    F.kontrol("F2.sil-teslimsiz-siparis", "KORUNACAK: teslimsiz sipariş silinir (kalemleriyle)", { sonra: { yazma: r.hata || r.istekler.join(","), A: kd(A) },
      gercek: [F.jsonSorgu(`select 1 from public.siparisler where id = '${s.id}'`).length, kd(A)], beklenen: [0, "yok"] });
  }

  // ---- KİMLİK (ürün / renk / beden) ----
  for (const [alan, deger, ek] of [["renk", "Taba", { renk: "Taba" }], ["beden", "42", { beden: "42" }], ["urun", "u-baska", { urunId: "u-baska", urunAd: "Başka" }]]) {
    const on = `${ON}-k${alan.slice(0, 1)}`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    teslim(s, A, 5, 0, `${on}i1`);
    const ekran = ekranS(s, [F.kalemObj(A, 20, 5)]);
    const y = await yaz([ekran], [{ ...ekran, kalemler: [F.kalemObj(A, 20, 5, ek)] }]);
    const sonra = { A: kd(A), yazma: y };
    const deg = alan === "urun" ? sonra.A.urun : sonra.A[alan];
    F.kontrol(`F2.kimlik-${alan}`, `teslimli kalemin ${{ renk: "rengi", beden: "bedeni", urun: "ürünü" }[alan]} değişmez`, { sonra, gercek: deg === deger, beklenen: false });
  }
  {
    const on = `${ON}-kg`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    teslim(s, A, 5, 0, `${on}i1`);
    const ip = await F.siparisIptal(s, F.yerelOku(s));
    const iptalS = { ...ip.yerel.siparisler[0], durum: "İptal" };
    const y = await yaz([iptalS], [{ ...iptalS, kalemler: [{ ...iptalS.kalemler[0], renk: "Taba" }] }]);
    F.kontrol("F2.kimlik-gecmis-bag", "iptal edilmiş siparişin teslimli (geçmiş bağlı) kaleminin rengi değişmez", { sonra: { A: kd(A), yazma: y }, gercek: kd(A).renk, beklenen: "Siyah" });
  }
  {
    const on = `${ON}-ks`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    const ekran = ekranS(s, [F.kalemObj(A, 20, 0)], "Bekliyor");
    const y = await yaz([ekran], [{ ...ekran, kalemler: [F.kalemObj(A, 20, 0, { renk: "Taba", beden: "42" })] }]);
    F.kontrol("F2.kimlik-teslimsiz", "KORUNACAK: teslimsiz kalemin rengi / bedeni değişir", { sonra: { A: kd(A), yazma: y }, gercek: [kd(A).renk, kd(A).beden], beklenen: ["Taba", "42"] });
  }

  // ---- MİKTAR ----
  {
    const on = `${ON}-q`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    teslim(s, A, 5, 0, `${on}i1`);
    const ekran = ekranS(s, [F.kalemObj(A, 20, 5)]);
    const y = await yaz([ekran], [{ ...ekran, kalemler: [F.kalemObj(A, 3, 5)] }]);
    F.kontrol("F2.miktar-teslim-alti", "miktar teslim edilenin (5) altına inmez (20 kalır)", { sonra: { A: kd(A), yazma: y }, gercek: kd(A).miktar, beklenen: 20 });
    const e2 = ekranS(s, [F.kalemObj(A, kd(A).miktar, 5)]);
    const y2 = await yaz([e2], [{ ...e2, kalemler: [F.kalemObj(A, 5, 5)] }]);
    F.kontrol("F2.miktar-teslime-esit", "KORUNACAK: miktar teslim edilene (5) eşit olabilir", { sonra: { A: kd(A), yazma: y2 }, gercek: kd(A).miktar, beklenen: 5 });
  }
  {
    const on = `${ON}-qg`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    teslim(s, A, 5, 0, `${on}i1`);
    const ip = await F.siparisIptal(s, F.yerelOku(s));
    const iptalS = { ...ip.yerel.siparisler[0], durum: "İptal" };
    const y = await yaz([iptalS], [{ ...iptalS, kalemler: [{ ...iptalS.kalemler[0], miktar: 2 }] }]);
    F.kontrol("F2.miktar-gecmis-bag", "geçmiş bağlı teslim de sayılır: miktar 5'in altına inmez", { sonra: { A: kd(A), yazma: y }, gercek: kd(A).miktar, beklenen: 20 });
  }
  {   // fazla teslimli kalem (20 sipariş, 25 teslim — fazla işaretli): miktar DEĞİŞMEDEN başka alan düzenlenebilmeli
    const on = `${ON}-qf`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    // F3: geçmişte fazla teslimi olan kalemin fiyatını sınamak için izinli fixture kurulur.
    const fazla = F.rpc("fis_kes", { ...F.teslimYuku({ s, kalemId: A, adet: 25, ekran: 0, istek: `${on}i1` }),
      fazlaTeslimOnayi: { onay: true, gerekce: "F2 mevcut fazla teslimli kalem düzenleme fixture" } });
    if (!fazla.ok) throw new Error(`F2 fazla fixture kurulamadı: ${fazla.hata}`);
    const ekran = ekranS(s, [F.kalemObj(A, 20, kd(A).karsilanan)], "Tamamlandı");
    const y = await yaz([ekran], [{ ...ekran, kalemler: [F.kalemObj(A, 20, kd(A).karsilanan, { birimFiyat: 130 })] }]);
    const fiyat = Number(psql(`select fiyat from public.siparis_kalemleri where id = '${A}';`));
    F.kontrol("F2.fazla-teslimli-duzenleme", "KORUNACAK: fazla teslimli kalemde miktar değişmeden fiyat değişir", { sonra: { A: kd(A), fiyat, yazma: y }, gercek: fiyat, beklenen: 130 });
  }

  // ---- SAHİPSİZ HAREKET OLUŞTURMA (var olmayan kaleme teslim) ----
  {
    const on = `${ON}-h`, A = `${on}A`;
    const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 20, 0)]));
    const yuk = F.teslimYuku({ s, kalemId: A, adet: 1, ekran: 0, istek: `${on}i1` });
    yuk.stok.satirlar = yuk.stok.satirlar.map((x) => ({ ...x, kalemId: `${on}YOK` }));
    if (yuk.alt && yuk.alt.siparis_kalemleri) delete yuk.alt;
    const r = F.rpc("fis_kes", yuk);
    F.kontrol("F2.var-olmayan-kaleme-teslim", "var olmayan kaleme bağlı hareket yazılamaz", { sonra: { kabul: r.ok, hata: r.hata, ...sahipsiz(on) }, gercek: [r.ok, sahipsiz(on).D2a], beklenen: [false, 0] });
  }

  // ---- ÜRETİM SİLME (F2 kapsamı DIŞI; korunacak davranış + gözlem) ----
  {
    const on = `${ON}-u`;
    psql(`insert into public.uretim (id, siparis_no, urun_id, asama) values ('${on}', 'UR-${on.slice(-5)}', 'u-yeni', 'Planlandı');
          insert into public.uretim_atamalari (id, uretim_id, proses, miktar) values ('${on}-a1', '${on}', 'Kesim', 5);`);
    const r = await F.kaydet("uretim", [{ id: on, siparisNo: `UR-${on.slice(-5)}`, urunId: "u-yeni", asama: "Planlandı", prosesIlerleme: [{ proses: "Kesim", atamalar: [{ id: `${on}-a1`, miktar: 5 }] }] }], []);
    F.kontrol("F2.uretim-sil", "KORUNACAK: üretim kaydı (ataması ile) silinir", { sonra: { yazma: r.hata || r.istekler.join(",") },
      gercek: [F.jsonSorgu(`select 1 from public.uretim where id = '${on}'`).length, F.jsonSorgu(`select 1 from public.uretim_atamalari where uretim_id = '${on}'`).length], beklenen: [0, 0] });
    F.gozlem("F2.uretim-sahipsiz-hareket", "üretimi silinmiş geçerli stok hareketi (uretim_id karşılıksız; F2 kapsamı dışı, bilgi)",
      Number(psql(`select count(*) from public.stk_hareket h where h.uretim_id is not null and not h.iptal and not exists (select 1 from public.uretim u where u.id = h.uretim_id);`)));
  }

  const toplam = F.denetim("");
  F.gozlem("F2.denetim-butun-veri", "bütün veride sahipsiz hareket (D2a / D2b / D2e)", { D2a: toplam.D2a_sahipsiz_hareket_kalem_yok, D2b: toplam.D2b_sahipsiz_hareket_siparis_yok, D2e: toplam.D2e_gecmis_bag_kalem_yok });
  F.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
