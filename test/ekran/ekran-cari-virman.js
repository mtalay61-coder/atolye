#!/usr/bin/env node
// EKRAN SINAMASI — CARİ VİRMANI GERÇEK SUNUCUYA KARŞI (23 Kasım, v1.744.36). Uygulama EKRANDAN, gerçek yerel PostgreSQL'e karşı
// (gercek-pg-kopru; fis_kes → fis_tek_kes → car_yaz, fis_iptal gerçek). Supabase'e bağlanmaz. Kullanıcı: "Son incelemede cari
// virmanının gerçek sunucuya gönderdiği iki satırın yönünü, para birimini ve tek işlemde kaydedilip iptal edildiğini kontrol et."
// Başlangıç (bu dosya kurar, tekrar çalıştırmak zararsız): Ekran Alıcı (ekr-alici, TRY), Ekran Satıcı (ekr-satici, TRY);
// kurulum.sql'in Ekran Müşteri'si (ekr-musteri, USD).
// Ölçülen (SUNUCU = car_hareket / stk_fis / kas_hareket satırları; EKRAN = yerel kayıt ve bildirim):
//   1. Ödeme + Cari virmanı 1.000 (Alıcı → karşı Satıcı): TEK stk_fis (tür "Cari virmanı", CVR-…, başlık carisi Alıcı); İKİ
//      car_hareket: Alıcı Borç 1.000 TRY, Satıcı Alacak 1.000 TRY, ikisi aynı fis_no, ödeme şekli Virman, ek.islemTipi Ödeme /
//      Tahsilat; o fişe bağlı kas_hareket YOK; sunucu bakiyesi Alıcı +1.000, Satıcı −1.000
//   2. TEK İŞLEM: fis_kes isteği yolda bozulur (İKİNCİ satırın tutarı NaN) → sunucu reddeder; İLK satır da yazılmaz, fiş
//      açılmaz (car_hareket / stk_fis sayısı aynı); ekranda "kaydedilemedi", yerelde satır yok
//   3. Tahsilat + Cari virmanı 250 (Satıcı → karşı Alıcı): Satıcı Alacak 250, Alıcı Borç 250, tek fiş
//   4. Farklı para birimi (Alıcı TRY → Ekran Müşteri USD): ekranda ret, sunucuya fiş gitmez
//   5. İptal (bildirimdeki Geri al, 3'teki fiş): fis_iptal → stk_fis.iptal VE o fişin İKİ car_hareket satırı iptal; 1'deki fiş
//      geçerli; bakiyeler 1'deki hâle döner
//   6. Sayfa yenilendi: sunucudan gelen yerel kayıtta geçerli virman satırları (yön, para birimi, Virman, islemTipi) aynı, iptal
//      edilenler yok
//   7. YETKİ (23 Kasım, kullanıcı: "Yönetici işleminin geçtiğini, virman yetkisi olmayan kullanıcının kayıt yapamadığını ve
//      reddedilen işlemde iki caride de hiçbir hareket kalmadığını doğrula. Gerçek giriş yetkisini taklit eden test kullan; SQL
//      Editor yetkisiyle başarıyı kullanıcı başarısı sayma."). Ayrı "virman yetkisi" yok: car_yaz, cari / fisler / muhasebe /
//      siparis / uretim / stok / tanimlar modüllerinden BİRİNDE "kaydetme" ister (rls-yazma.sql yetki_var_mi; Yönetici her zaman).
//      Bütün denemeler köprüden JWT'li `authenticated` rolüyle (Supabase'teki oturumlu istek gibi; SQL Editor / postgres DEĞİL —
//      stk_yetki jetonsuz çağrıyı denetlemez, o yüzden bu ayrım şart). Yönetici = Ali (1 ve 3).
//      7a. Veli (yalnız stok görüntüleme): uygulamanın 1'de gönderdiği fis_kes isteğinin AYNISI (yeni istek / satır kimliği), Veli'nin
//          jetonuyla → 42501, fiş açılmaz, iki carinin satır sayısı ve bakiyesi değişmez
//      7b. Deniz (cari / muhasebe GÖRÜNTÜLEME, hiçbir kaydetme yok — bu dosya ekler): aynı doğrudan istek → 42501, değişiklik yok
//      7c. Deniz EKRANDAN (ayrı oturum, giriş ekranından): Ödeme & Tahsilat › Cari virmanı → kayıt yapılamaz; sunucuda fiş / satır yok
//      7d. GÖZLEM (beklenti yazılmaz, raporlanır): Ayşe (yalnız STOK kaydetme) aynı doğrudan istekle — car_yaz'ın modül listesinde
//          stok olduğu için geçiyorsa bu bir yetki genişliği bulgusudur; geçerse fiş Ali'nin jetonuyla iptal edilir (iz kalır)
//   Her adımda kas_hareket sayısı değişmez.
const { ekranAc, yenile, toastlar, O } = require("./ortak-ekran.js");
const DB = process.env.EKRAN_DB || "atolye_ekran";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  let bozuk = false; const bozulan = []; const yakalanan = [];
  const mudahale = async (s, k) => {
    await s.route("**/rest/v1/rpc/fis_kes**", async (r) => {
      // Uygulamanın gönderdiği gerçek istek saklanır (7: aynı istek başka kullanıcının jetonuyla)
      if (!bozuk) { yakalanan.push({ url: r.request().url(), basliklar: r.request().headers(), govde: r.request().postData() }); return r.fallback(); }
      bozuk = false;
      const q = r.request();
      const govde = JSON.parse(q.postData() || "{}");
      // İKİNCİ cari satırının (karşı cari) tutarı bozulur — ilk satır geçerli kalır. Sunucu (car_yaz) sonlu olmayan tutarı reddeder.
      govde.p.cari.satirlar[1].tutar = "NaN";
      const sahte = { url: () => q.url(), method: () => q.method(), headers: () => q.headers(), postData: () => JSON.stringify(govde) };
      const y = await k.__yanitla(sahte);
      bozulan.push({ durum: y.status, govde: String(y.body).slice(0, 160) });
      return r.fulfill(y);
    });
  };
  // Başlangıç verisi (yerel test veritabanı)
  {
    const { kopruKur } = require("../gercek-pg-kopru.js");
    const k0 = kopruKur({ veritabani: DB });
    await k0.sorgu(`insert into public.cariler (id, unvan, tip, para_birimi) values
      ('ekr-alici', 'Ekran Alıcı', 'Müşteri', 'TRY'), ('ekr-satici', 'Ekran Satıcı', 'Tedarikçi', 'TRY') on conflict (id) do nothing`);
    // Deniz: cari / muhasebe görüntüleyebilir, HİÇBİR modülde kaydedemez (yönetim kurulumu — jetonsuz; sınanan bu değil)
    await k0.sorgu(`update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (veri -> 'kullanicilar') || jsonb_build_array(jsonb_build_object(
        'kullaniciAdi', 'Deniz', 'rol', 'Kullanıcı', 'yetkiler', jsonb_build_object(
          'cari', jsonb_build_object('goruntuleme', true, 'kaydetme', false, 'silme', false),
          'muhasebe', jsonb_build_object('goruntuleme', true, 'kaydetme', false, 'silme', false)))))
      where id = 'tekil' and not exists (select 1 from jsonb_array_elements(veri -> 'kullanicilar') x where x ->> 'kullaniciAdi' = 'Deniz')`);
    await k0.kapat?.();
  }
  const e = await ekranAc(DB, { mudahale });
  const { sayfa, k } = e;
  console.log(`ekran-cari-virman · ${DB} · kurallar ${e.ayar.fis_aktif ? "AÇIK" : "KAPALI"}`);
  const baslangic = (await k.sorgu("select now() as t"))[0].t;
  const sayi = async () => (await k.sorgu(`select (select count(*) from public.car_hareket where cari_id in ('ekr-alici','ekr-satici')) as car,
    (select count(*) from public.stk_fis where olusturma > $1) as fis, (select count(*) from public.kas_hareket) as kasa`, [baslangic]))[0];
  const bakiye = async () => Object.fromEntries((await k.sorgu(`select c.id, coalesce(sum(case when h.yon = 'Borç' then h.tutar else -h.tutar end)
      filter (where not h.iptal and (h.fis_no is null or not coalesce(f.iptal, false))), 0)::float as b
    from public.cariler c left join public.car_hareket h on h.cari_id = c.id left join public.stk_fis f on f.id = h.fis_no
    where c.id in ('ekr-alici','ekr-satici') group by c.id order by c.id`)).map((r) => [r.id, r.b]));
  const fisSatirlari = async (no) => (await k.sorgu(`select h.cari_id, h.yon, h.tutar::float as tutar, h.para_birimi, h.odeme_sekli, h.ek ->> 'islemTipi' as islem, h.iptal
    from public.car_hareket h where h.fis_no = $1 order by h.cari_id`, [no]));
  const fisBasligi = async (no) => (await k.sorgu(`select f.tur, f.onek, f.cari_id, f.iptal, (select count(*) from public.kas_hareket x where x.fis_id = f.id)::int as kasa_satiri
    from public.stk_fis f where f.id = $1`, [no]))[0] || null;
  const sonCvr = async () => ((await k.sorgu(`select id from public.stk_fis where onek = 'CVR' and olusturma > $1 order by olusturma desc limit 1`, [baslangic]))[0] || {}).id;
  const kasaOnce = (await sayi()).kasa;
  // Ödeme & Tahsilat › "Son tahsilat ve ödemeler" listesinin CVR satırları (ekranda görünen metin)
  const sonListe = () => sayfa.evaluate(() => [...document.querySelectorAll("tr[data-odeme-son-satir]")].filter((t) => /CVR-/.test(t.innerText) && t.getBoundingClientRect().height > 0)
    .map((t) => t.innerText.replace(/\s+/g, " ").trim()));

  const ac = async (tip) => {
    await O.modulAc(sayfa, "Kasa & Banka"); await sayfa.waitForTimeout(500);
    await sayfa.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible').first().click(); await sayfa.waitForTimeout(700);
    await sayfa.locator(`[data-odeme-tip="${tip}"]:visible`).first().click(); await sayfa.waitForTimeout(150);
    await sayfa.locator('[data-odeme-sekli="Virman"]:visible').first().click(); await sayfa.waitForTimeout(200);
  };
  const gir = async (tip, ilk, karsi, tutar) => {
    await O.cariSec(sayfa, ilk, "", "data-odeme-cari");
    await O.cariSec(sayfa, karsi, `[data-cari-virman="${tip}"]`, "data-cari-virman-karsi");
    await sayfa.locator("[data-cari-virman-tutar]:visible").fill(String(tutar));
    await sayfa.locator("[data-cari-virman-kaydet]:visible").click(); await sayfa.waitForTimeout(2500);
  };

  // 1. Ödeme virmanı 1.000
  console.log("1 · Ödeme + Cari virmanı 1.000 (Alıcı → karşı Satıcı)");
  await ac("Ödeme");
  await gir("Ödeme", "Ekran Alıcı", "Ekran Satıcı", 1000);
  const no1 = await sonCvr();
  k_("tek fiş, başlık", await fisBasligi(no1), { tur: "Cari virmanı", onek: "CVR", cari_id: "ekr-alici", iptal: false, kasa_satiri: 0 });
  k_("iki satır: yön, tutar, para birimi, şekil, işlem", await fisSatirlari(no1), [
    { cari_id: "ekr-alici", yon: "Borç", tutar: 1000, para_birimi: "TRY", odeme_sekli: "Virman", islem: "Ödeme", iptal: false },
    { cari_id: "ekr-satici", yon: "Alacak", tutar: 1000, para_birimi: "TRY", odeme_sekli: "Virman", islem: "Tahsilat", iptal: false }]);
  k_("sunucu bakiyesi", await bakiye(), { "ekr-alici": 1000, "ekr-satici": -1000 });
  k_("bildirim", /Cari virmanı kaydedildi — CVR-/.test(await toastlar(sayfa)), true);
  const s1 = await sayi();

  // 2. Tek işlem: ikinci satır yolda bozulur
  console.log("2 · TEK İŞLEM: ikinci satırın tutarı yolda NaN yapılır");
  bozuk = true;
  await sayfa.locator("[data-cari-virman-tutar]:visible").fill("77");
  await O.cariSec(sayfa, "Ekran Satıcı", '[data-cari-virman="Ödeme"]', "data-cari-virman-karsi");
  await sayfa.locator("[data-cari-virman-tutar]:visible").fill("77");
  await sayfa.locator("[data-cari-virman-kaydet]:visible").click(); await sayfa.waitForTimeout(2500);
  k_("sunucu reddetti", bozulan.map((x) => x.durum >= 400), [true]);
  console.log(`    (sunucu yanıtı: ${bozulan.map((x) => x.govde).join(" | ")})`);
  const s2 = await sayi();
  k_("ilk satır da yazılmadı, fiş açılmadı (car_hareket / stk_fis aynı)", { car: s2.car, fis: s2.fis }, { car: s1.car, fis: s1.fis });
  k_("ekranda kaydedilemedi", /kaydedilemedi/.test(await toastlar(sayfa)), true);
  // Ekran: "Son tahsilat ve ödemeler" listesinde 77'lik satır yok (bu kipte cari verisi localStorage'da değil — liste ölçülür)
  k_("ekranda 77'lik satır yok", (await sonListe()).filter((x) => / 77 ₺/.test(x)).length, 0);
  k_("form dolu kaldı", await sayfa.locator("[data-cari-virman-tutar]:visible").inputValue(), "77");

  // 3. Tahsilat virmanı 250 (Satıcı → karşı Alıcı)
  console.log("3 · Tahsilat + Cari virmanı 250 (Satıcı → karşı Alıcı)");
  await ac("Tahsilat");
  await gir("Tahsilat", "Ekran Satıcı", "Ekran Alıcı", 250);
  const no3 = await sonCvr();
  k_("ayrı tek fiş", no3 !== no1 && !!no3, true);
  k_("iki satır", await fisSatirlari(no3), [
    { cari_id: "ekr-alici", yon: "Borç", tutar: 250, para_birimi: "TRY", odeme_sekli: "Virman", islem: "Ödeme", iptal: false },
    { cari_id: "ekr-satici", yon: "Alacak", tutar: 250, para_birimi: "TRY", odeme_sekli: "Virman", islem: "Tahsilat", iptal: false }]);
  k_("sunucu bakiyesi", await bakiye(), { "ekr-alici": 1250, "ekr-satici": -1250 });

  // 4. Farklı para birimi (bildirim 3'ünkünü ezmesin diye Geri al'dan SONRA değil: önce Geri al düğmesi okunur)
  // 5. İptal — önce (bildirim hâlâ 3'ün): Geri al
  console.log("5 · İptal (Geri al, 3'teki fiş)");
  await sayfa.locator("[data-toast-geri-al]:visible").first().click(); await sayfa.waitForTimeout(500);
  const onay = sayfa.locator("[data-sil-onayla]:visible"); if (await onay.count()) await onay.first().click();
  await sayfa.waitForTimeout(2500);
  k_("fiş iptal", (await fisBasligi(no3)).iptal, true);
  k_("iki satır birlikte iptal", (await fisSatirlari(no3)).map((x) => `${x.cari_id}:${x.iptal}`), ["ekr-alici:true", "ekr-satici:true"]);
  k_("ilk fiş geçerli", (await fisBasligi(no1)).iptal, false);
  k_("sunucu bakiyesi 1'deki hâle döndü", await bakiye(), { "ekr-alici": 1000, "ekr-satici": -1000 });

  console.log("4 · Farklı para birimi (Alıcı TRY → Ekran Müşteri USD)");
  const f4 = (await sayi()).fis;
  await ac("Ödeme");
  await gir("Ödeme", "Ekran Alıcı", "Ekran Müşteri", 50);
  k_("ekranda ret", /Para birimleri farklı .* kur dönüşümü yok/.test(await toastlar(sayfa)), true);
  k_("sunucuya fiş gitmedi", (await sayi()).fis, f4);

  // 7. YETKİ
  const cvrIstegi = yakalanan.map((x) => ({ ...x, p: JSON.parse(x.govde || "{}").p })).find((x) => x.p && x.p.fis && x.p.fis.onek === "CVR");
  k_("uygulamanın gerçek CVR isteği yakalandı (2 cari satırı, kasa yok)", cvrIstegi ? [cvrIstegi.p.cari.satirlar.length, !!cvrIstegi.p.kasa] : null, [2, false]);
  let sira = 0;
  // Aynı istek, başka kullanıcının jetonuyla. Yeni istek ve satır kimlikleri (tekrar sayılmasın); tutar 33.
  const dogrudan = async (eposta) => {
    sira += 1;
    const p = JSON.parse(JSON.stringify(cvrIstegi.p));
    p.istek = `yetki-deneme-${Date.now()}-${sira}`;
    p.fis.tutar = 33;
    p.cari.satirlar = p.cari.satirlar.map((x, i) => ({ ...x, id: `yetki-${sira}-${i}`, tutar: 33 }));
    const basliklar = { ...cvrIstegi.basliklar, authorization: `Bearer yerel-test:${eposta}` };
    const y = await k.__yanitla({ url: () => cvrIstegi.url, method: () => "POST", headers: () => basliklar, postData: () => JSON.stringify({ p }) });
    const govde = (() => { try { return JSON.parse(y.body); } catch (x) { return { ham: String(y.body).slice(0, 120) }; } })();
    const yazilan = Number((await k.sorgu("select count(*) from public.car_hareket where id like $1", [`yetki-${sira}-%`]))[0].count);
    return { durum: y.status, kod: govde.code || null, mesaj: govde.message || null, fisNo: govde.fisNo || null, yazilanSatir: yazilan };
  };
  const onceYetki = { sayi: await sayi(), bakiye: await bakiye() };
  console.log("7a · Veli (yalnız stok görüntüleme) — aynı fis_kes isteği, Veli'nin jetonuyla");
  const veli = await dogrudan("veli@atolye.local");
  k_("ret 42501, satır yazılmadı", [veli.durum >= 400, veli.kod, veli.yazilanSatir], [true, "42501", 0]);
  console.log(`    (sunucu: ${veli.mesaj})`);
  console.log("7b · Deniz (cari / muhasebe görüntüleme, kaydetme yok) — aynı istek, Deniz'in jetonuyla");
  const deniz = await dogrudan("deniz@atolye.local");
  k_("ret 42501, satır yazılmadı", [deniz.durum >= 400, deniz.kod, deniz.yazilanSatir], [true, "42501", 0]);
  k_("iki carinin satır sayısı ve bakiyesi değişmedi, fiş açılmadı", { sayi: await sayi(), bakiye: await bakiye() }, onceYetki);

  console.log("7c · Deniz EKRANDAN (ayrı oturum, giriş ekranından)");
  const d = await ekranAc(DB, { kullanici: "Deniz" });
  const ds = d.sayfa;
  const dIstek = []; ds.on("request", (q) => { if (/rpc\/fis_kes/.test(q.url())) dIstek.push(q.url()); });
  let dEkran = "Kasa & Banka açılamadı";
  try {
    await O.modulAc(ds, "Kasa & Banka"); await ds.waitForTimeout(500);
    await ds.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible').first().click({ timeout: 5000 }); await ds.waitForTimeout(700);
    await ds.locator('[data-odeme-tip="Ödeme"]:visible').first().click({ timeout: 5000 }); await ds.waitForTimeout(150);
    await ds.locator('[data-odeme-sekli="Virman"]:visible').first().click({ timeout: 5000 }); await ds.waitForTimeout(200);
    await O.cariSec(ds, "Ekran Alıcı", "", "data-odeme-cari");
    await O.cariSec(ds, "Ekran Satıcı", '[data-cari-virman="Ödeme"]', "data-cari-virman-karsi");
    await ds.locator("[data-cari-virman-tutar]:visible").fill("44");
    await ds.locator("[data-cari-virman-kaydet]:visible").click(); await ds.waitForTimeout(2500);
    dEkran = await toastlar(ds);
  } catch (x) { dEkran = `form yolu kapalı: ${String(x.message).split("\n")[0].slice(0, 100)}`; }
  console.log(`    (Deniz'in ekranı: ${dEkran}; fis_kes isteği ${dIstek.length})`);
  k_("Deniz'in kaydı sunucuda yok (fiş / satır / bakiye aynı)", { sayi: await sayi(), bakiye: await bakiye() }, onceYetki);
  k_("Deniz'in ekranında 'kaydedildi' yok", /Cari virmanı kaydedildi/.test(dEkran), false);
  k_("Deniz sayfa hatası yok", d.hatalar, []);
  await d.tarayici.close();

  console.log("7d · GÖZLEM: Ayşe (yalnız STOK kaydetme) — aynı istek, Ayşe'nin jetonuyla");
  const ayse = await dogrudan("ayse@atolye.local");
  console.log(`    GÖZLEM Ayşe: durum ${ayse.durum} · kod ${ayse.kod || "-"} · fiş ${ayse.fisNo || "-"} · yazılan satır ${ayse.yazilanSatir}${ayse.mesaj ? ` · ${ayse.mesaj}` : ""}`);
  if (ayse.fisNo) {
    // Geçtiyse geri al (Ali'nin jetonuyla fis_iptal; iz kalır) — sonraki ölçümler bozulmasın
    const y = await k.__yanitla({ url: () => cvrIstegi.url.replace(/fis_kes/, "fis_iptal"), method: () => "POST",
      headers: () => ({ ...cvrIstegi.basliklar, authorization: "Bearer yerel-test:ali@atolye.local" }), postData: () => JSON.stringify({ p: { no: ayse.fisNo, sebep: "ekran sınaması: yetki gözlemi" } }) });
    console.log(`    (Ayşe'nin fişi iptal edildi: durum ${y.status})`);
  }
  k_("7 sonrası iki carinin bakiyesi 1'deki hâlde", await bakiye(), { "ekr-alici": 1000, "ekr-satici": -1000 });

  // 6. Yenileme
  console.log("6 · Sayfa yenilendi");
  await yenile(sayfa);
  await O.modulAc(sayfa, "Kasa & Banka"); await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible').first().click(); await sayfa.waitForTimeout(1500);
  // Satır: tarih · cari · işlem · şekil · hesap · defter · tutar · fiş no · açıklama — fiş no'lar 1 / 3 diye sadeleşir
  const liste = (await sonListe()).map((x) => x.replace(no1, "fiş1").replace(no3, "fiş3").replace(/^\d{2}\.\d{2}\.\d{4} /, "")).sort();
  k_("ekran (sunucudan yüklendi): yalnız 1. fişin iki satırı, yön / şekil doğru, iptal edilen yok", liste, [
    "Ekran Alıcı Ödeme Virman — Genel 1.000 ₺ fiş1 Virman (ödeme) — karşı: Ekran Satıcı",
    "Ekran Satıcı Tahsilat Virman — Genel 1.000 ₺ fiş1 Virman (tahsilat) — karşı: Ekran Alıcı"]);
  k_("kasa / banka satırı hiç değişmedi", (await sayi()).kasa, kasaOnce);
  k_("sayfa hatası yok", e.hatalar, []);
  console.log(`── ekran-cari-virman: ${gecen} ✓ / ${kalan} ✗ ──`);
  await e.tarayici.close();
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
