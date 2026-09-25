// ================= E-POSTA FONKSİYONU (Supabase Edge Function) =================
//
// NEDEN GEREKLİ
//
// Kullanıcı (13 Eylül): "Paylaş kısmına mail de ekleyelim; kullanıcı mail bilgilerini girsin, o
// mail ile PDF şeklinde sipariş gönderelim, cari kartındaki kayıtlı maile."
//
// Tarayıcı e-posta GÖNDEREMEZ (mailto: yalnız posta programını açar, dosya ekleyemez). Gönderim
// sunucu tarafında, atölyenin kendi SMTP hesabıyla yapılıyor. SMTP ayarları Tanımlar > Genel'de
// (`firmaBilgileri.eposta`); fonksiyon bunları Tanımlar kaydından okur — uygulama şifreyi ağ
// üzerinden GÖNDERMEZ, fonksiyon veritabanından alır.
//
// ---------------------------------------------------------------------------------------------
// KURULUM (bir kez) — `kullanici` fonksiyonuyla aynı
//
//   1. Supabase > Edge Functions > Create function > adı:  eposta
//   2. Şablon kodu silin, bu dosyanın tamamını yapıştırın > Deploy.
//   3. "Verify JWT with legacy secret" KAPALI (fonksiyon jetonu kendisi doğruluyor).
//   4. Tanımlar > Genel > E-posta gönderim ayarları: sunucu, port, kullanıcı, şifre, gönderen adı.
//      Gmail: smtp.gmail.com · 465 · Google hesabı > Güvenlik > "Uygulama şifreleri" ile üretilen
//      16 haneli şifre (normal şifre ÇALIŞMAZ). Outlook/365: smtp.office365.com · 587 (STARTTLS).
//      Şirket alan adı: sağlayıcının verdiği sunucu/port.
//
// ---------------------------------------------------------------------------------------------
// İSTEK / YANIT
//   POST JSON: { kime, konu, metin, dosyaAdi, pdfBase64 }
//   Başlık:    Authorization: Bearer <oturum jetonu>, apikey: <açık anahtar>
//   Yanıt:     { tamam: true, mesaj } | { tamam: false, hata }   (CORS her yanıtta)
// ---------------------------------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const yanit = (durum: number, govde: unknown) =>
  new Response(JSON.stringify(govde), { status: durum, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (istek: Request) => {
  if (istek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (istek.method !== "POST") return yanit(405, { tamam: false, hata: "Yalnız POST" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonAnahtar = Deno.env.get("SUPABASE_ANON_KEY")!;
  const gizliAnahtar = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1) Çağıran giriş yapmış mı (rol şartı yok: her kullanıcı sipariş gönderebilir).
  const jeton = (istek.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton) return yanit(401, { tamam: false, hata: "Oturum jetonu yok — bulut kimliğiyle giriş yapılmalı" });
  const anon = createClient(url, anonAnahtar, { global: { headers: { Authorization: `Bearer ${jeton}` } } });
  const { data: cagiran, error: cagiranHata } = await anon.auth.getUser(jeton);
  if (cagiranHata || !cagiran?.user) return yanit(401, { tamam: false, hata: "Oturum geçersiz — çıkıp yeniden girin" });

  // 2) SMTP ayarları Tanımlar'dan.
  const yonetim = createClient(url, gizliAnahtar, { auth: { persistSession: false } });
  const { data: tanimSatiri, error: tanimHata } = await yonetim.from("tanimlar").select("veri").eq("id", "tekil").maybeSingle();
  if (tanimHata) return yanit(500, { tamam: false, hata: `Tanımlar okunamadı: ${tanimHata.message}` });
  const ayar = (tanimSatiri?.veri?.firmaBilgileri?.eposta || {}) as
    { sunucu?: string; port?: number | string; kullanici?: string; sifre?: string; gonderenAd?: string; tls?: string };
  if (!ayar.sunucu || !ayar.kullanici || !ayar.sifre) {
    return yanit(400, { tamam: false, hata: "E-posta ayarları eksik — Tanımlar > Genel > E-posta gönderim ayarları" });
  }

  // 3) İstek.
  let govde: { kime?: string; konu?: string; metin?: string; dosyaAdi?: string; pdfBase64?: string } = {};
  try { govde = await istek.json(); } catch { return yanit(400, { tamam: false, hata: "Gövde JSON değil" }); }
  const kime = String(govde.kime || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kime)) return yanit(400, { tamam: false, hata: `Alıcı e-posta geçersiz: "${kime}"` });

  const port = Number(ayar.port) || 465;
  // 465 = TLS (SMTPS), 587 = STARTTLS. Kullanıcı Tanımlar'da "tls" alanını boş bırakırsa porttan çıkarılır.
  const tlsModu = ayar.tls || (port === 465 ? "tls" : "starttls");
  const istemci = new SMTPClient({
    connection: {
      hostname: ayar.sunucu,
      port,
      tls: tlsModu === "tls",
      auth: { username: ayar.kullanici, password: ayar.sifre },
    },
  });
  try {
    await istemci.send({
      from: ayar.gonderenAd ? `${ayar.gonderenAd} <${ayar.kullanici}>` : ayar.kullanici,
      to: kime,
      subject: govde.konu || "Sipariş",
      content: govde.metin || "",
      attachments: govde.pdfBase64
        ? [{ filename: govde.dosyaAdi || "siparis.pdf", contentType: "application/pdf", encoding: "base64", content: govde.pdfBase64 }]
        : [],
    });
    await istemci.close();
    return yanit(200, { tamam: true, mesaj: `Gönderildi: ${kime}` });
  } catch (e) {
    try { await istemci.close(); } catch { /* */ }
    // SMTP'nin mesajı olduğu gibi: yanlış şifre, engellenen bağlantı, port hatası — panelde ne
    // düzeltileceğini bu söyler (7z-45 dersi).
    return yanit(500, { tamam: false, hata: `SMTP: ${String((e as Error)?.message || e)}` });
  }
});
