#!/usr/bin/env node
// ÜRETİM SİLME — YARIM İŞLEM YOK (4 Kasım). Yalnız yerel PostgreSQL (kos.sh veritabanı); Supabase'e DOKUNMAZ.
// Hata (kural provası, senaryo-sapma-silinen-uretim): fiş defteri kuruluyken üretim silinince, fis_kes ile kesilmemiş (eski)
// hareketlerin iptali köprüde ağa çıkmadan durduruluyor; 040 kalıcı ret satırı "inceleme"ye ayırıp kalanı gönderiyor, adım başarılı
// sayılıyor ve üretim kaydı siliniyor → sunucuda üretim YOK, hareketleri GEÇERLİ (stok / cari etkisi geri alınmadı).
// UYGULAMANIN KENDİ KODU (test/erp.cjs, 076 useUretimSil) gerçek veritabanına karşı çalışır; kahin HEDEF davranıştır:
//   ESKİ FİŞ    hareketler istek'siz (eski) fişte → işlem TAMAMI: fiş(ler) iptal + üretim silinir, ya da HİÇBİRİ.
//   ESKİ FİŞ (sunucu işlemi yok)  canlının bugünkü hâli (uretim_sil kurulu değil) → hiçbir kayıt değişmez, ekran da.
//   FİŞSİZ      üretimin fişsiz eski cari hareketi var → reddedilir, hiçbir kayıt değişmez (sunucuda da ekranda da).
//   SUNUCU FİŞİ ÜRT fişi fis_kes ile kesilmiş → fiş iptal + üretim silinir (tutarlı).
// Sunucu güvencesi (istemcinin ön kontrolünden bağımsız):
//   S1 doğrudan silme (eski istemci / REST) geçerli hareketi olan üretimi silemez.
//   S2 yarış: uretim_sil ∥ aynı üretime yeni fiş — hangi sıra olursa olsun silinmiş üretime geçerli hareket kalmaz.
//   S3 eski fiş başka kayıt taşıyorsa reddedilir, aynı üretimin sunucu fişi de iptal EDİLMEZ (hepsi ya da hiçbiri).
//   S4 son adımda hata (üretim silinemedi) → fiş iptalleri de geri alınır.
//   S5 ekranın bilmediği (başka cihazın yazdığı) geçerli hareket varsa sessizce iptal edilmez — reddedilir.
// ÇÖPTEN GERİ YÜKLEME (077): hareketli eski çöp kaydı — eski fişli ürün / fişsiz cari — geri yüklenmez; kart, hareket ve çöp
//   kaydı sunucuda da ekranda da aynı kalır (önceden kart gelip hareketleri gelmeyebiliyordu).
// Her durumda: üretim var mı · geçerli stok / cari satırı · fiş iptal mi · ekrandaki üretim / stok / cari aynı ölçülür.
const assert = require("assert/strict");
const path = require("path");
const { spawn } = require("child_process");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST), "Yalnız yerel PostgreSQL");
const T = require("../f0/ortak");
const { psql, E, ON } = T;
const ERP = process.env.F0_ERP || path.join(__dirname, "../../../test/erp.cjs");   // F0_ERP: başka istemci derlemesi (önce / sonra)
const React = require(require.resolve("react", { paths: [path.dirname(ERP)] }));
const { renderToString } = require(require.resolve("react-dom/server", { paths: [path.dirname(ERP)] }));
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";
const KIM = `select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true); set local role authenticated;`;

let hata = 0;
const k = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (!ok) hata += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };
const sql = (s) => psql(s);
const kim = (s) => { try { psql(`\\set VERBOSITY verbose\nbegin; ${KIM} ${s}; commit;`); return "tamam"; }
  catch (e) { return (String(e.stderr || e.message).match(/ERROR:\s+([0-9A-Z]{5})/) || [])[1] || "hata"; } };
const varyant = sql("select varyant_id from public.stk_hareket where urun_id = 'u-yeni' order by id limit 1");
const sunucuIslemiVar = () => sql("select count(*) from pg_proc where proname = 'uretim_sil'") !== "0";

// ---- sunucu durumu ----------------------------------------------------------------------------------------------------------
const durum = (u, fisler) => ({
  uretim: sql(`select count(*) from public.uretim where id = '${u}'`) === "1" ? "var" : "yok",
  stok: Number(sql(`select count(*) from public.stk_hareket where uretim_id = '${u}' and not iptal`)),
  cari: Number(sql(`select count(*) from public.car_hareket where uretim_id = '${u}' and not iptal`)),
  fisIptal: (fisler || []).map((f) => sql(`select iptal from public.stk_fis where id = '${f}'`)).join(""),
});

