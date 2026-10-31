// SENARYO — KURULUM SİHİRBAZI (v1.644.0): boş firmada açılır; firma unvanı zorunlu; ölçü/renk şablonu + ek (proses SORULMAZ, v1.742.1);
// KDV; bitirince tanımlara yazılır ve bir daha açılmaz. Veri taşıyan firmada hiç açılmaz; "Atla" yalnız işaret koyar.
const { uygulamaAc, depoOku, bekle } = require("./ortak.js");
const bos = { "tanimlar:data": JSON.stringify({ girisAktifMi: false }) };

(async () => {
  const sonuc = { hatalar: [] };
  {
    const { tarayici, sayfa } = await uygulamaAc(bos, { hataYaz: false, kurulumSihirbazi: true });
    sayfa.on("pageerror", (e) => sonuc.hatalar.push(e.message.split("\n")[0]));
    await bekle(800);
    const adim = () => sayfa.evaluate(() => (document.querySelector("[data-kurulum-adim]") || {}).getAttribute?.("data-kurulum-adim") || null);
    sonuc.acildi = await adim();
    sonuc.unvansizIleriKapali = await sayfa.evaluate(() => !!document.querySelector("[data-kurulum-ileri]").disabled);
    await sayfa.fill('[data-kurulum-alan="unvan"]', "Öz Deri Ayakkabı");
    await sayfa.fill('[data-kurulum-alan="vergiDairesi"]', "Merter");
    await sayfa.click("[data-kurulum-ileri]");
    await sayfa.click('[data-kurulum-cip="olcu-erkek"]');
    await sayfa.fill("[data-kurulum-olcu-ek]", "47");
    sonuc.olcuOzet = await sayfa.evaluate(() => document.querySelector("[data-kurulum-olcu-ozet]").textContent);
    await sayfa.click("[data-kurulum-ileri]");
    await sayfa.click('[data-kurulum-cip="renk-Taba"]');   // varsayılan seçiliydi → çıkar
    await sayfa.click('[data-kurulum-cip="renk-Lacivert"]');
    await sayfa.fill("[data-kurulum-renk-ek]", "Pudra");
    await sayfa.click("[data-kurulum-ileri]");
    await sayfa.click("[data-kurulum-kdv]");
    sonuc.ozet = await sayfa.evaluate(() => document.querySelector("[data-kurulum-ozet]").innerText.split("\n"));
    await sayfa.click("[data-kurulum-bitir]");
    await bekle(800);
    const t = await depoOku(sayfa, "tanimlar:data");
    sonuc.yazilan = {
      unvan: t.firmaBilgileri.unvan, vergiDairesi: t.firmaBilgileri.vergiDairesi, kdvAktif: t.firmaBilgileri.kdvAktif,
      olculer: (t.bedenler || []).map((b) => b.ad), renkler: (t.renkler || []).map((r) => `${r.ad}:${r.kod}`),
      prosesler: (t.prosesler || []).map((p) => `${p.ad}:${p.baslangicNo}`), tamam: t.kurulumTamamlandi,
    };
    sonuc.kapandi = await sayfa.evaluate(() => !document.querySelector("[data-kurulum-sihirbazi]"));
    await tarayici.close();
  }
  // Veri taşıyan firmada açılmaz.
  {
    const dolu = { ...bos, "stok:items": JSON.stringify([{ id: "u1", ad: "Bot", kategori: "Mamul", variants: [] }]) };
    const { tarayici, sayfa } = await uygulamaAc(dolu, { hataYaz: false, kurulumSihirbazi: true });
    await bekle(800);
    sonuc.doluFirmadaYok = await sayfa.evaluate(() => !document.querySelector("[data-kurulum-sihirbazi]"));
    await tarayici.close();
  }
  // Atla: yalnız işaret; tanım eklenmez.
  {
    const { tarayici, sayfa } = await uygulamaAc(bos, { hataYaz: false, kurulumSihirbazi: true });
    await bekle(800);
    await sayfa.click("[data-kurulum-atla]");
    await bekle(600);
    const t = await depoOku(sayfa, "tanimlar:data");
    sonuc.atla = { tamam: t.kurulumTamamlandi, renk: (t.renkler || []).length, kapandi: await sayfa.evaluate(() => !document.querySelector("[data-kurulum-sihirbazi]")) };
    await tarayici.close();
  }
  console.log(JSON.stringify(sonuc, null, 1));
})();
