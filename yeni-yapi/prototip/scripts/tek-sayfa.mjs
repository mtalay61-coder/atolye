// Derlenen prototipi tek HTML dosyasında toplar (dist/onizleme.html): claude.ai önizlemesi ve dosyayı
// doğrudan açmak için. GitHub Pages'e geçince dist/ klasörü olduğu gibi yayınlanır, bu dosya gerekmez.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");
const html = readFileSync(join(dist, "index.html"), "utf8");
const oku = (yol) => readFileSync(join(dist, yol.replace(/^\.\//, "")), "utf8");
const guvenli = (s, etiket) => s.replace(new RegExp(`</${etiket}`, "gi"), `<\\/${etiket}`).replace(/<!--/g, "<\\!--");

const stiller = [...html.matchAll(/<link rel="stylesheet"[^>]*href="(\.\/[^"]+)"[^>]*>/g)].map((m) => oku(m[1]));
const klasik = [...html.matchAll(/<script src="(\.\/[^"]+)"><\/script>/g)].map((m) => oku(m[1]));
const moduller = [...html.matchAll(/<script type="module"[^>]*src="(\.\/[^"]+)"[^>]*><\/script>/g)].map((m) => oku(m[1]));
const baslik = (html.match(/<title>(.*?)<\/title>/) || [])[1] || "Atölye Prototip";

const sayfa = `<title>${baslik}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&display=swap">
<style>
${stiller.map((s) => guvenli(s, "style")).join("\n")}
</style>
<div id="kok"></div>
${klasik.map((s) => `<script>\n${guvenli(s, "script")}\n</script>`).join("\n")}
${moduller.map((s) => `<script type="module">\n${guvenli(s, "script")}\n</script>`).join("\n")}
`;
writeFileSync(join(dist, "onizleme.html"), sayfa);
console.log(`dist/onizleme.html: ${(sayfa.length / 1024).toFixed(0)} KB (${stiller.length} stil, ${klasik.length + moduller.length} betik)`);