// ---- fikstür: eski (istek'siz) fiş ve fişsiz cari — yalnız test veritabanında, tetikleyiciler atlanarak --------------------
function eskiKur(u, { fissizCari = false, yabanci = null } = {}) {
  const f = `${u}-EF`;
  sql(`set session_replication_role = replica;
    insert into public.uretim (id, siparis_no, urun_id, asama, ek) values ('${u}', '${u}-NO', 'u-yeni', 'Üretimde', '{}');
    insert into public.stk_fis (id, aile, onek, istek, tur, kaynak, uretim_id) values ('${f}', 'stok', 'ÜRT', null, 'Üretim', 'Üretim', '${u}');
    insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, uretim_id, aciklama)
      values ('${u}-h1', '${f}', '${varyant}', 'u-yeni', -2, 'Üretim', '${u}', 'eski üretim çıkışı');
    insert into public.car_hareket (id, cari_id, tarih, yon, tutar, fis_id, uretim_id, fis_no)
      values ('${u}-c1', 'c-yeni', '2026-10-01', 'Alacak', 40, ${fissizCari ? "null" : `'${f}'`}, '${u}', '${f}');
    ${yabanci ? `insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, uretim_id) values ('${u}-yab', '${f}', '${varyant}', 'u-yeni', -1, 'Üretim', '${yabanci}');` : ""}`);
  return f;
}
function sunucuFisiKes(u, istek) {
  sql(`set session_replication_role = replica; insert into public.uretim (id, siparis_no, urun_id, asama, ek) values ('${u}', '${u}-NO', 'u-yeni', 'Üretimde', '{}') on conflict do nothing;`);
  const r = T.rpc("fis_kes", { istek, fis: { aile: "stok", tur: "Üretim", onek: "ÜRT", kaynak: "Üretim", uretimId: u },
    stok: { satirlar: [{ id: `${istek}-h`, urunId: "u-yeni", renk: "Siyah", miktar: -3, kaynak: "Üretim", uretimId: u }] },
    cari: { satirlar: [{ id: `${istek}-c`, cari_id: "c-yeni", tarih: "2026-11-04", yon: "Alacak", tutar: 30, uretim_id: u, ek: { uretimId: u } }] } });
  assert(r.ok, JSON.stringify(r));
  return r.sonuc.fisNo;
}

// ---- uygulama: ekran durumu + 076 useUretimSil ------------------------------------------------------------------------------
function ekran(u, satirlar) {
  const stokH = satirlar.filter((s) => s.tur === "stok").map((s) => ({ id: s.id, tarih: "2026-10-01", renk: "Siyah", beden: "", miktar: s.miktar,
    kaynak: "Üretim", uretimId: u, fisNo: s.fis, ...(s.sunucu ? { uretimFisAdi: `${u}-NO-Kesim` } : {}) }));
  const cariH = satirlar.filter((s) => s.tur === "cari").map((s) => ({ id: s.id, tarih: "2026-10-01", yon: "Alacak", tutar: s.tutar,
    uretimId: u, siparisNo: `${u}-NO`, fisNo: s.fis, ...(s.sunucu ? { uretimFisAdi: `${u}-NO-Kesim` } : {}) }));
  return {
    uretim: [{ id: u, siparisNo: `${u}-NO`, urunId: "u-yeni", urunAd: "Yeni Ürün", stogaEklendiMi: false,
      prosesIlerleme: [{ proses: "Kesim", tamamlandiMi: true, atamalar: [{ id: `${u}-a1`, tamamlandiMi: true, fisNo: satirlar[0].fis }] }] }],
    stok: [{ id: "u-yeni", ad: "Yeni Ürün", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "", miktar: 10 }], hareketler: stokH }],
    cariler: [{ id: "c-yeni", unvan: "Yeni Cari", hareketler: cariH }],
  };
}
async function uygulamadanSil(u, e) {
  E.tabloBaslangicTam("urunler", JSON.parse(JSON.stringify(e.stok)));
  E.tabloBaslangicTam("cariler", JSON.parse(JSON.stringify(e.cariler)));
  E.tabloBaslangicTam("uretim", JSON.parse(JSON.stringify(e.uretim)));
  const kayit = { uretim: e.uretim, stok: e.stok, cariler: e.cariler, toast: [], cop: 0 };
  const set = (a) => (v) => { kayit[a] = typeof v === "function" ? v(kayit[a]) : v; };
  const adimlariYurut = async (adimlar) => { const yapilan = []; for (const a of adimlar) { a.yerelUygula(); const s = await a.yaz();
    if (!s || s.ok === false) return { ok: false, yapilan, kalan: a.ad, hata: (s && s.hata) || "?" }; yapilan.push(a.ad); } return { ok: true, yapilan }; };
  let sil = null;
  function Kanca() { sil = E.useUretimSil({ uretim: e.uretim, siparisler: [], stok: e.stok, cariler: e.cariler, showToast: (m) => kayit.toast.push(m),
    adimlariYurut, setUretim: set("uretim"), setSiparisler: () => {}, setStok: set("stok"), setCariler: set("cariler"),
    copaAt: () => { kayit.cop += 1; }, stokRezervasyonlari: [], setStokRezervasyonlari: () => {}, aktifKullanici: { ad: "Ali" }, fisDefteriniDonustur: null }); return null; }
  renderToString(React.createElement(Kanca));
  const r = await sil(u, true);
  await T.uyu(150);
  return { sonuc: r && r.ok, ekranUretim: kayit.uretim.some((x) => x.id === u) ? "var" : "yok",
    ekranStok: kayit.stok[0].hareketler.filter((h) => h.uretimId === u).length, ekranCari: kayit.cariler[0].hareketler.filter((h) => h.uretimId === u).length,
    cop: kayit.cop, mesaj: (kayit.toast.slice(-1)[0] || "").slice(0, 140) };
}

