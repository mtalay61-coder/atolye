#!/usr/bin/env node
// YEREL SUPABASE — GERÇEK AUTH HESAPLARI (27 Kasım). Sınama hesaplarını yerel GoTrue'da açar (yönetici API'si; yerel yığının kendi
// servis anahtarı — buluttaki hiçbir projenin anahtarı değildir, ortam değişkeninden okunur, depoya yazılmaz). Hesaplar DENEME'dir:
// <ad>@atolye.local, şifre SB_SIFRE (vars. sınama şifresi). Kullanım: SB_API=http://127.0.0.1:54321 SB_SERVIS=<yerel servis anahtarı> node sb-hesaplar.js
const API = process.env.SB_API || "http://127.0.0.1:54321", SERVIS = process.env.SB_SERVIS, SIFRE = process.env.SB_SIFRE || "yerel-sinama";
const ADLAR = ["ali", "ayse", "selin", "murat", "umut", "mert", "ufuk", "cem", "tuna", "deniz", "zeki", "okan"];
(async () => {
  if (!SERVIS) throw new Error("SB_SERVIS yok");
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(API)) throw new Error("yalnız yerel yığın (127.0.0.1) — bulut adresi reddedilir");
  for (const ad of ADLAR) {
    const r = await fetch(`${API}/auth/v1/admin/users`, { method: "POST", headers: { apikey: SERVIS, authorization: `Bearer ${SERVIS}`, "content-type": "application/json" },
      body: JSON.stringify({ email: `${ad}@atolye.local`, password: SIFRE, email_confirm: true }) });
    const j = await r.json().catch(() => ({}));
    console.log(`${ad}@atolye.local → ${r.status} ${r.ok ? "açıldı" : (j.msg || j.message || j.error_code || "")}`);
  }
})().catch((e) => { console.error("HATA", e.message); process.exit(2); });
