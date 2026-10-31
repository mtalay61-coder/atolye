#!/usr/bin/env node
// R1 — SİPARİŞ TESLİMİ EŞZAMANLILIĞI (teknik analiz, 31 Ekim). Yerel PostgreSQL'de (kos.sh'ın kurduğu veritabanı, KURALLAR AÇIK);
// Supabase'e DOKUNMAZ.
//
// Senaryo: iki kullanıcı AYNI sipariş kalemine (miktar 20, karşılanan 0) aynı anda 5'er adet teslim yapar. İkisi de uygulamanın
// gerçek yük kurucusunu (`siparisTeslimSunucuYuku`) AYNI ekran fotoğrafıyla (karşılanan 0) çalıştırır ve `fis_kes`i İKİ AYRI
// bağlantıdan eşzamanlı gönderir. Birinci işlem açıkken (pg_sleep) ikincisi gelir — satır kilidinde bekler, sonra yazar.
// Değişmez: kalemin karşılananı = min(miktar, |o kaleme bağlı geçerli stok hareketleri toplamı|).
//
// Ek senaryolar: aynı istek sıralı tekrar; aynı istek eşzamanlı; ağ kesintisi (sunucu bağlantısı işlem ortasında düşürülür);
// işlem geri alma (satırlardan biri hatalı → hiçbir şey yazılmaz); teslim iptali eşzamanlı yeni teslimle; miktarı aşan
// eşzamanlı teslim (kırpma kuralı).
const { execFileSync, spawn } = require("child_process");
const path = require("path");
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";
const psql = (sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB], { input: sql, encoding: "utf8" }).trim();
const jsonSorgu = (sql) => JSON.parse(psql(`select coalesce(json_agg(x), '[]'::json) from (${sql}) x;`) || "[]");
global.window = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, __supabaseYenidenDenemeMs: [] };
const E = require(path.join(__dirname, "../../test/erp.cjs"));

// Ayrı bağlantı (ayrı psql süreci) — eşzamanlı istemci. `bekleSn`: fis_kes'ten sonra işlem açık tutulur (öteki istemci araya girsin).
function rpcAyri(ad, p, { bekleSn = 0, adSoyad = "" } = {}) {
  const metin = JSON.stringify(p);
  const sql = `begin;
    select set_config('request.jwt.claims', '{"email":"${adSoyad || "ali"}@atolye.local","role":"authenticated"}', true);
    set local role authenticated;
    select 'PID:' || pg_backend_pid();
    select 'SONUC:' || public.${ad}($j$${metin}$j$::jsonb)::text;
    ${bekleSn ? `select pg_sleep(${bekleSn});` : ""}
    commit;`;
  return new Promise((coz) => {
    const c = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB]);
    let out = "", err = "", pid = null;
    c.stdout.on("data", (d) => { out += d; const m = out.match(/PID:(\d+)/); if (m) pid = Number(m[1]); });
    c.stderr.on("data", (d) => { err += d; });
    c.on("close", (kod) => {
      const s = (out.match(/SONUC:(.*)/) || [])[1];
      coz({ ok: kod === 0 && !!s, sonuc: s ? JSON.parse(s) : null, hata: err.trim().split("\n").filter((x) => /ERROR|FATAL|terminat/i.test(x)).join(" | "), pid });
    });
    c.stdin.end(sql);
  });
}
const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\n    çıkan:   ", JSON.stringify(a)); }
};

function stokOku() {
  const urunler = jsonSorgu("select id, ad, kategori from public.urunler order by id");
  const v = jsonSorgu("select * from public.varyantlar");
  const h = jsonSorgu("select * from public.stok_hareketleri order by tarih desc, id");
  return urunler.map((u) => ({
    ...u,
    variants: v.filter((x) => x.urun_id === u.id).map((x) => ({ renk: x.renk, renkId: x.renk_id || null, beden: x.beden, miktar: Number(x.miktar), minStok: 0 })),
    hareketler: h.filter((x) => x.urun_id === u.id).map((x) => ({ ...(x.ek || {}), id: x.id, renk: x.renk, beden: x.beden, miktar: Number(x.miktar),
      kaynak: x.kaynak, tarih: x.tarih, fisNo: x.fis_no, siparisNo: x.siparis_no, cariId: x.cari_id, siparisId: x.siparis_id, kalemId: x.kalem_id })),
  }));
}
function carilerOku() {
  const c = jsonSorgu("select id, unvan from public.cariler order by id");
  const h = jsonSorgu("select * from public.cari_hareketleri");
  return c.map((x) => ({ ...x, hareketler: h.filter((y) => y.cari_id === x.id).map((y) => { const { cari_id, ...k } = E.kayitaCevir(y); return E.ekiKokeAc(k); }) }));
}

