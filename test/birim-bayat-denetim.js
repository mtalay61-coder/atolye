// BİRİM TESTİ — DENETİM 18 (bayat okuma)
//
// Denetleyicinin kendisi de yanılabilir: gerçek hatayı kaçırırsa "temiz" yalan söyler, zararsızı
// yakalarsa muafiyet etiketi enflasyonu başlar ve kimse okumaz olur. Her kalıp burada küçük bir
// örnekle sabitleniyor: YAKALA listesi bulgu vermeli, GEÇ listesi vermemeli.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const DENETCI = path.join(__dirname, "..", "bayatdenetim.js");
let hata = 0;

function calistir(kod) {
  const f = path.join(os.tmpdir(), `bayat-${process.pid}-${Math.random().toString(36).slice(2)}.jsx`);
  fs.writeFileSync(f, kod);
  try {
    const out = execFileSync("node", [DENETCI, f], { encoding: "utf8", env: { ...process.env, SAYIM: "", BORCSUZ: "1" } });
    return { temiz: true, out };
  } catch (e) {
    return { temiz: false, out: String(e.stdout || "") };
  } finally { fs.unlinkSync(f); }
}
const bilesen = (govde) => `function Bilesen() {\n  const [stok, setStok] = useState([]);\n  const [liste, setListe] = useState([]);\n${govde}\n  return null;\n}\n`;

const YAKALA = {
  "A: set sonrası okuma": bilesen(`
  const f = () => { const yeni = [1]; setStok(yeni); kaydet(stok); };`),
  "A: hook'a d ile gelen state": `function useX(d) {
  const { stok, setStok } = d;
  const f = useCallback(() => { setStok([]); yaz(stok); }, [stok]);
}`,
  "A: iç içe callback'te okuma": bilesen(`
  const f = () => { setStok([]); [1].forEach(() => yaz(stok.length)); };`),
  "B: await sonrası okuma": bilesen(`
  const f = async () => { await bekle(); yaz(stok); };`),
  "B: try içindeki return hata yolunda atlanır": bilesen(`
  const f = async () => { try { await bekle(); return; } catch (e) { geriAl(stok); } };`),
  "B: catch'te geri alma": bilesen(`
  const f = async () => { const n = [1, ...stok]; setStok(n); try { await yaz(n); } catch (e) { setStok(stok); } };`),
  "C: useCallback dizisinde state yok": bilesen(`
  const f = useCallback(() => yaz(stok), []);`),
  "C: dizide olmayan başka useCallback (v1.406 hatası)": bilesen(`
  const iptal = useCallback((n) => yaz(stok, n), [stok]);
  const geriAl = useCallback(() => { ["a", "b"].forEach(iptal); }, [liste]);`),
  "C: hook'tan dönen fonksiyon": `function Bilesen() {
  const [stok, setStok] = useState([]);
  const { fisDefterindeIptal } = useFisDefteriYazma({ stok });
  const geriAl = useCallback(() => fisDefterindeIptal("x"), [stok]);
  return null;
}`,
  "C/efekt: zamanlayıcıda eski fonksiyon (bağlantı gelince veri kaybı)": bilesen(`
  const gonder = useCallback(() => yaz(stok), [stok]);
  useEffect(() => { const z = setInterval(() => gonder(), 60000); return () => clearInterval(z); }, [liste.length]);`),
  "C/efekt: saklanan onClick (başlık Kaydet)": bilesen(`
  function kaydet() { yaz(stok); }
  useEffect(() => { bildir([{ onClick: kaydet }]); }, [liste]);`),
  "C/efekt: await sonrası": bilesen(`
  useEffect(() => { (async () => { await bekle(); yaz(stok); })(); }, []);`),
  "T: bağımlılık dizisinde aşağıda tanımlı ad": bilesen(`
  const geriAl = useCallback(() => iptal(), [iptal]);
  const iptal = useCallback(() => yaz(stok), [stok]);`),
};

const GEC = {
  "C/efekt: senkron tetikleyici (bilinçli eksik)": bilesen(`
  useEffect(() => { if (!liste.length) return; yaz(stok.find((x) => x)); setStok([]); }, [liste]);`),
  "C/efekt: ref üzerinden güncel fonksiyon": bilesen(`
  function kaydet() { yaz(stok); }
  const kaydetRef = useRef(kaydet); kaydetRef.current = kaydet;
  useEffect(() => { const z = setInterval(() => kaydetRef.current(), 1000); return () => clearInterval(z); }, []);`),
  "C: tam bağımlılık": bilesen(`
  const f = useCallback(() => yaz(stok, liste), [stok, liste]);`),
  "C: setter, ref ve sabit ifade dizide aranmaz": bilesen(`
  const kutuRef = useRef(null);
  const SURE = 12 * 60 * 1000;
  const f = useCallback(() => { setStok([]); kutuRef.current = SURE; }, []);`),
  "C: modül düzeyi ad": `const GENEL = [1];
function Bilesen() { const f = useCallback(() => yaz(GENEL), []); return null; }`,
  "C: ölü koddaki okuma": bilesen(`
  const f = useCallback(() => { return; yaz(stok); }, []);`),
  "yeni değer değişkende": bilesen(`
  const f = () => { const yeni = stok.map((x) => x); setStok(yeni); kaydet(yeni); };`),
  "fonksiyonlu set": bilesen(`
  const f = async () => { await bekle(); setStok((o) => [...o, 1]); };`),
  "if / else dışlayan dallar": bilesen(`
  const f = (k) => { if (k) { setStok([]); } else { yaz(stok); } };`),
  "set sonrası return": bilesen(`
  const f = (k) => { if (k) { setStok([]); return; } yaz(stok); };`),
  "yerel gölge değişken": bilesen(`
  const f = () => { const stok = [9]; setStok(stok); yaz(stok); };`),
  "await ÖNCESİ okuma": bilesen(`
  const f = async () => { yaz(stok); await bekle(); };`),
  "ölü kod (return sonrası)": bilesen(`
  const f = async () => { await bekle(); return; yaz(stok); };`),
  "gerekçeli muafiyet": bilesen(`
  const f = () => { setStok([]); yaz(stok); // bayat-muaf: eski hal bilerek isteniyor
  };`),
  "setter'ın kendisi": bilesen(`
  const f = async () => { await bekle(); setListe([]); };`),
};

for (const [ad, kod] of Object.entries(YAKALA)) {
  const r = calistir(kod);
  const ok = !r.temiz;
  console.log(`  ${ok ? "✓" : "✗"} yakalar — ${ad}`);
  if (!ok) { hata = 1; console.log("    çıktı:", r.out.trim()); }
}
for (const [ad, kod] of Object.entries(GEC)) {
  const r = calistir(kod);
  console.log(`  ${r.temiz ? "✓" : "✗"} geçer — ${ad}`);
  if (!r.temiz) { hata = 1; console.log("    çıktı:", r.out.trim()); }
}
// Gerekçesiz muafiyet GEÇMEZ.
{
  const r = calistir(bilesen(`
  const f = () => { setStok([]); yaz(stok); // bayat-muaf:
  };`));
  console.log(`  ${!r.temiz ? "✓" : "✗"} gerekçesiz muafiyet geçmez`);
  if (r.temiz) hata = 1;
}
process.exit(hata);
