// ================= KULLANICI FONKSİYONU (Supabase Edge Function) =================
//
// NEDEN GEREKLİ
//
// Kullanıcı (11 Eylül): "Supabase'e girmeden uygulamadan Supabase kullanıcısı yazamaz mıyız?"
//
// Tarayıcıdan Supabase Auth'ta hesap AÇILAMAZ — açmak için gizli anahtar (service role) gerekir.
// Gizli anahtar HTML'e girerse dosyayı eline geçiren herkes veritabanında her şeyi yapabilir; bu
// hata projede iki kez yapıldı, tekrarlanmamalı. "Herkes kayıt olabilir" ayarını açmak da olmaz:
// açık anahtar zaten HTML'de, dosyayı bulan kendine hesap açar.
//
// Bu fonksiyon Supabase SUNUCUSUNDA çalışır; gizli anahtar orada hazır verilir
// (SUPABASE_SERVICE_ROLE_KEY), HTML'e hiç girmez. Uygulama, girişte aldığı OTURUM JETONUYLA
// çağırır; fonksiyon önce çağıranın gerçekten giriş yapmış bir YÖNETİCİ olduğunu doğrular, sonra
// hesabı açar / şifresini değiştirir / siler.
//
// ---------------------------------------------------------------------------------------------
// KURULUM (bir kez) — kur fonksiyonuyla (7z-24) aynı düzen
//
//   1. Supabase panelinde:  Edge Functions  →  Create function  →  adı:  kullanici
//   2. Bu dosyanın tamamını düzenleyiciye yapıştırın.
//   3. Deploy.
//   4. Function ayarlarında  "Verify JWT with legacy secret"  KAPALI olmalı (Supabase de "Recommended:
//      OFF" diyor). Uygulama yeni tip açık anahtar (`sb_publishable_…`) kullanıyor; bu anahtar açıkken
//      istek fonksiyona hiç ulaşmayabilir. Güvenlik azalmıyor: fonksiyon oturum jetonunu kendisi
//      doğruluyor (aşağıda `getUser`) — kur fonksiyonuyla aynı sebep.
//
//   DİKKAT: "Create function" fonksiyonu Supabase'in "Hello Functions!" ŞABLONUYLA açar. Şablon
//   silinip bu dosya yapıştırılmadan ve Deploy edilmeden fonksiyon her isteğe 200 + "Hello" döner
//   (kullanıcı 12 Eylül'de tam bunu gördü). Test penceresinde doğru kod şu cevabı verir:
//   { "tamam": false, "hata": "Oturum jetonu yok — …" } — jetonsuz reddetmesi doğrudur.
//
// Gizli anahtar KOPYALANMAZ: Supabase her fonksiyona SUPABASE_URL, SUPABASE_ANON_KEY ve
// SUPABASE_SERVICE_ROLE_KEY ortam değişkenlerini kendiliğinden verir.
//
// ---------------------------------------------------------------------------------------------
// İSTEK / YANIT
//
//   POST, JSON:  { islem: "ekle" | "sifre" | "sil", eposta, sifre? }
//   Başlık:      Authorization: Bearer <oturum jetonu>,  apikey: <açık anahtar>
//
//   "ekle":  hesabı ONAYLI açar (e-posta doğrulaması yok — @atolye.local gerçek posta değil).
//            Hesap zaten varsa şifresini verilen şifreyle günceller (yeniden çalıştırılabilir).
//   "sifre": var olan hesabın şifresini değiştirir.
//   "sil":   hesabı siler. Yoksa hata değil, "zaten yok".
//
//   Yanıt:   { tamam: true, mesaj, kullaniciId? }  ya da  { tamam: false, hata }
//   HTTP:    200 / 400 (eksik girdi) / 401 (jeton yok-geçersiz) / 403 (Yönetici değil) / 500
//
// Bütün yanıtlar CORS başlığı taşır (hata yanıtları da) — yoksa tarayıcı "Failed to fetch" der ve
// gerçek sebep görünmez (7z-24 dersi).
// ---------------------------------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const yanit = (durum: number, govde: unknown) =>
  new Response(JSON.stringify(govde), { status: durum, headers: { ...CORS, "Content-Type": "application/json" } });

// Uygulamadaki `kullaniciEposta` kuralının KOPYASI (030-supabase.jsx). Yalnız GEÇİŞ için: hesabı bu
// fonksiyonla açılan kullanıcının kaydına uygulama `eposta` alanını yazıyor ve eşleşme o alandan
// yapılıyor; bu türetme yalnız `eposta` alanı olmayan eski kayıtlar (elle açılmış ilk hesap) için.
// İki kural bir gün ayrışırsa yalnız o eski kayıtlar etkilenir.
function kullaniciAdindanEposta(kullaniciAdi: string): string {
  const harita: Record<string, string> = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u" };
  const sade = String(kullaniciAdi || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (h) => harita[h] || h)
    .replace(/[^a-z0-9._-]/g, "");
  return `${sade}@atolye.local`;
}