// Her koşu kendi kimlikleriyle (kurallar açık: önceki koşunun fişleri silinmez — yeniden koşunca karışmasın).
const KOSU = Date.now().toString(36);
const SIP = `sip-r1-${KOSU}`, KALEM = `k-r1-${KOSU}`, NO = `SS-R1-${KOSU}`;
const IST = (x) => `r1-${KOSU}-${x}`;
// Kalemin sunucudaki hâli ve değişmezi.
function durum() {
  const r = jsonSorgu(`select (select karsilanan from public.siparis_kalemleri where id = '${KALEM}') as karsilanan,
    (select miktar from public.siparis_kalemleri where id = '${KALEM}') as miktar,
    (select coalesce(sum(h.miktar), 0) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id
      where h.kalem_id = '${KALEM}' and not h.iptal and not f.iptal) as stok_toplam,
    (select count(*) from public.stk_fis where siparis_id = '${SIP}' and not iptal) as gecerli_fis`)[0];
  const karsilanan = Number(r.karsilanan), miktar = Number(r.miktar), teslim = Math.abs(Number(r.stok_toplam));
  return { karsilanan, miktar, teslimEdilen: teslim, gecerliFis: Number(r.gecerli_fis), tutarli: karsilanan === Math.min(miktar, teslim) };
}

// Uygulamanın teslim hesabı: ekran fotoğrafındaki kalemden (karşılanan `ekrandaKarsilanan`) `adet` teslim.
function teslimYuku({ adet, ekrandaKarsilanan, istek, stok, cariler }) {
  const sip = { id: SIP, siparisNo: NO, tip: "Satış", cariId: "c-yeni", durum: "Bekliyor", defterTercihi: "Genel",
    kalemler: [{ id: KALEM, urunId: "u-yeni", urunAd: "Yeni Ürün", renk: "Siyah", beden: null, miktar: 20, karsilanan: ekrandaKarsilanan, birimFiyat: 100, paraBirimi: "TRY", birim: "çift" }] };
  const fisGovdesi2 = {
    fisNo: E.FIS_YER, tip: "Satış", cariId: "c-yeni", kaynak: "Satış", stokTarihi: "2026-10-31T11:00:00.000Z", cariTarihi: "2026-10-31", zaman: new Date().toISOString(),
    kayitParaBirimi: null, kurlar: {}, kurZorunlu: false, tutarYuvarla: false, birimFiyatBolerek: true, yon: E.hareketYonu("Satış"), kullanici: "Ali",
    defter: "Genel", odemeSekli: "Nakit", vade: "", siparis: { id: SIP, siparisNo: NO, rezervasyonSiparisId: null },
    kalemler: [{ urunId: "u-yeni", urunAd: "Yeni Ürün", renk: "Siyah", beden: null, birim: "çift", miktar: adet, birimFiyat: 100, paraBirimi: "TRY",
      kalemId: KALEM, kalan: 20 - ekrandaKarsilanan, fazlaGonderim: false, _siparisId: SIP }],
    cariAciklama: (k) => `Satış Siparişi ${NO}: ${k.urunAd} · ${k.miktar}`,
  };
  const sonuc = E.fisYaz(stok, cariler, fisGovdesi2);
  // 081 satır 249 ile aynı hesap: karşılanan = min(miktar, ekrandaki + eklenecek)
  const yeniKarsilanan = Math.min(20, ekrandaKarsilanan + adet);
  const nextSiparisler = [{ ...sip, durum: "Kısmi Teslim", teslimSayaci: 1, kalemler: [{ ...sip.kalemler[0], karsilanan: yeniKarsilanan }] }];
  const defterKaydi = E.fisDefterKaydiKur(fisGovdesi2, sonuc, { kullanici: "Ali" });
  return E.siparisTeslimSunucuYuku({ siparis: sip, fisGovdesi2, sonuc, islenenler: fisGovdesi2.kalemler, defterKaydi,
    oncekiSiparisler: [sip], nextSiparisler, etkilenenIdler: new Set([SIP]), yeniSayac: 1, kullaniciAd: "Ali", zaman: new Date().toISOString(), istek }).yuk;
}

