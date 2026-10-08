// ================= E-FATURA ALTYAPISI (27 Eylül, v1.500.0 — e-fatura yol haritası, Aşama 2) =================
//
// Kullanıcı: "E-fatura altyapısı hazır olsun. Sonra bağlanacağız." (QNB eFinans entegratör; e-fatura
// mükellefi; KDV hariç fiyat, tevkifat yok; arada yurt içine döviz faturası.) Bu dosya HİÇBİR YERE
// BAĞLANMAZ: satış fişinden fatura taslağı kurar, eksikleri söyler, GİB'in UBL-TR 1.2 biçiminde XML
// üretir. Gönderme (eFinans) Aşama 3 — o zaman yalnız "gönder" adımı eklenecek.
//
// TASLAK NEYİ SAKLAR, NEYİ SAKLAMAZ: kayıtta yalnız KULLANICININ SEÇTİKLERİ durur (senaryo, fatura
// tarihi, not, kur, istisna kodu, ETTN). Satıcı/alıcı bilgisi ve satırlar her açılışta fişten, cariden ve
// Tanımlar'dan YENİDEN kurulur — taslak beklerken cariye eklenen vergi dairesi faturaya kendiliğinden
// yansısın. Fatura GÖNDERİLDİĞİNDE (Aşama 3) kurulan hâl kayda dondurulacak (`donmus`): gönderilmiş
// faturanın içeriği sonradan cari düzeltilince değişmemeli.
//
// NUMARA TASLAKTA VERİLMEZ: GİB seri başına yıl içinde BOŞLUKSUZ sıra ister. Taslağa numara verip sonra
// taslağı silmek sırada boşluk bırakırdı. Numara gönderim anında `sonrakiFaturaSirasi` ile verilecek;
// önizleme ve deneme XML'i "sıradaki numara"yı gösterir ama tüketmez.
//
// TUTARLAR FİŞTEN, YENİDEN HESAPLANMAZ: satır matrahı, KDV'si ve toplamı cariye yazılanın AYNISI
// (fisYaz, 078). Faturayı ayrıca hesaplamak kuruş farkıyla cari bakiyeden ayrışan bir fatura doğururdu.
// Bu yüzden fatura yalnız KDV'li kesilmiş fişten çıkar; KDV'siz fişe fatura "engel".

const EFATURA_SENARYOLARI = [
  { key: "TEMELFATURA", ad: "e-Fatura · Temel", aciklama: "Alıcı e-fatura mükellefi; kabul/red yok" },
  { key: "TICARIFATURA", ad: "e-Fatura · Ticari", aciklama: "Alıcı e-fatura mükellefi; alıcı 8 gün içinde kabul/red edebilir" },
  { key: "EARSIVFATURA", ad: "e-Arşiv", aciklama: "Alıcı e-fatura mükellefi değil (şahıs ya da kayıtlı olmayan firma)" },
];

// Birim → UN/ECE Rec 20 kodu (UBL-TR `unitCode`). Tanınmayan birim C62 (adet) gider ve UYARI verilir —
// yanlış birimle kesilmiş fatura düzeltilemez, iade/iptal gerekir. Liste eFinans testinde doğrulanacak.
const EFATURA_BIRIM_KODLARI = {
  adet: "C62", ad: "C62", tane: "C62",
  "çift": "PR", cift: "PR",
  metre: "MTR", m: "MTR", mt: "MTR", cm: "CMT", mm: "MMT",
  kg: "KGM", kilogram: "KGM", gr: "GRM", g: "GRM", gram: "GRM", ton: "TNE",
  lt: "LTR", l: "LTR", litre: "LTR", ml: "MLT",
  m2: "MTK", "m²": "MTK", metrekare: "MTK",
  desi: "DMK", dm2: "DMK", "dm²": "DMK",
  paket: "PA", koli: "CT", kutu: "BX", "takım": "SET", takim: "SET", set: "SET", "düzine": "DZN", duzine: "DZN",
};

function efaturaBirimKodu(birim) {
  const b = String(birim || "").toLocaleLowerCase("tr-TR").trim().replace(/\.$/, "");
  const kod = EFATURA_BIRIM_KODLARI[b];
  return { kod: kod || "C62", bilinen: !!kod };
}

