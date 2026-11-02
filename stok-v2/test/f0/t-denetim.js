#!/usr/bin/env node
// F0 / DENETİM DOĞRULAMASI — denetim.sql'in KENDİSİ doğru mu? (Bu test BUGÜN YEŞİL olmalı.)
//  1) İYİ veri kümesi (geçerli ve iptal edilmiş teslimler, alış, üretim artan iade satırı, serbest satış, teslimsiz sipariş):
//     hiçbir kontrol bulgu vermez (yanlış alarm yok).
//  2) Her ENJEKSİYON (bilerek bozulmuş tek bir kayıt) yalnız beklenen kontrol(ler)i artırır — bütün kontrollerin önce/sonra farkı
//     ölçülür, beklenmeyen bir artış da kırmızıdır.
//  3) canli-salt-okur-kontrol.sql içindeki denetim bölümü bu dosyayla AYNI (canlıda koşacak sorgu sınanmış sorgudur).
// Enjeksiyonlar süper kullanıcı oturumunda koruma bayraklarıyla (`fis.kapi`, `fis.kalem`) — YALNIZ yerel sınama verisi.
const fs = require("fs");
const path = require("path");
const T = require("./ortak.js");
const { ON } = T;

const sip = (ad, kalemler, ek) => T.siparisKur(T.sipObj(`${ON}-${ad}`, kalemler, ek));
const durumYaz = (s, d) => T.psql(`update public.siparisler set durum = '${d}' where id = '${s.id}';`);
// ESKİ BOZUK VERİ TAKLİDİ: kuralların (fiş kapısı, F2 teslim koruması, yabancı anahtar) olmadığı dönemde yazılmış veri — tetikleyicisiz
// (session_replication_role = replica). Denetim canlıdaki F2 öncesi veriyi yakalamalı; F2 sonrası bu bozukluk yeniden ÜRETİLEMEZ.
const korumasiz = (sql) => T.psql(`set session_replication_role = replica; select set_config('fis.kapi', 'acik', false); select set_config('fis.kalem', 'acik', false);\n${sql}\nset session_replication_role = origin;`);
const serbestFis = (istek, miktar, ek = {}) => T.rpc("fis_kes", { istek, fis: { aile: "stok", tur: ek.tur || "Satış", onek: ek.onek || "SF", kaynak: ek.kaynak || "Satış", cariId: ek.cari === undefined ? "c-yeni" : ek.cari,
  ...(ek.siparisId ? { siparisId: ek.siparisId, siparisNo: "YOK" } : {}) },
  stok: { satirlar: [{ id: `${istek}-h`, urunId: "u-yeni", renk: "Siyah", miktar, kaynak: ek.kaynak || "Satış", ...(ek.siparisId ? { siparisId: ek.siparisId } : {}), ...(ek.kalemId ? { kalemId: ek.kalemId } : {}) }] } });