(async () => {
  E.stokV2AktifAyarla(true); E.cariV2AktifAyarla(true); E.altV2AktifAyarla(true); E.kasaV2AktifAyarla(true); E.fisDefteriKuruluAyarla(true);
  E.stokV2TanimlarAyarla(JSON.parse(psql("select veri from public.tanimlar where id = 'tekil';")));
  bekle("0: kurallar açık (canlının 19. adımdan sonraki hâli)", psql("select public.fis_kural_aktif();"), "t");
  psql(`delete from public.siparis_kalemleri where siparis_id = '${SIP}'; delete from public.siparisler where id = '${SIP}';
        insert into public.siparisler (id, siparis_no, tip, cari_id, durum) values ('${SIP}', '${NO}', 'Satış', 'c-yeni', 'Bekliyor');
        insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, karsilanan, fiyat, para_birimi, birim, sira)
        values ('${KALEM}', '${SIP}', 'u-yeni', 'Yeni Ürün', 'Siyah', null, 20, 0, 100, 'TRY', 'çift', 0);`);
  const stok = stokOku(), cariler = carilerOku();

  console.log("1) İki kullanıcı aynı kaleme aynı anda 5'er adet (ikisinin ekranında karşılanan 0)");
  const yA = teslimYuku({ adet: 5, ekrandaKarsilanan: 0, istek: IST("A"), stok, cariler });
  const yB = teslimYuku({ adet: 5, ekrandaKarsilanan: 0, istek: IST("B"), stok, cariler });
  const kalemSatiri = (y) => ((y.alt || {}).siparis_kalemleri || {});
  console.log("    istemcinin gönderdiği kalem bilgisi (A):", JSON.stringify({ satirlar: (kalemSatiri(yA).satirlar || []).map((s) => ({ id: s.id, karsilanan: s.karsilanan })), artis: kalemSatiri(yA).artis || null }));
  const pA = rpcAyri("fis_kes", yA, { bekleSn: 0.8 });
  await uyu(250);
  const pB = rpcAyri("fis_kes", yB);
  const [rA, rB] = await Promise.all([pA, pB]);
  console.log(`    A: ${rA.ok ? rA.sonuc.fisNo : "HATA " + rA.hata}   B: ${rB.ok ? rB.sonuc.fisNo : "HATA " + rB.hata}`);
  const d1 = durum();
  console.log(`    SONUÇ → stok hareketleri toplamı: ${d1.teslimEdilen} adet çıkış · kalemin karşılananı: ${d1.karsilanan} · geçerli fiş: ${d1.gecerliFis}`);
  bekle("1: iki fiş de kesildi", [rA.ok, rB.ok], [true, true]);
  bekle("1: stoktan 10 adet çıktı", d1.teslimEdilen, 10);
  bekle("1: kalemin karşılananı 10 (DEĞİŞMEZ: karşılanan = teslim edilen)", d1.karsilanan, 10);

  if (process.env.R1_YALNIZ_YARIS === "1") { console.log(hata ? "── R1 HATALI ──" : "── R1 temiz ──"); process.exit(hata); }

  console.log("2) Aynı istek SIRALI tekrar (yanıt kayboldu, istemci yeniden gönderdi)");
  const tekrar = await rpcAyri("fis_kes", yA);
  const d2 = durum();
  bekle("2: ilk numara döndü (zatenVar), ikinci fiş yok, karşılanan artmadı",
    [tekrar.ok && tekrar.sonuc.zatenVar, tekrar.ok && tekrar.sonuc.fisNo === rA.sonuc.fisNo, d2.gecerliFis, d2.karsilanan, d2.teslimEdilen], [true, true, 2, 10, 10]);

  console.log("3) Aynı istek EŞZAMANLI iki kez (çift tıklama iki sekmede)");
  const yC = teslimYuku({ adet: 2, ekrandaKarsilanan: 10, istek: IST("C"), stok, cariler });
  const [c1, c2] = await Promise.all([rpcAyri("fis_kes", yC, { bekleSn: 0.5 }), (async () => { await uyu(150); return rpcAyri("fis_kes", yC); })()]);
  const d3 = durum();
  console.log(`    1. çağrı: ${c1.ok ? JSON.stringify(c1.sonuc) : c1.hata}\n    2. çağrı: ${c2.ok ? JSON.stringify(c2.sonuc) : c2.hata}`);
  bekle("3: tek fiş, karşılanan +2 (12), stok çıkışı 12, değişmez tutuyor", [d3.gecerliFis, d3.karsilanan, d3.teslimEdilen, d3.tutarli], [3, 12, 12, true]);
  bekle("3: ikinci kopya hata değil, ilk numarayı aldı (zatenVar)", [c1.ok, c2.ok, c2.ok && c2.sonuc.zatenVar, c2.ok && c2.sonuc.fisNo === (c1.sonuc || {}).fisNo], [true, true, true, true]);

  console.log("4) Ağ kesintisi: sunucu bağlantısı işlem ortasında düşer → hiçbir şey yazılmaz; yeniden gönderim bir kez işlenir");
  const yD = teslimYuku({ adet: 3, ekrandaKarsilanan: 12, istek: IST("D"), stok, cariler });
  const sayacOnce = psql("select coalesce(sum(son), 0) from public.fis_sayac;");
  const pD = rpcAyri("fis_kes", yD, { bekleSn: 2 });
  await uyu(600);
  psql("select pg_terminate_backend(pid) from pg_stat_activity where datname = current_database() and query like '%pg_sleep(2)%' and pid <> pg_backend_pid();");
  const rD = await pD;
  const d4a = durum();
  bekle("4: kesilen işlem geri alındı (fiş yok, karşılanan 12, sayaç değişmedi)",
    [rD.ok, d4a.gecerliFis, d4a.karsilanan, psql(`select count(*) from public.stk_fis where istek = '${IST("D")}';`), psql("select coalesce(sum(son), 0) from public.fis_sayac;")], [false, 3, 12, "0", sayacOnce]);
  const rD2 = await rpcAyri("fis_kes", yD);
  const rD3 = await rpcAyri("fis_kes", yD);
  const d4b = durum();
  bekle("4: yeniden gönderim bir kez işlendi (15), üçüncü gönderim zatenVar", [rD2.ok, rD3.ok && rD3.sonuc.zatenVar, d4b.karsilanan, d4b.teslimEdilen, d4b.tutarli], [true, true, 15, 15, true]);

  console.log("5) İşlem geri alma: satırlardan biri hatalı (olmayan ürün) → fiş, satırlar, karşılanan, sayaç — hiçbiri yazılmaz");
  const yE = teslimYuku({ adet: 1, ekrandaKarsilanan: 15, istek: IST("E"), stok, cariler });
  yE.stok.satirlar.push({ ...yE.stok.satirlar[0], id: "r1-E-bozuk", urunId: "u-yok-r1" });
  const sayacOnceE = psql("select coalesce(sum(son), 0) from public.fis_sayac;");
  const rE = await rpcAyri("fis_kes", yE);
  const d5 = durum();
  bekle("5: reddedildi, hiçbir şey değişmedi", [rE.ok, /Ürün bulunamadı/.test(rE.hata), d5.karsilanan, d5.gecerliFis, psql("select coalesce(sum(son), 0) from public.fis_sayac;")], [false, true, 15, 4, sayacOnceE]);

  console.log("6) Teslim İPTALİ (A'nın fişi geri alınır) ile yeni teslim (F, 4 adet) aynı anda — ikisinin ekranında karşılanan 15");
  // İptalin kalem bilgisi uygulamanın yaptığı gibi: 100 sunucuFisiniIptalEt → fisGeriAl hesabı + fisKesKalemArtisi (varsa) / fisKesSiparisKalemleri
  const sipEkran = { id: SIP, siparisNo: NO, tip: "Satış", cariId: "c-yeni", durum: "Kısmi Teslim",
    kalemler: [{ id: KALEM, urunId: "u-yeni", urunAd: "Yeni Ürün", renk: "Siyah", beden: null, miktar: 20, karsilanan: 15, birimFiyat: 100, paraBirimi: "TRY", birim: "çift" }] };
  const sipSonra = { ...sipEkran, kalemler: [{ ...sipEkran.kalemler[0], karsilanan: 10 }] };   // fisGeriAl: A'nın 5'i düşer
  // 100 sunucuFisiniIptalEt'in kurduğu alt: satırlar (mutlak, fisGeriAl sonrası) + (varsa) değişim = −fişin adedi (kalemDusumu).
  const iptalAlt = { satirlar: E.fisKesSiparisKalemleri(sipSonra, [KALEM]),
    ...(typeof E.fisKesKalemArtisi === "function" ? { artis: E.fisKesKalemArtisi([{ id: KALEM, miktar: -5 }]) } : {}) };
  const yF = teslimYuku({ adet: 4, ekrandaKarsilanan: 15, istek: IST("F"), stok, cariler });
  const [rIptal, rF] = await Promise.all([
    rpcAyri("fis_iptal", { no: rA.sonuc.fisNo, sebep: "R1 testi", alt: { siparis_kalemleri: iptalAlt } }, { bekleSn: 0.8 }),
    (async () => { await uyu(250); return rpcAyri("fis_kes", yF); })(),
  ]);
  const d6 = durum();
  console.log(`    iptal: ${rIptal.ok ? "tamam" : rIptal.hata}   F: ${rF.ok ? rF.sonuc.fisNo : rF.hata}`);
  console.log(`    SONUÇ → teslim edilen (geçerli): ${d6.teslimEdilen} · karşılanan: ${d6.karsilanan}`);
  bekle("6: geçerli teslim 14 (15 − 5 + 4), karşılanan 14", [rIptal.ok, rF.ok, d6.teslimEdilen, d6.karsilanan], [true, true, 14, 14]);

  console.log("6b) Aynı iptal TEKRAR gelir (yanıtı kaybolmuştu) — karşılanan ikinci kez düşmemeli");
  const rIptal2 = await rpcAyri("fis_iptal", { no: rA.sonuc.fisNo, sebep: "R1 testi (tekrar)", alt: { siparis_kalemleri: iptalAlt } });
  const d6b = durum();
  bekle("6b: zatenIptal, karşılanan 14 kaldı", [rIptal2.ok && rIptal2.sonuc.zatenIptal, d6b.karsilanan, d6b.teslimEdilen], [true, 14, 14]);

  console.log("7) Miktarı aşan eşzamanlı teslim (kalan 6; iki kullanıcı 5'er) — karşılanan miktarda kırpılır (bugünkü kural)");
  const yG = teslimYuku({ adet: 5, ekrandaKarsilanan: 14, istek: IST("G"), stok, cariler });
  const yH = teslimYuku({ adet: 5, ekrandaKarsilanan: 14, istek: IST("H"), stok, cariler });
  const [rG, rH] = await Promise.all([rpcAyri("fis_kes", yG, { bekleSn: 0.5 }), (async () => { await uyu(150); return rpcAyri("fis_kes", yH); })()]);
  const d7 = durum();
  console.log(`    SONUÇ → teslim edilen: ${d7.teslimEdilen} · karşılanan: ${d7.karsilanan} (miktar ${d7.miktar})`);
  bekle("7: iki fiş, teslim 24, karşılanan 20 = min(20, 24)", [rG.ok, rH.ok, d7.teslimEdilen, d7.karsilanan, d7.tutarli], [true, true, 24, 20, true]);

  console.log("8) GERİYE UYUM: eski uygulama (yalnız mutlak karşılanan, `artis` yok) yeni sunucuda bugünkü gibi işlenir");
  const yEski = teslimYuku({ adet: 1, ekrandaKarsilanan: 0, istek: IST("ESKI"), stok, cariler });
  delete yEski.alt.siparis_kalemleri.artis;
  const rEski = await rpcAyri("fis_kes", yEski);
  bekle("8: eski yük kabul edildi, karşılanan mutlak değerle yazıldı (1) — bugünkü davranış", [rEski.ok, durum().karsilanan], [true, 1]);

  // Temizlik: test siparişinin fişleri iptal (kurallar açık — silinmez), sipariş satırları kaldırılır.
  psql(`delete from public.siparis_kalemleri where siparis_id = '${SIP}'; delete from public.siparisler where id = '${SIP}';`);
  console.log(hata ? "── R1 HATALI ──" : "── R1 temiz ──");
  process.exit(hata);
})().catch((e) => { console.error(e); process.exit(1); });
