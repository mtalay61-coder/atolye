// BİRİM TESTİ — GÜN SONU RAPORU SUNUCU FONKSİYONU (v1.687.0)
//
// Kullanıcı: "Sunucudan otomatik gönderilsin, uygulama açık olmasa da; stok miktarları detaysız olsun — stok miktarı,
// alış fiyatı ve stok tutarı yeterli, renk beden gerek yok."
// Üretilen `supabase-gun-sonu-fonksiyonu.ts` gerçekten çalıştırılır: TypeScript'ten JavaScript'e çevrilir, Supabase
// istemcisi (veritabanı satırları snake_case + `ek`, uygulamadaki gibi) ve SMTP taklit edilir.
// İddialar:
//   • Çekirdek çıkarımı tam: fonksiyon tanımsız ad hatası vermeden raporu kurar.
//   • Zamanlayıcı: saat geçmişse gönderir, gönderim satırını yazar; ikinci çağrı aynı gün GÖNDERMEZ.
//   • Saat gelmediyse / otomatik kapalıysa göndermez; yanlış anahtar ve jetonsuz çağrı 401.
//   • Rapor: alış/satış fişi, kasa hareketi, cari bakiye; stok ürün başına TEK satır (renk/beden toplamı),
//     alış fiyatı son alış fişinden (yoksa kart), stok tutarı = miktar × fiyat.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

// İstanbul bugünü (fonksiyonla aynı hesap) — test verisi bugüne yazılır.
const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" })
  .formatToParts(new Date()).map((x) => [x.type, x.value]));
const BUGUN = `${p.year}-${p.month}-${p.day}`;

function veritabani(gunSonuAyar, fisDenetimi) {
  const tablolar = {
    tanimlar: [{ id: "tekil", veri: { firmaBilgileri: { unvan: "Test Atölye", eposta: { sunucu: "smtp.test", kullanici: "a@test", port: 465 }, gunSonu: gunSonuAyar } } }],
    muhasebe: [{ id: "tekil", veri: { kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [
      { id: "kh0", tarih: "2026-01-01", yon: "Giriş", tutar: 1000, defter: "Genel" },
      { id: "kh1", tarih: BUGUN, yon: "Giriş", tutar: 300, cariId: "c2", defter: "Genel", aciklama: "Tahsilat" },
    ] }], bankalar: [], cekler: [] } }],
    cariler: [{ id: "c1", unvan: "Tedarikçi A", tip: "Tedarikçi", ek: null }, { id: "c2", unvan: "Müşteri B", tip: "Müşteri", ek: null }],
    cari_hareketleri: [
      // Alış fişi: kalemin birim fiyatı ve miktarı `ek`te (uygulamanın yazdığı gibi).
      { id: "a1", cari_id: "c1", tarih: BUGUN, yon: "Alacak", tutar: 1200, para_birimi: "TRY", fis_no: "AF-1", urun_ad: "Deri", renk: "Siyah", defter: "Genel", ek: { miktar: 10, birim: "metre", birimFiyat: 120 } },
      { id: "s1", cari_id: "c2", tarih: BUGUN, yon: "Borç", tutar: 500, para_birimi: "TRY", fis_no: "SF-1", urun_ad: "Bot", renk: "Siyah", defter: "Genel", ek: { beden: "41", miktar: 2, birim: "çift", birimFiyat: 250 } },
      { id: "t1", cari_id: "c2", tarih: BUGUN, yon: "Alacak", tutar: 300, para_birimi: "TRY", fis_no: "THS-1", aciklama: "Tahsilat (TL Kasa)", defter: "Genel", ek: { islemTipi: "Tahsilat" } },
    ],
    urunler: [
      { id: "u1", ad: "Deri", kategori: "Hammadde", birim: "metre", alis_fiyati: 90, alis_para_birimi: "₺", ek: null },
      { id: "u2", ad: "Bot", kategori: "Mamul", birim: "çift", alis_fiyati: 400, alis_para_birimi: "$", ek: null },
    ],
    varyantlar: [],
    stok_hareketleri: [
      { id: "h1", urun_id: "u1", renk: "Siyah", beden: "", miktar: 10, kaynak: "Satınalma", tarih: `${BUGUN}T08:00:00.000Z`, fis_no: "AF-1" },
      { id: "h2", urun_id: "u1", renk: "Taba", beden: "", miktar: 5, kaynak: "Açılış", tarih: "2026-01-01T08:00:00.000Z", fis_no: "AC-1" },
      { id: "h3", urun_id: "u2", renk: "Siyah", beden: "41", miktar: 6, kaynak: "Üretim", tarih: "2026-01-01T08:00:00.000Z", fis_no: "1001" },
      { id: "h4", urun_id: "u2", renk: "Siyah", beden: "42", miktar: 4, kaynak: "Üretim", tarih: "2026-01-01T08:00:00.000Z", fis_no: "1001" },
      { id: "h5", urun_id: "u2", renk: "Siyah", beden: "41", miktar: -2, kaynak: "Satış", tarih: `${BUGUN}T09:00:00.000Z`, fis_no: "SF-1" },
    ],
    uretim: [], uretim_atamalari: [], gun_sonu_gonderim: [],
  };
  const sorgu = (tablo) => {
    const s = { suzgec: null };
    const satirlar = () => (tablolar[tablo] || []).filter((r) => !s.suzgec || r[s.suzgec[0]] === s.suzgec[1]);
    const q = {
      select: () => q,
      eq: (a, d) => { s.suzgec = [a, d]; if (s.guncelle) { satirlar().forEach((r) => Object.assign(r, s.guncelle)); return Promise.resolve({ error: null }); } return q; },
      range: (b, e) => Promise.resolve({ data: satirlar().slice(b, e + 1), error: null }),
      maybeSingle: () => Promise.resolve({ data: satirlar()[0] || null, error: null }),
      insert: (r) => {
        if (tablo === "gun_sonu_gonderim" && tablolar[tablo].some((x) => x.gun === r.gun)) return Promise.resolve({ error: { code: "23505", message: "duplicate" } });
        tablolar[tablo].push({ ...r }); return Promise.resolve({ error: null });
      },
      update: (r) => { s.guncelle = r; return q; },
    };
    return q;
  };
  // Gece denetimi (v1.741.0): verilmezse istemcide `rpc` YOK — işlev kurulmamış Supabase gibi; rapor bölümsüz gitmeli.
  const rpc = fisDenetimi === undefined ? undefined : async (ad) => (ad === "fis_gece_denetimi" ? { data: fisDenetimi, error: null } : { data: null, error: { message: "yok" } });
  return { tablolar, istemci: { from: sorgu, ...(rpc ? { rpc } : {}), auth: { getUser: async (j) => (j === "gecerli" ? { data: { user: { id: "u" } }, error: null } : { data: null, error: { message: "x" } }) } } };
}