Deno.serve(async (istek: Request) => {
  if (istek.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (istek.method !== "POST") return yanit(405, { tamam: false, hata: "Yalnız POST" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonAnahtar = Deno.env.get("SUPABASE_ANON_KEY")!;
  const gizliAnahtar = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ---- 1) Çağıran kim? Oturum jetonu doğrulanıyor. ----------------------------------------------
  const yetki = istek.headers.get("Authorization") || "";
  const jeton = yetki.replace(/^Bearer\s+/i, "").trim();
  if (!jeton) return yanit(401, { tamam: false, hata: "Oturum jetonu yok — bulut kimliğiyle giriş yapılmalı" });

  const anon = createClient(url, anonAnahtar, { global: { headers: { Authorization: `Bearer ${jeton}` } } });
  const { data: cagiranVeri, error: cagiranHata } = await anon.auth.getUser(jeton);
  if (cagiranHata || !cagiranVeri?.user?.email) {
    return yanit(401, { tamam: false, hata: "Oturum geçersiz ya da süresi dolmuş — çıkıp yeniden girin" });
  }
  const cagiranEposta = cagiranVeri.user.email.toLowerCase();

  // ---- 2) Çağıran YÖNETİCİ mi? Tanımlar kaydındaki kullanıcı listesinden. -----------------------
  // Tanımlar `tanimlar` tablosunda tek satır (id = "tekil"), `veri` sütununda JSON.
  const yonetim = createClient(url, gizliAnahtar, { auth: { persistSession: false } });
  const { data: tanimSatiri, error: tanimHata } = await yonetim.from("tanimlar").select("veri").eq("id", "tekil").maybeSingle();
  if (tanimHata) return yanit(500, { tamam: false, hata: `Tanımlar okunamadı: ${tanimHata.message}` });
  const kullanicilar: Array<{ kullaniciAdi?: string; eposta?: string; rol?: string; ad?: string }> =
    (tanimSatiri?.veri?.kullanicilar as any[]) || [];
  const cagiran = kullanicilar.find((k) =>
    (k.eposta && k.eposta.toLowerCase() === cagiranEposta) ||
    (!k.eposta && kullaniciAdindanEposta(k.kullaniciAdi || "") === cagiranEposta));
  if (!cagiran) return yanit(403, { tamam: false, hata: "Çağıran, Tanımlar'daki kullanıcı listesinde yok" });
  if (cagiran.rol !== "Yönetici") return yanit(403, { tamam: false, hata: "Bu işlem için Yönetici rolü gerekli" });

  // ---- 3) İstek --------------------------------------------------------------------------------
  let govde: { islem?: string; eposta?: string; sifre?: string } = {};
  try { govde = await istek.json(); } catch { return yanit(400, { tamam: false, hata: "Gövde JSON değil" }); }
  const islem = String(govde.islem || "");
  const eposta = String(govde.eposta || "").trim().toLowerCase();
  const sifre = String(govde.sifre || "");
  if (!/^[a-z0-9._-]+@[a-z0-9.-]+$/.test(eposta)) return yanit(400, { tamam: false, hata: "E-posta biçimi geçersiz" });
  if ((islem === "ekle" || islem === "sifre") && sifre.length < 6) {
    return yanit(400, { tamam: false, hata: "Şifre en az 6 karakter olmalı (Supabase kuralı)" });
  }

  // Var olan hesabı e-postayla bul. Admin API'de e-postayla doğrudan arama yok; liste sayfalanarak
  // taranıyor (atölyede birkaç kullanıcı var, tek sayfa yeter; yine de 1000'e kadar bakılıyor).
  async function hesabiBul(): Promise<{ id: string } | null> {
    for (let sayfa = 1; sayfa <= 10; sayfa++) {
      const { data, error } = await yonetim.auth.admin.listUsers({ page: sayfa, perPage: 100 });
      if (error) throw new Error(error.message);
      const bulunan = (data?.users || []).find((u) => (u.email || "").toLowerCase() === eposta);
      if (bulunan) return { id: bulunan.id };
      if (!data?.users?.length || data.users.length < 100) break;
    }
    return null;
  }

  try {
    if (islem === "ekle") {
      const mevcut = await hesabiBul();
      if (mevcut) {
        const { error } = await yonetim.auth.admin.updateUserById(mevcut.id, { password: sifre, email_confirm: true });
        if (error) throw new Error(error.message);
        return yanit(200, { tamam: true, mesaj: "Hesap zaten vardı — şifre güncellendi", kullaniciId: mevcut.id });
      }
      const { data, error } = await yonetim.auth.admin.createUser({ email: eposta, password: sifre, email_confirm: true });
      if (error) throw new Error(error.message);
      return yanit(200, { tamam: true, mesaj: "Bulut hesabı açıldı", kullaniciId: data.user?.id });
    }
    if (islem === "sifre") {
      const mevcut = await hesabiBul();
      if (!mevcut) return yanit(404, { tamam: false, hata: "Bu e-postayla bulut hesabı yok — önce hesap açılmalı" });
      const { error } = await yonetim.auth.admin.updateUserById(mevcut.id, { password: sifre });
      if (error) throw new Error(error.message);
      return yanit(200, { tamam: true, mesaj: "Şifre değiştirildi", kullaniciId: mevcut.id });
    }
    if (islem === "sil") {
      // Yönetici kendi hesabını silemez: uygulamada son yönetici zaten korunuyor ama bulutta da
      // kendini kilitlemesin.
      if (eposta === cagiranEposta) return yanit(400, { tamam: false, hata: "Kendi hesabınızı silemezsiniz" });
      const mevcut = await hesabiBul();
      if (!mevcut) return yanit(200, { tamam: true, mesaj: "Bulut hesabı zaten yok" });
      const { error } = await yonetim.auth.admin.deleteUser(mevcut.id);
      if (error) throw new Error(error.message);
      return yanit(200, { tamam: true, mesaj: "Bulut hesabı silindi" });
    }
    return yanit(400, { tamam: false, hata: `Bilinmeyen işlem: ${islem}` });
  } catch (e) {
    return yanit(500, { tamam: false, hata: String((e as Error)?.message || e) });
  }
});