function faturaSeriGecerliMi(seri) {
  return /^[A-Z0-9]{3}$/.test(String(seri || ""));
}

// GİB fatura numarası: 3 hane seri + 4 hane yıl + 9 hane sıra = 16 karakter (ör. ATL2026000000001).
function faturaNoBicimi(seri, yil, sira) {
  return `${seri}${yil}${String(sira).padStart(9, "0")}`;
}

// Seri + yıl içinde verilmiş en büyük sıranın bir fazlası. Yalnız NUMARA ALMIŞ (gönderilmiş) kayıtlar sayılır.
function sonrakiFaturaSirasi(faturalar, seri, yil) {
  const onEk = `${seri}${yil}`;
  let enBuyuk = 0;
  (faturalar || []).forEach((f) => {
    const no = String((f && f.faturaNo) || "");
    if (no.length !== 16 || !no.startsWith(onEk)) return;
    const sira = parseInt(no.slice(7), 10);
    if (sira > enBuyuk) enBuyuk = sira;
  });
  return enBuyuk + 1;
}

// ETTN (evrensel tekil numara, UUID v4). Taslak ilk kaydedilirken bir kez üretilir, değişmez.
function ettnUret() {
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`.toUpperCase();
}

// Alıcıya göre senaryo: cari kartındaki "e-Fatura mükellefi" seçimi (eFinans bağlanınca sorgudan dolacak).
// Bilinmiyorsa null — tahmin edilmez: yanlış senaryoyla giden fatura GİB'de reddedilir ya da yanlış
// yere düşer.
function efaturaVarsayilanSenaryo(cari, firma) {
  const m = cari && cari.efaturaMukellef;
  if (m === "evet") return (firma && firma.efaturaProfil) === "TICARIFATURA" ? "TICARIFATURA" : "TEMELFATURA";
  if (m === "hayir") return "EARSIVFATURA";
  return null;
}

// Satış fişi mi — fatura yalnız satıştan çıkar (alış faturasını tedarikçi keser).
function faturaKesilebilirFisMi(fis) {
  return !!fis && fis.tip === "Satış";
}

// Fişin fatura satırları: ürünlü, miktarlı cari satırları. Peşin tahsilat satırı (aynı fiş no) girmez.
function faturaSatirlari(fis) {
  const gorulen = new Set();
  return ((fis && fis.hareketler) || []).filter((h) => {
    if (h.kaynakTip && h.kaynakTip !== "cari") return false;
    if (!h.urunAd || !(Number(h.miktar) > 0)) return false;
    if (h.yon === "Tahsilat" || h.yon === "Ödeme") return false;
    if (gorulen.has(h.id)) return false;
    gorulen.add(h.id);
    return true;
  });
}

const kurus = (x) => Math.round((Number(x) || 0) * 100 + Number.EPSILON * 100) / 100;

// Taslağı kurar. `kayit`: kayıtlı taslak (yoksa null — ilk açılış). `bugun`: "YYYY-AA-GG".
function faturaKur({ fis, cari, firma, kurlar, kayit, faturalar, bugun, saat }) {
  const fb = firma || {};
  const k = kayit || {};
  const satirlar = faturaSatirlari(fis).map((h, i) => {
    const kdvVar = typeof h.kdvOrani === "number" && Number.isFinite(h.kdvOrani);
    const matrah = kurus(typeof h.matrah === "number" ? h.matrah : h.tutar);
    const miktar = Number(h.miktar) || 0;
    // Birim fiyat × miktar = matrah olmalı (entegratör satır hesabını denetler). Fişte fiyat kur
    // çevriminden ya da yuvarlamadan kuruş kayabiliyorsa fiyat matrahtan türetilir.
    const bf = Number(h.birimFiyat) || 0;
    const birimFiyat = Math.abs(bf * miktar - matrah) <= 0.005 ? bf : Math.round((matrah / miktar) * 1e8) / 1e8;
    const bk = efaturaBirimKodu(h.birim);
    return {
      sira: i + 1, hareketId: h.id,
      ad: [h.urunAd, olcuGoster(h.renk), olcuGoster(h.beden)].filter(Boolean).join(" "),
      miktar, birim: h.birim || "", birimKodu: bk.kod, birimBilinen: bk.bilinen,
      birimFiyat, matrah,
      kdvOrani: kdvVar ? h.kdvOrani : null,
      kdvTutari: kdvVar ? kurus(typeof h.kdvTutari === "number" ? h.kdvTutari : kdvHesapla(matrah, h.kdvOrani)) : null,
      tutar: kurus(h.tutar),
    };
  });
  // Oran bazında döküm SATIRLARIN KDV'sinin toplamı (yeniden hesap değil) — cari ile kuruşu kuruşuna aynı.
  const oranHaritasi = new Map();
  satirlar.forEach((s) => {
    if (s.kdvOrani == null) return;
    const o = oranHaritasi.get(s.kdvOrani) || { oran: s.kdvOrani, matrah: 0, kdv: 0 };
    o.matrah = kurus(o.matrah + s.matrah); o.kdv = kurus(o.kdv + s.kdvTutari);
    oranHaritasi.set(s.kdvOrani, o);
  });
  const matrah = kurus(satirlar.reduce((t, s) => t + s.matrah, 0));
  const kdv = kurus(satirlar.reduce((t, s) => t + (s.kdvTutari || 0), 0));
  const paraBirimi = (fis && fis.paraBirimi) || "TRY";
  const senaryo = k.senaryo || efaturaVarsayilanSenaryo(cari, fb);
  const seri = senaryo === "EARSIVFATURA" ? (fb.earsivSeri || "") : (fb.efaturaSeri || "");
  const tarih = k.tarih || bugun || bugunYerel();
  const yil = tarih.slice(0, 4);
  const kur = paraBirimi === "TRY" ? null : (Number(k.kur) > 0 ? Number(k.kur) : (parseFloat((kurlar || {})[paraBirimi]) || null));
  const vknMi = (no) => vergiNoKontrol(no).tur === "vkn";
  const aliciNo = vergiNoNormal((cari && (cari.vergiNo || cari.tckn)) || "");
  return {
    id: k.id || null, durum: k.durum || "Taslak", fisNo: fis ? fis.fisNo : k.fisNo, fisTarihi: fis ? String(fis.tarih || "").slice(0, 10) : "",
    cariId: cari ? cari.id : k.cariId, senaryo, faturaTipi: "SATIS",
    tarih, saat: k.saat || saat || "", ettn: k.ettn || null,
    faturaNo: k.faturaNo || null,
    onizlemeNo: k.faturaNo || (faturaSeriGecerliMi(seri) ? faturaNoBicimi(seri, yil, sonrakiFaturaSirasi(faturalar, seri, yil)) : null),
    seri, paraBirimi, kur, not: k.not || "", istisnaKodu: k.istisnaKodu || "",
    satici: {
      unvan: fb.unvan || "", vergiNo: vergiNoNormal(fb.vergiNo), vknMi: vknMi(fb.vergiNo), vergiDairesi: fb.vergiDairesi || "",
      adres: fb.adres || "", il: fb.il || "", ilce: fb.ilce || "", ulke: "Türkiye",
      telefon: fb.telefon || "", eposta: fb.email || "", web: fb.website || "",
      mersisNo: fb.mersisNo || "", ticaretSicilNo: fb.ticaretSicilNo || "", etiket: fb.efaturaGondericiEtiketi || "",
    },
    alici: {
      unvan: (cari && cari.unvan) || "", vergiNo: aliciNo, vknMi: vknMi(aliciNo), vergiDairesi: (cari && cari.vergiDairesi) || "",
      adres: (cari && cari.adres) || "", il: (cari && cari.il) || "", ilce: (cari && cari.ilce) || "", ulke: (cari && cari.ulke) || "Türkiye",
      telefon: (cari && cari.telefon) || "", eposta: (cari && cari.eposta) || "",
      efaturaMukellef: (cari && cari.efaturaMukellef) || "", etiket: (cari && cari.efaturaEtiket) || "",
    },
    satirlar,
    toplam: { matrah, kdv, genelToplam: kurus(matrah + kdv), oranlar: [...oranHaritasi.values()].sort((a, b) => a.oran - b.oran) },
    cariToplam: kurus(satirlar.reduce((t, s) => t + s.tutar, 0)),
  };
}

// Eksik/yanlış bilgi listesi. "engel": XML üretilmez, gönderilemez. "uyari": gönderilebilir ama bakılmalı.
function faturaDogrula(f) {
  const l = [];
  const engel = (alan, mesaj) => l.push({ seviye: "engel", alan, mesaj });
  const uyari = (alan, mesaj) => l.push({ seviye: "uyari", alan, mesaj });
  if (!f) { engel("fis", "Fiş bulunamadı"); return l; }
  if (f.durum === "İptal") engel("durum", "Fiş geri alınmış — bu taslak artık bir fişe bağlı değil");
  if (!f.satirlar.length) engel("satirlar", "Fişte faturalanacak ürün satırı yok");
  const kdvsiz = f.satirlar.filter((s) => s.kdvOrani == null);
  if (kdvsiz.length) engel("kdv", `Fiş KDV'siz kesilmiş (${kdvsiz.length} satır). Fatura tutarı cariye yazılanla aynı olmalı: Tanımlar > Firma'dan KDV'yi açıp fişi yeniden kesin`);
  if (f.satirlar.some((s) => s.kdvOrani === 0) && !String(f.istisnaKodu || "").trim()) engel("istisnaKodu", "%0 KDV'li satır var: KDV istisna kodu gerekli (mali müşavire sorun)");
  f.satirlar.filter((s) => !s.birimBilinen).forEach((s) => uyari("birim", `"${s.ad}" biriminin (${s.birim || "boş"}) e-fatura kodu tanınmadı — adet (C62) gidecek`));
  if (Math.abs(f.toplam.genelToplam - f.cariToplam) > 0.011) engel("toplam", `Fatura toplamı (${f.toplam.genelToplam}) cariye yazılandan (${f.cariToplam}) farklı`);

  if (!f.senaryo) engel("senaryo", "Alıcının e-fatura mükellefi olup olmadığı bilinmiyor: cari kartından seçin ya da burada senaryo seçin");
  if (f.senaryo && !faturaSeriGecerliMi(f.seri)) engel("seri", `${f.senaryo === "EARSIVFATURA" ? "e-Arşiv" : "e-Fatura"} serisi tanımlı değil (Tanımlar > Firma > E-Fatura, 3 harf/rakam)`);
  if (f.paraBirimi !== "TRY" && !(f.kur > 0)) engel("kur", `${f.paraBirimi} kuru yok`);

  const s = f.satici;
  if (!s.unvan) engel("satici", "Firma unvanı boş (Tanımlar > Firma)");
  if (!s.vergiNo || !vergiNoKontrol(s.vergiNo).gecerli) engel("satici", "Firmanın vergi numarası boş ya da hatalı (Tanımlar > Firma)");
  if (!s.vergiDairesi) engel("satici", "Firmanın vergi dairesi boş (Tanımlar > Firma)");
  if (!s.adres || !s.il || !s.ilce) engel("satici", "Firmanın adresi, ili ve ilçesi dolu olmalı (Tanımlar > Firma)");

  const a = f.alici;
  if (!a.unvan) engel("alici", "Alıcı unvanı boş");
  if (!a.vergiNo) engel("alici", "Alıcının vergi no / TC kimlik no'su boş (cari kartı)");
  else if (!vergiNoKontrol(a.vergiNo).gecerli) engel("alici", "Alıcının vergi no / TC kimlik no'su hatalı (cari kartı)");
  if (a.vknMi && !a.vergiDairesi) engel("alici", "Alıcının vergi dairesi boş (cari kartı)");
  if (!a.adres || !a.il || !a.ilce) engel("alici", "Alıcının adresi, ili ve ilçesi dolu olmalı (cari kartı)");
  if (f.senaryo === "EARSIVFATURA" && !a.eposta) uyari("alici", "e-Arşiv faturası alıcıya e-postayla gider: cari kartında e-posta yok");
  if (f.senaryo === "EARSIVFATURA" && a.efaturaMukellef === "evet") uyari("senaryo", "Alıcı e-fatura mükellefi işaretli ama e-Arşiv seçildi");
  if (f.senaryo && f.senaryo !== "EARSIVFATURA" && a.efaturaMukellef === "hayir") uyari("senaryo", "Alıcı e-fatura mükellefi değil işaretli ama e-Fatura seçildi");

  // VUK 231: fatura malın teslimden itibaren 7 gün içinde düzenlenir.
  if (f.fisTarihi && f.tarih) {
    const gun = Math.round((Date.parse(f.tarih) - Date.parse(f.fisTarihi)) / 86400000);
    if (gun > 7) uyari("tarih", `Fatura tarihi fişten ${gun} gün sonra — yasal süre 7 gün`);
    if (gun < 0) uyari("tarih", "Fatura tarihi fiş tarihinden önce");
  }
  return l;
}

