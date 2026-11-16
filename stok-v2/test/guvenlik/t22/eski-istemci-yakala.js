// ESKİ ERP PAKETİNİN SİTE KAYDI ONAYINDA BULUTA GÖNDERDİĞİ CARİ İSTEĞİNİ YAKALAR (güvenlik 22, 16 Kasım).
// Kullanım: TEST_HTML=<eski paket.html> node eski-istemci-yakala.js <cikti.json>
// Eski paket (1.744.21 = ad02222, 7c6ec2e) Yönetici olarak açılır, bekleyen bir kayıt talebi "Onayla — cari aç" ile onaylanır.
// Sunucu taklittir: talep listesi, yonetici_mi = true, hesap listesi boş; `cariler` POST'u ve onay çağrısı YAKALANIR (cari isteği
// 201 alır; onay "Cari bulunamadı" der — 22 uygulanmış sunucunun davranışı). Çıktı: isteğin başlıkları ve gövdesi (satırlar) — t22
// bunu gerçek PostgreSQL'de PostgREST'in yaptığı gibi (authenticated + JWT + istek başlıkları, merge-duplicates upsert) oynatır.
const fs = require("fs");
const path = require("path");
const TEST = path.join(__dirname, "../../../../test");
const { uygulamaAc, modulAc } = require(path.join(TEST, "ortak.js"));
const { TOHUM } = require(path.join(TEST, "tohum.js"));
const { bulutGirisRotasi, girisYap } = require(path.join(TEST, "giris-yardimci.js"));

const TALEP = {
  id: "t22-eski", olusturma: "2026-11-16T09:00:00+00:00", kullanici: "eski.firma",
  bilgiler: { unvan: "Eski İstemci Deri Ltd", yetkili: "Ayşe Kaya", telefon: "0532 111 22 33", eposta: "ayse@eski.test",
    vergiDairesi: "Kadıköy", vergiNo: "0010013108", ulke: "Türkiye", il: "İstanbul", ilce: "Kadıköy", adres: "Moda Cad. 1", not: "Acil" },
};

async function calistir(cikti) {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  t["tanimlar:data"] = JSON.stringify({ ...tanimlar, girisAktifMi: true, kullanicilar: [{ id: "k1", ad: "Mahmut", kullaniciAdi: "mahmut", rol: "Yönetici", yetkiler: {} }] });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  const yakalanan = { cariIstekleri: [], onayCagrilari: [] };
  await bulutGirisRotasi(sayfa);
  await sayfa.route("**/rest/v1/cariler*", (r) => {
    const q = r.request();
    if (q.method() === "POST") yakalanan.cariIstekleri.push({ yontem: q.method(), adres: q.url().split("/rest/v1/")[1], basliklar: { "x-atolye-surum": q.headers()["x-atolye-surum"] || null, prefer: q.headers().prefer || null }, govde: JSON.parse(q.postData() || "[]") });
    if (q.method() === "GET") return r.abort();
    r.fulfill({ status: 201, body: "" });
  });
  await sayfa.route("**/rest/v1/rpc/**", (r) => {
    const ad = r.request().url().split("/rpc/")[1].split("?")[0];
    const json = (v) => r.fulfill({ contentType: "application/json", body: JSON.stringify(v) });
    if (ad === "site_kayit_listesi") return json([TALEP]);
    if (ad === "yonetici_mi") return json(true);
    if (ad === "site_hesap_listesi") return json([]);
    if (ad === "site_kayit_onayla") { yakalanan.onayCagrilari.push(JSON.parse(r.request().postData() || "{}")); return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "P0001", message: "Cari bulunamadı" }) }); }
    return json(null);
  });
  await sayfa.waitForTimeout(2500);
  await girisYap(sayfa, "mahmut", "gizli123");
  await sayfa.waitForTimeout(800);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(1500);
  const tiklandi = await sayfa.evaluate(() => { const b = [...document.querySelectorAll('[data-site-kayit="eski.firma"] button')].find((x) => /Onayla/.test(x.textContent)); if (b) b.click(); return !!b; });
  await sayfa.waitForTimeout(6000);
  await tarayici.close();
  const sonuc = { paket: path.basename(process.env.TEST_HTML || ""), talep: TALEP, tiklandi, hatalar, ...yakalanan };
  fs.writeFileSync(cikti, JSON.stringify(sonuc, null, 1) + "\n");
  console.log(`${sonuc.paket}: onay tıklandı ${tiklandi} · cari isteği ${yakalanan.cariIstekleri.length} · onay çağrısı ${yakalanan.onayCagrilari.length} · sayfa hatası ${hatalar.length}`);
}

calistir(process.argv[2] || "eski-istemci.json");
