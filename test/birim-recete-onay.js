// BİRİM TESTİ — REÇETE ONAYI (v1.634.0)
// Kullanıcı: "mamul stok için reçete tam bitmeden üretim oluşturulamasın, reçete onay olsun, reçete onaysız üretim
// başlamasın". Ölçülen: tam reçete = her renk ve beden kapsanmış, miktar > 0, kırmızı (geçmişten) renk yok; onay imzayla
// saklanır, reçete/varyant değişince düşer ("degisti"/"eksik"); yalnız hammadde ADI değişince düşmez; kapı mesajı.
const { receteImzasi, receteEksikleri, receteOnayDurumu, uretimReceteKapisi } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const satir = (mamulRenk, mamulBeden, ek = {}) => ({ id: `r-${mamulRenk}-${mamulBeden}`, proses: "Kesim", hammaddeUrunId: "h1", hammaddeAd: "Deri",
  renk: "Siyah", beden: "", mamulRenk, mamulBeden, miktar: 2, birim: "desi", ...ek });
const urun = {
  id: "m1", ad: "Bot", kategori: "Mamul",
  variants: [{ renk: "Siyah", beden: "40" }, { renk: "Siyah", beden: "41" }, { renk: "Taba", beden: "40" }, { renk: "Taba", beden: "41" }],
  recete: [satir("Siyah", "Tüm Bedenler"), satir("Taba", "Tüm Bedenler")],
};
const stok = [urun, { id: "h1", ad: "Deri", kategori: "Hammadde" }];

bekle("tam reçete → eksik yok", receteEksikleri(urun, stok), []);
bekle("tam ama onaysız → onaysiz", receteOnayDurumu(urun, stok).durum, "onaysiz");
bekle("onaysız → kapı kapalı", /onaylanmadan/.test(uretimReceteKapisi(urun, stok) || ""), true);

const onayli = { ...urun, receteOnay: { imza: receteImzasi(urun), onaylayan: "Ali", tarih: "2026-10-10T10:00:00.000Z" } };
bekle("onaylı → onayli", receteOnayDurumu(onayli, stok).durum, "onayli");
bekle("onaylı → kapı açık", uretimReceteKapisi(onayli, stok), null);

bekle("hammadde adı değişince onay düşmez",
  receteOnayDurumu({ ...onayli, recete: onayli.recete.map((r) => ({ ...r, hammaddeAd: "Deri (yeni ad)" })) }, stok).durum, "onayli");
bekle("satır sırası değişince onay düşmez", receteOnayDurumu({ ...onayli, recete: onayli.recete.slice().reverse() }, stok).durum, "onayli");
bekle("miktar değişince → degisti",
  receteOnayDurumu({ ...onayli, recete: onayli.recete.map((r, i) => (i === 0 ? { ...r, miktar: 3 } : r)) }, stok).durum, "degisti");
const degisti = { ...onayli, recete: onayli.recete.map((r, i) => (i === 0 ? { ...r, miktar: 3 } : r)) };
bekle("değişti → kapı mesajı", /onaydan sonra değişti/.test(uretimReceteKapisi(degisti, stok) || ""), true);

const yeniRenk = { ...onayli, variants: [...urun.variants, { renk: "Bej", beden: "40" }] };
const yr = receteOnayDurumu(yeniRenk, stok);
bekle("yeni renk eklendi, reçetesi yok → eksik", yr.durum, "eksik");
bekle("eksik renk cümlesi", yr.eksikler, ["Deri (Kesim): Bej rengi tanımsız"]);

const bedenEksik = { ...urun, recete: [satir("Siyah", "40"), satir("Taba", "Tüm Bedenler")] };
bekle("beden eksik → cümle", receteEksikleri(bedenEksik, stok), ["Siyah · Deri (Kesim): 41 bedeni eksik"]);

bekle("miktarsız satır", receteEksikleri({ ...urun, recete: [satir("Siyah", "Tüm Bedenler", { miktar: 0 }), satir("Taba", "Tüm Bedenler")] }, stok),
  ["Miktarı girilmemiş satır: Deri (1 satır)"]);
bekle("kırmızı renk onaylanmamış", receteEksikleri({ ...urun, recete: [satir("Siyah", "Tüm Bedenler", { renkGecmisten: true }), satir("Taba", "Tüm Bedenler")] }, stok).length, 1);
bekle("kırmızı ✓ ile onaylanınca (renkOnayli) imza değişmez",
  receteImzasi({ ...urun, recete: [satir("Siyah", "Tüm Bedenler", { renkOnayli: true }), satir("Taba", "Tüm Bedenler")] }), receteImzasi(urun));
bekle("boş reçete", receteEksikleri({ ...urun, recete: [] }, stok), ["Reçetede hiç hammadde yok"]);
const eksikMesaj = uretimReceteKapisi({ ...urun, recete: [] }, stok);
bekle("eksik reçete kapı mesajı", eksikMesaj, "Bot: reçete tamamlanmadan üretim açılamaz — Reçetede hiç hammadde yok");
bekle("onay kaydı olsa da eksikse onaylı değil", receteOnayDurumu({ ...yeniRenk }, stok).durum, "eksik");

console.log(hata ? "── reçete onay testi BAŞARISIZ ──" : "── reçete onay testi temiz ──");
process.exit(hata);
