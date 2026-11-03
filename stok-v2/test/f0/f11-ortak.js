// F1.1 — SİPARİŞ İPTALİNDE TESLİM BAĞININ İZİ: ortak yardımcı (F1-1-BAG-IZI-TASARIM.md).
// ortak.js'in üstüne: uygulamanın KENDİ sipariş iptali ve fiş iptali akışları (matris incelemesindeki yolun aynısı), F1.1
// sütunlarını (varsa) okuyan durum fotoğrafı, ayrı oturumlar (kilit tutucu, yoklama) ve kilitlenme sayımı.
// İstemci: ortak.js'in yüklediği derleme (F0_ERP verilirse eski istemci — t-f11-eski.js). Supabase'e DOKUNMAZ.
const { spawn } = require("child_process");
const T = require("./ortak.js");
const { E, psql, jsonSorgu } = T;
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";

// F1.1 sütunları kurulu mu (1.743.0'da yok → testler "sütun yok" ile KIRMIZI)
const izSutunlari = () => Number(psql(`select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'stk_hareket'
  and column_name in ('gecmis_siparis_id', 'gecmis_kalem_id', 'bag_cozum_zamani');`));
const izVar = () => izSutunlari() === 3;

// Ayrı oturum (postgres; kilit tutucu ya da yoklama). Sonuç: { ok, hata, sure_ms }
const oturum = (sql) => new Promise((coz) => {
  const bas = Date.now();
  const c = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB]);
  let err = "", out = "";
  c.stdout.on("data", (d) => { out += d; });
  c.stderr.on("data", (d) => { err += d; });
  c.on("close", (kod) => coz({ ok: kod === 0, cikti: out.trim(), hata: err.split("\n").filter((x) => /ERROR|HATA/.test(x)).join(" | ").slice(0, 200), sure_ms: Date.now() - bas }));
  c.stdin.end(sql);
});
// rpcAyri + süre
async function rpcSureli(ad, p) { const bas = Date.now(); const r = await T.rpcAyri(ad, p); return { ...r, sure_ms: Date.now() - bas }; }
const kilitlenmeMi = (r) => !!(r && !r.ok && /deadlock/i.test(r.hata || ""));
const kisa = (r) => (r.ok ? "ok" : (kilitlenmeMi(r) ? "KİLİTLENME" : (r.hata || "hata").slice(0, 60)));

// Cihazın yerel verisi (uygulamanın okuduğu görünümlerden; cari hareketleri dahil — fisGeriAl bunlara bakar)
function stokOku() {
  const u = jsonSorgu("select id, ad, kategori from public.urunler where id = 'u-yeni'")[0];
  const v = jsonSorgu("select * from public.varyantlar where urun_id = 'u-yeni'");
  const h = jsonSorgu("select * from public.stok_hareketleri where urun_id = 'u-yeni' order by tarih desc, id");
  return [{ ...u, variants: v.map((x) => ({ renk: x.renk, renkId: x.renk_id || null, beden: x.beden, miktar: Number(x.miktar), minStok: 0 })),
    hareketler: h.map((x) => ({ ...(x.ek || {}), id: x.id, renk: x.renk, beden: x.beden, miktar: Number(x.miktar), kaynak: x.kaynak, tarih: x.tarih,
      fisNo: x.fis_no, siparisNo: x.siparis_no, cariId: x.cari_id, siparisId: x.siparis_id, kalemId: x.kalem_id })) }];
}
function carilerOku() {
  const c = jsonSorgu("select id, unvan from public.cariler where id = 'c-yeni'");
  const h = jsonSorgu("select * from public.cari_hareketleri where cari_id = 'c-yeni'");
  return c.map((x) => ({ ...x, hareketler: h.map((y) => { const { cari_id, ...k } = E.kayitaCevir(y); return E.ekiKokeAc(k); }) }));
}
const yerelOku = (s) => ({ stok: stokOku(), cariler: carilerOku(), siparisler: [{ ...s, ...jsonSorgu(`select durum from public.siparisler where id = '${s.id}'`)[0],
  kalemler: s.kalemler.map((k) => ({ ...k, karsilanan: Number(psql(`select coalesce(karsilanan, 0) from public.siparis_kalemleri where id = '${k.id}';`)) })) }] });