// ---- ağ: uygulamanın REST yazmaları (üretim tablosu) gerçek veritabanına; uretim_sil yokmuş gibi davranma anahtarı ------------
const asilFetch = global.fetch;
let uretimSilYokSay = false;
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  if (uretimSilYokSay && /^rpc\/uretim_sil/.test(yol)) {
    const g = JSON.stringify({ code: "PGRST202", message: "Could not find the function public.uretim_sil(p) in the schema cache" });
    return { ok: false, status: 404, json: async () => JSON.parse(g), text: async () => g };
  }
  const m = yol.match(/^uretim\?id=in\.\(([^)]*)\)/);
  if (sec.method === "DELETE" && m) {
    const idler = decodeURIComponent(m[1]).split(",").map((x) => x.replace(/^"|"$/g, ""));
    const kod = kim(`delete from public.uretim where id in (${idler.map((i) => `'${i}'`).join(",")})`);
    if (kod === "tamam") return { ok: true, status: 204, json: async () => [], text: async () => "" };
    const g = JSON.stringify({ code: kod, message: `üretim silinemedi (${kod})` });
    return { ok: false, status: 400, json: async () => JSON.parse(g), text: async () => g };
  }
  if (/^uretim\b/.test(yol) && sec.method && sec.method !== "GET") return { ok: true, status: 201, json: async () => [], text: async () => "" };
  return asilFetch(url, sec);
};

function oturum(s, bekleSn = 0) {
  const metin = `\\set VERBOSITY verbose\nbegin; ${KIM} ${s}; ${bekleSn ? `select pg_sleep(${bekleSn});` : ""} commit;`;
  return new Promise((coz) => { const c = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB]); let err = "";
    c.stderr.on("data", (d) => { err += d; }); c.on("close", (x) => coz(x === 0 ? "tamam" : ((err.match(/ERROR:\s+([0-9A-Z]{5})/) || [])[1] || "hata"))); c.stdin.end(metin); });
}

