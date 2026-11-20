// Sayfanın saf denetim kodunu sema.json üzerinde çalıştırır: node yeni-yapi/denetle.js yeni-yapi/sema.html yeni-yapi/sema.json [boz]
const fs = require("fs"); const vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const js = html.split("<script>")[1].split("</script>")[0];
const saf = js.split("// ===================== Ekran: özet")[0];
const ctx = { document: { querySelector: () => ({}) }, localStorage: { getItem() { throw 0; }, setItem() { throw 0; } }, console };
vm.createContext(ctx);
vm.runInContext(saf + "\nthis.denetle=denetle;this.seviyeler=seviyeler;this.S=S;", ctx);
const sema = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const s = {};
for (const k of ["moduller", "tablolar", "baglar", "belgeler", "kararlar", "kilavuz"]) s[k] = new Map(Object.entries(sema[k]));
ctx.S.moduller = s.moduller; ctx.S.tablolar = s.tablolar; ctx.S.baglar = s.baglar; ctx.S.belgeler = s.belgeler; ctx.S.kararlar = s.kararlar; ctx.S.kilavuz = s.kilavuz;
const P = ctx.denetle(s);
console.log("bulgu:", P.length);
P.forEach((p) => console.log(p.seviye, p.kural, p.mesaj));
const sv = ctx.seviyeler(s);
console.log([...sv].map(([id, l]) => s.moduller.get(id).kod + ":" + l).join(" "));
// Kurgusal bozma: döngü ve defter sahibi
if (process.argv[4] === "boz") {
  s.baglar.set("x1", { kimden: "m-sip", kime: "m-urn", tur: "bagimli" });
  s.tablolar.set("x2", { ad: "stok_hareket2", tur: "defter", sahip: "m-dep" });
  s.moduller.set("m-urt", { ...s.moduller.get("m-urt"), durum: "yaziliyor" });
  s.moduller.set("m-pln", { ...s.moduller.get("m-pln"), faz: 3 });
  s.kilavuz.set("x3", { baslik: "Yanlış", modul: "m-sip", adimlar: [], belgeler: ["b-sat"] });
  s.moduller.set("m-tan", { ...s.moduller.get("m-tan"), durum: "bitti" });
  s.kilavuz.delete("kl-03");
  ctx.denetle(s).forEach((p) => console.log("BOZ", p.seviye, p.kural, p.mesaj));
}