function faturaEngelVarMi(dogrulama) {
  return (dogrulama || []).some((d) => d.seviye === "engel");
}

// Faturadaki "Yalnız …" satırı: çek bordrosuyla aynı yardımcı (200 `tutarYaziyla`, bitişik yazım).
function faturaTutarYaziyla(tutar, pb) {
  return `Yalnız ${tutarYaziyla(tutar, pb)}`;
}

// ---- UBL-TR 1.2 XML ----------------------------------------------------------------------------
//
// GİB UBL-TR 1.2 Fatura şeması; öğe SIRASI şemanın sırası (sıra bozulursa şema doğrulaması düşer).
// İMZA YOK: `ext:UBLExtensions` boş bırakılır, mali mühür/imzayı entegratör (eFinans) atar. XSLT
// görünüm şablonu da entegratörün. Bu XML Aşama 3'te eFinans TEST ortamında doğrulanacak; alan adları ve
// zorunluluklar orada kesinleşecek (ör. e-Arşiv'in gönderim şekli bilgisi entegratöre göre değişiyor).
function xmlKacis(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
const xmlTutar = (x) => kurus(x).toFixed(2);
const xmlSayi = (x) => String(Math.round((Number(x) || 0) * 1e6) / 1e6);

function ublTaraf(t, kok) {
  const x = xmlKacis;
  const semaId = t.vknMi ? "VKN" : "TCKN";
  // Şahıs (TCKN) tarafında ad/soyad zorunlu: unvanın son kelimesi soyad sayılır.
  const kelimeler = String(t.unvan || "").trim().split(/\s+/);
  const soyad = kelimeler.length > 1 ? kelimeler.pop() : "";
  const ad = kelimeler.join(" ");
  return `  <cac:${kok}>
    <cac:Party>
      ${t.web ? `<cbc:WebsiteURI>${x(t.web)}</cbc:WebsiteURI>` : ""}
      <cac:PartyIdentification><cbc:ID schemeID="${semaId}">${x(t.vergiNo)}</cbc:ID></cac:PartyIdentification>
      ${t.mersisNo ? `<cac:PartyIdentification><cbc:ID schemeID="MERSISNO">${x(t.mersisNo)}</cbc:ID></cac:PartyIdentification>` : ""}
      ${t.ticaretSicilNo ? `<cac:PartyIdentification><cbc:ID schemeID="TICARETSICILNO">${x(t.ticaretSicilNo)}</cbc:ID></cac:PartyIdentification>` : ""}
      ${t.vknMi ? `<cac:PartyName><cbc:Name>${x(t.unvan)}</cbc:Name></cac:PartyName>` : ""}
      <cac:PostalAddress>
        <cbc:StreetName>${x(t.adres)}</cbc:StreetName>
        <cbc:CitySubdivisionName>${x(t.ilce)}</cbc:CitySubdivisionName>
        <cbc:CityName>${x(t.il)}</cbc:CityName>
        <cac:Country><cbc:Name>${x(t.ulke || "Türkiye")}</cbc:Name></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${x(t.vergiDairesi)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>
      ${t.telefon || t.eposta ? `<cac:Contact>${t.telefon ? `<cbc:Telephone>${x(t.telefon)}</cbc:Telephone>` : ""}${t.eposta ? `<cbc:ElectronicMail>${x(t.eposta)}</cbc:ElectronicMail>` : ""}</cac:Contact>` : ""}
      ${t.vknMi ? "" : `<cac:Person><cbc:FirstName>${x(ad || t.unvan)}</cbc:FirstName><cbc:FamilyName>${x(soyad)}</cbc:FamilyName></cac:Person>`}
    </cac:Party>
  </cac:${kok}>`;
}

function ublKdvAlt(pb, matrah, kdv, oran, istisnaKodu) {
  const x = xmlKacis;
  return `<cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${pb}">${xmlTutar(matrah)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${pb}">${xmlTutar(kdv)}</cbc:TaxAmount>
        <cbc:Percent>${xmlSayi(oran)}</cbc:Percent>
        <cac:TaxCategory>${oran === 0 && istisnaKodu ? `<cbc:TaxExemptionReasonCode>${x(istisnaKodu)}</cbc:TaxExemptionReasonCode>` : ""}<cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory>
      </cac:TaxSubtotal>`;
}

// `faturaNo`: gönderimde verilen numara; taslakta önizleme numarası geçilir (tüketilmez).
function ublTrXml(f, { faturaNo } = {}) {
  const x = xmlKacis;
  const pb = f.paraBirimi || "TRY";
  const no = faturaNo || f.faturaNo || f.onizlemeNo || "";
  const notlar = [f.not, faturaTutarYaziyla(f.toplam.genelToplam, pb), f.fisNo ? `Fiş/İrsaliye: ${f.fisNo}` : ""].filter(Boolean);
  const satirXml = f.satirlar.map((s) => `  <cac:InvoiceLine>
    <cbc:ID>${s.sira}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${s.birimKodu}">${xmlSayi(s.miktar)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${pb}">${xmlTutar(s.matrah)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${pb}">${xmlTutar(s.kdvTutari || 0)}</cbc:TaxAmount>
      ${ublKdvAlt(pb, s.matrah, s.kdvTutari || 0, s.kdvOrani || 0, f.istisnaKodu)}
    </cac:TaxTotal>
    <cac:Item><cbc:Name>${x(s.ad)}</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${pb}">${xmlSayi(s.birimFiyat)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${x(f.senaryo)}</cbc:ProfileID>
  <cbc:ID>${x(no)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${x(f.ettn || "")}</cbc:UUID>
  <cbc:IssueDate>${x(f.tarih)}</cbc:IssueDate>
  ${f.saat ? `<cbc:IssueTime>${x(f.saat)}</cbc:IssueTime>` : ""}
  <cbc:InvoiceTypeCode>${x(f.faturaTipi || "SATIS")}</cbc:InvoiceTypeCode>
${notlar.map((n) => `  <cbc:Note>${x(n)}</cbc:Note>`).join("\n")}
  <cbc:DocumentCurrencyCode>${x(pb)}</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${f.satirlar.length}</cbc:LineCountNumeric>
${ublTaraf(f.satici, "AccountingSupplierParty")}
${ublTaraf(f.alici, "AccountingCustomerParty")}
  ${pb !== "TRY" ? `<cac:PricingExchangeRate><cbc:SourceCurrencyCode>${x(pb)}</cbc:SourceCurrencyCode><cbc:TargetCurrencyCode>TRY</cbc:TargetCurrencyCode><cbc:CalculationRate>${xmlSayi(f.kur)}</cbc:CalculationRate><cbc:Date>${x(f.tarih)}</cbc:Date></cac:PricingExchangeRate>` : ""}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${pb}">${xmlTutar(f.toplam.kdv)}</cbc:TaxAmount>
    ${f.toplam.oranlar.map((o) => ublKdvAlt(pb, o.matrah, o.kdv, o.oran, f.istisnaKodu)).join("\n    ")}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${pb}">${xmlTutar(f.toplam.matrah)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${pb}">${xmlTutar(f.toplam.matrah)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${pb}">${xmlTutar(f.toplam.genelToplam)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${pb}">0.00</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${pb}">${xmlTutar(f.toplam.genelToplam)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${satirXml}
</Invoice>
`.replace(/\n\s*\n/g, "\n");
}

// Fişe bağlı fatura kaydı (varsa). Bir fişin tek faturası olur.
function fisinFaturasi(faturalar, fisNo) {
  return (faturalar || []).find((f) => f && f.fisNo === fisNo && f.durum !== "Silindi") || null;
}
