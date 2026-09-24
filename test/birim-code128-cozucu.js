// BİRİM TESTİ — CODE128 ÇÖZÜCÜ (kamerayla depoda okutma, 22 Eylül).
//
// Kameradaki gerçek koşullar sentetik olarak üretiliyor: etiket kendi kodlayıcımızla çiziliyor,
// sonra ölçek (modül 1.5-5 piksel), bulanıklık (odak), gürültü (sensör), gölge (bir yan koyu),
// ters tutma. İKİ ÖLÇÜT:
//   1) YANLIŞ OKUMA SIFIR — kontrol hanesi sayesinde; yanlış ürün göstermek okumamaktan kötü.
//   2) Makul koşullarda okuma oranı yüksek (kamera saniyede birkaç kare dener; tek karede %100
//      gerekmez, ama bulanık olmayan karede neredeyse her zaman okumalı).
const { code128Cubuklar, code128SatirdanCoz } = require("./erp.cjs");

let tohum = 12345;
const rastgele = () => { tohum = (tohum * 1103515245 + 12345) & 0x7fffffff; return tohum / 0x7fffffff; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rastgele(); while (!v) v = rastgele(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function satirUret(kod, { modul, bulanik, gurultu, golge, ters }) {
  const cubuklar = code128Cubuklar(kod);
  const kenar = 12 * modul;
  const genislik = Math.ceil(cubuklar.reduce((t, g) => t + g, 0) * modul + 2 * kenar);
  // Yüksek çözünürlükte ideal sinyal, sonra piksele örnekle.
  const alt = 8, N = genislik * alt;
  const ideal = new Float32Array(N).fill(1);
  let x = kenar * alt;
  cubuklar.forEach((g, i) => { const w = g * modul * alt; if (i % 2 === 0) for (let k = Math.round(x); k < Math.round(x + w); k++) ideal[k] = 0; x += w; });
  const p = new Float32Array(genislik);
  for (let i = 0; i < genislik; i++) { let t = 0; for (let k = 0; k < alt; k++) t += ideal[i * alt + k]; p[i] = t / alt; }
  // Bulanıklık: Gauss çekirdeği (sigma piksel).
  let b = p;
  if (bulanik > 0) {
    const r = Math.ceil(bulanik * 3), cek = [];
    for (let k = -r; k <= r; k++) cek.push(Math.exp(-(k * k) / (2 * bulanik * bulanik)));
    const ct = cek.reduce((a, c) => a + c, 0);
    b = new Float32Array(genislik);
    for (let i = 0; i < genislik; i++) { let t = 0; for (let k = -r; k <= r; k++) { const j = Math.min(genislik - 1, Math.max(0, i + k)); t += p[j] * cek[k + r]; } b[i] = t / ct; }
  }
  const sonuc = new Uint8Array(genislik);
  for (let i = 0; i < genislik; i++) {
    const isik = 1 - golge * (i / genislik);          // soldan sağa kararan ışık
    const v = (30 + b[i] * 200) * isik + gauss() * gurultu;
    sonuc[i] = Math.max(0, Math.min(255, Math.round(v)));
  }
  return ters ? sonuc.reverse() : sonuc;
}

const KODLAR = ["900003", "9000031021", "900003102104", "9000031021225", "900127000307", "901999099999"];
let hata = 0;
const bekle = (ad, kosul) => { console.log(`  ${kosul ? "✓" : "✗"} ${ad}`); if (!kosul) hata = 1; };

// 1) Temiz etiket, her uzunluk, iki yön.
let hepsi = true;
for (const k of KODLAR) for (const ters of [false, true]) {
  if (code128SatirdanCoz(satirUret(k, { modul: 3, bulanik: 0, gurultu: 0, golge: 0, ters })) !== k) hepsi = false;
}
bekle("temiz etiket: 4 seviye × 2 yön doğru okunuyor", hepsi);

// 2) Gerçekçi koşullar: rastgele ölçek/bulanıklık/gürültü/gölge. Okuma oranı ve YANLIŞ OKUMA.
function deneme(ad, aralik, adet, esikOran) {
  let dogru = 0, yanlis = 0;
  for (let i = 0; i < adet; i++) {
    const k = KODLAR[i % KODLAR.length];
    const o = {
      modul: aralik.modul[0] + rastgele() * (aralik.modul[1] - aralik.modul[0]),
      bulanik: aralik.bulanik[0] + rastgele() * (aralik.bulanik[1] - aralik.bulanik[0]),
      gurultu: aralik.gurultu, golge: rastgele() * aralik.golge, ters: rastgele() < 0.5,
    };
    const r = code128SatirdanCoz(satirUret(k, o));
    if (r === k) dogru++; else if (r !== null) yanlis++;
  }
  const oran = dogru / adet;
  bekle(`${ad}: okuma %${Math.round(oran * 100)} (en az %${Math.round(esikOran * 100)})`, oran >= esikOran);
  return yanlis;
}
let yanlisToplam = 0;
yanlisToplam += deneme("iyi kare (keskin, az gürültü)", { modul: [2, 5], bulanik: [0, 0.6], gurultu: 6, golge: 0.3 }, 600, 0.97);
yanlisToplam += deneme("orta kare (hafif bulanık, gölgeli)", { modul: [1.8, 4], bulanik: [0.5, 1.0], gurultu: 10, golge: 0.5 }, 600, 0.8);
yanlisToplam += deneme("kötü kare (bulanık, gürültülü)", { modul: [1.5, 3], bulanik: [1.0, 1.8], gurultu: 18, golge: 0.6 }, 600, 0.0);
bekle(`YANLIŞ OKUMA: ${yanlisToplam} (1800 karede) — sıfır olmalı`, yanlisToplam === 0);

// 3) Barkod olmayan kareler: boş, düz gürültü, rastgele çizgiler → hiçbiri kod üretmemeli.
let sahte = 0;
for (let i = 0; i < 2000; i++) {
  const n = 300 + Math.floor(rastgele() * 500);
  const p = new Uint8Array(n);
  let v = rastgele() < 0.5 ? 40 : 220;
  for (let x = 0; x < n; x++) { if (rastgele() < 0.15) v = v > 128 ? 40 : 220; p[x] = Math.max(0, Math.min(255, v + gauss() * 15)); }
  if (code128SatirdanCoz(p) !== null) sahte++;
}
bekle(`barkodsuz 2000 rastgele çizgi deseninden kod çıkmıyor (çıkan: ${sahte})`, sahte === 0);

console.log(hata ? "── CODE128 ÇÖZÜCÜ TESTİ BAŞARISIZ ──" : "── code128 çözücü testi temiz ──");
process.exit(hata);
