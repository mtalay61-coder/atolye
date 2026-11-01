// F0 — VERİ TUTARLILIĞI BAŞARISIZLIK TESTLERİ: ORTAK YARDIMCI (VERI-TUTARLILIGI-F0.md).
// Yerel PostgreSQL (stok-v2/test/kos.sh veritabanı, KURALLAR AÇIK); Supabase'e DOKUNMAZ. Üretim kodu değişmez.
//
// İlke: her test HEDEF davranışı (tasarımdaki değişmezleri) bekler. 1.742.3 bugün bu davranışı göstermediği için testlerin
// çoğu KIRMIZI çıkar — F0'ın amacı tam olarak bu: hatanın gerçekten yeniden üretildiğini kanıtlamak. Hangi kontrolün bugün
// kırmızı / yeşil olması gerektiği `beklenen.txt`te; koşucu (kos.sh) gerçek sonucu onunla karşılaştırır.
//
// İstemci yükleri UYGULAMANIN KENDİ KODUNDAN (test/erp.cjs — `cd test && node derle.js`): 081 siparisTeslimSunucuYuku, fisYaz,
// fisDefterKaydiKur; köprü yazmaları 040 supabaseTabloEsitle → alt_yaz / stk_yaz. ESKİ İSTEMCİ (1.742.1) yükü = aynı yük
// `artis` alanı olmadan: 20834ea..19381fd farkında 081'in yüküne eklenen tek şey `artis` (git diff ile doğrulandı); 1.742.1
// derlemesiyle üretilen yükle karşılaştırma 1 Kasım risk raporunda yapıldı (aynı sonuç: 5 / 10).
//
// Temizlik YOK (kurallar açık: fişler silinmez; sipariş silmek sahipsiz hareket bırakır — denetimi kirletir). Her koşu kendi
// önekiyle (`ON`) çalışır; denetim yalnız o öneki süzer (`set denetim.onek`).
const { execFileSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";
const KIM = `select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', false); set role authenticated;`;
const psql = (sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB], { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 512 * 1024 * 1024 }).trim();
const jsonSorgu = (sql) => JSON.parse(psql(`select coalesce(json_agg(x), '[]'::json) from (${sql}) x;`) || "[]");
const hataMetni = (e) => String((e && (e.stderr || e.message)) || e).split("\n").filter((x) => /ERROR|HATA/.test(x)).join(" | ").slice(0, 240) || String(e).slice(0, 240);

