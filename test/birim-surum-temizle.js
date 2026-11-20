// BİRİM — surum-temizle.sh (17 Kasım, v1.744.25): "son 3" temizliği surum.json'un gösterdiği YAYINDAKİ dosyayı asla silmez.
// Olay: yayınlanmamış 1.744.23/24/25 birikince 1.744.25 derlemesi yayındaki 1.744.22'yi `git rm` etti (main'e girseydi uygulama
// açılmazdı). Her durum geçici bir git deposunda gerçek betikle koşulur.
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");
const BETIK = path.join(__dirname, "..", "surum-temizle.sh");
let gecti = 0, kaldi = 0;
const k = (ad, gercek, beklenen) => {
  const ok = JSON.stringify(gercek) === JSON.stringify(beklenen);
  ok ? gecti++ : kaldi++;
  console.log(`  ${ok ? "✓" : "✗"} ${ad}${ok ? "" : ` · ${JSON.stringify(gercek)} · beklenen ${JSON.stringify(beklenen)}`}`);
};
function depo(surumler, surumJson) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "surum-temizle-"));
  const g = (...a) => execFileSync("git", a, { cwd: d, stdio: "pipe" });
  g("init", "-q"); g("config", "user.email", "t@t"); g("config", "user.name", "t");
  for (const s of surumler) fs.writeFileSync(path.join(d, `atolye-erp-v${s}.html`), s);
  if (surumJson !== undefined) fs.writeFileSync(path.join(d, "surum.json"), surumJson);
  g("add", "-A"); g("commit", "-q", "-m", "ilk");
  return d;
}
const kos = (d, cikti) => spawnSync(BETIK, [cikti, d, "3"], { encoding: "utf8" });
const kalan = (d) => fs.readdirSync(d).filter((f) => f.startsWith("atolye-erp-v")).map((f) => f.slice(12, -5)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const sj = (s) => JSON.stringify({ surum: s, url: `atolye-erp-v${s}.html`, not: "" });

console.log("1) bugünkü olay: yayında 1.744.22, yayınlanmamış 23/24/25");
{ const d = depo(["1.744.21", "1.744.22", "1.744.23", "1.744.24", "1.744.25"], sj("1.744.22")); const r = kos(d, "atolye-erp-v1.744.25.html");
  k("çıkış 0", r.status, 0); k("yayındaki 1.744.22 kaldı, son 3 kaldı, yalnız 21 silindi", kalan(d), ["1.744.22", "1.744.23", "1.744.24", "1.744.25"]);
  k("silme git'e işlendi (staged D)", execFileSync("git", ["status", "--short"], { cwd: d, encoding: "utf8" }).trim(), "D  atolye-erp-v1.744.21.html"); }
console.log("2) olağan: yayındaki en yenilerden biri");
{ const d = depo(["1.700.0", "1.744.20", "1.744.21", "1.744.22"], sj("1.744.22")); const r = kos(d, "atolye-erp-v1.744.22.html");
  k("çıkış 0", r.status, 0); k("son 3 kaldı", kalan(d), ["1.744.20", "1.744.21", "1.744.22"]); }
console.log("3) sort -V: 1.744.9 < 1.744.10");
{ const d = depo(["1.744.9", "1.744.10", "1.744.11", "1.744.12"], sj("1.744.12")); kos(d, "atolye-erp-v1.744.12.html");
  k("en eski (1.744.9) silindi", kalan(d), ["1.744.10", "1.744.11", "1.744.12"]); }
console.log("4) surum.json yok / bozuk / url geçersiz → hiçbir şey silinmez");
for (const [ad, icerik] of [["yok", undefined], ["bozuk JSON", "{surum:"], ["url boş", JSON.stringify({ surum: "1" })], ["url başka dosya", JSON.stringify({ url: "../index.html" })]]) {
  const d = depo(["1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0"], icerik); const r = kos(d, "atolye-erp-v1.5.0.html");
  k(`${ad}: çıkış 0, atlandı`, [r.status, /ATLANDI/.test(r.stdout)], [0, true]); k(`${ad}: 5 dosya duruyor`, kalan(d).length, 5);
}
console.log("5) yayındaki dosya diskte yok → DUR (çıkış 1)");
{ const d = depo(["1.1.0", "1.2.0", "1.3.0"], sj("1.0.0")); const r = kos(d, "atolye-erp-v1.3.0.html");
  k("çıkış 1 ve DUR iletisi", [r.status, /DUR: yayındaki/.test(r.stdout)], [1, true]); }
console.log("6) yap.sh temizliği bu betikle yapıyor (doğrudan silme kalmadı)");
{ const y = fs.readFileSync(path.join(__dirname, "..", "yap.sh"), "utf8");
  k("yap.sh surum-temizle.sh'ı çağırıyor ve başarısızlıkta duruyor", /\.\/surum-temizle\.sh "\$CIKTI" \. 3 \|\| exit 1/.test(y), true);
  k("yap.sh'ta başka 'git rm' yok", /git rm/.test(y), false); }
console.log(`── surum-temizle: ${gecti} geçti, ${kaldi} kaldı ──`);
process.exit(kaldi ? 1 : 0);
