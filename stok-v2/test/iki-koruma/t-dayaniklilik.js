#!/usr/bin/env node
// İKİ KORUMA BİRLİKTE AÇIKKEN DAYANIKLILIK (4 Kasım). Yalnız yerel PostgreSQL (kos-iki-koruma.sh veritabanı); Supabase'e DOKUNMAZ.
// Ön koşul: stk_ayar.fis_aktif = true VE min_istemci_surum = güncel sürüm (iki koruma açık) — test önce bunu doğrular.
// Kahin (her durumda "yarım ya da çift kayıt YOK" sayımla ölçülür: stk_fis, stk_hareket, car_hareket, kas_hareket, fis_sayac):
//   A ESKİ İSTEMCİ   başlıksız / 1.744.6 / bozuk başlıklı fis_kes ve tablo yazması AT001; hiçbir satır, numara sayacı ilerlemez.
//   B ESKİ YOL       güncel başlıkla bile köprüden hareket satırı (stk_yaz satirlar) reddedilir; satır yok.
//   C TEKRAR         aynı istek arka arkaya: ikinci yanıt zatenVar, aynı numara, satırlar bir kez.
//   D AYNI İSTEK ∥   aynı istek iki bağlantıdan aynı anda: tek fiş, satırlar bir kez.
//   E EŞZAMANLI      N farklı istek aynı ürüne aynı anda: N fiş, numaralar benzersiz, stok toplamı = hareket toplamı.
//   F KOPMA (önce)   fis_kes çalıştı, commit'ten ÖNCE bağlantı koptu (pg_terminate_backend): hiçbir satır, sayaç geri;
//                    aynı istek yeniden → tek fiş.
//   G KOPMA (sonra)  UYGULAMANIN KENDİ YOLU (078 fisKesGonder → 030 supabaseIstek): sunucu yazdı, yanıt kayboldu (fetch attı);
//                    uygulama yeniden dener → zatenVar, aynı numara, satırlar bir kez; isteğin başlığı 1.744.7.
//   H YARIM İŞLEM    stok satırı geçerli, bağlı makbuzun kasa hesabı yok → hata; fişin hiçbir parçası yazılmaz.
// Kullanım: PGHOST=localhost IKI_KORUMA=1 node t-dayaniklilik.js     (FINANS_N ile E'nin genişliği, varsayılan 20)
const assert = require("assert/strict");
const { spawn } = require("child_process");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST), "Yalnız yerel PostgreSQL");
const T = require("../f0/ortak");
const { psql, E, ON } = T;
const SURUM = E.SURUM || (require("fs").readFileSync(require("path").join(__dirname, "../../../src/015-sabitler.jsx"), "utf8").match(/^const SURUM = "([^"]+)"/m) || [])[1];
let hata = 0;
const k = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (!ok) hata += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };

// Ayrı bağlantı, başlık açıkça verilir ('{}' = başlıksız). `pidAl` verilirse arka uç kimliği bildirilir (kopma denemesi).
function oturum(sql, { surum = SURUM, bekleSn = 0, pidAl = null } = {}) {
  const baslik = surum === null ? "{}" : JSON.stringify({ "x-atolye-surum": surum });
  const metin = `\\set VERBOSITY verbose
    begin;
    select 'PID:' || pg_backend_pid();
    select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', true);
    select set_config('request.headers', '${baslik}', true);
    set local role authenticated;
    ${sql}
    ${bekleSn ? `select pg_sleep(${bekleSn});` : ""}
    commit;`;
  return new Promise((coz) => {
    const c = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", process.env.STOK_V2_DB || "atolye_stok_v2_sinama"]);
    let out = "", err = "";
    c.stdout.on("data", (d) => { out += d; const m = out.match(/PID:(\d+)/); if (m && pidAl) { pidAl(Number(m[1])); pidAl = null; } });
    c.stderr.on("data", (d) => { err += d; });
    c.on("close", (kod) => { const s = (out.match(/SONUC:(.*)/) || [])[1];
      coz({ ok: kod === 0 && !!s, sonuc: s ? JSON.parse(s) : null, kod: (err.match(/ERROR:\s+([0-9A-Z]{5})/) || [])[1] || (kod === 0 ? null : "kopuk"), hata: err.split("\n").find((x) => /ERROR|FATAL|terminat/i.test(x)) || "" }); });
    c.stdin.end(metin);
  });
}
const fisKes = (p, sec) => oturum(`select 'SONUC:' || public.fis_kes($j$${JSON.stringify(p)}$j$::jsonb)::text;`, sec);
const sayi = (sql) => Number(psql(`select (${sql})::bigint`));
const sayim = (on) => ({
  fis: sayi(`select count(*) from public.stk_fis where istek like '${on}%'`),
  stok: sayi(`select count(*) from public.stk_hareket where id like '${on}%'`),
  cari: sayi(`select count(*) from public.car_hareket where id like '${on}%'`),
  kasa: sayi(`select count(*) from public.kas_hareket where id like '${on}%'`),
});
const sayac = () => psql("select coalesce(string_agg(onek || ':' || son, ',' order by onek, gun), '') from public.fis_sayac");
// Alış fişi + bağlı ödeme makbuzu (sinama-fis.sql § 1 ile aynı biçim): 1 stok, 2 cari, 1 kasa satırı
const yuk = (on, { miktar = 1, kasaHesap = "K1" } = {}) => ({
  istek: on, fis: { aile: "stok", tur: "Alış", onek: "AF", kaynak: "Satınalma", cariId: "c-yeni", defter: "Genel", paraBirimi: "TRY",
    tutar: 100 * miktar, kullanici: "Ali", kalemler: [{ urunId: "u-yeni", renk: "Siyah", miktar, birimFiyat: 100 }] },
  stok: { satirlar: [{ id: `${on}-h1`, urunId: "u-yeni", renk: "Siyah", miktar, kaynak: "Satınalma", cariId: "c-yeni" }] },
  cari: { satirlar: [{ id: `${on}-c1`, cari_id: "c-yeni", tarih: "2026-11-04", yon: "Alacak", tutar: 100 * miktar }] },
  bagli: { fis: { aile: "para", tur: "Ödeme", onek: "ÖD", cariId: "c-yeni", kasaHesapId: kasaHesap, tutar: 50 },
    kasa: { hareketler: [{ id: `${on}-k1`, hesap_id: kasaHesap, veri: { id: `${on}-k1`, tarih: "2026-11-04", yon: "Çıkış", tutar: 50 } }] },
    cari: { satirlar: [{ id: `${on}-c2`, cari_id: "c-yeni", tarih: "2026-11-04", yon: "Borç", tutar: 50 }] } },
});
const TAM = { fis: 2, stok: 1, cari: 2, kasa: 1 };
const BOS = { fis: 0, stok: 0, cari: 0, kasa: 0 };