// Tek bağlantıda, giriş yapmış kullanıcı olarak (zaman uyumlu)
function rpc(ad, p) {
  try { return { ok: true, sonuc: JSON.parse(psql(`${KIM} select public.${ad}($j$${JSON.stringify(p)}$j$::jsonb);`).split("\n").pop()) }; }
  catch (e) { return { ok: false, hata: hataMetni(e) }; }
}
// Ayrı bağlantıda (eşzamanlılık): işlem sonunda `bekleSn` uyur (kilit tutulur), sonra commit
function rpcAyri(ad, p, { bekleSn = 0 } = {}) {
  const sql = `begin;
    select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', true);
    set local role authenticated;
    select 'SONUC:' || public.${ad}($j$${JSON.stringify(p)}$j$::jsonb)::text;
    ${bekleSn ? `select pg_sleep(${bekleSn});` : ""}
    commit;`;
  return new Promise((coz) => {
    const c = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB]);
    let out = "", err = "";
    c.stdout.on("data", (d) => { out += d; });
    c.stderr.on("data", (d) => { err += d; });
    c.on("close", (kod) => { const s = (out.match(/SONUC:(.*)/) || [])[1]; coz({ ok: kod === 0 && !!s, sonuc: s ? JSON.parse(s) : null, hata: hataMetni(err) }); });
    c.stdin.end(sql);
  });
}
const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- uygulama kodu (erp.cjs) + köprü yazmalarını yerel PG'ye bağlayan fetch ----------------------------------------------
const bellek = {};
global.window = global.window || { localStorage: { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } }, __supabaseYenidenDenemeMs: [] };
const giden = [];
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const ad = (yol.match(/^rpc\/([a-z_]+)/) || [])[1];
  if (ad) {
    const r = rpc(ad, JSON.parse(sec.body).p);
    giden.push({ ad, ok: r.ok, hata: r.hata });
    return r.ok ? { ok: true, status: 200, json: async () => r.sonuc, text: async () => JSON.stringify(r.sonuc) }
      : { ok: false, status: 400, json: async () => ({ message: r.hata }), text: async () => r.hata };
  }
  // Başlık satırları REST ile gider (038: yalnız kalemler alt_yaz'a). Yerel sınama şeması canlıdan farklı (sipariş sütunları
  // `ek`te) — yalnız `durum` uygulanır. TAKLİT olduğu raporda belirtilir.
  if (/^siparisler\b/.test(yol) && sec.method === "POST" && sec.body) {
    [].concat(JSON.parse(sec.body)).forEach((x) => { if (x && x.id && x.durum) psql(`update public.siparisler set durum = '${String(x.durum).replace(/'/g, "''")}' where id = '${x.id}';`); });
    giden.push({ ad: "REST siparisler (durum)", ok: true });
  } else if (sec.method && sec.method !== "GET") giden.push({ ad: `REST ${sec.method} ${yol.split("?")[0]}`, ok: true });
  return { ok: true, status: 200, json: async () => (sec.method === "PATCH" ? [{ id: "x" }] : []), text: async () => "" };
};
// F0_ERP: başka bir istemci derlemesi (ör. eski-istemci.sh → .eski-istemci/erp.cjs, 1.742.1). Verilmezse bugünkü test/erp.cjs.
const E = require(process.env.F0_ERP || path.join(__dirname, "../../../test/erp.cjs"));
E.stokV2AktifAyarla(true); E.cariV2AktifAyarla(true); E.altV2AktifAyarla(true); E.kasaV2AktifAyarla(true); E.fisDefteriKuruluAyarla(true);
E.stokV2TanimlarAyarla(JSON.parse(psql("select veri from public.tanimlar where id = 'tekil';")));

// Uygulamanın köprüden kaydetmesi: fark tabanı = ekrandaki hâl, ardından yeni hâl (040 supabaseTabloEsitle)
async function kaydet(tablo, taban, yeni, secenek) {
  E.tabloBaslangicTam(tablo, JSON.parse(JSON.stringify(taban)));
  giden.length = 0;
  let hata = null;
  try { await E.supabaseTabloEsitle(tablo, yeni, secenek); } catch (e) { hata = String((e && e.message) || e).slice(0, 240); }
  return { hata, istekler: giden.map((g) => `${g.ad}:${g.ok ? "ok" : "RED"}`) };
}

// ---- veri ---------------------------------------------------------------------------------------------------------------
const K = Date.now().toString(36);
const ON = `f0-${process.env.F0_ETIKET || path.basename(process.argv[1] || "t", ".js")}-${K}`;   // bu koşunun öneki
const kalemObj = (id, miktar, karsilanan, ek = {}) => ({ id, urunId: "u-yeni", urunAd: "Yeni Ürün", renk: "Siyah", beden: null, miktar, karsilanan,
  birimFiyat: 100, paraBirimi: "TRY", birim: "çift", planlama: null, ...ek });
