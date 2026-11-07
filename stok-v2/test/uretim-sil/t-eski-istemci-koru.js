#!/usr/bin/env node
// ESKİ İSTEMCİ KORUMASI — NORMAL İŞLER ETKİLENMEZ (7 Kasım). Yalnız yerel PostgreSQL; 12 kurulu veritabanı (t-istemci-uretim-sil.sh kurar).
// uretim_eski_silme_koru (stk_fis iptali) ve uretim_planlama_koru (kalem planlaması) yalnız eski istemcinin üretim silme yolunu durdurmalı:
//   GEÇMELİ  duran üretimin ÜRT fişini Fişler ekranından iptal (sebep "Geri alındı") · teslim geri alma (fis_iptal_toplu, "Üretim teslimi
//            geri alındı (…)") · hareket silme ("Hareket silindi") · 1.744.8 uretim_sil (sebep "Üretim … silindi", işlem içi) ·
//            SQL Editor (jwt yok) · üretimi olmayan fiş · silinmiş üretimin planlama bağını temizleme · Satınalma bağını boşaltma ·
//            bağı başka üretime taşıma · planlamaya dokunmayan kalem güncellemesi
//   DURMALI  eski yol: duran üretimin fişi "Üretim … silindi" sebebiyle doğrudan fis_iptal → KR012, fiş ve satırları aynı ·
//            duran üretimin "Üretim" planlama bağını boşaltma → KR012, kalem aynı · işaret işlem dışına sızmaz (aynı oturumda
//            uretim_sil'den SONRA gelen doğrudan iptal yine KR012)
const assert = require("assert/strict");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST), "Yalnız yerel PostgreSQL");
const T = require("../f0/ortak");
const { psql, ON } = T;
let gecen = 0, kalan = 0;
const k = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };
const sql = (s) => psql(s);
const KIM = `select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true); set local role authenticated;`;
const kim = (s) => { try { psql(`\\set VERBOSITY verbose\nbegin; ${KIM} ${s}; commit;`); return "tamam"; }
  catch (e) { return (String(e.stderr || e.message).match(/ERROR:\s+([0-9A-Z]{5})/) || [])[1] || "hata"; } };
const sonuc = (r) => (r.ok ? "tamam" : r.kod || "hata");
const uretim = (u) => sql(`set session_replication_role = replica; insert into public.uretim (id, siparis_no, urun_id, asama, ek) values ('${u}', '${u}-NO', 'u-yeni', 'Üretimde', '{}');`);
function urtFis(u, ek) {
  const istek = `${u}-${ek}`;
  const r = T.rpc("fis_kes", { istek, fis: { aile: "stok", tur: "Üretim", onek: "ÜRT", kaynak: "Üretim", uretimId: u },
    stok: { satirlar: [{ id: `${istek}-h`, urunId: "u-yeni", renk: "Siyah", miktar: -1, kaynak: "Üretim", uretimId: u }] } });
  assert(r.ok, JSON.stringify(r));
  return r.sonuc.fisNo;
}
const fis = (no) => sql(`select (case when f.iptal then 'iptal' else 'gecerli' end) || '/' || (select count(*) from public.stk_hareket h where h.fis_id = f.id and not h.iptal) from public.stk_fis f where f.id = '${no}'`);

