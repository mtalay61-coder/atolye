// BİRİM TESTİ — DEMO FİRMA ÖRNEK VERİSİ (v1.645.0): tutarlı olmalı — stokta açıklanamayan miktar yok (açılış fişi),
// reçete/sipariş/cari bağları gerçek kayıtlara gidiyor, renk ve bedenler tanımlarda var.
const E = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const v = E.demoVerisi("2026-10-11");
const stok = v["stok:items"], t = v["tanimlar:data"], cariler = v["cari:data"], sip = v["siparis:data"];
bekle("anahtarlar", Object.keys(v).sort(), ["cari:data", "cop:data", "muhasebe:data", "onaylar:data", "siparis:data", "stok:items", "stokrez:data", "tanimlar:data", "teklif:data", "uretim:siparisler"]);   // teklif: v1.715.0
bekle("stokta hareket karşılığı olmayan miktar yok", E.acilisAcigi(stok), []);
bekle("her ürünün açılış fişi var", stok.every((u) => (u.hareketler || []).length > 0 && u.hareketler.every((h) => /^ACL-DEMO-\d+$/.test(h.fisNo) && h.kaynak === "Açılış")), true);
const idler = new Set(stok.map((u) => u.id));
bekle("reçete hammaddeleri var", stok.flatMap((u) => u.recete || []).every((r) => idler.has(r.hammaddeUrunId)), true);
bekle("sipariş ürünleri var", sip.flatMap((s) => s.kalemler).every((k) => idler.has(k.urunId)), true);
bekle("sipariş carileri var", sip.every((s) => cariler.some((c) => c.id === s.cariId)), true);
const renkler = new Set(t.renkler.map((r) => r.ad)), bedenler = new Set(t.bedenler.map((b) => b.ad));
bekle("varyant renkleri tanımlı", stok.flatMap((u) => u.variants).every((x) => renkler.has(x.renk)), true);
bekle("varyant bedenleri tanımlı (ya da bedensiz)", stok.flatMap((u) => u.variants).every((x) => x.beden === "" || bedenler.has(x.beden)), true);
bekle("giriş kapalı, kurulum tamam (sihirbaz açılmaz)", [t.girisAktifMi, t.kurulumTamamlandi], [false, true]);
bekle("renk kodları tekil", new Set(t.renkler.map((r) => r.kod)).size, t.renkler.length);
process.exit(hata);
