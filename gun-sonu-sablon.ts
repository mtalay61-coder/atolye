// @ts-nocheck — çekirdek uygulamanın JavaScript kodundan otomatik çıkarılıyor (tipsiz).
// ================= GÜN SONU RAPORU — SUNUCU FONKSİYONU (Supabase Edge Function `gun-sonu`) =================
//
// Kullanıcı: "Sunucudan otomatik gönderilsin, uygulama açık olmasa da."
//
// BU DOSYA ÜRETİLİR: `gun-sonu-sablon.ts` + uygulamanın rapor çekirdeği (`./yap.sh` → `gun-sonu-sunucu.js`).
// Elle düzenlemeyin; şablonu ya da src/264-gun-sonu.jsx'i düzenleyip yap.sh çalıştırın. Rapor hesabı uygulamadaki
// "Gün Sonu Raporu" ekranıyla AYNI koddur; uygulamada rapor değiştiğinde bu dosyayı Supabase'e yeniden yapıştırın.
//
// ---------------------------------------------------------------------------------------------
// KURULUM (bir kez)
//   1. Supabase > Edge Functions > Create function > adı:  gun-sonu
//      Şablon kodu silin, bu dosyanın TAMAMINI yapıştırın > Deploy.
//      "Verify JWT with legacy secret" KAPALI (fonksiyon çağıranı kendisi doğruluyor).
//   2. Edge Functions > Secrets: GUN_SONU_ANAHTAR = uzun rastgele bir metin (zamanlayıcının parolası; koda girmez).
//      SMTP_SIFRE zaten `eposta` fonksiyonu için girildiyse yeterli (aynı ayar kullanılır).
//   3. SQL Editor'de `gun-sonu.sql`'i çalıştırın (gönderim kaydı tablosu + her 15 dakikada bir çağıran zamanlayıcı;
//      içindeki <PROJE> ve <GUN_SONU_ANAHTAR> yerlerini doldurun).
//   4. Uygulama: Finans › Gün Sonu Raporu › Otomatik gönderim: "her gün", saat, alıcılar. "Sunucudan şimdi gönder
//      (deneme)" ile kurulumu sınayın.
//
// ÇALIŞMA: zamanlayıcı her 15 dakikada çağırır. Fonksiyon Tanımlar'daki ayarı okur; otomatik açıksa ve İstanbul saatiyle
// belirlenen saat geçmişse, o günün raporu `gun_sonu_gonderim` tablosunda yoksa önce satırı YAZAR (gün birincil
// anahtar: iki çağrı yarışsa da yalnız biri gönderir), sonra gönderir ve sonucu satıra yazar.
// E-posta: özet metin + raporun tamamı HTML gövde + aynı rapor ek dosya (indirilip tarayıcıda açılır/yazdırılır).
// ---------------------------------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-gun-sonu-anahtar",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const yanit = (durum: number, govde: unknown) =>
  new Response(JSON.stringify(govde), { status: durum, headers: { ...CORS, "Content-Type": "application/json" } });

/*__CEKIRDEK__*/

// İstanbul'un şu anki günü ve dakikası (sunucu UTC'de çalışır).
function istanbulSimdi() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { gun: `${p.year}-${p.month}-${p.day}`, dakika: Number(p.hour) * 60 + Number(p.minute), metin: `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}` };
}

// PostgREST 1000 satır sınırı: sayfa sayfa okunur (uygulamadaki `supabaseTumSatirlar` gibi).
async function tumSatirlar(db, tablo: string, sutunlar = "*") {
  const hepsi = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await db.from(tablo).select(sutunlar).range(bas, bas + 999);
    if (error) throw new Error(`${tablo} okunamadı: ${error.message}`);
    hepsi.push(...(data || []));
    if (!data || data.length < 1000) return hepsi;
  }
}

