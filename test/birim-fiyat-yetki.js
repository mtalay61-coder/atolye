// BİRİM TESTİ — FİYAT ALANI YETKİSİ (v1.744.42, 094 fiyatAlanYetkileri / fiyatDegisiklikleriniSuz / cariFiyatGrubuSuz; inceleme 25 B3a-2).
// Kullanıcı (27 Kasım): "Stok personeli fiyat değiştiremese de ürünün yetkili olduğu diğer alanlarını kaydedebilsin. İstemci,
// değiştirmediği fiyat alanlarını gönderdi diye kayıt reddedilmesin; sunucu gerçek alan değişikliğini denetlesin."
const { fiyatAlanYetkileri, fiyatDegisiklikleriniSuz, cariFiyatGrubuSuz } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\n    çıkan:   ", JSON.stringify(a)); } };
const T = { girisAktifMi: true, kullanicilar: [
  { id: "stok", rol: "Personel", yetkiler: { stok: { goruntuleme: true, duzenleme: true, kaydetme: true } } },
  { id: "satis", rol: "Personel", yetkiler: { siparis: { goruntuleme: true, duzenleme: true } } },
  { id: "muh", rol: "Personel", yetkiler: { muhasebe: { duzenleme: true } } },
  { id: "carisatis", rol: "Personel", yetkiler: { siparis: { duzenleme: true }, cari: { duzenleme: true } } },
  { id: "yon", rol: "Yönetici" }] };
const kim = (id) => T.kullanicilar.find((k) => k.id === id);
console.log("1) yetkiler");
bekle("stok personeli: hiçbiri", fiyatAlanYetkileri(T, kim("stok")), { satis: false, alis: false, cariFiyatGrubu: false });
bekle("satış: yalnız satış", fiyatAlanYetkileri(T, kim("satis")), { satis: true, alis: false, cariFiyatGrubu: false });
bekle("muhasebe: yalnız alış", fiyatAlanYetkileri(T, kim("muh")), { satis: false, alis: true, cariFiyatGrubu: false });
bekle("cari + satış düzenleme: fiyat grubu da", fiyatAlanYetkileri(T, kim("carisatis")), { satis: true, alis: false, cariFiyatGrubu: true });
bekle("Yönetici: hepsi", fiyatAlanYetkileri(T, kim("yon")), { satis: true, alis: true, cariFiyatGrubu: true });
bekle("giriş sistemi kapalı: hepsi", fiyatAlanYetkileri({ girisAktifMi: false }, null), { satis: true, alis: true, cariFiyatGrubu: true });
bekle("yetki GÜNCEL kayıttan (oturumdaki eski nesne değil)", fiyatAlanYetkileri(T, { id: "satis", rol: "Personel", yetkiler: {} }).satis, true);