const sipObj = (id, kalemler, ek = {}) => ({ id, siparisNo: `SF0-${id.slice(-8)}`, tip: "Satış", cariId: "c-yeni", durum: "Bekliyor", defterTercihi: "Genel", kalemler, ...ek });
// Kurulum: sipariş + kalemler doğrudan (yalnız başlangıç verisi; sipariş tablolarında fiş kuralı yok)
function siparisKur(s) {
  psql(`insert into public.siparisler (id, siparis_no, tip, cari_id, durum) values ('${s.id}', '${s.siparisNo}', '${s.tip}', '${s.cariId}', '${s.durum}');` +
    s.kalemler.map((k, i) => `insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, karsilanan, fiyat, para_birimi, birim, sira)
      values ('${k.id}', '${s.id}', '${k.urunId}', '${k.urunAd}', '${k.renk}', null, ${k.miktar}, ${k.karsilanan || 0}, ${k.birimFiyat}, 'TRY', 'çift', ${i});`).join("\n"));
  return s;
}
function stokOku() {
  const urunler = jsonSorgu("select id, ad, kategori from public.urunler where id = 'u-yeni'");
  const v = jsonSorgu("select * from public.varyantlar where urun_id = 'u-yeni'");
  const h = jsonSorgu("select * from public.stok_hareketleri where urun_id = 'u-yeni' order by tarih desc, id limit 50");
  return urunler.map((u) => ({ ...u,
    variants: v.map((x) => ({ renk: x.renk, renkId: x.renk_id || null, beden: x.beden, miktar: Number(x.miktar), minStok: 0 })),
    hareketler: h.map((x) => ({ ...(x.ek || {}), id: x.id, renk: x.renk, beden: x.beden, miktar: Number(x.miktar), kaynak: x.kaynak, tarih: x.tarih,
      fisNo: x.fis_no, siparisNo: x.siparis_no, cariId: x.cari_id, siparisId: x.siparis_id, kalemId: x.kalem_id })) }));
}
function carilerOku() {
  const c = jsonSorgu("select id, unvan from public.cariler where id = 'c-yeni'");
  return c.map((x) => ({ ...x, hareketler: [] }));
}
// Uygulamanın teslim yükü (081): `ekran` = cihazın gördüğü karşılanan. `eski: true` → 1.742.1 biçimi (artis yok).
function teslimYuku({ s, kalemId, adet, ekran, istek, eski = false }) {
  const k0 = s.kalemler.find((k) => k.id === kalemId);
  const sip = { ...s, kalemler: s.kalemler.map((k) => (k.id === kalemId ? { ...k, karsilanan: ekran } : k)) };
  const alis = s.tip === "Alış";
  const fisGovdesi2 = {
    fisNo: E.FIS_YER, tip: s.tip, cariId: s.cariId, kaynak: alis ? "Satınalma" : "Satış", stokTarihi: "2026-11-01T10:00:00.000Z", cariTarihi: "2026-11-01",
    zaman: new Date().toISOString(), kayitParaBirimi: null, kurlar: {}, kurZorunlu: false, tutarYuvarla: false, birimFiyatBolerek: true,
    yon: E.hareketYonu(s.tip), kullanici: "Ali", defter: "Genel", odemeSekli: "Nakit", vade: "",
    siparis: { id: s.id, siparisNo: s.siparisNo, rezervasyonSiparisId: null },
    kalemler: [{ urunId: k0.urunId, urunAd: k0.urunAd, renk: k0.renk, beden: k0.beden, birim: "çift", miktar: adet, birimFiyat: k0.birimFiyat, paraBirimi: "TRY",
      kalemId, kalan: k0.miktar - ekran, fazlaGonderim: adet > k0.miktar - ekran, _siparisId: s.id }],
    cariAciklama: (k) => `${s.tip} Siparişi ${s.siparisNo}: ${k.urunAd} · ${k.miktar}`,
  };
  const sonuc = E.fisYaz(stokOku(), carilerOku(), fisGovdesi2);
  const yeniK = Math.min(k0.miktar, ekran + adet);   // 081:251 ile aynı hesap
  const nextSiparisler = [{ ...sip, durum: "Kısmi Teslim", kalemler: sip.kalemler.map((k) => (k.id === kalemId ? { ...k, karsilanan: yeniK } : k)) }];
  const defterKaydi = E.fisDefterKaydiKur(fisGovdesi2, sonuc, { kullanici: "Ali" });
  const yuk = E.siparisTeslimSunucuYuku({ siparis: sip, fisGovdesi2, sonuc, islenenler: fisGovdesi2.kalemler, defterKaydi, oncekiSiparisler: [sip], nextSiparisler,
    etkilenenIdler: new Set([s.id]), yeniSayac: 1, kullaniciAd: "Ali", zaman: new Date().toISOString(), istek }).yuk;
  if (eski && yuk.alt && yuk.alt.siparis_kalemleri) delete yuk.alt.siparis_kalemleri.artis;
  return yuk;
}
// Uygulamanın teslim iptali (100 sunucuFisiniIptalEt): mutlak satır (fisGeriAl sonrası) + (yeni istemcide) değişim
function iptalYuku({ s, kalemId, fisNo, adet, ekran, eski = false }) {
  const sipSonra = { ...s, kalemler: s.kalemler.map((k) => (k.id === kalemId ? { ...k, karsilanan: Math.max(0, ekran - adet) } : k)) };
  return { no: fisNo, sebep: "F0", alt: { siparis_kalemleri: { satirlar: E.fisKesSiparisKalemleri(sipSonra, [kalemId]),
    ...(eski ? {} : { artis: E.fisKesKalemArtisi([{ id: kalemId, miktar: -adet }]) }) } } };
}

