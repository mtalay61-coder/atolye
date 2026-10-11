// BİRİM TESTİ — ÇOKLU FİRMA (v1.642.0): kod sadeleştirme, gizli anahtar reddi, adres kuralı, bekleyen kayıt engeli,
// firma değişiminde firmaya özel anahtarların saklanıp geri konması.
const E = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };

bekle("kod: Türkçe harf + boşluk + büyük harf", E.firmaKoduNormal("  Öz Deri-Şükrü "), "ozderi-sukru");
bekle("adres: supabase.co kabul", E.firmaAdresiGecerli("https://abcdefghij12.supabase.co"), true);
bekle("adres: başka alan adı ret", E.firmaAdresiGecerli("https://abcdefghij12.supabase.co.kotu.com"), false);
bekle("adres: http ret", E.firmaAdresiGecerli("http://abcdefghij12.supabase.co"), false);
bekle("anahtar: publishable kabul", E.firmaAnahtariSorunu("sb_publishable_ABCDEFGHIJ_123"), null);
bekle("anahtar: secret ret", /GİZLİ/.test(E.firmaAnahtariSorunu("sb_secret_ABCDEFGHIJ") || ""), true);
const jwt = (rol) => ["e30", Buffer.from(JSON.stringify({ role: rol })).toString("base64url"), "imza"].join(".");
bekle("anahtar: eski anon JWT kabul", E.firmaAnahtariSorunu(jwt("anon")), null);
bekle("anahtar: service_role JWT ret", /service_role/.test(E.firmaAnahtariSorunu(jwt("service_role")) || ""), true);
bekle("ref", E.firmaRefi("https://abcdefghij12.supabase.co"), "abcdefghij12");

bekle("engel: bekleyen yok → serbest", E.firmaDegisimEngeli({}, {}), null);
bekle("engel: bekleyen yazma var → sebep", /gönderilmemiş 1 kayıt/.test(E.firmaDegisimEngeli({ "stok:items": {} }, {}) || ""), true);

// Sahte depo: değişim firmaya özel anahtarları saklar, seçimi yazar; geri dönüşte geri koyar.
const depo = (() => { const m = new Map(); return { m, getItem: (a) => (m.has(a) ? m.get(a) : null), setItem: (a, d) => m.set(a, String(d)), removeItem: (a) => m.delete(a) }; })();
depo.setItem("atolye:oturum", "ANA-OTURUM");
depo.setItem("firma:gorunum", "ANA-TEMA");
depo.setItem("gorunum:boyut", "CIHAZ");
const yeni = { kod: "Deneme", url: "https://abcdefghij12.supabase.co", anahtar: "sb_publishable_ABCDEFGHIJ_123" };
bekle("değişim oldu", E.firmaSeciminiDegistir(yeni, depo), true);
bekle("seçim yazıldı (kod sade)", JSON.parse(depo.getItem("firma:secim")), { kod: "deneme", url: yeni.url, anahtar: yeni.anahtar });
bekle("ana firmanın oturumu saklandı, ortada kalmadı", { ortada: depo.getItem("atolye:oturum"), sakli: JSON.parse(depo.getItem("firma:sakli:mqdgucoomgqcvhvgixbl")) },
  { ortada: null, sakli: { "atolye:oturum": "ANA-OTURUM", "firma:gorunum": "ANA-TEMA" } });
bekle("cihaz ayarı yerinde", depo.getItem("gorunum:boyut"), "CIHAZ");
bekle("gizli anahtarla değişim reddedilir", (() => { try { E.firmaSeciminiDegistir({ ...yeni, anahtar: "sb_secret_XXXXXXXXXXXX" }, depo); return "geçti"; } catch (e) { return "ret"; } })(), "ret");
process.exit(hata);