async function kur(gunSonuAyar, fisDenetimi) {
  const db = veritabani(gunSonuAyar, fisDenetimi);
  const gonderilen = [];
  let isleyici = null;
  const kaynak = fs.readFileSync(path.join(__dirname, "..", "supabase-gun-sonu-fonksiyonu.ts"), "utf8")
    .replace(/^import .*$/gm, "");
  const js = ts.transpileModule(kaynak, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const Deno = { env: { get: (a) => ({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "s", SUPABASE_ANON_KEY: "a", SMTP_SIFRE: "p", GUN_SONU_ANAHTAR: "zaman-anahtari" })[a] }, serve: (f) => { isleyici = f; } };
  class SMTPClient { async send(m) { gonderilen.push(m); } async close() {} }
  new Function("Deno", "createClient", "SMTPClient", js)(Deno, () => db.istemci, SMTPClient);
  const cagir = async (basliklar, govde = {}) => (await isleyici(new Request("https://x/functions/v1/gun-sonu", { method: "POST", headers: basliklar, body: JSON.stringify(govde) }))).json();
  return { db, gonderilen, cagir };
}

(async () => {
  const zaman = { "x-gun-sonu-anahtar": "zaman-anahtari" };

  // 1) Zamanlayıcı, saat geçmiş → gönderir; ikinci çağrı göndermez.
  const a = await kur({ otomatik: true, saat: "00:00", alicilar: "patron@test, muhasebe@test", defter: "Tümü" });
  const y1 = await a.cagir(zaman);
  bekle("ilk çağrı gönderdi", [y1.tamam, a.gonderilen.length], [true, 1]);
  bekle("iki alıcı, tek e-posta", a.gonderilen[0] && a.gonderilen[0].to, ["patron@test", "muhasebe@test"]);
  bekle("gönderim kaydı yazıldı", a.db.tablolar.gun_sonu_gonderim.map((r) => [r.gun, /^gönderildi/.test(r.durum)]), [[BUGUN, true]]);
  const y2 = await a.cagir(zaman);
  bekle("ikinci çağrı aynı gün göndermez", [y2.mesaj, a.gonderilen.length], ["bugün gönderildi", 1]);

  const m = a.gonderilen[0] || {};
  const html = String(m.html || "");
  const metin = (bas) => { const i = html.indexOf(bas); return i < 0 ? "" : html.slice(i, html.indexOf("</table>", i)).replace(/<[^>]+>/g, "|").replace(/\|+/g, "|"); };
  bekle("satış fişi raporda", /Satış\|SF-1\|Müşteri B/.test(metin("Alış / Satış fişleri")), true);
  bekle("kasa gün sonu bakiyesi", /TL Kasa\|300,00 ₺\|0,00 ₺\|1\.300,00 ₺/.test(metin("Kasa ve banka bakiyeleri")), true);
  bekle("cari bakiye (satış 500 − tahsilat 300)", /Müşteri B\|Müşteri\|\+200 ₺/.test(metin("Cari bakiyeleri")), true);
  const stok = metin("Stok (gün sonu)");
  // Deri: 10 + 5 = 15 metre (renkler toplanır), son alış 120 ₺ → 1.800 ₺. Bot: 6 + 4 − 2 = 8 çift, alış fişi yok → kart 400 $ → 3.200 $.
  bekle("Deri tek satır, son alış fiyatıyla", /Deri\|15 metre\|120,00 ₺ \(son alış [0-9.]+\)\|1\.800,00 ₺/.test(stok), true);
  bekle("Bot tek satır, kart fiyatıyla", /Bot\|8 çift\|400,00 \$ \(kart\)\|3\.200,00 \$/.test(stok), true);
  bekle("renk/beden sütunu yok", /Renk|Beden/.test(stok), false);
  bekle("ek dosya HTML", [m.attachments && m.attachments[0].filename, m.attachments && m.attachments[0].contentType], [`Gun-sonu-${BUGUN}.html`, "text/html; charset=utf-8"]);
  bekle("özet metinde stok tutarı", /Stok tutarı \(alış fiyatıyla\): .*1\.800,00 TRY.*3\.200,00 USD|Stok tutarı \(alış fiyatıyla\): .*3\.200,00 USD.*1\.800,00 TRY/.test(String(m.content)), true);

  // 2) Saat gelmedi / kapalı → göndermez.
  const b = await kur({ otomatik: true, saat: "23:59", alicilar: "p@test" });
  const yb = await b.cagir(zaman);
  const saatGecti = yb.mesaj !== "saat gelmedi";   // test 23:59'da koşarsa
  bekle("saat gelmeden göndermez", saatGecti || b.gonderilen.length === 0, true);
  const c = await kur({ otomatik: false, saat: "00:00", alicilar: "p@test" });
  bekle("otomatik kapalıyken göndermez", [(await c.cagir(zaman)).mesaj, c.gonderilen.length], ["otomatik gönderim kapalı", 0]);

  // 3) Yetki: yanlış anahtar / jeton yok → 401; giriş yapmış kullanıcı deneme gönderir ve kayıt YAZMAZ.
  const d = await kur({ otomatik: false, saat: "00:00", alicilar: "p@test" });
  bekle("yanlış anahtar reddedilir", (await d.cagir({ "x-gun-sonu-anahtar": "yanlis" })).tamam, false);
  const yd = await d.cagir({ Authorization: "Bearer gecerli" }, { deneme: true });
  bekle("deneme gönderir, kayıt yazmaz", [yd.tamam, d.gonderilen.length, d.db.tablolar.gun_sonu_gonderim.length], [true, 1, 0]);

  // 4) Fiş defteri gece denetimi (v1.741.0): işlev yoksa bölüm yok (1. durum); sorunluysa bölüm kırmızı, özet metinde sorun sayısı.
  bekle("denetim işlevi yokken bölüm yok", /Fiş defteri denetimi/.test(html), false);
  const den = { kuralAcik: true, temiz: false, fissizCari: { sayi: 3, kuraldanSonra: 1, ornek: [] }, fissizKasa: { sayi: 0, kuraldanSonra: 0, ornek: [] },
    satirsizFis: [{ fisNo: "AF-261031004", aile: "stok", tur: "Alış" }], iptalTutarsiz: [], tutarFarki: [{ fisNo: "SF-261031002", tur: "Satış", baslik: 507, satirlar: 500 }],
    gun: { tarih: BUGUN, kesilen: { stok: 4, para: 6 }, iptal: [{ fisNo: "TH-261031001", tur: "Tahsilat", sebep: "yanlış tutar", eden: "ali@test" }] } };
  const e = await kur({ otomatik: true, saat: "00:00", alicilar: "p@test" }, den);
  await e.cagir(zaman);
  const eh = String((e.gonderilen[0] || {}).html || "").replace(/<[^>]+>/g, "|").replace(/\s+/g, " ").replace(/\|+/g, "|");
  bekle("denetim bölümü: 3 sorun", /Fiş defteri denetimi \| ?3 sorun/.test(eh), true);
  bekle("kural sonrası fişsiz satır, satırsız fiş, tutar farkı, iptal listesi", [/Fişsiz cari satırı: 3 — 1 tanesi kurallar açıldıktan SONRA/.test(eh), /AF-261031004 · Alış/.test(eh),
    /SF-261031002 · Satış: başlık 507, satırlar 500/.test(eh), /TH-261031001 · Tahsilat — yanlış tutar \(ali@test\)/.test(eh), /4 stok fişi, 6 para fişi/.test(eh)], [true, true, true, true, true]);
  bekle("özet metinde sorun", /Fiş defteri denetimi: 3 SORUN/.test(String((e.gonderilen[0] || {}).content)), true);
  const f = await kur({ otomatik: true, saat: "00:00", alicilar: "p@test" }, { ...den, fissizCari: { sayi: 3, kuraldanSonra: 0 }, satirsizFis: [], tutarFarki: [], temiz: true });
  await f.cagir(zaman);
  bekle("temiz denetim: eski fişsiz satır sorun sayılmaz", [/Fiş defteri denetimi: temiz/.test(String((f.gonderilen[0] || {}).content)), /kurallar açılmadan önceki eski kayıtlar/.test(String((f.gonderilen[0] || {}).html))], [true, true]);

  if (hata) { console.log("birim-gun-sonu-sunucu: HATA"); process.exit(1); }
  console.log("birim-gun-sonu-sunucu: tamam");
})().catch((e) => { console.error(e); process.exit(1); });
