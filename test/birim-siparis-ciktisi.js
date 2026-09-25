// BİRİM TESTİ — SİPARİŞ ÇIKTISI + WHATSAPP (kullanıcı, 13 Eylül).
const { whatsappNumarasi, siparisMetinOzeti, siparisWhatsappBaglantisi, siparisCiktisiHTML } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};
console.log("numara normalize");
bekle("05xx → 905xx", whatsappNumarasi("0532 123 45 67"), "905321234567");
bekle("5xx → 905xx", whatsappNumarasi("532-123-4567"), "905321234567");
bekle("+90 korunur", whatsappNumarasi("+90 532 123 45 67"), "905321234567");
bekle("00 90 korunur", whatsappNumarasi("0090 532 123 45 67"), "905321234567");
bekle("boş → boş", whatsappNumarasi(""), "");

const siparis = { id: "s1", siparisNo: "SAT-1002", tip: "Satış", tarih: "2026-09-12T11:53:00.000Z", teslimTarihi: "2026-09-20", not: "Acele", kalemler: [
  { urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, birim: "çift", birimFiyat: 25, paraBirimi: "USD" },
  { urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 6, birim: "çift", birimFiyat: 25, paraBirimi: "USD" },
  { urunAd: "Bot", renk: "Taba", beden: "41", miktar: 3, birim: "çift", birimFiyat: 27, paraBirimi: "USD" },
] };
const cari = { id: "c2", unvan: "Serdar Özemen", telefon: "0212 000 00 00", whatsapp: "0532 123 45 67", adres: "İstanbul" };

console.log("özet metni ve bağlantı");
const ozet = siparisMetinOzeti(siparis, cari);
bekle("başlık, cari, matris satırları", ozet.split("\n").slice(0, 6), ["*SİPARİŞ SAT-1002*", "Serdar Özemen", "Tarih: 2026-09-12 · Teslim: 2026-09-20", "", "• Bot · Siyah", "  41:10  42:6  = 16 çift"]);
bekle("toplam ve not", ozet.split("\n").slice(-2), ["Toplam: 19 çift", "Not: Acele"]);
bekle("WhatsApp önce whatsapp numarası", siparisWhatsappBaglantisi(siparis, cari).startsWith("https://wa.me/905321234567?text="), true);
bekle("whatsapp yoksa telefon", siparisWhatsappBaglantisi(siparis, { ...cari, whatsapp: "" }).startsWith("https://wa.me/902120000000?text="), true);
bekle("numara yoksa numarasız bağlantı", siparisWhatsappBaglantisi(siparis, {}).startsWith("https://wa.me/?text="), true);

console.log("çıktı HTML (matris)");
const html = siparisCiktisiHTML(siparis, cari, { unvan: "Atölye A.Ş." }, []);
bekle("firma, sipariş no, cari", [/Atölye A\.Ş\./.test(html), /SAT-1002/.test(html), /Serdar Özemen/.test(html)], [true, true, true]);
bekle("beden sütunları", (html.match(/<th class="mono" style="text-align:center">(\d+)<\/th>/g) || []).length, 2);
bekle("ürün+renk satırı (2 grup)", (html.match(/<tr style="border-bottom:1px solid #ddd">/g) || []).length, 2);
bekle("toplam adet", /<td class="mono" style="text-align:right;border-left:1px dashed #999">19<\/td>/.test(html), true);
bekle("tutar dolar (400 + 81 = 481)", /400 \$/.test(html) && /81 \$/.test(html) && /481 \$/.test(html), true);
bekle("HTML kaçışı", /<script>/.test(siparisCiktisiHTML({ ...siparis, not: "<script>" }, cari, {}, [])), false);
console.log(hata ? "\n\u2500\u2500 S\u0130PAR\u0130\u015e \u00c7IKTISI TEST\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 sipari\u015f \u00e7\u0131kt\u0131s\u0131 testi temiz \u2500\u2500");
process.exit(hata);
