// A6 — GERÇEK GİRİŞ HESAPLARIYLA API SINAMASI (18 Kasım 2026). YALNIZ DENEME PROJESİNDE.
// Nerede: deneme sunucusunun açtığı sayfa (http://127.0.0.1:8080, deneme-sunucu.py) → F12 → Console → bu dosyanın TAMAMI → Enter.
// Ne yapar: personel@atolye.local ve listedeyok@atolye.local hesaplarıyla Supabase Auth'tan GERÇEK jeton alır (şifreyi bu
// tarayıcıdaki pencereye siz yazarsınız; hiçbir yere gönderilmez, yalnız deneme projesinin giriş adresine), sonra PostgREST'e
// uygulamanın yaptığı gibi istek atar:
//   1-2) tanımlar kimliği ve yetki_var_mi(muhasebe, kaydetme) — başlangıç
//   3)   PATCH tanimlar id 'tekil' → 'a6-api-sinama'   (A6 — düzeltme öncesi 200 = AÇIK, sonrası 403 / 42501 = KAPALI)
//   4)   başarılıysa: yetki_var_mi tekrar (true = bütün yetkiler açıldı) ve 5) kimliği HEMEN 'tekil'e geri alır
//   6)   kendini Yönetici yapma (veri.kullanicilar) — her iki durumda 403 beklenir
//   7)   tanımları silme — her iki durumda 403 beklenir (ya da 0 satır)
//   8)   son durum: tanımlar kimliği 'tekil' olmalı
// Güvenlik: adres ve anahtar uygulamanın seçili firmasından (localStorage firma:secim) okunur; ANA PROJEYE bağlıysa çalışmaz.
// Deneme sunucusunun CSP'si zaten yalnız deneme projesine izin verir. Geri alma başarısız olursa SQL Editor için düzeltme SQL'i yazar.
(async () => {
  const ANA = "mqdgucoomgqcvhvgixbl";
  const f = JSON.parse(localStorage.getItem("firma:secim") || "{}");
  const U = f.url || "", KEY = f.anahtar || "";
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(U) || U.includes(ANA) || !/^sb_publishable_/.test(KEY)) {
    console.error("DUR: uygulama deneme projesine bağlı değil (ya da ana projeye bağlı). Sınama çalıştırılmadı."); return;
  }
  const H = { apikey: KEY, "Content-Type": "application/json", "x-atolye-surum": "1.744.25" };
  const satirlar = [];
  const yaz = (kim, adim, sonuc) => { satirlar.push({ kim, adim, sonuc }); };
  const giris = async (eposta) => {
    const sifre = prompt(`${eposta} şifresi (yalnız bu tarayıcıda kalır; deneme projesinin giriş adresine gider)`);
    if (!sifre) throw new Error(`${eposta}: şifre girilmedi`);
    const r = await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: H, body: JSON.stringify({ email: eposta, password: sifre }) });
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) throw new Error(`${eposta}: giriş başarısız (${r.status} ${j.error_description || j.msg || j.error || ""})`);
    return j.access_token;
  };
  const rest = (jeton, yol, se = {}) => fetch(`${U}/rest/v1/${yol}`, { ...se,
    headers: { ...H, Authorization: `Bearer ${jeton}`, Prefer: "return=representation", ...(se.headers || {}) } });
  const metin = async (r) => `${r.status} ${(await r.text()).replace(/\s+/g, " ").slice(0, 110)}`;
  const kimlikler = async (j) => { const r = await rest(j, "tanimlar?select=id"); return r.ok ? (await r.json()).map((x) => x.id).join(",") || "(boş)" : await metin(r); };
  const yetki = async (j) => { const r = await rest(j, "rpc/yetki_var_mi", { method: "POST", body: JSON.stringify({ moduller: ["muhasebe"], islem: "kaydetme" }) }); return r.ok ? String(await r.json()) : await metin(r); };

  for (const [kim, eposta] of [["personel", "personel@atolye.local"], ["listede yok", "listedeyok@atolye.local"]]) {
    let j;
    try { j = await giris(eposta); } catch (e) { yaz(kim, "0 giriş", "HATA: " + e.message); continue; }
    yaz(kim, "0 giriş (gerçek Auth jetonu)", "tamam");
    yaz(kim, "1 tanımlar kimliği (başlangıç)", await kimlikler(j));
    yaz(kim, "2 yetki_var_mi (başlangıç)", await yetki(j));
    const p = await rest(j, "tanimlar?id=eq.tekil", { method: "PATCH", body: JSON.stringify({ id: "a6-api-sinama" }) });
    const ps = await metin(p);
    const degisti = p.ok && ps.includes("a6-api-sinama");
    yaz(kim, "3 PATCH kimlik → a6-api-sinama", (degisti ? "AÇIK — " : p.status === 403 ? "KAPALI — " : "?? — ") + ps);
    if (degisti) {
      yaz(kim, "4 yetki_var_mi (kimlik değişince)", await yetki(j) + "   ← true = bütün modül yetkileri açıldı");
      const g = await rest(j, "tanimlar?id=eq.a6-api-sinama", { method: "PATCH", body: JSON.stringify({ id: "tekil" }) });
      yaz(kim, "5 geri: kimlik → tekil", await metin(g));
    }
    // 6) kendini Yönetici yapma: mevcut listeyi okuyup kendi satırının rolünü değiştirerek gönder (listede yoksa kendini ekler)
    const v = await rest(j, "tanimlar?id=eq.tekil&select=veri");
    if (v.ok) {
      const veri = ((await v.json())[0] || {}).veri || {};
      const liste = Array.isArray(veri.kullanicilar) ? veri.kullanicilar : [];
      const yeni = liste.some((k) => (k.eposta || "").toLowerCase() === eposta)
        ? liste.map((k) => ((k.eposta || "").toLowerCase() === eposta ? { ...k, rol: "Yönetici" } : k))
        : [...liste, { id: "a6-sizma", ad: "Sizma", kullaniciAdi: "sizma", rol: "Yönetici", yetkiler: {}, eposta }];
      const y = await rest(j, "tanimlar?id=eq.tekil", { method: "PATCH", body: JSON.stringify({ veri: { ...veri, kullanicilar: yeni } }) });
      const ys = await metin(y);
      yaz(kim, "6 kendini Yönetici yapma", (y.status === 403 ? "KAPALI — " : y.ok ? "AÇIK — " : "?? — ") + ys);
    } else yaz(kim, "6 kendini Yönetici yapma", "okunamadı: " + await metin(v));
    const d = await rest(j, "tanimlar?id=eq.tekil", { method: "DELETE" });
    const ds = await metin(d);
    yaz(kim, "7 tanımları silme", (d.status === 403 ? "KAPALI — " : d.ok && !ds.includes("tekil") ? "etkisiz — " : d.ok ? "AÇIK — " : "?? — ") + ds);
    const son = await kimlikler(j);
    yaz(kim, "8 tanımlar kimliği (son)", son + (son === "tekil" ? "" : "   ← BOZUK! SQL Editor: update public.tanimlar set id = 'tekil' where id = 'a6-api-sinama';"));
  }
  console.table(satirlar);
  console.log("KOPYALAMA İÇİN:\n" + satirlar.map((s) => `${s.kim} | ${s.adim} | ${s.sonuc}`).join("\n"));
})();