// Uygulamadaki okuma (045 `supabasedenOku`) ile aynı biçime: alt tablolar ana kayda, `ek` köke.
async function veriOku(db) {
  const grupla = (satirlar, alan) => { const m = new Map(); satirlar.forEach((s) => { const a = s[alan]; if (!m.has(a)) m.set(a, []); m.get(a).push(s); }); return m; };
  const [tanimS, muhasebeS, cariS, cariHS, urunS, varyantS, stokHS, uretimS, atamaS] = await Promise.all([
    db.from("tanimlar").select("veri").eq("id", "tekil").maybeSingle(),
    db.from("muhasebe").select("veri").eq("id", "tekil").maybeSingle(),
    tumSatirlar(db, "cariler"),
    tumSatirlar(db, "cari_hareketleri"),
    tumSatirlar(db, "urunler", "id,ad,kategori,birim,alis_fiyati,alis_para_birimi,ek"),
    tumSatirlar(db, "varyantlar", "urun_id,renk,beden,miktar"),
    tumSatirlar(db, "stok_hareketleri"),
    tumSatirlar(db, "uretim"),
    tumSatirlar(db, "uretim_atamalari"),
  ]);
  const cariHMap = grupla(cariHS, "cari_id");
  const cariler = cariS.map((c) => ({
    ...kayitaCevir(c), ...(c.ek || {}),
    hareketler: (cariHMap.get(c.id) || []).map((h) => {
      const k = kayitaCevir(h); const ek = k.ek || {}; delete k.ek;
      Object.entries(ek).forEach(([a, d]) => { if (d !== null && d !== undefined) k[a] = d; });
      return k;
    }),
  }));
  const varyantMap = grupla(varyantS, "urun_id");
  const stokHMap = grupla(stokHS, "urun_id");
  const stok = urunS.map((u) => ({
    ...ekiKokeAc(kayitaCevir(u)),
    variants: (varyantMap.get(u.id) || []).map((v) => ({ renk: v.renk, beden: v.beden, miktar: Number(v.miktar) || 0 })),
    hareketler: (stokHMap.get(u.id) || []).map((h) => ekiKokeAc(kayitaCevir(h))),
  }));
  const atamaMap = grupla(atamaS, "uretim_id");
  const uretim = uretimS.map((o) => {
    const atamalar = atamaMap.get(o.id) || [];
    return { ...ekiKokeAc(kayitaCevir(o)), prosesIlerleme: (o.proses_ilerleme || []).map((p) => ({ ...p, atamalar: atamalar.filter((a) => a.proses === p.proses).map((a) => ekiKokeAc(kayitaCevir(a))) })) };
  });
  return { tanimlar: (tanimS.data && tanimS.data.veri) || {}, muhasebe: (muhasebeS.data && muhasebeS.data.veri) || {}, cariler, stok, uretim };
}