// Uygulamanın fiş iptali (100 sunucuFisiniIptalEt): fisGeriAl cihazın YEREL verisiyle → alt satırları (+ yeni istemcide artis)
function fisIptalYuku(fisNo, yerel, sebep = "F1.1") {
  const idler = new Set();
  (yerel.stok || []).forEach((u) => (u.hareketler || []).forEach((h) => { if (h.fisNo === fisNo) idler.add(h.id); }));
  (yerel.cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => { if (h.fisNo === fisNo) idler.add(h.id); }));
  const sonuc = E.fisGeriAl({ stok: yerel.stok, cariler: yerel.cariler, siparisler: yerel.siparisler, uretim: [], muhasebe: { kasalar: [], bankalar: [], cekler: [] }, koliler: [], faturalar: [] },
    { hareketIdler: [...idler], kullanici: "Ali" });
  const etk = E.fisKesEtkilenen(yerel.siparisler, sonuc.siparisler, [...(sonuc.etkilenenSiparisler || [])]);
  const satirlar = etk.yeniler.flatMap((x) => E.fisKesSiparisKalemleri(x, (x.kalemler || []).map((k) => k.id)));
  const artis = typeof E.fisKesKalemArtisi === "function"
    ? E.fisKesKalemArtisi(Object.entries(sonuc.kalemDusumu || {}).map(([a, d]) => ({ id: a.split("|")[1], miktar: -d }))) : null;
  const alt = satirlar.length ? { siparis_kalemleri: { satirlar, ...(artis ? { artis } : {}) } } : null;
  return { yuk: { no: fisNo, sebep, ...(alt ? { alt } : {}) }, kalemDusumu: sonuc.kalemDusumu || {} };
}
// Uygulamanın sipariş iptali (087 siparisKapat, sil=false): fis_bag_coz → 088 siparisBaglariniCoz (yerel) → sipariş köprüden
async function siparisIptal(s, yerel) {
  const bc = T.rpc("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo });
  const d = E.siparisBaglariniCoz({ siparisler: yerel.siparisler, stok: yerel.stok, cariler: yerel.cariler, uretim: [], koliler: [], stokRezervasyonlari: [], fisDefteri: [] },
    s.id, { sil: false, kullanici: "Ali" });
  const yazma = await T.kaydet("siparisler", yerel.siparisler, d.siparisler);
  return { bc: bc.ok ? bc.sonuc : bc.hata, yazma, yerel: { stok: d.stok || yerel.stok, cariler: d.cariler || yerel.cariler, siparisler: d.siparisler } };
}

// Durum fotoğrafı: kalemin karşılananı, SUNUCUNUN kendi hesabı (fis_kalem_hesap), fişin satırları (geçerli bağ + varsa geçmiş bağ)
function durum(k, fis) {
  const iz = izVar();
  const r = jsonSorgu(`select (select coalesce(karsilanan, 0) from public.siparis_kalemleri where id = '${k}')::float as karsilanan,
    ${psql("select count(*) from pg_proc where proname = 'fis_kalem_hesap';") === "1" ? `public.fis_kalem_hesap('${k}')::float` : "null::float"} as hesap
    ${fis ? `, (select not iptal from public.stk_fis where id = '${fis}') as "fisGecerli",
      (select json_agg(json_build_object('iptal', h.iptal, 'kalem', h.kalem_id, 'siparis', h.siparis_id, 'no', h.siparis_no
        ${iz ? ", 'gecmisKalem', h.gecmis_kalem_id, 'gecmisSiparis', h.gecmis_siparis_id, 'cozum', h.bag_cozum_zamani is not null" : ""}) order by h.id)
        from public.stk_hareket h where h.fis_id = '${fis}') as satirlar` : ""}`)[0];
  return r;
}
// Hata seviyeli denetim bulguları + hayalet (kilit denemelerinde bütünlük): D1b, D2*, D6*. D1a burada YOK — F1.1'de denetim
// tanımı geçmiş bağı da sayacak; kilit denemelerinde karşılananın doğruluğu bağımsız beklenen değerle (kahin) ölçülür.
function butunlukDenetimi(onek) {
  const d = T.denetim(onek);
  const out = {};
  Object.entries(d).forEach(([k, n]) => { if (n > 0 && /^(D1b|D2|D6)/.test(k)) out[k] = n; });
  return out;
}

module.exports = { ...T, T, DB, izSutunlari, izVar, oturum, rpcSureli, kilitlenmeMi, kisa, stokOku, carilerOku, yerelOku, fisIptalYuku, siparisIptal, durum, butunlukDenetimi };