// Sunucunun gördüğü
const kalemDb = (id) => JSON.parse(psql(`select coalesce((select json_build_object('var', true, 'miktar', miktar, 'karsilanan', coalesce(karsilanan, 0), 'renk', renk, 'urun', urun_id)
  from public.siparis_kalemleri where id = '${id}'), '{"var": false}'::json);`));
// Teslim edilen (geçerli hareketlerden, sipariş tipine göre işaret) — D1'in sağ tarafı
const teslimDb = (kalemId, tip = "Satış") => {
  const t = Number(psql(`select coalesce(sum(h.miktar), 0) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where h.kalem_id = '${kalemId}' and not h.iptal and not f.iptal;`));
  return Math.max(0, tip === "Alış" ? t : -t);
};
const sipDb = (id) => JSON.parse(psql(`select coalesce((select json_build_object('durum', durum) from public.siparisler where id = '${id}'), '{}'::json);`));
const fisDb = (no) => JSON.parse(psql(`select coalesce((select json_build_object('gecerli', not f.iptal, 'gecerliSatir', (select count(*) from public.stk_hareket h where h.fis_id = f.id and not h.iptal),
  'bagliSatir', (select count(*) from public.stk_hareket h where h.fis_id = f.id and not h.iptal and h.kalem_id is not null)) from public.stk_fis f where f.id = '${no}'), '{}'::json);`));
// Denetim (f0/denetim.sql) bu koşunun önekiyle: { kontrol: sayi }
function denetim(onek = ON) {
  const sql = fs.readFileSync(path.join(__dirname, "denetim.sql"), "utf8");
  const satirlar = psql(`set denetim.onek = '${onek}';\n${sql}`).split("\n").filter(Boolean);
  const d = {};
  satirlar.forEach((s) => { const [kontrol, , sayi] = s.split("|"); d[kontrol] = Number(sayi); });
  return d;
}
const kurallarAcik = () => psql("select public.fis_kural_aktif();") === "t";
function kurallariAyarla(acik) { psql(acik ? "select public.fis_kural_ac();" : "select public.fis_kural_kapat();"); }

// ---- sonuç ----------------------------------------------------------------------------------------------------------------
const sonuclar = [];
// `kimlik`: beklenen.txt'teki anahtar. `once` / `sonra`: raporda gösterilecek veritabanı değerleri.
function kontrol(kimlik, ad, { once, sonra, gercek, beklenen }) {
  const ok = JSON.stringify(gercek) === JSON.stringify(beklenen);
  sonuclar.push({ kimlik, ok });
  console.log(`  ${ok ? "✓" : "✗"} [${kimlik}] ${ad}`);
  if (once !== undefined) console.log(`      önce:     ${JSON.stringify(once)}`);
  if (sonra !== undefined) console.log(`      sonra:    ${JSON.stringify(sonra)}`);
  if (!ok) console.log(`      beklenen: ${JSON.stringify(beklenen)}\n      çıkan:    ${JSON.stringify(gercek)}`);
  return ok;
}
function gozlem(kimlik, ad, deger) { console.log(`  • [${kimlik}] (gözlem) ${ad}: ${JSON.stringify(deger)}`); }
function bitir() {
  const k = sonuclar.filter((x) => !x.ok).length;
  console.log(`── ${path.basename(process.argv[1])}: ${sonuclar.length - k} yeşil, ${k} kırmızı ──`);
  process.exit(0);   // kırmızı BEKLENEN olabilir; karar koşucuda (beklenen.txt)
}

module.exports = { psql, jsonSorgu, rpc, rpcAyri, uyu, E, kaydet, giden, K, ON, kalemObj, sipObj, siparisKur, teslimYuku, iptalYuku,
  kalemDb, teslimDb, sipDb, fisDb, denetim, kurallarAcik, kurallariAyarla, kontrol, gozlem, bitir };
