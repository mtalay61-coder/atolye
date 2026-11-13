// ================= SİTE TALEBİ E-POSTA BİLDİRİMİ (Supabase Edge Function `site-bildirim`, v1.744.18) =================
//
// Kullanıcı (12 Kasım): "Site talebi için e-posta bildirimi yapalım." ERP'deki 🌐 bildirimi yalnız uygulama AÇIKKEN çalışıyor
// (266 `useSiteBildirimleri`, 2 dakikada bir). Bu fonksiyon sunucuda çalışır: web sitesinden yeni SİPARİŞ TALEBİ ya da yeni
// MÜŞTERİ KAYDI gelince, uygulama kapalı olsa da Tanımlar'da yazılı adreslere e-posta gider.
//
// ---------------------------------------------------------------------------------------------
// KURULUM (bir kez) — gün sonu raporuyla aynı adımlar
//   1. Supabase > Edge Functions > Create function > adı:  site-bildirim
//      Şablon kodu silin, bu dosyanın TAMAMINI yapıştırın > Deploy.
//      "Verify JWT with legacy secret" KAPALI (fonksiyon çağıranı kendisi doğruluyor).
//   2. Edge Functions > Secrets: SITE_BILDIRIM_ANAHTAR = uzun rastgele bir metin (zamanlayıcının parolası; koda girmez).
//      Girmezseniz gün sonu için girilmiş GUN_SONU_ANAHTAR kullanılır. SMTP_SIFRE `eposta` fonksiyonu için girildiyse yeterli.
//   3. SQL Editor'de `site-bildirim.sql`'i çalıştırın (bildirim kaydı tablosu + her 5 dakikada çağıran zamanlayıcı;
//      içindeki <PROJE> ve <ANAHTAR> yerlerini doldurun).
//   4. Uygulama: Tanımlar › Web Sitesi › "E-posta bildirimi": kutuyu işaretleyin, alıcıları yazın, "Deneme gönder".
//
// ÇALIŞMA: zamanlayıcı 5 dakikada bir çağırır. Son 2 saatte gelmiş, durumu 'yeni' olan talepler / kayıtlar okunur; her biri
// `site_bildirim_kaydi` tablosuna YAZILARAK sahiplenilir (birincil anahtar: iki çağrı yarışsa da bir kez bildirilir), sonra
// TEK e-postada toplanır. Gönderim hatası kayda yazılır; aynı talep tekrar denenmez (posta kutusu aynı hatayla dolmasın) —
// ERP'deki 🌐 bildirimi ve talep paneli zaten gösterir.
// İÇERİK: müşteri ünvanı, zaman, satırlar (model · renk: beden × çift), toplam çift, ödeme şekli, not; kayıtta ünvan,
// yetkili, telefon, e-posta, il. Şifre / şifre özeti / fiyat GİTMEZ. Alıcılar yalnız Tanımlar'daki firma bilgilerinde
// (`firmaBilgileri.siteBildirim`) — herkese açık site ayarlarında DEĞİL.
// ---------------------------------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-site-bildirim-anahtar",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const yanit = (durum: number, govde: unknown) =>
  new Response(JSON.stringify(govde), { status: durum, headers: { ...CORS, "Content-Type": "application/json" } });

