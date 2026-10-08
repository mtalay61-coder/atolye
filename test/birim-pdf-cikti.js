// BİRİM TESTİ — PDF ÇIKTI BELGESİ (v1.616.0)
// Kullanıcı: "PDF'te yazılar iç içe geçiyor." Sebep `html { zoom }` (Boyut ayarı) + uygulamanın genel th kuralı; PDF gövdesi
// artık ayrı belgede, kendi sabit stiliyle çiziliyor. Ölçülen: belge tam bir HTML (doctype + charset), zoom 1'e sabit,
// harf/kelime aralığı normal, th büyük harfe çevrilmiyor, gövde aynen içeride, A4 genişliği 794 px.
const { pdfCiktiBelgesi } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const b = pdfCiktiBelgesi('<div id="govde">New Diamond · SAT-1009</div>');
bekle("tam belge", [/^<!doctype html>/i.test(b), /<meta charset="utf-8">/.test(b)], [true, true]);
bekle("zoom 1 ve metin ölçeği sabit", [/zoom:1/.test(b), /text-size-adjust:100%/.test(b)], [true, true]);
bekle("aralıklar normal, th dönüşümsüz", [/letter-spacing:normal/.test(b), /word-spacing:normal/.test(b), /th,td\{[^}]*text-transform:none/.test(b)], [true, true, true]);
bekle("gövde içeride, genişlik 794", [b.includes('<div id="govde">New Diamond · SAT-1009</div>'), /width:794px/.test(b)], [true, true]);
process.exit(hata);