(async () => {
  console.log(`t-dayaniklilik · sürüm ${SURUM} · önek ${ON}`);
  k("0.iki-koruma-acik", psql("select fis_aktif::text || '/' || coalesce(min_istemci_surum, '') || '/' || public.fis_kural_aktif()::text from public.stk_ayar where id = 'tekil'"), `true/${SURUM}/true`);

  // A — eski istemci
  for (const [ad, surum] of [["basliksiz", null], ["eski-1.744.6", "1.744.6"], ["bozuk", "1.744"]]) {
    const on = `${ON}-a-${ad}`; const s0 = sayac();
    const r = await fisKes(yuk(on), { surum });
    k(`A.${ad}.fis_kes-AT001`, r.kod, "AT001");
    k(`A.${ad}.satir-yok`, sayim(on), BOS);
    k(`A.${ad}.sayac-ilerlemedi`, sayac(), s0);
    const t = await oturum("update public.tanimlar set veri = veri where id = 'tekil'; select 'SONUC:1';", { surum });
    k(`A.${ad}.tablo-yazmasi-AT001`, t.kod, "AT001");
  }
  // B — eski yol (güncel başlıkla bile): köprüden fiş numarasıyla hareket eklemek (sinama-duzeltme.sql § biçimi)
  { const on = `${ON}-b`;
    const r = await oturum(`select 'SONUC:' || public.stk_yaz($j$${JSON.stringify({ satirlar: [{ id: `${on}-h1`, fisId: `${on}-FIS`, urunId: "u-yeni", renk: "Siyah", miktar: 1, kaynak: "Sayım" }] })}$j$::jsonb)::text;`);
    k("B.kopru-hareket-ekleme-red", r.ok ? "yazdi" : (["KR009", "42501"].includes(r.kod) ? "red" : r.kod), "red");
    k("B.satir-yok", sayim(on), BOS); }
  // C — aynı istek arka arkaya
  { const on = `${ON}-c`; const p = yuk(on);
    const r1 = await fisKes(p); const r2 = await fisKes(p);
    k("C.ilk", r1.ok && /^AF-/.test(r1.sonuc.fisNo), true);
    k("C.tekrar-zatenVar-ayni-no", [r2.ok, r2.sonuc && r2.sonuc.zatenVar, r2.sonuc && r2.sonuc.fisNo === r1.sonuc.fisNo], [true, true, true]);
    k("C.satirlar-bir-kez", sayim(on), TAM);
    // B2 — kesilmiş fişin hareketini eski yoldan iptal etmek (stk_yaz iptal) reddedilir, satır iptal olmaz
    const r3 = await oturum(`select 'SONUC:' || public.stk_yaz($j$${JSON.stringify({ iptal: [`${on}-h1`] })}$j$::jsonb)::text;`);
    k("B2.kopru-iptal-red", r3.ok ? "yazdi" : (["KR009", "42501"].includes(r3.kod) ? "red" : r3.kod), "red");
    k("B2.satir-iptal-olmadi", psql(`select coalesce(iptal, false)::text from public.stk_hareket where id = '${on}-h1'`), "false"); }
  // D — aynı istek iki bağlantıdan aynı anda
  { const on = `${ON}-d`; const p = yuk(on);
    const r = await Promise.all([fisKes(p), fisKes(p)]);
    const nolar = [...new Set(r.filter((x) => x.ok).map((x) => x.sonuc.fisNo))];
    k("D.en-az-biri-basarili-tek-numara", [r.some((x) => x.ok), nolar.length], [true, 1]);
    k("D.satirlar-bir-kez", sayim(on), TAM);
    const sonra = await fisKes(p);
    k("D.sonra-tekrar-zatenVar", sonra.ok && sonra.sonuc.zatenVar, true); }
  // E — eşzamanlı farklı istekler aynı ürüne
  { const n = Number(process.env.FINANS_N || 20); const on = `${ON}-e`;
    const stokOnce = Number(psql("select coalesce(sum(miktar), 0) from public.stk_hareket where urun_id = 'u-yeni' and not coalesce(iptal, false)"));
    const r = await Promise.all(Array.from({ length: n }, (_, i) => fisKes(yuk(`${on}-${i}`, { miktar: 2 }))));
    k("E.hepsi-basarili", r.filter((x) => x.ok).length, n);
    const nolar = r.filter((x) => x.ok).map((x) => x.sonuc.fisNo);
    k("E.numaralar-benzersiz", new Set(nolar).size, n);
    k("E.fis-ve-satir-sayisi", sayim(`${on}-`), { fis: 2 * n, stok: n, cari: 2 * n, kasa: n });
    const stokSonra = Number(psql("select coalesce(sum(miktar), 0) from public.stk_hareket where urun_id = 'u-yeni' and not coalesce(iptal, false)"));
    k("E.stok-toplami", stokSonra - stokOnce, 2 * n);
    k("E.gorunum-miktari-hareketle-uyumlu (varyantlar = Σ hareket)", psql(`select (abs((select coalesce(sum(miktar), 0) from public.varyantlar where urun_id = 'u-yeni')
      - (select coalesce(sum(miktar), 0) from public.stk_hareket where urun_id = 'u-yeni' and not coalesce(iptal, false))) < 0.000001)::text`), "true"); }
  // F — commit'ten önce kopma
  { const on = `${ON}-f`; const p = yuk(on); const s0 = sayac();
    let pid = null;
    const bekleyen = fisKes(p, { bekleSn: 5, pidAl: (x) => { pid = x; } });
    for (let i = 0; i < 100 && !(pid && sayi(`select count(*) from pg_stat_activity where pid = ${pid} and query like '%pg_sleep%'`)); i += 1) await T.uyu(50);
    k("F.oturum-uykuda (fis_kes çalıştı, commit yok)", !!pid, true);
    psql(`select pg_terminate_backend(${pid})`);
    const r = await bekleyen;
    k("F.istemci-hata-aldi", r.ok, false);
    k("F.satir-yok", sayim(on), BOS);
    k("F.sayac-geri", sayac(), s0);
    const tekrar = await fisKes(p);
    k("F.yeniden-deneme-basarili", tekrar.ok && !tekrar.sonuc.zatenVar, true);
    k("F.satirlar-bir-kez", sayim(on), TAM); }
  // G — commit'ten sonra yanıt kayboldu: uygulamanın kendi yeniden deneme yolu
  { const on = `${ON}-g`; const asil = global.fetch; let cagri = 0; const basliklar = [];
    global.fetch = async (url, sec = {}) => {
      if (/rpc\/fis_kes/.test(String(url))) {
        cagri += 1; basliklar.push((sec.headers || {})["x-atolye-surum"] || null);
        const y = await asil(url, sec);
        if (cagri === 1) throw new TypeError("Failed to fetch");   // sunucu yazdı, yanıt istemciye ulaşmadı
        return y;
      }
      return asil(url, sec);
    };
    let r = null, hataMetni = null;
    // Test yardımcısı yeniden deneme aralıklarını boşaltır (bekleme olmasın); burada uygulamanın gerçek davranışı gerekli:
    // 030 supabaseIstek yazmayı fetch atınca yeniden dener (aralıklar kısaltılmış, davranış aynı).
    const eskiAra = window.__supabaseYenidenDenemeMs; window.__supabaseYenidenDenemeMs = [20, 20, 20];
    try { r = await E.fisKesGonder(yuk(on)); } catch (e) { hataMetni = String(e.message || e); }
    window.__supabaseYenidenDenemeMs = eskiAra;
    global.fetch = asil;
    k("G.uygulama-yeniden-denedi", cagri, 2);
    k("G.her-denemede-surum-basligi", basliklar, [SURUM, SURUM]);
    k("G.ikinci-yanit-zatenVar", [hataMetni, r && r.zatenVar, r && /^AF-/.test(r.fisNo)], [null, true, true]);
    k("G.satirlar-bir-kez", sayim(on), TAM); }
  // H — yarım işlem
  { const on = `${ON}-h`; const s0 = sayac();
    const r = await fisKes(yuk(on, { kasaHesap: "YOK-HESAP" }));
    k("H.hata", r.ok, false);
    k("H.hicbir-parca-yazilmadi", sayim(on), BOS);
    k("H.sayac-geri", sayac(), s0); }

  k("Z.iki-koruma-hala-acik", psql("select public.fis_kural_aktif()::text || '/' || coalesce(min_istemci_surum, '') from public.stk_ayar where id = 'tekil'"), `true/${SURUM}`);
  console.log(`── t-dayaniklilik.js: ${hata ? hata + " kırmızı" : "temiz"} ──`);
  process.exit(hata ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