// <<CEKIRDEK — saf, sınaması: test/birim-site-bildirim.js (bu iki işaret arası Node'da çalıştırılır; tip yazılmaz)
// Konu ASCII ve ≤ 60 karakter: denomailer uzun UTF-8 konuyu bozuyor (eposta fonksiyonundaki `konuGuvenli` ile aynı ders).
const TR_ASCII = { "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "ı": "i", "İ": "I", "ö": "o", "Ö": "O", "ş": "s", "Ş": "S", "ü": "u", "Ü": "U", "—": "-", "–": "-", "·": "-" };
function konuGuvenli(konu, enFazla = 60) {
  const ascii = String(konu || "").split("").map((h) => TR_ASCII[h] ?? (h.charCodeAt(0) < 128 ? h : "-")).join("").replace(/\s+/g, " ").trim();
  if (ascii.length <= enFazla) return ascii;
  const kesik = ascii.slice(0, enFazla);
  const b = kesik.lastIndexOf(" ");
  return (b > enFazla - 20 ? kesik.slice(0, b) : kesik).trim();
}
function bildirimAlicilari(ayar) {
  return [...new Set(String((ayar && ayar.alicilar) || "").split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))];
}
function istanbulZaman(t) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
  } catch { return String(t || ""); }
}
function odemeMetni(o) {
  if (!o || !o.tip) return "";
  return `${o.tip}${Number(o.vadeGun) > 0 ? `, ${o.vadeGun} gün vade` : ""}`;
}
// Talep kalemleri model + renk başına tek satır: "Bot · Siyah: 40×12, 41×10 (22 çift)" — beden sayısal sırada.
function kalemSatirlari(kalemler, enFazla = 15) {
  const gruplar = new Map();
  (Array.isArray(kalemler) ? kalemler : []).forEach((k) => {
    if (!k) return;
    const anahtar = `${k.urunAd || "?"}${k.renk ? ` · ${k.renk}` : ""}`;
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, []);
    gruplar.get(anahtar).push(k);
  });
  const satirlar = [...gruplar.entries()].map(([ad, l]) => {
    const bedenli = l.filter((k) => k.beden).sort((a, b) => (parseFloat(a.beden) - parseFloat(b.beden)) || String(a.beden).localeCompare(String(b.beden), "tr"));
    const toplam = l.reduce((t, k) => t + (Number(k.miktar) || 0), 0);
    const ayrinti = bedenli.length ? `${bedenli.map((k) => `${k.beden}×${Number(k.miktar) || 0}`).join(", ")} (${toplam} çift)` : `${toplam} çift`;
    return `  - ${ad}: ${ayrinti}`;
  });
  return satirlar.length > enFazla ? [...satirlar.slice(0, enFazla), `  … +${satirlar.length - enFazla} satır daha`] : satirlar;
}
// E-posta: { konu, metin }. `talepler`: site_talepleri satırları; `kayitlar`: site_kayit_talepleri satırları (bilgiler jsonb).
function bildirimMetni(talepler, kayitlar, firmaAdi) {
  const t = talepler || []; const k = kayitlar || [];
  const parca = [];
  if (t.length) parca.push(`${t.length} yeni sipariş talebi`);
  if (k.length) parca.push(`${k.length} yeni müşteri kaydı`);
  const satirlar = [`Web sitesinden ${parca.join(", ")}.`, ""];
  t.forEach((x) => {
    satirlar.push(`SİPARİŞ TALEBİ — ${x.cari_unvan || "(ünvan yok)"} · ${istanbulZaman(x.olusturma)}`);
    const sat = Array.isArray(x.kalemler) ? x.kalemler.length : 0;
    const odeme = odemeMetni(x.odeme);
    satirlar.push(`  Toplam ${Number(x.toplam_cift) || 0} çift · ${sat} satır${odeme ? ` · Ödeme: ${odeme}` : ""}`);
    kalemSatirlari(x.kalemler).forEach((s) => satirlar.push(s));
    if (x.not_metni) satirlar.push(`  Not: ${String(x.not_metni).slice(0, 300)}`);
    satirlar.push("");
  });
  k.forEach((x) => {
    const b = x.bilgiler || {};
    const alanlar = [b.yetkili && `Yetkili: ${b.yetkili}`, b.telefon && `Tel: ${b.telefon}`, b.eposta && `E-posta: ${b.eposta}`,
      [b.ilce, b.il, b.ulke].filter(Boolean).join(" / ")].filter(Boolean);
    satirlar.push(`MÜŞTERİ KAYDI — ${b.unvan || "(ünvan yok)"} · ${istanbulZaman(x.olusturma)}`);
    if (alanlar.length) satirlar.push(`  ${alanlar.join(" · ")}`);
    if (b.not) satirlar.push(`  Not: ${String(b.not).slice(0, 300)}`);
    satirlar.push("");
  });
  satirlar.push("ERP'de: sipariş talepleri Siparişler › Satış ekranının üstünde; müşteri kayıtları Cari ekranında onay bekler.");
  const ilk = t.length ? `Site talebi: ${t[0].cari_unvan || ""}${t.length + k.length > 1 ? ` +${t.length + k.length - 1}` : ""}`
    : `Site kaydi: ${(k[0].bilgiler || {}).unvan || ""}${k.length > 1 ? ` +${k.length - 1}` : ""}`;
  return { konu: konuGuvenli(`${ilk}${firmaAdi ? ` - ${firmaAdi}` : ""}`), metin: satirlar.join("\n") };
}
// CEKIRDEK>>

async function gonder(ayar, sifre, alicilar, konu, metin) {
  const port = Number(ayar.port) || 465;
  const tlsModu = ayar.tls || (port === 465 ? "tls" : "starttls");
  const sonuc = [];
  for (const kime of alicilar) {
    const istemci = new SMTPClient({ connection: { hostname: ayar.sunucu, port, tls: tlsModu === "tls", auth: { username: ayar.kullanici, password: sifre } } });
    try {
      await istemci.send({ from: ayar.gonderenAd ? `${ayar.gonderenAd} <${ayar.kullanici}>` : ayar.kullanici, to: kime, subject: konu, content: metin });
      sonuc.push(`${kime}: tamam`);
    } finally { try { await istemci.close(); } catch { /* */ } }
  }
  return sonuc.join(", ");
}