console.log("2) ürün süzgeci");
const KS = { tip: "Satış", kapsam: "fiyatGrubu", deger: "g1", fiyat: 100 }, KA = { tip: "Alış", kapsam: "renk", deger: "Siyah", fiyat: 40 };
const eski = [{ id: "u1", ad: "Bot", satisFiyati: 200, satisParaBirimi: "₺", alisFiyati: 80, alisParaBirimi: "₺", fiyatKurallari: [KS, KA] }, { id: "u2", ad: "Terlik", satisFiyati: 50, alisFiyati: 20, fiyatKurallari: [] }];
const yeni = (d) => eski.map((u) => (u.id === "u1" ? { ...u, ...d } : u));
const HIC = { satis: false, alis: false };
let r = fiyatDegisiklikleriniSuz(eski, yeni({ ad: "Yeni Bot" }), HIC);
bekle("yalnız ad değişti: dokunulmaz (aynı dizi), geri alınan 0", [r.geriAlinan, r.liste[0].ad], [0, "Yeni Bot"]);
const y2 = yeni({ ad: "Yeni Bot", satisFiyati: 999, alisFiyati: 1 });
r = fiyatDegisiklikleriniSuz(eski, y2, HIC);
bekle("ad + iki fiyat: ad kalır, fiyatlar eskiye döner", [r.liste[0].ad, r.liste[0].satisFiyati, r.liste[0].alisFiyati, r.satis, r.alis], ["Yeni Bot", 200, 80, 1, 1]);
bekle("öteki ürün nesnesi aynen", r.liste[1] === y2[1], true);
r = fiyatDegisiklikleriniSuz(eski, y2, { satis: true, alis: false });
bekle("satış yetkili: satış yazılır, alış döner", [r.liste[0].satisFiyati, r.liste[0].alisFiyati, r.satis, r.alis], [999, 80, 0, 1]);
r = fiyatDegisiklikleriniSuz(eski, y2, { satis: true, alis: true });
bekle("iki yetki: aynı dizi", r.liste === y2, true);
r = fiyatDegisiklikleriniSuz(eski, yeni({ fiyatKurallari: [{ ...KS, fiyat: 150 }, { ...KA, fiyat: 10 }] }), { satis: true, alis: false });
bekle("kural: satış kuralı yazılır, alış kuralı eskiye döner", r.liste[0].fiyatKurallari.map((k) => `${k.tip}:${k.fiyat}`).sort(), ["Alış:40", "Satış:150"]);
r = fiyatDegisiklikleriniSuz(eski, yeni({ fiyatKurallari: [KA] }), HIC);
bekle("kural silme (satış) yetkisiz: geri gelir", r.liste[0].fiyatKurallari.map((k) => k.tip).sort(), ["Alış", "Satış"]);
r = fiyatDegisiklikleriniSuz(eski, yeni({ satisFiyati: "200" }), HIC);
bekle("aynı fiyatın metin hâli (form) değişiklik sayılmaz", r.geriAlinan, 0);
r = fiyatDegisiklikleriniSuz(eski, [...eski, { id: "u3", ad: "Yeni", satisFiyati: 300, alisFiyati: 0, satisParaBirimi: "₺", fiyatKurallari: [] }], HIC);
bekle("yeni ürün fiyatlı: ürün eklenir, fiyat 0", [r.liste.length, r.liste[2].ad, r.liste[2].satisFiyati, r.satis], [3, "Yeni", 0, 1]);
r = fiyatDegisiklikleriniSuz(eski, [...eski, { id: "u4", ad: "Fiyatsız", satisFiyati: 0, alisFiyati: 0, satisParaBirimi: "₺", fiyatKurallari: [] }], HIC);
bekle("yeni ürün fiyatsız: dokunulmaz", r.geriAlinan, 0);

console.log("3) cari fiyat grubu");
const c0 = [{ id: "c1", unvan: "A", fiyatGrubuId: "g1" }, { id: "c2", unvan: "B" }];
let c = cariFiyatGrubuSuz(c0, [{ ...c0[0], unvan: "A2", fiyatGrubuId: "g2" }, c0[1]], false);
bekle("yetkisiz: grup eskiye döner, unvan kalır", [c.liste[0].unvan, c.liste[0].fiyatGrubuId, c.geriAlinan], ["A2", "g1", 1]);
c = cariFiyatGrubuSuz(c0, [{ ...c0[0], fiyatGrubuId: "g2" }, c0[1]], true);
bekle("yetkili: yazılır", [c.liste[0].fiyatGrubuId, c.geriAlinan], ["g2", 0]);
c = cariFiyatGrubuSuz(c0, [...c0, { id: "c3", unvan: "Yeni", fiyatGrubuId: "g1" }], false);
bekle("yeni cari gruplu, yetkisiz: grup boş", [c.liste[2].fiyatGrubuId, c.geriAlinan], ["", 1]);
c = cariFiyatGrubuSuz(c0, [{ ...c0[0], unvan: "A3" }, c0[1]], false);
bekle("grup değişmedi: dokunulmaz", c.geriAlinan, 0);
process.exit(hata);
