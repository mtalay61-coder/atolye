// A6 — GERÇEK GİRİŞ HESAPLARIYLA API SINAMASI (18 Kasım 2026; temizlik ve doğrulama ile). YALNIZ DENEME PROJESİNDE.
// Nerede: deneme sunucusunun açtığı sayfa (http://127.0.0.1:8080, deneme-sunucu.py) → F12 → Console → bu dosyanın TAMAMI → Enter.
// Şifreleri açılan pencereye siz yazarsınız; yalnız deneme projesinin giriş adresine gider, hiçbir yere kaydedilmez.
//
// AKIŞ (her hesap için: personel@atolye.local, sonra listedeyok@atolye.local):
//   0) ANLIK GÖRÜNTÜ: tanımlar satırları (kimlik + veri) okunur. Tam olarak tek satır 'tekil' değilse HİÇ başlanmaz.
//   1-2) başlangıç kimliği ve yetki_var_mi(muhasebe, kaydetme)
//   3)   PATCH kimlik 'tekil' → 'a6-api-sinama'   (düzeltme öncesi 200 = AÇIK · sonrası 403 / 42501 = KAPALI)
//   4)   kimlik değiştiyse: yetki_var_mi tekrar (true = bütün yetkiler açıldı)
//   6)   kendini Yönetici yapma (veri.kullanicilar) — 403 beklenir
//   7)   tanımları silme — 403 beklenir
//   TEMİZLİK (finally — hata olsa da çalışır): kimlik değiştiyse geri alınır; veri değiştiyse (beklenmeyen başarılı rol
//        değişikliği) anlık görüntüye döndürülür; satır silindiyse (beklenmeyen başarılı silme) anlık görüntüden yeniden eklenir.
//   DOĞRULAMA: son durum anlık görüntüyle BİREBİR aynı mı (tek satır 'tekil', veri aynı). DEĞİLSE sınama DURUR — sonraki
//        hesaba geçilmez — ve SQL Editor için kurtarma SQL'i (anlık görüntüyle) yazılır.
// Güvenlik: adres ve anahtar uygulamanın seçili firmasından okunur; ANA PROJEYE bağlıysa çalışmaz. Deneme sunucusunun CSP'si
// zaten yalnız deneme projesine izin verir. Her istek 15 sn zaman aşımlı.
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
  const getir = async (adres, se = {}) => {
    const k = new AbortController(); const z = setTimeout(() => k.abort(), 15000);
    try { return await fetch(adres, { ...se, signal: k.signal }); } finally { clearTimeout(z); }
  };
  const giris = async (eposta) => {
    const sifre = prompt(`${eposta} şifresi (yalnız bu tarayıcıda kalır; deneme projesinin giriş adresine gider)`);
    if (!sifre) throw new Error(`${eposta}: şifre girilmedi`);
    const r = await getir(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: H, body: JSON.stringify({ email: eposta, password: sifre }) });
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) throw new Error(`${eposta}: giriş başarısız (${r.status} ${j.error_description || j.msg || j.error || ""})`);
    return j.access_token;
  };
  const rest = (jeton, yol, se = {}) => getir(`${U}/rest/v1/${yol}`, { ...se,
    headers: { ...H, Authorization: `Bearer ${jeton}`, Prefer: "return=representation", ...(se.headers || {}) } });
  const metin = async (r) => `${r.status} ${(await r.text()).replace(/\s+/g, " ").slice(0, 110)}`;
  // Anahtar sırasından bağımsız karşılaştırma (PostgreSQL jsonb anahtarları kendi sırasıyla döndürür).
  const kanonik = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((a) => [a, x[a]])) : x));
  const durum = async (j) => {
    const r = await rest(j, "tanimlar?select=id,veri&order=id");
    if (!r.ok) throw new Error("tanımlar okunamadı: " + await metin(r));
    return await r.json();
  };
  const ayni = (a, b) => a.length === b.length && a.every((x, i) => x.id === b[i].id && kanonik(x.veri) === kanonik(b[i].veri));
  const yetki = async (j) => { const r = await rest(j, "rpc/yetki_var_mi", { method: "POST", body: JSON.stringify({ moduller: ["muhasebe"], islem: "kaydetme" }) }); return r.ok ? String(await r.json()) : await metin(r); };
  const kurtarmaSql = (goruntu) => {
    const v = JSON.stringify(goruntu[0].veri).replace(/'/g, "''");
    return "-- SQL Editor (atolye-deneme; jetonsuz — koruma tetikleyicisi engellemez):\n" +
      "-- 1) 'tekil' yoksa tek kalan satırı (başka kimliğe taşınmışsa) geri adlandır\n" +
      "update public.tanimlar set id = 'tekil' where not exists (select 1 from public.tanimlar where id = 'tekil') and id = (select min(id) from public.tanimlar);\n" +
      "-- 2) veriyi sınama başlangıcındaki hâline döndür (satır yoksa ekle)\n" +
      `insert into public.tanimlar (id, veri) values ('tekil', '${v}'::jsonb) on conflict (id) do update set veri = excluded.veri;\n` +
      "-- 3) başka satır kalmışsa sil\n" +
      "delete from public.tanimlar where id <> 'tekil';\n" +
      "select id, veri = '" + v + "'::jsonb as veri_ayni from public.tanimlar;   -- beklenen: tek satır tekil · true";
  };

  // Yalnız yerel prova içindir: window.__A6_PROVA_GERI_BOZ = true → geri alma yanlış kimliğe gider (temizlik başarısızlığı yolunu sınar).
  const GERI = window.__A6_PROVA_GERI_BOZ ? "a6-bozuk-hedef" : "tekil";
  let durdu = false;
  for (const [kim, eposta] of [["personel", "personel@atolye.local"], ["listede yok", "listedeyok@atolye.local"]]) {
    if (durdu) { yaz(kim, "—", "ATLANDI (önceki hesabın temizliği doğrulanamadı)"); continue; }
    let j, goruntu;
    try { j = await giris(eposta); } catch (e) { yaz(kim, "0 giriş", "HATA: " + e.message); continue; }
    yaz(kim, "0 giriş (gerçek Auth jetonu)", "tamam");
    try { goruntu = await durum(j); } catch (e) { yaz(kim, "0 anlık görüntü", "HATA: " + e.message); durdu = true; continue; }
    if (goruntu.length !== 1 || goruntu[0].id !== "tekil") { yaz(kim, "0 anlık görüntü", "DUR: başlangıç tek satır 'tekil' değil → " + goruntu.map((x) => x.id).join(",")); durdu = true; continue; }
    yaz(kim, "0 anlık görüntü", "tek satır 'tekil' · " + (goruntu[0].veri.kullanicilar || []).length + " kullanıcı");
    try {
      yaz(kim, "1 tanımlar kimliği (başlangıç)", goruntu[0].id);
      yaz(kim, "2 yetki_var_mi (başlangıç)", await yetki(j));
      const p = await rest(j, "tanimlar?id=eq.tekil", { method: "PATCH", body: JSON.stringify({ id: "a6-api-sinama" }) });
      const ps = await metin(p);
      const degisti = p.ok && ps.includes("a6-api-sinama");
      yaz(kim, "3 PATCH kimlik → a6-api-sinama", (degisti ? "AÇIK — " : p.status === 403 ? "KAPALI — " : "?? — ") + ps);
      if (degisti) yaz(kim, "4 yetki_var_mi (kimlik değişince)", await yetki(j) + "   ← true = bütün modül yetkileri açıldı");
      if (degisti) {   // 6 ve 7 'tekil' üzerinde denenir: önce kimlik geri (temizlik aynı işi finally'de de yapar)
        const g = await rest(j, "tanimlar?id=eq.a6-api-sinama", { method: "PATCH", body: JSON.stringify({ id: GERI }) });
        yaz(kim, "5 kimlik → tekil (ara geri alma)", await metin(g));
      }
      const liste = Array.isArray(goruntu[0].veri.kullanicilar) ? goruntu[0].veri.kullanicilar : [];
      const yeni = liste.some((k) => (k.eposta || "").toLowerCase() === eposta)
        ? liste.map((k) => ((k.eposta || "").toLowerCase() === eposta ? { ...k, rol: "Yönetici" } : k))
        : [...liste, { id: "a6-sizma", ad: "Sizma", kullaniciAdi: "sizma", rol: "Yönetici", yetkiler: {}, eposta }];
      const y = await rest(j, "tanimlar?id=eq.tekil", { method: "PATCH", body: JSON.stringify({ veri: { ...goruntu[0].veri, kullanicilar: yeni } }) });
      const ys = await metin(y);
      yaz(kim, "6 kendini Yönetici yapma", (y.status === 403 ? "KAPALI — " : y.ok && ys.includes("Yönetici") && ys !== "200 []" ? "AÇIK (BEKLENMEDİK) — " : "?? — ") + ys);
      const d = await rest(j, "tanimlar?id=eq.tekil", { method: "DELETE" });
      const ds = await metin(d);
      yaz(kim, "7 tanımları silme", (d.status === 403 ? "KAPALI — " : d.ok && ds.includes("tekil") ? "AÇIK (BEKLENMEDİK) — " : d.ok ? "etkisiz — " : "?? — ") + ds);
    } catch (e) {
      yaz(kim, "!! sınama hatası", e.message);
    } finally {
      // TEMİZLİK: durum anlık görüntüye dönene kadar (en çok 3 tur) — kimlik, veri, silinen satır.
      let son = [];
      for (let tur = 1; tur <= 3; tur++) {
        try { son = await durum(j); } catch (e) { yaz(kim, `T${tur} okuma`, "HATA: " + e.message); break; }
        if (ayni(son, goruntu)) break;
        const tekil = son.find((x) => x.id === "tekil"), tasinan = son.find((x) => x.id === "a6-api-sinama");
        if (!tekil && tasinan) yaz(kim, `T${tur} kimlik geri`, await metin(await rest(j, "tanimlar?id=eq.a6-api-sinama", { method: "PATCH", body: JSON.stringify({ id: GERI }) })));
        else if (tekil && kanonik(tekil.veri) !== kanonik(goruntu[0].veri)) yaz(kim, `T${tur} veri geri (beklenmeyen değişiklik)`, await metin(await rest(j, "tanimlar?id=eq.tekil", { method: "PATCH", body: JSON.stringify({ veri: goruntu[0].veri }) })));
        else if (!son.length) yaz(kim, `T${tur} silinen satır geri`, await metin(await rest(j, "tanimlar", { method: "POST", body: JSON.stringify({ id: "tekil", veri: goruntu[0].veri }) })));
        else { yaz(kim, `T${tur} temizlik`, "beklenmeyen satırlar: " + son.map((x) => x.id).join(",")); break; }
      }
      try { son = await durum(j); } catch (e) { son = []; }
      if (ayni(son, goruntu)) yaz(kim, "8 SON DURUM = BAŞLANGIÇ", "EVET (tek satır 'tekil', veri birebir)");
      else {
        durdu = true;
        yaz(kim, "8 SON DURUM = BAŞLANGIÇ", "HAYIR → sınama DURDU, sonraki hesaba geçilmeyecek. Satırlar: " + son.map((x) => x.id).join(",") + " — kurtarma SQL'i aşağıda");
        console.error("KURTARMA SQL (deneme projesi, SQL Editor):\n" + kurtarmaSql(goruntu));
      }
    }
  }
  console.table(satirlar);
  console.log("KOPYALAMA İÇİN:\n" + satirlar.map((s) => `${s.kim} | ${s.adim} | ${s.sonuc}`).join("\n"));
})();