Deno.serve(async (istek: Request) => {
  if (istek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (istek.method !== "POST") return yanit(405, { tamam: false, hata: "Yalnız POST" });
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // ÇAĞIRAN: zamanlayıcı (anahtar başlığı) ya da giriş yapmış kullanıcı (yalnız "deneme").
  const anahtar = Deno.env.get("SITE_BILDIRIM_ANAHTAR") || Deno.env.get("GUN_SONU_ANAHTAR") || "";
  const zamanlayici = !!anahtar && istek.headers.get("x-site-bildirim-anahtar") === anahtar;
  if (!zamanlayici) {
    const jeton = (istek.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = jeton ? await anon.auth.getUser(jeton) : { data: null, error: true };
    if (error || !data?.user) return yanit(401, { tamam: false, hata: "Yetkisiz — giriş yapılmalı ya da zamanlayıcı anahtarı" });
  }

  try {
    const { data: tanimS, error: tHata } = await db.from("tanimlar").select("veri").eq("id", "tekil").maybeSingle();
    if (tHata) throw new Error(`Tanımlar okunamadı: ${tHata.message}`);
    const firma = tanimS?.veri?.firmaBilgileri || {};
    const ayar = firma.siteBildirim || {};
    const smtp = firma.eposta || {};
    const sifre = Deno.env.get("SMTP_SIFRE") || smtp.sifre || "";
    const alicilar = bildirimAlicilari(ayar);
    const firmaAdi = firma.unvan || firma.firmaAdi || "";
    if (!smtp.sunucu || !smtp.kullanici || !sifre) throw new Error("E-posta ayarları eksik — Tanımlar > Firma > E-posta (sunucu, kullanıcı) ve Supabase'de SMTP_SIFRE sırrı");
    if (alicilar.length === 0) {
      return zamanlayici ? yanit(200, { tamam: true, mesaj: "alıcı yok" })
        : yanit(400, { tamam: false, hata: "Alıcı e-posta adresi yok — Tanımlar › Web Sitesi › E-posta bildirimi" });
    }

    if (!zamanlayici) {
      // DENEME: kayda yazılmaz, talep sahiplenilmez — yalnız ayarların çalıştığı görülür.
      const { count } = await db.from("site_talepleri").select("id", { count: "exact", head: true }).eq("durum", "yeni");
      const metin = `Bu bir deneme e-postasıdır: web sitesinden yeni sipariş talebi ya da müşteri kaydı geldiğinde bu adrese bildirim gelecek.\n\nŞu an bekleyen sipariş talebi: ${count ?? "?"}.\nOtomatik bildirim: ${ayar.acik ? "AÇIK" : "KAPALI (Tanımlar › Web Sitesi › E-posta bildirimi)"}.`;
      const mesaj = await gonder(smtp, sifre, alicilar, konuGuvenli(`Site bildirimi denemesi${firmaAdi ? ` - ${firmaAdi}` : ""}`), metin);
      return yanit(200, { tamam: true, mesaj });
    }
    if (!ayar.acik) return yanit(200, { tamam: true, mesaj: "bildirim kapalı" });

    const sinir = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: talepler, error: e1 } = await db.from("site_talepleri")
      .select("id, cari_unvan, olusturma, kalemler, toplam_cift, odeme, not_metni").eq("durum", "yeni").gte("olusturma", sinir).order("olusturma");
    if (e1) throw new Error(`site_talepleri okunamadı: ${e1.message}`);
    const { data: kayitlar, error: e2 } = await db.from("site_kayit_talepleri")
      .select("id, olusturma, bilgiler").eq("durum", "yeni").gte("olusturma", sinir).order("olusturma");
    if (e2 && e2.code !== "42P01") throw new Error(`site_kayit_talepleri okunamadı: ${e2.message}`);
    const adaylar = [...(talepler || []).map((x) => ({ id: `talep:${x.id}`, tur: "talep" })), ...(kayitlar || []).map((x) => ({ id: `kayit:${x.id}`, tur: "kayit" }))];
    if (adaylar.length === 0) return yanit(200, { tamam: true, mesaj: "yeni yok" });

    // SAHİPLEN: yalnız bu çağrının EKLEYEBİLDİĞİ satırlar döner (çakışan = başka çağrı bildirdi / bildiriyor).
    const { data: sahip, error: e3 } = await db.from("site_bildirim_kaydi")
      .upsert(adaylar.map((a) => ({ ...a, durum: "gönderiliyor" })), { onConflict: "id", ignoreDuplicates: true }).select("id");
    if (e3) throw new Error(`site_bildirim_kaydi yazılamadı: ${e3.message}`);
    const benim = new Set((sahip || []).map((s) => s.id));
    const t = (talepler || []).filter((x) => benim.has(`talep:${x.id}`));
    const k = (kayitlar || []).filter((x) => benim.has(`kayit:${x.id}`));
    if (t.length + k.length === 0) return yanit(200, { tamam: true, mesaj: "zaten bildirildi" });

    const { konu, metin } = bildirimMetni(t, k, firmaAdi);
    let durum;
    try { durum = `gönderildi (${await gonder(smtp, sifre, alicilar, konu, metin)})`; }
    catch (e) { durum = `HATA: ${String((e as Error)?.message || e)}`.slice(0, 500); }
    await db.from("site_bildirim_kaydi").update({ durum, zaman: new Date().toISOString() }).in("id", [...benim]);
    return yanit(durum.startsWith("HATA") ? 500 : 200, { tamam: !durum.startsWith("HATA"), mesaj: durum, hata: durum.startsWith("HATA") ? durum : undefined });
  } catch (e) {
    return yanit(500, { tamam: false, hata: String((e as Error)?.message || e) });
  }
});