(async () => {
  console.log(`t-uretim-sil · ${DB} · önek ${ON} · sunucu işlemi uretim_sil ${sunucuIslemiVar() ? "VAR" : "YOK"} · kurallar ${sql("select public.fis_kural_aktif()")}`);

  console.log("ESKİ FİŞ (istek'siz fiş: stok + cari)");
  { const u = `${ON}-eski`; const f = eskiKur(u);
    const a = await uygulamadanSil(u, ekran(u, [{ tur: "stok", id: `${u}-h1`, miktar: -2, fis: f }, { tur: "cari", id: `${u}-c1`, tutar: 40, fis: f }]));
    const d = durum(u, [f]);
    k("ESKI.yarim-islem-yok (üretim yok ⇒ satır yok)", d.uretim === "yok" ? d.stok + d.cari : 0, 0);
    k("ESKI.tamami-yapildi", [a.sonuc, d.uretim, d.stok, d.cari, d.fisIptal], [true, "yok", 0, 0, "t"]);
    k("ESKI.ekran-sunucuyla-ayni", [a.ekranUretim, a.ekranStok, a.ekranCari], [d.uretim, d.stok, d.cari]); }

  console.log("ESKİ FİŞ — sunucu işlemi kurulu değil (canlının bugünkü hâli)");
  { const u = `${ON}-eski0`; const f = eskiKur(u); uretimSilYokSay = true;
    const a = await uygulamadanSil(u, ekran(u, [{ tur: "stok", id: `${u}-h1`, miktar: -2, fis: f }, { tur: "cari", id: `${u}-c1`, tutar: 40, fis: f }]));
    uretimSilYokSay = false; const d = durum(u, [f]);
    k("ESKI0.hicbir-kayit-degismedi (sunucu)", [d.uretim, d.stok, d.cari, d.fisIptal], ["var", 1, 1, "f"]);
    k("ESKI0.ekran-degismedi", [a.sonuc, a.ekranUretim, a.ekranStok, a.ekranCari, a.cop], [false, "var", 1, 1, 0]); }

  console.log("FİŞSİZ (üretimin fişsiz eski cari hareketi)");
  { const u = `${ON}-fissiz`; const f = eskiKur(u, { fissizCari: true });
    const a = await uygulamadanSil(u, ekran(u, [{ tur: "stok", id: `${u}-h1`, miktar: -2, fis: f }, { tur: "cari", id: `${u}-c1`, tutar: 40, fis: null }]));
    const d = durum(u, [f]);
    k("FISSIZ.hicbir-kayit-degismedi (sunucu)", [d.uretim, d.stok, d.cari, d.fisIptal], ["var", 1, 1, "f"]);
    k("FISSIZ.ekran-degismedi", [a.sonuc, a.ekranUretim, a.ekranStok, a.ekranCari, a.cop], [false, "var", 1, 1, 0]);
    k("FISSIZ.kullaniciya-sebep", /fiş|eski/i.test(a.mesaj), true); }

  console.log("SUNUCU FİŞİ (ÜRT fis_kes ile)");
  { const u = `${ON}-sunucu`; const no = sunucuFisiKes(u, `${u}-i`);
    const a = await uygulamadanSil(u, ekran(u, [{ tur: "stok", id: `${u}-i-h`, miktar: -3, fis: no, sunucu: true }, { tur: "cari", id: `${u}-i-c`, tutar: 30, fis: no, sunucu: true }]));
    const d = durum(u, [no]);
    k("SUNUCU.tamami-yapildi", [a.sonuc, d.uretim, d.stok, d.cari, d.fisIptal], [true, "yok", 0, 0, "t"]);
    k("SUNUCU.ekran-sunucuyla-ayni", [a.ekranUretim, a.ekranStok, a.ekranCari], [d.uretim, d.stok, d.cari]); }

  console.log("S1 — doğrudan silme (eski istemci / REST) geçerli hareketi olan üretimi silemez");
  { const u = `${ON}-s1`; const f = eskiKur(u);
    k("S1.red", kim(`delete from public.uretim where id = '${u}'`), "KR010");
    k("S1.degismedi", durum(u, [f]), { uretim: "var", stok: 1, cari: 1, fisIptal: "f" }); }

  console.log("S2 — yarış: silme ∥ aynı üretime yeni fiş");
  if (!sunucuIslemiVar()) k("S2.uretim_sil", "yok", "var");
  else {
    // (a) önce fiş (açık işlem), sonra silme: silme bekler, yeni fişi de iptal eder
    const u = `${ON}-s2a`; sql(`set session_replication_role = replica; insert into public.uretim (id, siparis_no, urun_id, ek) values ('${u}', '${u}-NO', 'u-yeni', '{}');`);
    const p = { istek: `${u}-i`, fis: { aile: "stok", tur: "Üretim", onek: "ÜRT", kaynak: "Üretim", uretimId: u },
      stok: { satirlar: [{ id: `${u}-i-h`, urunId: "u-yeni", renk: "Siyah", miktar: -1, kaynak: "Üretim", uretimId: u }] } };
    const fisIsi = oturum(`select public.fis_kes($j$${JSON.stringify(p)}$j$::jsonb)`, 2);
    await T.uyu(500);
    const silIsi = oturum(`select public.uretim_sil('{"id":"${u}","sebep":"yarış"}'::jsonb)`);
    const [r1, r2] = await Promise.all([fisIsi, silIsi]);
    const d = durum(u);
    k("S2a.sonuc (fiş ∥ silme)", [r1, r2], ["tamam", "tamam"]);
    k("S2a.silinmis-uretime-gecerli-hareket-yok", [d.uretim, d.stok], ["yok", 0]);
    // (b) önce silme (açık işlem), sonra fiş: fiş bekler, üretim silinmiş → reddedilir
    const u2 = `${ON}-s2b`; sql(`set session_replication_role = replica; insert into public.uretim (id, siparis_no, urun_id, ek) values ('${u2}', '${u2}-NO', 'u-yeni', '{}');`);
    const p2 = JSON.parse(JSON.stringify(p).split(u).join(u2));
    const silIsi2 = oturum(`select public.uretim_sil('{"id":"${u2}","sebep":"yarış"}'::jsonb)`, 2);
    await T.uyu(500);
    const fisIsi2 = oturum(`select public.fis_kes($j$${JSON.stringify(p2)}$j$::jsonb)`);
    const [q1, q2] = await Promise.all([silIsi2, fisIsi2]);
    const d2 = durum(u2);
    k("S2b.sonuc (silme ∥ fiş)", [q1, q2], ["tamam", "KR010"]);
    k("S2b.silinmis-uretime-hareket-yazilmadi", [d2.uretim, d2.stok, Number(sql(`select count(*) from public.stk_hareket where id = '${u2}-i-h'`))], ["yok", 0, 0]);
  }

  console.log("S3 — eski fiş başka kayıt taşıyor: hiçbiri iptal edilmez");
  if (!sunucuIslemiVar()) k("S3.uretim_sil", "yok", "var");
  else { const u = `${ON}-s3`; const f = eskiKur(u, { yabanci: `${ON}-baska` }); const no = sunucuFisiKes(u, `${u}-i`);
    k("S3.red", kim(`select public.uretim_sil('{"id":"${u}"}'::jsonb)`), "KR010");
    k("S3.hicbir-kayit-degismedi", durum(u, [f, no]), { uretim: "var", stok: 2, cari: 2, fisIptal: "ff" }); }

  console.log("S4 — son adımda hata: fiş iptalleri de geri alınır");
  if (!sunucuIslemiVar()) k("S4.uretim_sil", "yok", "var");
  else { const u = `${ON}-s4`; const f = eskiKur(u);
    sql(`create or replace function public.t_uretim_sil_boz() returns trigger language plpgsql as $f$ begin if old.id = '${u}' then raise exception 'test: silme bozuldu'; end if; return old; end $f$;
      drop trigger if exists t_uretim_sil_boz on public.uretim; create trigger t_uretim_sil_boz before delete on public.uretim for each row execute function public.t_uretim_sil_boz();`);
    const kod = kim(`select public.uretim_sil('{"id":"${u}"}'::jsonb)`);
    sql("drop trigger t_uretim_sil_boz on public.uretim; drop function public.t_uretim_sil_boz();");
    k("S4.hata", kod === "tamam" ? "geçti" : "hata", "hata");
    k("S4.hicbir-kayit-degismedi", durum(u, [f]), { uretim: "var", stok: 1, cari: 1, fisIptal: "f" }); }

  console.log("S5 — ekranda görünmeyen geçerli hareket (başka cihaz) sessizce iptal edilmez");
  if (!sunucuIslemiVar()) k("S5.uretim_sil", "yok", "var");
  else { const u = `${ON}-s5`; const no = sunucuFisiKes(u, `${u}-i`);
    k("S5.red", kim(`select public.uretim_sil('{"id":"${u}","stokIdler":[],"cariIdler":[]}'::jsonb)`), "KR010");
    k("S5.hicbir-kayit-degismedi", durum(u, [no]), { uretim: "var", stok: 1, cari: 1, fisIptal: "f" }); }

  console.log("ÇÖPTEN GERİ YÜKLEME — hareketli eski çöp kaydı");
  for (const [ad, tur, hareket] of [
    ["eski-fisli-urun", "urun", (id) => ({ id: `${id}-h1`, tarih: "2026-10-01", renk: "Siyah", beden: "", miktar: 5, kaynak: "Satınalma", fisNo: `${id}-EF` })],
    ["fissiz-cari", "cari", (id) => ({ id: `${id}-c1`, tarih: "2026-10-01", yon: "Borç", tutar: 25 })],
  ]) {
    const id = `${ON}-cop-${ad}`;
    const veri = tur === "urun" ? { id, ad: `Çöp ${ad}`, kategori: "Hammadde", variants: [{ renk: "Siyah", beden: "", miktar: 5 }], hareketler: [hareket(id)] }
      : { id, unvan: `Çöp ${ad}`, tip: "Müşteri", hareketler: [hareket(id)] };
    const copKaydi = { id: `cop-${id}`, tur, baslik: `Çöp ${ad}`, veri, geriAlinabilirMi: true, yanEtkiliMi: false, silinmeTarihi: "2026-10-02T10:00:00.000Z" };
    const kayit = { stok: [], cariler: [], cop: [copKaydi], toast: [] };
    E.tabloBaslangicTam("urunler", []); E.tabloBaslangicTam("cariler", []);
    const set = (a) => (v) => { kayit[a] = typeof v === "function" ? v(kayit[a]) : v; };
    let api = null;
    function Cop() { api = E.useCopKutusu({ cop: kayit.cop, setCop: set("cop"), showToast: (m) => kayit.toast.push(m), aktifKullanici: { ad: "Ali", rol: "Yönetici" },
      stok: kayit.stok, cariler: kayit.cariler, siparisler: [], uretim: [], koliler: [], muhasebe: {},
      setStok: set("stok"), setCariler: set("cariler"), setSiparisler: () => {}, setUretim: () => {}, setKoliler: () => {}, setMuhasebe: () => {} }); return null; }
    renderToString(React.createElement(Cop));
    await api.coptanGeriYukle(copKaydi.id);
    await T.uyu(400);
    const tablo = tur === "urun" ? "urunler" : "cariler";
    const sunucu = { kart: Number(sql(`select count(*) from public.${tablo} where id = '${id}'`)),
      hareket: Number(sql(`select count(*) from public.${tur === "urun" ? "stk_hareket" : "car_hareket"} where id like '${id}-%'`)) };
    const ekr = { kart: (tur === "urun" ? kayit.stok : kayit.cariler).filter((x) => x.id === id).length, cop: kayit.cop.filter((x) => x.id === copKaydi.id).length };
    k(`COP.${ad}.sunucu-degismedi (kart / hareket)`, sunucu, { kart: 0, hareket: 0 });
    k(`COP.${ad}.ekran-degismedi (kart yok, çöpte duruyor)`, ekr, { kart: 0, cop: 1 });
    k(`COP.${ad}.kullaniciya-sebep`, /hareket/i.test(kayit.toast.slice(-1)[0] || ""), true);
  }

  console.log("TUTARLILIK — bütün koşu (üretim, stok, cari birlikte)");
  // Bu koşunun kayıtları (önek ON): silinmiş üretime (iz tablosu) bağlı geçerli hareket yok; fiş ile satırları birlikte değişti
  // (iptal fişte geçerli satır yok, geçerli fişte iptal satır yok) — stok görünümü (stk_stok: fiş VE satır geçerliyse sayar) ve
  // cari ekstresi hareketlerle aynı.
  k("TUT.silinmis-uretime-bagli-gecerli-hareket (stok + cari)", Number(sql(`select (select count(*) from public.stk_hareket h join public.uretim_silinen z on z.id = h.uretim_id
      where h.uretim_id like '${ON}-%' and not h.iptal) + (select count(*) from public.car_hareket c join public.uretim_silinen z on z.id = c.uretim_id
      where c.uretim_id like '${ON}-%' and not c.iptal)`)), 0);
  k("TUT.iptal-fiste-gecerli-satir-yok", Number(sql(`select (select count(*) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where f.iptal and not h.iptal and h.id like '${ON}-%')
      + (select count(*) from public.car_hareket c join public.stk_fis f on f.id = c.fis_id where f.iptal and not c.iptal and c.id like '${ON}-%')`)), 0);
  k("TUT.gecerli-fiste-iptal-satir-yok", Number(sql(`select (select count(*) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where not f.iptal and h.iptal and (h.id like '${ON}-%'))
      + (select count(*) from public.car_hareket c join public.stk_fis f on f.id = c.fis_id where not f.iptal and c.iptal and (c.id like '${ON}-%'))`)), 0);

  console.log(`── t-uretim-sil.js: ${hata ? hata + " kırmızı" : "temiz"} ──`);
  process.exit(hata ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