(async () => {
  console.log(`F0 / DENETİM doğrulaması · önek ${ON}`);
  // ---- 1) İYİ veri kümesi ----
  const s1 = sip("g1", [T.kalemObj(`${ON}-g1k`, 10, 0)]);
  T.rpc("fis_kes", T.teslimYuku({ s: s1, kalemId: `${ON}-g1k`, adet: 4, ekran: 0, istek: `${ON}-g1a` }));
  const iptalEdilecek = T.rpc("fis_kes", T.teslimYuku({ s: s1, kalemId: `${ON}-g1k`, adet: 2, ekran: 4, istek: `${ON}-g1b` }));
  T.rpc("fis_iptal", T.iptalYuku({ s: s1, kalemId: `${ON}-g1k`, fisNo: iptalEdilecek.sonuc.fisNo, adet: 2, ekran: 6 }));   // teslim geri alındı (iade)
  durumYaz(s1, "Kısmi Teslim");
  const s2 = sip("g2", [T.kalemObj(`${ON}-g2k`, 10, 0)], { tip: "Alış" });
  T.rpc("fis_kes", T.teslimYuku({ s: s2, kalemId: `${ON}-g2k`, adet: 10, ekran: 0, istek: `${ON}-g2a` }));
  durumYaz(s2, "Tamamlandı");
  serbestFis(`${ON}-g3`, 2, { tur: "Üretim", onek: "ÜRT", kaynak: "Üretim", cari: null });   // üretim "artan iade" benzeri giriş — kaleme bağlı değil
  serbestFis(`${ON}-g4`, -1);                                                               // siparişsiz satış
  sip("g5", [T.kalemObj(`${ON}-g5k`, 10, 0)]);                                             // teslimsiz sipariş
  const temel = T.denetim();
  const bulgulu = Object.entries(temel).filter(([, n]) => n > 0);
  T.kontrol("DN.iyi-veri-temiz", "iyi veri kümesinde hiçbir kontrol bulgu vermiyor", { sonra: Object.fromEntries(bulgulu), gercek: bulgulu.length, beklenen: 0 });

  // ---- 2) Enjeksiyonlar ----
  const enjeksiyonlar = [
    ["DN.hayalet", "karşılanan 5, hareket yok", { D1b_hayalet_karsilanan: 1 }, () => sip("h1", [T.kalemObj(`${ON}-h1k`, 10, 5)])],
    ["DN.karsilanan-farki", "4 teslimli kalemin karşılananı 9 yapılır", { D1a_karsilanan_hareketten_farkli: 1 }, () => {
      const s = sip("h2", [T.kalemObj(`${ON}-h2k`, 10, 0)]);
      T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-h2k`, adet: 4, ekran: 0, istek: `${ON}-h2a` })); durumYaz(s, "Kısmi Teslim");
      korumasiz(`update public.siparis_kalemleri set karsilanan = 9 where id = '${ON}-h2k';`);
    }],
    ["DN.ters-yon", "satış kalemine net giriş (+2)", { D1c_ters_yonlu_net_hareket: 1 }, () => {
      const s = sip("h3", [T.kalemObj(`${ON}-h3k`, 10, 0)]);
      serbestFis(`${ON}-h3a`, 2, { siparisId: s.id, kalemId: `${ON}-h3k` });
    }],
    // F2: var olmayan kaleme teslim reddedilir (KR005) — eski veri taklidi: kaleme teslim, sonra kalem tetikleyicisiz silinir
    ["DN.sahipsiz-kalem", "hareket var olmayan kaleme bağlı (F2 öncesi veri)", { D2a_sahipsiz_hareket_kalem_yok: 1 }, () => {
      const s = sip("h4", [T.kalemObj(`${ON}-h4k`, 10, 0), T.kalemObj(`${ON}-h4z`, 10, 0)]);
      serbestFis(`${ON}-h4a`, -1, { siparisId: s.id, kalemId: `${ON}-h4z` });
      korumasiz(`delete from public.siparis_kalemleri where id = '${ON}-h4z';`);
    }],
    ["DN.sahipsiz-siparis", "fiş ve hareket var olmayan siparişe bağlı", { D2b_sahipsiz_hareket_siparis_yok: 1, D2d_fis_siparis_yok: 1 }, () => {
      serbestFis(`${ON}-h5a`, -1, { siparisId: `${ON}-h5-yoksip` });
    }],
    // F1 (v1.743.0) ile sunucu, hareketteki kalemin karşılananını hareketten hesaplıyor: eskiden yan etki olarak doğan D1a artık yok
    // (kalem ↔ sipariş uyuşmazlığının reddi F2 kapsamı — D2c hâlâ görünür). Beklenen fark 1 Kasım'da bu yüzden güncellendi (raporda).
    ["DN.kalem-baska-sipariste", "hareketin kalemi başka siparişin", { D2c_hareket_kalem_siparis_uyusmaz: 1, D5b_durum_teslimle_celisiyor: 1 }, () => {
      sip("h6x", [T.kalemObj(`${ON}-h6xk`, 10, 0)]); const y = sip("h6y", [T.kalemObj(`${ON}-h6yk`, 10, 0)]);
      serbestFis(`${ON}-h6a`, -1, { siparisId: y.id, kalemId: `${ON}-h6xk` });
    }],
    ["DN.urun-farki", "teslimli kalemin ürünü değiştirilir", { D3_hareket_urunu_kalemden_farkli: 1 }, () => {
      const s = sip("h7", [T.kalemObj(`${ON}-h7k`, 10, 0)]);
      T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-h7k`, adet: 2, ekran: 0, istek: `${ON}-h7a` })); durumYaz(s, "Kısmi Teslim");
      korumasiz(`update public.siparis_kalemleri set urun_id = 'u-baska' where id = '${ON}-h7k';`);
    }],
    ["DN.renk-farki", "teslimli kalemin rengi değiştirilir", { D3b_hareket_renk_beden_kalemden_farkli: 1 }, () => {
      const s = sip("h8", [T.kalemObj(`${ON}-h8k`, 10, 0)]);
      T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-h8k`, adet: 2, ekran: 0, istek: `${ON}-h8a` })); durumYaz(s, "Kısmi Teslim");
      korumasiz(`update public.siparis_kalemleri set renk = 'Mavi' where id = '${ON}-h8k';`);
    }],
    ["DN.onaysiz-fazla", "4 teslimli kalemin miktarı 2'ye indirilir", { D4a_onaysiz_fazla_teslim: 1 }, () => {
      const s = sip("h9", [T.kalemObj(`${ON}-h9k`, 20, 0)]);
      T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-h9k`, adet: 4, ekran: 0, istek: `${ON}-h9a` }));
      korumasiz(`update public.siparis_kalemleri set miktar = 2 where id = '${ON}-h9k';`);
      durumYaz(s, "Tamamlandı"); // Normalize edilen başlık, bozuk miktarın tamamlandığı durumu yansıtır.
    }],
    ["DN.isaretli-fazla", "20'lik kaleme işaretli 25", { D4b_isaretli_fazla_teslim: 1 }, () => {
      const s = sip("h10", [T.kalemObj(`${ON}-h10k`, 20, 0)]);
      const r=T.rpc("fis_kes",{...T.teslimYuku({ s, kalemId: `${ON}-h10k`, adet: 25, ekran: 0, istek: `${ON}-h10a` }),
        fazlaTeslimOnayi:{onay:true,gerekce:"F3 denetim: izinli fazla fixture"}});
      if(!r.ok)throw new Error(`Fazla teslim denetim fixture reddedildi: ${r.hata}`);
      durumYaz(s, "Tamamlandı");
    }],
    // F1.1 (2 Kasım, bilerek değişti): bağ geçmiş sütunlara taşınır → teslim geçmişi kalemde kalır; artık hayalet DEĞİL, D5a bilgi.
    // 1.743.0'da beklenen { D5a: 1, D1b: 1 } idi (bağ kopuyor, karşılanan hayalet kalıyordu).
    // Sunucu izi yazdıysa (F1.1) izli + hayalet yok; yazmadıysa (1.742.x — f0/geri-donus.sh 2. adım) izsiz + hayalet.
    ["DN.bag-cozulmus", "teslimli sipariş iptal edilir (fis_bag_coz) — F1.1: bağ geçmişe taşınır (izli), hayalet yok; 1.742.x: izsiz + hayalet",
      (izli) => (izli ? { D5a_bagi_cozulmus_teslim: 1 } : { D5c_bagi_cozulmus_izsiz: 1, D1b_hayalet_karsilanan: 1 }), () => {
      const s = sip("h11", [T.kalemObj(`${ON}-h11k`, 10, 0)]);
      const r = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-h11k`, adet: 3, ekran: 0, istek: `${ON}-h11a` }));
      T.rpc("fis_bag_coz", { siparisId: s.id, siparisNo: s.siparisNo }); durumYaz(s, "İptal");
      return T.psql(`select (to_jsonb(h) ->> 'bag_cozum_zamani') is not null from public.stk_hareket h where fis_id = '${r.sonuc.fisNo}' limit 1;`) === "t";
    }],
    // F1.1 öncesi (ya da 1.742.1 sunucusunda) çözülmüş bağ: iz yok → D5c + hayalet (tahminle bağ kurulmaz). Tetikleyicisiz kurulur.
    ["DN.bag-cozulmus-izsiz", "izsiz bağı çözülmüş teslim (eski kayıt)", { D5c_bagi_cozulmus_izsiz: 1, D1b_hayalet_karsilanan: 1 }, () => {
      const s = sip("h11z", [T.kalemObj(`${ON}-h11zk`, 10, 0)]);
      const r = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-h11zk`, adet: 3, ekran: 0, istek: `${ON}-h11za` }));
      T.psql(`set session_replication_role = replica; update public.stk_hareket set siparis_id = null, kalem_id = null, siparis_no = '${s.siparisNo} (iptal)'
        where fis_id = '${r.sonuc.fisNo}'; set session_replication_role = origin;`); durumYaz(s, "İptal");
    }],
    ["DN.durum-celiskisi", "10 / 10 teslimli sipariş 'Bekliyor'", { D5b_durum_teslimle_celisiyor: 1 }, () => {
      const s = sip("h12", [T.kalemObj(`${ON}-h12k`, 10, 0)]);
      T.rpc("fis_kes", T.teslimYuku({ s, kalemId: `${ON}-h12k`, adet: 10, ekran: 0, istek: `${ON}-h12a` }));
    }],
    ["DN.satirsiz-fis", "fişin tek satırı fiş dışından iptal edilir", { D6a_satirsiz_stok_fisi: 1 }, () => {
      const r = serbestFis(`${ON}-h13a`, -1);
      korumasiz(`update public.stk_hareket set iptal = true where fis_id = '${r.sonuc.fisNo}';`);
    }],
    ["DN.iptal-fis-gecerli-satir", "fiş başlığı satırları iptal edilmeden iptal edilir", { D6b_iptal_fisin_gecerli_satiri: 1 }, () => {
      const r = serbestFis(`${ON}-h14a`, -1);
      korumasiz(`update public.stk_fis set iptal = true where id = '${r.sonuc.fisNo}';`);
    }],
  ];
  let onceki = temel;
  for (const [kimlik, ad, beklenenFark0, yap] of enjeksiyonlar) {
    const iz = yap();
    // Beklenen sunucuya göre değişebilir (DN.bag-cozulmus: F1.1 sunucusu iz yazar, 1.742.x yazmaz) — enjeksiyon işlev döndürebilir
    const beklenenFark = typeof beklenenFark0 === "function" ? beklenenFark0(iz) : beklenenFark0;
    const simdi = T.denetim();
    const fark = Object.fromEntries(Object.keys(simdi).map((k) => [k, simdi[k] - (onceki[k] || 0)]).filter(([, n]) => n !== 0));
    T.kontrol(kimlik, ad, { sonra: fark, gercek: fark, beklenen: Object.fromEntries(Object.entries(beklenenFark).sort()) });
    onceki = simdi;
  }

  // ---- 3) canlı dosyası aynı sorguyu taşıyor ----
  const kok = path.join(__dirname, "../..");
  const ayikla = (metin) => { const b = metin.indexOf("with\nayar as"); const s = metin.indexOf("order by k.kontrol;", b); return b < 0 || s < 0 ? null : metin.slice(b, s); };
  const yerel = ayikla(fs.readFileSync(path.join(__dirname, "denetim.sql"), "utf8"));
  const canliYol = path.join(kok, "canli-salt-okur-kontrol.sql");
  const canli = fs.existsSync(canliYol) ? ayikla(fs.readFileSync(canliYol, "utf8")) : null;
  T.kontrol("DN.canli-ayni-sorgu", "canli-salt-okur-kontrol.sql'deki denetim sorgusu denetim.sql ile aynı", { gercek: !!yerel && yerel === canli, beklenen: true });
  // Canlı dosyası YALNIZ OKUR: yorumlar çıkarıldıktan sonra yazma / tanım / oturum komutu geçmez
  const govde = fs.existsSync(canliYol) ? fs.readFileSync(canliYol, "utf8").split("\n").map((l) => l.replace(/--.*$/, "")).join("\n") : "";
  const yasak = govde.match(/\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|comment|vacuum|reindex|set_config|perform|call|do|copy|lock|begin|commit|set)\b/gi) || [];
  T.kontrol("DN.canli-yalniz-okur", "canlı dosyasında yazma / tanım / oturum komutu yok", { sonra: { bulunan: [...new Set(yasak.map((x) => x.toLowerCase()))] }, gercek: yasak.length, beklenen: 0 });
  // Canlı dosyasının iki bölümü yerelde hatasız çalışır (sözdizimi ve sütunlar ortak şemada var)
  const canliMetin = fs.existsSync(canliYol) ? fs.readFileSync(canliYol, "utf8") : "";
  const b1 = canliMetin.indexOf("select 'stk_ayar'"), e1 = canliMetin.indexOf("from public.fis_sayac s);");
  let calisti = false;
  try { T.psql(canliMetin.slice(b1, e1 + "from public.fis_sayac s);".length)); T.psql(canliMetin.slice(canliMetin.indexOf("with\nayar as"))); calisti = b1 >= 0 && e1 >= 0; } catch (e) { calisti = false; }
  T.kontrol("DN.canli-calisir", "canlı dosyasının iki bölümü yerel şemada hatasız çalışıyor", { gercek: calisti, beklenen: true });
  T.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