// KONU SATIRI GÜVENLİ (v1.724.2 — kullanıcı, Gmail'de ham MIME görünen gün sonu raporu: "Gün sonu raporu bozuldu"). denomailer
// 1.6.0 konuyu `=?utf-8?Q?…?=` ile kodlarken 76. karakterde yumuşak satır sonu ("=\r\n") koyuyor; başlık satırının devamı
// boşlukla başlamadığı için posta sunucusu başlıkları orada bitmiş sayıyor, gövde ve ekler ham metin olarak görünüyor. Firma
// ünvanı uzayınca (Talay Ayakkabı Tekstil İnşaat San Tic Ltd Şti) konu bu sınırı aştı. Konu ASCII'ye çevrilir (ğ→g, ş→s, ı→i…)
// ve 60 karakterle sınırlanır: ASCII metin kodlanınca uzamaz, 60 + 12 sarmalayıcı < 76. Kelime ortasından kesmez.
const TR_ASCII: Record<string, string> = { "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "ı": "i", "İ": "I", "ö": "o", "Ö": "O", "ş": "s", "Ş": "S", "ü": "u", "Ü": "U", "—": "-", "–": "-", "·": "-", "’": "'", "“": "\"", "”": "\"" };
function konuGuvenli(konu: string, enFazla = 60): string {
  const ascii = String(konu || "").split("").map((h) => TR_ASCII[h] ?? (h.charCodeAt(0) < 128 ? h : "-")).join("").replace(/\s+/g, " ").trim();
  if (ascii.length <= enFazla) return ascii;
  const kesik = ascii.slice(0, enFazla);
  const bosluk = kesik.lastIndexOf(" ");
  return (bosluk > enFazla - 20 ? kesik.slice(0, bosluk) : kesik).trim();
}

function base64Utf8(metin: string) {
  const bayt = new TextEncoder().encode(metin);
  let ikili = "";
  for (let i = 0; i < bayt.length; i += 0x8000) ikili += String.fromCharCode(...bayt.subarray(i, i + 0x8000));
  return btoa(ikili);
}

async function raporGonder(veriler, gun: string, saatMetni: string) {
  const firma = (veriler.tanimlar && veriler.tanimlar.firmaBilgileri) || {};
  const ayar = firma.gunSonu || {};
  const smtp = firma.eposta || {};
  const sifre = Deno.env.get("SMTP_SIFRE") || smtp.sifre || "";
  const alicilar = gunSonuAlicilari(ayar);
  if (!smtp.sunucu || !smtp.kullanici || !sifre) throw new Error("E-posta ayarları eksik — Tanımlar › Firma › E-posta ve SMTP_SIFRE sırrı");
  if (alicilar.length === 0) throw new Error("Alıcı yok — Gün Sonu Raporu › Otomatik gönderim › alıcılar");
  const veri = gunSonuVerisi({ gun, defter: ayar.defter || "Tümü", cariler: veriler.cariler, muhasebe: veriler.muhasebe, stok: veriler.stok, uretim: veriler.uretim });
  const html = pdfCiktiBelgesi(gunSonuHTML(veri, firma, `${saatMetni} (sunucu)`));
  const o = veri.ozet;
  const yaz = (m) => (Object.keys(m || {}).length ? Object.entries(m).map(([pb, t]) => `${Number(t).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${pb}`).join(" · ") : "—");
  const metin = `${gun.split("-").reverse().join(".")} gün sonu özeti\n\nSatış: ${yaz(o.satis)}\nAlış: ${yaz(o.alis)}\n` +
    `Kasa/Banka giriş: ${yaz(o.kasaGiris)}\nKasa/Banka çıkış: ${yaz(o.kasaCikis)}\nKasa + Banka gün sonu: ${yaz(o.kasaBakiye)}\n` +
    `Portföydeki çekler: ${yaz(o.cekToplam)}\nStok tutarı (alış fiyatıyla): ${yaz(o.stokTutar)}\n\nAyrıntılı rapor ekte.\n${firma.unvan || ""}`;
  const port = Number(smtp.port) || 465;
  const istemci = new SMTPClient({ connection: { hostname: smtp.sunucu, port, tls: (smtp.tls || (port === 465 ? "tls" : "starttls")) === "tls", auth: { username: smtp.kullanici, password: sifre } } });
  try {
    await istemci.send({
      from: smtp.gonderenAd ? `${smtp.gonderenAd} <${smtp.kullanici}>` : smtp.kullanici,
      to: alicilar,
      subject: konuGuvenli(`Gun sonu raporu - ${gun.split("-").reverse().join(".")} - ${firma.unvan || ""}`),
      content: metin,
      html,
      attachments: [{ filename: `Gun-sonu-${gun}.html`, contentType: "text/html; charset=utf-8", encoding: "base64", content: base64Utf8(html) }],
    });
  } finally {
    try { await istemci.close(); } catch { /* */ }
  }
  return `${alicilar.length} alıcı`;
}

Deno.serve(async (istek: Request) => {
  if (istek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (istek.method !== "POST") return yanit(405, { tamam: false, hata: "Yalnız POST" });
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // ÇAĞIRAN: zamanlayıcı (GUN_SONU_ANAHTAR başlığı) ya da giriş yapmış kullanıcı (yalnız "deneme").
  const anahtar = Deno.env.get("GUN_SONU_ANAHTAR") || "";
  const zamanlayici = !!anahtar && istek.headers.get("x-gun-sonu-anahtar") === anahtar;
  if (!zamanlayici) {
    const jeton = (istek.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = jeton ? await anon.auth.getUser(jeton) : { data: null, error: true };
    if (error || !data?.user) return yanit(401, { tamam: false, hata: "Yetkisiz — giriş yapılmalı ya da zamanlayıcı anahtarı" });
  }

  const simdi = istanbulSimdi();
  try {
    if (!zamanlayici) {
      // DENEME: bugünün raporu hemen gönderilir; gönderim kaydına yazılmaz (akşamki otomatik gönderimi engellemesin).
      const veriler = await veriOku(db);
      const mesaj = await raporGonder(veriler, simdi.gun, simdi.metin);
      return yanit(200, { tamam: true, mesaj });
    }
    const { data: tanimS } = await db.from("tanimlar").select("veri").eq("id", "tekil").maybeSingle();
    const ayar = (tanimS?.veri?.firmaBilgileri?.gunSonu) || {};
    if (!ayar.otomatik) return yanit(200, { tamam: true, mesaj: "otomatik gönderim kapalı" });
    const [s, d] = String(ayar.saat || "19:00").split(":").map((x) => parseInt(x, 10) || 0);
    if (simdi.dakika < s * 60 + d) return yanit(200, { tamam: true, mesaj: "saat gelmedi" });
    // SAHİPLEN: günün satırı ilk yazana ait; çakışma (23505) = başka çağrı gönderiyor/göndermiş.
    const { error: sahip } = await db.from("gun_sonu_gonderim").insert({ gun: simdi.gun, durum: "gönderiliyor" });
    if (sahip) return yanit(200, { tamam: true, mesaj: sahip.code === "23505" ? "bugün gönderildi" : `kayıt yazılamadı: ${sahip.message}` });
    try {
      const veriler = await veriOku(db);
      const mesaj = await raporGonder(veriler, simdi.gun, simdi.metin);
      await db.from("gun_sonu_gonderim").update({ durum: `gönderildi (${mesaj})`, zaman: new Date().toISOString() }).eq("gun", simdi.gun);
      return yanit(200, { tamam: true, mesaj });
    } catch (e) {
      // Hata kaydedilir ve satır SİLİNMEZ: her 15 dakikada yeniden denenip aynı hatayla posta kutusu doldurulmasın.
      // Düzeltince "Sunucudan şimdi gönder" ile elle gönderilir.
      await db.from("gun_sonu_gonderim").update({ durum: `HATA: ${String((e as Error)?.message || e)}`, zaman: new Date().toISOString() }).eq("gun", simdi.gun);
      throw e;
    }
  } catch (e) {
    return yanit(500, { tamam: false, hata: String((e as Error)?.message || e) });
  }
});