(async () => {
  console.log(`t-eski-istemci-koru · ${process.env.STOK_V2_DB} · önek ${ON} · koruma ${sql("select count(*) from pg_trigger where tgname in ('uretim_eski_silme_koru','uretim_planlama_koru')")}/2`);

  console.log("FİŞ İPTALİ — geçmeli");
  { const u = `${ON}-f1`; uretim(u); const no = urtFis(u, "a");
    k("Fişler ekranından iptal (sebep 'Geri alındı')", sonuc(T.rpc("fis_iptal", { no, sebep: "Geri alındı" })), "tamam"); k("…fiş iptal", fis(no), "iptal/0"); }
  { const u = `${ON}-f2`; uretim(u); const no = urtFis(u, "a");
    k("teslim geri alma (fis_iptal_toplu)", sonuc(T.rpc("fis_iptal_toplu", { fisler: [no], sebep: `Üretim teslimi geri alındı (${u}-NO · Kesim)` })), "tamam"); k("…fiş iptal", fis(no), "iptal/0"); }
  { const u = `${ON}-f3`; uretim(u); const no = urtFis(u, "a");
    k("hareket silme (sebep 'Hareket silindi')", sonuc(T.rpc("fis_iptal", { no, sebep: "Hareket silindi" })), "tamam"); }
  { const u = `${ON}-f4`; uretim(u); const a = urtFis(u, "a"), b = urtFis(u, "b");
    k("1.744.8 uretim_sil (iki fiş, sebep 'Üretim … silindi')", sonuc(T.rpc("uretim_sil", { id: u, sebep: `Üretim ${u}-NO silindi` })), "tamam");
    k("…iki fiş iptal, üretim yok", [fis(a), fis(b), sql(`select count(*) from public.uretim where id = '${u}'`)], ["iptal/0", "iptal/0", "0"]); }
  { const u = `${ON}-f5`; uretim(u); const no = urtFis(u, "a");
    k("SQL Editor (jwt yok), eski sebep", (() => { try { sql(`select public.fis_iptal('{"no":"${no}","sebep":"Üretim ${u}-NO silindi"}'::jsonb)`); return "tamam"; } catch (e) { return "hata"; } })(), "tamam"); }
  { const r = T.rpc("fis_kes", { istek: `${ON}-uretimsiz`, fis: { aile: "stok", tur: "Sayım", onek: "SAY", kaynak: "Sayım" },
      stok: { satirlar: [{ id: `${ON}-uretimsiz-h`, urunId: "u-yeni", renk: "Siyah", miktar: 1, kaynak: "Sayım" }] } });
    assert(r.ok, JSON.stringify(r));
    k("üretimi olmayan fiş, sebep 'Üretim X silindi'", sonuc(T.rpc("fis_iptal", { no: r.sonuc.fisNo, sebep: `Üretim ${ON}-yok silindi` })), "tamam"); }

  console.log("FİŞ İPTALİ — durmalı (eski istemcinin üretim silme yolu)");
  { const u = `${ON}-d1`; uretim(u); const no = urtFis(u, "a");
    k("duran üretim, 'Üretim … silindi', doğrudan fis_iptal", sonuc(T.rpc("fis_iptal", { no, sebep: `Üretim ${u}-NO silindi`, istemci: { surum: "1.744.8" } })), "KR012");
    k("…fiş ve satırı aynı", fis(no), "gecerli/1"); }
  { const u = `${ON}-d2`, u2 = `${ON}-d2b`; uretim(u); uretim(u2); urtFis(u, "a"); const no2 = urtFis(u2, "a");
    // aynı İŞLEMDE önce uretim_sil (işaret u'ya), sonra başka üretimin fişine eski yol → işaret o üretimi kapsamaz
    const kod = kim(`select public.uretim_sil('{"id":"${u}","sebep":"Üretim ${u}-NO silindi"}'::jsonb); select public.fis_iptal('{"no":"${no2}","sebep":"Üretim ${u2}-NO silindi"}'::jsonb)`);
    k("işaret yalnız kendi üretimini kapsar (aynı işlem, başka üretim)", kod, "KR012");
    k("…işlem bütünüyle geri alındı (u duruyor, u2 fişi geçerli)", [sql(`select count(*) from public.uretim where id = '${u}'`), fis(no2)], ["1", "gecerli/1"]);
    // ayrı işlem: önceki işlemin işareti sızmaz
    k("işaret işlem dışına sızmaz (sonraki işlem)", sonuc(T.rpc("fis_iptal", { no: no2, sebep: `Üretim ${u2}-NO silindi` })), "KR012"); }

  console.log("PLANLAMA — geçmeli / durmalı");
  const kalemKur = (id, planlama) => { const s = T.siparisKur(T.sipObj(id, [T.kalemObj(`${id}-k`, 10, 0)]));
    sql(`update public.siparis_kalemleri set planlama = ${planlama ? `'${JSON.stringify(planlama)}'::jsonb` : "null"} where id = '${id}-k'`); return s; };
  const planlama = (id) => sql(`select coalesce(planlama::text, 'null') from public.siparis_kalemleri where id = '${id}-k'`);
  // uygulamanın yolu: alt_yaz (giriş yapmış kullanıcı kalemi doğrudan UPDATE edemez — sıkılaştırma)
  const kalemYaz = (id, deger, alan = "planlama") => {
    const satir = JSON.parse(sql(`select to_jsonb(k) - 'ek' from public.siparis_kalemleri k where id = '${id}-k'`));
    satir[alan] = deger;
    return sonuc(T.rpc("alt_yaz", { siparis_kalemleri: { satirlar: [satir] } }));
  };
  { const id = `${ON}-p1`, u = `${ON}-p1u`; uretim(u); kalemKur(id, { tip: "Üretim", referansNo: `${u}-NO` });
    k("duran üretimin bağını boşalt", kalemYaz(id, null), "KR012"); k("…kalem aynı", JSON.parse(planlama(id)).referansNo, `${u}-NO`);
    k("bağı başka (duran) üretime taşı", kalemYaz(id, { tip: "Üretim", referansNo: `${ON}-baska-NO` }), "tamam");
    k("planlamaya dokunmayan kalem güncellemesi", kalemYaz(id, 11, "miktar"), "tamam"); }
  { const id = `${ON}-p2`; kalemKur(id, { tip: "Üretim", referansNo: `${ON}-silinmis-NO` });
    k("silinmiş üretimin bağını temizle (referansGecersiz)", kalemYaz(id, null), "tamam"); }
  { const id = `${ON}-p3`; kalemKur(id, { tip: "Satınalma", referansNo: `${ON}-ALS` });
    k("Satınalma bağını boşalt (alış iptali)", kalemYaz(id, null), "tamam"); }
  { const id = `${ON}-p4`, u = `${ON}-p4u`; uretim(u); kalemKur(id, { tip: "Üretim", referansNo: `${u}-NO` });
    k("üretim uretim_sil ile silindikten sonra bağ boşalır (1.744.8 sırası)", [sonuc(T.rpc("uretim_sil", { id: u, sebep: `Üretim ${u}-NO silindi` })), kalemYaz(id, null)], ["tamam", "tamam"]); }
  { const id = `${ON}-p5`, u = `${ON}-p5u`; uretim(u); kalemKur(id, { tip: "Üretim", referansNo: `${u}-NO` });
    k("SQL Editor (jwt yok) bağı boşaltabilir", (() => { try { sql(`update public.siparis_kalemleri set planlama = null where id = '${id}-k'`); return "tamam"; } catch (e) { return "hata"; } })(), "tamam"); }

  console.log(`── t-eski-istemci-koru.js: ${gecen} geçti, ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
