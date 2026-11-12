// BİRİM TESTİ — SİTE TALEBİ E-POSTA BİLDİRİMİ (v1.744.18, supabase-site-bildirim-fonksiyonu.ts).
// Sunucu fonksiyonu Node'da tip ayıklanarak (--experimental-strip-types) SAHTE veritabanı + SAHTE SMTP ile koşturulur:
//   metin (model · renk: beden × çift, ödeme, not; fiyat / şifre yok), yetki (anahtarsız / jetonsuz 401), ayar kapalı → gönderim yok,
//   alıcı yok, yeni talep → tek e-posta + kayıt "gönderildi", İKİNCİ çağrı aynı talebi bildirmez, 2 saatten eski talep bildirilmez,
//   reddedilmiş talep bildirilmez, SMTP hatası kayda yazılır ve tekrar denenmez, deneme jetonla gider ve kayda yazmaz.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const kaynak = fs.readFileSync(path.join(__dirname, "..", "supabase-site-bildirim-fonksiyonu.ts"), "utf8");
const govde = kaynak.split("\n").filter((l) => !/^import /.test(l)).join("\n");
const sahte = `
const __durum = globalThis.__durum;
globalThis.Deno = { env: { get: (k) => __durum.env[k] }, serve: (f) => { __durum.isleyici = f; } };
class SMTPClient { constructor(o) { this.o = o; } async send(m) { if (__durum.smtpHata) throw new Error(__durum.smtpHata); __durum.giden.push(m); } async close() {} }
function createClient(url, anahtar) {
  const sorgu = (tablo) => {
    const s = { tablo, suz: [], tek: false, sec: null };
    const sonuc = () => {
      let l = (__durum.db[tablo] || []).slice();
      for (const [t, a, d] of s.suz) l = l.filter((r) => t === "eq" ? r[a] === d : t === "gte" ? String(r[a]) >= d : t === "in" ? d.includes(r[a]) : true);
      if (s.guncelle) { l.forEach((r) => Object.assign(r, s.guncelle)); return { data: null, error: null }; }
      if (s.say) return { count: l.length, error: null };
      return { data: s.tek ? (l[0] || null) : l, error: null };
    };
    const z = {
      select: (c, o) => { if (o && o.count) s.say = true; return z; }, eq: (a, d) => { s.suz.push(["eq", a, d]); return z; }, gte: (a, d) => { s.suz.push(["gte", a, d]); return z; },
      in: (a, d) => { s.suz.push(["in", a, d]); return z; }, order: () => z, maybeSingle: () => { s.tek = true; return z; },
      update: (g) => { s.guncelle = g; return z; },
      upsert: (satirlar) => ({ select: async () => {
        const t = (__durum.db[tablo] = __durum.db[tablo] || []);
        const eklenen = satirlar.filter((r) => !t.some((x) => x.id === r.id));
        eklenen.forEach((r) => t.push({ ...r, zaman: new Date().toISOString() }));
        return { data: eklenen.map((r) => ({ id: r.id })), error: null };
      } }),
      then: (ok, ret) => Promise.resolve(sonuc()).then(ok, ret),
    };
    return z;
  };
  return { from: sorgu, auth: { getUser: async (j) => (j === "gecerli-jeton" ? { data: { user: { id: "u" } }, error: null } : { data: null, error: { message: "x" } }) } };
}
`;
const gecici = path.join(require("os").tmpdir(), `site-bildirim-${process.pid}.ts`);
fs.writeFileSync(gecici, sahte + govde + "\nexport {};\n");
const kosucu = path.join(require("os").tmpdir(), `site-bildirim-kos-${process.pid}.mjs`);
fs.writeFileSync(kosucu, `
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(\`  \${ok ? "✓" : "✗"} \${ad}\`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\\n    çıkan:   ", JSON.stringify(a)); } };
const simdi = Date.now(); const once = (dk) => new Date(simdi - dk * 60000).toISOString();
globalThis.__durum = { env: { SUPABASE_URL: "u", SUPABASE_SERVICE_ROLE_KEY: "s", SUPABASE_ANON_KEY: "a", SITE_BILDIRIM_ANAHTAR: "zaman-anahtari", SMTP_SIFRE: "x" }, giden: [],
  db: {
    tanimlar: [{ id: "tekil", veri: { firmaBilgileri: { unvan: "Talay Ayakkabı", eposta: { sunucu: "smtp.ornek", kullanici: "gonderen@ornek.com", port: 465 }, siteBildirim: { acik: true, alicilar: "satis@ornek.com; ikinci@ornek.com, bozuk" } } } }],
    site_talepleri: [
      { id: "t1", cari_unvan: "Mağaza A", olusturma: once(3), durum: "yeni", toplam_cift: 34, odeme: { tip: "Çek", vadeGun: 90 }, not_metni: "Acil",
        kalemler: [{ urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, birimFiyat: 900 }, { urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 12, birimFiyat: 900 }, { urunAd: "Çizme", renk: "Taba", beden: "38", miktar: 12, birimFiyat: 1500 }] },
      { id: "t-eski", cari_unvan: "Eski", olusturma: once(500), durum: "yeni", toplam_cift: 1, kalemler: [] },
      { id: "t-red", cari_unvan: "Red", olusturma: once(2), durum: "reddedildi", toplam_cift: 1, kalemler: [] },
    ],
    site_kayit_talepleri: [{ id: "k1", olusturma: once(1), durum: "yeni", kullanici: "magazab", sifre_ozeti: "$2a$GIZLI", bilgiler: { unvan: "Mağaza B", yetkili: "Ali", telefon: "0555", il: "İzmir" } }],
    site_bildirim_kaydi: [],
  } };
await import(${JSON.stringify("file://" + gecici)});
const D = globalThis.__durum;
const cagir = async (basliklar = {}) => { const y = await D.isleyici(new Request("http://x", { method: "POST", headers: basliklar, body: "{}" })); return { durum: y.status, ...(await y.json()) }; };
const Z = { "x-site-bildirim-anahtar": "zaman-anahtari" };

console.log("1) Yetki");
bekle("anahtarsız ve jetonsuz → 401", (await cagir()).durum, 401);
bekle("yanlış anahtar → 401", (await cagir({ "x-site-bildirim-anahtar": "yanlis" })).durum, 401);
bekle("hiç e-posta gitmedi", D.giden.length, 0);

console.log("2) Ayar kapalı");
D.db.tanimlar[0].veri.firmaBilgileri.siteBildirim.acik = false;
bekle("kapalı → gönderim yok", [(await cagir(Z)).mesaj, D.giden.length, D.db.site_bildirim_kaydi.length], ["bildirim kapalı", 0, 0]);
D.db.tanimlar[0].veri.firmaBilgileri.siteBildirim.acik = true;

console.log("3) Yeni talep + kayıt → tek e-posta, iki alıcı");
const r = await cagir(Z);
bekle("tamam", [r.durum, r.tamam], [200, true]);
bekle("alıcı başına bir e-posta (geçersiz adres atlandı)", D.giden.map((m) => m.to), ["satis@ornek.com", "ikinci@ornek.com"]);
const m = D.giden[0];
console.log("    konu: " + m.subject); console.log(m.content.split("\\n").map((x) => "    | " + x).join("\\n"));
bekle("konu ASCII ve ≤ 60", [/^[\\x20-\\x7e]+$/.test(m.subject), m.subject.length <= 60], [true, true]);
bekle("talep satırı", m.content.includes("SİPARİŞ TALEBİ — Mağaza A"), true);
bekle("model · renk: beden sıralı × çift", m.content.includes("  - Bot · Siyah: 40×12, 41×10 (22 çift)"), true);
bekle("toplam + ödeme", m.content.includes("Toplam 34 çift · 3 satır · Ödeme: Çek, 90 gün vade"), true);
bekle("müşteri kaydı", m.content.includes("MÜŞTERİ KAYDI — Mağaza B") && m.content.includes("Yetkili: Ali · Tel: 0555 · İzmir"), true);
bekle("fiyat ve şifre özeti GİTMEZ", /900|1500|GIZLI|magazab/.test(m.content), false);
bekle("2 saatten eski ve reddedilen talep yok", /Eski|Red\\b/.test(m.content), false);
bekle("kayıt: iki satır gönderildi", D.db.site_bildirim_kaydi.map((x) => x.id + ":" + x.durum.slice(0, 10)).sort(), ["kayit:k1:gönderildi", "talep:t1:gönderildi"]);

console.log("4) İkinci çağrı aynı talebi bildirmez");
const r2 = await cagir(Z);
bekle("zaten bildirildi, yeni e-posta yok", [r2.mesaj, D.giden.length], ["zaten bildirildi", 2]);

console.log("5) SMTP hatası kayda yazılır, tekrar denenmez");
D.db.site_talepleri.push({ id: "t2", cari_unvan: "Mağaza C", olusturma: once(1), durum: "yeni", toplam_cift: 5, kalemler: [{ urunAd: "Bot", renk: "Taba", beden: "39", miktar: 5 }] });
D.smtpHata = "535 kimlik doğrulama";
const r3 = await cagir(Z);
bekle("hata döndü ve kayda yazıldı", [r3.tamam, (D.db.site_bildirim_kaydi.find((x) => x.id === "talep:t2") || {}).durum], [false, "HATA: 535 kimlik doğrulama"]);
D.smtpHata = null;
const r4 = await cagir(Z);
bekle("hata sonrası aynı talep yeniden gönderilmez", [r4.mesaj, D.giden.length], ["zaten bildirildi", 2]);

console.log("6) Alıcı yok");
D.db.site_talepleri.push({ id: "t3", cari_unvan: "Mağaza D", olusturma: once(1), durum: "yeni", toplam_cift: 1, kalemler: [] });
D.db.tanimlar[0].veri.firmaBilgileri.siteBildirim.alicilar = "";
bekle("zamanlayıcı: alıcı yok → sahiplenmez", [(await cagir(Z)).mesaj, !!D.db.site_bildirim_kaydi.find((x) => x.id === "talep:t3")], ["alıcı yok", false]);
bekle("deneme: alıcı yok → 400", (await cagir({ Authorization: "Bearer gecerli-jeton" })).durum, 400);
D.db.tanimlar[0].veri.firmaBilgileri.siteBildirim.alicilar = "satis@ornek.com";

console.log("7) Deneme (kullanıcı jetonu)");
bekle("geçersiz jeton → 401", (await cagir({ Authorization: "Bearer sahte" })).durum, 401);
const d = await cagir({ Authorization: "Bearer gecerli-jeton" });
bekle("deneme gitti, talep sahiplenilmedi", [d.tamam, /deneme/i.test(D.giden[D.giden.length - 1].content), !!D.db.site_bildirim_kaydi.find((x) => x.id === "talep:t3")], [true, true, false]);
const sonra = await cagir(Z);
bekle("denemeden sonra gerçek bildirim t3'ü gönderir", [sonra.tamam, D.giden[D.giden.length - 1].content.includes("Mağaza D")], [true, true]);

if (hata) { console.log("BİRİM TESTİ HATA: site bildirimi"); process.exit(1); }
console.log("── site bildirimi testi temiz ──");
`);
try {
  process.stdout.write(execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", kosucu], { encoding: "utf8" }));
} catch (e) { process.stdout.write(String(e.stdout || "")); process.stderr.write(String(e.stderr || "")); process.exitCode = 1; }
finally { try { fs.unlinkSync(gecici); fs.unlinkSync(kosucu); } catch (e) { /* */ } }
